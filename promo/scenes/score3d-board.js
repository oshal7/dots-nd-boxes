// score3d-board.js — the final 5×5 board (from shared/game.json), drawn with lib.js `Board`,
// as live SVG (for the 2D handoff reference) or rasterised to a canvas (texture of the 3D slab's top face).
import { Board, FILL, LINE, C, svg } from '../shared/lib.js';

let _game = null;
export async function loadGame() {
  if (!_game) _game = await (await fetch(new URL('../shared/game.json', import.meta.url))).json();
  return _game;
}

/** Final state: edge → drawer, box → owner, capture order (the real order boxes were won). */
export function finalState(game) {
  const edges = new Map(), owner = new Map(), order = [];
  for (const e of game.E0) edges.set(e.edge, e.by);
  for (const m of game.moves) { edges.set(m.edge, m.by); for (const b of m.completed) { owner.set(b, m.by); order.push(b); } }
  return { edges, owner, order, marks: { p1: game.players.p1.mark, p2: game.players.p2.mark } };
}

/** Draw the final board into `parent` (an <svg> or <g> in film pixel space). */
export function drawFinalBoard(parent, st, c, { id = 'score3d-board', fills = true } = {}) {
  const b = new Board(parent, { rows: 5, cols: 5, gap: c.gap, x: c.x, y: c.y, id });
  for (const [e, by] of st.edges) b.setEdge(e, { p: 1, color: LINE[by], w: 1 });
  if (fills) for (const [bx, o] of st.owner) b.setBox(bx, { p: 1, color: FILL[o], opacity: 0.82, mark: st.marks[o], markP: 1 });
  return b;
}

let _fontCss = null;
async function fontCss() {
  if (_fontCss) return _fontCss;
  const buf = await (await fetch(new URL('../vendor/fonts/caveat-latin-700-normal.woff2', import.meta.url))).arrayBuffer();
  let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  _fontCss = `@font-face{font-family:'Caveat';font-weight:700;src:url(data:font/woff2;base64,${btoa(s)}) format('woff2');}`;
  return _fontCss;
}

/**
 * Rasterise the board region [x0, x0+S]×[y0, y0+S] (film px) to a canvas of S·q texels, paper background.
 * The SVG keeps film-pixel user units, so the rough filter's noise lands on the same user coordinates as on screen.
 */
export async function boardCanvas(st, c, { x0, y0, S, q, fills }) {
  const N = Math.round(S * q);
  const root = svg('svg', { xmlns: 'http://www.w3.org/2000/svg', width: N, height: N, viewBox: `${x0} ${y0} ${S} ${S}` });
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style'); style.textContent = await fontCss(); root.appendChild(style);
  svg('rect', { x: x0 - 10, y: y0 - 10, width: S + 20, height: S + 20, fill: C.paper }, root);
  drawFinalBoard(root, st, c, { id: 'score3d-tex' + (fills ? 'A' : 'B'), fills });
  const txt = new XMLSerializer().serializeToString(root);
  const url = URL.createObjectURL(new Blob([txt], { type: 'image/svg+xml' }));
  const img = new Image(); img.src = url; await img.decode();
  const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
  const g = cv.getContext('2d'); g.fillStyle = C.paper; g.fillRect(0, 0, N, N); g.drawImage(img, 0, 0, N, N);
  URL.revokeObjectURL(url);
  return cv;
}
