// lib.js — shared, deterministic helpers for every scene.
// Rule: nothing here reads a clock. Every visual is a pure function of film time t.

export const C = {
  paper: '#f7f2e7', paper2: '#f1ead9', card: '#fffdf7', ink: '#38352f', inkSoft: '#857f72', inkText2: '#6b655a',
  line: '#e3dbc8', track: '#d8cfb8', dot: '#4a463d', accent: '#3f6fd8', accentInk: '#2f57b0',
  p1: '#2f6bd8', p2: '#e0496b', p3: '#23a06b', p4: '#e88a24',
  p2Deep: '#c8385c', p3Deep: '#1c7f53', p4Deep: '#a85d15', pencil: '#8a8478',
};
// Colour a player's box fill takes when a white mark sits on it (>= 4.5:1).
export const FILL = { p1: C.p1, p2: C.p2Deep, p3: C.p3Deep, p4: C.p4Deep };
// Colour a player's name / score takes as TEXT on paper or card (>= 4.5:1).
export const TEXT = { p1: C.accentInk, p2: C.p2Deep, p3: C.p3Deep, p4: C.p4Deep };
export const LINE = { p1: C.p1, p2: C.p2, p3: C.p3, p4: C.p4 };

// ---------- maths ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const seg = (t, a, b) => clamp((t - a) / (b - a)); // 0..1 progress of t through [a,b]
export const smooth = (x) => x * x * (3 - 2 * x);
export const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
export const outCubic = (x) => 1 - Math.pow(1 - x, 3);
export const inCubic = (x) => x * x * x;
export const inOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const outQuint = (x) => 1 - Math.pow(1 - x, 5);
export const inQuint = (x) => x ** 5;
export const inOutQuint = (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2);
export const outExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const inExpo = (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10));
export const outBack = (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
export const outElastic = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1);
// the game's --ease-elastic cubic-bezier(0.175, 0.885, 0.32, 1.275), sampled
export function cssBezier(p1x, p1y, p2x, p2y) {
  const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
  const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
  const sx = (u) => ((ax * u + bx) * u + cx) * u, sy = (u) => ((ay * u + by) * u + cy) * u;
  const dx = (u) => (3 * ax * u + 2 * bx) * u + cx;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let u = x; for (let i = 0; i < 8; i++) { const e = sx(u) - x; const d = dx(u); if (Math.abs(e) < 1e-6 || !d) break; u -= e / d; }
    return sy(clamp(u));
  };
}
export const elastic = cssBezier(0.175, 0.885, 0.32, 1.275);
// Piecewise keyframes: keys = [[t, value], ...] (sorted); ease applied per span.
export function keys(t, ks, ease = smoother) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (t <= ks[i][0]) { const [t0, v0] = ks[i - 1], [t1, v1] = ks[i]; const k = ease(seg(t, t0, t1)); return Array.isArray(v0) ? v0.map((v, j) => lerp(v, v1[j], k)) : lerp(v0, v1, k); }
  }
  return ks[ks.length - 1][1];
}

// ---------- deterministic randomness ----------
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- DOM helpers ----------
const SVGNS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs = {}, parent) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
export function div(cls = '', parent, html = '', style = {}) { const e = document.createElement('div'); if (cls) e.className = cls; if (html) e.innerHTML = html; Object.assign(e.style, style); if (parent) parent.appendChild(e); return e; }
export function css(el, o) { for (const k in o) el.style[k] = o[k]; }
export function setT(el, { x = 0, y = 0, s = 1, sx, sy, r = 0, o } = {}) { el.style.transform = `translate(${x}px,${y}px) rotate(${r}deg) scale(${sx ?? s},${sy ?? s})`; if (o !== undefined) el.style.opacity = o; }

