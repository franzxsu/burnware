/* ============================================================
   Rendering: low-poly rally cars, SUVs, buggies and trucks
   ============================================================ */
R.doorTex = function (num, bg) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 128; c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.beginPath();
  if (x.roundRect) x.roundRect(4, 4, 120, 88, 18); else x.rect(4, 4, 120, 88);
  x.fill(); x.lineWidth = 6; x.strokeStyle = bg; x.stroke();
  x.fillStyle = '#121418'; x.font = 'bold 64px "Saira Condensed", "Arial Narrow", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(String(num), 64, 52);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
};

/* body shapes; every part is a coloured box merged into one mesh */
R.carParts = function (spec, livery) {
  const P = [], type = spec.type || 'sedan', ride = spec.ride || 0.49;
  const gy = (h) => h - ride;
  const L = spec.len, hl = L / 2, BW = spec.tw + 0.3;
  const body = R.rgb(livery.color), acc = R.rgb(livery.accent), str = R.rgb(livery.stripe);
  const glass = [0.13, 0.17, 0.24], dark = [0.13, 0.13, 0.15], chrome = [0.76, 0.78, 0.82], lamp = [1, 0.97, 0.8];
  const box = (w, h, d, x, y, z, color, rx = 0, ry = 0, rz = 0, jitter) => P.push({ g: new THREE.BoxGeometry(w, h, d), m: R.M(x, y, z, rx, ry, rz), color, jitter });
  const cyl = (rad, len, x, y, z, color, rx = 0, rz = 0, seg = 8) => P.push({ g: new THREE.CylinderGeometry(rad, rad, len, seg), m: R.M(x, y, z, rx, 0, rz), color });
  const lamps = (n, y, z, spacing, rad = 0.12) => { for (let k = 0; k < n; k++) cyl(rad, 0.08, (k - (n - 1) / 2) * spacing, y, z, (lx, ly) => (ly > 0.03 ? lamp : dark), Math.PI / 2); };
  const flaps = (h0) => { for (const sx of [-1, 1]) for (const fz of [1, -1]) box(0.3, 0.26, 0.03, sx * (spec.tw / 2), gy(h0), fz * spec.wb / 2 - (spec.r || 0.31) - 0.12, fz < 0 ? acc : dark); };
  const lights = { head: [], tail: [] };
  if (type === 'hatch' || type === 'coupe' || type === 'sedan') {
    const low = type === 'coupe' ? 0.92 : 1;
    box(BW, 0.5, L, 0, gy(0.48), 0, body, 0, 0, 0,
      (x, y, z) => [0, (y > 0 ? -0.11 * clamp(z / hl, 0, 1) * (type === 'coupe' ? 1.4 : 1) - (type === 'hatch' ? 0 : 0.05) * clamp(-z / hl, 0, 1) : 0.06 * clamp(Math.abs(z) / hl - 0.6, 0, 1) * 2.5), 0]);
    const cl = L * (type === 'hatch' ? 0.56 : 0.5), cz = -L * (type === 'hatch' ? 0.1 : 0.07);
    P.push({ g: new THREE.BoxGeometry(BW - 0.12, 0.48 * low, cl), m: R.M(0, gy(0.94 * low + 0.0), cz),
      jitter: (x, y, z) => (y > 0 ? [-x * 0.17, 0, -z * (type === 'hatch' ? 0.16 : 0.28) + (z > 0 ? -0.02 : 0.05)] : [0, 0, 0]), color: glass });
    box((BW - 0.12) * 0.82, 0.07, cl * 0.7, 0, gy(1.21 * low), cz + 0.02, body);
    for (const sx of [-1, 1]) box(0.06, 0.46, 0.08, sx * (BW - 0.12) * 0.44, gy(0.94 * low), cz + cl * 0.02, body, 0, 0, sx * 0.16);
    for (const sx of [-0.16, 0.16]) {
      box(0.15, 0.02, hl - cl / 2 + 0.05, sx, gy(0.69), hl - (hl - cl / 2) / 2 + 0.02, str, -0.11);
      box(0.15, 0.02, cl * 0.7, sx, gy(1.25 * low), cz + 0.02, str);
    }
    box(BW + 0.04, 0.2, 0.22, 0, gy(0.32), hl - 0.02, acc);
    box(BW + 0.04, 0.2, 0.2, 0, gy(0.34), -hl + 0.02, dark);
    box(BW * 0.7, 0.05, 0.9, 0, gy(0.22), hl - 0.5, chrome);
    for (const sx of [-1, 1]) { box(0.34, 0.12, 0.05, sx * (BW / 2 - 0.25), gy(0.56), hl + 0.005, lamp); lights.head.push([sx * (BW / 2 - 0.25), gy(0.56), hl + 0.03]); lights.tail.push([sx * (BW / 2 - 0.22), gy(0.59), -hl - 0.005]); }
    lamps(4, gy(0.57), hl + 0.16, 0.3);
    box(1.25, 0.05, 0.08, 0, gy(0.47), hl + 0.12, dark);
    flaps(0.13);
    if (type !== 'hatch') {
      box(BW - 0.1, 0.05, 0.34, 0, gy(1.15), -hl + 0.2, acc, -0.08);
      for (const sx of [-1, 1]) box(0.05, 0.36, 0.16, sx * (BW / 2 - 0.25), gy(0.95), -hl + 0.24, dark);
    }
    if (spec.turbo) box(0.42, 0.08, 0.36, 0, gy(0.69), hl * 0.45, dark, -0.1);
    if (type === 'hatch') box(0.8, 0.12, 0.6, 0, gy(1.31), cz, acc);
    lights.pod = [0, gy(0.57), hl + 0.2]; lights.tailW = 0.3;
  } else if (type === 'suv') {
    box(BW + 0.06, 0.72, L, 0, gy(0.78), 0, body, 0, 0, 0, (x, y, z) => [0, y > 0 && z > hl * 0.5 ? -0.07 : 0, 0]);
    box(BW + 0.08, 0.12, L * 0.9, 0, gy(0.66), 0, acc);                                     // side stripe band
    const cl = L * 0.6, cz = -L * 0.09;
    P.push({ g: new THREE.BoxGeometry(BW - 0.06, 0.56, cl), m: R.M(0, gy(1.42), cz), jitter: (x, y, z) => (y > 0 ? [-x * 0.06, 0, z > 0 ? -0.12 : 0] : [0, 0, 0]), color: glass });
    box(BW - 0.1, 0.08, cl * 0.92, 0, gy(1.73), cz - 0.04, body);
    for (const sx of [-1, 1]) { box(0.07, 0.56, 0.1, sx * (BW / 2 - 0.05), gy(1.42), cz + cl / 2 - 0.12, body); box(0.07, 0.56, 0.12, sx * (BW / 2 - 0.04), gy(1.42), cz - cl / 2 + 0.05, body); }
    for (const sx of [-0.55, 0.55]) box(0.05, 0.05, cl * 0.85, sx, gy(1.82), cz, dark);   // roof rack
    for (const rz of [-0.6, 0, 0.6]) box(BW - 0.3, 0.04, 0.05, 0, gy(1.84), cz + rz, dark);
    lamps(4, gy(1.86), cz + cl * 0.42, 0.28, 0.11);
    // bull bar and bumpers
    box(BW + 0.02, 0.22, 0.24, 0, gy(0.5), hl + 0.04, dark);
    for (const sx of [-0.5, 0.5]) box(0.06, 0.62, 0.06, sx, gy(0.82), hl + 0.2, chrome);
    box(1.15, 0.06, 0.06, 0, gy(1.12), hl + 0.2, chrome); box(1.15, 0.06, 0.06, 0, gy(0.7), hl + 0.24, chrome);
    box(BW + 0.02, 0.22, 0.22, 0, gy(0.52), -hl - 0.02, dark);
    // spare wheel on the tail gate
    P.push({ g: new THREE.CylinderGeometry(0.36, 0.36, 0.24, 12), m: R.M(0, gy(1.0), -hl - 0.14, Math.PI / 2, 0, 0), color: (x, y) => (Math.abs(x) < 0.17 && Math.abs(y) > 0.1 ? acc : [0.1, 0.1, 0.11]) });
    // fender flares and snorkel
    for (const sx of [-1, 1]) for (const fz of [1, -1]) box(0.16, 0.12, 1.0, sx * (BW / 2 + 0.06), gy(0.98), fz * spec.wb / 2, dark);
    box(0.1, 0.9, 0.1, -(BW / 2 + 0.04), gy(1.32), cz + cl / 2 + 0.05, dark, 0.12);
    for (const sx of [-1, 1]) { box(0.3, 0.14, 0.05, sx * (BW / 2 - 0.28), gy(1.02), hl + 0.005, lamp); lights.head.push([sx * (BW / 2 - 0.28), gy(1.02), hl + 0.03]); lights.tail.push([sx * (BW / 2 - 0.12), gy(1.0), -hl - 0.005]); }
    flaps(0.18);
    lights.pod = [0, gy(1.86), cz + cl * 0.42]; lights.tailW = 0.16;
  } else if (type === 'buggy') {
    const frame = acc[0] + acc[1] + acc[2] < 0.6 ? body : acc;
    box(BW - 0.36, 0.1, L * 0.86, 0, gy(0.42), 0, dark);
    box(BW - 0.5, 0.32, 0.95, 0, gy(0.64), hl - 0.52, body, 0, 0, 0, (x, y, z) => [0, y > 0 && z > 0 ? -0.16 : 0, 0]);
    for (const sx of [-1, 1]) box(0.22, 0.26, 1.2, sx * (BW / 2 - 0.3), gy(0.6), -0.05, body);
    box(0.5, 0.42, 0.5, 0, gy(0.72), -0.1, dark, -0.15);                                      // seat
    box(0.85, 0.46, 0.75, 0, gy(0.78), -hl + 0.48, [0.3, 0.3, 0.33]);                         // engine
    for (const sx of [-0.22, 0.22]) cyl(0.06, 0.6, sx, gy(0.72), -hl - 0.05, chrome, Math.PI / 2);
    // roll cage
    const cz0 = 0.55, cz1 = -0.62, cx = 0.6, top = gy(1.5);
    for (const sx of [-1, 1]) {
      box(0.07, 1.0, 0.07, sx * cx, gy(1.0), cz0, frame, -0.35); box(0.07, 1.05, 0.07, sx * cx, gy(1.0), cz1, frame, 0.12);
      box(0.07, 0.07, cz0 - cz1, sx * cx * 0.95, top, (cz0 + cz1) / 2 - 0.12, frame);
      box(0.07, 0.07, 1.25, sx * (BW / 2 - 0.3), gy(0.9), hl - 0.62, frame, -0.35);
    }
    box(cx * 2, 0.07, 0.07, 0, top, cz1 + 0.06, frame); box(cx * 2, 0.07, 0.07, 0, top, cz0 - 0.32, frame);
    box(0.07, 0.07, 1.3, 0, gy(1.15), -0.25, frame, 0.75, 0, 0.6);
    lamps(4, top + 0.08, cz0 - 0.32, 0.26, 0.1);
    box(BW - 0.3, 0.08, 0.08, 0, gy(0.5), hl + 0.03, frame);                                  // nerf bars
    box(BW - 0.3, 0.08, 0.08, 0, gy(0.55), -hl, frame);
    P.push({ g: new THREE.CylinderGeometry(0.34, 0.34, 0.22, 12), m: R.M(0, gy(1.15), -hl + 0.05, 0.2, 0, 0), color: (x, y, z) => (Math.abs(x) < 0.15 && Math.abs(z) < 0.15 ? frame : [0.1, 0.1, 0.11]) });
    for (const sx of [-1, 1]) { lights.head.push([sx * 0.35, gy(0.7), hl + 0.02]); lights.tail.push([sx * 0.4, gy(0.95), -hl + 0.12]); }
    box(0.18, 0.1, 0.05, 0.35, gy(0.7), hl - 0.02, lamp); box(0.18, 0.1, 0.05, -0.35, gy(0.7), hl - 0.02, lamp);
    lights.pod = [0, top + 0.08, cz0 - 0.28]; lights.tailW = 0.14;
  } else {                                                                                       // truck
    box(BW, 0.56, L, 0, gy(0.66), 0, body, 0, 0, 0, (x, y, z) => [0, y > 0 && z > hl - 0.3 ? -0.06 : 0, 0]);
    box(BW + 0.02, 0.1, L * 0.96, 0, gy(0.56), 0, str);
    const hoodL = 1.15, cabL = 1.35, cabZ = hl - hoodL - cabL / 2 - 0.05;
    box(BW - 0.08, 0.14, hoodL, 0, gy(1.0), hl - hoodL / 2, body, -0.05);
    P.push({ g: new THREE.BoxGeometry(BW - 0.08, 0.58, cabL), m: R.M(0, gy(1.24), cabZ), jitter: (x, y, z) => (y > 0 ? [-x * 0.08, 0, z > 0 ? -0.18 : 0] : [0, 0, 0]), color: glass });
    box(BW - 0.12, 0.08, cabL * 0.82, 0, gy(1.56), cabZ - 0.08, body);
    for (const sx of [-1, 1]) box(0.08, 0.58, 0.12, sx * (BW / 2 - 0.05), gy(1.24), cabZ - cabL / 2 + 0.06, body);
    lamps(4, gy(1.65), cabZ + 0.2, 0.3, 0.11);
    // bed
    const bedF = cabZ - cabL / 2 - 0.08, bedL = bedF + hl;
    box(BW - 0.12, 0.05, bedL, 0, gy(0.96), bedF - bedL / 2, [0.2, 0.2, 0.22]);
    for (const sx of [-1, 1]) box(0.08, 0.36, bedL, sx * (BW / 2 - 0.04), gy(1.12), bedF - bedL / 2, body);
    box(BW, 0.36, 0.08, 0, gy(1.12), -hl + 0.04, acc);
    box(BW - 0.2, 0.06, 0.06, 0, gy(1.62), bedF - 0.08, chrome);                               // roll bar
    for (const sx of [-1, 1]) box(0.06, 0.55, 0.06, sx * (BW / 2 - 0.15), gy(1.35), bedF - 0.08, chrome);
    box(BW + 0.06, 0.2, 0.2, 0, gy(0.44), hl + 0.02, chrome);
    box(BW * 0.62, 0.3, 0.05, 0, gy(0.8), hl + 0.005, dark);
    box(BW + 0.04, 0.18, 0.18, 0, gy(0.46), -hl - 0.02, chrome);
    for (const sx of [-1, 1]) { box(0.3, 0.14, 0.05, sx * (BW / 2 - 0.24), gy(0.82), hl + 0.006, lamp); lights.head.push([sx * (BW / 2 - 0.24), gy(0.82), hl + 0.03]); lights.tail.push([sx * (BW / 2 - 0.06), gy(1.05), -hl - 0.005]); }
    flaps(0.16);
    lights.pod = [0, gy(1.65), cabZ + 0.2]; lights.tailW = 0.12;
  }
  return { parts: P, lights };
};

