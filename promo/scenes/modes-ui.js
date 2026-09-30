// modes-ui.js — DOM builders for the `modes` module: one pen-and-paper phone and the game's real screens
// (game board, setup card, online lobby) at the game's native CSS sizes. The phone's inner body is scaled with
// CSS `zoom`, so text and borders are laid out (and rasterised) at the final size instead of being stretched.
// Nothing here reads a clock; all motion is applied by modes.js from film time.
import { C, LINE, TEXT, FILL, div, svg, css, playerCard, Board, Sparks, clamp, lerp, seg, smooth, outCubic, elastic } from '../shared/lib.js';

export const PHONE = { w: 400, h: 860, bezelX: 12, bezelY: 26 };
export const SCREEN = { w: PHONE.w - 2 * PHONE.bezelX - 4, h: PHONE.h - 2 * PHONE.bezelY - 4 }; // inner (inside 2px border)

let cssDone = false;
export function injectCSS() {
  if (cssDone) return; cssDone = true;
  const st = document.createElement('style');
  // Rules the game has in styles.css that tokens.css doesn't carry. Contrast: #6b655a replaces --ink-soft for text.
  st.textContent = `
.mx-phone { position:absolute; left:0; top:0; transform-origin:50% 50%; backface-visibility:hidden; }
.mx-body { position:relative; width:${PHONE.w}px; height:${PHONE.h}px; background:var(--card); border:2px solid var(--ink); border-radius:58px; }
.mx-speaker { position:absolute; top:10px; left:50%; width:62px; height:6px; margin-left:-31px; border-radius:4px; background:var(--ink); }
.mx-lens { position:absolute; top:8px; left:50%; margin-left:44px; width:10px; height:10px; border-radius:50%; background:var(--ink); box-shadow: inset 0 0 0 2px #5b5750; }
.mx-side { position:absolute; width:5px; border:2px solid var(--ink); background:var(--card); border-radius:3px; }
.mx-screen { position:absolute; left:${PHONE.bezelX}px; right:${PHONE.bezelX}px; top:${PHONE.bezelY}px; bottom:${PHONE.bezelY}px; border-radius:42px; background:var(--paper);
  border:2px solid var(--ink); overflow:hidden; isolation:isolate; }
.mx-page { position:absolute; left:0; top:0; width:${SCREEN.w}px; height:${SCREEN.h}px; padding:14px 14px; display:flex; flex-direction:column; background:var(--paper);
  background-image: radial-gradient(420px 300px at 50% -10%, rgba(255,255,255,0.6) 0%, transparent 60%); }
.mx-top { display:flex; align-items:center; justify-content:space-between; padding:4px; flex:none; }
.mx-title { font-family:var(--font-hand); font-size:18px; letter-spacing:1px; color:#6b655a; }
.mx-icon { width:40px; height:40px; border-radius:11px; border:2px solid var(--ink); background:var(--card); color:var(--ink); font-size:18px;
  box-shadow:2px 2px 0 rgba(56,53,47,0.14); display:flex; align-items:center; justify-content:center; font-family:var(--font-ui); font-weight:700; }
.mx-players { display:flex; flex-wrap:wrap; align-items:stretch; gap:8px; margin-top:10px; flex:none; }
.mx-players .player-card { flex:1 1 42%; }
.mx-players[data-count="2"] .player-card { flex-basis:45%; }
.mx-players[data-count="4"] .player-card { flex-basis:46%; padding:9px 11px; }
.mx-players[data-count="4"] .player-score { font-size:22px; }
.mx-players .player-score { display:inline-block; transform-origin: 0% 60%; }
.mx-boardwrap { position:relative; flex:none; display:flex; align-items:center; justify-content:center; margin-top:10px; }
.mx-boardwrap svg { display:block; }
.mx-pill { position:absolute; bottom:6px; left:50%; transform:translateX(-50%); opacity:0; }
.mx-bottom { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:auto; padding-top:2px; flex:none; }
.mx-emotes { display:flex; gap:6px; }
.mx-emotes span { width:42px; height:42px; border-radius:12px; border:2px solid var(--line); background:var(--card); font-size:20px; box-shadow:2px 2px 0 rgba(56,53,47,0.08);
  display:flex; align-items:center; justify-content:center; }
.mx-sharemini { padding:8px 12px; border-radius:12px; border:2px dashed var(--accent); background:var(--card); color:#6b655a; font-size:13px; font-weight:700; white-space:nowrap; }
.mx-sharemini b { color:var(--accent-ink); letter-spacing:2px; font-family:var(--font-hand); font-weight:400; font-size:15px; }
.mx-card { background:var(--card); border:2px solid var(--ink); border-radius:16px; box-shadow:5px 6px 0 rgba(56,53,47,0.13); padding:22px; position:relative; }
.mx-back { position:absolute; top:15px; left:16px; color:#6b655a; font-size:16px; font-family:var(--font-hand); }
.mx-h2 { text-align:center; margin:4px 0 20px; font-family:var(--font-hand); font-weight:400; font-size:30px; line-height:1.15; }
.mx-field { margin-bottom:18px; }
.mx-field .chips { flex-wrap:wrap; }
.mx-field .chip small { font-family:var(--font-ui); font-weight:600; font-size:11px; color:#6b655a; }
.mx-field .chip.is-selected small { color:var(--accent-ink); }
.mx-tabs { display:flex; gap:6px; margin:6px 0 18px; background:var(--paper); padding:5px; border-radius:12px; border:2px solid var(--line); }
.mx-tab { flex:1; padding:9px; border-radius:9px; color:#6b655a; font-family:var(--font-hand); font-size:17px; text-align:center; }
.mx-tab.is-active { background:var(--card); color:var(--ink); box-shadow:2px 2px 0 rgba(56,53,47,0.12); }
.mx-hint { color:#6b655a; font-size:14px; margin:0 0 16px; text-align:center; line-height:1.35; }
.mx-input { width:100%; padding:11px 14px; border:2px solid var(--line); border-radius:11px; background:var(--paper); color:var(--ink); font-family:var(--font-ui); font-size:15px; font-weight:700; min-height:45px; position:relative; }
.mx-code { text-align:center; letter-spacing:6px; font-size:24px; font-weight:800; text-transform:uppercase; font-family:var(--font-hand); padding:6px 14px; min-height:47px; }
.mx-code .ph { color:#9a9384; }
.mx-caret { display:inline-block; width:2px; height:26px; background:var(--accent); vertical-align:-5px; margin-left:1px; }
.mx-share { margin-top:18px; text-align:center; }
.mx-share .room-code-box { padding:12px 10px; }
.mx-share .room-code { display:inline-flex; letter-spacing:0; min-height:48px; justify-content:center; }
.mx-share .room-code span { display:inline-block; width:31px; text-align:center; transform-origin:50% 60%; }
.mx-actions { display:flex; gap:10px; margin:14px 0; }
.mx-actions .btn { background:transparent; box-shadow:none; border-style:dashed; padding:11px 10px; font-size:17px; }
.mx-wait { display:flex; align-items:center; justify-content:center; gap:10px; color:#6b655a; font-size:14px; margin-top:8px; }
.mx-spin { width:16px; height:16px; border:3px solid var(--line); border-top-color:var(--accent); border-radius:50%; }
.mx-link { color:#6b655a; font-size:14px; text-align:center; margin-top:16px; font-weight:700; }
.mx-ripple { position:absolute; left:0; top:0; width:0; height:0; pointer-events:none; }
.mx-ripple i { position:absolute; border-radius:50%; left:0; top:0; }
.mx-float { position:absolute; left:0; top:0; font-family:var(--font-title); font-weight:700; font-size:30px; white-space:nowrap; text-shadow:0 2px 3px rgba(255,255,255,0.8); opacity:0; }
.mx-headline { position:absolute; white-space:nowrap; }
.mx-mask { position:absolute; overflow:hidden; }
`;
  document.head.appendChild(st);
}

