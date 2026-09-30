#!/usr/bin/env python3
"""mix.py — offline mix: silent picture + edited score + per-event sound effects → master MP4 + music-only MP4.

Kit rules (references/audio.md), made measurable:
  * each effect's gain is solved so its 50 ms in-band peak sits TARGET dB over the music in the same band/window;
  * the ear-sensitive 2–8 kHz band may lift at most HF_CAP dB;
  * an effect's sample peak may not exceed the local music peak + PK_CAP dB;
  * "effects never louder than the music": the effect's own 150 ms full-band RMS stays ≥ 1 dB under the music's;
  * events closer than 0.15 s to the previous one are softened ×0.6;
  * music: gentle low-shelf + 2:1 compression, levelled; final bus limited to −1.5 dBTP; target ≈ −16 LUFS.
Usage: python3 tools/mix.py <picture.mp4> <out_base> [--score assets/music/score-b.wav] [--plan assets/sfx/plan.json]
Writes <out_base>.mp4 (master), <out_base>-music-only.mp4, review/mix-<name>.txt
plan.json: [["whoosh", 1.10, "pull-back"], ["pop", 5.83, "capture"], ...]  (sfx name in assets/sfx/<name>.wav, film time)
"""
import json, subprocess, sys, re
import numpy as np
from pathlib import Path
from scipy.signal import butter, sosfilt
P = Path(__file__).resolve().parents[1]; SR = 48000; FILM = 30.0; N = int(FILM * SR)
a = sys.argv[1:]; pic, outb = a[0], a[1]
opt = lambda k, d: a[a.index(k) + 1] if k in a else d
score = opt('--score', str(P / 'assets/music/score-b.wav')); plan_p = opt('--plan', str(P / 'assets/sfx/plan.json'))
TARGET = float(opt('--target', '2.5')); HF_CAP = float(opt('--hf-cap', '3')); PK_CAP = float(opt('--pk-cap', '3'))
MUSIC_LUFS = float(opt('--music-lufs', '-17.0')); FINAL_TP = -1.5

def load(p, ch=2):
    y = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', str(ch), '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout, np.float32)
    return y.reshape(-1, ch).copy()
def write(p, x): subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', str(p)], input=np.clip(x, -1, 1).astype(np.float32).tobytes(), check=True)
def meas(x):
    tmp = P / 'renders/_meas.wav'; write(tmp, x)
    e = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(tmp), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', e)[-1]); LRA = float(re.findall(r'LRA:\s+([\d.]+) LU', e)[-1]); TP = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', e)[-1])
    return I, LRA, TP
db = lambda v: 10 * np.log10(v + 1e-12)
def pk50(y):  # max 50 ms mean-square, dB
    h = int(.05 * SR); return max(db((y[i:i + h] ** 2).mean()) for i in range(0, max(1, len(y) - h), h // 2))
def rms150(y): h = int(.15 * SR); return max(db((y[i:i + h] ** 2).mean()) for i in range(0, max(1, len(y) - h), h // 3))

# ---- music stem ----
raw = P / 'renders/_music_chain.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', score, '-af', 'lowshelf=f=90:g=-2,acompressor=threshold=-22dB:ratio=2:attack=8:release=160:knee=6', '-ar', str(SR), '-ac', '2', str(raw)], check=True)
mus = load(raw)[:N]; mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
I0 = meas(mus)[0]; mus *= 10 ** ((MUSIC_LUFS - I0) / 20)
mono = mus.mean(1)
# ---- effects ----
plan = json.loads(Path(plan_p).read_text()) if Path(plan_p).exists() else []
fx = np.zeros_like(mus); HB = butter(4, [2000, 8000], btype='band', fs=SR, output='sos'); rep = []; last_t = -9
for name, t, *note in sorted(plan, key=lambda r: r[1]):
    s = load(P / f'assets/sfx/{name}.wav', 1)[:, 0]
    s = s[np.argmax(np.abs(s) > 0.01 * np.abs(s).max()):]  # trim to onset so the sound starts on its cue
    if name.startswith('whoosh'):  # a whoosh is cued by its energy peak (the cut), so start it that much earlier
        env = np.convolve(s ** 2, np.ones(480) / 480, 'same'); t = max(0.0, t - np.argmax(env) / SR)
    F = np.abs(np.fft.rfft(s * np.hanning(len(s)))) ** 2; f = np.fft.rfftfreq(len(s), 1 / SR); c = np.cumsum(F) / F.sum()
    lo = max(f[np.searchsorted(c, .2)], 60); hi = min(max(f[np.searchsorted(c, .8)], lo * 2), SR / 2 - 500)
    sos = butter(4, [lo, hi], btype='band', fs=SR, output='sos')
    i0 = int(t * SR); W = min(len(s), int(.3 * SR)); base = mono[i0:i0 + W]
    if len(base) < W: base = np.pad(base, (0, W - len(base)))
    b_in = pk50(sosfilt(sos, base)); b_hf = pk50(sosfilt(HB, base)); b_rms = rms150(base); b_pk = db(np.max(base ** 2))
    g = 0.0; why = 'target'
    for x in np.geomspace(.003, 2.0, 200):
        mix = base + x * s[:W]
        if pk50(sosfilt(HB, mix)) - b_hf > HF_CAP: why = 'hf-cap'; break
        if db(np.max((x * s[:W]) ** 2)) > b_pk + PK_CAP: why = 'peak-cap'; break
        if rms150(x * s[:W]) > b_rms - 1.0: why = 'under-music'; break
        g = x
        if pk50(sosfilt(sos, mix)) - b_in >= TARGET: why = 'target'; break
    if t - last_t < 0.15: g *= 0.6; why += '+cluster'
    last_t = t
    j1 = min(N, i0 + len(s)); fx[i0:j1] += (g * s[:j1 - i0])[:, None]
    mix = base + g * s[:W]
    rep.append(f"{t:6.2f}s {name:12s} gain {g:6.3f} in-band +{pk50(sosfilt(sos, mix)) - b_in:4.1f} dB  2-8k +{pk50(sosfilt(HB, mix)) - b_hf:4.1f} dB  "
               f"fx-rms vs music {rms150(g * s[:W]) - b_rms:5.1f} dB  [{why}] {' '.join(map(str, note))}")
# ---- bus ----
def master(x):
    lim = P / 'renders/_bus.wav'; write(lim, x)
    o = P / 'renders/_bus_lim.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(lim), '-af', f'alimiter=limit={10 ** (FINAL_TP / 20):.4f}:attack=5:release=60:level=disabled', '-ar', str(SR), str(o)], check=True)
    return load(o)
full = master(mus + fx); music_only = master(mus.copy())
name = Path(outb).name
for x, suffix in [(full, ''), (music_only, '-music-only')]:
    wav = P / f'renders/_{name}{suffix}.wav'; write(wav, x)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', pic, '-i', str(wav), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', f'{outb}{suffix}.mp4'], check=True)
mI, mL, mT = meas(full); oI, oL, oT = meas(music_only)
txt = [f'master: I {mI:.1f} LUFS, LRA {mL:.1f} LU, true-peak-ish {mT:.1f} dBFS', f'music-only: I {oI:.1f} LUFS, LRA {oL:.1f} LU, peak {oT:.1f} dBFS',
       f'effects add {mI - oI:+.2f} LU to the integrated loudness', ''] + rep
(P / 'review').mkdir(exist_ok=True); (P / f'review/mix-{name}.txt').write_text('\n'.join(txt) + '\n'); print('\n'.join(txt))
