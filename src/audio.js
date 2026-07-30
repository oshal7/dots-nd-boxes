// audio.js — Web Audio SFX generated procedurally (no asset files).
// All sounds are short synthesized blips so the game stays a single static site.

let ctx = null;
let master = null;
let muted = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

// Browsers suspend AudioContext until a user gesture; call on first interaction.
export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(v) {
  muted = !!v;
  if (master) master.gain.value = muted ? 0 : 0.5;
}

export function isMuted() {
  return muted;
}

export function toggleMuted() {
  setMuted(!muted);
  return muted;
}

/**
 * Play a simple tone.
 * @param {object} o
 * @param {number} o.freq   start frequency (Hz)
 * @param {number} [o.freq2] end frequency for a glide
 * @param {number} [o.dur]  seconds
 * @param {OscillatorType} [o.type]
 * @param {number} [o.gain] peak gain
 * @param {number} [o.delay] start delay seconds
 */
function tone({ freq, freq2, dur = 0.15, type = 'sine', gain = 0.3, delay = 0 }) {
  const c = ensure();
  if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freq2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq2), t0 + dur);
  // Quick attack, smooth decay envelope.
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// ---- named sound effects ------------------------------------------------

export const sfx = {
  hover() {
    tone({ freq: 880, dur: 0.05, type: 'sine', gain: 0.06 });
  },
  snap() {
    // Elastic "thwip": quick downward glide + a click transient.
    tone({ freq: 520, freq2: 340, dur: 0.12, type: 'triangle', gain: 0.28 });
    tone({ freq: 1200, dur: 0.03, type: 'square', gain: 0.08 });
  },
  capture() {
    // Bright pop.
    tone({ freq: 440, freq2: 880, dur: 0.18, type: 'sine', gain: 0.3 });
    tone({ freq: 660, dur: 0.14, type: 'triangle', gain: 0.15, delay: 0.02 });
  },
  /** Ascending pitch that rises with the combo count (PRD chain combo). */
  combo(n) {
    const base = 523.25; // C5
    const freq = base * Math.pow(2, Math.min(n, 8) / 12); // rise per combo step
    tone({ freq, freq2: freq * 1.5, dur: 0.22, type: 'sine', gain: 0.32 });
    tone({ freq: freq * 2, dur: 0.1, type: 'triangle', gain: 0.12, delay: 0.03 });
  },
  turn() {
    tone({ freq: 392, freq2: 523, dur: 0.16, type: 'sine', gain: 0.14 });
  },
  click() {
    tone({ freq: 300, dur: 0.05, type: 'square', gain: 0.12 });
  },
  invalid() {
    tone({ freq: 180, freq2: 120, dur: 0.14, type: 'sawtooth', gain: 0.16 });
  },
  countdown() {
    tone({ freq: 700, dur: 0.12, type: 'sine', gain: 0.2 });
  },
  go() {
    tone({ freq: 700, freq2: 1200, dur: 0.25, type: 'sine', gain: 0.3 });
  },
  victory() {
    // Little ascending arpeggio fanfare.
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) =>
      tone({ freq: f, dur: 0.3, type: 'triangle', gain: 0.26, delay: i * 0.12 })
    );
    tone({ freq: 1046.5, freq2: 1568, dur: 0.5, type: 'sine', gain: 0.22, delay: 0.5 });
  },
  lose() {
    const notes = [440, 392, 349, 294];
    notes.forEach((f, i) =>
      tone({ freq: f, dur: 0.28, type: 'triangle', gain: 0.2, delay: i * 0.13 })
    );
  },
};
