// DAWNHOLD — battlefield rendering: night sky, the road, plots, the
// Beacon, towers, shadows, and the placement ghost. Everything is drawn
// in code; the palette comes from config.js.

import { TAU, clamp, pulse, lerp } from './util.js';
import { PALETTE, VIEW_W, VIEW_H, BOARD_TOP, BOARD_BOTTOM, BAR_Y, PLOT_RADIUS, BEACON_POS, ROAD_WIDTHS } from './config.js';
import { cycleOf } from './state.js';
import { drawProjectiles } from './projectiles.js';
import { drawParticles, shakeOffset } from './particles.js';
import { effectiveStats } from './towers.js';
import { towerDef } from './balance.js';

/** Draw the whole battlefield (no HUD, no screens). */
export function drawBoard(ctx, state) {
  const shake = shakeOffset(state);
  ctx.save();
  ctx.translate(shake.x, shake.y);
  drawSky(ctx, state);
  drawGround(ctx, state);
  drawRoad(ctx, state);
  drawPlots(ctx, state);
  drawBeacon(ctx, state);
  drawTowers(ctx, state);
  drawEnemies(ctx, state);
  drawProjectiles(ctx, state);
  drawParticles(ctx, state);
  drawPlacementGhost(ctx, state);
  drawNightVeil(ctx, state);
  ctx.restore();
}

/** Gradient sky, stars, and a low moon over the battlefield. */
function drawSky(ctx, state) {
  const cycle = cycleOf(Math.max(1, state.wave || 1));
  const grad = ctx.createLinearGradient(0, 0, 0, BOARD_BOTTOM);
  if (cycle.id === 'dawn') {
    grad.addColorStop(0, '#2a1a4a');
    grad.addColorStop(1, '#4a2a55');
  } else if (cycle.id === 'night') {
    grad.addColorStop(0, '#05031a');
    grad.addColorStop(1, '#120e2e');
  } else {
    grad.addColorStop(0, PALETTE.skyTop);
    grad.addColorStop(1, PALETTE.skyBottom);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, BOARD_BOTTOM + 2);
  // Stars: fixed positions from a tiny hash, twinkling with the clock.
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 90; i++) {
    const sx = (i * 137.5 + 31) % VIEW_W;
    const sy = (i * 61.7 + 17) % 150 + 4;
    const tw = 0.35 + 0.65 * pulse(state.time + i * 0.37, 2.4);
    ctx.globalAlpha = tw * (cycle.id === 'night' ? 1 : 0.7);
    const s = i % 7 === 0 ? 2 : 1;
    ctx.fillRect(sx, sy, s, s);
  }
  ctx.globalAlpha = 1;
  // Moon: pale disc with a soft halo, upper right.
  const mx = 1150;
  const my = 84;
  const halo = ctx.createRadialGradient(mx, my, 4, mx, my, 60);
  halo.addColorStop(0, 'rgba(255,243,196,0.5)');
  halo.addColorStop(1, 'rgba(255,243,196,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(mx, my, 60, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(mx, my, 20, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(11,14,38,0.25)';
  ctx.beginPath();
  ctx.arc(mx - 6, my - 4, 5, 0, TAU);
  ctx.arc(mx + 7, my + 6, 3.5, 0, TAU);
  ctx.fill();
}

/** Ground: dark field with soft texture patches and distant pines. */
function drawGround(ctx, state) {
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, BOARD_TOP, VIEW_W, BOARD_BOTTOM - BOARD_TOP);
  // Soft mottling.
  for (let i = 0; i < 26; i++) {
    const gx = (i * 211.3 + 47) % VIEW_W;
    const gy = BOARD_TOP + ((i * 97.7 + 23) % (BOARD_BOTTOM - BOARD_TOP - 20));
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(gx, gy, 60 + (i % 5) * 14, 16 + (i % 3) * 6, 0, 0, TAU);
    ctx.fill();
  }
  // Pine silhouettes along the top edge.
  ctx.fillStyle = '#0e0a24';
  for (let i = 0; i < 16; i++) {
    const px = 30 + i * 82 + (i % 3) * 18;
    const py = BOARD_TOP + 6;
    const h = 26 + (i % 4) * 7;
    ctx.beginPath();
    ctx.moveTo(px, py + h);
    ctx.lineTo(px - 13, py + h);
    ctx.lineTo(px, py);
    ctx.lineTo(px + 13, py + h);
    ctx.closePath();
    ctx.fill();
  }
}

