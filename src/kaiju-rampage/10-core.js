/* ============================================================
   Kaiju Rampage — helpers, saved best scores, and input:
   keyboard, mouse-drag camera, and a touch stick with buttons.
   ============================================================ */
if (typeof THREE === 'undefined') { document.getElementById('loading').textContent = 'The 3D engine did not load. Check your connection and reload the page.'; throw new Error('three.js did not load'); }
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const calm = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const isTouch = () => (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
const Save = {
  key: 'kaiju-rampage-v1', data: { best: 0, bestRank: '', sound: true, runs: 0 },
  load() { try { const s = localStorage.getItem(this.key); if (s) Object.assign(this.data, JSON.parse(s)); } catch (e) { /* no storage: fine */ } },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* ignore */ } },
};
function money(v) {
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(v >= 1e10 ? 1 : 2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(v >= 1e8 ? 0 : 1) + 'M';
  if (v >= 1e3) return '$' + Math.round(v / 1e3) + 'K';
  return '$' + Math.round(v);
}
const Input = {
  keys: {}, stick: [0, 0], yaw: Math.PI * 0.75, pitch: 0.42, dist: 46, edge: {}, beam: false, touch: false,
  press(a) { this.edge[a] = true; },
  take(a) { const v = !!this.edge[a]; this.edge[a] = false; return v; },
  move() {   // the wanted direction in camera space: x = right, y = forward
    let x = this.stick[0], y = this.stick[1];
    const k = this.keys;
    if (k.KeyW || k.ArrowUp) y += 1; if (k.KeyS || k.ArrowDown) y -= 1; if (k.KeyA || k.ArrowLeft) x -= 1; if (k.KeyD || k.ArrowRight) x += 1;
    const m = Math.hypot(x, y); return m > 1 ? [x / m, y / m] : [x, y];
  },
  init(el) {
    addEventListener('keydown', (e) => {
      if (e.repeat && e.code !== 'KeyF') return;
      this.keys[e.code] = true;
      if (Game.state !== 'play') return;
      if (e.code === 'Space') { e.preventDefault(); this.press('stomp'); }
      if (e.code === 'KeyE' || e.code === 'KeyQ') this.press('tail');
      if (e.code === 'KeyR') this.press('roar');
      if (e.code === 'KeyF') this.beam = true;
      if (/^Arrow/.test(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; if (e.code === 'KeyF') this.beam = false; });
    addEventListener('blur', () => { this.keys = {}; this.beam = false; this.stick = [0, 0]; });
    // mouse: drag to look around, wheel to zoom, right button fires the beam
    let drag = null;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      if (e.button === 2) { this.beam = true; return; }
      drag = [e.clientX, e.clientY]; try { el.setPointerCapture(e.pointerId); } catch (x) { /* fine */ }
    });
    el.addEventListener('pointermove', (e) => { if (!drag || e.pointerType === 'touch') return; this.look(e.clientX - drag[0], e.clientY - drag[1]); drag = [e.clientX, e.clientY]; });
    el.addEventListener('pointerup', (e) => { if (e.button === 2) this.beam = false; drag = null; });
    el.addEventListener('wheel', (e) => { e.preventDefault(); this.dist = clamp(this.dist * (e.deltaY > 0 ? 1.08 : 0.93), 26, 90); }, { passive: false });
    // touch: left side is a floating stick, the rest drags the camera, buttons on the right
    const pad = $('#pad'), stick = $('#stick'), knob = stick.firstElementChild;
    const touches = new Map();
    pad.addEventListener('pointerdown', (e) => {
      this.touch = true; document.body.classList.add('touch');
      const kind = e.clientX < innerWidth * 0.45 && ![...touches.values()].some(t => t.kind === 'stick') ? 'stick' : 'look';
      touches.set(e.pointerId, { kind, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY });
      if (kind === 'stick') { stick.style.display = 'block'; stick.style.left = e.clientX + 'px'; stick.style.top = e.clientY + 'px'; knob.style.transform = ''; }
      try { pad.setPointerCapture(e.pointerId); } catch (x) { /* that finger already lifted */ }
    });
    pad.addEventListener('pointermove', (e) => {
      const t = touches.get(e.pointerId); if (!t) return;
      if (t.kind === 'stick') { const dx = e.clientX - t.x0, dy = e.clientY - t.y0, m = Math.hypot(dx, dy), r = 50, k = m > r ? r / m : 1; knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`; this.stick = [dx * k / r, -dy * k / r]; }
      else { this.look((e.clientX - t.x) * 1.4, (e.clientY - t.y) * 1.2); t.x = e.clientX; t.y = e.clientY; }
    });
    const up = (e) => { const t = touches.get(e.pointerId); if (!t) return; if (t.kind === 'stick') { this.stick = [0, 0]; stick.style.display = 'none'; } touches.delete(e.pointerId); };
    pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
    for (const b of document.querySelectorAll('#acts button')) {
      const a = b.dataset.a;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('on'); Audio2.init(); if (a === 'beam') this.beam = true; else this.press(a); });
      const off = () => { b.classList.remove('on'); if (a === 'beam') this.beam = false; };
      b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
    }
    if (isTouch()) { this.touch = true; document.body.classList.add('touch'); }
  },
  look(dx, dy) { this.yaw -= dx * 0.0055; this.pitch = clamp(this.pitch + dy * 0.004, -0.32, 1.2); },
};
