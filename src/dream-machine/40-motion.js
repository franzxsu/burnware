/* ============================================================
   Dream Machine, part 4: how a dream moves.
   Everything is worked out from "dream time" t, never step by step,
   so the Time rule can slow it, stop it, or run it backwards and
   the whole world simply rewinds.
   ============================================================ */
const Motion = {
  v: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0),
  update(t, dt) {
    const W = World, rules = W.rules, phys = rules.physics, size = W.info.size, G = rules.gravity;
    /* the islands and everything on them */
    for (const b of W.bodies) {
      const o = b.obj; o.position.copy(b.p0); o.rotation.copy(b.r0); o.scale.copy(b.s0);
      if (b.spinY) o.rotation.y = b.r0.y + b.spinY * t;
      if (b.spin) { o.rotation.x = b.r0.x + b.spin * t * 0.7; o.rotation.y = b.r0.y + b.spin * t; }
      if (phys === 'still') continue;
      if (phys === 'float' || (b.anchor && phys === 'fall')) { o.position.y += Math.sin(t * 0.45 + b.ph) * b.amp * size * 0.012; o.rotation.z += Math.sin(t * 0.3 + b.ph) * 0.02; }
      else if (phys === 'orbit') {
        if (b.anchor) { o.rotation.y = b.r0.y + t * 0.05; continue; }
        const d = Math.hypot(b.p0.x, b.p0.z) || 1, a0 = Math.atan2(b.p0.z, b.p0.x), a = a0 + t * 0.9 / Math.sqrt(d);
        o.position.x = Math.cos(a) * d; o.position.z = Math.sin(a) * d; o.position.y += Math.sin(t * 0.3 + b.ph) * size * 0.01; o.rotation.y = b.r0.y - (a - a0);
      } else if (phys === 'fall') {
        /* fall forever: drop out of sight below, come back in from above (or outward, with no gravity) */
        const span = size * 2.2, k = ((t * size * 0.035 * (0.6 + b.amp * 0.3) + b.ph * 40) % span + span) % span;
        if (G === 'none' || G === 'inward') { const dir = this.v.copy(b.p0).normalize(); o.position.addScaledVector(dir, k * 0.6 - span * 0.3); }
        else o.position.y = b.p0.y + span * 0.45 - k;
        o.rotation.x += t * 0.02 * b.amp;
      } else if (phys === 'breathe') o.scale.copy(b.s0).multiplyScalar(1 + Math.sin(t * 0.8 + b.ph) * 0.07);
    }
    /* clocks keep dream time */
    for (const c of W.clocks) { const [m, hr] = c.userData.hands; m.rotation.z = -t * 0.9; hr.rotation.z = -t * 0.075; }
    /* moons drift across the sky; the stars turn */
    for (const m of W.moons) { const u = m.userData, a = u.a + u.speed * t; m.position.set(Math.sin(a) * Math.cos(u.el) * u.d, Math.sin(u.el) * u.d, -Math.cos(a) * Math.cos(u.el) * u.d); m.children[0].rotation.y = t * 0.02; }
    if (W.stars) W.stars.rotation.y = t * 0.004;
    this.specks(t, dt);
  },
  /* specks fall with gravity (and drift a little), so you can always see which way "down" is */
  specks(t, dt) {
    const W = World, p = W.specks; if (!p) return;
    const pos = p.geometry.attributes.position, a = pos.array, S = p.userData.S, ph = p.userData.phase, g = W.gvec, G = W.rules.gravity, speed = W.info.size * 0.05;
    for (let i = 0; i < pos.count; i++) {
      const j = i * 3, sway = Math.sin(t * 0.7 + ph[i]) * 0.4;
      if (G === 'inward') {
        const x = a[j], y = a[j + 1], z = a[j + 2], d = Math.hypot(x, y, z) || 1, step = dt * speed * 0.7;
        a[j] -= x / d * step; a[j + 1] -= y / d * step; a[j + 2] -= z / d * step;
        const nd = Math.hypot(a[j], a[j + 1], a[j + 2]);
        if (nd < 44 && step > 0) { const k = (S * 0.9) / nd; a[j] *= k; a[j + 1] *= k; a[j + 2] *= k; } else if (nd > S && step < 0) { const k = 46 / nd; a[j] *= k; a[j + 1] *= k; a[j + 2] *= k; }
        continue;
      }
      a[j] += (g.x * speed + Math.cos(t * 0.3 + ph[i]) * speed * 0.25) * dt;
      a[j + 1] += (g.y * speed + (G === 'none' ? sway * speed * 0.4 : 0)) * dt;
      a[j + 2] += (g.z * speed + sway * speed * 0.25) * dt;
      for (let k = 0; k < 3; k++) { const lim = k === 1 ? S * 0.6 : S; if (a[j + k] > lim) a[j + k] -= lim * 2; else if (a[j + k] < -lim) a[j + k] += lim * 2; }
    }
    pos.needsUpdate = true;
  },
};
