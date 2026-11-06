/* ============================================================
   Core: state, physics, particles, machine, pulls, reveals
   ============================================================ */
const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const SAVE_KEY = 'omnigacha-save-v1';
let S = null, TPS = 0, busy = false, activeTab = 'shop';

function fmt(n) {
  if (!isFinite(n)) return '∞';
  n = Math.floor(Math.max(0, n));
  if (n < 100000) return n.toLocaleString('en-US');
  const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp'];
  let i = -1, x = n;
  while (x >= 1000 && i < u.length - 1) { x /= 1000; i++; }
  return (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)) + u[i];
}
const fmtRate = (n) => (n < 100 ? n.toFixed(1) : fmt(n));
const hidden = () => document.body.classList.contains('fx-nocount');
const money = (n) => (hidden() ? '???' : fmt(n));

function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage is optional */ } }
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o && o.v === 1) return Object.assign(freshState(0), o);
  } catch (e) { /* ignore broken saves */ }
  return null;
}

/* ---------- capsules bouncing in the dome ---------- */
const Dome = (() => {
  const cv = $('#dome'), c = cv.getContext('2d');
  let W = 1, H = 1, s = 1, R = 1, balls = [], palette = ['#ff5a3c', '#ffcf33', '#3ddcb4', '#4aa8ff', '#b06bff', '#ff5fa2'];
  function resize() {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const nW = Math.max(1, Math.round(r.width * dpr)), nH = Math.max(1, Math.round(r.height * dpr));
    if (nW === W && nH === H) return;
    const k = W > 1 ? nW / W : 1;
    W = nW; H = nH; cv.width = W; cv.height = H; s = W / 210; R = 101 * s;
    balls.forEach(b => { b.x *= k; b.y *= k; b.px *= k; b.py *= k; b.r *= k; });
  }
  function add(x, y) { const r = (14.5 + Math.random() * 2.5) * s; balls.push({ x, y, px: x, py: y, r, c: pick(palette), a: Math.random() * 6.28 }); }
  function fill(n) { balls = []; for (let i = 0; i < n; i++) add(W / 2 + (Math.random() - .5) * R, H / 2 + (Math.random() - .3) * R * .9); }
  function setPalette(p) { palette = p; balls.forEach((b, i) => setTimeout(() => { b.c = pick(palette); }, i * 40)); }
  function step(dt) {
    const g = 1500 * s, sub = 2, h = Math.min(dt, 1 / 30) / sub;
    for (let k = 0; k < sub; k++) {
      for (const b of balls) {
        const vx = (b.x - b.px) * .992, vy = (b.y - b.py) * .992;
        b.px = b.x; b.py = b.y; b.x += vx; b.y += vy + g * h * h;
        b.a += vx / b.r;
      }
      for (let it = 0; it < 3; it++) {
        for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
          const A = balls[i], B = balls[j], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), m = A.r + B.r;
          if (d < m && d > .0001) { const p = (m - d) / d * .5; A.x -= dx * p; A.y -= dy * p; B.x += dx * p; B.y += dy * p; }
        }
        for (const b of balls) {
          const dx = b.x - W / 2, dy = b.y - H / 2, d = Math.hypot(dx, dy), lim = R - b.r;
          if (d > lim) { b.x = W / 2 + dx / d * lim; b.y = H / 2 + dy / d * lim; }
        }
      }
    }
  }
  function draw() {
    c.clearRect(0, 0, W, H);
    c.save(); c.beginPath(); c.arc(W / 2, H / 2, R, 0, Math.PI * 2); c.clip();
    for (const b of balls) {
      c.save(); c.translate(b.x, b.y); c.rotate(b.a);
      c.beginPath(); c.arc(0, 0, b.r, 0, Math.PI); c.closePath(); c.fillStyle = 'rgba(236,239,255,.93)'; c.fill();
      c.beginPath(); c.arc(0, 0, b.r, Math.PI, Math.PI * 2); c.closePath(); c.fillStyle = b.c; c.fill();
      c.lineWidth = 2.6 * s; c.strokeStyle = '#1a1433';
      c.beginPath(); c.arc(0, 0, b.r, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(-b.r, 0); c.lineTo(b.r, 0); c.lineWidth = 2 * s; c.stroke();
      c.restore();
      c.beginPath(); c.arc(b.x - b.r * .38, b.y - b.r * .42, b.r * .2, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,.75)'; c.fill();
    }
    c.restore();
  }
  function shake(power) {
    for (const b of balls) { b.px = b.x - (Math.random() - .5) * 26 * power * s; b.py = b.y + (8 + Math.random() * 22) * power * s; }
  }
  function nudge() { for (const b of balls) { b.py = b.y + Math.random() * 6 * s; b.px = b.x + (Math.random() - .5) * 5 * s; } }
  function dispense() {
    let low = null; for (const b of balls) if (!low || b.y > low.y) low = b;
    const col = low ? low.c : pick(palette);
    if (low) {
      balls.splice(balls.indexOf(low), 1);
      setTimeout(() => { if (balls.length < 22) add(W / 2 + (Math.random() - .5) * R * .6, H / 2 - R * .6); }, 650);
    }
    return col;
  }
  return { resize, fill, step, draw, shake, nudge, dispense, setPalette, count: () => balls.length };
})();

