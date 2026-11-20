/* ============================================================
   Dream Machine, part 3: putting a dream together.
   World.build(seed, rules) clears the scene and lays out a new one:
   sky, moons, light, fog, a central monument, islands around it,
   spires in the sea of mist, bridges, drifting debris, specks in
   the air, and one small person. Gravity decides which way all of
   it points; Scale and Geometry decide how it's made.
   ============================================================ */
const World = {
  scene: null, root: null, land: null, sky: null, stars: null, moons: [], bodies: [], clocks: [], specks: null, gvec: new THREE.Vector3(0, -1, 0),
  info: { size: 1, look: new THREE.Vector3(), dist: 100, phi: 1.2 },
  init(scene) { this.scene = scene; },
  clear() {
    if (!this.root) return;
    this.scene.remove(this.root);
    this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { if (m.map && m.map !== Tex._stone && m.map !== Tex._glow && m.map !== Tex._mist) m.map.dispose(); m.dispose(); }); } });
    this.root = null;
  },
  build(seed, rules) {
    this.clear();
    const r = rng(hashStr(seed + '|' + rules.gravity + rules.scale + rules.geometry + rules.palette)), rLook = rng(hashStr(seed));
    const pal = rules.palette === 'random' ? randomPalette(rng(hashStr(seed + 'colour'))) : PALETTES[rules.palette];
    this.pal = pal; this.rules = rules; this.bodies = []; this.clocks = []; this.moons = []; this.lights = [];
    const root = this.root = new THREE.Group(); this.scene.add(root);
    Shapes.begin(r, rules.geometry, pal);
    this.buildSky(r, pal);
    const land = this.land = new THREE.Group(); root.add(land);
    const G = rules.gravity;
    if (G === 'inward') this.planet(r, rules); else if (G === 'none') this.adrift(r, rules); else this.archipelago(r, rules);
    /* gravity: turn the whole world so that its "up" is away from gravity */
    if (G === 'up') { land.rotation.x = Math.PI; this.gvec.set(0, 1, 0); }
    else if (G === 'side') { land.rotation.z = -Math.PI / 2; this.gvec.set(-1, 0, 0); }
    else if (G === 'none') this.gvec.set(0, 0, 0);
    else if (G === 'inward') this.gvec.set(0, 0, 0);
    else this.gvec.set(0, -1, 0);
    land.updateMatrixWorld(true);
    this.addSpecks(r, pal);
    this.lightUp(r, pal);
    /* how the camera should frame it */
    const size = this.info.size;
    this.info.dist = G === 'inward' ? size * 2.35 : G === 'side' || G === 'none' ? size * 1.35 : size * 1.05; this.info.phi = G === 'up' ? 1.95 : G === 'side' ? 1.3 : G === 'inward' ? 1.1 : 1.28;
    this.info.look.set(0, G === 'up' ? -size * 0.12 : G === 'down' ? size * 0.12 : 0, 0); if (G === 'side') this.info.look.set(size * 0.12, 0, 0);
    this.scene.fog = new THREE.FogExp2(pal.fog, (G === 'inward' ? 0.9 : 1.6) * (pal.fogK || 1) / (size * 10));
    return { name: dreamName(rLook), pal };
  },
  /* ---- sky, stars, moons ---- */
  buildSky(r, pal) {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(pal.top) }, hor: { value: new THREE.Color(pal.hor) }, low: { value: new THREE.Color(pal.low) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 low; varying vec3 vP; void main(){ float y = vP.y; vec3 c = y > 0.0 ? mix(hor, top, pow(clamp(y, 0.0, 1.0), 0.55)) : mix(hor, low, pow(clamp(-y * 2.5, 0.0, 1.0), 0.6)); gl_FragColor = vec4(c, 1.0); }',
    }));
    sky.renderOrder = -10; this.root.add(sky); this.sky = sky;
    if (pal.stars > 0) {
      const n = Math.round(1800 * pal.stars), pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const u = r() * 2 - 1, a = r() * 6.28, s = Math.sqrt(1 - u * u); pos.set([Math.cos(a) * s * 1600, Math.abs(u) * 1600 * (r() < 0.85 ? 1 : -0.3), Math.sin(a) * s * 1600], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: pal.speck, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.85, fog: false, depthWrite: false }));
      this.root.add(this.stars);
    } else this.stars = null;
    const count = r.pick([1, 1, 2, 2, 3]);
    for (let i = 0; i < count; i++) {
      const big = i === 0, R = big ? r.range(70, 120) : r.range(18, 45), a = r.range(-1.2, 1.2) + (i ? r.range(1, 2.4) * r.sign() : 0), el = r.range(0.12, big ? 0.38 : 0.6), d = 1300;
      const col = big ? pal.moon : pal.moon2, g = new THREE.Group();
      g.position.set(Math.sin(a) * Math.cos(el) * d, Math.sin(el) * d, -Math.cos(a) * Math.cos(el) * d);
      const body = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 20), new THREE.MeshBasicMaterial({ map: Tex.moon(r.int(1, 1e6)), color: col, fog: false }));
      g.add(body);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.glow(), color: col, transparent: true, opacity: 0.55, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); halo.scale.setScalar(R * 6); g.add(halo);
      if (!big && r.chance(0.4)) { const ring = new THREE.Mesh(new THREE.RingGeometry(R * 1.5, R * 2.3, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.5, side: THREE.DoubleSide, fog: false })); ring.rotation.set(r.range(1, 1.5), r.range(-0.4, 0.4), 0); g.add(ring); }
      g.userData = { a, el, d, speed: r.range(0.004, 0.012) * r.sign() };
      this.root.add(g); this.moons.push(g);
    }
  },
  lightUp(r, pal) {
    const hemi = new THREE.HemisphereLight(pal.hor, pal.sea, 1.15); this.root.add(hemi);
    const key = new THREE.DirectionalLight(pal.moon, 1.15); key.position.copy(this.moons[0].position).normalize().multiplyScalar(100); this.root.add(key);
    const fill = new THREE.DirectionalLight(pal.top, 0.25); fill.position.set(-key.position.x, 40, -key.position.z); this.root.add(fill);
    this.root.add(new THREE.AmbientLight(pal.fog, 0.4));
    /* warm light spilling out of the first few doorways */
    let n = 0; this.land.traverse(o => { if (o.userData.glow && n < 3) { const l = new THREE.PointLight(pal.glow, 1.4, this.info.size * 0.35, 2); l.position.set(0, 2, 2); o.add(l); n++; } });
  },
  /* drifting specks: dust, snow, embers or fireflies, depending on the palette */
  addSpecks(r, pal) {
    const n = 900, S = this.info.size * 1.4, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([r.range(-S, S), r.range(-S * 0.6, S * 0.6), r.range(-S, S)], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ color: pal.speck, size: this.info.size * 0.006, map: Tex.glow(), transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }));
    p.userData = { S, phase: Float32Array.from({ length: n }, () => r() * 6.28) }; this.root.add(p); this.specks = p;
  },
  /* ---- the three layouts ---- */
  scaleRule(r) { const s = this.rules.scale; return s === 'giant' ? { mono: 2.4, isl: 1.3, fig: 1.8 } : s === 'tiny' ? { mono: 0.8, isl: 1, fig: 16 } : s === 'mixed' ? { mono: r.range(0.6, 2), isl: 1, fig: r.pick([0.9, 1.8, 9]), mixed: true } : { mono: 1, isl: 1, fig: 1.8 }; },
  /* a body is anything that moves under the Physics rule */
  body(obj, opts = {}) { this.bodies.push(Object.assign({ obj, p0: obj.position.clone(), r0: obj.rotation.clone(), s0: obj.scale.clone(), ph: Math.random() * 6.28, amp: 1, anchor: false }, opts)); return obj; },
  /* the centrepiece: one of several monuments, chosen by the seed */
  monument(r, sc) {
    const kind = r.pick(['ring', 'ring', 'clock', 'spiral', 'orb', 'towers', 'doors']), mode = this.rules.geometry, g = new THREE.Group(), R = 13 * sc.mono;
    const make = (k) => {
      if (k === 'ring') return Shapes.ring(R, R * 0.2);
      if (k === 'clock') { const c = Shapes.clock(R * 1.05); c.position.y = R * 1.3; this.clocks.push(c); const w = new THREE.Group(); w.add(c); const base = Shapes.stairs(R, R * 0.12, 8, 0, R); base.position.z = R * 0.8; w.add(base); return w; }
      if (k === 'spiral') { const w = new THREE.Group(); const s = Shapes.stairs(0, R * 0.16, 44, Math.PI * 4, R * 0.55); w.add(s); const top = Shapes.door(R * 0.18, R * 0.3); top.position.set(R * 0.55, R * 0.16 * 44, 0); w.add(top); const col = Shapes.spire(R * 7.4, R * 0.2); w.add(col); return w; }
      if (k === 'orb') { const w = Shapes.orb(R * 0.9); const d = Shapes.door(R * 0.2, R * 0.35); d.position.set(0, 0, R * 0.95); w.add(d); return w; }
      if (k === 'towers') { const w = new THREE.Group(); for (let i = 0; i < 5; i++) { const t = Shapes.tower(R * r.range(0.9, 2.2), R * r.range(0.18, 0.32)); const a = i / 5 * 6.28 + r.range(-0.3, 0.3); t.position.set(Math.cos(a) * R * 0.5 * (i ? 1 : 0), 0, Math.sin(a) * R * 0.5 * (i ? 1 : 0)); w.add(t); } return w; }
      const w = new THREE.Group(); for (let i = 0; i < 4; i++) { const d = Shapes.door(R * 0.28, R * 0.55); d.position.set((i - 1.5) * R * 0.5, 0, 0); d.rotation.y = r.range(-0.3, 0.3); w.add(d); } const lin = Shapes.monolith(R * 2.4); lin.position.z = -R * 0.6; w.add(lin); return w;
    };
    g.add(make(kind));
    if (mode === 'echo') {   // the same thing again, smaller, turned, nested inside or beside
      for (const [k, s] of [[0.55, 1], [0.3, 2]]) { const e = make(kind); e.scale.setScalar(k); e.rotation.y = s * Math.PI / 2; e.position.set(kind === 'ring' ? 0 : s * R * 0.9, kind === 'ring' ? R * (1 - k) * 1.05 : 0, 0); g.add(e); }
    }
    if (mode === 'impossible' && (kind === 'ring' || kind === 'clock')) { const e = make(kind); e.rotation.y = Math.PI / 2; g.add(e); }   // two rings through each other
    g.userData.kind = kind; return { g, R };
  },
  decorate(isl, rad, r, sc, i) {
    const pal = this.pal, mode = this.rules.geometry, mixed = () => (sc.mixed ? r.range(0.35, 2.6) : 1);
    const roll = r();
    if (roll < 0.35) for (let k = 0; k < r.int(1, 3); k++) { const s = Shapes.spire(rad * r.range(1.4, 3.2) * mixed(), rad * r.range(0.14, 0.26)); s.position.set(r.range(-0.4, 0.4) * rad, 0, r.range(-0.4, 0.4) * rad); isl.add(s); if (mode === 'echo') { const e = s.clone(); e.scale.setScalar(0.5); e.position.x += rad * 0.3; isl.add(e); } }
    else if (roll < 0.55) { const t = Shapes.tower(rad * r.range(0.8, 1.6) * mixed(), rad * 0.22); isl.add(t); }
    else if (roll < 0.7) { const d = Shapes.door(rad * 0.18, rad * 0.32); d.rotation.y = r() * 6.28; isl.add(d); }
    else if (roll < 0.8) { const st = Shapes.stairs(rad * 0.8, rad * 0.08, 10, 0, rad); st.rotation.y = r() * 6.28; isl.add(st); }
    else if (roll < 0.9) { const m = Shapes.monolith(rad * r.range(0.9, 1.6) * mixed()); m.rotation.y = r() * 6.28; isl.add(m); }
    else { const c = Shapes.clock(rad * 0.5); c.position.y = rad * 0.65; c.rotation.y = r() * 6.28; isl.add(c); this.clocks.push(c); }
    if (pal === PALETTES.verdant || r.chance(0.18)) for (let k = 0; k < r.int(1, 4); k++) { const t = Shapes.tree(rad * r.range(0.4, 0.8)); t.position.set(r.range(-0.6, 0.6) * rad, 0, r.range(-0.6, 0.6) * rad); isl.add(t); }
    if (mode === 'impossible' && r.chance(0.5)) { const s = Shapes.spire(rad * r.range(1, 2), rad * 0.18); s.rotation.x = Math.PI; s.position.y = -rad * 0.9; isl.add(s); }   // spires growing down out of the rock
  },
  /* Down / Up / Sideways: a central island, a ring of islands, spires standing in a sea of mist */
  archipelago(r, rules) {
    const sc = this.scaleRule(r), land = this.land, size = 100 * Math.max(1, sc.mono * 0.8); this.info.size = size;
    const { g: mono, R } = this.monument(r, sc);
    const centre = new THREE.Group(); const cIsl = Shapes.island(R * 1.7 * Math.max(1, sc.mono * 0.6), R * 2.2); centre.add(cIsl); centre.add(mono);
    const fig = Shapes.figure(sc.fig, r.chance(0.6) || this.pal === PALETTES.ember); fig.position.set(R * 0.25, 0.25, R * 1.35); fig.rotation.y = r.range(-0.6, 0.6); centre.add(fig);
    land.add(this.body(centre, { anchor: true, amp: 0.4 }));
    if (rules.geometry === 'impossible') {   // the same island again, upside down, hanging in the sky above
      const twin = centre.clone(); twin.rotation.x = Math.PI; twin.rotation.y = r() * 6.28; twin.position.y = R * 6.2; land.add(this.body(twin, { anchor: true, amp: 0.4 }));
      twin.traverse(o => { if (o.userData.clock) this.clocks.push(o); });
      const st = Shapes.stairs(0, R * 0.2, 30, Math.PI * 2.5, R * 1.5); st.position.y = 0.3; land.add(st);
    }
    const n = r.int(7, 12), isles = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.28 + r.range(-0.25, 0.25), d = r.range(0.4, 1.25) * size, rad = r.range(5, 13) * sc.isl * (sc.mixed ? r.range(0.4, 2) : 1);
      const isl = new THREE.Group(); isl.add(Shapes.island(rad, rad * r.range(1.4, 2.6))); this.decorate(isl, rad, r, sc, i);
      isl.position.set(Math.cos(a) * d, r.range(-0.12, 0.3) * size, Math.sin(a) * d); isl.rotation.y = r() * 6.28;
      land.add(this.body(isl, { amp: r.range(0.6, 1.6) })); isles.push({ isl, d, rad });
      if (rules.geometry === 'echo') { const sat = new THREE.Group(); sat.add(Shapes.island(rad * 0.35, rad * 0.6)); sat.position.copy(isl.position).add(new THREE.Vector3(rad * 1.6, rad * 0.8, 0)); land.add(this.body(sat, { amp: 2 })); }
    }
    /* bridges from the centre out to the nearest islands */
    isles.slice().sort((a, b) => a.d - b.d).slice(0, r.int(1, 3)).forEach(({ isl }) => { const a = new THREE.Vector3(0, 0, 0), b = isl.position.clone(); b.y += 0.2; const dir = b.clone().sub(a).setY(0).normalize(); a.addScaledVector(dir, R * 1.4); b.addScaledVector(dir, -6); if (b.y - a.y < size * 0.2) land.add(Shapes.bridge(a, b, 2.4)); });
    /* the sea of mist below, and spires standing in it */
    const seaY = -size * 0.42;
    const sea = new THREE.Mesh(new THREE.CircleGeometry(size * 9, 48), new THREE.MeshStandardMaterial({ color: this.pal.sea, roughness: 1 })); sea.rotation.x = -Math.PI / 2; sea.position.y = seaY; land.add(sea);
    for (let i = 0; i < r.int(16, 30); i++) {
      const a = r() * 6.28, d = r.range(0.5, 3.4) * size, h = r.range(0.25, 0.75) * size * (sc.mixed ? r.range(0.5, 1.6) : 1), s = Shapes.spire(h, h * r.range(0.07, 0.13));
      s.position.set(Math.cos(a) * d, seaY - h * 0.1, Math.sin(a) * d); land.add(s);
      if (r.chance(0.35)) { const cap = new THREE.Group(); cap.add(Shapes.island(h * 0.12, h * 0.08)); cap.position.set(s.position.x, s.position.y + h * 0.9, s.position.z); land.add(cap); }
    }
    for (let i = 0; i < 26; i++) {   // banks of mist lying on the sea
      const a = r() * 6.28, d = r.range(0.2, 3) * size, m = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.mist(), color: this.pal.mist, transparent: true, opacity: r.range(0.35, 0.7), depthWrite: false }));
      m.scale.set(size * r.range(1.2, 2.6), size * r.range(0.35, 0.6), 1); m.position.set(Math.cos(a) * d, seaY + size * r.range(0.02, 0.14), Math.sin(a) * d); land.add(m);
    }
    this.debris(r, size, sc);
  },
  /* None: nothing has a floor; islands tumble slowly in every direction */
  adrift(r, rules) {
    const sc = this.scaleRule(r), land = this.land, size = 100 * Math.max(1, sc.mono * 0.8); this.info.size = size;
    const { g: mono, R } = this.monument(r, sc); const centre = new THREE.Group(); centre.add(Shapes.island(R * 1.6, R * 2)); centre.add(mono);
    const fig = Shapes.figure(sc.fig, true); fig.position.set(R * 0.2, 0.25, R * 1.3); centre.add(fig); centre.rotation.set(r.range(-0.3, 0.3), 0, r.range(-0.3, 0.3)); land.add(this.body(centre, { anchor: true, spin: 0.02 }));
    for (let i = 0; i < r.int(12, 20); i++) {
      const rad = r.range(4, 12) * (sc.mixed ? r.range(0.4, 2) : 1), isl = new THREE.Group(); isl.add(Shapes.island(rad, rad * 1.8)); this.decorate(isl, rad, r, sc, i);
      const u = r() * 2 - 1, a = r() * 6.28, d = r.range(0.45, 1.5) * size, s = Math.sqrt(1 - u * u);
      isl.position.set(Math.cos(a) * s * d, u * d * 0.7, Math.sin(a) * s * d); isl.rotation.set(r() * 6.28, r() * 6.28, r() * 6.28);
      land.add(this.body(isl, { spin: r.range(0.02, 0.08) * r.sign(), amp: 2 }));
    }
    for (let i = 0; i < 14; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.glow(), color: this.pal.mist, transparent: true, opacity: 0.12, depthWrite: false })); m.scale.setScalar(size * r.range(0.8, 1.6)); m.position.set(r.range(-1, 1) * size * 1.6, r.range(-1, 1) * size, r.range(-1, 1) * size * 1.6); land.add(m); }
    this.debris(r, size, sc, 30);
  },
  /* Inward: a little planet, everything standing up off its surface */
  planet(r, rules) {
    const sc = this.scaleRule(r), land = this.land, P = 42, size = 70; this.info.size = size;
    const ball = Shapes.mesh(new THREE.IcosahedronGeometry(P, rules.geometry === 'crystal' ? 2 : 4), Shapes.ctx.mats.stone, P * 2);
    const bp = ball.geometry.attributes.position; for (let i = 0; i < bp.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(bp, i), k = 1 + 0.035 * Math.sin(v.x * 0.2) * Math.cos(v.z * 0.17) + 0.02 * Math.sin(v.y * 0.3); v.multiplyScalar(k); bp.setXYZ(i, v.x, v.y, v.z); } ball.geometry.computeVertexNormals();
    const world = new THREE.Group(); world.add(ball); land.add(this.body(world, { anchor: true, spinY: 0.015 }));
    const place = (obj, u, a) => { const s = Math.sqrt(1 - u * u), n = new THREE.Vector3(Math.cos(a) * s, u, Math.sin(a) * s); obj.position.copy(n).multiplyScalar(P * 0.985); obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); world.add(obj); return obj; };
    const { g: mono } = this.monument(r, { mono: 0.7 * sc.mono, isl: 1, fig: 1 }); place(mono, 0.92, 0);
    place(Shapes.figure(sc.fig * 0.7, true), 0.86, 0.35);
    for (let i = 0; i < r.int(26, 44); i++) {
      const u = r.range(-0.95, 0.85), a = r() * 6.28, k = r(), m = sc.mixed ? r.range(0.4, 2.2) : 1;
      place(k < 0.35 ? Shapes.spire(r.range(6, 22) * m, r.range(1.2, 2.6)) : k < 0.55 ? Shapes.tower(r.range(5, 12) * m, 1.6) : k < 0.75 ? Shapes.tree(r.range(4, 9) * m) : k < 0.85 ? Shapes.door(1.4, 2.6) : Shapes.monolith(r.range(5, 10) * m), u, a);
    }
    for (let i = 0; i < 6; i++) { const moonlet = new THREE.Group(); moonlet.add(Shapes.island(r.range(2, 5), r.range(3, 7))); const a = r() * 6.28, d = P * r.range(1.5, 2.3); moonlet.position.set(Math.cos(a) * d, r.range(-0.5, 0.5) * P, Math.sin(a) * d); land.add(this.body(moonlet, { orbitR: d, spin: 0.05 })); }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.glow(), color: this.pal.mist, transparent: true, opacity: 0.35, depthWrite: false })); halo.scale.setScalar(P * 4.4); land.add(halo);
  },
  /* small things floating about: rocks, a door with no wall, a few stairs going nowhere */
  debris(r, size, sc, n = 18) {
    for (let i = 0; i < n; i++) {
      const k = r(), o = k < 0.6 ? (() => { const g = new THREE.Group(); g.add(Shapes.island(r.range(0.8, 3), r.range(1.5, 4))); return g; })() : k < 0.8 ? Shapes.door(r.range(1.2, 2.4), r.range(2.2, 4)) : Shapes.stairs(4, 0.6, 6, 0, 3);
      const a = r() * 6.28, d = r.range(0.25, 1.4) * size; o.position.set(Math.cos(a) * d, r.range(0.05, 0.5) * size, Math.sin(a) * d); o.rotation.set(r.range(-0.5, 0.5), r() * 6.28, r.range(-0.5, 0.5));
      if (sc.mixed) o.scale.setScalar(r.range(0.4, 3));
      this.land.add(this.body(o, { amp: 2.5, spin: r.range(0.03, 0.12) * r.sign(), debris: true }));
    }
  },
};
