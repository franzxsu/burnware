/* ============================================================
   Surfaces, themes and the three stages
   ============================================================ */
// mu: peak grip, slide: grip kept while sliding, rr: rolling resistance,
// dust: particle colour (null = none), skid: skid-mark colour, snd: tyre sound
const SURF = {
  tarmac:   { name: 'Tarmac', mu: 1.10, slide: 0.86, rr: 0.012, dust: null,             skid: [0.10, 0.10, 0.11], skidA: 0.55, snd: 'tarmac', drag: 0 },
  gravel:   { name: 'Gravel', mu: 0.84, slide: 0.84, rr: 0.026, dust: [0.80, 0.70, 0.54], skid: [0.42, 0.33, 0.24], skidA: 0.50, snd: 'gravel', drag: 0 },
  dirt:     { name: 'Dirt',   mu: 0.88, slide: 0.84, rr: 0.028, dust: [0.88, 0.62, 0.42], skid: [0.50, 0.30, 0.18], skidA: 0.45, snd: 'gravel', drag: 0 },
  sand:     { name: 'Sand',   mu: 0.70, slide: 0.82, rr: 0.085, dust: [0.94, 0.78, 0.55], skid: [0.70, 0.52, 0.34], skidA: 0.45, snd: 'sand', drag: 0.4 },
  snow:     { name: 'Snow',   mu: 0.62, slide: 0.88, rr: 0.032, dust: [0.96, 0.98, 1.00], skid: [0.70, 0.76, 0.86], skidA: 0.60, snd: 'snow', drag: 0 },
  ice:      { name: 'Ice',    mu: 0.36, slide: 0.92, rr: 0.010, dust: [0.85, 0.93, 1.00], skid: [0.62, 0.74, 0.86], skidA: 0.35, snd: 'snow', drag: 0 },
  grass:    { name: 'Grass',  mu: 0.68, slide: 0.80, rr: 0.065, dust: [0.42, 0.40, 0.26], skid: [0.30, 0.26, 0.16], skidA: 0.45, snd: 'grass', drag: 0.3 },
  deepsnow: { name: 'Deep snow', mu: 0.52, slide: 0.85, rr: 0.10, dust: [0.97, 0.98, 1.00], skid: [0.74, 0.80, 0.90], skidA: 0.55, snd: 'snow', drag: 0.6 },
  water:    { name: 'Water',  mu: 0.66, slide: 0.85, rr: 0.05, dust: null,             skid: [0.3, 0.3, 0.3], skidA: 0, snd: 'water', drag: 2.2 },
};

const THEMES = {
  forest: {
    offroad: 'grass', skyTop: 0x4f95e0, skyHorizon: 0xd5ecf7, fog: 0xd5ecf7, fogNear: 140, fogFar: 560,
    sun: 0xfff1d6, sunI: 1.05, hemiSky: 0xcfe8ff, hemiGround: 0x5a6b3a, hemiI: 0.62, sunDir: [0.55, 0.85, 0.35],
    ground: [[0.42, 0.56, 0.25], [0.34, 0.48, 0.22], [0.52, 0.60, 0.30]], cliff: [0.47, 0.44, 0.38], shoulder: [0.55, 0.48, 0.34],
    mountains: [0x7f9bb8, 0x93aecb, 0x6d89a6], water: 0x3d8fb8,
  },
  desert: {
    offroad: 'sand', skyTop: 0x3c62b0, skyHorizon: 0xf7c690, fog: 0xf3c99c, fogNear: 160, fogFar: 620,
    sun: 0xffe6c4, sunI: 1.0, hemiSky: 0xffe2c4, hemiGround: 0x7a4a32, hemiI: 0.55, sunDir: [-0.6, 0.62, 0.5],
    ground: [[0.80, 0.53, 0.34], [0.70, 0.43, 0.27], [0.88, 0.68, 0.47]], cliff: [0.58, 0.30, 0.19], shoulder: [0.82, 0.62, 0.43],
    mountains: [0xb8664a, 0xc77d5a, 0xa65a42], water: 0x4aa3a8,
  },
  snow: {
    offroad: 'deepsnow', skyTop: 0x6f9bd6, skyHorizon: 0xeef3fa, fog: 0xe9eff7, fogNear: 90, fogFar: 430,
    sun: 0xfff0f4, sunI: 0.95, hemiSky: 0xe6f0ff, hemiGround: 0x8b98ad, hemiI: 0.75, sunDir: [0.4, 0.55, -0.7],
    ground: [[0.95, 0.97, 1.0], [0.88, 0.92, 0.98], [0.82, 0.88, 0.96]], cliff: [0.50, 0.54, 0.60], shoulder: [0.86, 0.89, 0.94],
    mountains: [0xdfe7f2, 0xc9d6e8, 0xb3c3da], water: 0x7fb6d6,
  },
  coast: {
    offroad: 'grass', skyTop: 0x3b8fe0, skyHorizon: 0xd2ecf8, fog: 0xd6eef9, fogNear: 170, fogFar: 660,
    sun: 0xfff3dc, sunI: 1.05, hemiSky: 0xd7ecff, hemiGround: 0x6a7a3a, hemiI: 0.62, sunDir: [-0.35, 0.8, 0.55],
    ground: [[0.50, 0.64, 0.30], [0.42, 0.57, 0.26], [0.60, 0.68, 0.36]], cliff: [0.62, 0.57, 0.47], shoulder: [0.74, 0.68, 0.52],
    mountains: [0x7aa5b8, 0x8fb7c6, 0x6b94a8], water: 0x2a8fc4, sand: [0.93, 0.85, 0.63],
  },
};

