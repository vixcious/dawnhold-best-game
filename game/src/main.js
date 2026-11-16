// DAWNHOLD — boot and game loop: fixed-timestep simulation, input
// routing, phase transitions, and the deterministic screenshot path.

import { VIEW_W, VIEW_H, DIFFICULTIES, MODES } from './config.js';
import { createGame, resetRun, saveBest } from './state.js';
import { createAudio } from './audio.js';
import { attachInput, regionAt } from './input.js';
import { drawBoard } from './render.js';
import { drawHud, refreshPreview } from './hud.js';
import { drawTitle, drawVictory, drawDefeat, drawPause, drawDraft } from './screens.js';
import { updateTowers, placeTower, upgradeTower, sellTower, plotAt, towerAt, canPlace } from './towers.js';
import { updateProjectiles } from './projectiles.js';
import { updateEnemies } from './enemies.js';
import { updateParticles, updateBanner, setBanner } from './particles.js';
import { updateBoss } from './bosses.js';
import { startWave, updateSpawning } from './waves.js';
import { rollDraft, applyMutator } from './mutators.js';
import { novaBlast } from './combat.js';
import { towerDef } from './balance.js';
import { stageShot, shotParams } from './shots.js';

const STEP = 1 / 60;

function main() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const audio = createAudio();
  const { shot, seed } = shotParams();

  let state;
  if (shot) {
    state = stageShot(shot, seed);
    state.audio = audio;
    state.muted = false;
    render(ctx, state);
    window.__shotReady = true;
    return;
  }

  state = createGame({ mode: 'campaign', difficulty: 'normal', seed: 1 });
  state.audio = audio;
  seedTitleBoard(state);
  // Debug/test hook: the live state, for scripted play-tests.
  window.__dawnhold = state;

  let last = performance.now();
  let acc = 0;
  let previewTimer = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    if (state.phase === 'playing') {
      acc += dt * state.speed;
      let steps = 0;
      while (acc >= STEP && steps < 12) {
        step(state, STEP);
        acc -= STEP;
        steps++;
      }
      if (steps >= 12) acc = 0;
      previewTimer -= dt;
      if (previewTimer <= 0) {
        previewTimer = 0.4;
        refreshPreview(state);
      }
    } else if (state.phase === 'title') {
      state.time += dt;
      updateParticles(state, dt);
    }
    render(ctx, state);
  }

  attachInput(canvas, {
    onMove(pos) {
      state.mouse.x = pos.x;
      state.mouse.y = pos.y;
      state.hoverPlot = state.phase === 'playing' ? plotAt(state, pos.x, pos.y) : null;
    },
    onClick(pos, button) {
      audio.ensure();
      handleClick(state, pos, button);
    },
    onKey(key) {
      handleKey(state, key);
    },
  });

  // First gesture anywhere unlocks audio.
  window.addEventListener('pointerdown', () => audio.ensure(), { once: false });

  requestAnimationFrame(frame);
}

/** One fixed simulation step. */
function step(state, dt) {
  state.time += dt;
  state.elapsed += dt;
  if (state.novaCooldown > 0) state.novaCooldown -= dt;
  updateSpawning(state, dt);
  updateTowers(state, dt);
  updateProjectiles(state, dt);
  updateEnemies(state, dt);
  updateBoss(state, dt);
  updateParticles(state, dt);
  updateBanner(state, dt);
  if (state.phase === 'draft' && state.draftChoices.length === 0) {
    rollDraft(state);
  }
}

/** Draw the current phase. */
function render(ctx, state) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (state.phase === 'title') {
    drawTitle(ctx, state);
  } else if (state.phase === 'victory') {
    drawVictory(ctx, state);
  } else if (state.phase === 'defeat') {
    drawDefeat(ctx, state);
  } else if (state.phase === 'paused') {
    drawPause(ctx, state);
  } else if (state.phase === 'draft') {
    drawDraft(ctx, state);
  } else {
    drawBoard(ctx, state);
    drawHud(ctx, state);
  }
}

/** A quiet board behind the title: towers, glow, no enemies. */
function seedTitleBoard(state) {
  const placements = [['prism', 1], ['mortar', 2], ['frost', 7], ['coil', 8], ['obelisk', 13]];
  for (const [id, plotIndex] of placements) {
    state.embers = 9999;
    placeTower(state, id, state.plots[plotIndex]);
  }
  state.embers = state.diff.embers;
  state.towersBuilt = 0;
}

/** Route a click: UI regions first, then board interactions. */
function handleClick(state, pos, button) {
  const region = regionAt(state.uiRegions, pos.x, pos.y);
  if (region && button === 'left') {
    doAction(state, region.action, region.arg);
    return;
  }
  if (button === 'right') {
    state.selectedBuild = null;
    state.selectedTower = null;
    return;
  }
  if (state.phase !== 'playing') return;
  // Board click: place a chosen tower, or select an existing one.
  if (state.selectedBuild) {
    const plot = plotAt(state, pos.x, pos.y);
    const def = towerDef(state.selectedBuild);
    if (plot && def && canPlace(state, def, plot)) {
      placeTower(state, state.selectedBuild, plot);
      state.selectedBuild = null;
    } else if (plot && plot.tower) {
      state.selectedTower = plot.tower;
      state.selectedBuild = null;
    }
    return;
  }
  const tower = towerAt(state, pos.x, pos.y);
  state.selectedTower = tower;
}

