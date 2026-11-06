/* ============================================================
   Rendering. Three stacked canvases, all 288 x 144 (or half) and
   scaled up with crisp pixels: a painted backdrop, the live cells,
   and a blurred glow layer for flames and lit burners.
   ============================================================ */
const Render = {
  init(bg, fx, glow, haze) {
    this.bg = bg; this.fx = fx; this.glow = glow;
    for (const c of [bg, fx]) { c.width = GW; c.height = GH; }
    glow.width = GW >> 1; glow.height = GH >> 1;
    this.fctx = fx.getContext('2d'); this.gctx = glow.getContext('2d');
    // haze: steam and smoke drawn again at half size and blurred, so they read as clouds rather than dots
    if (haze) {
      haze.width = GW >> 1; haze.height = GH >> 1; this.hctx = haze.getContext('2d');
      this.himg = this.hctx.createImageData(GW >> 1, GH >> 1); this.hpx = new Uint32Array(this.himg.data.buffer);
    }
    this.hacc = new Float32Array((GW >> 1) * (GH >> 1) * 4);
    this.img = this.fctx.createImageData(GW, GH); this.px = new Uint32Array(this.img.data.buffer);
    this.gimg = this.gctx.createImageData(GW >> 1, GH >> 1); this.gpx = new Uint32Array(this.gimg.data.buffer);
    this.gacc = new Float32Array((GW >> 1) * (GH >> 1) * 3);
    // element colour tables
    this.base = new Float32Array(NE * 3); this.alpha = new Uint8Array(NE); this.vary = new Float32Array(NE);
    this.ramp = []; this.rampMax = new Float32Array(NE);
    for (const d of E) {
      this.base[d.id * 3] = d.col[0]; this.base[d.id * 3 + 1] = d.col[1]; this.base[d.id * 3 + 2] = d.col[2];
      this.alpha[d.id] = d.alpha; this.vary[d.id] = d.vary;
      this.ramp[d.id] = d.ramp ? d.ramp.flat() : null; this.rampMax[d.id] = d.rampMax || 1;
    }
    this.paintBackground();
  },
  /* ---------- the backdrop: a late-night kitchen ---------- */
  paintBackground() {
    const ctx = this.bg.getContext('2d'), im = ctx.createImageData(GW, GH), p = new Uint32Array(im.data.buffer);
    const R = mulberry(7);
    const put = (x, y, r, g, b) => { if (x >= 0 && x < GW && y >= 0 && y < GH) p[y * GW + x] = rgba32(clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255), 255); };
    const box = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, c[0], c[1], c[2]); };
    // wall tiles in a running bond, lit warm from the lamp over the sink
    for (let y = 0; y < 120; y++) for (let x = 0; x < GW; x++) {
      const row = Math.floor(y / 5), off = (row % 2) * 4, tx = Math.floor((x + off) / 9);
      const grout = y % 5 === 4 || (x + off) % 9 === 8;
      const tv = ((tx * 7 + row * 13) % 5) * 2 - 4;
      const lx = x - 254, ly = y - 30, light = Math.max(0, 1 - Math.sqrt(lx * lx * 0.6 + ly * ly) / 120) * 34;
      const glossy = !grout && (x + off) % 9 === 0 ? 8 : 0;
      if (grout) put(x, y, 24 + light * 0.4, 30 + light * 0.3, 42);
      else put(x, y, 40 + tv + light + glossy, 52 + tv + light * 0.75 + glossy, 72 + tv + light * 0.3 + glossy);
    }
    // inside the range hood: darker, with the duct
    for (let y = 3; y <= 41; y++) {
      const t = clamp((y - 16) / 24, 0, 1), xl = y < 16 ? 74 : Math.round(lerp(46, 16, t)), xr = y < 16 ? 86 : Math.round(lerp(114, 144, t));
      for (let x = xl; x <= xr; x++) put(x, y, 22, 25, 32);
    }
    for (let y = 4; y <= 14; y += 3) box(75, y, 85, y, [34, 38, 46]);
    // window: the sky follows the viewer's own clock (night, dawn, day, dusk) over a city skyline
    const wx0 = 166, wx1 = 244, wy0 = 18, wy1 = 60, P = SKY[this.period = skyPeriod()];
    for (let y = wy0; y <= wy1; y++) for (let x = wx0; x <= wx1; x++) {
      const t = (y - wy0) / (wy1 - wy0), u = t * t;
      put(x, y, lerp(P.top[0], P.low[0], u), lerp(P.top[1], P.low[1], u), lerp(P.top[2], P.low[2], t));
    }
    for (let k = 0; k < P.stars; k++) put(wx0 + 2 + Math.floor(R() * 76), wy0 + 2 + Math.floor(R() * 22), 200, 210, 240);
    const [ox, oy, orad] = P.orb;
    for (let dy = -orad - 2; dy <= orad + 2; dy++) for (let dx = -orad - 2; dx <= orad + 2; dx++) {
      const d = dx * dx + dy * dy;
      if (d <= orad * orad + 1) put(ox + dx, oy + dy, P.orbCol[0] - (P.moon && dx > 2 ? 30 : 0), P.orbCol[1] - (P.moon && dx > 2 ? 30 : 0), P.orbCol[2]);
      else if (P.halo && d <= (orad + 2) * (orad + 2)) { const c = p[idx(ox + dx, oy + dy)]; put(ox + dx, oy + dy, lerp(c & 255, P.orbCol[0], 0.3), lerp((c >> 8) & 255, P.orbCol[1], 0.3), lerp((c >> 16) & 255, P.orbCol[2], 0.3)); }
    }
    for (const [cx, cy, cw] of P.clouds) for (let dx = 0; dx < cw; dx++) { const h = Math.round(Math.sin(dx / (cw - 1) * Math.PI) * 2.4); for (let dy = -h; dy <= 0; dy++) put(cx + dx, cy + dy, 244, 246, 250); }
    let bx = wx0;
    while (bx < wx1) {
      const w = 6 + Math.floor(R() * 9), h = 8 + Math.floor(R() * 18), top = wy1 - h;
      for (let y = top; y <= wy1; y++) for (let x = bx; x < Math.min(bx + w, wx1 + 1); x++) {
        const win = (x - bx) % 3 === 1 && (y - top) % 3 === 1, lit = win && R() < P.lit;
        if (lit) put(x, y, 255, 206, 104); else if (win && P.glass) put(x, y, P.glass[0], P.glass[1], P.glass[2]); else put(x, y, P.city[0], P.city[1], P.city[2]);
      }
      bx += w + (R() < 0.3 ? 1 : 0);
    }
    const frame = [128, 88, 56];
    box(wx0 - 3, wy0 - 3, wx1 + 3, wy0 - 1, frame); box(wx0 - 3, wy1 + 1, wx1 + 3, wy1 + 4, frame);
    box(wx0 - 3, wy0, wx0 - 1, wy1, frame); box(wx1 + 1, wy0, wx1 + 3, wy1, frame);
    box(205, wy0, 206, wy1, frame); box(wx0, 39, wx1, 40, frame);
    box(wx0 - 3, wy0 - 3, wx1 + 3, wy0 - 3, [168, 120, 80]);
    // a shelf of jars under the window
    box(164, 70, 248, 71, [118, 80, 50]); box(164, 72, 248, 72, [70, 46, 30]);
    const jars = [[168, [236, 232, 216]], [178, [242, 186, 52]], [188, [252, 252, 255]], [198, [246, 242, 230]], [208, [232, 116, 40]], [218, [62, 32, 16]], [228, [112, 62, 36]], [238, [236, 198, 70]]];
    for (const [x, c] of jars) {
      box(x, 61, x + 6, 69, [70, 92, 104]);
      box(x + 1, 64, x + 5, 69, c);
      box(x + 1, 62, x + 5, 63, [150, 180, 196]);
      box(x, 59, x + 6, 60, [172, 60, 48]);
      put(x + 1, 62, 220, 236, 244);
    }
    // wall clock, utensil rail with a ladle and spatula, a fire extinguisher by the stove
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { const d = dx * dx + dy * dy; if (d <= 40) put(156 + dx, 28 + dy, d > 30 ? 60 : 236, d > 30 ? 52 : 232, d > 30 ? 48 : 220); }
    for (const [dx, dy] of [[0, -5], [5, 0], [0, 5], [-5, 0]]) put(156 + dx, 28 + dy, 150, 140, 130);   // the hands are drawn live, from the real time
    box(2, 46, 12, 46, [150, 158, 168]);
    box(4, 47, 4, 60, [160, 168, 178]); box(2, 61, 6, 64, [160, 168, 178]); box(3, 61, 5, 63, [120, 128, 138]);
    box(9, 47, 9, 58, [120, 80, 50]); box(7, 59, 11, 65, [60, 60, 66]);
    box(3, 88, 8, 106, [196, 40, 36]); box(3, 88, 3, 106, [226, 70, 60]); box(4, 84, 7, 87, [40, 40, 44]); box(8, 84, 10, 85, [40, 40, 44]); box(4, 94, 7, 98, [240, 236, 220]);
    // pendant lamp over the sink
    box(254, 3, 254, 18, [30, 30, 34]);
    for (let y = 19; y <= 24; y++) { const hw = 2 + (y - 19); box(254 - hw, y, 254 + hw, y, [44, 88, 70]); }
    box(250, 25, 258, 25, [255, 236, 170]);
    // sprinkler heads in the ceiling
    for (const sx of Kitchen.sprinklerX) { box(sx - 1, 3, sx + 1, 3, [150, 150, 156]); put(sx, 4, 200, 60, 50); }
    // under the worktop: cabinets, the stove front with the oven door, the sink cupboard
    for (let y = 120; y < GH; y++) for (let x = 0; x < GW; x++) {
      let c;
      if (x >= 10 && x <= 150) {
        c = [126, 134, 144];
        if (y >= 129 && y <= 140 && x >= 24 && x <= 136) c = (x - y * 0.6) % 26 < 3 ? [62, 66, 74] : [24, 26, 32];
        if (y === 128 && x >= 24 && x <= 136) c = [176, 184, 194];
        if (y === 121) c = [92, 98, 108];
      } else {
        const door = x < 10 ? 0 : Math.floor((x - 151) / 34), dx = x < 10 ? x : (x - 151) % 34;
        c = [112, 74, 48];
        if (dx === 0 || dx === 33 || y === 121 || y === GH - 2) c = [72, 46, 30];
        else if ((dx === 3 || dx === 30) && y > 124 && y < GH - 4) c = [96, 62, 40];
        if (x >= 10 && dx >= 15 && dx <= 18 && y >= 124 && y <= 125) c = [200, 200, 206];
        if (door < 0) c = [112, 74, 48];
      }
      put(x, y, c[0], c[1], c[2]);
    }
    for (let y = 116; y <= 132; y++) for (let x = 260; x <= 282; x++) put(x, y, 58, 64, 72);
    ctx.putImageData(im, 0, 0);
  },
  /* ---------- live cells, every frame ---------- */
  frame(t, ov) {
    const px = this.px, base = this.base, A = this.alpha, V = this.vary, ga = this.gacc, hz = this.hacc, counts = this.counts || (this.counts = new Uint32Array(NE));
    ga.fill(0); hz.fill(0); counts.fill(0);
    const GW2 = GW >> 1;
    const glowAdd = (i, r, g, b) => { const x = (i % GW) >> 1, y = ((i / GW) | 0) >> 1, k = (y * GW2 + x) * 3; ga[k] += r; ga[k + 1] += g; ga[k + 2] += b; };
    const hazeAdd = (i, r, g, b, a) => { const x = (i % GW) >> 1, y = ((i / GW) | 0) >> 1, k = (y * GW2 + x) * 4; hz[k] += r * a; hz[k + 1] += g * a; hz[k + 2] += b * a; hz[k + 3] += a; };
    for (let i = 0; i < GN; i++) {
      const ty = type[i];
      if (ty === AIR) { px[i] = 0; continue; }
      counts[ty]++;
      const cat = CATA[ty];
      if (cat === STATIC) {
        if (ty === BURNER) {
          const T = temp[i], k = clamp((T - 40) / 300, 0, 1);
          if (k <= 0) { px[i] = rgba32(46, 46, 52, 255); continue; }
          const fl = 0.75 + 0.25 * Math.sin(t * 23 + i * 1.7);
          px[i] = rgba32(lerp(46, 90, k) * fl, lerp(46, 150, k) * fl, lerp(52, 255, k) * fl, 255);
          glowAdd(i, 20 * k, 50 * k, 140 * k);
        } else if (ty === STEEL && temp[i] > 230) {
          const k = clamp((temp[i] - 230) / 200, 0, 1), c = SC[i];
          px[i] = rgba32(lerp(c & 255, 255, k * 0.55), lerp((c >> 8) & 255, 90, k * 0.5), lerp((c >> 16) & 255, 60, k * 0.5), 255);
          if (k > 0.4) glowAdd(i, 30 * k, 6 * k, 0);
        } else px[i] = SC[i];
        continue;
      }
      let r, g, b;
      const rp = this.ramp[ty];
      if (rp !== null) {
        const n = rp.length / 3 - 1, f = clamp(cook[i] / this.rampMax[ty], 0, 1) * n, k = f | 0, u = f - k, k1 = k < n ? k + 1 : k;
        r = rp[k * 3] + (rp[k1 * 3] - rp[k * 3]) * u; g = rp[k * 3 + 1] + (rp[k1 * 3 + 1] - rp[k * 3 + 1]) * u; b = rp[k * 3 + 2] + (rp[k1 * 3 + 2] - rp[k * 3 + 2]) * u;
      } else { r = base[ty * 3]; g = base[ty * 3 + 1]; b = base[ty * 3 + 2]; }
      const v = (shade[i] / 255 - 0.5) * V[ty];
      r += v; g += v; b += v;
      let a = A[ty];
      if (cat === GAS) {
        const life = cook[i];
        if (ty === FIRE) { glowAdd(i, 255, 120, 30); a = 255; }
        else if (life < 60) a = a * life / 60;
        if ((ty === STEAM || ty === SMOKE) && this.hpx) { hazeAdd(i, r, g, b, a); a *= 0.6; }
      } else if (cat === LIQUID && type[i - GW] === AIR) { r += 22; g += 22; b += 22; }   // a bright line along the surface
      if (FAT[ty] && (aux[i] & 15)) { r += 48; g += 46; b += 34; a = 255; }   // frying bubbles
      if (aux[i] & BURNING && IGNITE[ty]) { r = lerp(r, 255, 0.55); g = lerp(g, 130, 0.55); b *= 0.4; glowAdd(i, 180, 70, 10); }
      if (ty === RICE_C && (aux[i] & 3)) { r -= 6; g -= 4; }   // moist grains look a touch glossier
      px[i] = rgba32(r < 0 ? 0 : r > 255 ? 255 : r, g < 0 ? 0 : g > 255 ? 255 : g, b < 0 ? 0 : b > 255 ? 255 : b, a);
    }
    this.fixtures(t);
    if (ov) this.overlay(ov);
    this.fctx.putImageData(this.img, 0, 0);
    // glow: average each 2x2 block, soften, soft-clip. Softening here (not with a CSS filter) keeps the
    // compositor's work small on phones
    soften(ga, GW >> 1, GH >> 1, 3, 2);
    const gp = this.gpx;
    for (let k = 0, n = gp.length; k < n; k++) {
      const r = ga[k * 3] * 0.25, g = ga[k * 3 + 1] * 0.25, b = ga[k * 3 + 2] * 0.25;
      gp[k] = (r + g + b) < 1 ? 0 : rgba32(255 * (1 - Math.exp(-r / 85)), 255 * (1 - Math.exp(-g / 85)), 255 * (1 - Math.exp(-b / 85)), 255);
    }
    this.gctx.putImageData(this.gimg, 0, 0);
    if (this.hpx) {
      soften(hz, GW >> 1, GH >> 1, 4, 1);
      const hp = this.hpx;
      for (let k = 0, n = hp.length; k < n; k++) {
        const s = hz[k * 4 + 3];
        hp[k] = s < 6 ? 0 : rgba32(hz[k * 4] / s, hz[k * 4 + 1] / s, hz[k * 4 + 2] / s, 235 * (1 - Math.exp(-s / 220)));
      }
      this.hctx.putImageData(this.himg, 0, 0);
    }
  },
  dot(x, y, r, g, b, a = 255) { if (x >= 0 && x < GW && y >= 0 && y < GH) this.px[y * GW + x] = rgba32(r, g, b, a); },
  /* knobs, the alarm light, the hood fan: little moving parts */
  fixtures(t) {
    for (const bnr of Kitchen.burners) {
      const cx = bnr.knobX, cy = 124, ang = -Math.PI / 2 + bnr.level * (Math.PI * 0.5);
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const d = dx * dx + dy * dy; if (d <= 10) this.dot(cx + dx, cy + dy, d > 6 ? 40 : 30, d > 6 ? 42 : 32, d > 6 ? 48 : 36); }
      for (let k = 1; k <= 2; k++) this.dot(Math.round(cx + Math.cos(ang) * k), Math.round(cy + Math.sin(ang) * k), 240, 240, 236);
      const on = bnr.level > 0;
      this.dot(cx + 5, cy - 2, on ? 255 : 70, on ? 120 : 70, on ? 40 : 76);
    }
    const al = Kitchen.alarm, blink = al.beeping && (t * 4) % 1 < 0.5;
    this.dot(190, 5, blink ? 255 : 40, blink ? 40 : 160, blink ? 40 : 70);
    if (blink) for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1]]) this.dot(190 + dx, 5 + dy, 255, 90, 80);
    // hood fan blades in the duct
    const fan = Kitchen.hood.on ? t * 14 : 0.4;
    for (let k = 0; k < 3; k++) for (let r = 1; r <= 3; r++) {
      const a = fan + k * (Math.PI * 2 / 3);
      this.dot(Math.round(80 + Math.cos(a) * r), Math.round(9 + Math.sin(a) * r * 0.6), 120, 128, 140);
    }
    this.dot(80, 9, 170, 176, 186);
    // the wall clock tells the real time
    const now = new Date(), mins = now.getMinutes() + now.getSeconds() / 60, hrs = (now.getHours() % 12) + mins / 60;
    const hand = (frac, len, c) => { const a = frac * Math.PI * 2 - Math.PI / 2; for (let k = 1; k <= len; k++) this.dot(Math.round(156 + Math.cos(a) * k), Math.round(28 + Math.sin(a) * k), c, c, c + 4); };
    hand(mins / 60, 4, 40); hand(hrs / 12, 3, 22); this.dot(156, 28, 22, 22, 26);
    this.dot(129, 38, Kitchen.hood.on ? 90 : 40, Kitchen.hood.on ? 230 : 70, Kitchen.hood.on ? 120 : 60);
    // a rattling lid hops up and down
    for (const L of Kitchen.lids) if (L.on && L.rattle > 0 && ((t * 24) | 0) % 2) {
      for (const i of L.cells) this.px[i] = 0;
      for (const i of L.cells) this.px[i - GW] = SC[i];
    }
    if (typeof Cat !== 'undefined') Cat.draw(this, t);
    // tap handle: red tick when running
    this.dot(284, 81, Kitchen.tap.on ? 70 : 220, Kitchen.tap.on ? 140 : 70, Kitchen.tap.on ? 255 : 60);
  },
  /* the scoop's load riding under the finger, and the brush outline */
  overlay(ov) {
    if (ov.held && ov.held.length) {
      for (const h of ov.held) {
        const x = ov.x + h.dx, y = ov.y + h.dy - 3;
        if (x < 1 || x >= GW - 1 || y < 1 || y >= GH - 1) continue;
        const c = E[h.t].ramp ? E[h.t].ramp[Math.min(E[h.t].ramp.length - 1, Math.floor(clamp(h.c / (E[h.t].rampMax || 1), 0, 0.999) * E[h.t].ramp.length))] : E[h.t].col;
        const v = (h.s / 255 - 0.5) * E[h.t].vary;
        this.dot(x, y, clamp(c[0] + v, 0, 255), clamp(c[1] + v, 0, 255), clamp(c[2] + v, 0, 255), 255);
      }
    }
    if (ov.ring) {
      const { x, y, r } = ov.ring, n = Math.max(12, r * 7);
      for (let k = 0; k < n; k++) {
        if (k % 2) continue;
        const a = k / n * Math.PI * 2, px = Math.round(x + Math.cos(a) * r), py = Math.round(y + Math.sin(a) * r);
        if (px > 0 && px < GW - 1 && py > 0 && py < GH - 1 && type[py * GW + px] === AIR) this.dot(px, py, 255, 255, 255, 150);
      }
    }
  },
};
/* a small separable [1 2 1] blur, in place, over a w x h grid of ch-channel float pixels */
const _soft = { tmp: null };
function soften(a, w, h, ch, passes) {
  if (!_soft.tmp || _soft.tmp.length !== a.length) _soft.tmp = new Float32Array(a.length);
  const t = _soft.tmp, row = w * ch;
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < ch; c++) {   // across
      const k = y * row + x * ch + c, l = x > 0 ? k - ch : k, r = x < w - 1 ? k + ch : k;
      t[k] = (a[l] + 2 * a[k] + a[r]) * 0.25;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < ch; c++) {   // down
      const k = y * row + x * ch + c, u = y > 0 ? k - row : k, d = y < h - 1 ? k + row : k;
      a[k] = (t[u] + 2 * t[k] + t[d]) * 0.25;
    }
  }
}
/* the window's sky by time of day */
function skyPeriod(d = new Date()) { const h = d.getHours() + d.getMinutes() / 60; return h < 5.5 || h >= 20.5 ? 'night' : h < 7.5 ? 'dawn' : h < 17.5 ? 'day' : 'dusk'; }
const SKY = {
  night: { top: [14, 18, 46], low: [58, 42, 92], stars: 40, orb: [226, 27, 5], orbCol: [250, 238, 196], moon: true, clouds: [], city: [18, 20, 36], lit: 0.45 },
  dawn: { top: [64, 84, 150], low: [246, 172, 140], stars: 8, orb: [184, 54, 6], orbCol: [255, 214, 150], halo: true, clouds: [[200, 30, 14], [222, 24, 10]], city: [44, 38, 64], lit: 0.14 },
  day: { top: [96, 160, 232], low: [196, 224, 246], stars: 0, orb: [228, 28, 5], orbCol: [255, 246, 196], halo: true, clouds: [[172, 30, 16], [196, 24, 12], [214, 36, 18]], city: [86, 98, 124], glass: [150, 186, 214], lit: 0 },
  dusk: { top: [44, 42, 104], low: [252, 136, 84], stars: 6, orb: [178, 52, 7], orbCol: [255, 170, 90], halo: true, clouds: [[204, 28, 14]], city: [34, 28, 50], lit: 0.32 },
};
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
