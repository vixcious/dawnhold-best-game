// DAWNHOLD — the game state: one object holding the whole run, plus the
// factory that starts a fresh run and the helpers that reset it. Phases:
// 'title' | 'playing' | 'draft' | 'paused' | 'victory' | 'defeat'.

import { buildPath } from './path.js';
import { makeRng } from './util.js';
import { PATH_POINTS, PLOTS, DIFFICULTIES, MODES, CAMPAIGN_WAVES, STARTING_SHARDS } from './config.js';

export const PHASES = ['title', 'playing', 'draft', 'paused', 'victory', 'defeat'];

/** Create a fresh run. Options: mode, difficulty, seed. */
export function createGame(options = {}) {
  const mode = MODES[options.mode] ? options.mode : 'campaign';
  const difficulty = DIFFICULTIES[options.difficulty] ? options.difficulty : 'normal';
  const diff = DIFFICULTIES[difficulty];
  const seed = options.seed ?? 1;
  const state = {
    // Identity and setup.
    mode,
    difficulty,
    diff,
    seed,
    rng: makeRng(seed * 7919 + 13),
    path: buildPath(PATH_POINTS),
    plots: PLOTS.map((p, i) => ({ ...p, index: i, tower: null })),

    // Phase and clock.
    phase: 'title',
    phaseBeforePause: 'playing',
    time: 0,
    elapsed: 0,
    speed: 1,
    paused: false,

    // Run resources.
    wave: 0,
    embers: diff.embers,
    shards: STARTING_SHARDS,
    beaconHp: diff.beaconHp,
    beaconMax: diff.beaconHp,
    score: 0,
    combo: 0,
    bestCombo: 0,
    kills: 0,
    leaks: 0,
    embersEarned: 0,
    towersBuilt: 0,
    novaUsed: 0,
    bossesSlain: 0,
    newBest: false,

    // Battlefield.
    towers: [],
    enemies: [],
    projectiles: [],
    beams: [],
    particles: [],
    floaters: [],
    spawnQueue: [],
    spawnTimer: 0,
    waveActive: false,
    waveIsBoss: false,
    waveSpawnedBoss: false,
    boss: null,

    // Player choices.
    selectedBuild: null,
    selectedTower: null,
    hoverPlot: null,
    mouse: { x: -100, y: -100, down: false },
    novaCooldown: 0,
    draftChoices: [],
    draftShownForWave: 0,

    // Stacking boons from mutator drafts.
    buffs: {
      damage: 0,
      rate: 0,
      range: 0,
      slow: 0,
      reward: 0,
      cost: 0,
    },

    // Feel: shake, banners, audio.
    shake: 0,
    banner: null,
    bannerTime: 0,
    muted: false,
    audioReady: false,

    // UI regions rebuilt every drawn frame (for clicks).
    uiRegions: [],
    hoverAction: null,

    // Best score, loaded once at boot.
    best: loadBest(),

    // Screenshot staging: when set, the clock is frozen and the scene is
    // one of the deterministic shot states.
    shot: null,
    shotReady: false,
  };
  return state;
}

/** Reset the run in place, keeping mode/difficulty/seed and the best score. */
export function resetRun(state) {
  const fresh = createGame({
    mode: state.mode,
    difficulty: state.difficulty,
    seed: state.seed,
  });
  fresh.best = state.best;
  fresh.muted = state.muted;
  Object.assign(state, fresh);
  state.phase = 'playing';
}

/** Is the run in campaign mode and past the final wave? */
export function campaignWon(state) {
  return state.mode === 'campaign' && state.wave >= CAMPAIGN_WAVES && !state.waveActive;
}

/** Current cycle of the night for a wave number: dusk, night, or dawn. */
export function cycleOf(wave) {
  const n = (wave - 1) % 3;
  if (n === 0) return { id: 'dusk', label: 'Dusk', icon: '◐', night: false, dawn: false };
  if (n === 1) return { id: 'night', label: 'Night', icon: '●', night: true, dawn: false };
  return { id: 'dawn', label: 'Dawn', icon: '○', night: false, dawn: true };
}

/** Load the best score from localStorage, guarded for sandboxed pages. */
export function loadBest() {
  try {
    const raw = window.localStorage.getItem('dawnhold-best');
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.score === 'number') return parsed;
  } catch (err) {
    // Storage unavailable: play without a saved best.
  }
  return { score: 0, wave: 0 };
}

/** Save the best score if this run beat it. Returns true when saved. */
export function saveBest(state) {
  const better = state.score > state.best.score;
  if (!better) return false;
  state.best = { score: state.score, wave: state.wave };
  try {
    window.localStorage.setItem('dawnhold-best', JSON.stringify(state.best));
  } catch (err) {
    // Storage unavailable: the best lives only for this session.
  }
  return true;
}
