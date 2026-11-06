/* ============================================================
   Car physics: rigid body + 4 raycast wheels + tyre model + engine
   Local frame: +Z forward, +Y up, +X left.
   ============================================================ */
const _v = () => new THREE.Vector3();
const IDLE_RPM = 950;

class Car {
  constructor(world, spec, opts = {}) {
    this.world = world; this.spec = spec;
    this.player = !!opts.player; this.name = opts.name || spec.name;
    this.number = opts.number || spec.number;
    const m = spec.mass;
    this.m = m;
    const inr = spec.inertia || [1.3, 1.12, 0.5];
    this.I = new THREE.Vector3(m * inr[0], m * inr[1], m * inr[2]);   // pitch, yaw, roll
    this.r = spec.r || 0.31;
    this.Lmax = spec.Lmax || 0.36; this.restComp = spec.restComp || 0.13;
    const ride = spec.ride || 0.49;
    this.ride = ride;
    const attachY = -(ride - this.r) + this.Lmax - this.restComp;
    this.k = (m * G / 4) / this.restComp;
    const crit = 2 * Math.sqrt(this.k * m / 4);
    this.cBump = crit * 0.32; this.cReb = crit * 0.52; this.kArb = this.k * (spec.type === 'suv' || spec.type === 'truck' ? 0.75 : 0.55);
    this.drag = spec.drag || 0.42;
    this.assist = opts.assist === undefined ? 1 : opts.assist; this.driftMode = !!opts.drift;     // 1 full, 0.5 light, 0 off
    const hw = spec.tw / 2, hb = spec.wb / 2;
    const fb = spec.drive === 'FWD' ? 1 : spec.drive === 'RWD' ? 0 : spec.frontBias;
    this.wheels = [
      { x: hw, z: hb, front: true }, { x: -hw, z: hb, front: true },
      { x: hw, z: -hb, front: false }, { x: -hw, z: -hb, front: false },
    ].map(w => Object.assign(w, {
      mount: new THREE.Vector3(w.x, attachY, w.z), drive: (w.front ? fb : 1 - fb) / 2, brake: w.front ? 0.31 : 0.19,
      comp: 0, contact: false, load: 0, slide: 0, spin: 0, omega: 0, surf: 0, len: this.Lmax, onRoad: true,
      cp: new THREE.Vector3(), inWater: false, rot: 0,
    }));
    const L = spec.len / 2, X = hw + 0.12;
    const bot = -(ride - (spec.clear || 0.29)) + 0.09, top = (spec.roof || 1.3) - ride - 0.02;
    this.body = [[X, bot, L], [-X, bot, L], [X, bot, -L], [-X, bot, -L], [X, top, L * 0.55], [-X, top, L * 0.55],
                 [X, top, -L * 0.6], [-X, top, -L * 0.6], [0, bot + 0.2, L + 0.05], [0, bot + 0.2, -L - 0.05], [0, top + 0.08, 0], [0, bot - 0.02, 0]]
      .map(p => new THREE.Vector3(p[0], p[1], p[2]));
    this.circles = [spec.len * 0.27, -spec.len * 0.27];
    this.cr = hw + 0.2;
    // state
    this.pos = _v(); this.vel = _v(); this.quat = new THREE.Quaternion(); this.angVel = _v();
    this.ax = _v(); this.ay = _v(); this.az = _v();
    this.steer = 0; this.steerAngle = 0; this.gear = 1; this.rpm = IDLE_RPM; this.shiftT = 0; this.revT = 0;
    this.driveForce = 0; this.brakeForce = 0; this.boost = 0; this.pedal = 0; this.limiter = false;
    this.speed = 0; this.vF = 0; this.slipAngle = 0; this.grounded = 0; this.airT = 0; this.impact = 0; this.landing = 0;
    this.idx = 0; this.lastGoodIdx = 0; this.inWater = 0; this.spinAmt = 0; this.slideAmt = 0; this.shifted = 0; this.lift = 0;
    // scratch
    this._A = _v(); this._P = _v(); this._n = _v(); this._f = _v(); this._s = _v(); this._r = _v(); this._vc = _v();
    this._F = _v(); this._T = _v(); this._t1 = _v(); this._t2 = _v(); this._qi = new THREE.Quaternion(); this._q = new THREE.Quaternion();
    this._g = {}; this._g2 = {};
  }

