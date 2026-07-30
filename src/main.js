// main.js — App orchestration: screens, modes, turn loop, FX, audio, network.

import { Game } from './engine.js';
import { chooseMove } from './ai.js';
import { BoardView } from './render.js';
import * as FX from './animations.js';
import { sfx, unlockAudio, toggleMuted, isMuted } from './audio.js';
import { Net, peerAvailable } from './net.js';

const COLORS = { p1: '#6d8bff', p2: '#ff6d9e' };
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---- app state ----------------------------------------------------------
const S = {
  mode: null,           // 'local' | 'ai' | 'online'
  role: null,           // 'host' | 'guest' | null
  game: null,           // authoritative (local/ai/host) or mirror (guest)
  view: null,           // BoardView
  config: { dots: 5, timer: 0, difficulty: 'medium' },
  names: { p1: 'Player 1', p2: 'Player 2' },
  myPlayer: 'p1',       // which player id this client controls (online)
  aiPlayer: 'p2',
  combo: 0,
  timerHandle: null,
  net: null,
  busy: false,          // input lock during animations / AI
};

// ---- screen navigation --------------------------------------------------
function show(id) {
  $$('.screen').forEach((s) => s.classList.remove('active'));
  $('#screen-' + id).classList.add('active');
}

function colorFor(id) { return COLORS[id] || '#7c5cff'; }
function markFor(id) {
  const n = S.names[id] || '';
  return (n.trim()[0] || (id === 'p1' ? '1' : '2')).toUpperCase();
}

// ===================================================================
// Setup / menu wiring
// ===================================================================
function initMenu() {
  $$('#screen-menu [data-mode]').forEach((b) =>
    b.addEventListener('click', () => {
      sfx.click(); unlockAudio();
      const mode = b.dataset.mode;
      if (mode === 'online') { openLobby(); return; }
      openSetup(mode);
    })
  );
  $('#how-to-btn').addEventListener('click', () => $('#howto-modal').hidden = false);
  $('#howto-close').addEventListener('click', () => $('#howto-modal').hidden = true);

  const sync = () => {
    const m = isMuted();
    $('#sound-menu').textContent = m ? '🔇' : '🔊';
    $('#sound-game').textContent = m ? '🔇' : '🔊';
  };
  $('#sound-menu').addEventListener('click', () => { unlockAudio(); toggleMuted(); sync(); });
  $('#sound-game').addEventListener('click', () => { unlockAudio(); toggleMuted(); sync(); });

  $$('.back-btn').forEach((b) => b.addEventListener('click', () => { sfx.click(); cleanupNet(); show(b.dataset.back); }));
}

function chipGroup(container, attr, onPick) {
  container.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    sfx.click();
    container.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-selected'));
    chip.classList.add('is-selected');
    onPick(chip.dataset[attr]);
  });
}
function selectedVal(container, attr) {
  const c = container.querySelector('.chip.is-selected');
  return c ? c.dataset[attr] : null;
}

function openSetup(mode) {
  S.mode = mode;
  $('#setup-title').textContent = mode === 'ai' ? 'Play vs Computer' : 'Pass & Play';
  $('#difficulty-field').hidden = mode !== 'ai';
  $('#name-p2-label').textContent = mode === 'ai' ? 'Computer' : 'Player 2';
  $('#name-p2').value = mode === 'ai' ? 'Computer' : '';
  $('#name-p2').disabled = mode === 'ai';
  $('#name2-wrap').style.opacity = mode === 'ai' ? 0.6 : 1;
  show('setup');
}

function initSetup() {
  chipGroup($('#size-chips'), 'dots', (v) => (S.config.dots = +v));
  chipGroup($('#timer-chips'), 'timer', (v) => (S.config.timer = +v));
  chipGroup($('#difficulty-chips'), 'diff', (v) => (S.config.difficulty = v));
  $('#setup-start').addEventListener('click', () => {
    sfx.click();
    S.names.p1 = ($('#name-p1').value.trim() || 'Player 1').slice(0, 14);
    S.names.p2 = S.mode === 'ai'
      ? 'Computer'
      : ($('#name-p2').value.trim() || 'Player 2').slice(0, 14);
    S.role = null;
    startGame();
  });
}

