/* ============================================================
   The voxel city: a dense grid of materials, meshed into chunks
   that only draw the faces you can see (with soft corner shading),
   and rebuilt a few at a time as things get knocked down.
   ============================================================ */
// [name, colour, value factor, flags]   flags: g = glows, s = glass, f = fuel (explodes)
const MATDEF = [
  null,
  ['concrete', 0xc9c1b6, 1], ['concrete2', 0xa69e94, 1], ['concrete3', 0x7f7972, 1], ['brick', 0xa8553f, 1], ['brick2', 0x8b5843, 1],
  ['cream', 0xe8d8ba, 1], ['glass', 0x557fa6, 1.4, 's'], ['lit', 0xffd27a, 1.4, 'gs'], ['roof', 0x4a4452, 1], ['roofRed', 0xb4493a, 1],
  ['roofTeal', 0x4c7f7b, 1], ['white', 0xf0e9de, 1], ['mint', 0x9ccab9, 1], ['peach', 0xf0b48e, 1], ['towerRed', 0xd9412e, 3],
  ['towerWhite', 0xf3efe8, 3], ['dome', 0xebe6de, 2], ['domeBand', 0x5f86c0, 2], ['bridge', 0x8c8591, 1.5], ['rubble', 0x6e665f, 0],
  ['hedge', 0x4f8a3c, 0.3], ['neonPink', 0xff5fa2, 2, 'g'], ['neonCyan', 0x58e6ff, 2, 'g'], ['tealGlass', 0x5f9fb0, 1.4, 's'], ['gold', 0xe7b44c, 3],
  ['fuel', 0xe9e2d4, 2, 'f'], ['fuelBand', 0xd8412f, 2, 'f'], ['box1', 0xd8642f, 1], ['box2', 0x2f6fb4, 1], ['box3', 0x3d9a5a, 1],
  ['box4', 0xc9a227, 1], ['steel', 0x5d6470, 1], ['crane', 0xe8b52e, 1], ['litWarm', 0xffb35c, 1.4, 'gs'], ['darkGlass', 0x3b4a66, 1.4, 's'],
  ['sign', 0xfff1d0, 1, 'g'], ['pitch', 0x5e9c48, 0.5], ['seat', 0x9a3a4a, 1.5],
  ['rubble2', 0x8a5a48, 0], ['rubble3', 0xa39b90, 0],
];
const M = {}; MATDEF.forEach((d, i) => { if (d) M[d[0]] = i; });
const NM = MATDEF.length, MR = new Float32Array(NM), MG = new Float32Array(NM), MB = new Float32Array(NM);
const MGLOW = new Uint8Array(NM), MGLASS = new Uint8Array(NM), MFUEL = new Uint8Array(NM), MVAL = new Float32Array(NM);
const VOX_VALUE = 100000;   // dollars of damage per block, before the material's factor
MATDEF.forEach((d, i) => {
  if (!d) return; const c = new THREE.Color(d[1]); MR[i] = c.r; MG[i] = c.g; MB[i] = c.b; MVAL[i] = d[2] * VOX_VALUE;
  const f = d[3] || ''; MGLOW[i] = f.includes('g') ? 1 : 0; MGLASS[i] = f.includes('s') ? 1 : 0; MFUEL[i] = f.includes('f') ? 1 : 0;
});
const GN = GW * GH * GD;
const vid = (i, j, k) => (j * GD + k) * GW + i;
const Vox = {
  g: new Uint8Array(GN), b: new Uint16Array(GN), chunks: [], dirty: new Set(), group: null, matSolid: null, matGlow: null, count: 0,
  init(scene) {
    this.group = new THREE.Group(); scene.add(this.group);
    this.matSolid = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.matGlow = new THREE.MeshBasicMaterial({ vertexColors: true });
  },
  clear() { this.g.fill(0); this.b.fill(0); this.count = 0; },
  get(i, j, k) { if (i < 0 || k < 0 || i >= GW || k >= GD || j < 0 || j >= GH) return 0; return this.g[vid(i, j, k)]; },
  set(i, j, k, m, b = 0) {
    if (i < 0 || k < 0 || i >= GW || k >= GD || j < 0 || j >= GH) return;
    const n = vid(i, j, k); if (!this.g[n] && m) this.count++; else if (this.g[n] && !m) this.count--;
    this.g[n] = m; this.b[n] = m ? b : 0;
  },
  solidAt(x, y, z) { return this.get(Math.floor(x - OX), Math.floor(y), Math.floor(z - OZ)) > 0; },
  topAt(i, k) { for (let j = GH - 1; j >= 0; j--) if (this.g[vid(i, j, k)]) return j + 1; return 0; },
  markDirty(i, j, k) {
    const cx = i >> 4, cy = j >> 4, cz = k >> 4, add = (x, y, z) => { if (x >= 0 && y >= 0 && z >= 0 && x < GW / CS && y < GH / CS && z < GD / CS) this.dirty.add((y * (GD / CS) + z) * (GW / CS) + x); };
    add(cx, cy, cz);
    const li = i & 15, lj = j & 15, lk = k & 15;
    if (li === 0) add(cx - 1, cy, cz); if (li === 15) add(cx + 1, cy, cz);
    if (lj === 0) add(cx, cy - 1, cz); if (lj === 15) add(cx, cy + 1, cz);
    if (lk === 0) add(cx, cy, cz - 1); if (lk === 15) add(cx, cy, cz + 1);
  },
  buildAll() { const nx = GW / CS, ny = GH / CS, nz = GD / CS; for (let y = 0; y < ny; y++) for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) this.buildChunk(x, y, z); this.dirty.clear(); },
  /* rebuild the chunks that changed, a few per frame (all of them when asked) */
  flush(budgetMs = 6) {
    if (!this.dirty.size) return 0;
    const t0 = performance.now(), nx = GW / CS, nz = GD / CS; let n = 0;
    for (const key of this.dirty) {
      this.dirty.delete(key); const x = key % nx, z = Math.floor(key / nx) % nz, y = Math.floor(key / (nx * nz));
      this.buildChunk(x, y, z); n++;
      if (performance.now() - t0 > budgetMs) break;
    }
    return n;
  },
  buildChunk(cx, cy, cz) {
    const key = (cy * (GD / CS) + cz) * (GW / CS) + cx, i0 = cx * CS, j0 = cy * CS, k0 = cz * CS;
    const g = this.g, get = (i, j, k) => (i < 0 || k < 0 || i >= GW || k >= GD || j >= GH) ? 0 : j < 0 ? 255 : g[(j * GD + k) * GW + i];
    const res = Mesher.region(get, i0, j0, k0, i0 + CS, j0 + CS, k0 + CS, OX, 0, OZ, true);
    const ch = this.chunks[key] || (this.chunks[key] = { solid: null, glow: null });
    ch.solid = this.setMesh(ch.solid, res.solid, this.matSolid);
    ch.glow = this.setMesh(ch.glow, res.glow, this.matGlow);
  },
  setMesh(mesh, data, mat) {
    if (!data) { if (mesh) mesh.visible = false; return mesh; }
    const geo = Mesher.geometry(data);
    if (!mesh) { mesh = new THREE.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; this.group.add(mesh); }
    else { mesh.geometry.dispose(); mesh.geometry = geo; mesh.visible = true; }
    return mesh;
  },
};
/* Face meshing with ambient occlusion, shared by the city chunks and the falling buildings. */
const Mesher = {
  faces: null, cap: 0, buf: null,
  init() {
    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    this.faces = dirs.map(n => {
      const a = n.findIndex(v => v !== 0), s = n[a], u = (a + 1) % 3, v = (a + 2) % 3;
      let cs = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([cu, cv]) => { const p = [0, 0, 0]; p[a] = s > 0 ? 1 : 0; p[u] = cu; p[v] = cv; return { p, cu, cv }; });
      const cr = cross(sub(cs[1].p, cs[0].p), sub(cs[2].p, cs[0].p));
      if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) cs = [cs[0], cs[3], cs[2], cs[1]];
      return { n, a, u, v, cs };
    });
    this.grow(30000);
  },
  grow(faces) {
    this.cap = faces;
    const mk = () => ({ pos: new Float32Array(faces * 12), nor: new Float32Array(faces * 12), col: new Float32Array(faces * 12), idx: new Uint32Array(faces * 6), n: 0 });
    this.buf = { solid: mk(), glow: mk() };
  },
  /* get(i,j,k) -> material (0 empty); emits faces of cells in [i0,i1)x[j0,j1)x[k0,k1); vertex = cell + (ox, oy, oz) */
  region(get, i0, j0, k0, i1, j1, k1, ox, oy, oz, ground) {
    const B = this.buf; B.solid.n = 0; B.glow.n = 0; const F = this.faces, AO = [0.5, 0.68, 0.84, 1];
    for (let j = j0; j < j1; j++) for (let k = k0; k < k1; k++) for (let i = i0; i < i1; i++) {
      const m = get(i, j, k); if (!m || m === 255) continue;
      const h = ((i * 73856093) ^ (j * 19349663) ^ (k * 83492791)) >>> 0, varr = 0.93 + (h % 1000) / 1000 * 0.1;
      const glow = MGLOW[m], T = glow ? B.glow : B.solid;
      for (let f = 0; f < 6; f++) {
        const F0 = F[f], n = F0.n, ni = i + n[0], nj = j + n[1], nk = k + n[2], nb = get(ni, nj, nk);
        if (nb) continue;   // only faces that touch air get drawn (255 is the ground under the city)
        if (T.n >= this.cap) { this.grow(this.cap * 2); return this.region(get, i0, j0, k0, i1, j1, k1, ox, oy, oz, ground); }
        const q = T.n++, b4 = q * 4, pos = T.pos, nor = T.nor, col = T.col, ao = [0, 0, 0, 0];
        for (let c = 0; c < 4; c++) {
          const C = F0.cs[c], du = C.cu ? 1 : -1, dv = C.cv ? 1 : -1;
          const s1 = [ni, nj, nk], s2 = [ni, nj, nk], s3 = [ni, nj, nk];
          s1[F0.u] += du; s2[F0.v] += dv; s3[F0.u] += du; s3[F0.v] += dv;
          const a1 = get(s1[0], s1[1], s1[2]) ? 1 : 0, a2 = get(s2[0], s2[1], s2[2]) ? 1 : 0, a3 = get(s3[0], s3[1], s3[2]) ? 1 : 0;
          ao[c] = glow ? 3 : (a1 && a2 ? 0 : 3 - a1 - a2 - a3);
          const v = (b4 + c) * 3;
          pos[v] = i + C.p[0] + ox; pos[v + 1] = j + C.p[1] + oy; pos[v + 2] = k + C.p[2] + oz;
          nor[v] = n[0]; nor[v + 1] = n[1]; nor[v + 2] = n[2];
          const l = AO[ao[c]] * varr;
          col[v] = MR[m] * l; col[v + 1] = MG[m] * l; col[v + 2] = MB[m] * l;
        }
        const ix = T.idx, o = q * 6;   // flip the split so the shading doesn't crease the wrong way
        if (ao[0] + ao[2] > ao[1] + ao[3]) { ix[o] = b4; ix[o + 1] = b4 + 1; ix[o + 2] = b4 + 2; ix[o + 3] = b4; ix[o + 4] = b4 + 2; ix[o + 5] = b4 + 3; }
        else { ix[o] = b4 + 1; ix[o + 1] = b4 + 2; ix[o + 2] = b4 + 3; ix[o + 3] = b4 + 1; ix[o + 4] = b4 + 3; ix[o + 5] = b4; }
      }
    }
    const out = (T) => T.n ? { pos: T.pos.slice(0, T.n * 12), nor: T.nor.slice(0, T.n * 12), col: T.col.slice(0, T.n * 12), idx: T.idx.slice(0, T.n * 6) } : null;
    return { solid: out(B.solid), glow: out(B.glow) };
  },
  geometry(d) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(d.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(d.nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(d.col, 3));
    const nv = d.pos.length / 3; g.setIndex(new THREE.BufferAttribute(nv > 65535 ? d.idx : Uint16Array.from(d.idx), 1));
    g.computeBoundingSphere(); return g;
  },
};
