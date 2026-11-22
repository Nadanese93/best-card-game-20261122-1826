// render.js — render DOM dari state. Kartu = elemen DOM (teks tajam),
// klik/tap = kontrol utama. Tidak ada canvas, tidak ada gambar.

'use strict';

// Satu elemen kartu pedagang (terbuka).
function cardEl(card, opts) {
  opts = opts || {};
  const suit = SUITS[card.suit];
  const el = document.createElement('div');
  el.className = 'card' + (opts.small ? ' card-small' : '') + (opts.selected ? ' selected' : '');
  if (opts.affordable === false) el.classList.add('unaffordable');
  el.dataset.uid = card.uid;
  if (opts.handIndex !== undefined) el.dataset.handIndex = String(opts.handIndex);
  el.style.setProperty('--suit-color', suit.color);
  el.style.setProperty('--suit-bg', suit.bg);

  const cost = document.createElement('div');
  cost.className = 'card-cost';
  cost.textContent = card.cost;
  cost.title = 'Harga (koin)';
  el.appendChild(cost);

  const suitEl = document.createElement('div');
  suitEl.className = 'card-suit';
  suitEl.textContent = card.suit;
  el.appendChild(suitEl);

  const suitLabel = document.createElement('div');
  suitLabel.className = 'card-suit-label';
  suitLabel.textContent = suit.label;
  el.appendChild(suitLabel);

  const name = document.createElement('div');
  name.className = 'card-name';
  name.textContent = card.name;
  el.appendChild(name);

  if (card.text) {
    const txt = document.createElement('div');
    txt.className = 'card-text';
    txt.textContent = card.text;
    el.appendChild(txt);
  }

  const stats = document.createElement('div');
  stats.className = 'card-stats';
  const atk = document.createElement('span');
  atk.className = 'stat-atk';
  atk.textContent = 'ATK ' + card.atk;
  const hp = document.createElement('span');
  hp.className = 'stat-hp';
  hp.textContent = 'HP ' + card.hp + '/' + card.maxHp;
  stats.appendChild(atk);
  stats.appendChild(hp);
  el.appendChild(stats);

  return el;
}

// Punggung kartu (tangan lawan tertutup) — ukuran kecil.
function cardBackEl() {
  const el = document.createElement('div');
  el.className = 'card card-small card-back';
  const inner = document.createElement('div');
  inner.className = 'card-back-inner';
  inner.textContent = '♠♥♦♣';
  el.appendChild(inner);
  const label = document.createElement('div');
  label.className = 'card-back-label';
  label.textContent = 'LAPAK';
  el.appendChild(label);
  return el;
}

function hpBarHTML(side, who) {
  const pct = Math.max(0, Math.min(100, (side.hp / side.maxHp) * 100));
  return (
    '<div class="hp-row">' +
    '<span class="hp-name">' + who + '</span>' +
    '<div class="hp-bar"><div class="hp-fill" style="width:' + pct + '%"></div></div>' +
    '<span class="hp-num">' + side.hp + ' / ' + side.maxHp + ' HP</span>' +
    '</div>'
  );
}

function renderHUD(state) {
  const hud = document.getElementById('hud');
  const phaseText =
    state.phase === 'player' ? 'Giliranmu — mainkan kartu, lalu Akhiri Giliran'
    : state.phase === 'ai' ? 'Bang Jarwo sedang mikir…'
    : state.phase === 'combat' ? 'Serangan lapak!'
    : 'Duel selesai';
  hud.innerHTML =
    '<div class="hud-left">' +
      '<div class="hud-title">DUEL LAPAK PASAR MALAM</div>' +
      '<div class="hud-sub">Ronde ' + state.turn + ' · ' + phaseText + '</div>' +
    '</div>' +
    '<div class="hud-mid">' +
      hpBarHTML(state.ai, 'BANG JARWO (AI)') +
      hpBarHTML(state.player, 'KAMU') +
    '</div>' +
    '<div class="hud-right">' +
      '<div class="coins" title="Koin untuk main kartu">🪙 ' + state.player.coins + ' koin</div>' +
      '<div class="deck-count">Deck: ' + state.player.deck.length + ' · Buang: ' + state.player.discard.length + '</div>' +
      '<button id="mute-btn" class="mini-btn" data-action="mute">' + (isMuted() ? '🔇 Suara mati' : '🔊 Suara nyala') + '</button>' +
      '<button id="restart-btn" class="mini-btn" data-action="restart">↻ Ulangi</button>' +
    '</div>';
}

function renderAiHand(state) {
  const wrap = document.getElementById('ai-hand');
  wrap.innerHTML = '';
  const label = document.createElement('div');
  label.className = 'hand-label';
  label.textContent = 'Tangan Bang Jarwo: ' + state.ai.hand.length + ' kartu';
  wrap.appendChild(label);
  const row = document.createElement('div');
  row.className = 'hand-row hand-row-small';
  state.ai.hand.forEach(() => row.appendChild(cardBackEl()));
  if (state.ai.hand.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'hand-empty';
    empty.textContent = '(tangan kosong)';
    row.appendChild(empty);
  }
  wrap.appendChild(row);
}

