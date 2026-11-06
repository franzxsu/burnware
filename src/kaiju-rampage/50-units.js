/* ============================================================
   Down on the street: people who run for the subway (and pop out
   of sight before anything can touch them), cars that drive,
   park, flee, fly and end up as wrecks, and police cruisers that
   come right at Tuko with their sirens going.
   ============================================================ */
const People = {
  N: 360, list: [], mesh: null, m4: new THREE.Matrix4(), col: new THREE.Color(), spawnT: 0,
  init(scene) {
    const g = new THREE.BoxGeometry(0.42, 0.9, 0.42); g.translate(0, 0.45, 0);
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial(), this.N); this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.frustumCulled = false;
    for (let i = 0; i < this.N; i++) { this.list.push({ on: false, x: 0, z: 0, vx: 0, vz: 0, life: 0, ph: 0 }); this.mesh.setMatrixAt(i, this.m4.makeScale(0, 0, 0)); this.mesh.setColorAt(i, this.col.setHSL(Math.random(), 0.6, 0.55)); }
    scene.add(this.mesh);
  },
  spawn(x, z, n = 1) {
    for (let q = 0; q < n; q++) {
      const p = this.list.find(p => !p.on); if (!p) return;
      p.on = true; p.x = x + rand(-1.5, 1.5); p.z = z + rand(-1.5, 1.5); p.life = rand(4, 8); p.ph = Math.random() * 6; p.speed = rand(3.2, 4.6);
      const a = Math.atan2(p.x - Kaiju.pos.x, p.z - Kaiju.pos.z) + rand(-0.6, 0.6); p.vx = Math.sin(a); p.vz = Math.cos(a);
    }
  },
  pop(p) { p.on = false; Fx.dustP.emit(p.x, 0.6, p.z, 0, 1.5, 0, 1, 1, 1, 0.6, 0.6, 0.35, 2, 0.5, 0); Game.stats.saved++; },
  update(dt) {
    const K = Kaiju.pos;
    this.spawnT -= dt;
    if (Game.state === 'play' && this.spawnT <= 0) {   // crowds keep coming out of the buildings near the action
      this.spawnT = 0.35;
      for (let tries = 0; tries < 4; tries++) {
        const a = Math.random() * 6.283, r = rand(14, 34), x = K.x + Math.cos(a) * r, z = K.z + Math.sin(a) * r, i = gi(x), k = gk(z);
        if (i < 0 || k < 0 || i >= GW || k >= GD || !isStreetCell(i, k) || inRiverX(x) || Vox.get(i, 0, k)) continue;
        this.spawn(x, z, 2 + Math.floor(Math.random() * 3)); break;
      }
    }
    for (let n = 0; n < this.N; n++) {
      const p = this.list[n]; if (!p.on) continue;
      p.life -= dt; p.ph += dt * 14;
      const dk = Math.hypot(p.x - K.x, p.z - K.z);
      if (p.life <= 0 || dk < 6.5) { this.pop(p); this.mesh.setMatrixAt(n, this.m4.makeScale(0, 0, 0)); continue; }   // into the subway they go
      let a = Math.atan2(p.vx, p.vz);
      for (let turn = 0; turn < 4; turn++) {
        const nx = p.x + Math.sin(a) * 1.2, nz = p.z + Math.cos(a) * 1.2, i = gi(nx), k = gk(nz);
        if (i >= 0 && k >= 0 && i < GW && k < GD && !Vox.get(i, 0, k) && !waterAt(nx, nz)) break;
        a += (turn % 2 ? -1 : 1) * (turn + 1) * Math.PI / 2;
      }
      const away = Math.atan2(p.x - K.x, p.z - K.z); let d = away - a; d = Math.atan2(Math.sin(d), Math.cos(d)); a += d * Math.min(1, dt * 2);
      p.vx = Math.sin(a); p.vz = Math.cos(a);
      const sp = p.speed * (dk < 20 ? 1.4 : 1); p.x = clamp(p.x + p.vx * sp * dt, -63, 63); p.z = clamp(p.z + p.vz * sp * dt, -63, 63);
      this.m4.makeRotationY(a); this.m4.setPosition(p.x, Math.abs(Math.sin(p.ph)) * 0.18, p.z); this.mesh.setMatrixAt(n, this.m4);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  },
  near(x, z, r) { for (const p of this.list) if (p.on && Math.hypot(p.x - x, p.z - z) < r) this.pop(p); },
  clear() { for (let n = 0; n < this.N; n++) { this.list[n].on = false; this.mesh.setMatrixAt(n, this.m4.makeScale(0, 0, 0)); } this.mesh.instanceMatrix.needsUpdate = true; },
};
/* lanes: east-west streets run along x, north-south along z; two lanes each */
const Lanes = {
  streets: [], init() { this.streets = []; for (let p = 0; p < GW; p += PER) this.streets.push(p); },
  laneZ(p, dir) { return OZ + p + (dir > 0 ? 3 : 1); },   // eastbound on the south side
  laneX(p, dir) { return OX + p + (dir > 0 ? 1 : 3); },   // southbound on the west side
  rand(R = Math.random) { const p = this.streets[Math.floor(R() * this.streets.length)], axis = R() < 0.5 ? 'x' : 'z', dir = R() < 0.5 ? 1 : -1; return { p, axis, dir }; },
};
const CAR_COLORS = [0xd8412f, 0x2f6fb4, 0xf2f2f2, 0x2a2a30, 0xe8b52e, 0x3d9a5a, 0xa8a8b0, 0x8a2a5a, 0xf08a3a];
const Cars = {
  N: 90, list: [], body: null, cab: null, bar: null, m4: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3(), s: new THREE.Vector3(), col: new THREE.Color(),
  init(scene) {
    const bg = new THREE.BoxGeometry(1.8, 0.75, 3.6); bg.translate(0, 0.55, 0); const cg = new THREE.BoxGeometry(1.6, 0.65, 1.8); cg.translate(0, 1.22, -0.2); const lg = new THREE.BoxGeometry(1.2, 0.22, 0.45); lg.translate(0, 1.64, -0.2);
    this.body = new THREE.InstancedMesh(bg, new THREE.MeshLambertMaterial(), this.N); this.cab = new THREE.InstancedMesh(cg, new THREE.MeshLambertMaterial(), this.N); this.bar = new THREE.InstancedMesh(lg, new THREE.MeshBasicMaterial(), this.N);
    for (const m of [this.body, this.cab, this.bar]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = true; m.frustumCulled = false; scene.add(m); }
    for (let i = 0; i < this.N; i++) { this.list.push({ on: false }); this.hide(i); this.bar.setColorAt(i, this.col.set(0)); this.body.setColorAt(i, this.col.set(0xffffff)); this.cab.setColorAt(i, this.col.set(0x223)); }
  },
  hide(i) { this.m4.makeScale(0, 0, 0); this.body.setMatrixAt(i, this.m4); this.cab.setMatrixAt(i, this.m4); this.bar.setMatrixAt(i, this.m4); },
  add(o) {
    const i = this.list.findIndex(c => !c.on); if (i < 0) return null;
    const c = Object.assign(this.list[i], { on: true, i, y: 0, vy: 0, vx: 0, vz: 0, rx: 0, rz: 0, spin: 0, state: 'drive', speed: rand(5, 8), police: false, shootT: rand(1, 2), smokeT: 0, wreck: false, flat: 1 }, o);
    this.body.setColorAt(i, this.col.set(c.police ? 0xf4f4f4 : c.color || pick(CAR_COLORS))); this.cab.setColorAt(i, this.col.set(c.police ? 0x1b2a4a : 0x2a3448));
    this.body.instanceColor.needsUpdate = this.cab.instanceColor.needsUpdate = true;
    return c;
  },
  place(c, R = Math.random) {   // somewhere on a street that isn't the river or a wall
    for (let t = 0; t < 40; t++) {
      const L = Lanes.rand(R), along = OX + 2 + R() * (GW - 4);
      const x = L.axis === 'x' ? along : Lanes.laneX(L.p, L.dir), z = L.axis === 'x' ? Lanes.laneZ(L.p, L.dir) : OZ + 2 + R() * (GD - 4);
      if (waterAt(x, z) || inRiverX(x) || Vox.solidAt(x, 0.5, z) || Math.hypot(x - Kaiju.pos.x, z - Kaiju.pos.z) < 12) continue;
      Object.assign(c, { x, z, axis: L.axis, dir: L.dir, p: L.p, heading: L.axis === 'x' ? (L.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (L.dir > 0 ? 0 : Math.PI) }); return true;
    }
    return false;
  },
  populate(n) { const R = mulberry(77); for (let k = 0; k < n; k++) { const c = this.add({ state: R() < 0.55 ? 'park' : 'drive' }); if (c && !this.place(c, R)) { c.on = false; this.hide(c.i); } } },
  reverse(c) {
    c.dir = -c.dir; c.heading += Math.PI;
    if (c.axis === 'x') c.z = Lanes.laneZ(c.p, c.dir); else c.x = Lanes.laneX(c.p, c.dir);
  },
  /* at a crossing, maybe turn onto the cross street (police always turn toward Tuko) */
  turn(c, toward) {
    const along = c.axis === 'x' ? c.x : c.z, cell = (c.axis === 'x' ? gi(along) : gk(along));
    if (cell % PER !== 2 || c.lastCross === cell) return; c.lastCross = cell;
    let go = Math.random() < 0.35, dir = Math.random() < 0.5 ? 1 : -1;
    if (toward) { const dx = Kaiju.pos.x - c.x, dz = Kaiju.pos.z - c.z; if (c.axis === 'x' ? Math.abs(dz) > Math.abs(dx) : Math.abs(dx) > Math.abs(dz)) { go = true; dir = Math.sign(c.axis === 'x' ? dz : dx) || 1; } else go = false; }
    if (!go) return;
    const p = cell - 2, crossed = c.p + 2;   // remember the street we came from, so we don't turn again at once
    if (c.axis === 'x') { c.axis = 'z'; c.p = p; c.dir = dir; c.x = Lanes.laneX(p, dir); c.heading = dir > 0 ? 0 : Math.PI; }
    else { c.axis = 'x'; c.p = p; c.dir = dir; c.z = Lanes.laneZ(p, dir); c.heading = dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    c.lastCross = crossed;
  },
  throwCar(c, vx, vy, vz) { if (c.wreck && c.state === 'fly') return; c.state = 'fly'; c.vx = vx; c.vy = vy; c.vz = vz; c.spin = rand(-6, 6); if (!c.wreck) { c.wreck = true; Game.unitDown(c.police ? 'police' : 'car', c.x, 1, c.z); } },
  wreck(c, flat) { if (!c.wreck) Game.unitDown(c.police ? 'police' : 'car', c.x, 1, c.z); c.wreck = true; c.state = 'wreck'; if (flat) c.flat = 0.35; this.body.setColorAt(c.i, this.col.set(0x3a3330)); this.cab.setColorAt(c.i, this.col.set(0x221c1a)); this.bar.setColorAt(c.i, this.col.set(0)); this.body.instanceColor.needsUpdate = this.cab.instanceColor.needsUpdate = this.bar.instanceColor.needsUpdate = true; c.smokeT = 0; },
  update(dt) {
    const K = Kaiju.pos; let sirens = 0;
    for (const c of this.list) {
      if (!c.on) continue;
      const dk = Math.hypot(c.x - K.x, c.z - K.z);
      if (c.state === 'fly') {
        c.vy -= 18 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.rx += c.spin * dt; c.rz += c.spin * 0.7 * dt;
        if (c.y <= 0) { c.y = 0; c.rx = Math.round(c.rx / Math.PI) * Math.PI; c.rz = 0; Fx.explosion(c.x, 0.8, c.z, 0.5); Audio2.boom(false); if (waterAt(c.x, c.z)) { Fx.splash(c.x, 0.3, c.z, 1.5); c.on = false; this.hide(c.i); continue; } this.wreck(c); Damage.blast(c.x, 1, c.z, 1.6, { power: 4, chance: 0.4 }); }
      } else if (c.state === 'wreck') {
        if ((c.smokeT -= dt) <= 0) { c.smokeT = rand(0.3, 0.8); Fx.smoke(c.x, 1.2, c.z, 1.4); if (Math.random() < 0.3) Fx.fire(c.x, 1, c.z, 0, 1.5, 0, 1, 0.5); }
      } else {
        if (c.police) { sirens++; this.policeAI(c, dt, dk); }
        else if (c.state === 'park') { if (dk < 26 && Math.random() < dt * 0.8) c.state = 'flee'; }
        else {
          const toward = (c.axis === 'x' ? (K.x - c.x) * c.dir : (K.z - c.z) * c.dir) > 0;
          if (dk < 40 && toward && c.state !== 'flee') { c.state = 'flee'; this.reverse(c); }
          const sp = c.state === 'flee' ? 11 : c.speed; this.drive(c, sp, dt, false);
        }
      }
      this.draw(c);
    }
    for (const m of [this.body, this.cab, this.bar]) m.instanceMatrix.needsUpdate = true;
    if (this.flashT === undefined) this.flashT = 0; this.flashT += dt;
    if (sirens) { const on = Math.floor(this.flashT * 6) % 2; for (const c of this.list) if (c.on && c.police && !c.wreck) this.bar.setColorAt(c.i, this.col.set(on ? 0xff2a2a : 0x2a6aff)); this.bar.instanceColor.needsUpdate = true; }
    Audio2.siren(Game.state === 'play' ? sirens : 0);
  },
  drive(c, sp, dt, toward) {
    const nx = c.x + (c.axis === 'x' ? c.dir * sp * dt : 0), nz = c.z + (c.axis === 'z' ? c.dir * sp * dt : 0), ax = nx + (c.axis === 'x' ? c.dir * 2.2 : 0), az = nz + (c.axis === 'z' ? c.dir * 2.2 : 0);
    if (ax < -63 || ax > 63 || az < -63 || az > 63 || inRiverX(ax) || Vox.solidAt(ax, 0.5, az) || this.blocked(c, ax, az)) { this.reverse(c); return; }
    c.x = nx; c.z = nz; this.turn(c, toward);
  },
  blocked(c, x, z) { for (const o of this.list) if (o.on && o !== c && o.state !== 'fly' && Math.abs(o.x - x) < 1.4 && Math.abs(o.z - z) < 1.4) return true; return false; },
  policeAI(c, dt, dk) {
    if (dk > 26) { this.drive(c, 10, dt, true); return; }
    c.state = 'shoot'; c.heading = Math.atan2(Kaiju.pos.x - c.x, Kaiju.pos.z - c.z);   // out of the car, firing (it doesn't help)
    if ((c.shootT -= dt) <= 0) {
      c.shootT = rand(0.18, 0.4); Audio2.pew();
      const ty = 4 + Math.random() * 12, d = Math.hypot(Kaiju.pos.x - c.x, ty - 1.4, Kaiju.pos.z - c.z), s = 70 / d;
      Fx.spark(c.x, 1.4, c.z, (Kaiju.pos.x - c.x) * s, (ty - 1.4) * s, (Kaiju.pos.z - c.z) * s, 1, 0.95, 0.6);
      Kaiju.hurt(0.05);
    }
  },
  draw(c) {
    const i = c.i, m4 = this.m4; this.e.set(c.rx, c.heading, c.rz); this.q.setFromEuler(this.e); this.v.set(c.x, c.y, c.z); this.s.set(1, c.flat, 1);
    m4.compose(this.v, this.q, this.s); this.body.setMatrixAt(i, m4); this.cab.setMatrixAt(i, m4);
    if (c.police && !c.wreck) this.bar.setMatrixAt(i, m4); else { m4.makeScale(0, 0, 0); this.bar.setMatrixAt(i, m4); }
  },
  clear() { for (const c of this.list) { c.on = false; this.hide(c.i === undefined ? this.list.indexOf(c) : c.i); } },
};
/* everything that can be hit, in one place */
const Units = {
  init(scene) { People.init(scene); Cars.init(scene); Army.init(scene); Lanes.init(); },
  reset() { People.clear(); Cars.clear(); Army.clear(); Cars.populate(56); },
  update(dt) { People.update(dt); Cars.update(dt); Army.update(dt); },
  panic(x, z) { const i = gi(x), k = gk(z); if (i >= 0 && k >= 0 && i < GW && k < GD && !Vox.get(i, 0, k)) People.spawn(x, z, 2); },
  crush(x, z, r) {
    People.near(x, z, r + 3);
    for (const c of Cars.list) if (c.on && c.state !== 'fly' && Math.hypot(c.x - x, c.z - z) < r + 1) { Cars.wreck(c, true); Audio2.crumble(8); Fx.explosion(c.x, 0.6, c.z, 0.4); }
    Army.crush(x, z, r);
  },
  blastAt(x, y, z, r, src) {
    People.near(x, z, r + 2);
    for (const c of Cars.list) {
      if (!c.on || c.state === 'fly') continue; const dx = c.x - x, dz = c.z - z, d = Math.hypot(dx, dz); if (d > r || y > 8) continue;
      const k = (1 - d / r), s = 10 * k + 4; Cars.throwCar(c, dx / (d || 1) * s, 6 + 12 * k, dz / (d || 1) * s);
    }
    Army.blastAt(x, y, z, r, src);
  },
  sweep(x, y, z, r, tx, tz) {
    People.near(x, z, r + 2);
    for (const c of Cars.list) if (c.on && c.state !== 'fly' && y < 6 && Math.hypot(c.x - x, c.z - z) < r) Cars.throwCar(c, tx * 22 + rand(-3, 3), rand(6, 11), tz * 22 + rand(-3, 3));
    Army.sweep(x, y, z, r, tx, tz);
  },
  roar(x, z, r) { Army.roar(x, z, r); for (const p of People.list) if (p.on) p.speed = 6; },
  beamHit(from, dir, len, r) { Army.beamHit(from, dir, len, r); for (const c of Cars.list) if (c.on && c.state !== 'fly' && segDist(c.x, 0.8, c.z, from, dir, len) < r + 1) Cars.throwCar(c, dir.x * 12, 8, dir.z * 12); },
  at(x, y, z) { return Army.at(x, y, z); },
};
function segDist(x, y, z, a, d, len) { const px = x - a.x, py = y - a.y, pz = z - a.z, t = clamp(px * d.x + py * d.y + pz * d.z, 0, len); const qx = px - d.x * t, qy = py - d.y * t, qz = pz - d.z * t; return Math.sqrt(qx * qx + qy * qy + qz * qz); }
