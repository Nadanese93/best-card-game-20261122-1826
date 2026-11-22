// audio.js — SFX WebAudio, tanpa file suara, tanpa network.
// Semua bunyi disintesis dari OscillatorNode + GainNode.

'use strict';

let audioCtx = null;
let muted = false;

function getCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function setMuted(m) {
  muted = m;
}

function isMuted() {
  return muted;
}

// Satu nada pendek.
function tone(freq, dur, type, vol, when) {
  const ctx = getCtx();
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + (when || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(vol || 0.12, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// Bunyi bernama: click, play (kartu dimainkan), hit (serangan), heal, coin, win, lose.
function sfx(name) {
  if (muted) return;
  switch (name) {
    case 'click':
      tone(660, 0.06, 'triangle', 0.08);
      break;
    case 'play':
      tone(392, 0.09, 'triangle', 0.12);
      tone(523, 0.12, 'triangle', 0.12, 0.07);
      break;
    case 'hit':
      tone(160, 0.14, 'sawtooth', 0.14);
      tone(90, 0.18, 'square', 0.10, 0.02);
      break;
    case 'heal':
      tone(523, 0.10, 'sine', 0.10);
      tone(784, 0.16, 'sine', 0.10, 0.08);
      break;
    case 'coin':
      tone(988, 0.07, 'square', 0.07);
      tone(1319, 0.12, 'square', 0.07, 0.06);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.13, i * 0.13));
      break;
    case 'lose':
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.26, 'triangle', 0.12, i * 0.15));
      break;
    default:
      break;
  }
}
