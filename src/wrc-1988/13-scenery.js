/* ============================================================
   Racing line, pace notes and scenery placement (data only)
   ============================================================ */
World.prototype._racingLine = function () {
  const { N, X, Z, RX, RZ, W } = this;
  const off = new Float64Array(N), LX = new Float64Array(N), LZ = new Float64Array(N);
  const margin = 1.9;
  for (let i = 0; i < N; i++) { LX[i] = X[i]; LZ[i] = Z[i]; }
  for (const [k, iters] of [[30, 40], [16, 60], [8, 60], [4, 40]]) {
    for (let it = 0; it < iters; it++) {
      for (let i = 0; i < N; i++) {
        const a = (i - k + N) % N, b = (i + k) % N;
        const mx = (LX[a] + LX[b]) / 2, mz = (LZ[a] + LZ[b]) / 2;
        const lim = Math.max(0.3, W[i] - margin);
        const o = clamp((mx - X[i]) * RX[i] + (mz - Z[i]) * RZ[i], -lim, lim);
        off[i] = lerp(off[i], o, 0.6);
        LX[i] = X[i] + RX[i] * off[i]; LZ[i] = Z[i] + RZ[i] * off[i];
      }
    }
  }
  const LV = new Float64Array(N), LK = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const a = (i - 5 + N) % N, b = (i + 5) % N;
    const ax = LX[a], az = LZ[a], bx = LX[i], bz = LZ[i], cx = LX[b], cz = LZ[b];
    const area2 = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
    const k = Math.abs(2 * area2) / (Math.hypot(bx - ax, bz - az) * Math.hypot(cx - bx, cz - bz) * Math.hypot(ax - cx, az - cz) + 1e-9);
    LK[i] = k;
    const mu = SURF_LIST[this.SF[i]].mu * this.gripK;
    LV[i] = Math.min(Math.sqrt(mu * 0.86 * G / Math.max(k, 1e-4)), 46);
    if (this.SF[i] === SURF_IDX.water) LV[i] = Math.min(LV[i], 17);
  }
  for (const f of this.T.features) if (f.type === 'crest') for (let k = -Math.round(f.len / 2); k <= Math.round(f.len / 2) + 30; k++) { const i = (f.i + k + N) % N; LV[i] = Math.min(LV[i], 34); }
  // jumps: arrive a little slower so the landing is on the road
  for (const f of this.T.features) if (f.type === 'jump') for (let k = -30; k <= 2; k++) { const i = (f.i + k + N) % N; LV[i] = Math.min(LV[i], 27); }
  for (let pass = 0; pass < 3; pass++) for (let i = N - 1; i >= 0; i--) {
    const j = (i + 1) % N, aB = SURF_LIST[this.SF[i]].mu * this.gripK * G * 0.6;
    LV[i] = Math.min(LV[i], Math.sqrt(LV[j] * LV[j] + 2 * aB * this.ds));
  }
  this.LX = LX; this.LZ = LZ; this.LOFF = off; this.LV = LV; this.LK = LK;
};

