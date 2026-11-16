// DAWNHOLD — the HUD: top status bar, build bar, selected-tower panel,
// next-wave preview, boss bar, and every clickable button. Draw functions
// register their hit regions into state.uiRegions for the input router.

import { PALETTE, VIEW_W, HUD_H, BAR_Y, BAR_H, CAMPAIGN_WAVES } from './config.js';
import { TOWERS, towerDef, upgradeCost, MAX_TOWER_LEVEL } from './balance.js';
import { formatInt, fitText } from './util.js';
import { cycleOf } from './state.js';
import { effectiveStats } from './towers.js';

const FONT = '"Trebuchet MS", Verdana, sans-serif';

/** Draw all HUD layers for the playing phase and register regions. */
export function drawHud(ctx, state) {
  state.uiRegions.length = 0;
  drawTopBar(ctx, state);
  drawBuildBar(ctx, state);
  drawSelectedPanel(ctx, state);
  drawBossBar(ctx, state);
  drawBanner(ctx, state);
}

/** Top bar: wave, embers, shards, Beacon HP, score, combo, cycle, buttons. */
function drawTopBar(ctx, state) {
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = PALETTE.hudEdge;
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);

  let x = 16;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  // Wave counter. Boss waves get a gold crown marker.
  ctx.font = `bold 17px ${FONT}`;
  ctx.fillStyle = state.waveIsBoss ? '#ffd166' : PALETTE.text;
  const waveLabel = state.mode === 'campaign'
    ? `WAVE ${Math.max(1, state.wave)}/${CAMPAIGN_WAVES}`
    : `WAVE ${Math.max(1, state.wave)} ∞`;
  ctx.fillText(state.waveIsBoss ? `♛ ${waveLabel}` : waveLabel, x, HUD_H / 2);
  x += ctx.measureText(waveLabel).width + (state.waveIsBoss ? 26 : 18);

  // Day/night cycle.
  const cycle = cycleOf(Math.max(1, state.wave || 1));
  ctx.font = `15px ${FONT}`;
  ctx.fillStyle = cycle.night ? '#9fb8ff' : cycle.dawn ? '#ffd166' : '#ff9d5c';
  ctx.fillText(`${cycle.icon} ${cycle.label}`, x, HUD_H / 2);
  x += 86;

  // Embers.
  ctx.font = `bold 17px ${FONT}`;
  ctx.fillStyle = PALETTE.ember;
  ctx.fillText(`◆ ${formatInt(state.embers)}`, x, HUD_H / 2);
  x += 108;

  // Shards.
  ctx.fillStyle = PALETTE.shard;
  ctx.fillText(`✦ ${state.shards}`, x, HUD_H / 2);
  x += 64;

  // Beacon HP bar.
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `13px ${FONT}`;
  ctx.fillText('BEACON', x, HUD_H / 2 - 10);
  ctx.fillStyle = PALETTE.hpBg;
  ctx.fillRect(x, HUD_H / 2 + 2, 110, 12);
  const frac = state.beaconMax > 0 ? state.beaconHp / state.beaconMax : 0;
  ctx.fillStyle = frac > 0.35 ? '#8fe388' : '#ff6b6b';
  ctx.fillRect(x, HUD_H / 2 + 2, 110 * frac, 12);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${state.beaconHp}/${state.beaconMax}`, x + 55, HUD_H / 2 + 8);
  ctx.textAlign = 'left';
  x += 130;

  // Score and combo.
  ctx.fillStyle = PALETTE.score;
  ctx.font = `bold 17px ${FONT}`;
  ctx.fillText(`SCORE ${formatInt(state.score)}`, x, HUD_H / 2);
  x += ctx.measureText(`SCORE ${formatInt(state.score)}`).width + 16;
  if (state.combo >= 3) {
    ctx.fillStyle = PALETTE.combo;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(`COMBO x${state.combo}`, x, HUD_H / 2);
  }

  // Right-side buttons: speed, pause, mute, restart.
  const btnW = 52;
  let bx = VIEW_W - 16 - btnW * 4 - 8 * 3;
  drawHudButton(ctx, state, bx, 8, btnW, HUD_H - 16, `${state.speed}x`, 'speed', 'Speed (F)');
  bx += btnW + 8;
  drawHudButton(ctx, state, bx, 8, btnW, HUD_H - 16, '❚❚', 'pause', 'Pause (P)');
  bx += btnW + 8;
  drawHudButton(ctx, state, bx, 8, btnW, HUD_H - 16, state.muted ? '✕♪' : '♪', 'mute', 'Mute (M)');
  bx += btnW + 8;
  drawHudButton(ctx, state, bx, 8, btnW, HUD_H - 16, '↺', 'restart', 'Restart (R)');
}

/** One small HUD button with hover highlight and a registered region. */
function drawHudButton(ctx, state, x, y, w, h, label, action, title) {
  const hover = state.mouse.x >= x && state.mouse.x <= x + w && state.mouse.y >= y && state.mouse.y <= y + h;
  ctx.fillStyle = hover ? '#2c2352' : PALETTE.cardBg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = hover ? PALETTE.cardSel : PALETTE.cardEdge;
  ctx.lineWidth = hover ? 2 : 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 16px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  state.uiRegions.push({ x, y, w, h, action, title });
}

/** Bottom build bar: 6 tower cards, Nova button, wave preview, Start Wave. */
function drawBuildBar(ctx, state) {
  ctx.fillStyle = PALETTE.barBg;
  ctx.fillRect(0, BAR_Y, VIEW_W, BAR_H);
  ctx.fillStyle = PALETTE.hudEdge;
  ctx.fillRect(0, BAR_Y, VIEW_W, 2);

  const cardW = 118;
  const cardH = BAR_H - 16;
  const gap = 8;
  let x = 12;
  const y = BAR_Y + 8;
  for (const def of TOWERS) {
    drawTowerCard(ctx, state, def, x, y, cardW, cardH);
    x += cardW + gap;
  }

  // Nova button.
  const novaW = 96;
  const novaReady = state.shards >= 1 && state.novaCooldown <= 0;
  const novaHover = state.mouse.x >= x && state.mouse.x <= x + novaW && state.mouse.y >= y && state.mouse.y <= y + cardH;
  ctx.fillStyle = novaReady ? (novaHover ? '#4a3a10' : '#2e2408') : '#191423';
  ctx.fillRect(x, y, novaW, cardH);
  ctx.strokeStyle = novaReady ? PALETTE.cardSel : PALETTE.cardEdge;
  ctx.lineWidth = novaReady ? 2 : 1;
  ctx.strokeRect(x + 0.5, y + 0.5, novaW - 1, cardH - 1);
  ctx.textAlign = 'center';
  ctx.fillStyle = novaReady ? '#fff3c4' : PALETTE.textDim;
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText('✺', x + novaW / 2, y + 26);
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText('NOVA', x + novaW / 2, y + 48);
  ctx.font = `12px ${FONT}`;
  ctx.fillStyle = state.novaCooldown > 0 ? PALETTE.bad : PALETTE.shard;
  ctx.fillText(
    state.novaCooldown > 0 ? `${Math.ceil(state.novaCooldown)}s` : '1 shard (N)',
    x + novaW / 2, y + 66,
  );
  state.uiRegions.push({ x, y, w: novaW, h: cardH, action: 'nova', title: 'Nova blast (N)' });
  x += novaW + gap;

  // Next-wave preview strip.
  const preview = state.nextPreview || [];
  const pw = 190;
  ctx.fillStyle = '#141031';
  ctx.fillRect(x, y, pw, cardH);
  ctx.strokeStyle = PALETTE.cardEdge;
  ctx.strokeRect(x + 0.5, y + 0.5, pw - 1, cardH - 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillText(state.waveActive ? 'ON THE ROAD' : 'NEXT WAVE', x + 8, y + 14);
  ctx.font = `13px ${FONT}`;
  let py = y + 34;
  for (const item of preview.slice(0, 3)) {
    ctx.fillStyle = item.color || PALETTE.text;
    ctx.fillText(`${item.icon} ${item.label}`, x + 8, py);
    py += 18;
  }
  if (preview.length === 0) {
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText('—', x + 8, py);
  }
  x += pw + gap;

  // Start Wave button (or the wave status).
  const swW = VIEW_W - x - 12;
  const canStart = !state.waveActive && state.phase === 'playing';
  const swHover = canStart && state.mouse.x >= x && state.mouse.x <= x + swW && state.mouse.y >= y && state.mouse.y <= y + cardH;
  ctx.fillStyle = canStart ? (swHover ? '#3d6b2f' : '#2a5220') : '#191423';
  ctx.fillRect(x, y, swW, cardH);
  ctx.strokeStyle = canStart ? '#8fe388' : PALETTE.cardEdge;
  ctx.lineWidth = canStart ? 2 : 1;
  ctx.strokeRect(x + 0.5, y + 0.5, swW - 1, cardH - 1);
  ctx.textAlign = 'center';
  ctx.fillStyle = canStart ? '#eaffea' : PALETTE.textDim;
  ctx.font = `bold ${swW > 150 ? 17 : 14}px ${FONT}`;
  ctx.fillText(canStart ? '▶ START WAVE' : state.waveActive ? 'HOLD THE LINE' : '…', x + swW / 2, y + cardH / 2 - 8);
  ctx.font = `12px ${FONT}`;
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(canStart ? '(Space)' : `${state.enemies.length} shadows left`, x + swW / 2, y + cardH / 2 + 14);
  if (canStart) {
    state.uiRegions.push({ x, y, w: swW, h: cardH, action: 'start-wave', title: 'Start the next wave' });
  }
}

/** One tower card: icon, name, cost, hotkey, affordability tint. */
function drawTowerCard(ctx, state, def, x, y, w, h) {
  const selected = state.selectedBuild === def.id;
  const afford = state.embers >= towerCost(state, def);
  const hover = state.mouse.x >= x && state.mouse.x <= x + w && state.mouse.y >= y && state.mouse.y <= y + h;
  ctx.fillStyle = selected ? '#2e2408' : hover ? '#241d45' : PALETTE.cardBg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = selected ? PALETTE.cardSel : PALETTE.cardEdge;
  ctx.lineWidth = selected ? 3 : 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.textAlign = 'center';
  // Mini icon: a glowing gem in the tower's color.
  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + 22, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = def.glow;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + 22, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillText(def.name, x + w / 2, y + 46);
  ctx.font = `12px ${FONT}`;
  ctx.fillStyle = afford ? PALETTE.ember : PALETTE.bad;
  ctx.fillText(`◆ ${towerCost(state, def)}`, x + w / 2, y + 63);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `11px ${FONT}`;
  ctx.fillText(`[${def.key}] ${shortStat(def)}`, x + w / 2, y + 78);
  state.uiRegions.push({ x, y, w, h, action: 'build', arg: def.id, title: `${def.name}: ${def.desc}` });
}

/** Short stat line for a tower card. */
function shortStat(def) {
  if (def.kind === 'buff') return 'buffs nearby';
  if (def.kind === 'aura') return 'slows nearby';
  if (def.kind === 'chain') return `${def.damage} dmg x${def.chains}`;
  if (def.kind === 'shell') return `${def.damage} splash`;
  return `${def.damage} dmg`;
}

/** Effective build cost with mutator cost modifiers. */
export function towerCost(state, def) {
  return Math.round(def.cost * (1 + (state.buffs.cost || 0)));
}

/** Selected-tower panel: stats, upgrade and sell buttons. */
function drawSelectedPanel(ctx, state) {
  const tower = state.selectedTower;
  if (!tower || state.phase !== 'playing') return;
  const w = 250;
  const h = 132;
  const x = VIEW_W - w - 12;
  const y = BAR_Y - h - 10;
  ctx.fillStyle = 'rgba(13,10,32,0.94)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.cardSel;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const stats = effectiveStats(state, tower);
  ctx.textAlign = 'left';
  ctx.fillStyle = tower.def.color;
  ctx.font = `bold 16px ${FONT}`;
  ctx.fillText(`${tower.def.name}  Lv${tower.level}`, x + 12, y + 22);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `13px ${FONT}`;
  const statLine = tower.def.kind === 'buff'
    ? `Buffs towers within ${Math.round(stats.range)}px`
    : tower.def.kind === 'aura'
      ? `Slow ${Math.round(tower.def.slow * 100)}%  ·  Range ${Math.round(stats.range)}`
      : `DMG ${stats.damage}  ·  ${stats.rate.toFixed(1)}/s  ·  RNG ${Math.round(stats.range)}`;
  ctx.fillText(statLine, x + 12, y + 44);
  ctx.fillText(fitText(ctx, tower.def.desc, w - 24), x + 12, y + 62);

  // Upgrade button.
  const bw = (w - 36) / 2;
  const by = y + 76;
  const maxed = tower.level >= MAX_TOWER_LEVEL;
  const cost = maxed ? 0 : upgradeCost(tower.def, tower.level);
  const canUp = !maxed && state.embers >= cost;
  const upHover = canUp && state.mouse.x >= x + 12 && state.mouse.x <= x + 12 + bw && state.mouse.y >= by && state.mouse.y <= by + 40;
  ctx.fillStyle = canUp ? (upHover ? '#3d6b2f' : '#2a5220') : '#191423';
  ctx.fillRect(x + 12, by, bw, 40);
  ctx.strokeStyle = canUp ? '#8fe388' : PALETTE.cardEdge;
  ctx.strokeRect(x + 12.5, by + 0.5, bw - 1, 39);
  ctx.fillStyle = canUp ? '#eaffea' : PALETTE.textDim;
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(maxed ? 'MAX LEVEL' : `UPGRADE ◆${cost}`, x + 12 + bw / 2, by + 17);
  ctx.font = `11px ${FONT}`;
  ctx.fillText(maxed ? '' : '(U)', x + 12 + bw / 2, by + 32);
  if (canUp) state.uiRegions.push({ x: x + 12, y: by, w: bw, h: 40, action: 'upgrade', title: 'Upgrade tower (U)' });

  // Sell button.
  const sx = x + 24 + bw;
  const refund = Math.round(tower.invested * 0.7);
  const sellHover = state.mouse.x >= sx && state.mouse.x <= sx + bw && state.mouse.y >= by && state.mouse.y <= by + 40;
  ctx.fillStyle = sellHover ? '#5e2a2a' : '#33191f';
  ctx.fillRect(sx, by, bw, 40);
  ctx.strokeStyle = '#ff6b6b';
  ctx.strokeRect(sx + 0.5, by + 0.5, bw - 1, 39);
  ctx.fillStyle = '#ffd9d9';
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText(`SELL ◆${refund}`, sx + bw / 2, by + 17);
  ctx.font = `11px ${FONT}`;
  ctx.fillText('(X)', sx + bw / 2, by + 32);
  state.uiRegions.push({ x: sx, y: by, w: bw, h: 40, action: 'sell', title: 'Sell tower (X)' });
}

/** Boss HP bar across the top of the board while a boss lives. */
function drawBossBar(ctx, state) {
  const boss = state.boss;
  if (!boss || boss.dead) return;
  const w = 560;
  const x = (VIEW_W - w) / 2;
  const y = HUD_H + 10;
  ctx.fillStyle = 'rgba(5,3,20,0.85)';
  ctx.fillRect(x - 10, y - 6, w + 20, 34);
  ctx.strokeStyle = boss.trim || '#ffd166';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 9.5, y - 5.5, w + 19, 33);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${boss.bossDef.name.toUpperCase()}  ·  PHASE ${boss.bossPhase}/3`, x + w / 2, y + 6);
  ctx.fillStyle = '#3a1522';
  ctx.fillRect(x, y + 12, w, 8);
  const frac = Math.max(0, boss.hp / boss.maxHp);
  ctx.fillStyle = boss.trim || '#ffd166';
  ctx.fillRect(x, y + 12, w * frac, 8);
}

