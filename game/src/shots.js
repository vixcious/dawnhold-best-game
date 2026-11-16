// DAWNHOLD — deterministic screenshot states. ?shot=start|play|end|boss
// with &seed= stages a fixed scene through the game's own setup and
// simulation functions, renders one frame, and sets window.__shotReady.
// These are real renders of the game's code, staged, never composited.

import { createGame, cycleOf } from './state.js';
import { placeTower } from './towers.js';
import { spawnEnemy } from './enemies.js';
import { spawnBoss, updateBossPhase } from './bosses.js';
import { updateEnemies } from './enemies.js';
import { updateTowers } from './towers.js';
import { updateProjectiles } from './projectiles.js';
import { updateParticles, burst, floater, shockwave } from './particles.js';
import { rollDraft } from './mutators.js';
import { pointAt } from './path.js';
import { TOWERS } from './balance.js';

/** Parse ?shot= and &seed= from the page URL. */
export function shotParams() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = parseInt(params.get('seed') || '1', 10) || 1;
  if (shot !== 'start' && shot !== 'play' && shot !== 'end' && shot !== 'boss') {
    return { shot: null, seed };
  }
  return { shot, seed };
}

/** Build a staged state for a shot name. Returns the state to render. */
export function stageShot(shot, seed) {
  const state = createGame({ mode: 'campaign', difficulty: 'normal', seed });
  state.shot = shot;
  state.time = 12.4; // fixed clock: identical glow phases every render
  if (shot === 'start') return stageStart(state);
  if (shot === 'play') return stagePlay(state);
  if (shot === 'end') return stageEnd(state);
  if (shot === 'boss') return stageBoss(state);
  return state;
}

/** Title screen with a living attract board behind it. */
function stageStart(state) {
  state.phase = 'title';
  seedAttractBoard(state);
  stepWorld(state, 90);
  state.time = 12.4;
  return state;
}

/** Dense mid-action play: wave 11, night, towers firing, shadows mid-road. */
function stagePlay(state) {
  state.phase = 'playing';
  state.wave = 11;
  state.waveActive = true;
  state.embers = 342;
  state.shards = 2;
  state.beaconHp = 17;
  state.score = 24850;
  state.combo = 14;
  state.bestCombo = 21;
  state.kills = 186;
  // A full, believable defence: every tower kind, mixed levels.
  // Staging funds the build first; the displayed embers are set after.
  state.embers = 9999;
  const placements = [
    ['prism', 1, 2], ['mortar', 2, 2], ['frost', 6, 1], ['coil', 7, 2],
    ['sniper', 8, 1], ['obelisk', 9, 1], ['prism', 12, 3], ['mortar', 13, 1],
    ['coil', 14, 1], ['frost', 16, 2],
  ];
  for (const [id, plotIndex, level] of placements) {
    const plot = state.plots[plotIndex];
    const tower = placeTower(state, id, plot);
    if (tower) {
      tower.level = level;
      tower.invested = 50 * level;
      tower.cooldown = 0.05;
    }
  }
  state.embers = 342;
  // Shadows spread along the road, several kinds, one splitter mid-pack.
  const kinds = ['skitter', 'skitter', 'husk', 'shielded', 'wraith', 'splitter', 'skitter', 'husk', 'shielded', 'wraith', 'skitter', 'splitter', 'husk', 'skitter'];
  kinds.forEach((kind, i) => {
    const enemy = spawnEnemy(state, kind);
    if (enemy) {
      enemy.distance = 260 + i * 190 + (i % 3) * 40;
      const pos = pointAt(state.path, enemy.distance);
      enemy.x = pos.x;
      enemy.y = pos.y;
      enemy.hp = Math.round(enemy.maxHp * (0.55 + (i % 4) * 0.12));
    }
  });
  // Let towers fire a few volleys so beams, shells and sparks are flying.
  stepWorld(state, 26);
  state.time = 12.4;
  // A selected tower shows the upgrade/sell panel.
  state.selectedTower = state.towers[6] || null;
  burst(state, 620, 330, '#ffd166', 8, 70, 0.5, 3);
  floater(state, 700, 300, '+420', '#ffd166', 16);
  floater(state, 480, 360, 'COMBO x14', '#ff9d5c', 17);
  state.nextPreview = [
    { icon: '●', label: 'Skitters', color: '#b8abd9' },
    { icon: '◆', label: 'Husks', color: '#ffb347' },
    { icon: '⬡', label: 'Shielded', color: '#7fe7ff' },
  ];
  return state;
}

