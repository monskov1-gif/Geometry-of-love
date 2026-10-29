"""Speech synthesis from UTAU voicebanks, the way UTAU itself renders a note
sequence: every mora is a sample cut from the bank by its oto.ini entry
(offset / consonant / cutoff / preutterance / overlap), its consonant part kept,
its vowel part stretched to the mora length, its pitch moved to the target
contour by the WORLD vocoder (the analysis/synthesis behind the world4utau and
moresampler resamplers), and the samples cross-faded by their overlaps.

UTAU.exe is a Windows program; this container has no Windows runtime, so the
same bank data is rendered here directly. See docs/VOICE.md.

Run: python3 -I scripts/voice/utau_render.py <bank-dir> <suffix> <kana> <out.wav> [base_hz]
"""
from __future__ import annotations

import math
import re
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pyworld
import soundfile as sf

FRAME_MS = 5.0
SR = 44100


@dataclass
class Oto:
    wav: Path
    offset: float
    consonant: float
    cutoff: float
    pre: float
    overlap: float


def read_text(p: Path) -> str:
    raw = p.read_bytes()
    for enc in ('cp932', 'utf-8', 'utf-16'):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    raise ValueError(f'cannot decode {p}')


def load_bank(root: Path) -> dict[str, Oto]:
    """Every alias of every oto.ini under the bank (first one wins on duplicates)."""
    table: dict[str, Oto] = {}
    for ini in sorted(root.rglob('oto.ini')):
        for line in read_text(ini).splitlines():
            m = re.match(r'^(.+?\.wav)=(.*?),([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\s*$', line)
            if not m:
                continue
            wav, alias = ini.parent / m.group(1), m.group(2) or Path(m.group(1)).stem.lstrip('_')
            if alias not in table and wav.exists():
                table[alias] = Oto(wav, *(float(m.group(i)) for i in range(3, 8)))
    return table


# --- kana → morae -------------------------------------------------------------

SMALL = set('ゃゅょぁぃぅぇぉゎ')
VOWEL_OF = {}
for row, v in (('あかさたなはまやらわがざだばぱぁゃゎ', 'a'), ('いきしちにひみりぎじぢびぴぃ', 'i'), ('うくすつぬふむゆるぐずづぶぷぅゅゔ', 'u'),
               ('えけせてねへめれげぜでべぺぇ', 'e'), ('おこそとのほもよろをごぞどぼぽぉょ', 'o')):
    for ch in row:
        VOWEL_OF[ch] = v
VOWEL_OF['ん'] = 'n'


def to_hiragana(s: str) -> str:
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)


def morae(kana: str) -> list[str]:
    """Splits kana into morae; 'っ' → '_q' (a stop), 'ー' → '_long', punctuation → '_pause'."""
    out: list[str] = []
    for ch in to_hiragana(kana):
        if ch in SMALL and out and not out[-1].startswith('_'):
            out[-1] += ch
        elif ch == 'っ':
            out.append('_q')
        elif ch == 'ー':
            out.append('_long')
        elif ch in '、,…・ 　':
            out.append('_pause')
        elif ch in '。.！!？?':
            out.append('_end')
        elif ch in VOWEL_OF or ch in 'ん':
            out.append(ch)
    return out


def vowel(m: str) -> str:
    return VOWEL_OF.get(m[-1], 'a')


# --- WORLD helpers ------------------------------------------------------------

_cache: dict[Path, tuple[np.ndarray, int]] = {}


def read_wav(p: Path) -> tuple[np.ndarray, int]:
    if p not in _cache:
        x, sr = sf.read(str(p), dtype='float64', always_2d=True)
        _cache[p] = (x.mean(axis=1), sr)
    return _cache[p]


def render_note(o: Oto, length_ms: float, f0_hz: np.ndarray, sr_out: int) -> np.ndarray:
    """One sample: [offset, offset+consonant] untouched in time, the rest stretched to fit."""
    x, sr = read_wav(o.wav)
    start = o.offset / 1000
    end = (len(x) / sr - o.cutoff / 1000) if o.cutoff >= 0 else start + (-o.cutoff) / 1000
    seg = x[int(start * sr): max(int(start * sr) + 1, int(end * sr))]
    if len(seg) < sr * 0.02:
        seg = x[int(start * sr): int(start * sr) + int(0.1 * sr)]
    f0, t = pyworld.harvest(seg, sr, frame_period=FRAME_MS, f0_floor=70, f0_ceil=900)
    sp = pyworld.cheaptrick(seg, f0, t, sr)
    ap = pyworld.d4c(seg, f0, t, sr)
    n = len(f0)
    fixed = min(n - 1, max(1, int(o.consonant / FRAME_MS)))
    want = max(fixed + 2, int((length_ms + o.pre) / FRAME_MS))
    # consonant frames as recorded, vowel frames resampled to the remaining length
    tail = np.linspace(fixed, n - 1, want - fixed)
    idx = np.concatenate([np.arange(fixed), tail]).astype(int)
    sp2, ap2, vo = sp[idx], ap[idx], f0[idx] > 0
    target = np.interp(np.arange(len(idx)), np.linspace(0, len(idx) - 1, len(f0_hz)), f0_hz)
    f02 = np.where(vo, target, 0.0)
    y = pyworld.synthesize(f02, np.ascontiguousarray(sp2), np.ascontiguousarray(ap2), sr, FRAME_MS)
    if sr != sr_out:
        y = np.interp(np.linspace(0, len(y) - 1, int(len(y) * sr_out / sr)), np.arange(len(y)), y)
    return y