/* ---------- particles on top of everything ---------- */
const FX = (() => {
  const cv = $('#fx'), c = cv.getContext('2d');
  let parts = [], dpr = 1, W = 1, H = 1;
  function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); W = cv.width = Math.round(innerWidth * dpr); H = cv.height = Math.round(innerHeight * dpr); }
  function burst(x, y, n, colors, o = {}) {
    if (RM) n = Math.min(n, 12);
    const sp = (o.speed || 520) * dpr;
    for (let i = 0; i < n; i++) {
      const a = o.up ? (-Math.PI / 2 + (Math.random() - .5) * (o.spread || 1.4)) : Math.random() * Math.PI * 2;
      const v = sp * (.25 + Math.random() * .75);
      parts.push({ x: x * dpr, y: y * dpr, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: .55 + Math.random() * .7,
        size: (o.size || 7) * dpr * (.6 + Math.random() * .8), color: pick(colors), rot: Math.random() * 6, vr: (Math.random() - .5) * 14,
        g: (o.g == null ? 900 : o.g) * dpr, shape: o.shape || pick(['rect', 'rect', 'star', 'dot']) });
    }
  }
  function star(x, y, r) {
    c.beginPath();
    for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * .32 : r, a = i * Math.PI / 4; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fill();
  }
  function step(dt) {
    if (!parts.length) { if (cv._dirty) { c.clearRect(0, 0, W, H); cv._dirty = false; } return; }
    cv._dirty = true;
    c.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += p.g * dt; p.vx *= .985; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.life -= p.decay * dt;
      if (p.life <= 0 || p.y > H + 40) { parts.splice(i, 1); continue; }
      c.globalAlpha = Math.min(1, p.life * 1.6);
      c.fillStyle = p.color;
      if (p.shape === 'rect') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); c.restore(); }
      else if (p.shape === 'star') star(p.x, p.y, p.size * .9);
      else if (p.shape === 'coin') { c.beginPath(); c.arc(p.x, p.y, p.size * .6, 0, 7); c.fill(); c.lineWidth = 1.6 * dpr; c.strokeStyle = '#1a1433'; c.stroke(); }
      else { c.beginPath(); c.arc(p.x, p.y, p.size * .35, 0, 7); c.fill(); }
    }
    c.globalAlpha = 1;
  }
  return { resize, burst, step };
})();

/* ---------- Gacha-chan ---------- */
const MOUTH = {
  smile: 'M140 308 Q150 318 160 308', happy: 'M138 305 Q150 323 162 305', wow: 'M144 311 a6 7 0 1 0 12 0 a6 7 0 1 0 -12 0',
  sad: 'M140 317 Q150 305 160 317', worried: 'M137 314 q5 -6 9 0 t9 0 t9 0', flat: 'M141 312 L159 312',
};
let faceTimer = null, chatT = 9, blinkT = 3;
function defaultMood() { return S && S.unlocked >= 6 ? 'worried' : 'smile'; }
function face(m, ms) {
  const f = $('#m-face'); if (!f) return;
  f.classList.remove('wow', 'joy');
  $('#m-mouth').setAttribute('d', MOUTH[m === 'joy' ? 'happy' : m] || MOUTH.smile);
  if (m === 'wow') f.classList.add('wow');
  if (m === 'joy') f.classList.add('joy');
  clearTimeout(faceTimer);
  if (ms) faceTimer = setTimeout(() => face(defaultMood()), ms);
}
function say(text, ms, mood) {
  if (!text || document.body.classList.contains('fx-noface')) return;
  $('#bubble-text').textContent = text;
  const b = $('#bubble'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  chatT = Math.max(8, (ms || 4000) / 1000 + 6);
  if (mood) face(mood, ms || 3500);
}

/* ---------- floaters + toasts ---------- */
function floater(x, y, text, color) {
  const d = document.createElement('div'); d.className = 'floater'; d.textContent = text;
  d.style.left = x + 'px'; d.style.top = y + 'px'; if (color) d.style.color = color;
  document.body.appendChild(d); setTimeout(() => d.remove(), 950);
}
function toast(html, ms) {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms || 2800);
}

