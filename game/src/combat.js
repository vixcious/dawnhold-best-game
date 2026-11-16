// DAWNHOLD — combat resolution: damage, shields, slows, kills, rewards,
// combo, leaks, and the Nova blast. Every damage event in the game flows
// through dealDamage so kills, splits and boss phases stay consistent.

import { killScore, enemyDef, NOVA_DAMAGE, COMBO_CAP } from './balance.js';
import { burst, floater, shockwave, addShake } from './particles.js';
import { pointAt } from './path.js';
import { saveBest } from './state.js';

/**
 * Deal damage to an enemy. Shields soak first. Applies a slow when given
 * (unless the enemy is immune). Returns true when the hit killed it.
 */
export function dealDamage(state, enemy, amount, opts = {}) {
  if (enemy.dead) return false;
  let remaining = amount;
  if (enemy.shield > 0) {
    const soaked = Math.min(enemy.shield, remaining);
    enemy.shield -= soaked;
    remaining -= soaked;
    if (soaked > 0) {
      burst(state, enemy.x, enemy.y, '#7fe7ff', 3, 50, 0.3, 2);
    }
  }
  if (remaining > 0) {
    enemy.hp -= remaining;
  }
  if (opts.slow && !enemy.def.immuneSlow) {
    const strength = opts.slow * (1 + state.buffs.slow);
    if (strength > (enemy.slowFactor || 0) || enemy.slowUntil < state.time) {
      enemy.slowFactor = Math.min(0.6, strength);
      enemy.slowUntil = state.time + (opts.slowTime || 0.6);
    }
  }
  if (opts.floater !== false && remaining > 0) {
    floater(state, enemy.x, enemy.y - enemy.def.radius, String(Math.round(remaining)), '#ffe9a8', 13);
  }
  if (enemy.hp <= 0) {
    killEnemy(state, enemy);
    return true;
  }
  return false;
}

/** Handle an enemy's death: rewards, combo, score, splitting, boss bookkeeping. */
export function killEnemy(state, enemy) {
  if (enemy.dead) return;
  enemy.dead = true;
  state.kills += 1;
  state.combo = Math.min(COMBO_CAP, state.combo + 1);
  state.bestCombo = Math.max(state.bestCombo, state.combo);

  const reward = Math.round(enemy.def.reward * state.diff.reward * (1 + state.buffs.reward));
  state.embers += reward;
  state.embersEarned += reward;
  const gained = killScore(enemy.def.reward, state.combo, state.diff.scoreMult);
  state.score += gained;
  floater(state, enemy.x, enemy.y - 20, `+${gained}`, '#ffd166', 15);
  burst(state, enemy.x, enemy.y, enemy.def.color, 12, 100, 0.5, 3);
  burst(state, enemy.x, enemy.y, '#ffd166', 5, 60, 0.4, 2);

  if (enemy.def.splitsInto && enemy.splitChildren !== false) {
    spawnSplits(state, enemy);
  }
  if (enemy.isBoss) {
    state.bossesSlain += 1;
    state.shards += 1;
    state.boss = null;
    shockwave(state, enemy.x, enemy.y, '#ffd166', 130, 0.6);
    addShake(state, 8);
    floater(state, enemy.x, enemy.y - 40, 'BOSS SLAIN  +1 SHARD', '#ffd166', 19);
    burst(state, enemy.x, enemy.y, '#ffffff', 30, 160, 0.8, 4);
  }
  if (state.audio) state.audio.play('kill');
}

/** A splitter bursts into smaller shadows at its position. */
export function spawnSplits(state, enemy) {
  const childDef = enemyDef(enemy.def.splitsInto);
  if (!childDef) return;
  for (let i = 0; i < (enemy.def.splitCount || 2); i++) {
    const offset = (i - 0.5) * 26;
    const child = makeEnemyState(state, childDef, Math.max(0, enemy.distance + offset));
    child.splitChildren = false;
    state.enemies.push(child);
  }
}

/** Build an enemy instance for a definition at a path distance. */
export function makeEnemyState(state, def, distance) {
  const pos = pointAt(state.path, distance);
  return {
    def,
    x: pos.x,
    y: pos.y,
    distance,
    hp: 0, // filled by the spawner with wave scaling
    maxHp: 0,
    shield: 0,
    maxShield: 0,
    speed: def.speed,
    slowFactor: 0,
    slowUntil: 0,
    dead: false,
    isBoss: false,
    bossPhase: 0,
    wobble: state.rng.next() * Math.PI * 2,
    hitFlash: 0,
    splitChildren: true,
  };
}

/** An enemy reached the Beacon: damage, combo reset, shake, defeat check. */
export function leakEnemy(state, enemy) {
  enemy.dead = true;
  state.leaks += 1;
  state.combo = 0;
  state.beaconHp -= enemy.leak || enemy.def.leak || 1;
  addShake(state, 10);
  shockwave(state, enemy.x, enemy.y, '#ff6b6b', 80, 0.5);
  floater(state, enemy.x, enemy.y - 30, `BEACON -${enemy.leak || enemy.def.leak || 1}`, '#ff6b6b', 17);
  if (state.audio) state.audio.play('leak');
  if (state.beaconHp <= 0) {
    state.beaconHp = 0;
    endRun(state, false);
  }
}

/** End the run: victory or defeat, best-score save, phase change. */
export function endRun(state, won) {
  if (state.phase === 'victory' || state.phase === 'defeat') return;
  state.phase = won ? 'victory' : 'defeat';
  state.waveActive = false;
  state.enemies = [];
  state.spawnQueue = [];
  state.newBest = state.score > state.best.score;
  saveBest(state);
  if (state.audio) state.audio.play(won ? 'win' : 'lose');
}

/**
 * Nova blast: spends a shard, damages every shadow on the board, big flash.
 * Returns false when it cannot fire (no shards, on cooldown, nothing out).
 */
export function novaBlast(state) {
  if (state.novaCooldown > 0 || state.shards < 1) return false;
  if (state.enemies.length === 0) return false;
  state.shards -= 1;
  state.novaCooldown = 12;
  state.novaUsed += 1;
  addShake(state, 9);
  shockwave(state, 640, 340, '#fff3c4', 560, 0.7);
  shockwave(state, 640, 340, '#ffd166', 380, 0.55);
  floater(state, 640, 200, 'NOVA!', '#fff3c4', 30);
  if (state.audio) state.audio.play('nova');
  const targets = state.enemies.slice();
  for (const enemy of targets) {
    dealDamage(state, enemy, NOVA_DAMAGE, { floater: false });
  }
  return true;
}
