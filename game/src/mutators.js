// DAWNHOLD — mutator drafts: after every cleared wave (except the last
// campaign wave) the player picks 1 of 3 boons. Effects stack and shape
// the rest of the run.

import { floater } from './particles.js';

export const MUTATOR_POOL = [
  {
    id: 'ember-tide',
    name: 'Ember Tide',
    icon: '◆',
    color: '#ffb347',
    desc: '+45 embers right now.',
    apply(state) {
      state.embers += 45;
      state.embersEarned += 45;
    },
  },
  {
    id: 'sharpened',
    name: 'Sharpened Light',
    icon: '✦',
    color: '#ffd166',
    desc: '+10% tower damage, forever.',
    apply(state) {
      state.buffs.damage += 0.1;
    },
  },
  {
    id: 'swift-hands',
    name: 'Swift Hands',
    icon: '≫',
    color: '#5ee6ff',
    desc: '+8% tower fire rate, forever.',
    apply(state) {
      state.buffs.rate += 0.08;
    },
  },
  {
    id: 'long-reach',
    name: 'Long Reach',
    icon: '◎',
    color: '#9fd8ff',
    desc: '+8% tower range, forever.',
    apply(state) {
      state.buffs.range += 0.08;
    },
  },
  {
    id: 'beacon-mend',
    name: 'Beacon Mend',
    icon: '✚',
    color: '#8fe388',
    desc: 'Repair 5 Beacon HP.',
    apply(state) {
      state.beaconHp = Math.min(state.beaconMax, state.beaconHp + 5);
    },
  },
  {
    id: 'thick-walls',
    name: 'Thick Walls',
    icon: '▣',
    color: '#c9b8ff',
    desc: '+3 max Beacon HP, and heal 3.',
    apply(state) {
      state.beaconMax += 3;
      state.beaconHp = Math.min(state.beaconMax, state.beaconHp + 3);
    },
  },
  {
    id: 'nova-charge',
    name: 'Nova Charge',
    icon: '✺',
    color: '#fff3c4',
    desc: '+2 shards for Nova blasts.',
    apply(state) {
      state.shards += 2;
    },
  },
  {
    id: 'greed',
    name: 'Gilded Road',
    icon: '⬡',
    color: '#ffe9a8',
    desc: '+15% embers from kills, forever.',
    apply(state) {
      state.buffs.reward += 0.15;
    },
  },
  {
    id: 'frostbite',
    name: 'Deep Frost',
    icon: '❄',
    color: '#b8f6ff',
    desc: 'Slows are 15% stronger, forever.',
    apply(state) {
      state.buffs.slow += 0.15;
    },
  },
  {
    id: 'overcharge',
    name: 'Overcharge',
    icon: '⚡',
    color: '#c792ff',
    desc: '+20% damage, but towers cost +10% more.',
    apply(state) {
      state.buffs.damage += 0.2;
      state.buffs.cost = (state.buffs.cost || 0) + 0.1;
    },
  },
];

/** Roll 3 distinct mutators for the draft. Healing boons are skipped
 *  while the Beacon is already at full strength. */
export function rollDraft(state) {
  let pool = MUTATOR_POOL.slice();
  if (state.beaconHp >= state.beaconMax) {
    pool = pool.filter((m) => m.id !== 'beacon-mend' && m.id !== 'thick-walls');
  }
  state.rng.shuffle(pool);
  state.draftChoices = pool.slice(0, 3);
  state.draftShownForWave = state.wave;
  return state.draftChoices;
}

/** Apply a drafted mutator and return to play. Guarded: only one pick
 *  per draft, and only while the draft screen is up. */
export function applyMutator(state, mutator) {
  if (!mutator || state.phase !== 'draft') return;
  if (!state.draftChoices.includes(mutator)) return;
  mutator.apply(state);
  state.draftChoices = [];
  state.phase = 'playing';
  floater(state, 640, 300, mutator.name.toUpperCase(), mutator.color, 22);
  if (state.audio) state.audio.play('upgrade');
}
