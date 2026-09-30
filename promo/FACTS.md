# Facts file — the only source for on-screen claims

Every number, name or claim that appears in the film must be listed here, with where it was verified
(file + line in this repository, at commit 4058599). Anything not on this list does not go on screen.

| # | Claim as it may appear on screen | Verified in |
|---|---|---|
| F1 | Name: **Dots & Boxes** | `index.html` `<h1>Dots <span>&amp;</span> Boxes</h1>` |
| F2 | Tagline: **"Draw lines. Close boxes. Chain combos. Win."** | `index.html` `.tagline` |
| F3 | Players take turns drawing one line between two adjacent dots | `index.html` how-to modal; `src/engine.js` |
| F4 | Completing the 4th side of a box captures it: **+1 point** and a **bonus turn** | `index.html` how-to; `src/main.js:584,605` (`'+' + n`, `'Bonus turn! 🔥'`) |
| F5 | Chained captures show a combo counter, e.g. **"2x COMBO!"**, **"3x COMBO!"** | `src/main.js:590-593` (`S.combo + 'x COMBO!'` when combo ≥ 2) |
| F6 | When every line is drawn, most boxes wins; equal scores tie | `index.html` how-to; `src/main.js:699-700` (`"<name> Wins!"`, `"It's a Tie!"`) |
| F7 | **Pass & Play: 2 to 4 players on one device**, each with their own colour | `index.html` players chips (2/3/4); README |
| F8 | Player colours: blue `#2f6bd8`, red `#e0496b`, green `#23a06b`, orange `#e88a24` | `src/main.js:11` |
| F9 | **Play vs Computer** with **Easy / Medium / Hard** difficulty | `index.html` difficulty chips; `src/ai.js` |
| F10 | The bot is named **"Computer"** | `src/main.js:189` |
| F11 | **Play Online** with a **6-character room code** or a shareable link | `index.html` lobby (`maxlength="6"`); `src/net.js:18,73` |
| F12 | Room codes use `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no ambiguous characters); any code shown is an illustrative example | `src/net.js:18` |
| F13 | Board sizes adapt to the screen: phone 4–7 dots a side, tablet 5–10, desktop 6–12 | `src/main.js:82-99` |
| F14 | Optional turn timer: Off / 10s / 15s / 30s | `index.html` timer chips |
| F15 | Plays in the browser; static site, **no accounts / no sign-up**, no install | README "Tech", "Notes & limitations" |
| F16 | **Free** to play (no payment, no accounts anywhere in the code) | whole repo; README |
| F17 | URL: **oshal7.github.io/dots-nd-boxes** | README "Play" link; `.github/workflows/deploy.yml` (GitHub Pages) |
| F18 | Brand mark: 3×3 dots, three coloured lines (green, orange, red), one blue box | `index.html` `.brand-mark`; `styles.css` `.brand-*` |
| F19 | Quick-chat emotes 👏 😮 🔥 🏆 😅 | `index.html` `#emotes` |

## Honesty rules for this film

- Player names shown on boards (e.g. "Mia", "Leo") are **illustrative names typed into the name fields**, not real
  users. No reviews, ratings, player counts, downloads or rankings appear, because none exist in the facts.
- Room codes are illustrative examples drawn from the real alphabet (F12).
- The UI is an **animated recreation** of the game's real styles (`styles.css`, `src/render.js`), not a screen
  recording. The end card carries a small "Animated recreation of the in-game UI" line.
- Do not claim "4×4 to 7×7" as a fixed range (the README is out of date; the code in F13 is the truth). Prefer
  wording like "boards that fit your screen".
- Online play is best-effort peer-to-peer; do not claim "instant", "anywhere", "worldwide" or "no lag".
