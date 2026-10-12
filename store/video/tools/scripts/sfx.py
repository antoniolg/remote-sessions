"""Synthesizes the small sound effects of the video into public/audio/: tap, whoosh and notification chime.
Run: uv run --with numpy python scripts/sfx.py
"""
import os
import wave

import numpy as np

SR = 48000
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "audio")
rng = np.random.default_rng(7)


def save(name, x, peak_db):
    x = x / (np.max(np.abs(x)) + 1e-9) * 10 ** (peak_db / 20)
    stereo = np.stack([x, x], axis=1)
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((stereo * 32767).astype("<i2").tobytes())


def tap():
    t = np.arange(int(SR * 0.09)) / SR
    body = np.sin(2 * np.pi * 1700 * t) * np.exp(-t / 0.012) + 0.5 * np.sin(2 * np.pi * 900 * t) * np.exp(-t / 0.02)
    click = rng.normal(0, 1, len(t)) * np.exp(-t / 0.002)
    return 0.8 * body + 0.35 * click


def whoosh(length=0.75):
    n = int(SR * length)
    t = np.arange(n) / SR
    noise = rng.normal(0, 1, n)
    # Band-pass sweep: a moving one-pole low-pass minus a slower one, centre rising then falling.
    centre = 300 + 3200 * np.sin(np.pi * t / length) ** 2
    out = np.zeros(n); lp1 = lp2 = 0.0
    for i in range(n):
        a1 = 1 - np.exp(-2 * np.pi * centre[i] * 1.6 / SR)
        a2 = 1 - np.exp(-2 * np.pi * centre[i] * 0.4 / SR)
        lp1 += a1 * (noise[i] - lp1); lp2 += a2 * (noise[i] - lp2)
        out[i] = lp1 - lp2
    env = np.sin(np.pi * np.clip(t / length, 0, 1)) ** 1.6
    return out * env


def chime():
    t = np.arange(int(SR * 0.7)) / SR
    def bell(f, start):
        tt = np.clip(t - start, 0, None)
        on = (t >= start).astype(float)
        return on * (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt / 0.18)
    return bell(1318.5, 0) + 0.85 * bell(1975.5, 0.11)


os.makedirs(OUT, exist_ok=True)
save("tap.wav", tap(), -9)
save("whoosh.wav", whoosh(), -6)
save("chime.wav", chime(), -8)
print("ok")
