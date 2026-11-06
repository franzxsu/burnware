/* ============================================================
   UI: storage, input, HUD widgets, menu
   ============================================================ */
const $ = (s) => document.querySelector(s);
const MEDALS = {   // AI flying-lap times per stage and car, from the headless lap sim
  pinewood: { pip: 77.5, brute: 76.4, comet: 72.6, boulder: 76.1, hopper: 77.4, mule: 76.8 },
  mesa: { pip: 60.5, brute: 59.3, comet: 56.6, boulder: 59.8, hopper: 59.6, mule: 60.6 },
  frost: { pip: 85.2, brute: 89.5, comet: 79.5, boulder: 82.7, hopper: 87.0, mule: 86.5 },
  coast: { pip: 48.7, brute: 48.1, comet: 46.9, boulder: 49.5, hopper: 48.6, mule: 49.6 },
};
const MEDAL_TIERS = [['GOLD', 1.0, '#ffd23a'], ['SILVER', 1.07, '#d6dde6'], ['BRONZE', 1.16, '#d89058']];
function medalFor(track, car, lap, wetK = 1) {   // wetK > 1 stretches the targets on a wet stage
  const base = (MEDALS[track] || {})[car] * wetK; if (!base || !lap) return null;
  for (const [n, k, c] of MEDAL_TIERS) if (lap <= base * k) return { name: n, color: c, target: base * k };
  return null;
}

const Store = {
  key: 'pebbledash-v1',
  data: { settings: { cam: 'pocket', mini: true, voice: true, sound: true, gfx: 'fancy', event: 'mixed', tod: 'day', weather: 'clear', diff: 'pro', assist: 'full', screen: 'land', track: 0, car: 2 }, best: {}, ghosts: {} },
  load() {
    try {
      const s = localStorage.getItem(this.key); if (!s) return;
      const o = JSON.parse(s);
      Object.assign(this.data.settings, o.settings || {}); this.data.best = o.best || {}; this.data.ghosts = o.ghosts || {};
      const st = this.data.settings;
      if (!EVENT_BY_ID[st.event]) st.event = st.mode === 'trial' ? 'trial' : 'mixed';
      if (st.track >= TRACKS.length) st.track = 0; if (st.car >= CARS.length) st.car = 2;
    } catch (e) { /* private mode or blocked storage: play without saves */ }
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* ignore */ } },
  best(t, c) { return ((this.data.best[t] || {})[c]) || {}; },
  record(t, c, key, val) {
    const b = this.data.best[t] || (this.data.best[t] = {}), r = b[c] || (b[c] = {});
    if (!r[key] || val < r[key]) { r[key] = val; this.save(); return true; }
    return false;
  },
  recordMax(t, c, key, val) {   // scores: higher is better
    const b = this.data.best[t] || (this.data.best[t] = {}), r = b[c] || (b[c] = {});
    if (val > 0 && (!r[key] || val > r[key])) { r[key] = val; this.save(); return true; }
    return false;
  },
};

/* tilt steering: turn the phone like a wheel. Reads the gravity direction from deviceorientation and
   measures it against whichever way the picture is currently turned on the glass. */
const Tilt = {
  on: false, val: 0, last: 0, bound: false,
  async enable() {
    try {
      if (typeof DeviceOrientationEvent === 'undefined') return false;
      if (typeof DeviceOrientationEvent.requestPermission === 'function' && (await DeviceOrientationEvent.requestPermission()) !== 'granted') return false;
    } catch (e) { return false; }
    this.bind(); this.last = 0;
    return new Promise(res => setTimeout(() => res(this.last > 0), 1500));
  },
  read(e) {
    if (e.beta == null || e.gamma == null) return;
    this.last = performance.now();
    const b = e.beta * Math.PI / 180, g = e.gamma * Math.PI / 180;
    const dx = Math.sin(g) * Math.cos(b), dy = -Math.sin(b);   // gravity in the phone's own frame (portrait axes), z dropped
    let a = 0;
    try { a = (screen.orientation && screen.orientation.angle) || (typeof window.orientation === 'number' ? (window.orientation + 360) % 360 : 0); } catch (x) { a = 0; }
    const h = document.documentElement, turn = (a + (h.classList.contains('rot') ? (h.classList.contains('flip') ? 270 : 90) : 0)) % 360;
    const R = { 0: [1, 0, 0, -1], 90: [0, -1, -1, 0], 180: [-1, 0, 0, 1], 270: [0, 1, 1, 0] }[turn] || [1, 0, 0, -1];   // picture right, picture down
    const along = dx * R[0] + dy * R[1], down = dx * R[2] + dy * R[3], len = Math.hypot(along, down);
    if (len < 0.15) return;   // lying flat: no useful reading
    const sn = along / len, dead = 0.05, full = 0.42;   // full lock at about 25 degrees of tilt
    this.val = clamp((Math.abs(sn) - dead) / (full - dead), 0, 1) * Math.sign(sn);
  },
  bind() { if (!this.bound) { this.bound = true; window.addEventListener('deviceorientation', (e) => this.read(e)); } },
  fresh() { return this.on && performance.now() - this.last < 600; },
};

