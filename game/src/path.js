// DAWNHOLD — the path the shadows walk: geometry, length, and lookup by
// distance travelled. The road is a polyline; enemies store how far along
// it they have walked, which makes speed, slow and targeting simple.

import { dist } from './util.js';

/** Build a path object from waypoints: segments, cumulative lengths, total.
 *  Degenerate input (fewer than 2 points) yields a zero-length path
 *  rather than throwing, so a bad table fails visibly, not fatally. */
export function buildPath(points) {
  const pts = points && points.length >= 2 ? points : [[0, 0], [1, 0]];
  const segments = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const len = dist(x1, y1, x2, y2);
    segments.push({ x1, y1, x2, y2, len, start: total });
    total += len;
  }
  return { points: pts, segments, total };
}

/** Position on the path at a given distance from the start. */
export function pointAt(path, distance) {
  const d = Math.max(0, Math.min(distance, path.total));
  for (const seg of path.segments) {
    if (d <= seg.start + seg.len || seg === path.segments[path.segments.length - 1]) {
      const t = seg.len === 0 ? 0 : (d - seg.start) / seg.len;
      return { x: seg.x1 + (seg.x2 - seg.x1) * t, y: seg.y1 + (seg.y2 - seg.y1) * t };
    }
  }
  const last = path.points[path.points.length - 1];
  return { x: last[0], y: last[1] };
}

/** Facing angle (radians) of the path at a given distance. */
export function angleAt(path, distance) {
  const d = Math.max(0, Math.min(distance, path.total));
  for (const seg of path.segments) {
    if (d <= seg.start + seg.len || seg === path.segments[path.segments.length - 1]) {
      return Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
    }
  }
  return 0;
}

/** Evenly spaced points along the path, every `step` pixels, for
 *  decorations and previews that want the road's shape. */
export function samplePath(path, step) {
  const out = [];
  for (let d = 0; d <= path.total; d += step) {
    out.push(pointAt(path, d));
  }
  return out;
}

/** Distance from a point to the nearest point on the path (for plots). */
export function distanceToPath(path, x, y) {
  let best = Infinity;
  for (const seg of path.segments) {
    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((x - seg.x1) * dx + (y - seg.y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = seg.x1 + dx * t;
    const py = seg.y1 + dy * t;
    best = Math.min(best, dist(x, y, px, py));
  }
  return best;
}
