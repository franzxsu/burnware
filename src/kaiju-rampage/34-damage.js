/* ============================================================
   Destruction: loose blocks that tumble and bounce, blasts that
   knock holes, the beam that drills, glass that shatters, fuel
   that goes up, and buildings that lose a floor and come down.
   ============================================================ */
const Debris = {
  N: 2600, mesh: null, head: 0, colorDirty: false,
  init(scene) {
    const N = this.N; this.P = new Float32Array(N * 3); this.V = new Float32Array(N * 3); this.A = new Float32Array(N * 3); this.S = new Float32Array(N * 3); this.L = new Float32Array(N); this.Z = new Float32Array(N);
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), N);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.castShadow = true; this.mesh.frustumCulled = false;
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.p3 = new THREE.Vector3(); this.s3 = new THREE.Vector3(); this.c = new THREE.Color();
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < N; i++) { this.mesh.setMatrixAt(i, zero); this.mesh.setColorAt(i, this.c.setRGB(1, 1, 1)); }
    scene.add(this.mesh);
  },
  spawn(x, y, z, vx, vy, vz, m, size = 0.9) {
    const s = this.head, P = this.P, V = this.V, A = this.A, S = this.S; this.head = (s + 1) % this.N;
    P[s * 3] = x; P[s * 3 + 1] = y; P[s * 3 + 2] = z; V[s * 3] = vx; V[s * 3 + 1] = vy; V[s * 3 + 2] = vz;
    A[s * 3] = Math.random() * 6; A[s * 3 + 1] = Math.random() * 6; A[s * 3 + 2] = 0;
    S[s * 3] = rand(-6, 6); S[s * 3 + 1] = rand(-6, 6); S[s * 3 + 2] = rand(-6, 6);
    this.L[s] = 2.2 + Math.random() * 2.2; this.Z[s] = size * (0.6 + Math.random() * 0.55);
    const l = 0.82 + Math.random() * 0.2; this.mesh.setColorAt(s, this.c.setRGB(MR[m] * l, MG[m] * l, MB[m] * l)); this.colorDirty = true;
  },
  update(dt) {
    const N = this.N, P = this.P, V = this.V, A = this.A, S = this.S, L = this.L, Z = this.Z, mesh = this.mesh, m4 = this.m4, q = this.q, e = this.e, p3 = this.p3, s3 = this.s3;
    let touched = false;
    for (let s = 0; s < N; s++) {
      if (L[s] <= 0) continue; touched = true;
      const o = s * 3; V[o + 1] -= 16 * dt;
      P[o] += V[o] * dt; P[o + 1] += V[o + 1] * dt; P[o + 2] += V[o + 2] * dt;
      A[o] += S[o] * dt; A[o + 1] += S[o + 1] * dt; A[o + 2] += S[o + 2] * dt;
      const half = Z[s] * 0.5, x = P[o], z = P[o + 2], wet = waterAt(x, z);
      if (P[o + 1] < (wet ? -0.4 : half)) {
        if (wet) { Fx.splash(x, 0.2, z, 0.6); L[s] = 0; }
        else { P[o + 1] = half; V[o + 1] = Math.abs(V[o + 1]) > 2 ? -V[o + 1] * 0.28 : 0; V[o] *= 0.55; V[o + 2] *= 0.55; S[o] *= 0.5; S[o + 1] *= 0.5; S[o + 2] *= 0.5; }
      } else if (V[o + 1] < 0 && Vox.solidAt(x, P[o + 1] - half, z) && !Vox.solidAt(x, P[o + 1] + half, z)) {
        P[o + 1] = Math.floor(P[o + 1] - half) + 1 + half; V[o + 1] = Math.abs(V[o + 1]) > 2 ? -V[o + 1] * 0.25 : 0; V[o] *= 0.5; V[o + 2] *= 0.5;
      }
      L[s] -= dt;
      const sc = L[s] <= 0 ? 0 : Z[s] * Math.min(1, L[s] / 0.6);
      p3.set(P[o], P[o + 1], P[o + 2]); e.set(A[o], A[o + 1], A[o + 2]); q.setFromEuler(e); s3.set(sc, sc, sc);
      m4.compose(p3, q, s3); mesh.setMatrixAt(s, m4);
    }
    if (touched) mesh.instanceMatrix.needsUpdate = true;
    if (this.colorDirty && mesh.instanceColor) { mesh.instanceColor.needsUpdate = true; this.colorDirty = false; }
  },
  clear() { this.L.fill(0); const zero = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < this.N; i++) this.mesh.setMatrixAt(i, zero); this.mesh.instanceMatrix.needsUpdate = true; },
};

