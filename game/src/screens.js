// DAWNHOLD — full screens: title, victory, defeat, pause, and the
// mutator draft. Each draws its panel and registers its hit regions.

import { PALETTE, VIEW_W, VIEW_H, DIFFICULTIES, MODES, CAMPAIGN_WAVES } from './config.js';
import { formatInt, formatTime, fitText } from './util.js';
import { drawBoard } from './render.js';

const FONT = '"Trebuchet MS", Verdana, sans-serif';

/** Title screen over a living attract-mode board. */
export function drawTitle(ctx, state) {
  drawBoard(ctx, state);
  ctx.fillStyle = 'rgba(5,3,20,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  state.uiRegions.length = 0;

  // Logo.
  ctx.textAlign = 'center';
  ctx.font = `bold 74px ${FONT}`;
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(5,3,20,0.9)';
  ctx.strokeText('DAWNHOLD', VIEW_W / 2, 128);
  const grad = ctx.createLinearGradient(0, 70, 0, 130);
  grad.addColorStop(0, '#fff3c4');
  grad.addColorStop(1, '#ffb347');
  ctx.fillStyle = grad;
  ctx.fillText('DAWNHOLD', VIEW_W / 2, 128);
  ctx.font = `20px ${FONT}`;
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('Hold the last light. Six towers. Thirty nights. One beacon.', VIEW_W / 2, 160);

  // Premise + win/lose lines.
  ctx.font = `16px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('Shadows walk the road each night. Build light-towers on the stone plots,', VIEW_W / 2, 196);
  ctx.fillText('spend embers wisely, and keep the Beacon burning until dawn.', VIEW_W / 2, 218);
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillStyle = '#8fe388';
  ctx.fillText(`WIN: survive all ${CAMPAIGN_WAVES} waves  ·  LOSE: the Beacon falls to 0 HP`, VIEW_W / 2, 248);

  // Mode select.
  drawOptionRow(ctx, state, 286, 'MODE', Object.values(MODES), state.mode, 'mode');
  // Difficulty select.
  drawOptionRow(ctx, state, 356, 'DIFFICULTY', Object.values(DIFFICULTIES), state.difficulty, 'difficulty');
  // The selected difficulty's full description, so the choice is informed.
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = PALETTE.textDim;
  ctx.textAlign = 'center';
  ctx.fillText(DIFFICULTIES[state.difficulty].desc, VIEW_W / 2, 414);

  // Controls line.
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('Click a tower card (or 1–6), click a plot to build  ·  Click a tower to upgrade / sell', VIEW_W / 2, 428);
  ctx.fillText('Space: start wave  ·  N: Nova blast  ·  F: speed  ·  P: pause  ·  M: mute  ·  Right-click: cancel', VIEW_W / 2, 450);

  // Start button.
  const bw = 300;
  const bh = 58;
  const bx = (VIEW_W - bw) / 2;
  const by = 478;
  const hover = state.mouse.x >= bx && state.mouse.x <= bx + bw && state.mouse.y >= by && state.mouse.y <= by + bh;
  ctx.fillStyle = hover ? '#3d6b2f' : '#2a5220';
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = '#8fe388';
  ctx.lineWidth = 3;
  ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
  ctx.fillStyle = '#eaffea';
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText('▶  START THE FIRST NIGHT', VIEW_W / 2, by + bh / 2 + 1);
  state.uiRegions.push({ x: bx, y: by, w: bw, h: bh, action: 'start-game', title: 'Start the game' });

  // Best score.
  if (state.best.score > 0) {
    ctx.font = `15px ${FONT}`;
    ctx.fillStyle = PALETTE.score;
    ctx.fillText(`BEST: ${formatInt(state.best.score)} points · wave ${state.best.wave}`, VIEW_W / 2, 576);
  }
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = 'rgba(184,171,217,0.7)';
  ctx.fillText('An original game: every tower, shadow and sound drawn and synthesized in code.', VIEW_W / 2, 640);
}

/** A row of selectable option buttons (mode / difficulty). */
function drawOptionRow(ctx, state, y, label, options, current, action) {
  const bw = 210;
  const bh = 46;
  const gap = 14;
  const total = options.length * bw + (options.length - 1) * gap;
  let x = (VIEW_W - total) / 2;
  ctx.textAlign = 'left';
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(label, x, y - 8);
  for (const opt of options) {
    const sel = opt.id === current;
    const hover = state.mouse.x >= x && state.mouse.x <= x + bw && state.mouse.y >= y && state.mouse.y <= y + bh;
    ctx.fillStyle = sel ? '#2e2408' : hover ? '#241d45' : PALETTE.cardBg;
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = sel ? PALETTE.cardSel : PALETTE.cardEdge;
    ctx.lineWidth = sel ? 3 : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
    ctx.fillStyle = sel ? '#fff3c4' : PALETTE.text;
    ctx.font = `bold 17px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(opt.label, x + bw / 2, y + 19);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = `11px ${FONT}`;
    const desc = opt.id === 'campaign' ? '30 nights to dawn' : opt.id === 'endless' ? 'No final dawn' : opt.desc;
    ctx.fillText(fitText(ctx, desc, bw - 16), x + bw / 2, y + 36);
    state.uiRegions.push({ x, y, w: bw, h: bh, action, arg: opt.id, title: opt.desc });
    x += bw + gap;
  }
}