/** A phone: outer (frame px, carries the 3D transform) > zoom wrapper (native px) > body > screen > pages. */
export function buildPhone(parent, Z, id) {
  const outer = div('mx-phone', parent);
  css(outer, { width: PHONE.w * Z + 'px', height: PHONE.h * Z + 'px' });
  const zoom = div('', outer); zoom.style.zoom = Z;
  const body = div('mx-body', zoom);
  div('mx-speaker', body); div('mx-lens', body);
  // side buttons (drawn behind the body edge)
  const b1 = div('mx-side', zoom); css(b1, { left: '-5px', top: '170px', height: '64px', zIndex: -1 });
  const b2 = div('mx-side', zoom); css(b2, { left: '-5px', top: '250px', height: '64px', zIndex: -1 });
  const b3 = div('mx-side', zoom); css(b3, { right: '-5px', top: '200px', height: '96px', zIndex: -1 });
  zoom.style.position = 'relative';
  const screen = div('mx-screen', body);
  // markers for measuring projected points (edge mid-points of the body)
  const mk = (x, y) => { const m = div('', body); css(m, { position: 'absolute', left: x + 'px', top: y + 'px', width: '1px', height: '1px' }); return m; };
  const markers = { right: mk(PHONE.w - 2, PHONE.h / 2), left: mk(0, PHONE.h / 2), top: mk(PHONE.w / 2, 0), bottom: mk(PHONE.w / 2, PHONE.h - 3) };
  return { outer, zoom, body, screen, markers, Z, id };
}

