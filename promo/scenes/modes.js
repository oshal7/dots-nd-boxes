// modes — s08 Pass & Play, s09 vs Computer, s10 Online (film 15.0–24.5).
// One big pen-and-paper phone carries the three modes. Every screen change is caused by a tap on the real UI
// (‹ exit → menu → mode button → setup/lobby). In s10 a second phone joins; Mia's edge lifts off her board, travels
// to Leo's board and lands as the same edge, and that edge becomes handoff L (the brand mark's first stroke).
// Every visual is a pure function of film time t (render(t)); nothing reads a clock.
import { C, LINE, TEXT, FILL, div, svg, css, Board, Sparks, clamp, lerp, seg, smooth, smoother, outCubic, inCubic,
  inOutCubic, outQuint, outExpo, outBack } from '../shared/lib.js';
import { hand } from '../shared/handoff.js';
import { injectCSS, buildPhone, PHONE, BADGE, gamePage, setupPage, lobbyCreatePage, lobbyJoinPage, menuPage, ripple,
  floatText, boardToWrap, boardToPage, localCenter } from './modes-ui.js';

// ---------------------------------------------------------------- small utils
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(k)))).join(',')})`; };
const mixA = (a, alpha) => `rgba(${hex(a).join(',')},${alpha})`;
const bump = (t, t0, d = 0.3) => { const u = seg(t, t0, t0 + d); return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u) * (1 - u * 0.3); };
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
const pushEase = inOutCubic; // screen pushes: 0.35 s, eased both ends

// ---------------------------------------------------------------- timing (film seconds)
const TT = {
  miaTap: 15.42, snaps: [15.5, 16.15, 16.75, 17.35],
  turns: [[15.0, 'p1'], [15.76, 'p2'], [16.41, 'p3'], [17.01, 'p4']],
  passes: [[15.72, 16.08], [16.32, 16.68], [16.92, 17.28]],
  exit1: 18.2, menuVs: 18.85, hard: 19.45, start: 19.7, aiSnap: 20.35, exit2: 20.8, menuOn: 21.25, create: 21.72, codeShow: 21.78, waitShow: 21.95,
  pull: [21.4, 22.15], rise: [21.6, 22.2], type: [22.22, 22.5], joinTap: 22.6,
  miaOnTap: 23.1, travel: [23.14, 23.56], land: 23.56, push: [23.9, 24.5],
};
// screen pushes on phone 1: [t0, t1, from, to, dir] (dir −1 = back navigation)
const NAV1 = [[18.25, 18.6, 'g4', 'menu', 1], [18.9, 19.25, 'menu', 'st', 1], [19.75, 20.1, 'st', 'ai', 1],
  [20.85, 21.2, 'ai', 'menu', -1], [21.3, 21.6, 'menu', 'lc', 1], [22.65, 22.98, 'lc', 'on1', 1]];
const NAV2 = [[22.65, 22.98, 'lj', 'on2', 1]];

export default {
  id: 'modes', vis: [15.0, 24.5],
  async build({ layer, W, H, V }) {
    injectCSS();
    const HO = hand(V);
    const D = HO.D, L = HO.L;
    const CX = W / 2, CY = H / 2;

    // ---------------- per-aspect configuration
    const cfg = V ? {
      Z: 2.2, P: 3600,
      box: 'b_1_1', order: ['h_1_1', 'v_1_2', 'h_2_1', 'v_1_1'],
      pre4: [['h_0_0', 'p2'], ['v_0_3', 'p3'], ['h_3_2', 'p4'], ['v_2_0', 'p1'], ['h_0_2', 'p1']],
      A: { x: 540, y: 1340, rx: 6, ry: -14, rz: 0 },
      passOff: [{ x: -40, y: -18, ry: 5, rz: 3.5 }, { x: 40, y: 18, ry: -4, rz: -3 }, { x: -10, y: -8, ry: 2, rz: 1.5 }],
      E: { dx: 0, dy: -30, rx: 4, ry: -9, rz: 0 },
      lobbyScroll: -300, joinScroll: -64,
      s10: { s: 2.3 / 2.2, p1: [540, 260 + 989], p2: [540, 1086 + 989], r1: { rx: 0, ry: 6, rz: 0 }, r2: { rx: 0, ry: -6, rz: 0 } },
      hx: { s08: { x: CX, y: 60, size: 150, align: 'center' }, chip: { x: CX, y: 250 }, s09: { x: CX, y: 96, size: 150 }, s10: { x: CX, y: 34, size: 124 } },
    } : {
      Z: 3.0, P: 4600,
      box: 'b_0_0', order: ['h_0_0', 'v_0_1', 'h_1_0', 'v_0_0'],
      pre4: [['h_0_2', 'p2'], ['v_1_3', 'p3'], ['h_3_1', 'p4'], ['v_2_1', 'p1'], ['h_2_2', 'p2']],
      A: { x: 1200, y: 1500, rx: 6, ry: -16, rz: 0 },
      passOff: [{ x: -30, y: -30, ry: 6, rz: 3.5 }, { x: 60, y: 26, ry: -4, rz: -3 }, { x: 12, y: -10, ry: 2, rz: 1.5 }],
      E: { dx: 0, dy: 0, rx: 4, ry: -10, rz: 0 },
      lobbyScroll: 0, joinScroll: 0,
      s10: { s: 0.465, p1: [905, 846], p2: [1570, 846], r1: { rx: 3, ry: 12, rz: 0 }, r2: { rx: 3, ry: -12, rz: 0 } },
      hx: { s08: { x: 96, y: 300, size: 158, align: 'left' }, chip: { x: 100, y: 640 }, s09: { x: 96, y: 330, size: 140 }, s10: { x: 96, y: 360, size: 128, align: 'left' } },
    };
    const Z = cfg.Z;

    // ---------------- DOM: world (camera) > grid + phones ; overlay (pen line) ; hud (headlines)
    const world = div('', layer); css(world, { position: 'absolute', left: '0', top: '0', width: W + 'px', height: H + 'px', transformOrigin: '0 0' });
    const grid = div('', world);
    const GS = 120, gw = 20000, gh = 20000;
    css(grid, { position: 'absolute', left: -gw / 2 + CX + 'px', top: -gh / 2 + CY + 'px', width: gw + 'px', height: gh + 'px',
      backgroundImage: 'radial-gradient(circle, #e2d9c4 4px, transparent 4.6px)', backgroundSize: `${GS}px ${GS}px`, backgroundPosition: `${(gw / 2 - CX) % GS}px ${(gh / 2 - CY) % GS}px` });
    const ph1 = buildPhone(world, Z, 'p1');
    const ph2 = buildPhone(world, Z, 'p2');

    const sfx = V ? 'v' : 'h';
    const players4 = [{ name: 'Mia', pid: 'p1' }, { name: 'Leo', pid: 'p2' }, { name: 'Ava', pid: 'p3' }, { name: 'Sam', pid: 'p4' }];
    const g4 = gamePage(ph1.screen, { players: players4, board: { rows: 4, cols: 4 }, id: 'mx4' + sfx });
    const menu = menuPage(ph1.screen);
    const st = setupPage(ph1.screen); st.page.style.justifyContent = 'center';
    const ai = gamePage(ph1.screen, { players: [{ name: 'Mia', pid: 'p1' }, { name: 'Computer', pid: 'p2' }], board: { rows: 5, cols: 5 }, id: 'mxai' + sfx });
    const CODE = 'K7QM2P';
    const lc = lobbyCreatePage(ph1.screen, CODE, cfg.lobbyScroll);
    const on1 = gamePage(ph1.screen, { players: [{ name: 'Mia', pid: 'p1' }, { name: 'Leo', pid: 'p2' }], board: { rows: 5, cols: 5 }, id: 'mxo1' + sfx, footer: 'share', roomCode: CODE });
    const lj = lobbyJoinPage(ph2.screen, cfg.joinScroll);
    const SHARE_H = lc.share.offsetHeight; lc.share.style.overflow = 'hidden'; lc.share.style.height = '0px';
    const on2 = gamePage(ph2.screen, { players: [{ name: 'Mia', pid: 'p1' }, { name: 'Leo', pid: 'p2' }], board: { rows: 5, cols: 5 }, id: 'mxo2' + sfx, footer: 'share', roomCode: CODE });
    const PAGES = { g4: g4.page, menu: menu.page, st: st.page, ai: ai.page, lc: lc.page, on1: on1.page, lj: lj.page, on2: on2.page };
    const SHADE = {}; for (const k in PAGES) SHADE[k] = div('mx-shade', PAGES[k]);

    const rip = { g4: ripple(g4.pfx), menu: ripple(menu.fx), st: ripple(st.fx), ai: ripple(ai.pfx), lj: ripple(lj.fx), on1: ripple(on1.pfx), lc: ripple(lc.fx) };
    const f4 = floatText(g4.fx, '+1', BADGE.p4), fAi = floatText(ai.fx, '+1', BADGE.p2);

    const ov = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }); layer.appendChild(ov);
    css(ov, { position: 'absolute', left: '0', top: '0' });
    const trail = svg('line', { 'stroke-linecap': 'round', stroke: C.accent, opacity: 0 }, ov);
    const penLine = svg('line', { 'stroke-linecap': 'round', stroke: C.p1 }, ov);
    const greenLine = svg('line', { 'stroke-linecap': 'round', stroke: C.p3 }, ov);
    const ovSparks = new Sparks(ov, 30);
    const hud = div('', layer); css(hud, { position: 'absolute', inset: '0' });

    const mkHead = (lines, o) => {
      const box = div('mx-headline', hud); const els = [];
      css(box, { left: o.x + 'px', top: o.y + 'px' });
      lines.forEach((ln) => {
        const m = div('mx-mask', box); const e = div('cv', m, ln);
        css(m, { position: 'relative', overflow: o.mask ? 'hidden' : 'visible', padding: '0 20px', margin: '0 -20px' });
        css(e, { fontSize: o.size + 'px', lineHeight: '1.0', paddingBottom: '0.08em', display: 'block', textAlign: o.align === 'center' ? 'center' : 'left' });
        els.push(e);
      });
      if (o.align === 'center') box.style.transform = 'translateX(-50%)';
      return { box, els };
    };
    const hS08 = mkHead(V ? ['Pass & Play'] : ['Pass &', 'Play'], cfg.hx.s08);
    const hS09 = mkHead(V ? ['vs Computer'] : ['vs', 'Computer'], { ...cfg.hx.s09, align: V ? 'center' : 'left', mask: true });
    const hS10 = mkHead(V ? ['Play online'] : ['Play', 'online'], { ...cfg.hx.s10, align: V ? 'center' : 'left' });
    const chipWrap = div('', hud); css(chipWrap, { position: 'absolute', left: cfg.hx.chip.x + 'px', top: cfg.hx.chip.y + 'px', transformOrigin: V ? '50% 50%' : '0% 50%' });
    const chipZ = div('', chipWrap); chipZ.style.zoom = V ? 2.1 : 2.3;
    const chip = div('chip is-selected', chipZ, '2–4 players'); css(chip, { display: 'inline-flex', whiteSpace: 'nowrap', padding: '8px 16px' });

    // ---------------- board states (real sizes: 4×4 dots for pass & play, 5×5 — the selected size — elsewhere)
    const B4 = g4.board; const pids = ['p1', 'p2', 'p3', 'p4'];
    const aiPre = [['h_1_0', 'p1'], ['h_2_0', 'p2'], ['v_1_0', 'p2'], ['v_1_1', 'p1'], ['h_0_2', 'p2'], ['h_1_2', 'p1'], ['v_0_3', 'p2'],
      ['h_0_1', 'p1'], ['h_2_3', 'p2'], ['v_2_2', 'p1'], ['h_4_1', 'p2'], ['v_3_0', 'p1'], ['h_3_3', 'p1'], ['h_3_1', 'p2']];
    const aiMove = 'v_0_2', aiBox = 'b_0_2';
    const onPre = []; // a freshly joined room: empty 5×5 board, 0–0
    const onMove = 'h_1_1';

    // ---------------- helpers
    function cardStates(cards, schedule, t, capture) {
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
        const u = seg(t, t0, t0 + 0.4); const sc = u <= 0 || u >= 1 ? 1 : u < 0.6 ? lerp(0.5, 1.2, u / 0.6) : lerp(1.2, 1, (u - 0.6) / 0.4);
        c.scoreEl.style.transform = `scale(${sc})`;
      }
    }
    function edgeDraw(board, id, t, t0, color, { preview = null } = {}) {
      if (t >= t0) board.setEdge(id, { p: 1, color, w: Board.snapW(t, t0) });
      else if (preview !== null && t >= preview) board.setEdge(id, { p: 1, color: C.accent, w: 6 / 6.5, dash: true, dashOffset: -((t - preview) / 0.6) * 12, opacity: 0.75 });
      else board.clearEdge(id);
    }
    function sparkBursts(board, id, t0, color, seed) {
      const e = board.edges.get(id); const sp = 3.2 * board.gap, sz = 0.055 * board.gap;
      return [{ t0, x: e.a.x, y: e.a.y, color, seed, n: 7, speed: sp, size: sz, life: 0.5 }, { t0, x: e.b.x, y: e.b.y, color, seed: seed + 11, n: 7, speed: sp, size: sz, life: 0.5 }];
    }
    function confetti(board, boxId, t0, seed) {
      const c = board.boxCenter(boxId); const cols = [C.p1, C.p2, C.p3, C.p4, '#8a5cd6', '#e0b93a'];
      return cols.map((col, i) => ({ t0, x: c.x, y: c.y, color: col, seed: seed + i * 7, n: 3, speed: 5 * board.gap, size: 0.08 * board.gap, life: 0.75 }));
    }
    function pill(el, t, t0) { el.style.opacity = t < t0 ? 0 : t < t0 + 1.2 ? smooth(seg(t, t0, t0 + 0.3)) : 1 - smooth(seg(t, t0 + 1.2, t0 + 1.5)); }
    function setPhone(ph, p, o = 1) {
      const wz = PHONE.w * Z, hz = PHONE.h * Z; const lift = p.lift ?? 0;
      ph.outer.style.transform = `translate(${p.x - wz / 2}px,${p.y - hz / 2}px) perspective(${cfg.P}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) scale(${1 + 0.035 * lift})`;
      ph.body.style.boxShadow = `${5 + 7 * lift}px ${6 + 10 * lift}px 0 rgba(56,53,47,${0.13 + 0.03 * lift})`;
      ph.outer.style.visibility = o <= 0 ? 'hidden' : 'visible';
    }
    // screen navigation: a push (0.35 s). Forward: new page slides in from the right over the old one, which drifts
    // 30 % left and dims. Back: the old page slides out to the right, uncovering the menu.
    function navigate(nav, pageKeys, t) {
      for (const k of pageKeys) { PAGES[k].style.visibility = 'hidden'; SHADE[k].style.opacity = 0; }
      let cur = nav[0][2];
      for (const [t0, t1, from, to, dir] of nav) {
        if (t < t0) break;
        if (t >= t1) { cur = to; continue; }
        const k = pushEase(seg(t, t0, t1)); const top = dir > 0 ? to : from, under = dir > 0 ? from : to;
        const kt = dir > 0 ? 1 - k : k; // top page offset (0 = in place, 1 = off right)
        const ku = dir > 0 ? k : 1 - k; // under page drift (0 = in place, 1 = 30 % left, dimmed)
        PAGES[top].style.visibility = PAGES[under].style.visibility = 'visible';
        PAGES[top].style.zIndex = 2; PAGES[under].style.zIndex = 1;
        PAGES[top].style.transform = `translateX(${100 * kt}%)`; PAGES[top].style.boxShadow = '-10px 0 24px rgba(56,53,47,0.14)';
        PAGES[under].style.transform = `translateX(${-30 * ku}%)`; SHADE[under].style.opacity = 0.12 * ku;
        return;
      }
      PAGES[cur].style.visibility = 'visible'; PAGES[cur].style.transform = 'none'; PAGES[cur].style.boxShadow = 'none'; PAGES[cur].style.zIndex = 1;
    }
    const tapAt = (page, el, t0, r = 34) => { const p = localCenter(el, page); return { t0, x: p.x, y: p.y, r }; };
    const exitBtn = (g) => g.page.querySelector('.mx-icon');

    // ---------------- poses and camera
    const A = { ...cfg.A, lift: 0 };
    const s10 = cfg.s10;
    // native screen point → world (ignores the small tilt; used only for framing the camera)
    const nat = (pose, nx, ny) => ({ x: pose.x + (nx + PHONE.bezelX + 2 - PHONE.w / 2) * Z, y: pose.y + (ny + PHONE.bezelY + 2 - PHONE.h / 2) * Z });
    const frame = (pose, nx, ny, sx, sy, s) => { const w = nat(pose, nx, ny); return { s, x: w.x - (sx - CX) / s, y: w.y - (sy - CY) / s }; };
    const yOf = (el, page) => localCenter(el, page).y;
    let P1KEYS, P2KEYS, CAMKEYS, F10;
    function buildKeys() {
      const off = (o) => ({ x: A.x + (o.x ?? 0), y: A.y + (o.y ?? 0), rx: A.rx + (o.rx ?? 0), ry: A.ry + (o.ry ?? 0), rz: A.rz + (o.rz ?? 0), lift: 0 });
      const [oB, oC, oD] = cfg.passOff;
      const drift = (o, d) => off({ ...o, ry: (o.ry ?? 0) + d, rz: (o.rz ?? 0) - d * 0.5, y: (o.y ?? 0) - 6 });
      const pA2 = drift({}, 0.9), pB = off(oB), pB2 = drift(oB, 0.8), pC = off(oC), pC2 = drift(oC, 0.8), pD = off(oD), pD2 = drift(oD, 1.2);
      const lifted = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 24, rx: (a.rx + b.rx) / 2, ry: (a.ry + b.ry) / 2, rz: (a.rz + b.rz) / 2, lift: 1 });
      const inE = (x) => inCubic(x) * 0.6 + x * 0.4, outE = (x) => outBack(x, 1.4);
      const E = { x: A.x + cfg.E.dx, y: A.y + cfg.E.dy, rx: cfg.E.rx, ry: cfg.E.ry, rz: cfg.E.rz, lift: 0 };
      const Ev = (dry, drz, dy) => ({ ...E, ry: E.ry + dry, rz: E.rz + drz, y: E.y + dy });
      const P = TT.passes;
      // s10 placement
      let F1, P2;
      if (!V) { // phone 1 keeps its world position; the camera pulls back so it lands at s10.p1
        F1 = { x: E.x, y: E.y, ...s10.r1, lift: 0 };
        F10 = { x: F1.x - (s10.p1[0] - CX) / s10.s, y: F1.y - (s10.p1[1] - CY) / s10.s };
      } else { // camera barely moves; phone 1 slides up into the top slot
        F10 = { x: CX, y: CY };
        F1 = { x: F10.x + (s10.p1[0] - CX) / s10.s, y: F10.y + (s10.p1[1] - CY) / s10.s, ...s10.r1, lift: 0 };
      }
      P2 = { x: F10.x + (s10.p2[0] - CX) / s10.s, y: F10.y + (s10.p2[1] - CY) / s10.s, ...s10.r2, lift: 0 };
      const P2start = V ? { ...P2, y: P2.y + 1100, rx: 16, rz: -3 } : { ...P2, y: P2.y + 1500, rx: P2.rx + 20, rz: 5 };
      P1KEYS = [
        [15.0, { ...A }], [P[0][0], pA2, smooth],
        [(P[0][0] + P[0][1]) / 2, lifted(pA2, pB), inE], [P[0][1], pB, outE],
        [P[1][0], pB2, smooth], [(P[1][0] + P[1][1]) / 2, lifted(pB2, pC), inE], [P[1][1], pC, outE],
        [P[2][0], pC2, smooth], [(P[2][0] + P[2][1]) / 2, lifted(pC2, pD), inE], [P[2][1], pD, outE],
        [17.72, pD2, smooth], [18.15, E, inOutCubic], [19.0, Ev(1.2, -0.5, -6), smooth], [19.8, Ev(-0.6, 0.4, 4), smooth],
        [20.6, Ev(1.0, -0.4, -4), smooth], [TT.pull[0], Ev(0.2, 0, 0), smooth],
        [TT.pull[1], F1, inOutCubic], [23.1, { ...F1, ry: F1.ry - 0.8, y: F1.y - 6 }, smooth], [24.5, { ...F1, ry: F1.ry - 1.6, y: F1.y - 12 }, smooth],
      ];
      P2KEYS = [[TT.rise[0], P2start], [TT.rise[1], { ...P2, y: P2.y - 8 }, outQuint], [23.1, { ...P2, ry: P2.ry + 0.8, y: P2.y - 12 }, smooth], [24.5, { ...P2, ry: P2.ry + 1.6, y: P2.y - 16 }, smooth]];
      // camera keys up to the pull: {s, x, y} = scale and world point at the frame centre
      if (!V) {
        const yExit = 36, yVs = yOf(menu.b2, menu.page), yOn = yOf(menu.b3, menu.page), yDiff = yOf(st.diff.els[2], st.page);
        const sx = 1210, s9 = 0.8;
        CAMKEYS = [
          [15.0, { s: 1, x: CX, y: CY }], [17.35, { s: 1.015, x: CX, y: CY }, smoother], [17.72, { s: 1.035, x: CX, y: CY - 6 }, smooth],
          [18.15, frame(E, 186, yExit, sx, 150, s9), inOutCubic],
          [18.45, frame(E, 186, yExit + 20, sx, 150, s9 * 1.01), smooth],
          [18.8, frame(E, 186, yVs, sx, 600, s9), inOutCubic],
          [19.02, frame(E, 186, yVs, sx, 596, s9 * 1.008), smooth],
          [19.36, frame(E, 186, yDiff, sx, 600, s9), inOutCubic],
          [19.8, frame(E, 186, yDiff, sx, 592, s9 * 1.012), smooth],
          [20.18, frame(E, 186, 250, sx, 610, s9), inOutCubic],
          [20.82, frame(E, 186, 250, sx, 600, s9 * 1.02), smooth],
          [21.28, frame(E, 186, yOn, sx, 640, s9 * 1.01), inOutCubic],
        ];
      } else {
        CAMKEYS = [[15.0, { s: 1, x: CX, y: CY }], [17.35, { s: 1.015, x: CX, y: CY }, smoother], [17.72, { s: 1.03, x: CX, y: CY + 10 }, smooth],
          [18.15, { s: 1.0, x: CX, y: CY - 20 }, inOutCubic], [19.0, { s: 1.02, x: CX, y: CY - 30 }, smooth], [19.8, { s: 1.0, x: CX, y: CY - 10 }, inOutCubic],
          [20.6, { s: 1.025, x: CX, y: CY }, smooth], [TT.pull[0], { s: 1.0, x: CX, y: CY + 10 }, smooth]];
      }
    }
    buildKeys();

    let EDGE2W = null; // world midpoint & screen length of Leo's landed edge (solved after layout)
    function camKeysAt(t) {
      const ks = CAMKEYS;
      if (t <= ks[0][0]) return ks[0][1];
      for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) {
        const [t0, a] = ks[i - 1], [t1, b, e = smoother] = ks[i]; const k = e(seg(t, t0, t1));
        return { s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), k)), x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
      }
      return ks[ks.length - 1][1];
    }
    function camAt(t) {
      const c0 = camKeysAt(Math.min(t, TT.pull[0]));
      let c = c0;
      if (t > TT.pull[0]) {
        // pull: anchor phone 1 so its screen position travels straight while the scale changes (log)
        const k = inOutCubic(seg(t, TT.pull[0], TT.pull[1]));
        const s = Math.exp(lerp(Math.log(c0.s), Math.log(s10.s), k));
        if (!V) {
          const P1w = poseAt(TT.pull[0], P1KEYS);
          const a0 = { x: (P1w.x - c0.x) * c0.s + CX, y: (P1w.y - c0.y) * c0.s + CY };
          const scr = { x: lerp(a0.x, s10.p1[0], k), y: lerp(a0.y, s10.p1[1], k) };
          c = { s, x: P1w.x - (scr.x - CX) / s, y: P1w.y - (scr.y - CY) / s };
        } else c = { s, x: lerp(c0.x, F10.x, k), y: lerp(c0.y, F10.y, k) };
        if (t > TT.pull[1]) { // s10 settle: two eased pushes (speed changes at 22.9)
          const s1 = s10.s * lerp(1, 1.018, smoother(seg(t, TT.pull[1], 22.9))) * lerp(1, 1.03, smoother(seg(t, 22.9, TT.push[0])));
          c = { s: s1, x: F10.x, y: F10.y };
        }
      }
      if (t > TT.push[0] && EDGE2W) {
        // final push: Leo's edge midpoint travels to the frame centre, scaling until the edge is as long as L
        const cA = camAt(TT.push[0] - 1e-6); const M = EDGE2W.mid;
        const sB = cA.s * (L.x2 - L.x1) / EDGE2W.len;
        const mA = { x: (M.x - cA.x) * cA.s + CX, y: (M.y - cA.y) * cA.s + CY };
        const k = smoother(seg(t, TT.push[0], TT.push[1]));
        const s = Math.exp(lerp(Math.log(cA.s), Math.log(sB), k));
        const scr = { x: lerp(mA.x, CX, k), y: lerp(mA.y, CY, k) };
        c = { s, x: M.x - (scr.x - CX) / s, y: M.y - (scr.y - CY) / s };
      }
      return c;
    }

    // measuring (projected positions of DOM markers)
    const rootRect = () => layer.getBoundingClientRect();
    const center = (el) => { const r = el.getBoundingClientRect(), R = rootRect(); return { x: (r.left + r.right) / 2 - R.left, y: (r.top + r.bottom) / 2 - R.top }; };
    const mkMarker = (parent, p) => { const m = div('', parent); css(m, { position: 'absolute', left: p.x - 0.5 + 'px', top: p.y - 0.5 + 'px', width: '1px', height: '1px' }); return m; };
    const ends = (g, id) => { const e = g.board.edges.get(id); return [mkMarker(g.fx, boardToWrap(g, e.a)), mkMarker(g.fx, boardToWrap(g, e.b))]; };
    const E1 = ends(on1, onMove), E2 = ends(on2, onMove);

    // ---------------------------------------------------------------- render
    function render(t) {
      const cam = camAt(t);
      world.style.transform = `translate(${CX}px,${CY}px) scale(${cam.s}) translate(${-cam.x}px,${-cam.y}px)`;
      setPhone(ph1, poseAt(t, P1KEYS));
      setPhone(ph2, poseAt(t, P2KEYS), t < TT.rise[0] ? 0 : 1);
      navigate(NAV1, ['g4', 'menu', 'st', 'ai', 'lc', 'on1'], t);
      navigate(NAV2, ['lj', 'on2'], t);
      menu.animate(t);

      // ---- s08 pass & play (4×4 board; the four players take one side each of the same box)
      if (t < 18.7) {
        cfg.pre4.forEach(([id, pid]) => B4.setEdge(id, { p: 1, color: LINE[pid] }));
        const bursts = [];
        cfg.order.forEach((id, i) => { edgeDraw(B4, id, t, TT.snaps[i], LINE[pids[i]], { preview: i === 0 ? 14.9 : null }); bursts.push(...sparkBursts(B4, id, TT.snaps[i], LINE[pids[i]], 31 + i * 5)); });
        const cap = TT.snaps[3];
        B4.setBox(cfg.box, { p: t >= cap ? Board.fillP(t, cap) : 0, color: FILL.p4, opacity: 1, mark: 'S', markP: Board.markP(t, cap) });
        B4.boxes.get(cfg.box).fill.style.filter = `brightness(${1 + 0.12 * bump(t, cap + 0.05, 0.4)})`;
        bursts.push(...confetti(B4, cfg.box, cap + 0.02, 77));
        g4.sparks.draw(t, bursts);
        cardStates(g4.cards, TT.turns, t, [['p4', cap + 0.02, 0, 1]]);
        const taps = cfg.order.map((id, i) => { const m = boardToPage(g4, B4.edgeMid(id)); return { t0: i === 0 ? TT.miaTap : TT.snaps[i] - 0.07, x: m.x, y: m.y, r: 30 }; });
        taps.push(tapAt(g4.page, exitBtn(g4), TT.exit1, 30));
        rip.g4.draw(t, taps);
        const bc = boardToWrap(g4, B4.boxCenter(cfg.box));
        f4.draw(t, cap + 0.05, bc.x + B4.gap / 2 + 24, bc.y - B4.gap * 0.1);
        pill(g4.pill, t, cap + 0.1);
      }
      // ---- menu taps
      rip.menu.draw(t, [tapAt(menu.page, menu.b2, TT.menuVs, 38), tapAt(menu.page, menu.b3, TT.menuOn, 38)]);
      for (const [b, t0] of [[menu.b2, TT.menuVs], [menu.b3, TT.menuOn]]) { const bp = bump(t, t0 - 0.05, 0.24); b.style.transform = `translate(${bp * 2}px,${bp * 2}px)`; b.style.boxShadow = `${3 - 2 * bp}px ${3 - 2 * bp}px 0 rgba(56,53,47,0.16)`; }

      // ---- s09 setup → vs Computer
      if (t >= 18.8 && t < 20.2) {
        const [, med, hard] = st.diff.els; const sw = TT.hard + 0.03;
        med.classList.toggle('is-selected', t < sw); hard.classList.toggle('is-selected', t >= sw);
        hard.style.transform = `scale(${1 - 0.06 * bump(t, TT.hard - 0.06, 0.26) + 0.05 * bump(t, sw, 0.3)})`;
        rip.st.draw(t, [tapAt(st.page, hard, TT.hard, 32), tapAt(st.page, st.start, TT.start, 36)]);
        const bp = bump(t, TT.start - 0.05, 0.22);
        st.start.style.transform = `translate(${bp * 2}px,${bp * 2}px)`; st.start.style.boxShadow = `${3 - 2 * bp}px ${3 - 2 * bp}px 0 ${C.accentInk}`;
      }
      if (t >= 19.7 && t < 21.3) {
        const Bai = ai.board;
        aiPre.forEach(([id, pid]) => Bai.setEdge(id, { p: 1, color: LINE[pid] }));
        Bai.setBox('b_1_0', { p: 1, color: FILL.p1, opacity: 1, mark: 'M', markP: 1 });
        edgeDraw(Bai, aiMove, t, TT.aiSnap, LINE.p2);
        Bai.setBox(aiBox, { p: t >= TT.aiSnap ? Board.fillP(t, TT.aiSnap) : 0, color: FILL.p2, opacity: 1, mark: 'C', markP: Board.markP(t, TT.aiSnap) });
        Bai.boxes.get(aiBox).fill.style.filter = `brightness(${1 + 0.12 * bump(t, TT.aiSnap + 0.05, 0.4)})`;
        ai.sparks.draw(t, [...sparkBursts(Bai, aiMove, TT.aiSnap, LINE.p2, 91), ...confetti(Bai, aiBox, TT.aiSnap + 0.02, 101)]);
        cardStates(ai.cards, [[0, 'p2']], t, [['p2', TT.aiSnap + 0.02, 0, 1]]);
        ai.cards.p1.scoreEl.textContent = 1;
        const bc = boardToWrap(ai, Bai.boxCenter(aiBox));
        fAi.draw(t, TT.aiSnap + 0.05, bc.x - Bai.gap * 0.15, bc.y + Bai.gap * 0.85);
        pill(ai.pill, t, TT.aiSnap + 0.1);
        rip.ai.draw(t, [tapAt(ai.page, exitBtn(ai), TT.exit2, 30)]);
      }

      // ---- s10 lobby → online
      if (t < 21.3) { lc.box.style.opacity = 0; lc.act.style.opacity = 0; lc.wait.style.opacity = 0; lc.share.style.height = '0px'; }
      if (t >= 21.3) {
        const n = lc.letters.length;
        const cb = bump(t, TT.create - 0.05, 0.24);
        lc.createBtn.style.transform = `translate(${cb * 2}px,${cb * 2}px)`; lc.createBtn.style.boxShadow = `${3 - 2 * cb}px ${3 - 2 * cb}px 0 ${C.accentInk}`;
        rip.lc.draw(t, [tapAt(lc.page, lc.createBtn, TT.create, 36)]);
        const ks = seg(t, TT.codeShow, TT.codeShow + 0.16);
        lc.box.style.opacity = ks <= 0 ? 0 : 1; lc.box.style.transform = `scale(${ks <= 0 ? 0.9 : outBack(ks, 1.6) * 0.1 + 0.9})`;
        lc.act.style.opacity = smooth(seg(t, TT.codeShow + 0.04, TT.codeShow + 0.2));
        lc.letters.forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
        lc.wait.style.opacity = smooth(seg(t, TT.waitShow, TT.waitShow + 0.2));
        lc.share.style.height = SHARE_H * smoother(seg(t, TT.codeShow - 0.04, TT.codeShow + 0.26)) + 'px';
        lc.spin.style.transform = `rotate(${(t * 450) % 360}deg)`;
        const [y0, y1] = TT.type; const typed = t < y0 ? 0 : Math.min(n, 1 + Math.floor(((t - y0) / (y1 - y0)) * (n - 0.001)));
        const focused = t >= y0 - 0.2; const caretOn = Math.floor((t - 21.0) / 0.4) % 2 === 0 || (t >= y0 && t < y1 + 0.12);
        lj.input.innerHTML = (typed ? CODE.slice(0, typed) : (focused ? '' : '<span class="ph">ABC123</span>')) + (focused && caretOn && t < TT.joinTap ? '<span class="mx-caret"></span>' : '');
        lj.input.style.borderColor = focused ? C.accent : C.line; lj.input.style.background = focused ? '#fff' : C.paper;
        const bp = bump(t, TT.joinTap - 0.05, 0.24);
        lj.btn.style.transform = `translate(${bp * 2}px,${bp * 2}px)`; lj.btn.style.boxShadow = `${3 - 2 * bp}px ${3 - 2 * bp}px 0 ${C.accentInk}`;
        rip.lj.draw(t, [tapAt(lj.page, lj.btn, TT.joinTap, 36)]);
        // identical online boards: Mia's move lands on her board at her tap, on Leo's board when the stroke arrives
        for (const [g, host] of [[on1, true], [on2, false]]) {
          const Bo = g.board;
          onPre.forEach(([id, pid]) => Bo.setEdge(id, { p: 1, color: LINE[pid] }));
          const t0 = host ? TT.miaOnTap + 0.02 : TT.land;
          if (host) edgeDraw(Bo, onMove, t, t0, LINE.p1);
          else if (t >= t0 && t < TT.push[0]) Bo.setEdge(onMove, { p: 1, color: LINE.p1, w: Board.snapW(t, t0) });
          else Bo.clearEdge(onMove);
          g.sparks.draw(t, sparkBursts(Bo, onMove, t0, LINE.p1, host ? 141 : 151));
          cardStates(g.cards, [[0, 'p1'], [TT.land + 0.02, 'p2']], t);
        }
        const hm = boardToPage(on1, on1.board.edgeMid(onMove));
        rip.on1.draw(t, [{ t0: TT.miaOnTap, x: hm.x, y: hm.y, r: 26 }]);
      }

      // ---- the travelling edge (overlay): lifts off Mia's board, lands on Leo's, then becomes L
      penLine.style.display = greenLine.style.display = 'none'; trail.setAttribute('opacity', 0);
      const bursts = [];
      if (t >= TT.travel[0] && t < TT.land) {
        const a1 = center(E1[0]), b1 = center(E1[1]), a2 = center(E2[0]), b2 = center(E2[1]);
        const k = 1 - Math.pow(1 - seg(t, TT.travel[0], TT.travel[1]), 2.4); // ease-out
        const m1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 }, m2 = { x: (a2.x + b2.x) / 2, y: (a2.y + b2.y) / 2 };
        const h1 = Math.hypot(b1.x - a1.x, b1.y - a1.y) / 2, h2 = Math.hypot(b2.x - a2.x, b2.y - a2.y) / 2;
        const lift = 1 + 0.25 * Math.sin(Math.PI * k);
        let mx, my, ang;
        if (V) {
          // around the left margin, outside both phones: a cubic through the side gutter; the segment turns upright there
          const cx = -125, P0 = m1, P3 = m2, P1 = { x: cx, y: m1.y - 160 }, P2 = { x: cx, y: m2.y + 60 };
          const u = k, v = 1 - u;
          mx = v * v * v * P0.x + 3 * v * v * u * P1.x + 3 * v * u * u * P2.x + u * u * u * P3.x;
          my = v * v * v * P0.y + 3 * v * v * u * P1.y + 3 * v * u * u * P2.y + u * u * u * P3.y;
          ang = (Math.PI / 2) * Math.min(1, 1.5 * Math.sin(Math.PI * u));
        } else {
          mx = lerp(m1.x, m2.x, k); my = lerp(m1.y, m2.y, k) - 90 * Math.sin(Math.PI * k); ang = 0;
          trail.setAttribute('x1', m1.x); trail.setAttribute('y1', m1.y); trail.setAttribute('x2', mx); trail.setAttribute('y2', my);
          trail.setAttribute('stroke-width', 4 * Z * cam.s); trail.setAttribute('stroke-dasharray', `${6 * Z * cam.s} ${9 * Z * cam.s}`);
          trail.setAttribute('opacity', 0.55);
        }
        const hl = lerp(h1, h2, k) * lift;
        setLine(penLine, mx - Math.cos(ang) * hl, my - Math.sin(ang) * hl, mx + Math.cos(ang) * hl, my + Math.sin(ang) * hl, on1.board.stroke * Z * cam.s * lift, C.p1);
      }
      if (!V && t >= TT.land && t < TT.land + 0.3) { // the dotted trail fades from the origin toward the arrival
        const a1 = center(E1[0]), b1 = center(E1[1]), a2 = center(E2[0]), b2 = center(E2[1]); const f = smooth(seg(t, TT.land, TT.land + 0.3));
        const m1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 }, m2 = { x: (a2.x + b2.x) / 2, y: (a2.y + b2.y) / 2 };
        trail.setAttribute('x1', lerp(m1.x, m2.x, f)); trail.setAttribute('y1', lerp(m1.y, m2.y, f)); trail.setAttribute('x2', m2.x); trail.setAttribute('y2', m2.y);
        trail.setAttribute('opacity', 0.55 * (1 - f));
      }
      if (t >= TT.push[0]) {
        const a2 = center(E2[0]), b2 = center(E2[1]);
        const k = smoother(seg(t, TT.push[0], TT.push[1]));
        let x1 = lerp(a2.x, L.x1, k), y1 = lerp(a2.y, L.y, k), x2 = lerp(b2.x, L.x2, k), y2 = lerp(b2.y, L.y, k);
        let w = lerp(on2.board.stroke * Z * cam.s, L.w, smoother(seg(t, TT.push[0] + 0.04, TT.push[1])));
        if (t >= TT.push[1] - 1e-6) { x1 = L.x1; x2 = L.x2; y1 = y2 = L.y; w = L.w; }
        setLine(penLine, x1, y1, x2, y2, w, C.p1);
        // green ink re-draws the stroke from its left end (no colour mixing, so no teal)
        const g = smoother(seg(t, 24.02, 24.42));
        if (g > 0) setLine(greenLine, x1, y1, lerp(x1, x2, g), lerp(y1, y2, g), w + 0.5, C.p3);
      }
      ovSparks.draw(t, bursts);

      // ---- push: phones blur and fade, grid fades
      const pk = smooth(seg(t, TT.push[0], TT.push[0] + 0.4));
      world.style.opacity = 1 - pk; world.style.filter = pk > 0.001 ? `blur(${18 * pk}px)` : 'none';
      grid.style.opacity = 0.9 * (1 - smooth(seg(t, TT.push[0] - 0.1, TT.push[0] + 0.3)));

      // ---- headlines: s08 from the left (x) · s09 from below (y) · s10 from the right (x)
      // s08 → s09 → s10 hand straight over (outgoing leaves as the incoming starts; never both in one spot)
      hS08.els.forEach((e, i) => {
        const ki = outExpo(seg(t, 15.42 + i * 0.06, 15.98 + i * 0.06)); const ko = inCubic(seg(t, 18.2 + i * 0.03, 18.42 + i * 0.03));
        const dx = V ? -W * 1.1 : -760;
        e.style.transform = `translateX(${dx * (1 - ki) + dx * 1.2 * ko}px) skewX(${-8 * (1 - ki) * (ki > 0 ? 1 : 0) + 10 * ko}deg)`;
      });
      hS08.box.style.visibility = t < 15.42 || t > 18.48 ? 'hidden' : 'visible';
      {
        const kc = seg(t, 15.78, 16.18); const sc = kc <= 0 ? 0 : outBack(kc, 2.0); const kco = inCubic(seg(t, 18.16, 18.4));
        chipWrap.style.transform = `${V ? 'translateX(-50%) ' : ''}translateX(${(V ? -W : -700) * kco}px) scale(${sc})`;
        chipWrap.style.opacity = kc <= 0 ? 0 : clamp(kc * 3); chipWrap.style.visibility = kc <= 0 || kco >= 1 ? 'hidden' : 'visible';
      }
      hS09.els.forEach((e, i) => {
        const ki = outQuint(seg(t, 18.44 + i * 0.07, 18.92 + i * 0.07)); const ko = inCubic(seg(t, 20.68 + i * 0.04, 20.9 + i * 0.04));
        e.style.transform = `translateY(${105 * (1 - ki) - 110 * ko}%)`;
      });
      hS09.box.style.visibility = t < 18.44 || t > 20.98 ? 'hidden' : 'visible';
      // s10: 9:16 from the right at top centre; 16:9 from the left into the same left column as s08/s09
      hS10.els.forEach((e, i) => {
        const ki = outExpo(seg(t, 20.92 + i * 0.06, 21.42 + i * 0.06)); const ko = inCubic(seg(t, 23.66 + i * 0.03, 23.88 + i * 0.03));
        const dx = V ? W : -800;
        e.style.transform = `translate(${dx * (1 - ki)}px, ${-260 * ko}px) skewX(${(V ? 8 : -8) * (1 - ki) * (ki > 0 ? 1 : 0)}deg)`;
        e.style.opacity = 1 - ko;
      });
      hS10.box.style.visibility = t < 20.92 || t > 23.95 ? 'hidden' : 'visible';
    }
    function setLine(el, x1, y1, x2, y2, w, col) {
      el.style.display = ''; el.setAttribute('x1', x1); el.setAttribute('y1', y1); el.setAttribute('x2', x2); el.setAttribute('y2', y2);
      el.setAttribute('stroke-width', w); el.setAttribute('stroke', col);
    }

    // ---------------- solve handoff D: move pose A so Mia's first side sits on D at her tap
    {
      const mk = mkMarker(g4.fx, boardToWrap(g4, B4.edgeMid(cfg.order[0])));
      for (let i = 0; i < 4; i++) { render(TT.miaTap); const c = center(mk); const cam = camAt(TT.miaTap); A.x += (D.x - c.x) / cam.s; A.y += (D.y - c.y) / cam.s; buildKeys(); }
      mk.remove();
    }
    // ---------------- solve the push anchor: Leo's edge in world space just before the push
    {
      const tm = TT.push[0] - 1e-4; render(tm); const cam = camAt(tm);
      const a = center(E2[0]), b = center(E2[1]);
      const toWorld = (p) => ({ x: (p.x - CX) / cam.s + cam.x, y: (p.y - CY) / cam.s + cam.y });
      const A2 = toWorld(a), B2 = toWorld(b);
      EDGE2W = { mid: { x: (A2.x + B2.x) / 2, y: (A2.y + B2.y) / 2 }, len: Math.hypot(b.x - a.x, b.y - a.y) };
    }
    // debug hook for the checker (headline boxes vs phone outlines)
    window.__modesDbg = { render, heads: { s08: hS08.box, s09: hS09.box, s10: hS10.box, chip: chipWrap }, phones: [ph1.body, ph2.body] };
    return { render };
  },
};