/** Perform a UI action from a clicked region. */
function doAction(state, action, arg) {
  const audio = state.audio;
  switch (action) {
    case 'start-game': {
      const mode = state.mode;
      const difficulty = state.difficulty;
      const seed = (Date.now() % 100000) + 1;
      const fresh = createGame({ mode, difficulty, seed });
      fresh.audio = audio;
      fresh.muted = state.muted;
      fresh.best = state.best;
      Object.assign(state, fresh);
      state.phase = 'playing';
      refreshPreview(state);
      setBanner(state, 'NIGHT 1 APPROACHES', 'Build towers, then start the wave.', 2.4);
      audio.ensure();
      audio.play('click');
      break;
    }
    case 'mode':
      if (MODES[arg]) {
        state.mode = arg;
        audio.play('click');
      }
      break;
    case 'difficulty':
      if (DIFFICULTIES[arg]) {
        state.difficulty = arg;
        state.diff = DIFFICULTIES[arg];
        audio.play('click');
      }
      break;
    case 'build': {
      const def = towerDef(arg);
      if (!def) break;
      state.selectedBuild = state.selectedBuild === arg ? null : arg;
      state.selectedTower = null;
      audio.play('click');
      break;
    }
    case 'upgrade':
      if (state.selectedTower) upgradeTower(state, state.selectedTower);
      break;
    case 'sell':
      if (state.selectedTower) sellTower(state, state.selectedTower);
      break;
    case 'start-wave':
      startWave(state);
      break;
    case 'nova':
      novaBlast(state);
      break;
    case 'speed':
      state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 3 : 1;
      audio.play('click');
      break;
    case 'pause':
      pauseGame(state);
      break;
    case 'resume':
      resumeGame(state);
      break;
    case 'mute':
      state.muted = !state.muted;
      audio.setMuted(state.muted);
      break;
    case 'restart':
      restartRun(state);
      break;
    case 'title':
      toTitle(state);
      break;
    case 'endless': {
      state.mode = 'endless';
      state.phase = 'playing';
      state.waveActive = false;
      setBanner(state, 'THE NIGHT GOES ON', 'Endless mode: no final dawn.', 2.4);
      audio.play('click');
      break;
    }
    case 'draft': {
      const choice = state.draftChoices[arg];
      if (choice) applyMutator(state, choice);
      break;
    }
    default:
      break;
  }
}

/** Keyboard shortcuts. */
function handleKey(state, key) {
  if (key === '__blur') {
    if (state.phase === 'playing') pauseGame(state);
    return;
  }
  const k = key.toLowerCase();
  if (state.phase === 'title') {
    if (key === 'Enter') doAction(state, 'start-game');
    return;
  }
  if (state.phase === 'draft') {
    if (key === '1' || key === '2' || key === '3') {
      const choice = state.draftChoices[parseInt(key, 10) - 1];
      if (choice) applyMutator(state, choice);
    }
    return;
  }
  if (state.phase === 'paused') {
    if (k === 'p' || key === 'Escape') resumeGame(state);
    if (k === 'm') doAction(state, 'mute');
    if (k === 'r') restartRun(state);
    return;
  }
  if (state.phase === 'victory' || state.phase === 'defeat') {
    if (key === 'Enter' || k === 'r') restartRun(state);
    return;
  }
  if (state.phase !== 'playing') return;
  if (key >= '1' && key <= '6') {
    const defs = ['prism', 'mortar', 'frost', 'coil', 'sniper', 'obelisk'];
    doAction(state, 'build', defs[parseInt(key, 10) - 1]);
    return;
  }
  switch (k) {
    case ' ':
      startWave(state);
      break;
    case 'escape':
      if (state.selectedBuild || state.selectedTower) {
        state.selectedBuild = null;
        state.selectedTower = null;
      } else {
        pauseGame(state);
      }
      break;
    case 'p':
      pauseGame(state);
      break;
    case 'm':
      doAction(state, 'mute');
      break;
    case 'f':
      doAction(state, 'speed');
      break;
    case 'n':
      novaBlast(state);
      break;
    case 'r':
      restartRun(state);
      break;
    case 'u':
      if (state.selectedTower) upgradeTower(state, state.selectedTower);
      break;
    case 'x':
      if (state.selectedTower) sellTower(state, state.selectedTower);
      break;
    default:
      break;
  }
}

function pauseGame(state) {
  if (state.phase !== 'playing') return;
  state.phaseBeforePause = 'playing';
  state.phase = 'paused';
  if (state.audio) state.audio.play('click');
}

function resumeGame(state) {
  if (state.phase !== 'paused') return;
  state.phase = state.phaseBeforePause;
  if (state.audio) state.audio.play('click');
}

function restartRun(state) {
  const audio = state.audio;
  const muted = state.muted;
  const best = state.best;
  saveBest(state);
  resetRun(state);
  state.audio = audio;
  state.muted = muted;
  state.best = best;
  refreshPreview(state);
  setBanner(state, 'A NEW NIGHT', 'Build towers, then start the wave.', 2.2);
}

function toTitle(state) {
  const audio = state.audio;
  const muted = state.muted;
  const best = state.best;
  saveBest(state);
  const fresh = createGame({ mode: state.mode, difficulty: state.difficulty, seed: 1 });
  fresh.audio = audio;
  fresh.muted = muted;
  fresh.best = best;
  Object.assign(state, fresh);
  seedTitleBoard(state);
  state.phase = 'title';
}

main();
