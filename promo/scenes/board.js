// board — s01–s05 (film 0.0–10.0): one continuous board. Inked on paper, becomes the app, is played on,
// pulls back to the whole finished game and tilts into the 3D hand-off (C, TILT_DEG, PERSPECTIVE).
// Every visual is a pure function of film time t (render(t)). No clocks, no CSS animation, seeded randomness only.
import {
  C, FILL, TEXT, LINE, clamp, lerp, seg, smooth, smoother, outCubic, inCubic, outQuint, cssBezier, rng, svg, div, css,
  Board, Sparks, playerCard,
} from '../shared/lib.js';
import { hand, TILT_DEG, PERSPECTIVE } from '../shared/handoff.js';

// ---------- easing ----------
const CSS_OUT = cssBezier(0, 0, 0.58, 1);          // CSS 'ease-out' (the game's float-up)
const CSS_IO = cssBezier(0.42, 0, 0.58, 1);         // CSS 'ease-in-out' (the game's shake)
const PULL = cssBezier(0.62, 0, 0.1, 1);            // slow start, fast middle, long soft landing
const PUSH = cssBezier(0.5, 0, 0.1, 1);
const GLIDE = cssBezier(0.45, 0, 0.2, 1);
const WHIP = cssBezier(0.78, 0, 0.22, 1);
const LAND = cssBezier(0.33, 0, 0.1, 1);
const SINE = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
const inQuart = (x) => x * x * x * x;

/** keyframes with a per-span ease: ks = [[t, [values...], easeIntoThisKey], ...] */
function keysE(t, ks) {
  if (t <= ks[0][0]) return ks[0][1].slice();
  for (let i = 1; i < ks.length; i++) {
    if (t <= ks[i][0]) {
      const [t0, v0] = ks[i - 1], [t1, v1, e] = ks[i];
      const k = (e || smoother)(seg(t, t0, t1));
      return v0.map((v, j) => lerp(v, v1[j], k));
    }
  }
  return ks[ks.length - 1][1].slice();
}

// ---------- film times ----------
const T_STROKE = 0.8, T_HATCH0 = 0.9, T_HATCH1 = 1.13, T_PULL = 1.1;
const T_SW0 = 2.12, T_SW1 = 2.86;                   // paper → app sweep
const T_TILT0 = 9.3, T_END = 10.0;
const MOVE_T = [null, 4.25, 4.9, 5.75, 7.0, 7.3, 7.6, 7.9];   // moves 1..7 (move 0 is the pen stroke)
const AUTO_T0 = 8.4, AUTO_DT = 0.075;                         // moves 8..21
const PREVIEW = { 1: 3.98, 2: 4.62, 3: 5.42 };                 // dashed preview start for the tapped moves

