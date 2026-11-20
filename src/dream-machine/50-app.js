/* ============================================================
   Dream Machine, part 4: you, the screen and the controls.
   Draws the shader to the screen (at a resolution that keeps it
   smooth), walks you around (WASD or a thumb-stick), applies the
   rules, names the places you find, and keeps dreams you like
   (a picture, a link to the exact spot, or Burnware's wallpaper).
   ============================================================ */
const App = {
  rules: Object.assign({}, DEFAULT_RULES), seed: '', last: 0, res: 0.6, ms: 16, found: new Set(),
  me: { x: 0, y: 0, z: 0, vy: 0, yaw: 0, pitch: -0.05, eye: 3.2, ground: true }, keys: {}, stick: [0, 0], look: null, idleAt: 0, tour: true, jumpHeld: false, downHeld: false,
  init() {
    const cv = this.cv = document.createElement('canvas'); $('#view').append(cv);
    const gl = this.gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }) || cv.getContext('experimental-webgl');
    if (!gl) return this.fail('This browser has no WebGL, so the dream cannot be drawn.');
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    try {
      const pr = this.pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    } catch (e) { console.error(e); return this.fail('The dream could not start on this device (' + String(e.message).split('\n')[0].slice(0, 90) + ').'); }
    gl.useProgram(this.pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(this.pr, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    this.u = {}; for (const n of ['uRes', 'uTime', 'uFov', 'uBend', 'uGeo', 'uPhys', 'uScale', 'uSteps', 'uShadow', 'uFogK', 'uStars', 'uCam', 'uSun', 'uRot', 'uSeed', 'uTop', 'uHor', 'uLow', 'uFogC', 'uStone', 'uStone2', 'uGlow', 'uMoon', 'uSea', 'uMist']) this.u[n] = gl.getUniformLocation(this.pr, n);
    this.touch = matchMedia('(pointer: coarse)').matches; this.res = this.touch ? 0.42 : 0.6;
    this.resize(); addEventListener('resize', () => this.resize());
    this.ui(); this.controls();
    try { this.tour = localStorage.getItem('dream-walk') === '1'; } catch (e) {} $('#bTour').setAttribute('aria-pressed', String(this.tour));
    return true;
  },
  fail(msg) { $('#loading').hidden = false; $('#loading').textContent = msg; return false; },
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.max(64, Math.round(innerWidth * dpr * this.res)), hh = Math.max(64, Math.round(innerHeight * dpr * this.res));
    if (this.cv.width !== w || this.cv.height !== hh) { this.cv.width = w; this.cv.height = hh; this.gl.viewport(0, 0, w, hh); }
  },
  /* ---- a new dream: a new world, and you dropped into it ---- */
  dream(seed, rules, at) {
    this.seed = seed || newSeed(); if (rules) Object.assign(this.rules, rules);
    $('#seed').value = this.seed; this.paintRules(); this.found.clear();
    const veil = $('#veil'); veil.classList.add('on');
    setTimeout(() => {
      World.set(this.seed, this.rules); World.t = 0; this.applyRules();
      const r = rng(hashStr(this.seed + 'start')), me = this.me;
      const sp = at || World.spawn(r, me.eye, { up: 0.00045, inward: -0.0009 }[this.rules.gravity] || 0); me.x = sp.x; me.z = sp.z; me.yaw = sp.yaw; me.pitch = -0.06; me.vy = 0;
      me.y = World.floor(me.x, me.z, 1e9) + me.eye; this.sunAz = r.range(0, 6.28);
      this.no = (hashStr(this.seed) % 9000) + 1000; this.name = dreamName(rng(hashStr(this.seed)));
      this.title(this.name, `Dream No. ${this.no}`); this.line();
      document.title = this.name + ' · Dream Machine';
      Sound.retune(this.pal.mood, hashStr(this.seed));
      $('#loading').hidden = true; requestAnimationFrame(() => veil.classList.remove('on'));
    }, 260);
  },
  title(h1, small) { $('#dreamName').textContent = h1; $('#dreamNo').textContent = small; },
  line() { const lines = ['gravity', 'scale', 'geometry', 'time'].map(k => LINES[k][this.rules[k]]).filter(Boolean); $('#dreamLine').textContent = lines.slice(0, 2).join(' '); },
  /* rules are just numbers handed to the shader, so they change the world instantly */
  applyRules() {
    const R = this.rules, pal = this.pal = R.palette === 'random' ? randomPalette(rng(hashStr(this.seed + 'colour'))) : PALETTES[R.palette];
    World.set(this.seed, R);
    const gl = this.gl, u = this.u, v3 = (n, hex) => gl.uniform3fv(u[n], rgb(hex));
    v3('uTop', pal.top); v3('uHor', pal.hor); v3('uLow', pal.low); v3('uFogC', pal.fog); v3('uStone', pal.stone); v3('uStone2', pal.stone2); v3('uGlow', pal.glow); v3('uMoon', pal.moon); v3('uSea', pal.sea); v3('uMist', pal.mist);
    gl.uniform1f(u.uStars, pal.stars); gl.uniform1f(u.uFogK, 0.0011 * (pal.fogK || 1)); gl.uniform2f(u.uSeed, World.seed[0], World.seed[1]);
    gl.uniform1f(u.uGeo, GEO[R.geometry]); gl.uniform1f(u.uPhys, PHYS[R.physics]); gl.uniform1f(u.uScale, SCALE[R.scale]);
    gl.uniform1f(u.uBend, { up: 0.00045, inward: -0.0009 }[R.gravity] || 0);
    const eye = R.scale === 'tiny' ? 42 : 3.2, me = this.me; if (me.eye !== eye) { me.y += eye - me.eye; me.eye = eye; }
    document.body.classList.toggle('light', !!pal.light); $('#jumpBtn').textContent = R.gravity === 'none' ? '▲' : 'Jump'; $('#downBtn').hidden = R.gravity !== 'none';
  },
  /* ---- moving you ---- */
  move(dt, real) {
    const me = this.me, K = this.keys, R = this.rules, fly = R.gravity === 'none', big = me.eye / 3.2;
    let fx = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0) + this.stick[0], fz = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0) - this.stick[1];
    const active = fx || fz || this.jumpHeld || this.downHeld || this.look;
    if (active) this.idleAt = performance.now();
    if (this.tour && performance.now() - this.idleAt > 3000) { fz = 0.55; me.yaw += Math.sin(performance.now() / 7000) * real * 0.25; me.pitch += (-0.05 - me.pitch) * real; }
    const len = Math.hypot(fx, fz); if (len > 1) { fx /= len; fz /= len; }
    const run = K.ShiftLeft || K.ShiftRight || Math.hypot(...this.stick) > 0.95 ? 2.6 : 1, sp = 18 * Math.sqrt(big) * run * (R.scale === 'giant' ? 1.4 : 1);
    const sy = Math.sin(me.yaw), cy = Math.cos(me.yaw);
    let dx = (-sy * fz + cy * fx) * sp * real, dz = (-cy * fz - sy * fx) * sp * real;
    if (fly) {   // no gravity: you go where you look
      const cp = Math.cos(me.pitch); dx = (-sy * cp * fz + cy * fx) * sp * 2 * real; dz = (-cy * cp * fz - sy * fx) * sp * 2 * real;
      me.y += (Math.sin(me.pitch) * fz + (this.jumpHeld ? 1 : 0) - (this.downHeld ? 1 : 0)) * sp * 2 * real; me.vy = 0;
    }
    me.x += dx; me.z += dz;
    World.push(me, 1.4 * big);
    const g = R.gravity === 'up' ? 9 : 42, jump = (R.gravity === 'up' ? 34 : 21) * Math.sqrt(big);
    if (!fly) { if (this.jumpHeld && me.ground) { me.vy = jump; me.ground = false; } me.vy -= g * big * real; me.y += me.vy * real; }
    const floor = World.floor(me.x, me.z, me.y - me.eye) + me.eye;
    if (me.y <= floor) { if (!fly && me.y < floor - 6 * big && me.vy <= 0 && floor - me.y < 60) me.y += (floor - me.y) * Math.min(1, real * 14); else me.y = floor; me.vy = Math.max(0, me.vy); me.ground = true; }
    else me.ground = me.y - floor < 0.3;
    if (me.y > 4000) me.y = 4000;
  },
  rotation() {
    const me = this.me, roll = this.rules.gravity === 'side' ? Math.PI / 2 : 0;
    const cy = Math.cos(me.yaw), sy = Math.sin(me.yaw), cp = Math.cos(me.pitch), sp = Math.sin(me.pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    /* camera space to world: yaw (around up), then pitch (around right), then roll (around forward) */
    const Ry = [cy, 0, -sy, 0, 1, 0, sy, 0, cy], Rx = [1, 0, 0, 0, cp, sp, 0, -sp, cp], Rz = [cr, sr, 0, -sr, cr, 0, 0, 0, 1];
    const mul = (A, B) => { const o = new Array(9); for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 3 + r] = A[r] * B[c * 3] + A[3 + r] * B[c * 3 + 1] + A[6 + r] * B[c * 3 + 2]; return o; };
    return new Float32Array(mul(mul(Ry, Rx), Rz));
  },
  /* ---- the controls ---- */
  controls() {
    const view = $('#view'), fingers = new Map();
    view.addEventListener('pointerdown', (e) => {
      view.setPointerCapture(e.pointerId); this.idleAt = performance.now();
      const stick = e.pointerType === 'touch' && e.clientX < innerWidth * 0.45 && ![...fingers.values()].some(f => f.stick);
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, stick });
      if (stick) { const s = $('#stick'); s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px'; s.classList.add('on'); } else this.look = true;
    });
    view.addEventListener('pointermove', (e) => {
      const f = fingers.get(e.pointerId); if (!f) return; this.idleAt = performance.now();
      if (f.stick) { const dx = e.clientX - f.x0, dy = e.clientY - f.y0, d = Math.hypot(dx, dy), k = Math.min(1, d / 55) / (d || 1); this.stick = [dx * k, dy * k]; $('#knob').style.transform = `translate(${this.stick[0] * 34}px, ${this.stick[1] * 34}px)`; return; }
      const k = e.pointerType === 'touch' ? 0.006 : 0.0042; this.me.yaw -= (e.clientX - f.x) * k; this.me.pitch = clamp(this.me.pitch - (e.clientY - f.y) * k, -1.45, 1.45); f.x = e.clientX; f.y = e.clientY;
    });
    const up = (e) => { const f = fingers.get(e.pointerId); fingers.delete(e.pointerId); if (f && f.stick) { this.stick = [0, 0]; $('#stick').classList.remove('on'); $('#knob').style.transform = ''; } if (![...fingers.values()].some(x => !x.stick)) this.look = null; };
    view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
    addEventListener('keydown', (e) => {
      if (e.target.closest('input')) { if (e.key === 'Enter') { e.preventDefault(); this.dream(e.target.value.trim() || newSeed()); e.target.blur(); } return; }
      if (e.ctrlKey && e.code !== 'ControlLeft' || e.metaKey || e.altKey) return;
      if (e.code === 'KeyG') return this.dream();
      if (e.code === 'KeyH') return this.toggleHide();
      if (e.code === 'Space') { if (e.target.closest('button')) return; e.preventDefault(); this.jumpHeld = true; }
      if (e.code === 'KeyC' || e.code === 'ControlLeft') this.downHeld = true;
      if (/^(Key[WASD]|Arrow|Shift)/.test(e.code)) { this.keys[e.code] = true; if (e.code.startsWith('Arrow')) e.preventDefault(); }
      this.idleAt = performance.now();
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; if (e.code === 'Space') this.jumpHeld = false; if (e.code === 'KeyC' || e.code === 'ControlLeft') this.downHeld = false; });
    addEventListener('blur', () => { this.keys = {}; this.jumpHeld = this.downHeld = false; });
    const hold = (el, key) => { el.addEventListener('pointerdown', (e) => { e.preventDefault(); this[key] = true; this.idleAt = performance.now(); }); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => { this[key] = false; }); };
    hold($('#jumpBtn'), 'jumpHeld'); hold($('#downBtn'), 'downHeld');
  },
  ui() {
    document.body.append(h('div#stick', { 'aria-hidden': 'true' }, h('div#knob')), h('div#pad', h('button#downBtn', { type: 'button', 'aria-label': 'Fly down', hidden: '' }, '▼'), h('button#jumpBtn', { type: 'button', 'aria-label': 'Jump' }, 'Jump')));
    if (this.touch) document.body.classList.add('touch');
    $('#hint').textContent = this.touch ? 'Left thumb: walk · right thumb: look · Jump button' : 'WASD or arrows to walk · drag to look · Space to jump · Shift to run';
    document.body.classList.add('hinting'); setTimeout(() => document.body.classList.remove('hinting'), 9000);
    const box = $('#rules');
    for (const R of RULES) {
      const seg = h('div.seg', { role: 'radiogroup', 'aria-label': R.name });
      for (const [v, label] of R.opts) { const b = h('button', { type: 'button', role: 'radio', 'data-r': R.id, 'data-v': v }, label); b.onclick = () => this.setRule(R.id, v); seg.append(b); }
      box.append(h('div.rule', h('b', R.name), seg));
    }
    box.append(h('div.rule', { style: 'grid-column: 1 / -1' }, h('b', 'Keep this dream'), h('div.seg', { id: 'acts' })));
    const act = (label, fn, title) => { const b = h('button', { type: 'button', title }, label); b.onclick = fn; $('#acts').append(b); };
    act('Save picture', () => this.savePicture(), 'Download this view as a PNG');
    act('Copy link', () => this.copyLink(), 'A link that opens this world, at this exact spot');
    if (this.burnware()) act('Set as wallpaper', () => this.wallpaper(), 'Make this view the Burnware desktop wallpaper');
    $('#gen').onclick = () => this.dream();
    $('#bSurprise').onclick = () => this.surprise();
    $('#more').onclick = () => { const c = $('#panel').classList.toggle('collapsed'); $('#more').setAttribute('aria-expanded', String(!c)); $('#more').textContent = c ? 'Rules ▴' : 'Rules ▾'; };
    $('#more').onclick();
    $('#bHide').onclick = () => this.toggleHide();
    $('#bTour').onclick = () => { this.tour = !this.tour; $('#bTour').setAttribute('aria-pressed', String(this.tour)); try { localStorage.setItem('dream-walk', this.tour ? '1' : '0'); } catch (e) {} this.toast(this.tour ? 'Sleepwalking: you wander on your own when you let go' : 'You stay put when you let go'); };
    $('#bSound').onclick = () => { const on = Sound.toggle(); $('#bSound').setAttribute('aria-pressed', String(on)); this.toast(on ? 'Dream sounds on' : 'Dream sounds off'); };
  },
  surprise() { const r = rng((Math.random() * 4294967296) >>> 0), rules = {}; for (const R of RULES) rules[R.id] = r.chance(0.35) ? R.opts[0][0] : r.pick(R.opts)[0]; this.dream(newSeed(), rules); },
  paintRules() { document.querySelectorAll('#rules .seg button[data-r]').forEach(b => { const on = this.rules[b.dataset.r] === b.dataset.v; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }); },
  setRule(id, v) {
    if (this.rules[id] === v) return; this.rules[id] = v; this.paintRules(); this.applyRules(); this.line();
    const say = { gravity: { down: 'Gravity pulls down', up: 'The world curls up around you, and you jump like on the moon', side: 'The horizon tips on its end', none: 'Gravity is gone: you can fly (Space up, C down)', inward: 'The world shrinks into a little planet' }, time: { still: 'Time stops', slow: 'Time slows down', normal: 'Time runs normally', fast: 'Time speeds up', back: 'Time runs backwards' }, physics: { still: 'Everything holds still', float: 'Everything floats', orbit: 'The monuments start to turn', fall: 'The islands fall, forever', breathe: 'The world breathes' } }[id];
    this.toast(say ? say[v] : RULES.find(r => r.id === id).opts.find(o => o[0] === v)[1]);
  },
  toggleHide() { const on = document.body.classList.toggle('hidden'); $('#bHide').setAttribute('aria-pressed', String(on)); },
  toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(this.toastT); this.toastT = setTimeout(() => t.classList.remove('show'), 2200); },
  /* ---- finding places ---- */
  discover() {
    const c = World.near(this.me.x, this.me.z); if (!c) return;
    const key = c.ix + ',' + c.iz; if (this.found.has(key)) return; this.found.add(key);
    const p = World.placeName(c); this.title(p.name, `${p.kind} · place ${this.found.size} found in dream no. ${this.no}`);
    clearTimeout(this.nameT); this.nameT = setTimeout(() => this.title(this.name, `Dream No. ${this.no} · ${this.found.size} place${this.found.size === 1 ? '' : 's'} found`), 9000);
  },
  /* ---- keeping a dream ---- */
  snapshot(full) {
    const keep = this.res; if (full) { this.res = 1; this.resize(); }
    this.draw(true); const out = this.cv; if (!full) return out;
    const c = document.createElement('canvas'); c.width = out.width; c.height = out.height; c.getContext('2d').drawImage(out, 0, 0);
    this.res = keep; this.resize(); return c;
  },
  savePicture() {
    const c = this.snapshot(true), name = 'dream-' + this.seed.replace(/[^a-z0-9-]/gi, '') + '.png';
    c.toBlob((b) => { if (!b) return this.toast('Could not save the picture'); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); this.toast('Saved ' + name); }, 'image/png');
  },
  link() { const me = this.me; return '#' + new URLSearchParams(Object.assign({ seed: this.seed }, this.rules, { x: Math.round(me.x), z: Math.round(me.z), yaw: me.yaw.toFixed(2) })).toString(); },
  copyLink() {
    let url = location.href.split('#')[0] + this.link(); try { if (this.burnware()) url = new URL('apps/dream-machine.html' + this.link(), parent.location.href).href; } catch (e) {}
    const done = () => this.toast('Link copied: it opens this world, right here');
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => this.toast(url)); else this.toast(url);
  },
  burnware() { try { return window.parent !== window && !!parent.BW && !!parent.BW.Wall; } catch (e) { return false; } },
  wallpaper() {
    try {
      const big = this.snapshot(true), k = Math.min(1, 1600 / big.width), c = document.createElement('canvas'); c.width = Math.round(big.width * k); c.height = Math.round(big.height * k); c.getContext('2d').drawImage(big, 0, 0, c.width, c.height);
      const P = parent.BW; P.Store.data.customWall = c.toDataURL('image/jpeg', 0.85); P.Store.data.wall = 'custom'; P.Store.save(); P.Wall.paint();
      this.toast('This view is now your desktop wallpaper');
    } catch (e) { this.toast('Could not set the wallpaper (not enough room to save it)'); }
  },
  /* ---- every frame ---- */
  draw(still) {
    const gl = this.gl, u = this.u, me = this.me, cv = this.cv;
    gl.uniform2f(u.uRes, cv.width, cv.height); gl.uniform1f(u.uTime, World.t); gl.uniform1f(u.uFov, Math.tan((innerWidth < innerHeight ? 72 : 58) * Math.PI / 360));
    gl.uniform3f(u.uCam, me.x, me.y, me.z); gl.uniformMatrix3fv(u.uRot, false, this.rotation());
    const az = this.sunAz + World.t * 0.01, el = 0.26; gl.uniform3f(u.uSun, Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az));
    gl.uniform1f(u.uSteps, still ? 220 : this.res < 0.45 ? 130 : 170); gl.uniform1f(u.uShadow, still ? 28 : this.res < 0.5 ? 0 : 18);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  },
  frame(now) {
    requestAnimationFrame((n) => this.frame(n));
    const real = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0); if (this.last) this.ms = this.ms * 0.94 + (now - this.last) * 0.06; this.last = now;
    if (document.hidden || this.paused || !this.seed || !World.seedStr) return;
    World.t += real * TIME_SPEED[this.rules.time];
    this.move(real, real); this.discover(); this.draw();
    /* keep it smooth: render fewer pixels when the frame takes too long, more when there is room */
    if ((this.adaptT = (this.adaptT || 0) + real) > 0.8) { this.adaptT = 0; const before = this.res; if (this.ms > 30) this.res = Math.max(0.28, this.res * 0.86); else if (this.ms < 18) this.res = Math.min(1, this.res * 1.08); if (Math.abs(before - this.res) > 0.01) this.resize(); }
  },
};
/* a tiny element helper: h('div.cls#id', {attrs}, ...children) */
function h(tag, props, ...kids) {
  const [, name = 'div', rest = ''] = tag.match(/^([a-z0-9]*)(.*)$/i), el = document.createElement(name);
  for (const part of rest.match(/[.#][^.#]+/g) || []) part[0] === '.' ? el.classList.add(part.slice(1)) : (el.id = part.slice(1));
  if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) { kids.unshift(props); props = null; }
  for (const k in props || {}) el.setAttribute(k, props[k]);
  for (const k of kids.flat()) if (k != null) el.append(k);
  return el;
}

/* ---- dream sounds: a slow, soft chord, with wind under it. Off until you ask. ---- */
const Sound = {
  ctx: null, on: false, voices: [], mood: 'minor', root: 0,
  toggle() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; } this.build(); }
    this.on = !this.on; const g = this.master.gain, t = this.ctx.currentTime;
    if (this.on) this.ctx.resume();
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(this.on ? 0.16 : 0, t + 1.5);
    return this.on;
  },
  build() {
    const c = this.ctx; this.master = c.createGain(); this.master.gain.value = 0; this.master.connect(c.destination);
    this.filter = c.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 900; this.filter.Q.value = 0.6; this.filter.connect(this.master);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 420; lfo.connect(lg); lg.connect(this.filter.frequency); lfo.start();
    for (let i = 0; i < 4; i++) for (const det of [-7, 6]) { const o = c.createOscillator(), g = c.createGain(); o.type = i === 0 ? 'triangle' : 'sawtooth'; o.detune.value = det; g.gain.value = i === 0 ? 0.32 : 0.09; o.connect(g); g.connect(this.filter); o.start(); this.voices.push({ o, i }); }
    const n = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), bp = c.createBiquadFilter(), wg = c.createGain(); src.buffer = n; src.loop = true; bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.8; wg.gain.value = 0.05; src.connect(bp); bp.connect(wg); wg.connect(this.master); src.start();
    const wl = c.createOscillator(), wlg = c.createGain(); wl.frequency.value = 0.05; wlg.gain.value = 300; wl.connect(wlg); wlg.connect(bp.frequency); wl.start();
    this.retune(this.mood, this.root); setInterval(() => this.step(), 9000);
  },
  retune(mood, seed) { this.mood = mood; this.root = 45 + (seed % 8); this.chord = 0; this.apply(1.5); },
  step() { if (!this.on) return; this.chord = (this.chord + 1) % 4; this.apply(4); },
  apply(glide) {
    if (!this.ctx) return;
    const shapes = { minor: [0, 3, 7, 10], major: [0, 4, 7, 11], sus: [0, 5, 7, 14] }, sh = shapes[this.mood] || shapes.minor, moves = [0, -4, 3, -2], base = this.root + moves[this.chord], t = this.ctx.currentTime;
    for (const v of this.voices) { const midi = base + (v.i === 0 ? -12 : sh[v.i] + (v.i === 3 ? 0 : 0)), f = 440 * Math.pow(2, (midi - 69) / 12); v.o.frequency.cancelScheduledValues(t); v.o.frequency.setValueAtTime(v.o.frequency.value, t); v.o.frequency.exponentialRampToValueAtTime(f, t + glide); }
  },
};