/** The shadow road: stone band, glowing edges, marching chevrons. */
function drawRoad(ctx, state) {
  const pts = state.path.points;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // Outer glow.
  ctx.strokeStyle = 'rgba(138,118,201,0.25)';
  ctx.lineWidth = ROAD_WIDTHS.glow;
  tracePath(ctx, pts);
  ctx.stroke();
  // Stone band.
  ctx.strokeStyle = PALETTE.road;
  ctx.lineWidth = ROAD_WIDTHS.stone;
  tracePath(ctx, pts);
  ctx.stroke();
  // Inner band.
  ctx.strokeStyle = '#453672';
  ctx.lineWidth = ROAD_WIDTHS.inner;
  tracePath(ctx, pts);
  ctx.stroke();
  // Stone speckles along the band for texture.
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let d = 40; d < state.path.total; d += 90) {
    const pos = pointOnPath(state, d);
    const side = (d % 180 < 90 ? 1 : -1) * 9;
    const ang = angleOnPath(state, d);
    ctx.beginPath();
    ctx.arc(pos.x + Math.cos(ang + Math.PI / 2) * side, pos.y + Math.sin(ang + Math.PI / 2) * side, 2.5, 0, TAU);
    ctx.fill();
  }
  // Edge lines.
  ctx.strokeStyle = PALETTE.roadEdge;
  ctx.lineWidth = 2;
  tracePath(ctx, pts);
  ctx.stroke();
  // Chevrons flowing toward the Beacon.
  ctx.fillStyle = 'rgba(255,209,102,0.35)';
  const total = state.path.total;
  const spacing = 120;
  const offset = (state.time * 26) % spacing;
  for (let d = offset; d < total; d += spacing) {
    const pos = pointOnPath(state, d);
    const ang = angleOnPath(state, d);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-5, -7);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function tracePath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
}

function pointOnPath(state, d) {
  const segs = state.path.segments;
  const dd = Math.max(0, Math.min(d, state.path.total));
  for (const seg of segs) {
    if (dd <= seg.start + seg.len || seg === segs[segs.length - 1]) {
      const t = seg.len === 0 ? 0 : (dd - seg.start) / seg.len;
      return { x: seg.x1 + (seg.x2 - seg.x1) * t, y: seg.y1 + (seg.y2 - seg.y1) * t };
    }
  }
  return { x: 0, y: 0 };
}

function angleOnPath(state, d) {
  const segs = state.path.segments;
  const dd = Math.max(0, Math.min(d, state.path.total));
  for (const seg of segs) {
    if (dd <= seg.start + seg.len || seg === segs[segs.length - 1]) {
      return Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
    }
  }
  return 0;
}

/** Build plots: stone circles, highlighted on hover or while building. */
function drawPlots(ctx, state) {
  for (const plot of state.plots) {
    if (plot.tower) continue;
    const hover = state.hoverPlot === plot;
    const building = state.selectedBuild !== null;
    ctx.fillStyle = PALETTE.plot;
    ctx.beginPath();
    ctx.arc(plot.x, plot.y, PLOT_RADIUS, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = hover ? PALETTE.cardSel : PALETTE.plotEdge;
    ctx.lineWidth = hover ? 3 : 2;
    ctx.beginPath();
    ctx.arc(plot.x, plot.y, PLOT_RADIUS, 0, TAU);
    ctx.stroke();
    if (building) {
      ctx.fillStyle = 'rgba(255,209,102,0.12)';
      ctx.beginPath();
      ctx.arc(plot.x, plot.y, PLOT_RADIUS - 4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,209,102,0.8)';
      ctx.font = 'bold 18px "Trebuchet MS", Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', plot.x, plot.y + 1);
    }
  }
}