const Damage = {
  pending: new Map(), falling: [], booms: [], lastBoom: [], stats: null,
  reset() { this.pending.clear(); for (const f of this.falling) this.dropBody(f); this.falling = []; this.booms = []; this.lastBoom = []; this.stats = { voxels: 0, buildings: 0, landmarks: [] }; },
  /* knock one block out. Returns its dollar value. */
  kill(n, i, j, k, vx, vy, vz, chance) {
    const g = Vox.g, m = g[n]; if (!m) return 0;
    const b = Vox.b[n]; g[n] = 0; Vox.b[n] = 0; Vox.count--; Vox.markDirty(i, j, k);
    if (b) {
      const B = City.list[b];
      if (B && B.state === 'up') {
        B.lv[j]--; B.alive--;
        if (j < 6) { B.lost[0] += i + 0.5 - (B.x0 + B.w / 2); B.lost[1] += k + 0.5 - (B.z0 + B.d / 2); B.lost[2]++; }
        if (B.th && j < B.h - 1 && B.lv[j] < B.orig[j] * B.th) { const p = this.pending.get(b); if (p === undefined || j < p) this.pending.set(b, j); }
      }
    }
    if (Math.random() < chance) Debris.spawn(OX + i + 0.5, j + 0.5, OZ + k + 0.5, vx, vy, vz, m, MGLASS[m] ? 0.55 : 0.9);
    if (MFUEL[m]) this.fuse(OX + i + 0.5, j + 0.5, OZ + k + 0.5);
    this.stats.voxels++;
    return MVAL[m];
  },
  /* a ball of force: o = { power, chance, up, vx, vz, dust, score, src } */
  blast(x, y, z, r, o = {}) {
    const power = o.power ?? 8, chance = o.chance ?? 0.5, up = o.up ?? 4, g = Vox.g, ci = x - OX, ck = z - OZ, r2 = r * r;
    const i0 = Math.max(0, Math.floor(ci - r)), i1 = Math.min(GW - 1, Math.floor(ci + r)), j0 = Math.max(0, Math.floor(y - r)), j1 = Math.min(GH - 1, Math.floor(y + r)), k0 = Math.max(0, Math.floor(ck - r)), k1 = Math.min(GD - 1, Math.floor(ck + r));
    let value = 0, count = 0;
    for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) {
      let n = (j * GD + k) * GW + i0;
      for (let i = i0; i <= i1; i++, n++) {
        if (!g[n]) continue;
        const dx = i + 0.5 - ci, dy = j + 0.5 - y, dz = k + 0.5 - ck, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > r2) continue;
        const d = Math.sqrt(d2); if (d > r * 0.7 && Math.random() < (d - r * 0.7) / (r * 0.3) * 0.85) continue;   // ragged edges
        const inv = 1 / (d + 0.6), sp = power * (0.5 + Math.random() * 0.7);
        value += this.kill(n, i, j, k, dx * inv * sp + (o.vx || 0), dy * inv * sp * 0.5 + up * Math.random(), dz * inv * sp + (o.vz || 0), chance);
        count++;
      }
    }
    if (y - r < 4) { const t = Trees.hit(x, z, r * 0.9); if (t) { value += t * 20000; count += t; } }
    if (count) { if (o.dust !== false) Fx.dustBurst(x, Math.max(0.5, y), z, Math.min(1, count / 40) * r, count); Audio2.crumble(count); }
    if (value && o.score !== false) Game.addDamage(value, count, x, y, z, o.src || 'kaiju');
    return { count, value };
  },
  /* the beam: drill along a line until the budget of blocks for this frame runs out */
  ray(ox, oy, oz, dx, dy, dz, maxLen, radius, budget) {
    const g = Vox.g, step = 0.55, r2 = radius * radius; let t = 1.5, count = 0, value = 0;
    while (t < maxLen) {
      const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
      if (y <= 0.15) return { x, y: 0.15, z, len: t, count, value, ground: true };
      if (x < OX - 30 || x > OX + GW + 30 || z < OZ - 30 || z > OZ + GD + 60 || y > GH + 20) break;
      const ci = x - OX, ck = z - OZ, i0 = Math.max(0, Math.floor(ci - radius)), i1 = Math.min(GW - 1, Math.floor(ci + radius)), j0 = Math.max(0, Math.floor(y - radius)), j1 = Math.min(GH - 1, Math.floor(y + radius)), k0 = Math.max(0, Math.floor(ck - radius)), k1 = Math.min(GD - 1, Math.floor(ck + radius));
      for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
        const n = (j * GD + k) * GW + i; if (!g[n]) continue;
        const ex = i + 0.5 - ci, ey = j + 0.5 - y, ez = k + 0.5 - ck; if (ex * ex + ey * ey + ez * ez > r2) continue;
        value += this.kill(n, i, j, k, dx * 9 + ex * 6 + rand(-2, 2), dy * 9 + rand(2, 7), dz * 9 + ez * 6 + rand(-2, 2), 0.45); count++;
      }
      if (count >= budget) return { x, y, z, len: t, count, value, blocked: true };
      t += step;
    }
    return { x: ox + dx * t, y: oy + dy * t, z: oz + dz * t, len: t, count, value };
  },
  /* the roar's shockwave: windows nearby give way */
  shatter(x, y, z, r) {
    const g = Vox.g, ci = x - OX, ck = z - OZ, r2 = r * r; let value = 0, count = 0;
    const i0 = Math.max(0, Math.floor(ci - r)), i1 = Math.min(GW - 1, Math.floor(ci + r)), k0 = Math.max(0, Math.floor(ck - r)), k1 = Math.min(GD - 1, Math.floor(ck + r)), j1 = Math.min(GH - 1, Math.floor(y + r));
    for (let j = 0; j <= j1; j++) for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
      const n = (j * GD + k) * GW + i, m = g[n]; if (!m || !MGLASS[m]) continue;
      const dx = i + 0.5 - ci, dy = j + 0.5 - y, dz = k + 0.5 - ck, d2 = dx * dx + dy * dy + dz * dz; if (d2 > r2 || Math.random() < d2 / r2 * 0.7) continue;
      const inv = 1 / Math.sqrt(d2 + 1); value += this.kill(n, i, j, k, dx * inv * 7, rand(1, 5), dz * inv * 7, 0.7); count++;
    }
    if (value) Game.addDamage(value, count, x, y, z, 'kaiju');
    return count;
  },
  /* fuel: the first hit lights a fuse; then the tank goes */
  fuse(x, y, z) {
    const now = World.t;
    if (this.lastBoom.some(b => now - b.t < 1.6 && Math.hypot(b.x - x, b.z - z) < 7)) return;
    if (this.booms.some(b => Math.hypot(b.x - x, b.z - z) < 5)) return;
    this.booms.push({ x, y: Math.max(1.5, y), z, at: now + rand(0.12, 0.45) });
  },
  update(dt) {
    if (this.pending.size) { const list = [...this.pending]; this.pending.clear(); for (const [b, f] of list) this.collapse(City.list[b], f); }
    for (let q = this.booms.length - 1; q >= 0; q--) {
      const b = this.booms[q]; if (World.t < b.at) continue;
      this.booms.splice(q, 1); this.lastBoom.push({ x: b.x, z: b.z, t: World.t }); if (this.lastBoom.length > 12) this.lastBoom.shift();
      Fx.explosion(b.x, b.y, b.z, 2.2); Audio2.boom(true); Fx.shake(0.5);
      this.blast(b.x, b.y, b.z, 5.5, { power: 16, chance: 0.6, up: 9 });
      Units.blastAt(b.x, b.y, b.z, 9, 'kaiju'); Kaiju.hurtNear(b.x, b.y, b.z, 7, 3);
      News.event('fuel');
    }
    for (let q = this.falling.length - 1; q >= 0; q--) if (this.stepBody(this.falling[q], dt)) { this.dropBody(this.falling[q]); this.falling.splice(q, 1); }
  },
  /* a floor gave way: everything of the building above it comes down as one piece */
  collapse(B, f) {
    if (!B || B.state !== 'up') return;
    const g = Vox.g, bb = Vox.b, cells = []; let i0 = 1e9, i1 = -1, j0 = 1e9, j1 = -1, k0 = 1e9, k1 = -1, value = 0;
    for (let j = f + 1; j < B.h; j++) for (let k = B.bk0; k <= B.bk1; k++) for (let i = B.bi0; i <= B.bi1; i++) {
      const n = (j * GD + k) * GW + i; if (bb[n] !== B.id || !g[n]) continue;
      const m = g[n]; cells.push(i, j, k, m); value += MVAL[m]; g[n] = 0; bb[n] = 0; Vox.count--; Vox.markDirty(i, j, k); B.lv[j]--; B.alive--;
      if (i < i0) i0 = i; if (i > i1) i1 = i; if (j < j0) j0 = j; if (j > j1) j1 = j; if (k < k0) k0 = k; if (k > k1) k1 = k;
    }
    if (!cells.length) { B.h = f + 1; return; }
    B.state = 'falling';
    const W = i1 - i0 + 1, H = j1 - j0 + 1, D = k1 - k0 + 1, local = new Uint8Array(W * H * D);
    for (let c = 0; c < cells.length; c += 4) local[((cells[c + 1] - j0) * D + (cells[c + 2] - k0)) * W + (cells[c] - i0)] = cells[c + 3];
    const get = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= W || j >= H || k >= D) ? 0 : local[(j * D + k) * W + i];
    const px = OX + i0 + W / 2, py = f + 1, pz = OZ + k0 + D / 2;
    const res = Mesher.region(get, 0, 0, 0, W, H, D, OX + i0 - px, j0 - py, OZ + k0 - pz, false);
    const group = new THREE.Group(); group.position.set(px, py, pz);
    for (const [d, mat] of [[res.solid, Vox.matSolid], [res.glow, Vox.matGlow]]) if (d) { const mesh = new THREE.Mesh(Mesher.geometry(d), mat); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); }
    World.scene.add(group);
    let lx = B.lost[0], lz = B.lost[1]; const lm = Math.hypot(lx, lz); if (lm < 0.5) { const a = Math.random() * Math.PI * 2; lx = Math.cos(a); lz = Math.sin(a); } else { lx /= lm; lz /= lm; }
    const tall = (j1 + 1 - py) / Math.max(W, D), body = { B, group, px, py, pz, W, D, top: j1 + 1 - py, drop: 0, vel: 0, tilt: 0, tiltMax: clamp(0.12 + tall * 0.12, 0.12, 0.55), dir: [lx, lz], axis: new THREE.Vector3(lz, 0, -lx), stump: f + 1, t: 0, hitT: 0, cells, mats: B.mats };
    this.falling.push(body);
    this.stats.buildings++;
    Game.collapse(B, value, cells.length / 4, px, py + body.top / 2, pz);
    Audio2.collapse(); Fx.shake(Math.min(0.6, 0.15 + body.top / 50));
    for (let n = 0; n < 8; n++) Units.panic(px + rand(-W, W), pz + rand(-D, D));
  },
  stepBody(o, dt) {
    o.t += dt; o.vel = Math.min(15, o.vel + 10 * dt); o.drop += o.vel * dt; o.tilt = Math.min(o.tiltMax, o.tilt + dt * (0.05 + o.t * 0.22));
    const bottom = o.py - o.drop; o.group.position.y = bottom; o.group.quaternion.setFromAxisAngle(o.axis, o.tilt);
    const B = o.B, g = Vox.g, bb = Vox.b;
    while (o.stump > 0 && bottom < o.stump) {   // the part still standing gets crushed on the way down
      const j = --o.stump; let value = 0, count = 0;
      for (let k = B.bk0; k <= B.bk1; k++) for (let i = B.bi0; i <= B.bi1; i++) { const n = (j * GD + k) * GW + i; if (bb[n] === B.id && g[n]) { value += this.kill(n, i, j, k, rand(-5, 5), rand(2, 6), rand(-5, 5), 0.22); count++; } }
      if (value) Game.addDamage(value, count, o.px, j, o.pz, 'kaiju', true);
    }
    const crush = Math.max(0.4, Math.min(o.stump, bottom));
    if (Math.random() < 0.9) for (let n = 0; n < 3; n++) {
      const side = Math.random() < 0.5, u = Math.random() * 2 - 1, x = o.px + (side ? Math.sign(u) * o.W / 2 : u * o.W / 2), z = o.pz + (side ? u * o.D / 2 : Math.sign(u) * o.D / 2);
      Fx.dust(x, crush + rand(0, 1.5), z, (x - o.px) * 0.5, rand(0.5, 2), (z - o.pz) * 0.5, rand(3, 6), 2.6);
      if (n === 0 && o.cells.length) { const c = Math.floor(Math.random() * o.cells.length / 4) * 4; Debris.spawn(x, crush + 0.5, z, (x - o.px) * 1.4 + rand(-2, 2), rand(1, 6), (z - o.pz) * 1.4 + rand(-2, 2), o.cells[c + 3]); }
    }
    o.hitT -= dt;
    if (o.tilt > 0.08 && o.hitT <= 0) {   // leaning into the neighbours
      o.hitT = 0.12; const h = o.top * 0.85, s = Math.sin(o.tilt), x = o.px + o.dir[0] * (h * s + o.W * 0.5), z = o.pz + o.dir[1] * (h * s + o.D * 0.5), y = bottom + h * Math.cos(o.tilt);
      if (Vox.solidAt(x, y, z)) this.blast(x, y, z, 2.4, { power: 6, chance: 0.4 });
    }
    return bottom + o.top < -1;
  },
  dropBody(o) {
    World.scene.remove(o.group); o.group.children.forEach(m => m.geometry.dispose());
    const B = o.B; B.state = 'down';
    const rub = (B.mats.some(m => m === M.brick || m === M.brick2 || m === M.roofRed || m === M.towerRed)) ? M.rubble2 : B.mats.some(m => m === M.white || m === M.cream || m === M.dome) ? M.rubble3 : M.rubble;
    for (let k = B.z0; k < B.z0 + B.d; k++) for (let i = B.x0; i < B.x0 + B.w; i++) {
      const cx = (i + 0.5 - B.x0) / B.w - 0.5, cz = (k + 0.5 - B.z0) / B.d - 0.5, mid = 1 - Math.hypot(cx, cz) * 1.6, h = Math.max(0, Math.floor(mid * 2.2 + Math.random() * 1.3));
      for (let j = 0; j < Math.min(3, h); j++) if (!Vox.get(i, j, k)) { Vox.set(i, j, k, Math.random() < 0.7 ? rub : M.rubble, 0); Vox.markDirty(i, j, k); }
    }
    Fx.dustBurst(o.px, 1.5, o.pz, Math.max(o.W, o.D) * 0.7, 40);
  },
};
