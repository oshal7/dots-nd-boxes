// page.mjs — writes a HyperFrames project page (film or lab) and links the shared folders into it.
// Usage:
//   node tools/page.mjs h                       → h/index.html   (16:9 film, 1920×1080)
//   node tools/page.mjs v                       → v/index.html   (9:16 film, 1080×1920)
//   node tools/page.mjs lab/board-h h board 0 10 → lab page for one module and a film-time window
import { mkdirSync, writeFileSync, symlinkSync, existsSync, lstatSync, unlinkSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';

const [dir, aspect, only = '', from = '', to = ''] = process.argv.slice(2);
if (!dir || !['h', 'v'].includes(aspect)) { console.error('usage: node tools/page.mjs <dir> <h|v> [module] [from] [to]'); process.exit(1); }
const ROOT = resolve(new URL('..', import.meta.url).pathname);
const out = resolve(ROOT, dir); mkdirSync(out, { recursive: true });
for (const d of ['vendor', 'shared', 'scenes', 'assets']) {
  const link = join(out, d);
  if (existsSync(link) || (() => { try { return lstatSync(link).isSymbolicLink(); } catch { return false; } })()) unlinkSync(link);
  symlinkSync(relative(out, join(ROOT, d)), link);
}
const [W, H] = aspect === 'h' ? [1920, 1080] : [1080, 1920];
const dur = from !== '' && to !== '' ? (+to - +from) : 30;
const attrs = [only && `data-only="${only}"`, from !== '' && `data-from="${from}"`, to !== '' && `data-to="${to}"`].filter(Boolean).join(' ');
writeFileSync(join(out, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Dots &amp; Boxes — ${only || 'film'} ${aspect}</title>
<link rel="stylesheet" href="./shared/tokens.css">
<script src="./vendor/gsap.min.js"></script>
<script type="importmap">{"imports":{"three":"./vendor/three.module.js","three/addons/":"./vendor/addons/"}}</script>
</head>
<body>
<div id="root" data-composition-id="root" data-width="${W}" data-height="${H}" data-start="0" data-duration="${dur}" ${attrs}></div>
<script type="module">
import { boot } from './shared/film.js';
boot();
</script>
</body></html>
`);
console.log('wrote', relative(ROOT, join(out, 'index.html')), `${W}x${H}`, only || 'film', from, to);