export default {
  id: 'board', vis: [0, 10.0],
  async build({ layer, W, H, V }) {
    const game = await (await fetch(new URL('../shared/game.json', import.meta.url))).json();
    const HO = hand(V), CB = HO.C, BB = HO.B;
    const G0 = CB.gap, X0 = CB.x, Y0 = CB.y, K = G0 / 64;
    const P = (c, r) => ({ x: X0 + c * G0, y: Y0 + r * G0 });  // grid → world px (world = film px at C)
    const marks = { p1: game.players.p1.mark, p2: game.players.p2.mark };

    // move times
    const moves = game.moves.map((m, i) => ({ ...m, i, t: i === 0 ? null : i < 8 ? MOVE_T[i] : AUTO_T0 + (i - 8) * AUTO_DT }));

    // ---------------- layout per aspect ----------------
    const FB = [(W / 2 - BB.x) / G0, (H / 2 - BB.y) / G0];      // camera focus (grid) that puts the board on B at scale 1
    const FC = [(W / 2 - CB.x) / G0, (H / 2 - CB.y) / G0];      // … on C
    const L = V ? {
      // [t, [screenGap, focusCol, focusRow], ease]
      cam: [
        [0.0, [400, 1.667, 1.62]],
        [T_PULL, [409, 1.66, 1.61], SINE],
        [2.0, [BB.gap, FB[0], FB[1]], PULL],
        [4.0, [BB.gap * 1.04, FB[0] + 0.02, FB[1] - 0.04], SINE],
        [4.45, [330, 1.57, 1.05], PUSH],
        [4.95, [330, 1.55, 1.25], GLIDE],
        [5.2, [334, 1.55, 1.29], SINE],
        [5.65, [420, 1.5, 2.3], GLIDE],
        [6.7, [431, 1.5, 2.29], SINE],
        [7.05, [380, 3.0, 2.9], WHIP],
        [8.4, [368, 3.06, 3.06], SINE],
        [T_END, [CB.gap, FC[0], FC[1]], LAND],
      ],
      w1: { x: 64, y: 96, size: 176 }, w2: { r: 1016, y: 1650, size: 176 },
      head: { cx: 540, y1: 132, size: 150 },
      w3: { r: 1016, y: 176, size: 168 }, w4: { x: 64, y: 176, size: 168 },
      cardsW: 840, cardsAt: (h) => ({ x: CB.x, y: CB.y + 4 * G0 + 44 }), cardsHud: (h) => ({ x: CB.x, y: H - 70 - h }), cardsFrom: 60,
      pill: { c: 1.5, r: 3.0, dx: 0, dy: 86, scale: 2.6 },
      combo: (cam, pr) => ({ x: pr(P(3, 2)).x, y: pr(P(3, 2)).y - 150 }), comboSizes: [104, 124, 146, 168],
      penAngle: 21, penScale: 0.9, float1: 130, runSize: 74,
    } : {
      cam: [
        [0.0, [435, 1.70, 1.333]],
        [T_PULL, [446, 1.69, 1.32], SINE],
        [2.0, [BB.gap, FB[0], FB[1]], PULL],
        [4.0, [BB.gap * 1.04, FB[0] + 0.05, FB[1] - 0.03], SINE],
        [4.45, [315, 1.5, 0.62], PUSH],
        [4.95, [305, 1.42, 1.34], GLIDE],
        [5.2, [309, 1.43, 1.37], SINE],
        [5.65, [420, 1.5, 2.5], GLIDE],
        [6.7, [432, 1.52, 2.48], SINE],
        [7.05, [370, 2.67, 2.93], WHIP],
        [8.4, [358, 3.08, 2.99], SINE],
        [T_END, [CB.gap, FC[0], FC[1]], LAND],
      ],
      w1: { x: 84, y: 54, size: 180 }, w2: { r: 1836, y: 872, size: 180 },
      head: { x: 118, y1: 404, size: 150 },
      w3: { r: 1836, y: 886, size: 170 }, w4: { x: 84, y: 886, size: 170 },
      cardsW: 600, cardsAt: (h) => ({ x: CB.x, y: CB.y - 30 - h }), cardsS02: (h) => ({ x: BB.x, y: BB.y - 30 - h }), cardsHud: (h) => ({ x: 60, y: 46 }), cardsFrom: -60,
      pill: { c: 2.0, r: 3.0, dx: 1, dy: 70, scale: 2.4 },
      combo: (cam, pr) => ({ x: pr(P(3, 3)).x, y: 132 }), comboSizes: [100, 120, 142, 166],
      penAngle: 12.5, penScale: 1, float1: 130, runSize: 76,
    };
    if (!L.cardsS02) L.cardsS02 = L.cardsAt;

    // ---------------- camera ----------------
    const CAMK = L.cam.map(([t, [g, c, r], e]) => [t, [Math.log(g), c, r], e]);
    const cam = (t) => { const v = keysE(t, CAMK); const s = Math.exp(v[0]) / G0; return { s, fx: X0 + v[1] * G0, fy: Y0 + v[2] * G0 }; };
    const proj = (p, c) => ({ x: W / 2 + c.s * (p.x - c.fx), y: H / 2 + c.s * (p.y - c.fy) });
    const camTf = (c) => `translate(${W / 2 - c.s * c.fx} ${H / 2 - c.s * c.fy}) scale(${c.s})`;

    // ---------------- DOM ----------------
    const stage = div('', layer); css(stage, { position: 'absolute', inset: 0, perspective: PERSPECTIVE + 'px', perspectiveOrigin: `${W / 2}px ${H / 2}px` });
    const tiltEl = div('', stage); css(tiltEl, { position: 'absolute', inset: 0, transformOrigin: `${W / 2}px ${H / 2}px` });
    const grain = div('', tiltEl); css(grain, { position: 'absolute', inset: 0, backgroundRepeat: 'repeat' });
    const root = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }); css(root, { position: 'absolute', left: 0, top: 0 });
    tiltEl.appendChild(root);
    const defs = svg('defs', {}, root);
    const ghostG = svg('g', {}, root);
    const camG = svg('g', {}, root);
    const world = svg('g', { id: 'bd-world' }, camG);
    const ghosts = [0, 1, 2].map(() => svg('use', { href: '#bd-world', opacity: 0 }, ghostG));

    const vignette = div('', layer); css(vignette, { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 75% 70% at 46% 46%, rgba(120,92,52,0) 55%, rgba(120,92,52,0.16) 100%)' });
    const dim = div('', layer); css(dim, { position: 'absolute', inset: 0 });
    const wordsL = div('', layer); css(wordsL, { position: 'absolute', inset: 0 });
    const penSvg = svg('svg', { width: W, height: H }); css(penSvg, { position: 'absolute', left: 0, top: 0 }); layer.appendChild(penSvg);
    const hud = div('', layer); css(hud, { position: 'absolute', inset: 0 });

    // ---------------- paper grain tile (deterministic) ----------------
    {
      const N = 512, cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d');
      const R = rng(11);
      for (let i = 0; i < 5200; i++) { const x = R() * N, y = R() * N, r = 0.4 + R() * 1.3, d = R() < 0.62;
        g.fillStyle = d ? `rgba(120,98,64,${0.05 + R() * 0.11})` : `rgba(255,255,250,${0.2 + R() * 0.35})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
      g.lineCap = 'round';
      for (let i = 0; i < 110; i++) { const x = R() * N, y = R() * N, a = R() * 6.283, l = 8 + R() * 26; g.strokeStyle = `rgba(130,106,70,${0.05 + R() * 0.08})`; g.lineWidth = 0.6 + R() * 0.8;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.5) * l * 0.5, y + Math.sin(a + 0.5) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
      grain.style.backgroundImage = `url(${cv.toDataURL()})`;
    }
    const GRAIN_TILE = 1.25 * G0; // world px per tile

    // ---------------- app board (the real Board) ----------------
    const appG = svg('g', {}, world);
    const bd = new Board(appG, { rows: 5, cols: 5, gap: G0, x: X0, y: Y0, id: 'bd-app' });

    // ---------------- paper layer ----------------
    const paperG = svg('g', {}, world);
    const f = (id, attrs, kids) => { const e = svg('filter', { id, ...attrs }, defs); for (const [tag, a] of kids) svg(tag, a, e); return e; };
    f('bd-graphite', { x: '-5%', y: '-5%', width: '110%', height: '110%' }, [
      ['feTurbulence', { type: 'fractalNoise', baseFrequency: String(1.1 / K), numOctaves: '1', seed: '3', result: 'n' }],
      ['feColorMatrix', { in: 'n', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.5 0 0 0 0.12', result: 'a' }],
      ['feComposite', { in: 'SourceGraphic', in2: 'a', operator: 'in', result: 'g' }],
      ['feTurbulence', { type: 'fractalNoise', baseFrequency: String(0.03 / K), numOctaves: '2', seed: '9', result: 'w' }],
      ['feDisplacementMap', { in: 'g', in2: 'w', scale: String(2.2 * K), xChannelSelector: 'R', yChannelSelector: 'G' }],
    ]);
    f('bd-ink', { x: '-10%', y: '-10%', width: '120%', height: '120%' }, [
      ['feTurbulence', { type: 'fractalNoise', baseFrequency: String(0.09 / K), numOctaves: '2', seed: '5', result: 'w' }],
      ['feDisplacementMap', { in: 'SourceGraphic', in2: 'w', scale: String(1.6 * K), xChannelSelector: 'R', yChannelSelector: 'G' }],
    ]);
    const pencilG = svg('g', { filter: 'url(#bd-graphite)' }, paperG);
    const inkG = svg('g', { filter: 'url(#bd-ink)' }, paperG);
    const E0 = new Map(game.E0.map((e) => [e.edge, e.by]));
    const edgeEnds = (id) => { const e = bd.edges.get(id); return [e.a, e.b]; };
    const pencilPath = (a, b, R) => {
      const dx = b.x - a.x, dy = b.y - a.y, Ln = Math.hypot(dx, dy), ux = dx / Ln, uy = dy / Ln, nx = -uy, ny = ux;
      const o0 = (R() - 0.3) * 0.1 * Ln, o1 = (R() - 0.3) * 0.1 * Ln, j0 = (R() - 0.5) * 2.2 * K, j1 = (R() - 0.5) * 2.2 * K, bow = (R() - 0.5) * 0.035 * Ln;
      const sx = a.x - ux * o0 + nx * j0, sy = a.y - uy * o0 + ny * j0, ex = b.x + ux * o1 + nx * j1, ey = b.y + uy * o1 + ny * j1;
      const mx = (sx + ex) / 2 + nx * bow, my = (sy + ey) / 2 + ny * bow;
      return `M${sx.toFixed(2)},${sy.toFixed(2)} Q${mx.toFixed(2)},${my.toFixed(2)} ${ex.toFixed(2)},${ey.toFixed(2)}`;
    };
    let seedN = 1;
    for (const [id] of E0) {
      const [a, b] = edgeEnds(id); const R = rng(100 + seedN++);
      svg('path', { d: pencilPath(a, b, R), fill: 'none', stroke: '#67625a', 'stroke-width': 4.4 * K, 'stroke-linecap': 'round', opacity: 0.92 }, pencilG);
      svg('path', { d: pencilPath(a, b, R), fill: 'none', stroke: '#77726a', 'stroke-width': 2.2 * K, 'stroke-linecap': 'round', opacity: 0.55 }, pencilG);
    }
    // hand-inked dots
    { const R = rng(77);
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) { const p = P(c, r);
        svg('circle', { cx: p.x + (R() - 0.5) * K, cy: p.y + (R() - 0.5) * K, r: 6.4 * K, fill: '#2f2c27', opacity: 0.12 }, inkG);
        svg('ellipse', { cx: p.x, cy: p.y, rx: (5.1 + R() * 0.6) * K, ry: (4.8 + R() * 0.6) * K, transform: `rotate(${R() * 180} ${p.x} ${p.y})`, fill: '#2b2823' }, inkG); } }
    // ballpoint stroke v_1_2 (drawn bottom → top) and the pen's scribble hatch in b_1_1
    const INK = '#2748a6';
    const [vA, vB] = edgeEnds('v_1_2');                     // a = top dot, b = bottom dot
    const bp0 = { x: vB.x + 0.6 * K, y: vB.y }, bp1 = { x: vA.x - 0.4 * K, y: vA.y }, bpc = { x: (vA.x + vB.x) / 2 + 1.6 * K, y: (vA.y + vB.y) / 2 };
    const bez = (u) => ({ x: (1 - u) * (1 - u) * bp0.x + 2 * u * (1 - u) * bpc.x + u * u * bp1.x, y: (1 - u) * (1 - u) * bp0.y + 2 * u * (1 - u) * bpc.y + u * u * bp1.y });
    const penLine = svg('path', { d: `M${bp0.x},${bp0.y} Q${bpc.x},${bpc.y} ${bp1.x},${bp1.y}`, fill: 'none', stroke: INK, 'stroke-width': 3.1 * K, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '1 2' }, inkG);
    const penBlob = svg('circle', { cx: bp0.x, cy: bp0.y, r: 2.5 * K, fill: INK, opacity: 0.9 }, inkG);
    // zigzag hatch: lines u − v = d (↘ direction) inside b_1_1, starting at its top-right corner
    const hatchPts = [];
    { const b = P(1, 1), pad = 0.15 * G0, s = G0 - 2 * pad, x0 = b.x + pad, y0 = b.y + pad, n = 10, R = rng(41);
      for (let i = 0; i < n; i++) {
        const d = s * (1 - (2 * i + 1) / n);
        let p1 = d >= 0 ? [d, 0] : [0, -d], p2 = d >= 0 ? [s, s - d] : [s + d, s];
        if (i % 2 === 1) [p1, p2] = [p2, p1];
        const j = () => (R() - 0.5) * 0.05 * s;
        hatchPts.push({ x: x0 + p1[0] + j(), y: y0 + p1[1] + j() }, { x: x0 + p2[0] + j(), y: y0 + p2[1] + j() });
      } }
    hatchPts.reverse();
    const hatchLen = [0]; for (let i = 1; i < hatchPts.length; i++) hatchLen.push(hatchLen[i - 1] + Math.hypot(hatchPts[i].x - hatchPts[i - 1].x, hatchPts[i].y - hatchPts[i - 1].y));
    const hatchAt = (p) => { const Lt = hatchLen.at(-1) * clamp(p); for (let i = 1; i < hatchPts.length; i++) if (hatchLen[i] >= Lt) { const k = (Lt - hatchLen[i - 1]) / (hatchLen[i] - hatchLen[i - 1] || 1); return { x: lerp(hatchPts[i - 1].x, hatchPts[i].x, k), y: lerp(hatchPts[i - 1].y, hatchPts[i].y, k) }; } return hatchPts.at(-1); };
    const hatch = svg('path', { d: 'M' + hatchPts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' L'), fill: 'none', stroke: INK, 'stroke-width': 1.9 * K, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.8, pathLength: 1, 'stroke-dasharray': '1 2' }, inkG);

    // ---------------- sweep masks + glint ----------------
    const bx0 = X0 - 0.35 * G0, bx1 = X0 + 4.35 * G0, SOFT = 0.7 * G0;
    const mk = (id, a, b) => {
      const gr = svg('linearGradient', { id: id + '-g', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
      svg('stop', { offset: 0, 'stop-color': a }, gr); svg('stop', { offset: 1, 'stop-color': b }, gr);
      const m = svg('mask', { id, maskUnits: 'userSpaceOnUse', x: -20000, y: -20000, width: 40000, height: 40000 }, defs);
      svg('rect', { x: -20000, y: -20000, width: 40000, height: 40000, fill: `url(#${id}-g)` }, m);
      return gr;
    };
    const gA = mk('bd-mA', '#fff', '#000'), gP = mk('bd-mP', '#000', '#fff');
    const glintGr = svg('linearGradient', { id: 'bd-glint', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    [[0, 0], [0.5, 0.3], [1, 0]].forEach(([o, a]) => svg('stop', { offset: o, 'stop-color': C.accent, 'stop-opacity': a }, glintGr));
    const glint = svg('rect', { x: X0 - 0.4 * G0, y: Y0 - 0.4 * G0, width: 4.8 * G0, height: 4.8 * G0, rx: 0.3 * G0, fill: 'url(#bd-glint)', opacity: 0 }, world);
    const sweepX = (t) => lerp(bx0 - SOFT, bx1 + SOFT, CSS_IO(seg(t, T_SW0, T_SW1)));
    const sweepT = (x) => { let a = T_SW0, b = T_SW1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (sweepX(m) < x) a = m; else b = m; } return (a + b) / 2; };

    // ---------------- game state over time ----------------
    const edgeInfo = new Map();   // edge → {by, t0, preview}
    for (const [id, by] of E0) edgeInfo.set(id, { by, t0: sweepT(bd.edgeMid(id).x) });
    edgeInfo.set('v_1_2', { by: 'p1', t0: sweepT(bd.edgeMid('v_1_2').x) });
    for (const m of moves) if (m.i > 0) edgeInfo.set(m.edge, { by: m.by, t0: m.t, preview: PREVIEW[m.i] });
    const boxInfo = new Map();
    const tB11 = sweepT(bd.boxCenter('b_1_1').x) - 0.04;
    boxInfo.set('b_1_1', { o: 'p1', t0: tB11 });
    for (const m of moves) if (m.i > 0) for (const b of m.completed) boxInfo.set(b, { o: m.by, t0: m.t });
    // score / turn timeline
    const events = [{ t: tB11, scores: moves[0].scores, next: 'p1' }, ...moves.slice(1).map((m) => ({ t: m.t, scores: m.scores, next: m.next, gain: m.completed.length ? m.by : null }))];
    events[0].gain = 'p1';
    const stateAt = (t) => { let e = null; for (const ev of events) if (ev.t <= t) e = ev; return e; };

    // ---------------- sparks ----------------
    const sparks = new Sparks(svg('g', {}, world), 170);
    const bursts = [];
    const CONF = [C.p1, C.p2, C.p3, C.p4];
    for (const m of moves) {
      if (m.i === 0) continue;
      const [a, b] = edgeEnds(m.edge), mid = bd.edgeMid(m.edge), col = LINE[m.by], auto = m.i >= 8;
      if (m.i <= 3) { bursts.push({ t0: m.t, x: a.x, y: a.y, color: col, seed: m.i * 13 + 1, n: 7, speed: 240, size: 3.4, life: 0.45 });
        bursts.push({ t0: m.t, x: b.x, y: b.y, color: col, seed: m.i * 13 + 2, n: 7, speed: 240, size: 3.4, life: 0.45 }); }
      else bursts.push({ t0: m.t, x: mid.x, y: mid.y, color: col, seed: m.i * 13 + 3, n: auto ? 5 : 8, speed: auto ? 300 : 280, size: auto ? 5 : 3.8, life: auto ? 0.4 : 0.5 });
      for (const bx of m.completed) { const c = bd.boxCenter(bx);
        CONF.forEach((cc, j) => { if (auto && j > 1) return; bursts.push({ t0: m.t + 0.02, x: c.x, y: c.y, color: cc, seed: m.i * 31 + j * 7, n: auto ? 3 : 4, speed: auto ? 380 : 420, size: auto ? 5.5 : 4.4, life: 0.65 }); }); }
    }

    // ---------------- words ----------------
    const HALO = `0 0 0.06em ${C.paper}, 0 0 0.14em ${C.paper}, 0 0 0.28em ${C.paper}, 0 0 0.5em rgba(247,242,231,0.9)`;
    const mkWord = (parent, html, size, halo = true) => {
      const e = div('cv', parent, html); css(e, { position: 'absolute', left: '0px', top: '0px', fontSize: size + 'px', willChange: 'transform' });
      if (halo) e.style.textShadow = HALO;
      const r = e.getBoundingClientRect(); return { e, w: r.width, h: r.height };
    };
    const ACC = (s) => `<span style="color:${C.accentInk}">${s}</span>`;
    const w1 = mkWord(wordsL, 'Remember', L.w1.size), w2 = mkWord(wordsL, 'this game?', L.w2.size);
    const hd1 = mkWord(wordsL, 'Now in your', L.head.size, false), hd2 = mkWord(wordsL, ACC('browser.'), L.head.size, false);
    const hl = [hd1, hd2].map((w) => { const clip = div('', wordsL); css(clip, { position: 'absolute', left: 0, top: 0, overflow: 'hidden', width: w.w + 40 + 'px', height: w.h + 30 + 'px' });
      clip.appendChild(w.e); css(w.e, { left: '20px', top: '6px' }); return { ...w, clip }; });
    const w3 = mkWord(wordsL, 'Draw ' + ACC('lines.'), L.w3.size), w4 = mkWord(wordsL, 'Close ' + ACC('boxes.'), L.w4.size);

    // ---------------- player cards ----------------
    const cardsWrap = div('', hud); css(cardsWrap, { position: 'absolute', left: 0, top: 0, width: '352px', display: 'flex', gap: '12px', transformOrigin: '0 0' });
    const mia = playerCard(cardsWrap, { name: game.players.p1.name, pid: 'p1', score: 0, active: true });
    const leo = playerCard(cardsWrap, { name: game.players.p2.name, pid: 'p2', score: 0, active: false });
    for (const c of [mia, leo]) { c.el.style.flex = '1 1 0'; css(c.scoreEl, { display: 'inline-block', transformOrigin: '20% 60%' }); }
    const cardsNat = { w: 352, h: cardsWrap.getBoundingClientRect().height };
    const cardsS = L.cardsW / cardsNat.w, cardsH = cardsNat.h * cardsS;

    // ---------------- status pill, floats, finger ----------------
    const pill = div('status-pill', hud, 'Bonus turn! 🔥'); css(pill, { position: 'absolute', left: 0, top: 0, transformOrigin: '50% 50%' });
    const pillR = pill.getBoundingClientRect();
    const mkFloat = (text, size, color) => { const e = div('float-text', hud, text); css(e, { position: 'absolute', left: 0, top: 0, fontSize: size + 'px', color, textShadow: '0 0.04em 0.07em rgba(255,255,255,0.9), 0 0 0.2em rgba(255,255,255,0.55)', visibility: 'hidden' }); return e; };
    const floats = [];
    // s04 "+1"
    floats.push({ el: mkFloat(moves[3].plusText, L.float1, C.accentInk), t0: MOVE_T[3] + 0.04, life: 1.3, at: (t, c) => { const p = proj(P(2.3, 2.45), c); return { x: p.x, y: p.y, sc: c.s * G0 / 420 }; } });
    // s05 chain combos: grow, shake, each replaced by the next in the same place
    [4, 5, 6, 7].forEach((mi, j) => {
      const until = mi < 7 ? MOVE_T[mi + 1] : 8.55;
      floats.push({ el: mkFloat(moves[mi].comboText, L.comboSizes[j], C.accentInk), t0: moves[mi].t, life: 1.3, until, shake: 14, at: (t, c) => ({ ...L.combo(c, (p) => proj(p, c)), sc: 1 }) });
    });
    const finger = div('', hud); css(finger, { position: 'absolute', left: 0, top: 0, width: '96px', height: '96px', borderRadius: '50%', background: 'rgba(56,53,47,0.16)', border: '4px solid rgba(255,255,255,0.95)', boxShadow: '0 10px 22px rgba(56,53,47,0.22), inset 0 0 0 2px rgba(56,53,47,0.08)' });
    const ripple = div('', hud); css(ripple, { position: 'absolute', left: 0, top: 0, width: '100px', height: '100px', borderRadius: '50%', border: `5px solid ${C.accent}` });
    const TAPS = [{ t: MOVE_T[1], edge: 'h_0_1' }, { t: MOVE_T[3], edge: 'v_2_2' }];

    // ---------------- the pen (screen space) ----------------
    const pdefs = svg('defs', {}, penSvg);
    const lg = (id, stops, vert = true) => { const g = svg('linearGradient', { id, x1: 0, y1: 0, x2: vert ? 0 : 1, y2: vert ? 1 : 0 }, pdefs); stops.forEach(([o, c]) => svg('stop', { offset: o, 'stop-color': c }, g)); };
    lg('bd-pcone', [[0, '#f2f2f0'], [0.45, '#b9bab8'], [1, '#7d7f80']]);
    lg('bd-pgrip', [[0, '#4d6fcc'], [0.4, '#2848a8'], [1, '#18307a']]);
    lg('bd-pbar', [[0, '#fbfcff'], [0.3, '#e9eef8'], [0.75, '#c9d4ea'], [1, '#aebcdc']]);
    const fb = (id, sd) => { const e = svg('filter', { id, x: '-60%', y: '-60%', width: '220%', height: '220%' }, pdefs); svg('feGaussianBlur', { stdDeviation: sd }, e); };
    fb('bd-psh', 7); fb('bd-phand', 42);
    const handSh = svg('g', { filter: 'url(#bd-phand)' }, penSvg);
    svg('ellipse', { cx: 470, cy: 40, rx: 330, ry: 150, fill: '#3b2f1f' }, handSh);
    const penSh = svg('g', { filter: 'url(#bd-psh)' }, penSvg);
    svg('path', { d: 'M0,0 L34,-12 L34,12 Z', fill: '#3b2f1f' }, penSh);
    svg('rect', { x: 30, y: -22, width: 880, height: 44, rx: 12, fill: '#3b2f1f' }, penSh);
    const pen = svg('g', {}, penSvg);
    svg('path', { d: 'M1,-1.5 L36,-13 L36,13 L1,1.5 Z', fill: 'url(#bd-pcone)' }, pen);
    svg('circle', { cx: 1.5, cy: 0, r: 3.4, fill: '#2a2a2a' }, pen);
    svg('rect', { x: 32, y: -20, width: 196, height: 40, rx: 13, fill: 'url(#bd-pgrip)' }, pen);
    for (let i = 0; i < 11; i++) svg('rect', { x: 52 + i * 15, y: -20, width: 5, height: 40, rx: 2, fill: '#152a6c', opacity: 0.35 }, pen);
    svg('rect', { x: 220, y: -22, width: 620, height: 44, rx: 9, fill: 'url(#bd-pbar)', stroke: 'rgba(38,60,120,0.28)', 'stroke-width': 1.5 }, pen);
    svg('rect', { x: 232, y: -5, width: 590, height: 10, rx: 5, fill: INK, opacity: 0.5 }, pen);
    svg('rect', { x: 236, y: -15, width: 580, height: 5, rx: 2.5, fill: '#fff', opacity: 0.8 }, pen);
    svg('rect', { x: 560, y: -31, width: 240, height: 11, rx: 5.5, fill: '#2848a8' }, pen);
    svg('rect', { x: 826, y: -21, width: 90, height: 42, rx: 12, fill: 'url(#bd-pgrip)' }, pen);

    // ---------------- helpers ----------------
    const show = (el, on) => { el.style.visibility = on ? 'visible' : 'hidden'; };
    const pop = (t, t0) => { const u = seg(t, t0, t0 + 0.4); if (u <= 0 || u >= 1) return 1; return u < 0.6 ? lerp(0.5, 1.2, cssBezier(0.175, 0.885, 0.32, 1.275)(u / 0.6)) : lerp(1.2, 1, smooth((u - 0.6) / 0.4)); };
    const floatState = (t, it) => {
      const a = t - it.t0; if (a < 0 || a > it.life || (it.until && t >= it.until)) return null;
      const u = a / it.life; let ty, sc, op;
      if (u < 0.25) { const e = CSS_OUT(u / 0.25); ty = lerp(-50, -70, e); sc = lerp(0.4, 1.15, e); op = e; }
      else { const e = CSS_OUT((u - 0.25) / 0.75); ty = lerp(-70, -180, e); sc = lerp(1.15, 1, e); op = 1 - e; }
      let dy = 0;
      if (it.until) { const x = seg(t, it.until - 0.09, it.until); op *= 1 - x; dy = -40 * x; sc *= 1 + 0.12 * x; }
      let dx = 0;
      if (it.shake) { const sa = a / 0.3; if (sa < 3) { const fr = sa % 1; dx = fr < 0.25 ? lerp(0, -it.shake, CSS_IO(fr / 0.25)) : fr < 0.75 ? lerp(-it.shake, it.shake, CSS_IO((fr - 0.25) / 0.5)) : lerp(it.shake, 0, CSS_IO((fr - 0.75) / 0.25)); } }
      return { ty, sc, op, dx, dy };
    };
    const tipOnPaper = (t) => {       // board-space pen tip (plus lift 0..1)
      if (t <= T_STROKE) { const u = t / T_STROKE; return { p: bez(0.4 + 0.6 * (1 - (1 - u) * (1 - u) * (1 - 0.35 * u))), lift: 0 }; }
      if (t <= T_HATCH0) { const u = smooth(seg(t, T_STROKE, T_HATCH0)); const a = bez(1), b = hatchPts[0]; return { p: { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) }, lift: Math.sin(Math.PI * u) * 0.8 }; }
      const u = seg(t, T_HATCH0, T_HATCH1); return { p: hatchAt(0.15 * smooth(u) + 0.85 * u), lift: 0 };
    };

    // ---------------- render ----------------
    function render(t) {
      const c = cam(t);
      camG.setAttribute('transform', camTf(c));

      // tilt (only in the last 0.7 s; transform none before so the board stays 2D-crisp)
      if (t > T_TILT0) { const u = seg(t, T_TILT0, T_END); const e = 0.68 * smooth(u) + 0.32 * u * u; tiltEl.style.transform = `rotateX(${(TILT_DEG * e).toFixed(4)}deg)`; }
      else tiltEl.style.transform = 'none';

      // ghosts (camera whip only)
      const gw = t > 6.66 && t < 7.12;
      for (let i = 0; i < 3; i++) {
        if (!gw) { ghosts[i].setAttribute('opacity', 0); continue; }
        const cp = cam(t - (i + 1) * 0.009), sp = Math.hypot(cp.fx - c.fx, cp.fy - c.fy) * c.s;
        ghosts[i].setAttribute('transform', camTf(cp)); ghosts[i].setAttribute('opacity', [0.2, 0.12, 0.07][i] * clamp((sp - 4) / 24));
      }

      // paper grain + vignette
      const gOp = 1 - smooth(seg(t, T_SW0, T_SW1 + 0.1));
      show(grain, gOp > 0);
      if (gOp > 0) { const tile = GRAIN_TILE * c.s, ox = W / 2 - c.s * c.fx, oy = H / 2 - c.s * c.fy; css(grain, { opacity: gOp, backgroundSize: `${tile}px ${tile}px`, backgroundPosition: `${ox}px ${oy}px` }); }
      const vOp = 1 - smooth(seg(t, 1.2, 2.1)); show(vignette, vOp > 0); vignette.style.opacity = vOp;

      // ---- paper → app sweep ----
      const xf = sweepX(t);
      const paperOn = t < T_SW1 + 0.02, appOn = t > T_SW0 - 0.01;
      paperG.style.display = paperOn ? '' : 'none';
      appG.style.display = appOn ? '' : 'none';
      if (paperOn && appOn) {
        for (const g of [gA, gP]) { g.setAttribute('x1', xf - SOFT / 2); g.setAttribute('x2', xf + SOFT / 2); }
        appG.setAttribute('mask', 'url(#bd-mA)'); paperG.setAttribute('mask', 'url(#bd-mP)');
      } else { appG.removeAttribute('mask'); paperG.removeAttribute('mask'); }
      const gl = seg(t, T_SW0, T_SW1); glint.style.display = gl > 0 && gl < 1 ? '' : 'none';
      if (gl > 0 && gl < 1) { glintGr.setAttribute('x1', xf - 0.5 * G0); glintGr.setAttribute('x2', xf + 0.5 * G0); glint.setAttribute('opacity', Math.sin(Math.PI * gl)); }

      // paper content (pen stroke + hatch)
      if (paperOn) {
        const tp = tipOnPaper(Math.min(t, T_HATCH1));
        const pl = t <= T_STROKE ? 0.4 + 0.6 * (1 - (1 - t / T_STROKE) * (1 - t / T_STROKE) * (1 - 0.35 * t / T_STROKE)) : 1;
        penLine.setAttribute('stroke-dashoffset', 1 - pl);
        const hp = t <= T_HATCH0 ? 0 : (() => { const u = seg(t, T_HATCH0, T_HATCH1); return 0.15 * smooth(u) + 0.85 * u; })();
        hatch.setAttribute('stroke-dashoffset', 1 - hp); hatch.style.display = hp > 0 ? '' : 'none';
        void tp;
      }

      // ---- app board state ----
      if (appOn) {
        for (const [id] of bd.edges) {
          const inf = edgeInfo.get(id);
          if (!inf) { bd.clearEdge(id); continue; }
          if (t >= inf.t0) bd.setEdge(id, { p: 1, color: LINE[inf.by], w: Board.snapW(t, inf.t0) });
          else if (inf.preview !== undefined && t >= inf.preview) bd.setEdge(id, { p: 1, color: C.accent, w: 6 / 6.5, dash: true, dashOffset: -20 * t, opacity: 0.75 * smooth(seg(t, inf.preview, inf.preview + 0.12)) });
          else if (inf.preview === undefined && inf.t0 <= T_SW1 + 0.3) bd.setEdge(id, { p: 1, color: LINE[inf.by], w: Board.snapW(t, inf.t0) });
          else bd.clearEdge(id);
        }
        for (const [id] of bd.boxes) {
          const b = boxInfo.get(id);
          if (b && t >= b.t0) bd.setBox(id, { p: Board.fillP(t, b.t0), color: FILL[b.o], opacity: 0.82, mark: marks[b.o], markP: Board.markP(t, b.t0) });
          else bd.setBox(id, { p: 0, mark: '' });
        }
      }
      sparks.draw(t, bursts);

      // ---- focus dim (neighbours soften while a macro is on one spot) ----
      const dA = 0.42 * smooth(seg(t, 4.3, 4.6)) * (1 - smooth(seg(t, 8.35, 8.8)));
      show(dim, dA > 0.001);
      if (dA > 0.001) {
        const fk = keysE(t, [[4.3, [1.5, 0.0, 1.3]], [4.6, [1.5, 0.05, 1.3]], [5.05, [1.2, 1.35, 1.9], GLIDE], [5.3, [1.25, 1.4, 1.9]], [5.7, [1.5, 2.5, 1.05], GLIDE], [6.7, [1.5, 2.5, 1.1]], [7.05, [3.0, 3.0, 1.7], WHIP], [8.4, [3.0, 3.0, 1.8]]]);
        const fp = proj(P(fk[0], fk[1]), c), R = fk[2] * c.s * G0;
        dim.style.background = `radial-gradient(circle at ${fp.x}px ${fp.y}px, rgba(247,242,231,0) ${R * 0.75}px, rgba(247,242,231,${dA}) ${R * 1.7}px)`;
      }

      // ---- s01 words ----
      {
        const on = t < 1.6; show(w1.e, on); show(w2.e, on);
        if (on) {
          const x1 = L.w1.x + 10 * t - (w1.w + L.w1.x + 60) * inQuart(seg(t, T_PULL, 1.45));
          const x2 = L.w2.r - w2.w - 10 * t + (W - L.w2.r + w2.w + 60) * inQuart(seg(t, T_PULL + 0.03, 1.5));
          w1.e.style.transform = `translate(${x1}px,${L.w1.y - 4 * t}px)`;
          w2.e.style.transform = `translate(${x2}px,${L.w2.y + 4 * t}px)`;
        }
      }
      // ---- s02 headline ----
      {
        const on = t > 2.1 && t < 3.9; hl.forEach((h) => show(h.clip, on));
        if (on) hl.forEach((h, i) => {
          const a = outQuint(seg(t, 2.16 + i * 0.09, 2.72 + i * 0.09)), o = inCubic(seg(t, 3.5 + i * 0.05, 3.8 + i * 0.05));
          const baseX = V ? L.head.cx - h.w / 2 - 20 : L.head.x - 20, baseY = L.head.y1 + i * h.h * 0.98 - 6;
          h.clip.style.transform = `translate(${baseX + 8 * (t - 2.2) - o * (baseX + h.w + 120)}px,${baseY}px)`;
          h.e.style.transform = `translateY(${(1 - a) * (h.h + 30)}px)`;
        });
      }
      // ---- s03 / s04 words ----
      {
        const on3 = t > 4.3 && t < 5.5; show(w3.e, on3);
        if (on3) { const a = outQuint(seg(t, 4.36, 4.86)), o = inCubic(seg(t, 5.2, 5.46)); const x = L.w3.r - w3.w;
          w3.e.style.transform = `translate(${x + (1 - a) * (W - x + 40) - 14 * (t - 4.36) + o * (W - x + 60)}px,${L.w3.y}px)`; }
        const on4 = t > 5.55 && t < 7.0; show(w4.e, on4);
        if (on4) { const a = outQuint(seg(t, 5.6, 6.1)), o = inCubic(seg(t, 6.7, 6.96)); const x = L.w4.x;
          w4.e.style.transform = `translate(${x - (1 - a) * (x + w4.w + 40) + 14 * (t - 5.6) - o * (x + w4.w + 60)}px,${L.w4.y}px)`; }
      }

      // ---- player cards ----
      {
        const on = t > 2.2 && t < 9.72; show(cardsWrap, on);
        if (on) {
          const pS = L.cardsS02(cardsH), pH = L.cardsHud(cardsH), pE = L.cardsAt(cardsH);
          const toHud = GLIDE(seg(t, 4.0, 4.5)), back = smooth(seg(t, 9.0, 9.45));
          const tl = proj(P(0, 0), c), att = V ? { x: tl.x, y: proj(P(0, 4), c).y + 44 } : { x: tl.x, y: tl.y - 30 - cardsH };
          const x = lerp(lerp(pS.x, pH.x, toHud), att.x, back), y = lerp(lerp(pS.y, pH.y, toHud), att.y, back);
          const fade = 1 - smooth(seg(t, 9.4, 9.7));
          css(cardsWrap, { transform: `translate(${x}px,${y}px) scale(${cardsS})`, opacity: fade });
          [mia, leo].forEach((cd, i) => { const a = outCubic(seg(t, 2.24 + i * 0.08, 2.7 + i * 0.08)); css(cd.el, { transform: `translateY(${(1 - a) * L.cardsFrom}px)`, opacity: clamp(a * 1.6) }); });
          const st = stateAt(t);
          const sc = st ? st.scores : { p1: 0, p2: 0 };
          mia.setScore(sc.p1); leo.setScore(sc.p2);
          // score pops on the last gain for each player
          for (const [pid, cd] of [['p1', mia], ['p2', leo]]) { let tg = -9; for (const ev of events) if (ev.t <= t && ev.gain === pid) tg = ev.t; cd.scoreEl.style.transform = `scale(${pop(t, tg)})`; }
          // TURN badge: follows `next`, badge fades over 0.2 s like the game's opacity transition
          const next = st ? st.next : 'p1'; let tc = -9; { let prev = 'p1'; for (const ev of events) { if (ev.t > t) break; if (ev.next !== prev) { tc = ev.t; prev = ev.next; } } }
          const k = smooth(seg(t, tc, tc + 0.2));
          mia.el.classList.toggle('is-active', next === 'p1'); leo.el.classList.toggle('is-active', next === 'p2');
          mia.badgeEl.style.opacity = next === 'p1' ? k : 1 - k; leo.badgeEl.style.opacity = next === 'p2' ? k : 1 - k;
          if (tc < 0) { mia.badgeEl.style.opacity = 1; leo.badgeEl.style.opacity = 0; }
        }
      }

      // ---- status pill (board-attached, under/next to b_2_1) ----
      {
        const a = smooth(seg(t, 5.9, 6.12)), o = smooth(seg(t, 6.72, 6.92)); const on = a > 0 && o < 1; show(pill, on);
        if (on) { const p = proj(P(L.pill.c, L.pill.r), c); const sc = L.pill.scale * lerp(0.85, 1, outCubic(a));
          css(pill, { transform: `translate(${p.x - pillR.width / 2 + L.pill.dx * pillR.width * L.pill.scale / 2}px,${p.y + L.pill.dy - pillR.height / 2}px) scale(${sc})`, opacity: a * (1 - o) }); }
      }
      // ---- floating texts ----
      for (const it of floats) {
        const s = floatState(t, it); show(it.el, !!s); if (!s) continue;
        const p = it.at(t, c);
        css(it.el, { transform: `translate(${p.x + s.dx}px,${p.y + s.dy}px) translate(-50%,${s.ty}%) scale(${s.sc * p.sc})`, opacity: s.op * (1 - smooth(seg(t, 9.55, 9.7))) });
      }
      // ---- finger taps ----
      {
        let fOn = false, rOn = false;
        for (const tp of TAPS) {
          const u0 = tp.t - 0.3, u1 = tp.t + 0.42;
          if (t >= u0 && t <= u1) {
            fOn = true; const m = proj(bd.edgeMid(tp.edge), c);
            const inn = outCubic(seg(t, u0, tp.t - 0.02)), out = inCubic(seg(t, tp.t + 0.1, u1));
            const press = 1 - 0.14 * Math.sin(Math.PI * seg(t, tp.t - 0.04, tp.t + 0.1));
            const off = (1 - inn) * 1 + out * 1.1;
            css(finger, { transform: `translate(${m.x - 48 + off * 240}px,${m.y - 48 + off * 280}px) scale(${press * lerp(1.15, 1, inn)})`, opacity: clamp(inn * 2) * (1 - out) });
          }
          const ru = seg(t, tp.t, tp.t + 0.5);
          if (ru > 0 && ru < 1) { rOn = true; const m = proj(bd.edgeMid(tp.edge), c); const sc = lerp(0.6, 2.6, outCubic(ru));
            css(ripple, { transform: `translate(${m.x - 50}px,${m.y - 50}px) scale(${sc})`, opacity: 0.8 * (1 - ru) }); }
        }
        show(finger, fOn); show(ripple, rOn);
      }

      // ---- pen ----
      {
        const on = t < 1.75; penSvg.style.visibility = on ? 'visible' : 'hidden';
        if (on) {
          const c0 = cam(0), sc = c.s / c0.s;
          const tp = tipOnPaper(Math.min(t, T_HATCH1));
          const tip = proj(tp.p, c);
          const lift = clamp(tp.lift + smooth(seg(t, T_HATCH1, T_HATCH1 + 0.14)));
          const ret = 1700 * inCubic(seg(t, T_HATCH1 + 0.02, 1.62));
          const ang = L.penAngle + 1.6 * Math.sin(t * 5.2) - 3 * smooth(seg(t, T_HATCH1, 1.5));
          const ar = (ang - 8) * Math.PI / 180, dx = Math.cos(ar) * ret * sc, dy = Math.sin(ar) * ret * sc;
          const S = L.penScale * sc * (1 + 0.05 * lift);
          const px = tip.x + dx - 12 * lift, py = tip.y + dy - 26 * lift;
          pen.setAttribute('transform', `translate(${px} ${py}) rotate(${ang}) scale(${S})`);
          const so = { x: (8 + 60 * lift) * sc, y: (12 + 80 * lift) * sc };
          penSh.setAttribute('transform', `translate(${tip.x + dx + so.x} ${tip.y + dy + so.y}) rotate(${ang + 4}) scale(${S})`);
          penSh.setAttribute('opacity', 0.26 * (1 - 0.45 * lift));
          handSh.setAttribute('transform', `translate(${tip.x + dx + so.x * 1.6} ${tip.y + dy + so.y * 1.6}) rotate(${ang + 6}) scale(${S})`);
          handSh.setAttribute('opacity', 0.24 * (1 - 0.3 * lift));
        }
      }
    }

    render(0);
    return { render };
  },
};
