/* ============================================================
   Effects: dust, skid marks, chase camera, miniature (tilt-shift)
   ============================================================ */
class Particles {
  constructor(scene, max) {
    this.max = max; this.n = 0; this.head = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.alp = new Float32Array(max); this.siz = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.grow = new Float32Array(max);
    this.a0 = new Float32Array(max); this.drag = new Float32Array(max); this.grav = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('pcolor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alp, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.siz, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 400 }, fogColor: { value: new THREE.Color(0xffffff) }, fogNear: { value: 100 }, fogFar: { value: 500 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 pcolor;
        uniform float uScale; uniform float fogNear; uniform float fogFar;
        varying vec3 vC; varying float vA; varying float vF;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = min(size * uScale / max(-mv.z, 0.5), 300.0); vC = pcolor; vA = alpha; vF = smoothstep(fogNear, fogFar, -mv.z); }`,
      fragmentShader: `uniform vec3 fogColor; varying vec3 vC; varying float vA; varying float vF;
        void main() { vec2 p = gl_PointCoord - 0.5; float d = length(p); float a = smoothstep(0.5, 0.12, d) * vA;
          if (a < 0.01) discard; vec3 c = vC * (0.86 + 0.28 * (0.5 - p.y)); gl_FragColor = vec4(mix(c, fogColor, vF), a); }`,
      transparent: true, depthWrite: false,
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 2;
    scene.add(this.points);
  }
  emit(x, y, z, vx, vy, vz, size, life, r, g, b, a, grow, drag = 1.6, grav = -0.4) {
    const i = this.head; this.head = (this.head + 1) % this.max; if (this.n < this.max) this.n++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b;
    this.siz[i] = size; this.life[i] = life; this.maxLife[i] = life; this.a0[i] = a; this.alp[i] = a; this.grow[i] = grow; this.drag[i] = drag; this.grav[i] = grav;
  }
  update(dt) {
    const P = this.pos, V = this.vel;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.alp[i] = 0; continue; }
      this.life[i] -= dt;
      const f = Math.exp(-this.drag[i] * dt);
      V[i * 3] *= f; V[i * 3 + 1] = V[i * 3 + 1] * f + this.grav[i] * dt; V[i * 3 + 2] *= f;
      P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt;
      this.siz[i] += this.grow[i] * dt;
      const t = this.life[i] / this.maxLife[i];
      this.alp[i] = this.a0[i] * Math.min(1, t * 1.6) * Math.min(1, (1 - t) * 8 + 0.2);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.alpha.needsUpdate = true; g.attributes.size.needsUpdate = true; g.attributes.pcolor.needsUpdate = true;
    g.setDrawRange(0, this.n);
  }
  clear() { this.life.fill(0); this.alp.fill(0); }
}

class Skids {
  constructor(scene, max) {
    this.max = max; this.k = 0; this.last = {};
    this.pos = new Float32Array(max * 4 * 3); this.col = new Float32Array(max * 4 * 4);
    const idx = new Uint32Array(max * 6);
    for (let q = 0; q < max; q++) { const b = q * 4; idx.set([b, b + 1, b + 2, b + 1, b + 3, b + 2], q * 6); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('scol', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { fogColor: { value: new THREE.Color() }, fogNear: { value: 100 }, fogFar: { value: 500 } },
      vertexShader: `attribute vec4 scol; varying vec4 vC; varying float vF; uniform float fogNear; uniform float fogFar;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; vC = scol; vF = smoothstep(fogNear, fogFar, -mv.z); }`,
      fragmentShader: `varying vec4 vC; varying float vF; uniform vec3 fogColor; void main() { gl_FragColor = vec4(mix(vC.rgb, fogColor, vF), vC.a * (1.0 - vF)); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 1;
    scene.add(this.mesh);
    this.dirty = false;
  }
  add(key, x, y, z, w, c, a) {
    const L = this.last[key];
    if (!L) { this.last[key] = { x, y, z, lx: 0, lz: 0, rx: 0, rz: 0, fresh: true }; return; }
    const dx = x - L.x, dz = z - L.z, d = Math.hypot(dx, dz);
    if (d < 0.35) return;
    if (d > 3) { this.last[key] = { x, y, z, fresh: true }; return; }
    const px = -dz / d * w / 2, pz = dx / d * w / 2;
    const q = this.k; this.k = (this.k + 1) % this.max;
    const P = this.pos, C = this.col, o = q * 12;
    const lx1 = L.fresh ? L.x + px : L.lx, lz1 = L.fresh ? L.z + pz : L.lz, rx1 = L.fresh ? L.x - px : L.rx, rz1 = L.fresh ? L.z - pz : L.rz;
    P.set([lx1, L.y, lz1, rx1, L.y, rz1, x + px, y, z + pz, x - px, y, z - pz], o);
    for (let v = 0; v < 4; v++) C.set([c[0], c[1], c[2], v < 2 ? (L.a !== undefined ? L.a : a) : a], q * 16 + v * 4);
    this.last[key] = { x, y, z, lx: x + px, lz: z + pz, rx: x - px, rz: z - pz, a, fresh: false };
    this.dirty = true;
  }
  lift(key) { this.last[key] = null; }
  update() {
    if (!this.dirty) return; this.dirty = false;
    const g = this.mesh.geometry; g.attributes.position.needsUpdate = true; g.attributes.scol.needsUpdate = true;
  }
  clear() { this.col.fill(0); this.last = {}; this.dirty = true; this.update(); }
}

