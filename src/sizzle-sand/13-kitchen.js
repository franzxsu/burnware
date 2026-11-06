/* ============================================================
   The kitchen: fixtures built out of static cells, and the
   things that act on the grid every step (burners, tap, range
   hood, smoke alarm, sprinklers). Coordinates are cells.
   ============================================================ */
const idx = (x, y) => y * GW + x;
function rgba32(r, g, b, a) { return (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0; }

const Kitchen = {
  LEVELS: ['OFF', 'LOW', 'MED', 'HIGH'],
  LEVEL_T: [AMB, 150, 230, 330],
  burners: [
    { id: 'pot', label: 'Pot', x0: 26, x1: 64, y: 111, level: 0, knobX: 45, knobY: 126 },
    { id: 'pan', label: 'Pan', x0: 88, x1: 128, y: 111, level: 0, knobX: 108, knobY: 126 },
  ],
  pot: { x0: 24, x1: 66, y0: 74, y1: 108 },
  pan: { x0: 84, x1: 132, y0: 102, y1: 108 },
  tap: { on: false, x: 270, y: 91, knobX: 285, knobY: 84 },
  hood: { on: false, x0: 46, x1: 114, y0: 18, y1: 30, btnX: 80, btnY: 24 },
  alarm: { smoke: 0, beeping: false, hot: 0, sprinkler: 0, trips: 0 },
  vessels: [
    { id: 'plate', name: 'Plate', x0: 161, x1: 195, y0: 92, y1: 113 },
    { id: 'bowl', name: 'Bowl', x0: 203, x1: 229, y0: 86, y1: 113 },
    { id: 'mug', name: 'Mug', x0: 238, x1: 248, y0: 86, y1: 113 },
  ],
  sprinklerX: [40, 110, 180, 250],
  steps: 0,
  /* lids: a domed steel cover over the pot or pan. Under a lid there is no air for a fire, and steam has
     nowhere to go: it builds up until the lid rattles, and then blows off */
  lids: [
    { id: 'pot', x0: 21, x1: 69, top: 72, dome: 2, limit: 150, on: false, cells: [], pressure: 0, rattle: 0 },
    { id: 'pan', x0: 81, x1: 135, top: 101, dome: 6, limit: 70, on: false, cells: [], pressure: 0, rattle: 0 },
  ],

  build() {
    type.fill(AIR); temp.fill(AMB); cook.fill(0); aux.fill(0); vel.fill(0); stamp.fill(0);
    for (let i = 0; i < GN; i++) shade[i] = (rnd() * 256) | 0;
    const put = (x, y, id) => { if (x > 0 && x < GW - 1 && y > 0 && y < GH - 1) { const i = idx(x, y); type[i] = id; temp[i] = AMB; } };
    const rect = (x0, y0, x1, y1, id) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, id); };
    // frame + ceiling + everything below the worktop
    for (let x = 0; x < GW; x++) { type[x] = WALL; type[idx(x, GH - 1)] = WALL; }
    for (let y = 0; y < GH; y++) { type[idx(0, y)] = WALL; type[idx(GW - 1, y)] = WALL; }
    rect(1, 1, GW - 2, 2, CEIL);
    rect(1, 120, GW - 2, GH - 2, WALL);
    rect(1, 116, GW - 2, 119, COUNTER);
    // sink: a steel basin cut into the counter, drain in the middle
    rect(258, 116, 284, 134, STEEL); rect(260, 116, 282, 132, AIR); rect(269, 133, 273, 133, DRAIN);
    // tap: pipe up from the counter, across, spout down over the basin
    rect(283, 86, 284, 115, STEEL); rect(268, 86, 284, 87, STEEL); rect(268, 88, 271, 89, STEEL); rect(282, 82, 286, 84, STEEL);
    // stove top and burners
    rect(10, 112, 150, 115, STEEL);
    for (const b of this.burners) rect(b.x0, b.y, b.x1, b.y, BURNER);
    // pot on the left burner
    rect(22, 109, 68, 110, STEEL); rect(22, 74, 23, 110, STEEL); rect(67, 74, 68, 110, STEEL);
    rect(17, 78, 21, 79, STEEL); rect(17, 80, 18, 82, STEEL); rect(69, 78, 73, 79, STEEL); rect(72, 80, 73, 82, STEEL);
    // frying pan on the right burner, long handle
    rect(82, 109, 134, 110, STEEL); rect(82, 103, 83, 110, STEEL); rect(133, 103, 134, 110, STEEL);
    rect(135, 104, 150, 105, STEEL); rect(151, 103, 162, 104, STEEL);
    // range hood: slanted steel shell, open at the bottom
    for (let y = 16; y <= 40; y++) {
      const t = (y - 16) / 24, xl = Math.round(lerp(44, 14, t)), xr = Math.round(lerp(116, 146, t));
      put(xl, y, STEEL); put(xl + 1, y, STEEL); put(xr, y, STEEL); put(xr - 1, y, STEEL);
    }
    rect(44, 16, 116, 17, STEEL); rect(72, 3, 88, 17, STEEL); rect(74, 3, 86, 17, AIR);   // duct up to the ceiling
    rect(12, 40, 16, 41, STEEL); rect(144, 40, 148, 41, STEEL);
    // plate
    rect(162, 114, 194, 115, CERAMIC); rect(160, 112, 161, 114, CERAMIC); rect(195, 112, 196, 114, CERAMIC);
    // bowl: rounded, on a foot
    for (let y = 98; y <= 113; y++) {
      const t = (y - 98) / 15, hw = Math.round(14 - 6 * t * t);
      put(216 - hw, y, CERAMIC); put(216 - hw + 1, y, CERAMIC); put(216 + hw, y, CERAMIC); put(216 + hw - 1, y, CERAMIC);
    }
    rect(208, 112, 224, 113, CERAMIC); rect(210, 114, 222, 115, CERAMIC);
    // mug with a handle
    rect(236, 94, 237, 115, CERAMIC); rect(249, 94, 250, 115, CERAMIC); rect(236, 114, 250, 115, CERAMIC);
    rect(251, 98, 254, 99, CERAMIC); rect(251, 107, 254, 108, CERAMIC); rect(253, 100, 254, 106, CERAMIC);
    // smoke detector on the ceiling
    rect(186, 3, 194, 4, CERAMIC);
    this.shadeStatics();
    for (const b of this.burners) { b.level = 0; b.cur = AMB; }
    for (const L of this.lids) { L.on = false; L.cells = []; L.rattle = 0; L.pressure = 0; }
    this.tap.on = false; this.hood.on = false;
    Object.assign(this.alarm, { smoke: 0, beeping: false, hot: 0, sprinkler: 0 });
  },
  /* bevelled colours for the fixtures: light top-left edges, darker bottom-right */
  shadeStatics() {
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const i = idx(x, y), t = type[i];
      if (CATA[t] !== STATIC || t === WALL) { SC[i] = 0; continue; }
      const c = E[t].col, v = ((shade[i] / 255) - 0.5) * E[t].vary;
      let k = 1;
      const openUp = y > 0 && CATA[type[i - GW]] !== STATIC, openL = x > 0 && CATA[type[i - 1]] !== STATIC;
      const openDn = y < GH - 1 && CATA[type[i + GW]] !== STATIC, openR = x < GW - 1 && CATA[type[i + 1]] !== STATIC;
      if (openUp) k += 0.22; if (openL) k += 0.1; if (openDn) k -= 0.18; if (openR) k -= 0.1;
      let r = c[0] * k + v, g = c[1] * k + v, b = c[2] * k + v;
      if (t === CERAMIC && (y === 113 || y === 99 || (x >= 236 && x <= 250 && y === 104))) { r *= 0.62; g *= 0.78; b *= 1.02; }   // blue band on the crockery
      if (t === COUNTER && y === 116) { r += 26; g += 26; b += 26; }
      SC[i] = rgba32(clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255), 255);
    }
  },
  /* wipe all food and mess, keep the fixtures */
  clearMess() {
    for (let k = 0; k < this.lids.length; k++) this.setLid(k, false);
    for (let i = 0; i < GN; i++) if (type[i] !== AIR && CATA[type[i]] !== STATIC) clearCell(i);
    for (let i = 0; i < GN; i++) if (CATA[type[i]] === STATIC) { temp[i] = AMB; aux[i] = 0; cook[i] = 0; }
    Object.assign(this.alarm, { smoke: 0, beeping: false, hot: 0, sprinkler: 0 });
  },
  preStep() {
    this.steps++;
    for (const b of this.burners) {   // a burner takes a few seconds to come up to heat (or cool down)
      b.cur = (b.cur === undefined ? AMB : b.cur) + (this.LEVEL_T[b.level] - (b.cur === undefined ? AMB : b.cur)) * 0.006;
      const T = b.cur, row = b.y * GW;
      for (let x = b.x0; x <= b.x1; x++) if (type[row + x] === BURNER) temp[row + x] = T;
    }
    if (this.tap.on) for (let x = this.tap.x; x <= this.tap.x + 1; x++) {
      const i = idx(x, this.tap.y); if (type[i] === AIR && rnd() < 0.85) { setCell(i, WATER, 16); vel[i] = 4; }
    }
    if (this.alarm.sprinkler > 0) {
      this.alarm.sprinkler--;
      for (const sx of this.sprinklerX) for (let k = 0; k < 2; k++) {
        const i = idx(sx + rndi(9) - 4, 3); if (type[i] === AIR && rnd() < 0.5) { setCell(i, WATER, 14); vel[i] = 2; }
      }
    }
    if (this.hood.on) {   // the fan pulls steam and smoke out through the duct
      const h = this.hood;
      for (let y = 3; y <= 40; y++) {
        const t = clamp((y - 16) / 24, 0, 1), xl = y < 16 ? 74 : Math.round(lerp(46, 16, t)), xr = y < 16 ? 86 : Math.round(lerp(114, 144, t));
        for (let x = xl; x <= xr; x++) {
          const i = idx(x, y), c = type[i];
          if (CATA[c] !== GAS || c === FIRE) continue;
          if (y < 16 && rnd() < 0.5) clearCell(i);
          else if (stamp[i] !== tick && rnd() < 0.5) { const up = i - GW; if (type[up] === AIR) moveTo(i, up); }
        }
      }
    }
  },
  postStep() {
    if (this.steps % 6) return;
    for (const L of this.lids) if (L.on) this.lidStep(L);
    let smoke = 0;
    for (let y = 3; y <= 18; y++) for (let x = 1; x < GW - 1; x++) if (type[idx(x, y)] === SMOKE) smoke++;
    const a = this.alarm; a.smoke = smoke;
    if (smoke > 45) { a.beeping = true; a.hot += 6; } else if (smoke < 12) { a.beeping = false; a.hot = Math.max(0, a.hot - 12); }
    if (a.beeping && a.hot > 720 && a.sprinkler <= 0) { a.sprinkler = 480; a.hot = 0; a.trips++; }   // about 12 s of alarm, then the sprinklers
  },
  lidCells(L) {
    const out = new Set(), w = L.x1 - L.x0; let prev = null;
    for (let x = L.x0; x <= L.x1; x++) {
      const y = L.top - Math.round(L.dome * Math.sin(Math.PI * (x - L.x0) / w));
      const a = prev === null ? y : Math.min(y, prev), b = prev === null ? y : Math.max(y, prev);
      for (let yy = a; yy <= b + 1; yy++) out.add(idx(x, yy));
      prev = y;
    }
    const cx = (L.x0 + L.x1) >> 1, ky = L.top - L.dome - 2;   // a knob to lift it by
    for (let dx = -1; dx <= 1; dx++) { out.add(idx(cx + dx, ky)); out.add(idx(cx + dx, ky + 1)); }
    return [...out];
  },
  /* put a lid on (false if food is piled up in the way) or take it off */
  setLid(k, on) {
    const L = this.lids[k];
    if (!!on === L.on) return true;
    if (on) {
      const cells = this.lidCells(L);
      for (const i of cells) { const t = type[i]; if (t !== AIR && CATA[t] !== GAS) return false; }
      for (const i of cells) { type[i] = STEEL; temp[i] = AMB; cook[i] = 0; aux[i] = 0; vel[i] = 0; }
      L.cells = cells; L.on = true; L.pressure = 0; L.rattle = 0;
      this.paintLid(L);
    } else {
      for (const i of L.cells) if (type[i] === STEEL) { clearCell(i); SC[i] = 0; }
      L.cells = []; L.on = false; L.rattle = 0;
    }
    return true;
  },
  paintLid(L) {
    const set = new Set(L.cells), c = E[STEEL].col, ky = L.top - L.dome - 1;
    for (const i of L.cells) {
      const knob = ((i / GW) | 0) <= ky, f = knob ? 0.42 : !set.has(i - GW) ? 1.28 : !set.has(i + GW) ? 0.78 : 1;
      SC[i] = rgba32(clamp(c[0] * f, 0, 255), clamp(c[1] * f, 0, 255), clamp(c[2] * f + 8, 0, 255), 255);
    }
  },
  underLid(x, y) { for (const L of this.lids) if (L.on && x >= L.x0 && x <= L.x1 && y > L.top - L.dome - 3 && y <= 110) return true; return false; },
  lidStep(L) {
    let steam = 0;
    for (let y = L.top - L.dome; y <= 108; y++) for (let x = L.x0 + 1; x <= L.x1 - 1; x++) {
      const i = idx(x, y), t = type[i];
      if (t === FIRE) setGas(i, SMOKE, 200);   // no air under the lid
      else if ((aux[i] & BURNING) && IGNITE[t] && CATA[t] !== STATIC) { if (rnd() < 0.15) { aux[i] &= ~BURNING; temp[i] = Math.min(temp[i], IGNITE[t] - 60); cook[i] = 0; if (FAT[t]) Sim.ev.smother++; } }
      else if (t === STEAM && aux[i] !== 3) {   // trapped steam stays hot and does not drift away; a little condenses and drips back
        if (rnd() < 0.002) { morph(i, WATER); temp[i] = 99; continue; }
        steam++; if (cook[i] < 90) cook[i] = 90; if (temp[i] < 100) temp[i] = 100;
      }
    }
    L.pressure = steam;
    if (steam > L.limit) {
      L.rattle++; Sim.ev.rattle++;
      for (const x of [L.x0 - 1, L.x1 + 1]) { const i = idx(x, L.top); if (type[i] === AIR && rnd() < 0.7) { setGas(i, STEAM, 100, 30 + rnd() * 40); aux[i] = 3; } }   // steam squeezes out at the rim
      if (L.rattle > 30) {   // about three seconds of rattling, then it goes
        this.setLid(this.lids.indexOf(L), false);
        for (let y = L.top - L.dome - 20; y <= 108; y++) for (let x = L.x0; x <= L.x1; x++) { const i = idx(x, y); if (type[i] === STEAM) vel[i] = -(3 + rndi(7)); }
        Sim.ev.lidpop++;
      }
    } else if (L.rattle > 0) L.rattle--;
  },
  setBurner(k, level) { this.burners[k].level = clamp(level, 0, 3); },
  /* what is sitting in a vessel right now */
  contents(v) {
    const counts = {}, cookSum = {}; let n = 0, heat = 0;
    for (let y = v.y0; y <= v.y1; y++) for (let x = v.x0; x <= v.x1; x++) {
      const i = idx(x, y), t = type[i];
      if (t === AIR || CATA[t] === STATIC || CATA[t] === GAS) continue;
      counts[t] = (counts[t] || 0) + 1; cookSum[t] = (cookSum[t] || 0) + cook[i]; n++; heat += temp[i];
    }
    const cookAvg = {}; for (const t in counts) cookAvg[t] = cookSum[t] / counts[t];
    return { counts, cookAvg, n, avgT: n ? heat / n : AMB };
  },
  /* the stove's little display: how hot the food in the pot or pan is (or the bare metal, if it is empty) */
  reading(k) {
    const r = k === 0 ? this.pot : this.pan, top = k === 0 ? r.y0 : r.y0 - 10;
    let s = 0, n = 0;
    for (let y = top; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { const t = type[idx(x, y)]; if (t !== AIR && CATA[t] !== STATIC && CATA[t] !== GAS) { s += temp[idx(x, y)]; n++; } }
    return n >= 6 ? s / n : temp[idx((r.x0 + r.x1) >> 1, r.y1 + 1)];
  },
  emptyVessel(v) {
    for (let y = v.y0; y <= v.y1; y++) for (let x = v.x0; x <= v.x1; x++) { const i = idx(x, y); if (CATA[type[i]] !== STATIC) clearCell(i); }
  },
};