/** Victory screen: stats, stars, and the choice to continue or restart. */
export function drawVictory(ctx, state) {
  drawEndBackdrop(ctx, state);
  state.uiRegions.length = 0;
  ctx.textAlign = 'center';
  ctx.font = `bold 58px ${FONT}`;
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(5,3,20,0.9)';
  ctx.strokeText('DAWN BREAKS', VIEW_W / 2, 130);
  ctx.fillStyle = '#ffd166';
  ctx.fillText('DAWN BREAKS', VIEW_W / 2, 130);
  ctx.font = `19px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('Thirty nights held. The Beacon still burns. The road is quiet.', VIEW_W / 2, 164);
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`${MODES[state.mode].label} · ${DIFFICULTIES[state.difficulty].label} difficulty`, VIEW_W / 2, 186);

  // Stars.
  const stars = starRating(state);
  ctx.font = `44px ${FONT}`;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < stars ? '#ffd166' : 'rgba(255,255,255,0.18)';
    ctx.fillText('★', VIEW_W / 2 - 56 + i * 56, 224);
  }
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(starCaption(state, stars), VIEW_W / 2, 252);

  drawStatsPanel(ctx, state, 276);

  // Buttons: continue endless, play again, title.
  const bw = 220;
  const bh = 52;
  const gap = 16;
  const total = bw * 3 + gap * 2;
  let x = (VIEW_W - total) / 2;
  const y = 500;
  drawEndButton(ctx, state, x, y, bw, bh, 'CONTINUE: ENDLESS', 'endless', '#2a5220', '#8fe388');
  x += bw + gap;
  drawEndButton(ctx, state, x, y, bw, bh, '↺  PLAY AGAIN', 'restart', '#2a3552', '#7fa8ff');
  x += bw + gap;
  drawEndButton(ctx, state, x, y, bw, bh, 'TITLE SCREEN', 'title', '#241d45', PALETTE.cardEdge);
}

/** Defeat screen: stats and retry. */
export function drawDefeat(ctx, state) {
  drawEndBackdrop(ctx, state);
  state.uiRegions.length = 0;
  ctx.textAlign = 'center';
  ctx.font = `bold 58px ${FONT}`;
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(5,3,20,0.9)';
  ctx.strokeText('THE LIGHT FALLS', VIEW_W / 2, 130);
  ctx.fillStyle = '#ff6b6b';
  ctx.fillText('THE LIGHT FALLS', VIEW_W / 2, 130);
  ctx.font = `19px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`The Beacon went dark on wave ${state.wave}. The shadows own the road tonight.`, VIEW_W / 2, 164);
  ctx.font = `15px ${FONT}`;
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('Tip: frost lanterns slow the road, and obelisks make neighbours hit harder.', VIEW_W / 2, 192);

  drawStatsPanel(ctx, state, 232);

  const bw = 220;
  const bh = 52;
  const gap = 16;
  const total = bw * 2 + gap;
  let x = (VIEW_W - total) / 2;
  const y = 470;
  drawEndButton(ctx, state, x, y, bw, bh, '↺  TRY AGAIN', 'restart', '#2a5220', '#8fe388');
  x += bw + gap;
  drawEndButton(ctx, state, x, y, bw, bh, 'TITLE SCREEN', 'title', '#241d45', PALETTE.cardEdge);
}

/** Dim the board behind an end screen. */
function drawEndBackdrop(ctx, state) {
  drawBoard(ctx, state);
  ctx.fillStyle = 'rgba(5,3,20,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

/** Star rating: 1 for winning, +1 for a clean Beacon, +1 for a big score. */
export function starRating(state) {
  let stars = 1;
  if (state.leaks === 0) stars += 1;
  if (state.score >= 40000 * state.diff.scoreMult) stars += 1;
  return Math.min(3, stars);
}

function starCaption(state, stars) {
  if (stars >= 3) return 'Flawless dawnkeeping: no leaks, a towering score.';
  if (stars === 2) return state.leaks === 0 ? 'No leaks — a clean road.' : 'A towering score.';
  return 'The dawn came. Hold it cleaner next time for more stars.';
}

/** Stats panel shared by victory and defeat. */
function drawStatsPanel(ctx, state, y) {
  const w = 560;
  const h = 190;
  const x = (VIEW_W - w) / 2;
  ctx.fillStyle = 'rgba(13,10,32,0.95)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.cardEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const rows = [
    ['FINAL SCORE', formatInt(state.score)],
    ['Waves held', `${state.wave}${state.mode === 'campaign' ? ` / ${CAMPAIGN_WAVES}` : ''}`],
    ['Shadows slain', formatInt(state.kills)],
    ['Beacon leaks', String(state.leaks)],
    ['Best combo', `x${state.bestCombo}`],
    ['Bosses slain', String(state.bossesSlain)],
    ['Towers built', String(state.towersBuilt)],
    ['Time', formatTime(state.elapsed)],
  ];
  ctx.font = `15px ${FONT}`;
  const colW = w / 2;
  rows.forEach((row, i) => {
    const cx = x + (i % 2 === 0 ? 24 : colW + 24);
    const cy = y + 32 + Math.floor(i / 2) * 36;
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText(row[0], cx, cy);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(row[1], cx + colW - 48, cy);
    ctx.font = `15px ${FONT}`;
  });
  if (state.newBest) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText('★ NEW BEST SCORE! ★', VIEW_W / 2, y + h - 14);
  }
}

