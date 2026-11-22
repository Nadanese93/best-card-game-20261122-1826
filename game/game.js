// game.js — mesin game "Duel Lapak Pasar Malam".
// Alur: title -> giliran pemain (main kartu ke 3 lapak) -> giliran AI
//      -> fase serang (semua lapak serentak) -> ronde berikut, dst.
// Menang/kalah: HP 20 vs 20, pertama habis kalah.

'use strict';

const state = {
  screen: 'title', // title | game | win | lose
  phase: 'player', // player | ai | combat | over
  turn: 1,
  player: null,
  ai: null,
  selected: null, // index kartu di tangan pemain yang dipilih
  log: [],
  busy: false, // true saat animasi AI / serang berjalan
};

function freshSide(owner) {
  return {
    hp: MAX_HP,
    maxHp: MAX_HP,
    coins: 0,
    deck: shuffle(buildDeck(owner)),
    hand: [],
    discard: [],
    lanes: [[], [], []],
  };
}

function addLog(line) {
  state.log.push('R' + state.turn + ' · ' + line);
}

// Invariant: total kartu tiap sisi harus selalu = deck awal (20).
// Dicek sebelum render; kalau pecah, tulis error jelas ke console.
function checkInvariant() {
  for (const [name, side] of [['Kamu', state.player], ['AI', state.ai]]) {
    const total =
      side.deck.length +
      side.hand.length +
      side.discard.length +
      side.lanes[0].length + side.lanes[1].length + side.lanes[2].length;
    if (total !== DECK_SIZE) {
      console.error('[INVARIANT] ' + name + ': total kartu ' + total + ', harus ' + DECK_SIZE);
    }
  }
}

function coinsForTurn(turn) {
  return Math.min(2 + turn, MAX_COINS); // R1=3, R2=4, ... maks 8
}

function newGame() {
  state.screen = 'game';
  state.phase = 'player';
  state.turn = 1;
  state.selected = null;
  state.log = [];
  state.busy = false;
  state.player = freshSide('p');
  state.ai = freshSide('a');
  drawCards(state.player, START_HAND);
  drawCards(state.ai, START_HAND);
  state.player.coins = coinsForTurn(1);
  state.ai.coins = coinsForTurn(1);
  addLog('Duel dimulai! HP 20 vs 20. Koin ronde 1: 3.');
  addLog('Bang Jarwo: "Ayo, Nak. Lapakku nggak gampang roboh!"');
  checkInvariant();
  renderAll(state);
}

// Efek saat kartu dimainkan ke lapak.
function applyPlayEffect(side, foe, card, lane) {
  const eff = card.effect;
  if (!eff) return;
  if (eff.type === 'heal') {
    side.hp = Math.min(side.maxHp, side.hp + eff.value);
    addLog(card.name + ' memulihkan ' + eff.value + ' HP.');
    sfx('heal');
  } else if (eff.type === 'draw') {
    drawCards(side, eff.value);
    addLog(card.name + ': tarik ' + eff.value + ' kartu.');
  } else if (eff.type === 'coin') {
    side.coins += eff.value;
    addLog(card.name + ': dapat ' + eff.value + ' koin.');
    sfx('coin');
  } else if (eff.type === 'splash') {
    foe.lanes[lane].forEach((c) => { c.hp -= eff.value; });
    addLog(card.name + ' menghantam semua kartu lawan di ' + LANE_NAMES[lane] + ' (' + eff.value + ').');
    cleanupLane(foe, lane);
    sfx('hit');
  } else if (eff.type === 'shield') {
    card.hp += eff.value;
    card.maxHp += eff.value;
    addLog(card.name + ' masuk dengan +' + eff.value + ' HP.');
  }
}

// Buang kartu di satu lapak yang HP-nya <= 0.
function cleanupLane(side, lane) {
  const kept = [];
  side.lanes[lane].forEach((c) => {
    if (c.hp <= 0) side.discard.push(c);
    else kept.push(c);
  });
  side.lanes[lane] = kept;
}

