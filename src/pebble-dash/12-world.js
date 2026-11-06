/* ============================================================
   World data: track samples, elevation, terrain, ground queries
   (no rendering here, so the physics can run headless)
   ============================================================ */
const SURF_KEYS = Object.keys(SURF);
const SURF_IDX = Object.fromEntries(SURF_KEYS.map((k, i) => [k, i]));
const SURF_LIST = SURF_KEYS.map(k => SURF[k]);
const BANK_U = [0, 0.8, 2.0, 3.4];   // lateral distance past the road edge
const BANK_W = 3.4;

class World {
  constructor(track, opts = {}) {
    this.T = track; this.th = THEMES[track.theme]; this.gripK = opts.gripK || 1;   // < 1 when the stage is wet
    this.offroad = SURF_IDX[this.th.offroad];
    this.bankH = track.theme === 'snow' ? 0.58 : track.theme === 'forest' ? 0.22 : 0.12;
    this.noise = makePerlin(track.seed);
    const sp = sampleClosedSpline(track.pts, 1.0);
    this.N = sp.N; this.ds = sp.ds; this.len = sp.len; this.X = sp.X; this.Z = sp.Z; this.cpToS = sp.cpToS;
    this._g = { h: 0, surf: 0, onRoad: false, lat: 0, idx: 0, water: -1e9, u: 0 };
    this._tangents();
    this._hash();
    this._features();
    this._profile();
    this._surfaces();
    this._terrain();
    if (typeof this._racingLine === 'function') { this._racingLine(); this._paceNotes(); this._scenery(); }
  }
  idxOfCp(cp) { return Math.round(this.cpToS(cp) / this.ds) % this.N; }
  wrap(i) { const N = this.N; return ((i % N) + N) % N; }

