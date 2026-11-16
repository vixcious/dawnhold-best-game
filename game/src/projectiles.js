// DAWNHOLD — projectiles and instant attacks: beams, mortar shells and
// chain lightning. Beams and chains resolve instantly and leave a fading
// visual; shells fly an arc and splash on landing.

import { dealDamage } from './combat.js';
import { burst, shockwave } from './particles.js';
import { dist2, dist } from './util.js';
import { pointAt } from './path.js';

/** A beam visual from a tower to a point, fading over 0.14s. */
export function fireBeam(state, tower, target, stats, color, width) {
  state.beams.push({
    x1: tower.x,
    y1: tower.y - 14,
    x2: target.x,
    y2: target.y,
    life: 0.14,
    ttl: 0.14,
    color,
    width,
    kind: 'beam',
  });
  burst(state, target.x, target.y, color, 4, 60, 0.25, 2);
  burst(state, tower.x, tower.y - 14, color, 2, 30, 0.18, 2);
}

/** A mortar shell arcing toward where the target will be: the shell
 *  leads its target by the flight time along the road. */
export function fireShell(state, tower, target, stats) {
  const flight = 0.55;
  const lead = target.speed * flight * 0.8;
  const aim = pointAt(state.path, Math.min(target.distance + lead, state.path.total));
  state.projectiles.push({
    kind: 'shell',
    x: tower.x,
    y: tower.y - 16,
    fromX: tower.x,
    fromY: tower.y - 16,
    toX: aim.x,
    toY: aim.y,
    t: 0,
    flight,
    damage: stats.damage,
    splash: tower.def.splash || 55,
    color: tower.def.color,
  });
}

/** Chain lightning: damage the target, then arc to nearby shadows. */
export function fireChain(state, tower, first, stats) {
  const chains = tower.def.chains + (tower.level - 1);
  const jumpRange = tower.def.chainRange || 110;
  const hit = new Set();
  let current = first;
  let px = tower.x;
  let py = tower.y - 14;
  let damage = stats.damage;
  for (let i = 0; i < chains && current; i++) {
    dealDamage(state, current, Math.round(damage), { floater: false });
    hit.add(current);
    state.beams.push({
      x1: px,
      y1: py,
      x2: current.x,
      y2: current.y,
      life: 0.16,
      ttl: 0.16,
      color: tower.def.color,
      width: 3,
      kind: 'chain',
      seed: state.rng.next() * 100,
    });
    px = current.x;
    py = current.y;
    damage *= 0.75;
    let next = null;
    let bestD = Infinity;
    for (const enemy of state.enemies) {
      if (enemy.dead || hit.has(enemy)) continue;
      const d = dist2(px, py, enemy.x, enemy.y);
      if (d < jumpRange * jumpRange && d < bestD) {
        bestD = d;
        next = enemy;
      }
    }
    current = next;
  }
}

/** Advance shells; beams fade. Splash damage lands on arrival. */
export function updateProjectiles(state, dt) {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.t += dt;
    const k = Math.min(1, p.t / p.flight);
    p.x = p.fromX + (p.toX - p.fromX) * k;
    p.y = p.fromY + (p.toY - p.fromY) * k - Math.sin(k * Math.PI) * 46;
    if (k >= 1) {
      state.projectiles.splice(i, 1);
      const r2 = p.splash * p.splash;
      for (const enemy of state.enemies.slice()) {
        if (enemy.dead) continue;
        if (dist2(p.toX, p.toY, enemy.x, enemy.y) <= r2) {
          dealDamage(state, enemy, p.damage, { floater: false });
        }
      }
      burst(state, p.toX, p.toY, '#ff9d5c', 14, 120, 0.45, 3);
      burst(state, p.toX, p.toY, '#ffd166', 6, 70, 0.35, 2);
      shockwave(state, p.toX, p.toY, '#ff9d5c', p.splash, 0.3);
    }
  }
  for (let i = state.beams.length - 1; i >= 0; i--) {
    state.beams[i].life -= dt;
    if (state.beams[i].life <= 0) state.beams.splice(i, 1);
  }
}

/** Draw shells and fading beams/chains. */
export function drawProjectiles(ctx, state) {
  for (const beam of state.beams) {
    const a = Math.max(0, beam.life / beam.ttl);
    ctx.globalAlpha = a;
    ctx.strokeStyle = beam.color;
    ctx.lineCap = 'round';
    if (beam.kind === 'chain') {
      ctx.lineWidth = beam.width;
      ctx.beginPath();
      const segs = 5;
      ctx.moveTo(beam.x1, beam.y1);
      for (let i = 1; i < segs; i++) {
        const t = i / segs;
        const mx = beam.x1 + (beam.x2 - beam.x1) * t;
        const my = beam.y1 + (beam.y2 - beam.y1) * t;
        const jog = Math.sin(beam.seed + i * 2.4) * 9;
        ctx.lineTo(mx + jog, my + Math.cos(beam.seed + i * 1.7) * 9);
      }
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();
    } else {
      ctx.lineWidth = beam.width + 3;
      ctx.globalAlpha = a * 0.35;
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();
      ctx.globalAlpha = a;
      ctx.lineWidth = beam.width;
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  for (const p of state.projectiles) {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9d5c';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Distance helper kept local for splash falloff checks elsewhere. */
export function inSplashRange(x, y, cx, cy, radius) {
  return dist(x, y, cx, cy) <= radius;
}