const Input = {
  keys: new Set(), touch: { l: 0, r: 0, gas: 0, brk: 0, hb: 0, steer: 0 },
  init(onKey) {
    const block = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
    window.addEventListener('keydown', (e) => {
      if (block.has(e.code) && Game.state !== 'menu') e.preventDefault();
      if (!e.repeat) onKey(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); for (const k in this.touch) this.touch[k] = 0; });
    const bind = (id, k) => {
      const el = $(id);
      const on = (e) => { e.preventDefault(); this.touch[k] = 1; el.classList.add('on'); try { el.setPointerCapture(e.pointerId); } catch (x) { /* ok */ } SND.init(); };
      const off = () => { this.touch[k] = 0; el.classList.remove('on'); };
      el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    };
    bind('#tL', 'l'); bind('#tR', 'r'); bind('#tGas', 'gas'); bind('#tBrk', 'brk'); bind('#tHb', 'hb');
    this.initPad();
  },
  /* analog steering pad: map the pointer from the glass into the (possibly turned) frame */
  toFrame(e) {
    const h = document.documentElement, vw = window.innerWidth, vh = window.innerHeight;
    if (!h.classList.contains('rot')) return [e.clientX, e.clientY];
    return h.classList.contains('flip') ? [vh - e.clientY, e.clientX] : [e.clientY, vw - e.clientX];
  },
  initPad() {
    const pad = $('#tPad'), base = pad.querySelector('.base'), knob = pad.querySelector('.knob');
    let id = null, x0 = 0;
    const place = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault(); if (id !== null) return;
      id = e.pointerId; try { pad.setPointerCapture(id); } catch (x) { /* ok */ }
      const [fx, fy] = this.toFrame(e), top = $('#root').clientHeight - pad.clientHeight;
      x0 = fx; place(base, fx, fy - top); place(knob, fx, fy - top); pad.classList.add('on'); this.touch.steer = 0; SND.init();
    });
    pad.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const dx = this.toFrame(e)[0] - x0, v = clamp((Math.abs(dx) - 5) / 60, 0, 1) * Math.sign(dx);
      this.touch.steer = v; knob.style.left = (x0 + clamp(dx, -66, 66)) + 'px';
    });
    const up = (e) => { if (e.pointerId !== id) return; id = null; this.touch.steer = 0; pad.classList.remove('on'); };
    pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up); pad.addEventListener('lostpointercapture', up);
  },
  read() {
    const k = this.keys, t = this.touch;
    let steer = (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0) - (k.has('ArrowLeft') || k.has('KeyA') ? 1 : 0) + t.r - t.l + t.steer;
    if (!steer && Tilt.fresh()) steer = Tilt.val;
    let thr = (k.has('ArrowUp') || k.has('KeyW') ? 1 : 0) || t.gas;
    let brk = (k.has('ArrowDown') || k.has('KeyS') ? 1 : 0) || t.brk;
    let hb = k.has('Space') || !!t.hb;
    try {
      const gp = navigator.getGamepads && navigator.getGamepads()[0];
      if (gp) {
        const ax = gp.axes[0] || 0; if (Math.abs(ax) > 0.14) steer += ax;
        thr = Math.max(thr, gp.buttons[7] ? gp.buttons[7].value : 0, gp.buttons[0] && gp.buttons[0].pressed ? 1 : 0);
        brk = Math.max(brk, gp.buttons[6] ? gp.buttons[6].value : 0);
        hb = hb || !!(gp.buttons[1] && gp.buttons[1].pressed) || !!(gp.buttons[2] && gp.buttons[2].pressed);
      }
    } catch (e) { /* gamepads not allowed here */ }
    return { steer: clamp(steer, -1, 1), throttle: thr, brake: brk, handbrake: hb };
  },
};