// ===================================================================
// Online lobby
// ===================================================================
function initLobby() {
  $$('.lobby-tabs .tab').forEach((t) =>
    t.addEventListener('click', () => {
      sfx.click();
      $$('.lobby-tabs .tab').forEach((x) => x.classList.remove('is-active'));
      $$('#screen-lobby .tab-pane').forEach((x) => x.classList.remove('is-active'));
      t.classList.add('is-active');
      $('#pane-' + t.dataset.tab).classList.add('is-active');
    })
  );
  chipGroup($('#online-size-chips'), 'dots', (v) => (S.config.dots = +v));
  $('#create-room-btn').addEventListener('click', createRoom);
  $('#join-room-btn').addEventListener('click', joinRoom);
  $('#copy-code-btn').addEventListener('click', () => copyText(S.net?.code, 'Code copied!'));
  $('#copy-link-btn').addEventListener('click', () => copyText(roomLink(S.net?.code), 'Link copied!'));
  $('#host-start-btn').addEventListener('click', () => {
    sfx.click();
    S.net.send({ t: 'start', config: S.config, hostName: S.names.p1 });
    beginOnlineGame();
  });
}

function openLobby() {
  if (!peerAvailable()) {
    alert('Online mode needs the PeerJS library, which failed to load (check your connection). You can still play Pass & Play and vs Computer.');
    return;
  }
  show('lobby');
}

function roomLink(code) {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '?room=' + encodeURIComponent(code || '');
  return url.toString();
}

async function createRoom() {
  if (!peerAvailable()) return;
  sfx.click();
  S.mode = 'online'; S.role = 'host'; S.myPlayer = 'p1';
  S.names.p1 = ($('#online-host-name').value.trim() || 'Host').slice(0, 14);
  $('#create-room-btn').disabled = true;
  $('#create-room-btn').textContent = 'Creating…';

  S.net = new Net();
  S.net
    .on('error', (err) => {
      banner('Connection error: ' + (err?.type || err?.message || 'unknown'), true);
      $('#create-room-btn').disabled = false;
      $('#create-room-btn').textContent = 'Create Room';
    })
    .on('data', onHostData)
    .on('peer', (ev) => {
      if (ev === 'close') { $('#host-waiting').innerHTML = '⚠️ Opponent left. Waiting again…'; $('#host-start-btn').hidden = true; }
    });

  try {
    const code = await S.net.hostRoom();
    $('#room-code').textContent = code;
    $('#share-mini-code').textContent = code;
    $('#room-share').hidden = false;
    $('#create-room-btn').style.display = 'none';
  } catch (e) {
    banner('Could not create room. Try again.', true);
    $('#create-room-btn').disabled = false;
    $('#create-room-btn').textContent = 'Create Room';
  }
}

function onHostData(msg) {
  if (!msg || !msg.t) return;
  if (msg.t === 'hello') {
    S.names.p2 = (msg.name || 'Guest').slice(0, 14);
    $('#host-waiting').innerHTML = `✅ <b>${escapeHtml(S.names.p2)}</b> joined!`;
    $('#host-start-btn').hidden = false;
    sfx.capture();
  } else if (msg.t === 'reqmove') {
    // Guest requests a move — validate authoritatively.
    if (S.game && !S.game.gameOver && S.game.currentPlayer === 'p2' && S.game.canMove(msg.edgeId)) {
      commitMove(msg.edgeId, true);
    }
  } else if (msg.t === 'emote') {
    showEmote(msg.emoji);
  } else if (msg.t === 'rematch') {
    doRematch();
  }
}

async function joinRoom() {
  if (!peerAvailable()) return;
  sfx.click();
  const code = ($('#join-code').value.trim().toUpperCase());
  if (code.length < 6) { banner('Enter the 6-character room code.', true); return; }
  S.mode = 'online'; S.role = 'guest'; S.myPlayer = 'p2';
  S.names.p2 = ($('#online-guest-name').value.trim() || 'Guest').slice(0, 14);
  $('#join-waiting').hidden = false;
  $('#join-status').textContent = 'Connecting…';
  $('#join-room-btn').disabled = true;

  S.net = new Net();
  S.net
    .on('error', () => { $('#join-status').textContent = 'Room not found or unavailable.'; $('#join-room-btn').disabled = false; })
    .on('data', onGuestData)
    .on('peer', (ev) => { if (ev === 'close') banner('Disconnected from host.', true); });

  try {
    await S.net.joinRoom(code);
    $('#join-status').textContent = 'Connected! Waiting for host to start…';
    S.net.send({ t: 'hello', name: S.names.p2 });
  } catch (e) {
    $('#join-status').textContent = 'Could not connect. Check the code and try again.';
    $('#join-room-btn').disabled = false;
  }
}