/** Victory screen with a strong run behind it. */
function stageEnd(state) {
  state.phase = 'victory';
  state.wave = 30;
  state.embers = 512;
  state.shards = 3;
  state.beaconHp = 14;
  state.score = 48230;
  state.combo = 0;
  state.bestCombo = 38;
  state.kills = 612;
  state.leaks = 0;
  state.bossesSlain = 3;
  state.towersBuilt = 14;
  state.elapsed = 1420;
  state.newBest = true;
  seedAttractBoard(state);
  stepWorld(state, 30);
  state.time = 12.4;
  return state;
}

/** Boss wave: the Hollow Warden mid-road in phase 2, boss bar up. */
function stageBoss(state) {
  state.phase = 'playing';
  state.wave = 20;
  state.waveActive = true;
  state.embers = 268;
  state.shards = 2;
  state.beaconHp = 15;
  state.score = 31480;
  state.combo = 9;
  state.kills = 388;
  state.embers = 9999;
  const placements = [
    ['sniper', 1, 2], ['coil', 2, 2], ['mortar', 6, 2], ['frost', 7, 2],
    ['prism', 8, 3], ['obelisk', 9, 1], ['mortar', 12, 2], ['coil', 13, 2],
    ['sniper', 14, 1],
  ];
  for (const [id, plotIndex, level] of placements) {
    const tower = placeTower(state, id, state.plots[plotIndex]);
    if (tower) {
      tower.level = level;
      tower.invested = 60 * level;
      tower.cooldown = 0.05;
    }
  }
  state.embers = 268;
  const boss = spawnBoss(state, 20);
  boss.distance = 1450;
  const pos = pointAt(state.path, boss.distance);
  boss.x = pos.x;
  boss.y = pos.y;
  boss.hp = Math.round(boss.maxHp * 0.52);
  updateBossPhase(state, boss);
  boss.hp = Math.round(boss.maxHp * 0.52);
  boss.bossPhase = 2;
  boss.phaseSpeedMult = 1.25;
  // Escorts around the boss.
  ['husk', 'shielded', 'skitter', 'skitter', 'wraith', 'splitter'].forEach((kind, i) => {
    const enemy = spawnEnemy(state, kind);
    if (enemy) {
      enemy.distance = 1150 + i * 120;
      const p = pointAt(state.path, enemy.distance);
      enemy.x = p.x;
      enemy.y = p.y;
    }
  });
  stepWorld(state, 20);
  state.time = 12.4;
  shockwave(state, boss.x, boss.y, boss.trim, 110, 0.5);
  floater(state, boss.x, boss.y - 60, 'PHASE 2', boss.trim, 19);
  state.nextPreview = [
    { icon: '♛', label: 'BOSS', color: '#ffd166' },
    { icon: '◆', label: 'Husks', color: '#ffb347' },
    { icon: '●', label: 'Skitters', color: '#b8abd9' },
  ];
  return state;
}

/** A quiet board for title/victory backdrops: a few towers, no enemies. */
function seedAttractBoard(state) {
  state.embers = 9999;
  const placements = [
    ['prism', 1, 1], ['mortar', 2, 1], ['frost', 7, 1], ['coil', 8, 1], ['obelisk', 13, 1],
  ];
  for (const [id, plotIndex, level] of placements) {
    const tower = placeTower(state, id, state.plots[plotIndex]);
    if (tower) tower.level = level;
  }
  state.embers = 175;
}

/** Step the simulation a fixed number of 1/60s ticks. */
function stepWorld(state, ticks) {
  const dt = 1 / 60;
  for (let i = 0; i < ticks; i++) {
    state.time += dt;
    updateTowers(state, dt);
    updateProjectiles(state, dt);
    updateEnemies(state, dt);
    updateParticles(state, dt);
  }
  // Keep the staged enemies on the road even if a volley killed some.
  if (state.enemies.length < 4 && state.shot === 'play') {
    const extra = spawnEnemy(state, 'husk');
    if (extra) {
      extra.distance = 900;
      const pos = pointAt(state.path, extra.distance);
      extra.x = pos.x;
      extra.y = pos.y;
    }
  }
}

/** All tower kinds, for shot builders that need the catalogue. */
export function towerKinds() {
  return TOWERS.map((t) => t.id);
}

/** Roll a draft for the staged draft screen (unused by shots, kept for tests). */
export function stageDraft(state) {
  state.phase = 'draft';
  rollDraft(state);
  return state;
}