// Pemain memainkan kartu terpilih ke lapak.
function placeCard(lane) {
  if (state.screen !== 'game' || state.phase !== 'player' || state.busy) return;
  if (state.selected === null) return;
  const side = state.player;
  const card = side.hand[state.selected];
  if (!card) { state.selected = null; renderAll(state); return; }
  if (card.cost > side.coins) {
    addLog('Koin kurang untuk ' + card.name + ' (' + card.cost + ' koin).');
    renderAll(state);
    return;
  }
  if (side.lanes[lane].length >= MAX_PER_LANE) {
    addLog(LANE_NAMES[lane] + ' sudah penuh (maks ' + MAX_PER_LANE + ' kartu).');
    renderAll(state);
    return;
  }
  side.hand.splice(state.selected, 1);
  side.coins -= card.cost;
  side.lanes[lane].push(card);
  addLog('Kamu menaruh ' + card.name + ' (' + card.suit + ' ' + card.atk + '/' + card.hp + ') di ' + LANE_NAMES[lane] + '.');
  sfx('play');
  state.selected = null;
  applyPlayEffect(side, state.ai, card, lane);
  checkInvariant();
  renderAll(state);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fase serang: semua lapak serentak. Tiap kartu menghantam kartu depan
// lawan di lapak yang sama; kalau lapak lawan kosong, menghantam HP langsung.
// Damage dihitung dulu, baru diterapkan serentak (adil dua arah).
async function resolveCombat() {
  state.phase = 'combat';
  renderAll(state);
  addLog('— Fase serang ronde ' + state.turn + ' —');
  for (let lane = 0; lane < LANES; lane++) {
    const pLane = state.player.lanes[lane];
    const aLane = state.ai.lanes[lane];
    if (pLane.length === 0 && aLane.length === 0) continue;

    const dmgToAiCards = new Map(); // uid -> damage
    const dmgToPlCards = new Map();
    let dmgToAiHp = 0;
    let dmgToPlHp = 0;

    pLane.forEach((card) => {
      if (aLane.length === 0) dmgToAiHp += card.atk;
      else {
        const target = aLane[0];
        dmgToAiCards.set(target.uid, (dmgToAiCards.get(target.uid) || 0) + card.atk);
      }
    });
    aLane.forEach((card) => {
      if (pLane.length === 0) dmgToPlHp += card.atk;
      else {
        const target = pLane[0];
        dmgToPlCards.set(target.uid, (dmgToPlCards.get(target.uid) || 0) + card.atk);
      }
    });

    // Terapkan damage serentak.
    pLane.forEach((c) => { const d = dmgToPlCards.get(c.uid) || 0; c.hp -= d; });
    aLane.forEach((c) => { const d = dmgToAiCards.get(c.uid) || 0; c.hp -= d; });
    if (dmgToAiHp > 0) state.ai.hp -= dmgToAiHp;
    if (dmgToPlHp > 0) state.player.hp -= dmgToPlHp;

    const bits = [];
    if (dmgToAiHp > 0) bits.push('HP Bang Jarwo -' + dmgToAiHp);
    if (dmgToPlHp > 0) bits.push('HP kamu -' + dmgToPlHp);
    if (dmgToAiCards.size > 0) bits.push('kartu AI kena ' + [...dmgToAiCards.values()].join('+'));
    if (dmgToPlCards.size > 0) bits.push('kartumu kena ' + [...dmgToPlCards.values()].join('+'));
    addLog(LANE_NAMES[lane] + ': ' + (bits.join(', ') || 'tidak ada serangan') + '.');
    if (dmgToAiHp > 0 || dmgToPlHp > 0 || dmgToAiCards.size > 0 || dmgToPlCards.size > 0) sfx('hit');

    cleanupLane(state.player, lane);
    cleanupLane(state.ai, lane);
    checkInvariant();
    renderAll(state);
    await sleep(650);
  }
  checkEnd();
}

// Cek menang/kalah setelah combat.
function checkEnd() {
  if (state.ai.hp <= 0 && state.player.hp <= 0) {
    // Seri di ronde yang sama: yang HP-nya lebih tinggi menang.
    state.screen = state.player.hp >= state.ai.hp ? 'win' : 'lose';
  } else if (state.ai.hp <= 0) {
    state.screen = 'win';
  } else if (state.player.hp <= 0) {
    state.screen = 'lose';
  }
  if (state.screen === 'win' || state.screen === 'lose') {
    state.phase = 'over';
    addLog(state.screen === 'win' ? 'MENANG! Lapak Bang Jarwo bangkrut.' : 'KALAH. Lapakmu bangkrut.');
    sfx(state.screen === 'win' ? 'win' : 'lose');
    renderAll(state);
    return true;
  }
  return false;
}

// Giliran AI: tarik kartu, mainkan kartu satu-satu (terbaca pemain), lalu serang.
async function aiTurn() {
  state.phase = 'ai';
  state.selected = null;
  renderAll(state);
  await sleep(500);
  drawCards(state.ai, 1);
  state.ai.coins = coinsForTurn(state.turn);
  addLog('Bang Jarwo menarik kartu, koin ronde ' + state.turn + ': ' + state.ai.coins + '.');
  renderAll(state);
  await sleep(500);

  let plays = 0;
  while (plays < 3) {
    const move = aiBestMove(state);
    if (!move) break;
    const card = state.ai.hand[move.handIndex];
    state.ai.hand.splice(move.handIndex, 1);
    state.ai.coins -= card.cost;
    state.ai.lanes[move.lane].push(card);
    addLog('Bang Jarwo menaruh ' + card.name + ' (' + card.suit + ' ' + card.atk + '/' + card.hp + ') di ' + LANE_NAMES[move.lane] + '.');
    sfx('play');
    applyPlayEffect(state.ai, state.player, card, move.lane);
    plays++;
    checkInvariant();
    renderAll(state);
    await sleep(750);
  }
  if (plays === 0) addLog('Bang Jarwo pass — tidak ada kartu yang layak dimainkan.');
  renderAll(state);
  await sleep(400);
  await resolveCombat();
  if (state.screen === 'game') {
    // Ronde berikut: giliran pemain.
    state.turn++;
    state.phase = 'player';
    state.player.coins = coinsForTurn(state.turn);
    drawCards(state.player, 1);
    addLog('Ronde ' + state.turn + ': koinmu ' + state.player.coins + ', tarik 1 kartu.');
    renderAll(state);
  }
  state.busy = false;
}

async function endTurn() {
  if (state.screen !== 'game' || state.phase !== 'player' || state.busy) return;
  state.busy = true;
  state.selected = null;
  state.phase = 'ai'; // pindah fase SEBELUM render, supaya tombol langsung nonaktif
  addLog('Kamu mengakhiri giliran.');
  renderAll(state);
  await sleep(300);
  await aiTurn();
}

// Klik kartu di tangan: pilih / batal pilih.
function onHandCardClick(handIndex) {
  if (state.screen !== 'game' || state.phase !== 'player' || state.busy) return;
  if (state.selected === handIndex) {
    state.selected = null;
  } else {
    const card = state.player.hand[handIndex];
    if (card && card.cost > state.player.coins) {
      addLog(card.name + ' butuh ' + card.cost + ' koin, kamu punya ' + state.player.coins + '.');
    }
    state.selected = handIndex;
  }
  sfx('click');
  renderAll(state);
}

// Delegasi klik: satu handler untuk seluruh layar game.
document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-action]');
  if (t) {
    const action = t.dataset.action;
    if (action === 'start') { sfx('play'); newGame(); return; }
    if (action === 'restart') { sfx('click'); newGame(); return; }
    if (action === 'mute') { setMuted(!isMuted()); renderAll(state); return; }
    if (action === 'end-turn') { endTurn(); return; }
    return;
  }
  const cardEl = ev.target.closest('.card[data-hand-index]');
  if (cardEl) {
    onHandCardClick(Number(cardEl.dataset.handIndex));
    return;
  }
  const laneEl = ev.target.closest('.lane-row, .lane');
  if (laneEl && laneEl.dataset.lane !== undefined) {
    placeCard(Number(laneEl.dataset.lane));
  }
});

