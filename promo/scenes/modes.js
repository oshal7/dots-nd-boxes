// modes — s08 Pass & Play, s09 vs Computer, s10 Online (film 15.0–24.5).
// One big pen-and-paper phone carries the three modes; in s10 the camera pulls back to two phones joined by one pen
// line, and that line lands on handoff L as the brand mark's first stroke.
// Every visual is a pure function of film time t (render(t)); nothing reads a clock.
import { C, LINE, TEXT, FILL, div, svg, css, Board, Sparks, clamp, lerp, seg, smooth, smoother, outCubic, inCubic,
  inOutCubic, outQuint, outExpo, inQuint, outBack, rng } from '../shared/lib.js';
import { hand } from '../shared/handoff.js';
import { injectCSS, buildPhone, PHONE, gamePage, setupPage, lobbyCreatePage, lobbyJoinPage, ripple, floatText,
  boardToWrap, localCenter } from './modes-ui.js';

// ---------------------------------------------------------------- small utils
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(k)))).join(',')})`; };
const mixA = (a, alpha) => { const A = hex(a); return `rgba(${A.join(',')},${alpha})`; };
const bump = (t, t0, d = 0.3) => { const u = seg(t, t0, t0 + d); return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u) * (1 - u * 0.3); };
// pose keys: [[t, {x,y,rx,ry,rz,lift}], ...] with per-span ease (key[2])
function poseAt(t, ks) {
  if (t <= ks[0][0]) return { ...ks[0][1] };
  for (let i = 1; i < ks.length; i++) {
    if (t <= ks[i][0]) {
      const [t0, a] = ks[i - 1], [t1, b, ease = smoother] = ks[i]; const k = ease(seg(t, t0, t1));
      const o = {}; for (const key in b) o[key] = lerp(a[key] ?? 0, b[key], k); return o;
    }
  }
  return { ...ks[ks.length - 1][1] };
}
// the pass: accelerate out of the hand, decelerate with a small overshoot into the next hand
const swipeEase = (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2);

// ---------------------------------------------------------------- timing (film seconds)
const TT = {
  miaTap: 15.42, snaps: [15.5, 16.15, 16.75, 17.35],
  turns: [[15.0, 'p1'], [15.76, 'p2'], [16.41, 'p3'], [17.01, 'p4']],
  passes: [[15.72, 16.08], [16.32, 16.68], [16.92, 17.28]],
  swipe1: [18.28, 18.6], diffTap: 18.9, startTap: 19.22, swipe2: [19.3, 19.62], aiSnap: 20.02,
  pull: [20.8, 21.75], swipe3: [20.95, 21.3], codeFlip: [21.2, 21.8], rise: [21.3, 21.95], type: [21.95, 22.4], joinTap: 22.6,
  swipe4: [22.66, 22.94], hostTap: 22.86, line: [22.9, 23.4], land: 23.4, push: [23.9, 24.5],
};

export default {
  id: 'modes', vis: [15.0, 24.5],
  async build({ layer, W, H, V }) {
    injectCSS();
    const HO = hand(V);
    const D = HO.D, L = HO.L;
    const CX = W / 2, CY = H / 2;

    // ---------------- per-aspect configuration
    const cfg = V ? {
      Z: 1.75, P: 2700,
      g4: { rows: 2, cols: 2, gap: 218, stroke: 12, dotR: 9.5, pad: 22 }, g4H: 218 + 44, firstSide: 'h_1_0', tapF: 0.5,
      order: ['h_1_0', 'v_0_0', 'h_0_0', 'v_0_1'],
      ai: { rows: 3, cols: 3, gap: 140, stroke: 10, dotR: 8 }, aiH: null,
      on: { rows: 3, cols: 3, gap: 120, stroke: 9, dotR: 7.5 },
      setupScroll: null,
      A: { x: 540, y: 1150, rx: 6, ry: -16, rz: 0 },
      passOff: [{ x: -46, y: -26, rx: -1, ry: 6, rz: 4 }, { x: 42, y: 22, rx: 2, ry: -4, rz: -3.5 }, { x: -14, y: -10, rx: 0, ry: 2, rz: 2 }],
      E: { dx: 0, dy: 10, rx: 4, ry: -10, rz: 0 },
      s10: { s: 0.52, p1: [405, 625], p2: [675, 1640], r1: { rx: -9, ry: 11, rz: 0 }, r2: { rx: 9, ry: -11, rz: 0 } },
      hx: { s08: { x: CX, y: 64, size: 150, align: 'center' }, chip: { x: CX, y: 252 }, s09: { x: CX, y: 90, size: 150 }, s10: { x: CX, y: 60, size: 140 } },
    } : {
      Z: 3.1, P: 4600,
      g4: { rows: 2, cols: 2, gap: 150, stroke: 11, dotR: 8.5, pad: 14 }, g4H: 150 + 28, firstSide: 'v_0_0', tapF: 0.39,
      order: ['v_0_0', 'h_0_0', 'v_0_1', 'h_1_0'],
      ai: { rows: 3, cols: 3, gap: 104, stroke: 8.5, dotR: 7 }, aiH: 104 * 2 + 52,
      on: { rows: 3, cols: 3, gap: 110, stroke: 8.5, dotR: 7 },
      setupScroll: -115,
      A: { x: 1180, y: 1560, rx: 6, ry: -16, rz: 0 },
      passOff: [{ x: -80, y: -34, rx: -1, ry: 6, rz: 4 }, { x: 70, y: 30, rx: 2, ry: -5, rz: -3.5 }, { x: -24, y: -12, rx: 0, ry: 2, rz: 2 }],
      E: { dx: -40, dy: 0, rx: 4, ry: -10, rz: 0 },
      s10: { s: 0.4, p1: [585, 765], p2: [1335, 765], r1: { rx: 4, ry: 14, rz: 0 }, r2: { rx: 4, ry: -14, rz: 0 } },
      hx: { s08: { x: 96, y: 300, size: 158, align: 'left' }, chip: { x: 100, y: 640 }, s09: { x: 96, y: 330, size: 158 }, s10: { x: CX, y: 62, size: 132 } },
    };
    const Z = cfg.Z;

    // ---------------- DOM: world (camera) > grid + phones ; overlay (line) ; hud (headlines)
    const world = div('', layer); css(world, { position: 'absolute', left: '0', top: '0', width: W + 'px', height: H + 'px', transformOrigin: '0 0' });
    const grid = div('', world);
    const GS = 120; const gw = 16000, gh = 16000;
    css(grid, { position: 'absolute', left: -gw / 2 + CX + 'px', top: -gh / 2 + CY + 'px', width: gw + 'px', height: gh + 'px',
      backgroundImage: `radial-gradient(circle, #e2d9c4 4px, transparent 4.6px)`, backgroundSize: `${GS}px ${GS}px`, backgroundPosition: `${(gw / 2 - CX) % GS}px ${(gh / 2 - CY) % GS}px` });

    const ph1 = buildPhone(world, Z, 'p1');
    const ph2 = buildPhone(world, Z, 'p2');

    // screens of phone 1
    const players4 = [{ name: 'Mia', pid: 'p1' }, { name: 'Leo', pid: 'p2' }, { name: 'Ava', pid: 'p3' }, { name: 'Sam', pid: 'p4' }];
    const g4 = gamePage(ph1.screen, { players: players4, board: cfg.g4, id: `mx4${V ? 'v' : 'h'}`, boardH: cfg.g4H, footer: 'emotes' });
    const st = setupPage(ph1.screen);
    if (cfg.setupScroll != null) st.card.style.marginTop = cfg.setupScroll + 'px'; else { st.page.style.justifyContent = 'center'; }
    const ai = gamePage(ph1.screen, { players: [{ name: 'Mia', pid: 'p1' }, { name: 'Computer', pid: 'p2' }], board: cfg.ai, id: `mxai${V ? 'v' : 'h'}`, boardH: cfg.aiH, footer: 'emotes' });
    const CODE = 'K7QM2P';
    const lc = lobbyCreatePage(ph1.screen, CODE); lc.page.style.justifyContent = 'center';
    const on1 = gamePage(ph1.screen, { players: [{ name: 'Mia', pid: 'p1' }, { name: 'Leo', pid: 'p2' }], board: cfg.on, id: `mxo1${V ? 'v' : 'h'}`, footer: 'share', roomCode: CODE });
    // screens of phone 2
    const lj = lobbyJoinPage(ph2.screen); lj.page.style.justifyContent = 'center';
    const on2 = gamePage(ph2.screen, { players: [{ name: 'Mia', pid: 'p1' }, { name: 'Leo', pid: 'p2' }], board: cfg.on, id: `mxo2${V ? 'v' : 'h'}`, footer: 'share', roomCode: CODE });

    // ripples + floats
    const rip4 = ripple(g4.fx), ripSt = ripple(st.fx), ripO1 = ripple(on1.fx), ripJ = ripple(lj.fx);
    const f4 = floatText(g4.fx, '+1', TEXT.p4), fAi = floatText(ai.fx, '+1', TEXT.p2);

    // overlay line + hud
    const ov = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }); layer.appendChild(ov);
    css(ov, { position: 'absolute', left: '0', top: '0' });
    const penLine = svg('line', { 'stroke-linecap': 'round', stroke: C.p1 }, ov);
    const ovSparks = new Sparks(ov, 24);
    const hud = div('', layer); css(hud, { position: 'absolute', inset: '0' });

    // headlines
    const mkHead = (lines, o) => {
      const box = div('mx-headline', hud); const els = [];
      css(box, { left: o.x + 'px', top: o.y + 'px' });
      lines.forEach((ln, i) => {
        const m = div('mx-mask', box); const e = div('cv', m, ln);
        css(m, { position: 'relative', overflow: o.mask ? 'hidden' : 'visible', padding: '0 20px', margin: '0 -20px' });
        css(e, { fontSize: o.size + 'px', lineHeight: '1.0', paddingBottom: '0.06em', display: 'block', textAlign: o.align === 'center' ? 'center' : 'left' });
        els.push(e);
      });
      if (o.align === 'center') box.style.transform = 'translateX(-50%)';
      return { box, els };
    };
    const hS08 = mkHead(V ? ['Pass & Play'] : ['Pass &', 'Play'], { ...cfg.hx.s08 });
    const hS09 = mkHead(V ? ['vs Computer'] : ['vs', 'Computer'], { ...cfg.hx.s09, align: V ? 'center' : 'left', mask: true });
    const hS10 = mkHead(['Play online'], { ...cfg.hx.s10, align: 'center' });
    // the "2–4 players" chip (the game's chip, selected style) scaled with zoom
    const chipWrap = div('', hud); css(chipWrap, { position: 'absolute', left: cfg.hx.chip.x + 'px', top: cfg.hx.chip.y + 'px', transformOrigin: V ? '50% 50%' : '0% 50%' });
    const chipZ = div('', chipWrap); chipZ.style.zoom = V ? 2.1 : 2.3;
    const chip = div('chip is-selected', chipZ, '2–4 players'); css(chip, { display: 'inline-flex', whiteSpace: 'nowrap', padding: '8px 16px' });
    if (V) chipWrap.style.transform = 'translateX(-50%)';

    // ---------------- board states
    const B4 = g4.board; const order = cfg.order; const pids = ['p1', 'p2', 'p3', 'p4'];
    // AI board: Mia owns b_1_0; b_0_1 has 3 sides; Computer closes it with v_0_1.
    const aiPre = [['h_1_0', 'p1'], ['h_2_0', 'p2'], ['v_1_0', 'p2'], ['v_1_1', 'p1'], ['h_0_1', 'p2'], ['v_0_2', 'p1'], ['h_1_1', 'p1']];
    const aiMove = 'v_0_1';
    // online board: identical on both phones; Mia's move h_1_0 lands on both at TT.land
    const onPre = [['h_0_0', 'p1'], ['v_1_2', 'p2'], ['h_2_1', 'p1'], ['v_0_2', 'p2'], ['v_1_0', 'p2']];
    const onMove = 'h_1_1';

    const tapPt = () => { const e = B4.edges.get(cfg.firstSide); return { x: lerp(e.a.x, e.b.x, cfg.tapF), y: lerp(e.a.y, e.b.y, cfg.tapF) }; };
    // ---------------- helpers used in render
    function cardStates(cards, schedule, t, capture) {
      // schedule: [[t, pid]] sorted. Active level with 0.25 s cross-fade (the game's 0.3 s transitions).
      let cur = null, prev = null, tsw = -1;
      for (const [ts, pid] of schedule) if (t >= ts) { prev = cur; cur = pid; tsw = ts; }
      for (const pid in cards) {
        const c = cards[pid]; let k = 0;
        if (pid === cur) k = prev === null ? 1 : smooth(seg(t, tsw, tsw + 0.25));
        else if (pid === prev) k = 1 - smooth(seg(t, tsw, tsw + 0.2));
        const pc = LINE[pid];
        c.badgeEl.style.opacity = k;
        c.el.style.borderColor = mix(C.line, pc, k);
        c.el.style.boxShadow = k > 0.01 ? `${lerp(2, 3, k)}px ${lerp(3, 4, k)}px 0 ${mixA(pc, 0.35 * k)}` : '2px 3px 0 rgba(56,53,47,0.08)';
        const b = pid === cur && prev !== null ? bump(t, tsw, 0.32) : 0;
        c.el.style.transform = `translateY(${-2.5 * b}px) scale(${1 + 0.035 * b})`;
      }
      if (capture) for (const [pid, t0, from, to] of capture) {
        const c = cards[pid]; c.scoreEl.textContent = t >= t0 ? to : from;
        const u = seg(t, t0, t0 + 0.4); const sc = u <= 0 || u >= 1 ? 1 : u < 0.6 ? lerp(0.5, 1.2, elasticK(u / 0.6)) : lerp(1.2, 1, (u - 0.6) / 0.4);
        c.scoreEl.style.transform = `scale(${sc})`;
      }
    }
    const elasticK = (x) => clamp(x);
    function edgeDraw(board, id, t, t0, color, { preview = null } = {}) {
      if (t >= t0) board.setEdge(id, { p: 1, color, w: Board.snapW(t, t0) });
      else if (preview !== null && t >= preview) board.setEdge(id, { p: 1, color: C.accent, w: 6 / 6.5, dash: true, dashOffset: -((t - preview) / 0.6) * 12, opacity: 0.75 });
      else board.clearEdge(id);
    }
    function sparkBursts(board, id, t0, color, seed, extra = {}) {
      const e = board.edges.get(id);
      return [{ t0, x: e.a.x, y: e.a.y, color, seed, n: 7, speed: 230, size: 4, life: 0.5, ...extra }, { t0, x: e.b.x, y: e.b.y, color, seed: seed + 11, n: 7, speed: 230, size: 4, life: 0.5, ...extra }];
    }
    function confetti(board, boxId, t0, seed) {
      const c = board.boxCenter(boxId); const cols = [C.p1, C.p2, C.p3, C.p4, '#8a5cd6', '#e0b93a'];
      return cols.map((col, i) => ({ t0, x: c.x, y: c.y, color: col, seed: seed + i * 7, n: 3, speed: 420, size: 5.5, life: 0.75 }));
    }
    function pill(el, t, t0) {
      const k = t < t0 ? 0 : t < t0 + 1.2 ? smooth(seg(t, t0, t0 + 0.3)) : 1 - smooth(seg(t, t0 + 1.2, t0 + 1.5));
      el.style.opacity = k;
    }
    function swipe(pageOut, pageIn, t, [a, b]) {
      const k = swipeEase(seg(t, a, b));
      if (pageOut) pageOut.style.transform = `translateX(${-100 * k}%)`;
      if (pageIn) pageIn.style.transform = `translateX(${100 * (1 - k)}%)`;
      return k;
    }
    function setPhone(ph, p, o = 1) {
      const wz = PHONE.w * Z, hz = PHONE.h * Z; const lift = p.lift ?? 0;
      ph.outer.style.transform = `translate(${p.x - wz / 2}px,${p.y - hz / 2}px) perspective(${cfg.P}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) scale(${1 + 0.035 * lift})`;
      ph.body.style.boxShadow = `${5 + 7 * lift}px ${6 + 10 * lift}px 0 rgba(56,53,47,${0.13 + 0.03 * lift})`;
      ph.outer.style.opacity = o; ph.outer.style.visibility = o <= 0.001 ? 'hidden' : 'visible';
    }

    // ---------------- phone 1 pose keys (built from A, which is solved so Mia's first side sits on D)
    const A = { ...cfg.A, lift: 0 };
    let P1KEYS, P2KEYS, CAM;
    const s10 = cfg.s10;
    function buildKeys() {
      const off = (o, extra = {}) => ({ x: A.x + (o.x ?? 0), y: A.y + (o.y ?? 0), rx: A.rx + (o.rx ?? 0), ry: A.ry + (o.ry ?? 0), rz: A.rz + (o.rz ?? 0), lift: 0, ...extra });
      const [oB, oC, oD] = cfg.passOff;
      const pA2 = off({ ry: 0.9, rz: -0.4, y: -6 });
      const pB = off(oB), pB2 = off({ ...oB, ry: oB.ry + 0.8, rz: oB.rz - 0.4, y: oB.y - 6 });
      const pC = off(oC), pC2 = off({ ...oC, ry: oC.ry + 0.8, rz: oC.rz + 0.4, y: oC.y - 6 });
      const pD = off(oD), pD2 = off({ ...oD, ry: oD.ry + 1.2, rz: oD.rz - 0.8, y: oD.y - 14 });
      const lifted = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 24, rx: (a.rx + b.rx) / 2, ry: (a.ry + b.ry) / 2, rz: (a.rz + b.rz) / 2, lift: 1 });
      const E = { x: A.x + cfg.E.dx, y: A.y + cfg.E.dy, rx: cfg.E.rx, ry: cfg.E.ry, rz: cfg.E.rz, lift: 0 };
      const E2 = { ...E, ry: E.ry + 2, rz: -0.6, y: E.y - 10 };
      // s10 world placement: phone 1 stays where it is; the camera pulls back so it lands at s10.p1 on screen.
      const F1 = { x: E2.x, y: E2.y, ...s10.r1, lift: 0 };
      const F1b = { ...F1, ry: F1.ry - 1.2, y: F1.y - 8 };
      const [p, q] = TT.passes;
      P1KEYS = [
        [15.0, { ...A }], [TT.passes[0][0], pA2, smooth],
        [(p[0] + p[1]) / 2, lifted(pA2, pB), (x) => inCubic(x) * 0.6 + x * 0.4], [p[1], pB, (x) => outBack(x, 1.4)],
        [q[0], pB2, smooth], [(q[0] + q[1]) / 2, lifted(pB2, pC), (x) => inCubic(x) * 0.6 + x * 0.4], [q[1], pC, (x) => outBack(x, 1.4)],
        [TT.passes[2][0], pC2, smooth], [(TT.passes[2][0] + TT.passes[2][1]) / 2, lifted(pC2, pD), (x) => inCubic(x) * 0.6 + x * 0.4], [TT.passes[2][1], pD, (x) => outBack(x, 1.4)],
        [18.25, pD2, smooth], [18.95, E, inOutCubic], [TT.pull[0], E2, smooth],
        [TT.pull[1], F1, inOutCubic], [24.5, F1b, smooth],
      ];
      // camera: screen = (world − F)·s + C.  s10: world F chosen so phone 1 lands at s10.p1 on screen.
      const F10 = { x: F1.x - (s10.p1[0] - CX) / s10.s, y: F1.y - (s10.p1[1] - CY) / s10.s };
      const P2 = { x: F10.x + (s10.p2[0] - CX) / s10.s, y: F10.y + (s10.p2[1] - CY) / s10.s, ...s10.r2, lift: 0 };
      const P2start = V ? { ...P2, y: P2.y + 1500, rx: P2.rx + 24, rz: -4 } : { ...P2, y: P2.y + 2000, rx: P2.rx + 22, rz: 5 };
      P2KEYS = [[TT.rise[0], P2start], [TT.rise[1], { ...P2, y: P2.y - 10 }, outQuint], [24.5, { ...P2, ry: P2.ry + 1.2, y: P2.y - 16 }, smooth]];
      CAM = { F10, s10: s10.s };
    }
    buildKeys();

    // camera
    let LINEW = null; // {a:{x,y}, b:{x,y}} world endpoints of the pen line (solved after layout)
    function camAt(t) {
      // before the pull: gentle pushes around the frame centre
      const base = { x: CX, y: CY };
      const sKeys = [[15.0, 1.0], [17.35, 1.015], [18.3, 1.05], [18.95, 1.0], [20.8, 1.03]];
      if (t <= TT.pull[0]) {
        let s = sKeys[0][1];
        for (let i = 1; i < sKeys.length; i++) { if (t <= sKeys[i][0]) { s = lerp(sKeys[i - 1][1], sKeys[i][1], smoother(seg(t, sKeys[i - 1][0], sKeys[i][0]))); break; } s = sKeys[i][1]; }
        return { s, F: base };
      }
      // pull-back: anchor on phone 1 (its screen position travels straight), log-scale zoom
      const s0 = 1.03, s1 = CAM.s10;
      const P1w = poseAt(TT.pull[0], P1KEYS);
      const a0 = { x: (P1w.x - base.x) * s0 + CX, y: (P1w.y - base.y) * s0 + CY };
      if (t <= TT.pull[1]) {
        const k = inOutCubic(seg(t, TT.pull[0], TT.pull[1]));
        const s = Math.exp(lerp(Math.log(s0), Math.log(s1), k));
        const a1 = { x: s10.p1[0], y: s10.p1[1] };
        // world anchor = phone 1 position at pull start (phone keeps its world x,y through the pull)
        const scr = { x: lerp(a0.x, a1.x, k), y: lerp(a0.y, a1.y, k) };
        return { s, F: { x: P1w.x - (scr.x - CX) / s, y: P1w.y - (scr.y - CY) / s } };
      }
      // s10 drift: slow push about the pair's centre
      const drift = (tt) => lerp(s1, s1 * 1.045, smooth(seg(tt, TT.pull[1], TT.push[0])));
      if (t <= TT.push[0] || !LINEW) return { s: drift(t), F: CAM.F10 };
      // final push: anchor = line midpoint, travels to the frame centre; scale so the line's length = L's length
      const M = { x: (LINEW.a.x + LINEW.b.x) / 2, y: (LINEW.a.y + LINEW.b.y) / 2 };
      const len = Math.hypot(LINEW.b.x - LINEW.a.x, LINEW.b.y - LINEW.a.y);
      const sA = drift(TT.push[0]), sB = (L.x2 - L.x1) / len;
      const mA = { x: (M.x - CAM.F10.x) * sA + CX, y: (M.y - CAM.F10.y) * sA + CY };
      const k = pushEase(seg(t, TT.push[0], TT.push[1]));
      const s = Math.exp(lerp(Math.log(sA), Math.log(sB), k));
      const scr = { x: lerp(mA.x, CX, k), y: lerp(mA.y, CY, k) };
      return { s, F: { x: M.x - (scr.x - CX) / s, y: M.y - (scr.y - CY) / s } };
    }
    const pushEase = (x) => smoother(x);
    const toScreen = (cam, p) => ({ x: (p.x - cam.F.x) * cam.s + CX, y: (p.y - cam.F.y) * cam.s + CY });

    // ---------------------------------------------------------------- render
    const rootRect = () => layer.getBoundingClientRect();
    function render(t) {
      const cam = camAt(t);
      world.style.transform = `translate(${CX}px,${CY}px) scale(${cam.s}) translate(${-cam.F.x}px,${-cam.F.y}px)`;

      // ---- phones
      setPhone(ph1, poseAt(t, P1KEYS));
      const p2o = t < TT.rise[0] ? 0 : 1;
      setPhone(ph2, poseAt(t, P2KEYS), p2o);

      // ---- phone 1 pages
      const pages1 = [g4.page, st.page, ai.page, lc.page, on1.page];
      const show = (pg, on) => { pg.style.visibility = on ? 'visible' : 'hidden'; };
      pages1.forEach((pg) => show(pg, false));
      if (t < TT.swipe1[0]) { show(g4.page, true); g4.page.style.transform = 'none'; }
      else if (t < TT.swipe1[1]) { show(g4.page, true); show(st.page, true); swipe(g4.page, st.page, t, TT.swipe1); }
      else if (t < TT.swipe2[0]) { show(st.page, true); st.page.style.transform = 'none'; }
      else if (t < TT.swipe2[1]) { show(st.page, true); show(ai.page, true); swipe(st.page, ai.page, t, TT.swipe2); }
      else if (t < TT.swipe3[0]) { show(ai.page, true); ai.page.style.transform = 'none'; }
      else if (t < TT.swipe3[1]) { show(ai.page, true); show(lc.page, true); swipe(ai.page, lc.page, t, TT.swipe3); }
      else if (t < TT.swipe4[0]) { show(lc.page, true); lc.page.style.transform = 'none'; }
      else if (t < TT.swipe4[1]) { show(lc.page, true); show(on1.page, true); swipe(lc.page, on1.page, t, TT.swipe4); }
      else { show(on1.page, true); on1.page.style.transform = 'none'; }
      // phone 2 pages
      show(lj.page, t < TT.swipe4[1]); show(on2.page, t >= TT.swipe4[0]);
      if (t < TT.swipe4[0]) lj.page.style.transform = 'none'; else if (t < TT.swipe4[1]) swipe(lj.page, on2.page, t, TT.swipe4); else on2.page.style.transform = 'none';

      // ---- s08: pass & play
      if (t < TT.swipe1[1]) {
        const bursts = [];
        order.forEach((id, i) => {
          const t0 = TT.snaps[i];
          edgeDraw(B4, id, t, t0, LINE[pids[i]], { preview: i === 0 ? 14.9 : null });
          bursts.push(...sparkBursts(B4, id, t0, LINE[pids[i]], 31 + i * 5));
        });
        const cap = TT.snaps[3];
        B4.setBox('b_0_0', { p: t >= cap ? Board.fillP(t, cap) : 0, color: FILL.p4, opacity: 0.82 + 0.18 * bump(t, cap + 0.05, 0.6), mark: 'S', markP: Board.markP(t, cap) });
        bursts.push(...confetti(B4, 'b_0_0', cap + 0.02, 77));
        g4.sparks.draw(t, bursts);
        cardStates(g4.cards, TT.turns, t, [['p4', cap + 0.02, 0, 1]]);
        // taps: each player taps their side just before it lands
        const taps = order.map((id, i) => { const m = boardToWrap(g4, i === 0 ? tapPt() : B4.edgeMid(id)); return { t0: i === 0 ? TT.miaTap : TT.snaps[i] - 0.07, x: m.x, y: m.y, r: 30 }; });
        rip4.draw(t, taps);
        const bc = boardToWrap(g4, B4.boxCenter('b_0_0'));
        f4.draw(t, cap + 0.05, bc.x + B4.gap * 0.32, bc.y - B4.gap / 2 - 16);
        pill(g4.pill, t, cap + 0.1);
      }

      // ---- s09: setup card → vs Computer board
      if (t >= TT.swipe1[0] && t < TT.swipe2[1]) {
        const [easy, med, hard] = st.diff.els; const sw = TT.diffTap + 0.03;
        med.classList.toggle('is-selected', t < sw); hard.classList.toggle('is-selected', t >= sw);
        const pr = bump(t, TT.diffTap - 0.06, 0.26); hard.style.transform = `scale(${1 - 0.06 * pr + 0.05 * bump(t, sw, 0.3)})`;
        const hp = localCenter(hard, st.page), sp = localCenter(st.start, st.page);
        ripSt.draw(t, [{ t0: TT.diffTap, x: hp.x, y: hp.y, r: 32 }, { t0: TT.startTap, x: sp.x, y: sp.y, r: 36 }]);
        const bp = bump(t, TT.startTap - 0.05, 0.22);
        st.start.style.transform = `translate(${bp * 2}px,${bp * 2}px)`; st.start.style.boxShadow = `${3 - 2 * bp}px ${3 - 2 * bp}px 0 ${C.accentInk}`;
      }
      if (t >= TT.swipe2[0] && t < TT.swipe3[1]) {
        const Bai = ai.board;
        aiPre.forEach(([id, pid]) => Bai.setEdge(id, { p: 1, color: LINE[pid], w: 1 }));
        Bai.setBox('b_1_0', { p: 1, color: FILL.p1, mark: 'M', markP: 1 });
        edgeDraw(Bai, aiMove, t, TT.aiSnap, LINE.p2);
        Bai.setBox('b_0_1', { p: t >= TT.aiSnap ? Board.fillP(t, TT.aiSnap) : 0, color: FILL.p2, opacity: 0.82 + 0.18 * bump(t, TT.aiSnap + 0.05, 0.6), mark: 'C', markP: Board.markP(t, TT.aiSnap) });
        ai.sparks.draw(t, [...sparkBursts(Bai, aiMove, TT.aiSnap, LINE.p2, 91), ...confetti(Bai, 'b_0_1', TT.aiSnap + 0.02, 101)]);
        ai.cards.p1.scoreEl.textContent = 1;
        cardStates(ai.cards, [[0, 'p2']], t, [['p2', TT.aiSnap + 0.02, 0, 1]]);
        ai.cards.p1.scoreEl.textContent = 1;
        const bc = boardToWrap(ai, Bai.boxCenter('b_0_1'));
        fAi.draw(t, TT.aiSnap + 0.05, bc.x + Bai.gap * 0.3, bc.y - Bai.gap / 2 - 14);
        pill(ai.pill, t, TT.aiSnap + 0.1);
      }

      // ---- s10: lobby → online
      if (t >= TT.swipe3[0]) {
        // host: room code flips in letter by letter
        const [c0, c1] = TT.codeFlip; const n = lc.letters.length;
        lc.letters.forEach((el, i) => {
          const t0 = c0 + (i * (c1 - c0 - 0.14)) / (n - 1); const u = seg(t, t0, t0 + 0.22);
          const ang = lerp(-95, 0, outBack(u, 2.2)); el.style.opacity = u <= 0 ? 0 : clamp(u * 3);
          el.style.transform = `perspective(200px) rotateX(${ang}deg)`;
        });
        lc.spin.style.transform = `rotate(${(t * 450) % 360}deg)`;
        // guest: types the code, taps Join Room
        const [y0, y1] = TT.type; const typed = t < y0 ? 0 : Math.min(n, 1 + Math.floor(((t - y0) / (y1 - y0)) * (n - 0.001)));
        const caretOn = Math.floor((t - 21.0) / 0.5) % 2 === 0 || (t >= y0 && t < y1 + 0.15);
        const focused = t >= y0 - 0.25;
        lj.input.innerHTML = (typed ? CODE.slice(0, typed) : (focused ? '' : '<span class="ph">ABC123</span>')) + (focused && caretOn && t < TT.joinTap ? '<span class="mx-caret"></span>' : '');
        lj.input.style.borderColor = focused ? C.accent : C.line; lj.input.style.background = focused ? '#fff' : C.paper;
        const bp = bump(t, TT.joinTap - 0.05, 0.24);
        lj.btn.style.transform = `translate(${bp * 2}px,${bp * 2}px)`; lj.btn.style.boxShadow = `${3 - 2 * bp}px ${3 - 2 * bp}px 0 ${C.accentInk}`;
        const jp = localCenter(lj.btn, lj.page); ripJ.draw(t, [{ t0: TT.joinTap, x: jp.x, y: jp.y, r: 36 }]);
        // identical online boards
        for (const [g, host] of [[on1, true], [on2, false]]) {
          const Bo = g.board;
          onPre.forEach(([id, pid]) => Bo.setEdge(id, { p: 1, color: LINE[pid], w: 1 }));
          edgeDraw(Bo, onMove, t, TT.land, LINE.p1, { preview: host ? TT.hostTap + 0.02 : null });
          g.sparks.draw(t, sparkBursts(Bo, onMove, TT.land, LINE.p1, host ? 141 : 151));
          cardStates(g.cards, [[0, 'p1'], [TT.land + 0.26, 'p2']], t);
        }
        const hm = boardToWrap(on1, on1.board.edgeMid(onMove));
        ripO1.draw(t, [{ t0: TT.hostTap, x: hm.x, y: hm.y, r: 26 }]);
      }

      // ---- the pen line (overlay, world-anchored)
      if (LINEW && t >= TT.line[0]) {
        const a = toScreen(cam, LINEW.a), b = toScreen(cam, LINEW.b);
        const pd = inOutCubic(seg(t, TT.line[0], TT.line[1]));
        let x1 = a.x, y1 = a.y, x2 = lerp(a.x, b.x, pd), y2 = lerp(a.y, b.y, pd);
        let w = 12 + 3 * bump(t, TT.land, 0.3), col = C.p1;
        if (t >= TT.push[0]) {
          const k = smoother(seg(t, TT.push[0], TT.push[1]));
          const kw = smoother(seg(t, TT.push[0] + 0.05, TT.push[1]));
          w = lerp(12, L.w, kw); col = mix(C.p1, C.p3, smooth(seg(t, TT.push[0] + 0.1, TT.push[1] - 0.1)));
          if (V) { // rotate from vertical to horizontal about the midpoint
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, hl = Math.hypot(b.x - a.x, b.y - a.y) / 2;
            const ang = lerp(Math.PI / 2, 0, k);
            x1 = mx - Math.cos(ang) * hl; y1 = my - Math.sin(ang) * hl; x2 = mx + Math.cos(ang) * hl; y2 = my + Math.sin(ang) * hl;
          }
          if (t >= TT.push[1] - 1e-6) { x1 = L.x1; x2 = L.x2; y1 = y2 = L.y; w = L.w; col = C.p3; }
        }
        penLine.setAttribute('x1', x1); penLine.setAttribute('y1', y1); penLine.setAttribute('x2', x2); penLine.setAttribute('y2', y2);
        penLine.setAttribute('stroke-width', w); penLine.setAttribute('stroke', col); penLine.style.display = pd > 0 ? '' : 'none';
        ovSparks.draw(t, [{ t0: TT.land, x: b.x, y: b.y, color: C.p1, seed: 171, n: 9, speed: 300, size: 5, life: 0.5 }, { t0: TT.line[0] + 0.02, x: a.x, y: a.y, color: C.p1, seed: 181, n: 6, speed: 220, size: 4, life: 0.4 }]);
      } else { penLine.style.display = 'none'; ovSparks.draw(t, []); }

      // ---- push: phones blur and fade, grid fades
      const pk = smooth(seg(t, TT.push[0], TT.push[0] + 0.42));
      world.style.opacity = 1 - pk;
      world.style.filter = pk > 0.001 ? `blur(${18 * pk}px)` : 'none';
      grid.style.opacity = 0.9 * (1 - smooth(seg(t, TT.push[0] - 0.1, TT.push[0] + 0.3)));

      // ---- headlines (one per mode; alternate axes; outgoing leaves before incoming lands)
      // s08 enters from the left (x), leaves left
      {
        const kin = outExpo(seg(t, 15.42, 15.98)), kout = inCubic(seg(t, 18.02, 18.28));
        const dx = V ? -W * 1.1 : -760;
        hS08.els.forEach((e, i) => {
          const ki = outExpo(seg(t, 15.42 + i * 0.06, 15.98 + i * 0.06)); const ko = inCubic(seg(t, 18.0 + i * 0.03, 18.26 + i * 0.03));
          e.style.transform = `translateX(${dx * (1 - ki) + dx * 1.2 * ko}px) skewX(${-8 * (1 - ki) * (ki > 0 ? 1 : 0) + 10 * ko}deg)`;
        });
        hS08.box.style.visibility = t < 15.42 || t > 18.32 ? 'hidden' : 'visible';
        const kc = seg(t, 15.78, 16.18); const sc = kc <= 0 ? 0 : outBack(kc, 2.0);
        const kco = inCubic(seg(t, 17.96, 18.2));
        chipWrap.style.transform = `${V ? 'translateX(-50%) ' : ''}translateX(${(V ? -W : -700) * kco}px) scale(${sc})`;
        chipWrap.style.opacity = kc <= 0 ? 0 : clamp(kc * 3);
        chipWrap.style.visibility = kc <= 0 || kco >= 1 ? 'hidden' : 'visible';
      }
      // s09 rises from below inside a mask (y), leaves upward
      {
        hS09.els.forEach((e, i) => {
          const ki = outQuint(seg(t, 18.52 + i * 0.07, 19.0 + i * 0.07)); const ko = inCubic(seg(t, 20.5 + i * 0.04, 20.74 + i * 0.04));
          e.style.transform = `translateY(${105 * (1 - ki) - 110 * ko}%)`;
        });
        hS09.box.style.visibility = t < 18.5 || t > 20.82 ? 'hidden' : 'visible';
      }
      // s10 enters from the right (x) at top centre, leaves upward before the push
      {
        const e = hS10.els[0]; const ki = outExpo(seg(t, 21.3, 21.86)); const ko = inCubic(seg(t, 23.66, 23.9));
        e.style.transform = `translate(${(V ? W : 900) * (1 - ki)}px, ${-260 * ko}px) skewX(${8 * (1 - ki) * (ki > 0 ? 1 : 0)}deg)`;
        e.style.opacity = 1 - ko;
        hS10.box.style.visibility = t < 21.3 || t > 23.9 ? 'hidden' : 'visible';
      }
    }

    // ---------------- solve handoff D: move pose A so Mia's first side sits on D at the tap
    const center = (el) => { const r = el.getBoundingClientRect(), R = rootRect(); return { x: (r.left + r.right) / 2 - R.left, y: (r.top + r.bottom) / 2 - R.top }; };
    const mkMarker = (parent, x, y) => { const m = div('', parent); css(m, { position: 'absolute', left: x + 'px', top: y + 'px', width: '1px', height: '1px' }); return m; };
    {
      const m = boardToWrap(g4, tapPt()); const mk = mkMarker(g4.fx, m.x - 0.5, m.y - 0.5);
      for (let i = 0; i < 4; i++) {
        render(TT.miaTap); const c = center(mk); const cam = camAt(TT.miaTap);
        A.x += (D.x - c.x) / cam.s; A.y += (D.y - c.y) / cam.s; buildKeys();
      }
      mk.remove();
    }
    // ---------------- solve the pen line: world endpoints on the two phones' facing edges at mid-height
    {
      const tm = TT.line[0]; render(tm); const cam = camAt(tm);
      const toWorld = (p) => ({ x: (p.x - CX) / cam.s + cam.F.x, y: (p.y - CY) / cam.s + cam.F.y });
      let a, b;
      if (!V) {
        a = toWorld(center(ph1.markers.right)); b = toWorld(center(ph2.markers.left));
        const y = (a.y + b.y) / 2; const pad = 34 / cam.s; a = { x: a.x + pad, y }; b = { x: b.x - pad, y };
      } else {
        a = toWorld(center(ph1.markers.bottom)); b = toWorld(center(ph2.markers.top));
        const x = (a.x + b.x) / 2; const pad = 30 / cam.s; a = { x, y: a.y + pad }; b = { x, y: b.y - pad };
      }
      LINEW = { a, b };
    }

    return { render };
  },
};
