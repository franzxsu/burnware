/* ============================================================
   Simulation: one step = fixtures, then every cell reacts and
   moves (bottom row first), then heat spreads between touching
   cells. Reactions are small functions keyed by element.
   ============================================================ */
const N8 = new Int32Array([-GW - 1, -GW, -GW + 1, -1, 1, GW - 1, GW, GW + 1]);
const UPS = new Int32Array([-GW, -GW - 1, -GW + 1, -1, 1]);
const BURNING = 0x80;
const CAPA = new Float32Array(NE); for (const d of E) CAPA[d.id] = d.cap;
let tick = 1;

const Sim = {
  ev: { sizzle: 0, bubble: 0, pop: 0, fire: 0, flare: 0, dust: 0, boilover: 0, geyser: 0, tutong: 0, grease: 0, rattle: 0, lidpop: 0, smother: 0, spit: 0, colaTop: GH },
  resetEv() { const e = this.ev; for (const k in e) e[k] = 0; e.colaTop = GH; },
  speed: 1,
};

function nb(i) { return i + N8[(rnd() * 8) | 0]; }
function gasLife(id) { const L = E[id].life; return L * (0.6 + rnd() * 0.8); }
function setGas(i, id, T, life) { setCell(i, id, T); cook[i] = life || gasLife(id); }
/* put a new cell in the first free spot above/beside i */
function spawnUp(i, id, T, life) {
  for (let k = 0; k < 5; k++) {
    const j = i + UPS[k < 1 ? 0 : (k + (rnd() < 0.5 ? 0 : 1)) % 5];
    if (type[j] === AIR) { if (CATA[id] === GAS) setGas(j, id, T, life); else setCell(j, id, T); return j; }
  }
  return -1;
}
function burnTo(i) { const T = temp[i]; if (Sim.burnLog) Sim.burnLog[type[i]] = (Sim.burnLog[type[i]] || 0) + 1; morph(i, BURNT); temp[i] = T; if (rnd() < 0.6) spawnUp(i, SMOKE, T); }

/* ---------- movement ---------- */
function moveTo(i, j) {
  let t = type[j]; type[j] = type[i]; type[i] = t;
  let f = temp[j]; temp[j] = temp[i]; temp[i] = f;
  f = cook[j]; cook[j] = cook[i]; cook[i] = f;
  t = aux[j]; aux[j] = aux[i]; aux[i] = t;
  t = shade[j]; shade[j] = shade[i]; shade[i] = t;
  t = vel[j]; vel[j] = vel[i]; vel[i] = t;
  stamp[j] = tick; stamp[i] = tick;
}
/* can a mover of type a take the place of whatever is in b (falling or flowing)? */
function canSink(a, b) {
  if (b === AIR) return true;
  const cb = CATA[b];
  if (cb === GAS) return CATA[a] !== GAS || DENS[a] > DENS[b];
  if (cb === LIQUID) return CATA[a] !== GAS && DENS[a] > DENS[b] + 0.004;
  return false;
}
/* can a gas rise into b? (through liquids as bubbles, seeping through loose powders) */
function canRise(a, b) {
  if (b === AIR) return true;
  const cb = CATA[b];
  if (cb === GAS) return DENS[b] > DENS[a];
  if (cb === LIQUID) return true;
  if (cb === POWDER) return rnd() < 0.25;
  return false;
}
function fall(i, t) {
  let cur = i, n = 1 + (vel[i] >> 1);
  while (n-- > 0) { const j = cur + GW; if (!canSink(t, type[j])) break; moveTo(cur, j); cur = j; }
  if (cur !== i && vel[cur] < 10) vel[cur]++;
  return cur !== i;
}
function floatUp(i, t) {   // lighter grains/chunks bob up through a denser liquid
  const up = i - GW, b = type[up];
  if (CATA[b] === LIQUID && DENS[b] > DENS[t] + 0.02 && rnd() < 0.5) { moveTo(i, up); return true; }
  return false;
}
function powderStep(i, t) {
  if (fall(i, t)) return;
  vel[i] = 0;
  if (floatUp(i, t)) return;
  if (rnd() < SLIDE[t]) {
    const d = rnd() < 0.5 ? -1 : 1, b = i + GW;
    if (canSink(t, type[b + d]) && canSink(t, type[i + d])) { moveTo(i, b + d); return; }
    if (canSink(t, type[b - d]) && canSink(t, type[i - d])) { moveTo(i, b - d); }
  }
}
function solidStep(i, t) {
  if (fall(i, t)) return;
  vel[i] = 0;
  floatUp(i, t);
}
function liquidStep(i, t) {
  if (fall(i, t)) return;
  vel[i] = 0;
  if (VISC[t] > 0 && rnd() < VISC[t]) return;   // thick liquids fall like anything else but spread slowly
  const d = rnd() < 0.5 ? -1 : 1, b = i + GW;
  if (canSink(t, type[b + d])) { moveTo(i, b + d); return; }
  if (canSink(t, type[b - d])) { moveTo(i, b - d); return; }
  // spread sideways, preferring a spot that can drop
  const f = FLOW[t];
  for (let pass = 0; pass < 2; pass++) {
    const dir = pass ? -d : d; let best = -1;
    for (let k = 1; k <= f; k++) {
      const j = i + dir * k; if (!canSink(t, type[j])) break;
      best = j; if (canSink(t, type[j + GW])) break;
    }
    if (best >= 0) { moveTo(i, best); return; }
  }
}
function gasStep(i, t) {
  if (vel[i] < 0) {   // launched upward (cola geysers)
    let cur = i, n = -vel[i];
    while (n-- > 0) { const j = cur - GW + (rnd() < 0.25 ? (rnd() < 0.5 ? -1 : 1) : 0); if (!canRise(t, type[j])) break; moveTo(cur, j); cur = j; }
    if (rnd() < 0.12) vel[cur]++;
    return;
  }
  if (VISC[t] > 0 && rnd() < VISC[t]) return;
  const d = rnd() < 0.5 ? -1 : 1, up = i - GW;
  if (rnd() < 0.7) { if (canRise(t, type[up])) { moveTo(i, up); return; } }
  if (canRise(t, type[up + d])) { moveTo(i, up + d); return; }
  if (canRise(t, type[up - d])) { moveTo(i, up - d); return; }
  if (type[i + d] === AIR && rnd() < 0.6) moveTo(i, i + d);
  else if (CATA[type[i + d]] === GAS && DENS[type[i + d]] !== DENS[t] && rnd() < 0.3) moveTo(i, i + d);
}