/* a headlight beam that fades out along its length (additive, so black is invisible) */
R.beamGeo = () => {
  if (R._beam) return R._beam;
  const g = new THREE.ConeGeometry(2.2, 13, 12, 6, true), p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const t = Math.pow(clamp((p.getY(i) + 6.5) / 13, 0, 1), 1.8); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = t; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return (R._beam = g);
};
function buildCarMesh(spec, livery, opts = {}) {
  const root = new THREE.Group();
  const { parts, lights } = R.carParts(spec, livery);
  const geo = R.merge(parts);
  const mat = opts.ghost ? new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.32, depthWrite: false }) : new THREE.MeshLambertMaterial({ vertexColors: true });
  const shell = new THREE.Mesh(geo, mat);
  shell.castShadow = !opts.ghost;
  root.add(shell);
  const tailMat = opts.ghost ? mat : new THREE.MeshLambertMaterial({ color: 0x7a0b0b, emissive: 0x000000 });
  const tw = lights.tailW || 0.3;
  for (const t of lights.tail) { const m = new THREE.Mesh(new THREE.BoxGeometry(tw, 0.1, 0.04), tailMat); m.position.set(t[0], t[1], t[2]); root.add(m); }
  // door numbers (none on the buggy, it has no doors)
  const tex = opts.ghost || spec.type === 'buggy' ? null : R.doorTex(livery.number || spec.number, '#' + new THREE.Color(livery.color).getHexString());
  if (tex) {
    const dm = new THREE.MeshLambertMaterial({ map: tex, transparent: true });
    const BW = spec.tw + 0.3 + (spec.type === 'suv' ? 0.06 : 0), dy = { suv: 0.9, truck: 0.7 }[spec.type] || 0.53, dz = spec.type === 'truck' ? spec.len / 2 - 1.85 : -0.15;
    for (const sx of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.46), dm);
      d.position.set(sx * (BW / 2 + 0.006), dy - (spec.ride || 0.49), dz); d.rotation.y = sx * Math.PI / 2; root.add(d);
    }
  }
  // night: glowing lamps and soft beams
  const glows = [];
  if (opts.night && !opts.ghost) {
    const gm = new THREE.MeshBasicMaterial({ color: 0xfff4d6 });
    for (const h of lights.head) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), gm); s.position.set(h[0], h[1], h[2]); root.add(s); }
    if (lights.pod) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.06), gm); s.position.set(lights.pod[0], lights.pod[1], lights.pod[2] + 0.04); root.add(s); }
    const bm = new THREE.MeshBasicMaterial({ color: 0xfff0c8, vertexColors: true, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    for (const h of lights.head) {
      const c = new THREE.Mesh(R.beamGeo(), bm);
      c.rotation.x = -Math.PI / 2; c.position.set(h[0] * 1.4, h[1] - 0.25, h[2] + 6.5); c.renderOrder = 3; root.add(c); glows.push(c);
    }
  }
  // wheels
  const r = spec.r || 0.31, ww = { suv: 0.3, truck: 0.3, buggy: 0.3 }[spec.type] || 0.24, seg = spec.type === 'suv' || spec.type === 'buggy' ? 14 : 12;
  const accRgb = R.rgb(livery.accent);
  const wgeo = (w) => R.merge([
    { g: new THREE.CylinderGeometry(r, r, w, seg), m: R.M(0, 0, 0, 0, 0, Math.PI / 2), color: (x, y) => (Math.abs(y) > w / 2 - 0.005 ? [0.2, 0.2, 0.22] : [0.1, 0.1, 0.11]) },
    { g: new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.05, 6), m: R.M(w / 2, 0, 0, 0, 0, Math.PI / 2), color: accRgb },
    { g: new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.05, 6), m: R.M(-w / 2, 0, 0, 0, 0, Math.PI / 2), color: accRgb },
  ]);
  const gFront = wgeo(spec.type === 'buggy' ? 0.24 : ww), gRear = wgeo(ww);
  const wheels = [];
  for (let k = 0; k < 4; k++) {
    const pivot = new THREE.Group(), w = new THREE.Mesh(k < 2 ? gFront : gRear, opts.ghost ? mat : R.flatMat());
    w.castShadow = !opts.ghost; pivot.add(w); root.add(pivot); wheels.push({ pivot, mesh: w });
  }
  const dirtCol = new THREE.Color(1, 1, 1);
  return {
    root, wheels, mat, tailMat, shell, lights, glows,
    sync(car, alpha) {
      if (car.prevPos && alpha < 1) { root.position.lerpVectors(car.prevPos, car.pos, alpha); root.quaternion.copy(car.prevQuat).slerp(car.quat, alpha); }
      else { root.position.copy(car.pos); root.quaternion.copy(car.quat); }
      car.wheels.forEach((w, k) => {
        const v = wheels[k];
        v.pivot.position.set(w.x, w.mount.y - w.len, w.z);
        v.pivot.rotation.y = w.front ? car.steerAngle : 0;
        v.mesh.rotation.x = w.rot;
      });
      if (!opts.ghost) {
        const braking = car.brakeForce > 100 || car.gear === -1;
        tailMat.emissive.setHex(braking ? 0xff2a1a : opts.night ? 0x5a0505 : 0x000000);
        if (car.dirt !== undefined && car.dirtCol) { dirtCol.setRGB(1, 1, 1).lerp(car.dirtCol, car.dirt); mat.color.copy(dirtCol); }
      }
    },
  };
}
