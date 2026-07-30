// net.js — Online P2P over PeerJS (WebRTC data channels), no backend of ours.
//
// Uses PeerJS's free public broker purely for signaling. The host holds the
// authoritative Game (see main.js) and validates/broadcasts moves, echoing the
// PRD's move:make / move:broadcast contract. Best-effort; fine for two friends
// sharing a room code / link.
//
// Requires the global `Peer` (loaded from the PeerJS CDN in index.html).

const PREFIX = 'dnb-'; // namespace peer ids to reduce broker collisions
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no ambiguous chars
const CODE_LEN = 6;

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
  }

  on(event, fn) {
    this.handlers[event] = fn;
    return this;
  }

  _emit(event, ...args) {
    const fn = this.handlers[event];
    if (fn) fn(...args);
  }

  /**
   * Host a room. Resolves once the peer is registered with the broker and a
   * room code is reserved. Guest arrival fires the 'peer' + 'data' handlers.
   */
  hostRoom() {
    this.isHost = true;
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const tryOpen = () => {
        const code = makeRoomCode();
        const peer = new window.Peer(PREFIX + code, { debug: 1 });
        this.peer = peer;

        const onError = (err) => {
          if (err && err.type === 'unavailable-id' && attempts < 4) {
            attempts++;
            try { peer.destroy(); } catch (_) {}
            tryOpen();
          } else {
            this._emit('error', err);
            reject(err);
          }
        };
        peer.on('error', onError);

        peer.on('open', () => {
          this.code = code;
          this._bindHostConnections();
          resolve(code);
        });
      };
      tryOpen();
    });
  }

  _bindHostConnections() {
    this.peer.on('connection', (conn) => {
      // Accept a single guest; reject extras.
      if (this.conn && this.conn.open) {
        conn.on('open', () => {
          conn.send({ t: 'full' });
          setTimeout(() => conn.close(), 200);
        });
        return;
      }
      this.conn = conn;
      this._bindConn(conn, true);
    });
    // Reconnect handling: PeerJS auto-reconnects to broker on disconnect.
    this.peer.on('disconnected', () => {
      if (this.peer && !this.peer.destroyed) {
        try { this.peer.reconnect(); } catch (_) {}
      }
    });
  }

  /** Join an existing room by code (or full peer id). */
  joinRoom(code) {
    this.isHost = false;
    this.code = code;
    return new Promise((resolve, reject) => {
      const peer = new window.Peer({ debug: 1 });
      this.peer = peer;
      let settled = false;

      peer.on('error', (err) => {
        this._emit('error', err);
        if (!settled) {
          settled = true;
          reject(err);
        }
      });

      peer.on('open', () => {
        const conn = peer.connect(PREFIX + code, { reliable: true });
        this.conn = conn;
        const timeout = setTimeout(() => {
          if (!settled) {
            settled = true;
            reject(new Error('timeout'));
            try { conn.close(); } catch (_) {}
          }
        }, 12000);
        conn.on('open', () => {
          clearTimeout(timeout);
          this._bindConn(conn, false);
          if (!settled) {
            settled = true;
            resolve();
          }
        });
      });

      peer.on('disconnected', () => {
        if (this.peer && !this.peer.destroyed) {
          try { this.peer.reconnect(); } catch (_) {}
        }
      });
    });
  }

  _bindConn(conn, isIncoming) {
    conn.on('data', (msg) => this._emit('data', msg));
    conn.on('open', () => {
      this.connected = true;
      this._emit('peer', 'open');
    });
    if (conn.open) {
      this.connected = true;
      if (isIncoming) this._emit('peer', 'open');
    }
    conn.on('close', () => {
      this.connected = false;
      this._emit('peer', 'close');
    });
    conn.on('error', (err) => this._emit('error', err));
  }

  send(msg) {
    if (this.conn && this.conn.open) {
      this.conn.send(msg);
      return true;
    }
    return false;
  }

  close() {
    try { if (this.conn) this.conn.close(); } catch (_) {}
    try { if (this.peer) this.peer.destroy(); } catch (_) {}
    this.conn = null;
    this.peer = null;
    this.connected = false;
  }
}
