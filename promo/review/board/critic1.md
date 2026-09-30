# Critic 1 — board opening (0–10 s)

**Verdict: REVISE.** The story reads with the sound off: a pen closes a box, the camera pulls back, a wipe turns pencil into colour, then tap and snap, Leo answers, a capture with +1 and "Bonus turn! 🔥", 2x→5x, a fast play-out to 10–6, and the tilt. Frame one is a finished picture. The combo counter and the scores match `main.js`. What needs work is causality, contrast and framing.

## Defects, most severe first

1. **Combo captures have no cause (both aspects, 7.0–8.0).** After the whip, the four boxes fill with no cursor, tap or snap. The 4th side simply pops in (dense-v-6.6, +0.40–0.47). The real game also shows `+n` on every capture; the film shows it only on the first.
2. **White box letters are below 4.5:1.** The fills measure blue (84,130,218) at **3.76:1** and red (208,89,117) at **3.91:1**. The lighter gradient corner is **3.14:1**. These are not deep tones (f-h-9.983, f-h-8.1).
3. **"+1" is 3.69:1** at (103,125,179) (H 6.0–6.8). The game draws it in solid #2f6bd8. "2x"/"3x COMBO!" are also pale; the darkest pixel reaches only 4.7:1 (f-h-7.1).
4. **"5x COMBO!" collides (H 7.9–8.5, top centre).** The "5" touches Leo's score card (x≈655), and the text hugs the top edge. A blue line crosses the "!". V 8.1–8.5 has the same crossing line with no backing.
5. **Whip strobe (both aspects, 6.85–6.97).** It shows 4–6 discrete ghost copies of the board instead of a blur, which reads as a render artifact.
6. **H framing and holds.**
   - Near-still stretches: 1.6–2.2 has motion energy 0.24. 2.75–3.5 ("Now in your browser.") is 0.12–0.16, against 1–6 elsewhere, so about 0.75 s is almost still.
   - Last frame: the board is only **34% of width and 53% of height**. The tilt is a faint keystone with no depth, so it reads as distortion.
   - V framing is fine.
7. **Text over lines (H).** A blue line passes through "Close" at 5.6–6.8, bottom left, with only a faint glow behind it (f-h-6.3). "Draw lines." sits over the grid at 4.4–5.3.
8. **Minor.**
   - The score chips are about 12 px in the H wide shots (2.4–4.1), too small to read on a phone.
   - The cursor dot sits 40–60 px from the tap ripple (V 4.6, H 5.45).
   - The pencil board has fewer lines than the coloured board it becomes (f-h-2.0 vs f-h-3.2).

## The 3 fixes worth the most

1. **Cause every combo capture.** For each box: cursor travel, tap ripple, a stroke snap of about 120 ms, then the fill. Gaps shrink from 0.25 to 0.18 s. Add `+1` on each capture. Replace the strobing whip with one eased move that has real motion blur, or cut on a tap.
2. **Fix contrast in the tokens.** Use deep fills such as #1f4fae and #b8324f with no light corner, so white letters reach 4.5:1 or better. Settle `+1` and `Nx COMBO!` in solid #2f6bd8 or #2f57b0. Put a paper backing plate behind big words and combo text.
3. **Frame and land the ending.** Keep combo text at least 40 px from the top edge and the score cards, or tuck the cards away during combos. From 9.2 to 10.0 in H, push in to about 70% of frame height. Tilt with rotateX at 25–35° and a soft contact shadow. Add a slow push through 2.75–3.5.