// ---------- the board (geometry identical to src/render.js; GAP is a parameter) ----------
// Edge ids: h_r_c (row r, between col c and c+1), v_r_c (col c, between row r and r+1). Box ids: b_r_c.
export class Board {
  /**
   * @param {SVGElement} parent  an <svg> or <g> in film pixel space
   * @param {{rows:number, cols:number, gap:number, x:number, y:number, style?:'app'|'paper', dotR?:number, stroke?:number, rough?:boolean, id?:string}} o
   *        x,y = pixel position of dot (0,0)
   */
  constructor(parent, o) {
    if (!o.id) throw new Error('Board needs a stable id (used for SVG filter/clip ids)');
    Object.assign(this, { style: 'app', rough: true }, o);
    const k = this.gap / 64; // the game's viewBox units → px
    this.k = k;
    this.dotR = o.dotR ?? 5 * k * 1.0;
    this.stroke = o.stroke ?? 6.5 * k;
    this.trackW = 3.5 * k;
    this.g = svg('g', { class: 'board' }, parent);
    const defs = svg('defs', {}, this.g);
    if (this.rough) {
      const f = svg('filter', { id: this.id + '-rough', x: '-5%', y: '-5%', width: '110%', height: '110%' }, defs);
      svg('feTurbulence', { type: 'fractalNoise', baseFrequency: String(0.018 / k), numOctaves: '2', seed: '7', result: 'noise' }, f);
      svg('feDisplacementMap', { in: 'SourceGraphic', in2: 'noise', scale: String(1.4 * k), xChannelSelector: 'R', yChannelSelector: 'G' }, f);
    }
    const flt = this.rough ? `url(#${this.id}-rough)` : null;
    this.gBoxes = svg('g', {}, this.g); this.gTracks = svg('g', flt ? { filter: flt } : {}, this.g);
    this.gEdges = svg('g', flt ? { filter: flt } : {}, this.g); this.gDots = svg('g', flt ? { filter: flt } : {}, this.g);
    this.gMarks = svg('g', {}, this.g); this.gFx = svg('g', {}, this.g);
    this.edges = new Map(); this.boxes = new Map(); this.tracks = new Map();
    const G = this.gap;
    for (let r = 0; r < this.rows - 1; r++) for (let c = 0; c < this.cols - 1; c++) {
      const id = `b_${r}_${c}`, p = this.dot(r, c);
      const clip = svg('clipPath', { id: `${this.id}-clip-${id}` }, defs);
      svg('rect', { x: p.x, y: p.y, width: G, height: G, rx: 6 * k }, clip);
      const g = svg('g', { 'clip-path': `url(#${this.id}-clip-${id})` }, this.gBoxes);
      const fill = svg('circle', { cx: p.x + G / 2, cy: p.y + G / 2, r: 0 }, g);
      const hatch = svg('path', { d: '', fill: 'none', stroke: C.pencil, 'stroke-width': 2.2 * k, 'stroke-linecap': 'round', opacity: 0 }, g);
      const mark = svg('text', { x: p.x + G / 2, y: p.y + G / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central',
        'font-family': 'Caveat', 'font-weight': 700, 'font-size': 34 * k, fill: '#fff', opacity: 0 }, this.gMarks);
      this.boxes.set(id, { fill, hatch, mark, cx: p.x + G / 2, cy: p.y + G / 2 });
    }
    const addEdge = (id, a, b) => {
      const tr = svg('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: C.track, 'stroke-width': this.trackW, 'stroke-linecap': 'round' }, this.gTracks);
      const ln = svg('line', { x1: a.x, y1: a.y, x2: a.x, y2: a.y, stroke: 'transparent', 'stroke-width': this.stroke, 'stroke-linecap': 'round' }, this.gEdges);
      this.tracks.set(id, tr); this.edges.set(id, { el: ln, a, b });
    };
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols - 1; c++) addEdge(`h_${r}_${c}`, this.dot(r, c), this.dot(r, c + 1));
    for (let r = 0; r < this.rows - 1; r++) for (let c = 0; c < this.cols; c++) addEdge(`v_${r}_${c}`, this.dot(r, c), this.dot(r + 1, c));
    this.dots = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) { const p = this.dot(r, c); this.dots.push(svg('circle', { cx: p.x, cy: p.y, r: this.dotR, fill: C.dot }, this.gDots)); }
  }
  dot(r, c) { return { x: this.x + c * this.gap, y: this.y + r * this.gap }; }
  get width() { return (this.cols - 1) * this.gap; }
  get height() { return (this.rows - 1) * this.gap; }
  edgeMid(id) { const e = this.edges.get(id); return { x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2 }; }
  boxCenter(id) { const b = this.boxes.get(id); return { x: b.cx, y: b.cy }; }
  static boxEdges(id) { const [, r, c] = id.split('_').map(Number); return [`h_${r}_${c}`, `h_${r + 1}_${c}`, `v_${r}_${c}`, `v_${r}_${c + 1}`]; }
  /** Draw an edge. p = 0..1 how much of it is drawn (from end a unless reverse). width multiplier w (the snap). dash = preview style. */
  setEdge(id, { p = 1, color = C.inkSoft, w = 1, dash = false, dashOffset = 0, opacity = 1, reverse = false } = {}) {
    const e = this.edges.get(id); if (!e) return;
    const { a, b } = e; const s = reverse ? b : a, f = reverse ? a : b;
    e.el.setAttribute('x1', s.x); e.el.setAttribute('y1', s.y);
    e.el.setAttribute('x2', lerp(s.x, f.x, p)); e.el.setAttribute('y2', lerp(s.y, f.y, p));
    e.el.setAttribute('stroke', p <= 0 ? 'transparent' : color);
    e.el.setAttribute('stroke-width', this.stroke * w);
    e.el.setAttribute('opacity', opacity);
    if (dash) { e.el.setAttribute('stroke-dasharray', `${5 * this.k} ${7 * this.k}`); e.el.setAttribute('stroke-dashoffset', dashOffset * this.k); }
    else e.el.removeAttribute('stroke-dasharray');
  }
  clearEdge(id) { this.setEdge(id, { p: 0 }); }
  /** Radial capture fill (the game's liquid fill: r 0 → 0.85·GAP, cubic-bezier(0.22,1,0.36,1) over 0.42 s). */
  setBox(id, { p = 1, color = C.p1, opacity = 1, mark = '', markP = 1 } = {}) {
    const b = this.boxes.get(id); if (!b) return;
    b.fill.setAttribute('r', this.gap * 0.85 * clamp(p)); b.fill.setAttribute('fill', color); b.fill.setAttribute('opacity', opacity);
    b.mark.textContent = mark;
    const mp = clamp(markP); const sc = mp <= 0 ? 0.5 : mp < 0.6 ? lerp(0.5, 1.2, mp / 0.6) : lerp(1.2, 1, (mp - 0.6) / 0.4);
    b.mark.setAttribute('opacity', mark ? clamp(mp / 0.6) : 0);
    b.mark.setAttribute('transform', `translate(${b.cx} ${b.cy}) scale(${sc}) translate(${-b.cx} ${-b.cy})`);
  }
  /** Pencil hatching inside a box (paper style capture). p = 0..1 strokes drawn. */
  setHatch(id, p) {
    const b = this.boxes.get(id); const G = this.gap, n = 7, pad = G * 0.16; const x0 = b.cx - G / 2 + pad, y0 = b.cy - G / 2 + pad, s = G - 2 * pad;
    let d = ''; const m = Math.floor(clamp(p) * n + 1e-6), part = clamp(p) * n - m;
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; const k = i < m ? 1 : i === m ? part : 0; if (k <= 0) continue;
      const ax = x0, ay = y0 + u * s, bx = x0 + u * s, by = y0; // diagonal strokes from the left edge up to the top edge
      d += `M${ax + (bx - ax) * 0},${ay} L${lerp(ax, bx, k)},${lerp(ay, by, k)} `; }
    b.hatch.setAttribute('d', d); b.hatch.setAttribute('opacity', d ? 0.9 : 0);
  }
  /** Game's fill timing helper: returns radius progress for a capture that started at t0. */
  static fillP(t, t0) { return fillEase(seg(t, t0, t0 + 0.42)); }
  static markP(t, t0) { return seg(t, t0 + 0.05, t0 + 0.45); }
  /** Line "snap" width (game: 0.24 s, width 2 → 10 → 6.5 of 6.5). */
  static snapW(t, t0) { const u = seg(t, t0, t0 + 0.24); if (u <= 0) return 2 / 6.5; if (u < 0.45) return lerp(2, 10, elastic(u / 0.45)) / 6.5; return lerp(10, 6.5, smooth((u - 0.45) / 0.55)) / 6.5; }
}
export const fillEase = cssBezier(0.22, 1, 0.36, 1);