// --- Demo states untuk screenshot (debug only; game normal tetap bisa
//     menang/kalah dengan main biasa) ---
function applyDemo(demo) {
  if (demo === 'midgame') {
    newGame();
    // Papan tengah permainan: kartu di lapak kedua sisi, tangan penuh, HP 20/20.
    const p = state.player, a = state.ai;
    p.lanes[0].push(p.hand.splice(0, 1)[0]);
    p.lanes[1].push(p.hand.splice(0, 1)[0]);
    a.lanes[0].push(a.hand.splice(0, 1)[0]);
    a.lanes[1].push(a.hand.splice(0, 1)[0]);
    a.lanes[2].push(a.hand.splice(0, 1)[0]);
    drawCards(p, 3);
    drawCards(a, 2);
    state.turn = 3;
    state.player.coins = 5;
    state.log = [];
    addLog('Ronde 3 · Duel tengah jalan — lapak mulai ramai.');
    addLog('Kamu menaruh Sate Ayam Madura di Lapak Sate.');
    addLog('Bang Jarwo menaruh Kopi Tubruk di Lapak Es.');
    checkInvariant();
    renderAll(state);
  } else if (demo === 'win') {
    newGame();
    state.ai.hp = 0;
    state.screen = 'win';
    state.phase = 'over';
    addLog('MENANG! Lapak Bang Jarwo bangkrut.');
    renderAll(state);
  } else if (demo === 'lose') {
    newGame();
    state.player.hp = 0;
    state.screen = 'lose';
    state.phase = 'over';
    addLog('KALAH. Lapakmu bangkrut.');
    renderAll(state);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const demo = new URLSearchParams(window.location.search).get('demo');
  if (demo) {
    applyDemo(demo);
  } else {
    renderAll(state);
  }
});
