// DAWNHOLD — wave composition and spawning. Each wave spends a point
// budget on shadow kinds, with a boss every tenth wave. Compositions are
// built from the run's seeded RNG, so the same seed plays the same nights.

import { ENEMIES, waveBudget, spawnInterval, waveClearBonus } from './balance.js';
import { CAMPAIGN_WAVES, BOSS_EVERY } from './config.js';
import { spawnEnemy } from './enemies.js';
import { spawnBoss } from './bosses.js';
import { setBanner } from './particles.js';
import { cycleOf, saveBest } from './state.js';
import { makeRng } from './util.js';

/** Which shadow kinds are unlocked by this wave. */
export function unlockedKinds(wave) {
  const kinds = ['skitter'];
  if (wave >= 2) kinds.push('husk');
  if (wave >= 3) kinds.push('wraith');
  if (wave >= 4) kinds.push('shielded');
  if (wave >= 5) kinds.push('splitter');
  return kinds;
}

/** Compose a wave's spawn list: [{type, delay}] plus a boss flag. */
export function composeWave(state, wave) {
  const budget = waveBudget(wave);
  const kinds = unlockedKinds(wave);
  const defs = kinds.map((id) => ENEMIES.find((e) => e.id === id));
  const list = [];
  let spent = 0;
  let guard = 0;
  while (spent < budget && guard < 200) {
    guard++;
    const def = state.rng.pick(defs);
    if (spent + def.points > budget + 2) continue;
    spent += def.points;
    list.push({ type: def.id, delay: 0 });
  }
  // Shuffle the order but keep a couple of light scouts up front.
  state.rng.shuffle(list);
  const interval = spawnInterval(wave);
  list.forEach((entry, i) => {
    entry.delay = 0.4 + i * interval;
  });
  const isBoss = wave % BOSS_EVERY === 0;
  return { list, isBoss };
}

/** A short preview of the next wave's composition for the HUD strip.
 *  Uses a throwaway RNG seeded by the wave number so previewing never
 *  advances the run's own random stream. */
export function previewWave(state, wave) {
  const kinds = unlockedKinds(wave);
  const preview = [];
  const isBoss = wave % BOSS_EVERY === 0;
  if (isBoss) preview.push({ type: 'boss', count: 1 });
  const budget = waveBudget(wave);
  const counts = {};
  let spent = 0;
  const rng = makeRng(wave * 131 + state.seed * 17 + 5);
  let guard = 0;
  while (spent < budget && guard < 200) {
    guard++;
    const def = rng.pick(kinds.map((id) => ENEMIES.find((e) => e.id === id)));
    if (spent + def.points > budget + 2) continue;
    spent += def.points;
    counts[def.id] = (counts[def.id] || 0) + 1;
  }
  for (const id of kinds) {
    if (counts[id]) preview.push({ type: id, count: counts[id] });
  }
  return preview;
}

/** Begin a wave: build the queue, announce it, apply dawn income. */
export function startWave(state) {
  if (state.waveActive || state.phase !== 'playing') return false;
  state.wave += 1;
  const cycle = cycleOf(state.wave);
  const { list, isBoss } = composeWave(state, state.wave);
  state.spawnQueue = list.slice();
  state.spawnTimer = 0;
  state.waveActive = true;
  state.waveIsBoss = isBoss;
  state.waveSpawnedBoss = false;
  if (cycle.dawn) {
    state.embers += 25;
    state.embersEarned += 25;
  }
  const label = isBoss
    ? `WAVE ${state.wave} — THE ${bossTitle(state.wave)} STIRS`
    : `WAVE ${state.wave} — ${cycle.label.toUpperCase()}`;
  const sub = cycle.night
    ? 'Night: shadows quicken, towers burn brighter'
    : cycle.dawn
      ? 'Dawn: +25 embers'
      : 'Hold the road. Guard the Beacon.';
  setBanner(state, label, sub, 2.4);
  if (state.audio) state.audio.play(isBoss ? 'boss' : 'wave');
  return true;
}

/** Boss title for a boss wave number. */
export function bossTitle(wave) {
  const idx = Math.floor(wave / BOSS_EVERY) - 1;
  return ['GLOOM TITAN', 'HOLLOW WARDEN', 'UMBRAL MAW'][idx % 3];
}

/** Advance the spawn queue; the boss arrives midway through its wave. */
export function updateSpawning(state, dt) {
  if (!state.waveActive) return;
  state.spawnTimer += dt;
  while (state.spawnQueue.length > 0 && state.spawnQueue[0].delay <= state.spawnTimer) {
    const entry = state.spawnQueue.shift();
    spawnEnemy(state, entry.type);
  }
  if (state.waveIsBoss && !state.waveSpawnedBoss && state.spawnQueue.length <= 2) {
    state.waveSpawnedBoss = true;
    spawnBoss(state, state.wave);
  }
  if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
    endWave(state);
  }
}

/** A wave is cleared: bonus embers, shards, draft or victory. */
export function endWave(state) {
  state.waveActive = false;
  const bonus = waveClearBonus(state.wave);
  state.embers += bonus;
  state.embersEarned += bonus;
  if (state.wave % 5 === 0) state.shards += 1;
  if (state.mode === 'campaign' && state.wave >= CAMPAIGN_WAVES) {
    state.phase = 'victory';
    state.newBest = state.score > state.best.score;
    saveBest(state);
    if (state.audio) state.audio.play('win');
    return;
  }
  // Offer a mutator draft between waves.
  state.phase = 'draft';
  if (state.audio) state.audio.play('draft');
}