// ---------- sparks (deterministic particles, the game's endpoint sparks) ----------
export class Sparks {
  constructor(parent, n = 14) { this.g = svg('g', {}, parent); this.pool = []; for (let i = 0; i < n; i++) this.pool.push(svg('circle', { r: 0 }, this.g)); }
  /** bursts: [{t0, x, y, color, seed, n, speed, size}] — drawn at film time t */
  draw(t, bursts) {
    let i = 0;
    for (const b of bursts) {
      const age = t - b.t0; if (age < 0 || age > (b.life ?? 0.5)) continue;
      const R = rng(b.seed ?? 1); const n = b.n ?? 7; const L = b.life ?? 0.5;
      for (let j = 0; j < n && i < this.pool.length; j++, i++) {
        const ang = R() * Math.PI * 2, sp = (b.speed ?? 260) * (0.5 + R() * 0.8), sz = (b.size ?? 5) * (0.6 + R() * 0.7);
        const k = outCubic(clamp(age / L)); const e = this.pool[i];
        e.setAttribute('cx', b.x + Math.cos(ang) * sp * L * k * 0.5); e.setAttribute('cy', b.y + Math.sin(ang) * sp * L * k * 0.5 + 40 * k * k);
        e.setAttribute('r', sz * (1 - k)); e.setAttribute('fill', b.color);
      }
    }
    for (; i < this.pool.length; i++) this.pool[i].setAttribute('r', 0);
  }
}

