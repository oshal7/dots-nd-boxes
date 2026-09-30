// score3d-layout.js — per-aspect layout, camera keys and a time spline for score3d.
import { C, FILL } from '../shared/lib.js';

/** Catmull-Rom (non-uniform time) through keys [[t, v], ...]; flat tangents at both ends. Pure function of t. */
export function spline(t, ks) {
  const n = ks.length;
  if (t <= ks[0][0]) return ks[0][1];
  if (t >= ks[n - 1][0]) return ks[n - 1][1];
  let i = 1; while (ks[i][0] < t) i++;
  const [t0, v0] = ks[i - 1], [t1, v1] = ks[i];
  const tan = (j) => (j <= 0 || j >= n - 1) ? 0 : (ks[j + 1][1] - ks[j - 1][1]) / (ks[j + 1][0] - ks[j - 1][0]);
  const h = t1 - t0, u = (t - t0) / h, m0 = tan(i - 1) * h, m1 = tan(i) * h;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m1;
}

export function cfg(V, k) {
  const G = 150 * k;
  const cube = 0.6 * G;
  const base = {
    margin: 0.42 * G, slabT: 16 * k, baseH: 30 * k, baseOut: 22 * k, baseColor: C.ink,
    cube, cubeR: 0.17 * cube, cubeColor: { p1: FILL.p1, p2: FILL.p2 },
    arc: 0.9 * cube + 40 * k, chipLift: 0.22 * cube,
    firstLaunch: 10.28, gap0: 0.19, gap1: 0.09,
    light: { hemi: 1.0, key: 2.3, rim: 1.5, env: 0.35, keyPos: [-1700 * k, 2300 * k, 1000 * k], rimPos: [900 * k, 1300 * k, -2400 * k] },
    dotR: 26,
  };
  const S = 4 * G + 2 * base.margin;
  if (!V) {
    const tx = S / 2 + base.baseOut + 0.8 * cube + cube / 2;
    return { ...base, ui: 1,
      tower: { p2: { x: -tx, z: 0.1 * G }, p1: { x: tx, z: 0.1 * G } },
      cam: {
        el: [[10, 68], [11, 55], [12, 45], [13, 39], [13.5, 38], [14, 37]],
        az: [[10, 0], [11, 8], [12, 17], [13, 23], [13.5, 25], [14, 26]],
        dist: [[10, 1800], [11, 1950], [12, 2150], [13, 1950], [13.5, 1850], [14, 1800]],
        tx: [[10, 0], [11, 0], [12, 40], [13, 150], [13.5, 190], [14, 200]],
        ty: [[10, 0], [11, 120], [12, 250], [13, 300], [13.5, 310], [14, 315]],
        tz: [[10, 0], [11, 0], [12, 0], [13, 40], [13.5, 50], [14, 50]],
      },
      winSize: 120, winFrom: -160, winPos: (W, H, sz) => [W / 2 - sz.w / 2 - 260, 60],
      s07Size: 220, s07Pos: (W, H, a, b) => [W / 2 - a.width / 2 - 170, 150, W / 2 - b.width / 2 + 170, 360],
    };
  }
  const tz = S / 2 + base.baseOut + 0.9 * cube + cube / 2;
  return { ...base, ui: 1.15,
    tower: { p2: { x: -0.95 * G, z: tz }, p1: { x: 0.95 * G, z: tz } },
    cam: {
      el: [[10, 68], [11, 55], [12, 45], [13, 39], [13.5, 38], [14, 37]],
      az: [[10, 0], [11, 6], [12, 14], [13, 18], [13.5, 19], [14, 20]],
      dist: [[10, 1800], [11, 2100], [12, 2500], [13, 2350], [13.5, 2250], [14, 2200]],
      tx: [[10, 0], [11, 0], [12, 0], [13, 40], [13.5, 60], [14, 60]],
      ty: [[10, 0], [11, 150], [12, 380], [13, 450], [13.5, 460], [14, 460]],
      tz: [[10, 0], [11, 60], [12, 160], [13, 220], [13.5, 230], [14, 230]],
    },
    winSize: 120, winFrom: -160, winPos: (W, H, sz) => [W / 2 - sz.w / 2, 90],
    s07Size: 220, s07Pos: (W, H, a, b) => [W / 2 - a.width / 2, 560, W / 2 - b.width / 2, 780],
  };
}
