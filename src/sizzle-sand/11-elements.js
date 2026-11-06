/* ============================================================
   Elements. Numbers that matter: dens decides what floats on
   what; cond/cap decide how fast heat moves; ramp colours show
   cooking (cook progress runs 0..rampMax along the ramp).
   ============================================================ */
const { STATIC, POWDER, SOLID, LIQUID, GAS } = CAT;
const AIR = def('air', { cat: GAS, dens: 0, cond: 0, cap: 1 });

/* fixtures (never move) */
const WALL = def('wall', { cat: STATIC, cond: 0, cap: 1e6, loss: 0, col: [0, 0, 0] });
const CEIL = def('ceil', { name: 'Ceiling', cat: STATIC, cond: 0.01, cap: 6, loss: 0.02, col: [48, 44, 52] });
const COUNTER = def('counter', { name: 'Counter', cat: STATIC, cond: 0.01, cap: 4, loss: 0.002, col: [92, 98, 104], vary: 26 });
const STEEL = def('steel', { name: 'Steel', cat: STATIC, cond: 0.25, cap: 1, loss: 0.0016, col: [158, 168, 178], vary: 6 });
const CERAMIC = def('ceramic', { name: 'Ceramic', cat: STATIC, cond: 0.05, cap: 2, loss: 0.001, col: [242, 240, 232], vary: 4 });
const WOOD = def('wood', { name: 'Wood', cat: STATIC, cond: 0.02, cap: 2, loss: 0.001, col: [150, 100, 62], vary: 18, ignite: 300 });
const BURNER = def('burner', { name: 'Burner', cat: STATIC, cond: 0.25, cap: 1e6, loss: 0, col: [52, 52, 58] });
const DRAIN = def('drain', { name: 'Drain', cat: STATIC, cond: 0, cap: 1e6, loss: 0, col: [26, 26, 30] });
const BRICK = def('brick', { name: 'Brick', cat: STATIC, cond: 0.03, cap: 3, loss: 0.001, col: [168, 76, 56], vary: 22 });

/* powders: pile up, slide down slopes */
const RICE = def('rice', { name: 'Rice', dens: 1.5, col: [236, 232, 216], vary: 30, slide: 0.9, food: true });
const RICE_C = def('rice_c', { name: 'Cooked rice', dens: 1.1, col: [252, 252, 247], vary: 22, slide: 0.22, food: true,
  ramp: [[252, 252, 247], [246, 236, 206], [222, 182, 112], [176, 120, 60]], rampMax: 300 });
const RICE_F = def('rice_f', { name: 'Fried rice', dens: 1.1, col: [240, 204, 122], vary: 22, slide: 0.45, food: true,
  ramp: [[246, 222, 150], [236, 192, 104], [200, 140, 64], [140, 88, 40]], rampMax: 420 });
const SUGAR = def('sugar', { name: 'Sugar', dens: 1.6, col: [252, 252, 255], vary: 14, slide: 0.95, food: true });
const SALT = def('salt', { name: 'Salt', dens: 2.1, col: [236, 242, 250], vary: 16, slide: 0.95, food: true });
const FLOUR = def('flour', { name: 'Flour', dens: 1.35, col: [246, 242, 230], vary: 6, slide: 0.55, food: true, ignite: 420 });
const KERNEL = def('kernel', { name: 'Popcorn kernels', dens: 1.3, col: [242, 186, 52], vary: 24, slide: 0.9, food: true });
const POPCORN = def('popcorn', { name: 'Popcorn', dens: 0.35, col: [255, 249, 226], vary: 22, slide: 0.65, food: true,
  ramp: [[255, 249, 226], [246, 226, 170], [196, 150, 90], [110, 74, 44]], rampMax: 360, ignite: 420 });
const GARLIC = def('garlic', { name: 'Garlic', dens: 1.1, col: [244, 238, 216], vary: 12, slide: 0.5, food: true });
const GARLIC_F = def('garlic_f', { name: 'Fried garlic', dens: 1.1, col: [232, 190, 108], vary: 16, slide: 0.5, food: true,
  ramp: [[244, 226, 170], [232, 186, 96], [196, 128, 50], [120, 70, 30]], rampMax: 300 });
const SEASON = def('season', { name: 'Ramen seasoning', dens: 1.3, col: [232, 116, 40], vary: 22, slide: 0.8, food: true });
const NOODLE = def('noodle', { name: 'Cooked noodles', dens: 1.0, col: [248, 226, 132], vary: 18, slide: 0.35, food: true });
const BURNT = def('burnt', { name: 'Burnt bits', dens: 1.2, col: [44, 32, 26], vary: 16, slide: 0.6, ignite: 460 });
const FOAM = def('foam', { name: 'Extinguisher foam', dens: 0.2, col: [244, 250, 255], vary: 6, slide: 0.35, cond: 0.12, cap: 3 });
const MENTOS = def('mentos', { name: 'Mints', dens: 1.5, col: [250, 250, 250], vary: 4, slide: 0.8 });
const EGG_SCR = def('egg_scr', { name: 'Scrambled egg', dens: 1.0, col: [252, 222, 112], vary: 18, slide: 0.3, food: true,
  ramp: [[252, 226, 120], [246, 206, 96], [214, 156, 64], [150, 96, 40]], rampMax: 420 });