// ---------- HTML components ----------
export function playerCard(parent, { name, pid, score = 0, active = false, badge = 'TURN' }) {
  const el = div('player-card' + (active ? ' is-active' : ''), parent);
  el.style.setProperty('--pc', LINE[pid]); el.style.setProperty('--pct', TEXT[pid]);
  el.innerHTML = `<span class="player-dot"></span><span class="player-meta"><span class="player-name">${name}</span><span class="player-score">${score}</span></span><span class="active-badge">${badge}</span>`;
  const badgeEl = el.querySelector('.active-badge'); badgeEl.style.opacity = active ? 1 : 0;
  return { el, scoreEl: el.querySelector('.player-score'), badgeEl,
    setActive(on) { el.classList.toggle('is-active', !!on); badgeEl.style.opacity = on ? 1 : 0; },
    setScore(n) { this.scoreEl.textContent = n; } };
}

/** Big display word: wraps text in a span so scenes can move it. */
export function word(parent, text, { size = 160, x = 0, y = 0, align = 'left', color = C.ink, font = 'cv', weight } = {}) {
  const e = div(font, parent, text);
  css(e, { position: 'absolute', left: x + 'px', top: y + 'px', fontSize: size + 'px', color, transformOrigin: align === 'right' ? '100% 50%' : align === 'center' ? '50% 50%' : '0% 50%' });
  if (weight) e.style.fontWeight = weight;
  if (align === 'right') { e.style.left = 'auto'; e.style.right = x + 'px'; }
  return e;
}
