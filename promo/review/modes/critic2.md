# Critic 2 — modes (lab 0–9.5 / film 15.0–24.5)

Evidence is in `critic2/`: sheet-{h,v}-1.png (every 0.1 s), d-*-{h,v}.png (1/30 s strips), f-*.png (native frames), crop-*.png, and diff-{h,v}.txt (frame-difference data).

## Critic 1 items

1. **V online too small: FIXED.** At 8.35 the phones are stacked at about 87 % of the frame width. The names are about 26 px tall and TURN about 20 px.
2. **H "Computer" hits the bezel: FIXED.** The headline ends at x≈550 and the phone starts at x≈745, which leaves about 195 px.
3. **"y" in "Play online" touches the phone: FIXED.** The descender ends at y≈165. The phone top is at y≈212 in V (47 px gap) and y≈230 in H.
4. **No cause for mode changes: FIXED for menu travel, PARTLY overall.** A ripple on "‹ Back" appears at 3.20 and 5.80, and taps land on "Play vs Computer" at 3.9, "Hard" at 4.4, "Start Game" at 4.75, "Play Online" at 6.37 and "Join Room" at 7.7. Each push lasts about 0.25–0.3 s. What remains is new defect A below.
5. **Board sizes: FIXED.** Pass & Play uses 4×4 dots, which is within F13. The setup shows "5×5 · 16 boxes" selected, and the vs Computer and online boards both have 5×5 dots, matching it.
6. **Fill/+1: FIXED.** The deep fill is intentional. The "+1" now measures 5.98:1.
7. **Floating blue bar / teal mix: FIXED.** A tap at 8.1 sends the line along a dashed path. It lands on the same edge on Leo's board at about 8.6, and TURN switches to Leo at the same moment. Green then wipes the line from the left end between 9.1 and 9.37, with no teal at any point. The end is clean: a still green line from 9.40.
8. **Red TURN contrast: FIXED.** Settled readings are 5.4–5.5:1 for Leo, Computer and online. The orange TURN is 5.56, the grey hints 5.8–5.9, and the Computer score 5.43.
9. **H 6.3–6.5 half-empty: STILL PRESENT and wider** (see B).
10. **Low motion: FIXED.** No 0.1 s bin falls below 0.24 mean diff before the final hold, and the only still run is the intended end (9.40–9.50).

## New defects

**A. The online setup has actions without causes and a result that contradicts them (both aspects, 6.6–7.9).**
- The room-code box is already on screen, and at 6.75 "K7QM2P" starts to type itself. Nothing taps "Create Room" first. In the game, the code appears after that tap, and all at once.
- "Waiting for opponent to join…" shows before any code exists.
- After "Join Room" at 7.7, both phones open a board that already has 10 lines drawn while the scores read 0–0. A room that was just joined starts with an empty board.

**B. No headline for about 1.2 s (both aspects, 5.93–7.1 in H, 5.93–7.2 in V).** "vs Computer" exits and "Play online" only lands after the lobby is already moving. At 6.2 (H), the left 40 % of the frame is plain paper, and V has an empty band of about 250 px at the top. The whole room-code exchange plays without a label. There is a smaller version of the same gap at 3.17–3.6 (H).

**C. The V online dashed trail runs through UI text (8.2–8.5).** On the lower phone, the vertical dashes cross "DOTS & BOXES" and Mia's "TURN" pill. This counts as text crossed by a moving element. Leo's phone also covers about 70 % of Mia's board, so the tap happens on the one visible row.

**D. Minor.** At 9.00–9.03 the sharp line lifts about 25 px left of its dots, and a blurred copy stays on the board. For 2 frames this reads as a doubled line (crop-lift.png).

No pops or frozen frames were found. The frame-diff spikes of 13–19 are all on deliberate pushes and zooms. All copy matches `index.html`, including "Pick a board and create a room…", "Enter the 6-character code your friend shared.", "⚙ Connection settings" and "Beat the bot". K7QM2P uses only letters from the F12 alphabet.

## Verdict: ONE MORE PASS

1. **Give online setup a cause and a clean start.** Tap "Create Room" at about 6.6 with a ripple. Show the code all at once, or type it in within 0.2 s, and only then show "Waiting…". After Join, open on an empty 5×5 board, or keep the lines drawn but label nothing that implies a fresh room. The simpler option is an empty board with Mia's first line as the move that crosses between phones.
2. **Bring "Play online" in at about 6.0 (both aspects),** so the headline hands straight over from "vs Computer" with no unlabeled stretch longer than about 0.3 s. Close the 3.17–3.6 gap the same way.
3. **In V, route the trail around text.** Send it down the gap between the phones' bezels and over the board only, or animate the line as a travelling solid segment with no trail. Keep at least 24 px clear of the header text and the TURN pills.
