/* ============================================================
   Dream Machine, part 5: the screen. The renderer and camera,
   dragging and pinching to look around, the drifting camera,
   the controls, dream sounds, and saving a dream (as a picture,
   a link, or as Burnware's wallpaper).
   ============================================================ */
const App = {
  rules: Object.assign({}, DEFAULT_RULES), seed: '', t: 0, last: 0, no: 1,
  cam: { theta: 0.6, phi: 1.25, dist: 100, look: new THREE.Vector3(), want: null }, idleAt: 0, tour: true,
  init() {
    const view = $('#view');
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75)); view.append(this.renderer.domElement);
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(50, 1, 0.5, 6000); World.init(this.scene);
    this.resize(); addEventListener('resize', () => this.resize());
    this.controls(view); this.ui();
    try { this.tour = localStorage.getItem('dream-tour') !== '0'; } catch (e) {}
    $('#bTour').setAttribute('aria-pressed', String(this.tour));
  },
  /* the world is framed a little high, so the controls at the bottom don't cover the middle of it */
  resize() { const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.fov = w < h ? 64 : 50; this.camera.setViewOffset(w, h, 0, h * (w < h ? 0.1 : 0.08), w, h); this.camera.updateProjectionMatrix(); },
  /* ---- a new dream ---- */
  dream(seed, rules, quick) {
    this.seed = seed || newSeed(); if (rules) Object.assign(this.rules, rules);
    $('#seed').value = this.seed; this.paintRules();
    const veil = $('#veil'); veil.classList.add('on');
    setTimeout(() => {
      const t0 = performance.now(), out = World.build(this.seed, this.rules), I = World.info, r = rng(hashStr(this.seed + 'cam'));
      this.cam.look.copy(I.look); this.cam.dist = I.dist * (this.camera.aspect < 1 ? 1.35 : 1); this.cam.phi = I.phi; if (!quick) this.cam.theta = this.clearView(r.range(-0.9, 0.9));
      this.no = (hashStr(this.seed) % 9000) + 1000;
      $('#dreamNo').textContent = `Dream No. ${this.no}`; $('#dreamName').textContent = out.name;
      const lines = ['gravity', 'scale', 'geometry', 'time'].map(k => LINES[k][this.rules[k]]).filter(Boolean);
      $('#dreamLine').textContent = lines.slice(0, 2).join(' ');
      document.title = out.name + ' · Dream Machine'; document.body.classList.toggle('light', !!out.pal.light);
      try { history.replaceState(null, '', '#' + new URLSearchParams(Object.assign({ seed: this.seed }, this.rules)).toString()); } catch (e) {}
      Sound.retune(out.pal.mood, hashStr(this.seed));
      this.built = performance.now() - t0;
      $('#loading').hidden = true; requestAnimationFrame(() => veil.classList.remove('on'));
    }, quick ? 160 : 380);
  },
  /* start from an angle where nothing is in the way: look out from the middle and see what the line of sight hits first */
  clearView(pref) {
    const C = this.cam, ray = new THREE.Raycaster(), dir = new THREE.Vector3(), targets = []; World.land.traverse(o => { if (o.isMesh && o.geometry.type !== 'CircleGeometry') targets.push(o); });
    World.land.updateMatrixWorld(true); let best = pref, bestScore = -1;
    for (let k = 0; k < 16; k++) {
      const theta = pref + (k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.39);
      dir.set(Math.sin(C.phi) * Math.sin(theta), Math.cos(C.phi), Math.sin(C.phi) * Math.cos(theta)).normalize();
      ray.set(C.look, dir); ray.near = World.info.size * 0.18; ray.far = C.dist;
      const hit = ray.intersectObjects(targets, false)[0], score = hit ? hit.distance / C.dist : 1.2;
      if (score > bestScore + 0.05) { bestScore = score; best = theta; } if (score >= 1.2) break;
    }
    return best;
  },
  surprise() { const r = rng((Math.random() * 4294967296) >>> 0), rules = {}; for (const R of RULES) rules[R.id] = r.chance(0.35) ? R.opts[0][0] : r.pick(R.opts)[0]; this.dream(newSeed(), rules); },
  /* ---- looking around: drag to turn, pinch or scroll to move closer ---- */
  controls(view) {
    const pts = new Map(); let pinch = 0;
    view.addEventListener('pointerdown', (e) => { view.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); this.idleAt = performance.now(); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    view.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return; const prev = pts.get(e.pointerId), dx = e.clientX - prev[0], dy = e.clientY - prev[1]; pts.set(e.pointerId, [e.clientX, e.clientY]); this.idleAt = performance.now();
      if (pts.size === 1) { this.cam.theta -= dx * 0.005; this.cam.phi = clamp(this.cam.phi - dy * 0.004, 0.08, Math.PI - 0.08); }
      else if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) this.zoom(pinch / d); pinch = d; }
    });
    const up = (e) => { pts.delete(e.pointerId); pinch = 0; };
    view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
    view.addEventListener('wheel', (e) => { e.preventDefault(); this.idleAt = performance.now(); this.zoom(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
    addEventListener('keydown', (e) => {
      if (e.target.closest('input')) { if (e.key === 'Enter') { e.preventDefault(); this.dream(e.target.value.trim() || newSeed()); e.target.blur(); } return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'g') { if (e.target.closest('button') && k === ' ') return; e.preventDefault(); this.dream(); }
      else if (k === 'h') this.toggleHide();
      else if (k === 'arrowleft' || k === 'arrowright') { this.cam.theta += k === 'arrowleft' ? 0.12 : -0.12; this.idleAt = performance.now(); }
      else if (k === 'arrowup' || k === 'arrowdown') { this.zoom(k === 'arrowup' ? 0.9 : 1.1); this.idleAt = performance.now(); }
    });
  },
  zoom(f) { const s = World.info.size, inward = this.rules.gravity === 'inward'; this.cam.dist = clamp(this.cam.dist * f, s * (inward ? 1.1 : 0.12), s * (inward ? 6 : 3.5)); },
  placeCamera(realDt) {
    const C = this.cam, cam = this.camera;
    if (this.tour && performance.now() - this.idleAt > 2500 && !calm()) { C.theta += realDt * 0.035; C.phi = clamp(C.phi + Math.sin(performance.now() / 9000) * realDt * 0.01, 0.15, Math.PI - 0.15); }
    cam.position.set(C.look.x + C.dist * Math.sin(C.phi) * Math.sin(C.theta), C.look.y + C.dist * Math.cos(C.phi), C.look.z + C.dist * Math.sin(C.phi) * Math.cos(C.theta));
    cam.lookAt(C.look);
  },
  /* ---- the controls ---- */
  ui() {
    const box = $('#rules');
    for (const R of RULES) {
      const seg = h('div.seg', { role: 'radiogroup', 'aria-label': R.name });
      for (const [v, label] of R.opts) { const b = h('button', { type: 'button', role: 'radio', 'data-r': R.id, 'data-v': v }, label); b.onclick = () => this.setRule(R.id, v); seg.append(b); }
      box.append(h('div.rule', h('b', R.name), seg));
    }
    const acts = h('div.rule', { style: 'grid-column: 1 / -1' }, h('b', 'Keep this dream'), h('div.seg', { id: 'acts' }));
    box.append(acts);
    const act = (label, fn, title) => { const b = h('button', { type: 'button', title }, label); b.onclick = fn; $('#acts').append(b); return b; };
    act('Save picture', () => this.savePicture(), 'Download this view as a PNG');
    act('Copy link', () => this.copyLink(), 'A link that opens this exact dream');
    if (this.burnware()) act('Set as wallpaper', () => this.wallpaper(), 'Make this view the Burnware desktop wallpaper');
    $('#gen').onclick = () => this.dream();
    $('#bSurprise').onclick = () => this.surprise();
    $('#more').onclick = () => { const p = $('#panel'), c = p.classList.toggle('collapsed'); $('#more').setAttribute('aria-expanded', String(!c)); $('#more').textContent = c ? 'Rules ▴' : 'Rules ▾'; try { localStorage.setItem('dream-rules', c ? '0' : '1'); } catch (e) {} };
    let open = false; try { open = localStorage.getItem('dream-rules') === '1'; } catch (e) {}
    if (!open) $('#more').onclick();
    $('#bHide').onclick = () => this.toggleHide();
    $('#bTour').onclick = () => { this.tour = !this.tour; $('#bTour').setAttribute('aria-pressed', String(this.tour)); try { localStorage.setItem('dream-tour', this.tour ? '1' : '0'); } catch (e) {} this.toast(this.tour ? 'The camera will drift when you let go' : 'The camera stays where you put it'); };
    $('#bSound').onclick = () => { const on = Sound.toggle(); $('#bSound').setAttribute('aria-pressed', String(on)); this.toast(on ? 'Dream sounds on' : 'Dream sounds off'); };
  },
  paintRules() { document.querySelectorAll('#rules .seg button[data-r]').forEach(b => { const on = this.rules[b.dataset.r] === b.dataset.v; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }); },
  setRule(id, v) {
    if (this.rules[id] === v) return; this.rules[id] = v; this.paintRules();
    if (id === 'time' || id === 'physics') {   // these change how the dream moves, not what is in it
      try { history.replaceState(null, '', '#' + new URLSearchParams(Object.assign({ seed: this.seed }, this.rules)).toString()); } catch (e) {}
      const lines = ['gravity', 'scale', 'geometry', 'time'].map(k => LINES[k][this.rules[k]]).filter(Boolean); $('#dreamLine').textContent = lines.slice(0, 2).join(' ');
      return this.toast(id === 'time' ? { still: 'Time stops', slow: 'Time slows down', normal: 'Time runs normally', fast: 'Time speeds up', back: 'Time runs backwards' }[v] : { still: 'Everything holds still', float: 'Everything floats', orbit: 'The islands start to orbit', fall: 'Everything falls, forever', breathe: 'The world breathes' }[v]);
    }
    const keepCam = { theta: this.cam.theta }; this.dream(this.seed, null, true); this.cam.theta = keepCam.theta;
  },
  toggleHide() { const on = document.body.classList.toggle('hidden'); $('#bHide').setAttribute('aria-pressed', String(on)); },
  toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(this.toastT); this.toastT = setTimeout(() => t.classList.remove('show'), 1800); },
  /* ---- keeping a dream ---- */
  snapshot(maxW) {
    this.renderer.render(this.scene, this.camera);
    const src = this.renderer.domElement; if (!maxW || src.width <= maxW) return src;
    const c = document.createElement('canvas'), k = maxW / src.width; c.width = maxW; c.height = Math.round(src.height * k); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return c;
  },
  savePicture() {
    const c = this.snapshot(), name = 'dream-' + this.seed.replace(/[^a-z0-9-]/gi, '') + '.png';
    c.toBlob((b) => { if (!b) return this.toast('Could not save the picture'); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); this.toast('Saved ' + name); }, 'image/png');
  },
  copyLink() {
    let url = location.href; try { if (this.burnware()) url = new URL('apps/dream-machine.html' + location.hash, parent.location.href).href; } catch (e) {}
    const done = () => this.toast('Link copied: it opens this exact dream');
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => this.toast(url)); else this.toast(url);
  },
  burnware() { try { return window.parent !== window && !!parent.BW && !!parent.BW.Wall; } catch (e) { return false; } },
  wallpaper() {
    try {
      const P = parent.BW, data = this.snapshot(1600).toDataURL('image/jpeg', 0.85);
      P.Store.data.customWall = data; P.Store.data.wall = 'custom'; P.Store.save(); P.Wall.paint();
      this.toast('This dream is now your desktop wallpaper');
    } catch (e) { this.toast('Could not set the wallpaper (not enough room to save it)'); }
  },
  /* ---- every frame ---- */
  frame(now) {
    requestAnimationFrame((n) => this.frame(n));
    const real = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0); this.last = now;
    if (document.hidden || !World.root) return;
    const dt = real * TIME_SPEED[this.rules.time]; this.t += dt;
    Motion.update(this.t, dt); this.placeCamera(real);
    this.renderer.render(this.scene, this.camera);
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
