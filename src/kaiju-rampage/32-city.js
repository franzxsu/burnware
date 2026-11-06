/* ============================================================
   The city plan: houses on the edge, shops by the water, offices,
   glass towers around Ember Tower in the middle, a domed stadium,
   a park, docks with a crane, a fuel depot and two bridges.
   Every building is a hollow shell with a floor every 4 levels,
   so a hole shows the floors inside and a building can fall.
   ============================================================ */
const City = {
  list: [null],
  add(kind, name, x0, z0, w, d, th = 0.34) {
    const B = { id: this.list.length, kind, name, x0, z0, w, d, h: 0, lv: new Int16Array(GH), orig: new Int16Array(GH), alive: 0, total: 0, value: 0, state: 'up', th, mats: [], lost: [0, 0, 0], bi0: 1e9, bi1: -1, bk0: 1e9, bk1: -1 };
    this.list.push(B); return B;
  },
  put(B, i, j, k, m) {
    if (i < 0 || k < 0 || i >= GW || k >= GD || j < 0 || j >= GH || !m) return;
    if (Vox.get(i, j, k)) return;
    Vox.set(i, j, k, m, B ? B.id : 0);
    if (!B) return;
    B.orig[j]++; B.lv[j]++; B.total++; B.alive++; B.value += MVAL[m]; if (j + 1 > B.h) B.h = j + 1;
    if (i < B.bi0) B.bi0 = i; if (i > B.bi1) B.bi1 = i; if (k < B.bk0) B.bk0 = k; if (k > B.bk1) B.bk1 = k;
    if (!B.mats.includes(m)) B.mats.push(m);
  },
  box(B, i0, j0, k0, w, h, d, m) { for (let j = j0; j < j0 + h; j++) for (let k = k0; k < k0 + d; k++) for (let i = i0; i < i0 + w; i++) this.put(B, i, j, k, m); },
  hash(a, b, c, d) { let x = (a * 374761393 + b * 668265263 + c * 2147483647 + d * 1274126177) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; },
  /* a hollow building. look(face, col, cols, j) picks the wall material for each outside cell */
  shell(B, h, look, slab, roof) {
    const { x0, z0, w, d } = B;
    for (let j = 0; j < h; j++) {
      const floorLevel = j % 4 === 3 || j === h - 1;
      for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) {
        const ex = dx === 0 || dx === w - 1, ez = dz === 0 || dz === d - 1;
        if (!ex && !ez) { if (floorLevel) this.put(B, x0 + dx, j, z0 + dz, j === h - 1 ? roof : slab); continue; }
        const corner = ex && ez, face = dz === 0 ? 0 : dz === d - 1 ? 1 : dx === 0 ? 2 : 3, col = ez ? dx : dz, cols = ez ? w : d;
        this.put(B, x0 + dx, j, z0 + dz, corner ? look(-1, col, cols, j) : look(face, col, cols, j));
      }
    }
  },
  generate(seed = 1998) {
    Vox.clear(); this.list = [null]; Trees.list = [];
    const R = mulberry(seed);
    for (let bz = 0; bz < 7; bz++) for (let bx = 0; bx < 7; bx++) {
      const kind = blockKind(bx, bz), i0 = bx * PER + ST, k0 = bz * PER + ST;
      if (kind === 'river') continue;
      ({ houses: () => this.houses(i0, k0, R), shops: () => this.shops(i0, k0, R, bz === 6), mid: () => this.mids(i0, k0, R), towers: () => this.towers(i0, k0, R),
        kubo: () => this.emberTower(i0, k0), stadium: () => this.stadium(i0, k0), park: () => this.park(i0, k0, R), docks: () => this.docks(i0, k0, R, bx), fuel: () => this.fuelDepot(i0, k0) })[kind]();
      if (kind === 'mid' || kind === 'towers' || kind === 'shops') for (let s = 2; s < 14; s += 4) { Trees.add(OX + i0 + s + 0.5, OZ + k0 + 0.5, 0.8); Trees.add(OX + i0 + s + 0.5, OZ + k0 + 13.5, 0.8); }
    }
    for (const bz of BRIDGES) this.bridge(bz * PER);
    Trees.build();
  },
  window(B, face, col, fl, p) { return this.hash(B.id, face, col, fl) < p; },
  houses(i0, k0, R) {
    const walls = [M.white, M.cream, M.mint, M.peach, M.white], roofs = [M.roofRed, M.roofTeal, M.roofRed, M.brick2];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
      const lx = i0 + 1 + a * 4, lz = k0 + 1 + b * 4;
      if (R() < 0.18) { Trees.add(OX + lx + 2, OZ + lz + 2, 1 + R() * 0.3); continue; }
      const w = R() < 0.5 ? 4 : 3, d = R() < 0.5 ? 4 : 3, hw = R() < 0.3 ? 4 : 3, wall = pick2(walls, R), roof = pick2(roofs, R);
      const B = this.add('house', 'house', lx + (4 - w >> 1), lz + (4 - d >> 1), w, d, 0.4);
      this.shell(B, hw, (face, col, cols, j) => face < 0 ? wall : j === 1 && col % 2 === 1 && col < cols - 1 ? (this.window(B, face, col, 0, 0.55) ? M.lit : M.glass) : j === 0 && face === 0 && col === 1 ? M.roof : wall, wall, wall);
      for (let t = 0; ; t++) {   // a hipped roof
        const x0 = B.x0 + t, z0 = B.z0 + t, w2 = w - t * 2, d2 = d - t * 2; if (w2 <= 0 || d2 <= 0) break;
        this.box(B, x0, hw + t, z0, w2, 1, d2, roof); if (w2 <= 1 || d2 <= 1) break;
      }
    }
  },
  shops(i0, k0, R, waterfront) {
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
      const w = 5 + Math.floor(R() * 2), d = 5 + Math.floor(R() * 2), h = 4 + Math.floor(R() * 3), wall = pick2([M.brick, M.cream, M.concrete, M.peach], R), neon = R() < 0.5 ? M.neonPink : M.neonCyan;
      const B = this.add('shop', 'shop', i0 + 1 + a * 6 + (6 - w), k0 + 1 + b * 6 + (6 - d), w, d);
      const front = b === 0 ? 0 : 1;
      this.shell(B, h, (face, col, cols, j) => {
        if (face < 0) return wall;
        if (j === 0) return face === front && col > 0 && col < cols - 1 ? M.litWarm : wall;
        if (j === 2 && face === front && col > 0 && col < cols - 1) return neon;
        return (j === 1 || j === 3 || j === 5) && col % 2 === 1 && col < cols - 1 ? (this.window(B, face, col, j, 0.4) ? M.lit : M.glass) : wall;
      }, M.concrete2, M.roof);
    }
  },
  office(i0, k0, w, d, h, R, name = 'office block') {
    const B = this.add('office', name, i0, k0, w, d), wall = pick2([M.concrete, M.concrete2, M.brick, M.cream, M.brick2], R), glass = pick2([M.glass, M.darkGlass, M.tealGlass], R), p = 0.22 + R() * 0.2;
    this.shell(B, h, (face, col, cols, j) => {
      if (face < 0 || j % 4 === 3 || j % 4 === 0) return wall;
      return col % 2 === 1 && col < cols - 1 ? (this.window(B, face, col, j >> 2, p) ? M.lit : glass) : wall;
    }, M.concrete2, M.roof);
    if (R() < 0.6) this.box(B, i0 + 1 + Math.floor(R() * (w - 3)), h, k0 + 1 + Math.floor(R() * (d - 3)), 2, 1, 2, M.concrete3);   // a rooftop box
    if (R() < 0.35) this.box(B, i0 + w - 3, h, k0 + 1, 2, 2, 2, M.steel);
    return B;
  },
  mids(i0, k0, R) {
    if (R() < 0.25) { this.office(i0 + 1, k0 + 3, 12, 7, 8 + Math.floor(R() * 6), R, 'apartment block'); return; }
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
      const w = 5 + Math.floor(R() * 2), d = 5 + Math.floor(R() * 2), h = 8 + Math.floor(R() * 8);
      this.office(i0 + 1 + a * 6 + (a ? 6 - w : 0), k0 + 1 + b * 6 + (b ? 6 - d : 0), w, d, h, R, R() < 0.5 ? 'office block' : 'apartment block');
    }
  },
  tower(i0, k0, w, d, h, R) {
    const B = this.add('tower', 'skyscraper', i0, k0, w, d, 0.3), glass = pick2([M.tealGlass, M.darkGlass, M.glass], R), frame = pick2([M.concrete, M.white, M.concrete3], R), p = 0.18 + R() * 0.16;
    this.shell(B, h, (face, col, cols, j) => {
      if (face < 0 || j % 4 === 3) return frame;
      if (col % 3 === 0) return frame;
      return this.window(B, face, col, j >> 2, p) ? M.lit : glass;
    }, M.concrete2, M.roof);
    const crown = R();
    if (crown < 0.35) { this.box(B, i0 + 1, h, k0 + 1, w - 2, 1, d - 2, frame); this.box(B, i0 + 2, h + 1, k0 + 2, w - 4, 1, d - 4, M.gold); }
    else if (crown < 0.7) { const cx = i0 + (w >> 1), cz = k0 + (d >> 1); this.box(B, cx, h, cz, 1, 5, 1, M.steel); this.put(B, cx, h + 5, cz, M.neonPink); }
    else this.box(B, i0 + 2, h, k0 + 2, w - 4, 2, d - 4, M.concrete3);
    return B;
  },
  towers(i0, k0, R) {
    if (R() < 0.55) { const w = 9 + Math.floor(R() * 3), d = 9 + Math.floor(R() * 3); this.tower(i0 + 1 + ((12 - w) >> 1), k0 + 1 + ((12 - d) >> 1), w, d, 18 + Math.floor(R() * 10), R); }
    else { this.tower(i0 + 1, k0 + 1, 5, 12, 16 + Math.floor(R() * 10), R); this.tower(i0 + 8, k0 + 1, 5, 12, 14 + Math.floor(R() * 10), R); }
  },
  /* Ember Tower: a red and white lattice tower with a lit deck, the tallest thing in town */
  emberTower(i0, k0) {
    const B = this.add('landmark', 'Ember Tower', i0, k0, 14, 14, 0.42), c = i0 + 7, cz = k0 + 7, TOP = 52;
    for (let j = 0; j < TOP; j++) {
      const t = Math.min(1, j / 30), hw = j < 31 ? Math.round(6 - 4 * (t * t * (3 - 2 * t))) : j < 44 ? 2 : 1, band = Math.floor(j / 4) % 2 ? M.towerWhite : M.towerRed;
      const lo = c - hw, hi = c + hw - 1, leg = j < 8 ? 2 : 1;
      for (const [x, z] of [[lo, cz - hw], [hi, cz - hw], [lo, cz + hw - 1], [hi, cz + hw - 1]]) {
        const sx = x === lo ? 1 : -1, sz = z === cz - hw ? 1 : -1;
        for (let a = 0; a < leg; a++) for (let b = 0; b < leg; b++) this.put(B, x + a * sx, j, z + b * sz, band);
      }
      if (j % 6 === 5 || j === 30 || j === 43) for (let x = lo; x <= hi; x++) for (const z of [cz - hw, cz + hw - 1]) { this.put(B, x, j, z, band); this.put(B, z - cz + c, j, x - c + cz, band); }
      if (j < 30 && j % 6 < 5) {   // diagonal braces on each face
        const s = j % 6, ph = Math.round((s / 5) * (hi - lo));
        for (const z of [cz - hw, cz + hw - 1]) { this.put(B, lo + ph, j, z, band); this.put(B, hi - ph, j, z, band); }
        for (const x of [lo, hi]) { this.put(B, x, j, cz - hw + ph, band); this.put(B, x, j, cz + hw - 1 - ph, band); }
      }
    }
    for (let j = 24; j < 28; j++) for (let x = c - 4; x < c + 4; x++) for (let z = cz - 4; z < cz + 4; z++) {   // the observation deck
      const edge = x === c - 4 || x === c + 3 || z === cz - 4 || z === cz + 3;
      if (j === 24 || j === 27) this.put(B, x, j, z, M.towerWhite); else if (edge) this.put(B, x, j, z, (x + z) % 2 ? M.lit : M.towerWhite);
    }
    this.put(B, c, TOP, cz, M.neonPink);
    for (let x = c - 1; x <= c; x++) for (let z = cz - 1; z <= cz; z++) for (let j = 31; j < 44; j++) this.put(B, x, j, z, j % 4 < 2 ? M.towerRed : M.towerWhite);
  },
  stadium(i0, k0) {
    const B = this.add('landmark', 'Ember Dome', i0, k0, 14, 14, 0.38), cx = i0 + 7, cz = k0 + 7, R0 = 6.6;
    for (let k = k0; k < k0 + 14; k++) for (let i = i0; i < i0 + 14; i++) {
      const dx = i + 0.5 - cx, dz = k + 0.5 - cz, r = Math.hypot(dx, dz);
      if (r > R0 + 0.3) continue;
      if (r > R0 - 0.9) { for (let j = 0; j < 4; j++) this.put(B, i, j, k, j === 3 ? M.domeBand : (j === 1 && (i + k) % 3 === 0 ? M.lit : M.dome)); }
      else if (r > R0 - 2.2) this.put(B, i, 0, k, M.seat);
      else this.put(B, i, 0, k, M.pitch);
      for (let j = 4; j < 4 + R0; j++) { const rr = Math.hypot(dx, j - 3.5, dz); if (rr <= R0 + 0.3 && rr > R0 - 0.75) this.put(B, i, j, k, j === 6 ? M.domeBand : M.dome); }
    }
  },
  park(i0, k0, R) {
    const B = this.add('park', 'park', i0, k0, 14, 14, 0);
    for (let s = 0; s < 14; s++) for (const [i, k] of [[i0 + s, k0], [i0 + s, k0 + 13], [i0, k0 + s], [i0 + 13, k0 + s]]) if (s !== 6 && s !== 7) this.put(B, i, 0, k, M.hedge);
    for (let n = 0; n < 22; n++) { const x = i0 + 1.5 + R() * 11, z = k0 + 1.5 + R() * 11; if (Math.abs(x - i0 - 7) < 1.2 || Math.abs(z - k0 - 7) < 1.2) continue; if (Math.hypot(x - i0 - 3.8, z - k0 - 10) < 3) continue; Trees.add(OX + x, OZ + z, 0.9 + R() * 0.5); }
  },
  docks(i0, k0, R, bx) {
    const cols = [M.box1, M.box2, M.box3, M.box4];
    for (let row = 0; row < 3; row++) for (let a = 0; a < 2; a++) {
      const x = i0 + 1 + a * 7, z = k0 + 1 + row * 4, n = 1 + Math.floor(R() * 3), B = this.add('cargo', 'container stack', x, z, 6, 2, 0.4);
      for (let s = 0; s < n; s++) { const m = pick2(cols, R); this.box(B, x, s * 2, z, 6, 2, 2, m); }
    }
    if (bx === 1) {   // a gantry crane over the water
      const B = this.add('crane', 'gantry crane', i0 + 2, k0 + 12, 10, 2, 0.5);
      for (const x of [i0 + 2, i0 + 11]) this.box(B, x, 0, k0 + 12, 1, 14, 1, M.crane);
      this.box(B, i0 + 2, 14, k0 + 12, 10, 1, 1, M.crane); this.box(B, i0 + 6, 13, k0 + 13, 2, 2, 1, M.steel);
      for (let z = k0 + 13; z < GD; z++) this.put(B, i0 + 7, 14, z, M.crane);
    }
  },
  fuelDepot(i0, k0) {
    for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const cx = i0 + 3.5 + a * 7, cz = k0 + 3.5 + b * 7, B = this.add('fuel', 'fuel tank', i0 + a * 7, k0 + b * 7, 7, 7, 0.4);
      for (let k = Math.floor(cz - 3); k <= cz + 3; k++) for (let i = Math.floor(cx - 3); i <= cx + 3; i++) {
        const r = Math.hypot(i + 0.5 - cx, k + 0.5 - cz); if (r > 3.1) continue;
        for (let j = 0; j < 5; j++) if (r > 2.1 || j === 4) this.put(B, i, j, k, j === 3 ? M.fuelBand : M.fuel);
      }
    }
  },
  bridge(k0) {
    const B = this.add('bridge', 'bridge', RIV0 - 1, k0, RIV1 - RIV0 + 2, ST, 0.5);
    for (let i = RIV0 - 1; i <= RIV1; i++) for (let k = k0; k < k0 + ST; k++) {
      this.put(B, i, 1, k, M.bridge);
      if (k === k0 || k === k0 + ST - 1) this.put(B, i, 2, k, i % 2 ? M.concrete : M.bridge);
      if (i === RIV0 + 3 || i === RIV0 + 4 || i === RIV1 - 5 || i === RIV1 - 4) this.put(B, i, 0, k, M.concrete3);
    }
  },
};
function pick2(a, R) { return a[Math.floor(R() * a.length)]; }
