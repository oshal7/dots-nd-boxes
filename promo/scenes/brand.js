// brand — s11 the mark (24.5–26.5) → s12 CTA end card (26.5–30.0).
// Handoff IN at 24.5: the green line of the mark at L (hand(V).L), mark scale L.markScale, dot(0,0) at (L.x1, L.y).
// The mark is the game's own SVG (index.html .brand-mark, viewBox 0 0 120 120). Every visual is a pure function of t.
import { C, svg, div, css, clamp, lerp, seg, smooth, smoother, outCubic, outQuint, inOutCubic, outBack, Sparks } from '../shared/lib.js';
import { hand } from '../shared/handoff.js';

const T0 = 24.5;
// mark geometry in viewBox units (index.html .brand-mark)
const DOTS = [[20, 20], [60, 20], [100, 20], [20, 60], [60, 60], [100, 60], [20, 100], [60, 100], [100, 100]];
const L2 = [[60, 20], [60, 60]], L3 = [[60, 60], [100, 60]];
const BOX = { x: 24, y: 64, w: 32, h: 32, rx: 5, cx: 40, cy: 80 };
// the game's dot-bob delays: nth-child(2n) 0.3 s, nth-child(3n) 0.6 s (3n wins, it comes later in styles.css)
// Phase is shared per ROW (0 / 0.3 / 0.6 s, the game's three delays) so the drawn lines stay exactly on the dot
// centres and the horizontal lines stay level while the dots bob.
const BOB_DELAY = DOTS.map(([, y]) => (y === 20 ? 0 : y === 60 ? 0.3 : 0.6));
const sineIO = (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));

// timings (film seconds)
const TM = {
  dotsFrom: 24.52, dotStagger: 0.045, dotDur: 0.36,
  l2: [24.95, 25.35], l3: [25.3, 25.7], box: [25.62, 26.2],
  zoomEnd: 26.05,                        // camera ease-out (lead movement of s11)
  letters: 25.28, letterStagger: 0.034, letterDur: 0.5,
  move: [26.05, 26.65], lockLag: 0.06,   // mark + lockup slide up to the end card
  head: 26.42, headStagger: 0.05, headDur: 0.62,   // words rise from a mask; starts before the lockup lands
  pill: [26.56, 27.06], sub: [26.72, 27.2], credit: [26.8, 27.25],
  settle: [26.7, 27.35],                // camera 1.04 → 1.0 after the card lands (expo out)
  drift: [26.95, 30.5],                 // then a slow eased push 1.0 → 1.03 (sine in-out; still moving at 30.0)
  under: [27.28, 27.84],                // live beat 1: URL pen underline draws (power2.inOut)
  pulse: 28.7,                          // live beat 2: blue box re-pop + a hop ripple through the dots
  hover: [29.25, 29.7],                 // live beat 3: the pill lifts like the game's button hover
};
const inOutQuad = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const outExpoS = (x) => (x >= 1 ? 1 : (1 - Math.pow(2, -10 * x)) / (1 - Math.pow(2, -10)));

