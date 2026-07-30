// render.js — SVG board rendering + pointer input for Dots & Boxes.
//
// Draws crisp dots, faint edge "tracks", drawn edges, and box fills with an
// invisible 44px hit area over every edge (PRD non-functional requirement).
// Exposes primitives that main.js orchestrates alongside FX + audio.

import { Game } from './engine.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const GAP = 64; // distance between dots (viewBox units)
const PAD = 44; // padding around the grid
const DOT_R = 5;
const HIT = 26; // half-thickness of the invisible hit area (>= 44px target on screen)

export class BoardView {
  /**
   * @param {SVGSVGElement} svg
   * @param {object} opts
   * @param {(edgeId:string)=>void} opts.onEdge  click/tap on an undrawn edge
   * @param {(edgeId:string|null)=>void} [opts.onHover]
   * @param {(id:string)=>string} [opts.colorFn]  playerId -> css color
   * @param {(id:string)=>string} [opts.markFn]   playerId -> short mark text
   */
  constructor(svg, { onEdge, onHover, colorFn, markFn } = {}) {
    this.svg = svg;
    this.onEdge = onEdge || (() => {});
    this.onHover = onHover || (() => {});
    this.colorFn = colorFn || (() => '#7c5cff');
    this.markFn = markFn || ((id) => id[0].toUpperCase());
    this.interactive = true;
    this._edgeEls = new Map(); // edgeId -> line element (visible)
    this._hitEls = new Map(); // edgeId -> hit line element
    this._boxFill = new Map(); // boxId -> circle element
    this._boxMark = new Map(); // boxId -> text element
    this._hoverEdge = null;
  }

  setInteractive(v) {
    this.interactive = !!v;
    this.svg.classList.toggle('board--locked', !this.interactive);
  }

  /** Build the whole board DOM for a rows x cols dot grid. */
  mount(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this._edgeEls.clear();
    this._hitEls.clear();
    this._boxFill.clear();
    this._boxMark.clear();
    this._hoverEdge = null;

    const W = (cols - 1) * GAP + PAD * 2;
    const H = (rows - 1) * GAP + PAD * 2;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);

