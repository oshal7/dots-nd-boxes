# Dots & Boxes → App Store Business Plan

How to turn this web game into Android and iOS apps that earn money, what to build
before and after launch, what it costs, and when to stop.

> **Short answer:** Yes, it can be a small side income. Treat it as a cheap experiment,
> not a business you buy your way into. The game costs very little to ship (about $125
> in store fees). Paid ads alone will almost certainly **lose** money for a simple ad-funded
> game. The money comes from **retention + organic installs + friends inviting friends**,
> earned through ads and a "Remove Ads" purchase. Plan for **$500–$1,500 total in the first
> 6 months**. A realistic good outcome is **$100–$1,500/month** after 6–12 months. Hitting
> $5k+/month needs a breakout (featuring, a viral moment, or a strong daily-puzzle habit).

---

## 1. Where the product stands today

What we have (from this repo):

| Asset | Status | App-store value |
| --- | --- | --- |
| Core game engine (`src/engine.js`) | Solid, pure logic | Reusable as-is |
| Bot with 3 difficulties (`src/ai.js`) | Good | The main single-player loop |
| Pass & Play, 2–4 players | Done | Good for families and parties |
| Online play via PeerJS (`src/net.js`) | Works, but best-effort | **Not production-grade**: public broker, no matchmaking, no accounts |
| Animations, procedural SFX, paper theme | Polished | Strong for store screenshots and video |
| Persistence / stats / progression | **None** | Biggest gap for retention |
| Offline / PWA | Not set up | Needed so the app works with no network |

**Market reality:** "Dots and Boxes" is a crowded, low-CPM category. Dozens of apps exist,
many old and ugly. Our edge is **polish + modern feel + easy play with friends**. Nobody
searches for "beautiful dots and boxes". They search "dots and boxes", "paper games",
"2 player games", "games to play with friends". The store listing has to win on those terms.

---

## 2. Getting into the stores (technical path)

