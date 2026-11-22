# Duel Lapak Pasar Malam

[![Bounty](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![Rank](https://make.fun/badge/best-card-game-20261122-1826/Nadanese93/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![Reward](https://make.fun/badge/best-card-game-20261122-1826/Nadanese93/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

Duel kartu 3 lapak di pasar malam: mainkan kartu pedagang untuk menyerang lapak lawan, HP 20 vs 20, pertama habis kalah.

Dibuat untuk kontes Make.fun [best-card-game-20261122-1826](https://make.fun/bounty/best-card-game-20261122-1826) — "Make the best card game".

## Cara main

- **Tujuan:** habiskan HP Bang Jarwo (AI) yang 20 sebelum HP-mu habis.
- **Tiap ronde:** dapat koin (naik tiap ronde, maks 8) dan tarik 1 kartu.
- **Main kartu:** klik kartu di tanganmu, lalu klik salah satu dari 3 lapak (Lapak Sate, Lapak Es, Lapak Batik). Harga kartu = koin di pojok kiri atas kartu. Maks 2 kartu per sisi per lapak.
- **Serang:** tekan "Akhiri Giliran". Kartu di tiap lapak menghantam kartu depan lawan di lapak yang sama; kalau lapak lawan kosong, HP lawan langsung kena. Damage dihitung serentak, jadi serangan balik tetap jalan.
- **Suit = dagangan:** ♠ Makanan, ♥ Minuman, ♦ Kerajinan, ♣ Pakaian.
- **Efek kartu:** pulihkan HP, tarik kartu, tambah koin, hantam semua lawan di lapak, atau perisai +HP saat dimainkan.
- **AI:** Bang Jarwo main terbuka — ia membunuh kartumu yang lemah, menyerang lewat lapak kosong, dan memakai efek saat berguna. Baca langkahnya, lalu lawan!

## Menjalankan game

Buka `game/index.html` langsung di browser, atau serve folder `game/`:

```sh
cd game && python3 -m http.server 8000
# buka http://localhost:8000
```

Tidak ada build step, tidak ada network request, tidak ada font eksternal — semua aset inline (Unicode ♠♥♦♣ + CSS + SFX WebAudio).

## Build dossier (untuk submit Make.fun)

```sh
node main.ts
# menulis /output/dossier.json beserta salinan game/ dan screenshots/
```

## Struktur

- `game/index.html` — halaman game
- `game/cards.js` — 20 kartu pedagang unik + deck + shuffle Fisher-Yates
- `game/ai.js` — logika AI Bang Jarwo (greedy, terbaca, bisa dilawan)
- `game/render.js` — render DOM (kartu = elemen DOM, klik/tap)
- `game/game.js` — mesin game: giliran, efek, fase serang serentak, menang/kalah
- `game/audio.js` — SFX WebAudio tanpa file
- `game/style.css` — semua gaya, tanpa aset eksternal
- `screenshots/` — 4 render asli dari game ini (mid-game, title, menang, kalah)
- `vendor/makefun-game.ts` — library dossier Make.fun (disalin dari kit)
- `main.ts` — build dossier

## Lisensi

MIT — lihat [LICENSE](LICENSE).
