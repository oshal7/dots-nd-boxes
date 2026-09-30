// film.js — assembles scenes onto ONE paused GSAP timeline (the master clock).
//
// Scene module contract (scenes/sNN-*.js):
//   export default {
//     id: 'board', vis: [a, b],         // film seconds the layer is visible (a module may cover several storyboard shots)
//     z: 3,                             // optional stacking order (default: order in the list)
//     async build({ layer, W, H, V, tl, root }) {
//        // create DOM inside `layer` (a full-frame absolutely positioned div)
//        // optionally add GSAP tweens to `tl` at ABSOLUTE film times
//        return { render(t) { /* set every custom visual from film time t only */ } };
//     }
//   }
// Nothing may read a clock, use requestAnimationFrame, or use unseeded randomness.

import { SCENES } from '../scenes/index.js';
import { FILM_DURATION } from './handoff.js';

async function fontsReady() {
  const f = ['700 40px Caveat', '400 40px Caveat', '400 40px "Patrick Hand"', '600 40px Nunito', '700 40px Nunito', '800 40px Nunito', '400 40px Nunito'];
  await Promise.all(f.map((s) => document.fonts.load(s, 'AaBb0123🔥')));
  await document.fonts.ready;
}

export async function boot() {
  const root = document.getElementById('root');
  const W = +root.dataset.width, H = +root.dataset.height, V = H > W;
  root.style.width = W + 'px'; root.style.height = H + 'px';
  document.body.style.width = W + 'px'; document.body.style.height = H + 'px';
  const only = root.dataset.only ? root.dataset.only.split(',') : null; // lab mode: render a subset of modules
  const from = root.dataset.from !== undefined ? +root.dataset.from : null, to = root.dataset.to !== undefined ? +root.dataset.to : null;
  await fontsReady();

  const tl = gsap.timeline({ paused: true });
  tl.to({}, { duration: FILM_DURATION }, 0); // fixes the master duration
  const list = only ? SCENES.filter((s) => only.includes(s.id)) : SCENES;
  const built = [];
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    const layer = document.createElement('div'); layer.className = 'layer'; layer.dataset.scene = s.id; layer.style.zIndex = s.z ?? i + 1;
    root.appendChild(layer);
    const api = (await s.build({ layer, W, H, V, tl, root })) || {};
    built.push({ s, layer, api });
  }
  const renderAll = (t) => {
    tl.totalTime(t, true);
    for (const b of built) {
      const [a, z] = b.s.vis; const on = t >= a && (t < z || (z >= FILM_DURATION && t <= z));
      b.layer.style.visibility = on ? 'visible' : 'hidden';
      if (on && b.api.render) b.api.render(t);
    }
  };

  // Lab mode maps lab time 0..(b-a) onto film time a..b of the chosen scenes.
  const t0 = from ?? (only ? Math.min(...list.map((s) => s.vis[0])) : 0);
  const t1 = to ?? (only ? Math.max(...list.map((s) => s.vis[1])) : FILM_DURATION);
  const master = gsap.timeline({ paused: true });
  const clock = { t: 0 };
  master.to(clock, { t: t1 - t0, duration: t1 - t0, ease: 'none', onUpdate: () => renderAll(t0 + clock.t) }, 0);
  window.addEventListener('hf-seek', (e) => renderAll(t0 + e.detail.time));
  window.__timelines = window.__timelines || {};
  window.__timelines.root = master;
  window.__film = { renderAll, t0, t1, W, H, V, tl };
  renderAll(t0);
  return window.__film;
}
