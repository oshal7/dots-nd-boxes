# Launch Checklist: Google Play + Reliable Online Backend

Everything needed to take this repo from "web game on GitHub Pages" to "live on the
Google Play Store, with online play that holds up when many people play at once".

Each item is tagged with who does it:
- **[You]**: accounts, payments, legal, store console clicks, testers (needs your identity).
- **[Code]**: changes in this repo (can be done by Claude in this repo).
- **[Both]**: code plus a console/config step from you.

Companion doc: [`MONETIZATION_STRATEGY.md`](./MONETIZATION_STRATEGY.md) (the business side).

---

## 0. Why the backend has to change

Online play today (`src/net.js`) is **peer-to-peer over WebRTC**. It uses PeerJS's free public broker for signaling,
free public TURN relays, and the **host's phone as the referee**. That's why it breaks:

| Problem today | What happens to players |
| --- | --- |
| Public PeerJS broker and free TURN (`openrelay.metered.ca`) have no uptime guarantee | "Room not found" / can't connect at random times |
| Two phones on different networks or mobile data often can't link directly | Joins hang, or players have to paste TURN settings (unacceptable in a store app) |
| Host's device is the authority | Host locks the phone or switches app → the game dies for both |
| No server state | No reconnect after an app restart, no matchmaking with strangers, no stats, no ranking |
| No identity | Can't stop cheating, abuse or spam rooms |

**Target architecture:** a **server-authoritative** game server. Every client (Android, iOS,
web) opens one **WebSocket** to our server. The server holds the real game state, validates each
move with the *same* `src/engine.js` the client uses (it's pure JS with no DOM, so it runs on a
server unchanged) and broadcasts results. No NAT traversal, no TURN, and nobody's phone is the referee.

### Recommended stack: Cloudflare Workers + Durable Objects

| Need | How it's met |
| --- | --- |
| One authoritative referee per game | **One Durable Object per room**: single-threaded, so no race conditions on moves |
| Many simultaneous players | Each room is its own object. Cloudflare spreads them across its network automatically, with no servers to scale |
| Survives app switching / phone lock | Room state is persisted in the Durable Object's storage. The client reconnects with its token and receives a snapshot |
| Low latency worldwide | Room is created near the first player; edge network in 300+ cities |
| Matchmaking with strangers | A **Lobby** Durable Object holds the queue (per board size). It pairs players, or hands them a bot after ~10s |
| Reuse existing code | Worker imports `src/engine.js` and `src/ai.js` directly (server-side bot for matchmaking fallback) |
| Cost | Workers Paid plan **$5/month**. Covers ~millions of requests. WebSocket hibernation means idle sockets cost ~nothing |
| Ops burden | No VMs, no Redis, no patching. Deploy with `wrangler deploy` from GitHub Actions |

**Alternative if you prefer "normal" servers:** Node.js + `ws` (or Colyseus) on Fly.io/Render with
Redis for room state. It works fine but means more moving parts and scaling work. **Firebase**
(Firestore + Cloud Functions) also works, but move validation round-trips are slower and
per-read pricing is less predictable for a turn-by-turn game. Recommendation stays **Cloudflare**.

---

## 1. Accounts & legal (week 1) — mostly [You]

- [ ] **[You]** Google Play Console developer account: **$25 one-time**, identity verification (government ID; can take a few days). Decide **personal vs organization** account:
  - Personal accounts created after Nov 2023 must run a **closed test with ≥12 testers opted in for 14 continuous days** before applying for production.
  - Organization accounts skip that rule but need a **D-U-N-S number** (free, ~1–4 weeks).
