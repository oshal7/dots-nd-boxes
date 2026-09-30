# Critic 2: board opening (0–10 s)

Evidence is in `critic2/`: sheets at 0.1 s, dense 1/30 s windows (`d-*`), native frames (`f-*`), the whip grid, and crops.

## Critic 1 items

1. **Combo captures without cause: FIXED.** From 7.0 to 8.0, every capture has cursor travel, a tap ripple, a stroke, then the fill. Each box shows `+1` (d-h-6.6, d-v-6.6). The gaps run from about 0.33 s down to 0.2 s.
2. **White letters under 4.5:1: FIXED.** Blue fill (45,105,215) measures **5.11:1**. Red fill (200,54,91) measures **5.08:1**. Both are flat, with no light corner (f-h-9.983, f-v-9.983).
3. **Pale "+1" and combo text: FIXED.** The text body (42,84,174) on paper measures **6.25–6.35:1** (H 6.3, H 7.9, V 8.2).
4. **"5x COMBO!" collisions: PARTLY.**
   - The "5" is now about 150 px clear of Leo's card, and the top margin is about 120 px (f-h-7.9).
   - Still present: the "!" sits on the right-hand blue vertical line in H (x≈1450, 7.9–8.4) and in V (x≈885, 7.9–8.4). Only a glow separates them.
5. **Whip strobe: FIXED.** 6.83–6.93 is a real directional blur with no ghost copies (whip.png). Small leftover: the caption "Close boxes." slides out perfectly sharp while the board under it blurs.
6. **H holds and ending: FIXED.**
   - The lowest motion is 0.45 at 2.0 s, for about 0.2 s. The 2.6–3.4 stretch is now a steady slow push (energy about 2.0). Nothing is frozen for more than 0.5 s.
   - The last frame fills **63%** of H height, with a clear keystone: the top edge is 0.82× the bottom. No score cards remain.
   - There is still no contact shadow, but it reads as a tilt.
7. **Text over lines: FIXED** for "Close boxes." (H 6.3), where a paper plate fades the line out. "Draw lines." is clear.
8. **Minor items.**
   - Score chips at 2.4–4.1: FIXED. They are about 110 px tall in H (f-h-3.2).
   - Cursor offset: FIXED. The cursor sits on the ripple centre.
   - Pencil board versus coloured board: FIXED. The wipe at 2.45 maps line for line (pp.png).

## New defects

1. **The "+1" backing plate erases the game (H and V, 5.9–6.8).** A soft paper rectangle behind `+1` wipes out about 30 px of the blue box's right edge and fades the red top line to pink (f-h-6.3 x 1160–1420, y 310–560; cv63.png). It looks like a smudge on the captured box, right on the film's key moment.
2. **Frame 0 has text crossed by a line.** A grey pencil stroke at x≈220 runs straight through the "R" of "Remember", with only a halo behind it (f-h-0). The pen barrel also passes within about 20 px of the "?" of "this game?". This is the first frame people see.
3. **V combo framing clips the board.** From 7.0 to 8.5, the left column is cut through the middle of its "M" letters at x=0 (f-v-8.2). The "5" of the combo text also butts against the filled box edge at x≈165. The result reads as a crop accident, not a deliberate close-up.
4. **Minor.**
   - "Bonus turn! 🔥" has about 30 px cap height in V (1.6% of frame height), which is marginal at phone size. Grid lines touch both ends of its pill (V 6.0–6.7).
   - Each `Nx COMBO!` fades almost to nothing between steps (for example V 7.23 and 7.53), so the counter flickers instead of stepping up.
   - Mia's move that hands the turn to Leo at about 8.4 happens during the pull-back and cannot be seen.

Frame 0 is otherwise a finished picture. The scores step 1→2→6 for Mia, then Leo reaches 6 and Mia reaches 10. The final board has 10 M boxes and 6 L boxes, all 16 filled, and it is the only thing left on screen.

## Verdict: ONE MORE PASS

1. **Remove the `+1` plate.** Let `+1` float on paper using its 6.3:1 colour, or clip the plate to empty paper only. It must never cover the box fill or the drawn lines.
2. **Clear the "!" and the frame-0 "R".** Nudge "5x COMBO!" left by about 40 px, or scale it to 0.9, so the "!" lands on paper in both aspects. Shift "Remember" so no pencil stroke crosses its letters, and give the pen at least 40 px of clearance from "this game?".
3. **Reframe the V combo shot.** Pull back or shift about 60 px right so no "M" is cut by the left edge. Keep at least 24 px between "5x" and the filled box.