World.prototype._paceNotes = function () {
  const { N, ds } = this;
  const K = new Float64Array(N);
  for (let i = 0; i < N; i++) { const a = (i - 8 + N) % N, b = (i + 8) % N; K[i] = wrapAngle(this.HD[b] - this.HD[a]) / (16 * ds); }
  const TH = 1 / 160;
  let start = 0; for (let i = 0; i < N; i++) if (Math.abs(K[i]) < TH * 0.4) { start = i; break; }
  const at = (j) => K[(start + j) % N];
  // 1) runs of same-sign curvature above the threshold
  const runs = [];
  for (let j = 0; j < N;) {
    if (Math.abs(at(j)) < TH) { j++; continue; }
    const sg = Math.sign(at(j)); let e = j;
    while (e + 1 < N && Math.sign(at(e + 1)) === sg && Math.abs(at(e + 1)) >= TH) e++;
    runs.push([j, e, sg]); j = e + 1;
  }
  // 2) split runs at deep valleys between peaks
  const pieces = [];
  for (const [a, b, sg] of runs) {
    let segStart = a, peak = 0;
    for (let j = a; j <= b; j++) {
      const v = Math.abs(at(j)); peak = Math.max(peak, v);
      const isMin = j > a && j < b && v <= Math.abs(at(j - 1)) && v <= Math.abs(at(j + 1));
      if (!isMin) continue;
      let p2 = 0; for (let q = j + 1; q <= b; q++) { const w = Math.abs(at(q)); p2 = Math.max(p2, w); if (q < b && w < Math.abs(at(q + 1)) === false && w < p2 * 0.98) break; }
      if (v < 0.58 * Math.min(peak, p2) && (j - segStart) * ds > 10 && (b - j) * ds > 10) { pieces.push([segStart, j, sg]); segStart = j + 1; peak = 0; }
    }
    pieces.push([segStart, b, sg]);
  }
  const notes = [];
  for (const [a, b, sg] of pieces) {
    let maxK = 0, peakAt = a;
    for (let j = a; j <= b; j++) if (Math.abs(at(j)) > maxK) { maxK = Math.abs(at(j)); peakAt = j; }
    const len = (b - a + 1) * ds, R = 1 / maxK;
    if (len < 8 && R > 60) continue;
    const sev = R >= 120 ? 6 : R >= 75 ? 5 : R >= 48 ? 4 : R >= 30 ? 3 : R >= 19 ? 2 : R >= 12.5 ? 1 : 0;
    const third = Math.max(1, Math.floor((b - a) / 3));
    let k1 = 0, k3 = 0;
    for (let q = 0; q < third; q++) { k1 += Math.abs(at(a + q)); k3 += Math.abs(at(b - q)); }
    let mod = '';
    if (len > 80) mod = 'long';
    if (k3 > k1 * 1.7 && len > 35) mod = 'tightens';
    else if (k1 > k3 * 1.7 && len > 35) mod = 'opens';
    if (sev === 6 && len < 55) continue;
    notes.push({ kind: 'corner', i: (start + a) % N, s: ((start + a) % N) * ds, end: ((start + b) % N) * ds,
      mid: (start + peakAt) % N, dir: sg > 0 ? 'L' : 'R', sev, len, mod });
  }
  for (const f of this.T.features) {
    const lead = f.type === 'jump' ? f.len : f.len / 2;
    const s = ((f.s - lead) % this.len + this.len) % this.len;
    notes.push({ kind: f.type, i: Math.round(s / ds) % N, s, end: (f.s + 4) % this.len, mid: f.i, sev: 9, len: lead });
  }
  notes.sort((a, b) => a.s - b.s);
  const word = ['hairpin', 'one', 'two', 'three', 'four', 'five', 'six'];
  notes.forEach((n, k) => {
    const nx = notes[(k + 1) % notes.length];
    const gap = ((nx.s - n.end) + this.len) % this.len;
    n.into = gap < 28 && notes.length > 1;
    if (n.kind === 'corner') {
      const side = n.dir === 'L' ? 'left' : 'right';
      n.label = n.sev === 0 ? 'HAIRPIN ' + n.dir : n.dir + n.sev;
      n.say = n.sev === 0 ? `hairpin ${side}` : `${side} ${word[n.sev]}`;
      if (n.mod) { n.label += ' ' + n.mod; n.say += ' ' + n.mod; }
    } else if (n.kind === 'jump') { n.label = 'JUMP'; n.say = 'jump, flat out'; }
    else if (n.kind === 'crest') { n.label = 'CREST'; n.say = 'over crest'; }
    else if (n.kind === 'water') { n.label = 'SPLASH'; n.say = 'water splash'; }
  });
  this.notes = notes;
};

