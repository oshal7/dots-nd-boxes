# Builder notes (read fully before writing code)

You are building ONE module of a 30 s motion film for **Dots & Boxes** (the browser game in this repo). The film is
HTML + GSAP (+ three.js for one 3D module), rendered frame by frame by HyperFrames. It must hold up next to premium
SaaS launch films (Contra, Wonder, Replit, Work Louder, Bolt). "No bugs" is not "good": aim for confident, dense,
continuously moving, beautifully typeset frames.

## Read first
- `promo/STORYBOARD.md` (v2) — your shots, timings, what each moment is for, handoffs. Follow it.
- `promo/FACTS.md` — the ONLY source for on-screen words/numbers. Use only real UI strings.
- `promo/BRIEF.md` — audience, brand.
- `promo/shared/lib.js` (helpers, the `Board` class replicating `src/render.js`, `Sparks`, `playerCard`, colours
  `C`, `FILL`, `TEXT`, `LINE`, easings, `keys()`), `promo/shared/tokens.css` (the game's component CSS),
  `promo/shared/handoff.js` (handoff pixels, TILT/PERSPECTIVE, scene times `T`), `promo/shared/film.js` (module contract),
  `promo/shared/game.json` (the real, engine-validated game: E0 pre-drawn lines with who drew them, every move with
  completed boxes, bonus, combo text, scores).
- The real game for look and behaviour: `index.html`, `styles.css`, `src/render.js`, `src/animations.js`, `src/main.js`.
- Motion rules: `/tmp/claude-0/-home-user-dots-nd-boxes/12f56fb1-0605-5b49-a95d-83702c53ac19/scratchpad/kit/business-motion-film/references/motion-grammar.md`
  and `quality-bar.md` (same folder). 3D module also: `three-js-patterns.md`.

## Hard rules
1. **Deterministic.** Every visual is a pure function of film time `t` passed to `render(t)` (or GSAP tweens on the
   passed master `tl` at absolute film times). No `Date.now`, `performance.now`, `requestAnimationFrame`, timers,
   CSS transitions/animations (`transition`/`@keyframes` are forbidden: they run on wall-clock), or `Math.random`.
   Use `rng(seed)` from lib.js. Seeking to any t in any order must give identical pixels.
2. **Only edit your own module file(s)** in `promo/scenes/` (you may add helper files named `scenes/<module>-*.js`).
   Do NOT edit `shared/*`, `scenes/index.js`, other modules, or anything outside `promo/scenes/` and `promo/lab/`,
   `promo/review/`. If you believe a shared value must change, say so in your final report instead.
3. **Both aspect ratios.** `build({ layer, W, H, V })` — `V` is true for 9:16 (1080×1920). Lay out both properly
   (see STORYBOARD "9:16"). Not a crop of 16:9.
4. **Type:** Caveat 700 display, Patrick Hand UI, Nunito 600–800 labels. Every settled text ≥ 4.5:1 contrast: ink
   `#38352f` or accent-ink `#2f57b0` on paper/card; white only on `#2f6bd8` or the deep tones (`FILL`). Nothing
   collides with or flies through other text (outgoing text leaves before incoming text arrives in the same spot).
   Big words enter from opposite sides between consecutive beats; never over busy picture without backing.
5. **Motion:** one lead movement + layered secondary movement, overlapping; speed always changes (land slow enough to
   read, leave fast, next thing decelerates in); no linear motion; nothing frozen longer than ~0.4 s (use a slow 3–5 %
   push/drift during reads). The main subject fills most of the frame; no small cards floating in empty space.
   Frame one of the film is a finished picture. Every action produces a visible result.
6. **Handoffs:** carried objects land on exactly the pixels in `handoff.js` on both sides of a cut.
7. The page background is paper `#f7f2e7` (the `#root` background). Keep your layer background transparent unless a
   shot needs a full-frame colour.
8. Emoji render via Noto Color Emoji (installed). Fonts are already loaded before `build()` runs.

## Commands (run from `promo/`)
- Lab page for your module and a time window:
  `node tools/page.mjs lab/<module>-h h <module> <from> <to>` and `node tools/page.mjs lab/<module>-v v <module> <from> <to>`
- Render: `tools/render.sh lab/<module>-h review/<module>/lab-h.mp4 30 draft` (use 60 high for the final proof).
  Rendering is slow-ish (≈ 1.5 s of wall time per film second at 30fps draft). Render short windows while iterating.
- Stills: `tools/stills.sh review/<module>/lab-h.mp4 review/<module>/sheet-h.png "0 0.5 1 ..." 4 640` then look at the
  PNG with the Read tool. Also `tools/contact-sheet.sh`, `tools/frozen-time.sh` (kit scripts).
- Fast single frames without a full render: `npx hyperframes snapshot lab/<module>-h --at 0.2,0.9,1.4 --no-end -o review/<module>/snap`
  (times are LAB times, i.e. seconds from your window's `from`). `--zoom x,y,w,h` crops a detail at 3× density.

## Done for you means
Your module renders in both aspects with no console errors, matches the storyboard and handoffs, and passes your own
bug check (text overlaps, contrast, frozen stretches, handoff pixels). Finish with a 60 fps `high` render of your
full window in both aspects at `review/<module>/proof-h.mp4` and `proof-v.mp4`, plus a stills sheet of each. An
independent critic will judge them; you do not grade your own work. Your final message: what you built, file list,
exact render paths, known limitations, and any shared-file change you need.
