/* ============================================================
   The window manager: windows you can drag, resize, minimise and
   maximise; the taskbar; the Start menu; dialogs; desktop icons.
   ============================================================ */
const APPS = {};   // filled in by each program's file
const APP_ORDER = ['explorer', 'notepad', 'paint', 'mines', 'solitaire', 'snake', 'terminal', 'browser', 'music', 'chat', 'settings', 'help'];
const APPS_LIST = () => APP_ORDER.filter(id => APPS[id]).map(id => Object.assign({ id }, APPS[id]));
const SVG = {
  min: '<svg viewBox="0 0 10 10"><rect x="1" y="7" width="6" height="2" fill="currentColor"/></svg>',
  max: '<svg viewBox="0 0 10 10"><path d="M1 1h8v8H1z M1 1h8v2H1z" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="1" y="1" width="8" height="2" fill="currentColor"/></svg>',
  restore: '<svg viewBox="0 0 10 10"><path d="M3 1h6v6H3z M1 3h6v6H1z" fill="#c3c3c3" stroke="currentColor" stroke-width="1"/><rect x="3" y="1" width="6" height="1.6" fill="currentColor"/><rect x="1" y="3" width="6" height="1.6" fill="currentColor"/></svg>',
  close: '<svg viewBox="0 0 10 10"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.8"/></svg>',
};
const WM = {
  wins: [], z: 100, seq: 0, active: null,
  desk() { return $('#desk'); },
  bounds() { const r = this.desk().getBoundingClientRect(); return { w: r.width, h: r.height, x: r.left, y: r.top }; },
  open(id, args = {}) {
    const app = APPS[id]; if (!app) return null;
    if (app.single) { const w = this.wins.find(x => x.app === id); if (w) { if (args && app.reopen) app.reopen(w, args); this.focus(w); return w; } }
    let pos = {};
    if (app.center) { const b = this.bounds(), w = Math.min(app.w, b.w - 8), hh = Math.min(app.h, b.h - 8); pos = { x: Math.max(0, (b.w - w) / 2), y: Math.max(0, (b.h - hh) / 2.6) }; }
    const win = this.create(Object.assign({ title: app.title, icon: app.icon, w: app.w, h: app.h, app: id, resizable: app.resizable !== false, minW: app.minW, minH: app.minH, max: app.max }, pos));
    win.hosted = !!app.hosted;
    try { app.open(win, args); } catch (e) { console.error(e); this.close(win); this.alert('Program error', `${app.title} has performed an illegal operation and will be shut down.\n\n(${e.message})`, 'err'); return null; }
    Sound.whoosh(true);
    return win;
  },
  create(o) {
    const b = this.bounds(), narrow = isNarrow();
    const w = Math.min(o.w || 440, b.w - 8), hh = Math.min(o.h || 320, b.h - 8);
    const k = this.seq++ % 8;
    const x = o.x !== undefined ? o.x : clamp(28 + k * 26 + (b.w > 1100 ? 120 : 0), 0, Math.max(0, b.w - w)), y = o.y !== undefined ? o.y : clamp(18 + k * 22, 0, Math.max(0, b.h - hh));
    const el = h('div.win', { role: 'dialog', 'aria-label': o.title, style: { left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px' } });
    const ico = Icons.img(o.icon || 'app', 16);
    const title = h('span.tt', o.title);
    const bMin = h('button.tbb', { 'aria-label': 'Minimise', html: SVG.min }), bMax = h('button.tbb', { 'aria-label': 'Maximise', html: SVG.max }), bX = h('button.tbb.x', { 'aria-label': 'Close', html: SVG.close });
    const tb = h('div.tb', ico, title, bMin, o.resizable === false ? null : bMax, bX);
    const body = h('div.wbody');
    el.append(tb, body);
    const win = { id: 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), el, tb, body, titleEl: title, app: o.app, icon: o.icon, title: o.title, onClose: null, onResize: null, min: false, minW: o.minW || 220, minH: o.minH || 140 };
    if (o.resizable !== false) { const g = h('div.grip', { 'aria-hidden': 'true' }); el.append(g); this.resizer(win, g); }
    this.dragger(win);
    onTap(bMin, (e) => { e.stopPropagation(); Sound.click(); this.minimize(win); });
    onTap(bMax, (e) => { e.stopPropagation(); Sound.click(); this.toggleMax(win); });
    onTap(bX, (e) => { e.stopPropagation(); Sound.click(); this.tryClose(win); });
    tb.addEventListener('dblclick', (e) => { if (o.resizable !== false && !e.target.closest('button')) this.toggleMax(win); });
    el.addEventListener('pointerdown', () => this.focus(win), true);
    this.desk().append(el); this.wins.push(win);
    if ((narrow || o.max) && o.resizable !== false) this.toggleMax(win, true);
    this.focus(win);
    return win;
  },
  setTitle(win, t) { win.title = t; win.titleEl.textContent = t; win.el.setAttribute('aria-label', t); this.renderTasks(); },
  focus(win) {
    if (!win) return;
    if (win.min) { win.min = false; win.el.classList.remove('min'); }
    win.el.style.zIndex = ++this.z; this.active = win;
    for (const w of this.wins) w.el.classList.toggle('inactive', w !== win);
    this.renderTasks();
  },
  minimize(win) { win.min = true; win.el.classList.add('min'); Sound.whoosh(false); const next = this.wins.filter(w => !w.min && w !== win).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)[0]; if (next) this.focus(next); else { this.active = null; this.renderTasks(); } },
  toggleMax(win, force) {
    const on = force !== undefined ? force : !win.el.classList.contains('max');
    win.el.classList.toggle('max', on);
    const b = win.tb.querySelectorAll('.tbb')[1]; if (b && b.getAttribute('aria-label') !== 'Close') { b.innerHTML = on ? SVG.restore : SVG.max; b.setAttribute('aria-label', on ? 'Restore' : 'Maximise'); }
    if (win.onResize) requestAnimationFrame(() => win.onResize());
  },
  close(win) {
    if (!win || !this.wins.includes(win)) return;
    try { if (win.onClose) win.onClose(); } catch (e) { console.error(e); }
    win.el.remove(); this.wins = this.wins.filter(w => w !== win);
    if (this.active === win) { this.active = null; const top = this.wins.filter(w => !w.min).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)[0]; if (top) this.focus(top); }
    this.renderTasks();
  },
  closeAll() { for (const w of [...this.wins]) this.close(w); },
  tryClose(win) { if (win.beforeClose) Promise.resolve(win.beforeClose()).then(ok => { if (ok) this.close(win); }); else this.close(win); },
  dragger(win) {
    let sx, sy, ox, oy, on = false;
    win.tb.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || win.el.classList.contains('max')) return;
      on = true; sx = e.clientX; sy = e.clientY; ox = win.el.offsetLeft; oy = win.el.offsetTop; win.tb.setPointerCapture(e.pointerId); document.body.classList.add('dragging');
    });
    win.tb.addEventListener('pointermove', (e) => {
      if (!on) return; const b = this.bounds();
      win.el.style.left = clamp(ox + e.clientX - sx, 60 - win.el.offsetWidth, b.w - 60) + 'px';
      win.el.style.top = clamp(oy + e.clientY - sy, 0, b.h - 24) + 'px';
    });
    const end = () => { on = false; document.body.classList.remove('dragging'); };
    win.tb.addEventListener('pointerup', end); win.tb.addEventListener('pointercancel', end);
  },
  resizer(win, g) {
    let sx, sy, ow, oh, on = false;
    g.addEventListener('pointerdown', (e) => { e.stopPropagation(); on = true; document.body.classList.add('dragging'); sx = e.clientX; sy = e.clientY; ow = win.el.offsetWidth; oh = win.el.offsetHeight; g.setPointerCapture(e.pointerId); });
    g.addEventListener('pointermove', (e) => {
      if (!on) return; const b = this.bounds();
      win.el.style.width = clamp(ow + e.clientX - sx, win.minW, b.w - win.el.offsetLeft) + 'px';
      win.el.style.height = clamp(oh + e.clientY - sy, win.minH, b.h - win.el.offsetTop) + 'px';
      if (win.onResize) win.onResize();
    });
    g.addEventListener('pointerup', () => { on = false; document.body.classList.remove('dragging'); if (win.onResize) win.onResize(); });
  },
  /* a menu bar: [{label, items: [{label, key, action, disabled, check} | '-']}] */
  menubar(win, spec) {
    const bar = h('div.menubar', { role: 'menubar' }); let openDd = null, openBtn = null;
    const shut = () => { if (openDd) { openDd.remove(); openBtn.classList.remove('open'); openDd = openBtn = null; document.removeEventListener('pointerdown', outside, true); } };
    const outside = (e) => { if (!bar.contains(e.target) && !(openDd && openDd.contains(e.target))) shut(); };
    for (const m of spec) {
      const btn = h('button', { text: m.label, 'aria-haspopup': 'menu' });
      btn.onclick = () => {
        const was = openBtn === btn; shut(); if (was) return;
        const items = typeof m.items === 'function' ? m.items() : m.items;
        const dd = h('div.dropdown', { role: 'menu' }, items.map(it => it === '-' ? h('hr.groove') : h('button', { role: 'menuitem', disabled: !!it.disabled, on: { click: () => { shut(); Sound.click(); it.action && it.action(); } } }, h('span', (it.check ? '✓ ' : '') + it.label), it.key ? h('small', it.key) : null)));
        dd.style.left = btn.offsetLeft + 'px'; dd.style.top = (btn.offsetTop + btn.offsetHeight) + 'px';
        bar.append(dd); openDd = dd; openBtn = btn; btn.classList.add('open');
        setTimeout(() => document.addEventListener('pointerdown', outside, true));
      };
      bar.append(btn);
    }
    win.body.before(bar);
    return bar;
  },
  /* a little modal-ish message box; resolves with the label of the button pressed */
  ask(title, text, buttons = ['OK'], icon = 'info', input = null) {
    return new Promise(res => {
      const b = this.bounds(), w = Math.min(380, b.w - 16);
      const win = this.create({ title, icon, w, h: input ? 196 : 168, resizable: false, x: (b.w - w) / 2, y: Math.max(0, b.h / 2 - 110) });
      let field = null;
      const p = h('div', text.split('\n').map(line => h('p', line)));
      if (input) { field = h('input.field', { type: input.type || 'text', value: input.value || '', 'aria-label': input.label || title, style: { width: '100%', boxSizing: 'border-box' } }); p.append(field); }
      const done = (v) => { win.onClose = null; this.close(win); res(v); };
      const btns = buttons.map((t, k) => h('button.btn' + (k === 0 ? '.def' : ''), { text: t, on: { click: () => done(input ? (t === buttons[0] ? field.value : null) : t) } }));
      win.body.append(h('div.dlg', Icons.img(icon), p), h('div.dlgbtns', btns));
      win.onClose = () => res(input ? null : buttons[buttons.length - 1]);
      win.body.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); btns[0].click(); } if (e.key === 'Escape') { e.preventDefault(); done(input ? null : buttons[buttons.length - 1]); } });
      setTimeout(() => (field || btns[0]).focus(), 30);
      if (icon === 'err' || icon === 'warn') Sound.ding(); else Sound.chord();
      requestAnimationFrame(() => { const hgt = [...win.body.children].reduce((s, c) => s + c.offsetHeight, 0) + win.tb.offsetHeight + 10; win.el.style.height = Math.min(b.h - 8, Math.max(120, hgt)) + 'px'; });
    });
  },
  alert(title, text, icon = 'info') { return this.ask(title, text, ['OK'], icon); },
  prompt(title, text, value = '', type = 'text') { return this.ask(title, text, ['OK', 'Cancel'], 'run', { value, type }); },
  /* right-click menus */
  ctx(x, y, items) {
    $$('.ctx').forEach(c => c.remove());
    const b = this.bounds();
    const m = h('div.dropdown.ctx', { role: 'menu' }, items.map(it => it === '-' ? h('hr.groove') : h('button', { role: 'menuitem', disabled: !!it.disabled, on: { click: () => { m.remove(); Sound.click(); it.action && it.action(); } } }, h('span', it.label))));
    m.style.left = clamp(x - b.x, 0, b.w - 170) + 'px'; m.style.top = clamp(y - b.y, 0, b.h - items.length * 24 - 8) + 'px';
    this.desk().append(m); m.style.zIndex = 9200;
    setTimeout(() => document.addEventListener('pointerdown', function off(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); } }, true));
  },
  /* the taskbar buttons follow the open windows */
  renderTasks() {
    const box = $('#tasks'); if (!box) return;
    box.replaceChildren(...this.wins.map(w => {
      const b = h('button.task' + (w === this.active && !w.min ? '.on' : ''), { role: 'listitem', title: w.title, 'aria-label': w.title }, Icons.img(w.icon || 'app', 16), h('span', w.title));
      onTap(b, () => { Sound.click(); if (w === this.active && !w.min) this.minimize(w); else this.focus(w); });
      return b;
    }));
  },
};

