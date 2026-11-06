/* ============================================================
   The panels: transport and LCD, scenes, tracks, the editor bar,
   and the grid where notes live. Tap a square to add a note, drag
   to paint (or to stretch a note longer), tap a note to remove it.
   ============================================================ */
const UI = {
  rows: [], cols: [], headAt: -1,
  init() {
    const hold = (el, fn) => { let iv = null, to = null; const stop = () => { clearTimeout(to); clearInterval(iv); }; el.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); to = setTimeout(() => { iv = setInterval(fn, 70); }, 380); }); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, stop); };
    $('#bPlay').onclick = () => { if (Seq.playing) Seq.stop(); else Seq.start(); };
    $('#bStop').onclick = () => { Seq.stop(); App.rec = false; UI.transport(); };
    $('#bRec').onclick = () => { App.rec = !App.rec; if (App.rec && !Seq.playing) Seq.start(); UI.transport(); toast(App.rec ? 'Recording: play the keys or pads and it lands on the grid' : 'Recording off'); };
    hold($('#bpmDn'), () => this.bpm(-1)); hold($('#bpmUp'), () => this.bpm(1));
    $('#bMetro').onclick = () => { App.song.metro = !App.song.metro; App.changed(); UI.transport(); };
    $('#bMenu').onclick = (e) => { e.stopPropagation(); Menu.song($('#bMenu')); };
    this.wireGrid();
    addEventListener('keydown', (e) => { if (e.target.closest('input, textarea, select')) return; if (e.code === 'Space') { e.preventDefault(); $('#bPlay').click(); } });
  },
  bpm(d) { App.song.bpm = clamp(App.song.bpm + d, 50, 200); $('#bpmVal').textContent = App.song.bpm; App.changed(); this.lcd(); },
  all() { this.transport(); this.scenes(); this.tracks(); this.edbar(); this.grid(); Play.render(); this.lcd(); },
  transport() {
    const s = App.song; $('#bPlay').classList.toggle('on', Seq.playing); $('#bPlay').textContent = Seq.playing ? '❚❚' : '▶'; $('#bPlay').setAttribute('aria-label', Seq.playing ? 'Pause' : 'Play');
    $('#bRec').classList.toggle('on', App.rec); $('#bMetro').classList.toggle('on', s.metro); $('#bpmVal').textContent = s.bpm;
  },
  lcd() {
    const s = App.song, c = Seq.playing && Seq.cur ? Seq.cur : null, st = c ? c.step : 0;
    $('#lcdPos').textContent = `${Math.floor(st / 16) + 1}.${Math.floor(st % 16 / 4) + 1}.${st % 4 + 1}`;
    $('#lcdBpm').textContent = s.bpm + ' BPM'; $('#lcdKey').textContent = NOTE_NAMES[s.key] + ' ' + SCALES[s.scale].name;
    $('#lcdScene').textContent = s.chain ? 'SONG ' + 'ABCD'[c ? c.scene : App.scene] : 'SCENE ' + 'ABCD'[c ? c.scene : App.scene];
  },
  scenes() {
    const s = App.song, box = $('#scenes'), playing = Seq.playing && Seq.cur ? Seq.cur.scene : -1;
    box.replaceChildren(h('span.lbl', { style: { padding: '0 2px' } }, 'Scene'), ...[0, 1, 2, 3].map(k => {
      const b = h('button.sc' + (k === App.scene ? '.sel' : '') + (sceneHas(s, k) ? '.has' : '') + (k === playing ? '.playing' : ''), { 'aria-label': 'Scene ' + 'ABCD'[k], 'aria-pressed': String(k === App.scene) }, 'ABCD'[k]);
      b.onclick = () => App.setScene(k); return b;
    }), (() => { const b = h('button.btn' + (s.chain ? '.on' : ''), { title: 'Play the scenes one after another', style: { minHeight: '34px' } }, s.chain ? 'Song ▶▶' : 'Loop ⟳'); b.onclick = () => { s.chain = !s.chain; App.changed(); UI.scenes(); UI.lcd(); toast(s.chain ? 'Song mode: A, B, C, D in order (empty scenes are skipped)' : 'Loop mode: the scene you pick plays over and over'); }; return b; })());
  },
  tracks() {
    const s = App.song, box = $('#tracks');
    box.replaceChildren(...s.tracks.map((t, i) => {
      const K = KINDS[t.kind], m = h('b.m' + (t.mute ? '.on' : ''), { title: 'Mute', role: 'button' }, 'M'), so = h('b.s' + (t.solo ? '.on' : ''), { title: 'Solo', role: 'button' }, 'S');
      const b = h('button.trk' + (i === App.track ? '.sel' : ''), { style: { '--tc': K.color }, 'aria-pressed': String(i === App.track) }, h('i.dot'), h('span.nm', K.name), h('span.ms', m, so), h('span.pre', t.preset), h('span.vu', h('i')));
      b.style.setProperty('--tc', K.color);
      b.onclick = (e) => { if (e.target === m) { t.mute = !t.mute; } else if (e.target === so) { t.solo = !t.solo; } else { App.pick(i); return; } Audio.eng && Audio.eng.mix(s); App.changed(); UI.tracks(); };
      return b;
    }));
  },
  edbar() {
    const s = App.song, t = s.tracks[App.track], K = KINDS[t.kind], bar = $('#edbar');
    const pre = h('select.sel', { 'aria-label': 'Sound' }, K.presets.map(p => { const o = h('option', p); o.value = p; if (p === t.preset) o.selected = true; return o; }));
    pre.onchange = () => { t.preset = pre.value; App.changed(); UI.tracks(); };
    const slider = (label, val, fn) => { const r = h('input', { type: 'range', min: 0, max: 100, value: Math.round(val * 100), 'aria-label': label, style: { width: '80px', accentColor: 'var(--acc)' } }); r.oninput = () => { fn(r.value / 100); Audio.eng && Audio.eng.mix(s); App.changed(); }; return h('label', { style: { display: 'flex', alignItems: 'center', gap: '4px' } }, h('span.lbl', label), r); };
    const kids = [h('b', { style: { color: K.color, letterSpacing: '.06em' } }, K.name.toUpperCase()), pre, slider('Vol', t.vol, v => { t.vol = v; }), slider('Verb', t.rev, v => { t.rev = v; })];
    if (s.bars > 1) kids.push(h('div.seg', { role: 'group', 'aria-label': 'Bar' }, Array.from({ length: s.bars }, (_, k) => { const b = h('button' + (k === App.bar ? '.on' : ''), 'Bar ' + (k + 1)); b.onclick = () => { App.bar = k; UI.edbar(); UI.grid(); }; return b; })));
    if (t.kind !== 'drums') kids.push(h('div.seg', { role: 'group', 'aria-label': 'Note length', title: 'How long a new note is' }, [[1, '1/16'], [2, '1/8'], [4, '1/4'], [8, '1/2']].map(([l, nm]) => { const b = h('button' + (l === App.len ? '.on' : ''), nm); b.onclick = () => { App.len = l; UI.edbar(); }; return b; })));
    kids.push(h('span.grow'));
    const clr = h('button.btn', { title: 'Clear this track in this scene' }, 'Clear'); let armed = 0;
    clr.onclick = () => { if (Date.now() - armed < 2500) { t.pats[App.scene] = []; App.changed(); UI.grid(); clr.textContent = 'Clear'; toast(K.name + ' cleared in scene ' + 'ABCD'[App.scene]); return; } armed = Date.now(); clr.textContent = 'Sure?'; setTimeout(() => { clr.textContent = 'Clear'; }, 2500); };
    const dup = h('button.btn', { title: 'Copy every track of this scene into the next scene' }, 'Copy → ' + 'ABCD'[(App.scene + 1) % SCENES]);
    dup.onclick = () => { const to = (App.scene + 1) % SCENES; s.tracks.forEach(tr => { tr.pats[to] = tr.pats[App.scene].map(n => ({ ...n })); }); App.changed(); toast('Scene ' + 'ABCD'[App.scene] + ' copied into ' + 'ABCD'[to]); };
    const lp = h('button.btn', { title: 'Ready-made loops in your key' }, '♪ Loops'); lp.onclick = () => Loops.sheet();
    kids.push(lp, clr, dup);
    bar.replaceChildren(...kids);
  },
  grid() {
    const s = App.song, t = s.tracks[App.track], drums = t.kind === 'drums', b0 = App.bar * 16, g = $('#grid'), pat = t.pats[App.scene];
    g.style.setProperty('--tc', KINDS[t.kind].color);
    const rows = this.rows = drums ? LANES.map((l, i) => ({ n: i, label: l[0], color: l[1] })) : scaleRows(t.kind, s).map(m => ({ n: m, label: noteName(m), root: ((m - s.key) % 12 + 12) % 12 === 0 }));
    const at = (el, r, c) => { el.style.gridRow = String(r); el.style.gridColumn = String(c); return el; };   // every square has a fixed place, so notes laid on top can't push them around
    const kids = [at(h('div'), 1, 1)]; for (let c = 0; c < 16; c++) kids.push(at(h('div.stepnum.q' + (Math.floor(c / 4) + 1), String(c + 1)), 1, c + 2));
    this.cols = Array.from({ length: 16 }, () => []);
    rows.forEach((r, ri) => {
      kids.push(at(h('div.rowlbl' + (r.root ? '.root' : ''), { style: drums ? { color: r.color } : null }, drums ? r.label.replace('Closed hat', 'Hat').replace('Open hat', 'Open') : r.label), ri + 2, 1));
      for (let c = 0; c < 16; c++) {
        const cell = h('div.cell' + (c % 4 === 0 ? '.beat' : '') + (r.root ? '.rootrow' : ''), { 'data-r': ri, 'data-c': c, role: 'gridcell' });
        if (drums && pat.some(n => n.n === r.n && n.s === b0 + c)) { cell.classList.add('on'); cell.style.setProperty('--tc', r.color); }
        at(cell, ri + 2, c + 2); this.cols[c].push(cell); kids.push(cell);
      }
    });
    if (!drums) for (const n of pat) { const el = this.noteEl(n, rows, b0); if (el) kids.push(el); }
    g.replaceChildren(...kids); this.headAt = -1;
  },
  noteEl(n, rows = this.rows, b0 = App.bar * 16) {
    const ri = rows.findIndex(r => r.n === n.n); if (ri < 0) return null;
    const c0 = n.s - b0, cs = Math.max(0, c0), ce = Math.min(16, c0 + n.l); if (ce <= cs) return null;
    const el = h('div.note', { style: { gridColumn: `${cs + 2} / span ${ce - cs}`, gridRow: String(ri + 2), position: 'relative', top: 'auto', bottom: 'auto', left: 'auto', margin: '2px 0', opacity: String(0.55 + n.v * 0.45) } });
    if (c0 < 0) el.style.borderTopLeftRadius = el.style.borderBottomLeftRadius = '0';
    if (c0 + n.l > 16) el.style.borderTopRightRadius = el.style.borderBottomRightRadius = '0';
    n._el = el; return el;
  },
  head(step) {
    const c = step < 0 ? -1 : step - App.bar * 16; if (c === this.headAt) return;
    if (this.headAt >= 0 && this.cols[this.headAt]) for (const el of this.cols[this.headAt]) el.classList.remove('head');
    this.headAt = c >= 0 && c < 16 ? c : -1;
    if (this.headAt >= 0) for (const el of this.cols[this.headAt]) el.classList.add('head');
  },
  wireGrid() {
    const g = $('#grid'); let drag = null;
    const at = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.classList.contains('cell') && g.contains(el) ? { r: +el.dataset.r, c: +el.dataset.c, el } : null; };
    const preview = (t, i, n) => { const E = Audio.ensure(); if (!E) return; E.mix(App.song); E.play(App.song, i, { n, v: 0.8 }, E.ctx.currentTime, 0.22); };
    g.addEventListener('pointerdown', (e) => {
      const p = at(e); if (!p) return; e.preventDefault(); try { g.setPointerCapture(e.pointerId); } catch (x) { /* ok */ }
      const s = App.song, t = s.tracks[App.track], pat = t.pats[App.scene], step = App.bar * 16 + p.c, row = this.rows[p.r], L = s.bars * 16;
      if (t.kind === 'drums') {
        const k = pat.findIndex(n => n.n === row.n && n.s === step);
        if (k >= 0) { pat.splice(k, 1); p.el.classList.remove('on'); drag = { mode: 'erase', seen: new Set([p.r + ':' + p.c]) }; }
        else { pat.push(N(step, row.n, 1, 0.9)); p.el.classList.add('on'); p.el.style.setProperty('--tc', row.color); preview(t, App.track, row.n); drag = { mode: 'add', seen: new Set([p.r + ':' + p.c]) }; }
      } else {
        const k = pat.findIndex(n => n.n === row.n && n.s <= step && step < n.s + n.l);
        if (k >= 0) { const [gone] = pat.splice(k, 1); if (gone._el) gone._el.remove(); drag = { mode: 'erase', seen: new Set() }; }
        else { const n = N(step, row.n, Math.min(App.len, L - step), 0.85); pat.push(n); const el = this.noteEl(n); if (el) g.append(el); preview(t, App.track, row.n); drag = { mode: 'stretch', note: n, r: p.r, c: p.c }; }
      }
      App.changed();
    });
    g.addEventListener('pointermove', (e) => {
      if (!drag) return; const p = at(e); if (!p) return;
      const s = App.song, t = s.tracks[App.track], pat = t.pats[App.scene], step = App.bar * 16 + p.c, row = this.rows[p.r];
      if (drag.mode === 'stretch') {
        if (p.r !== drag.r) return; const l = Math.max(1, p.c - drag.c + 1); if (l === drag.note.l) return;
        drag.note.l = l; if (drag.note._el) drag.note._el.remove(); const el = this.noteEl(drag.note); if (el) g.append(el); App.changed(); return;
      }
      const key = p.r + ':' + p.c; if (drag.seen.has(key)) return; drag.seen.add(key);
      if (t.kind === 'drums') {
        const k = pat.findIndex(n => n.n === row.n && n.s === step);
        if (drag.mode === 'add' && k < 0) { pat.push(N(step, row.n, 1, 0.9)); p.el.classList.add('on'); p.el.style.setProperty('--tc', row.color); preview(t, App.track, row.n); }
        else if (drag.mode === 'erase' && k >= 0) { pat.splice(k, 1); p.el.classList.remove('on'); }
      } else if (drag.mode === 'erase') { const k = pat.findIndex(n => n.n === row.n && n.s <= step && step < n.s + n.l); if (k >= 0) { const [gone] = pat.splice(k, 1); if (gone._el) gone._el.remove(); } }
      App.changed();
    });
    const end = () => { if (drag) { drag = null; App.changed(); } };
    g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
  },
  meters() { const E = Audio.eng; if (!E) return; document.querySelectorAll('#tracks .trk .vu i').forEach((el, i) => { el.style.width = Math.min(100, E.level(i) * 160) + '%'; }); },
};
/* the Song menu and its sheets */
const Menu = {
  open(anchor, items) {
    $$('.menu').forEach(m => m.remove());
    const m = h('div.menu', { role: 'menu' }, items.map(it => it === '-' ? h('hr') : (() => { const b = h('button', { role: 'menuitem' }, it[0]); b.onclick = () => { m.remove(); it[1](); }; return b; })()));
    document.body.append(m); const r = anchor.getBoundingClientRect(); m.style.top = Math.min(innerHeight - m.offsetHeight - 8, r.bottom + 4) + 'px'; m.style.left = Math.max(8, Math.min(innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth)) + 'px';
    setTimeout(() => document.addEventListener('pointerdown', function off(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); } }, true));
  },
  song(anchor) {
    const s = App.song;
    this.open(anchor, [
      ['Loop library for this track…', () => Loops.sheet()],
      ['Key, scale and loop length…', () => Sheets.key()],
      ['Swing: ' + Math.round(s.swing * 100) + '%', () => { s.swing = [0, 0.12, 0.25, 0.4][([0, 0.12, 0.25, 0.4].indexOf(s.swing) + 1) % 4] || 0; App.changed(); toast('Swing ' + Math.round(s.swing * 100) + '%'); }],
      '-',
      ['Share a link to this song…', () => Share.link()],
      ['Export as a WAV file', () => Share.wav()],
      '-',
      ['Load the demo song', () => { Seq.stop(); App.song = demoSong(); App.scene = 0; App.bar = 0; App.changed(true); toast('Demo loaded: press ▶'); }],
      ['Start a new empty song', () => { Seq.stop(); App.song = emptySong(); App.scene = 0; App.bar = 0; App.changed(true); toast('A clean slate'); }],
      ['How it works', () => Sheets.help()],
    ]);
  },
};
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const Sheets = {
  open(title, ...kids) {
    const close = () => sh.remove(), sh = h('div.sheet', { on: { pointerdown: (e) => { if (e.target === sh) close(); } } }, h('div.panel', { role: 'dialog', 'aria-label': title }, h('h3', title), ...kids, h('div.row', { style: { justifyContent: 'flex-end' } }, h('button.btn', { on: { click: () => close() } }, 'Done'))));
    document.body.append(sh); return close;
  },
  key() {
    const s = App.song;
    const keys = h('div.row', NOTE_NAMES.map((n, k) => { const b = h('button.btn' + (k === s.key ? '.on' : ''), { style: { minWidth: '42px' } }, n); b.onclick = () => { s.key = k; keys.querySelectorAll('button').forEach((x, j) => x.classList.toggle('on', j === k)); App.changed(true); }; return b; }));
    const sc = h('select.sel', Object.entries(SCALES).map(([id, v]) => { const o = h('option', v.name); o.value = id; if (id === s.scale) o.selected = true; return o; })); sc.onchange = () => { s.scale = sc.value; App.changed(true); };
    const bars = h('div.seg', [1, 2, 4].map(n => { const b = h('button' + (n === s.bars ? '.on' : ''), n + (n === 1 ? ' bar' : ' bars')); b.onclick = () => { s.bars = n; App.bar = 0; bars.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); App.changed(true); }; return b; }));
    const title = h('input.sel', { value: s.title, 'aria-label': 'Song title', maxlength: 60, style: { flex: 1 } }); title.oninput = () => { s.title = title.value; App.changed(); };
    this.open('Key, scale and loop', h('div.row', h('span.lbl', 'Title'), title), h('span.lbl', 'Key'), keys, h('div.row', h('span.lbl', 'Scale'), sc), h('div.row', h('span.lbl', 'Each scene loops'), bars), h('p', { style: { margin: 0, color: 'var(--mute)', fontSize: '12px' } }, 'The grid only shows notes in the scale, so whatever you tap fits. Changing the key keeps your notes where they are.'));
  },
  help() {
    this.open('How Burn Studio works',
      h('p', { style: { margin: 0, lineHeight: 1.45 } }, 'Pick a track (Drums, Bass, Keys, Synth) and tap squares on the grid to add notes. Drag to paint drums, or drag right to stretch a note. Tap a note again to remove it.'),
      h('p', { style: { margin: 0, lineHeight: 1.45 } }, 'Down below you can play it live: drum pads, a keyboard, or chord buttons in your key. Press ● to record what you play while it loops; it snaps to the beat.'),
      h('p', { style: { margin: 0, lineHeight: 1.45 } }, 'Scenes A to D are four versions of your loop (verse, chorus, break...). Tap one to switch on the next loop, or use Song ▶▶ to play them in order. Everything saves in this browser as you go; Song ☰ can share a link or export a WAV.'));
  },
};
