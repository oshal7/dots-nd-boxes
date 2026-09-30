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
const BOB_DELAY = DOTS.map((_, i) => ((i + 1) % 3 === 0 ? 0.6 : (i + 1) % 2 === 0 ? 0.3 : 0));
const sineIO = (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));

// timings (film seconds)
const TM = {
  dotsFrom: 24.52, dotStagger: 0.045, dotDur: 0.36,
  l2: [24.95, 25.35], l3: [25.3, 25.7], box: [25.62, 26.2],
  zoomEnd: 26.15,                       // camera ease-out (lead movement of s11)
  letters: 25.28, letterStagger: 0.034, letterDur: 0.5,
  move: [26.15, 26.85], lockLag: 0.06,  // mark + lockup slide up to the end card
  head: [26.7, 27.12], pill: [26.8, 27.2], under: [27.22, 27.9], sub: [26.96, 27.3], credit: [27.0, 27.45],
  push: [26.5, 30.6],
};

export default {
  id: 'brand', vis: [24.5, 30],
  async build({ layer, W, H, V }) {
    const L = hand(V).L;
    const cam = div('', layer, '', { position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px' });

    // ---------- layout (all in film px) ----------
    const LY = V
      ? { s1: 5.0, m1: [540, 800], lockF: 200, lock1: [540, 1215], s2: 2.8, m2: [540, 350], lockK2: 0.64, lock2: [540, 610],
          headF: 150, head: [540, 890], headLines: ['Play free', 'in your browser'], urlF: 46, pill: [540, 1250],
          subF: 38, sub: [540, 1462], creditF: 24, credit: [540, 1770], pivot: [540, 920] }
      : { s1: 4.4, m1: null, lockF: 212, lock1: null, s2: 1.6, m2: null, lockK2: 0.52, lock2: null,
          headF: 132, head: [960, 428], headLines: ['Play free in your browser'], urlF: 58, pill: [960, 648],
          subF: 36, sub: [960, 818], creditF: 24, credit: [960, 1030], pivot: [960, 500] };

    // ---------- the mark ----------
    const stage = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, cam);
    css(stage, { position: 'absolute', left: 0, top: 0 });
    const gMark = svg('g', {}, stage);
    const gDots = svg('g', {}, gMark);
    const dots = DOTS.map(([x, y]) => svg('circle', { cx: 0, cy: 0, r: 6, fill: C.ink, transform: `translate(${x} ${y})` }, gDots));
    const mkLine = (col) => svg('line', { stroke: col, 'stroke-width': 5, 'stroke-linecap': 'round' }, gMark);
    const l1 = mkLine(C.p3), l2 = mkLine(C.p4), l3 = mkLine(C.p2);
    l1.setAttribute('x1', 20); l1.setAttribute('y1', 20); l1.setAttribute('x2', 60); l1.setAttribute('y2', 20);
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
      const g2 = 36, lw2 = lockW * LY.lockK2, tot2 = markVis(LY.s2) + g2 + lw2, x2 = (W - tot2) / 2;
      LY.m2 = [x2 + markVis(LY.s2) / 2, 172];
      LY.lock2 = [x2 + markVis(LY.s2) + g2 + lw2 / 2, 172 + 4];
    }
    void lockH;

    // ---------- end card ----------
    const head = div('cv', cam, LY.headLines.join('<br>'), { position: 'absolute', left: 0, top: 0, fontSize: LY.headF + 'px', lineHeight: 0.95, textAlign: 'center', color: C.ink, transformOrigin: '50% 50%' });
    const headW = head.offsetWidth, headH = head.offsetHeight;

    const k = LY.urlF / 20; // the game's .btn at 20 px → scale
    const pill = div('', cam, '', { position: 'absolute', left: 0, top: 0, background: C.card, border: `${Math.round(2 * k * 0.75)}px solid ${C.ink}`,
      borderRadius: Math.round(14 * k) + 'px', boxShadow: `${Math.round(3 * k)}px ${Math.round(3 * k)}px 0 rgba(56,53,47,0.16)`,
      padding: `${Math.round(LY.urlF * 0.42)}px ${Math.round(LY.urlF * 0.9)}px ${Math.round(LY.urlF * 0.62)}px`, transformOrigin: '50% 50%' });
    const urlLines = V ? ['oshal7.github.io/', 'dots-nd-boxes'] : ['oshal7.github.io/dots-nd-boxes'];
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

    const sub = div('ui', cam, 'No install · No sign-up', { position: 'absolute', left: 0, top: 0, fontWeight: 700, fontSize: LY.subF + 'px', color: C.ink, whiteSpace: 'nowrap' });
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

    return {
      render(t) {
        // camera push on the end card (not the credit line)
        const push = 1 + 0.04 * sineIO(seg(t, TM.push[0], TM.push[1]));
        cam.style.transformOrigin = `${LY.pivot[0]}px ${LY.pivot[1]}px`;
        cam.style.transform = `scale(${push.toFixed(5)})`;

        // mark
        const m = markState(t);
        gMark.setAttribute('transform', `translate(${m.o[0].toFixed(3)} ${m.o[1].toFixed(3)}) scale(${m.s.toFixed(5)})`);
        // dots: pop in by distance from the green line's midpoint, then the game's dot-bob
        const bobA = 2 * smooth(seg(t, 25.55, 26.1)) + 1 * smooth(seg(t, 26.7, 27.3));
        const order = [0, 1, 3, 4, 2, 5, 6, 7, 8];
        DOTS.forEach(([x, y], i) => {
          const tStart = TM.dotsFrom + order.indexOf(i) * TM.dotStagger;
          const p = seg(t, tStart, tStart + TM.dotDur);
          const sc = p <= 0 ? 0 : outBack(p, 2.2);
          const bob = -bobA * (0.5 - 0.5 * Math.cos(2 * Math.PI * (t - T0 - BOB_DELAY[i]) / 2.4));
          dots[i].setAttribute('transform', `translate(${x} ${(y + bob).toFixed(3)}) scale(${Math.max(0, sc).toFixed(4)})`);
        });
        // lines l2 then l3 draw (the menu's order), like the game's ease-in-out draw-line
        const drawLine = (el, [[ax, ay], [bx, by]], [a, b]) => {
          const p = inOutCubic(seg(t, a, b));
          el.setAttribute('x1', ax); el.setAttribute('y1', ay); el.setAttribute('x2', lerp(ax, bx, p)); el.setAttribute('y2', lerp(ay, by, p));
          el.setAttribute('opacity', p > 0 ? 1 : 0);
        };
        drawLine(l2, L2, TM.l2); drawLine(l3, L3, TM.l3);
        // box: the game's box-in (scale 0.4 → 1.08 → 1, opacity → 0.85 → 0.75)
        {
          const u = seg(t, TM.box[0], TM.box[1]);
          let sc, op;
          if (u <= 0) { sc = 0.4; op = 0; } else if (u < 0.5) { const q = inOutCubic(u / 0.5); sc = lerp(0.4, 1.08, q); op = lerp(0, 0.85, q); } else { const q = inOutCubic((u - 0.5) / 0.5); sc = lerp(1.08, 1, q); op = lerp(0.85, 0.75, q); }
          box.setAttribute('transform', `translate(${BOX.cx} ${BOX.cy}) scale(${sc.toFixed(4)}) translate(${-BOX.cx} ${-BOX.cy})`);
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

        // headline from the left (opposite side to the lockup's letters)
        { const p = seg(t, TM.head[0], TM.head[1]); const e = outQuint(p); place(head, LY.head[0], LY.head[1], headW, headH, 1, clamp(p * 1.8), -(1 - e) * 160, 0); }
        // URL pill pops like a button landing
        {
          const p = seg(t, TM.pill[0], TM.pill[1]);
          const sc = p <= 0 ? 0.7 : p < 0.55 ? lerp(0.7, 1.035, outCubic(p / 0.55)) : lerp(1.035, 1, smooth((p - 0.55) / 0.45));
          place(pill, LY.pill[0], LY.pill[1], pillW, pillH, sc, clamp(p * 2.5), 0, (1 - outCubic(p)) * 30);
          const u = inOutCubic(seg(t, TM.under[0], TM.under[1]));
          under.setAttribute('stroke-dashoffset', (uLen * (1 - u)).toFixed(2));
          under.setAttribute('opacity', u > 0 ? 1 : 0);
        }
        { const p = seg(t, TM.sub[0], TM.sub[1]); place(sub, LY.sub[0], LY.sub[1], subW, subH, 1, clamp(p * 1.6), 0, (1 - outQuint(p)) * 28); }
        { const p = seg(t, TM.credit[0], TM.credit[1]); place(credit, LY.credit[0], LY.credit[1], crW, crH, 1, smooth(p), 0, (1 - outCubic(p)) * 12); }
      },
    };
  },
};