**Recommendation: wrap the existing web app with [Capacitor](https://capacitorjs.com/).**
Don't rewrite in Flutter or React Native. The codebase is vanilla JS with no build step,
so Capacitor drops in with almost no changes and ships to Android and iOS from one codebase.

| Step | Detail |
| --- | --- |
| Capacitor shell | `npx cap add android`, `npx cap add ios`; web assets bundled locally (fonts and PeerJS are already vendored, which helps) |
| Ads | `@capacitor-community/admob` (Google AdMob) |
| In-app purchases | RevenueCat (free under $2.5k/mo revenue) or `cordova-plugin-purchase` |
| Consent | Google UMP (GDPR/CCPA consent form, required by AdMob in EU/UK); iOS App Tracking Transparency prompt |
| Haptics, share sheet | `@capacitor/haptics`, `@capacitor/share`: cheap "native feel" wins |
| Leaderboards/achievements | Google Play Games Services + Apple Game Center plugins |
| Analytics | Firebase Analytics (free); needed to measure retention and ad revenue |
| Online backend | Move signaling off the public PeerJS broker. Use Firebase Realtime DB/Firestore for rooms + matchmaking (free tier covers early scale), keeping TURN as a fallback |

**Apple-specific warning:** Apple rejects "thin web wrappers" under Guideline 4.2
(Minimum Functionality). To pass review, the app must work fully offline (bot + pass & play),
use native features (haptics, Game Center, share sheet), and feel like an app, not a website.
We should check all three before submitting.

**Mac:** iPad apps run on Apple Silicon Macs automatically. Tick "available on Mac" in
App Store Connect. A separate Mac build isn't worth the effort at this stage.

**Accounts:**
- Google Play Console: **$25 one-time**. New personal accounts must run a **closed test with
  12+ testers for 14 days** before production access, so budget 2–3 weeks for that.
- Apple Developer Program: **$99/year**.

---

## 3. How the app makes money

### Revenue model: free + ads + "Remove Ads" + optional cosmetics

| Stream | How | Notes |
| --- | --- | --- |
| **Interstitial ads** | Full-screen ad **between games**, at most once every 2–3 games, never mid-game, never in the first session | Biggest ad earner, and the main cause of 1-star reviews if overdone |
| **Rewarded video** | Player *chooses* to watch: undo a move, get a hint, unlock a theme for 24h, retry a daily puzzle | Highest eCPM, and players don't mind it. Build this early |
| **Banner** | Small banner on menu screens only (never over the board) | Low revenue; optional |
| **Remove Ads (IAP)** | One-time **$2.99–$4.99** | Typically 1–3% of active players buy. Often 20–40% of total revenue for games like this |
| **Cosmetic packs (IAP)** | Pen/ink colours, paper styles (graph, notebook, chalkboard, neon), dot shapes, win animations: **$0.99–$2.99** each or a "Supporter Pack" | Fits the existing pen-and-ink theme |
| **Optional later: "Pro" subscription** | $1.99/mo: no ads + all themes + ranked stats | Only if retention is strong; skip at launch |

**Kids & families:** Pass & Play makes this attractive to kids, but setting the target
audience to include under-13s puts us in Google's Families policy and COPPA rules, which
restrict ads to certified networks and cut eCPMs sharply. **Recommendation:** set the
audience to 13+ / general audience and don't market to kids.

### Benchmark economics (casual board/puzzle games, 2025–26 ranges)

| Metric | Tier-1 (US/UK/CA/AU) | Tier-2/3 (India, SEA, LATAM) |
| --- | --- | --- |
| Interstitial eCPM | $4–$12 | $0.50–$2 |
| Rewarded eCPM | $8–$20 | $1–$3 |
| Banner eCPM | $0.20–$1 | $0.05–$0.20 |
| Blended ARPDAU (ads + IAP) | $0.04–$0.10 | $0.005–$0.02 |
| Cost per install (paid ads) | Android $0.80–$2, iOS $1.50–$4 | $0.05–$0.30 |

*ARPDAU = average revenue per daily active user. These are industry ranges. Our own
numbers will only be known after launch.*

### What the revenue looks like

Revenue ≈ **DAU × ARPDAU × 30**. Assume a blended ARPDAU of **$0.03** (a global mix, moderate ads):

| Daily active users | Monthly revenue | What it takes |
| --- | --- | --- |
| 300 | ~$270 | Decent ASO + a few friend groups |
| 1,000 | ~$900 | ~100–150 new installs/day sustained |
| 5,000 | ~$4,500 | Strong organic ranking, or a featuring/viral spike |
| 20,000 | ~$18,000 | Breakout; rare for this genre |

A rough rule: **DAU ≈ daily installs × 7–10** for a casual game with average retention.

### Why paid ads alone won't make money (the key number)

- Lifetime value per install ≈ ARPDAU × average days played ≈ $0.03 × 8 = **~$0.25**
  (maybe $0.50–$0.80 for tier-1 users with good retention).
- Tier-1 install cost: **$0.80–$4**.
- So each paid tier-1 install **loses $0.50–$3**. Cheap tier-3 installs ($0.10) roughly break
  even but earn little.

**So the ad budget is for learning and kick-starting, not scaling.** Use it to buy
the first few thousand installs. That gives the stores enough signal to rank us
organically, and it tests store creatives and measures retention. Only scale paid ads
if measured LTV > CPI.

---

## 4. Features to build (prioritised by money impact)

### Must-have before launch (v1.0)
1. **Works fully offline**: bot + pass & play with no network (also needed for Apple review).
2. **Local persistence**: save stats (wins/losses per difficulty, longest chain, streak) in local storage/Preferences.
3. **Ad placements**: interstitial between games (frequency-capped), rewarded "Undo" and "Hint".
4. **Remove Ads IAP** + "Restore purchases" button (Apple requires restore).
5. **Consent flow** (UMP + ATT), privacy policy page (can be hosted on GitHub Pages), Data Safety / App Privacy forms.
6. **Haptics + share-to-invite** for online rooms (deep link → opens the app or the web version).
7. **Rate-the-app prompt** after a *win*, never after a loss (native in-app review APIs).
8. **Analytics events**: game_start, game_end, ad_shown, iap_purchase, retention.

### Retention features (v1.1–v1.3): these drive revenue
9. **Daily Puzzle**: a pre-set mid-game position, "win from here" or "capture N boxes". Same puzzle for everyone each day, shareable result grid (Wordle-style). **This is the single best feature for habit and virality.**
10. **Puzzle campaign**: 100+ hand-picked or generated positions in "chapters" that teach chain strategy (double-crosses, long-chain rule). Stars per level. Content = sessions = ad impressions.
11. **Progression & cosmetics**: earn XP, unlock pen/paper themes. Some unlockable by play, some by IAP or rewarded ad.
12. **Achievements + leaderboards** (Game Center / Play Games): free retention and discovery.
13. **Push notification** (opt-in): "Your daily puzzle is ready" and "Your friend made a move".

### Growth features (v2): only once retention is proven
14. **Real online matchmaking** (random opponent) on a proper backend, with bot fallback if no match in ~10s so players never wait.
15. **Async "turn-based" games with friends** (like Words With Friends): the strongest viral loop, since every game sends an invite.
16. **Ranked mode / ELO** and weekly seasons.
17. **More modes**: hex/triangle grids, power-ups, timed blitz. These keep the game fresh for store updates and "What's New" featuring.
18. **Localisation** (Spanish, Portuguese, Hindi, Indonesian, German, French, Japanese) of store listing first, then UI. Cheap and opens big markets.

---

## 5. Getting downloads

Ordered by return per dollar:

1. **App Store Optimisation (free, highest leverage)**
   - Title: *"Dots and Boxes: Paper Game"*. Subtitle / short description with "2 player", "friends", "classic pencil game", "offline".
   - Six to eight screenshots showing the animations, the chain combo, playing with friends, and themes. A 15–30s preview video (the confetti/combo moments sell it).
   - Localise the listing into 5–8 languages.
   - Ask for ratings at happy moments. Reply to every review.
2. **Built-in virality**: invite link sharing, Daily Puzzle result sharing, "Play with friend" in the share sheet.
3. **Short-form video (free)**: TikTok / Reels / Shorts of satisfying chain combos, "can you solve this?" puzzle clips, "the trick to never losing Dots & Boxes" strategy explainers. This genre works well on short video.
4. **Communities**: r/boardgames, r/puzzles, r/AndroidGaming, r/iosgaming, Product Hunt, Hacker News "Show HN" (the vanilla-JS/no-server story), teacher/classroom groups (it's a maths-y game).
5. **Keep the web version live** on GitHub Pages (or itch.io / CrazyGames / Poki) as a free funnel with "Get the app" buttons. Web portals like CrazyGames also pay ad revenue share.
6. **Paid UA (small, controlled)**: Google App Campaigns (Android) and Apple Search Ads (iOS, exact-match keywords like "dots and boxes" are cheap and high-intent). TikTok/Meta later, for creative testing only.
7. **Featuring**: submit to Apple's "Suggest your app for featuring" form and Google Play's Indie Corner/featuring nominations with every meaningful update.

---

## 6. Budget

### Starting budget (first 6 months)

| Item | Cost | Notes |
| --- | --- | --- |
| Google Play developer account | $25 one-time | |
| Apple Developer Program | $99/year | |
| Domain (optional) for privacy policy / landing | $0–$15/year | GitHub Pages is free |
| App icon + store screenshots/video | $0–$200 | DIY with Figma/Canva, or a Fiverr designer |
| Backend (Firebase) | $0–$25/month | Free tier covers early online play |
| Mac for iOS builds | $0 if you own one; else a cloud Mac (~$30/mo) or GitHub Actions macOS runners | iOS builds require Xcode |
| **Paid UA test budget** | **$300–$1,000** | Split below |
| **Total** | **~$500–$1,500** | |

**How to spend the UA test budget:**
- **Weeks 1–2 after launch: $0.** Let ASO + friends + communities run, and fix crashes.
- **Test 1 ($150–$300):** Apple Search Ads exact keywords + Google App Campaign (target: installs) in 1–2 countries. Goal: measure real CPI, D1/D7 retention and ARPDAU.
- **Test 2 ($150–$500):** only if Test 1 shows D1 ≥ 35% and D7 ≥ 12%. Test 3–5 video creatives; keep the winner.
- **Scale:** only if LTV (measured at D30) > CPI. Then reinvest a fixed share of revenue (e.g. 50%) back into ads.

**Time budget (more important than money):** ~6–10 weeks of evenings and weekends to reach
v1.0 in both stores, then 3–5 hours/week for updates, reviews and content.

### Ongoing yearly cost after launch
~$100–$400/year (Apple fee + small backend) if paid ads are switched off. Then the app can be truly passive.

---

## 7. Roadmap & timeline

| Phase | Weeks | Deliverable |
| --- | --- | --- |
| **0. Prep** | 1 | Developer accounts, privacy policy, Firebase project, AdMob account + ad units, store assets |
| **1. App shell** | 2–3 | Capacitor Android/iOS builds, offline mode, local stats, haptics, share links |
| **2. Monetisation** | 4–5 | AdMob (interstitial + rewarded), Remove Ads IAP, consent (UMP/ATT), analytics |
| **3. Testing** | 5–7 | Google Play 12-tester / 14-day closed test; TestFlight beta with friends |
| **4. Launch v1.0** | 7–8 | Release on Play + App Store (+ Mac via iPad-on-Mac); post to communities |
| **5. Retention** | 9–14 | Daily Puzzle, achievements/leaderboards, cosmetics. First UA test |
| **6. Growth** | 15–26 | Real matchmaking/async online, puzzle campaign, localisation. Scale UA only if LTV > CPI |

---

## 8. Metrics, targets & when to stop

Track weekly in Firebase + AdMob + store consoles:

| Metric | Healthy target (casual board game) |
| --- | --- |
| D1 retention | ≥ 35–40% |
| D7 retention | ≥ 12–15% |
| D30 retention | ≥ 4–6% |
| Sessions / DAU / day | ≥ 2 |
| Games per session | ≥ 2 (each game end = an ad opportunity) |
| ARPDAU | ≥ $0.02 global, ≥ $0.05 tier-1 |
| Remove Ads conversion | ≥ 1% of monthly actives |
| Store rating | ≥ 4.3★ (below this, organic installs collapse; ease off ads) |

**Decision points:**
- **3 months after launch:** D7 < 8% → stop paid ads. Focus only on Daily Puzzle / retention, or keep it as a low-maintenance portfolio app.
- **6 months:** revenue < hosting + fees → switch off paid ads and let it run passively at ~$0 cost.
- **Revenue > $500/mo with LTV > CPI:** reinvest, build async multiplayer, consider a second
  "paper games" title (Tic-Tac-Toe Ultimate, Sprouts, Battleship, Hangman) that **cross-promotes**
  this one. A small portfolio of polished paper games is a more reliable passive-income path than one hit.

---

## 9. Risks

| Risk | Mitigation |
| --- | --- |
| Apple 4.2 rejection (web wrapper) | Offline play, Game Center, haptics, native share; no external links in the game UI |
| Online play unreliable (public PeerJS broker) | Own signaling via Firebase; bot fallback when no opponent |
| Ad overload → bad reviews | Frequency caps; no ads in the first session; rewarded > forced |
| Crowded category, low visibility | ASO, localisation, Daily Puzzle virality, short-form video |
| Privacy/compliance (GDPR, COPPA, ATT) | UMP consent, 13+ audience, accurate Data Safety/App Privacy labels |
| Spending on ads that don't pay back | Hard caps above; scale only on measured LTV > CPI |

---

## 10. Immediate next steps

1. Create Google Play Console + Apple Developer + AdMob + Firebase accounts.
2. Add Capacitor to this repo and produce a first Android debug build.
3. Add local stats persistence + offline check (no network → bot & pass-and-play still work).
4. Integrate AdMob test ads (interstitial + rewarded "Undo") and the Remove Ads IAP.
5. Write the privacy policy page and store listing copy; capture screenshots and a preview video.
6. Recruit 12+ testers for the Google Play closed test (friends, family, a Reddit/Discord post).
