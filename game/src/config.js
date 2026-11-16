// DAWNHOLD — fixed layout, palette, path, build plots and difficulty tables.
// Nothing here changes at run time; balance numbers for towers and enemies
// live in balance.js.

export const VIEW_W = 1280;
export const VIEW_H = 720;

// Vertical layout: HUD bar on top, the battlefield in the middle, the
// build bar along the bottom.
export const HUD_H = 54;
export const BOARD_TOP = HUD_H;
export const BOARD_BOTTOM = 618;
export const BAR_Y = BOARD_BOTTOM;
export const BAR_H = VIEW_H - BAR_Y;

// The shadow road: a serpentine from the left edge to the Beacon on the
// right. Waypoints are in canvas coordinates.
export const PATH_POINTS = [
  [-40, 170],
  [1080, 170],
  [1080, 360],
  [200, 360],
  [200, 540],
  [1160, 540],
];

// The Beacon stands just past the end of the road.
export const BEACON_POS = { x: 1228, y: 540 };

// Build plots: circles of open ground where towers may stand. Every plot
// is clear of the road corridor and of the Beacon.
export const PLOTS = [
  { x: 120, y: 105 }, { x: 320, y: 105 }, { x: 520, y: 105 },
  { x: 720, y: 105 }, { x: 920, y: 105 }, { x: 1180, y: 105 },
  { x: 120, y: 255 }, { x: 420, y: 255 }, { x: 620, y: 255 },
  { x: 820, y: 255 }, { x: 1180, y: 255 },
  { x: 120, y: 450 }, { x: 420, y: 450 }, { x: 620, y: 450 },
  { x: 820, y: 450 }, { x: 1020, y: 450 },
  { x: 320, y: 588 }, { x: 520, y: 588 }, { x: 720, y: 588 },
  { x: 920, y: 588 },
];
export const PLOT_RADIUS = 26;

// One coherent palette: deep indigo night, warm amber light, cold accents.
export const PALETTE = {
  skyTop: '#0b0e26',
  skyBottom: '#1a1440',
  ground: '#141031',
  groundAlt: '#191438',
  road: '#3a2f5e',
  roadEdge: '#55467f',
  roadGlow: '#8a76c9',
  plot: '#221b47',
  plotEdge: '#4d4185',
  hudBg: '#0d0a20',
  hudEdge: '#3d3168',
  barBg: '#100c26',
  cardBg: '#1c1638',
  cardEdge: '#4d4185',
  cardSel: '#ffd166',
  text: '#f4ead5',
  textDim: '#b8abd9',
  ember: '#ffb347',
  emberHot: '#ffd166',
  shard: '#7fe7ff',
  hp: '#ff6b6b',
  hpBg: '#3a1522',
  score: '#ffe9a8',
  combo: '#ff9d5c',
  good: '#8fe388',
  bad: '#ff6b6b',
  beacon: '#ffd166',
  night: '#05031a',
};

// Difficulty: starting resources, Beacon strength and enemy scaling.
export const DIFFICULTIES = {
  story: {
    id: 'story',
    label: 'Story',
    desc: 'A gentle night. For learning the ropes.',
    embers: 230,
    beaconHp: 30,
    enemyHp: 0.8,
    enemySpeed: 0.9,
    reward: 1.15,
    scoreMult: 0.8,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    desc: 'The night as it was meant to be fought.',
    embers: 175,
    beaconHp: 20,
    enemyHp: 1.0,
    enemySpeed: 1.0,
    reward: 1.0,
    scoreMult: 1.0,
  },
  nightmare: {
    id: 'nightmare',
    label: 'Nightmare',
    desc: 'Fast shadows, thin walls. For dawnkeepers.',
    embers: 135,
    beaconHp: 12,
    enemyHp: 1.25,
    enemySpeed: 1.12,
    reward: 0.9,
    scoreMult: 1.5,
  },
};

export const MODES = {
  campaign: {
    id: 'campaign',
    label: 'Campaign',
    desc: 'Survive all 30 nights, then the dawn is yours.',
  },
  endless: {
    id: 'endless',
    label: 'Endless',
    desc: 'No final dawn. How many nights can you hold?',
  },
};

export const CAMPAIGN_WAVES = 30;
export const BOSS_EVERY = 10;

// Road stroke widths: outer glow, stone band, inner band.
export const ROAD_WIDTHS = { glow: 46, stone: 38, inner: 30 };

// Run caps and starting resources shared by the state factory.
export const MAX_ENEMIES_ON_BOARD = 120;
export const STARTING_SHARDS = 1;