/* Stages. Control points are metres in the XZ plane, listed in driving order.
   Feature/surface positions use control-point indices (14.5 = halfway from point 14 to 15). */
const TRACKS = [
  {
    id: 'pinewood', name: 'Pinewood Loop', theme: 'forest', seed: 7, laps: 2, width: 9,
    blurb: 'Fast forest gravel with a ford, a jump and one rude hairpin.',
    terrain: { amp: 30, freq: 1 / 210, tilt: [0, 0] },
    pts: [[-150, 170], [-40, 185], [70, 175], [150, 135], [185, 60], [175, -20], [130, -60], [60, -50], [20, -5], [-25, 30], [-55, 0],
          [-50, -60], [-10, -110], [60, -150], [150, -168], [194, -188], [209, -216], [184, -238], [128, -247], [0, -232], [-120, -200], [-190, -130], [-210, -30],
          [-200, 70], [-180, 140]],
    base: 'gravel',
    surfaces: [[23.6, 25.0, 'tarmac'], [0, 2.4, 'tarmac'], [11.3, 11.7, 'dirt']],
    features: [
      { type: 'crest', at: 1.2, h: 1.3, len: 56 },
      { type: 'water', at: 11.55, depth: 0.85, len: 34, r: 30 },
      { type: 'jump', at: 19.45, h: 1.35, len: 16 },
      { type: 'crest', at: 21.5, h: 1.1, len: 50 },
    ],
    scenery: { trees: 1150, rocks: 60, cacti: 0, mesas: 0, bales: true, crowd: 1 },
  },
  {
    id: 'mesa', name: 'Red Mesa', theme: 'desert', seed: 21, laps: 3, width: 11,
    blurb: 'Wide, quick desert dirt. Big jump, soft sand, long drifts.',
    terrain: { amp: 20, freq: 1 / 240, tilt: [0, 0] },
    pts: [[-200, 140], [-80, 170], [40, 160], [140, 120], [200, 40], [190, -60], [130, -120], [40, -130], [-10, -80], [-30, -10],
          [-90, 20], [-150, -30], [-170, -110], [-230, -140], [-250, -40], [-240, 60]],
    base: 'dirt',
    surfaces: [[5.2, 6.1, 'sand'], [12.4, 13.3, 'sand']],
    features: [
      { type: 'crest', at: 2.4, h: 1.4, len: 60 },
      { type: 'jump', at: 8.62, h: 1.9, len: 20 },
      { type: 'crest', at: 14.6, h: 1.3, len: 54 },
    ],
    scenery: { trees: 0, rocks: 150, cacti: 190, mesas: 12, bales: true, crowd: 1 },
  },
  {
    id: 'frost', name: 'Frostbite Pass', theme: 'snow', seed: 33, laps: 2, width: 8.5,
    blurb: 'Narrow snow switchbacks with ice on the hairpins. Be gentle.',
    terrain: { amp: 20, freq: 1 / 190, tilt: [0, -0.07] },
    pts: [[-150, 160], [-30, 170], [90, 160], [160, 120], [170, 60], [140, 20], [60, 30], [10, 10], [0, -40], [40, -80],
          [120, -90], [170, -120], [160, -180], [80, -200], [-40, -190], [-130, -150], [-170, -80], [-120, -20], [-170, 40], [-200, 100]],
    base: 'snow',
    surfaces: [[19.2, 20.0, 'gravel'], [0, 0.9, 'gravel'], [5.3, 6.3, 'ice'], [12.2, 13.2, 'ice']],
    features: [
      { type: 'crest', at: 1.5, h: 1.3, len: 40 },
      { type: 'jump', at: 14.5, h: 1.15, len: 14 },
    ],
    scenery: { trees: 950, rocks: 70, cacti: 0, mesas: 0, bales: false, crowd: 1, snowmen: 10 },
  },
  {
    id: 'coast', name: 'Palm Coast', theme: 'coast', seed: 52, laps: 3, width: 9.5,
    blurb: 'Fast seaside tarmac with a gravel loop inland. Mind the beach.',
    terrain: { amp: 16, freq: 1 / 230, tilt: [0, 0] },
    sea: { level: -1.4, dir: [0, 1], start: 175, falloff: 80, depth: 18 },
    pts: [[-180, 110], [-60, 135], [60, 128], [160, 100], [215, 30], [200, -50], [140, -95], [70, -80], [20, -30], [-30, -60],
          [-60, -120], [-120, -150], [-190, -120], [-215, -40], [-200, 40]],
    base: 'tarmac',
    surfaces: [[6.6, 12.6, 'gravel']],
    features: [
      { type: 'crest', at: 1.5, h: 1.2, len: 52 },
      { type: 'jump', at: 9.55, h: 1.5, len: 16 },
      { type: 'crest', at: 13.4, h: 1.2, len: 48 },
    ],
    landmark: { type: 'lighthouse', x: 250, z: 175 },
    scenery: { trees: 0, palms: 230, rocks: 90, cacti: 0, mesas: 0, bales: true, crowd: 1 },
  },
];

