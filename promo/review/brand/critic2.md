# Critic 2: brand mark and end card (lab 0–5.5 = film 24.5–30.0)

Evidence is in `review/brand/critic2/`: `sheet-h/v.png` (a frame every 0.1 s), `dense-h/v.png` (every 1/30 s from lab 1.7 to 2.5), the stills `k*.png`, the crops `crop-v-url.png` and `pulse.png`, and the per-frame differences in `fd-h/v.txt`.

## Critic 1's defects

1. **Linear drift at 2.75–5.5: FIXED.** The end card still pushes in slowly, but the push is now eased. The ink edge in 16:9 moves 0, 2, 4, 4, 3, 2 px per 0.5 s (x 406→390 from 2.6 to 5.45), so it speeds up and then slows down rather than crawling at one rate. Three other things now move on top of it:
   - The wavy underline draws on at 2.8–3.45. Blue pixel count goes from 5.4k to 9.5k.
   - The mark pulses at 4.35–4.7. The mark's top edge moves y 78→69→78 and blue pixels rise about 12%.
   - Movement runs along the underline between 3.5 and 5.4.

   The 3 s of low motion is the final call-to-action hold, which the quality bar allows.
2. **Type fades in by opacity only: FIXED.** The words of "Play free in your browser" each rise behind a mask, staggered (dense 1.83–2.23). "No install" rises the same way. The pill arrives at 2.07, before the tagline has finished, so the beats overlap.
3. **Empty frame mid-move: PARTLY.** In 16:9 the lower half is bare for about 0.1 s (1.83–1.93). In 9:16 it is bare for about 0.2 s (1.80–2.00, `kv-1.9.png`, with nothing below y 1030). It is short and happens at peak motion (frame difference 6–7), so it is now minor.
4. **Mark inaccurate: FIXED.** Critic 1 was partly wrong here. The lines now sit on the dot centres; in the 9:16 frame at 4.0, the green line and the top row of dots are both at y≈229. The box measures (108,146,222). That matches #3f6fd8 at 0.75 opacity over the paper (the expected value is (108,143,219)), and its overlap with two dots is how the game's own SVG is drawn. Neither is a defect.
5. **9:16 URL: FIXED.** The URL is on one line. The pill spans x 60–1020, the text spans x 120–960 (about 60 px type), and the side margins are 60 px. Nothing is clipped.
6. **Lockup small in 16:9: FIXED.** The mark is now about 205 px tall (y 77–282). The wordmark is centred on the mark, and the whole lockup is centred across the frame (x 525–1405).

## New checks

- **Frame 0:** a single green line with round caps, and nothing else. Ink bounds are 622–1297 × 502–577 in 16:9 and 258–821 × 928–991 in 9:16, and the centre colour is (36,159,108).
- **Pops and glitches:** none. The only isolated jumps are in 9:16 at 3.667 and 3.883, with a mean difference of 0.45. Those are whole-frame resampling steps from the push-in, not a single element popping.
- **Holds:**
  - The longest low-motion stretch before the card is 1.35–1.65 (0.3 s). Confetti and dots are still moving during it.
  - The first 0.05 s is static and reads as a handoff from the previous shot.
- **Collisions and clipping:** none. Words are clipped only inside their own rise masks. In 9:16 at 0.4 the right column of dots is cut off by the frame edge while the camera pulls back, which is intentional.
- **Contrast (sampled pixels):**

  | Text | Contrast |
  |---|---|
  | URL | 13.2:1 |
  | "No install" | 11.6:1 |
  | Blue "&" | 6.7:1 |
  | Footer, 16:9 | 5.5:1 |
  | Footer, 9:16 | 5.4:1 |

  All of it passes WCAG AA.
- **Call to action on screen:** from 2.5 to 5.5, about 3.0 s.
- **Transitional registration (minor):** between 1.83 and 1.93 the mark leads the wordmark upward. In 16:9 at 1.9, the mark's centre is at y≈280 and the text's centre is at y≈389, about 110 px lower than where it settles. It reads as follow-through, not a bug, but in a still it looks unregistered. The whole lockup also overshoots and settles by about 15 px at 2.2–2.45, which is good.
- **Mark pulse at 4.5:** it is so small that a viewer on a phone will probably miss it (`pulse.png`). This is optional polish.

## Optional polish (not blocking)

1. In 9:16, start "Play free" about 0.1 s earlier, at around 1.85, so the lower half is never bare.
2. Bring the pulse up to about a 1.08 scale on the box so the final beat is visible.

**SHIP**
