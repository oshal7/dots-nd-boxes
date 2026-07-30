// main.js — App orchestration: screens, modes, turn loop, FX, audio, network.

import { Game } from './engine.js';
import { chooseMove } from './ai.js';
import { BoardView } from './render.js';
import * as FX from './animations.js';
import { sfx, unlockAudio, toggleMuted, isMuted } from './audio.js';
import { Net, peerAvailable } from './net.js';

// Up to 4 distinct player colours.
const COLORS = { p1: '#6d8bff', p2: '#ff6d9e', p3: '#43d17a', p4: '#f5a53b' };
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---- app state ----------------------------------------------------------
const S = {
  mode: null,            // 'local' | 'ai' | 'online'
  role: null,            // 'host' | 'guest' | null
  game: null,            // authoritative (local/ai/host) or mirror (guest)
  view: null,            // BoardView
  config: { dots: 5, timer: 0, difficulty: 'medium' },
  playerCount: 2,        // 2..4 (local only)
  players: ['p1', 'p2'], // active player ids this game
  names: { p1: 'Player 1', p2: 'Player 2', p3: 'Player 3', p4: 'Player 4' },
  cardEls: {},           // id -> {card, nameEl, scoreEl}
  myPlayer: 'p1',        // which player id this client controls (online)
  aiPlayer: 'p2',
  combo: 0,
  timerHandle: null,
  net: null,
  roomCode: null,
  leaving: false,        // guard reconnect during intentional exit
  reconnectTries: 0,
  busy: false,
};

// ---- screen navigation --------------------------------------------------
function show(id) {
  $$('.screen').forEach((s) => s.classList.remove('active'));
  $('#screen-' + id).classList.add('active');
}
function onGameScreen() { return $('#screen-game').classList.contains('active'); }

function colorFor(id) { return COLORS[id] || '#7c5cff'; }
function markFor(id) {
  const n = S.names[id] || '';
  const k = id.replace('p', '');
  return (n.trim()[0] || k).toUpperCase();
}

// ===================================================================
// Menu
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
  $('#how-to-btn').addEventListener('click', () => ($('#howto-modal').hidden = false));
  $('#howto-close').addEventListener('click', () => ($('#howto-modal').hidden = true));

  const sync = () => {
    const m = isMuted();
    $('#sound-menu').textContent = m ? '🔇' : '🔊';
    $('#sound-game').textContent = m ? '🔇' : '🔊';
  };
  $('#sound-menu').addEventListener('click', () => { unlockAudio(); toggleMuted(); sync(); });
  $('#sound-game').addEventListener('click', () => { unlockAudio(); toggleMuted(); sync(); });

  $$('.back-btn').forEach((b) => b.addEventListener('click', () => { sfx.click(); leaveOnline(); show(b.dataset.back); }));
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

// ===================================================================
// Setup (local + ai)
// ===================================================================
function openSetup(mode) {
  S.mode = mode;
  $('#setup-title').textContent = mode === 'ai' ? 'Play vs Computer' : 'Pass & Play';
  $('#difficulty-field').hidden = mode !== 'ai';
  $('#players-field').hidden = mode !== 'local';
  if (mode === 'ai') S.playerCount = 2;
  renderNameInputs();
  show('setup');
}

function currentNameValues() {
  const vals = {};
  $$('#names-fields input').forEach((inp) => { vals[inp.dataset.pid] = inp.value; });
  return vals;
}

function renderNameInputs() {
  const prev = currentNameValues();
  const wrap = $('#names-fields');
  wrap.innerHTML = '';
  const count = S.mode === 'ai' ? 2 : S.playerCount;
  for (let i = 0; i < count; i++) {
    const id = 'p' + (i + 1);
    const isBot = S.mode === 'ai' && i === 1;
    const div = document.createElement('div');
    div.className = 'name-input';
    const label = document.createElement('label');
    label.textContent = isBot ? 'Computer' : 'Player ' + (i + 1);
    const input = document.createElement('input');
    input.maxLength = 14;
    input.dataset.pid = id;
    input.placeholder = isBot ? 'Computer' : 'Player ' + (i + 1);
    input.value = isBot ? 'Computer' : (prev[id] || '');
    if (isBot) input.disabled = true;
    // small colour dot to show each player's colour
    const dot = document.createElement('span');
    dot.className = 'name-dot';
    dot.style.background = colorFor(id);
    label.prepend(dot);
    div.appendChild(label);
    div.appendChild(input);
    wrap.appendChild(div);
  }
}

