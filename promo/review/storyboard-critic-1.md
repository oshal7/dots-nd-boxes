# Storyboard critique 1: Dots & Boxes 30 s (v1)

Verdict: **NOT READY.** Up to 12 s the film is strong. From 14 s it turns into a slideshow, it shows game state the code never produces, and several texts fail the contrast rule.

## Ranked problems

1. **#8–#11 are a feature slideshow.** Four "device plus caption" layouts run in a row. #8→#9 is an unrelated slide-in. The phone in #8 covers about 13 % of the frame. #10 leaves the middle of the frame empty, and #11 floats three small devices on paper. *Fix:* cut #11. Use one phone as the persistent actor through #8–#10, switching modes on its screen. Crop it obliquely so it fills at least 60 % of the frame.

2. **The chain arithmetic is wrong** (`main.js:577-605`). Mia has 2 boxes after #4, but #5 starts at 3. Going from 3 to 7 is 4 captures, so the game would show 2x to **5x**, not stop at 4x. "Bonus turn! 🔥" should fire at 6.6 s. Between 7.5 s and 9.5 s, Leo's 7 boxes and about 30 lines appear from nowhere. *Fix:* make the chain score 2→6 with 2x to 5x. Show the pill at 6.6 s. Cascade the remaining moves in during the #5 pull-back.

3. **Invented UI and missing results.** The "thinking" three-dot pulse in #9 does not exist in the code. In #8, Sam's 4th side closes the box. The real game would give an orange fill, an "S", "+1" and a bonus turn, so passing the phone on is wrong. *Fix:* use the Computer card's real `is-active` breathing state. End the pass on Sam's capture, with the fill, S and +1 visible.

4. **Contrast failures on the paper (#f7f2e7).** Blue is 4.46:1, red about 3.5:1, green about 3.3:1 and orange about 2.6:1. That affects "+1", the combo text, name chips, the tower labels and the white "S" on orange. *Fix:* put words in ink, or in white on solid chips. Keep player colours for strokes and fills.

5. **Reading overload from 14 s to 20.5 s.** #8 has 9 words plus 4 chips in 2.0 s. #9 has about 9 words plus a card flip in 2.0 s. #10 has 6 words plus a code plus "Join Room" spread across two phones in 2.5 s. With a moving picture, a viewer reads about 3 words per second. *Fix:* one headline of 3 words or fewer per mode, with the UI legible but not required reading.

6. **The 3D is only half earned.** Handoff C forces a straight-down view of the whole board, which the rules ban. Towers of 9 and 7 thin tiles are only about 20 % apart in height. Lifting 16 tiles, the labels and "Mia Wins!" all fit in 3 s. *Fix:* start the tilt during the #5 pull-back. Use chunky cubes and a 10–6 result. Measure the blue of the top face after tone mapping, because the #7 handoff depends on it.

7. **The 9:16 URL overflows.** 30 characters in Nunito 800 at 58 px is about 1,040 px plus padding on a 1,080 px canvas. *Fix:* 44 px, or break the line after ".io/".

8. **The brand and CTA hold 7 s and repeat.** #12's tagline repeats the words of #3–#6. #13 runs 4.0 s, over the 3.5 s maximum. The cuts land on a metronomic 2-second grid. *Fix:* cut #12 to 1.5 s (mark and name only) and #13 to 3 s. Spend the time on problems 1 and 5, and vary the cut lengths.

9. **Claims that aren't in FACTS.md.** "No download" is not a listed claim (F15 says "no install"). "One phone" narrows F7's "one device". *Fix:* "No install · No sign-up" and "2–4 players, one device".

10. **#1 has too little in frame.** At a 430 px gap only about 4 dots are visible on mostly bare paper, and the shot holds for 1.1 s before moving. *Fix:* include the pen tip and hand shadow, and start the pull at 1.1 s.

## Keep
The paper-to-app handoff. "M", the dashed preview, "Mia Wins!" and the default boards of 5, 6 and 8 match the code. White on blue in #7 is 4.98:1.
