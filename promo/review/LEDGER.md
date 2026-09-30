# Gauntlet ledger

One row per review round: what was reviewed, what the fresh critic found, what changed, and the numbers before/after.
Critics never see the builder's reasoning; each round's critic is a new agent.

| Round | Artifact | Critic's top findings | Changes made | Measured before → after |
|---|---|---|---|---|
| 0 | 5 s pipeline test (`review/test5`) | — (setup check) | GSAP + three.js + local fonts rendered through HyperFrames at 1920×1080/60 fps, 300 frames | render OK |
| SB-1 | `STORYBOARD.md` v1 | (1) #8–#11 a feature slideshow of small devices; (2) chain maths wrong vs code (combo would reach 5x, bonus pill timing, Leo's boxes from nowhere); (3) invented "thinking" dots, Sam's capture shown without its result; (4) player-colour text fails 4.5:1; (5) too many words 14–20.5 s; (6) 3D handoff forces top-down, towers 9 vs 7 barely differ; (7) URL won't fit 9:16; (8) brand + CTA 7 s and repetitive; (9) "no download"/"one phone" not in facts; (10) frame 0 mostly bare paper | v2: one phone carries s08–s10 (cut the devices beat); gameplay now generated and validated by the game's own `engine.js` + `ai.js` (`tools/game-script.mjs` → `shared/game.json`, 2x→5x COMBO, final 10–6); real UI strings only (TURN badge, Computer card); ink/accent-ink text, deep tones under white; ≤ 3-word headlines; tilt starts in 2D (22°) and 3D takes over mid-tilt; URL 40 px/two lines in 9:16; brand 2.0 s + CTA 3.5 s; "No install · No sign-up", "one device"; pen + hand shadow in frame 0, pull-back at 1.1 s | compositions 13 → 12 (+ 2 inside the 3D beat); on-screen claims all in FACTS.md |
