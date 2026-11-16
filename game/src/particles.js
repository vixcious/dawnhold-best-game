// DAWNHOLD — particles, floating text, shockwaves and screen shake: the
// juice layer. All motion is driven by the fixed simulation step so the
// staged screenshot states look the same every render.

import { TAU, clamp } from './util.js';

/** Spawn a burst of glowing sparks at a point. */
export function burst(state, x, y, color, count = 10, speed = 90, life = 0.5, size = 3) {
  for (let i = 0; i < count; i++) {
    const angle = state.rng.next() * TAU;
    const v = speed * (0.3 + state.rng.next() * 0.9);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - 20,
      life: life * (0.6 + state.rng.next() * 0.7),
      ttl: life,
      size: size * (0.6 + state.rng.next() * 0.8),
      color,
      grav: 160,
      kind: 'spark',
    });
  }
}

/** Spawn a soft glow mote that drifts upward and fades. */
export function mote(state, x, y, color, count = 1) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x: x + (state.rng.next() - 0.5) * 20,
      y: y + (state.rng.next() - 0.5) * 10,
      vx: (state.rng.next() - 0.5) * 12,
      vy: -18 - state.rng.next() * 22,
      life: 0.9 + state.rng.next() * 0.6,
      ttl: 1.2,
      size: 2 + state.rng.next() * 2.5,
      color,
      grav: -8,
      kind: 'mote',
    });
  }
}

/** Ambient ember drift: a slow rain of sparks over the board, for the
 *  title screen and quiet moments. Call sparingly, once per frame max. */
export function emberDrift(state) {
  if (state.particles.length > 120) return;
  if (state.rng.next() > 0.25) return;
  state.particles.push({
    x: state.rng.next() * 1280,
    y: 620,
    vx: (state.rng.next() - 0.5) * 8,
    vy: -14 - state.rng.next() * 18,
    life: 2.2 + state.rng.next() * 1.4,
    ttl: 3.2,
    size: 1.5 + state.rng.next() * 1.8,
    color: state.rng.next() > 0.5 ? '#ffd166' : '#ff9d5c',
    grav: -4,
    kind: 'mote',
  });
}

/** An expanding ring: impacts, nova, boss phase changes. */
export function shockwave(state, x, y, color, maxRadius = 70, life = 0.45) {
  state.particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    life,
    ttl: life,
    size: maxRadius,
    color,
    grav: 0,
    kind: 'ring',
  });
}

/** Floating combat text: damage, score, combo calls, warnings. */
export function floater(state, x, y, text, color, size = 15) {
  state.floaters.push({
    x: x + (state.rng.next() - 0.5) * 14,
    y: y - 8,
    vy: -46,
    life: 0.9,
    ttl: 0.9,
    text,
    color,
    size,
  });
  if (state.floaters.length > 40) state.floaters.splice(0, state.floaters.length - 40);
}

/** Kick the screen shake; magnitude decays over ~0.4s. */
export function addShake(state, amount) {
  state.shake = Math.min(14, state.shake + amount);
}

/** Current shake offset, from the shake magnitude and the clock. */
export function shakeOffset(state) {
  if (state.shake < 0.2) return { x: 0, y: 0 };
  const t = state.time * 47;
  return {
    x: Math.sin(t * 1.3) * state.shake * 0.6,
    y: Math.cos(t * 1.7) * state.shake * 0.6,
  };
}

/** Advance particles, floaters and shake by dt seconds. */
export function updateParticles(state, dt) {
  const parts = state.particles;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) {
      parts.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.grav * dt;
  }
  const floats = state.floaters;
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.life -= dt;
    f.y += f.vy * dt;
    if (f.life <= 0) floats.splice(i, 1);
  }
  state.shake = Math.max(0, state.shake - dt * 30);
  if (state.particles.length > 400) state.particles.splice(0, state.particles.length - 400);
}

/** Draw particles and floating text. Called after the board, before the HUD. */
export function drawParticles(ctx, state) {
  for (const p of state.particles) {
    const a = clamp(p.life / p.ttl, 0, 1);
    if (p.kind === 'ring') {
      const r = p.size * (1 - a);
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3 * a + 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, r), 0, TAU);
      ctx.stroke();
    } else if (p.kind === 'mote') {
      // Motes glow softly: a bright core with a wide faint halo.
      ctx.globalAlpha = a * 0.25;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size * a + 0.4), 0, TAU);
      ctx.fill();
    } else {
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size * a + 0.4), 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  for (const f of state.floaters) {
    const a = clamp(f.life / f.ttl, 0, 1);
    ctx.globalAlpha = a;
    ctx.font = `bold ${f.size}px "Trebuchet MS", Verdana, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(5,3,20,0.85)';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

/** A banner message across the board: wave starts, boss warnings, dawn. */
export function setBanner(state, text, sub = '', time = 2.2) {
  state.banner = { text, sub };
  state.bannerTime = time;
}

/** Update the banner timer. */
export function updateBanner(state, dt) {
  if (state.bannerTime > 0) {
    state.bannerTime -= dt;
    if (state.bannerTime <= 0) state.banner = null;
  }
}