const HUD = {
  init() {
    const pts = []; for (let a = 200; a >= -20; a -= 5) { const r = a * Math.PI / 180; pts.push([84 + 66 * Math.cos(r), 82 - 66 * Math.sin(r)]); }
    const d = 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
    for (const id of ['#hArcBg', '#hArc', '#hArcRed']) { $(id).setAttribute('d', d); $(id).setAttribute('pathLength', '100'); }
    $('#hArcRed').setAttribute('stroke-dasharray', '0 86 14 0');
    this.mm = $('#minimap').getContext('2d');
    this.lastNote = null;
  },
  setTrackMap(W) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < W.N; i++) { minX = Math.min(minX, W.X[i]); maxX = Math.max(maxX, W.X[i]); minZ = Math.min(minZ, W.Z[i]); maxZ = Math.max(maxZ, W.Z[i]); }
    const s = 230 / Math.max(maxX - minX, maxZ - minZ), ox = 150 - (minX + maxX) / 2 * s, oz = 150 - (minZ + maxZ) / 2 * s;
    this.map = { s, ox, oz, path: new Path2D() };
    for (let i = 0; i <= W.N; i += 4) { const j = i % W.N; const x = W.X[j] * s + ox, y = W.Z[j] * s + oz; i ? this.map.path.lineTo(x, y) : this.map.path.moveTo(x, y); }
    this.map.path.closePath();
    this.map.start = [W.X[0] * s + ox, W.Z[0] * s + oz];
  },
  drawMap(cars, player) {
    const c = this.mm, m = this.map; if (!m) return;
    c.clearRect(0, 0, 300, 300);
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 16; c.stroke(m.path);
    c.strokeStyle = '#d9dee6'; c.lineWidth = 8; c.stroke(m.path);
    c.fillStyle = '#ffd23a'; c.beginPath(); c.arc(m.start[0], m.start[1], 7, 0, TAU); c.fill();
    for (const car of cars) {
      if (car === player) continue;
      c.fillStyle = car.hex || '#fff'; c.strokeStyle = '#111'; c.lineWidth = 3;
      c.beginPath(); c.arc(car.pos.x * m.s + m.ox, car.pos.z * m.s + m.oz, 8, 0, TAU); c.fill(); c.stroke();
    }
    if (player) {
      c.fillStyle = '#ff5a1f'; c.strokeStyle = '#fff'; c.lineWidth = 4;
      c.beginPath(); c.arc(player.pos.x * m.s + m.ox, player.pos.z * m.s + m.oz, 11, 0, TAU); c.fill(); c.stroke();
    }
  },
  speedo(car) {
    $('#hKmh').textContent = Math.round(car.speed * 3.6);
    $('#hGear').textContent = car.gear === -1 ? 'R' : car.gear;
    const f = clamp((car.rpm - 800) / (car.spec.redline - 800), 0, 1) * 100;
    $('#hArc').setAttribute('stroke-dasharray', `${f.toFixed(1)} 100`);
    $('#hArc').setAttribute('stroke', f > 88 ? '#ff6b4f' : '#ffd23a');
  },
  noteIcon(n) {
    if (n.kind === 'jump') return '<path d="M4 38 L28 38 L28 26 Z" fill="#20242c"/><path d="M30 22 Q38 8 46 20" fill="none" stroke="#c0321f" stroke-width="4" stroke-linecap="round"/><path d="M42 16 L46 21 L40 22" fill="#c0321f"/>';
    if (n.kind === 'crest') return '<path d="M3 38 Q24 8 45 38" fill="none" stroke="#20242c" stroke-width="5" stroke-linecap="round"/><path d="M14 22 L24 12 L34 22" fill="none" stroke="#c0321f" stroke-width="3"/>';
    if (n.kind === 'water') return '<path d="M4 20 q5 -6 10 0 t10 0 t10 0 t10 0 M4 32 q5 -6 10 0 t10 0 t10 0 t10 0" fill="none" stroke="#2f6fb0" stroke-width="4" stroke-linecap="round"/>';
    const turn = [176, 135, 108, 82, 60, 40, 22][n.sev] * Math.PI / 180, dir = n.dir === 'L' ? -1 : 1;
    let x = 24 - dir * (n.sev <= 1 ? 9 : 4), y = 45, a = -Math.PI / 2; const pts = [[x, y]];
    y -= 12; pts.push([x, y]);
    const steps = 16, arcLen = n.sev === 0 ? 30 : 34;
    for (let k = 0; k < steps; k++) { a += dir * turn / steps; x += Math.cos(a) * arcLen / steps; y += Math.sin(a) * arcLen / steps; pts.push([x, y]); }
    x += Math.cos(a) * 5; y += Math.sin(a) * 5; pts.push([x, y]);
    const hx = x + Math.cos(a) * 7, hy = y + Math.sin(a) * 7, lx = x + Math.cos(a + 2.4) * 7, ly = y + Math.sin(a + 2.4) * 7, rx = x + Math.cos(a - 2.4) * 7, ry = y + Math.sin(a - 2.4) * 7;
    const col = n.sev <= 1 ? '#c0321f' : '#20242c';
    return `<path d="M${pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L')}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M${hx.toFixed(1)} ${hy.toFixed(1)} L${lx.toFixed(1)} ${ly.toFixed(1)} L${rx.toFixed(1)} ${ry.toFixed(1)} Z" fill="${col}"/>`;
  },
  showNote(n, next, dist) {
    const el = $('#hNote');
    if (!n) { el.hidden = true; this.lastNote = null; return; }
    el.hidden = false;
    if (this.lastNote !== n) {
      this.lastNote = n;
      $('#hNoteIco').innerHTML = this.noteIcon(n);
      $('#hNoteTxt').textContent = n.label;
      el.className = 'note pop' + (n.kind === 'corner' ? ' sev' + n.sev : '');
      $('#hNoteNext').textContent = n.into && next ? 'into ' + next.label : '';
    }
    $('#hNoteDist').textContent = dist > 5 ? Math.round(dist / 10) * 10 + ' m' : '';
  },
  msgT: 0,
  msg(text, cls, secs) {
    const el = $('#hMsg'); el.textContent = text; el.className = 'msg ' + (cls || '') + ' in'; el.hidden = false;
    void el.offsetWidth; this.msgT = secs || 1.6;
  },
  toastT: 0,
  toast(text, secs) { const el = $('#hToast'); el.textContent = text; el.hidden = false; this.toastT = secs || 2.4; },
  tick(dt) {
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) $('#hMsg').hidden = true; }
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) $('#hToast').hidden = true; }
  },
};

