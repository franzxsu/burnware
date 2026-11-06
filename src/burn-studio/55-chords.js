/* ============================================================
   Chords, expanded: the chords in your key, "borrowed" chords
   from outside it (the ♭VII, iv and ♭VI that make songs sound
   like songs), or any of the 24 major and minor chords. Each can
   be played plain, as a 7th, sus4, add9 or power chord.
   ============================================================ */
const DEGREE = ['I', '♭II', 'II', '♭III', 'III', 'IV', '♯IV', 'V', '♭VI', 'VI', '♭VII', 'VII'];
const FLAVORS = [['triad', 'Plain'], ['7th', '7th'], ['sus4', 'sus4'], ['add9', 'add9'], ['power', '5']];
const isMinorKey = (song) => ['minor', 'dorian', 'mpent', 'blues'].includes(song.scale);
function parentSteps(song) { return isMinorKey(song) ? (song.scale === 'dorian' ? SCALES.dorian : SCALES.minor).steps : (song.scale === 'mixo' ? SCALES.mixo : SCALES.major).steps; }
/* r = semitones above the key, q = maj / min / dim / dom */
function chordInfo(r, q) { const deg = q === 'maj' || q === 'dom' ? DEGREE[r] : DEGREE[r].toLowerCase(); return { r, q, roman: deg + (q === 'dim' ? '°' : q === 'dom' ? '7' : '') }; }
function chordBank(song, mode) {
  if (mode === 'any') { const out = []; for (const q of ['maj', 'min']) for (let pc = 0; pc < 12; pc++) out.push(chordInfo((pc - song.key + 12) % 12, q)); return out; }
  if (mode === 'borrowed') {
    const list = isMinorKey(song)
      ? [[0, 'maj'], [2, 'min'], [5, 'maj'], [7, 'maj'], [1, 'maj'], [9, 'min'], [2, 'maj'], [11, 'dim']]
      : [[0, 'min'], [3, 'maj'], [5, 'min'], [8, 'maj'], [10, 'maj'], [2, 'maj'], [4, 'maj'], [1, 'maj']];
    return list.map(([r, q]) => chordInfo(r, q));
  }
  const sc = parentSteps(song), out = sc.map((st, d) => {
    const third = (sc[(d + 2) % 7] - st + 12) % 12, fifth = (sc[(d + 4) % 7] - st + 12) % 12;
    return chordInfo(st, third === 3 ? (fifth === 6 ? 'dim' : 'min') : 'maj');
  });
  out.push(chordInfo(7, 'dom'));
  return out;
}
/* the notes (semitones above the chord's root) and the chord's name for a flavour */
function chordShape(c, flavor, song) {
  const sc = parentSteps(song), majSeventhFits = sc.includes((c.r + 11) % 12);
  const base = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], dom: [0, 4, 7, 10] }[c.q];
  const tag = { maj: '', min: 'm', dim: 'dim', dom: '7' }[c.q];
  if (flavor === '7th') return c.q === 'maj' ? (majSeventhFits ? [[0, 4, 7, 11], 'maj7'] : [[0, 4, 7, 10], '7']) : c.q === 'min' ? [[0, 3, 7, 10], 'm7'] : c.q === 'dim' ? [[0, 3, 6, 10], 'm7♭5'] : [base, '7'];
  if (flavor === 'sus4') return [[0, 5, 7], c.q === 'dom' ? '7sus4' : 'sus4'];
  if (flavor === 'add9') return [base.slice(0, 3).concat(14), c.q === 'min' ? 'm(add9)' : c.q === 'dim' ? 'dim(add9)' : 'add9'];
  if (flavor === 'power') return [[0, 7, 12], '5'];
  return [base, tag];
}
Play.chords = function () {
  const s = App.song, i = App.track, t = s.tracks[i], mode = App.chordMode || 'key', flavor = App.flavor || 'triad';
  const bank = chordBank(s, mode), box = h('div.chords' + (mode === 'any' ? '.any' : ''));
  /* in All 24 the buttons are small: the big text is just the chord (C, C#m), the type goes underneath */
  const chords = bank.map(c => { const [iv, tag] = chordShape(c, flavor, s), root = (s.key + c.r) % 12, short = mode === 'any';
    const big = short ? NOTE_NAMES[root] + (c.q === 'min' ? 'm' : '') : NOTE_NAMES[root] + tag, small = short ? (flavor === 'triad' ? c.roman : tag.replace(/^m\((.*)\)$/, '$1').replace(/^m(?=7)/, '') + ' ' + c.roman) : c.roman;
    return { name: NOTE_NAMES[root] + tag, big, small, tones: iv.map(x => s.key + c.r + x) }; });
  const voice = (c) => {   // fit the chord into this track's range; the bass plays the root, plus an octave
    const lo = KINDS[t.kind].low;
    if (t.kind === 'bass') { let r = c.tones[0]; while (r < lo) r += 12; while (r > lo + 11) r -= 12; return [r, r + 12]; }
    return c.tones.map(m => { let v = m; while (v < lo + 3) v += 12; while (v > lo + 19) v -= 12; return v; }).sort((a, b) => a - b).filter((m, k, a) => a.indexOf(m) === k);
  };
  chords.forEach((c, k) => box.append(h('div.chord', { 'data-k': k, role: 'button', 'aria-label': c.name + ' chord' }, c.big, h('small', c.small))));
  this.fingers(box, (e) => this.under(e, '.chord'), (el, id) => { el.classList.add('down'); voice(chords[+el.dataset.k]).forEach((m, j) => Live.on('c' + id + ':' + j, i, m, 0.7)); }, (el, id) => { el.classList.remove('down'); for (let j = 0; j < 6; j++) Live.off('c' + id + ':' + j); });
  return box;
};
/* the chord controls sit in the play bar, after the Keyboard / Chords tabs */
const playRender = Play.render;
Play.render = function () {
  playRender.call(this);
  if (App.surface !== 'chords') return;
  const bar = $('#playbar'), tabs = bar.querySelector('.seg');
  const seg = (label, opts, cur, set) => h('div.seg', { role: 'group', 'aria-label': label }, opts.map(([v, nm]) => { const b = h('button' + (v === cur ? '.on' : ''), nm); b.onclick = () => { set(v); Play.render(); }; return b; }));
  const which = seg('Which chords', [['key', 'In key'], ['borrowed', 'Borrowed'], ['any', 'All 24']], App.chordMode || 'key', v => { App.chordMode = v; });
  const flav = seg('Chord type', FLAVORS, App.flavor || 'triad', v => { App.flavor = v; });
  which.title = 'In key: always sounds right. Borrowed: outside the key, for colour. All 24: every major and minor chord.';
  tabs.after(which, flav);
};