function onGuestData(msg) {
  if (!msg || !msg.t) return;
  if (msg.t === 'start') {
    S.config = msg.config;
    S.names.p1 = (msg.hostName || 'Host').slice(0, 14);
    beginOnlineGame();
  } else if (msg.t === 'move') {
    // Authoritative move from host — apply to mirror + animate.
    applyConfirmedMove(msg.edgeId);
  } else if (msg.t === 'emote') {
    showEmote(msg.emoji);
  } else if (msg.t === 'full') {
    banner('Room is full.', true);
  } else if (msg.t === 'rematch') {
    doRematch();
  }
}

function beginOnlineGame() {
  S.aiPlayer = null;
  startGame();
}

// ===================================================================
// Game lifecycle
// ===================================================================
function startGame() {
  const dots = S.config.dots;
  S.game = new Game({ rows: dots, cols: dots, players: ['p1', 'p2'] });
  S.combo = 0;
  S.busy = false;

  if (!S.view) {
    S.view = new BoardView($('#board'), {
      onEdge: onEdgeInput,
      colorFn: colorFor,
      markFn: markFor,
    });
  }
  S.view.mount(dots, dots);
  S.view.setInteractive(false);

  // Player card labels
  const you = S.mode === 'online' ? S.myPlayer : null;
  $('#p1-name').textContent = S.names.p1 + (you === 'p1' ? ' (You)' : '');
  $('#p2-name').textContent = S.names.p2 + (you === 'p2' ? ' (You)' : '');
  $('#p1-score').textContent = '0';
  $('#p2-score').textContent = '0';
  document.documentElement.style.setProperty('--p1', COLORS.p1);
  document.documentElement.style.setProperty('--p2', COLORS.p2);

  // Online room share chip
  $('#share-mini').hidden = S.mode !== 'online';
  if (S.mode === 'online') $('#share-mini-code').textContent = S.net?.code || '';

  // Timer visibility
  $('#timer-wrap').hidden = !(S.config.timer > 0);

  show('game');
  updateTurnUI();
  countdown(() => {
    S.view.setInteractive(true);
    beginTurn();
  });
}

function countdown(done) {
  const el = $('#countdown');
  const num = $('#countdown-num');
  const seq = ['3', '2', '1', 'GO!'];
  el.hidden = false;
  let i = 0;
  const step = () => {
    num.textContent = seq[i];
    num.style.animation = 'none';
    void num.offsetWidth;
    num.style.animation = '';
    if (seq[i] === 'GO!') sfx.go(); else sfx.countdown();
    i++;
    if (i < seq.length) setTimeout(step, 700);
    else setTimeout(() => { el.hidden = true; done(); }, 600);
  };
  step();
}

// Who controls the current player's input on this client?
function iControlCurrent() {
  if (S.game.gameOver) return false;
  const cur = S.game.currentPlayer;
  if (S.mode === 'local') return true;
  if (S.mode === 'ai') return cur !== S.aiPlayer;
  if (S.mode === 'online') return cur === S.myPlayer;
  return false;
}

function beginTurn() {
  updateTurnUI();
  if (S.game.gameOver) return;

  // AI turn?
  if (S.mode === 'ai' && S.game.currentPlayer === S.aiPlayer) {
    S.view.setInteractive(false);
    stopTimer();
    S.busy = true;
    const delay = 380 + Math.random() * 350;
    setTimeout(() => {
      const edge = chooseMove(S.game, S.config.difficulty);
      S.busy = false;
      if (edge) commitMove(edge, true);
    }, delay);
    return;
  }

  const myTurn = iControlCurrent();
  S.view.setInteractive(myTurn);
  startTimer(myTurn || (S.mode === 'online')); // guest also shows a visual timer
}

function onEdgeInput(edgeId) {
  if (S.busy || !S.game || S.game.gameOver) return;
  if (!S.game.canMove(edgeId)) { sfx.invalid(); return; }
  if (!iControlCurrent()) return;

  if (S.mode === 'online' && S.role === 'guest') {
    // Ask the host; wait for authoritative broadcast.
    S.net.send({ t: 'reqmove', edgeId });
    return;
  }
  commitMove(edgeId, true);
}