const Menu = {
  stageCache: {},
  stageSvg(T) {
    if (this.stageCache[T.id]) return this.stageCache[T.id];
    const sp = sampleClosedSpline(T.pts, 6);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < sp.N; i++) { minX = Math.min(minX, sp.X[i]); maxX = Math.max(maxX, sp.X[i]); minZ = Math.min(minZ, sp.Z[i]); maxZ = Math.max(maxZ, sp.Z[i]); }
    const k = 50 / Math.max(maxX - minX, maxZ - minZ);
    let d = ''; for (let i = 0; i < sp.N; i++) d += (i ? 'L' : 'M') + ((sp.X[i] - minX) * k + 2).toFixed(1) + ',' + ((sp.Z[i] - minZ) * k + 2).toFixed(1);
    return (this.stageCache[T.id] = { d: d + 'Z', len: sp.len });
  },
  render() {
    const st = Store.data.settings, ev = EVENT_BY_ID[st.event];
    const cupOn = Game.cup && !Game.cup.done;
    const tag = { mixed: '4 cars', onemake: '4 × same', elim: 'knockout', cup: TRACKS.length + ' stages', trial: 'ghost', drift: 'score' };
    $('#mEvents').innerHTML = EVENTS.map(e => `<button class="ev" data-e="${e.id}" aria-pressed="${e.id === st.event}">${e.name}<small>${(e.id === 'cup' && cupOn ? `stage ${Game.cup.idx + 1}/${Game.cup.order.length}` : tag[e.id] || '').toUpperCase()}</small></button>`).join('');
    $('#mEventBlurb').textContent = cupOn && st.event === 'cup' ? `Cup in progress: stage ${Game.cup.idx + 1} of ${Game.cup.order.length}. Start continues it.` : ev.desc;
    const chipCol = { gravel: '#c9a46a', tarmac: '#b9bec7', dirt: '#e09a5b', sand: '#f2c37e', snow: '#e8f0fb', ice: '#9fd6f5', water: '#6fc3ff' };
    $('#mStages').innerHTML = TRACKS.map((T, k) => {
      const m = this.stageSvg(T), surf = [...new Set([T.base, ...T.surfaces.map(x => x[2])])];
      const b = Store.best(T.id, CARS[st.car].id);
      return `<button class="card stage" data-t="${k}" aria-pressed="${k === st.track}"><svg class="map" viewBox="0 0 54 54" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="${m.d}" fill="none" stroke="#eef1f5" stroke-width="2.6" stroke-linejoin="round"/></svg>
        <span class="nm">${T.name}</span><span class="meta">${(m.len / 1000).toFixed(2)} km · ${T.laps} laps</span>
        <span class="chips">${surf.map(x => `<i class="chip" style="background:${chipCol[x] || '#ccc'}">${x.toUpperCase()}</i>`).join('')}</span>
        <span class="rec">${st.event === 'drift' ? (b.drift ? 'Best ' + fmtPts(b.drift) : 'No score yet') : b.lap ? 'Best ' + fmtTime(b.lap) : 'No time yet'}</span></button>`;
    }).join('');
    $('#mStageBlurb').textContent = TRACKS[st.track].blurb;
    document.querySelectorAll('#mTod button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tod === st.tod)));
    document.querySelectorAll('#mWx button').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.wx === st.weather)); if (b.dataset.wx === 'rain') b.textContent = TRACKS[st.track].theme === 'snow' ? 'Snow' : 'Rain'; });
    $('#mCars').innerHTML = CARS.map((c, k) => `<button class="card car" data-c="${k}" aria-pressed="${k === st.car}">
      <span class="swatch" style="background:#${new THREE.Color(c.color).getHexString()}"></span>
      <span class="nm">${c.name}</span><span class="meta">${{ hatch: 'Hatch', coupe: 'Coupe', sedan: 'Saloon', suv: 'SUV', buggy: 'Buggy', truck: 'Pickup' }[c.type]} · ${c.drive}</span>
      <span class="bars"><span>PWR</span><i><b style="width:${c.stats[0] * 20}%"></b></i><span>GRIP</span><i><b style="width:${c.stats[1] * 20}%"></b></i><span>WT</span><i><b style="width:${c.stats[2] * 20}%"></b></i></span></button>`).join('');
    const car = CARS[st.car];
    $('#mCarBlurb').textContent = `${car.name}: ${car.blurb}` + (ev.field === 'same' ? ` Everyone drives one.` : ev.field === 'mixed' ? ' Rivals bring other cars.' : '');
    $('#oCam b').textContent = { pocket: 'Pocket', chase: 'Chase', far: 'Far', hood: 'Bumper' }[st.cam];
    $('#oAssist b').textContent = { full: 'Full', light: 'Light', off: 'Off' }[st.assist];
    $('#oDiff b').textContent = { easy: 'Easy', pro: 'Pro', ace: 'Ace' }[st.diff] || 'Pro';
    $('#oMini b').textContent = st.mini ? 'On' : 'Off';
    $('#oVoice b').textContent = st.voice ? 'On' : 'Off';
    $('#oSound b').textContent = st.sound ? 'On' : 'Off';
    $('#oGfx b').textContent = st.gfx === 'fancy' ? 'Fancy' : 'Fast';
    $('#oScreen').hidden = !Game.touch;
    $('#oSteer').hidden = !Game.touch;
    $('#oSteer b').textContent = this.steerMsg || ({ tilt: 'Tilt', slide: 'Slide' }[st.steer] || 'Buttons');
    document.body.classList.toggle('slide', !!Game.touch && st.steer === 'slide');

    $('#oScreen b').textContent = { portrait: 'Upright', land2: 'Sideways ↺', land: 'Sideways ↻' }[st.screen] || 'Sideways ↻';
    $('#mGo').textContent = cupOn && st.event === 'cup' ? 'CONTINUE CUP' : { trial: 'START TIME TRIAL', drift: 'START DRIFTING', cup: 'START CUP' }[st.event] || 'START RACE';
    document.querySelectorAll('#mEvents .ev').forEach(b => b.onclick = () => { SND.init(); SND.click(); st.event = b.dataset.e; Store.save(); this.render(); });
    document.querySelectorAll('#mStages .card').forEach(b => b.onclick = () => { SND.init(); SND.click(); if (st.track !== +b.dataset.t) { st.track = +b.dataset.t; Store.save(); this.render(); Game.loadStage(st.track, true); } });
    document.querySelectorAll('#mCars .card').forEach(b => b.onclick = () => { SND.init(); SND.click(); st.car = +b.dataset.c; Store.save(); this.render(); Game.attract(); });
  },
  init() {
    const st = Store.data.settings;
    document.querySelectorAll('#mTod button').forEach(b => b.onclick = () => { SND.init(); SND.click(); if (st.tod !== b.dataset.tod) { st.tod = b.dataset.tod; Store.save(); this.render(); Game.loadStage(st.track, true); } });
    $('#oCam').onclick = () => { SND.click(); st.cam = { pocket: 'chase', chase: 'far', far: 'hood', hood: 'pocket' }[st.cam]; Store.save(); this.render(); };
    $('#oAssist').onclick = () => { SND.click(); st.assist = { full: 'light', light: 'off', off: 'full' }[st.assist]; Store.save(); this.render(); };
    $('#oDiff').onclick = () => { SND.click(); st.diff = { easy: 'pro', pro: 'ace', ace: 'easy' }[st.diff] || 'pro'; Store.save(); this.render(); };
    document.querySelectorAll('#mWx button').forEach(b => b.onclick = () => { SND.init(); SND.click(); if (st.weather !== b.dataset.wx) { st.weather = b.dataset.wx; Store.save(); this.render(); Game.loadStage(st.track, true); } });
    $('#oMini').onclick = () => { SND.click(); st.mini = !st.mini; Store.save(); Game.applyGfx(); this.render(); };
    $('#oVoice').onclick = () => { SND.init(); st.voice = !st.voice; SND.setVoice(st.voice); Store.save(); this.render(); if (st.voice) SND.say('left four, into right two'); };
    $('#oSound').onclick = () => { SND.init(); st.sound = !st.sound; SND.setEnabled(st.sound); Store.save(); this.render(); };
    $('#oGfx').onclick = () => { SND.click(); st.gfx = st.gfx === 'fancy' ? 'fast' : 'fancy'; Store.save(); Game.applyGfx(); this.render(); };
    $('#oSteer').onclick = async () => {
      SND.init(); SND.click();
      if (st.steer === 'tilt') { st.steer = 'buttons'; Tilt.on = false; }
      else if (st.steer !== 'slide') st.steer = 'slide';
      else if (typeof DeviceOrientationEvent === 'undefined') st.steer = 'buttons';
      else {
        this.steerMsg = 'checking…'; this.render();
        const ok = await Tilt.enable(); this.steerMsg = null;
        if (ok) { st.steer = 'tilt'; Tilt.on = true; }
        else { st.steer = 'buttons'; Tilt.on = false; this.steerMsg = 'no tilt sensor here'; setTimeout(() => { this.steerMsg = null; this.render(); }, 2500); }
      }
      Store.save(); this.render();
    };
    $('#oScreen').onclick = () => { SND.click(); st.screen = { land: 'land2', land2: 'portrait', portrait: 'land' }[st.screen] || 'land'; Store.save(); Orient.apply(); this.render(); };
    if (st.steer === 'tilt') { Tilt.on = true; Tilt.bind(); }
    $('#mGo').onclick = () => { SND.init(); if (st.steer === 'tilt' && !Tilt.fresh()) Tilt.enable(); Game.startRace(); };
    this.render();
  },
};

