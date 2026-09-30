# Critic 4: board opening (0–10 s)

Evidence is in `critic4/`: sheets at 0.1 s (`s-*`), dense 1/30 s windows (`d-*-54/68/88`), native frames (`f-*`, `n-*`), crops (`c-*`) and motion energy at 60 fps (`me-*.txt`).

## Critic 3 items

1. **Final score doesn't land: FIXED.**
   - H: Mia reaches 10 at 9.20 and both cards stay at full opacity until about 9.83, a 0.63 s hold. They fade out and are gone by 9.90.
   - V: 10 lands at 9.10, holds until 9.73, and is gone by 9.87.
   - Mia's card is scaled up with a blue glow. The "10" is about 55 px cap height in H (f-h-9.3) and about 60 px in V (c-v93-cards).
2. **Leo's capture off-frame / under his card: FIXED.** The cards now sit to the right of the board, about 120 px clear of it from 7.0 onward (f-h-7.9). At H 8.7 the board top is at y≈134 and Leo's first "L" fill is fully inside the frame, far from the cards.
3. **Grey stripe under "Close boxes.": FIXED.** The blue line fades straight to paper: (245,241,231) at y=900–1040, the same as the paper (f-h-6.3).
4. **Minor items: FIXED.**
   - The beige line through "COMBO" is cut out from y≈110 to 270 and reads as paper at 7.9.
   - "Bonus turn!" clears the lines by about 65 px in H and about 60 px in V.
   - `+1` now sits about 35 px above the tip of each "M".
5. **Handoff at 8.4 (was PARTLY): FIXED.** Mia's blue stroke is drawn at x≈396, well inside the frame, and the TURN pill moves to Leo at 8.43.

## Regressions and new hunt

- **Frame 0 is a finished picture.** The pen tip starts the blue stroke. The pen barrel is about 60 px from the "?", and no stroke crosses "Remember" in either aspect.
- **Last frame is correct.** It shows only the plain board: 10 M, 6 L, filling 62% of the height, with a 0.81 keystone. There are no cards and it is clear of the frame edges (V margins are about 80 px).
- **No pops, flicker or held frames.**
  - Every energy spike ramps up and down over at least 0.2 s: 1.3, 4.15, 5.35, 6.85 (whip) and 8.35.
  - No run below 0.05 lasts longer than 0.25 s.
  - The quietest 0.5 s windows are 0.35 (H 3.0) and 0.43 (V 6.0), which is slow drift, not a freeze.
- **The combo counter steps cleanly** from 2x to 5x, with no dip to empty. The score cards match the captures on every step: Mia 1→2→6→10, Leo 0→6.
- **New, minor (V 9.1–9.8):** Mia's scaled-up card sits about 2 px from Leo's card, so the two touch while the score is held (c-v93-cards). H keeps a 16 px gap.
- **New, cosmetic:**
  - At 6.97–7.03 the cards cut over from top-left to the right side and slide in from past the right edge. The whip covers this, and it reads as an entrance.
  - The fading "M" letters during the last rapid captures (H 9.2–9.35) are briefly low-contrast. This is transient and not settled text.
- **Settled text contrast is fine.** Fills measure about 5.1:1 under white letters. Caption, card and pill text are dark on paper.

## Verdict: SHIP

Optional polish that does not block shipping: in V, cap Mia's emphasis scale during 9.1–9.8 (or nudge Leo's card right) so the two cards keep a gap of at least 12 px.
