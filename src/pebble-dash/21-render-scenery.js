/* ============================================================
   Rendering: trees, palms, bushes, rocks, cacti, mesas, crowd,
   gantry, tape, lighthouse and knock-over props
   ============================================================ */
R.treeGeo = function (kind) {
  const P = [];
  const trunk = [0.42, 0.29, 0.17];
  if (kind === 'round') {
    P.push({ g: new THREE.CylinderGeometry(0.16, 0.24, 2.2, 5), m: R.M(0, 1.1, 0), color: trunk });
    P.push({ g: new THREE.IcosahedronGeometry(1.7, 0), m: R.M(0, 3.1, 0, 0, 0, 0, 1, 1.15, 1), color: (x, y) => (y > 0.2 ? [0.52, 0.72, 0.28] : [0.40, 0.60, 0.22]) });
    P.push({ g: new THREE.IcosahedronGeometry(1.1, 0), m: R.M(0.6, 4.2, 0.3), color: [0.56, 0.76, 0.3] });
    return R.merge(P);
  }
  if (kind === 'birch') {
    P.push({ g: new THREE.CylinderGeometry(0.12, 0.17, 4.2, 6), m: R.M(0, 2.1, 0), color: (x, y, z) => (R.hash(Math.round(y * 4), Math.round(Math.atan2(z, x) * 2)) > 0.72 ? [0.15, 0.15, 0.15] : [0.93, 0.92, 0.88]) });
    P.push({ g: new THREE.IcosahedronGeometry(1.25, 0), m: R.M(0, 4.4, 0, 0, 0, 0, 1, 1.35, 1), color: (x, y) => (y > 0 ? [0.72, 0.8, 0.32] : [0.6, 0.7, 0.27]) });
    P.push({ g: new THREE.IcosahedronGeometry(0.85, 0), m: R.M(0.45, 3.5, -0.3), color: [0.66, 0.76, 0.3] });
    return R.merge(P);
  }
  if (kind === 'palmA' || kind === 'palmB') {
    const lean = kind === 'palmA' ? 0.09 : -0.07; let x = 0, y = 0;
    for (let k = 0; k < 7; k++) {
      const h = 1.05; x += lean * (k + 1) * 0.5;
      P.push({ g: new THREE.CylinderGeometry(0.17 - k * 0.012, 0.2 - k * 0.012, h, 6), m: R.M(x, y + h / 2, 0, 0, 0, -lean * 1.5), color: k % 2 ? [0.55, 0.42, 0.28] : [0.46, 0.34, 0.22] });
      y += h * 0.98;
    }
    for (let f = 0; f < 7; f++) {
      const a = f / 7 * TAU;
      P.push({ g: new THREE.ConeGeometry(0.32, 2.6, 4), m: R.M(x + Math.cos(a) * 1.05, y - 0.15, Math.sin(a) * 1.05, Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15, 1, 1, 0.35),
        color: (lx, ly) => (ly > 0 ? [0.32, 0.62, 0.25] : [0.22, 0.48, 0.2]) });
    }
    for (let c = 0; c < 3; c++) P.push({ g: new THREE.IcosahedronGeometry(0.15, 0), m: R.M(x + Math.cos(c * 2.1) * 0.25, y - 0.3, Math.sin(c * 2.1) * 0.25), color: [0.3, 0.2, 0.1] });
    return R.merge(P);
  }
  const snowy = kind === 'snowA' || kind === 'snowB';
  const g1 = kind === 'pineB' || kind === 'snowB' ? [0.20, 0.45, 0.24] : [0.15, 0.36, 0.20];
  const g2 = [g1[0] * 1.25, g1[1] * 1.18, g1[2] * 1.2];
  P.push({ g: new THREE.CylinderGeometry(0.17, 0.26, 1.7, 5), m: R.M(0, 0.85, 0), color: trunk });
  [[1.55, 2.5, 2.1], [1.18, 2.1, 3.25], [0.78, 1.7, 4.3]].forEach(([r, h, y], k) => {
    P.push({ g: new THREE.ConeGeometry(r, h, 7), m: R.M(0, y, 0, 0, k * 0.7, 0),
      color: (x, ly) => (snowy && ly > h * 0.05 ? [0.93, 0.96, 1.0] : (ly > 0 ? g2 : g1)) });
  });
  return R.merge(P);
};
R.bushGeo = function (theme, v) {
  const base = theme === 'desert' ? [0.56, 0.52, 0.3] : theme === 'coast' ? [0.36, 0.56, 0.25] : [0.29, 0.47, 0.2];
  const P = [];
  const n = v ? 3 : 2;
  for (let k = 0; k < n; k++) P.push({ g: new THREE.IcosahedronGeometry(0.6 - k * 0.1, 0), m: R.M((k - 0.8) * 0.5, 0.25 + k * 0.05, (k % 2) * 0.3, 0, k, 0, 1, 0.75, 1),
    color: (x, y) => (y > 0 ? [base[0] * 1.15, base[1] * 1.15, base[2] * 1.1] : base) });
  if (theme === 'desert' && v) for (let k = 0; k < 4; k++) P.push({ g: new THREE.ConeGeometry(0.05, 0.8, 3), m: R.M((k - 1.5) * 0.25, 0.5, 0.1, 0, 0, (k - 1.5) * 0.3), color: [0.5, 0.42, 0.28] });
  return R.merge(P);
};
R.cactusGeo = function () {
  const c1 = [0.30, 0.52, 0.27], c2 = [0.36, 0.6, 0.3];
  return R.merge([
    { g: new THREE.CylinderGeometry(0.26, 0.3, 3.2, 6), m: R.M(0, 1.6, 0), color: (x) => (x > 0 ? c2 : c1) },
    { g: new THREE.CylinderGeometry(0.17, 0.17, 0.8, 6), m: R.M(0.5, 1.5, 0, 0, 0, Math.PI / 2), color: c1 },
    { g: new THREE.CylinderGeometry(0.17, 0.17, 1.2, 6), m: R.M(0.85, 2.0, 0), color: c2 },
    { g: new THREE.CylinderGeometry(0.15, 0.15, 0.6, 6), m: R.M(-0.42, 2.0, 0, 0, 0, Math.PI / 2), color: c1 },
    { g: new THREE.CylinderGeometry(0.15, 0.15, 0.9, 6), m: R.M(-0.68, 2.4, 0), color: c2 },
  ]);
};
R.rockGeo = function (seed, base) {
  const jit = (x, y, z) => { const h = R.hash(Math.round(x * 50) + seed, Math.round(y * 50) * 7 + Math.round(z * 50)); return [x * (h - 0.5) * 0.5, y * (h - 0.5) * 0.4, z * (R.hash(h, seed) - 0.5) * 0.5]; };
  return R.merge([{ g: new THREE.IcosahedronGeometry(1, 0), jitter: jit, m: R.M(0, 0.25, 0, 0, 0, 0, 1, 0.7, 1),
    color: (x, y) => { const k = 0.85 + (y + 1) * 0.12; return [base[0] * k, base[1] * k, base[2] * k]; } }]);
};
/* instances spread over the whole stage: r128 culls by the base geometry, so culling must be off */
R.instanced = function (scene, geo, list, place, shadow = true, mat) {
  if (!list.length) return null;
  const mesh = new THREE.InstancedMesh(geo, mat || R.flatMat(), list.length);
  const d = new THREE.Object3D();
  list.forEach((t, k) => { place(d, t); d.updateMatrix(); mesh.setMatrixAt(k, d.matrix); });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = shadow; mesh.receiveShadow = false; mesh.frustumCulled = false;
  scene.add(mesh);
  return mesh;
};
R.label = function (text, w, h, bg, fg, font) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  const sq = h / 4;
  for (let i = 0; i < w / sq; i++) { x.fillStyle = (i & 1) ? '#111' : '#f4f4f4'; x.fillRect(i * sq, 0, sq, sq / 2); x.fillStyle = (i & 1) ? '#f4f4f4' : '#111'; x.fillRect(i * sq, h - sq / 2, sq, sq / 2); }
  x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  return t;
};
R.chevronTex = function () {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#d42a1e'; x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#ffffff';
  for (let k = 0; k < 3; k++) { const ox = 40 + k * 70; x.beginPath(); x.moveTo(ox, 64); x.lineTo(ox + 44, 16); x.lineTo(ox + 70, 16); x.lineTo(ox + 26, 64); x.lineTo(ox + 70, 112); x.lineTo(ox + 44, 112); x.closePath(); x.fill(); }
  x.strokeStyle = '#111'; x.lineWidth = 8; x.strokeRect(4, 4, 248, 120);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
};

