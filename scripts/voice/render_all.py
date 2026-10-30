"""Renders every translated voice line of the registry with the character's voicebank.

Inputs: game/src/content/voice/registry.json (lines) + scripts/voice/ja-*.json (translations:
id → {ja, yomi, emotion}). Voicebanks are NOT in the repository (their licences forbid
redistribution): point VOICEBANKS at the folder holding the unpacked banks
(Soft/, vivid/, TETO-tougou-110401/, default/, -.-/).
Output: game/src/assets/voice/<id>.mp3 (mono, 48 kbit/s) and the registry updated with
ja / yomi / emotion / status / seconds.

Run: VOICEBANKS=/path python3 -I scripts/voice/render_all.py [--only id,id] [--force]
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from multiprocessing import Pool
from pathlib import Path

import soundfile as sf

sys.path.insert(0, str(Path(__file__).parent))
from utau_render import SR, Voice, load_bank, morae, speak  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / 'game/src/content/voice/registry.json'
OUT = ROOT / 'game/src/assets/voice'
BANKS = Path(os.environ.get('VOICEBANKS', ''))

# Voice casting (approved by the author 2026-10-30): bank folder, alias suffix, base pitch,
# mora length (ms), phrase range (semitones).
CAST = {
    'melody-soft': ('-.-/ゲキヤク-カプセル剤-', 'WD4', 300, 120, 3.0),
    'melody-hard': ('-.-/ゲキヤク-カプセル剤-', 'D4', 285, 115, 3.5),
    'dameo': ('default/x/カロガド単独音', '', 140, 115, 2.2),
    'satsuki': ('vivid/暗鳴ニュイ vivid連続音', 'E4', 235, 125, 2.5),
    'calculator': ('TETO-tougou-110401/重音テト音声ライブラリー', '', 310, 105, 4.0),
    'ruler': ('TETO-tougou-110401/重音テト音声ライブラリー', '', 220, 130, 1.8),
    'compass': ('Soft', '', 390, 125, 3.0),
    'eraser-1': ('Soft', '', 330, 120, 2.6),
    'eraser-2': ('TETO-tougou-110401/重音テト音声ライブラリー', '', 345, 110, 3.2),
    'eraser-3': ('vivid/暗鳴ニュイ vivid連続音', 'A4', 300, 115, 3.0),
}

# emotion → (pitch shift in semitones, range factor, tempo factor (>1 slower), energy)
EMOTION = {
    'calm': (0, 1.0, 1.0, 1.0),
    'happy': (2, 1.3, 0.95, 1.2),
    'sweet': (1.5, 1.2, 1.05, 1.1),
    'sad': (-2, 0.6, 1.2, 0.7),
    'scared': (3, 1.4, 0.9, 1.3),
    'angry': (1, 1.5, 0.9, 1.5),
    'tense': (0, 0.8, 0.95, 1.0),
    'whisper': (-1, 0.5, 1.1, 0.6),
    'excited': (3, 1.5, 0.85, 1.5),
    'cold': (-1, 0.4, 1.1, 0.5),
}

_banks: dict[str, dict] = {}


def voice_for(speaker: str, phase: str) -> str:
    if speaker == 'melody':
        return 'melody-hard' if phase in ('D', 'E') else 'melody-soft'
    return speaker


def render(job: tuple[str, dict]) -> tuple[str, dict]:
    lid, line = job
    key = voice_for(line['speaker'], line.get('phase', 'A'))
    if key not in CAST:
        return lid, {'status': 'needs-fix', 'error': f'no voice cast for {line["speaker"]}'}
    folder, suffix, base, mora, rng = CAST[key]
    if folder not in _banks:
        _banks[folder] = load_bank(BANKS / folder)
    shift, rf, tf, energy = EMOTION.get(line.get('emotion', 'calm'), EMOTION['calm'])
    v = Voice(_banks[folder], suffix, base_hz=base * 2 ** (shift / 12), range_st=rng * rf, mora_ms=mora * tf)
    if not any(not m.startswith('_') for m in morae(line['yomi'])):
        return lid, {'status': 'silent'}  # a wordless line («…»): nothing to say
    y = speak(v, line['yomi'], energy=energy)
    seconds = len(y) / SR
    if seconds < 0.25 or not any(not m.startswith('_') for m in morae(line['yomi'])):
        return lid, {'status': 'needs-fix', 'error': 'empty render'}
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        sf.write(tmp.name, y, SR)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp.name, '-ac', '1', '-ar', '32000', '-b:a', '48k', str(OUT / f'{lid}.mp3')], check=True)
    return lid, {'status': 'synthesized', 'seconds': round(seconds, 2), 'voice': key}


def main() -> int:
    if not BANKS.is_dir():
        print('set VOICEBANKS to the folder with the unpacked voicebanks', file=sys.stderr)
        return 1
    reg = json.loads(REGISTRY.read_text())
    lines = reg['lines']
    for f in sorted(Path(__file__).parent.glob('ja-*.json')):
        for lid, t in json.loads(f.read_text()).items():
            if lid in lines:
                lines[lid].update({k: t[k] for k in ('ja', 'yomi', 'emotion') if k in t})
                if lines[lid]['status'] == 'not-prepared':
                    lines[lid]['status'] = 'prepared'
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    force = '--force' in sys.argv
    # --missing: keep every file already rendered (after an interrupted run) and render the rest
    missing = '--missing' in sys.argv
    if missing:
        for lid, l in lines.items():
            if l.get('yomi') and (OUT / f'{lid}.mp3').exists() and l['status'] in ('prepared', 'not-prepared'):
                l['status'] = 'synthesized'
    jobs = [(lid, l) for lid, l in lines.items() if l.get('yomi') and (only is None or lid in only)
            and (force or (not (OUT / f'{lid}.mp3').exists() if missing else l['status'] in ('prepared', 'needs-fix') or not (OUT / f'{lid}.mp3').exists()))]
    jobs.sort(key=lambda j: voice_for(j[1]['speaker'], j[1].get('phase', 'A')))
    print(f'{len(jobs)} lines to render')
    with Pool(4, maxtasksperchild=40) as pool:
        for i, (lid, res) in enumerate(pool.imap_unordered(render, jobs, chunksize=8), 1):
            lines[lid].update(res)
            if res['status'] != 'synthesized':
                print(f'  {lid}: {res}', file=sys.stderr)
            if i % 25 == 0:
                print(f'  {i}/{len(jobs)}', flush=True)
                REGISTRY.write_text(json.dumps(reg, ensure_ascii=False, indent=1) + '\n')  # progress survives a crash
    REGISTRY.write_text(json.dumps(reg, ensure_ascii=False, indent=1) + '\n')
    done = sum(1 for l in lines.values() if l['status'] in ('synthesized', 'checked', 'integrated'))
    print(f'{done}/{len(lines)} lines have audio')
    return 0


if __name__ == '__main__':
    sys.exit(main())
