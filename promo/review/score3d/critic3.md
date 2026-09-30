# Critic 3: score3d (lab 0–5.5 = film 10.0–15.5)

Evidence is in `critic3/`: sheet-*, dive-*, end-*, lab-*, land-h, c60, vfr, hfr, ho-h, the per-frame folders h/ and v/, and the frame-diff logs d-h.txt / d-v.txt.

## Critic 2 items

- **A. Camera pop at 3.533: FIXED.** The frame-diff rises smoothly: 0.45 → 0.60 → 2.1 → 3.9 → 5.8 … 29.8 (frames 210–229). There is no single-frame jump in either aspect. The labels and "Mia Wins!" are at 0 opacity by 3.50, before the dive starts.
- **Dive ease-out and blue handoff: PARTLY.** The dive holds near peak speed until frame 231 (29.5), then 21.8 → 5.5 → 0.1. That is a 2-frame stop, not 3–4. The last 3D frame (233, 3.883) is still only 96.5% blue in H and 93.2% in V. You can see a strip of board grid and base (`end-h.png`, `end-v.png`), and then it cuts to flat blue. This is a small hard cut, not a face that fills the frame.
- **B. Cube colours: FIXED.** The top face of the blue tower is 46,105,214 and 47,107,217, against the 47,107,216 target. The red tower top is 200,54,91, against the 200,56,92 target. The dive face median is 46,106,216, and the field is 45,105,215.
- **C. H base clipped at the bottom: STILL PRESENT.** From 0.5 to 3.5 the subject's lower edge reaches y=1079, and the board base's front edge is cut off (`hfr.png`).
- **V framing: PARTLY, with a regression.** Empty paper at the bottom is now 8–11% (it was 27%). But the subject still fills only 58–66% of the height, and the top 29–39% is empty at 2.0–3.5. The red tower now touches or clips the left edge: its minimum x is 12 at 1.83, **0** at 2.0 and 2.33, and 2 at 2.5. After that it stays at ≤30 px up to 3.5. Critic 2 measured 62–72 px here.
- **Stepped ghost blur (item 5): FIXED.** The landings at 2.17–2.55 show single clean cubes with no duplicates (`land-h.png`).

## New defects

1. **The board's filled boxes are brighter than brand and than their own cubes.** At 0.0 they read 45,105,215 and 198,54,90, which is correct. They then climb over 0.2–0.4 to **60,121,242 and 236,60,106**, and stay there. The cubes lifting out of those boxes are 46,105,214 and 200,54,91. As a result, every lift changes colour, and the board looks cyan and washed out next to the towers (`c60.png`). The lighting ramp or tone-mapping on the board's top plane is over-exposing.
2. **"Mia Wins!" exits across Leo's tower (H 3.40–3.47).** It slides about 470 px left while fading, so it runs across the red tower and the "Leo 6" label at 3.43–3.45 (`lab-h.png`). In V it slides off the left edge and is clipped at 3.42–3.45. This is minor.
3. **The "Mia 10" label is translucent in V 3.42–3.50.** Board lines show through its body as it fades. This is minor.

## What passes

- The handoff at 0.07–0.13 is continuous: the diff stays at 0.36–0.60 with no step (`ho-h.png`).
- White on the field is 5.1:1.
- The key light and shadows are consistent.
- No frozen span lasts longer than about 0.1 s, apart from the intended 3-frame flat blue at 3.90–3.95.

## Verdict: ONE MORE PASS

1. **Pin the board box colours to brand.** Use the same material and colour pipeline as the cubes (sRGB colour with NoToneMapping, or the same key compensation), so the filled boxes stay at 47,107,216 and 200,56,92 all through the tilt.
2. **Finish the dive on the face.** Extend the dive by 2–3 frames with an expo-out. Aim at the centre of the top face of a single cube (not the seam between two) so that the frame is 100% blue before the cut, and hold that for 1–2 frames.
3. **Reframe V at 1.8–3.5 and exit the text cleanly.** Pan the look-at right or narrow the FOV, so the red tower keeps at least 60 px of margin and the subject fills at least 72% of the height. Exit "Mia Wins!" upward or fade it in place instead of sliding it across Leo.
