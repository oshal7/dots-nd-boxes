// animations.js — Canvas particle FX (sparks + confetti) and floating combo text.
//
// SVG line/box/mark animations live in render.js + styles.css (CSS transitions).
// This module owns the full-viewport canvas overlay used for kinetic feedback.

let canvas = null;
let cx = null;
let particles = [];
let running = false;
let dpr = 1;
let floatLayer = null;

export function reduceMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Attach the particle system to a <canvas> overlay and a DOM layer for
 * floating text (combo counters, +1 popups).
 */
export function setupFX(canvasEl, floatLayerEl) {
  canvas = canvasEl;
  cx = canvas.getContext('2d');
  floatLayer = floatLayerEl || null;
  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  if (!canvas) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}

function ensureLoop() {
  if (running) return;
  running = true;
  requestAnimationFrame(tick);
}

function tick() {
  if (!cx) {
    running = false;
    return;
  }
  cx.clearRect(0, 0, canvas.width, canvas.height);
  const g = 0.12 * dpr;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += g * p.gravity;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
    p.rot += p.vr;
    const alpha = Math.max(0, p.life / p.maxLife);
    cx.save();
    cx.globalAlpha = alpha;
    cx.translate(p.x, p.y);
    cx.rotate(p.rot);
    cx.fillStyle = p.color;
    if (p.shape === 'rect') {
      cx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    } else {
      cx.beginPath();
      cx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      cx.fill();
    }
    cx.restore();
    if (p.life <= 0 || p.y > canvas.height + 40) particles.splice(i, 1);
  }
  if (particles.length > 0) {
    requestAnimationFrame(tick);
  } else {
    running = false;
    cx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function push(p) {
  particles.push(p);
  ensureLoop();
}

/** Small spark burst at a point (line-snap endpoints). Coords in CSS px. */
export function spark(x, y, color = '#7c5cff', count = 8) {
  if (reduceMotion()) return;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (1.5 + Math.random() * 3) * dpr;
    push({
      x: x * dpr,
      y: y * dpr,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      gravity: 0.3,
      size: (2 + Math.random() * 3) * dpr,
      color,
      shape: 'circle',
      rot: 0,
      vr: 0,
      life: 24 + Math.random() * 12,
      maxLife: 36,
    });
  }
}

const CONFETTI_COLORS = ['#7c5cff', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

/** Confetti burst at a point (box capture / combo). */
export function confettiBurst(x, y, colors = CONFETTI_COLORS, count = 26) {
  if (reduceMotion()) return;
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const sp = (2 + Math.random() * 5) * dpr;
    push({
      x: x * dpr,
      y: y * dpr,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 2 * dpr,
      gravity: 1,
      size: (5 + Math.random() * 6) * dpr,
      color: colors[(Math.random() * colors.length) | 0],
      shape: Math.random() < 0.7 ? 'rect' : 'circle',
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      life: 60 + Math.random() * 40,
      maxLife: 100,
    });
  }
}

/** Full-screen confetti cannon from bottom corners (victory). */
export function confettiCannon(colors = CONFETTI_COLORS) {
  if (reduceMotion()) return;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const sources = [
    { x: 0, y: H, ang: -Math.PI / 3 },
    { x: W, y: H, ang: (-Math.PI * 2) / 3 },
  ];
  sources.forEach((s) => {
    for (let i = 0; i < 90; i++) {
      const a = s.ang + (Math.random() - 0.5) * 0.6;
      const sp = (8 + Math.random() * 10) * dpr;
      push({
        x: s.x * dpr,
        y: s.y * dpr,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        gravity: 1,
        size: (6 + Math.random() * 7) * dpr,
        color: colors[(Math.random() * colors.length) | 0],
        shape: Math.random() < 0.7 ? 'rect' : 'circle',
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.5,
        life: 120 + Math.random() * 60,
        maxLife: 180,
      });
    }
  });
}

/**
 * Float a text label upward from a point (combo counter, +1). Uses a DOM
 * element in the float layer so it inherits crisp text rendering.
 */
export function floatText(x, y, text, { color = '#7c5cff', big = false, shake = false } = {}) {
  if (!floatLayer) return;
  const el = document.createElement('div');
  el.className = 'float-text' + (big ? ' float-text--big' : '') + (shake ? ' float-text--shake' : '');
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.color = color;
  floatLayer.appendChild(el);
  // Remove after animation.
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 1600);
}

/** Clear all active particles (e.g. on leaving the game screen). */
export function clearFX() {
  particles = [];
  if (cx) cx.clearRect(0, 0, canvas.width, canvas.height);
  if (floatLayer) floatLayer.innerHTML = '';
}