const POPCORN_K = def('popcorn_k', { name: 'Caramel corn', dens: 0.4, col: [226, 160, 66], vary: 26, slide: 0.4, food: true, ignite: 420,
  ramp: [[232, 172, 80], [212, 140, 52], [160, 92, 34], [96, 54, 24]], rampMax: 360 });

/* solids: fall straight down and hold their shape */
const ICE = def('ice', { name: 'Ice', cat: SOLID, dens: 0.92, col: [196, 232, 250], vary: 12, alpha: 225, cond: 0.15, cap: 2 });
const BUTTER = def('butter', { name: 'Butter', cat: SOLID, dens: 0.91, col: [252, 230, 136], vary: 6, food: true });
const CHOC = def('choc', { name: 'Chocolate', cat: SOLID, dens: 1.3, col: [112, 62, 36], vary: 10, food: true });
const NOODLE_D = def('noodle_d', { name: 'Noodle block', cat: SOLID, dens: 0.9, col: [232, 204, 136], vary: 22, food: true });
const MEAT = def('meat', { name: 'Raw chicken', cat: SOLID, dens: 1.08, col: [238, 156, 144], vary: 16, food: true, cap: 3 });
const MEAT_C = def('meat_c', { name: 'Cooked chicken', cat: SOLID, dens: 1.05, col: [230, 204, 172], vary: 14, food: true, cap: 3,
  ramp: [[232, 208, 176], [214, 170, 120], [170, 110, 60], [110, 66, 34]], rampMax: 500 });
const MEAT_A = def('meat_a', { name: 'Adobo chicken', cat: SOLID, dens: 1.05, col: [112, 62, 32], vary: 16, food: true, cap: 3 });
const EGG_C = def('egg_c', { name: 'Cooked egg white', cat: SOLID, dens: 0.99, col: [253, 253, 248], vary: 4, food: true,
  ramp: [[253, 253, 248], [250, 240, 214], [226, 180, 110], [170, 112, 56]], rampMax: 520 });
const YOLK_C = def('yolk_c', { name: 'Set yolk', cat: SOLID, dens: 0.99, col: [250, 210, 100], vary: 8, food: true });
const PANCAKE = def('pancake', { name: 'Pancake', cat: SOLID, dens: 1.0, col: [236, 196, 120], vary: 10, food: true,
  ramp: [[246, 224, 160], [236, 190, 106], [204, 140, 64], [140, 84, 36]], rampMax: 600 });
const CANDY = def('candy', { name: 'Hard caramel', cat: SOLID, dens: 1.4, col: [214, 140, 40], vary: 8, food: true });
const EGG_OM = def('egg_om', { name: 'Omelette', cat: SOLID, dens: 0.99, col: [250, 214, 96], vary: 6, food: true,
  ramp: [[252, 220, 108], [244, 198, 86], [214, 150, 60], [150, 96, 40]], rampMax: 520 });

/* liquids: flow, layer by density */
const WATER = def('water', { name: 'Water', cat: LIQUID, dens: 1.0, col: [70, 158, 232], vary: 10, alpha: 205, flow: 7, cond: 0.15, cap: 4, loss: 0.0008 });
const OIL = def('oil', { name: 'Oil', cat: LIQUID, dens: 0.92, col: [236, 198, 70], vary: 8, alpha: 215, flow: 5, cond: 0.12, cap: 2, loss: 0.0015, ignite: 300, fat: true });
const MILK = def('milk', { name: 'Milk', cat: LIQUID, dens: 1.03, col: [248, 246, 238], vary: 5, flow: 5, cond: 0.15, cap: 4, loss: 0.0015, food: true });
const BATTER = def('batter', { name: 'Batter', cat: LIQUID, dens: 1.1, col: [240, 222, 168], vary: 8, flow: 2, visc: 0.55, cond: 0.12, cap: 3, food: true });
const EGG_W = def('egg_w', { name: 'Raw egg white', cat: LIQUID, dens: 1.0, col: [236, 236, 222], vary: 6, alpha: 200, flow: 1, visc: 0.97, cond: 0.12, cap: 3, food: true });
const EGG_MIX = def('egg_mix', { name: 'Beaten egg', cat: LIQUID, dens: 1.0, col: [252, 200, 74], vary: 8, alpha: 235, flow: 2, visc: 0.85, cond: 0.12, cap: 3, food: true });
const YOLK = def('yolk', { name: 'Runny yolk', cat: LIQUID, dens: 0.995, col: [255, 176, 28], vary: 10, flow: 1, visc: 0.995, cond: 0.1, cap: 3, food: true });
const CARAMEL = def('caramel', { name: 'Caramel', cat: LIQUID, dens: 1.4, col: [250, 214, 140], vary: 6, flow: 1, visc: 0.7, cond: 0.1, cap: 2, food: true,
  ramp: [[252, 232, 170], [240, 186, 84], [212, 132, 36], [150, 74, 20], [90, 42, 16]], rampMax: 900 });
