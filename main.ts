// main.ts — build entry "Duel Lapak Pasar Malam" untuk Make.fun.
// Menyalin game/ + screenshots/ ke output dir lalu menulis /output/dossier.json
// via buildDossier dari vendor/makefun-game.ts. Dijalankan dengan:
//   node main.ts                          (output default /output)
//   MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts

import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(root, 'game'), join(out, 'game'), { recursive: true });
cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  }),
);

console.log('dossier written to ' + join(out, 'dossier.json'));