// Host/local/ai path: mutate authoritative game, animate, and broadcast.
function commitMove(edgeId, broadcast) {
  const result = S.game.makeMove(edgeId);
  if (!result.ok) return;
  if (broadcast && S.mode === 'online' && S.role === 'host') {
    S.net.send({ t: 'move', edgeId });
  }
  animateResult(result);
}

// Guest path: apply an already-validated move to the mirror game.
function applyConfirmedMove(edgeId) {
  if (!S.game || !S.game.canMove(edgeId)) return;
  const result = S.game.makeMove(edgeId);
  if (result.ok) animateResult(result);
}

// ---- animate a move result + advance the loop ---------------------------
function animateResult(result) {
  stopTimer();
  S.view.clearHover();
  S.view.drawEdge(result.edgeId, result.player, { animate: true });
  sfx.snap();

  const mid = S.view.edgeClient(result.edgeId);
  if (mid) FX.spark(mid.x, mid.y, colorFor(result.player), 8);

  if (result.completedBoxes.length) {
    S.combo += result.completedBoxes.length;
    result.completedBoxes.forEach((boxId, i) => {
      setTimeout(() => {
        S.view.fillBox(boxId, result.player, markFor(result.player), { animate: true });
        const c = S.view.boxClient(boxId);
        if (c) {
          FX.confettiBurst(c.x, c.y, undefined, 18);
          if (i === result.completedBoxes.length - 1) FX.floatText(c.x, c.y - 10, '+' + result.completedBoxes.length, { color: colorFor(result.player) });
        }
      }, i * 90);
    });
    sfx.capture();

    if (S.combo >= 2) {
      const c = mid || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      sfx.combo(S.combo);
      FX.floatText(c.x, c.y - 40, S.combo + 'x COMBO!', { color: colorFor(result.player), big: true, shake: true });
    }
    flashScore(result.player);
  } else {
    S.combo = 0;
  }

  updateScores();

  if (result.gameOver) {
    setTimeout(() => endGame(result.winner), 650);
    return;
  }

  if (!result.bonusTurn) {
    S.combo = 0;
    setTimeout(() => sfx.turn(), 120);
  } else {
    statusPill('Bonus turn! 🔥');
  }

  // Advance after the snap settles.
  setTimeout(beginTurn, result.bonusTurn ? 340 : 260);
}

// ===================================================================
// UI helpers
// ===================================================================
function updateScores() {
  $('#p1-score').textContent = S.game.scores.p1;
  $('#p2-score').textContent = S.game.scores.p2;
}
function flashScore(pid) {
  const el = $('#' + (pid === 'p1' ? 'p1' : 'p2') + '-score');
  el.style.animation = 'none'; void el.offsetWidth;
  el.style.animation = 'mark-pop 0.4s var(--ease-elastic)';
}
function updateTurnUI() {
  const cur = S.game.currentPlayer;
  $('#card-p1').classList.toggle('is-active', cur === 'p1' && !S.game.gameOver);
  $('#card-p2').classList.toggle('is-active', cur === 'p2' && !S.game.gameOver);
}
let pillTimer = null;
function statusPill(text) {
  const el = $('#status-pill');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(pillTimer);
  pillTimer = setTimeout(() => el.classList.remove('show'), 1200);
}

// ---- turn timer ---------------------------------------------------------
function startTimer(enforce) {
  stopTimer();
  const secs = S.config.timer;
  if (!secs) return;
  const wrap = $('#timer-wrap');
  const fill = $('#timer-fill');
  const txt = $('#timer-text');
  wrap.hidden = false;
  let remaining = secs;
  const tick = () => {
    const pct = Math.max(0, remaining / secs);
    fill.style.transform = `scaleX(${pct})`;
    txt.textContent = Math.ceil(remaining) + 's';
    wrap.classList.toggle('low', remaining <= Math.min(5, secs * 0.34));
    if (remaining <= 0) {
      stopTimer();
      if (enforce && iControlCurrent()) {
        // Auto-play a legal move so the game keeps flowing.
        const edge = chooseMove(S.game, 'medium');
        if (edge) {
          statusPill("Time! Auto-move ⏱");
          if (S.mode === 'online' && S.role === 'guest') S.net.send({ t: 'reqmove', edgeId: edge });
          else commitMove(edge, true);
        }
      }
      return;
    }
    remaining -= 0.1;
  };
  tick();
  S.timerHandle = setInterval(tick, 100);
}
function stopTimer() {
  if (S.timerHandle) { clearInterval(S.timerHandle); S.timerHandle = null; }
}

