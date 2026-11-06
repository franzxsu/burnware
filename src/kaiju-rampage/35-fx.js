/* ============================================================
   Effects: dust clouds, fire and sparks (soft round points that
   grow and fade), shockwave rings, flashes of light, splashes,
   and the camera shake that sells all of it.
   ============================================================ */
const PVERT = `attribute float size; attribute vec4 rgba; varying vec4 vC; varying float vF; uniform float scale;
void main(){ vC = rgba; vec4 mv = modelViewMatrix * vec4(position, 1.0); vF = -mv.z; gl_PointSize = size * scale / max(0.5, -mv.z); gl_Position = projectionMatrix * mv; }`;
const PFRAG = `varying vec4 vC; varying float vF; uniform vec3 fogColor; uniform float fogNear, fogFar, additive;
void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; float a = vC.a * smoothstep(0.5, 0.12, d);
  float f = smoothstep(fogNear, fogFar, vF); vec3 col = mix(vC.rgb, fogColor, f * (1.0 - additive)); a *= mix(1.0, 1.0 - f, additive); gl_FragColor = vec4(col, a); }`;
class Particles {
  constructor(scene, n, additive) {
    this.n = n; this.head = 0; this.add = additive;
    this.P = new Float32Array(n * 3); this.C = new Float32Array(n * 4); this.Sz = new Float32Array(n);
    this.V = new Float32Array(n * 3); this.L = new Float32Array(n); this.ML = new Float32Array(n); this.G = new Float32Array(n); this.S0 = new Float32Array(n); this.A0 = new Float32Array(n); this.Dr = new Float32Array(n); this.Gr = new Float32Array(n);
    const geo = new THREE.BufferGeometry();
    this.aP = new THREE.BufferAttribute(this.P, 3).setUsage(THREE.DynamicDrawUsage); this.aC = new THREE.BufferAttribute(this.C, 4).setUsage(THREE.DynamicDrawUsage); this.aS = new THREE.BufferAttribute(this.Sz, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.aP); geo.setAttribute('rgba', this.aC); geo.setAttribute('size', this.aS);
    const fog = World.scene.fog;
    this.mat = new THREE.ShaderMaterial({ vertexShader: PVERT, fragmentShader: PFRAG, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { scale: { value: 400 }, fogColor: { value: fog.color }, fogNear: { value: fog.near }, fogFar: { value: fog.far }, additive: { value: additive ? 1 : 0 } } });
    this.pts = new THREE.Points(geo, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = additive ? 3 : 2; scene.add(this.pts);
  }
  /* life in seconds, size in world units (grows by grow per second), drag 0..1 per second, g = gravity */
  emit(x, y, z, vx, vy, vz, r, g, b, a, size, life, grow = 0, drag = 0.6, grav = 0) {
    const s = this.head; this.head = (s + 1) % this.n;
    this.P[s * 3] = x; this.P[s * 3 + 1] = y; this.P[s * 3 + 2] = z; this.V[s * 3] = vx; this.V[s * 3 + 1] = vy; this.V[s * 3 + 2] = vz;
    this.C[s * 4] = r; this.C[s * 4 + 1] = g; this.C[s * 4 + 2] = b; this.A0[s] = a; this.S0[s] = size; this.L[s] = this.ML[s] = life; this.Gr[s] = grow; this.Dr[s] = drag; this.G[s] = grav;
  }
  update(dt) {
    const { n, P, V, C, Sz, L, ML, S0, A0, Gr, Dr, G } = this;
    for (let s = 0; s < n; s++) {
      if (L[s] <= 0) { if (C[s * 4 + 3] !== 0) { C[s * 4 + 3] = 0; Sz[s] = 0; } continue; }
      L[s] -= dt; const t = 1 - L[s] / ML[s], k = Math.pow(1 - Dr[s], dt), o = s * 3;
      V[o] *= k; V[o + 1] = V[o + 1] * k - G[s] * dt; V[o + 2] *= k;
      P[o] += V[o] * dt; P[o + 1] += V[o + 1] * dt; P[o + 2] += V[o + 2] * dt; if (P[o + 1] < 0.1) { P[o + 1] = 0.1; V[o + 1] = 0; }
      Sz[s] = S0[s] + Gr[s] * (ML[s] - L[s]);
      C[s * 4 + 3] = A0[s] * (t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88);
    }
    this.aP.needsUpdate = this.aC.needsUpdate = this.aS.needsUpdate = true;
  }
  clear() { this.L.fill(0); }
}
const Fx = {
  dustP: null, fireP: null, rings: [], lights: [], trauma: 0, shakeV: new THREE.Vector3(), t: 0,
  init(scene) {
    const touch = isTouch();
    this.dustP = new Particles(scene, touch ? 2600 : 4200, false);
    this.fireP = new Particles(scene, touch ? 1600 : 2600, true);
    const rg = new THREE.RingGeometry(0.82, 1, 48); rg.rotateX(-Math.PI / 2);
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); m.visible = false; scene.add(m); this.rings.push({ m, t: 1, life: 1, r: 1 }); }
    for (let i = 0; i < 2; i++) { const l = new THREE.PointLight(0xffa040, 0, 40, 2); scene.add(l); this.lights.push({ l, t: 0, power: 0 }); }
    this.resize();
  },
  resize() { const h = World.renderer.domElement.height, s = h / (2 * Math.tan(THREE.MathUtils.degToRad(World.camera.fov) / 2)); if (this.dustP) this.dustP.mat.uniforms.scale.value = this.fireP.mat.uniforms.scale.value = s; },
  dust(x, y, z, vx, vy, vz, size, life, shade = 1) { const l = (0.62 + Math.random() * 0.16) * shade; this.dustP.emit(x, y, z, vx, vy, vz, l * 1.08, l * 0.96, l * 0.88, 0.55, size, life, size * 0.7, 0.75, -0.3); },
  dustBurst(x, y, z, r, count) {
    const n = Math.min(26, 4 + Math.floor(count / 3));
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = rand(0.5, 1) * (2 + r); this.dust(x + Math.cos(a) * r * 0.5, y + rand(-0.5, 1.5), z + Math.sin(a) * r * 0.5, Math.cos(a) * s, rand(0, 2.5), Math.sin(a) * s, rand(2, 4.5) + r * 0.3, rand(1.8, 3.2)); }
  },
  fire(x, y, z, vx, vy, vz, size, life) { const h = Math.random(); this.fireP.emit(x, y, z, vx, vy, vz, 1, 0.55 + h * 0.35, 0.18 + h * 0.2, 0.9, size, life, -size * 0.5 / life, 0.9, -3); },
  spark(x, y, z, vx, vy, vz, cr = 1, cg = 0.85, cb = 0.5) { this.fireP.emit(x, y, z, vx, vy, vz, cr, cg, cb, 1, rand(0.25, 0.5), rand(0.25, 0.6), 0, 0.5, 14); },
  smoke(x, y, z, size = 2) { this.dustP.emit(x, y, z, rand(-0.6, 0.6), rand(2, 3.5), rand(-0.6, 0.6), 0.22, 0.2, 0.22, 0.6, size, rand(2.2, 3.4), size * 0.9, 0.5, -0.6); },
  splash(x, y, z, k = 1) { for (let i = 0; i < 4 + k * 6; i++) { const a = Math.random() * 6.283, s = rand(1, 3) * k; this.dustP.emit(x, y, z, Math.cos(a) * s, rand(4, 9) * k, Math.sin(a) * s, 0.86, 0.93, 1, 0.8, rand(0.5, 1.2) * (0.5 + k), rand(0.6, 1.1), 0.8, 0.3, 16); } },
  explosion(x, y, z, k = 1) {
    for (let i = 0; i < 18 * k; i++) { const a = Math.random() * 6.283, e = rand(-0.3, 1), s = rand(3, 10) * k; this.fire(x, y, z, Math.cos(a) * s * Math.cos(e), Math.sin(e) * s + 2, Math.sin(a) * s * Math.cos(e), rand(1.5, 3) * k, rand(0.4, 0.8)); }
    for (let i = 0; i < 10 * k; i++) this.spark(x, y, z, rand(-14, 14) * k, rand(4, 16) * k, rand(-14, 14) * k);
    for (let i = 0; i < 10 * k; i++) this.smoke(x + rand(-1.5, 1.5) * k, y + rand(0, 2), z + rand(-1.5, 1.5) * k, rand(2, 3.5) * k);
    this.flash(x, y + 1, z, 3 * k, 0xffa040); this.ring(x, Math.max(0.2, y - 1), z, 7 * k, 0.5);
  },
  ring(x, y, z, r, life = 0.6, color = 0xfff0d0) { const R = this.rings.find(q => q.t >= q.life) || this.rings[0]; R.t = 0; R.life = life; R.r = r; R.m.position.set(x, y + 0.15, z); R.m.material.color.setHex(color); R.m.visible = true; },
  flash(x, y, z, power, color = 0xffa040) { const L = this.lights.reduce((a, b) => (a.power < b.power ? a : b)); L.l.position.set(x, y, z); L.l.color.setHex(color); L.power = Math.max(L.power, power); },
  shake(amount) { this.trauma = Math.min(1, this.trauma + amount * (calm() ? 0.3 : 1)); },
  update(dt) {
    this.t += dt; this.dustP.update(dt); this.fireP.update(dt);
    for (const R of this.rings) { if (R.t >= R.life) { R.m.visible = false; continue; } R.t += dt; const k = R.t / R.life; R.m.scale.setScalar(0.5 + R.r * (1 - Math.pow(1 - k, 2))); R.m.material.opacity = 0.7 * (1 - k); }
    for (const L of this.lights) { L.power *= Math.pow(0.02, dt); L.l.intensity = L.power < 0.05 ? 0 : L.power; }
    this.trauma = Math.max(0, this.trauma - dt * 1.4);
    const s = this.trauma * this.trauma * 1.6, t = this.t * 40;
    this.shakeV.set(Math.sin(t * 1.1) * s, Math.sin(t * 1.7 + 1) * s * 0.7, Math.sin(t * 1.3 + 2) * s);
  },
  clear() { this.dustP.clear(); this.fireP.clear(); this.trauma = 0; for (const R of this.rings) R.t = R.life; },
};
