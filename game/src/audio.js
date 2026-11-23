// audio.js — tiny WebAudio bleeps, written from oscillators only: a click
// for a button, a snap for a dealt card, a rising run for a win and a low
// buzz for a bust. The context is created lazily on the first user gesture
// so the page never tries to make sound before it is allowed to.

let context = null;
let muted = false;

function ensureContext() {
  if (!context) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioCtor) context = new AudioCtor();
  }
  if (context && context.state === 'suspended') context.resume();
  return context;
}

function tone(freq, startOffset, duration, type = 'square', gainValue = 0.05) {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = ctx.currentTime + startOffset;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export const sfx = {
  click() { tone(660, 0, 0.06, 'square', 0.04); },
  deal() { tone(320, 0, 0.05, 'triangle', 0.06); tone(520, 0.05, 0.05, 'triangle', 0.05); },
  chip() { tone(880, 0, 0.04, 'square', 0.05); tone(1180, 0.04, 0.05, 'square', 0.04); },
  win() { tone(523, 0, 0.09, 'triangle', 0.06); tone(659, 0.09, 0.09, 'triangle', 0.06); tone(784, 0.18, 0.14, 'triangle', 0.07); },
  blackjack() { tone(523, 0, 0.08, 'triangle', 0.06); tone(659, 0.08, 0.08, 'triangle', 0.06); tone(784, 0.16, 0.08, 'triangle', 0.06); tone(1046, 0.24, 0.2, 'triangle', 0.08); },
  lose() { tone(220, 0, 0.16, 'sawtooth', 0.05); tone(160, 0.12, 0.2, 'sawtooth', 0.05); },
  event() { tone(392, 0, 0.08, 'square', 0.05); tone(587, 0.08, 0.12, 'square', 0.05); },
};

export function toggleMuted() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}
