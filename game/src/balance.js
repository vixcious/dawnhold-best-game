// DAWNHOLD — balance tables: tower and enemy definitions, upgrade math,
// wave scaling, and the economy. Tune here; the simulation reads only
// these tables, so a balance pass never touches game logic.

export const TOWERS = [
  {
    id: 'prism',
    name: 'Prism Spire',
    key: '1',
    cost: 50,
    damage: 12,
    rate: 2.0,
    range: 135,
    color: '#5ee6ff',
    glow: '#b8f6ff',
    desc: 'Cheap beam tower. Fast, precise, honest.',
    kind: 'beam',
  },
  {
    id: 'mortar',
    name: 'Ember Mortar',
    key: '2',
    cost: 90,
    damage: 26,
    rate: 0.7,
    range: 195,
    color: '#ff9d5c',
    glow: '#ffd166',
    desc: 'Lobs burning shells. Splash damage.',
    kind: 'shell',
    splash: 58,
  },
  {
    id: 'frost',
    name: 'Frost Lantern',
    key: '3',
    cost: 70,
    damage: 4,
    rate: 1.0,
    range: 115,
    color: '#9fd8ff',
    glow: '#e6f7ff',
    desc: 'Chilling aura. Slows shadows in range.',
    kind: 'aura',
    slow: 0.35,
  },
  {
    id: 'coil',
    name: 'Storm Coil',
    key: '4',
    cost: 130,
    damage: 18,
    rate: 1.1,
    range: 155,
    color: '#c792ff',
    glow: '#f0dcff',
    desc: 'Chain lightning arcs between shadows.',
    kind: 'chain',
    chains: 3,
    chainRange: 110,
  },
  {
    id: 'sniper',
    name: 'Sunlens Sniper',
    key: '5',
    cost: 160,
    damage: 95,
    rate: 0.45,
    range: 245,
    color: '#ffd166',
    glow: '#fff3c4',
    desc: 'One huge sunbeam. Slow, very long range.',
    kind: 'beam',
  },
  {
    id: 'obelisk',
    name: 'Dawn Obelisk',
    key: '6',
    cost: 110,
    damage: 0,
    rate: 0,
    range: 135,
    color: '#fff3c4',
    glow: '#ffffff',
    desc: 'Buffs nearby towers: +25% damage, +15% speed.',
    kind: 'buff',
    buffDamage: 0.25,
    buffRate: 0.15,
  },
];

export const MAX_TOWER_LEVEL = 3;

// Upgrade cost as a share of the base cost, per level gained.
export const UPGRADE_COST_SHARE = { 2: 0.6, 3: 1.0 };
// Stat growth per level: damage x1.6, fire rate x1.15, range +10.
export const UPGRADE_DAMAGE = 1.6;
export const UPGRADE_RATE = 1.15;
export const UPGRADE_RANGE = 10;
export const SELL_REFUND = 0.7;

/** Cost to upgrade a tower from its current level to the next. */
export function upgradeCost(def, level) {
  return Math.round(def.cost * (UPGRADE_COST_SHARE[level + 1] ?? 1));
}

/** Effective stats of a tower at a level, before obelisk buffs. */
export function towerStats(def, level) {
  const steps = level - 1;
  return {
    damage: Math.round(def.damage * Math.pow(UPGRADE_DAMAGE, steps)),
    rate: def.rate * Math.pow(UPGRADE_RATE, steps),
    range: def.range + UPGRADE_RANGE * steps,
  };
}