function initSetup() {
  chipGroup($('#size-chips'), 'dots', (v) => (S.config.dots = +v));
  chipGroup($('#timer-chips'), 'timer', (v) => (S.config.timer = +v));
  chipGroup($('#difficulty-chips'), 'diff', (v) => (S.config.difficulty = v));
  chipGroup($('#players-chips'), 'players', (v) => { S.playerCount = +v; renderNameInputs(); });
  $('#setup-start').addEventListener('click', () => {
    sfx.click();
    const count = S.mode === 'ai' ? 2 : S.playerCount;
    const vals = currentNameValues();
    S.players = [];
    for (let i = 0; i < count; i++) {
      const id = 'p' + (i + 1);
      S.players.push(id);
      const isBot = S.mode === 'ai' && i === 1;
      S.names[id] = isBot ? 'Computer' : ((vals[id] || '').trim() || 'Player ' + (i + 1)).slice(0, 14);
    }
    S.aiPlayer = S.mode === 'ai' ? 'p2' : null;
    S.role = null;
    startGame({ fresh: true });
  });
}

// ===================================================================
// Online lobby
// ===================================================================
function initLobby() {
  $$('.lobby-tabs .tab').forEach((t) =>
    t.addEventListener('click', () => { sfx.click(); switchLobbyTab(t.dataset.tab); })
  );
  chipGroup($('#online-size-chips'), 'dots', (v) => (S.config.dots = +v));
  $('#create-room-btn').addEventListener('click', createRoom);
  $('#join-room-btn').addEventListener('click', () => joinRoom());
  $('#copy-code-btn').addEventListener('click', () => copyText(S.roomCode, 'Code copied!'));
  $('#copy-link-btn').addEventListener('click', () => copyText(roomLink(S.roomCode), 'Link copied!'));
  $('#host-start-btn').addEventListener('click', () => { sfx.click(); onlineRestart(); });
}

function switchLobbyTab(tab) {
  $$('.lobby-tabs .tab').forEach((x) => x.classList.toggle('is-active', x.dataset.tab === tab));
  $$('#screen-lobby .tab-pane').forEach((x) => x.classList.remove('is-active'));
  $('#pane-' + tab).classList.add('is-active');
}