function page(screen) { const p = div('mx-page', screen); return p; }

function topBar(p) {
  const t = div('mx-top', p);
  div('mx-icon', t, '‹');
  div('mx-title', t, 'DOTS &amp; BOXES');
  const s = div('mx-icon', t, '🔊'); s.style.fontSize = '17px';
  return t;
}

// ---------------------------------------------------------------- ripple / float / pill helpers
export function ripple(parent) {
  const r = div('mx-ripple', parent);
  const a = document.createElement('i'), b = document.createElement('i'), c = document.createElement('i');
  r.append(a, b, c);
  css(a, { background: 'rgba(63,111,216,0.20)' }); css(b, { border: '3px solid rgba(47,87,176,0.75)' }); css(c, { background: 'rgba(56,53,47,0.22)' });
  return {
    el: r,
    /** draw a tap at native point (x,y) at time t0 */
    draw(t, taps) {
      let on = null;
      for (const tp of taps) { const age = t - tp.t0; if (age >= -0.12 && age <= 0.55) on = { ...tp, age }; }
      if (!on) { r.style.display = 'none'; return; }
      r.style.display = 'block'; r.style.transform = `translate(${on.x}px,${on.y}px)`;
      const R = on.r ?? 34;
      // finger press: a soft dot that lands (age −0.12..0) and lifts (0..0.14)
      const press = on.age < 0 ? smooth(seg(on.age, -0.12, 0)) : 1 - smooth(seg(on.age, 0.04, 0.18));
      const pr = R * 0.42 * (0.8 + 0.2 * press);
      css(c, { width: 2 * pr + 'px', height: 2 * pr + 'px', left: -pr + 'px', top: -pr + 'px', opacity: press });
      const k = outCubic(seg(on.age, 0, 0.5));
      const ra = R * (0.3 + 0.9 * k);
      css(a, { width: 2 * ra + 'px', height: 2 * ra + 'px', left: -ra + 'px', top: -ra + 'px', opacity: on.age < 0 ? 0 : (1 - k) });
      const rb = R * (0.4 + 1.1 * k);
      css(b, { width: 2 * rb + 'px', height: 2 * rb + 'px', left: -rb + 'px', top: -rb + 'px', opacity: on.age < 0 ? 0 : (1 - k) * 0.9 });
    },
  };
}