// Tuning notes (from the first play-throughs): Skitters at 64 felt
// untouchable on wave 1 with one tower, so 62; Husk HP 150 keeps the
// wave-2 tank meaningful without stalling. Frost slow 35% + Deep Frost
// caps at 60% in combat, never a full stop.
export const ENEMIES = [
  {
    id: 'skitter',
    name: 'Skitter',
    hp: 30,
    speed: 62,
    reward: 6,
    leak: 1,
    radius: 11,
    color: '#6b5aa8',
    eye: '#ff5c7a',
    points: 1,
    desc: 'Fast and fragile.',
  },
  {
    id: 'husk',
    name: 'Husk',
    hp: 150,
    speed: 30,
    reward: 11,
    leak: 2,
    radius: 19,
    color: '#4a3f78',
    eye: '#ffb347',
    points: 4,
    desc: 'Slow armored bulk.',
  },
  {
    id: 'shielded',
    name: 'Shielded',
    hp: 70,
    shield: 55,
    speed: 38,
    reward: 13,
    leak: 1,
    radius: 14,
    color: '#3f6d8e',
    eye: '#7fe7ff',
    points: 3,
    desc: 'A ward soaks damage first.',
  },
  {
    id: 'splitter',
    name: 'Splitter',
    hp: 62,
    speed: 42,
    reward: 9,
    leak: 1,
    radius: 15,
    color: '#7a4a8e',
    eye: '#e6a8ff',
    points: 3,
    desc: 'Bursts into two Skitters.',
    splitsInto: 'skitter',
    splitCount: 2,
  },
  {
    id: 'wraith',
    name: 'Wraith',
    hp: 46,
    speed: 80,
    reward: 10,
    leak: 1,
    radius: 12,
    color: '#8e9fd6',
    eye: '#ffffff',
    points: 2,
    desc: 'Swift, and immune to slowing.',
    immuneSlow: true,
  },
];

export function enemyDef(id) {
  return ENEMIES.find((e) => e.id === id);
}

export function towerDef(id) {
  return TOWERS.find((t) => t.id === id);
}

/** Build cost of a tower with the run's cost modifiers applied. */
export function towerCostWithBuffs(state, def) {
  return Math.round(def.cost * (1 + ((state.buffs && state.buffs.cost) || 0)));
}

// Enemy HP grows 16% per wave; speed creeps 1.5% per wave, capped.
export const HP_GROWTH = 0.16;
export const SPEED_GROWTH = 0.015;
export const SPEED_GROWTH_CAP = 1.45;
// Past wave 30 (endless), HP grows a further 12% per wave.
export const ENDLESS_HP_GROWTH = 0.12;

/** Max HP of an enemy of this kind on this wave, for this difficulty. */
export function enemyHpFor(def, wave, diff) {
  let hp = def.hp * (1 + HP_GROWTH * (wave - 1)) * diff.enemyHp;
  if (wave > 30) hp *= Math.pow(1 + ENDLESS_HP_GROWTH, wave - 30);
  return Math.round(hp);
}

/** Speed of an enemy of this kind on this wave, for this difficulty. */
export function enemySpeedFor(def, wave, diff, nightBonus) {
  const growth = Math.min(1 + SPEED_GROWTH * (wave - 1), SPEED_GROWTH_CAP);
  let speed = def.speed * growth * diff.enemySpeed;
  if (nightBonus) speed *= 1.12;
  return speed;
}

/** Spawn budget in points for a wave: more, and tougher, as nights pass. */
export function waveBudget(wave) {
  return 6 + Math.round(wave * 3.2);
}

/** Spawn interval in seconds: waves get denser over time. */
export function spawnInterval(wave) {
  return Math.max(0.28, 0.85 - wave * 0.018);
}

/** Ember bonus for clearing a wave. */
export function waveClearBonus(wave) {
  return 20 + wave * 2;
}

/** Combo: kills without a leak raise the multiplier; a leak resets it. */
export const COMBO_CAP = 50;
export const COMBO_STEP = 0.05;

/** Score for a kill at the current combo. */
export function killScore(reward, combo, scoreMult) {
  return Math.round(reward * 10 * (1 + combo * COMBO_STEP) * scoreMult);
}

/** Nova blast: shard cost, cooldown, damage. */
export const NOVA_COST = 1;
export const NOVA_COOLDOWN = 12;
export const NOVA_DAMAGE = 150;
export const NOVA_RADIUS = 9000; // whole board: every shadow on screen

/** Shards earned: one every 5 waves, one per boss, plus mutators. */
export const SHARD_WAVE_EVERY = 5;
