// ai.js — Bot opponent for Dots & Boxes.
//
// Strategy layers (difficulty scales how many are applied):
//   1. If a move completes a box, take it (greedy capture — chains handled by
//      the game loop which keeps calling us on bonus turns).
//   2. Otherwise prefer a "safe" edge: one that does NOT leave any box with
//      exactly 3 sides (which would gift it to the opponent).
//   3. If no safe move exists, make the least-damaging sacrifice by opening
//      the smallest available chain (hard), else random among forced moves.
//
// Difficulty:
//   'easy'   — 55% of the time plays a pure random legal move; otherwise greedy
//              capture only. Frequently gives away boxes.
//   'medium' — always captures, always avoids gifting when possible; random
//              among safe moves; random sacrifice when forced.
//   'hard'   — captures, avoids gifting, and when forced sacrifices into the
//              smallest chain to minimise the opponent's haul.

import { Game } from './engine.js';

function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Edges whose placement immediately completes at least one box. */
function capturingEdges(game, edges) {
  return edges.filter((e) => {
    for (const boxId of game.boxesForEdge(e)) {
      if (!game.boxes.has(boxId) && game.boxSideCount(boxId) === 3) return true;
    }
    return false;
  });
}

/** Edges that do NOT create a 3-sided box (safe — don't hand a box away). */
function safeEdges(game, edges) {
  return edges.filter((e) => {
    for (const boxId of game.boxesForEdge(e)) {
      // After drawing e, would this box have exactly 3 sides?
      if (!game.boxes.has(boxId) && game.boxSideCount(boxId) === 2) return false;
    }
    return true;
  });
}

/**
 * Estimate how many boxes the opponent could immediately sweep if we play the
 * given (sacrificial) edge. Used by 'hard' to pick the smallest sacrifice.
 * Simulates on a clone: play edge, then greedily let the opponent capture.
 */
function sacrificeCost(game, edge) {
  const clone = Game.fromSnapshot(game.snapshot());
  const before = totalCaptured(clone);
  clone.makeMove(edge); // our move; may flip turn to opponent
  // Greedily capture as the opponent until no free box remains.
  let guard = 0;
  while (guard++ < 500) {
    const avail = clone.availableEdges();
    const caps = capturingEdges(clone, avail);
    if (caps.length === 0) break;
    clone.makeMove(caps[0]);
  }
  return totalCaptured(clone) - before;
}

function totalCaptured(game) {
  return game.boxes.size;
}

/**
 * Choose an edge id for the current player.
 * @param {Game} game
 * @param {'easy'|'medium'|'hard'} difficulty
 * @param {() => number} [rng]
 * @returns {string|null}
 */
export function chooseMove(game, difficulty = 'medium', rng = Math.random) {
  const avail = game.availableEdges();
  if (avail.length === 0) return null;

  // Layer 1: capture if we can.
  const caps = capturingEdges(game, avail);
  if (caps.length > 0) {
    if (difficulty === 'easy' && rng() < 0.35) {
      // Easy sometimes fumbles an obvious capture.
      return shuffle(avail.slice(), rng)[0];
    }
    return shuffle(caps.slice(), rng)[0];
  }

  // Easy: mostly random once there's nothing to capture.
  if (difficulty === 'easy' && rng() < 0.55) {
    return shuffle(avail.slice(), rng)[0];
  }

  // Layer 2: prefer safe edges.
  const safe = safeEdges(game, avail);
  if (safe.length > 0) {
    return shuffle(safe.slice(), rng)[0];
  }

  // Layer 3: forced to sacrifice.
  if (difficulty === 'hard') {
    let best = null;
    let bestCost = Infinity;
    for (const e of shuffle(avail.slice(), rng)) {
      const cost = sacrificeCost(game, e);
      if (cost < bestCost) {
        bestCost = cost;
        best = e;
      }
    }
    if (best) return best;
  }

  return shuffle(avail.slice(), rng)[0];
}