- [ ] **[You]** Google Play **payments profile** (bank account + tax info) to receive IAP payouts.
- [ ] **[You]** **AdMob** account, linked to the same Google account; add payment info + tax (W-8BEN if outside the US).
- [ ] **[You]** **Cloudflare** account; enable **Workers Paid ($5/mo)** for Durable Objects.
- [ ] **[You]** **Firebase** project (free Spark plan) for Analytics + Crashlytics + Cloud Messaging.
- [ ] **[You]** Domain name (optional but recommended, ~$10/yr). Used for `api.<domain>` (game server), privacy policy and deep links. Can be bought through Cloudflare.
- [ ] **[You]** Support email address (shown publicly on the store listing), e.g. `support@<domain>` or a dedicated Gmail.
- [ ] **[Both]** **Privacy Policy** page (required by Play + AdMob). Covers: anonymous device ID, nickname, game history, AdMob advertising ID, Firebase Analytics/Crashlytics, data deletion. Host on GitHub Pages or the domain.
- [ ] **[Both]** **Terms of Service** page (short; covers online conduct, nicknames).
- [ ] **[Both]** **Account/data deletion** page or in-app button. Google requires a deletion path for any app with server-side user data.
- [ ] **[You]** Pick final **app name** (`Dots & Boxes: Paper Game`?), **package name** (e.g. `com.<yourname>.dotsboxes`; **permanent**, can't be changed later).
- [ ] **[You]** Back up the **upload keystore** in two safe places (password manager + offline). Losing it means a Google support reset.

---

## 2. Game server / backend (weeks 1–4) — [Code] unless noted

### 2.1 Project setup
- [ ] **[Code]** Create `server/` folder: Cloudflare Worker (`wrangler.toml`, `src/index.js`) importing the shared `src/engine.js` + `src/ai.js`.
- [ ] **[Code]** Add `engine.js` unit tests (Node's built-in `node:test`) to cover move validation, chain bonus turn, scoring and game end, now that it decides real outcomes.
- [ ] **[Both]** GitHub Actions workflow: on push to `main`, run tests → `wrangler deploy`. You add a `CLOUDFLARE_API_TOKEN` repo secret.
- [ ] **[Code]** Two environments: `staging` (for testers / closed track) and `production`.

### 2.2 Identity (lightweight, no sign-up)
- [ ] **[Code]** On first launch, client calls `POST /auth/anon` → server issues a **player ID + signed token** (JWT/HMAC, long-lived). Stored on device.
- [ ] **[Code]** Nickname chosen once, editable. Server enforces length and runs a **profanity filter**.
- [ ] **[Code]** (Later) optional **Google Play Games / Sign in with Google** to restore a profile on a new phone.

### 2.3 Rooms (play with a friend via code/link)
- [ ] **[Code]** `POST /rooms` → creates a Room Durable Object, returns 6-char code (same alphabet as today's `makeRoomCode()`).
- [ ] **[Code]** `GET /rooms/:code/ws` → WebSocket upgrade into that room (token required).
- [ ] **[Code]** Message protocol, versioned (`v: 1`). Reuses today's message names so `main.js` changes stay small:
  - client → server: `hello`, `reqmove {edgeId, seq}`, `rematch-req`, `emote`, `leave`, `ping`
  - server → client: `state {snapshot, seq}`, `move {edgeId, by, seq}`, `start`, `player-joined/left`, `game-over`, `error {code}`
- [ ] **[Code]** Server is authoritative: rejects out-of-turn / already-drawn / malformed moves; **sequence numbers** stop duplicate or replayed moves.
- [ ] **[Code]** **Reconnect & resume**: socket drops → client reconnects with token → server sends full `state` snapshot. Seat held for **60–120s** before the opponent is offered "claim win / wait".
- [ ] **[Code]** **Turn timer enforced on the server** (optional per room), so a stalled player can't freeze the game.
- [ ] **[Code]** Room cleanup: Durable Object **alarm** deletes rooms idle > 30 min or finished > 10 min ago.
- [ ] **[Code]** Up to 4 players per room (already supported locally) plus spectators (optional).
- [ ] **[Code]** **WebSocket Hibernation API**, so idle connections don't bill CPU time.

### 2.4 Matchmaking (play with strangers)
- [ ] **[Code]** `Lobby` Durable Object: queue per board size (and later per skill band).
- [ ] **[Code]** Pair two waiting players → create a Room → send both the room code.
- [ ] **[Code]** **Bot fallback** after ~8–10s with no match: server starts a room with the `ai.js` bot (medium) wearing a random nickname, so nobody waits forever on a quiet night.
- [ ] **[Code]** Cancel-search, and timeout handling.

### 2.5 Persistence
- [ ] **[Code]** **Cloudflare D1** (SQLite) tables: `players` (id, nickname, created, rating), `games` (id, players, size, winner, moves, ended_at), `stats` (per player).
- [ ] **[Code]** Write a game record on `game-over` (enables stats, leaderboards and dispute checks later).
- [ ] **[Code]** `DELETE /me` endpoint (account/data deletion; required by Play policy).

### 2.6 Abuse, safety & limits
- [ ] **[Code]** Rate limits per IP and per player (room creation, messages per second, matchmaking joins).
- [ ] **[Code]** Message size cap and schema validation on every incoming frame.
- [ ] **[Code]** Emotes only (no free-text chat at launch, which avoids moderation and the Play UGC policy burden). Nickname filter + **report player** button.
- [ ] **[Code]** CORS / origin allow-list (app's `https://localhost` Capacitor origin + web origin).

### 2.7 Observability & reliability
- [ ] **[Code]** `GET /health` endpoint; **[You]** add a free uptime monitor (e.g. UptimeRobot / Better Stack) to email you on downtime.
- [ ] **[Code]** Structured logs (Workers Logs) for errors, rejected moves, disconnect reasons.
- [ ] **[Code]** **Load test** before launch: script that opens 500–1,000 simulated games (2,000 sockets) and plays random legal moves; check move latency stays < 150 ms p95 and no dropped games.
- [ ] **[Code]** **Chaos test**: kill client sockets mid-game, background the app for 60s, toggle airplane mode. The game must resume.
- [ ] **[Code]** Client **protocol version check**: if the server says "client too old", show "Please update the app" (lets the server evolve safely).
- [ ] **[Code]** Feature flag / kill switch for online play (remote config). If the backend has trouble, the app still works offline.

---

## 3. Client changes in this repo (weeks 2–5) — [Code]

### 3.1 Networking
- [ ] Replace `src/net.js` PeerJS transport with a `WebSocket` client to `wss://api.<domain>`, keeping the same `Net` event interface (`peer:open`, `data`, `close`, `error`) so `main.js` changes are minimal.
- [ ] Remove the TURN settings UI, `vendor/peerjs.min.js`, and all STUN/TURN code (no longer needed).
- [ ] Guest no longer runs a mirror-only game: **every** online client is a mirror of the server; host/guest asymmetry in `main.js` goes away.
- [ ] Exponential backoff reconnect + "Reconnecting…" banner (reuse existing banner).
- [ ] Add **"Play Online → Quick Match"** (matchmaking) next to "Create room / Join with code".
- [ ] Deep links: `https://<domain>/r/ABC123` opens the app straight into the room (Android App Links), falling back to the web version.

### 3.2 Works offline & feels native (also needed for iOS later)
- [ ] Bot and Pass & Play run with **no network**: all assets bundled locally (fonts already vendored ✔).
- [ ] Persist settings + stats locally (`@capacitor/preferences`): wins/losses per difficulty, longest chain, streak.
- [ ] Android **back button** behaviour (back from game → confirm leave; back on menu → exit).
- [ ] Pause/resume handling (`App` plugin `pause`/`resume` events): pause timers, reconnect socket on resume.
- [ ] Haptics on line draw / box capture (`@capacitor/haptics`).
- [ ] Native share sheet for room invites (`@capacitor/share`).
- [ ] Keep screen awake during a game (optional).
- [ ] Safe-area / notch / gesture-bar padding check on several screen sizes.
- [ ] Respect system dark mode or at least not break under it.

### 3.3 Monetisation
- [ ] **AdMob** via `@capacitor-community/admob`:
  - Interstitial between games, at most once every 2–3 completed games, never in the first session, never in online mid-match.
  - Rewarded: "Undo" (vs bot), "Hint" (vs bot), "Try a theme for 24h".
  - Use **test ad unit IDs** in debug builds (real IDs on a dev device can get the AdMob account banned).
- [ ] **Remove Ads** in-app purchase (Google Play Billing via RevenueCat or `cordova-plugin-purchase`) + "Restore purchases".
- [ ] **Consent**: Google **UMP** consent form (EU/UK/Swiss users) shown before ads load; "Privacy settings" entry in the app menu.
- [ ] `app-ads.txt` file on the developer website domain listed in Play Console (AdMob requirement; easy to host on GitHub Pages).

### 3.4 Analytics, crashes, quality
- [ ] Firebase **Analytics** events: `app_open`, `game_start{mode,size}`, `game_end{result,duration}`, `online_connect_fail{reason}`, `ad_impression`, `purchase`.
- [ ] Firebase **Crashlytics** (catches native crashes + JS errors via a small bridge).
- [ ] In-app **review prompt** (Play In-App Review API) after a win, max once per ~30 days.
- [ ] Remote config: ad frequency, online kill switch, minimum app version.

---

## 4. Packaging the Android app (weeks 3–5) — [Code] + [You]

- [ ] **[Code]** Add `package.json` + **Capacitor** (`@capacitor/core`, `@capacitor/android`), `capacitor.config.json` (appId = package name, `webDir` = bundled assets).
- [ ] **[Code]** Small build step that copies `index.html`, `styles.css`, `src/`, `vendor/` into `www/` (keeps GitHub Pages deploy working unchanged).
- [ ] **[Code]** `npx cap add android`, commit the `android/` project.
- [ ] **[Code]** **Target SDK**: must target the current Play requirement (API 35 / Android 15 for new apps in 2025–26; check Play Console for the latest). Set `minSdk` 24+.
- [ ] **[Code]** App icon (adaptive icon: foreground + background layers) and splash screen (`@capacitor/splash-screen`).
- [ ] **[Code]** `versionCode` / `versionName` bump scripted per release.
- [ ] **[You]** Generate the **upload keystore** (`keytool`) and enrol in **Play App Signing** (default). Never commit the keystore.
- [ ] **[Both]** GitHub Actions workflow: build a signed **AAB** (`./gradlew bundleRelease`) using keystore from repo secrets; upload as artifact (later: auto-upload to the internal track via the Play Developer API).
- [ ] **[Code]** Test on: a low-end Android (2–3 GB RAM), a recent Pixel/Samsung, a tablet; Android 8/10/13/15.
- [ ] **[Code]** Check performance: 60fps animations on low-end devices; reduce particle counts if needed (respect `prefers-reduced-motion` already ✔).

---

## 5. Play Console setup (weeks 4–6) — [You], with copy and assets from [Code]

### 5.1 App content declarations (all mandatory)
- [ ] **Privacy policy URL**
- [ ] **App access**: "All functionality available without special access" (no login wall)
- [ ] **Ads**: "Yes, contains ads"
- [ ] **Content rating** (IARC questionnaire). Expect **Everyone / PEGI 3**. Answer "users can interact" = yes (online play, emotes only).
- [ ] **Target audience**: **13+** (avoid the "Designed for Families" policy and its ad restrictions; see the strategy doc)
- [ ] **Data safety** form: device/other IDs (advertising ID, Firebase installation ID), app activity (game interactions), crash logs, nickname. Encrypted in transit: yes. Deletion: yes (link to deletion page)
- [ ] **Advertising ID** declaration: yes (AdMob); include `com.google.android.gms.permission.AD_ID`
- [ ] **Government app / financial features / health**: no
- [ ] **News app**: no

### 5.2 Store listing
- [ ] **[Code]** Title (≤30 chars), short description (≤80), full description (≤4,000) with keywords: "dots and boxes", "paper game", "2 player", "play with friends", "offline", "pencil game".
- [ ] **[Code]** App icon 512×512 PNG.
- [ ] **[Code]** Feature graphic 1024×500.
- [ ] **[Code]** Phone screenshots (4–8, 1080×1920+) showing: board mid-chain, combo text, victory confetti, online room code, themes. Tablet screenshots (7" and 10") recommended.
- [ ] **[Code]** Promo video (YouTube link, 15–30s), optional but strong.
- [ ] **[You]** Category: **Games → Board**; tags; contact email; website.
- [ ] **[Code]** Translations of the listing (es, pt-BR, hi, id, de, fr, ja) for launch or v1.1.

### 5.3 Monetisation setup
- [ ] **[You]** Create IAP product `remove_ads` (one-time, non-consumable). Set price ~$2.99, let Play auto-convert local prices.
- [ ] **[You]** AdMob: register app, create ad units (interstitial, rewarded), link to Firebase, set up the **GDPR consent message** in AdMob's Privacy & messaging.
- [ ] **[You]** Add **license testers** (your Gmail + testers) so test purchases are free.

---

## 6. Testing tracks & launch (weeks 5–8)

- [ ] **[Both]** **Internal testing** track: upload first AAB; you + up to 100 testers install within minutes. Fix crashes.
- [ ] **[You]** **Closed testing** track (personal accounts): recruit **≥12 testers** who stay opted in for **14 consecutive days**. Recruit 20+ to be safe (friends, family, Reddit r/AndroidClosedTesting, Discord). Ask them to actually play online with each other.
- [ ] **[Code]** During the closed test, point the app to the **staging** backend; watch logs, crashes and disconnect rates daily.
- [ ] **[You]** Apply for **production access** in Play Console (answers about testing, feedback, readiness).
- [ ] **[Both]** Pre-launch report (Play's automated device tests) all green: no crashes, no accessibility blockers.
- [ ] **[You]** Production release with a **staged rollout** (10% → 50% → 100% over a few days); halt the rollout if Crashlytics spikes.
- [ ] **[Code]** Switch the app to the **production** backend; keep staging for future betas.
- [ ] **[Code]** Update GitHub Pages web version: "Get it on Google Play" badge + same online backend (web and app players can play each other).

---

## 7. Post-launch operations (ongoing)

- [ ] **[You]** Reply to every Play review (first 2 months especially).
- [ ] **[You]** Weekly check: Crashlytics, Play Vitals (ANR rate < 0.47%, crash rate < 1.09% are Google's "bad behaviour" thresholds), AdMob revenue, Firebase retention.
- [ ] **[Code]** Monthly dependency updates; yearly **target SDK** bump (Google enforces it every August-ish; non-compliant apps disappear from new devices).
- [ ] **[Code]** Backend: alert on error-rate spikes; monthly review of Cloudflare usage and costs.
- [ ] **[Code]** Retention roadmap from the strategy doc: Daily Puzzle → achievements/leaderboards (Play Games Services) → themes → ranked.

---

## 8. Costs for this plan

| Item | Cost |
| --- | --- |
| Google Play developer account | $25 one-time |
| Cloudflare Workers Paid (game server + DB) | $5/month (covers thousands of concurrent games) |
| Firebase (Analytics, Crashlytics, FCM) | $0 |
| Domain | ~$10–15/year |
| Uptime monitor | $0 (free tier) |
| RevenueCat | $0 until $2.5k/month revenue |
| Icon/screenshots (if outsourced) | $0–$200 |
| **Total to launch on Play** | **~$40 up front + ~$5/month** |
| Later: Apple Developer (iOS) | $99/year |

**Rough capacity on the $5 plan:** each move is one small WebSocket message. 1,000 games/day ×
~60 moves ≈ 60k messages/day, far below the plan's included usage. You'd need **tens of
thousands of daily online players** before the server bill becomes noticeable. By then ads are paying for it.

---

## 9. Suggested build order (what to do first)

| Week | Focus | Done when |
| --- | --- | --- |
| 1 | §1 accounts (you) · §2.1–2.3 server rooms (code) | Two browsers play a full game through the Cloudflare server via room code |
| 2 | §2.3 reconnect/timers · §3.1 client switch to WebSocket · engine tests | Kill/restore network mid-game → game resumes; PeerJS removed |
| 3 | §2.4 matchmaking + bot fallback · §2.5 D1 · §4 Capacitor Android build | Quick Match works; debug APK installs on a phone |
| 4 | §3.2 native polish · §3.3 ads/IAP/consent (test IDs) · §3.4 analytics | Internal testing build with ads + Remove Ads working |
| 5 | §2.6–2.7 rate limits, load + chaos tests · §5 store listing & declarations | 1,000 simulated games pass; listing complete |
| 5–7 | §6 closed test (14 days, 12+ testers) on staging | No crash/ANR issues; online disconnect rate < 2% |
| 7–8 | Production access → staged rollout | **Live on Google Play** 🎉 |
