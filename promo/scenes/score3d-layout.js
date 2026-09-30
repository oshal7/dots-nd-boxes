// score3d-layout.js — per-aspect layout, camera keys and a time spline for score3d.
import { C, FILL } from '../shared/lib.js';
import { TILT_DEG, PERSPECTIVE } from '../shared/handoff.js';

/** Catmull-Rom (non-uniform time) through keys [[t, v], ...]; start slope m0 (units/s), flat at the end. Pure function of t. */
export function spline(t, ks, slope0 = 0) {
  const n = ks.length;
  if (t <= ks[0][0]) return ks[0][1];
  if (t >= ks[n - 1][0]) return ks[n - 1][1];
  let i = 1; while (ks[i][0] < t) i++;
  const [t0, v0] = ks[i - 1], [t1, v1] = ks[i];
  const tan = (j) => j === 0 ? slope0 : (j >= n - 1) ? 0 : (ks[j + 1][1] - ks[j - 1][1]) / (ks[j + 1][0] - ks[j - 1][0]);
  const h = t1 - t0, u = (t - t0) / h, m0 = tan(i - 1) * h, m1 = tan(i) * h;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m1;
}

// camera keys: [time, value]; the final keys continue gently past the dive start so the spline never stops.
const keys = (arr) => arr.map((v, i) => [TK[i], v]);
const FOV0 = (half) => 2 * Math.atan(half / PERSPECTIVE) * 180 / Math.PI; // handoff FOV
const EL0 = 90 - TILT_DEG; // camera elevation that reproduces the CSS tilt at the cut
const TK = [10.0, 10.8, 11.6, 12.3, 13.0, 13.5, 14.0];

export function cfg(V, k) {
  const G = 150 * k;
  const EL_V0 = -27.4; // °/s: the board module's CSS tilt is still moving ~27.4°/s at the 10.0 cut
  const cube = 0.7 * G;
  const base = {
    margin: 0.42 * G, slabT: 16 * k, baseH: 30 * k, baseOut: 22 * k, baseColor: C.ink,
    elV0: EL_V0, cube, cubeR: 0.17 * cube, cubeColor: { p1: FILL.p1, p2: FILL.p2 },  // brand-true: a sunlit top face reads exactly these (see score3d.js)
    arc: 0.42 * cube + 20 * k, chipLift: 0.22 * cube,
    firstLaunch: 10.28, gap0: 0.19, gap1: 0.09,
    // key: big soft sun from upper-left-front (shadows fall right/back); warm rim behind-right; soft sky fill
    light: { hemi: 0.9, key: 2.4, rim: 1.4, env: 0.3, keyPos: [-2600 * k, 3400 * k, 1500 * k], rimPos: [1500 * k, 1100 * k, -2600 * k] },
    dotR: 26, colSign: { p1: 1, p2: -1 },
  };
  const S = 4 * G + 2 * base.margin;
  if (!V) {
    const tx = S / 2 + base.baseOut + 0.55 * cube + cube;
    return { ...base, ui: 1.3, chipUi: 1.45, chipName: 48, chipScore: 58,
      tower: { p2: { x: -tx, z: 0.1 * G }, p1: { x: tx, z: 0.1 * G } },
      cam: {
        el: keys([EL0, 48, 46, 43.5, 40, 38, 37]),
        az: keys([0, 7, 13, 18, 22, 25, 26]),
        fov: keys([0, 0, 0, 0, 0, 0, 0].map(() => FOV0(540))),
        dist: keys([PERSPECTIVE, ...[1420, 1450, 1520, 1600, 1600, 1580].map((v) => v * k)]),
        tx: keys([0, 70, 20, 30, 115, 145, 155].map((v) => v * k)),
        ty: keys([0, 20, 70, 120, 150, 160, 165].map((v) => v * k)),
        tz: keys([0, 10, 20, 30, 45, 50, 52].map((v) => v * k)),
      },
      winSize: 120, winFrom: -160,
      // to the left of Mia's chip, vertically centred on it
      winPos: (W, H, sz, top, chip) => [top.x - chip.w / 2 - 100 - sz.w, top.y - chip.h / 2 - 10 * 1.3 - sz.h / 2],
      s07Size: 220, s07Pos: (W, H, a, b) => [W / 2 - a.width / 2 - 170, 150, W / 2 - b.width / 2 + 170, 360],
    };
  }
  const vc = 0.8 * G, tz = S / 2 + base.baseOut + 0.7 * vc + vc / 2;
  return { ...base, cube: vc, cubeR: 0.17 * vc, arc: 0.42 * vc + 20 * k, chipLift: 0.22 * vc, ui: 1.25, chipUi: 1.55, chipName: 52, chipScore: 62,
    tower: { p2: { x: -1.05 * G, z: tz }, p1: { x: 1.05 * G, z: tz } },
    cam: {
      el: keys([EL0, 49, 45.5, 41.5, 37.5, 36, 35.5]),
      az: keys([0, 10, 22, 32, 36, 38, 38]),
      fov: keys([FOV0(960), 47, 43, 42, 42, 42, 42]),
      dist: keys([PERSPECTIVE, 2150, 2120, 2220, 2300, 2280, 2260]),
      tx: keys([0, -80, -175, -205, -150, -140, -140]),
      ty: keys([0, 120, 240, 340, 400, 410, 410]),
      tz: keys([0, 150, 300, 410, 460, 470, 472]),
    },
    winSize: 132, winFrom: -160,
    // centred, above Mia's chip
    winPos: (W, H, sz, top, chip) => [W / 2 - sz.w / 2, top.y - chip.h - 12 * 1.25 - 170 - sz.h],
    s07Size: 220, s07Pos: (W, H, a, b) => [W / 2 - a.width / 2, 600, W / 2 - b.width / 2, 820],
  };
}