class ChaseCam {
  constructor(camera) {
    this.cam = camera; this.mode = 'pocket'; this.yaw = 0; this.pos = new THREE.Vector3(); this.look = new THREE.Vector3();
    this.shake = 0; this.inited = false; this.fov = 55;
  }
  setMode(m) { if (m !== this.mode && (m === 'hood' || this.mode === 'hood')) this.inited = false; this.mode = m; this.cam.up.set(0, 1, 0); }
  /* bumper camera: rigid with the body, with the roll and pitch softened so it stays watchable */
  hood(dt, car) {
    const S = car.spec, root = car.mesh ? car.mesh.root : null;
    const p = root ? root.position : car.pos, q = root ? root.quaternion : car.quat;
    if (!this.inited || !this.hq) { this.hq = q.clone(); this.inited = true; }
    this.hq.slerp(q, 1 - Math.exp(-16 * dt));
    const up = Math.max(0.68, (S.roof || 1.3) * 0.5) - (S.ride || 0.49);
    const off = new THREE.Vector3(0, up, (S.len || 4) / 2 + 0.12).applyQuaternion(q);
    const f = new THREE.Vector3(0, 0, 1).applyQuaternion(this.hq);
    const u = new THREE.Vector3(0, 1, 0).applyQuaternion(this.hq).lerp(new THREE.Vector3(0, 1, 0), 0.55).normalize();
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const s = this.shake * this.shake * 0.12;
    this.cam.position.set(p.x + off.x + (Math.random() - 0.5) * s, p.y + off.y + (Math.random() - 0.5) * s, p.z + off.z);
    this.cam.up.copy(u);
    this.look.set(this.cam.position.x + f.x * 12, this.cam.position.y + f.y * 12 - 0.35, this.cam.position.z + f.z * 12);
    this.cam.lookAt(this.look);
    this.pos.copy(this.cam.position); this.yaw = Math.atan2(car.az.x, car.az.z);
    const fov = 64 + clamp(car.speed / 40, 0, 1) * 12;
    if (Math.abs(fov - this.cam.fov) > 0.05) { this.cam.fov = damp(this.cam.fov, fov, 3, dt); this.cam.updateProjectionMatrix(); }
  }
  update(dt, car, world) {
    if (this.mode === 'hood') return this.hood(dt, car);
    if (this.cam.up.y !== 1) this.cam.up.set(0, 1, 0);
    const fwd = Math.atan2(car.az.x, car.az.z);
    let target = fwd;
    if (car.speed > 6 && car.vF > 0) target = fwd + clamp(wrapAngle(Math.atan2(car.vel.x, car.vel.z) - fwd), -0.6, 0.6) * 0.55;
    if (car.vF < -2) target = fwd;
    if (!this.inited) { this.yaw = target; }
    this.yaw = dampAngle(this.yaw, target, this.mode === 'chase' ? 4.5 : 2.6, dt);
    const M = { pocket: [15.5, 10.5, 2.0], chase: [6.6, 2.5, 1.0], far: [24, 17, 3] }[this.mode];
    const sp = clamp(car.speed / 40, 0, 1);
    const dist = M[0] + sp * (this.mode === 'chase' ? 1.4 : 2.5), h = M[1] + sp * 0.6;
    const want = new THREE.Vector3(car.pos.x - Math.sin(this.yaw) * dist, car.pos.y + h, car.pos.z - Math.cos(this.yaw) * dist);
    const gh = world.heightAt(want.x, want.z, car.idx) + 1.6;
    if (want.y < gh) want.y = gh;
    const lookAt = new THREE.Vector3(car.pos.x + Math.sin(this.yaw) * M[2] * 2, car.pos.y + (this.mode === 'chase' ? 0.9 : 0.4), car.pos.z + Math.cos(this.yaw) * M[2] * 2);
    if (!this.inited) { this.pos.copy(want); this.look.copy(lookAt); this.inited = true; }
    const k = 1 - Math.exp(-(this.mode === 'chase' ? 9 : 5.5) * dt);
    this.pos.lerp(want, k); this.look.lerp(lookAt, 1 - Math.exp(-12 * dt));
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const s = this.shake * this.shake * 0.5;
    this.cam.position.set(this.pos.x + (Math.random() - 0.5) * s, this.pos.y + (Math.random() - 0.5) * s, this.pos.z + (Math.random() - 0.5) * s);
    this.cam.lookAt(this.look);
    const fov = (this.mode === 'chase' ? 62 : 50) + sp * 9;
    if (Math.abs(fov - this.cam.fov) > 0.05) { this.cam.fov = damp(this.cam.fov, fov, 3, dt); this.cam.updateProjectionMatrix(); }
  }
  bump(a) { this.shake = Math.min(1.2, Math.max(this.shake, a)); }
}

