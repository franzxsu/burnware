/* ============================================================
   Replay: every car is recorded twenty times a second; from the
   results screen the race plays back with trackside TV cameras.
   Stand-in meshes do the acting so the real cars stay untouched.
   ============================================================ */
const RP_STRIDE = 11;   // x y z qx qy qz qw steer speed idx visible
Object.assign(Game, {
  recordReplay() {
    const rp = this.rp; if (this.raceT < rp.next) return;
    rp.next = this.raceT + rp.dt;
    const r = (v) => Math.round(v * 1000) / 1000;
    if (!rp.t) rp.t = [];
    rp.t.push(this.raceT);
    this.cars.forEach((c, k) => { const q = c.quat; rp.cars[k].push(r(c.pos.x), r(c.pos.y), r(c.pos.z), r(q.x), r(q.y), r(q.z), r(q.w), r(c.steerAngle || 0), r(c.speed), c.idx, c.gone ? 0 : 1); });
    rp.n++;
  },
  startReplay() {
    const rp = this.rp; if (!rp || rp.n < 40 || this.state === 'replay') return;
    $('#results').hidden = true; $('#hud').hidden = true; $('#touch').hidden = true; $('#replay').hidden = false;
    this.state = 'replay';
    this.rpT = Math.max(0, rp.t[rp.n - 1] - 75);   // long races: start with the last 75 seconds
    this.rpSpeed = 1; $('#rpSpeed').textContent = '1×'; this.rpI = 0; this.rpCamMode = 'tv'; this.rpCamT = 0; this.tvCam = null;
    const night = !!(this.th && this.th.night);
    this.proxies = this.cars.map((c) => {
      const mesh = buildCarMesh(c.spec, c.liv || c.spec, { night }); this.scene.add(mesh.root);
      mesh.tailMat.emissive.setHex(night ? 0x5a0505 : 0x000000);
      return { car: c, spec: c.spec, mesh, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), az: new THREE.Vector3(0, 0, 1), vel: new THREE.Vector3(), speed: 0, vF: 0, idx: 0, steer: 0, spin: 0 };
    });
    this._rq = new THREE.Quaternion();
    for (const c of this.cars) c.mesh.root.visible = false;
    if (this.ghost) this.ghost.mesh.root.visible = false;
    this.focus = this.proxies[Math.max(0, this.cars.indexOf(this.player))]; this.fx.clear();
    SND.setEnabled(false); if (window.speechSynthesis) speechSynthesis.cancel();
    this.cc.inited = false;
    this.replayTick(0);
  },
  replayTick(dt) {
    const rp = this.rp, T = rp.t, n = rp.n;
    this.rpT += dt * this.rpSpeed;
    if (this.rpT >= T[n - 1]) { this.stopReplay(); return; }
    let i = this.rpI;
    while (i < n - 2 && T[i + 1] <= this.rpT) i++;
    while (i > 0 && T[i] > this.rpT) i--;
    this.rpI = i;
    const span = Math.max(1e-3, T[i + 1] - T[i]), u = clamp((this.rpT - T[i]) / span, 0, 1);
    this.proxies.forEach((p, k) => {
      const d = rp.cars[k], a = i * RP_STRIDE, b = a + RP_STRIDE;
      p.pos.set(lerp(d[a], d[b], u), lerp(d[a + 1], d[b + 1], u), lerp(d[a + 2], d[b + 2], u));
      p.quat.set(d[a + 3], d[a + 4], d[a + 5], d[a + 6]); this._rq.set(d[b + 3], d[b + 4], d[b + 5], d[b + 6]); p.quat.slerp(this._rq, u);
      p.steer = lerp(d[a + 7], d[b + 7], u); p.speed = lerp(d[a + 8], d[b + 8], u); p.idx = u < 0.5 ? d[a + 9] : d[b + 9];
      p.az.set(0, 0, 1).applyQuaternion(p.quat);
      p.vel.set(d[b] - d[a], d[b + 1] - d[a + 1], d[b + 2] - d[a + 2]).multiplyScalar(1 / span); p.vF = p.vel.dot(p.az);
      const m = p.mesh; m.root.visible = d[a + 10] > 0.5;
      m.root.position.copy(p.pos); m.root.quaternion.copy(p.quat);
      p.spin += p.speed / (p.spec.r || 0.31) * dt * this.rpSpeed;
      m.wheels.forEach((v, w) => { const wh = p.car.wheels[w]; v.pivot.position.set(wh.x, wh.mount.y - wh.len, wh.z); v.pivot.rotation.y = wh.front ? p.steer : 0; v.mesh.rotation.x = p.spin; });
    });
    if ((this.rpFx = (this.rpFx || 0) + 1) % 2 === 0 && dt > 0) for (const p of this.proxies) if (p.mesh.root.visible && p.speed > 4) this.replayDust(p);
    this.replayCam(dt);
    const txt = fmtTime(this.rpT); if ($('#rpTime').textContent !== txt) $('#rpTime').textContent = txt;
  },
  /* the stand-ins kick up their own dust: surface under the rear wheels, more when the car is sideways */
  replayDust(p) {
    const W = this.W, R0 = Math.random, dm = this.dustMul || 1, rr = p.spec.r || 0.31;
    const ax = this._rv || (this._rv = new THREE.Vector3()), cp = this._rc || (this._rc = new THREE.Vector3());
    const g = this._rg || (this._rg = { h: 0, surf: 0, onRoad: false, lat: 0, idx: 0, water: -1e9, u: 0 });
    ax.set(1, 0, 0).applyQuaternion(p.quat);
    const slide = clamp((Math.abs(p.vel.dot(ax)) - 1.5) / 6, 0, 1);
    for (const k of [2, 3]) {
      const wh = p.car.wheels[k];
      cp.set(wh.x, wh.mount.y - wh.len - rr, wh.z).applyQuaternion(p.quat).add(p.pos);
      W.ground(cp.x, cp.z, p.idx, g);
      if (cp.y > g.h + 0.4) continue;   // airborne
      const S = SURF_LIST[g.surf];
      if (this.wet && R0() < clamp(p.speed / 30, 0, 1) * 0.75) this.fx.emit(cp.x, g.h + 0.15, cp.z, -p.vel.x * 0.12 + (R0() - 0.5) * 1.2, 0.5 + R0() * 0.8, -p.vel.z * 0.12 + (R0() - 0.5) * 1.2, 0.45 + R0() * 0.4, 0.5, 0.8 * dm, 0.82 * dm, 0.86 * dm, 0.3, 2.4, 2.5, -2);
      if (!S.dust) continue;
      const inten = (clamp(p.speed / 24, 0, 1) * 0.75 + slide * 0.9) * (this.wet ? 0.3 : 1);
      if (R0() < inten * 0.6) {
        const lt = 0.22 + R0() * 0.1;
        this.fx.emit(cp.x, g.h + 0.25, cp.z, -p.vel.x * 0.16 + (R0() - 0.5) * 1.6, 0.7 + R0() * 1.4, -p.vel.z * 0.16 + (R0() - 0.5) * 1.6,
          1.0 + R0() * 0.8, 1.2 + R0() * 1.7, lerp(S.dust[0], 1, lt) * dm, lerp(S.dust[1], 1, lt) * dm, lerp(S.dust[2], 1, lt) * dm, 0.5 + slide * 0.2, 2.6);
      }
    }
  },
  /* broadcast style: trackside cameras that zoom to keep the car framed, with chase shots in between */
  replayCam(dt) {
    const W = this.W, f = this.focus;
    this.rpCamT += dt;
    if (this.rpCamT > 7) { this.rpCamT = 0; this.rpCamMode = this.rpCamMode === 'tv' ? (Math.random() < 0.5 ? 'chase' : 'far') : 'tv'; this.tvCam = null; this.cc.inited = false; }
    if (this.rpCamMode !== 'tv') {
      this.cc.setMode(this.rpCamMode); this.cc.update(dt, f, W); return;
    }
    const passed = this.tvCam && (f.idx - this.tvCam.i + W.N) % W.N < W.N / 2 && (f.idx - this.tvCam.i + W.N) % W.N > 25;
    if (!this.tvCam || passed) {
      const i = (f.idx + 50 + Math.floor(Math.random() * 30)) % W.N, side = Math.random() < 0.5 ? -1 : 1, lat = side * (W.W[i] + 5 + Math.random() * 6);
      const x = W.X[i] + W.RX[i] * lat, z = W.Z[i] + W.RZ[i] * lat;
      this.tvCam = { i, pos: new THREE.Vector3(x, W.heightAt(x, z) + 1.6 + Math.random() * 3, z) };
    }
    this.camera.up.set(0, 1, 0);
    this.camera.position.copy(this.tvCam.pos);
    this.camera.lookAt(f.pos.x, f.pos.y + 0.5, f.pos.z);
    const dist = this.camera.position.distanceTo(f.pos), fov = clamp(2 * Math.atan(7 / Math.max(dist, 1)) * 57.3, 12, 55);
    this.camera.fov = Math.abs(this.camera.fov - fov) > 20 ? fov : damp(this.camera.fov, fov, 5, dt);
    this.camera.updateProjectionMatrix();
  },
  stopReplay() {
    if (this.state !== 'replay') return;
    for (const p of this.proxies || []) this.scene.remove(p.mesh.root);
    this.proxies = null;
    for (const c of this.cars) c.mesh.root.visible = !c.gone;
    this.state = 'finished'; this.focus = this.player;
    this.cc.setMode(Store.data.settings.cam); this.cc.inited = false;
    $('#replay').hidden = true; $('#hud').hidden = false;
    SND.setEnabled(Store.data.settings.sound);
    this.showResults();
  },
});
