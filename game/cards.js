// cards.js — data kartu "Duel Lapak Pasar Malam".
// 20 kartu pedagang unik. Suit = kategori dagangan:
//   ♠ Makanan   ♥ Minuman   ♦ Kerajinan   ♣ Pakaian
// Kartu = data murni {rank, suit, cost, atk, hp, effect}.
// Aturan hanya memindahkan kartu antar array (deck/hand/discard/lane).

'use strict';

// Kategori dagangan (suit) + warna identitasnya.
const SUITS = {
  '♠': { label: 'Makanan', color: '#2e7d32', bg: '#e8f5e9' },
  '♥': { label: 'Minuman', color: '#c62828', bg: '#fce4ec' },
  '♦': { label: 'Kerajinan', color: '#b45309', bg: '#fef3c7' },
  '♣': { label: 'Pakaian', color: '#1565c0', bg: '#e3f2fd' },
};

// Efek kartu (selalu sederhana dan terbaca):
//   heal n   — pulihkan n HP pemilik saat dimainkan
//   draw n   — pemilik menarik n kartu saat dimainkan
//   coin n   — pemilik mendapat n koin saat dimainkan
//   splash n — beri n damage ke SEMUA kartu lawan di lane yang sama saat dimainkan
//   shield n — kartu ini masuk dengan +n HP saat dimainkan
const CARDS = [
  { name: 'Siomay Bandung',   suit: '♠', cost: 1, atk: 1, hp: 2, effect: null,                       text: '' },
  { name: 'Sate Ayam Madura', suit: '♠', cost: 2, atk: 3, hp: 2, effect: null,                       text: '' },
  { name: 'Bakso Beranak',    suit: '♠', cost: 3, atk: 2, hp: 4, effect: { type: 'heal', value: 2 }, text: 'Pulihkan 2 HP' },
  { name: 'Nasi Goreng Gila', suit: '♠', cost: 4, atk: 4, hp: 3, effect: null,                       text: '' },
  { name: 'Martabak Manis',   suit: '♠', cost: 5, atk: 5, hp: 4, effect: null,                       text: '' },
  { name: 'Kerupuk Kulit',    suit: '♠', cost: 1, atk: 2, hp: 1, effect: { type: 'splash', value: 1 }, text: 'Hantam 1 semua lawan' },
  { name: 'Es Teh Manis',     suit: '♥', cost: 1, atk: 2, hp: 1, effect: null,                       text: '' },
  { name: 'Es Kelapa Muda',   suit: '♥', cost: 2, atk: 1, hp: 3, effect: { type: 'heal', value: 1 }, text: 'Pulihkan 1 HP' },
  { name: 'Wedang Jahe',      suit: '♥', cost: 2, atk: 2, hp: 2, effect: { type: 'coin', value: 1 }, text: 'Dapat 1 koin' },
  { name: 'Kopi Tubruk',      suit: '♥', cost: 3, atk: 3, hp: 2, effect: { type: 'draw', value: 1 }, text: 'Tarik 1 kartu' },
  { name: 'Jus Alpukat',      suit: '♥', cost: 4, atk: 4, hp: 3, effect: { type: 'heal', value: 3 }, text: 'Pulihkan 3 HP' },
  { name: 'Gantungan Kunci',  suit: '♦', cost: 1, atk: 1, hp: 1, effect: { type: 'draw', value: 1 }, text: 'Tarik 1 kartu' },
  { name: 'Layang-layang',    suit: '♦', cost: 2, atk: 3, hp: 1, effect: { type: 'splash', value: 1 }, text: 'Hantam 1 semua lawan' },
  { name: 'Batik Tulis',      suit: '♦', cost: 3, atk: 2, hp: 3, effect: { type: 'shield', value: 2 }, text: 'Masuk dengan +2 HP' },
  { name: 'Wayang Kulit',     suit: '♦', cost: 4, atk: 3, hp: 5, effect: { type: 'shield', value: 2 }, text: 'Masuk dengan +2 HP' },
  { name: 'Tas Rotan',        suit: '♦', cost: 5, atk: 4, hp: 6, effect: { type: 'shield', value: 2 }, text: 'Masuk dengan +2 HP' },
  { name: 'Kaos Oblong',      suit: '♣', cost: 1, atk: 2, hp: 2, effect: null,                       text: '' },
  { name: 'Topi Anyaman',     suit: '♣', cost: 2, atk: 1, hp: 4, effect: { type: 'shield', value: 2 }, text: 'Masuk dengan +2 HP' },
  { name: 'Kemeja Flanel',    suit: '♣', cost: 2, atk: 2, hp: 3, effect: null,                       text: '' },
  { name: 'Sandal Jepit',     suit: '♣', cost: 3, atk: 4, hp: 2, effect: null,                       text: '' },
];

const DECK_SIZE = CARDS.length; // 20 kartu unik per pemain
const MAX_HP = 20;
const LANES = 3;
const LANE_NAMES = ['Lapak Sate', 'Lapak Es', 'Lapak Batik'];
const MAX_PER_LANE = 2; // maks 2 kartu per sisi per lapak
const MAX_HAND = 7;
const START_HAND = 4;
const MAX_COINS = 8;

// Acak Fisher-Yates. JANGAN sort(() => Math.random() - 0.5).
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

// Bangun deck segar: satu instans per kartu unik, uid unik per pemilik.
function buildDeck(owner) {
  return CARDS.map((def, i) => ({
    uid: owner + '-' + i,
    name: def.name,
    suit: def.suit,
    cost: def.cost,
    atk: def.atk,
    hp: def.hp,
    maxHp: def.hp,
    effect: def.effect,
    text: def.text,
  }));
}

// Pindahkan n kartu teratas deck ke tangan (deck habis = reshuffle discard).
function drawCards(side, n) {
  for (let k = 0; k < n; k++) {
    if (side.hand.length >= MAX_HAND) return;
    if (side.deck.length === 0) {
      if (side.discard.length === 0) return;
      side.deck = shuffle(side.discard.splice(0));
    }
    side.hand.push(side.deck.pop());
  }
}
