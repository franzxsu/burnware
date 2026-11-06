/* ============================================================
   Tuko's moves. Stomp: one foot up, then down hard, a shockwave
   that flattens the block. Tail: a full spin with the tail out.
   Roar: windows shatter, helicopters lose their nerve, the beam
   refills a bit. Beam: hold it, and it drills where you aim.
   ============================================================ */
const Moves = {
  aimRay: new THREE.Raycaster(), ndc: new THREE.Vector2(0, 0.16), v1: new THREE.Vector3(), v2: new THREE.Vector3(), v3: new THREE.Vector3(), boomT: 0,
  start(type) {
    const K = Kaiju; if (K.act || K.cool[type] > 0) return;
    const dur = { stomp: 0.8, tail: 0.85, roar: 1.7 }[type];
    K.act = { type, t: 0, dur, foot: Math.sin(K.phase) > 0 ? 'R' : 'L', done: false };
    K.cool[type] = { stomp: 1.0, tail: 1.3, roar: 7 }[type];
    if (type === 'tail') Audio2.swoosh();
    if (type === 'roar') setTimeout(() => Audio2.roar(), 280);
  },
  update(dt, input) {
    const K = Kaiju, P = K.parts;
    for (const k in K.cool) K.cool[k] = Math.max(0, K.cool[k] - dt);
    if (input) {
      if (Input.take('stomp')) this.start('stomp');
      if (Input.take('tail')) this.start('tail');
      if (Input.take('roar')) this.start('roar');
    }
    const a = K.act;
    if (a) {
      a.t += dt; const k = a.t / a.dur;
      if (a.type === 'stomp') this.stomp(a, k);
      else if (a.type === 'tail') this.tail(a, k, dt);
      else if (a.type === 'roar') this.roar(a, k);
      if (a.t >= a.dur) { K.act = null; K.spin = 0; }
    }
    this.beam(dt, input && Input.beam && !(a && a.type === 'tail'));
  },
  stomp(a, k) {
    const P = Kaiju.parts, L = a.foot === 'L' ? P.legL : P.legR, other = a.foot === 'L' ? P.legR : P.legL;
    const up = k < 0.45 ? Math.sin(k / 0.45 * Math.PI / 2) : k < 0.55 ? 1 - (k - 0.45) / 0.1 : 0;
    L.hip.rotation.x = -1.0 * up; L.knee.rotation.x = 1.3 * up; L.ankle.rotation.x = -(L.hip.rotation.x + L.knee.rotation.x) * 0.8;
    other.hip.rotation.x = 0.12 * up; other.knee.rotation.x = 0.25 * up;
    P.hips.position.y += up * 0.8 - (k > 0.55 && k < 0.75 ? 0.6 : 0); P.torso.rotation.x += up * 0.12;
    P.armL.sh.rotation.x -= up * 0.4; P.armR.sh.rotation.x -= up * 0.4;
    if (!a.done && k >= 0.55) {
      a.done = true; Kaiju.root.updateMatrixWorld(true);
      const p = Kaiju.wp(a.foot === 'L' ? 'footL' : 'footR', this.v1);
      Audio2.step(true); Audio2.boom(false); Fx.shake(0.65); Fx.ring(p.x, 0.2, p.z, 15, 0.7); Fx.ring(p.x, 0.2, p.z, 9, 0.45, 0xffe0a0);
      for (let i = 0; i < 20; i++) { const ang = i / 20 * 6.283; Fx.dust(p.x + Math.cos(ang) * 3, 0.8, p.z + Math.sin(ang) * 3, Math.cos(ang) * 10, 1.2, Math.sin(ang) * 10, 3, 2.2); }
      if (waterAt(p.x, p.z)) Fx.splash(p.x, 0.3, p.z, 3);
      Damage.blast(p.x, 1.6, p.z, 6.2, { power: 15, chance: 0.55, up: 9 });
      Damage.blast(p.x, 0.5, p.z, 9, { power: 6, chance: 0.15, up: 5, dust: false });   // the shockwave knocks the edges loose too
      Units.blastAt(p.x, 1, p.z, 17, 'stomp');
      Game.move('stomp');
    }
  },
  tail(a, k, dt) {
    const K = Kaiju, P = K.parts, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    K.spin = e * Math.PI * 2;
    P.tail.forEach((seg, i) => { seg.rotation.x = i === 0 ? -0.18 : 0.02; seg.rotation.y = -Math.sin(k * Math.PI) * 0.1 * (i + 1) * 0.3; });
    P.torso.rotation.x += 0.1; P.hips.position.y -= 0.4 * Math.sin(k * Math.PI);
    if (k > 0.1 && k < 0.85) {
      K.root.position.copy(K.pos); K.root.rotation.y = K.heading + K.spin; K.root.updateMatrixWorld(true);
      for (let i = 2; i < 8; i++) {
        const p = K.wp('tail' + i, this.v1), dx = p.x - K.pos.x, dz = p.z - K.pos.z, r = Math.hypot(dx, dz) || 1, tx = dz / r, tz = -dx / r, sp = 14 + r * 0.5;   // the way the tail is swinging
        Damage.blast(p.x, Math.max(1.5, p.y), p.z, 2.4 + (i < 5 ? 0.5 : 0), { power: 6, chance: 0.5, up: 4, vx: tx * sp, vz: tz * sp, dust: i % 2 === 0 });
        Units.sweep(p.x, p.y, p.z, 3.2, tx, tz);
      }
    }
    if (!a.done && k > 0.5) { a.done = true; Game.move('tail'); }
  },
  roar(a, k) {
    const K = Kaiju, P = K.parts, up = Math.sin(Math.min(1, k * 1.4) * Math.PI);
    P.neck.rotation.x -= up * 0.55; K.jawWant = up * 0.75; P.torso.rotation.x -= up * 0.15;
    P.armL.sh.rotation.z = 0.25 + up * 0.6; P.armR.sh.rotation.z = -0.25 - up * 0.6; P.armL.sh.rotation.x -= up * 0.5; P.armR.sh.rotation.x -= up * 0.5;
    if (!a.done && k > 0.22) {
      a.done = true; const p = K.wp('mouth', this.v1);
      Fx.shake(0.4); Fx.ring(K.pos.x, 0.3, K.pos.z, 40, 1.2, 0xd8f4ff); Fx.ring(K.pos.x, 0.3, K.pos.z, 26, 0.9, 0xffffff);
      Damage.shatter(p.x, p.y - 4, p.z, 17);
      Units.roar(K.pos.x, K.pos.z, 48);
      K.energy = Math.min(100, K.energy + 35);
      Game.move('roar');
    }
    if (a.t > 0.3 && a.t < 1.4) for (let i = 0; i < 2; i++) { const p = K.wp('mouth', this.v1); Fx.dustP.emit(p.x, p.y, p.z, rand(-3, 3) + Math.sin(K.heading) * 8, rand(2, 6), rand(-3, 3) + Math.cos(K.heading) * 8, 0.9, 0.96, 1, 0.25, 1.5, 0.8, 5, 0.6, 0); }
  },
  /* where the crosshair points, found by marching through the blocks */
  aim(out) {
    const cam = World.camera; this.aimRay.setFromCamera(this.ndc, cam);
    const o = this.aimRay.ray.origin, d = this.aimRay.ray.direction, start = Math.max(4, Game.camDist * 0.8);
    for (let t = start; t < 260; t += 0.7) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
      if (y <= 0.1 || Vox.solidAt(x, y, z) || Units.at(x, y, z)) return out.set(x, Math.max(0.1, y), z);
    }
    return out.set(o.x + d.x * 260, o.y + d.y * 260, o.z + d.z * 260);
  },
  beam(dt, held) {
    const K = Kaiju, P = K.parts;
    if (held && K.energy > (K.beamOn ? 0 : 8)) K.charge = Math.min(1, K.charge + dt / 0.3); else K.charge = Math.max(0, K.charge - dt * 3);
    const fire = held && K.charge >= 1 && K.energy > 0;
    const glow = Math.max(K.charge, fire ? 1 : 0); for (const pl of P.plates) pl.material.emissiveIntensity = glow * (0.9 + Math.sin(World.t * 30) * 0.15);
    if (fire && !K.beamOn) { K.beamOn = true; Audio2.beam(true); } else if (!fire && K.beamOn) { K.beamOn = false; Audio2.beam(false); Beam.hide(); K.light.intensity = 0; }
    if (!fire) return;
    K.energy = Math.max(0, K.energy - dt * 24); K.jawWant = 0.5;
    const from = K.wp('mouth', this.v1), to = this.aim(this.v2), dir = this.v3.copy(to).sub(from); const len = dir.length(); dir.divideScalar(len || 1);
    const hit = Damage.ray(from.x, from.y, from.z, dir.x, dir.y, dir.z, Math.min(240, len + 40), 1.35, 55);
    const end = this.v2.set(hit.x, hit.y, hit.z);
    if (hit.value) Game.addDamage(hit.value, hit.count, end.x, end.y, end.z, 'kaiju');
    Units.beamHit(from, dir, from.distanceTo(end), 1.8);
    Beam.show(from, end, World.t);
    K.light.position.copy(end).addScaledVector(dir, -2); K.light.intensity = 2.4 + Math.sin(World.t * 50) * 0.4;
    for (let i = 0; i < 3; i++) Fx.spark(end.x, end.y, end.z, rand(-9, 9) - dir.x * 6, rand(3, 12), rand(-9, 9) - dir.z * 6, 0.6, 0.95, 1);
    Fx.fireP.emit(end.x, end.y, end.z, 0, 1, 0, 0.5, 0.9, 1, 0.9, 3.2, 0.12, 0, 0, 0);
    if ((this.boomT -= dt) <= 0) {
      this.boomT = 0.09; Fx.fire(end.x, end.y + 0.5, end.z, rand(-2, 2), rand(2, 5), rand(-2, 2), 2.2, 0.5);
      if (hit.ground || hit.blocked) { Damage.blast(end.x, end.y, end.z, hit.ground ? 2.6 : 2.2, { power: 9, chance: 0.5, up: 7 }); Fx.shake(0.05); }
      if (hit.ground) Fx.smoke(end.x, 0.5, end.z, 2.5);
    }
  },
};