function renderBoard(state) {
  const board = document.getElementById('board');
  board.innerHTML = '';
  for (let lane = 0; lane < LANES; lane++) {
    const laneEl = document.createElement('div');
    laneEl.className = 'lane' + (state.selected !== null ? ' droppable' : '');
    laneEl.dataset.lane = String(lane);

    const label = document.createElement('div');
    label.className = 'lane-label';
    label.textContent = (lane + 1) + ' · ' + LANE_NAMES[lane];
    laneEl.appendChild(label);

    // Baris lawan (atas).
    const aiRow = document.createElement('div');
    aiRow.className = 'lane-row lane-row-ai';
    aiRow.dataset.lane = String(lane);
    aiRow.dataset.side = 'ai';
    state.ai.lanes[lane].forEach((card) => aiRow.appendChild(cardEl(card, { small: true })));
    for (let k = state.ai.lanes[lane].length; k < MAX_PER_LANE; k++) {
      const slot = document.createElement('div');
      slot.className = 'slot-empty';
      slot.textContent = '—';
      aiRow.appendChild(slot);
    }
    laneEl.appendChild(aiRow);

    const vs = document.createElement('div');
    vs.className = 'lane-vs';
    vs.textContent = '⚔';
    laneEl.appendChild(vs);

    // Baris pemain (bawah).
    const plRow = document.createElement('div');
    plRow.className = 'lane-row lane-row-player';
    plRow.dataset.lane = String(lane);
    plRow.dataset.side = 'player';
    state.player.lanes[lane].forEach((card) => plRow.appendChild(cardEl(card, { small: true })));
    for (let k = state.player.lanes[lane].length; k < MAX_PER_LANE; k++) {
      const slot = document.createElement('div');
      slot.className = 'slot-empty';
      slot.textContent = '—';
      plRow.appendChild(slot);
    }
    laneEl.appendChild(plRow);

    board.appendChild(laneEl);
  }
}

function renderPlayerHand(state) {
  const wrap = document.getElementById('player-hand');
  wrap.innerHTML = '';
  const label = document.createElement('div');
  label.className = 'hand-label';
  label.textContent = state.selected !== null
    ? 'Kartu dipilih: ' + state.player.hand[state.selected].name + ' — klik salah satu lapak untuk menaruhnya'
    : 'Tanganmu: ' + state.player.hand.length + ' kartu — klik kartu, lalu klik lapak';
  wrap.appendChild(label);
  const row = document.createElement('div');
  row.className = 'hand-row';
  state.player.hand.forEach((card, i) => {
    row.appendChild(cardEl(card, {
      handIndex: i,
      selected: state.selected === i,
      affordable: state.phase === 'player' && card.cost <= state.player.coins,
    }));
  });
  if (state.player.hand.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'hand-empty';
    empty.textContent = '(tangan kosong — tarik kartu ronde depan)';
    row.appendChild(empty);
  }
  wrap.appendChild(row);
}

function renderControls(state) {
  const wrap = document.getElementById('controls');
  wrap.innerHTML = '';
  const endBtn = document.createElement('button');
  endBtn.id = 'end-turn-btn';
  endBtn.className = 'big-btn';
  endBtn.dataset.action = 'end-turn';
  endBtn.disabled = state.phase !== 'player';
  endBtn.textContent = state.phase === 'player' ? '⚔ AKHIRI GILIRAN — SERANG!' : '…';
  wrap.appendChild(endBtn);
  const hint = document.createElement('div');
  hint.className = 'controls-hint';
  hint.textContent = 'Kartu di lapak kosong menghantam HP lawan langsung. Kartu yang HP-nya habis dibuang.';
  wrap.appendChild(hint);
}

function renderLog(state) {
  const log = document.getElementById('log');
  log.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'log-title';
  title.textContent = 'Catatan Lapak';
  log.appendChild(title);
  const list = document.createElement('div');
  list.className = 'log-list';
  state.log.slice(-14).forEach((line) => {
    const div = document.createElement('div');
    div.className = 'log-line';
    div.textContent = line;
    list.appendChild(div);
  });
  log.appendChild(list);
}

function showScreen(state) {
  const title = document.getElementById('title-screen');
  const end = document.getElementById('end-screen');
  const game = document.getElementById('game-screen');
  title.classList.toggle('hidden', state.screen !== 'title');
  end.classList.toggle('hidden', state.screen !== 'win' && state.screen !== 'lose');
  game.classList.toggle('hidden', state.screen === 'title');

  if (state.screen === 'win' || state.screen === 'lose') {
    const isWin = state.screen === 'win';
    document.getElementById('end-headline').textContent = isWin ? 'MENANG! 🏆' : 'KALAH…';
    document.getElementById('end-headline').className = isWin ? 'end-headline win' : 'end-headline lose';
    document.getElementById('end-sub').textContent = isWin
      ? 'Lapak Bang Jarwo bangkrut! Kamu juara pasar malam ini.'
      : 'Lapakmu bangkrut. Bang Jarwo masih raja pasar malam — coba lagi!';
    document.getElementById('end-stats').textContent =
      'Ronde: ' + state.turn + ' · HP kamu ' + Math.max(0, state.player.hp) +
      ' · HP Bang Jarwo ' + Math.max(0, state.ai.hp);
  }
}

// Render penuh dari state (dipanggil setelah setiap perubahan state).
function renderAll(state) {
  if (state.screen !== 'title') {
    renderHUD(state);
    renderAiHand(state);
    renderBoard(state);
    renderPlayerHand(state);
    renderControls(state);
    renderLog(state);
  }
  showScreen(state);
}
