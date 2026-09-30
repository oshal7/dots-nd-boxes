# Critic 3: board opening (0–10 s)

Evidence is in `critic3/`: sheets at 0.1 s, dense 1/30 s windows (`d-*`), native frames (`f-*`) and crops (`c-*`). Motion energy was measured at 60 fps (`me-*.txt`).

## Critic 2 items

1. **The `+1` plate erasing the box: FIXED.** At H and V 6.3, the box edges are intact and the red and blue lines keep full colour. `+1` floats on bare paper.
2. **Frame 0: FIXED.** The nearest pencil stroke is about 85 px from the "R" (H x=220 against 305). The pen barrel is about 100 px above the "?" in H. V is clean, with a 35 px right margin on the "?".
3. **V combo framing: FIXED.** At V 8.2 the left column dots sit at x=37 and every "M" is whole. The "5" is 50 px from the filled box. The "!" is 40 px from the right line (c-v-7.967).
4. **"!" on the blue line: FIXED.** In H 7.9 the "!" ends at x≈1330, and the line is at 1450.
5. **"Bonus turn!" size: FIXED.** It is now about 35 px cap height in H and about 50 px in V. It is PARTLY clear of lines:
   - H 6.3: the top of the pill touches the dot and blue line at y≈787.
   - V: the grid lines run into both ends of the pill.
6. **Combo flicker: FIXED.** Each step swaps with a scale-in and never drops to empty (V 7.33→7.37, 7.57→7.60).
7. **Hidden handoff at 8.4: PARTLY.** Mia's blue stroke and spark are visible at H 8.42–8.45, x≈168, and the TURN pill moves to Leo. It is small and sits at the frame edge.

Leftovers from critic 1 and 2 still hold:
- Fills measure 5.1:1.
- The last frame is 62% of H height with a 0.82 keystone, and shows the plain board only (10 M, 6 L).
- The combo count follows `main.js` (1 from the 5.8 capture, then 2x–5x in the same turn).
- There is no still stretch over 0.3 s. The lowest energy is 0.32–0.37 at 2.5–3.0 and 6.0–6.5.

## New defects

1. **The final score never lands (H and V, 9.2–9.5).** Mia goes 7→8→9→10 in about 0.2 s. "10 / 6" is at full opacity only from 9.40 to about 9.45, then the cards fade. In H they are also small (about 70 px tall, top-left, f-h-9.2). The result the story promises cannot be read.
2. **Leo's first capture happens off-frame and under his own card (H 8.62–8.75).** During the pull-back the red fill circle is cut by the top edge and sits behind the "Leo 1" card (f-h-8.667). Earlier, at 7.0–8.6, Leo's card also sits on the top-row "M" box and nearly touches the letter at 7.9 (c-h79-top).
3. **The caption plate leaves a cold grey stripe (H 5.7–6.8).** Behind "Close boxes." the faded blue line becomes (229,229,229), against paper at (248,242,230). This leaves a visible grey bar through "lo" (c-h63-bl). The beige lines fade correctly.
4. **Minor.**
   - An undrawn beige line runs through "COMBO" between the O and the M, in H and V 7.8–8.4. It is faded only near the glyphs.
   - The `+1` labels sit on the top-right corner of each "M" and touch it.

The whip (6.83–6.93) is a clean blur. I found no pops, empty frames or strobe.

## Verdict: ONE MORE PASS

1. **Land "Mia 10 / Leo 6".** Hold the score cards at full opacity for at least 0.5 s after the last capture, at about 110 px tall in H. Scale Mia's card or add a flash. Fade them out only after that, starting around 9.5.
2. **Keep Leo's reply on screen.** Start the pull-back about 0.15 s earlier, or reframe, so his first capture lands at least 40 px inside the frame and clear of the cards. Slide the cards out of the board area during 7.0–8.6.
3. **Fade struck lines to the paper tone, not grey,** under the "Close boxes." plate. Also clear the line through "COMBO", and keep "Bonus turn!" at least 16 px off dots and lines.