/* ---------- shared reaction helpers ---------- */
/* boiling with latent heat: heat above the boiling point is stored until the cell turns to gas */
function boilTo(i, Tb, latent, gas) {
  const t = type[i];
  cook[i] += (temp[i] - Tb) * CAPA[t]; temp[i] = Tb;
  if (cook[i] >= latent) {
    const hot = staticHot(i);
    setGas(i, gas, Tb + 3);
    if (hot) Sim.ev.sizzle++; else Sim.ev.bubble++;
  }
}
function staticHot(i) { const j = i + GW; return CATA[type[j]] === STATIC && temp[j] > 140; }
/* burning: flammable cells that pass their ignition point make fire until they are used up */
function flame(i, t) {
  if (aux[i] & BURNING) {
    const ig = IGNITE[t];
    // no air, no fire: smothered under foam (or a lid) it goes out
    if (type[i - GW] !== AIR && type[i - GW] !== FIRE && type[i - 1] !== AIR && type[i + 1] !== AIR && rnd() < 0.04) { aux[i] &= ~BURNING; temp[i] = ig - 60; return false; }
    if (temp[i] < ig + 100) temp[i] = ig + 100;
    if (rnd() < 0.55) spawnUp(i, FIRE, 760);
    Sim.ev.fire++;
    if ((cook[i] += 1) > (t === WOOD ? 900 : t === OIL || t === BUTTER_M ? 500 : 160)) {
      if (t === WOOD) { morph(i, BURNT); type[i] = BURNT; }   // a charred hole; the board falls apart
      else if (t === OIL || t === BUTTER_M) setGas(i, SMOKE, 300);
      else burnTo(i);
    }
    return true;
  }
  if (FAT[t]) {   // fat has to sit past its smoke point for a while before it catches
    if (temp[i] >= IGNITE[t] - 40) { cook[i] += (temp[i] - IGNITE[t] + 40) / 40; if (cook[i] > 700) { aux[i] |= BURNING; cook[i] = 0; Sim.ev.grease++; } }
    else if (cook[i] > 0) cook[i] = Math.max(0, cook[i] - 0.5);
  } else if (temp[i] >= IGNITE[t]) aux[i] |= BURNING;
  return false;
}
function extinguishAt(j) {
  const b = type[j];
  if (b === FIRE) { setGas(j, rnd() < 0.5 ? STEAM : SMOKE, 120); return true; }
  if (aux[j] & BURNING && IGNITE[b]) { aux[j] &= ~BURNING; temp[j] = Math.min(temp[j], IGNITE[b] - 120); return true; }
  return false;
}
/* water landing on burning fat: a steam blast throws burning droplets around */
function flare(i) {
  setGas(i, STEAM, 300, 60);
  for (let k = 0; k < 9; k++) {
    const n = i + N8[rndi(8)] - GW * (1 + rndi(4)) + (rndi(7) - 3);
    if (n > GW && n < GN - GW && type[n] === AIR) setGas(n, FIRE, 820, 25 + rnd() * 35);
  }
  Sim.ev.flare++;
}
function spit(i) {
  setGas(i, STEAM, 110, 50 + rnd() * 40);
  for (let k = 0; k < 4; k++) {
    const n = i + (rndi(5) - 2) + GW * (rndi(5) - 2);
    if (n <= GW || n >= GN - GW || !FAT[type[n]] || (aux[n] & BURNING)) continue;
    const to = n - GW * (3 + rndi(9)) + rndi(9) - 4;
    if (to > GW * 3 && type[to] === AIR) { moveTo(n, to); vel[to] = 0; }
  }
  Sim.ev.spit++;
}
const wetFood = (b) => b === BATTER || b === EGG_W || b === YOLK || b === MEAT || b === RICE_C || b === NOODLE || b === WATER || b === MILK;