/** The Beacon: a tall lighthouse at the road's end, glowing with HP. */
function drawBeacon(ctx, state) {
  const { x, y } = BEACON_POS;
  const hpFrac = state.beaconMax > 0 ? state.beaconHp / state.beaconMax : 0;
  const flicker = pulse(state.time, 1.6);
  // Ground glow scales with remaining HP.
  const glowR = 70 + flicker * 18;
  const glow = ctx.createRadialGradient(x, y - 30, 6, x, y - 30, glowR);
  glow.addColorStop(0, `rgba(255,209,102,${0.45 * hpFrac + 0.1})`);
  glow.addColorStop(1, 'rgba(255,209,102,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y - 30, glowR, 0, TAU);
  ctx.fill();
  // Tower body.
  ctx.fillStyle = '#2c2352';
  ctx.beginPath();
  ctx.moveTo(x - 20, y + 8);
  ctx.lineTo(x - 13, y - 78);
  ctx.lineTo(x + 13, y - 78);
  ctx.lineTo(x + 20, y + 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#4d4185';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Bands.
  ctx.fillStyle = '#3a2f5e';
  ctx.fillRect(x - 16, y - 46, 32, 8);
  ctx.fillRect(x - 14, y - 66, 28, 6);
  // Lamp room. When the Beacon is low, the lamp burns red and sputters.
  const lowHp = hpFrac <= 0.35;
  const lampColor = lowHp ? '#ff8a5c' : '#ffd166';
  const sputter = lowHp ? (Math.sin(state.time * 23) > 0.2 ? 1 : 0.55) : 1;
  ctx.fillStyle = lampColor;
  ctx.beginPath();
  ctx.arc(x, y - 88, (13 + flicker * 2) * sputter, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(x, y - 88, 7 * sputter, 0, TAU);
  ctx.fill();
  // Roof cap.
  ctx.fillStyle = '#1c1638';
  ctx.beginPath();
  ctx.moveTo(x - 16, y - 96);
  ctx.lineTo(x, y - 112);
  ctx.lineTo(x + 16, y - 96);
  ctx.closePath();
  ctx.fill();
  // Light beam sweeping gently.
  const beamAng = -Math.PI / 2 + Math.sin(state.time * 0.5) * 0.35;
  ctx.save();
  ctx.translate(x, y - 88);
  ctx.rotate(beamAng + Math.PI / 2);
  const beam = ctx.createLinearGradient(0, 0, 0, -150);
  beam.addColorStop(0, `rgba(255,243,196,${0.35 * hpFrac + 0.05})`);
  beam.addColorStop(1, 'rgba(255,243,196,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.lineTo(7, 0);
  ctx.lineTo(26, -150);
  ctx.lineTo(-26, -150);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // HP ring under the Beacon.
  ctx.fillStyle = PALETTE.hpBg;
  ctx.beginPath();
  ctx.arc(x, y + 14, 24, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = hpFrac > 0.35 ? '#8fe388' : '#ff6b6b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y + 14, 24, -Math.PI / 2, -Math.PI / 2 + TAU * hpFrac);
  ctx.stroke();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 13px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(state.beaconHp), x, y + 15);
}

/** All towers, with range rings for the selected one. */
function drawTowers(ctx, state) {
  const cycle = cycleOf(Math.max(1, state.wave || 1));
  for (const tower of state.towers) {
    const selected = state.selectedTower === tower;
    if (selected) {
      const stats = effectiveStats(state, tower);
      ctx.fillStyle = 'rgba(255,209,102,0.10)';
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, stats.range, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,209,102,0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, stats.range, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    drawTowerShape(ctx, state, tower, cycle.night);
  }
}

/** One tower's silhouette, by kind, with level pips and glow. */
function drawTowerShape(ctx, state, tower, night) {
  const { x, y } = tower;
  const def = tower.def;
  const glowStrength = night ? 1 : 0.7;
  const flicker = pulse(state.time + tower.id, 2.1);
  // Base.
  ctx.fillStyle = '#241d45';
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = selectedStroke(state, tower);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, TAU);
  ctx.stroke();
  // Glow pool.
  const pool = ctx.createRadialGradient(x, y, 4, x, y, 34);
  pool.addColorStop(0, hexA(def.color, 0.35 * glowStrength));
  pool.addColorStop(1, hexA(def.color, 0));
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.arc(x, y, 34, 0, TAU);
  ctx.fill();

  if (def.kind === 'beam' && def.id === 'prism') {
    // Crystal shard.
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(x, y - 22);
    ctx.lineTo(x + 9, y - 2);
    ctx.lineTo(x, y + 8);
    ctx.lineTo(x - 9, y - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = def.glow;
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x + 4, y - 2);
    ctx.lineTo(x, y + 4);
    ctx.lineTo(x - 4, y - 2);
    ctx.closePath();
    ctx.fill();
  } else if (def.kind === 'shell') {
    // Mortar: squat barrel aimed by angle.
    ctx.save();
    ctx.translate(x, y - 6);
    ctx.rotate(tower.angle + Math.PI / 2);
    ctx.fillStyle = '#3a2f5e';
    ctx.fillRect(-7, -18, 14, 22);
    ctx.fillStyle = def.color;
    ctx.fillRect(-7, -18, 14, 6);
    ctx.restore();
    ctx.fillStyle = '#4a3f78';
    ctx.beginPath();
    ctx.arc(x, y - 4, 10, 0, TAU);
    ctx.fill();
  } else if (def.kind === 'aura') {
    // Frost lantern: hanging lamp with a cold ring.
    ctx.strokeStyle = hexA(def.color, 0.5 + flicker * 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 15 + flicker * 2, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(x, y - 6, 9, 0, TAU);
    ctx.fill();
    ctx.fillStyle = def.glow;
    ctx.beginPath();
    ctx.arc(x, y - 6, 4.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#4d4185';
    ctx.beginPath();
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x, y - 22);
    ctx.stroke();
  } else if (def.kind === 'chain') {
    // Storm coil: copper rings with a spark.
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x, y - 8, 6 + i * 5, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = def.glow;
    ctx.beginPath();
    ctx.arc(x, y - 8, 4 + flicker * 1.5, 0, TAU);
    ctx.fill();
  } else if (def.kind === 'beam' && def.id === 'sniper') {
    // Sunlens: tall lens on a mount, aimed by angle.
    ctx.save();
    ctx.translate(x, y - 4);
    ctx.rotate(tower.angle);
    ctx.fillStyle = '#3a2f5e';
    ctx.fillRect(-4, -4, 26, 8);
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(24, 0, 7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = def.glow;
    ctx.beginPath();
    ctx.arc(24, 0, 3.5, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#4a3f78';
    ctx.beginPath();
    ctx.arc(x, y - 4, 8, 0, TAU);
    ctx.fill();
  } else {
    // Dawn obelisk: pale monolith with a sun disc.
    ctx.fillStyle = '#e8ddc0';
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 8);
    ctx.lineTo(x - 5, y - 18);
    ctx.lineTo(x, y - 26);
    ctx.lineTo(x + 5, y - 18);
    ctx.lineTo(x + 7, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(x, y - 12, 4.5, 0, TAU);
    ctx.fill();
  }
  // Muzzle flash.
  if (tower.flash > 0) {
    ctx.fillStyle = hexA('#ffffff', clamp(tower.flash / 0.12, 0, 1) * 0.8);
    ctx.beginPath();
    ctx.arc(x, y - 12, 8, 0, TAU);
    ctx.fill();
  }
  // Level pips.
  for (let i = 0; i < tower.level; i++) {
    ctx.fillStyle = PALETTE.cardSel;
    ctx.beginPath();
    ctx.arc(x - 10 + i * 10, y + 20, 3, 0, TAU);
    ctx.fill();
  }
}

function selectedStroke(state, tower) {
  return state.selectedTower === tower ? PALETTE.cardSel : '#4d4185';
}

/** Shadows, with health bars, shields, slow tint and boss crowns. */
function drawEnemies(ctx, state) {
  for (const enemy of state.enemies) {
    drawEnemyShape(ctx, state, enemy);
  }
}

function drawEnemyShape(ctx, state, enemy) {
  const { x, y } = enemy;
  const def = enemy.def;
  const wobble = Math.sin(enemy.wobble) * 2;
  const r = def.radius;
  // Shadow blob.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.8, r * 0.9, r * 0.35, 0, 0, TAU);
  ctx.fill();
  // Body: lumpy dark mass.
  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.arc(x, y + wobble * 0.3, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.3 + wobble * 0.3, r * 0.45, 0, TAU);
  ctx.fill();
  // Boss crown and trim.
  if (enemy.isBoss) {
    ctx.strokeStyle = enemy.trim || '#ffd166';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y + wobble * 0.3, r + 4, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.4;
      const cx = x + Math.cos(a) * (r + 2);
      const cy = y + wobble * 0.3 + Math.sin(a) * (r + 2);
      ctx.fillStyle = enemy.trim || '#ffd166';
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy + 3);
      ctx.lineTo(cx, cy - 8);
      ctx.lineTo(cx + 4, cy + 3);
      ctx.closePath();
      ctx.fill();
    }
    // Phase pips above the boss.
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < enemy.bossPhase ? (enemy.trim || '#ffd166') : 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(x - 14 + i * 14, y - r - 14, 4, 0, TAU);
      ctx.fill();
    }
  }
  // Shield ring.
  if (enemy.shield > 0) {
    ctx.strokeStyle = 'rgba(127,231,255,0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y + wobble * 0.3, r + 5, 0, TAU);
    ctx.stroke();
    // Hex facets.
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (TAU * i) / 6 + state.time * 0.8;
      const hx = x + Math.cos(a) * (r + 5);
      const hy = y + wobble * 0.3 + Math.sin(a) * (r + 5);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
  }
  // Slow tint.
  if (state.time < enemy.slowUntil && !def.immuneSlow) {
    ctx.fillStyle = 'rgba(159,216,255,0.25)';
    ctx.beginPath();
    ctx.arc(x, y + wobble * 0.3, r, 0, TAU);
    ctx.fill();
  }
  // Eyes: two glowing dots facing the direction of travel.
  const look = 3;
  ctx.fillStyle = def.eye;
  ctx.beginPath();
  ctx.arc(x - 5 + look, y - 3 + wobble * 0.3, enemy.isBoss ? 4 : 2.8, 0, TAU);
  ctx.arc(x + 5 + look, y - 3 + wobble * 0.3, enemy.isBoss ? 4 : 2.8, 0, TAU);
  ctx.fill();
  // Wraith veil.
  if (def.id === 'wraith') {
    ctx.globalAlpha = 0.35 + pulse(state.time + enemy.wobble, 1.4) * 0.25;
    ctx.fillStyle = '#dfe6ff';
    ctx.beginPath();
    ctx.arc(x, y + wobble * 0.3, r + 3, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Health bar (bosses also get the big bar in the HUD).
  const w = enemy.isBoss ? 64 : 30;
  const frac = clamp(enemy.hp / enemy.maxHp, 0, 1);
  const by = y - r - 9;
  ctx.fillStyle = 'rgba(5,3,20,0.8)';
  ctx.fillRect(x - w / 2, by, w, 5);
  ctx.fillStyle = frac > 0.5 ? '#8fe388' : frac > 0.25 ? '#ffd166' : '#ff6b6b';
  ctx.fillRect(x - w / 2, by, w * frac, 5);
  if (enemy.shield > 0 && enemy.maxShield > 0) {
    ctx.fillStyle = '#7fe7ff';
    ctx.fillRect(x - w / 2, by - 3, w * clamp(enemy.shield / enemy.maxShield, 0, 1), 2);
  }
}

/** Ghost of the tower being placed, with its range ring. */
function drawPlacementGhost(ctx, state) {
  if (!state.selectedBuild) return;
  const def = towerDef(state.selectedBuild);
  if (!def) return;
  const { x, y } = state.mouse;
  const plot = state.hoverPlot;
  const px = plot ? plot.x : x;
  const py = plot ? plot.y : y;
  const ok = plot && !plot.tower && state.embers >= def.cost;
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = ok ? 'rgba(255,209,102,0.12)' : 'rgba(255,107,107,0.12)';
  ctx.beginPath();
  ctx.arc(px, py, def.range, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = ok ? 'rgba(255,209,102,0.6)' : 'rgba(255,107,107,0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(px, py, def.range, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = hexA(def.color, 0.7);
  ctx.beginPath();
  ctx.arc(px, py, 20, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 13px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.name, px, py - 32);
  ctx.globalAlpha = 1;
}

/** Night darkens the field; dawn lifts it. */
function drawNightVeil(ctx, state) {
  const cycle = cycleOf(Math.max(1, state.wave || 1));
  if (cycle.id === 'night') {
    ctx.fillStyle = 'rgba(5,3,26,0.18)';
    ctx.fillRect(0, BOARD_TOP, VIEW_W, BOARD_BOTTOM - BOARD_TOP);
  }
}

/** Hex color with an alpha channel. */
export function hexA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Lerp helper re-export for screens that animate panels. */
export function panelSlide(t) {
  return lerp(-30, 0, 1 - Math.pow(1 - clamp(t, 0, 1), 3));
}