World.prototype._scenery = function () {
  const T = this.T, sc = T.scenery, rnd = mulberry32(T.seed * 31 + 5), N = this.N;
  this.trees = []; this.rocks = []; this.cacti = []; this.mesas = []; this.props = []; this.people = []; this.snowmen = [];
  this.palms = []; this.bushes = []; this.tape = [];
  this.obstacles = [];
  const exclude = [];   // circles kept clear of trees (crowds, gantry)
  const roadDist = (x, z, maxR) => {
    const i = this.nearestGlobal(x, z, maxR);
    if (i < 0) return { d: 999, i: -1 };
    return { d: Math.abs((x - this.X[i]) * this.RX[i] + (z - this.Z[i]) * this.RZ[i]), i };
  };
  const inWater = (x, z, h) => this.waters.some(w => (x - w.x) ** 2 + (z - w.z) ** 2 < (w.r * 1.5) ** 2 && h < w.level + 0.4);
  const slope = (x, z) => Math.hypot(this.terrainH(x + 1, z) - this.terrainH(x - 1, z), this.terrainH(x, z + 1) - this.terrainH(x, z - 1)) / 2;

  // start gantry
  const g0 = 0, gw = this.W[g0] + 2.4;
  this.gantry = { i: g0, x: this.X[g0], z: this.Z[g0], y: this.E[g0], yaw: this.HD[g0], half: gw };
  for (const sd of [-1, 1]) this.obstacles.push({ x: this.X[g0] + this.RX[g0] * gw * sd, z: this.Z[g0] + this.RZ[g0] * gw * sd, r: 0.45, top: this.E[g0] + 6 });
  exclude.push({ x: this.X[g0], z: this.Z[g0], r: 24 });

  // crowds at the most dramatic corners + the jump
  const corners = this.notes.filter(n => n.kind === 'corner' && n.sev <= 3).sort((a, b) => a.sev - b.sev);
  const spots = [];
  for (const n of corners) { if (spots.length >= 5) break; if (spots.every(s => Math.abs(s.mid - n.mid) > 120)) spots.push(n); }
  for (const f of T.features) if (f.type === 'jump' || f.type === 'water') spots.push({ mid: f.i, dir: 'X', kind: f.type });
  const PEOPLE_COLORS = 6;
  for (const sp of spots) {
    const i0 = sp.mid, side = sp.dir === 'L' ? 1 : sp.dir === 'R' ? -1 : (rnd() < 0.5 ? 1 : -1);
    const count = 9 + Math.floor(rnd() * 8);
    for (let c = 0; c < count; c++) {
      const i = (i0 + Math.round((rnd() - 0.5) * 26) + N) % N;
      const lat = side * (this.W[i] + 7.5 + rnd() * 4.5);
      const x = this.X[i] + this.RX[i] * lat, z = this.Z[i] + this.RZ[i] * lat;
      const y = this.terrainH(x, z);
      if (inWater(x, z, y)) continue;
      this.people.push({ x, z, y, yaw: Math.atan2(this.X[i] - x, this.Z[i] - z), col: Math.floor(rnd() * PEOPLE_COLORS), ph: rnd() * TAU, jump: 0 });
    }
    exclude.push({ x: this.X[i0] + this.RX[i0] * side * (this.W[i0] + 9), z: this.Z[i0] + this.RZ[i0] * side * (this.W[i0] + 9), r: 20 });
    const line = [];
    for (let k = -15; k <= 15; k += 3) {
      const i = (i0 + k + N) % N, lat = side * (this.W[i] + 6.2);
      const x = this.X[i] + this.RX[i] * lat, z = this.Z[i] + this.RZ[i] * lat;
      line.push({ x, z, y: this.terrainH(x, z) });
    }
    this.tape.push(line);
  }

  // knock-over props on the outside of tight corners
  const propKind = T.theme === 'snow' ? 'tires' : 'bale';
  for (const n of this.notes) {
    if (n.kind !== 'corner' || n.sev > 3 || this.props.length > 70) continue;
    const side = n.dir === 'L' ? 1 : -1;
    for (let k = -8; k <= 14; k += 3) {
      const i = (n.mid + k + N) % N, lat = side * (this.W[i] + 2.0);
      const x = this.X[i] + this.RX[i] * lat, z = this.Z[i] + this.RZ[i] * lat;
      this.props.push({ kind: propKind, x, z, yaw: this.HD[i] });
    }
  }
  for (const n of this.notes) {
    if (n.kind !== 'corner' || n.sev > 2) continue;
    const side = n.dir === 'L' ? 1 : -1;
    for (let k = -12; k <= 12; k += 6) {
      const i = (n.mid + k + N) % N, lat = side * (this.W[i] + 3.6);
      this.props.push({ kind: 'chevron', x: this.X[i] + this.RX[i] * lat, z: this.Z[i] + this.RZ[i] * lat, yaw: this.HD[i] + Math.PI, flip: n.dir === 'R' });
    }
  }
  for (let k = 3; k <= 30; k += 9) for (const sd of [-1, 1]) {
    const i = k % N, lat = sd * (this.W[i] + 0.6);
    this.props.push({ kind: 'cone', x: this.X[i] + this.RX[i] * lat, z: this.Z[i] + this.RZ[i] * lat, yaw: 0 });
  }
  if (sc.snowmen) {
    let placed = 0;
    for (const n of this.notes) {
      if (placed >= sc.snowmen || n.kind !== 'corner') continue;
      const side = n.dir === 'L' ? 1 : -1, i = (n.mid + 18) % N, lat = side * (this.W[i] + 3.2);
      this.props.push({ kind: 'snowman', x: this.X[i] + this.RX[i] * lat, z: this.Z[i] + this.RZ[i] * lat, yaw: this.HD[i] + Math.PI });
      placed++;
    }
  }

  // trees, cacti, rocks, mesas
  const occ = new Set(), oc = 3.2, okey = (x, z) => Math.floor(x / oc) * 100003 + Math.floor(z / oc);
  const free = (x, z) => !exclude.some(e => (x - e.x) ** 2 + (z - e.z) ** 2 < e.r * e.r);
  const place = (list, count, clear, opts) => {
    let tries = 0, made = 0;
    while (made < count && tries++ < count * 14) {
      const x = this.minX + 20 + rnd() * (this.maxX - this.minX - 40), z = this.minZ + 20 + rnd() * (this.maxZ - this.minZ - 40);
      if (opts.cluster && (this.noise(x / 75 + 9, z / 75 - 3) * 0.5 + 0.55) < rnd()) continue;
      if (opts.accept && !opts.accept(x, z, rnd)) continue;
      const rd = roadDist(x, z, clear + 14);
      if (rd.i >= 0 && rd.d < this.W[rd.i] + clear) continue;
      if (!free(x, z)) continue;
      const y = this.terrainH(x, z);
      if (inWater(x, z, y) || slope(x, z) > (opts.maxSlope || 0.8)) continue;
      const k = okey(x, z); if (occ.has(k)) continue; occ.add(k);
      const s = opts.scale[0] + rnd() * (opts.scale[1] - opts.scale[0]);
      list.push({ x, z, y, s, rot: rnd() * TAU, v: Math.floor(rnd() * (opts.variants || 3)) });
      if (opts.hit) this.obstacles.push({ x, z, r: opts.hit * s, top: y + (opts.top || 4) * s });
      made++;
    }
  };
  if (sc.mesas) {
    let tries = 0;
    while (this.mesas.length < sc.mesas && tries++ < 400) {
      const x = this.minX + 30 + rnd() * (this.maxX - this.minX - 60), z = this.minZ + 30 + rnd() * (this.maxZ - this.minZ - 60);
      const r = 10 + rnd() * 16, rd = roadDist(x, z, r + 40);
      if (rd.i >= 0 && rd.d < this.W[rd.i] + r + 14) continue;
      if (this.mesas.some(m => Math.hypot(m.x - x, m.z - z) < m.r + r + 10)) continue;
      let lo = Infinity; for (let a = 0; a < 6; a++) lo = Math.min(lo, this.terrainH(x + Math.cos(a) * r, z + Math.sin(a) * r));
      const m = { x, z, y: lo - 2, r, h: 16 + rnd() * 30, rot: rnd() * TAU };
      this.mesas.push(m);
      this.obstacles.push({ x, z, r: r * 0.92, top: m.y + m.h });
      exclude.push({ x, z, r: r + 2 });
    }
  }
  place(this.trees, sc.trees, 6.5, { cluster: true, scale: [0.75, 1.55], hit: 0.42, top: 9, variants: T.theme === 'forest' ? 4 : 3 });
  if (sc.palms) {
    const sea = T.sea;
    place(this.palms, sc.palms, 6, { cluster: false, scale: [0.85, 1.35], hit: 0.34, top: 8, variants: 2,
      accept: (x, z, r) => !sea || r() < 0.25 + 0.75 * smoothstep(sea.start - 170, sea.start - 10, x * sea.dir[0] + z * sea.dir[1]) });
  }
  if (T.theme !== 'snow') place(this.bushes, T.theme === 'desert' ? 260 : 420, 3.6, { cluster: true, scale: [0.55, 1.3], variants: 2, maxSlope: 1 });
  place(this.cacti, sc.cacti, 5.5, { cluster: false, scale: [0.8, 1.4], hit: 0.38, top: 4 });
  place(this.rocks, sc.rocks, 5.0, { cluster: false, scale: [0.6, 2.2], hit: 0.85, top: 1.4, maxSlope: 1.4 });
  this._obstacleHash();
};

World.prototype._obstacleHash = function () {
  this.ocell = 10; this.ob = new Map();
  this.obstacles.forEach((o, n) => {
    const r = Math.ceil((o.r + 2) / this.ocell);
    const bx = Math.floor(o.x / this.ocell), bz = Math.floor(o.z / this.ocell);
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      const k = this._key(bx + dx, bz + dz); let b = this.ob.get(k); if (!b) this.ob.set(k, b = []); b.push(n);
    }
  });
};
World.prototype.obstaclesNear = function (x, z) {
  return this.ob.get(this._key(Math.floor(x / this.ocell), Math.floor(z / this.ocell))) || [];
};
