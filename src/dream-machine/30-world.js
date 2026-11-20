/* ============================================================
   Dream Machine, part 3: the world, as the computer (not the
   graphics card) sees it. The same land, sea and monuments as the
   shader, worked out only where you are standing: so you can walk
   on the ground, climb the stairs, stand on a floating island,
   bump into a spire, and know when you have found somewhere new.
   ============================================================ */
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const GEO = { plain: 0, impossible: 1, echo: 2, melted: 3, crystal: 4 }, PHYS = { float: 0, still: 1, orbit: 2, fall: 3, breathe: 4 }, SCALE = { human: 0, giant: 1, tiny: 2, mixed: 3 };
const World = {
  CS: 300, seed: [0, 0], geo: 0, phys: 0, scale: 0, t: 0,
  set(seedStr, rules) {
    const h = hashStr(seedStr); this.seed = [3 + (h % 250), 3 + ((h >>> 10) % 250)];
    this.geo = GEO[rules.geometry]; this.phys = PHYS[rules.physics]; this.scale = SCALE[rules.scale]; this.seedStr = seedStr;
  },
  terrain(x, z, oct = 5) {
    let qx = F(F(x * 0.0021) + this.seed[0]), qz = F(F(z * 0.0021) + this.seed[1]);
    if (this.geo === 3) { const wx = vnoise(F(qx * 2), F(qz * 2)), wz = vnoise(F(qx * 2 + 7), F(qz * 2 + 7)); qx = F(qx + (wx - 0.5) * 0.6); qz = F(qz + (wz - 0.5) * 0.6); }
    const n = fbm(qx, qz, oct); let h = (n - 0.47) * 260;
    const r = 1 - Math.abs(vnoise(F(qx * 3.1 + 3), F(qz * 3.1 + 3)) * 2 - 1); h += r * r * 60 * smooth(0.45, 0.7, n);
    if (this.geo === 4) { const k = h / 16; h = (Math.floor(k) + smooth(0.55, 1, k - Math.floor(k))) * 16; }
    return h;
  },
  water(x, z) { const t = this.t; return Math.sin(x * 0.045 + z * 0.015 + t * 1.1) * 1.6 + Math.sin(-x * 0.022 + z * 0.052 + t * 1.4) * 1.1 + Math.sin(x * 0.09 - z * 0.07 + t * 2.2) * 0.45 + (vnoise(F(x * 0.04 + t * 0.12), F(z * 0.04 + t * 0.12)) - 0.5) * 2 - 2; },
  /* the monument in one cell, if there is one: the same dice the shader rolls */
  cell(ix, iz) {
    const s = this.seed, ch = hash12(ix + s[0] * 7, iz + s[1] * 7); if (ch < 0.3) return null;
    const type = Math.floor(hash12(ix + 5, iz + 1) * 7), CS = this.CS;
    const cx = (ix + 0.5) * CS + (hash12(ix + 3, iz + 3) - 0.5) * CS * 0.3, cz = (iz + 0.5) * CS + (hash12(ix + 7, iz + 7) - 0.5) * CS * 0.3;
    let sc = this.scale === 3 ? 0.4 + hash12(ix + 2, iz + 2) * 2.2 : this.scale === 1 ? 2.2 : 1; if (type === 6) sc = Math.min(sc, 1);
    let ang = hash12(ix + 11, iz + 11) * 6.283; if (this.phys === 2) ang += this.t * 0.25;
    const base = Math.max(this.terrain(cx, cz, 3), -3), ph = ch * 6.283;
    let lift = this.phys === 0 ? Math.sin(this.t * 0.5 + ph) * ((type === 2 ? 7 : 0) + 1.2) * sc : 0;
    if (this.phys === 3 && (type === 2 || type === 3)) { const v = -this.t * 28 + ph * 120; lift += ((v % 760) + 760) % 760 - 260; }
    return { ix, iz, type, cx, cz, sc, ang, base, ch, lift };
  },
  /* a point in a monument's own space (the same turn the shader applies) */
  local(c, x, z) { const dx = x - c.cx, dz = z - c.cz, co = Math.cos(c.ang), si = Math.sin(c.ang); return [(co * dx - si * dz) / c.sc, (si * dx + co * dz) / c.sc]; },
  /* the height you can stand at here: the ground, the sea (you can walk on it), stairs, the top of a slab, a floating island */
  floor(x, z, feetY) {
    let g = Math.max(this.terrain(x, z), this.water(x, z));
    const ix = Math.floor(x / this.CS), iz = Math.floor(z / this.CS), c = this.cell(ix, iz);
    if (c && this.geo !== 3) {
      const [lx, lz] = this.local(c, x, z), y0 = c.base + c.lift, top = (h) => { const y = y0 + h * c.sc; if (feetY >= y - 4 * c.sc - 1.5) g = Math.max(g, y); };
      if (c.type === 6 && Math.abs(lz) < 10 && lx > -3.6 && lx < 175.6) top(Math.min(24, Math.max(0, Math.floor(lx / 7 + 0.5))) * 5 + 5);
      if (c.type === 0 && Math.abs(lx) < 34 && Math.abs(lz) < 12) top(6);
      if (c.type === 2 && lx * lx + lz * lz < 34 * 34) top(130 + c.ch * 90);
      if (c.type === 4 && Math.abs(lx) < 36 && Math.abs(lz) < 8) top(89);
    }
    return g;
  },
  /* walls: spires, pillars, the lighthouse, the monolith. Pushes you back out if you walk into them. */
  push(p, rad) {
    const ix = Math.floor(p.x / this.CS), iz = Math.floor(p.z / this.CS);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const c = this.cell(ix + a, iz + b); if (!c || this.geo === 3) continue;
      const feet = (p.y - p.eye - c.base - c.lift) / c.sc, posts = [];
      if (c.type === 1 && feet < 140) posts.push([0, 0, 15 * Math.pow(1 - clamp(feet / 150, 0, 1), 0.7) + 1]);
      if (c.type === 5 && feet < 120) posts.push([0, 0, 12]);
      if (c.type === 4 && feet < 79) posts.push([26, 0, 7], [-26, 0, 7]);
      if (c.type === 0 && feet < 103) posts.push([-26, -17, 8]);
      if (c.type === 3 && feet < 109) for (let k = -16; k <= 16; k += 8) posts.push([0, k, 7]);
      for (const [px, pz, r] of posts) {
        const co = Math.cos(c.ang), si = Math.sin(c.ang), wx = c.cx + (co * px + si * pz) * c.sc, wz = c.cz + (-si * px + co * pz) * c.sc;
        const dx = p.x - wx, dz = p.z - wz, d = Math.hypot(dx, dz), R = r * c.sc + rad;
        if (d < R && d > 1e-4) { p.x = wx + dx / d * R; p.z = wz + dz / d * R; }
      }
    }
  },
  /* the nearest monument you are close to, for naming places as you find them */
  near(x, z) {
    const ix = Math.floor(x / this.CS), iz = Math.floor(z / this.CS); let best = null, bd = 1e9;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const c = this.cell(ix + a, iz + b); if (!c) continue; const d = Math.hypot(x - c.cx, z - c.cz) / Math.max(1, c.sc); if (d < bd) { bd = d; best = c; } }
    return bd < 95 ? best : null;
  },
  /* where to wake up: high ground with a view, facing open space (and something worth walking to) */
  spawn(r, eye, bend = 0) {
    /* how far you can see in a direction before a hill (or the bend of the world) gets in the way */
    const view = (x, z, y, a) => { const dx = -Math.sin(a), dz = -Math.cos(a); let open = 0; for (let d = 8; d <= 900; d += d < 100 ? 8 : 25) { if (this.terrain(x + dx * d, z + dz * d, d < 200 ? 5 : 3) + bend * d * d > y - 3 + d * 0.035) break; open = d; } return open; };
    let best = null;
    for (let i = 0; i < 36; i++) {
      const x = r.range(-500, 500), z = r.range(-500, 500), g = this.terrain(x, z); if (g < 3) continue;
      const c = this.near(x, z); if (c && Math.hypot(x - c.cx, z - c.cz) < 60 * c.sc) continue;
      if (this.floor(x, z, 1e9) > g + 0.5) continue;   // not on (or inside) the stairs or a slab
      const probe = { x, z, y: g + eye, eye }; this.push(probe, 6); if (probe.x !== x || probe.z !== z) continue;   // not inside a spire or a pillar
      if (this.inside(x, g + eye, z)) continue;
      let yaw = 0, top = -1;
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * 6.283, dx = -Math.sin(a), dz = -Math.cos(a); let bonus = 0;
        const ix = Math.floor(x / this.CS), iz = Math.floor(z / this.CS);
        for (let a2 = -3; a2 <= 3; a2++) for (let b2 = -3; b2 <= 3; b2++) { const cc = this.cell(ix + a2, iz + b2); if (!cc) continue; const vx = cc.cx - x, vz = cc.cz - z, dist = Math.hypot(vx, vz); if (dist > 120 && dist < 1000 && (vx * dx + vz * dz) / dist > 0.94) bonus = 250; }
        const sc = view(x, z, g + eye, a) + bonus; if (sc > top) { top = sc; yaw = a; }
      }
      const score = top + Math.min(g, 120) * 0.5 + r() * 40; if (!best || score > best.score) best = { x, z, yaw, score };
    }
    return best || { x: 0, z: 0, yaw: 0 };
  },
  /* is this point inside the long stairs or a floating island hanging low? (the two things big enough to swallow you) */
  inside(x, y, z) {
    const ix = Math.floor(x / this.CS), iz = Math.floor(z / this.CS);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const c = this.cell(ix + a, iz + b); if (!c) continue; const [lx, lz] = this.local(c, x, z), ly = (y - c.base - c.lift) / c.sc;
      if (c.type === 6 && lx > -12 && lx < 185 && Math.abs(lz) < 18) return true;
      if (c.type === 2) { const oy = ly - (130 + c.ch * 90); if ((lx * lx + lz * lz) / 2000 + oy * oy / 6000 < 1.3) return true; }
    }
    return false;
  },
  placeName(c) { const r = rng(hashStr(this.seedStr + ':' + c.ix + ',' + c.iz)); return { name: dreamName(r), kind: ['The ring', 'A spire', 'A floating island', 'A monolith', 'A gate', 'A lighthouse', 'Stairs to a door'][c.type] }; },
};