/* ---------- tapping the machine ---------- */
let ghostShown = 0;
function tapMachine(ev) {
  if (busy && !ev) return;
  AU.init();
  const v = tapValue(S, TPS);
  S.tokens += v; S.earned += v; S.taps++;
  AU.play('tap');
  const m = $('#machine'); m.classList.remove('bump'); void m.offsetWidth; m.classList.add('bump');
  Dome.nudge();
  let x, y;
  if (ev && ev.clientX) { x = ev.clientX; y = ev.clientY; }
  else { const r = m.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height * .6; }
  floater(x, y - 10, '+' + money(v));
  FX.burst(x, y, 5, ['#ffcf33', '#ffe27a'], { shape: 'coin', up: true, speed: 380, size: 9 });
  if (Math.random() < .04) say(pick(LINES.tickle), 2200, 'joy');
}
function ghostTaps(n) {
  if (n <= 0) return;
  const v = tapValue(S, TPS) * n;
  S.tokens += v; S.earned += v;
  ghostShown += n;
  if (ghostShown >= 2 && !document.hidden) {
    ghostShown = 0;
    const r = $('#machine').getBoundingClientRect();
    if (r.width) floater(r.left + r.width * (.25 + Math.random() * .5), r.top + r.height * (.35 + Math.random() * .3), '👻+' + money(v), '#d9d3ff');
  }
}

/* ---------- crank + dispense ---------- */
let crankAngle = 0;
async function crank(turns, dur) {
  crankAngle += 360 * turns;
  const el = $('#crank');
  el.style.transitionDuration = dur + 'ms';
  el.style.transform = `rotate(${crankAngle}deg)`;
  AU.play('coin');
  await sleep(110);
  AU.play('crank', turns);
  Dome.shake(turns > 1 ? 1.5 : 1);
  face('wow');
  await sleep(dur * .85);
}
async function dispense() {
  const col = Dome.dispense();
  $('#m-out-cap').style.setProperty('--cc', col);
  const out = $('#m-out'); out.classList.remove('pop'); void out.offsetWidth; out.classList.add('pop');
  AU.play('thunk');
  await sleep(480);
}

/* ---------- pulling ---------- */
function rollAndRecord(b) {
  const it = rollItem(S, b, Math.random);
  const prev = S.owned[it.id] || 0;
  S.owned[it.id] = prev + 1; S.pulls++;
  if (!S.first) S.first = it.n;
  if (it.r === 0) S.commons++;
  if (it.r >= 3) S.srplus++;
  if (it.r >= 4) S.ssr++;
  if (it.r >= 5) S.ur++;
  S.best = Math.max(S.best, it.r);
  return { it, isNew: prev === 0, lv: prev + 1 };
}
function metaRecord() {
  const it = BANNERS[META].items[S.meta];
  S.meta++; S.owned[it.id] = 1; S.pulls++;
  return { it, isNew: true, lv: 1 };
}
function nopeBtn(sel) { const b = $(sel); if (!b) return; b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); }

async function doPull(n) {
  if (busy || S.ended) return;
  AU.init();
  const b = S.banner;
  if (b === META && S.meta >= 12) return;
  if (b === META && n > 1) { AU.play('nope'); nopeBtn('#pull10'); say('Bulk existential pulls are not supported. One at a time, please.', 3600, 'worried'); return; }
  const cost = n === 1 ? pullCost(S, b) : multiCost(S, b);
  if (S.tokens < cost) {
    AU.play('nope'); nopeBtn(n === 1 ? '#pull1' : '#pull10');
    say(b === META ? 'Not enough tokens. Good. Stay poor. Stay away from my stuff.' : pick(LINES.poor), 3000, 'sad');
    return;
  }
  busy = true; refreshPullButtons();
  S.tokens -= cost; S.spent += cost; S.idle = 0;
  const results = [];
  if (b === META) results.push(metaRecord());
  else for (let i = 0; i < n; i++) results.push(rollAndRecord(b));
  if (n > 1) S.multi++;
  save();
  if (b !== META) say(pick(LINES.pull), 2400, 'wow');
  else say(['Wait. What are you pulling for?', 'No no no no no.', 'Please. I have nothing left.', 'Stop. STOP.', 'Why are you like this?'][S.meta % 5], 2400, 'worried');
  await crank(n > 1 ? 3 : 1, n > 1 ? 1300 : 850);
  await dispense();
  if (n === 1) await revealOne(results[0]);
  else await revealMany(results);
  busy = false;
  afterPull(results);
}

