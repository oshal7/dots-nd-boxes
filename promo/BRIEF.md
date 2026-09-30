# Brief — Dots & Boxes, 30 s launch film

The request arrived with its brief fields unfilled and the requester away, so every field below is a decision
made from the repository itself. Each one names its source.

| Field | Decision | Why |
|---|---|---|
| What the video is for | **Dots & Boxes**, the free browser game in this repo (pass & play, vs computer, online with a room code) | The only product in scope; README + `index.html` |
| Who's watching | People who played dots and boxes on paper as kids, now scrolling on a phone; friends, couples, families who want a quick two-minute game together. They care that it's *the game they know*, that it starts instantly, and that they can play with the person next to them or far away | Game modes in `index.html`; casual game audience |
| What they should do at the end | **Play free in your browser → oshal7.github.io/dots-nd-boxes** | README "Play" link, FACTS F15–F17 |
| Length and sizes | **30 s**, master **16:9 1920×1080 @ 60 fps**, plus **9:16 1080×1920 @ 60 fps** for phone feeds | Casual audience watches on phones |
| Brand | Name "Dots & Boxes"; mark = 3×3 dots, green/orange/red lines, blue box (F18). Paper `#f7f2e7`, card `#fffdf7`, ink `#38352f`, players blue `#2f6bd8`, red `#e0496b`, green `#23a06b`, orange `#e88a24`. Type: Caveat 700 (display), Patrick Hand (UI), Nunito 600–800 (labels) | `styles.css :root`, `index.html` |
| Facts file | `promo/FACTS.md` — only source for on-screen claims | Written from code |
| Assets | None supplied. The UI is rebuilt in code from the game's own styles and board geometry (`src/render.js`, `styles.css`), which is truer to the product than generated imagery. No generated images or clips are used | Kit: prefer building shots in code |
| Style references | None supplied → the kit's motion notes (`launch-film-notes.md`): Contra 24 (foreground fly-through), Wonder 18/19 (selection → expansion), Replit 12 (continuous canvas), Work Louder 22 (physical layers), Poke 17 (request → confirmation), Bolt 25 (brand shape as portal) | Brief: "if no references, use the motion notes in the kit" |
| Music | "Familiar Roads" by Tanner Helland (human-composed; Rhodes, finger bass, steel-string guitar, harp, kit; D major, 115.2 BPM → stretched to 120 BPM so every cut is on a beat). CC BY 4.0, credited | Library music preferred; mixkit.co is blocked by this environment's network policy |
| SFX | HyperFrames bundled library (Pixabay Content License): soft whoosh, click-soft, pop, chime | Kit audio rules |

## The single message

It's the pen-and-paper game you already know, made delightful. Play it free in your browser with friends
on one phone, against the computer, or online with a room code.

## Must never be claimed

Player counts, ratings, reviews, "instant/lag-free/anywhere" online play, app-store availability, a fixed
"4×4–7×7" size range, accounts or saved progress. See FACTS.md honesty rules.

## Done means

Every check in the kit's `quality-bar.md` plus the brief's quality bar, measured, and a fresh critic's SHIP.
