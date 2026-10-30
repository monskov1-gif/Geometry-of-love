"""«メロディのまほう» — Melody's welcome song when her app first starts (chapter 2).

The vocal is sung by her voicebank (Gekiyaku, soft W tone), note by note, with the same
oto.ini sample cutting as the speech renderer; the backing (music box, pad, bass, soft drums)
is synthesised here. Output: game/src/assets/music/melody-song.mp3.

Run: VOICEBANKS=/path python3 -I scripts/voice/sing_song.py
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).parent))
from utau_render import SR, Voice, load_bank, pick_alias, render_note, vowel  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'game/src/assets/music/melody-song.mp3'
BANK = Path(os.environ.get('VOICEBANKS', '')) / '-.-/ゲキヤク-カプセル剤-'
BPM = 112
BEAT = 60 / BPM

D4, E4, Fs4, G4, A4, B4, Cs5, D5 = 62, 64, 66, 67, 69, 71, 73, 74
R = None  # rest

# (kana, midi, beats). Two bars of intro, verse, chorus ×2, a creepy last line, outro.
SCORE = [
    ('_', R, 8),
    # さんかく しかく / まるい かたち / みんなで かぞえよう
    ('さ', A4, .5), ('ん', A4, .5), ('か', Fs4, .5), ('く', D4, .5), ('し', E4, .5), ('か', Fs4, .5), ('く', G4, 1),
    ('ま', A4, .5), ('る', B4, .5), ('い', A4, .5), ('か', G4, .5), ('た', Fs4, .5), ('ち', E4, 1.5),
    ('み', Fs4, .5), ('ん', Fs4, .5), ('な', G4, .5), ('で', A4, .5), ('か', B4, .5), ('ぞ', A4, .5), ('え', G4, .5), ('よ', Fs4, .5),
    ('う', E4, 2), ('_', R, 2),
    # めろでぃの まほう / いつまでも そばに   (the app's three-note hook A–F♯–D)
    ('め', A4, 1), ('ろ', Fs4, 1), ('でぃ', D4, 1), ('の', E4, 1),
    ('ま', Fs4, .5), ('ほ', G4, .5), ('う', A4, 3),
    ('い', B4, .5), ('つ', A4, .5), ('ま', G4, .5), ('で', Fs4, .5), ('も', G4, 2),
    ('そ', A4, 1), ('ば', B4, 1), ('に', A4, 2),
    # めろでぃの まほう / どこにも いかないで…
    ('め', A4, 1), ('ろ', Fs4, 1), ('でぃ', D4, 1), ('の', E4, 1),
    ('ま', Fs4, .5), ('ほ', G4, .5), ('う', A4, 3),
    ('ど', D5, .5), ('こ', Cs5, .5), ('に', B4, .5), ('も', A4, .5), ('い', G4, .5), ('か', Fs4, .5), ('な', E4, .5), ('い', Fs4, .5),
    ('で', D4, 3), ('_', R, 1),
    ('_', R, 8),
]
# chord roots per bar (D major: I V vi IV), the last two bars sink a little flat
CHORDS = ['D', 'A', 'D', 'A', 'Bm', 'G', 'D', 'A', 'D', 'A', 'Bm', 'G', 'D', 'A', 'Bm', 'D']
CHORD_NOTES = {'D': [62, 66, 69], 'A': [57, 61, 64], 'Bm': [59, 62, 66], 'G': [55, 59, 62]}


def hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def suffix(m: int) -> str:
    # the bank's prefix.map: up to F♯4 → D4 recordings, G4–B4 → G4, C5 and up → C5 (W = soft)
    return 'WD4' if m <= 66 else 'WG4' if m <= 71 else 'WC5'


def vocal(total_s: float) -> np.ndarray:
    bank = load_bank(BANK)
    out = np.zeros(int(SR * (total_s + 2)))
    t = 0.0
    prev_v: str | None = None
    prev_hz: float | None = None
    notes = []
    for kana, m, beats in SCORE:
        dur = beats * BEAT
        if m is None:
            prev_v, prev_hz = None, None
            t += dur
            continue
        v = Voice(bank, suffix(m))
        o = pick_alias(v, prev_v, kana)
        if o is None:
            print(f'no sample for {kana}', file=sys.stderr)
            t += dur
            continue
        notes.append((o, t, dur, hz(m), prev_hz))
        prev_v, prev_hz = vowel(kana), hz(m)
        t += dur
    for j, (o, on, dur, f, pf) in enumerate(notes):
        k = max(0.4, min(1.0, 0.6 * dur * 1000 / max(o.pre, 1)))
        s = on - o.pre * k / 1000
        nxt = notes[j + 1] if j + 1 < len(notes) else None
        joined = nxt is not None and abs(nxt[1] - (on + dur)) < 1e-6
        e = (nxt[1] - nxt[0].pre * 0.8 / 1000 + nxt[0].overlap * 0.8 / 1000) if joined else on + dur
        total_ms = max(40.0, (e - s) * 1000)
        tt = np.linspace(0, total_ms, 96)
        start_hz = pf if pf else f
        lead = o.pre * k + 60
        g = np.clip(tt / lead, 0, 1)
        g = g * g * (3 - 2 * g)
        contour = start_hz * (f / start_hz) ** g
        vib = 0.3 * np.clip((tt - lead - 150) / 200, 0, 1) if dur > 0.45 else 0 * tt
        contour = contour * 2 ** (vib * np.sin(2 * np.pi * 5.0 * tt / 1000) / 12)
        y = render_note(o, k, total_ms, contour, SR) * 0.9
        fi = min(len(y), int(o.overlap * k / 1000 * SR))
        if fi > 0:
            y[:fi] *= np.linspace(0, 1, fi)
        fo = min(len(y), int(0.04 * SR))
        y[-fo:] *= np.linspace(1, 0, fo)
        i0 = max(0, int(s * SR))
        out[i0:i0 + len(y)] += y[: len(out) - i0]
    return out / (np.max(np.abs(out)) or 1)


def tone(f: float, dur: float, harmonics=(1.0, 0.3, 0.12), decay: float = 1.5) -> np.ndarray:
    t = np.arange(int(SR * dur)) / SR
    y = sum(a * np.sin(2 * np.pi * f * (i + 1) * t) for i, a in enumerate(harmonics))
    return y * np.exp(-t * decay) * np.minimum(1, t / 0.004)


def backing(total_s: float) -> np.ndarray:
    n = int(SR * (total_s + 2))
    box, pad, bass, drums = (np.zeros(n) for _ in range(4))
    bar = 4 * BEAT
    rng = np.random.default_rng(3)
    for b, ch in enumerate(CHORDS):
        t0 = b * bar
        notes = CHORD_NOTES[ch]
        flat = -0.35 if b >= len(CHORDS) - 4 else 0.0  # the music box goes slightly out of tune at the end
        # music box: eighth-note arpeggio two octaves up
        arp = [notes[0], notes[1], notes[2], notes[1] + 12, notes[2] + 12, notes[1] + 12, notes[2], notes[1]]
        for i, m in enumerate(arp):
            y = tone(hz(m + 24 + flat), 0.9, (1.0, 0.0, 0.25, 0.0, 0.08), 4.5)
            i0 = int((t0 + i * BEAT / 2) * SR)
            box[i0:i0 + len(y)] += y[: n - i0]
        # pad: the chord held, softly detuned
        for m in notes:
            t = np.arange(int(SR * bar)) / SR
            y = sum(np.sin(2 * np.pi * hz(m + 12) * (1 + d) * t) for d in (-0.003, 0.0, 0.004)) / 3
            y *= np.minimum(1, t / 0.4) * np.minimum(1, (bar - t) / 0.3)
            i0 = int(t0 * SR)
            pad[i0:i0 + len(y)] += y[: n - i0]
        # bass: root on every beat
        for q in range(4):
            y = tone(hz(notes[0] - 12), BEAT * 0.9, (1.0, 0.2), 3.0)
            i0 = int((t0 + q * BEAT) * SR)
            bass[i0:i0 + len(y)] += y[: n - i0]
        # soft drums from the verse on (bar 2), not in the last bar
        if 2 <= b < len(CHORDS) - 1:
            for q in (0, 2):
                t = np.arange(int(SR * 0.25)) / SR
                k = np.sin(2 * np.pi * (55 + 90 * np.exp(-t * 30)) * t) * np.exp(-t * 14)
                i0 = int((t0 + q * BEAT) * SR)
                drums[i0:i0 + len(k)] += k
            for e in range(8):
                t = np.arange(int(SR * 0.05)) / SR
                h = rng.standard_normal(len(t))
                h = np.diff(h, prepend=0) * np.exp(-t * 90) * (0.6 if e % 2 else 0.35)
                i0 = int((t0 + e * BEAT / 2) * SR)
                drums[i0:i0 + len(h)] += h * 0.5
    norm = lambda x: x / (np.max(np.abs(x)) or 1)  # noqa: E731
    return 0.38 * norm(box) + 0.16 * norm(pad) + 0.30 * norm(bass) + 0.18 * norm(drums)


def main() -> int:
    if not BANK.is_dir():
        print('set VOICEBANKS to the folder with the unpacked voicebanks', file=sys.stderr)
        return 1
    total = sum(b for _, _, b in SCORE) * BEAT
    v = vocal(total)
    bg = backing(total)
    n = min(len(v), len(bg))
    mix = 0.85 * v[:n] + 0.6 * bg[:n]
    tail = int(1.5 * SR)
    mix[-tail:] *= np.linspace(1, 0, tail)
    mix = mix / np.max(np.abs(mix)) * 0.89
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        sf.write(tmp.name, mix, SR)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp.name, '-ac', '1', '-b:a', '96k', str(OUT)], check=True)
    print(f'{total:.1f} s → {OUT}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
