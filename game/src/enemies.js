// DAWNHOLD — enemies: spawning with wave scaling, movement along the
// road, slows, and removal. Boss instances are enemies too; their phases
// live in bosses.js.

import { enemyDef, enemyHpFor, enemySpeedFor } from './balance.js';
import { pointAt } from './path.js';
import { makeEnemyState, leakEnemy } from './combat.js';
import { cycleOf } from './state.js';

/** Spawn one enemy of a kind at the start of the road. */
export function spawnEnemy(state, typeId) {
  const def = enemyDef(typeId);
  if (!def) return null;
  if (state.enemies.length >= 120) return null; // board cap: never flood
  const night = cycleOf(Math.max(1, state.wave)).night;
  const enemy = makeEnemyState(state, def, 0);
  enemy.maxHp = enemyHpFor(def, state.wave, state.diff);
  enemy.hp = enemy.maxHp;
  enemy.speed = enemySpeedFor(def, state.wave, state.diff, night);
  // Wraiths drift at slightly uneven speeds so packs don't stack neatly.
  if (def.id === 'wraith') enemy.speed *= 0.94 + state.rng.next() * 0.12;
  if (def.shield) {
    enemy.maxShield = Math.round(def.shield * (1 + 0.1 * (state.wave - 1)));
    enemy.shield = enemy.maxShield;
  }
  state.enemies.push(enemy);
  return enemy;
}

/** Current slow factor of an enemy (0 when the slow expired). */
export function currentSlow(state, enemy) {
  if (enemy.def.immuneSlow) return 0;
  if (state.time > enemy.slowUntil) return 0;
  return enemy.slowFactor || 0;
}

/** Advance all enemies along the road; leaks trigger Beacon damage. */
export function updateEnemies(state, dt) {
  const total = state.path.total;
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    const slow = currentSlow(state, enemy);
    const speed = enemy.speed * (1 - slow) * (enemy.phaseSpeedMult || 1);
    enemy.distance += speed * dt;
    const pos = pointAt(state.path, enemy.distance);
    enemy.x = pos.x;
    enemy.y = pos.y;
    enemy.wobble += dt * 6;
    if (enemy.hitFlash > 0) enemy.hitFlash -= dt;
    if (enemy.distance >= total) {
      leakEnemy(state, enemy);
    }
  }
  if (state.enemies.some((e) => e.dead)) {
    state.enemies = state.enemies.filter((e) => !e.dead);
    if (state.boss && state.boss.dead) state.boss = null;
  }
}
