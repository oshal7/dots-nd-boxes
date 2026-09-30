# Critic 4: score3d (lab 0–5.5 = film 10.0–15.5)

Evidence is in `critic4/`: sheet-h/v, dive-h/v, endh/endv, hmid, vmid, vr15, hbot2, labh/labv, vlab, landh, hoh, the per-frame folders h/, v/, hh/ and hv/, and the per-frame log stats.txt.

## Critic 3 items

- **Board box colours: FIXED.** The board's filled boxes at 1.0 read 47,107,217 and 45,105,215 (blue) and 200,54,92 (red). The 95th-percentile blue is 216–219 all the way from 0.0 to 2.0, where critic 3 measured 242. The cube tops are 47,104,212, so a box no longer changes colour when it lifts off.
- **Dive finish: FIXED.** In H, the frame diff falls 30.5 → 27.5 → 15.9 → 1.5 over frames 232–235. The last 3D frame (3.900) is **100%** blue, and the flat field follows at 46,106,216 against the 45,105,215 field, with no visible step. In V, frame 234 is 99.8% blue: only a tiny shaded corner remains, which you cannot see at speed.
- **"Mia Wins!" exit: FIXED.** It now rises and fades in place (3.40–3.47) and no longer crosses Leo in either aspect (`labh`, `labv`).
- **Translucent "Mia 10" in V: FIXED.** The labels stay opaque and scale down as they exit (`vlab`).
- **H base clipped: STILL PRESENT.** The base's dark underside is on the bottom row from **1.50 to 2.50**, covering 73–176 px of that row (`hbot2`, x≈1000–1300 at 2.0). Before 1.4 and after 2.6 it clears the edge, with the lowest pixel at 1032–1069.
- **V framing: PARTLY, with a regression.** Red now clears the left edge, with minimum x 76–124 from 1.0 to 3.5. But the **hero blue tower is now clipped by the right edge from 0.90 to 2.55**: 250–520 px of blue sit on the last column, and the right-hand column of cubes loses about 20–40 px (`vr15`, at 1.5). Top headroom is still 25–39% empty paper, and the subject fills 57–71% of the height.

## Other checks

- **Handoff at 0.07–0.13:** continuous, with diffs of 0.58–0.72 in H and 0.70–0.88 in V and no step (`hoh`).
- **Cube landings (2.17–2.55):** single, clean cubes, with smooth diffs of 3.8 → 5.8 → 2.3.
- **Stills:** the longest static run is the flat blue at 3.93–4.00 (5 frames). Nothing else is still for more than 0.1 s.
- **Colour:** the field is 46,106,216, and white text on it is about 5.1:1.

## New defects

1. The V clipping of the blue tower on the right, described above. Along with the "Mia Wins!" exit, it is a result of the earlier reframe.
2. From 1.5 to 2.5 in H, the base clip lands at exactly the moment the camera is lowest, which reads as the camera being too close rather than intentional.

## Verdict: ONE MORE PASS

1. **V, 0.9–2.55:** move the look-at about 60 px to the right in screen space, or widen the FOV about 4°, so that both towers keep at least 48 px of margin. Use the empty top 25% by lowering the camera's aim point rather than widening further.
2. **H, 1.5–2.5:** raise the look-at or pull the dolly back about 5%, so that the base's front edge keeps at least 24 px of margin above y=1079.
3. No other changes. The colour, dive, labels and handoff all pass now, so this should be the last pass.