/* ---------- desktop icons ---------- */
const Desktop = {
  items: [
    { label: 'My Computer', icon: 'computer', open: () => WM.open('explorer', { path: 'C:' }) },
    { label: 'My Documents', icon: 'docs', open: () => WM.open('explorer', { path: 'C:\\My Documents' }) },
    { label: 'Recycle Bin', icon: () => FS.bin.length ? 'binfull' : 'bin', open: () => WM.open('explorer', { path: 'BIN' }) },
    { label: 'Torch', icon: 'globe', open: () => WM.open('browser') },
    { label: 'Smoke Signals', icon: 'chat', open: () => WM.open('chat') },
    { label: 'Paint', icon: 'paint', open: () => WM.open('paint') },
    { label: 'Minesweeper', icon: 'mines', open: () => WM.open('mines') },
    { label: 'Solitaire', icon: 'cards', open: () => WM.open('solitaire') },
    { label: 'Snake', icon: 'snake', open: () => WM.open('snake') },
    { label: 'MixBurner', icon: 'music', open: () => WM.open('music') },
    { label: 'Command Prompt', icon: 'terminal', open: () => WM.open('terminal') },
    { label: 'readme.txt', icon: 'txt', open: () => WM.open('notepad', { path: 'C:\\My Documents\\readme.txt' }) },
  ],
  render() {
    const box = $('#icons'); box.replaceChildren();
    this.items.forEach((it, k) => {
      const ic = typeof it.icon === 'function' ? it.icon() : it.icon;
      const b = h('button.icon', { role: 'listitem', 'aria-label': it.label }, Icons.img(ic), h('span', it.label));
      const launch = () => { const t = Date.now(); if (t - (b._t || 0) < 800) return; b._t = t; Sound.click(); it.open(); };   // one tap or one double-click opens it once
      b.addEventListener('click', () => { $$('.icon.sel').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); if (isTouch()) launch(); });
      b.addEventListener('dblclick', () => { if (!isTouch()) launch(); });
      b.addEventListener('pointerdown', (e) => { b._p = e.pointerType === 'mouse' ? null : [e.clientX, e.clientY]; });
      b.addEventListener('pointerup', (e) => { const p = b._p; b._p = null; if (p && Math.hypot(e.clientX - p[0], e.clientY - p[1]) < 12) { TapShield.until = Date.now() + 450; $$('.icon.sel').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); launch(); } });
      b.addEventListener('keydown', (e) => { if (e.key === 'Enter') it.open(); });
      box.append(b);
    });
  },
  init() {
    this.render();
    const desk = $('#desk');
    desk.addEventListener('pointerdown', (e) => { if (e.target === desk || e.target.id === 'wall' || e.target.id === 'icons') $$('.icon.sel').forEach(x => x.classList.remove('sel')); });
    desk.addEventListener('contextmenu', (e) => {
      if (!(e.target === desk || e.target.id === 'wall' || e.target.id === 'icons')) return;
      e.preventDefault();
      WM.ctx(e.clientX, e.clientY, [
        { label: 'Refresh', action: () => { this.render(); Wall.paint(); } },
        { label: 'Change wallpaper', action: () => WM.open('settings', { tab: 'bg' }) },
        '-',
        { label: 'New text document', action: async () => { const name = await WM.prompt('New text document', 'Name for the new file (it goes in My Documents):', 'New Text Document.txt'); if (!name) return; const dir = FS.resolve('C:\\My Documents'); const n = FS.uniqueName(dir, /\.txt$/i.test(name) ? name : name + '.txt'); FS.write('C:\\My Documents\\' + n, { kind: 'txt', text: '' }); WM.open('notepad', { path: 'C:\\My Documents\\' + n }); } },
        { label: 'Properties', action: () => WM.open('settings') },
      ]);
    });
  },
};