export default {
  id: 'brand', vis: [24.5, 30],
  async build({ layer, W, H, V }) {
    const L = hand(V).L;
    const headT0 = V ? 26.5 : TM.head; // 9:16: the rising lockup crosses the headline's band, so it clears first
    // 9:16: the pill and sub-line sit below the lockup's path, so they arrive first and fill the lower half during the move
    const pillT = V ? [26.35, 26.85] : TM.pill, subT = V ? [26.5, 26.98] : TM.sub;
    const cam = div('', layer, '', { position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px' });

    // ---------- layout (all in film px) ----------
    const LY = V
      ? { s1: 5.0, m1: [540, 800], lockF: 200, lock1: [540, 1215], s2: 2.8, m2: [540, 355], lockK2: 0.64, lock2: [540, 618],
          headF: 150, head: [540, 915], headLines: ['Play free', 'in your browser'], urlF: 56, pill: [540, 1272],
          subF: 40, sub: [540, 1470], creditF: 24, credit: [540, 1770], pivot: [540, 900] }
      : { s1: 4.4, m1: null, lockF: 212, lock1: null, s2: 2.24, m2: null, lockK2: 0.62, lock2: null,
          headF: 132, head: [960, 452], headLines: ['Play free in your browser'], urlF: 58, pill: [960, 668],
          subF: 36, sub: [960, 832], creditF: 24, credit: [960, 1030], pivot: [960, 520] };

    // ---------- the mark ----------
    const stage = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, cam);
    css(stage, { position: 'absolute', left: 0, top: 0 });
    const gMark = svg('g', {}, stage);
    const gDots = svg('g', {}, gMark);
    const dots = DOTS.map(([x, y]) => svg('circle', { cx: 0, cy: 0, r: 6, fill: C.ink, transform: `translate(${x} ${y})` }, gDots));
    const mkLine = (col) => svg('line', { stroke: col, 'stroke-width': 5, 'stroke-linecap': 'round' }, gMark);
    const l1 = mkLine(C.p3), l2 = mkLine(C.p4), l3 = mkLine(C.p2);
    const box = svg('rect', { x: BOX.x, y: BOX.y, width: BOX.w, height: BOX.h, rx: BOX.rx, fill: C.accent, opacity: 0 }, gMark);
    const sparks = new Sparks(stage, 30);

    // ---------- lockup "Dots & Boxes" (F1) ----------
    const lock = div('cv', cam, '', { position: 'absolute', left: 0, top: 0, fontSize: LY.lockF + 'px', lineHeight: 1, transformOrigin: '50% 50%', letterSpacing: '1px' });
    const letters = [];
    for (const ch of 'Dots & Boxes') {
      const s = document.createElement('span');
      s.textContent = ch === ' ' ? ' ' : ch; s.style.display = 'inline-block';
      if (ch === '&') s.style.color = C.accentInk;
      lock.appendChild(s); letters.push(s);
    }
    let lockW = lock.offsetWidth; const lockH = lock.offsetHeight;
    if (V && lockW > W - 200) { const f = LY.lockF * (W - 200) / lockW; lock.style.fontSize = f + 'px'; LY.lockF = f; lockW = lock.offsetWidth; }
    const lockH2 = lock.offsetHeight;
    // 16:9: mark left, lockup right, centred as one group; text optically centred on the mark
    const markVis = (s) => 92 * s; // visible extent of the mark (dots 14..106)
    if (!V) {
      const gap = 64, total = markVis(LY.s1) + gap + lockW, x0 = (W - total) / 2;
      LY.m1 = [x0 + markVis(LY.s1) / 2, 540];
      LY.lock1 = [x0 + markVis(LY.s1) + gap + lockW / 2, 540 + 6];
      const g2 = 44, lw2 = lockW * LY.lockK2, tot2 = markVis(LY.s2) + g2 + lw2, x2 = (W - tot2) / 2;
      LY.m2 = [x2 + markVis(LY.s2) / 2, 190];
      LY.lock2 = [x2 + markVis(LY.s2) + g2 + lw2 / 2, 190 + 5];
    }
    void lockH;

    // ---------- end card ----------
    const head = div('cv', cam, '', { position: 'absolute', left: 0, top: 0, fontSize: LY.headF + 'px', lineHeight: 0.95, textAlign: 'center', color: C.ink, transformOrigin: '50% 50%' });
    const headWords = [];
    for (const line of LY.headLines) {
      const ld = div('', head, '', { whiteSpace: 'nowrap' });
      line.split(' ').forEach((w, i) => {
        if (i) ld.appendChild(document.createTextNode(' '));
        // mask: the word rises from below its own clip box (padding keeps Caveat's descenders inside the clip)
        const m = document.createElement('span'); css(m, { display: 'inline-block', overflow: 'hidden', padding: '0.06em 0.06em 0.24em', margin: '-0.06em -0.06em -0.24em', verticalAlign: 'top' });
        const inner = document.createElement('span'); inner.textContent = w; css(inner, { display: 'inline-block' });
        m.appendChild(inner); ld.appendChild(m); headWords.push(inner);
      });
    }
    const headW = head.offsetWidth, headH = head.offsetHeight;

    let urlLines = ['oshal7.github.io/dots-nd-boxes'], padX = Math.round(LY.urlF * 0.9);
    if (V) {
      const m = div('ui', layer, urlLines[0], { position: 'absolute', fontWeight: 800, fontSize: LY.urlF + 'px', whiteSpace: 'nowrap', visibility: 'hidden' });
      const tw = m.offsetWidth; m.remove();
      const target = Math.min(0.88 * W, W - 80), bord = Math.round(2 * (LY.urlF / 20) * 0.75);
      padX = Math.floor((target - tw) / 2 - bord);
      if (padX < LY.urlF * 0.45) { LY.urlF = 64; urlLines = ['oshal7.github.io/', 'dots-nd-boxes']; padX = Math.round(LY.urlF * 0.9); }
    }
    const k = LY.urlF / 20; // the game's .btn at 20 px → scale
    const pill = div('', cam, '', { position: 'absolute', left: 0, top: 0, background: C.card, border: `${Math.round(2 * k * 0.75)}px solid ${C.ink}`,
      borderRadius: Math.round(14 * k) + 'px', boxShadow: `${Math.round(3 * k)}px ${Math.round(3 * k)}px 0 rgba(56,53,47,0.16)`,
      padding: `${Math.round(LY.urlF * 0.42)}px ${padX}px ${Math.round(LY.urlF * 0.62)}px`, transformOrigin: '50% 50%' });
    const url = div('ui', pill, urlLines.join('<br>'), { fontWeight: 800, fontSize: LY.urlF + 'px', lineHeight: 1.18, color: C.ink, textAlign: 'center', whiteSpace: 'nowrap', position: 'relative' });
    const pillW = pill.offsetWidth, pillH = pill.offsetHeight;
    // pen underline under the (last line of the) URL, hand-drawn wobble, drawn once
    const urlBox = url.getBoundingClientRect();
    const lastW = (() => { const m = div('ui', layer, urlLines[urlLines.length - 1], { position: 'absolute', fontWeight: 800, fontSize: LY.urlF + 'px', whiteSpace: 'nowrap', visibility: 'hidden' }); const w = m.offsetWidth; m.remove(); return w; })();
    const uw = lastW * 1.02, uy = urlBox.height + LY.urlF * 0.1, ux0 = (urlBox.width - uw) / 2;
    const uSvg = svg('svg', { width: urlBox.width, height: urlBox.height + LY.urlF * 0.4 }, url);
    css(uSvg, { position: 'absolute', left: 0, top: 0, overflow: 'visible' });
    let d = `M${ux0},${uy + 2}`; const N = 8;
    for (let i = 1; i <= N; i++) { const x = ux0 + (uw * i) / N, y = uy + (i % 2 ? -1 : 1) * LY.urlF * 0.035 + (i / N) * -LY.urlF * 0.04; d += ` L${x.toFixed(1)},${y.toFixed(1)}`; }
    const under = svg('path', { d, fill: 'none', stroke: C.accent, 'stroke-width': Math.max(4, LY.urlF * 0.1), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, uSvg);
    const uLen = under.getTotalLength(); under.setAttribute('stroke-dasharray', `${uLen} ${uLen + 10}`);

    const sub = div('ui', cam, '', { position: 'absolute', left: 0, top: 0, fontWeight: 700, fontSize: LY.subF + 'px', color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', padding: '0.1em 0.2em' });
    const subIn = div('', sub, 'No install · No sign-up', { display: 'inline-block' });
    const subW = sub.offsetWidth, subH = sub.offsetHeight;
    const creditTxt = V ? 'Animated recreation of the in-game UI<br>Music: Tanner Helland, CC BY 4.0' : 'Animated recreation of the in-game UI · Music: Tanner Helland, CC BY 4.0';
    const credit = div('ui', layer, creditTxt, { position: 'absolute', left: 0, top: 0, fontWeight: 700, fontSize: LY.creditF + 'px', lineHeight: 1.45, color: C.inkText2, textAlign: 'center', whiteSpace: 'nowrap' });
    const crW = credit.offsetWidth, crH = credit.offsetHeight;

    // ---------- mark state as a function of t ----------
    const S0 = L.markScale, O0 = [L.x1 - 20 * S0, L.y - 20 * S0];
    const originFor = (s, c) => [c[0] - 60 * s, c[1] - 60 * s];
    const O1 = originFor(LY.s1, LY.m1), O2 = originFor(LY.s2, LY.m2);
    const zoomEase = (u) => 1 - Math.pow(1 - smoother(u), 2.2);
    function markState(t) {
      if (t <= TM.zoomEnd) {
        // camera ease-out about its fixed point: scale in log space, origin linear in scale
        const kk = zoomEase(seg(t, T0, TM.zoomEnd));
        const s = S0 * Math.pow(LY.s1 / S0, kk), f = (s - S0) / (LY.s1 - S0);
        return { s, o: [lerp(O0[0], O1[0], f), lerp(O0[1], O1[1], f)] };
      }
      const kk = inOutCubic(seg(t, TM.move[0], TM.move[1]));
      const s = LY.s1 * Math.pow(LY.s2 / LY.s1, kk);
      const c = [lerp(LY.m1[0], LY.m2[0], kk), lerp(LY.m1[1], LY.m2[1], kk)];
      return { s, o: originFor(s, c) };
    }
    const toScreen = (t, x, y) => { const m = markState(t); return [m.o[0] + x * m.s, m.o[1] + y * m.s]; };

    const place = (el, cx, cy, w, h, sc = 1, o = 1, dx = 0, dy = 0) => {
      el.style.transform = `translate(${(cx - w / 2 + dx).toFixed(2)}px,${(cy - h / 2 + dy).toFixed(2)}px) scale(${sc.toFixed(4)})`;
      el.style.opacity = o;
    };

    const bursts = [];
    { const [x, y] = toScreen(TM.l2[1], 60, 60); bursts.push({ t0: TM.l2[1], x, y, color: C.p4, seed: 11, n: 9, speed: 700, size: 12, life: 0.5 }); }
    { const [x, y] = toScreen(TM.l3[1], 100, 60); bursts.push({ t0: TM.l3[1], x, y, color: C.p2, seed: 12, n: 9, speed: 700, size: 12, life: 0.5 }); }
    { const tb = TM.box[0] + 0.29; const [x, y] = toScreen(tb, 40, 80); bursts.push({ t0: tb, x, y, color: C.accent, seed: 13, n: 12, speed: 1300, size: 12, life: 0.55 }); }

    const dotOrder = [0, 1, 3, 4, 2, 5, 6, 7, 8];
    const hopDelay = DOTS.map(([, y]) => (100 - y) / 40 * 0.07); // ripple travels up from the box's row
    const dotDY = (t, i) => {
      const bobA = 2 * smooth(seg(t, 25.55, 26.1)) + 1 * smooth(seg(t, 26.7, 27.3));
      const bob = -bobA * (0.5 - 0.5 * Math.cos(2 * Math.PI * (t - T0 - BOB_DELAY[i]) / 2.4));
      const u = seg(t, TM.pulse + hopDelay[i], TM.pulse + hopDelay[i] + 0.38);
      const hop = u > 0 && u < 1 ? -4 * 4 * u * (1 - u) : 0;
      return bob + hop;
    };
    const setLine = (el, i, j, p) => {
      const [ax, ay] = DOTS[i], [bx, by] = DOTS[j], ya = ay + dotDY(tNow, i), yb = by + dotDY(tNow, j);
      el.setAttribute('x1', ax); el.setAttribute('y1', ya.toFixed(3)); el.setAttribute('x2', lerp(ax, bx, p).toFixed(3)); el.setAttribute('y2', lerp(ya, yb, p).toFixed(3));
      el.setAttribute('opacity', p > 0 ? 1 : 0);
    };
    let tNow = T0;

    return {
      render(t) {
        tNow = t;
        // camera: rises to 1.04 with the move, settles 1.04 → 1.0 (expo out), then a slow eased push (never linear)
        const up = 0.04 * inOutCubic(seg(t, TM.move[0], TM.move[1]));
        const settle = 0.04 * outExpoS(seg(t, TM.settle[0], TM.settle[1]));
        const drift = 0.03 * sineIO(seg(t, TM.drift[0], TM.drift[1]));
        const camS = 1 + up - settle + drift;
        cam.style.transformOrigin = `${LY.pivot[0]}px ${LY.pivot[1]}px`;
        cam.style.transform = `scale(${camS.toFixed(5)})`;

        // mark
        const m = markState(t);
        gMark.setAttribute('transform', `translate(${m.o[0].toFixed(3)} ${m.o[1].toFixed(3)}) scale(${m.s.toFixed(5)})`);
        // dots: pop in by distance from the green line's midpoint, then the game's dot-bob (+ one hop ripple)
        DOTS.forEach(([x, y], i) => {
          const tStart = TM.dotsFrom + dotOrder.indexOf(i) * TM.dotStagger;
          const p = seg(t, tStart, tStart + TM.dotDur);
          const sc = p <= 0 ? 0 : outBack(p, 2.2);
          dots[i].setAttribute('transform', `translate(${x} ${(y + dotDY(t, i)).toFixed(3)}) scale(${Math.max(0, sc).toFixed(4)})`);
        });
        // lines ride on the dot centres; l2 then l3 draw (the menu's order) with the game's ease-in-out
        setLine(l1, 0, 1, 1);
        setLine(l2, 1, 4, inOutCubic(seg(t, TM.l2[0], TM.l2[1])));
        setLine(l3, 4, 5, inOutCubic(seg(t, TM.l3[0], TM.l3[1])));
        // box: the game's box-in (scale 0.4 → 1.08 → 1, opacity → 0.85 → 0.75); later one re-pop (live beat)
        {
          const u = seg(t, TM.box[0], TM.box[1]);
          let sc, op;
          if (u <= 0) { sc = 0.4; op = 0; } else if (u < 0.5) { const q = inOutCubic(u / 0.5); sc = lerp(0.4, 1.08, q); op = lerp(0, 0.85, q); } else { const q = inOutCubic((u - 0.5) / 0.5); sc = lerp(1.08, 1, q); op = lerp(0.85, 0.75, q); }
          const v = seg(t, TM.pulse, TM.pulse + 0.75);
          if (v > 0 && v < 1) { sc *= v < 0.35 ? lerp(1, 1.08, outCubic(v / 0.35)) : lerp(1.08, 1, smooth((v - 0.35) / 0.65)); }
          const dy = (dotDY(t, 3) + dotDY(t, 4) + dotDY(t, 6) + dotDY(t, 7)) / 4;
          box.setAttribute('transform', `translate(${BOX.cx} ${(BOX.cy + dy).toFixed(3)}) scale(${sc.toFixed(4)}) translate(${-BOX.cx} ${-BOX.cy})`);
          box.setAttribute('opacity', op.toFixed(3));
        }
        sparks.draw(t, bursts);

        // lockup: letters arrive from the right (staggered), then the whole word follows the mark up
        letters.forEach((el, i) => {
          const p = seg(t, TM.letters + i * TM.letterStagger, TM.letters + i * TM.letterStagger + TM.letterDur);
          const e = outQuint(p);
          el.style.transform = `translate(${((1 - e) * 90).toFixed(2)}px,${((1 - outBack(p, 1.6)) * 26).toFixed(2)}px) rotate(${((1 - e) * 8).toFixed(2)}deg)`;
          el.style.opacity = clamp(p * 2.2).toFixed(3);
        });
        {
          const kk = inOutCubic(seg(t, TM.move[0] + TM.lockLag, TM.move[1] + TM.lockLag));
          const sc = Math.pow(LY.lockK2, kk);
          place(lock, lerp(LY.lock1[0], LY.lock2[0], kk), lerp(LY.lock1[1], LY.lock2[1], kk), lockW, lockH2, sc);
        }

        // headline: each word rises from behind its mask, 0.05 s stagger, expo out
        place(head, LY.head[0], LY.head[1], headW, headH, 1, 1);
        headWords.forEach((el, i) => {
          const p = seg(t, headT0 + i * TM.headStagger, headT0 + i * TM.headStagger + TM.headDur);
          el.style.transform = `translateY(${((1 - outExpoS(p)) * 118).toFixed(2)}%)`;
          el.style.visibility = p > 0 ? 'visible' : 'hidden';
        });
        // URL pill scales in from 0.9 with a slight overshoot (back out), later lifts like the game's button hover
        {
          const p = seg(t, pillT[0], pillT[1]);
          const sc = 0.9 + 0.1 * outBack(p, 1.7);
          const h = inOutCubic(seg(t, TM.hover[0], TM.hover[1]));
          pill.style.boxShadow = `${(3 + 2 * h) * k}px ${(3 + 2 * h) * k}px 0 rgba(56,53,47,${(0.16 + 0.03 * h).toFixed(3)})`;
          place(pill, LY.pill[0], LY.pill[1], pillW, pillH, sc, clamp(p * 4), -h * k, (1 - outCubic(p)) * 18 - h * k);
          const u = inOutQuad(seg(t, TM.under[0], TM.under[1]));
          under.setAttribute('stroke-dashoffset', (uLen * (1 - u)).toFixed(2));
          under.setAttribute('opacity', u > 0 ? 1 : 0);
        }
        {
          const p = seg(t, subT[0], subT[1]);
          place(sub, LY.sub[0], LY.sub[1], subW, subH, 1, 1);
          subIn.style.transform = `translateY(${((1 - outExpoS(p)) * 120).toFixed(2)}%)`;
          subIn.style.visibility = p > 0 ? 'visible' : 'hidden';
        }
        { const p = seg(t, TM.credit[0], TM.credit[1]); place(credit, LY.credit[0], LY.credit[1], crW, crH, 1, smooth(p), 0, (1 - outCubic(p)) * 12); }
      },
    };
  },
};