/* ---------- reactions ---------- */
const RX = new Array(NE).fill(null);
/* convection: warmer liquid rises through cooler liquid of the same kind, so a pot heats through */
function convect(i) {
  const up = i - GW;
  if (type[up] === type[i] && temp[i] > temp[up] + 1.5 && rnd() < 0.3) { moveTo(i, up); return true; }
  return false;
}
/* hot surfaces give off wisps of vapour. These are for show: they cost no liquid and never condense (aux 3) */
function wisp(i, T) {
  if (T > 72 && type[i - GW] === AIR && rnd() < (T - 72) * 0.0016) { const j = i - GW; setGas(j, STEAM, T, 70 + rnd() * 110); aux[j] = 3; }
}
function waterish(i, latent) {   // shared by water-based liquids
  const j = nb(i), b = type[j], d = i + GW;
  // never add water to burning fat: it flashes to steam under the oil and throws it everywhere
  if ((FAT[b] && aux[j] & BURNING) || (FAT[type[d]] && aux[d] & BURNING)) { flare(i); return true; }
  // water in very hot fat flashes to steam and spits droplets of fat out of the pan
  if (FAT[b] && temp[j] >= 160) { spit(i); return true; }
  const T = temp[i];
  if (T >= 100) { boilTo(i, 100, latent, STEAM); return true; }
  wisp(i, T);
  if (b === FIRE) { setGas(j, STEAM, 110); temp[i] += 6; return true; }
  if (vel[i] === 0 && convect(i)) return true;
  return false;
}
RX[WATER] = (i) => {
  if (waterish(i, 2400)) return;
  const T = temp[i];
  if (T < 0) { cook[i] += -T * 4; temp[i] = 0; if (cook[i] > 700) { morph(i, ICE); temp[i] = -1; } return; }
  const j = nb(i), b = type[j];
  if (b === SEASON) { morph(i, BROTH); if (rnd() < 0.28) clearCell(j); }
  else if ((b === ADOBO || b === COCOA || b === BROTH) && rnd() < 0.04) { const T2 = temp[i]; morph(i, b); temp[i] = T2; }   // drips mix into the sauce
  else if (b === SALT) { if (rnd() < 0.05) clearCell(j); }
  else if (b === FLOUR) { morph(i, BATTER); morph(j, BATTER); }
  else if (b === COLA && rnd() < 0.01) morph(i, COLA);
};
RX[BROTH] = (i) => {   // seasoning dissolves through the whole pot
  if (waterish(i, 2400)) return;
  const j = nb(i); if (type[j] === WATER && rnd() < 0.08) { const T = temp[j]; morph(j, BROTH); temp[j] = T; }
  else if (type[j] === SEASON && rnd() < 0.05) clearCell(j);
};
RX[VINEGAR] = (i) => {
  if (waterish(i, 2400)) return;
  const j = nb(i);
  if (type[j] === SOY && rnd() < (temp[i] > 60 ? 0.06 : 0.006)) { morph(i, ADOBO); morph(j, ADOBO); }
};
RX[SOY] = (i) => { waterish(i, 6000); };
RX[ADOBO] = (i) => {
  if (waterish(i, 7000)) return;   // a thick sauce reduces slowly
  const j = nb(i), b = type[j]; if ((b === SOY || b === VINEGAR) && rnd() < 0.03) morph(j, ADOBO);
};
RX[COLA] = (i) => {
  if (waterish(i, 2400)) return;
  if (aux[i] === 1) {   // nucleated by mints: froth, and pass it on
    if (rnd() < 0.45) {
      for (let k = 0; k < 2; k++) { const j = nb(i); if (type[j] === COLA) aux[j] = 1; }
      setGas(i, COLAFOAM, temp[i]); vel[i] = -(3 + rndi(5)); Sim.ev.geyser++;
    }
    return;
  }
  if (rnd() < 0.0015 && type[i - GW] === AIR) spawnUp(i, COLAFOAM, temp[i], 12);
};
RX[MILK] = (i) => {
  const T = temp[i];
  wisp(i, T);
  if (convect(i)) return;
  if (T >= 99) {   // milk froths up instead of quietly boiling
    cook[i] += (T - 99) * 4; temp[i] = 99;
    if (cook[i] > 900) { setGas(i, MILKFOAM, 99); Sim.ev.boilover++; return; }
  }
  const j = nb(i), b = type[j];
  if (b === FIRE) { setGas(j, STEAM, 110); return; }
  if (b === FLOUR) { morph(i, BATTER); morph(j, BATTER); return; }
  if (b === CHOC_M) { morph(i, COCOA); if (++aux[j] >= 3) morph(j, COCOA); return; }
  if (CATA[b] === STATIC && temp[j] > 170 && rnd() < 0.004) burnTo(i);   // scorched on the stove
};
RX[COCOA] = (i) => {
  const T = temp[i];
  wisp(i, T);
  if (convect(i)) return;
  if (T >= 100) { if (rnd() < 0.03) { setGas(i, MILKFOAM, T); Sim.ev.boilover++; return; } temp[i] = 100; }
  const j = nb(i), b = type[j];
  if (b === CHOC_M && rnd() < 0.5) { if (++aux[j] >= 3) morph(j, COCOA); }
  else if (b === MILK && rnd() < 0.08) morph(j, COCOA);   // stirring spreads the chocolate
  if (CATA[b] === STATIC && temp[j] > 170 && rnd() < 0.004) burnTo(i);
};
/* frying: wet food in hot fat throws off little bubbles (aux bits 0-3, for show) that drift up through the fat */
const sizzles = (b) => wetFood(b) || b === MEAT_C || b === EGG_C || b === EGG_OM || b === EGG_SCR || b === PANCAKE || b === GARLIC || b === GARLIC_F || b === NOODLE || b === POPCORN || b === KERNEL;
function fryBubbles(i, T) {
  if (T >= 140) { const b = type[nb(i)]; if (sizzles(b) && rnd() < 0.3) { Sim.ev.sizzle++; aux[i] = (aux[i] & BURNING) | 9; } }
  const bb = aux[i] & 15;
  if (bb) {
    const up = i - GW;
    if (type[up] === type[i] && !(aux[up] & 15) && rnd() < 0.55) { aux[up] |= bb - 1; aux[i] &= BURNING; }
    else aux[i] = (aux[i] & BURNING) | (bb - 1);
  }
}
RX[OIL] = (i) => {
  if (flame(i, OIL)) return;
  const T = temp[i];
  if (T > 235 && rnd() < (T - 235) / 9000) spawnUp(i, SMOKE, T);
  fryBubbles(i, T);
};
RX[BUTTER_M] = (i) => {
  if (flame(i, BUTTER_M)) return;
  const T = temp[i];
  if (T >= 150 && T < 250) { cook[i] += (T - 150) * 0.004; if (cook[i] >= 400) { burnTo(i); return; } }
  if (T > 200 && rnd() < (T - 200) / 3000) spawnUp(i, SMOKE, T);
  fryBubbles(i, T);
};
RX[BUTTER] = (i) => { const T = temp[i]; if (T > 32) { cook[i] += (T - 32) * 2; temp[i] = Math.min(T, 40); if (cook[i] > 220) morph(i, BUTTER_M); } };
RX[CHOC] = (i) => { const T = temp[i]; if (T > 33) { cook[i] += (T - 33) * 2; temp[i] = Math.min(T, 40); if (cook[i] > 260) morph(i, CHOC_M); } };
RX[CHOC_M] = (i) => {
  const T = temp[i];
  if (T >= 130) { cook[i] += (T - 130) * 0.01; if (cook[i] > 260) burnTo(i); }
  else if (T < 24 && rnd() < 0.002) morph(i, CHOC);
};
RX[ICE] = (i) => {
  const T = temp[i];
  if (T > 0) { cook[i] += T * 2; temp[i] = 0; if (cook[i] > 600) { morph(i, WATER); temp[i] = 1; return; } }
  const j = nb(i); if (type[j] === SALT) cook[i] += 30;
};
RX[BATTER] = (i) => {
  const T = temp[i];
  if (T >= 105) { cook[i] += (T - 105) * 0.006; if (cook[i] >= 1.2) { morph(i, PANCAKE); if (rnd() < 0.2) Sim.ev.sizzle++; } }
};
RX[PANCAKE] = (i) => { const T = temp[i]; if (T >= 110) { cook[i] += (T - 110) * 0.0045; if (cook[i] >= 600) burnTo(i); } };
RX[EGG_W] = (i) => {
  const T = temp[i];
  if (T >= 62) { cook[i] += (T - 62) * 0.006; if (cook[i] >= 25) { morph(i, EGG_C); if (rnd() < 0.3) Sim.ev.sizzle++; } }
};
const isWet = (b) => b === WATER || b === BROTH || b === MILK || b === ADOBO || b === SOY || b === VINEGAR || b === COCOA;
/* food touching water-based liquid can't get much past boiling */
function wetClamp(i) {
  if (temp[i] <= 102) return false;
  for (let k = 0; k < 8; k++) if (isWet(type[i + N8[k]])) { temp[i] = 102; return true; }
  return false;
}
/* beaten egg sets into one soft sheet; stirring breaks a setting sheet into curds (see Tools.stir) */
RX[EGG_MIX] = (i) => {
  const T = temp[i];
  if (T >= 64) { cook[i] += (T - 64) * 0.006; if (cook[i] >= 18) { morph(i, EGG_OM); if (rnd() < 0.3) Sim.ev.sizzle++; } }
};
RX[EGG_OM] = (i) => { if (wetClamp(i)) return; const T = temp[i]; if (T >= 140 && CATA[type[i + GW]] === STATIC) { cook[i] += (T - 140) * 0.006; if (cook[i] >= 520) burnTo(i); } };
RX[EGG_SCR] = (i) => { if (wetClamp(i)) return; const T = temp[i]; if (T >= 140 && CATA[type[i + GW]] === STATIC) { cook[i] += (T - 140) * 0.006; if (cook[i] >= 420) burnTo(i); } };
RX[EGG_C] = (i) => { if (wetClamp(i)) return; const T = temp[i]; if (T >= 140 && CATA[type[i + GW]] === STATIC) { cook[i] += (T - 140) * 0.006; if (cook[i] >= 520) burnTo(i); } };
RX[YOLK] = (i) => { const T = temp[i]; if (T >= 70) { cook[i] += (T - 70) * 0.0015; if (cook[i] >= 40) morph(i, YOLK_C); } };
RX[YOLK_C] = (i) => { if (wetClamp(i)) return; const T = temp[i]; if (T >= 170 && !isWet(type[nb(i)])) { cook[i] += (T - 170) * 0.006; if (cook[i] >= 400) burnTo(i); } };
/* rice keeps water inside the grain (aux bits 0-1 = moisture 0..3). A moist grain cannot get
   hotter than boiling: extra heat steams its water off. Moisture wicks to drier grains, so a
   pile soaks from the top down. Cooking needs a moist grain held near boiling for a while. */