const BUTTER_M = def('butter_m', { name: 'Melted butter', cat: LIQUID, dens: 0.92, col: [250, 214, 92], vary: 6, alpha: 225, flow: 4, cond: 0.12, cap: 2, food: true, ignite: 330, fat: true,
  ramp: [[250, 214, 92], [226, 170, 70], [170, 110, 44]], rampMax: 400 });
const CHOC_M = def('choc_m', { name: 'Melted chocolate', cat: LIQUID, dens: 1.25, col: [94, 52, 30], vary: 6, flow: 2, visc: 0.6, cond: 0.1, cap: 2, food: true });
const COCOA = def('cocoa', { name: 'Hot chocolate', cat: LIQUID, dens: 1.04, col: [152, 100, 70], vary: 6, flow: 5, cond: 0.15, cap: 4, loss: 0.0015, food: true });
const SOY = def('soy', { name: 'Soy sauce', cat: LIQUID, dens: 1.15, col: [62, 32, 16], vary: 6, alpha: 235, flow: 5, cond: 0.15, cap: 4, food: true });
const VINEGAR = def('vinegar', { name: 'Vinegar', cat: LIQUID, dens: 1.01, col: [240, 236, 210], vary: 6, alpha: 170, flow: 6, cond: 0.15, cap: 4, food: true });
const ADOBO = def('adobo', { name: 'Adobo sauce', cat: LIQUID, dens: 1.1, col: [92, 50, 24], vary: 8, alpha: 235, flow: 4, cond: 0.15, cap: 4, food: true });
const BROTH = def('broth', { name: 'Ramen broth', cat: LIQUID, dens: 1.01, col: [232, 168, 84], vary: 8, alpha: 220, flow: 6, cond: 0.15, cap: 4, loss: 0.0015, food: true });
const COLA = def('cola', { name: 'Cola', cat: LIQUID, dens: 1.04, col: [72, 32, 16], vary: 6, alpha: 236, flow: 6, cond: 0.15, cap: 4 });

/* gases: rise, spread, fade */
const STEAM = def('steam', { name: 'Steam', cat: GAS, dens: 0.002, col: [226, 234, 240], vary: 14, alpha: 120, cond: 0.06, cap: 1, loss: 0.012, visc: 0.45, life: 240 });
const SMOKE = def('smoke', { name: 'Smoke', cat: GAS, dens: 0.004, col: [112, 110, 116], vary: 16, alpha: 170, cond: 0.03, cap: 1, loss: 0.004, visc: 0.45, life: 1100 });
const FIRE = def('fire', { name: 'Fire', cat: GAS, dens: 0.001, col: [255, 160, 40], vary: 30, glow: 1, cond: 0.2, cap: 1, loss: 0, visc: 0.3, life: 34,
  ramp: [[190, 36, 18], [255, 100, 22], [255, 170, 50], [255, 236, 150]], rampMax: 34 });
const MILKFOAM = def('milkfoam', { name: 'Milk foam', cat: GAS, dens: 0.02, col: [255, 251, 236], vary: 26, alpha: 236, cond: 0.12, cap: 3, loss: 0.003, visc: 0.7, life: 240 });
const COLAFOAM = def('colafoam', { name: 'Cola foam', cat: GAS, dens: 0.015, col: [226, 196, 156], vary: 14, alpha: 230, cond: 0.1, cap: 2, visc: 0.1, life: 140 });

/* fast lookup tables for the inner loops */
const NE = E.length;
const CATA = new Uint8Array(NE), DENS = new Float32Array(NE), COND = new Float32Array(NE), ICAP = new Float32Array(NE), LOSS = new Float32Array(NE);
const FLOW = new Uint8Array(NE), VISC = new Float32Array(NE), SLIDE = new Float32Array(NE), IGNITE = new Float32Array(NE), FOOD = new Uint8Array(NE), FAT = new Uint8Array(NE);
for (const d of E) {
  CATA[d.id] = d.cat; DENS[d.id] = d.dens; COND[d.id] = d.cond; ICAP[d.id] = 1 / d.cap; LOSS[d.id] = d.loss;
  FLOW[d.id] = d.flow; VISC[d.id] = d.visc; SLIDE[d.id] = d.cat === SOLID ? 0 : d.slide; IGNITE[d.id] = d.ignite || 0;
  FOOD[d.id] = d.food ? 1 : 0; FAT[d.id] = d.fat ? 1 : 0;
}
const isFluidish = (t) => CATA[t] === LIQUID || CATA[t] === GAS;
