#!/usr/bin/env python3
"""music.py — edit "Familiar Roads" (Tanner Helland, CC BY 4.0) to the film.

The song is 115.2 BPM in 4/4; its audio sits ~0.02 s after the MIDI grid (measured by cross-correlating the MIDI
kick drum with low-band onsets). We time-stretch it to 120 BPM (pitch preserved, rubberband) so beat = 0.5 s and
bar = 2.0 s, then start at bar 2 so the groove (bar 4) enters exactly at film 4.0 s.

Variants:
  a  bars 2–16 straight through, 1.4 s fade at the end
  b  bars 2–13, then the song's breakdown (bars 44–46: same B chord as bar 14, guitar out / harp in) spliced on the film-26.0 bar line
     under the brand + end card, 1.4 s fade at the end
Usage: python3 tools/music.py <src.flac> <out_dir>
"""
import subprocess, sys, numpy as np
from pathlib import Path
SR = 48000; STRETCH = 120 / 115.2; OFF = 0.02; BAR = 60 / 115.2 * 4; FILM = 30.0
src, out = sys.argv[1], Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
tmp = out / '_stretched.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', f'rubberband=tempo={STRETCH}:pitchq=quality:transients=crisp', '-ar', str(SR), '-ac', '2', str(tmp)], check=True)
y = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', str(tmp), '-f', 'f32le', '-'], capture_output=True).stdout, np.float32).reshape(-1, 2).copy()
bar_t = lambda n: (OFF + n * BAR) / STRETCH  # stretched-time start of song bar n (≈ 0.019 + 2.0 n)
S = lambda sec: int(round(sec * SR))
def take(n0, n1):  # song bars [n0, n1)
    return y[S(bar_t(n0)):S(bar_t(n1))]
def xjoin(a, b, ms=25):  # equal-power crossfade on the bar line
    n = S(ms / 1000); w = np.linspace(0, np.pi / 2, n)[:, None]
    return np.concatenate([a[:-n], a[-n:] * np.cos(w) + b[:n] * np.sin(w), b[n:]])
def finish(x, name):
    N = S(FILM); x = x[:N] if len(x) >= N else np.pad(x, ((0, N - len(x)), (0, 0)))
    x = x.copy(); fi = S(0.005); x[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo0 = S(FILM - 1.4); x[fo0:] *= (np.linspace(1, 0, N - fo0) ** 1.6)[:, None]
    p = out / f'score-{name}.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', str(p)], input=x.astype(np.float32).tobytes(), check=True)
    print('wrote', p, f'{len(x) / SR:.2f}s')
finish(take(2, 17), 'a')
finish(xjoin(take(2, 14), take(44, 47)), 'b')
tmp.unlink()