/* ---------- Start menu and tray ---------- */
const Start = {
  open: false,
  build() {
    const menu = $('#startmenu');
    const progs = APPS_LIST().filter(a => !['help', 'settings', 'explorer'].includes(a.id));
    const item = (icon, label, fn, small, extra) => { const b = h('button.smi' + (small ? '.small' : ''), { role: 'menuitem' }, Icons.img(icon, small ? 16 : 32), h('span', label), extra || null); b.onclick = (e) => { e.stopPropagation(); if (fn) { this.toggle(false); Sound.click(); fn(); } }; return b; };
    const progItem = item('folder', 'Programs', null, false, h('span.arrow', '▸'));
    const sub = h('div.submenu', { hidden: true, role: 'menu' }, progs.map(a => item(a.icon, a.title, () => WM.open(a.id), true)));
    progItem.append(sub);
    const showSub = () => {   // keep the list on screen: slide it up above the taskbar, and scroll it if it is still too tall
      sub.hidden = false; progItem.classList.add('open'); sub.style.top = '0px'; sub.style.maxHeight = ''; sub.style.overflowY = '';
      const limit = $('#taskbar').getBoundingClientRect().top - 2, r = sub.getBoundingClientRect();
      if (r.bottom > limit) { sub.style.top = -Math.min(r.bottom - limit, r.top - 4) + 'px'; const r2 = sub.getBoundingClientRect(); if (r2.bottom > limit) { sub.style.maxHeight = Math.max(120, limit - r2.top) + 'px'; sub.style.overflowY = 'auto'; } }
    };
    progItem.addEventListener('pointerenter', () => { showSub(); progItem._shownAt = Date.now(); }); progItem.addEventListener('click', (e) => { e.stopPropagation(); if (Date.now() - (progItem._shownAt || 0) < 500) return; sub.hidden ? showSub() : (sub.hidden = true); });
    const items = h('div.items',
      progItem,
      item('docs', 'Documents', () => WM.open('explorer', { path: 'C:\\My Documents' })),
      item('display', 'Settings', () => WM.open('settings')),
      item('help', 'Help', () => WM.open('help')),
      item('run', 'Run...', () => this.run()),
      h('hr.groove'),
      item('power', 'Shut Down...', () => Boot.askShutdown()));
    for (const b of items.children) if (b !== progItem) b.addEventListener('pointerenter', () => { sub.hidden = true; progItem.classList.remove('open'); });
    menu.replaceChildren(h('div.side', h('b', 'Burn', h('i', 'ware'))), items);
  },
  toggle(v) {
    this.open = v !== undefined ? v : !this.open;
    $('#startmenu').hidden = !this.open; $('#start').classList.toggle('on', this.open); $('#start').setAttribute('aria-expanded', String(this.open));
    if (this.open) { this.build(); Sound.click(); }
  },
  async run() {
    const v = await WM.prompt('Run', 'Type the name of a program, folder or web page, and Burnware will open it for you.', 'burn://home');
    if (!v) return;
    const s = v.trim().toLowerCase(), alias = { notepad: 'notepad', paint: 'paint', mspaint: 'paint', minesweeper: 'mines', mines: 'mines', winmine: 'mines', solitaire: 'solitaire', sol: 'solitaire', snake: 'snake', cmd: 'terminal', command: 'terminal', terminal: 'terminal', prompt: 'terminal', browser: 'browser', navigator: 'browser', torch: 'browser', music: 'music', mixburner: 'music', kuboamp: 'music', amp: 'music', chat: 'chat', smoke: 'chat', signals: 'chat', studio: 'studio', burnstudio: 'studio', garageband: 'studio', sudoku: 'sudoku', numberplace: 'sudoku', tetris: 'blocks', blockfall: 'blocks', blocks: 'blocks', wordle: 'words', fiveletters: 'words', words: 'words', typing: 'typing', typingracer: 'typing', typeracer: 'typing', mavis: 'typing', spider: 'spider', spidersolitaire: 'spider', time: 'datetime', date: 'datetime', clock: 'datetime', timemachine: 'datetime', news: 'browser', kubochat: 'chat', omnigacha: 'omni', gacha: 'omni', pebble: 'pebble', pebbledash: 'pebble', rally: 'pebble', wrc: 'pebble', wrc1988: 'pebble', 'wrc 1988': 'pebble', sizzle: 'sizzle', sizzlesand: 'sizzle', sand: 'sizzle', video: 'video', mediaplayer: 'video', 'rain.wav': 'rainwav', rainwav: 'rainwav', kaiju: 'kaiju', settings: 'settings', control: 'settings', help: 'help', explorer: 'explorer' };
    if (alias[s]) WM.open(alias[s]);
    else if (/^(c:|c:\\)/i.test(s)) { const n = FS.resolve(v.trim()); if (n && n.type === 'dir') WM.open('explorer', { path: v.trim() }); else if (n) Files.openFile(v.trim()); else WM.alert('Run', `Cannot find the file '${v}'. Make sure you typed the name correctly, and then try again.`, 'err'); }
    else if (/^(https?:|www\.|burn:)/.test(s) || s.includes('.')) WM.open('browser', { url: v.trim() });
    else WM.alert('Run', `Cannot find the file '${v}' (or one of its components). Make sure the path and file name are correct and that all required libraries are available.`, 'err');
  },
  init() {
    $('#startIco').src = Icons.url('flame', 1);
    onTap($('#start'), (e) => { e.stopPropagation(); Sound.init(); this.toggle(); });
    document.addEventListener('pointerdown', (e) => { if (this.open && !e.target.closest('#startmenu') && !e.target.closest('#start')) this.toggle(false); });
    const vol = $('#vol'), setVol = () => { $('#volIco').src = Icons.url(Store.data.sound ? 'vol' : 'mute', 1); vol.setAttribute('aria-label', Store.data.sound ? 'Sound on' : 'Sound off'); };
    vol.onclick = () => { Store.data.sound = !Store.data.sound; Store.save(); Sound.setOn(Store.data.sound); setVol(); Music.setMuted && Music.setMuted(!Store.data.sound); if (Store.data.sound) Sound.click(); };
    setVol(); Sound.setOn(Store.data.sound);
    $('#netIco').src = Icons.url('net', 1);
    $('#net').onclick = () => WM.alert('Dial-up Networking', 'Connected to SparkNet at 56,600 bps.\nDuration: forever.\nBytes received: a lot of animated GIFs.', 'info');
    const ck = $('#clock'); ck.setAttribute('role', 'button'); ck.tabIndex = 0; ck.setAttribute('aria-label', 'Clock. Opens the time machine');
    onTap(ck, () => { Sound.click(); WM.open('datetime'); }); ck.addEventListener('keydown', (e) => { if (e.key === 'Enter') WM.open('datetime'); });
    Clock.tick(); setInterval(() => Clock.tick(), 10000);
  },
};