/* Phones held upright still get a landscape game: the whole UI turns 90 degrees. */
const Orient = {
  apply() {
    const st = Store.data.settings, root = $('#root');
    const vw = window.innerWidth, vh = window.innerHeight;
    const rot = !!Game.touch && vh > vw && st.screen !== 'portrait';
    const ew = rot ? vh : vw, eh = rot ? vw : vh;
    const h = document.documentElement;
    const land = ew >= eh * 1.05, short = eh < 600;
    const flip = rot && st.screen === 'land2';   // phone turned the other way round
    h.classList.toggle('rot', rot); h.classList.toggle('flip', flip); h.classList.toggle('land', land); h.classList.toggle('short', short); h.classList.toggle('narrow', ew < 760);
    if (rot) { root.style.width = vh + 'px'; root.style.height = vw + 'px'; root.style.transform = flip ? `translateY(${vh}px) rotate(-90deg)` : `translateX(${vw}px) rotate(90deg)`; }
    else { root.style.width = ''; root.style.height = ''; root.style.transform = ''; }
    // tall landscape frames have room for the options under the event list; short ones keep them on the right
    const left = $('.pane.left'), right = $('.pane.right'), opts = $('#mOpts'), help = $('#mHelp');
    if (left && right && opts && help) {
      const want = land && !short ? left : right;
      if (opts.parentNode !== want) { if (want === left) left.insertBefore(opts, $('#mGo')); else right.insertBefore(opts, help); }
    }
    if (Game.renderer) Game.resize();
  },
};