/** One end-screen button. */
function drawEndButton(ctx, state, x, y, w, h, label, action, bg, edge) {
  const hover = state.mouse.x >= x && state.mouse.x <= x + w && state.mouse.y >= y && state.mouse.y <= y + h;
  ctx.fillStyle = hover ? shade(bg, 1.35) : bg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 16px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  state.uiRegions.push({ x, y, w, h, action, title: label });
}

/** Brighten a hex color by a factor (for button hover). */
function shade(hex, factor) {
  const r = Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) * factor));
  const g = Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) * factor));
  const b = Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) * factor));
  return `rgb(${r},${g},${b})`;
}

/** Pause overlay: resume, restart, mute, title. */
export function drawPause(ctx, state) {
  drawBoard(ctx, state);
  ctx.fillStyle = 'rgba(5,3,20,0.7)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  state.uiRegions.length = 0;
  ctx.textAlign = 'center';
  ctx.font = `bold 48px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('❚❚  PAUSED', VIEW_W / 2, 220);
  ctx.font = `16px ${FONT}`;
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`Wave ${state.wave}  ·  Score ${formatInt(state.score)}  ·  Beacon ${state.beaconHp}/${state.beaconMax}`, VIEW_W / 2, 256);
  const bw = 240;
  const bh = 50;
  const gap = 12;
  let y = 300;
  const x = (VIEW_W - bw) / 2;
  drawEndButton(ctx, state, x, y, bw, bh, 'RESUME  (P)', 'resume', '#2a5220', '#8fe388');
  y += bh + gap;
  drawEndButton(ctx, state, x, y, bw, bh, state.muted ? 'UNMUTE  (M)' : 'MUTE  (M)', 'mute', '#241d45', PALETTE.cardEdge);
  y += bh + gap;
  drawEndButton(ctx, state, x, y, bw, bh, 'RESTART RUN  (R)', 'restart', '#2a3552', '#7fa8ff');
  y += bh + gap;
  drawEndButton(ctx, state, x, y, bw, bh, 'TITLE SCREEN', 'title', '#241d45', PALETTE.cardEdge);
}

/** Mutator draft: 3 cards, pick one to shape the rest of the run. */
export function drawDraft(ctx, state) {
  drawBoard(ctx, state);
  ctx.fillStyle = 'rgba(5,3,20,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  state.uiRegions.length = 0;
  ctx.textAlign = 'center';
  ctx.font = `bold 40px ${FONT}`;
  ctx.fillStyle = '#fff3c4';
  ctx.fillText(`WAVE ${state.wave} CLEARED`, VIEW_W / 2, 150);
  ctx.font = `18px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('Choose a boon. It lasts for the rest of the run.', VIEW_W / 2, 184);

  const cw = 260;
  const ch = 240;
  const gap = 24;
  const total = cw * 3 + gap * 2;
  let x = (VIEW_W - total) / 2;
  const y = 230;
  state.draftChoices.forEach((choice, i) => {
    const hover = state.mouse.x >= x && state.mouse.x <= x + cw && state.mouse.y >= y && state.mouse.y <= y + ch;
    ctx.fillStyle = hover ? '#2c2352' : 'rgba(28,22,56,0.96)';
    ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = hover ? choice.color : PALETTE.cardEdge;
    ctx.lineWidth = hover ? 3 : 2;
    ctx.strokeRect(x + 1, y + 1, cw - 2, ch - 2);
    ctx.fillStyle = choice.color;
    ctx.font = `52px ${FONT}`;
    ctx.fillText(choice.icon, x + cw / 2, y + 78);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 21px ${FONT}`;
    ctx.fillText(choice.name, x + cw / 2, y + 122);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = `15px ${FONT}`;
    wrapText(ctx, choice.desc, x + cw / 2, y + 152, cw - 36, 22);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`Press ${i + 1} or click`, x + cw / 2, y + ch - 18);
    state.uiRegions.push({ x, y, w: cw, h: ch, action: 'draft', arg: i, title: choice.name });
    x += cw + gap;
  });
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('Boons stack. A run is shaped by the drafts it takes.', VIEW_W / 2, 520);
}

/** Word-wrap centered text. */
function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, cx, yy);
}
