/* ============================================================
   Dream Machine, part 2: the building blocks. Islands, spires,
   rings, stairs, doors, towers, clocks, a tiny person. Each one is
   built with its base at y = 0 and grows upward; the world (part 3)
   decides where it goes. The Geometry rule reshapes them here:
   Crystal makes them faceted, Melted makes the stone sag.
   ============================================================ */
const Shapes = {
  ctx: null,   // { r: random, mode: geometry rule, pal: palette, mats }
  begin(r, mode, pal) {
    const crystal = mode === 'crystal', stone = Tex.stone();
    const mat = (col, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: col, map: stone, roughness: crystal ? 0.45 : 0.95, metalness: crystal ? 0.15 : 0, flatShading: crystal }, extra));
    this.ctx = {
      r, mode, pal, seg: crystal ? 0.4 : 1,
      mats: {
        stone: mat(pal.stone), stone2: mat(pal.stone2), dark: new THREE.MeshStandardMaterial({ color: new THREE.Color(pal.stone2).multiplyScalar(0.35), roughness: 1, flatShading: crystal }),
        glow: new THREE.MeshBasicMaterial({ color: pal.glow }), figure: new THREE.MeshBasicMaterial({ color: new THREE.Color(pal.stone2).multiplyScalar(0.12) }),
        orb: new THREE.MeshStandardMaterial({ color: pal.moon2, roughness: 0.15, metalness: 0.6, flatShading: crystal }),
        leaf: new THREE.MeshStandardMaterial({ color: new THREE.Color(pal.stone2).lerp(new THREE.Color('#3a7a4a'), 0.5), roughness: 0.9, flatShading: true }),
      },
    };
  },
  seg(n) { return Math.max(3, Math.round(n * this.ctx.seg)); },
  /* Melted: stone slumps outward near the bottom and sways near the top. Crystal: a little jitter so facets catch the light. */
  shape(geo, height) {
    const { mode, r } = this.ctx, p = geo.attributes.position, H = height || 10, ph = r() * 6.28;
    if (mode === 'melted') for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = clamp(y / H, -1, 1);
      const sway = Math.sin(k * 3 + ph) * H * 0.06 * Math.max(0, k), slump = 1 + Math.max(0, 0.35 - Math.abs(k)) * 0.5;
      p.setXYZ(i, x * slump + sway, y - Math.max(0, k) * k * H * 0.08 + Math.sin(x * 0.4 + ph) * H * 0.02, z * slump + sway * 0.5);
    }
    if (mode === 'crystal') for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + r.range(-0.12, 0.12) * H * 0.05, p.getY(i) + r.range(-0.1, 0.1) * H * 0.05, p.getZ(i) + r.range(-0.12, 0.12) * H * 0.05);
    geo.computeVertexNormals(); return geo;
  },
  mesh(geo, mat, height) { const m = new THREE.Mesh(this.shape(geo, height), mat); m.castShadow = false; return m; },
  /* a floating island: a flat top and a rough cone of rock hanging underneath */
  island(rad, depth) {
    const { r } = this.ctx, pts = [];
    const prof = [[0, -depth], [0.12, -depth * 0.85], [0.3, -depth * 0.6], [0.55, -depth * 0.35], [0.82, -depth * 0.14], [0.98, -depth * 0.04], [1, -0.4], [1, 0], [0.94, 0.3], [0, 0.3]];
    for (const [k, y] of prof) pts.push(new THREE.Vector2(k * rad * (k > 0 && k < 1 ? r.range(0.85, 1.12) : 1), y));
    const geo = new THREE.LatheGeometry(pts, this.seg(20)), p = geo.attributes.position, wob = Array.from({ length: 7 }, () => r.range(-0.12, 0.12));
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), y = p.getY(i); let k = 1; wob.forEach((w, j) => { k += w * Math.sin(a * (j + 1) + j); }); const low = y < -0.5 ? r.range(0.92, 1.08) : 1; p.setXYZ(i, x * k * low, y, z * k * low); }
    geo.computeVertexNormals();
    const m = this.mesh(geo, r.chance(0.5) ? this.ctx.mats.stone : this.ctx.mats.stone2, depth);
    return m;
  },
  /* a tall, knobbly spire, like a termite tower or a chess piece left out in the rain */
  spire(hgt, rad) {
    const { r } = this.ctx, pts = [], n = 14, bumps = r.range(2, 5), ph = r() * 6;
    for (let i = 0; i <= n; i++) { const t = i / n, w = rad * Math.pow(1 - t, r.range(0.55, 0.9)) * (1 + 0.16 * Math.sin(t * bumps * 6.28 + ph)); pts.push(new THREE.Vector2(Math.max(0.01, w), t * hgt)); }
    const g = new THREE.Group(); g.add(this.mesh(new THREE.LatheGeometry(pts, this.seg(12)), this.ctx.mats.stone2, hgt));
    if (r.chance(0.45)) { const win = new THREE.Mesh(new THREE.BoxGeometry(rad * 0.22, rad * 0.4, 0.2), this.ctx.mats.glow); win.position.set(0, hgt * r.range(0.25, 0.6), rad * 0.62); win.rotation.y = 0; const holder = new THREE.Group(); holder.add(win); holder.rotation.y = r() * 6.28; g.add(holder); }
    return g;
  },
  /* the great ring: a stone circle standing on its edge, with a slab behind and steps up to it */
  ring(R, tube) {
    const g = new THREE.Group(), { r, mats } = this.ctx;
    const ring = this.mesh(new THREE.TorusGeometry(R, tube, this.seg(10), this.seg(48)), mats.stone, R * 2); ring.position.y = R + tube * 0.6; g.add(ring);
    const slab = this.mesh(new THREE.BoxGeometry(tube * 1.8, R * 2.6, tube * 1.6, 1, this.seg(8), 1), mats.stone2, R * 2.6); slab.position.set(-R * 0.55, R * 1.3, -tube * 1.4); slab.rotation.z = r.range(-0.08, 0.08); g.add(slab);
    const steps = this.stairs(R * 0.9, R * 0.1, 9, 0, R * 0.9); steps.position.set(R * 0.2, 0, tube * 1.6); g.add(steps);
    for (const s of [-1, 1]) { const d = this.door(tube * 0.9, tube * 1.4); d.position.set(s * R * 0.42, 0, tube * 0.75); g.add(d); }
    return g;
  },
  /* a run of steps; with turn > 0 they curl round into a spiral */
  stairs(len, rise, count, turn, width) {
    const g = new THREE.Group(), { mats } = this.ctx, geo = new THREE.BoxGeometry(width * 0.35 || 1.2, rise * 0.9, len / count * 1.15);
    const im = new THREE.InstancedMesh(geo, mats.stone, count), o = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      if (turn) { const a = i / count * turn, rr = width; o.position.set(Math.cos(a) * rr, rise * (i + 0.5), Math.sin(a) * rr); o.rotation.set(0, -a, 0); }
      else { o.position.set(0, rise * (i + 0.5), -len / 2 + (i + 0.5) * len / count); o.rotation.set(0, 0, 0); }
      o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    }
    g.add(im); return g;
  },
  /* a doorway with warm light inside */
  door(w, hgt) {
    const g = new THREE.Group(), { mats } = this.ctx, t = w * 0.18;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, hgt), mats.glow); panel.position.y = hgt / 2; g.add(panel);
    const top = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 16, 0, Math.PI), mats.glow); top.position.y = hgt; g.add(top);
    for (const s of [-1, 1]) { const post = this.mesh(new THREE.BoxGeometry(t, hgt + w / 2, t * 1.4), mats.stone2, hgt); post.position.set(s * (w / 2 + t / 2), (hgt + w / 2) / 2, 0); g.add(post); }
    g.userData.glow = true; return g;
  },
  /* a round tower with a pointed roof and a few lit windows */
  tower(hgt, rad) {
    const g = new THREE.Group(), { r, mats } = this.ctx;
    const body = this.mesh(new THREE.CylinderGeometry(rad * 0.88, rad, hgt, this.seg(14), 4), mats.stone, hgt); body.position.y = hgt / 2; g.add(body);
    const roof = this.mesh(new THREE.ConeGeometry(rad * 1.25, hgt * 0.45, this.seg(14)), mats.dark, hgt * 0.45); roof.position.y = hgt + hgt * 0.22; g.add(roof);
    for (let i = 0; i < r.int(1, 4); i++) { const a = r() * 6.28, w = new THREE.Mesh(new THREE.BoxGeometry(rad * 0.18, rad * 0.32, rad * 0.18), mats.glow); w.position.set(Math.cos(a) * rad * 0.9, hgt * r.range(0.3, 0.85), Math.sin(a) * rad * 0.9); w.lookAt(0, w.position.y, 0); g.add(w); }
    return g;
  },
  /* a narrow stone bridge from a to b (both in the parent's space), with posts going down into the fog */
  bridge(a, b, w) {
    const g = new THREE.Group(), { mats } = this.ctx, len = a.distanceTo(b), mid = a.clone().add(b).multiplyScalar(0.5);
    const deck = this.mesh(new THREE.BoxGeometry(w, w * 0.25, len, 1, 1, this.seg(16)), mats.stone2, len); g.add(deck);
    const sag = deck.geometry.attributes.position; for (let i = 0; i < sag.count; i++) { const z = sag.getZ(i) / len; sag.setY(i, sag.getY(i) - (0.25 - z * z) * len * 0.06); } deck.geometry.computeVertexNormals();
    g.position.copy(mid); g.lookAt(b); return g;
  },
  /* a stopped (or running) clock face, the size of a building */
  clock(R) {
    const g = new THREE.Group(), { mats } = this.ctx;
    g.add(this.mesh(new THREE.TorusGeometry(R, R * 0.07, this.seg(8), this.seg(40)), mats.stone, R * 2));
    const face = new THREE.Mesh(new THREE.CircleGeometry(R * 0.96, 40), new THREE.MeshStandardMaterial({ color: mats.stone.color.clone().multiplyScalar(0.6), roughness: 1, side: THREE.DoubleSide })); face.position.z = -0.05; g.add(face);
    for (let i = 0; i < 12; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(R * 0.05, R * 0.16, R * 0.05), mats.dark); const a = i / 12 * 6.28; t.position.set(Math.sin(a) * R * 0.82, Math.cos(a) * R * 0.82, 0.1); t.rotation.z = -a; g.add(t); }
    const hand = (len, wid) => { const p = new THREE.Group(), m = new THREE.Mesh(new THREE.BoxGeometry(wid, len, wid * 0.6), mats.dark); m.position.y = len / 2; p.add(m); p.position.z = 0.2; g.add(p); return p; };
    g.userData.hands = [hand(R * 0.75, R * 0.05), hand(R * 0.5, R * 0.08)]; g.userData.clock = true;
    return g;
  },
  monolith(hgt) { const m = this.mesh(new THREE.BoxGeometry(hgt * 0.22, hgt, hgt * 0.05, 1, this.seg(6), 1), this.ctx.mats.dark, hgt); m.position.y = hgt / 2; const g = new THREE.Group(); g.add(m); return g; },
  orb(R) { const m = this.mesh(new THREE.SphereGeometry(R, this.seg(32), this.seg(20)), this.ctx.mats.orb, R * 2); m.position.y = R * 0.6; const g = new THREE.Group(); g.add(m); return g; },
  tree(hgt) {
    const g = new THREE.Group(), { r, mats } = this.ctx; const trunk = this.mesh(new THREE.CylinderGeometry(hgt * 0.03, hgt * 0.06, hgt * 0.6, 6), mats.dark, hgt); trunk.position.y = hgt * 0.3; g.add(trunk);
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(hgt * r.range(0.2, 0.32), 0), mats.leaf); b.position.set(r.range(-0.15, 0.15) * hgt, hgt * r.range(0.6, 0.85), r.range(-0.15, 0.15) * hgt); g.add(b); }
    return g;
  },
  /* the dreamer: a tiny dark figure, for scale. Sometimes carrying a light. */
  figure(hgt, lantern) {
    const g = new THREE.Group(), { mats } = this.ctx;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(hgt * 0.13, hgt * 0.17, hgt * 0.72, 8), mats.figure); body.position.y = hgt * 0.36; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(hgt * 0.11, 10, 8), mats.figure); head.position.y = hgt * 0.84; g.add(head);
    if (lantern) { const l = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.glow(), color: this.ctx.pal.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); l.scale.setScalar(hgt * 1.4); l.position.set(hgt * 0.25, hgt * 0.5, 0); g.add(l); }
    g.userData.figure = true; return g;
  },
};
