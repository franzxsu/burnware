/* ============================================================
   Sizzle Sand: a falling-sand kitchen.
   Core: grid size, random numbers, the element registry and the
   per-cell arrays every other part of the game reads and writes.
   ============================================================ */
const GW = 288, GH = 144, GN = GW * GH;   // the kitchen is 288 x 144 cells
const AMB = 22;                            // room temperature, degrees C
const STEPS_PER_SEC = 60;
const CAT = { STATIC: 0, POWDER: 1, SOLID: 2, LIQUID: 3, GAS: 4 };

/* xorshift32: fast and good enough for sand */
let _seed = 0x2545f491;
function rnd() { _seed ^= _seed << 13; _seed ^= _seed >>> 17; _seed ^= _seed << 5; return (_seed >>> 0) / 4294967296; }
function rndi(n) { return (rnd() * n) | 0; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }

/* ---------- element registry ----------
   Each element: name, cat, dens (sorting in liquids/gases), col [r,g,b] or ramp,
   vary (speckle), cond/cap (heat), loss (to room air), flow/visc (liquids),
   slide (powders), alpha (see-through), glow (emissive), food, flammable... */
const E = [];      // definitions by id
const EL = {};     // id by key
function def(key, o) {
  const d = Object.assign({ name: key, cat: CAT.POWDER, dens: 1, col: [255, 0, 255], vary: 8, cond: 0.08, cap: 2, loss: 0.002, flow: 0, visc: 0, slide: 0.8, alpha: 255, glow: 0, life: 0, food: false }, o);
  d.key = key; d.id = E.length; E.push(d); EL[key] = d.id;
  return d.id;
}

/* ---------- per-cell state ---------- */
const type = new Uint8Array(GN);    // element id, 0 = air
const temp = new Float32Array(GN);  // degrees C
const cook = new Float32Array(GN);  // cooking progress, boiling energy, or gas life
const aux = new Uint8Array(GN);     // small extra state (moisture, burning flag, pop delay...)
const shade = new Uint8Array(GN);   // per-grain colour variation
const vel = new Int8Array(GN);      // falling speed (cells per step, grows while falling)
const stamp = new Uint8Array(GN);   // last tick this cell moved, so nothing moves twice
const SC = new Uint32Array(GN);     // pre-shaded colours of static cells (pots, counter...)

function setCell(i, id, T) {
  type[i] = id; temp[i] = T === undefined ? AMB : T; cook[i] = 0; aux[i] = 0; shade[i] = (rnd() * 256) | 0; vel[i] = 0;
}
function clearCell(i) { type[i] = 0; temp[i] = AMB; cook[i] = 0; aux[i] = 0; vel[i] = 0; }
/* turn a cell into another element in place, keeping its heat */
function morph(i, id) { type[i] = id; cook[i] = 0; aux[i] = 0; }
