# Storyboard — Dots & Boxes, 30 s (v2, after storyboard critic 1)

Music: "Familiar Roads" (Tanner Helland), stretched 115.2 → 120 BPM: beat = 0.5 s, bar = 2.0 s. Film 0–4 s = the
song's intro (guitar + building drum fill); **the groove enters at 4.0 s on the first tap**. Every cut is on a beat;
cut lengths vary (2.0 / 2.0 / 1.5 / 1.5 / 3.0 / 4.0 / 1.5 / 3.0 / 2.5 / 3.5 / 2.0 / 3.5).

**Gameplay is real.** Every move, score, bonus turn and combo text comes from `shared/game.json`, produced by
`tools/game-script.mjs`, which plays the moves through the game's own `src/engine.js` and finishes the game with the
game's own bot (`src/ai.js`, seeded). Final score Mia 10 – Leo 6. Real UI strings only: `TURN` badge,
`Bonus turn! 🔥`, `+1`, `Nx COMBO!`, `Mia Wins!`, `Room code`, `Join Room`, `Computer difficulty`, `Easy/Medium/Hard`.

**Carried object:** the 5×5-dot board (s01–s06), then one phone (s07 dot → s08–s10), then one pen line (s10 → mark).

**Type rules:** words in ink `#38352f` or accent-ink `#2f57b0` on paper; white only on blue `#2f6bd8` or on the deep
player tones (`FILL`/`TEXT` in lib.js). Player colours are for lines and filled boxes, never small text on paper.
One headline of ≤ 3 words per beat.

| # | Time | What's on screen | What it's for | How it leaves | Carried into next |
|---|---|---|---|---|---|
| s01 | 0.0–2.0 | **Paper macro.** Hand-inked dots on warm paper at scale ≈ 2.9 around box b_1_1 (dot gap ≈ 430 px, so a 3×3-dot patch fills the frame). Pencil lines: b_1_1's top, left, bottom already drawn, plus other E0 pencil lines in view. A blue ballpoint pen (tip + body + soft hand shadow entering from the lower right) is **already 40 % along** v_1_2 at frame 0. "Remember" top-left, "this game?" bottom-right (Caveat ~180 px). The stroke finishes at 0.8 s, pencil hatching fills b_1_1 (0.8–1.1 s). | Hook: recognition. Frame 0 finished. | Pull-back starts **1.1 s** (scale → 1, fast in the middle, soft landing at 2.0); pen lifts out lower-right; words leave on opposite axes (left word left, right word right), accelerating. | Paper board lands on **B**. |
| s02 | 2.0–4.0 | **Paper → app, same board.** A left-to-right sweep turns pencil lines into crisp app strokes in each drawer's colour (E0 `by`), the hatch into a solid blue fill with white "M". Player cards Mia 1 / Leo 0 (game style, TURN badge on Mia) slide down above the board. Left: "Now in your" / "browser." (Caveat 150 px). | Platform (F15). | Headline exits left at 3.5; on **4.0** the camera pushes into edge h_0_1 (scale → 2.3). | Board, same canvas. |
| s03 | 4.0–5.5 | **"Draw lines."** Close-up (gap ≈ 330 px) of the b_0_1/b_1_1 area. Dashed blue preview marches on h_0_1 (game's preview style), a fingertip tap ripple (4.25), the line snaps (2→10→6.5 width, elastic) with endpoint sparks; Leo's card gets TURN; Leo's red line v_2_1 snaps in at 4.9 (camera drifts down to include it). Word "Draw lines." enters from the right. | F3: one line a turn; each tap has a result. | Word exits right first (5.2); camera glides down-right at the same scale. | b_2_1, now 3-sided. |
| s04 | 5.5–7.0 | **"Close boxes."** Macro (gap ≈ 420 px) on b_2_1. Mia's line v_2_2 snaps (5.75) → radial liquid fill (0.42 s, game curve), white "M" pops, "+1" floats up in accent-ink; status pill **"Bonus turn! 🔥"** at 5.9. Word "Close boxes." enters from the left. | F4. | Word exits left (6.7); camera whips right along the chain (3 ghost copies = motion blur). | The chain. |
| s05 | 7.0–10.0 | **Travelling chain, then the whole game.** 7.0–8.4: Mia closes b_2_2, b_2_3, b_3_3, b_3_2 one every 0.3 s along the snake; combo texts **2x → 5x COMBO!** (growing, shaking, accent-ink); Mia's card ticks 2→6. 8.4–10.0: camera pulls back to the whole board while the remaining 14 real moves play fast (≈ 0.1 s each; Leo's 6-box run and Mia's last 4); cards finish **Mia 10 / Leo 6**; during 9.3–10.0 the board starts tilting back (CSS 3D, top edge recedes) to **22°** about the screen centre. | F4, F5, F6 setup. | Continuous; the tilted board hands off to 3D. | Board at **C** with tilt 22° (see handoff). |
| s06 | 10.0–14.0 | **3D "Win."** Two compositions. **A 10.0–12.0:** the board is a paper slab (identical pixels at the cut), the camera keeps tilting to 45° pitch and orbits 20°; key light soft from the left, warm rim behind; the slab gains a thin edge and a base. Each captured box lifts as a chunky cube (player colour) and stacks onto its owner's tower beside the board, one after another, seating with no gaps (smootherstep, ≤ 5 ms stagger). **B 12.0–14.0:** camera swings lower (≈ 38°) and closer to the towers; HTML labels projected from tower tops: card chips "Mia 10" / "Leo 6" (ink text on card); "Mia Wins!" (Caveat 120 px, ink) lands at 12.6. | F6 as a physical tally: winner visible by height (10 vs 6). | 13.5–14.0: the blue tower tips toward camera; its top face fills the frame; measured colour is steered to brand blue by 14.0. | Blue fills frame. |
| s07 | 14.0–15.5 | **Full-frame type on blue.** "Play it" / "your way." white Caveat ≈ 220 px (4.98:1), entering from opposite sides; one white dot below pulses. | Chapter break. | 15.1–15.5 the dot expands into a circular window revealing s08 underneath (centre = **D**). | The circle becomes the phone screen's tap point. |
| s08 | 15.5–18.5 | **Pass & Play.** One big phone, angled (CSS 3D ~ −16° Y, 6° X), screen ≥ 60 % of frame (bezel cropped by the frame edge). On screen: 4 player cards Mia/Leo/Ava/Sam and one box, large. The phone is *passed*: it slides/rotates to a new position 4 times (0.6 s each); each stop, that player's card gets TURN and one side of the box is drawn in their colour. Sam's side (4th) closes it: orange (deep) fill, white "S", "+1", Sam keeps TURN. Headline "Pass & Play" (ink) + chip "2–4 players". | F7, F8, F4. | The phone's screen swipes left to the next screen (s09) while the phone itself stays. | The phone. |
| s09 | 18.5–21.0 | **vs Computer.** Same phone, less tilt. Screen: setup card, `COMPUTER DIFFICULTY` chips Easy/Medium/Hard; tap moves the selection to Hard (18.9). Swipe to board: cards "Mia" / "Computer", Computer gets TURN, its line draws and closes a box ("C", deep red fill, "+1"). Headline "vs Computer". | F9, F10. | Camera pulls back and left; the phone shrinks to the left third. | The phone. |
| s10 | 21.0–24.5 | **Online.** Left phone: "Room code" box, example code **K7QM2P** letters flip in (21.2–21.8). A second phone rises on the right (mirrored tilt), its join field types K7QM2P, "Join Room" tap (22.6). Then a blue pen line is drawn **from one phone to the other** at mid-height (22.9–23.4) and both screens land the same move at once. Headline "Play online" (top centre). | F11, F12. Two devices, one game. | 23.9–24.5 camera pushes into the line's midpoint; phones blur away; the line thickens and turns green. | Line lands on **L** (the mark's first line). |
| s11 | 24.5–26.5 | **The mark.** The line is the mark's green line; the other dots settle in, the orange and red lines draw, the blue box pops (the menu's own animation order). Lockup "Dots & Boxes" (Caveat 200 px, "&" in accent-ink). | Brand. | 26.2–26.5 the mark slides up and scales to the end-card position. | The mark. |
| s12 | 26.5–30.0 | **CTA end card.** Mark small at top; "Play free in your browser" (Caveat 120 px ink); URL pill (card, ink border) "oshal7.github.io/dots-nd-boxes" (Nunito 800, 54 px in 16:9; 40 px and broken after ".io/" in 9:16); "No install · No sign-up" (Nunito 700, 32 px, ink). Slow 4 % push; mark's dots bob; URL underline draws. Bottom small (≥ 22 px, `#6b655a` 5.2:1): "Animated recreation of the in-game UI · Music: Tanner Helland, CC BY 4.0". | The one action. | Music resolves; drift continues. | — |

