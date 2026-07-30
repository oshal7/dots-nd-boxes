# Dots & Boxes — Multiplayer

A modern, delightful web version of the classic pen-and-paper game **Dots & Boxes**,
built to the accompanying PRD. Draw lines, close boxes, chain combos, and win — with
tactile micro-animations, particle sparks, confetti, and procedural sound effects.

**▶️ Play:** https://oshal7.github.io/dots-nd-boxes/

## Features

- **Three ways to play**
  - **Pass & Play** — **2 to 4 players** sharing one device (each with their own colour).
  - **Vs Computer** — a bot with Easy / Medium / Hard difficulty.
  - **Play Online** — cross-device play via a 6-character **room code** or shareable link,
    with auto-join from the link, a keepalive heartbeat, and automatic **reconnect/resume**
    if a connection blips (no lost game).
- **Delightful motion** (per the PRD animation directory)
  - Neon dashed **hover preview**, elastic **line-snap** with endpoint sparks.
  - Radial **liquid-fill** box captures with a bouncy owner-mark pop.
  - **Chain combo** counters (`2x`, `3x!`) that float up with shake + ascending sound.
  - Turn-transition halo, **victory wave** + confetti cannon, animated trophy.
- **Selectable board sizes** (4×4 → 7×7 dots) and an optional **turn timer**.
- **Web Audio** sound effects — generated procedurally, no asset files.
- Quick-chat emotes, responsive layout, 44px touch targets, and `prefers-reduced-motion` support.

## How to play

Players take turns drawing one line between two adjacent dots. Complete the **4th side**
of a box to capture it (+1 point) and take an **immediate bonus turn** — chain these to
sweep the board. When every line is drawn, the player with the most boxes wins; equal
scores are a tie.

## Tech

Pure static site — **vanilla JS ES modules, SVG board, Canvas particle overlay**. No
build step. Online play uses **[PeerJS](https://peerjs.com/)** (WebRTC data channels,
vendored at `vendor/peerjs.min.js` so there's no CDN dependency) over its free public
broker purely for signaling; the host client is authoritative for move validation. There
is no server of our own — which is what lets the whole game run on GitHub Pages.

### Project structure

| File | Responsibility |
| --- | --- |
| `src/engine.js` | Pure game logic (grid math, moves, chain rule, scoring) |
| `src/ai.js` | Bot opponent (capture / avoid-gifting / minimal-sacrifice) |
| `src/render.js` | SVG board rendering + pointer input |
| `src/animations.js` | Canvas particles, confetti, floating combo text |
| `src/audio.js` | Procedural Web Audio SFX |
| `src/net.js` | PeerJS room-code online play |
| `src/main.js` | App orchestration and turn loop |

### Run locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Notes & limitations

- Online play is best-effort peer-to-peer over PeerJS's public broker — great for two
  friends on a shared link, but not a hardened game server (the PRD's Socket.io / Redis /
  PostgreSQL stack can't run on static hosting).
- No accounts or persistence; scores are per session.
