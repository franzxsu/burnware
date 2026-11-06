/* ============================================================
   Extras: a library of ready-made loops for every track (always in
   your key and scale), playing from the computer keyboard, a link
   that carries the whole song, and WAV export (rendered offline by
   the same engine, faster than real time).
   ============================================================ */
/* ---------- the loop library ---------- */
const Loops = {
  /* scale degree d (0 = the key's root) in the track's register, plus whole octaves */
  deg(song, kind, d, oct = 0) {
    const sc = SCALES[song.scale].steps, L = sc.length, low = KINDS[kind].low, root = low - ((low - song.key) % 12 + 12) % 12;
    const k = ((d % L) + L) % L, o = Math.floor(d / L);
    return root + sc[k] + 12 * (o + oct) + (root < low - 2 ? 12 : 0);
  },
  chord(song, kind, deg) {   // a triad on a degree, voiced inside the track's range
    const c = chordSet(song)[deg % 7], lo = KINDS[kind].low;
    return c.tones.map(m => { let v = m; while (v < lo + 2) v += 12; while (v > lo + 19) v -= 12; return v; }).sort((a, b) => a - b);
  },
  prog: [0, 5, 3, 4],   // i–VI–iv–v in minor keys, I–vi–IV–V in major ones
  /* each loop writes one bar at a time; bar b plays the progression's chord b */
  lib: {
    drums: [
      ['Boom bap', (b) => [[0, 0], [7, 0, 0.7], [10, 0], [4, 1], [12, 1], ...[0, 2, 4, 6, 8, 10, 12, 14].map(s => [s, 3, s % 4 ? 0.45 : 0.7]), [14, 4, 0.5]]],
      ['Four on the floor', (b) => [[0, 0], [4, 0], [8, 0], [12, 0], [4, 2], [12, 2], [2, 4, 0.6], [6, 4, 0.6], [10, 4, 0.6], [14, 4, 0.6], ...[0, 4, 8, 12].map(s => [s, 3, 0.4])]],
      ['Trap rolls', (b) => [[0, 0], [7, 0, 0.8], [11, 0, 0.9], [8, 2], ...[...Array(16).keys()].map(s => [s, 3, s % 2 ? 0.35 : 0.6]), ...(b % 2 ? [[13, 3, 0.4], [15, 3, 0.4]] : [])]],
      ['Rock steady', (b) => [[0, 0], [8, 0], [10, 0, 0.8], [4, 1], [12, 1], ...[0, 2, 4, 6, 8, 10, 12, 14].map(s => [s, 3, 0.55]), ...(b === 0 ? [[0, 7, 0.7]] : [])]],
      ['Breakbeat', (b) => [[0, 0], [10, 0], [11, 0, 0.7], [4, 1], [7, 1, 0.4], [12, 1], [15, 1, 0.4], ...[0, 2, 4, 6, 8, 10, 12, 14].map(s => [s, 3, 0.5]), [6, 4, 0.5]]],
      ['Tom fill (last bar)', (b, bars) => b === bars - 1 ? [[0, 0], [4, 1], [8, 6], [9, 6, 0.8], [10, 5], [11, 5, 0.8], [12, 5], [13, 1, 0.7], [14, 1, 0.8], [15, 1]] : [[0, 0], [8, 0], [4, 1], [12, 1], ...[0, 2, 4, 6, 8, 10, 12, 14].map(s => [s, 3, 0.5])]],
    ],
    bass: [
      ['Root pulse', (b, _, d) => [0, 2, 4, 6, 8, 10, 12, 14].map(s => [s, d(0), 1, s % 4 ? 0.65 : 0.9])],
      ['Octave funk', (b, _, d) => [[0, d(0), 2], [3, d(7), 1, 0.7], [4, d(0), 1, 0.8], [7, d(0), 1, 0.6], [10, d(7), 1, 0.7], [12, d(4), 2, 0.8], [14, d(6), 2, 0.7]]],
      ['Long sub', (b, _, d) => [[0, d(0), 14, 0.9]]],
      ['Walking', (b, _, d) => [[0, d(0), 3], [4, d(2), 3, 0.8], [8, d(4), 3, 0.85], [12, d(5), 3, 0.8]]],
      ['Syncopated', (b, _, d) => [[0, d(0), 3], [3, d(0), 2, 0.7], [6, d(0), 2, 0.8], [10, d(4), 2, 0.75], [14, d(2), 2, 0.7]]],
    ],
    keys: [
      ['Whole chords', (b, _, d, ch) => ch().map(m => [0, m, 15, 0.6])],
      ['Off-beat stabs', (b, _, d, ch) => [2, 6, 10, 14].flatMap(s => ch().map(m => [s, m, 1, 0.55]))],
      ['Two-step comp', (b, _, d, ch) => [[0, 3, 0.6], [6, 2, 0.5], [10, 4, 0.55]].flatMap(([s, l, v]) => ch().map(m => [s, m, l, v]))],
      ['Broken chord', (b, _, d, ch) => { const c = ch(); return [0, 2, 4, 6, 8, 10, 12, 14].map((s, k) => [s, c[[0, 1, 2, 1][k % 4]] + (k >= 4 ? 12 : 0), 2, 0.55]); }],
    ],
    synth: [
      ['Arp up 16ths', (b, _, d, ch) => { const c = ch(); return [...Array(16).keys()].map(s => [s, c[s % 3] + 12 * Math.floor((s % 6) / 3), 1, s % 4 ? 0.5 : 0.7]); }],
      ['Slow pad', (b, _, d, ch) => ch().map(m => [0, m, 16, 0.45])],
      ['Hook', (b, _, d) => b % 2 ? [[0, d(4), 2], [2, d(3), 2, 0.7], [4, d(2), 4], [12, d(0), 4, 0.6]] : [[0, d(0), 2], [2, d(2), 2, 0.7], [4, d(4), 3], [8, d(5), 2, 0.8], [10, d(4), 4, 0.7]]],
      ['Chip blips', (b, _, d) => [[0, d(7), 1], [3, d(9), 1, 0.7], [6, d(7), 1, 0.7], [8, d(11), 1], [11, d(9), 1, 0.6], [14, d(7), 2, 0.6]]],
    ],
  },
  build(i, k) {
    const s = App.song, t = s.tracks[i], [, fn] = this.lib[t.kind][k], out = [];
    for (let b = 0; b < s.bars; b++) {
      const dg = this.prog[b % 4], d = (x) => this.deg(s, t.kind, x + (t.kind === 'drums' ? 0 : dg)), ch = () => this.chord(s, t.kind, dg);
      for (const [st, n, l = 1, v = 0.9] of fn(b, s.bars, d, ch)) {
        if (t.kind === 'drums') out.push(N(b * 16 + st, n, 1, l === 1 ? v : l));   // drum rows are [step, lane, velocity]
        else out.push(N(b * 16 + st, n, l, v));
      }
    }
    return out;
  },
  preview: null,
  sheet() {
    const s = App.song, i = App.track, t = s.tracks[i], K = KINDS[t.kind];
    const list = h('div', { style: { display: 'grid', gap: '6px' } }, this.lib[t.kind].map(([name], k) => {
      const use = h('button.btn', { title: 'Put this loop into scene ' + 'ABCD'[App.scene] }, 'Use');
      use.onclick = () => { t.pats[App.scene] = this.build(i, k); App.changed(); UI.grid(); close(); toast(name + ' → ' + K.name + ', scene ' + 'ABCD'[App.scene]); if (!Seq.playing) Seq.start(); };
      return h('div.row', { style: { justifyContent: 'space-between', background: 'var(--panel2)', borderRadius: '6px', padding: '6px 8px' } }, h('span', name), use);
    }));
    const close = Sheets.open('Loops for ' + K.name, h('p', { style: { margin: 0, color: 'var(--mute)', fontSize: '12px' } }, `Every loop fits ${NOTE_NAMES[s.key]} ${SCALES[s.scale].name} and follows the chords bar by bar. It replaces this track in scene ${'ABCD'[App.scene]}.`), list);
  },
};
/* ---------- playing from the computer keyboard ---------- */
const Typing = {
  map: { KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16 },
  init() {
    addEventListener('keydown', (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.target.closest('input, textarea, select')) return;
      if (e.code === 'KeyZ' || e.code === 'KeyX') { App.octave = clamp(App.octave + (e.code === 'KeyX' ? 1 : -1), -3, 3); Play.render(); toast('Octave ' + (App.octave >= 0 ? '+' : '') + App.octave); return; }
      if (e.code === 'KeyR' && !e.shiftKey) { $('#bRec').click(); return; }
      const off = this.map[e.code]; if (off === undefined) return;
      const t = App.song.tracks[App.track]; let n;
      if (t.kind === 'drums') { n = [0, 2, 4, 5, 7, 9, 11, 12].indexOf(off); if (n < 0) return; }   // A S D F G H J K play the eight pads
      else { const lo = KINDS[t.kind].low + App.octave * 12; n = lo - ((lo % 12) + 12) % 12 + off; }
      e.preventDefault(); Live.on('kb' + e.code, App.track, n, 0.85);
      const el = document.querySelector(`#surface [data-m="${n}"]`); if (el) el.classList.add('down');
    });
    addEventListener('keyup', (e) => { if (this.map[e.code] === undefined) return; Live.off('kb' + e.code); document.querySelectorAll('#surface .down').forEach(el => el.classList.remove('down')); });
  },
};
/* ---------- sharing and exporting ---------- */
const Share = {
  async link() {
    const url = location.href.split('#')[0] + '#s=' + packSong(App.song);
    try { await navigator.clipboard.writeText(url); toast('Link copied. Anyone who opens it hears this song.'); }
    catch (e) { Sheets.open('Link to this song', h('textarea.sel', { rows: 4, style: { width: '100%' }, readonly: true }, url), h('p', { style: { margin: 0, fontSize: '12px', color: 'var(--mute)' } }, 'Copy this and send it. Opening it loads the song.')); }
  },
  /* the song's order: Song mode plays the scenes that have something in them; Loop mode plays this scene twice */
  order(song) { if (!song.chain) return [App.scene, App.scene]; const o = []; for (let s = 0; s < SCENES; s++) if (sceneHas(song, s)) o.push(s); return o.length ? o : [App.scene]; },
  async wav() {
    const C = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!C) { toast('This browser cannot render audio offline.'); return; }
    const song = App.song, order = this.order(song), sd = 60 / song.bpm / 4, steps = song.bars * 16, len = order.length * steps * sd + 3, rate = 44100;
    toast('Rendering ' + Math.round(len) + ' seconds of audio...');
    await new Promise(r => setTimeout(r, 30));
    const ctx = new C(2, Math.ceil(len * rate), rate), E = new Engine(ctx, true); E.mix(song);
    order.forEach((sc, k) => { for (let st = 0; st < steps; st++) { const t = 0.05 + (k * steps + st) * sd, tt = t + (st % 2 === 1 ? song.swing * sd * 0.66 : 0); song.tracks.forEach((tr, i) => { for (const n of tr.pats[sc]) if (n.s === st) E.play(song, i, n, tt, n.l * sd * 0.96); }); } });
    const buf = await ctx.startRendering(), blob = this.encode(buf), a = h('a', { href: URL.createObjectURL(blob), download: (song.title || 'jam').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() + '.wav' });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    toast('Saved ' + a.download + ' (' + (blob.size / 1048576).toFixed(1) + ' MB)');
  },
  encode(buf) {   // 16-bit stereo PCM
    const n = buf.length, L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L, out = new DataView(new ArrayBuffer(44 + n * 4));
    const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
    out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * 4, true);
    for (let i = 0, o = 44; i < n; i++, o += 4) { out.setInt16(o, Math.max(-1, Math.min(1, L[i])) * 32767, true); out.setInt16(o + 2, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
    return new Blob([out], { type: 'audio/wav' });
  },
};