function buildScenery(W, scene, th) {
  const out = { objects: [] };
  const keep = (o) => { if (o) out.objects.push(o); return o; };
  const theme = W.T.theme;
  th = th || W.th;
  const kinds = theme === 'snow' ? ['snowA', 'snowB', 'snowA', 'snowB'] : ['pineA', 'pineB', 'round', 'birch'];
  for (let v = 0; v < 4; v++) {
    const list = W.trees.filter(t => t.v === v); if (!list.length) continue;
    keep(R.instanced(scene, R.treeGeo(kinds[v]), list, (d, t) => { d.position.set(t.x, t.y - 0.25, t.z); d.rotation.set(0, t.rot, 0); d.scale.setScalar(t.s); }));
  }
  for (let v = 0; v < 2; v++) {
    keep(R.instanced(scene, R.treeGeo(v ? 'palmB' : 'palmA'), W.palms.filter(t => t.v === v), (d, t) => { d.position.set(t.x, t.y - 0.2, t.z); d.rotation.set(0, t.rot, 0); d.scale.setScalar(t.s); }));
    keep(R.instanced(scene, R.bushGeo(theme, v), W.bushes.filter(t => t.v === v), (d, t) => { d.position.set(t.x, t.y - 0.1, t.z); d.rotation.set(0, t.rot, 0); d.scale.setScalar(t.s); }, false));
  }
  keep(R.instanced(scene, R.cactusGeo(), W.cacti, (d, t) => { d.position.set(t.x, t.y - 0.2, t.z); d.rotation.set(0, t.rot, 0); d.scale.setScalar(t.s); }));
  const rb = W.th.cliff;
  for (let v = 0; v < 3; v++) {
    keep(R.instanced(scene, R.rockGeo(v * 13 + 1, rb), W.rocks.filter(t => t.v === v), (d, t) => { d.position.set(t.x, t.y - 0.15 * t.s, t.z); d.rotation.set(0, t.rot, 0); d.scale.set(t.s * 1.1, t.s * 0.9, t.s); }));
  }
  for (const m of W.mesas) {
    const bands = [[0.70, 0.33, 0.19], [0.80, 0.44, 0.25], [0.64, 0.29, 0.17], [0.86, 0.55, 0.33]];
    const seed = m.r * 13.7;
    const g = R.merge([{ g: new THREE.CylinderGeometry(m.r * 0.78, m.r, m.h, 8, 5),
      jitter: (x, y, z) => { const a = Math.atan2(z, x), j = (R.hash(Math.round(a * 10) + seed, Math.round(y)) - 0.5) * m.r * 0.18; const l = Math.hypot(x, z) || 1; return [x / l * j, 0, z / l * j]; },
      color: (x, y) => (y > m.h / 2 - 0.1 ? [0.82, 0.52, 0.32] : bands[Math.max(0, Math.floor((y + m.h / 2) / (m.h / 5))) % 4]) }]);
    const mesh = new THREE.Mesh(g, R.flatMat()); mesh.position.set(m.x, m.y + m.h / 2, m.z); mesh.rotation.y = m.rot;
    mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh); keep(mesh);
  }
  // crowd tape: posts with a red and white ribbon
  if (W.tape.length) {
    const P = [];
    for (const line of W.tape) {
      line.forEach((p, k) => {
        P.push({ g: new THREE.BoxGeometry(0.07, 1.1, 0.07), m: R.M(p.x, p.y + 0.55, p.z), color: [0.25, 0.25, 0.27] });
        if (k) {
          const q = line[k - 1], dx = p.x - q.x, dz = p.z - q.z, len = Math.hypot(dx, dz);
          P.push({ g: new THREE.BoxGeometry(0.03, 0.09, len), m: R.M((p.x + q.x) / 2, (p.y + q.y) / 2 + 0.95, (p.z + q.z) / 2, 0, Math.atan2(dx, dz), 0), color: k % 2 ? [0.95, 0.95, 0.95] : [0.85, 0.12, 0.1] });
        }
      });
    }
    const tm = new THREE.Mesh(R.merge(P), R.flatMat()); scene.add(tm); keep(tm);
  }
  // lighthouse landmark on the coast
  const lm = W.T.landmark;
  if (lm && lm.type === 'lighthouse') {
    const y0 = W.terrainH(lm.x, lm.z) - 0.5;
    const P = [
      { g: new THREE.CylinderGeometry(1.5, 2.3, 18, 10, 6), m: R.M(0, 9, 0), color: (x, y) => (Math.floor((y + 9) / 3) % 2 ? [0.86, 0.16, 0.12] : [0.96, 0.95, 0.92]) },
      { g: new THREE.CylinderGeometry(2.4, 2.4, 0.35, 10), m: R.M(0, 18.2, 0), color: [0.2, 0.2, 0.22] },
      { g: new THREE.CylinderGeometry(1.2, 1.2, 1.9, 10), m: R.M(0, 19.3, 0), color: [0.95, 0.88, 0.55] },
      { g: new THREE.ConeGeometry(1.7, 1.6, 10), m: R.M(0, 21.0, 0), color: [0.75, 0.13, 0.1] },
      { g: new THREE.BoxGeometry(5, 3.2, 4), m: R.M(3.2, 1.6, 0), color: [0.95, 0.94, 0.9] },
      { g: new THREE.BoxGeometry(5.4, 0.4, 4.4), m: R.M(3.2, 3.3, 0), color: [0.6, 0.18, 0.14] },
    ];
    const mesh = new THREE.Mesh(R.merge(P), R.flatMat()); mesh.position.set(lm.x, y0, lm.z); mesh.castShadow = true; scene.add(mesh); keep(mesh);
    W.obstacles.push({ x: lm.x, z: lm.z, r: 2.4, top: y0 + 22 }); W._obstacleHash();
    if (th && th.night) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1b0 }));
      lamp.position.set(lm.x, y0 + 19.3, lm.z); scene.add(lamp); keep(lamp);
      const beam = new THREE.Mesh(new THREE.ConeGeometry(9, 70, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      beam.rotation.z = Math.PI / 2; beam.position.set(35, 0, 0);
      const pivot = new THREE.Group(); pivot.position.set(lm.x, y0 + 19.3, lm.z); pivot.add(beam); scene.add(pivot); keep(pivot);
      out.beam = pivot;
    }
  }
  // start gantry
  {
    const gnt = W.gantry, grp = new THREE.Group();
    const postM = new THREE.MeshLambertMaterial({ color: 0x2a2f3a });
    for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.45, 6.4, 0.45), postM); p.position.set(sd * gnt.half, 3.2, 0); p.castShadow = true; grp.add(p); }
    let tex = null;
    if (typeof document !== 'undefined') tex = R.label('PEBBLE DASH', 1024, 128, '#ffd23a', '#16181d', 'bold 64px "Bungee", "Arial Black", sans-serif');
    const fm = new THREE.MeshLambertMaterial({ color: 0xffffff, map: tex, emissive: th && th.night ? 0x403010 : 0x000000 }), sm = new THREE.MeshLambertMaterial({ color: 0xffd23a });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(gnt.half * 2 + 0.9, 1.5, 0.35), [sm, sm, sm, sm, fm, fm]);
    beam.position.y = 5.7; beam.castShadow = true; grp.add(beam);
    const fl = new THREE.MeshLambertMaterial({ color: 0xff5a1f, side: THREE.DoubleSide });
    for (const sd of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), fl); f.position.set(sd * gnt.half, 7.1, 0.5); f.rotation.y = Math.PI / 2; grp.add(f); }
    if (th && th.night) for (const sd of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff4d0 })); l.position.set(sd * (gnt.half - 1), 4.85, 0.3); grp.add(l); }
    grp.position.set(gnt.x, gnt.y, gnt.z); grp.rotation.y = gnt.yaw;
    scene.add(grp); keep(grp); out.gantryTex = tex;
  }
  out.crowd = new Crowd(W, scene); out.objects.push(...out.crowd.meshes);
  out.props = new Props(W, scene);
  return out;
}

