# Critic 2: score3d (lab 0–5.5 = film 10.0–15.5)

Evidence is in `critic2/`: sheet-*, w35-*, pop-*, dive-*, land-h, hand-h, crop-*, and frame-diff logs d-h.txt / d-v.txt.

## Critic 1 items

1. **Cube throw: FIXED.** The dive is now a camera move (3.55–3.88) and the tower stays intact with 10 cubes. **Blue handoff: PARTLY.** The dive stops dead: frame-diff goes 13.7 → 2.4 → 0.19 between 3.867 and 3.900, with no ease-out. The last face still has a hotspot (R 20–71, B 207–216 across the frame). It crossfades to a flat 45,105,215 over 3.95–4.00, which is soft but not a match.
2. **Lighting: FIXED.** All shadows now fall back-right from a single left key. A faint contact darkening is visible under both towers (`crop-blue/red.png`), and the towers sit on the paper. The rim light is hard to read, but that is minor.
3. **Opening dip: FIXED.** The board's blue brightens steadily from 46,105,215 to 57,119,237 over 0–0.45. Motion ramps from 0.36 to 2.8 with no step. The handoff cut is clean: YAVG is 0.37–0.54 across 0.07–0.13 in both aspects and the geometry is continuous (`hand-h.png`). A hairline of the base fades in under the board at 0.10–0.15, which is negligible.
4. **V framing: PARTLY.** The red tower now keeps a 62–72 px left margin. But at V 2.0 the subject starts at y=593, leaving the top 31% empty. At V 3.0 it ends at y≈1398, leaving the bottom 27% empty paper. H is fixed: the subject spans x 202–1919 from 2.0 on.
5. **Minor: PARTLY.** Landing arcs now stay in frame, peaking about 40 px from the top. The "motion blur" is made of discrete ghost copies that read as stepped duplicates (H 2.23, 2.47, 2.52). The blue card holds motion at 0.3–0.5 YAVG, which is fine.

## New defects

A. **Hard camera pop at 3.517 → 3.533 (frames 211 → 212, both aspects). This is severe.** Frame-diff jumps to **37.7 H / 50.7 V** against about 2.0 on either side. The camera jumps much closer in a single frame. "Mia Wins!" moves about 950 px (H), and both score labels jump while half-faded (`pop-h.png`, `pop-v.png`). This breaks the "no pops" rule. Most likely a new dive path starts from a different pose.

B. **Brand colour drift on the cubes.** At H 3.5 the blue cubes' median is **13,85,187** (p90 55,106,211) against #2f6bd8 = 47,107,216. The red cubes' median is **192,33,75** against #e0496b = 224,73,107. Both are darker and over-saturated, with the red channel on blue crushed to about 0. This looks like tone-mapping or colour-space handling on the material colour. The flat board lines read brighter than brand (55,117,234). This breaks the "brand colours match" rule and makes the dive-to-field match harder.

C. **Minor.** At H 3.5 the board base's lower-left corner is clipped by the bottom edge. At V 3.55–3.65, wide-angle perspective visibly bends the blue tower before the dive.

The text checks pass: white on the field is 45,105,215, which is 5.0:1, and the labels are legible. The dot and circle window are as expected.

## Verdict: ONE MORE PASS

1. **Remove the 3.533 jump.** Drive the dive from the exact camera pose of frame 211 (position, target and FOV continuous) with expo-in acceleration. Ease out over the last 3–4 frames rather than stopping dead at 3.88. Fade the labels and "Mia Wins!" to 0 before the dive starts.
2. **Match the brand colours on the cubes.** Set material colours as sRGB (`color.convertSRGBToLinear()` / `ColorManagement`), and use `NoToneMapping` or compensate for ACES. Target a lit mid-face of about 47,107,216 and 224,73,107, and keep the key intensity so that highlights stay under about 80,130,235. The final face should then read at about 47,107,216 edge to edge before the cut.
3. **Tighten the V framing.** Move the camera closer or narrow the FOV so board plus towers fill about 75% of the height at 2.0–3.4, with 8% or less empty paper at the bottom. Use a slightly longer lens to reduce the tower bend.
