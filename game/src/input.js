// DAWNHOLD — input: mouse position, clicks, right-clicks and keyboard,
// translated into logical canvas coordinates. The game loop owns what a
// click means; this module only delivers clean events.

import { VIEW_W, VIEW_H } from './config.js';

/** Convert a pointer event to logical canvas coordinates. */
export function eventPos(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = VIEW_W / rect.width;
  const scaleY = VIEW_H / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

/**
 * Attach listeners. Handlers: onMove(pos), onClick(pos, button),
 * onKey(key). Returns a detach function.
 */
export function attachInput(canvas, handlers) {
  function onMouseMove(event) {
    handlers.onMove(eventPos(canvas, event));
  }
  function onMouseDown(event) {
    const pos = eventPos(canvas, event);
    if (event.button === 2) {
      handlers.onClick(pos, 'right');
      return;
    }
    handlers.onClick(pos, 'left');
  }
  function onContextMenu(event) {
    event.preventDefault();
  }
  function onKeyDown(event) {
    if (event.repeat) return; // held keys must not re-fire actions
    const key = event.key;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      event.preventDefault();
    }
    handlers.onKey(key);
  }
  function onBlur() {
    handlers.onKey('__blur');
  }
  function onTouchStart(event) {
    // Touch taps act as left clicks; the page never scrolls mid-game.
    event.preventDefault();
    const touch = event.changedTouches[0];
    if (touch) handlers.onClick(eventPos(canvas, touch), 'left');
  }
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('contextmenu', onContextMenu);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('blur', onBlur);
  return function detach() {
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('contextmenu', onContextMenu);
    canvas.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('blur', onBlur);
  };
}

/** Is a point inside a rectangle {x, y, w, h}? */
export function inRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

/** Find the topmost UI region under a point (last drawn wins). */
export function regionAt(regions, x, y) {
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (inRect(x, y, r)) return r;
  }
  return null;
}
