// DAWNHOLD — towers: placement, targeting, firing, upgrades and sales.
// Obelisks buff their neighbours; frost lanterns slow instead of shooting.

import { towerDef, towerStats, upgradeCost, SELL_REFUND, MAX_TOWER_LEVEL } from './balance.js';
import { dist2 } from './util.js';
import { dealDamage } from './combat.js';
import { fireBeam, fireShell, fireChain } from './projectiles.js';
import { burst, floater, shockwave, mote } from './particles.js';

/** Find the plot under a point, or null. */
export function plotAt(state, x, y) {
  for (const plot of state.plots) {
    if (dist2(x, y, plot.x, plot.y) <= 26 * 26) return plot;
  }
  return null;
}

/** Find the tower under a point, or null. */
export function towerAt(state, x, y) {
  for (const tower of state.towers) {
    if (dist2(x, y, tower.x, tower.y) <= 28 * 28) return tower;
  }
  return null;
}

/** Effective build cost with mutator cost modifiers (Overcharge). */
export function buildCost(state, def) {
  return Math.round(def.cost * (1 + (state.buffs.cost || 0)));
}

/** Can the player afford and place this tower type on this plot? */
export function canPlace(state, def, plot) {
  if (!plot || plot.tower) return false;
  if (state.embers < buildCost(state, def)) return false;
  return true;
}

/** Place a tower on a plot. Returns the tower, or null when impossible. */
export function placeTower(state, defId, plot) {
  const def = towerDef(defId);
  if (!def || !canPlace(state, def, plot)) return null;
  const cost = buildCost(state, def);
  state.embers -= cost;
  const tower = {
    def,
    level: 1,
    x: plot.x,
    y: plot.y,
    plot,
    cooldown: 0,
    invested: cost,
    angle: -Math.PI / 2,
    flash: 0,
    id: state.towers.length + 1,
  };
  plot.tower = tower;
  state.towers.push(tower);
  state.towersBuilt += 1;
  burst(state, plot.x, plot.y, def.color, 14, 90, 0.5, 3);
  shockwave(state, plot.x, plot.y, def.color, 46, 0.35);
  if (state.audio) state.audio.play('place');
  return tower;
}

/** Upgrade a tower one level. Returns false when maxed or unaffordable. */
export function upgradeTower(state, tower) {
  if (tower.level >= MAX_TOWER_LEVEL) return false;
  const cost = upgradeCost(tower.def, tower.level);
  if (state.embers < cost) return false;
  state.embers -= cost;
  tower.invested += cost;
  tower.level += 1;
  burst(state, tower.x, tower.y, '#ffd166', 18, 110, 0.6, 3);
  shockwave(state, tower.x, tower.y, '#ffd166', 60, 0.4);
  floater(state, tower.x, tower.y - 30, `LEVEL ${tower.level}!`, '#ffd166', 16);
  if (state.audio) state.audio.play('upgrade');
  return true;
}

/** Sell a tower for a refund of its invested embers. */
export function sellTower(state, tower) {
  const refund = Math.round(tower.invested * SELL_REFUND);
  state.embers += refund;
  tower.plot.tower = null;
  state.towers = state.towers.filter((t) => t !== tower);
  if (state.selectedTower === tower) state.selectedTower = null;
  floater(state, tower.x, tower.y - 26, `+${refund} embers`, '#ffb347', 15);
  burst(state, tower.x, tower.y, '#ffb347', 10, 80, 0.4, 3);
  if (state.audio) state.audio.play('sell');
  return refund;
}

/** Obelisk buffs applying to a tower: summed from obelisks in range. */
export function obeliskBuffs(state, tower) {
  let damage = 0;
  let rate = 0;
  for (const other of state.towers) {
    if (other === tower || other.def.kind !== 'buff') continue;
    const stats = towerStats(other.def, other.level);
    if (dist2(tower.x, tower.y, other.x, other.y) <= stats.range * stats.range) {
      damage += other.def.buffDamage * (1 + 0.25 * (other.level - 1));
      rate += other.def.buffRate * (1 + 0.25 * (other.level - 1));
    }
  }
  return { damage: Math.min(0.75, damage), rate: Math.min(0.45, rate) };
}

/** Effective combat stats of a tower, with buffs and mutators applied. */
export function effectiveStats(state, tower) {
  const base = towerStats(tower.def, tower.level);
  const ob = obeliskBuffs(state, tower);
  return {
    damage: Math.round(base.damage * (1 + state.buffs.damage + ob.damage)),
    rate: base.rate * (1 + state.buffs.rate + ob.rate),
    range: base.range * (1 + state.buffs.range),
  };
}

/** Pick the target in range furthest along the road (closest to the Beacon). */
export function pickTarget(state, tower, range) {
  let best = null;
  let bestDist = -1;
  const r2 = range * range;
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    if (dist2(tower.x, tower.y, enemy.x, enemy.y) > r2) continue;
    if (enemy.distance > bestDist) {
      bestDist = enemy.distance;
      best = enemy;
    }
  }
  return best;
}

/** Advance tower cooldowns and fire. Frost auras apply their slow here. */
export function updateTowers(state, dt) {
  for (const tower of state.towers) {
    if (tower.flash > 0) tower.flash -= dt;
    const stats = effectiveStats(state, tower);
    if (tower.def.kind === 'buff') {
      tower.pulse = (tower.pulse || 0) + dt;
      // Ambient light motes drift off an obelisk so buffs read as alive.
      tower.moteTimer = (tower.moteTimer || 0) - dt;
      if (tower.moteTimer <= 0) {
        tower.moteTimer = 0.5 + state.rng.next() * 0.4;
        mote(state, tower.x, tower.y - 10, '#fff3c4', 1);
      }
      continue;
    }
    if (tower.def.kind === 'aura') {
      const r2 = stats.range * stats.range;
      for (const enemy of state.enemies) {
        if (enemy.dead || enemy.def.immuneSlow) continue;
        if (dist2(tower.x, tower.y, enemy.x, enemy.y) > r2) continue;
        const strength = tower.def.slow * (1 + 0.12 * (tower.level - 1)) * (1 + state.buffs.slow);
        if (strength > (enemy.slowFactor || 0) || enemy.slowUntil < state.time) {
          enemy.slowFactor = Math.min(0.6, strength);
          enemy.slowUntil = state.time + 0.35;
        }
      }
      tower.cooldown -= dt;
      if (tower.cooldown <= 0) {
        tower.cooldown = 1 / Math.max(0.1, stats.rate);
        const target = pickTarget(state, tower, stats.range);
        if (target) {
          dealDamage(state, target, stats.damage, { slow: 0, floater: false });
          fireBeam(state, tower, target, stats, tower.def.color, 2);
        }
      }
      continue;
    }
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;
    const target = pickTarget(state, tower, stats.range);
    if (!target) continue;
    tower.cooldown = 1 / Math.max(0.1, stats.rate);
    tower.flash = 0.12;
    tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
    if (tower.def.kind === 'beam') {
      dealDamage(state, target, stats.damage, {});
      fireBeam(state, tower, target, stats, tower.def.color, tower.def.id === 'sniper' ? 5 : 3);
      if (state.audio) state.audio.play(tower.def.id === 'sniper' ? 'sniper' : 'shoot');
    } else if (tower.def.kind === 'shell') {
      fireShell(state, tower, target, stats);
      if (state.audio) state.audio.play('mortar');
    } else if (tower.def.kind === 'chain') {
      fireChain(state, tower, target, stats);
      if (state.audio) state.audio.play('chain');
    }
  }
}
