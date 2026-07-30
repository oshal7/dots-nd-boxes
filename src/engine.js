// engine.js — Pure Dots & Boxes game logic. No DOM, fully deterministic.
//
// Board geometry (PRD §2.1): a grid of dots sized rows x cols (dots).
//   - Horizontal edges: rows * (cols - 1)
//   - Vertical edges:   (rows - 1) * cols
//   - Total edges:      2*rows*cols - rows - cols
//   - Boxes:            (rows - 1) * (cols - 1)
//
// Edge IDs:
//   Horizontal edge on dot-row r between dot-cols c and c+1  -> "h_r_c"
//     valid: 0 <= r < rows,      0 <= c < cols-1
//   Vertical   edge on dot-col c between dot-rows r and r+1  -> "v_r_c"
//     valid: 0 <= r < rows-1,    0 <= c < cols
//
// Box IDs: top-left dot (r,c) -> "b_r_c",  0 <= r < rows-1, 0 <= c < cols-1
//   The four edges of box b_r_c are:
//     top    = h_r_c
//     bottom = h_(r+1)_c
//     left   = v_r_c
//     right  = v_r_(c+1)

export class Game {
  /**
   * @param {object} opts
   * @param {number} opts.rows  number of dot rows (>=2)
   * @param {number} opts.cols  number of dot cols (>=2)
   * @param {string[]} [opts.players] player ids, defaults to ["p1","p2"]
   */
  constructor({ rows, cols, players = ['p1', 'p2'] } = {}) {
    this.rows = rows;
    this.cols = cols;
    this.players = players.slice();
    this.reset();
  }

  reset() {
    /** @type {Set<string>} drawn edges */
    this.edges = new Set();
    /** @type {Map<string,string>} boxId -> ownerId */
    this.boxes = new Map();
    /** @type {Object<string,number>} */
    this.scores = {};
    for (const p of this.players) this.scores[p] = 0;
    this.currentIndex = 0;
    this.gameOver = false;
    this.winner = null; // playerId, or "tie", or null while playing
    this.moveCount = 0;
  }

  get currentPlayer() {
    return this.players[this.currentIndex];
  }

  // ---- geometry helpers -------------------------------------------------

  totalEdges() {
    return 2 * this.rows * this.cols - this.rows - this.cols;
  }

  totalBoxes() {
    return (this.rows - 1) * (this.cols - 1);
  }

