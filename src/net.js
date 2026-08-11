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
const CONNECT_TIMEOUT_MS = 15000;

// ICE servers for WebRTC. STUN lets peers discover their public address;
// TURN relays traffic when a direct peer-to-peer path is impossible (strict /
// symmetric NAT, mobile carriers, some corporate firewalls). Without TURN,
// players on different networks often can't connect at all. The OpenRelay
// project provides free public TURN; Google/Twilio STUN are free too.
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
];

function peerOpts(id) {
  const opts = { debug: 2, config: { iceServers: ICE_SERVERS } };
  return id ? [id, opts] : [opts];
}

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
        const peer = new window.Peer(...peerOpts(PREFIX + code));
        this.peer = peer;
        peer.on('error', (err) => {
          console.warn('[net] host peer error:', err && err.type, err && err.message);
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
          console.info('[net] host room ready:', code);
          this.code = code;
          this._bindHostConnections();
          resolve(code);
        });
        peer.on('disconnected', () => {
          console.warn('[net] host disconnected from broker — reconnecting');
          if (this.peer && !this.peer.destroyed) { try { this.peer.reconnect(); } catch (_) {} }
        });
      };
      tryOpen();
    });
  }

  _bindHostConnections() {
    this.peer.on('connection', (conn) => {
      console.info('[net] host: incoming connection from', conn.peer);
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
      const peer = new window.Peer(...peerOpts());
      this.peer = peer;
      let settled = false;
      let retries = 0;
      let timer = null;

      const finishOk = (conn) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        console.info('[net] guest: data channel open');
        this._bindConn(conn, false);
        resolve();
      };
      const finishErr = (err) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        this._emit('error', err);
        reject(err);
      };

      const attemptConnect = () => {
        if (settled) return;
        console.info('[net] guest: connecting to', PREFIX + code, '(try', retries + 1, ')');
        const conn = peer.connect(PREFIX + code, { reliable: true });
        this.conn = conn;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          // Data channel didn't open — usually NAT/firewall with no relay path.
          if (settled) return;
          if (retries < 2) { retries++; console.warn('[net] guest: connect timed out, retrying'); try { conn.close(); } catch (_) {} attemptConnect(); }
          else { try { conn.close(); } catch (_) {} finishErr(new Error('timeout')); }
        }, CONNECT_TIMEOUT_MS);
        conn.on('open', () => finishOk(conn));
        conn.on('error', (err) => console.warn('[net] guest conn error:', err && err.type));
      };

      peer.on('error', (err) => {
        console.warn('[net] guest peer error:', err && err.type, err && err.message);
        // Host id not yet registered on the broker — retry a few times.
        if (err && err.type === 'peer-unavailable' && retries < 3) {
          retries++;
          setTimeout(attemptConnect, 1200);
          return;
        }
        finishErr(err);
      });
      peer.on('open', () => { console.info('[net] guest peer ready'); attemptConnect(); });
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
