/* ============================================================
   Dream Machine, part 1: the rules of a dream, colour palettes,
   names, and seeded randomness. A seed picks the world; the world
   itself is endless and worked out on the fly (part 2 and 3).
   ============================================================ */
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) {   // mulberry32: small, fast, and the same everywhere
  let a = seed >>> 0;
  const r = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.int = (lo, hi) => Math.floor(r.range(lo, hi + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.chance = (p) => r() < p;
  r.sign = () => (r() < 0.5 ? -1 : 1);
  return r;
}

/* The six rules, each with its choices. The first choice of each is the default. */
const RULES = [
  { id: 'gravity', name: 'Gravity', opts: [['down', 'Down'], ['up', 'Up'], ['side', 'Sideways'], ['none', 'None'], ['inward', 'Inward']] },
  { id: 'time', name: 'Time', opts: [['slow', 'Slow'], ['still', 'Stopped'], ['normal', 'Normal'], ['fast', 'Fast'], ['back', 'Backwards']] },
  { id: 'scale', name: 'Scale', opts: [['human', 'Human'], ['giant', 'Giant'], ['tiny', 'Tiny'], ['mixed', 'Mixed up']] },
  { id: 'geometry', name: 'Geometry', opts: [['plain', 'Plain'], ['impossible', 'Impossible'], ['echo', 'Echoes'], ['melted', 'Melted'], ['crystal', 'Crystal']] },
  { id: 'palette', name: 'Colour', opts: [['moonlit', 'Moonlit'], ['dusk', 'Dusk'], ['ember', 'Ember'], ['abyss', 'Abyss'], ['verdant', 'Verdant'], ['bleach', 'Bleached'], ['vapor', 'Vapour'], ['random', 'Random']] },
  { id: 'physics', name: 'Physics', opts: [['float', 'Floating'], ['still', 'Still'], ['orbit', 'Orbiting'], ['fall', 'Falling'], ['breathe', 'Breathing']] },
];
const DEFAULT_RULES = Object.fromEntries(RULES.map(r => [r.id, r.opts[0][0]]));
const TIME_SPEED = { still: 0, slow: 0.35, normal: 1, fast: 3.2, back: -1 };

/* Colours: sky top / horizon / below, fog, stone (two tones), the warm light in doorways, moon, mist, specks */
const PALETTES = {
  moonlit: { top: '#0b1224', hor: '#4a5a78', low: '#1a2234', fog: '#3a4862', stone: '#8a8478', stone2: '#5b5f6a', glow: '#ffb35c', moon: '#f4e3b0', moon2: '#cfd6e4', mist: '#9fb0c8', speck: '#dfe8ff', sea: '#232c3e', stars: 1, mood: 'minor' },
  dusk: { top: '#20183a', hor: '#e8907a', low: '#3a2440', fog: '#b0708a', stone: '#c49a86', stone2: '#7a5468', glow: '#ffe2a0', moon: '#ffe9c8', moon2: '#ffb8a8', mist: '#f0b4b0', speck: '#ffe6d0', sea: '#4a2c48', stars: 0.5, mood: 'major' },
  ember: { top: '#0a0405', hor: '#8a2412', low: '#140608', fog: '#4a140e', stone: '#7a5a4e', stone2: '#43302c', glow: '#ff6a1e', moon: '#ff9a4a', moon2: '#ffcf8a', mist: '#a8381e', speck: '#ffb070', sea: '#1a0808', stars: 0.3, mood: 'minor' },
  abyss: { top: '#000208', hor: '#06304a', low: '#000a14', fog: '#04263a', stone: '#2a4a5a', stone2: '#16303c', glow: '#5af0ff', moon: '#b8fff4', moon2: '#5ad0e0', mist: '#1a6a80', speck: '#9af6ff', sea: '#021622', stars: 0.6, mood: 'minor' },
  verdant: { top: '#1a3a48', hor: '#a8c8a0', low: '#24402e', fog: '#7aa088', stone: '#a8a088', stone2: '#5a7a58', glow: '#fff0a0', moon: '#fffbe0', moon2: '#e0f0d0', mist: '#c8e0c0', speck: '#f0ffd8', sea: '#2e5040', stars: 0.15, mood: 'major' },
  bleach: { top: '#aab0bc', hor: '#f0eee9', low: '#d8d6d0', fog: '#e6e3dd', stone: '#ece8e0', stone2: '#8c8a84', glow: '#2a2a2a', moon: '#1a1a1a', moon2: '#5a5a5a', mist: '#ffffff', speck: '#6a6a6a', sea: '#cfccc5', stars: 0, mood: 'sus', light: true, fogK: 0.55 },
  vapor: { top: '#14082e', hor: '#ff6ac8', low: '#2a0a40', fog: '#7a3a9a', stone: '#6ad8e8', stone2: '#b85ad8', glow: '#ffe86a', moon: '#ffb0e8', moon2: '#8af0ff', mist: '#ff9ae0', speck: '#ffffff', sea: '#3a1060', stars: 0.8, mood: 'major' },
};
/* "Random" mixes a palette from scratch, still keeping it readable: a dark or light sky, and stone that stands out from it */
function hsl(H, S, L) {
  H = ((H % 360) + 360) % 360 / 360; const q = L < 0.5 ? L * (1 + S) : L + S - L * S, p = 2 * L - q;
  const ch = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return '#' + [ch(H + 1 / 3), ch(H), ch(H - 1 / 3)].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}
function randomPalette(r) {
  const h = r() * 360, h2 = (h + r.range(120, 240)) % 360, dark = r.chance(0.75), c = hsl;
  return dark
    ? { top: c(h, 0.5, 0.06), hor: c(h + 20, 0.45, 0.42), low: c(h, 0.4, 0.1), fog: c(h + 20, 0.35, 0.28), stone: c(h2, 0.25, 0.55), stone2: c(h2, 0.2, 0.32), glow: c(h2 + 30, 0.95, 0.65), moon: c(h2 + 10, 0.6, 0.86), moon2: c(h + 40, 0.4, 0.8), mist: c(h + 20, 0.4, 0.62), speck: c(h2, 0.6, 0.88), sea: c(h, 0.4, 0.14), stars: 0.8, mood: r.pick(['minor', 'major', 'sus']) }
    : { light: true, fogK: 0.6, top: c(h, 0.4, 0.62), hor: c(h + 15, 0.5, 0.86), low: c(h, 0.3, 0.7), fog: c(h + 15, 0.35, 0.8), stone: c(h2, 0.3, 0.86), stone2: c(h2, 0.25, 0.6), glow: c(h2 + 30, 0.9, 0.3), moon: c(h2, 0.5, 0.3), moon2: c(h, 0.3, 0.45), mist: c(h + 15, 0.4, 0.95), speck: c(h2, 0.5, 0.4), sea: c(h, 0.3, 0.74), stars: 0, mood: r.pick(['major', 'sus']) };
}
const rgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);

/* A name for each dream: "The Patient Lighthouse at Low Tide" */
const NAME_A = ['Drowned', 'Patient', 'Hollow', 'Upside-Down', 'Forgotten', 'Humming', 'Weightless', 'Borrowed', 'Sleeping', 'Endless', 'Quiet', 'Second', 'Inside-Out', 'Unfinished', 'Lantern-Lit', 'Paper', 'Salt-White', 'Last', 'Folded', 'Echoing'];
const NAME_N = ['Staircase', 'Lighthouse', 'Door', 'Harbour', 'Archive', 'Bell Tower', 'Garden', 'Observatory', 'Cathedral', 'Hallway', 'Clockworks', 'Aqueduct', 'Library', 'Station', 'Window', 'Orchard', 'Theatre', 'Bridge', 'Waiting Room', 'Well'];
const NAME_C = ['at Low Tide', 'of the Third Moon', 'on a Tuesday', 'Nobody Built', 'Above the Fog', 'Under Your Old School', 'Before the Last Train', 'of Salt and Rain', 'at the End of the Hall', 'Where the Stairs Give Up', 'of Slow Light', 'in the Year Without Summer', 'You Have Been Before', 'Past the Edge of the Map', 'That Hums at Night'];
const LINES = {
  gravity: { down: '', up: 'The world curls up around you, like the inside of a bowl.', side: 'The horizon stands on its end.', none: 'Nothing falls here. You can fly.', inward: 'The world is so small you can see it curving away.' },
  time: { still: 'Time has stopped. Even the sea.', back: 'Time is running backwards.', fast: 'The hours go by like birds.', slow: '', normal: '' },
  scale: { giant: 'Everything here was built for someone bigger.', tiny: 'You are a giant here.', mixed: 'Nothing is the size it should be.', human: '' },
  geometry: { impossible: 'Every monument has a twin hanging upside down in the sky.', echo: 'Every shape repeats, smaller and smaller.', melted: 'The land and the stone are soft and slowly sliding.', crystal: 'Everything has edges.', plain: '' },
};
function dreamName(r) { return `The ${r.pick(NAME_A)} ${r.pick(NAME_N)} ${r.pick(NAME_C)}`; }
const SEED_WORDS = ['moth', 'tide', 'lantern', 'salt', 'velvet', 'ember', 'cello', 'quartz', 'harbor', 'sleep', 'comet', 'ivory', 'nocturne', 'willow', 'static', 'marble', 'echo', 'drift', 'hollow', 'paper'];
function newSeed() { const r = rng((Math.random() * 4294967296) >>> 0); return r.pick(SEED_WORDS) + '-' + r.pick(SEED_WORDS) + '-' + r.int(10, 99); }

/* ---- the same noise the GPU uses (part 2), so the ground you walk on is the ground you see ----
   The hash is exact whole-number arithmetic; Math.fround keeps the rest in 32-bit floats, like the graphics card. */
const F = Math.fround, fract = (v) => F(v - Math.floor(v));
const perm = (x) => { const v = (x * 34 + 1) * x; return v - 289 * Math.floor(v / 289); };
function hash12(x, y) { x = Math.floor(x); y = Math.floor(y); x -= 289 * Math.floor(x / 289); y -= 289 * Math.floor(y / 289); return perm(perm(x) + y) / 289; }
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = F(x - ix), fy = F(y - iy), ux = F(fx * fx * F(3 - 2 * fx)), uy = F(fy * fy * F(3 - 2 * fy));
  const a = hash12(ix, iy), b = hash12(ix + 1, iy), c = hash12(ix, iy + 1), d = hash12(ix + 1, iy + 1);
  return F(F(a + F((b - a) * ux)) + F(F(F(c + F((d - c) * ux)) - F(a + F((b - a) * ux))) * uy));
}
function fbm(x, y, oct) { let s = 0, a = 0.5, n = 0; for (let i = 0; i < oct; i++) { s += a * vnoise(x, y); n += a; x = F(x * 2.03 + 1.7); y = F(y * 2.03 + 9.2); a *= 0.5; } return s / n; }
