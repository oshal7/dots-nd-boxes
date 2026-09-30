// game-script.mjs — the film's gameplay, validated by the REAL game engine (../../src/engine.js)
// and finished by the REAL bot (../../src/ai.js). Writes shared/game.json, which every scene reads,
// so every score, bonus turn and combo on screen is what the product would actually show.
//
// Run: node tools/game-script.mjs
import { Game } from '../../src/engine.js';
import { chooseMove } from '../../src/ai.js';
import { writeFileSync } from 'node:fs';

const rngFor = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// Pre-drawn lines at the start of the film (pencil on paper), with who drew them.
// Chosen so: no box is complete, only b_1_1 has 3 sides (Mia closes it in shot 1), and a 5-box chain
// b_2_1 → b_2_2 → b_2_3 → b_3_3 → b_3_2 is waiting to be opened.
const E0 = [
  ['h_1_1', 'p1'], ['v_1_1', 'p2'], ['h_2_1', 'p1'],           // b_1_1: 3 sides (right side v_1_2 is the pen stroke)
  ['h_3_1', 'p2'],                                               // b_2_1 walls (top h_2_1 shared)
  ['h_2_2', 'p2'], ['h_3_2', 'p1'],                              // b_2_2 walls
  ['h_2_3', 'p1'], ['v_2_4', 'p2'],                              // b_2_3 walls
  ['h_4_3', 'p2'], ['v_3_4', 'p1'],                              // b_3_3 walls
  ['h_4_2', 'p1'],                                               // b_3_2 wall (top h_3_2 shared)
  ['h_0_0', 'p2'], ['v_0_3', 'p1'], ['h_0_3', 'p2'], ['v_1_4', 'p1'], ['h_4_0', 'p2'], ['v_3_0', 'p1'], ['v_0_0', 'p2'],
];
// The on-screen moves, in order.
const SCRIPT = [
  { shot: 's01', edge: 'v_1_2', by: 'p1', note: 'pen stroke closes b_1_1' },
  { shot: 's03', edge: 'h_0_1', by: 'p1', note: "Mia's bonus-turn line (safe)" },
  { shot: 's03', edge: 'v_2_1', by: 'p2', note: "Leo's line leaves b_2_1 with 3 sides" },
  { shot: 's04', edge: 'v_2_2', by: 'p1', note: 'Mia closes b_2_1' },
  { shot: 's05', edge: 'v_2_3', by: 'p1' },
  { shot: 's05', edge: 'h_3_3', by: 'p1' },
  { shot: 's05', edge: 'v_3_3', by: 'p1' },
  { shot: 's05', edge: 'v_3_2', by: 'p1' },
];

function run(seed) {
  const g = new Game({ rows: 5, cols: 5, players: ['p1', 'p2'] });
  for (const [e] of E0) g.edges.add(e);
  // validate E0: no completed boxes, only b_1_1 at 3 sides
  const three = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const n = g.boxSideCount(`b_${r}_${c}`); if (n === 4) throw new Error('E0 completes a box'); if (n === 3) three.push(`b_${r}_${c}`); }
  if (three.join() !== 'b_1_1') throw new Error('E0 3-sided boxes: ' + three);
  g.currentIndex = 0; // Mia to move
  const moves = []; let combo = 0;
  const apply = (edge, meta = {}) => {
    const by = g.currentPlayer;
    if (meta.by && meta.by !== by) throw new Error(`${edge}: expected ${meta.by} to move, engine says ${by}`);
    const res = g.makeMove(edge);
    if (!res || res.ok === false) throw new Error('illegal ' + edge + ' ' + JSON.stringify(res));
    const done = res.completedBoxes || [];
    combo = done.length ? combo + done.length : 0; // main.js: S.combo += n; reset when no bonus turn
    const comboText = done.length && combo >= 2 ? `${combo}x COMBO!` : null;
    moves.push({ ...meta, edge, by, completed: done, bonus: !!res.bonusTurn, combo: done.length ? combo : 0, comboText,
      plusText: done.length ? '+' + done.length : null, scores: { ...g.scores }, next: g.currentPlayer, over: g.gameOver });
    if (!res.bonusTurn) combo = 0;
  };
  for (const m of SCRIPT) apply(m.edge, m);
  // finish the game with the real bot (Hard for Leo, Easy for Mia), with a seeded rng passed in
  const R = rngFor(seed);
  while (!g.gameOver) apply(chooseMove(g, g.currentPlayer === 'p2' ? 'hard' : 'easy', R), { shot: 'fill', auto: true });
  return { g, moves };
}

let pick = null;
for (let seed = 1; seed < 5000 && !pick; seed++) {
  const { g, moves } = run(seed);
  if (g.scores.p1 === 10 && g.scores.p2 === 6 && g.winner === 'p1') pick = { seed, g, moves };
}
if (!pick) throw new Error('no seed gives 10–6');
const { seed, g, moves } = pick;
const out = { board: { rows: 5, cols: 5 }, players: { p1: { name: 'Mia', mark: 'M' }, p2: { name: 'Leo', mark: 'L' } },
  seed, E0: E0.map(([edge, by]) => ({ edge, by })), moves, final: { scores: g.scores, winner: g.winner, resultText: 'Mia Wins!' } };
writeFileSync(new URL('../shared/game.json', import.meta.url), JSON.stringify(out, null, 1));
console.log('seed', seed, 'final', g.scores, 'moves', moves.length);
for (const m of moves.filter((m) => !m.auto)) console.log(m.shot, m.by, m.edge, 'done', m.completed.join(','), 'bonus', m.bonus, m.comboText || '', m.plusText || '', JSON.stringify(m.scores));
