# Critic 1 — modes (lab 0–9.5 / film 15.0–24.5)

**Verdict: REVISE.** The craft is strong: the UI strings match `index.html`/`main.js`, the capturer keeps TURN (Sam, Computer), lab 0 is already a finished frame, and the ending leaves only the green line (clean from about 9.3). No run of frames is frozen longer than 0.25 s in either aspect. Four problems block KEEP: two headlines collide with the phone, the vertical online section is far too small, two mode switches happen with no action causing them, and the boards are not real game sizes.

## Defects, ranked

1. **V, 6.4–9.0 (online), whole frame.** The two phones sit on a diagonal, each only about 32–35 % of the frame width, with an empty band around y 1000–1260 and at the sides. The subject is well under 60 % of the frame. At 8.4 the "Mia" and "Leo" names are about 12 px tall and TURN about 8 px, which cannot be read at phone viewing size. This takes up 27 % of the component.
2. **H, 3.7–5.9, left third.** The "Computer" headline runs over the phone bezel and side buttons: the "er" sits on top of the frame lines (crop-h43-collide.png).
3. **V, 6.4–9.0, top.** The descender of the "y" in "Play online" touches the top outline of the upper phone (crop-v84.png).
4. **Both, 3.40–3.47 and 6.05–6.35. There is no cause for the mode change.** The setup card or lobby slides in over about 3 frames at 30 fps, with no tap on "‹ Back" or on a mode button. This breaks cursor causality. The 3.4 cut is close to a snap, since it lasts about 0.1 s.
5. **Both, all three modes. The boards are not real sizes.** Pass & Play uses 2×2 dots and the other modes use 3×3 dots. The lobby and setup show **5×5** selected, but the game that follows has 3×3 dots. F13 says a phone board has 4–7 dots per side.
6. **Both, 2.5–3.4. The fill colour is wrong.** Sam's captured box fills brown, rgb(171,99,32). The game draws the player colour at 0.82 opacity (`styles.css:228`), which on paper would be about rgb(235,155,66). The "+1" is also brown and measures 3.7:1 against paper.
7. **H 8.0–9.0 and V 8.0–9.0.** A blue bar floats between the phones, drifting slowly at constant speed (frame difference holds at 0.37–0.51). It does not start at a tap and does not end on the second board, so it reads as a leftover shape rather than "your move arrives". The mix from blue to green passes through a muddy teal, about #2a8aa0, around 9.1–9.2.
8. **Contrast.** The red TURN badge (Leo/Computer) measures **4.1:1**, below 4.5. The other measured text passes: the headlines are 11.3, the "2–4 players" chip 5.5, and the grey labels and hints 5.2–5.9.
9. **H, 6.3–6.5.** "Play online" types on while the single phone sits at the left, so the right half of the frame is empty paper for about 0.2 s.
10. **Low motion.** The camera drifts at constant speed with little else happening at 4.75–5.0, 6.8–7.5 and 8.0–8.5 in both aspects.

## The 3 highest-value fixes

1. **Rebuild the vertical online layout.** Keep the carried phone at 70 % or more of the frame width, with its top at y 330 or lower. Have the second phone slide in overlapping it by about 25 %, or place the two phones in stacked halves each at least 85 % wide. Aim for UI name text of 24 px or more. Add a check against each headline's bounding box: at least 24 px clearance between the headline and any phone outline, in both aspects. In the horizontal version, shift the phone right by about 120 px or set "vs Computer" smaller.
2. **Give every change a cause.** Before 3.4 and before 6.0, show a tap with a ripple on "‹ Back", then a mode chip or button. Replace the 0.1 s snap with an eased push of about 0.3–0.4 s. In the online section, have Mia tap the middle edge on the left phone. The line should leave from that tap point, travel between the phones with an ease-out, and land as the same edge on Leo's board, with TURN switching as it lands. Then turn it green from the paper side instead of mixing through teal.
3. **Match the game's render.** Use a 4×4 or 5×5 dot board, and make it match the selected chip (or select 4×4). Draw box fills as the player colour at 0.82 opacity, not darkened. Darken the red TURN text, or tint its badge background, to reach 4.5:1 or more.

Evidence is in `critic1/`: sheet-h.png, sheet-v.png, d1–d3-{h,v}.png (1/30 s frame strips), grid-*.png, crop-*.png, and diff-{h,v}.txt (frame-difference data).