const CARS = [
  { id: 'pip', name: 'Pip', type: 'hatch', drive: 'FWD', blurb: 'Tiny, light and forgiving. Grips hard, rarely bites.', number: 7,
    mass: 860, torque: 205, grip: 1.04, frontBias: 1.0, steer: 0.64, color: 0x2fc9a0, accent: 0xfff3d6, stripe: 0x1d3b54,
    gears: [3.4, 2.15, 1.55, 1.18, 0.95], final: 4.4, redline: 7600, turbo: false, len: 3.5, wb: 2.25, tw: 1.42, stats: [2, 5, 1],
    r: 0.31, ride: 0.49, Lmax: 0.36, restComp: 0.13, clear: 0.29, roof: 1.3, drag: 0.42, inertia: [1.3, 1.12, 0.5], cyl: 4, aiK: 1 },
  { id: 'brute', name: 'Bruiser', type: 'coupe', drive: 'RWD', blurb: 'Big power to the rear wheels. Drifts all day if you let it.', number: 22,
    mass: 1120, torque: 310, grip: 0.98, rearGrip: 1.07, frontBias: 0.0, steer: 0.62, color: 0xe5432d, accent: 0xffffff, stripe: 0x1b1b1f,
    gears: [3.2, 2.1, 1.5, 1.15, 0.92], final: 4.2, redline: 7000, turbo: false, len: 4.0, wb: 2.5, tw: 1.52, stats: [5, 3, 4],
    r: 0.31, ride: 0.48, Lmax: 0.36, restComp: 0.13, clear: 0.27, roof: 1.22, drag: 0.42, inertia: [1.3, 1.12, 0.5], cyl: 6, aiK: 1 },
  { id: 'comet', name: 'Comet', type: 'sedan', drive: 'AWD', blurb: 'Turbo four-wheel drive. Puts power down anywhere.', number: 5,
    mass: 1190, torque: 300, grip: 1.03, frontBias: 0.42, steer: 0.6, color: 0x2457c5, accent: 0xffd400, stripe: 0xffffff,
    gears: [3.3, 2.1, 1.52, 1.16, 0.93], final: 4.3, redline: 7200, turbo: true, len: 3.95, wb: 2.48, tw: 1.5, stats: [4, 4, 3],
    r: 0.31, ride: 0.49, Lmax: 0.36, restComp: 0.13, clear: 0.29, roof: 1.3, drag: 0.42, inertia: [1.3, 1.12, 0.5], cyl: 4, aiK: 1 },
  { id: 'boulder', name: 'Boulder', type: 'suv', drive: 'AWD', blurb: 'Tall turbo-diesel four-by-four. Rides over everything, leans into every corner.', number: 44,
    mass: 1780, torque: 470, grip: 1.0, frontBias: 0.45, steer: 0.56, color: 0x4d7f4a, accent: 0xf0e2bd, stripe: 0x22301f,
    gears: [3.5, 2.15, 1.48, 1.12, 0.88], final: 4.0, redline: 5600, turbo: true, len: 4.55, wb: 2.76, tw: 1.66, stats: [4, 3, 5],
    r: 0.39, ride: 0.74, Lmax: 0.5, restComp: 0.17, clear: 0.42, roof: 1.86, drag: 0.6, inertia: [1.45, 1.28, 0.74], cyl: 6, aiK: 0.95 },
  { id: 'hopper', name: 'Hopper', type: 'buggy', drive: 'RWD', blurb: 'Featherweight dune buggy on long-travel springs. Built for jumps.', number: 17,
    mass: 690, torque: 180, grip: 1.03, rearGrip: 1.06, frontBias: 0.0, steer: 0.66, color: 0xff7a1a, accent: 0x1a1a1a, stripe: 0xffe14d,
    gears: [3.3, 2.1, 1.5, 1.14, 0.92], final: 4.3, redline: 6900, turbo: false, len: 3.3, wb: 2.35, tw: 1.58, stats: [3, 4, 1],
    r: 0.36, ride: 0.6, Lmax: 0.54, restComp: 0.19, clear: 0.36, roof: 1.55, drag: 0.46, inertia: [1.15, 1.0, 0.48], cyl: 2, aiK: 1 },
  { id: 'mule', name: 'Mule', type: 'truck', drive: 'RWD', blurb: 'Pickup with a V8 and an empty bed. The back end wants to lead.', number: 88,
    mass: 1640, torque: 480, grip: 0.98, rearGrip: 1.06, frontBias: 0.0, steer: 0.55, color: 0xa3312b, accent: 0xebe6d8, stripe: 0x1b1b1b,
    gears: [3.1, 2.0, 1.42, 1.08, 0.86], final: 3.9, redline: 5900, turbo: false, len: 4.9, wb: 3.0, tw: 1.66, stats: [5, 2, 5],
    r: 0.37, ride: 0.66, Lmax: 0.44, restComp: 0.15, clear: 0.38, roof: 1.8, drag: 0.6, inertia: [1.6, 1.45, 0.7], cyl: 8, aiK: 0.95 },
];
const CAR_BY_ID = Object.fromEntries(CARS.map(c => [c.id, c]));