  /** Return all valid edge ids for the current board. */
  allEdges() {
    const out = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols - 1; c++) out.push(`h_${r}_${c}`);
    }
    for (let r = 0; r < this.rows - 1; r++) {
      for (let c = 0; c < this.cols; c++) out.push(`v_${r}_${c}`);
    }
    return out;
  }

  /** Remaining (undrawn) edges. */
  availableEdges() {
    return this.allEdges().filter((e) => !this.edges.has(e));
  }

  /** Parse an edge id into {type,r,c}. Returns null if malformed. */
  static parseEdge(edgeId) {
    const m = /^([hv])_(\d+)_(\d+)$/.exec(edgeId);
    if (!m) return null;
    return { type: m[1], r: parseInt(m[2], 10), c: parseInt(m[3], 10) };
  }

  isValidEdgeId(edgeId) {
    const p = Game.parseEdge(edgeId);
    if (!p) return false;
    if (p.type === 'h') {
      return p.r >= 0 && p.r < this.rows && p.c >= 0 && p.c < this.cols - 1;
    }
    return p.r >= 0 && p.r < this.rows - 1 && p.c >= 0 && p.c < this.cols;
  }

  /** The 4 edge ids surrounding box b_r_c. */
  static boxEdges(r, c) {
    return [`h_${r}_${c}`, `h_${r + 1}_${c}`, `v_${r}_${c}`, `v_${r}_${c + 1}`];
  }

  /** The (up to 2) box ids that a given edge borders. */
  boxesForEdge(edgeId) {
    const p = Game.parseEdge(edgeId);
    if (!p) return [];
    const out = [];
    if (p.type === 'h') {
      // horizontal edge h_r_c borders box above (r-1,c) and below (r,c)
      if (p.r - 1 >= 0) out.push(`b_${p.r - 1}_${p.c}`);
      if (p.r < this.rows - 1) out.push(`b_${p.r}_${p.c}`);
    } else {
      // vertical edge v_r_c borders box left (r,c-1) and right (r,c)
      if (p.c - 1 >= 0) out.push(`b_${p.r}_${p.c - 1}`);
      if (p.c < this.cols - 1) out.push(`b_${p.r}_${p.c}`);
    }
    return out;
  }

  /** How many of a box's edges are currently drawn (0..4). */
  boxSideCount(boxId) {
    const m = /^b_(\d+)_(\d+)$/.exec(boxId);
    if (!m) return 0;
    const r = parseInt(m[1], 10);
    const c = parseInt(m[2], 10);
    let n = 0;
    for (const e of Game.boxEdges(r, c)) if (this.edges.has(e)) n++;
    return n;
  }

  // ---- core move --------------------------------------------------------

  canMove(edgeId) {
    return (
      !this.gameOver &&
      this.isValidEdgeId(edgeId) &&
      !this.edges.has(edgeId)
    );
  }

  /**
   * Apply a move for the current player.
   * @returns {{ok:boolean, reason?:string, edgeId?:string, player?:string,
   *   completedBoxes?:string[], bonusTurn?:boolean, nextTurn?:string,
   *   gameOver?:boolean, winner?:string|null}}
   */
  makeMove(edgeId) {
    if (this.gameOver) return { ok: false, reason: 'game-over' };
    if (!this.isValidEdgeId(edgeId)) return { ok: false, reason: 'invalid-edge' };
    if (this.edges.has(edgeId)) return { ok: false, reason: 'edge-taken' };

    const player = this.currentPlayer;
    this.edges.add(edgeId);
    this.moveCount++;

    // Determine which of the adjacent boxes got completed by THIS edge.
    const completedBoxes = [];
    for (const boxId of this.boxesForEdge(edgeId)) {
      if (!this.boxes.has(boxId) && this.boxSideCount(boxId) === 4) {
        this.boxes.set(boxId, player);
        this.scores[player] += 1;
        completedBoxes.push(boxId);
      }
    }

    // End condition: all edges filled.
    const gameOver = this.edges.size >= this.totalEdges();
    let bonusTurn = false;
    if (gameOver) {
      this.gameOver = true;
      this.winner = this._computeWinner();
    } else if (completedBoxes.length > 0) {
      // Chain rule (PRD §2.2): completing a box grants an immediate bonus turn.
      bonusTurn = true;
    } else {
      this.currentIndex = (this.currentIndex + 1) % this.players.length;
    }

    return {
      ok: true,
      edgeId,
      player,
      completedBoxes,
      bonusTurn,
      nextTurn: this.currentPlayer,
      gameOver: this.gameOver,
      winner: this.winner,
    };
  }

  _computeWinner() {
    let best = -1;
    let winners = [];
    for (const p of this.players) {
      const s = this.scores[p];
      if (s > best) {
        best = s;
        winners = [p];
      } else if (s === best) {
        winners.push(p);
      }
    }
    return winners.length === 1 ? winners[0] : 'tie';
  }

  /** Serializable snapshot for network sync / persistence. */
  snapshot() {
    return {
      rows: this.rows,
      cols: this.cols,
      players: this.players.slice(),
      edges: [...this.edges],
      boxes: [...this.boxes.entries()],
      scores: { ...this.scores },
      currentIndex: this.currentIndex,
      gameOver: this.gameOver,
      winner: this.winner,
      moveCount: this.moveCount,
    };
  }

  /** Restore from a snapshot() payload. */
  static fromSnapshot(s) {
    const g = new Game({ rows: s.rows, cols: s.cols, players: s.players });
    g.edges = new Set(s.edges);
    g.boxes = new Map(s.boxes);
    g.scores = { ...s.scores };
    g.currentIndex = s.currentIndex;
    g.gameOver = s.gameOver;
    g.winner = s.winner;
    g.moveCount = s.moveCount || 0;
    return g;
  }
}