const M3 = 3;
function riceWater(i, b, j, m, drink) {
  if (m < 3) {
    // water anywhere just above soaks down into the pile (it would fill the gaps between grains)
    const k = 1 + rndi(8), w = i - GW * k + rndi(3) - 1, bw = type[w];
    if ((bw === WATER || bw === BROTH) && rnd() < drink) {
      if (type[i] === RICE && rnd() < 0.5) { setCell(w, RICE_C, temp[w]); aux[w] = 1; } else clearCell(w);
      aux[i] += 1; return m + 1;
    }
  }
  if ((b === RICE || b === RICE_C) && m >= 2 && (aux[j] & M3) < m - 1) { aux[i] -= 1; aux[j] += 1; return m - 1; }
  return m;
}
function steamOff(i, m) {   // same latent heat as boiling water, so a pot of rice takes as long as a pot of water
  if (m > 0 && temp[i] > 100) {
    if (rnd() < (temp[i] - 100) / 1600) { aux[i] -= 1; m--; if (rnd() < 0.35) spawnUp(i, STEAM, 101); }
    temp[i] = 100;
  }
  return m;
}
RX[RICE] = (i) => {
  const j = nb(i), b = type[j];
  let m = riceWater(i, b, j, aux[i] & M3, temp[i] > 70 ? 0.016 : 0.003);
  m = steamOff(i, m);
  const T = temp[i];
  if (m > 0 && T >= 88) { if ((cook[i] += 1) >= 420) { const mm = aux[i] & M3; morph(i, RICE_C); aux[i] = mm; } return; }
  if (m === 0 && T >= 190) { cook[i] += (T - 190) * 0.02; if (cook[i] > 600) burnTo(i); }
};
RX[RICE_C] = (i) => {
  const j = nb(i), b = type[j];
  let m = riceWater(i, b, j, aux[i] & M3, 0.01);
  m = steamOff(i, m);
  if (m > 0) return;
  const T = temp[i];
  if (T < 130) return;
  // frying: hot fat coats the grain (bit 2) and gets soaked up; a coated grain fries on its own (bits 3-7 count up)
  if (!(aux[i] & 4)) {   // hot fat touching or lying just above the grain soaks in
    const w = (FAT[b] && temp[j] >= 100) ? j : i - GW * (1 + rndi(6)) + rndi(3) - 1;
    if (FAT[type[w]] && temp[w] >= 100) { aux[i] |= 4; if (rnd() < 0.1) clearCell(w); return; }
  }
  if (aux[i] & 4) {
    if (b === RICE_C && !(aux[j] & 7) && rnd() < 0.08) aux[j] |= 4;   // grains rubbing together share the oil
    if (rnd() < 0.09) { const f = (aux[i] >> 3) + 1; if (f >= 31) { const c = cook[i]; morph(i, RICE_F); cook[i] = c * 0.5; } else aux[i] = (f << 3) | 4; }
    if (rnd() < 0.05) Sim.ev.sizzle++;
    return;
  }
  // only grains lying on a dry, hot surface toast (the crust at the bottom of the pot)
  if (T >= 160 && CATA[type[i + GW]] === STATIC) { cook[i] += (T - 160) * 0.006; if (cook[i] >= 300) { burnTo(i); Sim.ev.tutong++; } }
};
RX[RICE_F] = (i) => { const T = temp[i]; if (T >= 170) { cook[i] += (T - 170) * 0.006; if (cook[i] >= 420) burnTo(i); } };
RX[SUGAR] = (i) => { const T = temp[i]; if (T >= 160) { cook[i] += (T - 160) * 1.5; temp[i] = 160; if (cook[i] > 120) morph(i, CARAMEL); } };
RX[CARAMEL] = (i) => {
  const T = temp[i];
  if (T >= 70) {   // popcorn rolled through runny caramel picks up a glossy coat
    const j = nb(i);
    if (type[j] === POPCORN) { const Tj = temp[j]; morph(j, POPCORN_K); temp[j] = Math.max(Tj, T - 20); if (rnd() < 0.3) { clearCell(i); return; } }
  }
  if (T >= 160) { cook[i] += (T - 160) * 0.009; if (cook[i] >= 900) { burnTo(i); return; } if (cook[i] > 600 && rnd() < 0.004) spawnUp(i, SMOKE, T); }
  else if (T < 60 && rnd() < 0.02) { const c = cook[i]; morph(i, CANDY); cook[i] = c; }
};
RX[CANDY] = (i) => { if (temp[i] >= 110 && rnd() < 0.05) { const c = cook[i]; morph(i, CARAMEL); cook[i] = c; } };
RX[KERNEL] = (i) => {
  const T = temp[i];
  if (T >= 175) {
    if (!aux[i]) aux[i] = 30 + rndi(170);
    if ((cook[i] += 1 + (T - 175) * 0.01) >= aux[i]) pop(i);
  }
};
function pop(i) {
  const T = temp[i];
  morph(i, POPCORN); temp[i] = T;
  let made = 0;   // the kernel puffs to three times its size: the extra fluff goes in the first gaps above it
  for (let k = 1; k < 24 && made < 2; k++) { const j = i - GW * k + rndi(3) - 1; if (type[j] === AIR) { setCell(j, POPCORN, T); made++; } else if (CATA[type[j]] === STATIC) break; }
  let h = 4 + rndi(14), cur = i;   // the puff jumps
  while (h-- > 0) { const up = cur - GW + (rnd() < 0.35 ? (rnd() < 0.5 ? -1 : 1) : 0); if (type[up] !== AIR) break; moveTo(cur, up); cur = up; }
  Sim.ev.pop++;
}
RX[POPCORN] = (i) => {
  if (flame(i, POPCORN)) return;
  const T = temp[i]; if (T >= 220) { cook[i] += (T - 220) * 0.004; if (cook[i] >= 360) burnTo(i); }
};
RX[POPCORN_K] = (i) => {
  if (flame(i, POPCORN_K)) return;
  const T = temp[i]; if (T >= 190) { cook[i] += (T - 190) * 0.004; if (cook[i] >= 360) burnTo(i); }
};
RX[GARLIC] = (i) => { const T = temp[i]; if (T >= 120) { cook[i] += (T - 120) * 0.008; if (cook[i] >= 30) morph(i, GARLIC_F); } };
RX[GARLIC_F] = (i) => { const T = temp[i]; if (T >= 120) { cook[i] += (T - 120) * 0.0032; if (cook[i] >= 300) burnTo(i); } };
RX[NOODLE_D] = (i) => {
  wetClamp(i);
  const T = temp[i], b = type[nb(i)];
  if (T >= 85 && (b === WATER || b === BROTH)) { cook[i] += (T - 85) * 0.02; if (cook[i] >= 3) morph(i, NOODLE); }
  else if (T >= 75) {   // hot broth wicks up into a floating block, and wet strands soften their neighbours
    const w = type[i + GW * (1 + rndi(5))];
    if (b === NOODLE || w === WATER || w === BROTH || w === NOODLE) { cook[i] += 0.05; if (cook[i] >= 3) morph(i, NOODLE); }
  }
  else if (T >= 235) { cook[i] += 0.5; if (cook[i] > 200) burnTo(i); }   // only a dry pot scorches noodles
};
RX[NOODLE] = (i) => { if (wetClamp(i)) return; const T = temp[i]; if (T >= 225) { cook[i] += (T - 225) * 0.01; if (cook[i] > 150) burnTo(i); } };
RX[MEAT] = (i) => { wetClamp(i); const T = temp[i]; if (T >= 70) { cook[i] += (T - 70) * 0.0014; if (cook[i] >= 20) morph(i, MEAT_C); } };
RX[MEAT_C] = (i) => {
  wetClamp(i);
  const T = temp[i], j = nb(i), b = type[j];
  // braising: the sauce works its way in from the outside of each piece
  if ((b === ADOBO || b === SOY || b === MEAT_A) && T >= 85) { if ((aux[i] += b === MEAT_A ? 2 : 3) >= 120) morph(i, MEAT_A); return; }
  if (T >= 160 && !isWet(b)) { cook[i] += (T - 160) * 0.008; if (cook[i] >= 500) burnTo(i); }
};
RX[MEAT_A] = (i) => { if (wetClamp(i)) return; const T = temp[i]; if (T >= 180 && !isWet(type[nb(i)])) { cook[i] += (T - 180) * 0.008; if (cook[i] >= 400) burnTo(i); } };
RX[FLOUR] = (i) => {
  const j = nb(i), b = type[j];
  if (b === FIRE || temp[i] >= 420) {   // airborne flour goes up in a flash
    if (type[i + GW] === AIR || b === FIRE) { setGas(i, FIRE, 900, 20 + rnd() * 20); Sim.ev.dust++; for (let k = 0; k < 3; k++) { const n = nb(i); if (type[n] === FLOUR) temp[n] = 500; } return; }
  }
  if (b === MILK) { morph(i, BATTER); morph(j, BATTER); }
};
RX[MENTOS] = (i) => {
  const j = nb(i);
  if (type[j] === COLA) { aux[j] = 1; for (let k = 0; k < 3; k++) { const n = nb(i); if (type[n] === COLA) aux[n] = 1; } if (rnd() < 0.02) clearCell(i); }
};
RX[FOAM] = (i) => {
  if ((cook[i] += 1) > 900) { clearCell(i); return; }
  const j = nb(i);
  if (extinguishAt(j)) return;
  if (temp[j] > AMB + 5 && CATA[type[j]] !== STATIC) temp[j] -= 6;
};
RX[BURNT] = (i) => {
  if (flame(i, BURNT)) return;
  const T = temp[i]; if (T > 220 && rnd() < 0.006) spawnUp(i, SMOKE, T);
};
RX[WOOD] = (i) => { flame(i, WOOD); };
RX[DRAIN] = (i) => { const j = nb(i); if (CATA[type[j]] !== STATIC && type[j] !== AIR) clearCell(j); };
RX[STEAM] = (i) => {
  if ((cook[i] -= 1) <= 0) { clearCell(i); return; }
  // breaking the surface, a bubble puffs out into a little cloud (only for show: short-lived)
  if (!(aux[i] & 1) && type[i - GW] === AIR && CATA[type[i + GW]] === LIQUID) {
    aux[i] |= 1;
    for (let k = 0; k < 4; k++) { const j = i - GW * (1 + rndi(3)) + rndi(7) - 3; if (type[j] === AIR) { setGas(j, STEAM, temp[i], 60 + rnd() * 100); aux[j] = 3; } }
  }
  const j = nb(i), b = type[j];
  // a bubble rising through water that is not yet boiling collapses and warms it instead
  if (aux[i] !== 3 && (b === WATER || b === BROTH) && temp[j] < 85) { temp[j] += 8; morph(i, b); temp[i] = 99; return; }
  if (aux[i] !== 3 && temp[i] < 55 && rnd() < 0.03 && CATA[b] === STATIC && temp[j] < 60) morph(i, WATER);
};
RX[SMOKE] = (i) => { if ((cook[i] -= 1) <= 0) clearCell(i); };
RX[FIRE] = (i) => {
  temp[i] = 650 + rnd() * 200;
  Sim.ev.fire++;
  const j = nb(i), b = type[j];
  if (IGNITE[b]) temp[j] += 30;
  else if (wetFood(b) || b === WATER) { clearCell(i); return; }
  if ((cook[i] -= 1) <= 0) { if (rnd() < 0.3) setGas(i, SMOKE, 200); else clearCell(i); }
};
RX[MILKFOAM] = (i) => {
  if ((cook[i] -= 1) <= 0) { if (rnd() < 0.55) { const T = temp[i]; setCell(i, MILK, T); } else clearCell(i); return; }
  const j = nb(i), b = type[j];
  if ((b === MILK || b === COCOA) && temp[j] < 92) { temp[j] += 3; morph(i, b); temp[i] = 98; return; }   // collapses in milk that isn't boiling yet
  if (CATA[b] === STATIC && temp[j] > 170 && rnd() < 0.01) burnTo(i);
};
RX[COLAFOAM] = (i) => {
  const y = (i / GW) | 0; if (y < Sim.ev.colaTop) Sim.ev.colaTop = y;
  if ((cook[i] -= 1) <= 0) { if (rnd() < 0.5) { const T = temp[i]; setCell(i, COLA, T); } else clearCell(i); }
};