/* miniature look: blur the top and bottom of the frame, lift saturation a touch */
class TiltShift {
  constructor(renderer) {
    this.r = renderer; this.enabled = true;
    const isGL2 = renderer.capabilities.isWebGL2;
    const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
    this.rtA = isGL2 && THREE.WebGLMultisampleRenderTarget ? new THREE.WebGLMultisampleRenderTarget(4, 4, opts) : new THREE.WebGLRenderTarget(4, 4, opts);
    this.rtB = new THREE.WebGLRenderTarget(4, 4, opts);
    const vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
    const blur = (final) => new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, delta: { value: new THREE.Vector2() }, focus: { value: 0.46 }, band: { value: 0.16 }, amount: { value: 1 }, sat: { value: 1.06 } },
      vertexShader: vs,
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 delta; uniform float focus; uniform float band; uniform float amount; uniform float sat; varying vec2 vUv;
        void main(){ float d = abs(vUv.y - focus); float r = clamp((d - band) / (0.55 - band), 0.0, 1.0); r = r * r * amount;
          vec4 s = vec4(0.0); float ws = 0.0;
          for (int i = -4; i <= 4; i++) { float w = 1.0 - abs(float(i)) / 5.0; s += texture2D(tDiffuse, vUv + delta * float(i) * r) * w; ws += w; }
          vec4 c = s / ws;
          ${final ? 'float l = dot(c.rgb, vec3(0.299, 0.587, 0.114)); c.rgb = mix(vec3(l), c.rgb, sat); vec2 q = vUv - 0.5; c.rgb *= 1.0 - dot(q, q) * 0.45;' : ''}
          gl_FragColor = vec4(c.rgb, 1.0); }`,
      depthTest: false, depthWrite: false,
    });
    this.mH = blur(false); this.mV = blur(true);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mH); this.quad.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.quad); this.ocam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  setSize(w, h) { this.rtA.setSize(w, h); this.rtB.setSize(w, h); this.w = w; this.h = h; }
  setAmount(a) { this.mH.uniforms.amount.value = a; this.mV.uniforms.amount.value = a; }
  render(scene, camera) {
    if (!this.enabled) { this.r.setRenderTarget(null); this.r.render(scene, camera); return; }
    const px = 2.6 / Math.max(this.h, 1);
    this.r.setRenderTarget(this.rtA); this.r.render(scene, camera);
    this.quad.material = this.mH; this.mH.uniforms.tDiffuse.value = this.rtA.texture; this.mH.uniforms.delta.value.set(px * this.h / this.w, 0);
    this.r.setRenderTarget(this.rtB); this.r.render(this.scene, this.ocam);
    this.quad.material = this.mV; this.mV.uniforms.tDiffuse.value = this.rtB.texture; this.mV.uniforms.delta.value.set(0, px);
    this.r.setRenderTarget(null); this.r.render(this.scene, this.ocam);
  }
}

/* rain streaks or snowflakes in a box that travels with the camera; drops stay put in the world and wrap */
class Precip {
  constructor(scene, kind, night) {
    this.kind = kind;
    const snow = kind === 'snow', n = snow ? 1600 : 2200, box = snow ? new THREE.Vector3(70, 36, 70) : new THREE.Vector3(56, 30, 56);
    const per = snow ? 1 : 2, seed = new Float32Array(n * per * 4), rnd = mulberry32(99);
    for (let i = 0; i < n; i++) {
      const x = rnd(), y = rnd(), z = rnd(), w = rnd();
      for (let e = 0; e < per; e++) seed.set([x, y, z, snow ? w : e], (i * per + e) * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * per * 3), 3));   // unused, three wants it
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
    const col = snow ? (night ? 0x9aa6c0 : 0xffffff) : (night ? 0x5d6880 : 0xc9d3e0);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uCam: { value: new THREE.Vector3() }, uT: { value: 0 }, uBox: { value: box }, uFall: { value: snow ? 2.2 : 24 }, uWind: { value: new THREE.Vector2(snow ? 0.8 : 2.5, snow ? 0.3 : 1.2) },
        uLen: { value: 1.1 }, uColor: { value: new THREE.Color(col) }, uAlpha: { value: snow ? 0.9 : (night ? 0.4 : 0.32) }, uScale: { value: 400 } },
      vertexShader: `uniform vec3 uCam; uniform float uT; uniform vec3 uBox; uniform float uFall; uniform vec2 uWind; uniform float uLen; uniform float uScale;
        attribute vec4 seed; varying float vA;
        void main() {
          vec3 vel = vec3(uWind.x, -uFall, uWind.y);
          vec3 p = seed.xyz * uBox + vel * uT;
          ${snow ? 'p.x += sin(uT * 1.3 + seed.w * 6.283) * 0.7; p.z += cos(uT * 1.1 + seed.w * 6.283) * 0.7;' : ''}
          p = mod(p - uCam + uBox * 0.5, uBox) + uCam - uBox * 0.5;
          ${snow ? '' : 'p -= normalize(vel) * uLen * seed.w;'}
          vA = 1.0 - smoothstep(uBox.x * 0.22, uBox.x * 0.5, length(p.xz - uCam.xz));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          ${snow ? 'gl_PointSize = min(uScale * (0.09 + 0.09 * seed.w) / max(-mv.z, 0.5), 30.0);' : ''}
        }`,
      fragmentShader: `uniform vec3 uColor; uniform float uAlpha; varying float vA;
        void main() {
          float a = uAlpha * vA;
          ${snow ? 'float d = length(gl_PointCoord - 0.5); a *= smoothstep(0.5, 0.15, d);' : ''}
          if (a < 0.01) discard;
          gl_FragColor = vec4(uColor, a);
        }`,
      transparent: true, depthWrite: false, fog: false,
    });
    this.mesh = snow ? new THREE.Points(g, this.mat) : new THREE.LineSegments(g, this.mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 4;
    scene.add(this.mesh);
  }
  update(dt, cam) { const u = this.mat.uniforms; u.uT.value = (u.uT.value + dt) % 600; u.uCam.value.copy(cam); }
}
