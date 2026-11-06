/* ============================================================
   The playing surface: eight drum pads, a keyboard you can slide
   across (dots mark the notes in your scale), and chord buttons
   that always fit the key. Several fingers at once are fine.
   ============================================================ */
const Play = {
  render() {
    const s = App.song, t = s.tracks[App.track], drums = t.kind === 'drums', bar = $('#playbar'), surf = $('#surface');
    const modes = drums ? ['pads'] : ['keys', 'chords'];
    if (!modes.includes(App.surface)) App.surface = modes[0];
    surf.style.setProperty('--tc', KINDS[t.kind].color);
    const tabs = h('div.seg', { role: 'group', 'aria-label': 'Play with' }, modes.map(m => { const b = h('button' + (m === App.surface ? '.on' : ''), { pads: 'Drum pads', keys: 'Keyboard', chords: 'Chords' }[m]); b.onclick = () => { App.surface = m; Play.render(); }; return b; }));
    const kids = [h('b', { style: { color: KINDS[t.kind].color, letterSpacing: '.06em' } }, 'PLAY ' + KINDS[t.kind].name.toUpperCase()), tabs];
    if (App.surface === 'keys') kids.push(h('div.knob', h('button.btn', { 'aria-label': 'Octave down', on: { click: () => { App.octave = clamp(App.octave - 1, -3, 3); Play.render(); } } }, '◀'), h('span', 'Oct ' + (App.octave >= 0 ? '+' : '') + App.octave), h('button.btn', { 'aria-label': 'Octave up', on: { click: () => { App.octave = clamp(App.octave + 1, -3, 3); Play.render(); } } }, '▶')));
    kids.push(h('span', { style: { flex: 1 } }), h('span.lbl', App.rec ? '● recording into scene ' + 'ABCD'[App.scene] : 'press ● to record'));
    bar.replaceChildren(...kids);
    Live.allOff();
    surf.replaceChildren(App.surface === 'pads' ? this.pads() : App.surface === 'keys' ? this.keys() : this.chords());
  },
  /* one pointer per finger: press, slide onto another key, lift */
  fingers(root, find, on, off) {
    const map = new Map();
    root.addEventListener('pointerdown', (e) => { const k = find(e); if (!k) return; e.preventDefault(); try { root.setPointerCapture(e.pointerId); } catch (x) { /* ok */ } map.set(e.pointerId, k); on(k, e.pointerId); });
    root.addEventListener('pointermove', (e) => { if (!map.has(e.pointerId)) return; const k = find(e); const was = map.get(e.pointerId); if (k && k !== was) { off(was, e.pointerId); map.set(e.pointerId, k); on(k, e.pointerId); } });
    const up = (e) => { const was = map.get(e.pointerId); if (was) { off(was, e.pointerId); map.delete(e.pointerId); } };
    root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up);
  },
  under(e, sel) { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.closest(sel); },
  pads() {
    const i = App.track, box = h('div.pads');
    LANES.forEach(([nm, col], lane) => box.append(h('div.pad', { style: { '--pc': col }, 'data-l': lane, role: 'button', 'aria-label': nm }, nm)));
    this.fingers(box, (e) => this.under(e, '.pad'), (p, id) => { p.classList.add('down'); Live.on('p' + id, i, +p.dataset.l, 0.95); }, (p, id) => { p.classList.remove('down'); Live.off('p' + id); });
    return box;
  },
  keys() {
    const s = App.song, i = App.track, t = s.tracks[i], wide = $('#surface').clientWidth || innerWidth, whites = wide > 1000 ? 22 : wide > 700 ? 15 : wide > 460 ? 11 : 8;
    const lo = KINDS[t.kind].low + App.octave * 12, start = lo - ((lo % 12) + 12) % 12, box = h('div.keys');   // start on a C
    const W = [0, 2, 4, 5, 7, 9, 11], blackAfter = { 0: 1, 2: 3, 5: 6, 7: 8, 9: 10 };
    const whiteNotes = []; for (let k = 0; whiteNotes.length < whites; k++) { const m = start + Math.floor(k / 7) * 12 + W[k % 7]; whiteNotes.push(m); }
    whiteNotes.forEach((m, k) => {
      const key = h('div.key' + (inScale(m, s) ? '.inscale' : ''), { 'data-m': m, role: 'button', 'aria-label': noteName(m) }, m % 12 === 0 ? noteName(m) : '');
      box.append(key);
      const pc = ((m % 12) + 12) % 12;
      if (blackAfter[pc] !== undefined && k < whiteNotes.length - 1) {
        const bm = m + 1, bk = h('div.key.black' + (inScale(bm, s) ? '.inscale' : ''), { 'data-m': bm, role: 'button', 'aria-label': noteName(bm) });
        bk.style.left = `calc(${(k + 1) / whiteNotes.length * 100}% - ${100 / whiteNotes.length * 0.32}%)`; bk.style.width = `${100 / whiteNotes.length * 0.64}%`;
        box.append(bk);
      }
    });
    this.fingers(box, (e) => this.under(e, '.key'), (k, id) => { k.classList.add('down'); Live.on('k' + id, i, +k.dataset.m, 0.8); }, (k, id) => { k.classList.remove('down'); Live.off('k' + id); });
    return box;
  },
  chords() {
    const s = App.song, i = App.track, t = s.tracks[i], set = chordSet(s), box = h('div.chords');
    const voice = (c) => {   // put the chord in this track's range; the bass just plays the root, an octave below too
      const lo = KINDS[t.kind].low, tones = c.tones.map(m => { let v = m; while (v < lo + (t.kind === 'bass' ? 0 : 3)) v += 12; while (v > lo + 19) v -= 12; return v; });
      return t.kind === 'bass' ? [tones[0], tones[0] + 12] : tones.sort((a, b) => a - b);
    };
    set.forEach((c, k) => box.append(h('div.chord', { 'data-k': k, role: 'button', 'aria-label': c.name + ' chord' }, c.name, h('small', c.roman))));
    this.fingers(box, (e) => this.under(e, '.chord'), (el, id) => { el.classList.add('down'); voice(set[+el.dataset.k]).forEach((m, j) => Live.on('c' + id + ':' + j, i, m, 0.7)); }, (el, id) => { el.classList.remove('down'); for (let j = 0; j < 5; j++) Live.off('c' + id + ':' + j); });
    return box;
  },
};
