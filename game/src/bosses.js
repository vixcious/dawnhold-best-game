// DAWNHOLD — bosses: one every tenth wave, three kinds cycling, each with
// three phases. Phase changes at 66% and 33% HP: the boss quickens, sheds
// a shockwave, and calls minions.

import { makeEnemyState } from './combat.js';
import { pointAt } from './path.js';
import { shockwave, burst, floater, setBanner } from './particles.js';
import { spawnEnemy } from './enemies.js';

export const BOSS_DEFS = [
  {
    id: 'titan',
    name: 'Gloom Titan',
    hp: 2600,
    speed: 24,
    reward: 120,
    leak: 5,
    radius: 30,
    color: '#3a2a5e',
    eye: '#ff5c7a',
    trim: '#ff9d5c',
  },
  {
    id: 'warden',
    name: 'Hollow Warden',
    hp: 6200,
    speed: 26,
    reward: 200,
    leak: 5,
    radius: 33,
    color: '#243b5e',
    eye: '#7fe7ff',
    trim: '#5ee6ff',
  },
  {
    id: 'maw',
    name: 'Umbral Maw',
    hp: 12500,
    speed: 28,
    reward: 320,
    leak: 8,
    radius: 36,
    color: '#1e1438',
    eye: '#ffd166',
    trim: '#c792ff',
  },
];

/** Boss definition for a wave number; kinds cycle past wave 30. */
export function bossDefFor(wave) {
  const idx = Math.floor(wave / 10) - 1;
  return BOSS_DEFS[((idx % 3) + 3) % 3];
}

/** Spawn the boss for this wave at the start of the road. */
export function spawnBoss(state, wave) {
  const def = bossDefFor(wave);
  const cycles = Math.floor((wave - 1) / 30);
  const hp = Math.round(def.hp * state.diff.enemyHp * Math.pow(1.35, cycles) * (1 + 0.08 * (wave - 10)));
  const boss = makeEnemyState(state, {
    id: def.id,
    name: def.name,
    hp,
    speed: def.speed,
    reward: def.reward,
    leak: def.leak,
    radius: def.radius,
    color: def.color,
    eye: def.eye,
  }, 0);
  boss.maxHp = hp;
  boss.hp = hp;
  boss.speed = def.speed * state.diff.enemySpeed;
  boss.isBoss = true;
  boss.bossDef = def;
  boss.bossPhase = 1;
  boss.phaseSpeedMult = 1;
  boss.trim = def.trim;
  const pos = pointAt(state.path, 0);
  boss.x = pos.x;
  boss.y = pos.y;
  state.enemies.push(boss);
  state.boss = boss;
  setBanner(state, `${def.name.toUpperCase()} APPROACHES`, 'Three phases. Do not let it reach the Beacon.', 2.6);
  shockwave(state, boss.x, boss.y, def.trim, 120, 0.6);
  return boss;
}

/**
 * Check and apply boss phase transitions from current HP. Called every
 * frame while a boss lives, so phases trigger exactly at the thresholds.
 */
export function updateBossPhase(state, boss) {
  if (!boss || boss.dead) return;
  const frac = boss.hp / boss.maxHp;
  const phase = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
  if (phase === boss.bossPhase) return;
  boss.bossPhase = phase;
  boss.phaseSpeedMult = phase === 2 ? 1.25 : phase === 3 ? 1.5 : 1;
  // The phase change shakes off every slow: the boss reasserts itself.
  boss.slowFactor = 0;
  boss.slowUntil = 0;
  if (state.audio) state.audio.play('phase');
  shockwave(state, boss.x, boss.y, boss.trim, 110, 0.5);
  burst(state, boss.x, boss.y, boss.trim, 20, 130, 0.6, 3);
  floater(state, boss.x, boss.y - boss.def.radius - 14, `PHASE ${phase}`, boss.trim, 19);
  // The boss calls minions as it weakens.
  const minions = phase === 2 ? 2 : 3;
  for (let i = 0; i < minions; i++) {
    const m = spawnEnemy(state, 'skitter');
    if (m) {
      m.distance = Math.max(0, boss.distance - 30 - i * 24);
      const pos = pointAt(state.path, m.distance);
      m.x = pos.x;
      m.y = pos.y;
    }
  }
  setBanner(state, `${boss.bossDef.name.toUpperCase()} — PHASE ${phase}`, phase === 3 ? 'It quickens. Hold the line.' : 'It calls the dark to its side.', 1.8);
}

/** Per-frame boss upkeep: phase checks. Movement lives in updateEnemies.
 *  Also re-syncs the HUD's boss reference if the boss died this frame. */
export function updateBoss(state, dt) {
  if (state.boss && !state.boss.dead) {
    updateBossPhase(state, state.boss);
  } else if (state.boss && state.boss.dead) {
    state.boss = null;
  }
}
