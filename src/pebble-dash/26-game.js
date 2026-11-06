/* ============================================================
   Game: stage loading, line-ups, physics loop, rendering
   (event rules, results and the menu backdrop live in 27-rules.js)
   ============================================================ */
const DT = 1 / 120;
const HOLD = { throttle: 0, brake: 1, steer: 0, handbrake: true };
const ASSIST = { full: 1, light: 0.5, off: 0 };
let _v1 = null, _v2 = null;   // scratch vectors, made once three.js has loaded
const Game = {
  state: 'boot', t: 0, raceT: 0, acc: 0, last: 0, cars: [], live: [], ais: [], player: null, ghost: null, cup: null, rule: 'race', solo: false,
  init() {
    Store.load();
    _v1 = new THREE.Vector3(); _v2 = new THREE.Vector3();
    this.touch =(window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
    if (this.touch) document.body.classList.add('touch');
    Orient.apply();
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    $('#game').appendChild(r.domElement);
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.5, 3200);
    this.cc = new ChaseCam(this.camera);
    this.ts = new TiltShift(r);
    const reflow = () => Orient.apply();
    window.addEventListener('resize', reflow);
    window.addEventListener('orientationchange', () => setTimeout(reflow, 150));
    document.addEventListener('visibilitychange', () => { if (document.hidden && (this.state === 'race' || this.state === 'countdown')) this.pause(true); });
    Input.init((code) => this.onKey(code));
    if (this.touch) $('#mHelp').textContent = 'Steer with the arrows on the left, gas and brake on the right. E-BRAKE swings the tail round hairpins. Follow the co-driver notes: 6 is flat out, 1 is nearly a hairpin.';
    HUD.init(); Menu.init();
    $('#bPause').onclick = (e) => { e.currentTarget.blur(); this.pause(this.state !== 'paused'); };
    $('#bCam').onclick = (e) => { e.currentTarget.blur(); this.cycleCam(); };
    $('#bReset').onclick = (e) => { e.currentTarget.blur(); if (this.player && this.state === 'race') this.resetCar(this.player, true); };
    $('#pResume').onclick = () => this.pause(false);
    $('#pRestart').onclick = () => { $('#pause').hidden = true; this.startRace(); };
    $('#pMenu').onclick = () => { $('#pause').hidden = true; this.toMenu(); };
    $('#rAgain').onclick = () => {
      $('#results').hidden = true;
      if (this.rule === 'cup' && this.cup && this.cup.done) { Store.data.settings.track = this.cup.order[0]; this.cup = null; Menu.render(); }
      this.startRace();
    };
    $('#rNext').onclick = () => { $('#results').hidden = true; this.nextStage(); };
    $('#rMenu').onclick = () => { $('#results').hidden = true; this.toMenu(); };
    $('#rReplay').onclick = () => this.startReplay();
    $('#rpExit').onclick = () => this.stopReplay();
    $('#rpSpeed').onclick = (e) => { this.rpSpeed = { 1: 2, 2: 0.5, 0.5: 1 }[this.rpSpeed] || 1; e.currentTarget.textContent = (this.rpSpeed === 0.5 ? '½' : this.rpSpeed) + '×'; e.currentTarget.blur(); };
    $('#rpCam').onclick = (e) => { this.rpCamMode = { tv: 'chase', chase: 'far', far: 'tv' }[this.rpCamMode] || 'tv'; this.rpCamT = -20; this.tvCam = null; this.cc.inited = false; e.currentTarget.blur(); };
    SND.setVoice(Store.data.settings.voice); SND.setEnabled(Store.data.settings.sound);
    this.applyGfx();
    this.loadStage(Store.data.settings.track, true);
    requestAnimationFrame((t) => { this.last = t; requestAnimationFrame((n) => this.frame(n)); });
  },
  resize() {
    const el = $('#game'), w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.viewKey = null;
    const pr = this.renderer.getPixelRatio();
    this.ts.setSize(Math.floor(w * pr), Math.floor(h * pr));
    if (this.fx) this.fx.mat.uniforms.uScale.value = h * pr * 0.85;
    if (this.precip) this.precip.mat.uniforms.uScale.value = h * pr * 0.85;
  },
  applyGfx() {
    const st = Store.data.settings, fancy = st.gfx === 'fancy';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, fancy ? (this.touch ? 1.6 : 2) : 1));
    if (this.renderer.shadowMap.enabled !== fancy) {
      this.renderer.shadowMap.enabled = fancy;
      if (this.scene) this.scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => (m.needsUpdate = true)); });
    }
    this.ts.enabled = st.mini;
    this.resize();
  },
  buzz(ms) {   // phone rumble, rate limited so scraping a wall doesn't drone
    if (!this.touch || this.t - (this.buzzT || -9) < 0.22) return;
    this.buzzT = this.t;
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* not allowed here */ }
  },
  /* ---------- stages ---------- */
  loadStage(i, attract) {
    $('#veil').hidden = false; $('#veilTxt').textContent = 'building ' + TRACKS[i].name + '…' + (document.documentElement.classList.contains('rot') ? ' · hold your phone sideways' : '');
    this.state = 'loading';
    setTimeout(() => {
      this.clearStage();
      const st = Store.data.settings, scene = this.scene = new THREE.Scene();
      this.W = new World(TRACKS[i], { gripK: WEATHER[weatherFor(TRACKS[i], st.weather)].grip || 1 });
      const q = st.gfx === 'fancy' ? 'high' : 'low';
      this.tod = st.tod; this.wx = st.weather;
      this.wm = buildWorldMeshes(this.W, scene, q, st.tod, st.weather);
      const th = this.th = this.wm.th;
      this.wet = th.wx === 'rain';
      this.precip = th.wx ? new Precip(scene, th.wx, th.night) : null;
      SND.setRain(this.wet ? 0.05 : 0);
      this.sc = buildScenery(this.W, scene, th);
      this.fx = new Particles(scene, 1800); this.sk = new Skids(scene, 3000);
      for (const m of [this.fx.mat, this.sk.mat]) { m.uniforms.fogColor.value.set(th.fog); m.uniforms.fogNear.value = th.fogNear; m.uniforms.fogFar.value = th.fogFar; }
      this.dustCol = new THREE.Color(...(SURF[this.W.T.base].dust || [0.8, 0.8, 0.8]));
      this.dustMul = th.night ? 0.32 : th.tod === 'sunset' ? 0.82 : 1;
      this.spot = null;
      if (th.night) {   // one real headlight that follows whichever car the camera is on
        const s = this.spot = new THREE.SpotLight(0xfff0d2, 2.6, 80, 0.52, 0.55, 1.1);
        scene.add(s); scene.add(s.target);
      }
      HUD.setTrackMap(this.W);
      this.resize();
      $('#veil').hidden = true;
      this.state = 'ready';
      if (attract) this.attract(); else this.startRace();
    }, 40);
  },
  clearStage() {
    SND.detach();
    if (!this.scene) return;
    this.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    this.cars = []; this.live = []; this.ais = []; this.player = null; this.ghost = null;
  },
  /* who lines up: the event decides between your car for everyone, a mixed field, or you alone */
  lineup(menu) {
    const st = Store.data.settings, spec = CARS[st.car], ev = EVENT_BY_ID[st.event] || EVENTS[0];
    const me = { spec, liv: { name: 'You', color: spec.color, accent: spec.accent, stripe: spec.stripe, number: spec.number }, player: !menu, key: 'you' };
    if (ev.field === 'solo' && !menu) return [me];
    let rivals;
    if (!menu && ev.rule === 'cup' && this.cup) rivals = this.cup.rivals.map(r => ({ spec: CAR_BY_ID[r.spec], liv: RIVALS[r.k], key: r.k, skill: RIVALS[r.k].skill }));
    else if (ev.field === 'same') rivals = RIVALS.map((l, k) => ({ spec, liv: l, key: k, skill: l.skill }));
    else {
      const others = CARS.filter(c => c !== spec).sort(() => Math.random() - 0.5);
      rivals = RIVALS.map((l, k) => ({ spec: others[k % others.length], liv: l, key: k, skill: l.skill }));
    }
    if (menu) return [me, ...rivals];
    const grid = [...rivals, me];
    // the cup grid runs in reverse championship order: the points leader starts at the back
    if (ev.rule === 'cup' && this.cup) grid.sort((a, b) => (this.cup.pts[a.key] - this.cup.pts[b.key]) || (a.player ? 1 : b.player ? -1 : 0));
    return grid;
  },
  spawn(entries) {
    for (const c of this.cars) this.scene.remove(c.mesh.root);
    if (this.ghost) { this.scene.remove(this.ghost.mesh.root); this.ghost = null; }
    const st = Store.data.settings, W = this.W, n = entries.length, night = !!(this.th && this.th.night);
    this.cars = []; this.ais = []; this.player = null;
    entries.forEach((e, k) => {
      const car = new Car(W, e.spec, { player: e.player, name: e.liv.name, number: e.liv.number, assist: e.player ? (ASSIST[st.assist] ?? 1) : 1, drift: e.player && this.rule === 'drift' });
      const i = (W.N - 10 - k * 7 + W.N) % W.N;
      car.reset(i, n === 1 ? 0 : (k % 2 ? 2.2 : -2.2));
      car.prevPos = car.pos.clone(); car.prevQuat = car.quat.clone();
      car.prog = -((W.N - car.idx) % W.N) * W.ds; car.pIdx = car.idx; car.lapsDone = -1; car.lapStart = 0; car.lapTimes = []; car.finished = false; car.uid = k;
      car.out = false; car.gone = false; car.key = e.key; car.name = e.liv.name; car.number = e.liv.number; car.liv = e.liv;
      car.hex = '#' + new THREE.Color(e.liv.color).getHexString();
      car.dirt = 0; car.dirtCol = this.dustCol;
      car.mesh = buildCarMesh(e.spec, e.liv, { night }); this.scene.add(car.mesh.root);
      this.cars.push(car);
      const dk = { easy: -0.05, pro: 0, ace: 0.035 }[st.diff] || 0;   // rivals' pace
      this.ais.push(new AIDriver(car, { skill: e.player ? 0.985 : clamp((e.skill || 0.96) + dk, 0.8, 0.995), bias: (k - 1.5) * 0.45 }));
      if (e.player) this.player = car;
    });
    this.live = this.cars.slice();
    this.focus = this.player || this.cars[0];
  },
  attract() {
    this.state = 'menu';
    $('#menu').hidden = false; $('#hud').hidden = true; $('#touch').hidden = true;
    this.spawn(this.lineup(true));
    this.ais.forEach((a, k) => { a.skill = 0.9 + k * 0.025; });
    this.attractT = 0; this.tvCam = null; this.cc.inited = false; this.cc.setMode('far');
    this.sc.props.reset(); this.sk.clear(); this.fx.clear();
  },
  toMenu() { SND.detach(); if (window.speechSynthesis) speechSynthesis.cancel(); Menu.render(); this.attract(); },
  nextStage() {
    const st = Store.data.settings;
    if (this.rule === 'cup' && this.cup && !this.cup.done) st.track = this.cup.order[this.cup.idx];
    else st.track = (st.track + 1) % TRACKS.length;
    Store.save(); Menu.render(); this.loadStage(st.track, false);
  },
  startRace() {
    if (this.state === 'loading' || !this.W) return;
    const st = Store.data.settings, ev = EVENT_BY_ID[st.event] || EVENTS[0];
    if (ev.rule === 'cup') {
      if (!this.cup || this.cup.done) this.newCup(st.track);
      if (st.track !== this.cup.order[this.cup.idx]) { st.track = this.cup.order[this.cup.idx]; Store.save(); }
    }
    if (TRACKS[st.track] !== this.W.T || this.tod !== st.tod || this.wx !== st.weather) { this.loadStage(st.track, false); return; }
    this.ev = ev; this.rule = ev.rule; this.solo = ev.field === 'solo';
    $('#menu').hidden = true; $('#results').hidden = true; $('#pause').hidden = true;
    $('#hud').hidden = false; $('#touch').hidden = !this.touch;
    this.camera.clearViewOffset(); this.viewKey = null;
    this.spawn(this.lineup(false));
    this.laps = this.rule === 'elim' ? Math.max(3, this.cars.length - 1) : this.W.T.laps;
    this.raceT = 0; this.countdown = 3.2; this.state = 'countdown'; this.lastBeep = 4; this.acc = 0;
    this.cc.setMode(st.cam); this.cc.inited = false;
    this.sc.props.reset(); this.sk.clear(); this.fx.clear();
    this.noteI = 0; this.noteCalled = -1; this.wrongT = 0; this.hudT = 0; this.resultsT = 0; this.frameImpact = 0;
    this.elimDone = 0; this.cupAwarded = false; this.perf = { t: 0, n: 0, skip: 2.5 };
    HUD.showNote(null); $('#hMsg').hidden = true; $('#hToast').hidden = true; $('#hDrift').hidden = true;
    const tid = this.W.T.id, cid = CARS[st.car].id, b = Store.best(tid, cid);
    $('#hTimeK').textContent = this.rule === 'drift' ? 'SCORE' : 'TIME';
    $('#hBestK').textContent = this.rule === 'drift' ? 'BEST' : 'BEST LAP';
    $('#hBest').textContent = this.rule === 'drift' ? (b.drift ? fmtPts(b.drift) : '—') : fmtTime(b.lap);
    $('#hLights').hidden = false; $('#hLights').className = 'lights'; $('#hLights').querySelectorAll('i').forEach(i => i.className = '');
    SND.init(); SND.setEnabled(st.sound); SND.setVoice(st.voice); SND.attach(this.cars);
    this.drift = this.rule === 'drift' ? { total: 0, cur: 0, chainT: 0, idle: 0, mult: 1, best: 0, showT: 0, shown: '', reset: false } : null;
    // ghost car for time trials
    this.rec = null; this.ghostData = null;
    if (this.rule === 'trial') {
      const g = Store.data.ghosts[tid + '_' + cid];
      if (g && g.f && g.f.length > 18) {
        this.ghostData = g;
        const mesh = buildCarMesh(CARS[st.car], CARS[st.car], { ghost: true }); mesh.root.visible = false; this.scene.add(mesh.root);
        this.ghost = { mesh, pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
      }
    }
    $('#hDeltaRow').hidden = !this.ghostData; $('#hDelta').textContent = '+0.00'; $('#hDelta').className = 'v';
    this.positions = this.cars.slice();
    this.rp = { dt: 1 / 20, n: 0, next: 0, cars: this.cars.map(() => []) };
    this.hudUpdate(true);
  },
  /* ---------- input ---------- */
  onKey(code) {
    if (code === 'Escape' && this.state === 'replay') { this.stopReplay(); return; }
    if (code === 'Escape' || code === 'KeyP') { if (this.state === 'race' || this.state === 'countdown') this.pause(true); else if (this.state === 'paused') this.pause(false); }
    if (code === 'KeyC' && this.player) this.cycleCam();
    if (code === 'KeyR' && this.player && this.state === 'race') this.resetCar(this.player, true);
    if (code === 'KeyM') { const st = Store.data.settings; st.sound = !st.sound; SND.setEnabled(st.sound); Store.save(); Menu.render(); }
    if (code === 'Enter' && this.state === 'menu' && document.activeElement && !document.activeElement.closest('#menu .opts')) { SND.init(); this.startRace(); }
  },
  cycleCam() {
    const st = Store.data.settings; st.cam = { pocket: 'chase', chase: 'far', far: 'hood', hood: 'pocket' }[st.cam] || 'pocket';
    Store.save(); this.cc.setMode(st.cam); Menu.render(); HUD.toast('Camera: ' + { pocket: 'Pocket', chase: 'Chase', far: 'Far', hood: 'Bumper' }[st.cam], 1.2);
  },
  pause(on) {
    if (on && (this.state === 'race' || this.state === 'countdown')) { this.prevState = this.state; this.state = 'paused'; $('#pause').hidden = false; SND.setEnabled(false); if (window.speechSynthesis) speechSynthesis.cancel(); }
    else if (!on && this.state === 'paused') { this.state = this.prevState; $('#pause').hidden = true; SND.setEnabled(Store.data.settings.sound); this.last = performance.now(); }
  },
  resetCar(car, manual) {
    car.reset(car.lastGoodIdx, 0); car.resetT = 0; car.pIdx = car.idx;
    car.prevPos.copy(car.pos); car.prevQuat.copy(car.quat);
    for (let k = 0; k < 4; k++) this.sk.lift(car.uid * 4 + k);
    if (car === this.player) { HUD.toast(manual ? 'Back on the road' : 'Recovered', 1.4); if (this.drift) this.drift.reset = true; }
  },
  /* ---------- main loop ---------- */
  frame(now) {
    requestAnimationFrame((n) => this.frame(n));
    let dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000)); this.last = now;
    if (this.state === 'loading' || !this.W) return;
    this.t += dt;
    if (this.state !== 'paused') {
      if (this.state === 'countdown') this.tickCountdown(dt);
      this.acc += dt; let n = 0;
      while (this.acc >= DT && n < 8) { this.step(DT); this.acc -= DT; n++; }
      if (n === 8) this.acc = 0;
      if (this.state === 'race' || this.state === 'finished' || this.state === 'replay') this.raceLogic(dt);
      if (this.state === 'menu') this.attractCam(dt);
      if (this.state === 'replay') this.replayTick(dt);
    }
    const alpha = this.acc / DT;
    for (const c of this.live) c.mesh.sync(c, alpha);
    if (this.ghost) this.ghostTick();
    const f = this.focus || this.cars[0];
    if (this.state !== 'menu' && this.state !== 'replay' && f) this.cc.update(dt, f, this.W);
    const hood = this.state !== 'menu' && this.cc.mode === 'hood';
    for (const c of this.live) if (c.mesh.glows.length) { const vis = !(hood && c === f) && c.mesh.root.visible; if (c.mesh.glows[0].visible !== vis) c.mesh.glows.forEach(g => (g.visible = vis)); }
    this.ts.setAmount(hood ? 0.35 : 1);
    if (this.state !== 'paused') { this.fx.update(dt); this.sk.update(); this.sc.crowd.update(this.t, this.live); }
    // light, sky, clouds follow the action
    const wm = this.wm, fp = f ? f.mesh.root.position : _v1.set(0, 0, 0);
    wm.sun.position.copy(fp).addScaledVector(wm.sunDir, 130); wm.sun.target.position.copy(fp);
    wm.sky.position.copy(this.camera.position);
    wm.sunDisc.position.copy(this.camera.position).addScaledVector(wm.sunDir, 1250); wm.sunDisc.lookAt(this.camera.position);
    for (const c of wm.clouds) { c.position.x += c.userData.v * dt; if (c.position.x > this.W.maxX + 700) c.position.x = this.W.minX - 700; }
    if (this.spot && f) {
      const q = f.mesh.root.quaternion, fw = _v2.set(0, 0, 1).applyQuaternion(q);
      this.spot.position.set(fp.x + fw.x * 1.4, fp.y + 0.8, fp.z + fw.z * 1.4);
      this.spot.target.position.set(fp.x + fw.x * 24, fp.y - 1.2 + fw.y * 24, fp.z + fw.z * 24);
    }
    if (this.sc.beam) this.sc.beam.rotation.y += dt * 0.75;
    if (this.precip) this.precip.update(this.state === 'paused' ? 0 : dt, this.camera.position);
    if (this.state !== 'menu' && this.state !== 'replay' && this.player) { SND.update(this.player, this.camera); HUD.tick(dt); this.hudUpdate(false, dt); }
    if (this.state === 'race') this.perfWatch(dt);
    this.ts.render(this.scene, this.camera);
  },
  /* if the device can't keep up, step the graphics down once (then the miniature blur), and say so */
  perfWatch(dt) {
    const st = Store.data.settings, p = this.perf;
    if (!p || this.noAutoGfx || (st.gfx !== 'fancy' && !st.mini)) return;
    if (p.skip > 0) { p.skip -= dt; return; }
    p.t += dt; p.n++;
    if (p.t < 4) return;
    const slow = p.t / p.n > 1 / 27;   // below ~27 fps (a 30 fps battery-saver cap is left alone) p.t = 0; p.n = 0;
    if (!slow) return;
    if (st.gfx === 'fancy') { st.gfx = 'fast'; HUD.toast('Graphics set to Fast to keep it smooth', 3); }
    else { st.mini = false; HUD.toast('Miniature blur off to keep it smooth', 3); }
    p.skip = 2; Store.save(); this.applyGfx(); Menu.render();
  },
  tickCountdown(dt) {
    const before = this.countdown; this.countdown -= dt;
    const lights = $('#hLights').querySelectorAll('i');
    const lit = clamp(Math.floor(3.2 - this.countdown + 0.2), 0, 3);
    lights.forEach((l, k) => (l.className = k < lit ? 'on' : ''));
    if (Math.ceil(this.countdown) !== Math.ceil(before) && this.countdown > 0.2) SND.beep(false);
    if (this.countdown <= 0) {
      this.state = 'race'; this.raceT = 0; SND.beep(true);
      $('#hLights').className = 'lights green'; setTimeout(() => { $('#hLights').hidden = true; }, 900);
      HUD.msg('GO!', '', 1.0);
      if (this.player) this.player.lapStart = 0;
      this.callNotes(true);
    }
  },
  step(dt) {
    const W = this.W, cars = this.cars, live = this.live, st = this.state, P = this.player;
    for (let k = 0; k < cars.length; k++) {
      const c = cars[k]; if (c.gone) continue;
      let inp;
      if (st === 'countdown') inp = c === P ? { throttle: Input.read().throttle, brake: 0, steer: 0, handbrake: true } : HOLD;
      else if (c === P && st === 'race' && !c.finished && !c.out) inp = Input.read();
      else inp = this.ais[k].update(dt, live);
      c.prevPos.copy(c.pos); c.prevQuat.copy(c.quat);
      c.step(dt, inp);
      if (st === 'countdown') { c.vel.x = 0; c.vel.z = 0; c.angVel.y = 0; }
    }
    for (const c of live) { const h = c.collideStatic(); if (h > 2.5 && c === P) { SND.impact(h * 1.2); this.cc.bump(clamp(h / 9, 0.2, 1)); if (h > 4) this.buzz(Math.round(clamp(h * 5, 20, 70))); } }
    for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) {
      const h = Car.collidePair(live[a], live[b]);
      if (h > 2 && (live[a] === P || live[b] === P)) { SND.impact(h); this.cc.bump(clamp(h / 12, 0.15, 0.8)); if (h > 4) this.buzz(Math.round(clamp(h * 4, 20, 60))); }
    }
    this.sc.props.update(dt, live);
    for (const hit of this.sc.props.hits) if (hit.car === P || (P && hit.car.pos.distanceTo(P.pos) < 40)) SND.thump(hit.sp);
    // progress, recovery, effects
    const fxOn = (this.fxTick = (this.fxTick || 0) + 1) % 2 === 0;
    for (const c of live) {
      let d = c.idx - c.pIdx; if (d > W.N / 2) d -= W.N; if (d < -W.N / 2) d += W.N;
      c.prog += d * W.ds; c.pIdx = c.idx;
      if (st !== 'countdown' && !c.out && needsReset(c, dt)) this.resetCar(c, false);
      if (c.landing > 0.35 && c === P) { SND.land(c.landing); this.cc.bump(c.landing * 0.45); if (c.landing > 0.55) this.buzz(30); }
      c.landing = 0;
      if (c === P) this.frameImpact = Math.max(this.frameImpact || 0, c.impact);
      if (c.impact > 3 && c === P) { this.cc.bump(clamp(c.impact / 14, 0.1, 0.7)); }
      c.impact = 0;
      if (fxOn && this.state !== 'replay') this.emitFx(c);
    }
  },
  emitFx(c) {
    const cam = this.camera.position, near = (c.pos.x - cam.x) ** 2 + (c.pos.z - cam.z) ** 2 < 160 * 160, dm = this.dustMul || 1;
    let loose = false;
    for (let k = 0; k < 4; k++) {
      const w = c.wheels[k], key = c.uid * 4 + k;
      if (!w.contact) { this.sk.lift(key); continue; }
      const S = SURF_LIST[w.surf];
      if (w.slide > 0.2 && c.speed > 2 && S.skidA > 0) this.sk.add(key, w.cp.x, w.cp.y + 0.04, w.cp.z, 0.26, S.skid, S.skidA * clamp(w.slide, 0.35, 1));
      else this.sk.lift(key);
      if (!near) continue;
      const R0 = Math.random;
      if (S.dust) {
        loose = true;
        const inten = (clamp(c.speed / 24, 0, 1) * (k >= 2 ? 0.75 : 0.35) + w.slide * 0.9) * (this.wet ? 0.3 : 1);   // wet gravel hardly dusts
        const lt = 0.22 + R0() * 0.1, dr = lerp(S.dust[0], 1, lt) * dm, dg = lerp(S.dust[1], 1, lt) * dm, db = lerp(S.dust[2], 1, lt) * dm;
        if (R0() < inten * 0.6) this.fx.emit(w.cp.x, w.cp.y + 0.25, w.cp.z, -c.vel.x * 0.16 + (R0() - 0.5) * 1.6, 0.7 + R0() * 1.4, -c.vel.z * 0.16 + (R0() - 0.5) * 1.6,
          1.0 + R0() * 0.8, 1.2 + R0() * 1.7, dr, dg, db, 0.5 + w.slide * 0.2, 2.6);
        if (w.slide > 0.45 && R0() < 0.5) this.fx.emit(w.cp.x, w.cp.y + 0.1, w.cp.z, -c.vel.x * 0.35 + (R0() - 0.5) * 3, 2 + R0() * 2.5, -c.vel.z * 0.35 + (R0() - 0.5) * 3,
          0.16, 0.55, S.dust[0] * 0.7 * dm, S.dust[1] * 0.7 * dm, S.dust[2] * 0.7 * dm, 0.95, 0, 0.4, -9.8);
      }
      if (this.wet && k >= 2 && c.speed > 7 && !w.inWater && R0() < clamp(c.speed / 30, 0, 1) * 0.75)   // spray off a wet road
        this.fx.emit(w.cp.x, w.cp.y + 0.15, w.cp.z, -c.vel.x * 0.12 + (R0() - 0.5) * 1.2, 0.5 + R0() * 0.8, -c.vel.z * 0.12 + (R0() - 0.5) * 1.2,
          0.45 + R0() * 0.4, 0.5, 0.8 * dm, 0.82 * dm, 0.86 * dm, 0.3, 2.4, 2.5, -2);
      if (w.inWater && c.speed > 3) for (let j = 0; j < 3; j++) this.fx.emit(w.cp.x, w.cp.y + 0.3, w.cp.z, -c.vel.x * 0.25 + (R0() - 0.5) * 4, 2 + R0() * 3.5, -c.vel.z * 0.25 + (R0() - 0.5) * 4,
        0.35 + R0() * 0.3, 0.8, 0.85 * dm, 0.93 * dm, 1.0 * dm, 0.8, 1.6, 0.5, -9.8);
    }
    if (loose && c.speed > 6) c.dirt = Math.min(0.6, c.dirt + 0.00035 * c.speed / 10);
  },
};
