/* ============================================================
   Tuko, 40 metres of gecko: a blocky rig (hips, legs, arms, a long
   tail, a head with a jaw and big gold eyes), a walk that shakes
   the street, a body that ploughs through walls, and the camera
   that rides over his shoulder.
   ============================================================ */
const Kaiju = {
  root: null, parts: {}, pos: new THREE.Vector3(0, 0, 80), heading: Math.PI, phase: 0, speed: 0, hp: 100, energy: 100, lastHurt: -99,
  act: null, cool: { stomp: 0, tail: 0, roar: 0 }, beamOn: false, charge: 0, intro: 0, pts: {}, tmp: new THREE.Vector3(), plowT: 0,
  init(scene) {
    const mat = (c, o = {}) => new THREE.MeshLambertMaterial(Object.assign({ color: c, flatShading: true }, o));
    const K = this.mat = { skin: mat(0x5cc256), dark: mat(0x46a34a), belly: mat(0xd8eca8), spot: mat(0xff8a3d), eye: mat(0xf4c12a, { emissive: 0x3a2800 }), pupil: new THREE.MeshBasicMaterial({ color: 0x120c08 }),
      mouth: mat(0x8a2a3a), pad: mat(0xbfe48e), plate: mat(0xa8ecff, { emissive: 0x2ab8e8, emissiveIntensity: 0 }), tongue: mat(0xff7fa8), tooth: mat(0xfff8e8) };
    const box = (w, h, d, m, x, y, z, parent) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; parent.add(b); return b; };
    const ball = (r, m, x, y, z, parent, sy = 1) => { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); b.position.set(x, y, z); b.scale.y = sy; b.castShadow = true; parent.add(b); return b; };
    const piv = (x, y, z, parent) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
    const mark = (name, x, y, z, parent) => { const g = piv(x, y, z, parent); this.pts[name] = g; return g; };
    const root = this.root = new THREE.Group(); scene.add(root);
    const P = this.parts;
    P.hips = piv(0, 8.6, 0, root);
    box(5.6, 3.6, 4.6, K.skin, 0, 0, -0.2, P.hips); mark('pelvis', 0, 0, 0, P.hips);
    P.torso = piv(0, 1.4, 0.2, P.hips); P.torso.rotation.x = 0.22;
    box(6.2, 7.2, 5, K.skin, 0, 3.8, 0, P.torso); box(4.6, 6, 0.5, K.belly, 0, 3.4, 2.55, P.torso); mark('chest', 0, 4, 0, P.torso);
    for (const [x, y, z, s] of [[1.6, 5.6, -2.55, 1], [-1.9, 3.2, -2.55, 0.8], [3.15, 4.4, -0.6, 0.9], [-3.15, 5.8, 0.4, 0.7], [0.4, 1.8, -2.55, 0.7]]) {
      const sp = box(1.3 * s, 1.3 * s, 0.22, K.spot, x, y, z, P.torso); if (Math.abs(x) > 3) sp.rotation.y = Math.PI / 2;
    }
    P.plates = [];
    for (let i = 0; i < 6; i++) { const pl = box(0.55, 1.5 - i * 0.12, 1.7 - i * 0.1, K.plate, 0, 7.4 - i * 1.25, -2.55 - (i < 2 ? 0.2 : 0), P.torso); pl.rotation.x = -0.35; P.plates.push(pl); }
    // arms
    for (const sd of [-1, 1]) {
      const sh = piv(sd * 3.5, 6.1, 0.7, P.torso); box(1.8, 4.2, 1.8, K.skin, 0, -1.9, 0, sh);
      const el = piv(0, -3.8, 0, sh); box(1.55, 3.4, 1.55, K.skin, 0, -1.5, 0.3, el);
      const hand = piv(0, -3.2, 0.5, el); box(2.1, 0.7, 1.7, K.skin, 0, -0.2, 0.4, hand);
      for (let t = 0; t < 4; t++) { const a = (t - 1.5) * 0.35, x = Math.sin(a) * 1.1, z = 1.3 + Math.cos(a) * 0.6; box(0.4, 0.35, 1, K.skin, x, -0.3, z, hand); ball(0.36, K.pad, x * 1.3, -0.3, z + 0.6, hand, 0.6); }
      sh.rotation.x = -0.35; el.rotation.x = -0.6; sh.rotation.z = sd * 0.25;
      P[sd < 0 ? 'armR' : 'armL'] = { sh, el, hand };
    }
    // head
    P.neck = piv(0, 7.4, 1.0, P.torso); P.head = piv(0, 0, 0, P.neck); P.neck.rotation.x = -0.25;
    box(5.6, 3.4, 5.8, K.skin, 0, 1.5, 1.8, P.head); box(4.6, 2.2, 2.8, K.skin, 0, 0.9, 5.4, P.head); box(4.8, 0.6, 3.6, K.dark, 0, 3.3, 1.6, P.head);
    box(0.9, 0.5, 0.6, K.dark, 1.2, 1.9, 6.6, P.head); box(0.9, 0.5, 0.6, K.dark, -1.2, 1.9, 6.6, P.head);   // nostrils
    for (const sd of [-1, 1]) {
      const eye = ball(1.25, K.eye, sd * 2.55, 2.5, 3.0, P.head);
      const pu = box(0.28, 1.6, 0.5, K.pupil, sd * 3.72, 2.5, 3.25, P.head); pu.rotation.y = sd * 0.35;
      P[sd < 0 ? 'eyeR' : 'eyeL'] = eye;
      ball(0.5, K.spot, sd * 2.2, 3.4, 0.0, P.head, 0.5);
    }
    P.jaw = piv(0, 0.3, 1.3, P.head);
    box(4.8, 1.1, 6.6, K.belly, 0, -0.45, 2.9, P.jaw); box(4.0, 0.25, 5.6, K.mouth, 0, 0.18, 3.0, P.jaw);
    for (let t = 0; t < 5; t++) for (const sd of [-1, 1]) box(0.3, 0.45, 0.3, K.tooth, sd * 1.95, 0.45, 1.2 + t * 1.05, P.jaw);
    P.tongue = box(0.9, 0.35, 3.2, K.tongue, 0, 0.45, 4.2, P.jaw); P.tongue.visible = false;
    mark('mouth', 0, 0.7, 7.0, P.head); mark('headTop', 0, 3, 2, P.head);
    // legs
    for (const sd of [-1, 1]) {
      const hip = piv(sd * 2.5, -0.8, 0, P.hips); box(2.8, 4.6, 3, K.skin, 0, -2.0, 0.2, hip); box(0.25, 1.4, 1.4, K.spot, sd * 1.43, -1.6, 0.4, hip);
      const knee = piv(0, -4.0, 0.4, hip); box(2.1, 3.8, 2.2, K.skin, 0, -1.65, -0.15, knee);
      const ankle = piv(0, -3.3, -0.3, knee); box(3.1, 0.9, 4.4, K.skin, 0, -0.05, 1.1, ankle);
      for (let t = 0; t < 4; t++) { const a = (t - 1.5) * 0.38, x = Math.sin(a) * 1.7, z = 3.3 + Math.cos(a) * 0.7; const toe = box(0.65, 0.45, 2.1, K.skin, x, -0.25, z, ankle); toe.rotation.y = a; ball(0.62, K.pad, x * 1.25, -0.3, z + 1.1, ankle, 0.55); }
      mark(sd < 0 ? 'footR' : 'footL', 0, -0.4, 1.2, ankle); mark(sd < 0 ? 'shinR' : 'shinL', 0, -1.6, 0, knee);
      P[sd < 0 ? 'legR' : 'legL'] = { hip, knee, ankle };
    }
    // tail
    P.tail = []; let parent = piv(0, -0.4, -2.4, P.hips);
    for (let i = 0; i < 8; i++) {
      const w = 4.4 - i * 0.48, hh = 3.2 - i * 0.33, seg = piv(0, 0, 0, parent);
      box(w, hh, 3.6, i % 2 ? K.skin : K.dark, 0, 0, -1.7, seg);
      if (i % 2 === 0) box(w * 0.4, 0.2, 1.2, K.spot, 0, hh / 2 + 0.05, -1.7, seg);
      mark('tail' + i, 0, 0, -3.4, seg);
      P.tail.push(seg); parent = piv(0, 0, -3.3, seg);
    }
    root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
    this.beam = Beam.init(scene);
    this.light = new THREE.PointLight(0x66e8ff, 0, 60, 2); scene.add(this.light);
  },
  reset() {
    this.pos.set(0, 0, 84); this.heading = Math.PI; this.phase = 0; this.speed = 0; this.hp = 100; this.energy = 100; this.lastHurt = -99; this.act = null; this.cool = { stomp: 0, tail: 0, roar: 0 }; this.beamOn = false; this.charge = 0; this.spin = 0;
    this.root.position.copy(this.pos); this.root.rotation.y = this.heading; Beam.hide();
  },
  wp(name, v = new THREE.Vector3()) { return this.pts[name].getWorldPosition(v); },
  hurt(n, src) {
    if (Game.state !== 'play' || n <= 0) return;
    this.hp = Math.max(0, this.hp - n); this.lastHurt = World.t; Game.onHurt(n);
    if (this.hp <= 0) Game.over('down');
  },
  hurtNear(x, y, z, r, n) { const d = Math.hypot(x - this.pos.x, z - this.pos.z); if (d < r + 4 && y < 22) this.hurt(n * (1 - d / (r + 4))); },
  /* is a point inside Tuko? (for shells and missiles) */
  hits(x, y, z, pad = 0) { const dx = x - this.pos.x, dz = z - this.pos.z; return y > this.pos.y && y < this.pos.y + 20 && dx * dx + dz * dz < (4.2 + pad) * (4.2 + pad); },
  update(dt, input) {
    const P = this.parts, t = World.t;
    // where to go: the stick is relative to the camera
    let mx = 0, mz = 0;
    if (input) { const [ix, iy] = Input.move(), fy = -Math.sin(Input.yaw), fz = -Math.cos(Input.yaw); mx = fy * iy + Math.cos(Input.yaw) * ix; mz = fz * iy - Math.sin(Input.yaw) * ix; }
    const want = Math.hypot(mx, mz), acting = this.act && this.act.type !== 'roar' ? 0.35 : this.act ? 0.15 : 1;
    let target = this.speed;
    if (want > 0.05) {
      const h = Math.atan2(mx, mz); let d = h - this.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
      if (!this.beamOn) this.heading += clamp(d, -2.4 * dt, 2.4 * dt);
      target = 7.2 * Math.min(1, want) * acting * (Math.cos(d) > 0 ? 1 : 0.45);
    } else target = 0;
    if (this.beamOn) { let d = (Input.yaw + Math.PI) - this.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); this.heading += clamp(d, -3 * dt, 3 * dt); }
    this.speed = lerp(this.speed, target * (this.plowSlow > 0 ? 0.55 : 1), Math.min(1, dt * 4));
    const vx = Math.sin(this.heading) * this.speed, vz = Math.cos(this.heading) * this.speed;
    const moveDir = want > 0.05 ? Math.atan2(mx, mz) : this.heading, strafe = this.beamOn && want > 0.05 ? 1 : 0;
    const sx = strafe ? mx / Math.max(1, want) * 5 * acting : vx, sz = strafe ? mz / Math.max(1, want) * 5 * acting : vz;
    this.pos.x = clamp(this.pos.x + sx * dt, -61, 61); this.pos.z = clamp(this.pos.z + sz * dt, -61, 92);
    const sea = this.pos.z > COAST + 3 ? Math.min(4.5, (this.pos.z - COAST - 3) * 0.22) : 0;
    this.pos.y = lerp(this.pos.y, -sea, Math.min(1, dt * 3));
    // walk cycle: legs swing, the hips bob, each footfall lands hard
    const moving = Math.hypot(sx, sz), prev = this.phase;
    this.phase += moving * dt * (Math.PI * 2 / 9);
    const ph = this.phase, s = Math.sin(ph), c = Math.cos(ph), amp = Math.min(1, moving / 5);
    for (const [L, sgn] of [[P.legL, 1], [P.legR, -1]]) {
      const sw = Math.sin(ph) * sgn, lift = Math.max(0, Math.cos(ph) * sgn);
      L.hip.rotation.x = -sw * 0.5 * amp; L.knee.rotation.x = lift * 0.9 * amp; L.ankle.rotation.x = -(L.hip.rotation.x + L.knee.rotation.x) * 0.9;
    }
    P.hips.position.y = 8.6 - Math.abs(c) * 0.45 * amp + 0.2 * amp; P.hips.rotation.z = s * 0.05 * amp; P.hips.rotation.y = s * 0.06 * amp;
    P.torso.rotation.z = -s * 0.04 * amp;
    for (const [A, sgn] of [[P.armL, 1], [P.armR, -1]]) { A.sh.rotation.x = -0.35 + Math.sin(ph) * sgn * 0.25 * amp + Math.sin(t * 1.3) * 0.04; }
    const breathe = Math.sin(t * 1.6) * 0.03;
    P.torso.rotation.x = 0.22 + breathe + amp * 0.06;
    P.tail.forEach((seg, i) => { seg.rotation.x = (i === 0 ? -0.45 : 0.06) + Math.sin(t * 1.2 - i * 0.4) * 0.015; seg.rotation.y = Math.sin(t * 1.6 - i * 0.55) * (0.05 + amp * 0.06) - s * 0.05 * amp; });
    // footfalls at the moment each foot is planted
    const stepL = Math.floor((prev - Math.PI / 2) / (Math.PI * 2)) !== Math.floor((ph - Math.PI / 2) / (Math.PI * 2));
    const stepR = Math.floor((prev - Math.PI * 1.5) / (Math.PI * 2)) !== Math.floor((ph - Math.PI * 1.5) / (Math.PI * 2));
    // the head looks where the camera looks while the beam is up; otherwise it wanders a little
    let hy = Math.sin(t * 0.5) * 0.15, hp = -0.25 + Math.sin(t * 0.7) * 0.04;
    if (this.beamOn || this.charge > 0) { let d = (Input.yaw + Math.PI) - this.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); hy = clamp(d, -0.7, 0.7); hp = clamp(Input.pitch * 0.9 - 0.45, -0.7, 0.6); }
    P.head.rotation.y = lerp(P.head.rotation.y, hy, Math.min(1, dt * 6)); P.neck.rotation.x = lerp(P.neck.rotation.x, hp, Math.min(1, dt * 6));
    P.jaw.rotation.x = lerp(P.jaw.rotation.x, this.jawWant || 0, Math.min(1, dt * 10)); this.jawWant = 0.03 + Math.max(0, Math.sin(t * 0.9)) * 0.02;
    // the odd eye-lick, because geckos have no eyelids
    const lick = (t % 11) > 10.2 && !this.beamOn; P.tongue.visible = lick; if (lick) { const k = ((t % 11) - 10.2) / 0.8; P.tongue.position.set(1.4 * Math.sin(k * Math.PI), 0.45 + Math.sin(k * Math.PI) * 1.8, 4.2 + Math.sin(k * Math.PI) * 1.5); P.tongue.rotation.x = -Math.sin(k * Math.PI) * 1.1; }
    Moves.update(dt, input);   // stomp, tail, roar and the beam pose the rig on top of all this
    this.root.position.copy(this.pos); this.root.rotation.y = this.heading + (this.spin || 0);
    this.root.updateMatrixWorld(true);
    if (input) {
      if (stepL || stepR) this.footfall(stepL ? 'footL' : 'footR', amp);
      this.plowT -= dt; this.plowSlow = Math.max(0, (this.plowSlow || 0) - dt);
      if (moving > 0.6 && this.plowT <= 0) this.plow();
    }
    if (this.hp < 100 && World.t - this.lastHurt > 5) this.hp = Math.min(100, this.hp + dt * 1.2);
    if (!this.beamOn) this.energy = Math.min(100, this.energy + dt * 7);
  },
  footfall(name, amp) {
    const p = this.wp(name, this.tmp), big = amp > 0.6;
    Audio2.step(big); Fx.shake(big ? 0.16 : 0.08);
    if (waterAt(p.x, p.z)) { Fx.splash(p.x, 0.3, p.z, 1.6); return; }
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; Fx.dust(p.x + Math.cos(a) * 2, 0.6, p.z + Math.sin(a) * 2, Math.cos(a) * 4, 0.6, Math.sin(a) * 4, 2.2, 1.4); }
    Damage.blast(p.x, 0.8, p.z, 2.6, { power: 5, chance: 0.4, up: 3, dust: false });
    Units.crush(p.x, p.z, 3.2);
  },
  /* walking into things knocks them down */
  plow() {
    this.plowT = 0.09; let n = 0;
    const fwd = [Math.sin(this.heading), Math.cos(this.heading)];
    for (const [name, r, y] of [['shinL', 1.9, null], ['shinR', 1.9, null], ['pelvis', 3.0, null], ['chest', 3.3, null], ['headTop', 2.6, null]]) {
      const p = this.wp(name, this.tmp); n += Damage.blast(p.x + fwd[0] * 0.8, y === null ? p.y : y, p.z + fwd[1] * 0.8, r, { power: 4 + this.speed * 0.6, chance: 0.4, up: 2, vx: fwd[0] * this.speed, vz: fwd[1] * this.speed, dust: true }).count;
    }
    if (n > 12) this.plowSlow = 0.25;
  },
};
/* The beam: a cyan core and glow from the mouth to whatever it is drilling into. */
const Beam = {
  init(scene) {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true); geo.rotateX(Math.PI / 2); geo.translate(0, 0, 0.5);
    this.core = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xf2feff, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.glow = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x3cc8ff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.core.frustumCulled = this.glow.frustumCulled = false; this.core.renderOrder = this.glow.renderOrder = 4;
    scene.add(this.core, this.glow); this.hide(); return this;
  },
  show(a, b, t) {
    const len = a.distanceTo(b), f = 1 + Math.sin(t * 60) * 0.08 + Math.sin(t * 23) * 0.06;
    for (const [m, r] of [[this.core, 0.45 * f], [this.glow, 1.35 * f]]) { m.visible = true; m.position.copy(a); m.lookAt(b); m.scale.set(r, r, len); }
  },
  hide() { this.core.visible = this.glow.visible = false; },
};