// ===================================================================
// End game / result
// ===================================================================
function endGame(winner) {
  stopTimer();
  S.view.setInteractive(false);
  updateTurnUI();

  const s1 = S.game.scores.p1, s2 = S.game.scores.p2;
  $('#res-p1 .rs-name').textContent = S.names.p1;
  $('#res-p2 .rs-name').textContent = S.names.p2;
  $('#res-p1 .rs-num').textContent = s1;
  $('#res-p2 .rs-num').textContent = s2;
  $('#res-p1').classList.toggle('win', winner === 'p1');
  $('#res-p2').classList.toggle('win', winner === 'p2');

  let title, trophy;
  if (winner === 'tie') { title = "It's a Tie!"; trophy = '🤝'; }
  else {
    const name = S.names[winner];
    title = `${name} Wins!`;
    trophy = '🏆';
  }
  $('#result-title').textContent = title;
  $('#trophy').textContent = trophy;

  // Victory wave over the winner's boxes, then confetti cannon.
  const winnerBoxes = [...S.game.boxes.entries()].filter(([, o]) => o === winner).map(([b]) => b);
  S.view.pulseBoxes(winnerBoxes.length ? winnerBoxes : [...S.game.boxes.keys()], 70);

  setTimeout(() => {
    show('result');
    if (winner === 'tie') { sfx.turn(); }
    else {
      const iWon = S.mode === 'ai' ? winner !== S.aiPlayer
        : S.mode === 'online' ? winner === S.myPlayer : true;
      if (iWon || S.mode === 'local') { sfx.victory(); FX.confettiCannon(); }
      else sfx.lose();
    }
  }, winnerBoxes.length * 70 + 500);
}

function initResult() {
  $('#result-menu-btn').addEventListener('click', () => { sfx.click(); cleanupNet(); FX.clearFX(); show('menu'); });
  $('#rematch-btn').addEventListener('click', () => {
    sfx.click();
    if (S.mode === 'online') {
      if (S.role === 'host') { S.net.send({ t: 'rematch' }); doRematch(); }
      else { S.net.send({ t: 'rematch' }); statusPill('Rematch requested…'); }
    } else doRematch();
  });
}
function doRematch() { FX.clearFX(); startGame(); }

// ===================================================================
// Emotes + network banner
// ===================================================================
function initEmotes() {
  $('#emotes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-emote]');
    if (!b) return;
    const emoji = b.dataset.emote;
    showEmote(emoji);
    if (S.mode === 'online' && S.net) S.net.send({ t: 'emote', emoji });
  });
  $('#exit-btn').addEventListener('click', () => {
    sfx.click(); stopTimer(); cleanupNet(); FX.clearFX(); show('menu');
  });
  $('#share-mini').addEventListener('click', () => copyText(roomLink(S.net?.code), 'Link copied!'));
}
function showEmote(emoji) {
  const layer = $('#emote-float');
  const el = document.createElement('div');
  el.className = 'emote-pop';
  el.textContent = emoji;
  el.style.left = (20 + Math.random() * 60) + '%';
  el.style.top = '65%';
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}
function banner(text, isErr) {
  const el = $('#net-banner');
  el.textContent = text;
  el.classList.toggle('err', !!isErr);
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.hidden = true), 3500);
}

// ===================================================================
// misc
// ===================================================================
function cleanupNet() {
  if (S.net) { try { S.net.close(); } catch (_) {} S.net = null; }
  S.role = null;
}
function copyText(text, okMsg) {
  if (!text) return;
  const done = () => { statusPill(okMsg); banner(okMsg); };
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => prompt('Copy:', text));
  else { prompt('Copy:', text); }
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function checkDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room');
  if (room) {
    openLobby();
    // switch to join tab, prefill
    $$('.lobby-tabs .tab').forEach((x) => x.classList.remove('is-active'));
    $$('#screen-lobby .tab-pane').forEach((x) => x.classList.remove('is-active'));
    document.querySelector('.tab[data-tab="join"]').classList.add('is-active');
    $('#pane-join').classList.add('is-active');
    $('#join-code').value = room.toUpperCase().slice(0, 6);
  }
}

// ---- boot ---------------------------------------------------------------
function boot() {
  FX.setupFX($('#fx-canvas'), $('#float-layer'));
  initMenu();
  initSetup();
  initLobby();
  initResult();
  initEmotes();
  // Unlock audio on first pointer interaction anywhere.
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  checkDeepLink();
}
boot();
