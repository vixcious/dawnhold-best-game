// DAWNHOLD — entrypoint: hand the game in. Copies game/ and screenshots/
// from this repository to the output directory and writes dossier.json
// with make.fun's own dossier library, byte for byte as the scorer does.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(gameDir)) throw new Error('DAWNHOLD: game/ is missing from the repository');
if (!existsSync(shotsDir)) throw new Error('DAWNHOLD: screenshots/ is missing from the repository');

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);
console.error(`DAWNHOLD: wrote ${outDir} (dossier.json ${dossier.length} bytes)`);