class Crowd {
  constructor(W, scene) {
    this.W = W; this.list = W.people; this.meshes = [];
    const shirts = [0xe5432d, 0x2457c5, 0xf2b316, 0x2fbf71, 0xf3f3ee, 0x8b4fd8].map(R.rgb);
    const pants = [[0.18, 0.2, 0.28], [0.28, 0.24, 0.2], [0.16, 0.16, 0.18]];
    this.groups = shirts.map((sc, v) => {
      const mine = this.list.filter(p => p.col === v);
      if (!mine.length) return null;
      const g = R.merge([
        { g: new THREE.BoxGeometry(0.42, 0.62, 0.26), m: R.M(0, 0.31, 0), color: pants[v % 3] },
        { g: new THREE.BoxGeometry(0.52, 0.66, 0.32), m: R.M(0, 0.95, 0), color: sc },
        { g: new THREE.BoxGeometry(0.15, 0.62, 0.16), m: R.M(0.34, 1.0, 0, 0, 0, 0.15), color: sc },
        { g: new THREE.BoxGeometry(0.15, 0.62, 0.16), m: R.M(-0.34, 1.0, 0, 0, 0, -0.15), color: sc },
        { g: new THREE.BoxGeometry(0.3, 0.3, 0.3), m: R.M(0, 1.45, 0), color: v % 2 ? [0.93, 0.76, 0.6] : [0.66, 0.46, 0.32] },
        { g: new THREE.BoxGeometry(0.34, 0.1, 0.34), m: R.M(0, 1.63, 0), color: v % 3 === 0 ? [0.95, 0.95, 0.95] : sc },
      ]);
      const mesh = new THREE.InstancedMesh(g, R.flatMat(), mine.length);
      mesh.castShadow = true; mesh.frustumCulled = false; scene.add(mesh); this.meshes.push(mesh);
      return { mesh, mine };
    }).filter(Boolean);
    this.d = new THREE.Object3D();
    this.update(0, []);
  }
  update(t, cars) {
    const d = this.d;
    for (const gr of this.groups) {
      gr.mine.forEach((p, k) => {
        let near = 1e9, nc = null;
        for (const c of cars) { const dd = (c.pos.x - p.x) ** 2 + (c.pos.z - p.z) ** 2; if (dd < near) { near = dd; nc = c; } }
        const ex = near < 45 * 45 ? 1 : 0;
        p.jump = damp(p.jump, ex, 4, 1 / 60);
        const hop = p.jump * Math.abs(Math.sin(t * 8 + p.ph)) * 0.42 + Math.sin(t * 1.7 + p.ph) * 0.02;
        let yaw = p.yaw;
        if (nc && ex) yaw = Math.atan2(nc.pos.x - p.x, nc.pos.z - p.z);
        d.position.set(p.x, p.y + hop, p.z); d.rotation.set(0, yaw, 0); d.scale.setScalar(1);
        d.updateMatrix(); gr.mesh.setMatrixAt(k, d.matrix);
      });
      gr.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

/* knock-over props: hay bales, tyre stacks, cones, snowmen, chevron boards */
const PROP_DEF = {
  bale: { r: 0.72, h: 0.6, mass: 70 },
  tires: { r: 0.56, h: 0.45, mass: 38 },
  cone: { r: 0.26, h: 0.32, mass: 4 },
  snowman: { r: 0.62, h: 0.9, mass: 45 },
  chevron: { r: 0.32, h: 0.7, mass: 9 },
};
R.propParts = {
  bale: () => [R.merge([{ g: new THREE.CylinderGeometry(0.6, 0.6, 1.25, 9), m: R.M(0, 0, 0, 0, 0, Math.PI / 2), color: (x) => (Math.abs(x) > 0.6 ? [0.74, 0.6, 0.3] : [0.9, 0.77, 0.42]) },
    { g: new THREE.BoxGeometry(0.06, 1.24, 0.06), m: R.M(0.25, 0, 0), color: [0.6, 0.16, 0.12] }, { g: new THREE.BoxGeometry(0.06, 1.24, 0.06), m: R.M(-0.25, 0, 0), color: [0.6, 0.16, 0.12] }])],
  tires: () => [R.merge([0, 1, 2].map(k => ({ g: new THREE.CylinderGeometry(0.5, 0.5, 0.28, 10), m: R.M(0, -0.3 + k * 0.3, 0), color: (x, y) => (k === 1 ? (Math.abs(y) < 0.06 ? [0.9, 0.2, 0.15] : [0.12, 0.12, 0.13]) : [0.13, 0.13, 0.14]) })))],
  cone: () => [R.merge([{ g: new THREE.ConeGeometry(0.22, 0.58, 8), m: R.M(0, 0.02, 0), color: (x, y) => (y > 0.0 && y < 0.12 ? [0.96, 0.96, 0.96] : [1.0, 0.42, 0.08]) },
    { g: new THREE.BoxGeometry(0.46, 0.06, 0.46), m: R.M(0, -0.29, 0), color: [0.95, 0.38, 0.07] }])],
  snowman: () => [R.merge([{ g: new THREE.IcosahedronGeometry(0.55, 1), m: R.M(0, -0.35, 0), color: [0.97, 0.98, 1] },
    { g: new THREE.IcosahedronGeometry(0.4, 1), m: R.M(0, 0.33, 0), color: [0.97, 0.98, 1] },
    { g: new THREE.IcosahedronGeometry(0.28, 1), m: R.M(0, 0.85, 0), color: [0.98, 0.99, 1] },
    { g: new THREE.ConeGeometry(0.06, 0.3, 5), m: R.M(0, 0.85, 0.36, Math.PI / 2, 0, 0), color: [1, 0.5, 0.1] },
    { g: new THREE.BoxGeometry(0.06, 0.06, 0.04), m: R.M(0.1, 0.93, 0.25), color: [0.1, 0.1, 0.1] },
    { g: new THREE.BoxGeometry(0.06, 0.06, 0.04), m: R.M(-0.1, 0.93, 0.25), color: [0.1, 0.1, 0.1] },
    { g: new THREE.CylinderGeometry(0.22, 0.24, 0.3, 8), m: R.M(0, 1.15, 0), color: [0.15, 0.15, 0.18] },
    { g: new THREE.BoxGeometry(0.75, 0.08, 0.12), m: R.M(0, 0.56, 0.1), color: [0.85, 0.15, 0.15] }])],
  chevron: () => [R.merge([{ g: new THREE.BoxGeometry(0.08, 1.4, 0.08), m: R.M(0, 0.0, -0.05), color: [0.3, 0.3, 0.32] }, { g: new THREE.BoxGeometry(1.16, 0.6, 0.05), m: R.M(0, 0.35, -0.1), color: [0.2, 0.2, 0.22] }]),
    { geo: new THREE.PlaneGeometry(1.1, 0.55).translate(0, 0.35, -0.07), mat: new THREE.MeshLambertMaterial({ map: R.chevronTex(), side: THREE.DoubleSide }) }],
};
class Props {
  constructor(W, scene) {
    this.W = W; this.list = []; this.kinds = {}; this.d = new THREE.Object3D(); this.hits = [];
    const byKind = {};
    for (const p of W.props) (byKind[p.kind] = byKind[p.kind] || []).push(p);
    for (const kind in byKind) {
      const D = PROP_DEF[kind], arr = byKind[kind];
      const meshes = R.propParts[kind]().map(pt => {
        const geo = pt.isBufferGeometry ? pt : pt.geo, mat = pt.isBufferGeometry ? R.flatMat() : pt.mat;
        const im = new THREE.InstancedMesh(geo, mat, arr.length); im.castShadow = true; im.frustumCulled = false;
        if (scene) scene.add(im);
        return im;
      });
      const K = this.kinds[kind] = { meshes, dirty: true };
      arr.forEach((p, k) => {
        const y = W.heightAt(p.x, p.z) + D.h;
        const o = { kind, k, x: p.x, y, z: p.z, vx: 0, vy: 0, vz: 0, yaw: p.yaw, rx: 0, rz: 0, wx: 0, wy: 0, wz: 0, r: D.r, h: D.h, m: D.mass, rest: true, flip: !!p.flip, x0: p.x, z0: p.z, yaw0: p.yaw };
        this.list.push(o); this.sync(o);
      });
      K.dirty = true;
    }
    this.flush();
  }
  get meshes() { return Object.values(this.kinds).flatMap(k => k.meshes); }
  reset() { for (const o of this.list) { o.x = o.x0; o.z = o.z0; o.y = this.W.heightAt(o.x, o.z) + o.h; o.vx = o.vy = o.vz = 0; o.rx = o.rz = 0; o.yaw = o.yaw0; o.rest = true; this.sync(o); } this.flush(); }
  sync(o) {
    const d = this.d; d.position.set(o.x, o.y, o.z); d.rotation.set(o.rx, o.yaw, o.rz); d.scale.set(o.flip ? -1 : 1, 1, 1); d.updateMatrix();
    const K = this.kinds[o.kind]; for (const m of K.meshes) m.setMatrixAt(o.k, d.matrix); K.dirty = true;
  }
  flush() { for (const k in this.kinds) { const K = this.kinds[k]; if (K.dirty) { K.meshes.forEach(m => (m.instanceMatrix.needsUpdate = true)); K.dirty = false; } } }
  update(dt, cars) {
    this.hits.length = 0;
    for (const o of this.list) {
      for (const c of cars) {
        if ((c.pos.x - o.x) ** 2 + (c.pos.z - o.z) ** 2 > 36) continue;
        if (c.pos.y - 0.6 > o.y + o.h) continue;
        for (const cz of c.circles) {
          const cx = c.pos.x + c.az.x * cz, czz = c.pos.z + c.az.z * cz;
          const dx = o.x - cx, dz = o.z - czz, d = Math.hypot(dx, dz) || 1e-3, pen = c.cr + o.r - d;
          if (pen <= 0) continue;
          const nx = dx / d, nz = dz / d;
          o.x += nx * pen; o.z += nz * pen;
          const vn = (o.vx - c.vel.x) * nx + (o.vz - c.vel.z) * nz;
          if (vn >= 0) continue;
          const j = -1.4 * vn / (1 / o.m + 1 / c.m);
          o.vx += nx * j / o.m; o.vz += nz * j / o.m;
          c.vel.x -= nx * j / c.m; c.vel.z -= nz * j / c.m;
          const sp = Math.abs(vn);
          o.vy = Math.max(o.vy, 1.2 + sp * 0.28);
          o.wx = (Math.random() - 0.5) * sp * 1.4; o.wz = (Math.random() - 0.5) * sp * 1.4; o.wy = (Math.random() - 0.5) * sp;
          o.rest = false;
          this.hits.push({ o, sp, car: c });
        }
      }
      if (o.rest) continue;
      o.vy -= G * dt;
      o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
      o.rx += o.wx * dt; o.rz += o.wz * dt; o.yaw += o.wy * dt;
      const gh = this.W.heightAt(o.x, o.z) + o.h * 0.8;
      if (o.y < gh) {
        o.y = gh;
        o.vy = o.vy < -2.5 ? -o.vy * 0.3 : 0;
        const f = Math.exp(-4 * dt); o.vx *= f; o.vz *= f; o.wx *= f; o.wz *= f; o.wy *= f;
        if (Math.hypot(o.vx, o.vz) < 0.15 && Math.abs(o.vy) < 0.2) o.rest = true;
      }
      this.sync(o);
    }
    this.flush();
  }
}