/** Center banner: wave announcements and boss warnings. */
function drawBanner(ctx, state) {
  if (!state.banner || state.bannerTime <= 0) return;
  const a = Math.min(1, state.bannerTime / 0.4);
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.font = `bold 34px ${FONT}`;
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(5,3,20,0.9)';
  ctx.strokeText(state.banner.text, VIEW_W / 2, 150);
  ctx.fillStyle = '#fff3c4';
  ctx.fillText(state.banner.text, VIEW_W / 2, 150);
  if (state.banner.sub) {
    ctx.font = `16px ${FONT}`;
    ctx.lineWidth = 4;
    ctx.strokeText(state.banner.sub, VIEW_W / 2, 178);
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText(state.banner.sub, VIEW_W / 2, 178);
  }
  ctx.globalAlpha = 1;
}

/** Rebuild the next-wave preview from the wave composer (cheap snapshot). */
export function refreshPreview(state) {
  if (state.waveActive) {
    const counts = {};
    for (const e of state.enemies) counts[e.def.name] = (counts[e.def.name] || 0) + 1;
    state.nextPreview = Object.entries(counts).map(([name, count]) => ({
      icon: '●',
      label: `${name} x${count}`,
      color: PALETTE.textDim,
    }));
    return;
  }
  const next = state.wave + 1;
  const kinds = [];
  if (next >= 1) kinds.push({ icon: '●', label: 'Skitters', color: '#b8abd9' });
  if (next >= 2) kinds.push({ icon: '◆', label: 'Husks', color: '#ffb347' });
  if (next >= 3) kinds.push({ icon: '○', label: 'Wraiths', color: '#dfe6ff' });
  if (next >= 4) kinds.push({ icon: '⬡', label: 'Shielded', color: '#7fe7ff' });
  if (next >= 5) kinds.push({ icon: '✚', label: 'Splitters', color: '#e6a8ff' });
  if (next % 10 === 0) kinds.unshift({ icon: '♛', label: 'BOSS', color: '#ffd166' });
  state.nextPreview = kinds.slice(0, 3);
}