## 9:16 (1080×1920)

Same beats and timings. Board centred (B = C, gap 210, dot (0,0) at (120, 540)). Type moves above/below the board:
s01 words top and bottom; s02 headline top (y ≈ 240), cards under the board; s03/s04 words land above the board;
s06 towers sit in front of the board (camera orbits so they're below it), labels above the towers; s07 stacked
words; s08–s09 phone fills ≈ 75 % height, headline at top; s10 phones top and bottom, the connecting line vertical,
then it rotates to horizontal while becoming the mark's line; s12 centred column, URL broken after ".io/".

## Handoffs (constants in shared/handoff.js — both sides import them)

- **B** end s01 = start s02: 5×5 board; h gap 150 dot(0,0) (1000,240); v gap 210 (120,540).
- **C** end s05 = start s06: h gap 150 dot(0,0) (660,240) (board centre = screen centre); v gap 210 (120,540).
  Tilt 22° about the board centre (top edge receding), CSS `perspective: 1800px` with origin at the screen centre.
  three.js camera at s06 t=0: fov = 2·atan((H/2)/1800), at distance 1800 px from the board plane, 1 world unit = 1 px.
  Acceptance: mean |Δ| over the board region between film frames 9.983 and 10.0 < 3/255.
- **D** s07 → s08 reveal centre: h (960, 700); v (540, 1240).
- **L** end s10 = start s11: the mark's green line from mark dot(0,0) to dot(0,1): h (660,540)→(1260,540), stroke 75 px;
  v (290,960)→(790,960), stroke 62.5 px (mark scale 15 / 12.5, i.e. the brand SVG's viewBox units × scale).

## Three signature moments

1. **A doodle becomes the app.** The pen finishes a box on paper, we pull back to the whole sheet, and the pencil
   lines turn into the app's coloured strokes without the board moving.
2. **The score stands up.** Every captured box lifts off the finished board and stacks into its owner's tower;
   who won is obvious from height alone (10 vs 6).
3. **Two phones joined by one line.** Online play is a board move: a line drawn from one phone to the other, the
   same move landing on both screens, and that line becomes the logo.

## Sound plan

Soft whoosh on real camera travel: 1.1 (pull-back), 4.0, 6.7, 8.4, 13.5 (tower fly-through), 15.1 (reveal),
18.4 (screen swipe), 20.8, 23.9. Click-soft on taps: 4.25, 18.9, 22.6. Soft pops on captures (5.75, 7.0–8.2 chain —
thinned, 0.6× when < 0.15 s apart) and on tower tiles (sparse). Chime: "Mia Wins!" 12.6; mark box pop ~25.9.
Music-only version exported.