/* ---------- one step ---------- */
function cellStep(i) {
  let t = type[i];
  if (t === AIR || stamp[i] === tick) return;
  const R = RX[t];
  if (R !== null) { R(i); t = type[i]; if (t === AIR || stamp[i] === tick) return; }
  switch (CATA[t]) {
    case POWDER: powderStep(i, t); break;
    case LIQUID: liquidStep(i, t); break;
    case SOLID: solidStep(i, t); break;
    case GAS: gasStep(i, t); break;
    default: break;
  }
}
function heatPass() {
  for (let y = 1; y < GH - 1; y++) {
    let i = y * GW + 1;
    for (let x = 1; x < GW - 1; x++, i++) {
      const a = type[i];
      if (a === AIR) continue;
      const ca = COND[a];
      if (ca === 0) continue;
      const la = LOSS[a];
      let j = i + 1, b = type[j];
      if (b !== AIR) { const g = ca < COND[b] ? ca : COND[b]; if (g > 0) { const q = (temp[j] - temp[i]) * g; temp[i] += q * ICAP[a]; temp[j] -= q * ICAP[b]; } }
      else temp[i] += (AMB - temp[i]) * la;
      j = i + GW; b = type[j];
      if (b !== AIR) { const g = ca < COND[b] ? ca : COND[b]; if (g > 0) { const q = (temp[j] - temp[i]) * g; temp[i] += q * ICAP[a]; temp[j] -= q * ICAP[b]; } }
      else temp[i] += (AMB - temp[i]) * la;
      if (type[i - 1] === AIR) temp[i] += (AMB - temp[i]) * la;
      if (type[i - GW] === AIR) temp[i] += (AMB - temp[i]) * la;
    }
  }
}
Sim.step = function () {
  tick = (tick % 255) + 1;
  Kitchen.preStep();
  const ltr = tick & 1;
  for (let y = GH - 2; y >= 1; y--) {
    const row = y * GW;
    if (ltr) for (let x = 1; x < GW - 1; x++) cellStep(row + x);
    else for (let x = GW - 2; x >= 1; x--) cellStep(row + x);
  }
  heatPass();
  Kitchen.postStep();
};
