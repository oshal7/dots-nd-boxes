// handoff.js — the exact pixel positions where carried objects cross between scenes.
// Both sides of a handoff import from here, so the object lands on the same pixels by construction.
// h = 16:9 (1920×1080), v = 9:16 (1080×1920). Board positions are dot (0,0) + gap, for the 5×5-dot hero board.

export const HANDOFF = {
  h: {
    W: 1920, H: 1080,
    B: { gap: 150, x: 1000, y: 240 },   // end of s01 (paper pull-back) = start of s02
    C: { gap: 150, x: 660, y: 240 },    // end of s05 (pull back to whole board) = first frame of s06 (3D)
    D: { x: 960, y: 700 },              // s07 circle reveal centre → s08
    L: { x1: 660, x2: 1260, y: 540, w: 75, markScale: 15 }, // end s10 line = mark's green line at s11 start
  },
  v: {
    W: 1080, H: 1920,
    B: { gap: 210, x: 120, y: 540 },
    C: { gap: 210, x: 120, y: 540 },
    D: { x: 540, y: 1240 },
    L: { x1: 290, x2: 790, y: 960, w: 62.5, markScale: 12.5 },
  },
};
export const hand = (V) => (V ? HANDOFF.v : HANDOFF.h);

// s05 → s06 3D handoff: at film t = 10.0 the board (at C) is tilted TILT_DEG about the screen centre, top edge
// receding, seen through CSS perspective PERSPECTIVE px with perspective-origin at the screen centre.
// three.js equivalent: PerspectiveCamera(fov = 2·atan((H/2)/PERSPECTIVE) in degrees, W/H), placed PERSPECTIVE
// world units (= px) in front of the board centre, board rotated by the same angle about the X axis.
export const TILT_DEG = 22;
export const PERSPECTIVE = 1800;

// Scene timing (film seconds). Every boundary is on the 0.5 s beat grid (120 BPM).
// vis = window in which the scene's layer is visible (may overlap neighbours for transitions).
export const T = {
  s01: [0.0, 2.0], s02: [2.0, 4.0], s03: [4.0, 5.5], s04: [5.5, 7.0], s05: [7.0, 10.0], s06: [10.0, 14.0],
  s07: [14.0, 15.5], s08: [15.5, 18.5], s09: [18.5, 21.0], s10: [21.0, 24.5], s11: [24.5, 26.5], s12: [26.5, 30.0],
};
export const FILM_DURATION = 30.0;