/* ---------- single reveal ---------- */
const META_PRE = [
  'Why can I hear music coming out of that capsule?', 'Is that… my background in there?', "Don't open that. That's my whole color palette.",
  'Not the font. Anything but the font.', "That's my shop! I work there!", 'Those are MY missions!', 'Please. I need that to count things.',
  'If you take that, nothing will line up anymore.', "Hey, that's my name tag!", 'Without that button you can’t pull anything! …Right?',
  "…if you take my face, who's going to say “wow”?", '…',
];
const OK_LABEL = ['Okay', 'Nice', 'Nice!', 'Wow!', 'WOW!!', 'AAAAA!!', 'Take it'];
const rcol = (r) => (r === 6 ? '#ffffff' : RAR[r].col);

function revealOne(res) {
  return new Promise(resolve => {
    const it = res.it, r = it.r;
    const ov = $('#reveal'), cap = $('#rv-cap'), stage = $('#rv-stage');
    let shown = r, tease = false;
    if (r >= 3 && r <= 5 && Math.random() < .5) { shown = r - 1; tease = true; }
    ov.className = 'overlay r' + r;
    ov.style.setProperty('--rc', rcol(r));
    cap.style.setProperty('--cc', rcol(shown));
    cap.style.setProperty('--glow', 0);
    cap.className = 'cap drop';
    cap.hidden = false; $('#rv-card').hidden = true; $('#rv-hint').hidden = false; $('#rv-up').hidden = true;
    $('#rv-hint').textContent = 'TAP TO OPEN';
    stage.className = 'rv-stage';
    ov.hidden = false;
    setTimeout(() => cap.focus({ preventScroll: true }), 50);
    let taps = 0, opened = false, done = false;

    const capCenter = () => { const q = cap.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; };
    const onTap = () => {
      if (opened) return;
      AU.init();
      taps++;
      AU.play('capTap', taps - 1);
      cap.classList.remove('drop', 'wob'); void cap.offsetWidth; cap.classList.add('wob');
      cap.style.setProperty('--glow', Math.min(1, taps * (.18 + Math.min(r, 5) * .09)));
      $('#rv-hint').textContent = taps === 1 ? 'AGAIN' : 'ONE MORE';
      if (taps === 1) cap.classList.add('c1');
      if (taps === 2) {
        cap.classList.add('c2');
        if (tease) {
          cap.style.setProperty('--cc', rcol(r));
          const up = $('#rv-up'); up.hidden = false; up.classList.remove('go'); void up.offsetWidth; up.classList.add('go');
          const fl = $('#rv-flash'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
          AU.play('rarityUp');
        }
      }
      const [x, y] = capCenter();
      FX.burst(x, y, 6 + taps * 3 + r * 2, [rcol(taps >= 2 ? r : shown), '#ffffff'], { speed: 300, size: 6 });
      if (taps >= 3) open();
    };
    const open = () => {
      if (opened) return; opened = true;
      cap.classList.add('open');
      $('#rv-hint').hidden = true;
      const fl = $('#rv-flash'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
      ov.classList.add('opened');
      if (r >= 3 && !RM) stage.classList.add(r === 6 ? 'shake2' : 'shake' + Math.min(3, r - 2));
      AU.play('reveal', r);
      const [x, y] = capCenter();
      const n = [26, 40, 60, 90, 140, 220, 110][r];
      const cols = r === 5 ? ['#ff5fa2', '#ffcf33', '#3ddcb4', '#4aa8ff', '#b06bff', '#ffffff'] : r === 6 ? ['#ffffff', '#000000', '#ff2a6d', '#05d9e8'] : [rcol(r), '#ffffff', '#ffcf33'];
      FX.burst(x, y, n, cols, { speed: 560 + r * 90, size: 8 });
      if (r >= 4) setTimeout(() => FX.burst(x, y - 40, 60, cols, { up: true, speed: 900, spread: 2.2, size: 9 }), 350);
      // fill the card
      $('#rv-rarity').textContent = RAR[r].k;
      $('#rv-rname').textContent = RAR[r].name.toUpperCase();
      $('#rv-emoji').textContent = it.e;
      $('#rv-name').textContent = it.n;
      $('#rv-flavor').textContent = it.d;
      const tags = [];
      if (r === 6) tags.push('<span class="tag new">TAKEN FROM THE GAME</span>');
      else {
        tags.push(res.isNew ? '<span class="tag new">NEW!</span>' : `<span class="tag lv">Lv ${res.lv} ↑</span>`);
        const gain = RAR[r].tps * BANNERS[it.b].mult * (res.isNew ? 1 : .6) * incomeMult(S);
        tags.push(`<span class="tag tps">+${money(gain)}/s</span>`);
      }
      $('#rv-tags').innerHTML = tags.join('');
      const q = r === 6 ? META_PRE[BANNERS[META].items.indexOf(it)] : (res.isNew ? pick(LINES['r' + r]) : pick(LINES.dupe));
      $('#rv-quote').innerHTML = q && !document.body.classList.contains('fx-noface') ? `<b>GACHA-CHAN</b>${q.replace(/</g, '&lt;')}` : '';
      $('#rv-ok').textContent = OK_LABEL[r];
      setTimeout(() => {
        if (done) return;
        cap.hidden = true; $('#rv-card').hidden = false;
        $('#rv-ok').focus({ preventScroll: true });
      }, 430);
    };
    const finish = () => {
      if (!opened) return open();
      if (done) return; done = true;
      ov.hidden = true; ov.classList.remove('opened');
      cap.onclick = null; $('#rv-skip').onclick = null; $('#rv-ok').onclick = null;
      resolve();
    };
    cap.onclick = onTap;
    $('#rv-skip').onclick = () => (opened ? finish() : open());
    $('#rv-ok').onclick = finish;
  });
}

/* ---------- ten-pull reveal ---------- */
function revealMany(results) {
  return new Promise(resolve => {
    const ov = $('#multi'), grid = $('#mp-grid');
    grid.innerHTML = '';
    const cells = results.map((res, i) => {
      const r = res.it.r;
      const el = document.createElement('button');
      el.className = 'mcell';
      el.style.setProperty('--rc', rcol(r));
      el.style.setProperty('--cc', rcol(r >= 3 && Math.random() < .35 ? r - 1 : r));
      el.setAttribute('aria-label', `${RAR[r].name}: ${res.it.n}${res.isNew ? ', new' : ''}`);
      el.innerHTML = `<div class="mc-cap" style="animation-delay:${i * 55}ms"></div><div class="mc-item"><div class="mc-em">${res.it.e}</div><div class="mc-rk">${RAR[r].k}</div></div>${res.isNew ? '<span class="mc-new">NEW</span>' : ''}`;
      el.addEventListener('click', (e) => { if (el.classList.contains('open') && finished) { e.stopPropagation(); showItem(res.it.id); } });
      grid.appendChild(el);
      return el;
    });
    $('#mp-sum').textContent = 'Tap to speed up';
    $('#mp-ok').hidden = true;
    ov.hidden = false;
    let i = 0, fast = false, finished = false;
    const next = () => {
      if (i >= cells.length) return end();
      const res = results[i], el = cells[i], r = res.it.r;
      el.classList.add('open', 'r' + r);
      AU.play('pop', i);
      if (r >= 3) {
        el.classList.add('hi');
        const q = el.getBoundingClientRect();
        FX.burst(q.left + q.width / 2, q.top + q.height / 2, 16 + r * 12, [rcol(r), '#ffffff', '#ffcf33'], { speed: 420, size: 7 });
        if (r >= 4) AU.play('reveal', r);
      }
      i++;
      setTimeout(next, fast ? 40 : (r >= 4 ? 750 : r >= 3 ? 380 : 190));
    };
    const end = () => {
      finished = true;
      const nNew = results.filter(x => x.isNew).length;
      const best = results.reduce((a, x) => (x.it.r > a.it.r ? x : a), results[0]);
      $('#mp-sum').innerHTML = `${nNew} new · best pull: <b style="color:${rcol(best.it.r)}">${RAR[best.it.r].k}</b> ${best.it.n.replace(/</g, '&lt;')}`;
      $('#mp-ok').hidden = false;
      $('#mp-ok').focus({ preventScroll: true });
    };
    ov.onclick = () => { fast = true; };
    $('#mp-ok').onclick = (e) => { e.stopPropagation(); ov.hidden = true; ov.onclick = null; resolve(); };
    setTimeout(next, 650);
  });
}
