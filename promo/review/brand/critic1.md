# Critic 1 — brand mark + end card (lab 0–5.5 = film 24.5–30.0)

**Verdict: REVISE.** The first 2.5 s work: the green line hands off cleanly, the dots bloom out, the lines draw, the box pops, and the push to the end card eases in and out. The last 3 s are the problem. They are a linear crawl on a static stack of centred text, which is exactly what the bar rules out.

Evidence is in `review/brand/critic1/`: contact sheets `sheet-h.png` / `sheet-v.png`, the 1/30 s windows `dense-*.png` / `open-*.png`, and the stills `k*.png` and `crop-*.png`.

## Defects, ranked

1. **Linear drift, effectively frozen (lab 2.75–5.5, whole card, both aspects).** Mean frame difference drops from ~4.1 during the move to 0.08–0.15. The only motion is a constant-rate scale. In 16:9 the URL pill widens by exactly about 1 px per side every 0.1 s, from 473→1446 at 2.7 s to 456→1463 at 5.4 s. That is about 1.7% over 2.7 s with no easing: it reads as a hold and breaks "no linear drift". 9:16 is the same (313→305 px).
2. **Type enters by opacity only (lab 2.2–2.9).** "Play free in your browser", the pill and "No install · No sign-up" each just fade in over ~0.25 s, one after another. There is no type-as-motion: no draw, no rise, no mask. It is also the one beat that ought to land hardest.
3. **Empty frame mid-move (lab ~2.0–2.2, lower 60% of the frame, worse in 9:16).** The lockup has shrunk and moved up before anything arrives below it, so for about 0.2 s a small block sits on bare paper.
4. **Mark is inaccurate (visible at every size, 0.6–5.5).** The lines sit about 6.5 px below the dot centres at lab 1.5 (green line centred at y 363.5 vs dot 357; red at 539.5 vs 533). The blue box is washed out: it measures #5d82d9, not #2f6bd8. Its corners overlap the lower two dots.
5. **9:16 URL (lab 2.4–5.5).** It fits with wide margins (pill x 308–772 of 1080), but it breaks after "io/", so it reads as two items, and the text is only about 45 px, roughly 16 pt on a phone. There is room for a single line at about 56 px, or two larger lines.
6. **Minor.** The end-card lockup in 16:9 is small (mark about 150 px tall) next to the tagline, so the hierarchy puts the product name third.

Checks that passed:
- **Contrast** (measured on pixels, AA): URL 12.1:1, tagline 11.9:1, "No install" 11.8:1, the blue "&" 6.8:1, footer 5.4:1.
- **CTA readability:** about 3.0 s.
- **Collisions:** none mid-move.
- **First frame:** a single green round-capped line, as required.

## Top 3 fixes (code)

1. **Replace the end-card crawl with an eased settle followed by a live beat.** Scale 1.04→1.0 with `expo.out` over 0.6 s. Around lab 3.6, redraw the wavy URL underline, stroke-dashoffset 1→0 over 0.5 s with `power2.inOut`. Close with a tiny pulse of the mark's blue box (scale 1→1.06→1). No property should change at a constant rate.
2. **Make the CTA type move.** Split "Play free in your browser" into words and have each rise 40 px with a clip mask, staggered 0.05 s, `expo.out`. The pill should scale in from 0.9 with `back.out(1.4)`, starting 0.1 s *before* the lockup finishes shrinking. That fills the empty frame in defect 3 and overlaps the beats.
3. **Fix the mark and the 9:16 URL.** Put line y exactly on the dot centres (remove the ~6.5 px offset). Fill the box with solid #2f6bd8 and inset it clear of the dots. In 9:16, set the URL on one line (`white-space: nowrap`, font-size about 56 px, pill about 88% of width), or keep two lines at 64 px or more. Enlarge the end-card lockup by about 1.4× in 16:9.