function openLobby() {
  if (!peerAvailable()) {
    banner('Online needs the PeerJS library (failed to load). Pass & Play and vs Computer still work.', true);
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

// ---- host -------------------------------------------------------------
async function createRoom() {
  if (!peerAvailable()) return;
  sfx.click();
  leaveOnline();
  S.mode = 'online'; S.role = 'host'; S.myPlayer = 'p1'; S.leaving = false;
  S.players = ['p1', 'p2'];
  S.names.p1 = ($('#online-host-name').value.trim() || 'Host').slice(0, 14);
  S.names.p2 = 'Guest';
  $('#create-room-btn').disabled = true;
  $('#create-room-btn').textContent = 'Creating…';

  const net = new Net();
  attachHostHandlers(net);
  S.net = net;
  try {
    const code = await net.hostRoom();
    S.roomCode = code;
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

function attachHostHandlers(net) {
  net
    .on('error', (err) => {
      // Transient broker errors are non-fatal; only surface in lobby setup.
      if (!onGameScreen() && $('#room-share').hidden) {
        banner('Connection error: ' + (err?.type || 'unknown'), true);
      }
    })
    .on('data', onHostData)
    .on('peer', (ev) => {
      if (ev === 'open') {
        if (onGameScreen()) banner('Opponent reconnected ✅');
      } else if (ev === 'close') {
        if (onGameScreen() && !S.game.gameOver) banner('Opponent disconnected — waiting for them to return…', true);
        else if (!onGameScreen()) { $('#host-waiting').innerHTML = '⚠️ Opponent left. Waiting again…'; $('#host-start-btn').hidden = true; }
      }
    });
}

function onHostData(msg) {
  if (!msg || !msg.t) return;
  if (msg.t === 'hello') {
    S.names.p2 = (msg.name || 'Guest').slice(0, 14);
    if (onGameScreen() && S.game) {
      // Late-join or reconnect: bring them straight into the current game.
      S.net.send({ t: 'start', config: S.config, hostName: S.names.p1, guestName: S.names.p2, snapshot: S.game.snapshot() });
    } else {
      $('#host-waiting').innerHTML = `✅ <b>${escapeHtml(S.names.p2)}</b> joined!`;
      $('#host-start-btn').hidden = false;
      sfx.capture();
    }
  } else if (msg.t === 'reqmove') {
    if (S.game && !S.game.gameOver && S.game.currentPlayer === 'p2' && S.game.canMove(msg.edgeId)) {
      commitMove(msg.edgeId, true);
    }
  } else if (msg.t === 'emote') {
    showEmote(msg.emoji);
  } else if (msg.t === 'rematch-req') {
    onlineRestart();
  }
}

// ---- guest ------------------------------------------------------------
async function joinRoom(auto) {
  if (!peerAvailable()) return;
  if (!auto) sfx.click();
  const code = $('#join-code').value.trim().toUpperCase();
  if (code.length < 6) { if (!auto) banner('Enter the 6-character room code.', true); return; }
  leaveOnline();
  S.mode = 'online'; S.role = 'guest'; S.myPlayer = 'p2'; S.leaving = false;
  S.players = ['p1', 'p2'];
  S.roomCode = code;
  S.names.p2 = ($('#online-guest-name').value.trim() || 'Guest').slice(0, 14);
  $('#join-waiting').hidden = false;
  $('#join-status').textContent = 'Connecting…';
  $('#join-room-btn').disabled = true;

  const net = new Net();
  attachGuestHandlers(net);
  S.net = net;
  try {
    await net.joinRoom(code);
    $('#join-status').textContent = 'Connected! Waiting for host to start…';
    net.send({ t: 'hello', name: S.names.p2 });
  } catch (e) {
    $('#join-status').textContent = 'Could not connect. Check the code and try again.';
    $('#join-room-btn').disabled = false;
  }
}

function attachGuestHandlers(net) {
  net
    .on('error', () => {
      if (!onGameScreen()) { $('#join-status').textContent = 'Room not found or unavailable.'; $('#join-room-btn').disabled = false; }
    })
    .on('data', onGuestData)
    .on('peer', (ev) => {
      if (ev === 'close' && onGameScreen() && !S.leaving && !(S.game && S.game.gameOver)) {
        setTimeout(guestReconnect, 700);
      }
    });
}

function onGuestData(msg) {
  if (!msg || !msg.t) return;
  if (msg.t === 'start') {
    S.config = msg.config || S.config;
    S.names.p1 = (msg.hostName || 'Host').slice(0, 14);
    if (msg.guestName) S.names.p2 = msg.guestName.slice(0, 14);
    S.reconnectTries = 0;
    if (msg.snapshot) resumeOnlineGame(msg.snapshot);
    else beginOnlineGame();
  } else if (msg.t === 'move') {
    applyConfirmedMove(msg.edgeId);
  } else if (msg.t === 'emote') {
    showEmote(msg.emoji);
  } else if (msg.t === 'full') {
    banner('Room is full.', true);
  }
}

function guestReconnect() {
  if (S.mode !== 'online' || S.role !== 'guest' || S.leaving) return;
  if (S.game && S.game.gameOver) return;
  S.reconnectTries++;
  if (S.reconnectTries > 8) { banner('Lost connection to host. Returning to menu.', true); setTimeout(() => { leaveOnline(); show('menu'); }, 1500); return; }
  banner('Reconnecting… (' + S.reconnectTries + ')');
  const net = new Net();
  attachGuestHandlers(net);
  S.net = net;
  net.joinRoom(S.roomCode)
    .then(() => { net.send({ t: 'hello', name: S.names.p2, resume: true }); })
    .catch(() => setTimeout(guestReconnect, 1800));
}

function beginOnlineGame() {
  S.aiPlayer = null;
  S.players = ['p1', 'p2'];
  startGame({ fresh: true });
}

function onlineRestart() {
  // Host authoritative restart — tell guest, both start fresh with countdown.
  S.net.send({ t: 'start', config: S.config, hostName: S.names.p1, guestName: S.names.p2 });
  beginOnlineGame();
}

function resumeOnlineGame(snapshot) {
  S.aiPlayer = null;
  S.players = ['p1', 'p2'];
  S.game = Game.fromSnapshot(snapshot);
  S.combo = 0; S.busy = false;
  ensureView();
  S.view.mount(S.game.rows, S.game.cols);
  S.view.syncFromGame(S.game);
  buildPlayerCards();
  buildTimerVisibility();
  $('#share-mini').hidden = false;
  $('#share-mini-code').textContent = S.roomCode || '';
  show('game');
  banner('Reconnected — resuming ✅');
  if (S.game.gameOver) { endGame(S.game.winner); return; }
  beginTurn();
}

// ===================================================================
// Game lifecycle
// ===================================================================
function ensureView() {
  if (!S.view) {
    S.view = new BoardView($('#board'), { onEdge: onEdgeInput, colorFn: colorFor, markFn: markFor });
  }
}

function buildPlayerCards() {
  const wrap = $('#players');
  wrap.innerHTML = '';
  wrap.dataset.count = S.players.length;
  S.cardEls = {};
  const you = S.mode === 'online' ? S.myPlayer : null;
  for (const id of S.players) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.id = 'card-' + id;
    card.style.setProperty('--pc', colorFor(id));
    const dot = document.createElement('span'); dot.className = 'player-dot';
    const meta = document.createElement('div'); meta.className = 'player-meta';
    const nameEl = document.createElement('span'); nameEl.className = 'player-name';
    nameEl.textContent = (S.names[id] || id) + (you === id ? ' (You)' : '');
    const scoreEl = document.createElement('span'); scoreEl.className = 'player-score'; scoreEl.textContent = '0';
    meta.appendChild(nameEl); meta.appendChild(scoreEl);
    const badge = document.createElement('span'); badge.className = 'active-badge'; badge.textContent = 'TURN';
    card.appendChild(dot); card.appendChild(meta); card.appendChild(badge);
    wrap.appendChild(card);
    S.cardEls[id] = { card, nameEl, scoreEl };
  }
}

function buildTimerVisibility() {
  $('#timer-wrap').hidden = !(S.config.timer > 0);
}

function startGame({ fresh } = {}) {
  const dots = S.config.dots;
  S.game = new Game({ rows: dots, cols: dots, players: S.players.slice() });
  S.combo = 0;
  S.busy = false;

  ensureView();
  S.view.mount(dots, dots);
  S.view.setInteractive(false);

  buildPlayerCards();
  buildTimerVisibility();
  $('#share-mini').hidden = S.mode !== 'online';
  if (S.mode === 'online') $('#share-mini-code').textContent = S.roomCode || '';

  show('game');
  updateTurnUI();
  countdown(() => { S.view.setInteractive(true); beginTurn(); });
}

function countdown(done) {
  const el = $('#countdown');
  const num = $('#countdown-num');
  const seq = ['3', '2', '1', 'GO!'];
  el.hidden = false;
  let i = 0;
  const step = () => {
    num.textContent = seq[i];
    num.style.animation = 'none'; void num.offsetWidth; num.style.animation = '';
    if (seq[i] === 'GO!') sfx.go(); else sfx.countdown();
    i++;
    if (i < seq.length) setTimeout(step, 700);
    else setTimeout(() => { el.hidden = true; done(); }, 600);
  };
  step();
}

function iControlCurrent() {
  if (!S.game || S.game.gameOver) return false;
  const cur = S.game.currentPlayer;
  if (S.mode === 'local') return true;
  if (S.mode === 'ai') return cur !== S.aiPlayer;
  if (S.mode === 'online') return cur === S.myPlayer;
  return false;
}

function beginTurn() {
  updateTurnUI();
  if (S.game.gameOver) return;

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
  startTimer(myTurn);
}

function onEdgeInput(edgeId) {
  if (S.busy || !S.game || S.game.gameOver) return;
  if (!S.game.canMove(edgeId)) { sfx.invalid(); return; }
  if (!iControlCurrent()) return;

  if (S.mode === 'online' && S.role === 'guest') {
    if (!S.net || !S.net.send({ t: 'reqmove', edgeId })) banner('Not connected — reconnecting…', true);
    return;
  }
  commitMove(edgeId, true);
}

function commitMove(edgeId, broadcast) {
  const result = S.game.makeMove(edgeId);
  if (!result.ok) return;
  if (broadcast && S.mode === 'online' && S.role === 'host') S.net.send({ t: 'move', edgeId });
  animateResult(result);
}

function applyConfirmedMove(edgeId) {
  if (!S.game || !S.game.canMove(edgeId)) return;
  const result = S.game.makeMove(edgeId);
  if (result.ok) animateResult(result);
}

// ---- animate a move result + advance ------------------------------------
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

  if (result.gameOver) { setTimeout(() => endGame(result.winner), 650); return; }

  if (!result.bonusTurn) { S.combo = 0; setTimeout(() => sfx.turn(), 120); }
  else statusPill('Bonus turn! 🔥');

  setTimeout(beginTurn, result.bonusTurn ? 340 : 260);
}

// ===================================================================
// UI helpers
// ===================================================================
function updateScores() {
  for (const id of S.players) {
    const c = S.cardEls[id];
    if (c) c.scoreEl.textContent = S.game.scores[id];
  }
}
function flashScore(pid) {
  const c = S.cardEls[pid];
  if (!c) return;
  const el = c.scoreEl;
  el.style.animation = 'none'; void el.offsetWidth;
  el.style.animation = 'mark-pop 0.4s var(--ease-elastic)';
}
function updateTurnUI() {
  const cur = S.game.currentPlayer;
  for (const id of S.players) {
    const c = S.cardEls[id];
    if (c) c.card.classList.toggle('is-active', id === cur && !S.game.gameOver);
  }
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
        const edge = chooseMove(S.game, 'medium');
        if (edge) {
          statusPill('Time! Auto-move ⏱');
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
function stopTimer() { if (S.timerHandle) { clearInterval(S.timerHandle); S.timerHandle = null; } }

// ===================================================================
// End game / result
// ===================================================================
function endGame(winner) {
  stopTimer();
  S.view.setInteractive(false);
  updateTurnUI();

  // Build result score cards.
  const wrap = $('#result-scores');
  wrap.innerHTML = '';
  const ranked = S.players.slice().sort((a, b) => S.game.scores[b] - S.game.scores[a]);
  for (const id of ranked) {
    const box = document.createElement('div');
    box.className = 'result-score' + (winner === id ? ' win' : '');
    box.style.setProperty('--pc', colorFor(id));
    const nm = document.createElement('span'); nm.className = 'rs-name'; nm.textContent = S.names[id] || id;
    const num = document.createElement('span'); num.className = 'rs-num'; num.textContent = S.game.scores[id];
    box.appendChild(nm); box.appendChild(num);
    wrap.appendChild(box);
  }

  let title, trophy;
  if (winner === 'tie') { title = "It's a Tie!"; trophy = '🤝'; }
  else { title = `${S.names[winner]} Wins!`; trophy = '🏆'; }
  $('#result-title').textContent = title;
  $('#trophy').textContent = trophy;

  const winnerBoxes = [...S.game.boxes.entries()].filter(([, o]) => o === winner).map(([b]) => b);
  S.view.pulseBoxes(winnerBoxes.length ? winnerBoxes : [...S.game.boxes.keys()], 70);

  // Rematch label reset.
  $('#rematch-btn').disabled = false;
  $('#rematch-btn').textContent = 'Rematch';

  setTimeout(() => {
    show('result');
    if (winner === 'tie') sfx.turn();
    else {
      const iWon = S.mode === 'ai' ? winner !== S.aiPlayer
        : S.mode === 'online' ? winner === S.myPlayer : true;
      if (iWon || S.mode === 'local') { sfx.victory(); FX.confettiCannon(); }
      else sfx.lose();
    }
  }, winnerBoxes.length * 70 + 500);
}

function initResult() {
  $('#result-menu-btn').addEventListener('click', () => { sfx.click(); leaveOnline(); FX.clearFX(); show('menu'); });
  $('#rematch-btn').addEventListener('click', () => {
    sfx.click();
    if (S.mode === 'online') {
      if (S.role === 'host') onlineRestart();
      else {
        if (S.net && S.net.send({ t: 'rematch-req' })) {
          $('#rematch-btn').disabled = true;
          $('#rematch-btn').textContent = 'Waiting for host…';
        } else banner('Not connected to host.', true);
      }
    } else doRematch();
  });
}
function doRematch() { FX.clearFX(); startGame({ fresh: true }); }

// ===================================================================
// Emotes + banners + exit
// ===================================================================
function initEmotes() {
  $('#emotes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-emote]');
    if (!b) return;
    const emoji = b.dataset.emote;
    showEmote(emoji);
    if (S.mode === 'online' && S.net) S.net.send({ t: 'emote', emoji });
  });
  $('#exit-btn').addEventListener('click', () => { sfx.click(); stopTimer(); leaveOnline(); FX.clearFX(); show('menu'); });
  $('#share-mini').addEventListener('click', () => copyText(roomLink(S.roomCode), 'Link copied!'));
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
function leaveOnline() {
  S.leaving = true;
  if (S.net) { try { S.net.close(); } catch (_) {} S.net = null; }
  S.role = null; S.reconnectTries = 0;
}
function copyText(text, okMsg) {
  if (!text) return;
  const done = () => { statusPill(okMsg); banner(okMsg); };
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => prompt('Copy:', text));
  else prompt('Copy:', text);
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function checkDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room');
  if (!room) return;
  openLobby();
  switchLobbyTab('join');
  $('#join-code').value = room.toUpperCase().slice(0, 6);
  // Auto-join shortly (PeerJS is already loaded via the classic script tag).
  $('#join-status').textContent = 'Joining room…';
  $('#join-waiting').hidden = false;
  setTimeout(() => joinRoom(true), 500);
}

// ---- boot ---------------------------------------------------------------
function boot() {
  FX.setupFX($('#fx-canvas'), $('#float-layer'));
  initMenu();
  initSetup();
  initLobby();
  initResult();
  initEmotes();
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  checkDeepLink();
}
boot();