/** The game's float-text (+1): float-up 1.3 s ease-out; 0–25 % scale .4→1.15 and rise to −70 %, then to −180 % fading out. */
export function floatText(parent, text, color) {
  const e = div('mx-float', parent, text); e.style.color = color;
  return {
    el: e,
    draw(t, t0, x, y) {
      const u = (t - t0) / 1.3;
      if (u < 0 || u > 1) { e.style.opacity = 0; return; }
      const eo = (v) => 1 - Math.pow(1 - v, 2.2); // ~ CSS ease-out per keyframe span
      let ty, sc, op;
      if (u < 0.25) { const k = eo(u / 0.25); ty = lerp(-50, -70, k); sc = lerp(0.4, 1.15, k); op = k; }
      else { const k = eo((u - 0.25) / 0.75); ty = lerp(-70, -180, k); sc = lerp(1.15, 1, k); op = 1 - k; }
      e.style.opacity = op;
      e.style.transform = `translate(${x}px,${y}px) translate(-50%,${ty}%) scale(${sc})`;
    },
  };
}

// ---------------------------------------------------------------- board helper (lib Board inside a page)
function makeBoard(wrap, { rows, cols, gap, id, stroke, dotR, pad = 26 }) {
  const w = (cols - 1) * gap + pad * 2, h = (rows - 1) * gap + pad * 2;
  const s = svg('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}` }, wrap);
  const board = new Board(s, { rows, cols, gap, x: pad, y: pad, id, stroke, dotR });
  const tw = Math.min(board.trackW, stroke * 0.55);
  board.tracks.forEach((tr) => tr.setAttribute('stroke-width', tw));
  const sparks = new Sparks(board.gFx, 40);
  return { svg: s, board, sparks, w, h, pad };
}

/**
 * Game screen. players: [{name,pid}], board: {rows, cols, gap, stroke, dotR}, boardH: fixed board-wrap height (or null = flex)
 */
export function gamePage(screen, { players, board, id, boardH = null, footer = 'emotes', roomCode = '' }) {
  const p = page(screen);
  topBar(p);
  const pl = div('mx-players', p); pl.dataset.count = players.length;
  const cards = {};
  for (const pp of players) cards[pp.pid] = playerCard(pl, { name: pp.name, pid: pp.pid, score: 0, active: false });
  for (const k in cards) { cards[k].badgeEl.style.opacity = 0; }
  const wrap = div('mx-boardwrap', p);
  if (boardH) wrap.style.height = boardH + 'px'; else { wrap.style.flex = '1'; }
  const B = makeBoard(wrap, { ...board, id });
  const pill = div('status-pill mx-pill', wrap, 'Bonus turn! 🔥');
  const fx = div('', wrap); css(fx, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', pointerEvents: 'none' });
  const bottom = div('mx-bottom', p);
  if (footer === 'emotes' || footer === 'both') { const em = div('mx-emotes', bottom); for (const e of ['👏', '😮', '🔥', '🏆', '😅']) { const s = document.createElement('span'); s.textContent = e; em.appendChild(s); } }
  if (footer === 'share' || footer === 'both') div('mx-sharemini', bottom, `Room: <b>${roomCode}</b>`);
  return { page: p, cards, wrap, ...B, pill, fx };
}

/** Convert a board point (svg px) to a point in the wrap's fx layer. */
export function boardToWrap(g, pt) {
  const wr = g.wrap; const W = wr.clientWidth, H = wr.clientHeight;
  return { x: (W - g.w) / 2 + pt.x, y: (H - g.h) / 2 + pt.y };
}

export function setupPage(screen) {
  const p = page(screen); p.style.padding = '14px 12px';
  const card = div('mx-card', p);
  div('mx-back', card, '‹ Back');
  div('mx-h2', card, 'Game Setup');
  const field = (label, chips, sel) => {
    const f = div('mx-field', card);
    div('field-label', f, label);
    const cs = div('chips', f); const els = [];
    chips.forEach((c, i) => { const e = div('chip' + (i === sel ? ' is-selected' : ''), cs, c); els.push(e); });
    return { f, els };
  };
  field('Board size', ['4×4 <small>9 boxes</small>', '5×5 <small>16 boxes</small>', '6×6 <small>25 boxes</small>', '7×7 <small>36 boxes</small>'], 1);
  field('Turn timer', ['Off', '10s', '15s', '30s'], 0);
  const diff = field('Computer difficulty', ['Easy', 'Medium', 'Hard'], 1);
  const start = div('btn btn--primary', card, 'Start Game →'); start.style.marginTop = '6px';
  const fx = div('', p); css(fx, { position: 'absolute', left: '0', top: '0' });
  return { page: p, card, diff, start, fx };
}

export function lobbyCreatePage(screen, code) {
  const p = page(screen); p.style.padding = '14px 12px';
  const card = div('mx-card', p); card.style.padding = '20px 18px';
  div('mx-back', card, '‹ Back');
  const tabs = div('mx-tabs', card); tabs.style.marginTop = '30px';
  div('mx-tab is-active', tabs, 'Create Room'); div('mx-tab', tabs, 'Join Room');
  div('mx-hint', card, 'Pick a board and create a room, then share the code or link with a friend.');
  const f1 = div('mx-field', card); div('field-label', f1, 'Board size');
  const cs = div('chips', f1); ['4×4', '5×5', '6×6', '7×7'].forEach((c, i) => { const e = div('chip' + (i === 1 ? ' is-selected' : ''), cs, c); e.style.minWidth = '0'; });
  const f2 = div('mx-field', card); div('field-label', f2, 'Your name'); div('mx-input', f2, 'Mia');
  div('btn btn--primary', card, 'Create Room');
  const share = div('mx-share', card);
  const box = div('room-code-box', share);
  div('room-code-label', box, 'Room code');
  const codeEl = div('room-code', box);
  const letters = code.split('').map((ch) => { const s = document.createElement('span'); s.textContent = ch; codeEl.appendChild(s); return s; });
  const act = div('mx-actions', share); div('btn', act, 'Copy code'); div('btn', act, 'Copy link');
  const wait = div('mx-wait', share); const spin = div('mx-spin', wait); div('', wait, 'Waiting for opponent to join…');
  return { page: p, card, letters, spin, box };
}

export function lobbyJoinPage(screen) {
  const p = page(screen); p.style.padding = '14px 12px';
  const card = div('mx-card', p); card.style.padding = '20px 18px';
  div('mx-back', card, '‹ Back');
  const tabs = div('mx-tabs', card); tabs.style.marginTop = '30px';
  div('mx-tab', tabs, 'Create Room'); div('mx-tab is-active', tabs, 'Join Room');
  div('mx-hint', card, 'Enter the 6-character code your friend shared.');
  const f1 = div('mx-field', card); div('field-label', f1, 'Room code');
  const input = div('mx-input mx-code', f1);
  const f2 = div('mx-field', card); div('field-label', f2, 'Your name'); div('mx-input', f2, 'Leo');
  const btn = div('btn btn--primary', card, 'Join Room');
  div('mx-link', card, '⚙ Connection settings');
  const fx = div('', p); css(fx, { position: 'absolute', left: '0', top: '0' });
  return { page: p, card, input, btn, fx };
}

/** Center of element `el` in the coordinates of `ref` (both inside the same zoomed page; offset-based, transform-free). */
export function localCenter(el, ref) {
  let x = el.offsetWidth / 2, y = el.offsetHeight / 2, n = el;
  while (n && n !== ref) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  return { x, y };
}

export { C, LINE, TEXT, FILL };