  _tangents() {
    const { N, X, Z } = this;
    this.TX = new Float64Array(N); this.TZ = new Float64Array(N); this.RX = new Float64Array(N); this.RZ = new Float64Array(N);
    this.HD = new Float64Array(N); this.KAP = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const a = (i - 1 + N) % N, b = (i + 1) % N;
      const tx = X[b] - X[a], tz = Z[b] - Z[a], l = Math.hypot(tx, tz) || 1;
      this.TX[i] = tx / l; this.TZ[i] = tz / l;
      this.RX[i] = -this.TZ[i]; this.RZ[i] = this.TX[i];          // right-hand side of travel
      this.HD[i] = Math.atan2(this.TX[i], this.TZ[i]);             // yaw (forward = sin, cos)
    }
    for (let i = 0; i < N; i++) {                                   // + = turning left
      const a = (i - 5 + N) % N, b = (i + 5) % N;
      this.KAP[i] = wrapAngle(this.HD[b] - this.HD[a]) / (10 * this.ds);
    }
  }
  _hash() {
    this.cell = 12; this.buckets = new Map();
    for (let i = 0; i < this.N; i++) {
      const k = this._key(Math.floor(this.X[i] / this.cell), Math.floor(this.Z[i] / this.cell));
      let b = this.buckets.get(k); if (!b) this.buckets.set(k, b = []); b.push(i);
    }
  }
  _key(bx, bz) { return (bx + 2000) * 4096 + (bz + 2000); }
  nearestGlobal(x, z, maxR = 60) {
    const r = Math.ceil(maxR / this.cell), bx = Math.floor(x / this.cell), bz = Math.floor(z / this.cell);
    let best = -1, bd = maxR * maxR;
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      const b = this.buckets.get(this._key(bx + dx, bz + dz)); if (!b) continue;
      for (const i of b) { const d = (this.X[i] - x) ** 2 + (this.Z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } }
    }
    return best;
  }
  nearestLocal(x, z, hint, win = 12) {
    const { N, X, Z } = this;
    let best = hint, bd = Infinity;
    for (let pass = 0; pass < 4; pass++) {
      const c = best; let bk = 0;
      for (let k = -win; k <= win; k++) {
        const i = (c + k + N) % N, d = (X[i] - x) ** 2 + (Z[i] - z) ** 2;
        if (d < bd) { bd = d; best = i; bk = k; }
      }
      if (Math.abs(bk) < win) break;
    }
    return best;
  }

  _features() {
    this.ponds = []; this.waters = [];
    for (const f of this.T.features) {
      f.s = this.cpToS(f.at); f.i = Math.round(f.s / this.ds) % this.N; f.x = this.X[f.i]; f.z = this.Z[f.i];
      if (f.type === 'water') { this.ponds.push({ x: f.x, z: f.z, r: f.r, depth: 3.2 }); this.waters.push(f); }
    }
  }
  terrainBase(x, z) {
    const t = this.T.terrain, n = this.noise;
    let h = t.amp * fbm(n, x * t.freq, z * t.freq, 4) + t.tilt[0] * x + t.tilt[1] * z;
    if (t.amp > 0) h += 2.2 * fbm(n, x / 46 + 31.7, z / 46 - 11.3, 2);
    for (const p of this.ponds) { const d2 = (x - p.x) ** 2 + (z - p.z) ** 2; h -= p.depth * Math.exp(-d2 / (p.r * p.r)); }
    const sea = this.T.sea;
    if (sea) h -= sea.depth * smoothstep(sea.start, sea.start + sea.falloff, x * sea.dir[0] + z * sea.dir[1]);
    return h;
  }
  _profile() {
    const { N, X, Z } = this;
    let a = new Float64Array(N), b = new Float64Array(N);
    for (let i = 0; i < N; i++) a[i] = this.terrainBase(X[i], Z[i]);
    const R = 24;
    for (let pass = 0; pass < 4; pass++) {
      let sum = 0; for (let k = -R; k <= R; k++) sum += a[(k + N) % N];
      for (let i = 0; i < N; i++) { b[i] = sum / (2 * R + 1); sum += a[(i + R + 1) % N] - a[(i - R + N) % N]; }
      const t = a; a = b; b = t;
    }
    const E = a;
    if (this.T.sea) for (let i = 0; i < N; i++) E[i] = Math.max(E[i], this.T.sea.level + 1.8);
    for (const f of this.T.features) {
      if (f.type === 'crest') {
        const L = Math.round(f.len / 2);
        for (let k = -L; k <= L; k++) E[(f.i + k + N) % N] += f.h * 0.5 * (1 + Math.cos(Math.PI * k / L));
      } else if (f.type === 'jump') {
        const L = Math.round(f.len);
        for (let k = -L; k <= 0; k++) E[(f.i + k + N) % N] += f.h * Math.pow((k + L) / L, 1.6);
        E[(f.i + 1) % N] += f.h * 0.3;
        f.lipS = f.i * this.ds;
      } else if (f.type === 'water') {
        const L = Math.round(f.len / 2);
        for (let k = -L; k <= L; k++) E[(f.i + k + N) % N] -= f.depth * 0.5 * (1 + Math.cos(Math.PI * k / L));
        let lo = Infinity; for (let k = -L; k <= L; k++) lo = Math.min(lo, E[(f.i + k + N) % N]);
        f.level = lo + 0.36;
      }
    }
    this.E = E;
    this.W = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      this.W[i] = this.T.width / 2 + 0.45 * this.noise(i / 38, 4.2) + clamp(Math.abs(this.KAP[i]) * 22, 0, 1.3);
    }
  }
  _surfaces() {
    const { N } = this;
    this.SF = new Uint8Array(N).fill(SURF_IDX[this.T.base]);
    for (const [a, b, k] of this.T.surfaces) {
      let i = Math.round(this.cpToS(a) / this.ds) % N; const j = Math.round(this.cpToS(b) / this.ds) % N;
      let guard = 0;
      while (i !== j && guard++ < N) { this.SF[i] = SURF_IDX[k]; i = (i + 1) % N; }
    }
    for (const f of this.waters) {
      const L = Math.round(f.len / 2) + 4;
      for (let k = -L; k <= L; k++) { const i = (f.i + k + N) % N; if (this.E[i] < f.level) this.SF[i] = SURF_IDX.water; }
    }
  }
  bankProfile(u) {
    const H = this.bankH;
    if (u < 0.8) return (u / 0.8) * 0.4 * H;
    if (u < 2.0) return lerp(0.4 * H, H, (u - 0.8) / 1.2);
    return lerp(H, -0.5, (u - 2.0) / 1.4);
  }
  _terrain() {
    const { X, Z } = this;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < this.N; i++) { minX = Math.min(minX, X[i]); maxX = Math.max(maxX, X[i]); minZ = Math.min(minZ, Z[i]); maxZ = Math.max(maxZ, Z[i]); }
    const M = 190, cell = 3.5;
    this.gx0 = Math.floor((minX - M) / cell) * cell; this.gz0 = Math.floor((minZ - M) / cell) * cell;
    this.gcell = cell;
    this.gnx = Math.ceil((maxX + M - this.gx0) / cell) + 1; this.gnz = Math.ceil((maxZ + M - this.gz0) / cell) + 1;
    const nx = this.gnx, nz = this.gnz;
    this.H = new Float32Array(nx * nz); this.GD = new Float32Array(nx * nz); this.GI = new Int32Array(nx * nz);
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
      const x = this.gx0 + ix * cell, z = this.gz0 + iz * cell, k = iz * nx + ix;
      let h = this.terrainBase(x, z);
      const i = this.nearestGlobal(x, z, 46);
      let d = 999;
      if (i >= 0) {
        d = Math.abs((x - X[i]) * this.RX[i] + (z - Z[i]) * this.RZ[i]);
        const hw = this.W[i], t = smoothstep(hw + 1.6, hw + 1.6 + 16, d);
        h = lerp(this.E[i] - 0.18, h, t);
      }
      this.H[k] = h; this.GD[k] = d; this.GI[k] = i;
    }
    this.minX = this.gx0; this.maxX = this.gx0 + (nx - 1) * cell; this.minZ = this.gz0; this.maxZ = this.gz0 + (nz - 1) * cell;
  }
  terrainH(x, z) {
    const nx = this.gnx, nz = this.gnz, c = this.gcell;
    let gx = (x - this.gx0) / c, gz = (z - this.gz0) / c;
    let ix = Math.floor(gx), iz = Math.floor(gz);
    if (ix < 0) ix = 0; else if (ix > nx - 2) ix = nx - 2;
    if (iz < 0) iz = 0; else if (iz > nz - 2) iz = nz - 2;
    const fx = clamp(gx - ix, 0, 1), fz = clamp(gz - iz, 0, 1), H = this.H, k = iz * nx + ix;
    const a = H[k], b = H[k + 1], cc = H[k + nx], d = H[k + nx + 1];
    return fx + fz <= 1 ? a + (b - a) * fx + (cc - a) * fz : d + (cc - d) * (1 - fx) + (b - d) * (1 - fz);
  }
  /* The one function the physics asks: what is under (x, z)? */
  ground(x, z, hint, out) {
    out = out || this._g;
    const { N, X, Z, ds } = this;
    const i = hint >= 0 ? this.nearestLocal(x, z, hint, 10) : this.nearestGlobal(x, z, 60);
    out.water = -1e9; out.idx = i; out.onRoad = false;
    if (i >= 0) {
      const dx = x - X[i], dz = z - Z[i];
      const lat = dx * this.RX[i] + dz * this.RZ[i], along = dx * this.TX[i] + dz * this.TZ[i];
      const j = along >= 0 ? (i + 1) % N : (i - 1 + N) % N, f = Math.min(1, Math.abs(along) / ds);
      const e = this.E[i] + (this.E[j] - this.E[i]) * f, hw = this.W[i] + (this.W[j] - this.W[i]) * f;
      const u = Math.abs(lat) - hw;
      out.lat = lat; out.u = u;
      if (u <= 0) { out.h = e; out.surf = this.SF[i]; out.onRoad = true; }
      else if (u < BANK_W) { const th = this.terrainH(x, z), bh = e + this.bankProfile(u); out.h = Math.max(th, bh); out.surf = this.offroad; }
      else { out.h = this.terrainH(x, z); out.surf = this.offroad; }
    } else { out.h = this.terrainH(x, z); out.surf = this.offroad; out.lat = 999; out.u = 999; }
    for (const w of this.waters) {
      if ((x - w.x) ** 2 + (z - w.z) ** 2 < (w.r * 1.5) ** 2 && out.h < w.level) { out.water = w.level; if (!out.onRoad) out.surf = SURF_IDX.water; }
    }
    if (this.T.sea && out.h < this.T.sea.level) { out.water = this.T.sea.level; if (!out.onRoad) out.surf = SURF_IDX.water; }
    return out;
  }
  heightAt(x, z, hint) { return this.ground(x, z, hint === undefined ? -1 : hint, this._g2 || (this._g2 = {})).h; }
  /* where a car should sit if it is reset at track sample i */
  resetPose(i, lat) {
    const x = this.X[i] + this.RX[i] * lat, z = this.Z[i] + this.RZ[i] * lat;
    return { x, z, y: this.E[i], yaw: this.HD[i] };
  }
}
