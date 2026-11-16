// DAWNHOLD — small shared helpers: seeded randomness, math, formatting.
// Every random choice in the game flows through a seeded generator so the
// screenshot states and wave compositions are reproducible.

export const TAU = Math.PI * 2;

/** Clamp a number into [lo, hi]. */
export function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

/** Linear interpolation between a and b. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Euclidean distance between two points. */
export function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Squared distance (cheaper when only comparing). */
export function dist2(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

/** Mulberry32: a tiny fast seeded PRNG with a long period. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A small random toolkit bound to one seeded stream.
 * next() in [0,1); range(lo,hi); int(lo,hi) inclusive; pick(array);
 * chance(p); shuffle(array) in place, Fisher-Yates.
 */
export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    range(lo, hi) {
      return lo + next() * (hi - lo);
    },
    int(lo, hi) {
      return lo + Math.floor(next() * (hi - lo + 1));
    },
    pick(array) {
      return array[Math.floor(next() * array.length)];
    },
    chance(p) {
      return next() < p;
    },
    shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
      }
      return array;
    },
  };
}

/** Format an integer with a thousands separator. Handles negatives. */
export function formatInt(n) {
  const neg = n < 0;
  const digits = String(Math.floor(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return neg ? `-${digits}` : digits;
}

/** Format seconds as m:ss. */
export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/** Ease-out cubic, for UI motion and banner slides. */
export function easeOutCubic(t) {
  const u = clamp(t, 0, 1);
  return 1 - Math.pow(1 - u, 3);
}

/** Smooth pulse in [0,1] from a time value and a period in seconds.
 *  A non-positive period returns the midpoint instead of dividing. */
export function pulse(time, period) {
  if (!period || period <= 0) return 0.5;
  return 0.5 + 0.5 * Math.sin((TAU * time) / period);
}

/** Shorten text to fit maxWidth in the context's current font, cutting
 *  at a word boundary and adding an ellipsis. Never cuts mid-word. */
export function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const words = text.split(' ');
  let out = '';
  for (const word of words) {
    const next = out ? `${out} ${word}` : word;
    if (ctx.measureText(`${next}…`).width > maxWidth) break;
    out = next;
  }
  if (!out) out = words[0].slice(0, 8);
  return `${out}…`;
}
