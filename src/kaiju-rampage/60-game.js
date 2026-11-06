/* ============================================================
   The rampage itself: three minutes on the clock, damage in
   dollars (more for a hot streak), waves of police, tanks,
   helicopters and jets, the camera, and the end-of-show report.
   ============================================================ */
const VALUES = { car: 300000, police: 600000, tank: 4e6, heli: 12e6, jet: 30e6 };
const LANDMARK_BONUS = { 'Ember Tower': 500e6, 'Ember Dome': 300e6, 'bridge': 150e6, 'gantry crane': 80e6 };
const RANKS = [[1e9, 'Mild inconvenience'], [3e9, 'Local menace'], [7e9, 'City-wide emergency'], [15e9, 'National headline'], [Infinity, 'Legendary disaster']];
const rankOf = (v) => RANKS.find(r => v < r[0])[1];
const Game = {
  state: 'loading', paused: false, t: 0, left: 180, score: 0, heat: 0, mult: 1, stats: null, camDist: 46, wave: '', spawn: {}, intro: 0,
  camT: new THREE.Vector3(), camP: new THREE.Vector3(), titleA: 0, v: new THREE.Vector3(),
  reset() {
    this.t = 0; this.left = 180; this.score = 0; this.heat = 0; this.mult = 1; this.wave = ''; this.spawn = { police: 2, tank: 0, heli: 0, jet: 0 }; this.marks = {};
    this.stats = { voxels: 0, buildings: 0, car: 0, police: 0, tank: 0, heli: 0, jet: 0, saved: 0, bestMult: 1, landmarks: [], moves: { stomp: 0, tail: 0, roar: 0 } };
  },
  /* a fresh city: used for the first show and every rampage after */
  build() {
    City.generate(1998); Vox.buildAll(); Damage.reset(); Debris.clear(); Fx.clear(); Units.reset(); Kaiju.reset(); this.reset();
  },
  toTitle() {
    this.state = 'title'; HUD.show(false); HUD.screen('title'); Audio2.music(false);
    Kaiju.pos.set(0, -4.5, 86); Kaiju.heading = Math.PI;
  },
  start() {
    Audio2.init(); if (this.used) this.build(); this.used = true;
    this.reset(); this.state = 'intro'; this.intro = 0; HUD.screen(null); HUD.show(true);
    Kaiju.pos.set(0, -18, 84); Kaiju.heading = Math.PI; Input.yaw = 0; Input.pitch = 0.32; Input.dist = 46;
    Ticker.say('GIANT GECKO SPOTTED OFF THE COAST · RESIDENTS TOLD TO HEAD FOR THE SUBWAY');
    Save.data.runs++; Save.save();
  },
  update(dt) {
    this.t += dt;
    if (this.state === 'title') { Kaiju.update(dt, false); Units.update(dt); this.titleCam(dt); return; }
    if (this.state === 'intro') {
      this.intro += dt; const k = Math.min(1, this.intro / 2.2);
      Kaiju.pos.y = lerp(-18, -4.4, 1 - Math.pow(1 - k, 3)); Kaiju.update(dt, false); Kaiju.pos.y = lerp(-18, -4.4, 1 - Math.pow(1 - k, 3));
      if (Math.random() < 0.8) Fx.splash(Kaiju.pos.x + rand(-5, 5), 0.3, Kaiju.pos.z + rand(-4, 4), 1.5);
      if (this.intro > 2.0 && !this.roared) { this.roared = true; Moves.start('roar'); Kaiju.cool.roar = 2; }
      this.playCam(dt, Math.min(1, this.intro / 3));
      if (this.intro > 3.2) { this.state = 'play'; this.roared = false; HUD.toast('RAMPAGE!', 'Three minutes. Go.'); Audio2.music(true); }
      Units.update(dt); Damage.update(dt);
      return;
    }
    if (this.state !== 'play') { this.playCam(dt, 1); return; }
    this.left -= dt;
    if (this.left <= 0) { this.left = 0; this.over('time'); return; }
    Kaiju.update(dt, true); Units.update(dt); Damage.update(dt);
    this.heat *= Math.exp(-dt / 1.7);
    const m = this.heat > 1600 ? 5 : this.heat > 800 ? 4 : this.heat > 350 ? 3 : this.heat > 120 ? 2 : 1;
    if (m !== this.mult) { if (m > this.mult) HUD.combo(m); this.mult = m; this.stats.bestMult = Math.max(this.stats.bestMult, m); }
    this.waves(dt);
    this.playCam(dt, 1);
  },
  waves(dt) {
    const e = 180 - this.left, S = this.spawn, final = e > 150 ? 1.6 : 1;
    const wave = e < 30 ? 'Police' : e < 65 ? 'The army' : e < 105 ? 'Air support' : e < 150 ? 'Air force' : 'Final stand';
    if (wave !== this.wave) {
      this.wave = wave; HUD.wave(wave);
      const say = { 'The army': ['THE ARMY IS HERE', 'Tanks on the streets'], 'Air support': ['AIR SUPPORT', 'Helicopters inbound. Roar at them.'], 'Air force': ['FIGHTER JETS', 'Aim the beam up'], 'Final stand': ['FINAL STAND', 'Everything they have left'] }[wave];
      if (say) { HUD.toast(say[0], say[1]); Ticker.event(wave); }
    }
    for (const k in S) S[k] -= dt * final;
    const police = Cars.list.filter(c => c.on && c.police && !c.wreck).length;
    if (S.police <= 0 && police < 3 + Math.floor(e / 45)) { S.police = 6; const c = Cars.add({ police: true, state: 'drive', speed: 10 }); if (c && !(Cars.place(c) && Math.hypot(c.x - Kaiju.pos.x, c.z - Kaiju.pos.z) > 40)) { c.on = false; Cars.hide(c.i); } else if (c && !this.marks.police) { this.marks.police = 1; Ticker.event('police'); } }
    if (e >= 30 && S.tank <= 0 && Army.alive('tank') < Math.min(6, 2 + Math.floor((e - 30) / 30))) { S.tank = 7; Army.spawnTank(); }
    if (e >= 65 && S.heli <= 0 && Army.alive('heli') < Math.min(5, 2 + Math.floor((e - 65) / 35))) { S.heli = 10; Army.spawnHeli(); }
    if (e >= 105 && S.jet <= 0) { S.jet = e > 150 ? 6 : 9; Army.spawnJet(); }
  },
  addDamage(value, count, x, y, z, src, quiet) {
    if (this.state !== 'play' && this.state !== 'intro') return;
    const v = value * this.mult; this.score += v; this.heat += count; this.stats.voxels += count;
    for (const [mark, at] of [['b1', 1e9], ['b3', 3e9], ['b6', 6e9], ['b10', 10e9]]) if (!this.marks[mark] && this.score >= at) { this.marks[mark] = 1; Ticker.event(mark); HUD.toast(money(at), 'in damages so far'); }
  },
  collapse(B, value, n, x, y, z) {
    if (this.state !== 'play' && this.state !== 'intro') return;
    const flat = LANDMARK_BONUS[B.name] || 0, bonus = flat ? 0 : value * 0.25;   // landmark bonuses don't get the combo
    this.addDamage(value + bonus, n, x, y, z); this.score += flat; this.heat += 80; this.stats.buildings++;
    HUD.float('+' + money((value + bonus) * this.mult + flat), x, y, z, true);
    if (B.kind === 'landmark' || LANDMARK_BONUS[B.name]) { this.stats.landmarks.push(B.name); HUD.toast(B.name.toUpperCase() + ' IS DOWN', '+' + money(flat) + ' landmark bonus'); Ticker.event(B.name); }
    else if (!this.marks.first) { this.marks.first = 1; Ticker.event('first'); HUD.toast('BUILDING DOWN', '+' + money((value + bonus) * this.mult)); }
    else if (B.kind === 'tower') Ticker.event('tower');
  },
  unitDown(kind, x, y, z) {
    if (this.state !== 'play' && this.state !== 'intro') return;
    this.stats[kind]++; const v = VALUES[kind] * this.mult; this.score += v; this.heat += 25;
    if (kind !== 'car') HUD.float('+' + money(v), x, y, z);
    if (kind === 'tank' || kind === 'heli' || kind === 'jet') Ticker.event(kind + 'Down');
  },
  move(name) { if (this.stats) this.stats.moves[name]++; },
  onHurt(n) { HUD.hurt(n); },
  over(why) {
    if (this.state === 'results') return;
    this.state = 'results'; Audio2.music(false); Audio2.beam(false); Beam.hide(); Audio2.heli(0); Audio2.siren(0);
    const best = this.score > Save.data.best; if (best) { Save.data.best = this.score; Save.data.bestRank = rankOf(this.score); Save.save(); }
    setTimeout(() => HUD.results(why, best), 1400);
  },
  /* the camera rides over Tuko's right shoulder; it pulls in when a building is in the way */
  playCam(dt, blend) {
    const K = Kaiju.pos, yaw = Input.yaw, pitch = Input.pitch, cam = World.camera;
    const rx = Math.cos(yaw), rz = -Math.sin(yaw), side = 5.5;
    const tx = K.x + rx * side, ty = Math.max(8, K.y + 13.5), tz = K.z + rz * side;
    const dx = Math.sin(yaw) * Math.cos(pitch), dy = Math.sin(pitch), dz = Math.cos(yaw) * Math.cos(pitch);
    let want = Input.dist;
    for (let t = 5; t < want; t += 1) if (Vox.solidAt(tx + dx * t, ty + dy * t, tz + dz * t)) { want = Math.max(6, t - 1.5); break; }
    this.camDist = want < this.camDist ? lerp(this.camDist, want, Math.min(1, dt * 12)) : lerp(this.camDist, want, Math.min(1, dt * 2.5));
    const px = tx + dx * this.camDist, py = Math.max(1.5, ty + dy * this.camDist), pz = tz + dz * this.camDist, S = Fx.shakeV;
    this.camT.set(tx, ty, tz); this.v.set(px, py, pz);
    if (blend < 1) { this.camP.lerp(this.v, Math.min(1, dt * 2.2)); cam.position.copy(this.camP); }
    else { this.camP.copy(this.v); cam.position.set(px + S.x, py + S.y, pz + S.z); }
    cam.lookAt(tx + S.x * 0.4, ty + S.y * 0.4, tz + S.z * 0.4);
  },
  titleCam(dt) {
    this.titleA += dt * 0.045; const cam = World.camera, r = 118, a = this.titleA + 0.6;
    this.camP.set(Math.sin(a) * r, 52 + Math.sin(this.titleA * 0.7) * 8, 20 + Math.cos(a) * r); cam.position.copy(this.camP); cam.lookAt(0, 8, 18);
  },
};
