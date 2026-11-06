/* ============================================================
   Burnware — core helpers: DOM building, saved settings, a tiny
   seeded random, and the clock.
   ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
/* h('div.a.b', {attrs, on: {click}}, children...) */
function h(tag, props, ...kids) {
  const m = tag.split(/(?=[.#])/), el = document.createElement(m[0] || 'div');
  for (const p of m.slice(1)) { if (p[0] === '.') el.classList.add(p.slice(1)); else el.id = p.slice(1); }
  if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) { kids.unshift(props); props = null; }
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(9)) if (k !== null && k !== undefined && k !== false) el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return el;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const isNarrow = () => innerWidth < 720;
const isTouch = () => (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
const calm = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

/* settings and scores live in this browser only; everything works without them */
const Store = {
  key: 'burnware-v1',
  data: { wall: 'terraces', scheme: 'ember', saver: 'stars', saverWait: 90, sound: true, tuko: true, scores: {}, firstBoot: true, guestbook: [], secret: false, solDraw: 1 },
  load() { try { const s = localStorage.getItem(this.key); if (s) Object.assign(this.data, JSON.parse(s)); } catch (e) { /* storage blocked: defaults */ } },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* ignore */ } },
};
/* Phones: act when the finger lifts, so the first tap always counts (a tap right after
   using a program in a frame can otherwise get eaten). Mice keep using click. */
const TapShield = { until: 0 };   // after acting on a finger-up, eat the click that follows so it can't land on whatever opened underneath
document.addEventListener('click', (e) => { if (Date.now() < TapShield.until) { e.stopPropagation(); e.preventDefault(); } }, true);
function onTap(el, fn) {
  let down = null, fired = 0;
  el.addEventListener('pointerdown', (e) => { down = e.pointerType === 'mouse' ? null : { t: Date.now(), x: e.clientX, y: e.clientY }; });
  el.addEventListener('pointerup', (e) => {
    if (!down || e.pointerType === 'mouse') return; const d = down; down = null;
    if (Date.now() - d.t > 900 || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12) return;
    fired = Date.now(); TapShield.until = fired + 450; fn(e);
  });
  el.addEventListener('click', (e) => { if (Date.now() - fired < 900) return; fn(e); });
}
function fmtClock(d = new Date()) { let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0'), ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${m} ${ap}`; }
