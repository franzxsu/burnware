/* ============================================================
   WRC 1988 (once Pebble Dash) — math helpers, noise, splines
   ============================================================ */
const TAU = Math.PI * 2;
const G = 9.81;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
const approach = (a, b, step) => (a < b ? Math.min(a + step, b) : Math.max(a - step, b));
const wrapAngle = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const dampAngle = (a, b, rate, dt) => a + wrapAngle(b - a) * (1 - Math.exp(-rate * dt));
const sign = (x) => (x < 0 ? -1 : 1);

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* classic improved Perlin noise, 2D, roughly in [-1, 1] */
function makePerlin(seed) {
  const rnd = mulberry32(seed * 9973 + 17);
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h, x, y) => {
    switch (h & 7) {
      case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y;
      case 4: return x; case 5: return -x; case 6: return y; default: return -y;
    }
  };
  return (x, y) => {
    const fx = Math.floor(x), fy = Math.floor(y);
    const X = fx & 255, Y = fy & 255;
    x -= fx; y -= fy;
    const u = fade(x), v = fade(y);
    const a = p[X] + Y, b = p[X + 1] + Y;
    return lerp(lerp(grad(p[a], x, y), grad(p[b], x - 1, y), u),
                lerp(grad(p[a + 1], x, y - 1), grad(p[b + 1], x - 1, y - 1), u), v);
  };
}
function fbm(noise, x, y, oct, lac = 2, gain = 0.5) {
  let a = 1, f = 1, s = 0, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise(x * f, y * f); n += a; a *= gain; f *= lac; }
  return s / n;
}

/* Closed centripetal Catmull-Rom spline, resampled to (nearly) even spacing.
   Returns arrays plus a map from control-point index (float) to arc length. */
function sampleClosedSpline(pts, spacing) {
  const n = pts.length;
  const dense = [];           // [x, z]
  const segStart = [];        // arc length at each control point
  let len = 0, px = null, pz = null;
  const STEPS = 40;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const d01 = Math.pow(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), 0.5) || 1e-3;
    const d12 = Math.pow(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), 0.5) || 1e-3;
    const d23 = Math.pow(Math.hypot(p3[0] - p2[0], p3[1] - p2[1]), 0.5) || 1e-3;
    const t0 = 0, t1 = t0 + d01, t2 = t1 + d12, t3 = t2 + d23;
    segStart.push(len);
    for (let k = 0; k < STEPS; k++) {
      const t = t1 + (t2 - t1) * (k / STEPS);
      const pt = [0, 0];
      for (let c = 0; c < 2; c++) {
        const A1 = (t1 - t) / (t1 - t0) * p0[c] + (t - t0) / (t1 - t0) * p1[c];
        const A2 = (t2 - t) / (t2 - t1) * p1[c] + (t - t1) / (t2 - t1) * p2[c];
        const A3 = (t3 - t) / (t3 - t2) * p2[c] + (t - t2) / (t3 - t2) * p3[c];
        const B1 = (t2 - t) / (t2 - t0) * A1 + (t - t0) / (t2 - t0) * A2;
        const B2 = (t3 - t) / (t3 - t1) * A2 + (t - t1) / (t3 - t1) * A3;
        pt[c] = (t2 - t) / (t2 - t1) * B1 + (t - t1) / (t2 - t1) * B2;
      }
      if (px !== null) len += Math.hypot(pt[0] - px, pt[1] - pz);
      dense.push([pt[0], pt[1], len]);
      px = pt[0]; pz = pt[1];
    }
  }
  // close the loop
  len += Math.hypot(dense[0][0] - px, dense[0][1] - pz);
  const N = Math.round(len / spacing);
  const ds = len / N;
  const X = new Float64Array(N), Z = new Float64Array(N);
  let j = 0;
  for (let i = 0; i < N; i++) {
    const s = i * ds;
    while (j < dense.length - 1 && dense[j + 1][2] < s) j++;
    const a = dense[j], b = j + 1 < dense.length ? dense[j + 1] : [dense[0][0], dense[0][1], len];
    const t = b[2] > a[2] ? (s - a[2]) / (b[2] - a[2]) : 0;
    X[i] = lerp(a[0], b[0], t); Z[i] = lerp(a[1], b[1], t);
  }
  const cpToS = (f) => {   // control-point float index -> arc length
    const i = Math.floor(f) % n, t = f - Math.floor(f);
    const s0 = segStart[i], s1 = i + 1 < n ? segStart[i + 1] : len;
    return ((s0 + (s1 - s0) * t) % len + len) % len;
  };
  return { X, Z, N, ds, len, cpToS };
}

/* small helpers used by the game and the headless tests */
function fmtTime(t) {
  if (!isFinite(t) || t <= 0) return '--:--.--';
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`;
}
function fmtDelta(d) { return (d < 0 ? '−' : '+') + Math.abs(d).toFixed(2); }