const RIVALS = [
  { name: 'V. Kask', color: 0xf2b316, accent: 0x222222, stripe: 0xffffff, skill: 0.9, number: 11 },
  { name: 'M. Ortega', color: 0x8b4fd8, accent: 0xffffff, stripe: 0xff7ab8, skill: 0.93, number: 3 },
  { name: 'T. Hale', color: 0xf3f3ee, accent: 0xd1302a, stripe: 0x1f3c8f, skill: 0.96, number: 9 },
];

/* "Situations": who you race and under which rules */
const EVENTS = [
  { id: 'mixed', name: 'Race · mixed field', short: 'Mixed', desc: 'Four cars, three rivals in different machines from yours.', field: 'mixed', rule: 'race' },
  { id: 'onemake', name: 'One-make race', short: 'One-make', desc: 'Everyone drives your car. All SUVs, all buggies, all trucks: pure driving.', field: 'same', rule: 'race' },
  { id: 'elim', name: 'Elimination', short: 'Elimination', desc: 'Same cars, three laps. Whoever is last when the leader finishes a lap is out.', field: 'same', rule: 'elim' },
  { id: 'cup', name: 'Rally Cup', short: 'Cup', desc: 'Every stage in a row against the same rivals. 10, 6, 4, 3 points per stage.', field: 'mixed', rule: 'cup' },
  { id: 'trial', name: 'Time trial', short: 'Trial', desc: 'Just you and your best lap, saved as a ghost car.', field: 'solo', rule: 'trial' },
  { id: 'drift', name: 'Drift trial', short: 'Drift', desc: 'Score points by sliding, on a looser drift setup. Long slides build a combo; a crash, a spin or the scenery loses it.', field: 'solo', rule: 'drift' },
];
const EVENT_BY_ID = Object.fromEntries(EVENTS.map(e => [e.id, e]));