# --- speech: morae → timed notes with an intonation contour --------------------

@dataclass
class Voice:
    bank: dict[str, Oto]
    suffix: str
    base_hz: float = 260.0
    range_st: float = 3.0  # semitones of rise and fall across a phrase
    mora_ms: float = 120.0
    gain: float = 0.9


def pick_alias(v: Voice, prev_v: str | None, m: str) -> Oto | None:
    cands = ([f'{prev_v} {m}'] if prev_v else []) + [f'- {m}', m, f'* {m}']
    for c in cands:
        for a in (c + v.suffix, c):
            if a in v.bank:
                return v.bank[a]
    return None


def speak(v: Voice, kana: str, question: bool | None = None, energy: float = 1.0) -> np.ndarray:
    ms = morae(kana)
    question = question if question is not None else kana.rstrip().endswith(('？', '?', 'か'))
    words = [m for m in ms if not m.startswith('_')]
    total = max(1, len(words))
    out = np.zeros(int(SR * (len(ms) * v.mora_ms / 1000 + 1.5)))
    cursor = 0.15 * SR
    prev_v: str | None = None
    k = 0
    last_end = 0
    for i, m in enumerate(ms):
        if m in ('_pause', '_end'):
            cursor += SR * (0.18 if m == '_pause' else 0.32)
            prev_v = None
            continue
        if m == '_q':
            cursor += SR * v.mora_ms / 1000 * 0.8
            prev_v = None  # the stop breaks the vowel join
            continue
        length = v.mora_ms * (1.8 if i + 1 < len(ms) and ms[i + 1] == '_long' else 1.0)
        if m == '_long':
            continue
        # phrase contour: a rise over the first two morae, then a slow declination;
        # questions lift the last mora, energy widens the range
        p = k / max(1, total - 1)
        st = v.range_st * energy * (min(1.0, k / 1.5) - 1.3 * p)
        if question and k == total - 1:
            st += 4.0
        k += 1
        hz = v.base_hz * 2 ** (st / 12)
        hz_end = v.base_hz * 2 ** ((st - 0.6 * v.range_st / total) / 12)
        o = pick_alias(v, prev_v, m)
        if o is None:
            print(f'  no sample for "{m}" (after {prev_v})', file=sys.stderr)
            cursor += SR * length / 1000
            prev_v = vowel(m)
            continue
        y = render_note(o, length, np.linspace(hz, hz_end, 8), SR) * v.gain
        # the sample starts `pre` ms before the mora onset; its first `overlap` ms fade in
        s0 = int(cursor - o.pre / 1000 * SR)
        s0 = max(0, s0)
        fade = min(len(y), int(o.overlap / 1000 * SR))
        if fade > 0:
            y[:fade] *= np.linspace(0, 1, fade)
        fo = min(len(y), int(0.03 * SR))
        y[-fo:] *= np.linspace(1, 0, fo)
        if s0 + len(y) > len(out):
            out = np.concatenate([out, np.zeros(s0 + len(y) - len(out))])
        out[s0:s0 + len(y)] += y
        last_end = max(last_end, s0 + len(y))
        cursor += SR * length / 1000
        prev_v = vowel(m)
    out = out[: last_end + int(0.1 * SR)]
    peak = np.max(np.abs(out)) or 1.0
    return out / peak * 0.8


def main() -> int:
    if len(sys.argv) < 5:
        print(__doc__)
        return 1
    bank = load_bank(Path(sys.argv[1]))
    v = Voice(bank, sys.argv[2], base_hz=float(sys.argv[5]) if len(sys.argv) > 5 else 260.0)
    y = speak(v, sys.argv[3])
    sf.write(sys.argv[4], y, SR)
    print(f'{len(bank)} aliases, {len(y) / SR:.2f} s → {sys.argv[4]}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
