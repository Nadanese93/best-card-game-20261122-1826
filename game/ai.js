// ai.js — logika AI "Bang Jarwo", pedagang lawan.
// AI memilih langkah yang BISA DIBACA dan DILAWAN pemain:
//   1. bunuh kartu pemain yang bisa ia bunuh di satu lapak,
//   2. serang HP langsung lewat lapak kosong,
//   3. tempati lapak yang pemainnya lemah,
//   4. pakai efek (heal/draw/coin) saat berguna.
// AI tidak pernah melihat tangan pemain; ia hanya membaca papan.

'use strict';

// Nilai satu langkah (kartu di tangan AI -> lapak) pada papan saat ini.
// Mengembalikan skor; makin besar makin menarik buat AI.
function scoreAiMove(state, card, lane) {
  const ai = state.ai;
  const foe = state.player;
  const foeLane = foe.lanes[lane];
  const myLane = ai.lanes[lane];
  if (myLane.length >= MAX_PER_LANE) return -999;

  let score = card.atk * 1.0 + card.hp * 0.3;

  if (foeLane.length === 0) {
    // Lapak kosong: kartu ini akan menghantam HP pemain langsung di fase serang.
    score += card.atk * 1.5;
  } else {
    const front = foeLane[0];
    if (card.atk >= front.hp) score += 2.0; // bisa membunuh kartu depan lawan
    if (card.hp > front.atk) score += 1.0; // dan selamat dari serangan balik
    if (card.effect && card.effect.type === 'splash') score += 1.5;
  }

  // Efek kartu, dinilai dari kondisi saat ini.
  if (card.effect) {
    if (card.effect.type === 'heal' && ai.hp < 15) score += 1.5;
    if (card.effect.type === 'draw') score += 1.5;
    if (card.effect.type === 'coin') score += 1.0;
    if (card.effect.type === 'shield') score += 0.5;
  }

  // Efisiensi: kartu mahal harus sepadan.
  score -= card.cost * 0.2;
  return score;
}

// Langkah terbaik AI saat ini, atau null kalau tidak ada langkah yang layak.
// Dipanggil berulang: AI main satu kartu, papan berubah, lalu cari lagi.
function aiBestMove(state) {
  const ai = state.ai;
  let best = null;
  for (let h = 0; h < ai.hand.length; h++) {
    const card = ai.hand[h];
    if (card.cost > ai.coins) continue;
    for (let lane = 0; lane < LANES; lane++) {
      const score = scoreAiMove(state, card, lane);
      if (!best || score > best.score) best = { handIndex: h, lane, score };
    }
  }
  // Ambang: jangan buang kartu jelek cuma karena bisa.
  if (!best || best.score < 0.8) return null;
  return best;
}
