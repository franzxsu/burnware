/* ============================================================
   The world around the city: renderer, camera, a sunset sky,
   the sea, the river, the ground, trees, and a far skyline.
   1 unit = 1 voxel = 2 metres. The city grid is 128 x 64 x 128.
   ============================================================ */
const GW = 128, GH = 64, GD = 128, OX = -64, OZ = -64, CS = 16, PER = 18, ST = 4;
const RIV0 = 5 * PER + ST, RIV1 = 6 * PER;     // river: grid columns 94..107, world x 30..44
const BRIDGES = [2, 5];                        // east-west streets that cross the river on a bridge
const COAST = 64;                              // the sea starts south of world z = 64
const gi = (x) => Math.floor(x - OX), gk = (z) => Math.floor(z - OZ);
const isStreetCell = (i, k) => (i % PER) < ST || (k % PER) < ST;
const inRiverX = (x) => x >= OX + RIV0 && x < OX + RIV1;
const waterAt = (x, z) => z > COAST + 3 || (inRiverX(x) && z < COAST + 4);
function blockKind(bx, bz) {
  if (bx === 5) return 'river';
  const key = bx + ',' + bz;
  const special = { '3,3': 'kubo', '6,1': 'stadium', '1,1': 'park', '6,5': 'fuel', '0,6': 'docks', '1,6': 'docks', '6,6': 'docks' }[key];
  if (special) return special;
  if (bz === 6 || key === '0,5') return 'shops';
  const d = Math.max(Math.abs(bx - 3), Math.abs(bz - 3));
  return d === 1 ? 'towers' : d === 2 ? 'mid' : 'houses';
}
function groundCanvas() {
  const S = 8, W = GW * S, c = document.createElement('canvas'); c.width = c.height = W; const g = c.getContext('2d');
  const R = mulberry(7);
  g.fillStyle = '#8f8792'; g.fillRect(0, 0, W, W);
  g.fillStyle = 'rgba(30,20,40,.07)';
  for (let p = 0; p < W; p += S * 2) { g.fillRect(p, 0, 1, W); g.fillRect(0, p, W, 1); }
  for (let bz = 0; bz < 7; bz++) for (let bx = 0; bx < 7; bx++) {
    const kind = blockKind(bx, bz), x = (bx * PER + ST) * S, y = (bz * PER + ST) * S, w = (PER - ST) * S;
    if (kind === 'park') {
      g.fillStyle = '#5d8c45'; g.fillRect(x, y, w, w);
      g.fillStyle = '#c9b38a'; g.fillRect(x + w / 2 - S * 0.6, y, S * 1.2, w); g.fillRect(x, y + w / 2 - S * 0.6, w, S * 1.2);
      g.fillStyle = '#3f6f8f'; g.beginPath(); g.ellipse(x + w * 0.27, y + w * 0.72, S * 2.6, S * 1.8, 0.3, 0, Math.PI * 2); g.fill();
    } else if (kind === 'kubo') {
      for (let a = 0; a < 14; a++) for (let b = 0; b < 14; b++) { g.fillStyle = (a + b) % 2 ? '#b9a99a' : '#a39384'; g.fillRect(x + a * S, y + b * S, S, S); }
      g.strokeStyle = '#e3c27a'; g.lineWidth = 3; g.strokeRect(x + S * 2, y + S * 2, w - S * 4, w - S * 4);
    } else if (kind === 'houses') {
      g.fillStyle = '#6e8c52'; g.fillRect(x, y, w, w);
      g.fillStyle = 'rgba(255,255,255,.08)'; for (let n = 0; n < 40; n++) g.fillRect(x + R() * w, y + R() * w, 2, 2);
    } else if (kind === 'docks' || kind === 'fuel') {
      g.fillStyle = '#6c6670'; g.fillRect(x, y, w, w);
      g.strokeStyle = 'rgba(255,214,90,.6)'; g.lineWidth = 2; for (let n = 1; n < 5; n++) { g.beginPath(); g.moveTo(x, y + n * w / 5); g.lineTo(x + w, y + n * w / 5); g.stroke(); }
    } else if (kind === 'stadium') {
      g.fillStyle = '#7b737e'; g.fillRect(x, y, w, w);
    } else if (kind === 'towers' || kind === 'mid' || kind === 'shops') {
      g.fillStyle = '#9a8f93'; g.fillRect(x + S, y + S, w - S * 2, w - S * 2);
    }
  }
  g.fillStyle = '#3a3643';
  for (let p = 0; p < GW; p += PER) { g.fillRect(p * S, 0, ST * S, W); g.fillRect(0, p * S, W, ST * S); }
  g.fillStyle = '#b8adb4';   // kerbs
  for (let p = 0; p < GW; p += PER) { g.fillRect(p * S - 1, 0, 2, W); g.fillRect((p + ST) * S - 1, 0, 2, W); g.fillRect(0, p * S - 1, W, 2); g.fillRect(0, (p + ST) * S - 1, W, 2); }
  g.fillStyle = '#d9b14c';   // centre dashes
  for (let p = 0; p < GW; p += PER) {
    const m = (p + 2) * S - 1;
    for (let q = 0; q < W; q += S * 3) { if ((q / S) % PER < ST) continue; g.fillRect(m, q, 2, S * 1.5); g.fillRect(q, m, S * 1.5, 2); }
  }
  g.fillStyle = 'rgba(240,235,225,.75)';   // crosswalks
  for (let a = 0; a < GW; a += PER) for (let b = 0; b < GW; b += PER) {
    for (let s = 0; s < 4; s++) {
      const o = a * S + s * S + 2;
      g.fillRect(o, (b + ST) * S + 2, S - 4, S * 1.2); g.fillRect(o, b * S - S * 1.2 - 2, S - 4, S * 1.2);
      g.fillRect((b + ST) * S + 2, o, S * 1.2, S - 4); g.fillRect(b * S - S * 1.2 - 2, o, S * 1.2, S - 4);
    }
  }
  g.fillStyle = '#26405a'; g.fillRect(RIV0 * S, 0, (RIV1 - RIV0) * S, W);
  g.fillStyle = '#5e5660'; g.fillRect(RIV0 * S - 3, 0, 3, W); g.fillRect(RIV1 * S, 0, 3, W);
  return c;
}
function windowCanvas(lit) {
  const c = document.createElement('canvas'); c.width = 32; c.height = 64; const g = c.getContext('2d'), R = mulberry(lit ? 3 : 3);
  g.fillStyle = lit ? '#000' : '#5a5068'; g.fillRect(0, 0, 32, 64);
  for (let y = 2; y < 62; y += 4) for (let x = 2; x < 30; x += 4) { const on = R() < 0.3; g.fillStyle = lit ? (on ? '#ffd38a' : '#000') : (on ? '#ffd38a' : '#2f2a3f'); g.fillRect(x, y, 2, 2); }
  return c;
}
const World = {
  renderer: null, scene: null, camera: null, sun: null, t: 0, waters: [], sky: null,
  init(el) {
    const touch = isTouch();
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 1.75));
    r.setSize(innerWidth, innerHeight); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(r.domElement);
    const s = this.scene = new THREE.Scene();
    const FOG = 0xe8906f;
    s.fog = new THREE.Fog(FOG, 100, 360); s.background = new THREE.Color(FOG);
    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.5, 1200);
    s.add(new THREE.HemisphereLight(0xa894e6, 0x5c3c3a, 0.66));
    const sun = this.sun = new THREE.DirectionalLight(0xffc28c, 1.05);
    this.sunDir = new THREE.Vector3(-0.7, 0.46, 0.34).normalize();
    sun.position.copy(this.sunDir).multiplyScalar(170); sun.target.position.set(0, 0, 0);
    sun.castShadow = true; const sc = sun.shadow.camera; sc.left = -98; sc.right = 98; sc.top = 98; sc.bottom = -98; sc.near = 20; sc.far = 380;
    sun.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
    s.add(sun, sun.target);
    // sky dome, drawn behind everything; at the horizon it matches the fog
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color(0x251d4d) }, mid: { value: new THREE.Color(0xb0507c) }, glow: { value: new THREE.Color(0xffa766) }, fog: { value: new THREE.Color(FOG) }, sunDir: { value: new THREE.Vector3(-0.86, 0.13, 0.49).normalize() }, sunCol: { value: new THREE.Color(0xffe6b8) } },
      vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
      fragmentShader: `uniform vec3 top, mid, glow, fog, sunCol, sunDir; varying vec3 vD;
        void main(){ vec3 d = normalize(vD); float h = d.y; float s = max(dot(d, sunDir), 0.0);
          vec3 g2 = mix(glow, vec3(1.0,0.78,0.55), pow(s, 6.0) * 0.6);
          vec3 c = mix(fog, g2, smoothstep(0.0, 0.06, h)); c = mix(c, mid, smoothstep(0.06, 0.36, h)); c = mix(c, top, smoothstep(0.36, 0.9, h));
          c += sunCol * (smoothstep(0.9985, 0.9993, s) * 1.6 + pow(s, 40.0) * 0.32 + pow(s, 5.0) * 0.1);
          if (h < 0.0) c = fog;
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false,
    }));
    this.sky.renderOrder = -10; this.sky.frustumCulled = false; s.add(this.sky);
    // ground
    const tex = new THREE.CanvasTexture(groundCanvas()); tex.anisotropy = Math.min(8, r.capabilities.getMaxAnisotropy());
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(GW, GD), new THREE.MeshLambertMaterial({ map: tex }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(1400, 760), new THREE.MeshLambertMaterial({ color: 0x6c5f66 }));
    outer.rotation.x = -Math.PI / 2; outer.position.set(0, -0.04, COAST - 380); s.add(outer);
    const beach = new THREE.Mesh(new THREE.PlaneGeometry(1400, 10), new THREE.MeshLambertMaterial({ color: 0xd8b48a }));
    beach.rotation.x = -Math.PI / 2; beach.position.set(0, -0.02, COAST + 5); beach.receiveShadow = true; s.add(beach);
    // the sea and the river: low-poly water that heaves a little
    const wmat = new THREE.MeshPhongMaterial({ color: 0x3d6c8e, specular: 0xffc49a, shininess: 70, flatShading: true });
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 640, 140, 64), wmat); sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.06, COAST + 3 + 320); sea.receiveShadow = true; s.add(sea);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(RIV1 - RIV0, 760, 4, 190), wmat); river.rotation.x = -Math.PI / 2; river.position.set(OX + (RIV0 + RIV1) / 2, 0.14, COAST + 4 - 380); river.receiveShadow = true; s.add(river);
    for (const m of [sea, river]) { const p = m.geometry.attributes.position; this.waters.push({ p, base: Float32Array.from(p.array), m }); }
    this.farCity(); this.mountains();
    Trees.init(s);
    addEventListener('resize', () => this.resize());
  },
  farCity() {
    const R = mulberry(42), N = 260, geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const map = new THREE.CanvasTexture(windowCanvas(false)), emis = new THREE.CanvasTexture(windowCanvas(true));
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ map, emissive: 0xffffff, emissiveMap: emis, emissiveIntensity: 0.85 }), N);
    const m = new THREE.Matrix4(), col = new THREE.Color(); let n = 0;
    for (let tries = 0; n < N && tries < 4000; tries++) {
      const x = (R() * 2 - 1) * 300, z = -320 + R() * 380;
      if (Math.abs(x) < 82 && z > -82) continue; if (z > COAST - 8) continue; if (x > 20 && x < 54) continue;
      const far = Math.min(1, Math.hypot(x, z) / 300), hgt = 8 + R() * 22 + (1 - far) * 10 + (z < -150 ? R() * 18 : 0), w = 7 + R() * 9, d = 7 + R() * 9;
      m.makeScale(w, hgt, d); m.setPosition(x, 0, z); mesh.setMatrixAt(n, m);
      col.setHSL(0.72 + R() * 0.08, 0.12, 0.42 + R() * 0.18); mesh.setColorAt(n, col); n++;
    }
    mesh.count = n; this.scene.add(mesh);
  },
  mountains() {
    const mat = new THREE.MeshLambertMaterial({ color: 0x4b3a5e, flatShading: true });
    [[-260, -520, 150, 110], [60, -600, 210, 150], [330, -500, 160, 95], [-480, -380, 120, 70]].forEach(([x, z, r, h]) => {
      const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7, 1), mat); c.position.set(x, h / 2 - 4, z); c.rotation.y = x; this.scene.add(c);
    });
  },
  resize() {
    const r = this.renderer, c = this.camera; r.setSize(innerWidth, innerHeight); c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix();
    if (window.Fx && Fx.resize) Fx.resize();
  },
  update(dt) {
    this.t += dt; const t = this.t;
    for (const w of this.waters) {
      const a = w.p.array, b = w.base;
      for (let i = 0; i < a.length; i += 3) { const x = b[i], y = b[i + 1]; a[i + 2] = Math.sin(x * 0.09 + t * 0.9) * 0.22 + Math.cos(y * 0.13 - t * 1.1) * 0.18 + Math.sin((x + y) * 0.21 + t * 1.7) * 0.07; }
      w.p.needsUpdate = true;
    }
    this.sky.position.copy(this.camera.position);
  },
};
/* Trees: instanced trunks and crowns. They snap when anything big touches them. */
const Trees = {
  list: [], trunk: null, crown: null, m: new THREE.Matrix4(), col: new THREE.Color(),
  init(scene) { this.scene = scene; },
  add(x, z, s = 1) { this.list.push({ x, z, s, alive: true, hue: Math.random() }); },
  build() {
    const n = this.list.length; if (this.trunk) { this.scene.remove(this.trunk, this.crown); }
    const tg = new THREE.BoxGeometry(0.5, 1.6, 0.5); tg.translate(0, 0.8, 0);
    const cg = new THREE.IcosahedronGeometry(1.25, 0); cg.translate(0, 2.4, 0);
    this.trunk = new THREE.InstancedMesh(tg, new THREE.MeshLambertMaterial({ color: 0x6b4a33 }), Math.max(1, n));
    this.crown = new THREE.InstancedMesh(cg, new THREE.MeshLambertMaterial({ flatShading: true }), Math.max(1, n));
    this.list.forEach((t, i) => this.place(i));
    for (const m of [this.trunk, this.crown]) { m.castShadow = true; m.receiveShadow = true; this.scene.add(m); }
  },
  place(i) {
    const t = this.list[i], m = this.m;
    if (t.alive) { m.makeScale(t.s, t.s * (0.9 + t.hue * 0.3), t.s); m.setPosition(t.x, 0, t.z); } else m.makeScale(0, 0, 0);
    this.trunk.setMatrixAt(i, m); this.crown.setMatrixAt(i, m);
    this.col.setHSL(0.26 + t.hue * 0.08, 0.45, 0.32 + t.hue * 0.1); this.crown.setColorAt(i, this.col);
    this.trunk.instanceMatrix.needsUpdate = this.crown.instanceMatrix.needsUpdate = true; if (this.crown.instanceColor) this.crown.instanceColor.needsUpdate = true;
  },
  hit(x, z, r) {
    let n = 0;
    for (let i = 0; i < this.list.length; i++) {
      const t = this.list[i]; if (!t.alive) continue;
      const dx = t.x - x, dz = t.z - z; if (dx * dx + dz * dz > r * r) continue;
      t.alive = false; this.place(i); n++;
      for (let q = 0; q < 4; q++) Debris.spawn(t.x + rand(-1, 1), 2 + rand(0, 1.5), t.z + rand(-1, 1), dx * 0.8 + rand(-3, 3), rand(4, 9), dz * 0.8 + rand(-3, 3), 21, 0.7);
    }
    return n;
  },
  reset() { for (const t of this.list) t.alive = true; this.list.forEach((t, i) => this.place(i)); },
};