/* time of day changes the light, sky and fog of whichever theme is loaded */
const TOD = {
  day: { name: 'Day' },
  sunset: { name: 'Sunset', skyTop: 0x2d3f86, skyHorizon: 0xf5a46b, fog: 0xe9a57a, fogMul: 0.9, sun: 0xffb27a, sunI: 1.05, hemiSky: 0xffc6a0, hemiGround: 0x5a3f52, hemiI: 0.5, sunY: 0.2 },
  night: { name: 'Night', skyTop: 0x050a1f, skyHorizon: 0x1a2550, fog: 0x0f1733, fogMul: 0.62, sun: 0x9fb4ff, sunI: 0.28, hemiSky: 0x2a3866, hemiGround: 0x0b0d16, hemiI: 0.32, sunY: 0.75, night: true },
};
/* weather: rain greys the sky, pulls the fog in and costs grip; on the snow stage it falls as snow */
const WEATHER = {
  clear: { name: 'Clear' },
  rain: { name: 'Rain', grip: 0.86, grey: 0x7a838f, mix: 0.62, fogMul: 0.55, sunK: 0.45, hemiK: 0.95 },
  snow: { name: 'Snow', grip: 0.93, grey: 0xd5dce6, mix: 0.5, fogMul: 0.5, sunK: 0.55, hemiK: 1.05 },
};
function weatherFor(track, wx) { return wx === 'rain' ? (track.theme === 'snow' ? 'snow' : 'rain') : 'clear'; }
const mixHex = (a, b, t) => {
  const ch = (s) => Math.round(((a >> s) & 255) + ((((b >> s) & 255) - ((a >> s) & 255)) * t));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};
function themeFor(track, tod, wx) {
  const base = THEMES[track.theme], t = TOD[tod] || TOD.day, th = Object.assign({}, base);
  th.tod = TOD[tod] ? tod : 'day';
  if (th.tod !== 'day') {
    for (const k of ['skyTop', 'skyHorizon', 'fog', 'sun', 'sunI', 'hemiSky', 'hemiGround', 'hemiI']) th[k] = t[k];
    th.fogNear = base.fogNear * t.fogMul; th.fogFar = base.fogFar * t.fogMul;
    const d = base.sunDir; th.sunDir = [d[0], t.sunY, d[2]];
    th.night = !!t.night;
    if (track.theme === 'snow' && tod === 'night') { th.hemiGround = 0x2a3350; th.hemiI = 0.42; }
  }
  const kind = weatherFor(track, wx), w = WEATHER[kind];
  th.wx = w.grip ? kind : null; th.grip = w.grip || 1;
  if (th.wx) {
    const grey = th.night ? (kind === 'snow' ? 0x2a3142 : 0x161b24) : th.tod === 'sunset' ? mixHex(w.grey, 0xb07a6a, 0.35) : w.grey;
    th.skyTop = mixHex(th.skyTop, mixHex(grey, 0x000000, 0.18), w.mix); th.skyHorizon = mixHex(th.skyHorizon, grey, w.mix); th.fog = mixHex(th.fog, grey, Math.min(1, w.mix + 0.12));
    th.fogNear *= w.fogMul; th.fogFar *= w.fogMul; th.sunI *= w.sunK; th.hemiI *= w.hemiK;
    th.hemiSky = mixHex(th.hemiSky, grey, 0.4);
  }
  return th;
}
