/* ============================================================
   The army. Tanks roll up the streets and lob shells. Helicopters
   circle and fire missiles (a roar sends them spinning down).
   Jets scream over and drop a stick of bombs. Their misses land
   on the city, and that counts as damage too. Every crew bails
   out: tank crews run, pilots float down under a parachute.
   ============================================================ */
const Army = {
  tanks: [], helis: [], jets: [], shots: [], chutes: [], group: null, mats: null, geos: null,
  init(scene) {
    this.group = new THREE.Group(); scene.add(this.group);
    const L = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
    this.mats = { olive: L(0x5d6b3a), oliveD: L(0x3f4a28), track: L(0x2a2a26), grey: L(0x8a929c), greyD: L(0x4a525c), glass: L(0x2a3a4a), white: L(0xf4f0e8), red: L(0xd8412f), shell: new THREE.MeshBasicMaterial({ color: 0xffe08a }), missile: L(0xe8e4dc), bomb: L(0x3a3a3a) };
    this.geos = { box: new THREE.BoxGeometry(1, 1, 1), barrel: new THREE.CylinderGeometry(0.14, 0.14, 1, 6).rotateX(Math.PI / 2).translate(0, 0, 0.5), dome: new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), cone: new THREE.ConeGeometry(0.5, 1, 8).rotateX(Math.PI / 2), rod: new THREE.CylinderGeometry(0.18, 0.18, 1, 6).rotateX(Math.PI / 2) };
  },
  part(parent, geo, mat, sx, sy, sz, x, y, z) { const m = new THREE.Mesh(this.geos[geo], this.mats[mat]); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; },
  clear() {
    for (const list of [this.tanks, this.helis, this.jets, this.shots, this.chutes]) { for (const u of list) this.group.remove(u.g); list.length = 0; }
  },
  edgePoint(margin = 60) {   // somewhere just outside the city, on the land side
    const side = Math.floor(Math.random() * 3), t = rand(-50, 50);
    return side === 0 ? [t, -margin] : side === 1 ? [-margin, t] : [margin, t];
  },
  /* ---------- tanks ---------- */
  spawnTank() {
    const L = Lanes.rand(), dir = L.axis === 'x' ? (Kaiju.pos.x > 0 ? 1 : -1) : (Kaiju.pos.z > 0 ? 1 : -1);
    const g = new THREE.Group(), hull = new THREE.Group(); g.add(hull);
    this.part(hull, 'box', 'olive', 2.6, 1.0, 4.4, 0, 0.9, 0); this.part(hull, 'box', 'track', 0.7, 0.9, 4.6, 1.35, 0.45, 0); this.part(hull, 'box', 'track', 0.7, 0.9, 4.6, -1.35, 0.45, 0);
    const tur = new THREE.Group(); tur.position.set(0, 1.4, -0.2); hull.add(tur);
    this.part(tur, 'box', 'oliveD', 1.8, 0.75, 2.1, 0, 0.35, 0); const bar = this.part(tur, 'barrel', 'oliveD', 1, 1, 3.0, 0, 0.45, 0.9);
    const x = L.axis === 'x' ? (dir > 0 ? -62 : 62) : Lanes.laneX(L.p, dir), z = L.axis === 'x' ? Lanes.laneZ(L.p, dir) : (dir > 0 ? -62 : 62);
    if (z > COAST - 6) return;
    const t = { g, hull, tur, bar, x, z, axis: L.axis, dir, p: L.p, heading: 0, reload: rand(2, 3.5), stun: 0, dead: false, lastCross: -1, aim: 0, y: 0, vy: 0, flip: 0 };
    g.position.set(x, 0, z); this.group.add(g); this.tanks.push(t);
  },
  tankAI(t, dt) {
    const K = Kaiju.pos, dx = K.x - t.x, dz = K.z - t.z, d = Math.hypot(dx, dz);
    if (t.dead) { if ((t.smoke = (t.smoke || 0) - dt) <= 0) { t.smoke = 0.4; Fx.smoke(t.x, 1.6, t.z, 1.8); } return; }
    if (t.stun > 0) { t.stun -= dt; t.tur.rotation.y += dt * 5; return; }
    if (d > 38) {   // drive in along the streets, turning toward Tuko at crossings
      const sp = 4.2, nx = t.x + (t.axis === 'x' ? t.dir * sp * dt : 0), nz = t.z + (t.axis === 'z' ? t.dir * sp * dt : 0);
      const ax = nx + (t.axis === 'x' ? t.dir * 3 : 0), az = nz + (t.axis === 'z' ? t.dir * 3 : 0);
      if (Vox.solidAt(ax, 0.5, az) || inRiverX(ax)) { Damage.blast(ax, 1, az, 1.8, { power: 4, chance: 0.4, src: 'army' }); }   // tanks don't go around
      else { t.x = nx; t.z = nz; }
      Cars.turn(t, true);
      t.heading = t.axis === 'x' ? (t.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (t.dir > 0 ? 0 : Math.PI);
    }
    const want = Math.atan2(dx, dz) - t.heading; t.aim += clamp(Math.atan2(Math.sin(want - t.aim), Math.cos(want - t.aim)), -dt * 1.5, dt * 1.5);
    t.tur.rotation.y = t.aim; t.bar.rotation.x = -clamp(Math.atan2(10, d), 0.05, 0.5);
    if (d < 60 && (t.reload -= dt) <= 0) {
      t.reload = rand(3, 4.5);
      t.tur.updateMatrixWorld(true); const muzzle = new THREE.Vector3(0, 0.45, 3.9).applyMatrix4(t.tur.matrixWorld);
      const ty = rand(5, 16), tx = K.x + rand(-2.5, 2.5), tz = K.z + rand(-2.5, 2.5), L = Math.hypot(tx - muzzle.x, ty - muzzle.y, tz - muzzle.z), s = 55 / L;
      this.fire('shell', muzzle.x, muzzle.y, muzzle.z, (tx - muzzle.x) * s, (ty - muzzle.y) * s, (tz - muzzle.z) * s);
      Audio2.shot(); Fx.fire(muzzle.x, muzzle.y, muzzle.z, 0, 1, 0, 1.6, 0.2); Fx.smoke(muzzle.x, muzzle.y, muzzle.z, 1.2);
    }
  },
  killTank(t, flip) {
    if (t.dead) return; t.dead = true; Game.unitDown('tank', t.x, 1.5, t.z);
    Fx.explosion(t.x, 1.4, t.z, 1); Audio2.boom(true); Fx.shake(0.2);
    t.hull.traverse(m => { if (m.isMesh) m.material = this.mats.track; });
    if (flip) { t.flipping = true; t.vy = 9; t.spin = rand(-4, 4); }
    People.spawn(t.x, t.z, 2);   // the crew got out first
  },
  /* ---------- helicopters ---------- */
  spawnHeli() {
    const [x, z] = this.edgePoint(80), g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    this.part(body, 'box', 'greyD', 1.8, 1.7, 3.8, 0, 0, 0); this.part(body, 'box', 'glass', 1.5, 1.0, 1.2, 0, 0.1, 2.0); this.part(body, 'box', 'greyD', 0.5, 0.5, 4.2, 0, 0.3, -3.6);
    this.part(body, 'box', 'grey', 0.12, 1.2, 0.8, 0.3, 0.7, -5.5); this.part(body, 'box', 'grey', 0.2, 0.2, 3, 0.9, -1.1, 0); this.part(body, 'box', 'grey', 0.2, 0.2, 3, -0.9, -1.1, 0);
    const rotor = this.part(body, 'box', 'track', 9, 0.08, 0.45, 0, 1.0, 0), rotor2 = this.part(body, 'box', 'track', 0.45, 0.08, 9, 0, 1.0, 0);
    const h = { g, body, rotor, rotor2, x, y: rand(24, 30), z, ang: Math.atan2(z - Kaiju.pos.z, x - Kaiju.pos.x), r: rand(30, 40), alt: rand(22, 30), reload: rand(3, 5), state: 'fly', vy: 0, spin: 0, dead: false };
    g.position.set(x, h.y, z); this.group.add(g); this.helis.push(h);
  },
  heliAI(h, dt) {
    h.rotor.rotation.y += dt * 30; h.rotor2.rotation.y = h.rotor.rotation.y;
    if (h.state === 'fall') {
      h.vy -= 14 * dt; h.y += h.vy * dt; h.spin += dt * 6; h.g.rotation.y += h.spin * dt; h.x += h.vx * dt; h.z += h.vz * dt;
      if (Math.random() < 0.6) Fx.smoke(h.x, h.y, h.z, 1.4);
      if (h.y <= 1 || Vox.solidAt(h.x, h.y - 1, h.z)) { h.state = 'gone'; Fx.explosion(h.x, Math.max(1, h.y), h.z, 1.4); Audio2.boom(true); Damage.blast(h.x, Math.max(1, h.y), h.z, 3.5, { power: 10, chance: 0.5, up: 6 }); }
      h.g.position.set(h.x, h.y, h.z); return;
    }
    const K = Kaiju.pos; h.ang += dt * 0.22;
    const tx = K.x + Math.cos(h.ang) * h.r, tz = K.z + Math.sin(h.ang) * h.r, dx = tx - h.x, dz = tz - h.z, d = Math.hypot(dx, dz), sp = Math.min(16, d * 1.5);
    h.x += dx / (d || 1) * sp * dt; h.z += dz / (d || 1) * sp * dt; h.y = lerp(h.y, h.alt, dt);
    const face = Math.atan2(K.x - h.x, K.z - h.z); h.g.rotation.y = face; h.body.rotation.x = 0.12 + Math.min(0.2, sp * 0.01);
    h.g.position.set(h.x, h.y, h.z);
    if (d < 20 && (h.reload -= dt) <= 0) {
      h.reload = rand(4, 6); const s = 34, ty = rand(8, 16), L = Math.hypot(K.x - h.x, ty - h.y, K.z - h.z);
      this.fire('missile', h.x, h.y - 0.8, h.z, (K.x - h.x) / L * s, (ty - h.y) / L * s, (K.z - h.z) / L * s);
    }
  },
  downHeli(h) {
    if (h.dead) return; h.dead = true; h.state = 'fall'; h.vy = 2; h.vx = rand(-4, 4); h.vz = rand(-4, 4);
    Game.unitDown('heli', h.x, h.y, h.z); Fx.explosion(h.x, h.y, h.z, 0.7); Audio2.boom(false); this.chute(h.x, h.y + 2, h.z);
  },
  /* ---------- jets ---------- */
  spawnJet() {
    const K = Kaiju.pos, a = Math.random() * Math.PI * 2, R = 170, x = K.x + Math.cos(a) * R, z = Math.min(K.z + Math.sin(a) * R, 40), tx = K.x + rand(-6, 6), tz = K.z + rand(-6, 6);
    const d = Math.hypot(tx - x, tz - z), sp = 62, vx = (tx - x) / d * sp, vz = (tz - z) / d * sp, g = new THREE.Group();
    this.part(g, 'box', 'grey', 1.1, 0.9, 6, 0, 0, 0); this.part(g, 'cone', 'grey', 1.1, 0.9, 1.6, 0, 0, 3.8); this.part(g, 'box', 'greyD', 7, 0.18, 2.2, 0, -0.1, -0.4); this.part(g, 'box', 'greyD', 2.8, 0.15, 1.2, 0, 0.1, -2.6); this.part(g, 'box', 'greyD', 0.15, 1.6, 1.3, 0, 0.9, -2.6); this.part(g, 'box', 'glass', 0.7, 0.45, 1.4, 0, 0.6, 1.6);
    const j = { g, x, y: rand(42, 50), z, vx, vz, bombs: 6, dropT: 0, dead: false, life: 9 };
    g.rotation.y = Math.atan2(vx, vz); g.position.set(x, j.y, z); this.group.add(g); this.jets.push(j);
    Audio2.swoosh();
  },
  jetAI(j, dt) {
    j.life -= dt;
    if (j.dead) { j.vy = (j.vy || 0) - 14 * dt; j.y += j.vy * dt; j.g.rotation.z += dt * 4; if (Math.random() < 0.8) Fx.smoke(j.x, j.y, j.z, 1.6); if (j.y <= 1 || Vox.solidAt(j.x, j.y, j.z)) { j.life = 0; Fx.explosion(j.x, Math.max(1, j.y), j.z, 1.6); Audio2.boom(true); Damage.blast(j.x, Math.max(1, j.y), j.z, 4.5, { power: 12, chance: 0.5, up: 8 }); } }
    j.x += j.vx * dt; j.z += j.vz * dt; j.g.position.set(j.x, j.y, j.z);
    if (j.dead || !j.bombs) return;
    const fall = Math.sqrt(2 * j.y / 26), lx = j.x + j.vx * 0.6 * fall, lz = j.z + j.vz * 0.6 * fall;
    if (Math.hypot(lx - Kaiju.pos.x, lz - Kaiju.pos.z) < 16 && (j.dropT -= dt) <= 0) { j.dropT = 0.09; j.bombs--; this.fire('bomb', j.x, j.y - 1, j.z, j.vx * 0.6, 0, j.vz * 0.6); }
  },
  downJet(j) { if (j.dead) return; j.dead = true; j.life = 6; Game.unitDown('jet', j.x, j.y, j.z); Fx.explosion(j.x, j.y, j.z, 1); Audio2.boom(true); this.chute(j.x, j.y + 3, j.z); },
  /* ---------- shells, missiles, bombs ---------- */
  fire(kind, x, y, z, vx, vy, vz) {
    const g = new THREE.Group();
    if (kind === 'missile') { this.part(g, 'rod', 'missile', 1, 1, 1.4, 0, 0, 0); this.part(g, 'cone', 'red', 0.4, 0.4, 0.5, 0, 0, 0.9); }
    else if (kind === 'bomb') this.part(g, 'box', 'bomb', 0.5, 0.5, 1.2, 0, 0, 0);
    else this.part(g, 'box', 'shell', 0.3, 0.3, 0.9, 0, 0, 0);
    g.position.set(x, y, z); this.group.add(g); this.shots.push({ kind, g, x, y, z, vx, vy, vz, life: 6 });
  },
  shotStep(s, dt) {
    s.life -= dt; const K = Kaiju.pos;
    if (s.kind === 'missile' && s.life > 4.8) { const dx = K.x - s.x, dy = 11 - s.y, dz = K.z - s.z, d = Math.hypot(dx, dy, dz), sp = Math.hypot(s.vx, s.vy, s.vz); s.vx = lerp(s.vx, dx / d * sp, dt * 2); s.vy = lerp(s.vy, dy / d * sp, dt * 2); s.vz = lerp(s.vz, dz / d * sp, dt * 2); }
    if (s.kind === 'bomb') s.vy -= 26 * dt; else if (s.kind === 'shell') s.vy -= 3 * dt;
    s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
    s.g.position.set(s.x, s.y, s.z); s.g.lookAt(s.x + s.vx, s.y + s.vy, s.z + s.vz);
    if (s.kind === 'missile') Fx.smoke(s.x, s.y, s.z, 0.8); else if (s.kind === 'shell') Fx.spark(s.x, s.y, s.z, 0, 0, 0, 1, 0.8, 0.4);
    const dmg = { shell: 2.5, missile: 3.5, bomb: 4.5 }[s.kind], r = { shell: 2, missile: 2.4, bomb: 3.4 }[s.kind];
    if (Kaiju.hits(s.x, s.y, s.z)) { Fx.explosion(s.x, s.y, s.z, 0.6); Audio2.boom(false); Kaiju.hurt(dmg); Fx.shake(0.15); return true; }
    if (s.y <= 0.2 || Vox.solidAt(s.x, s.y, s.z) || s.life <= 0) {
      if (s.y < 0.5 && waterAt(s.x, s.z)) { Fx.splash(s.x, 0.3, s.z, 2); return true; }
      Fx.explosion(s.x, Math.max(0.5, s.y), s.z, s.kind === 'bomb' ? 1.1 : 0.7); Audio2.boom(s.kind === 'bomb');
      Damage.blast(s.x, Math.max(0.5, s.y), s.z, r, { power: 9, chance: 0.5, up: 6, src: 'army' });
      Kaiju.hurtNear(s.x, s.y, s.z, r + 2, dmg * 0.5); Units.blastAt(s.x, s.y, s.z, r + 3, 'army');
      return true;
    }
    return false;
  },
  /* pilots, gently down */
  chute(x, y, z) {
    const g = new THREE.Group(); const c = new THREE.Mesh(this.geos.dome, this.mats.white); c.scale.set(1.3, 0.9, 1.3); c.position.y = 2.2; g.add(c);
    this.part(g, 'box', 'red', 0.35, 0.7, 0.35, 0, 0, 0); g.position.set(x, y, z); this.group.add(g); this.chutes.push({ g, x, y, z, sway: Math.random() * 6 });
  },
  update(dt) {
    for (const t of this.tanks) {
      this.tankAI(t, dt);
      if (t.flipping) { t.vy -= 18 * dt; t.y += t.vy * dt; t.hull.rotation.z += t.spin * dt; if (t.y <= 0) { t.y = 0; t.flipping = false; t.hull.rotation.z = Math.PI; } }
      t.g.position.set(t.x, t.y, t.z); t.g.rotation.y = t.heading;
    }
    for (const h of this.helis) this.heliAI(h, dt);
    for (const j of this.jets) this.jetAI(j, dt);
    for (let i = this.shots.length - 1; i >= 0; i--) if (this.shotStep(this.shots[i], dt)) { this.group.remove(this.shots[i].g); this.shots.splice(i, 1); }
    for (let i = this.chutes.length - 1; i >= 0; i--) { const c = this.chutes[i]; c.y -= dt * 2.4; c.sway += dt; c.g.position.set(c.x + Math.sin(c.sway) * 1.2, c.y, c.z); c.g.rotation.z = Math.sin(c.sway) * 0.15; if (c.y < 0.3) { this.group.remove(c.g); this.chutes.splice(i, 1); People.spawn(c.x, c.z, 1); } }
    this.helis = this.helis.filter(h => { if (h.state === 'gone') { this.group.remove(h.g); return false; } return true; });
    this.jets = this.jets.filter(j => { if (j.life <= 0 || Math.abs(j.x) > 260 || Math.abs(j.z) > 260) { this.group.remove(j.g); return false; } return true; });
    Audio2.heli(Game.state === 'play' ? this.helis.filter(h => h.state === 'fly').length : 0);
  },
  alive(kind) { return kind === 'tank' ? this.tanks.filter(t => !t.dead).length : kind === 'heli' ? this.helis.filter(h => h.state === 'fly').length : this.jets.filter(j => !j.dead).length; },
  /* ---------- getting hit ---------- */
  crush(x, z, r) { for (const t of this.tanks) if (!t.dead && Math.hypot(t.x - x, t.z - z) < r + 2) { this.killTank(t, false); t.hull.scale.y = 0.4; } },
  blastAt(x, y, z, r, src) {
    for (const t of this.tanks) { const d = Math.hypot(t.x - x, t.z - z); if (t.dead || d > r || y > 9) continue; if (src === 'army' && d > r * 0.5) continue; if (d < r * 0.6 || src === 'stomp') this.killTank(t, true); else t.stun = 2.5; }
    if (src === 'army') return;
    for (const h of this.helis) if (h.state === 'fly' && Math.hypot(h.x - x, h.y - y, h.z - z) < r) this.downHeli(h);
  },
  sweep(x, y, z, r, tx, tz) { for (const t of this.tanks) if (!t.dead && y < 6 && Math.hypot(t.x - x, t.z - z) < r + 1.5) { this.killTank(t, true); t.x += tx * 2; t.z += tz * 2; } },
  roar(x, z, r) {
    for (const h of this.helis) if (h.state === 'fly' && Math.hypot(h.x - x, h.z - z) < r) this.downHeli(h);
    for (const t of this.tanks) if (!t.dead && Math.hypot(t.x - x, t.z - z) < r * 0.8) t.stun = 3;
    for (const j of this.jets) if (!j.dead && Math.hypot(j.x - x, j.z - z) < r * 0.6) { j.bombs = 0; j.y += 6; }   // the pilot thinks better of it
  },
  beamHit(from, dir, len, r) {
    for (const h of this.helis) if (h.state === 'fly' && segDist(h.x, h.y, h.z, from, dir, len) < r + 2.2) this.downHeli(h);
    for (const j of this.jets) if (!j.dead && segDist(j.x, j.y, j.z, from, dir, len) < r + 3) this.downJet(j);
    for (const t of this.tanks) if (!t.dead && segDist(t.x, 1.2, t.z, from, dir, len) < r + 1.6) this.killTank(t, true);
  },
  at(x, y, z) {
    for (const h of this.helis) if (h.state === 'fly' && Math.hypot(h.x - x, h.y - y, h.z - z) < 3) return true;
    for (const j of this.jets) if (!j.dead && Math.hypot(j.x - x, j.y - y, j.z - z) < 4) return true;
    return false;
  },
};