  reset(i, lat) {
    const W = this.world, p = W.resetPose(i, lat || 0);
    this.idx = i; this.lastGoodIdx = i;
    const h = W.ground(p.x, p.z, i, this._g).h;
    this.pos.set(p.x, h + this.ride + 0.12, p.z);
    this.quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);
    this.vel.set(0, 0, 0); this.angVel.set(0, 0, 0);
    this.gear = 1; this.rpm = IDLE_RPM; this.steer = 0; this.shiftT = 0;
    for (const w of this.wheels) { w.comp = this.restComp; w.contact = false; w.slide = 0; }
  }

  _engine(dt, thr, brk) {
    const S = this.spec, vF = this.vF;
    if (this.gear > 0 && brk > 0.1 && thr < 0.1 && vF < 0.8) { this.revT += dt; if (this.revT > 0.22) this.gear = -1; }
    else if (this.gear > 0) this.revT = 0;
    if (this.gear === -1 && (thr > 0.1 || vF > 1.5)) { this.gear = 1; this.revT = 0; }
    let pedal = thr, brake = brk;
    if (this.gear === -1) { pedal = brk; brake = thr; }
    const ratio = this.gear === -1 ? 3.4 : S.gears[this.gear - 1], fd = S.final;
    const wheelRpm = Math.abs(vF) / this.r * ratio * fd * 60 / TAU;
    // automatic gearbox
    this.shiftT = Math.max(0, this.shiftT - dt);
    if (this.gear > 0 && this.shiftT <= 0 && this.grounded >= 2) {
      if (wheelRpm > S.redline - 250 && this.gear < S.gears.length) { this.gear++; this.shiftT = 0.16; this.shifted = 1; }
      else if (this.gear > 1) {
        const lower = Math.abs(vF) / this.r * S.gears[this.gear - 2] * fd * 60 / TAU;
        if (lower < S.redline - 1500 && (pedal > 0.5 || wheelRpm < 2400)) { this.gear--; this.shiftT = 0.12; }
      }
    }
    // rpm: wheels + clutch slip at launch + wheelspin + free revving in the air
    let target = Math.max(IDLE_RPM, wheelRpm);
    if (pedal > 0.05) {
      target = Math.max(target, 2200 + pedal * 2600 * (this.gear <= 1 ? 1 : 0.3));
      target += this.spinAmt * 2400;
      if (this.grounded < 2) target = Math.max(target, S.redline * (0.6 + 0.4 * pedal));
    }
    this.rpm = damp(this.rpm, Math.min(target, S.redline + 150), this.grounded >= 2 ? 14 : 6, dt);
    this.limiter = this.rpm >= S.redline - 20 && pedal > 0.5;
    const x = this.rpm;
    let tq = x < 5000 ? 0.6 + 0.4 * Math.sin(clamp((x - 1000) / 4000, 0, 1) * Math.PI / 2) : lerp(1, 0.82, clamp((x - 5000) / (S.redline - 5000), 0, 1));
    if (S.turbo) { this.boost = damp(this.boost, pedal * clamp((x - 2600) / 2200, 0, 1), pedal > this.boost ? 2.2 : 6, dt); tq *= 0.82 + 0.3 * this.boost; }
    let force = S.torque * tq * ratio * fd * 0.86 / this.r * pedal;
    if (this.limiter) force *= 0.2;
    if (this.shiftT > 0) force = 0;
    this.lift = this.pedal > 0.6 && pedal < 0.2 && this.rpm > 4500 ? 1 : 0;
    this.pedal = pedal;
    this.driveForce = this.gear === -1 ? -force : force;
    this.brakeForce = brake * 12500;
  }

  step(dt, inp) {
    const W = this.world, S = this.spec, q = this.quat, m = this.m;
    const ax = this.ax.set(1, 0, 0).applyQuaternion(q), ay = this.ay.set(0, 1, 0).applyQuaternion(q), az = this.az.set(0, 0, 1).applyQuaternion(q);
    const thr = inp.throttle || 0, brk = inp.brake || 0, hb = !!inp.handbrake;
    const want = clamp(inp.steer || 0, -1, 1);
    const sp0 = this.vel.length();
    this.steer = approach(this.steer, want, dt * (Math.abs(want) > Math.abs(this.steer) && Math.sign(want) === Math.sign(this.steer || want) ? lerp(5.2, 2.3, clamp(sp0 / 30, 0, 1)) : 7.5));
    const vF = this.vel.dot(az), vL = this.vel.dot(ax), speed = this.vel.length();
    this.vF = vF; this.speed = speed;
    this.slipAngle = speed > 3 && vF > 0 ? Math.atan2(vL, vF) : 0;
    this._engine(dt, thr, brk);

    const maxSteer = S.steer * lerp(1, 0.38, clamp(Math.abs(vF) / 30, 0, 1));
    let delta = -this.steer * maxSteer;
    if (speed > 4 && vF > 0) delta += clamp(this.slipAngle * 0.7 * this.assist * (this.driftMode ? 0.45 : 1), -0.42, 0.42) * (1 - 0.35 * Math.abs(this.steer));
    this.steerAngle = delta = clamp(delta, -0.75, 0.75);

    const F = this._F.set(0, -m * G, 0), T = this._T.set(0, 0, 0);
    const A = this._A, P = this._P, n = this._n, f = this._f, s = this._s, r = this._r, vc = this._vc;
    let grounded = 0, spin = 0, slide = 0, water = 0;
    const cd = Math.cos(delta), sd = Math.sin(delta);
    // pass 1: suspension lengths
    for (const w of this.wheels) {
      A.copy(w.mount).applyQuaternion(q).add(this.pos);
      w.contact = false;
      if (ay.y < 0.2) { w.len = this.Lmax; w.comp = 0; continue; }
      let g = W.ground(A.x, A.z, this.idx, this._g);
      let t = (A.y - g.h) / ay.y;
      P.copy(A).addScaledVector(ay, -t);
      g = W.ground(P.x, P.z, this.idx, this._g);
      t = (A.y - g.h) / ay.y;
      const L = t - this.r;
      w.inWater = g.water > g.h + 0.05 && P.y < g.water + 0.2;
      if (w.inWater) water++;
      if (L > this.Lmax) { w.len = this.Lmax; w.compVel = 0; w.comp = 0; continue; }
      w.contact = true; w.len = Math.max(L, 0);
      const comp = this.Lmax - L;
      w.compVel = clamp((comp - w.comp) / dt, -6, 6);
      w.comp = comp;
      w.gh = g.h; w.surf = g.surf; w.onRoad = g.onRoad;
      w.cp.set(P.x, g.h, P.z);
      const h0 = g.h;
      const hx = W.ground(P.x + 0.3, P.z, this.idx, this._g2).h, hz = W.ground(P.x, P.z + 0.3, this.idx, this._g2).h;
      w.nx = -(hx - h0) / 0.3; w.nz = -(hz - h0) / 0.3;
    }
    // anti-roll bars
    const arbF = this.wheels[0].contact && this.wheels[1].contact ? this.kArb * (this.wheels[0].comp - this.wheels[1].comp) : 0;
    const arbR = this.wheels[2].contact && this.wheels[3].contact ? this.kArb * (this.wheels[2].comp - this.wheels[3].comp) : 0;
    // pass 2: forces
    for (let wi = 0; wi < 4; wi++) {
      const w = this.wheels[wi];
      if (!w.contact) { w.load = 0; w.slide = 0; w.omega = damp(w.omega, this.pedal * (w.drive > 0 ? 60 : 0), 2, dt); continue; }
      grounded++;
      const comp = w.comp;
      let Fs = this.k * comp + (w.compVel > 0 ? this.cBump : this.cReb) * w.compVel;
      if (w.len < 0.03) Fs += 150000 * (0.03 - w.len);
      Fs += (wi === 0 ? arbF : wi === 1 ? -arbF : wi === 2 ? arbR : -arbR);
      Fs = Math.max(0, Fs);
      const Nload = Fs * Math.max(0.2, ay.y);
      w.load = Nload;
      n.set(w.nx, 1, w.nz).normalize();
      if (w.front) f.copy(az).multiplyScalar(cd).addScaledVector(ax, sd); else f.copy(az);
      f.addScaledVector(n, -f.dot(n)).normalize();
      s.crossVectors(n, f);
      r.copy(w.cp).sub(this.pos);
      vc.crossVectors(this.angVel, r).add(this.vel);
      const vLong = vc.dot(f), vLat = vc.dot(s);
      const SF = SURF_LIST[w.surf];
      const loadK = clamp(1 - 0.1 * (Nload / (m * G / 4) - 1), 0.8, 1.08);
      const mu = SF.mu * (W.gripK || 1) * S.grip * loadK * (w.front ? 1 : (S.rearGrip || 1.03) * (this.driftMode ? 0.9 : 1));
      const maxF = mu * Nload;
      // longitudinal
      let Fx = this.driveForce * w.drive;
      const bf = this.brakeForce * w.brake;
      if (bf > 0) Fx -= clamp(vLong * 3000, -bf, bf);
      Fx -= clamp(vLong * 2, -1, 1) * SF.rr * Nload;
      // lateral (slip-angle curve)
      const alpha = Math.atan2(vLat, Math.max(Math.abs(vLong), 3.2));
      const an = Math.abs(alpha) / 0.14;
      const fy = an < 1 ? an * (2 - an) : lerp(1, SF.slide, clamp((an - 1) / 4, 0, 1));
      let Fy = -Math.sign(alpha) * fy * maxF;
      let wslide = clamp(an - 1, 0, 1.5) / 1.5;
      let wspin = 0;
      if (hb && !w.front) {
        const vt = Math.hypot(vLong, vLat);
        const fk = SF.slide * maxF * 0.85;
        if (vt > 0.4) { Fx = -fk * vLong / vt; Fy = -fk * vLat / vt; wslide = 1; }
        else { Fx = -vLong * 3000; }
      } else {
        // cornering force has priority; driving/braking gets what is left of the friction circle
        const room = Math.sqrt(Math.max(0, maxF * maxF - Fy * Fy));
        const ax_ = Math.abs(Fx);
        if (ax_ > room) {
          const over = clamp((ax_ - room) / maxF, 0, 1);
          if (Math.abs(this.driveForce * w.drive) > room * 0.9) wspin = over;
          Fy *= 1 - 0.42 * over;
          const room2 = Math.sqrt(Math.max(0, maxF * maxF - Fy * Fy));
          Fx = Math.sign(Fx) * Math.min(ax_, room2 * lerp(1, SF.slide, over));
          wslide = Math.max(wslide, over);
        }
      }
      w.slide = Math.max(wslide, wspin); spin = Math.max(spin, wspin); slide = Math.max(slide, w.slide);
      w.omega = vLong / this.r + wspin * 25 * Math.sign(this.driveForce || 1);
      if (hb && !w.front) w.omega = 0;
      // apply: suspension along body up at the contact, tyre forces a little above the ground
      F.addScaledVector(ay, Fs);
      T.add(this._t1.crossVectors(r, this._t2.copy(ay).multiplyScalar(Fs)));
      this._t2.copy(f).multiplyScalar(Fx).addScaledVector(s, Fy);
      F.add(this._t2);
      r.addScaledVector(ay, 0.24);
      T.add(this._t1.crossVectors(r, this._t2));
    }
    this.grounded = grounded; this.spinAmt = spin; this.slideAmt = slide; this.inWater = water;
    // aero + water drag
    F.addScaledVector(this.vel, -this.drag * speed);
    if (water) F.addScaledVector(this.vel, -170 * water);
    // body hitting the ground (crests, rollovers)
    let bodyHit = 0;
    for (const bp of this.body) {
      P.copy(bp).applyQuaternion(q).add(this.pos);
      const gh = W.ground(P.x, P.z, this.idx, this._g2).h;
      const depth = gh - P.y;
      if (depth <= 0) continue;
      r.copy(P).sub(this.pos);
      vc.crossVectors(this.angVel, r).add(this.vel);
      let Fn = 110000 * Math.min(depth, 0.4) - 7000 * Math.min(0, vc.y);
      Fn = Math.max(0, Fn);
      this._t2.set(-vc.x, 0, -vc.z);
      const vh = this._t2.length();
      if (vh > 0.01) this._t2.multiplyScalar(Math.min(0.35 * Fn, vh * 4000) / vh);
      this._t2.y = Fn;
      F.add(this._t2); T.add(this._t1.crossVectors(r, this._t2));
      bodyHit = Math.max(bodyHit, -vc.y);
    }
    // anti-spin assist: resist yaw that would push a big slide past ~35 degrees
    this.hbT = hb ? 0.35 : Math.max(0, (this.hbT || 0) - dt);
    if (grounded >= 2 && speed > 5 && vF > 0 && this.hbT <= 0) {
      const sl = this.slipAngle, yr = this.angVel.dot(ay);
      const th = this.driftMode ? 0.45 : 0.18;   // drift trial: slides up to ~26 degrees are free, past that a firm hand stops the spin
      if (sl * yr < 0 && Math.abs(sl) > th) T.addScaledVector(ay, -yr * (Math.abs(sl) - th) * this.I.y * 7.5 * (0.25 + 0.75 * this.assist) * (this.driftMode ? 4.5 : 1));
    }
    // in the air: a little control and lots of rotational damping so landings stay sane
    if (grounded === 0) {
      this.airT += dt;
      const tq = this._t1.copy(ay).multiplyScalar(-this.steer * this.I.y * 1.2);
      T.add(tq);
      T.addScaledVector(ax, (thr - brk) * this.I.x * 0.45);
    } else {
      if (this.airT > 0.35) this.landing = Math.max(this.landing, Math.min(1, this.airT));
      this.airT = 0;
    }
    if (bodyHit > 2) this.impact = Math.max(this.impact, bodyHit * 0.5);

    // integrate
    this.vel.addScaledVector(F, dt / m);
    this.pos.addScaledVector(this.vel, dt);
    const qi = this._qi.copy(q).invert();
    const wl = this._t1.copy(this.angVel).applyQuaternion(qi);
    const tl = this._t2.copy(T).applyQuaternion(qi);
    const I = this.I;
    const Iw = { x: I.x * wl.x, y: I.y * wl.y, z: I.z * wl.z };
    const gx = wl.y * Iw.z - wl.z * Iw.y, gy = wl.z * Iw.x - wl.x * Iw.z, gz = wl.x * Iw.y - wl.y * Iw.x;
    wl.x += (tl.x - gx) / I.x * dt; wl.y += (tl.y - gy) / I.y * dt; wl.z += (tl.z - gz) / I.z * dt;
    const angDamp = grounded ? 0.35 : 1.4;
    wl.multiplyScalar(Math.exp(-angDamp * dt));
    this.angVel.copy(wl).applyQuaternion(q);
    const wv = this.angVel, dq = this._q.set(wv.x * dt * 0.5, wv.y * dt * 0.5, wv.z * dt * 0.5, 0).multiply(q);
    q.set(q.x + dq.x, q.y + dq.y, q.z + dq.z, q.w + dq.w).normalize();
    // wheel visuals
    for (const w of this.wheels) w.rot = (w.rot + w.omega * dt) % TAU;
    this._track();
  }

  _track() {
    const W = this.world;
    this.idx = W.nearestLocal(this.pos.x, this.pos.z, this.idx, 12);
    const g = W.ground(this.pos.x, this.pos.z, this.idx, this._g2);
    this.lat = g.lat; this.offRoad = g.u > 0 ? g.u : 0;
    if (g.u < 1.5) this.lastGoodIdx = this.idx;
  }

  /* static obstacles: trees, rocks, gantry posts */
  collideStatic() {
    const W = this.world; let hit = 0;
    for (const cz of this.circles) {
      const cx = this.pos.x + this.az.x * cz, czz = this.pos.z + this.az.z * cz;
      for (const k of W.obstaclesNear(cx, czz)) {
        const o = W.obstacles[k];
        if (this.pos.y - 0.45 > o.top) continue;
        let dx = cx - o.x, dz = czz - o.z; const d = Math.hypot(dx, dz) || 1e-4, pen = this.cr + o.r - d;
        if (pen <= 0) continue;
        const nx = dx / d, nz = dz / d;
        this.pos.x += nx * pen; this.pos.z += nz * pen;
        const rx = o.x + nx * o.r - this.pos.x, rz = o.z + nz * o.r - this.pos.z;
        const wy = this.angVel.y;
        const vcx = this.vel.x + wy * rz, vcz = this.vel.z - wy * rx;
        const vn = vcx * nx + vcz * nz;
        if (vn >= 0) continue;
        const rn = rz * nx - rx * nz;
        const kk = 1 / this.m + rn * rn / this.I.y;
        const j = -(1.3) * vn / kk;
        this.vel.x += nx * j / this.m; this.vel.z += nz * j / this.m;
        this.angVel.y += rn * j / this.I.y;
        const tx = -nz, tz = nx, vt = vcx * tx + vcz * tz;
        const jt = clamp(-vt / kk, -0.4 * j, 0.4 * j);
        this.vel.x += tx * jt / this.m; this.vel.z += tz * jt / this.m;
        this.angVel.y += (rz * tx - rx * tz) * jt / this.I.y;
        hit = Math.max(hit, -vn);
      }
    }
    if (hit > 1) this.impact = Math.max(this.impact, hit);
    return hit;
  }
  static collidePair(a, b) {
    if (Math.abs(a.pos.y - b.pos.y) > 1.6) return 0;
    if ((a.pos.x - b.pos.x) ** 2 + (a.pos.z - b.pos.z) ** 2 > 49) return 0;
    let hit = 0;
    for (const ca of a.circles) for (const cb of b.circles) {
      const ax = a.pos.x + a.az.x * ca, az = a.pos.z + a.az.z * ca, bx = b.pos.x + b.az.x * cb, bz = b.pos.z + b.az.z * cb;
      const dx = ax - bx, dz = az - bz, d = Math.hypot(dx, dz) || 1e-4, pen = a.cr + b.cr - d;
      if (pen <= 0) continue;
      const nx = dx / d, nz = dz / d, wa = 1 / a.m, wb = 1 / b.m, sum = wa + wb;
      a.pos.x += nx * pen * wa / sum; a.pos.z += nz * pen * wa / sum;
      b.pos.x -= nx * pen * wb / sum; b.pos.z -= nz * pen * wb / sum;
      const px = (ax + bx) / 2, pz = (az + bz) / 2;
      const rax = px - a.pos.x, raz = pz - a.pos.z, rbx = px - b.pos.x, rbz = pz - b.pos.z;
      const vax = a.vel.x + a.angVel.y * raz, vaz = a.vel.z - a.angVel.y * rax;
      const vbx = b.vel.x + b.angVel.y * rbz, vbz = b.vel.z - b.angVel.y * rbx;
      const vn = (vax - vbx) * nx + (vaz - vbz) * nz;
      if (vn >= 0) continue;
      const rna = raz * nx - rax * nz, rnb = rbz * nx - rbx * nz;
      const k = wa + wb + rna * rna / a.I.y + rnb * rnb / b.I.y;
      const j = -1.2 * vn / k;
      a.vel.x += nx * j * wa; a.vel.z += nz * j * wa; a.angVel.y += rna * j / a.I.y;
      b.vel.x -= nx * j * wb; b.vel.z -= nz * j * wb; b.angVel.y -= rnb * j / b.I.y;
      hit = Math.max(hit, -vn);
    }
    if (hit > 1.5) { a.impact = Math.max(a.impact, hit * 0.6); b.impact = Math.max(b.impact, hit * 0.6); }
    return hit;
  }
}
