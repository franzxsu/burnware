/* ============================================================
   Rendering: terrain, road ribbon, water, sky, light, horizon
   ============================================================ */
const R = {};
R.hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
R.mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
R.rgb = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
/* merge simple geometries into one flat-shaded, vertex-coloured, non-indexed geometry */
R.merge = function (parts) {
  const geos = parts.map(p => (p.g.index ? p.g.toNonIndexed() : p.g));
  let total = 0; geos.forEach(g => (total += g.attributes.position.count));
  const pos = new Float32Array(total * 3), col = new Float32Array(total * 3);
  const v = new THREE.Vector3(); let o = 0;
  parts.forEach((p, k) => {
    const pa = geos[k].attributes.position;
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i);
      const lx = v.x, ly = v.y, lz = v.z;
      if (p.jitter) { const j = p.jitter(lx, ly, lz); v.x += j[0]; v.y += j[1]; v.z += j[2]; }
      if (p.m) v.applyMatrix4(p.m);
      pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
      const c = typeof p.color === 'function' ? p.color(lx, ly, lz, v) : p.color;
      col[o * 3] = c[0]; col[o * 3 + 1] = c[1]; col[o * 3 + 2] = c[2];
      o++;
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
};
R.M = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
R.flatMat = () => new THREE.MeshLambertMaterial({ vertexColors: true });

const ROAD_COL = {
  tarmac: [0.27, 0.28, 0.30], gravel: [0.71, 0.61, 0.46], dirt: [0.77, 0.53, 0.35], sand: [0.88, 0.71, 0.48],
  snow: [0.93, 0.95, 0.99], ice: [0.70, 0.85, 0.96], water: [0.40, 0.36, 0.30], grass: [0.4, 0.55, 0.25], deepsnow: [0.95, 0.96, 1],
};

function buildWorldMeshes(W, scene, quality, tod, wx) {
  const th = themeFor(W.T, tod || 'day', wx), out = { objects: [], update: [], th };
  const add = (o) => { scene.add(o); out.objects.push(o); return o; };

  /* ---- sky dome + sun disc ---- */
  {
    const g = new THREE.SphereGeometry(1400, 32, 16), p = g.attributes.position, c = new Float32Array(p.count * 3);
    const top = R.rgb(th.skyTop), hor = R.rgb(th.skyHorizon);
    for (let i = 0; i < p.count; i++) {
      const t = clamp(p.getY(i) / 1400 * 1.7, 0, 1), m = R.mix3(hor, top, Math.pow(t, 0.55));
      c[i * 3] = m[0]; c[i * 3 + 1] = m[1]; c[i * 3 + 2] = m[2];
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const sky = add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
    sky.renderOrder = -2; out.sky = sky;
    const sun = add(new THREE.Mesh(new THREE.CircleGeometry(th.night ? 30 : th.tod === 'sunset' ? 70 : 46, 24), new THREE.MeshBasicMaterial({ color: th.night ? 0xe8eeff : th.tod === 'sunset' ? 0xffd2a0 : 0xfff7e0, fog: false, depthWrite: false })));
    const glow = new THREE.Mesh(new THREE.CircleGeometry(th.night ? 80 : 130, 24), new THREE.MeshBasicMaterial({ color: th.night ? 0x8aa0e0 : th.sun, fog: false, transparent: true, opacity: th.night ? 0.12 : 0.24, depthWrite: false }));
    glow.position.z = -1; sun.add(glow); sun.renderOrder = -1;
    out.sunDisc = sun; sun.visible = !th.wx;   // overcast: no sun or moon
    if (th.night && !th.wx) {
      const rs = mulberry32(W.T.seed + 7), sp = [];
      for (let k = 0; k < 900; k++) { const a = rs() * TAU, e = 0.08 + Math.pow(rs(), 0.7) * 1.4; sp.push(Math.cos(a) * Math.cos(e) * 1300, Math.sin(e) * 1300, Math.sin(a) * Math.cos(e) * 1300); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 2, sizeAttenuation: false, fog: false, depthWrite: false }));
      stars.renderOrder = -1; sky.add(stars);
    }
  }
  scene.fog = new THREE.Fog(th.fog, th.fogNear, th.fogFar);
  scene.background = new THREE.Color(th.skyHorizon);

  /* ---- lights ---- */
  const hemi = add(new THREE.HemisphereLight(th.hemiSky, th.hemiGround, th.hemiI));
  const sun = new THREE.DirectionalLight(th.sun, th.sunI);
  const sd = new THREE.Vector3(...th.sunDir).normalize();
  out.sunDir = sd;
  sun.castShadow = true;
  const sm = quality === 'low' ? 1024 : 2048;
  sun.shadow.mapSize.set(sm, sm);
  const sc = sun.shadow.camera; sc.left = -46; sc.right = 46; sc.top = 46; sc.bottom = -46; sc.near = 1; sc.far = 320;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  add(sun); add(sun.target); out.sun = sun; out.hemi = hemi;

  /* ---- terrain ---- */
  {
    const nx = W.gnx, nz = W.gnz, cell = W.gcell, H = W.H;
    const pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3);
    const gr = th.ground, cliff = th.cliff, sh = th.shoulder, n = W.noise;
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
      const k = iz * nx + ix, x = W.gx0 + ix * cell, z = W.gz0 + iz * cell, h = H[k];
      pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
      const t1 = n(x / 26 + 7.3, z / 26 - 1.1) * 0.5 + 0.5, t2 = n(x / 9 - 3.7, z / 9 + 11.2) * 0.5 + 0.5;
      let c = R.mix3(R.mix3(gr[0], gr[1], t1), gr[2], t2 * 0.55);
      const hl = H[iz * nx + Math.max(0, ix - 1)], hr = H[iz * nx + Math.min(nx - 1, ix + 1)];
      const hu = H[Math.max(0, iz - 1) * nx + ix], hd = H[Math.min(nz - 1, iz + 1) * nx + ix];
      const slope = Math.hypot(hr - hl, hd - hu) / (2 * cell);
      c = R.mix3(c, cliff, smoothstep(0.42, 0.95, slope));
      const i = W.GI[k];
      if (i >= 0) c = R.mix3(c, sh, (1 - smoothstep(W.W[i] + 1, W.W[i] + 6, W.GD[k])) * 0.85);
      for (const w of W.waters) {
        const d2 = (x - w.x) ** 2 + (z - w.z) ** 2;
        if (d2 < (w.r * 1.8) ** 2) c = R.mix3(c, [0.34, 0.32, 0.24], smoothstep(w.level + 1.2, w.level - 0.2, h) * 0.8);
      }
      if (W.T.theme === 'snow') c = R.mix3(c, [0.78, 0.84, 0.95], smoothstep(4, -10, h) * 0.35);
      if (W.T.sea) { const lv = W.T.sea.level; c = R.mix3(c, th.sand || [0.9, 0.84, 0.64], smoothstep(lv + 2.2, lv + 0.6, h)); if (h < lv - 0.2) c = R.mix3(c, [0.5, 0.62, 0.6], smoothstep(lv - 0.2, lv - 3, h)); }
      const b = 0.94 + R.hash(ix, iz) * 0.1;
      col[k * 3] = c[0] * b; col[k * 3 + 1] = c[1] * b; col[k * 3 + 2] = c[2] * b;
    }
    const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let o = 0;
    for (let iz = 0; iz < nz - 1; iz++) for (let ix = 0; ix < nx - 1; ix++) {
      const a = iz * nx + ix, b = a + 1, c = a + nx, d = c + 1;
      idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    const m = add(new THREE.Mesh(g, new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 0, specular: 0x000000 })));
    m.receiveShadow = true; out.terrain = m;
  }

  /* ---- road ribbon (exactly the surface the physics drives on) ---- */
  {
    const N = W.N, cols = [-3.4, -2.0, -0.8, -1, -0.5, 0, 0.5, 1, 0.8, 2.0, 3.4];
    // entries with |v| <= 1 are fractions of the half width; the others are metres past the edge
    const C = cols.length;
    const pos = new Float32Array(N * C * 3), col = new Float32Array(N * C * 3);
    const bank = R.rgb(0xffffff), bankCol = W.T.theme === 'snow' ? [0.96, 0.97, 1.0] : W.T.theme === 'desert' ? th.shoulder : [0.52, 0.47, 0.33];
    for (let i = 0; i < N; i++) {
      const hw = W.W[i], e = W.E[i], sf = SURF_KEYS[W.SF[i]];
      const base = ROAD_COL[sf] || ROAD_COL.gravel;
      for (let k = 0; k < C; k++) {
        const v = cols[k];
        let lat, h, c;
        if (k >= 3 && k <= 7) { lat = v * hw; h = e; }
        else { const u = Math.abs(v), sg = k < 3 ? -1 : 1; lat = sg * (hw + u); h = e + W.bankProfile(u); }
        const o = (i * C + k) * 3;
        pos[o] = W.X[i] + W.RX[i] * lat; pos[o + 1] = h; pos[o + 2] = W.Z[i] + W.RZ[i] * lat;
        if (k >= 3 && k <= 7) {
          const track = Math.abs(v) === 0.5 ? (sf === 'snow' ? 0.86 : sf === 'tarmac' ? 0.9 : 0.86) : 1;
          const edge = Math.abs(v) === 1 ? (sf === 'tarmac' ? 1.05 : 1.07) : 1;
          const sp = 0.93 + R.hash(i * 0.37, k) * 0.12;
          c = [base[0] * track * edge * sp, base[1] * track * edge * sp, base[2] * track * edge * sp];
          if (sf === 'snow' && Math.abs(v) === 0.5) c = [0.80, 0.85, 0.93];
        } else {
          const sp = 0.92 + R.hash(i * 0.21, k + 9) * 0.14;
          const m = Math.abs(v) < 1 ? R.mix3(base, bankCol, 0.6) : bankCol;
          c = [m[0] * sp, m[1] * sp, m[2] * sp];
        }
        col[o] = c[0]; col[o + 1] = c[1]; col[o + 2] = c[2];
      }
    }
    const order = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const idx = []; for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      for (let q = 0; q < C - 1; q++) {
        const a = i * C + order[q], b = i * C + order[q + 1], c = j * C + order[q], d = j * C + order[q + 1];
        idx.push(a, b, c, b, d, c);
      }
    }
    // columns 2 (-0.8 bank) and 3 (-1 road edge) are listed as bank-then-edge so the strip runs outside-in
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, side: THREE.DoubleSide });
    const m = add(new THREE.Mesh(g, mat)); m.receiveShadow = true; out.road = m;
    // tarmac lines
    const lp = [], lc = [];
    const quad = (i, latA, latB, len, c) => {
      const j = (i + len) % N, y1 = W.E[i] + 0.025, y2 = W.E[j] + 0.025;
      const P = (ii, lat, y) => [W.X[ii] + W.RX[ii] * lat, y, W.Z[ii] + W.RZ[ii] * lat];
      const a = P(i, latA, y1), b = P(i, latB, y1), cc = P(j, latA, y2), d = P(j, latB, y2);
      lp.push(...a, ...b, ...cc, ...b, ...d, ...cc); for (let q = 0; q < 6; q++) lc.push(...c);
    };
    for (let i = 0; i < N; i += 1) {
      if (SURF_KEYS[W.SF[i]] !== 'tarmac') continue;
      if (i % 8 < 4) quad(i, -0.09, 0.09, 1, [0.95, 0.85, 0.35]);
      quad(i, -W.W[i] + 0.25, -W.W[i] + 0.4, 1, [0.92, 0.92, 0.9]);
      quad(i, W.W[i] - 0.4, W.W[i] - 0.25, 1, [0.92, 0.92, 0.9]);
    }
    // start line chequers + grid boxes
    for (let q = -6; q <= 6; q++) {
      const hw = W.W[0], w = hw * 2 / 13, lat = q * w;
      quad(0, lat - w / 2, lat + w / 2, 1, (q & 1) ? [0.08, 0.08, 0.1] : [0.96, 0.96, 0.96]);
      quad(1, lat - w / 2, lat + w / 2, 1, (q & 1) ? [0.96, 0.96, 0.96] : [0.08, 0.08, 0.1]);
    }
    for (let k = 0; k < 4; k++) { const i = (N - 10 - k * 7 + N) % N, sd = k % 2 ? 2.2 : -2.2; quad(i, sd - 1.1, sd + 1.1, 1, [0.95, 0.95, 0.95]); }
    if (lp.length) {
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lp), 3));
      lg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(lc), 3));
      lg.computeVertexNormals();
      const lm = add(new THREE.Mesh(lg, new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8, side: THREE.DoubleSide })));
      lm.receiveShadow = true;
    }
  }

  /* ---- water ---- */
  out.water = [];
  if (W.T.sea) {
    const o = add(new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000, 1, 1), new THREE.MeshPhongMaterial({ color: th.water, shininess: 90, specular: th.night ? 0x334466 : 0x8fc8e8, transparent: true, opacity: 0.9 })));
    o.rotation.x = -Math.PI / 2; o.position.set((W.minX + W.maxX) / 2, W.T.sea.level, (W.minZ + W.maxZ) / 2); o.receiveShadow = true;
    out.water.push(o); out.ocean = o;
  }
  for (const w of W.waters) {
    const m = add(new THREE.Mesh(new THREE.CircleGeometry(w.r * 1.75, 36), new THREE.MeshPhongMaterial({ color: th.water, transparent: true, opacity: 0.8, shininess: 80, specular: 0x9fc9e0 })));
    m.rotation.x = -Math.PI / 2; m.position.set(w.x, w.level, w.z); m.receiveShadow = true;
    out.water.push(m);
  }

  /* ---- distant mountains + clouds ---- */
  {
    const rnd = mulberry32(W.T.seed + 99), parts = [];
    const cx = (W.minX + W.maxX) / 2, cz = (W.minZ + W.maxZ) / 2, R0 = Math.max(W.maxX - W.minX, W.maxZ - W.minZ) / 2 + 330;
    const mc = th.mountains.map(R.rgb);
    for (let k = 0; k < 44; k++) {
      const a = k / 44 * TAU + rnd() * 0.1, r = R0 + rnd() * 260, h = 70 + rnd() * 170, rad = 90 + rnd() * 120;
      const base = mc[k % mc.length], snowy = W.T.theme !== 'desert' && h > 150;
      parts.push({ g: new THREE.ConeGeometry(rad, h, 6, 1), m: R.M(cx + Math.cos(a) * r, h / 2 - 20, cz + Math.sin(a) * r, 0, rnd() * TAU, 0),
        color: (x, y) => (snowy && y > h * 0.22 ? [0.95, 0.97, 1] : R.mix3(base, [base[0] * 1.15, base[1] * 1.15, base[2] * 1.15], (y / h) + 0.5)) });
    }
    const mm = add(new THREE.Mesh(R.merge(parts), new THREE.MeshLambertMaterial({ vertexColors: true })));
    mm.matrixAutoUpdate = false;
    const cl = [];
    const wet = !!th.wx, top = wet ? [0.7, 0.73, 0.78] : [1, 1, 1], under = wet ? [0.52, 0.55, 0.61] : [0.86, 0.9, 0.97];
    const cm = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: th.night ? 0x121725 : wet ? 0x3a404a : 0x606a78, fog: false });
    for (let k = 0; k < (wet ? 30 : W.T.theme === 'snow' ? 16 : 11); k++) {
      const pts = [];
      const n = 3 + Math.floor(rnd() * 3);
      for (let q = 0; q < n; q++) pts.push({ g: new THREE.IcosahedronGeometry(14 + rnd() * 10, 0), m: R.M(q * 16 - n * 8, rnd() * 6, rnd() * 10, 0, rnd() * 3, 0, 1, 0.62, 1), color: (x, y) => (y > 0 ? top : under) });
      const c = add(new THREE.Mesh(R.merge(pts), cm));
      c.position.set(cx + (rnd() - 0.5) * 1400, (wet ? 125 : 150) + rnd() * 90, cz + (rnd() - 0.5) * 1400);
      if (wet) c.scale.setScalar(1.3 + rnd() * 0.5);
      c.userData.v = 1.5 + rnd() * 2; cl.push(c);
    }
    out.clouds = cl;
  }
  /* wet stage: darker ground, and a road with a sheen that catches the light */
  if (th.wx === 'rain') {
    const darken = (mesh, k) => { const c = mesh.geometry.attributes.color; for (let i = 0; i < c.array.length; i++) c.array[i] *= k; c.needsUpdate = true; };
    if (out.terrain) darken(out.terrain, 0.86);
    if (out.road) {
      darken(out.road, 0.72);
      out.road.material.dispose();
      out.road.material = new THREE.MeshPhongMaterial({ vertexColors: true, specular: 0x30353e, shininess: 42, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, side: THREE.DoubleSide });
    }
  }
  return out;
}
