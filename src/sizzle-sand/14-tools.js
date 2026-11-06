/* ============================================================
   Tools that act on the grid (no DOM here, so headless tests can
   cook with exactly what the player uses): pour, stamps, scoop,
   stir, wipe, blowtorch, extinguisher, build.
   ============================================================ */
const MOVABLE = (t) => t !== AIR && CATA[t] !== STATIC;
const Tools = {
  /* the ingredient tray, in shelf order */
  INGREDIENTS: [
    { key: 'water', label: 'Water', el: WATER, mode: 'pour' },
    { key: 'oil', label: 'Oil', el: OIL, mode: 'pour' },
    { key: 'rice', label: 'Rice', el: RICE, mode: 'pour' },
    { key: 'leftover', label: 'Day-old rice', el: RICE_C, mode: 'pour' },
    { key: 'egg', label: 'Egg', mode: 'stamp' },
    { key: 'kernel', label: 'Kernels', el: KERNEL, mode: 'pour' },
    { key: 'sugar', label: 'Sugar', el: SUGAR, mode: 'pour' },
    { key: 'flour', label: 'Flour', el: FLOUR, mode: 'pour' },
    { key: 'milk', label: 'Milk', el: MILK, mode: 'pour' },
    { key: 'butter', label: 'Butter', mode: 'stamp' },
    { key: 'choc', label: 'Chocolate', mode: 'stamp' },
    { key: 'garlic', label: 'Garlic', mode: 'stamp' },
    { key: 'chicken', label: 'Chicken', mode: 'stamp' },
    { key: 'soy', label: 'Soy sauce', el: SOY, mode: 'pour' },
    { key: 'vinegar', label: 'Vinegar', el: VINEGAR, mode: 'pour' },
    { key: 'noodles', label: 'Noodles', mode: 'stamp' },
    { key: 'season', label: 'Seasoning', el: SEASON, mode: 'pour' },
    { key: 'salt', label: 'Salt', el: SALT, mode: 'pour' },
    { key: 'ice', label: 'Ice', mode: 'stamp' },
    { key: 'cola', label: 'Cola', el: COLA, mode: 'pour' },
    { key: 'mints', label: 'Mints', mode: 'stamp' },
  ],
  inside(x, y) { return x > 0 && x < GW - 1 && y > 2 && y < GH - 1; },
  /* sprinkle n cells into free spots near (x, y); liquids come out as a narrow stream */
  pour(x, y, el, n) {
    const liquid = CATA[el] === LIQUID, r = liquid ? 1 : 2; let made = 0;
    for (let k = 0; k < n * 4 && made < n; k++) {
      const px = Math.round(x + (rnd() * 2 - 1) * r), py = Math.round(y + (rnd() * 2 - 1) * r);
      if (!this.inside(px, py) || Kitchen.underLid(px, py)) continue;
      const i = idx(px, py);
      if (type[i] !== AIR) continue;
      setCell(i, el, el === WATER ? 18 : AMB); vel[i] = 2;
      if (el === RICE_C) aux[i] = 0;   // day-old rice is dry: it fries instead of steaming
      made++;
    }
    return made;
  },
  fillShape(cx, cy, el, test) {   // put el into every free cell where test(dx, dy) is true
    let n = 0;
    for (let dy = -8; dy <= 8; dy++) for (let dx = -10; dx <= 10; dx++) {
      if (!test(dx, dy)) continue;
      const x = cx + dx, y = cy + dy; if (!this.inside(x, y)) continue;
      const i = idx(x, y); if (type[i] === AIR) { setCell(i, el, el === ICE ? -6 : el === BUTTER || el === MEAT ? 6 : AMB); n++; }
    }
    return n;
  },
  stamp(kind, x, y) {
    const disk = (r) => (dx, dy) => dx * dx + dy * dy <= r * r + r * 0.6;
    switch (kind) {
      case 'egg': { const n = this.fillShape(x, y, YOLK, disk(2.1)); return n + this.fillShape(x, y, EGG_W, (dx, dy) => disk(5.2)(dx, dy * 1.4)); }
      case 'butter': return this.fillShape(x, y, BUTTER, (dx, dy) => dx >= -3 && dx <= 3 && dy >= -1 && dy <= 1);
      case 'choc': return this.fillShape(x, y, CHOC, (dx, dy) => dx >= -3 && dx <= 2 && dy >= -2 && dy <= 1);
      case 'ice': return this.fillShape(x, y, ICE, (dx, dy) => dx >= -2 && dx <= 2 && dy >= -2 && dy <= 2);
      case 'noodles': return this.fillShape(x, y, NOODLE_D, (dx, dy) => dx >= -6 && dx <= 6 && dy >= -3 && dy <= 2 && (dx + dy * 3 + 99) % 4 !== 0);
      case 'chicken': return this.fillShape(x, y, MEAT, (dx, dy) => (dx * dx) / 12 + (dy * dy) / 6 <= 1.05 + Math.sin(dx * 1.7 + dy) * 0.15);
      case 'mints': return this.fillShape(x, y, MENTOS, (dx, dy) => dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1);
      case 'garlic': {
        let n = 0;
        for (let k = 0; k < 7; k++) { const gx = x + rndi(11) - 5, gy = y + rndi(5) - 2; n += this.fillShape(gx, gy, GARLIC, (dx, dy) => dy === 0 && (dx === 0 || dx === 1)); }
        return n;
      }
      default: return 0;
    }
  },
  /* scoop: lift a blob of food out of the grid, carry it, set it down somewhere else.
     The scoop is slotted: when it comes up with food in it, frying oil drains back out. */
  lift(cells, cx, cy) {
    let food = 0;
    for (const i of cells) { const t = type[i]; if (FOOD[t] && !FAT[t]) food++; }
    const drain = food >= Math.max(6, cells.length * 0.08), held = [];
    for (const i of cells) {
      const t = type[i]; if (drain && t === OIL) continue;
      held.push({ dx: (i % GW) - cx, dy: ((i / GW) | 0) - cy, t, T: temp[i], c: cook[i], a: aux[i], s: shade[i] });
      clearCell(i);
    }
    return held;
  },
  pick(x, y, r) {
    const cells = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + r) continue;
      const px = x + dx, py = y + dy; if (!this.inside(px, py) || Kitchen.underLid(px, py)) continue;
      const i = idx(px, py), t = type[i];
      if (MOVABLE(t) && CATA[t] !== GAS) cells.push(i);
    }
    return this.lift(cells, x, y);
  },
  pickRect(x0, y0, x1, y1) {
    const cells = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = idx(x, y), t = type[i]; if (MOVABLE(t) && CATA[t] !== GAS) cells.push(i); }
    return this.lift(cells, (x0 + x1) >> 1, (y0 + y1) >> 1);
  },
  /* set a held blob down; over a vessel, squeeze it to fit inside the rim (fitW cells wide) */
  drop(x, y, held, fitW) {
    let placed = 0, minX = 0, maxX = 0;
    for (const h of held) { if (h.dx < minX) minX = h.dx; if (h.dx > maxX) maxX = h.dx; }
    const span = maxX - minX + 1, k = fitW && span > fitW ? (fitW - 1) / (span - 1) : 1;
    held.sort((a, b) => b.dy - a.dy);
    for (const h of held) {
      let px = x + Math.round((h.dx - (minX + maxX) / 2) * k), py = y + h.dy;
      px = clamp(px, 1, GW - 2);
      for (let k = 0; k < 30; k++, py--) {
        if (!this.inside(px, py)) break;
        const i = idx(px, py);
        if (type[i] === AIR || CATA[type[i]] === GAS) {
          type[i] = h.t; temp[i] = h.T; cook[i] = h.c; aux[i] = h.a; shade[i] = h.s; vel[i] = 0; placed++; break;
        }
      }
    }
    return placed;
  },
  stir(x, y, r, n) {
    for (let k = 0; k < n; k++) {
      const a = idx(clamp(x + rndi(2 * r + 1) - r, 1, GW - 2), clamp(y + rndi(2 * r + 1) - r, 3, GH - 2));
      const b = a + N8[rndi(8)] * (1 + rndi(2));
      if (b < 0 || b >= GN) continue;
      const ta = type[a], tb = type[b];
      // beating: yolk and white stirred together turn into one beaten egg
      if ((ta === YOLK || ta === EGG_W || ta === EGG_MIX) && (tb === YOLK || tb === EGG_W || tb === EGG_MIX) && ta !== tb) { this.beat(a); this.beat(b); continue; }
      // a sheet of egg that is still setting breaks up into curds
      if (ta === EGG_OM && rnd() < 0.35) { const c = cook[a], T = temp[a]; morph(a, EGG_SCR); cook[a] = c; temp[a] = T; }
      if (MOVABLE(ta) && MOVABLE(tb) && CATA[ta] !== GAS && CATA[tb] !== GAS) moveTo(a, b);
    }
  },
  beat(i) { if (type[i] !== EGG_MIX) { const T = temp[i], c = type[i] === EGG_W ? cook[i] * 0.7 : 0; morph(i, EGG_MIX); temp[i] = T; cook[i] = c; } },
  wipe(x, y, r) {
    let n = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + r) continue;
      const px = x + dx, py = y + dy; if (!this.inside(px, py)) continue;
      const i = idx(px, py), t = type[i];
      if (MOVABLE(t) || t === BRICK) { clearCell(i); n++; }
    }
    return n;
  },
  torch(x, y) {
    for (let k = 0; k < 6; k++) {
      const px = x + rndi(5) - 2, py = y + rndi(5) - 2; if (!this.inside(px, py)) continue;
      const i = idx(px, py);
      if (type[i] === AIR) setGas(i, FIRE, 800, 10 + rnd() * 14);
      else if (CATA[type[i]] !== STATIC) temp[i] += 25;
    }
  },
  spray(x, y) {
    for (let k = 0; k < 16; k++) {
      const px = x + rndi(11) - 5, py = y + rndi(9) - 4; if (!this.inside(px, py)) continue;
      const i = idx(px, py);
      if (type[i] === AIR) setCell(i, FOAM, 8);
      else extinguishAt(i);
    }
  },
  build(x, y, r) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const px = x + dx, py = y + dy; if (!this.inside(px, py) || py > 115) continue;
      const i = idx(px, py);
      if (type[i] === AIR || CATA[type[i]] === GAS) { setCell(i, BRICK); const c = E[BRICK].col, v = (shade[i] / 255 - 0.5) * 26, mortar = (py % 3 === 0) || ((px + (((py / 3) | 0) % 2) * 3) % 6 === 0); SC[i] = rgba32(clamp(c[0] + v - (mortar ? 40 : 0), 0, 255), clamp(c[1] + v - (mortar ? 10 : 0), 0, 255), clamp(c[2] + v, 0, 255), 255); }
    }
  },
};
