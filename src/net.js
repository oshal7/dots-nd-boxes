// net.js — Online P2P over PeerJS (WebRTC data channels), no backend of ours.
//
// Uses PeerJS's public broker purely for signaling. The host holds the
// authoritative Game (see main.js) and validates/broadcasts moves, echoing the
// PRD's move:make / move:broadcast contract. Best-effort; fine for two friends
// sharing a room code / link.
//
// Reliability features:
//   - keepalive heartbeat (filtered out before reaching the app) so idle NAT
//     mappings don't drop mid-game
//   - host accepts a *replacement* connection when the previous one died
//     (guest reconnect), re-emitting 'peer:open'
//   - join retries once if the host id isn't registered on the broker yet
//
// Requires the global `Peer` (loaded from vendor/peerjs.min.js in index.html).

const PREFIX = 'dnb-'; // namespace peer ids to reduce broker collisions
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no ambiguous chars
const CODE_LEN = 6;
const HEARTBEAT_MS = 4000;

export function makeRoomCode() {
  let s = '';
  for (let i = 0; i < CODE_LEN; i++) {
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return s;
}

export function peerAvailable() {
  return typeof window !== 'undefined' && typeof window.Peer !== 'undefined';
}

export class Net {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.code = null;
    this.connected = false;
    this.handlers = {};
    this._hb = null;
  }

  on(event, fn) {
    this.handlers[event] = fn;
    return this;
  }
  _emit(event, ...args) {
    const fn = this.handlers[event];
    if (fn) fn(...args);
  }

  // ---- hosting ----------------------------------------------------------
  hostRoom() {
    this.isHost = true;
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const tryOpen = () => {
        const code = makeRoomCode();
        const peer = new window.Peer(PREFIX + code, { debug: 1 });
        this.peer = peer;
        peer.on('error', (err) => {
          if (err && err.type === 'unavailable-id' && attempts < 4) {
            attempts++;
            try { peer.destroy(); } catch (_) {}
            tryOpen();
          } else if (err && (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error')) {
            this._emit('error', err); // transient broker issue
          } else {
            this._emit('error', err);
            reject(err);
          }
        });
        peer.on('open', () => {
          this.code = code;
          this._bindHostConnections();
          resolve(code);
        });
        peer.on('disconnected', () => {
          if (this.peer && !this.peer.destroyed) { try { this.peer.reconnect(); } catch (_) {} }
        });
      };
      tryOpen();
    });
  }

  _bindHostConnections() {
    this.peer.on('connection', (conn) => {
      const haveLive = this.conn && this.conn.open;
      if (haveLive && conn.peer !== (this.conn && this.conn.peer)) {
        // A different second guest — reject; this is a 1v1 room.
        conn.on('open', () => { conn.send({ t: 'full' }); setTimeout(() => { try { conn.close(); } catch (_) {} }, 200); });
        return;
      }
      // Accept (fresh join OR a reconnect replacing a dead connection).
      try { if (this.conn && this.conn !== conn) this.conn.close(); } catch (_) {}
      this.conn = conn;
      this._bindConn(conn, true);
    });
  }

  // ---- joining ----------------------------------------------------------
  joinRoom(code) {
    this.isHost = false;
    this.code = code;
    return new Promise((resolve, reject) => {
      const peer = new window.Peer({ debug: 1 });
      this.peer = peer;
      let settled = false;
      let retried = false;

      const attemptConnect = () => {
        const conn = peer.connect(PREFIX + code, { reliable: true });
        this.conn = conn;
        const timeout = setTimeout(() => {
          if (!settled) { settled = true; reject(new Error('timeout')); try { conn.close(); } catch (_) {} }
        }, 12000);
        conn.on('open', () => {
          clearTimeout(timeout);
          this._bindConn(conn, false);
          if (!settled) { settled = true; resolve(); }
        });
      };

      peer.on('error', (err) => {
        // Host id not yet registered — retry once shortly.
        if (err && err.type === 'peer-unavailable' && !retried) {
          retried = true;
          setTimeout(attemptConnect, 1500);
          return;
        }
        this._emit('error', err);
        if (!settled) { settled = true; reject(err); }
      });
      peer.on('open', attemptConnect);
      peer.on('disconnected', () => {
        if (this.peer && !this.peer.destroyed) { try { this.peer.reconnect(); } catch (_) {} }
      });
    });
  }

  // ---- shared connection wiring ----------------------------------------
  _bindConn(conn, isIncoming) {
    conn.on('data', (msg) => {
      if (msg && msg.__ping) return;        // swallow heartbeats
      if (msg && msg.__pong) return;
      this._emit('data', msg);
    });
    const markOpen = () => {
      this.connected = true;
      this._startHeartbeat();
      this._emit('peer', 'open');
    };
    if (conn.open) markOpen();
    else conn.on('open', markOpen);
    conn.on('close', () => {
      this.connected = false;
      this._stopHeartbeat();
      this._emit('peer', 'close');
    });
    conn.on('error', (err) => this._emit('error', err));
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this._hb = setInterval(() => {
      if (this.conn && this.conn.open) { try { this.conn.send({ __ping: Date.now() }); } catch (_) {} }
    }, HEARTBEAT_MS);
  }
  _stopHeartbeat() { if (this._hb) { clearInterval(this._hb); this._hb = null; } }

  send(msg) {
    if (this.conn && this.conn.open) { this.conn.send(msg); return true; }
    return false;
  }

  close() {
    this._stopHeartbeat();
    try { if (this.conn) this.conn.close(); } catch (_) {}
    try { if (this.peer) this.peer.destroy(); } catch (_) {}
    this.conn = null; this.peer = null; this.connected = false;
  }
}
