/* ============================================================
   Burn Studio: the song. Four tracks (drums, bass, keys, synth),
   four scenes (A to D, each a loop of 1, 2 or 4 bars), notes on a
   16th-note grid, a key and a scale, and a demo groove so there is
   something playing the moment you press play.
   ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function h(tag, props, ...kids) {
  const m = tag.split(/(?=[.#])/), el = document.createElement(m[0] || 'div');
  for (const p of m.slice(1)) { if (p[0] === '.') el.classList.add(p.slice(1)); else el.id = p.slice(1); }
  if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) { kids.unshift(props); props = null; }
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(9)) if (k !== null && k !== undefined && k !== false) el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return el;
}
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = (m) => NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const SCALES = {
  major: { name: 'major', steps: [0, 2, 4, 5, 7, 9, 11] }, minor: { name: 'minor', steps: [0, 2, 3, 5, 7, 8, 10] },
  dorian: { name: 'dorian', steps: [0, 2, 3, 5, 7, 9, 10] }, mixo: { name: 'mixolydian', steps: [0, 2, 4, 5, 7, 9, 10] },
  pent: { name: 'pentatonic', steps: [0, 2, 4, 7, 9] }, mpent: { name: 'minor pent.', steps: [0, 3, 5, 7, 10] }, blues: { name: 'blues', steps: [0, 3, 5, 6, 7, 10] },
};
const KINDS = {
  drums: { name: 'Drums', color: 'var(--c-drums)', presets: ['808', 'Studio', 'Lo-fi'] },
  bass: { name: 'Bass', color: 'var(--c-bass)', presets: ['Sub', 'Pluck', 'Acid'], low: 33 },
  keys: { name: 'Keys', color: 'var(--c-keys)', presets: ['E-Piano', 'Organ', 'Piano'], low: 52 },
  synth: { name: 'Synth', color: 'var(--c-synth)', presets: ['Lead', 'Pad', 'Chip'], low: 64 },
};
const LANES = [['Kick', '#ff5d4a'], ['Snare', '#ff9a3a'], ['Clap', '#ffd23a'], ['Closed hat', '#8ee05a'], ['Open hat', '#3fd1a8'], ['Low tom', '#3fc7ff'], ['High tom', '#6f8cff'], ['Crash', '#c98cff']];
/* the rows a melodic track shows: two octaves of the scale, from its lowest note up */
function scaleRows(kind, song) {
  const K = KINDS[kind], sc = SCALES[song.scale].steps, root = song.key, rows = [];
  let base = K.low - ((K.low - root) % 12 + 12) % 12;   // the key's root at or below the track's low note
  for (let o = 0; o < 2; o++) for (const s of sc) rows.push(base + o * 12 + s);
  rows.push(base + 24);
  return rows.filter(m => m >= K.low - 2).reverse();
}
const inScale = (m, song) => SCALES[song.scale].steps.includes(((m - song.key) % 12 + 12) % 12);
/* chords on the scale's degrees, stacked in thirds (pentatonic and blues borrow the parent scale) */
function chordSet(song) {
  const parent = ['minor', 'dorian', 'mpent', 'blues'].includes(song.scale) ? (song.scale === 'dorian' ? SCALES.dorian : SCALES.minor) : (song.scale === 'mixo' ? SCALES.mixo : SCALES.major);
  const sc = parent.steps, out = [], ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  for (let d = 0; d < 7; d++) {
    const tones = [0, 2, 4].map(k => sc[(d + k) % 7] + (d + k >= 7 ? 12 : 0));
    const third = tones[1] - tones[0], fifth = tones[2] - tones[0], minor = third === 3, dim = minor && fifth === 6;
    const rootPc = (song.key + sc[d]) % 12;
    out.push({ deg: d, roman: (minor ? ROMAN[d].toLowerCase() : ROMAN[d]) + (dim ? '°' : ''), name: NOTE_NAMES[rootPc] + (dim ? 'dim' : minor ? 'm' : ''), tones: tones.map(t => song.key + t) });
  }
  const V = out[4]; out.push({ deg: 7, roman: V.roman.toUpperCase() + '7', name: NOTE_NAMES[(song.key + 7) % 12] + '7', tones: [song.key + 7, song.key + 11, song.key + 14, song.key + 17] });
  return out;
}
/* ---------- the song ---------- */
const SCENES = 4;
function emptySong() {
  return { v: 1, title: 'Untitled jam', bpm: 92, swing: 0.12, key: 9, scale: 'minor', bars: 2, metro: false, chain: false,
    tracks: ['drums', 'bass', 'keys', 'synth'].map(kind => ({ kind, preset: KINDS[kind].presets[0], vol: kind === 'drums' ? 0.9 : 0.75, mute: false, solo: false, rev: kind === 'keys' || kind === 'synth' ? 0.25 : 0.06, pats: Array.from({ length: SCENES }, () => []) })) };
}
const N = (s, n, l = 1, v = 0.9) => ({ s, n, l, v });
function demoSong() {
  const S = emptySong(); S.title = 'Rain on the garage roof';
  const [D, B, K, Y] = S.tracks;
  // scene A: a laid-back groove in A minor (Am, F, C, G)
  const kick = [0, 7, 10, 16, 23, 26], snare = [4, 12, 20, 28], hats = [...Array(32).keys()].filter(i => i % 2 === 0);
  D.pats[0] = [...kick.map(s => N(s, 0)), ...snare.map(s => N(s, 1, 1, 0.85)), ...hats.map(s => N(s, 3, 1, s % 4 ? 0.45 : 0.7)), N(14, 4, 1, 0.5), N(30, 4, 1, 0.5)];
  const roots = [45, 41, 36, 43];   // A2 F2 C2 G2
  B.pats[0] = roots.flatMap((r, i) => [N(i * 8, r, 3), N(i * 8 + 3, r, 1, 0.7), N(i * 8 + 6, r + 12, 2, 0.6)]);
  const chords = [[57, 60, 64], [57, 60, 65], [55, 60, 64], [55, 59, 62]];
  K.pats[0] = chords.flatMap((c, i) => c.flatMap(n => [N(i * 8, n, 3, 0.6), N(i * 8 + 4, n, 2, 0.45)]));
  Y.pats[0] = [N(2, 76, 2), N(4, 72, 2), N(6, 74, 4, 0.8), N(12, 72, 2, 0.7), N(18, 71, 2), N(20, 72, 2), N(22, 74, 6, 0.8)];
  // scene B: busier drums, a new melody on top
  D.pats[1] = [...kick.map(s => N(s, 0)), N(15, 0, 1, 0.6), ...snare.map(s => N(s, 1, 1, 0.9)), N(12, 2, 1, 0.6), N(28, 2, 1, 0.6), ...[...Array(32).keys()].map(s => N(s, 3, 1, s % 2 ? 0.35 : 0.6)), N(0, 7, 1, 0.5), N(29, 5, 1, 0.7), N(30, 6, 1, 0.7), N(31, 5, 1, 0.7)];
  B.pats[1] = B.pats[0].map(n => ({ ...n }));
  K.pats[1] = K.pats[0].map(n => ({ ...n }));
  Y.pats[1] = [N(0, 81, 2), N(2, 79, 2), N(4, 76, 4), N(8, 77, 2, 0.7), N(10, 76, 2, 0.7), N(12, 72, 4), N(16, 74, 2), N(18, 76, 2), N(20, 79, 3), N(24, 76, 8, 0.7)];
  // scene C: the break, drums and bass only
  D.pats[2] = [N(0, 0), N(10, 0, 1, 0.8), N(16, 0), N(26, 0, 1, 0.8), N(8, 1, 1, 0.8), N(24, 1, 1, 0.8), ...[...Array(8).keys()].map(i => N(i * 4 + 2, 4, 1, 0.45))];
  B.pats[2] = [N(0, 45, 6), N(8, 48, 6), N(16, 41, 6), N(24, 43, 6)];
  S.chain = false;
  return S;
}
/* save as you go; a song can also travel in the address after # */
const Store = {
  key: 'jam-room-v1',
  load() { try { const s = localStorage.getItem(this.key); if (s) return validSong(JSON.parse(s)); } catch (e) { /* nothing saved */ } return null; },
  save(song) { try { localStorage.setItem(this.key, JSON.stringify(song)); } catch (e) { /* full or blocked */ } },
};
function validSong(s) {
  if (!s || !Array.isArray(s.tracks) || s.tracks.length !== 4) return null;
  const base = emptySong();
  const out = Object.assign(base, { title: String(s.title || base.title).slice(0, 60), bpm: clamp(+s.bpm || 92, 50, 200), swing: clamp(+s.swing || 0, 0, 0.5), key: clamp(Math.round(+s.key || 0), 0, 11), scale: SCALES[s.scale] ? s.scale : 'minor', bars: [1, 2, 4].includes(+s.bars) ? +s.bars : 2, metro: !!s.metro, chain: !!s.chain });
  out.tracks.forEach((t, i) => {
    const q = s.tracks[i] || {}; if (KINDS[q.kind] && q.kind === t.kind) {
      if (KINDS[t.kind].presets.includes(q.preset)) t.preset = q.preset;
      t.vol = clamp(+q.vol || 0, 0, 1); t.mute = !!q.mute; t.solo = !!q.solo; t.rev = clamp(+q.rev || 0, 0, 1);
      t.pats = Array.from({ length: SCENES }, (_, k) => (Array.isArray(q.pats && q.pats[k]) ? q.pats[k] : []).filter(n => n && Number.isFinite(+n.s) && Number.isFinite(+n.n)).map(n => N(clamp(Math.round(+n.s), 0, 63), clamp(Math.round(+n.n), 0, 120), clamp(Math.round(+n.l || 1), 1, 64), clamp(+n.v || 0.8, 0.05, 1))));
    }
  });
  return out;
}
/* compact form for links: notes as "step.note.len.vel" */
function packSong(s) {
  const t = s.tracks.map(tr => [tr.preset, Math.round(tr.vol * 100), tr.mute ? 1 : 0, tr.solo ? 1 : 0, Math.round(tr.rev * 100), tr.pats.map(p => p.map(n => [n.s, n.n, n.l, Math.round(n.v * 100)].join('.')).join(','))]);
  const raw = JSON.stringify([1, s.title, s.bpm, Math.round(s.swing * 100), s.key, s.scale, s.bars, s.chain ? 1 : 0, t]);
  return btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unpackSong(code) {
  try {
    const raw = decodeURIComponent(escape(atob(code.replace(/-/g, '+').replace(/_/g, '/')))), a = JSON.parse(raw); if (a[0] !== 1) return null;
    const kinds = ['drums', 'bass', 'keys', 'synth'];
    return validSong({ title: a[1], bpm: a[2], swing: a[3] / 100, key: a[4], scale: a[5], bars: a[6], chain: !!a[7], tracks: a[8].map((t, i) => ({ kind: kinds[i], preset: t[0], vol: t[1] / 100, mute: !!t[2], solo: !!t[3], rev: t[4] / 100, pats: t[5].map(p => p ? p.split(',').map(x => { const [s, n, l, v] = x.split('.').map(Number); return { s, n, l, v: v / 100 }; }) : []) })) });
  } catch (e) { return null; }
}