    const defs = el('defs');
    // Subtle "hand-drawn" wobble for the pen strokes + dots (not the hit areas,
    // so clicks stay precise). Gives the board a pencil-on-paper character.
    const rough = el('filter', { id: 'rough', x: '-5%', y: '-5%', width: '110%', height: '110%' });
    rough.appendChild(el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.018', numOctaves: '2', seed: '7', result: 'noise' }));
    rough.appendChild(el('feDisplacementMap', { in: 'SourceGraphic', in2: 'noise', scale: '1.4', xChannelSelector: 'R', yChannelSelector: 'G' }));
    defs.appendChild(rough);

    const gBoxes = group('layer-boxes');
    const gTracks = group('layer-tracks');
    const gEdges = group('layer-edges');
    const gDots = group('layer-dots');
    const gHit = group('layer-hit');
    gTracks.setAttribute('filter', 'url(#rough)');
    gEdges.setAttribute('filter', 'url(#rough)');
    gDots.setAttribute('filter', 'url(#rough)');

    const dot = (r, c) => ({ x: c * GAP + PAD, y: r * GAP + PAD });

    // Box fills (behind everything), each clipped to its cell for a radial fill.
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const boxId = `b_${r}_${c}`;
        const p = dot(r, c);
        const clipId = `clip_${boxId}`;
        const clip = el('clipPath', { id: clipId });
        clip.appendChild(
          el('rect', { x: p.x, y: p.y, width: GAP, height: GAP, rx: 6 })
        );
        defs.appendChild(clip);

        const g = el('g', { 'clip-path': `url(#${clipId})` });
        const circle = el('circle', {
          cx: p.x + GAP / 2,
          cy: p.y + GAP / 2,
          r: 0,
          class: 'box-fill',
        });
        g.appendChild(circle);
        gBoxes.appendChild(g);
        this._boxFill.set(boxId, circle);

        const mark = el('text', {
          x: p.x + GAP / 2,
          y: p.y + GAP / 2,
          class: 'box-mark',
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
        });
        gBoxes.appendChild(mark);
        this._boxMark.set(boxId, mark);
      }
    }

    const addEdge = (edgeId, x1, y1, x2, y2) => {
      const track = el('line', {
        x1, y1, x2, y2, class: 'edge-track',
      });
      gTracks.appendChild(track);

      const line = el('line', {
        x1, y1, x2, y2, class: 'edge', 'data-edge': edgeId,
      });
      gEdges.appendChild(line);
      this._edgeEls.set(edgeId, line);

      const hit = el('line', {
        x1, y1, x2, y2,
        class: 'edge-hit',
        'data-edge': edgeId,
        'stroke-width': HIT,
        'stroke-linecap': 'round',
      });
      gHit.appendChild(hit);
      this._hitEls.set(edgeId, hit);
    };

    // Horizontal edges.
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = dot(r, c);
        const b = dot(r, c + 1);
        addEdge(`h_${r}_${c}`, a.x, a.y, b.x, b.y);
      }
    }
    // Vertical edges.
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        const a = dot(r, c);
        const b = dot(r + 1, c);
        addEdge(`v_${r}_${c}`, a.x, a.y, b.x, b.y);
      }
    }

    // Dots on top of tracks/edges.
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p = dot(r, c);
        gDots.appendChild(
          el('circle', { cx: p.x, cy: p.y, r: DOT_R, class: 'dot' })
        );
      }
    }

    this.svg.appendChild(defs);
    this.svg.appendChild(gBoxes);
    this.svg.appendChild(gTracks);
    this.svg.appendChild(gEdges);
    this.svg.appendChild(gDots);
    this.svg.appendChild(gHit);

    this._wireInput(gHit);
  }

  _wireInput(gHit) {
    const edgeFromEvent = (e) => {
      const t = e.target;
      return t && t.getAttribute ? t.getAttribute('data-edge') : null;
    };
    gHit.addEventListener('pointermove', (e) => {
      const id = edgeFromEvent(e);
      if (id !== this._hoverEdge) this._setHover(id);
    });
    gHit.addEventListener('pointerleave', () => this._setHover(null));
    gHit.addEventListener('pointerdown', (e) => {
      const id = edgeFromEvent(e);
      if (!id) return;
      if (!this.interactive) return;
      const line = this._edgeEls.get(id);
      if (line && line.classList.contains('edge--drawn')) return;
      e.preventDefault();
      this.onEdge(id);
    });
  }

  _setHover(id) {
    // Clear old.
    if (this._hoverEdge) {
      const prev = this._edgeEls.get(this._hoverEdge);
      if (prev) prev.classList.remove('edge--preview');
    }
    this._hoverEdge = null;
    if (!id || !this.interactive) {
      this.onHover(null);
      return;
    }
    const line = this._edgeEls.get(id);
    if (line && !line.classList.contains('edge--drawn')) {
      line.classList.add('edge--preview');
      this._hoverEdge = id;
      this.onHover(id);
    } else {
      this.onHover(null);
    }
  }

  clearHover() {
    this._setHover(null);
  }

  /** Mark an edge as drawn in the given player's colour. */
  drawEdge(edgeId, playerId, { animate = true } = {}) {
    const line = this._edgeEls.get(edgeId);
    if (!line) return;
    line.classList.remove('edge--preview');
    line.classList.add('edge--drawn');
    line.style.stroke = this.colorFn(playerId);
    if (animate) {
      line.classList.remove('edge--placing');
      // force reflow so the animation restarts
      void line.getBBox;
      requestAnimationFrame(() => line.classList.add('edge--placing'));
    }
  }

  /** Fill a captured box + drop the owner's mark. */
  fillBox(boxId, playerId, markText, { animate = true } = {}) {
    const circle = this._boxFill.get(boxId);
    const mark = this._boxMark.get(boxId);
    const color = this.colorFn(playerId);
    if (circle) {
      circle.style.fill = color;
      const coverR = GAP * 0.85;
      if (animate) {
        circle.setAttribute('r', 0);
        requestAnimationFrame(() => circle.setAttribute('r', coverR));
      } else {
        circle.setAttribute('r', coverR);
      }
    }
    if (mark) {
      mark.textContent = markText != null ? markText : this.markFn(playerId);
      mark.style.fill = '#fff';
      if (animate) {
        mark.classList.remove('box-mark--pop');
        requestAnimationFrame(() => mark.classList.add('box-mark--pop'));
      } else {
        mark.classList.add('box-mark--pop');
      }
    }
  }

  /** Redraw the entire board state from a Game (no animation). */
  syncFromGame(game) {
    for (const edgeId of this._edgeEls.keys()) {
      const line = this._edgeEls.get(edgeId);
      if (game.edges.has(edgeId)) {
        // We don't know which player drew historic edges from the set alone;
        // main.js drives per-move drawing, so this is only used for full
        // restores where colour precision isn't critical — use neutral.
        line.classList.add('edge--drawn');
      }
    }
    for (const [boxId, owner] of game.boxes.entries()) {
      this.fillBox(boxId, owner, this.markFn(owner), { animate: false });
    }
  }

  /** Viewport (client) coords of an edge midpoint — for spark FX. */
  edgeClient(edgeId) {
    const line = this._edgeEls.get(edgeId) || this._hitEls.get(edgeId);
    if (!line) return null;
    const r = line.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /** Viewport (client) coords of a box centre — for confetti / combo text. */
  boxClient(boxId) {
    const c = this._boxFill.get(boxId);
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /** Wave-pulse a set of boxes (victory celebration). */
  pulseBoxes(boxIds, step = 90) {
    boxIds.forEach((boxId, i) => {
      const circle = this._boxFill.get(boxId);
      if (!circle) return;
      setTimeout(() => {
        circle.classList.remove('box-fill--pulse');
        void circle.getBBox;
        requestAnimationFrame(() => circle.classList.add('box-fill--pulse'));
      }, i * step);
    });
  }
}

// ---- tiny SVG helpers ---------------------------------------------------

function el(name, attrs = {}) {
  const e = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
function group(cls) {
  return el('g', { class: cls });
}
