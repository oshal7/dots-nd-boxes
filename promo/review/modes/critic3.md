# Critic 3: modes (lab 0–9.5 / film 15.0–24.5)

Evidence is in `critic3/`: sheet-{h,v}.png (every 0.1 s), d-*-{h,v}.png (1/30 s strips), f-*.png (native frames), crop-h885-leo.png, and diff-{h,v}.txt (frame-difference data).

## Critic 2 items

**A. Online setup has no cause: FIXED.** Both phones open on an empty Create Room card. A ripple lands on "Create Room" at about 6.75, and "K7QM2P" appears whole inside the dashed box by 6.78. "Copy code / Copy link" fade in at 6.85. "Waiting…" is gone. Leo's field shows the real `ABC123` placeholder, then the code types in from 7.3 to 7.6. The ripple on "Join Room" is at 7.68. After Join, both boards open as empty 5×5 grids with the score 0–0 (7.9). Mia's first line, tapped at 8.1, is the move that crosses between the phones.

**B. Headline gap: FIXED.** "vs Computer" leaves at 5.93, and "Play online" is typing by 6.03 and settled by about 6.3 (both aspects). At 3.37–3.5 the gap is about 0.13 s, and the push covers it.

**C. V trail crosses text: FIXED.** The line now travels as a solid segment with no trail. It goes down the left paper margin outside both bezels (8.2–8.4) and slides in onto row 2 of Leo's board (8.4–8.55). It crosses no text or pills. The landing edge is the same edge Mia tapped, and TURN switches to Leo at 8.63–8.73. In H, the dashed path runs only across board and paper (f-h-8.50).

**D. Doubled lift: FIXED.** At 9.02 (H), the sharp line sits about 60 px left of its dots while the rest of the frame blurs. No blurred copy stays on the carrying board, so it reads as a lift. Green then wipes the line from left to right with a hard edge and no teal (9.05–9.37). The green round-capped line is alone and still from 9.40.

Critic 1 #9 (H half-empty at 6.3) is FIXED. The second phone slides in at 6.65 and the headline holds the left side.

## Measurements

- **Stillness:** no run of 0.25 s or more has a frame diff below 0.05 in either aspect, apart from the intended end hold. The briefest calm is 7.13–7.20, about 0.07 s.
- **Pops:** every frame-diff spike is a deliberate push or zoom. The largest are 19.9 (H, 6.03) and 15.9 (V, 9.02).
- **Contrast:** Mia's TURN is 6.05:1 and the V "Enter the 6-character code…" hint is 6.41:1. Leo's TURN was checked by eye only, and looks settled and clear.
- **Legibility:** at 8.5 (H), the names are about 26 px tall and TURN about 16 px, which is legible.

## New defects (all minor)

1. **Empty screen card, both aspects, 6.45–6.78 (about 0.33 s).** Below "Create Room" there is an empty white card that fills about 45 % of the phone screen (f-v-6.60: y 730–1220), and more empty phone below it. It reads as an unrendered state until the code appears.
2. **V, 6.95–7.15.** The top outline of the lower phone comes within about 5 px of the dashed bottom border of the upper phone's "Copy link" button. The words themselves stay clear.
3. **Placeholder contrast, 6.65–7.25.** The `ABC123` placeholder measures 3.07:1. It is the real UI and it is placeholder text, so it is acceptable, but it is on screen long enough to be read.
4. **H, lab 0.0–0.5 (inside the reveal circle).** The phone bleeds off the top of the frame, and "DOTS & BOXES" is cut by the frame edge. The reveal still shows a finished composition, so this is acceptable.

No clipped settled text, text colliding with other text, contradictory copy or actions without a cause were found. All strings match `index.html`.

## Verdict: SHIP

Optional polish, if another pass happens anyway:
1. Shrink the Create Room card to fit its content until the tap, so the room-code box appears in space the card grows into.
2. In V, lower the second phone by about 20 px, so it stays 24 px or more clear of "Copy link".
