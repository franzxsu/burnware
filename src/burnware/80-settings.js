/* ============================================================
   Wallpapers (painted in code), colour schemes, screen savers,
   and the Display Properties window that picks between them.
   ============================================================ */
const Gen = {
  sky(g, w, h, stops) { const gr = g.createLinearGradient(0, 0, 0, h); stops.forEach(([p, c]) => gr.addColorStop(p, c)); g.fillStyle = gr; g.fillRect(0, 0, w, h); },
  ridge(g, w, h, y0, amp, col, seed, rough = 0.5) {
    const R = mulberry(seed); g.fillStyle = col; g.beginPath(); g.moveTo(0, h);
    let y = y0; const pts = []; for (let x = 0; x <= w; x += 2) { y += (R() - 0.5) * amp * rough; y += (y0 - y) * 0.08; pts.push([x, y + Math.sin(x / w * 6.3 + seed) * amp * 0.5]); }
    pts.forEach(([x, yy]) => g.lineTo(x, yy)); g.lineTo(w, h); g.closePath(); g.fill();
  },
  hut(g, x, y, s) { for (let r = 0; r < SPR.kubo.length; r++) for (let c = 0; c < 16; c++) { const col = PAL[SPR.kubo[r][c]]; if (col) { g.fillStyle = col; g.fillRect(x + c * s, y + r * s, s, s); } } },
  terraces(g, w, h, gold) {
    this.sky(g, w, h, gold ? [[0, '#3a2a5a'], [0.35, '#e0784a'], [0.55, '#ffcf6a']] : [[0, '#6fa8d8'], [0.4, '#bcd8e8'], [0.56, '#f6e2b0']]);
    const sunY = h * 0.42; g.fillStyle = gold ? '#fff2b0' : '#fff8d8'; g.beginPath(); g.arc(w * 0.72, sunY, h * 0.06, 0, 7); g.fill();
    this.ridge(g, w, h, h * 0.46, h * 0.05, gold ? '#7a5a7a' : '#7f9fbf', 3); this.ridge(g, w, h, h * 0.52, h * 0.05, gold ? '#5a466a' : '#5f86a2', 7);
    // mist
    g.fillStyle = gold ? 'rgba(255,210,150,.35)' : 'rgba(255,255,255,.35)'; g.fillRect(0, h * 0.53, w, h * 0.03);
    // the terraces: curved bands stepping down the hillside
    const greens = gold ? ['#9a8a2a', '#b8a238', '#7f7a22', '#c8b048'] : ['#4f9a3a', '#6cb84a', '#3f8a32', '#82c85a'];
    for (let k = 0; k < 14; k++) {
      const y0 = h * 0.55 + k * h * 0.034 + k * k * 0.7, amp = h * (0.02 + k * 0.004), ph = k * 0.7;
      g.fillStyle = greens[k % 4]; g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 2) g.lineTo(x, y0 + Math.sin(x / w * 5 + ph) * amp + Math.sin(x / w * 13 + k) * amp * 0.25);
      g.lineTo(w, h); g.closePath(); g.fill();
      g.strokeStyle = gold ? 'rgba(255,230,160,.55)' : 'rgba(220,240,255,.6)'; g.lineWidth = 1; g.beginPath();
      for (let x = 0; x <= w; x += 2) { const yy = y0 + Math.sin(x / w * 5 + ph) * amp + Math.sin(x / w * 13 + k) * amp * 0.25; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke();
    }
    const s = Math.max(1, Math.round(h / 90)); this.hut(g, Math.round(w * 0.18), Math.round(h * 0.6), s);
  },
  clouds(g, w, h) {
    this.sky(g, w, h, [[0, '#2f6fc8'], [1, '#8fc4f0']]);
    const R = mulberry(11);
    for (let k = 0; k < 9; k++) { const cx = R() * w, cy = h * (0.12 + R() * 0.6), s = h * (0.05 + R() * 0.07); for (let j = 0; j < 7; j++) { const x = cx + (R() - 0.5) * s * 3.5, y = cy + (R() - 0.5) * s * 0.8, r = s * (0.6 + R() * 0.6); g.fillStyle = '#dfeaf6'; g.beginPath(); g.arc(x, y + r * 0.15, r, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x - r * 0.1, y, r * 0.9, 0, 7); g.fill(); } }
  },
  stars(g, w, h) {
    this.sky(g, w, h, [[0, '#050818'], [1, '#1a1840']]); const R = mulberry(5);
    for (let k = 0; k < w * h / 120; k++) { const b = 120 + R() * 135; g.fillStyle = `rgb(${b},${b},${Math.min(255, b + 30)})`; g.fillRect(Math.floor(R() * w), Math.floor(R() * h), 1, 1); }
    g.fillStyle = '#f4ecc8'; g.beginPath(); g.arc(w * 0.8, h * 0.22, h * 0.07, 0, 7); g.fill(); g.fillStyle = '#d8d0ac'; g.beginPath(); g.arc(w * 0.82, h * 0.2, h * 0.015, 0, 7); g.arc(w * 0.78, h * 0.25, h * 0.01, 0, 7); g.fill();
    this.ridge(g, w, h, h * 0.86, h * 0.04, '#0a0c1a', 9);
  },
  sunset(g, w, h) {
    this.sky(g, w, h, [[0, '#2a1a4a'], [0.45, '#d8566a'], [0.62, '#ffb35a']]);
    const sy = h * 0.6, r = h * 0.14; g.fillStyle = '#ffe07a'; g.beginPath(); g.arc(w / 2, sy, r, 0, 7); g.fill();
    g.fillStyle = '#ffb35a'; for (let k = 0; k < 5; k++) g.fillRect(w / 2 - r, sy - r * 0.1 + k * r * 0.22, r * 2, Math.max(1, r * 0.05 + k * 0.8));
    g.fillStyle = '#26315a'; g.fillRect(0, sy, w, h - sy);
    for (let y = sy + 2; y < h; y += 3) { const half = (r * 1.2) * (1 - (y - sy) / (h - sy) * 0.5); g.fillStyle = `rgba(255,${180 + Math.random() * 40},90,${0.55 - (y - sy) / (h - sy) * 0.4})`; g.fillRect(w / 2 - half * Math.random(), y, half * 2 * Math.random(), 1); }
  },
  kubo(g, w, h) {   // the picture in My Pictures: a hut in the rain
    this.sky(g, w, h, [[0, '#5a6f88'], [0.65, '#9fb2c2']]);
    g.fillStyle = '#3f7a3a'; g.fillRect(0, h * 0.68, w, h); g.fillStyle = '#4f8a42'; for (let x = 0; x < w; x += 6) g.fillRect(x, h * 0.68 - (x % 12 ? 1 : 3), 3, 3);
    const s = Math.max(2, Math.floor(h / 40)); this.hut(g, Math.floor(w / 2 - 8 * s), Math.floor(h * 0.68 - 15 * s), s);
    g.strokeStyle = 'rgba(220,230,245,.55)'; g.lineWidth = 1; const R = mulberry(2);
    for (let k = 0; k < 90; k++) { const x = R() * w, y = R() * h * 0.9; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 9); g.stroke(); }
  },
  golden(g, w, h) { this.terraces(g, w, h, true); },
  teal(g, w, h) {
    g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--desk') || '#1f6f6b'; g.fillRect(0, 0, w, h);
    const s = Math.max(2, Math.floor(Math.min(w, h) / 60)); this.hut(g, Math.floor(w / 2 - 8 * s), Math.floor(h / 2 - 12 * s), s);
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = `700 ${s * 6}px Silkscreen, monospace`; g.textAlign = 'center'; g.fillText('Burnware', w / 2, h / 2 + 10 * s);
  },
};
const WALLS = [['terraces', 'Rice terraces'], ['clouds', 'Clouds'], ['stars', 'Starry night'], ['sunset', 'Sunset'], ['kubo', 'Hut in the rain'], ['teal', 'Plain teal'], ['golden', 'Golden hour (secret)'], ['custom', 'My painting']];
const SCHEMES = {
  ember: { name: 'Ember', t1: '#5c1408', t2: '#e2642c', desk: '#2a1620', sel: '#8a2410' },
  kubo: { name: 'Classic teal', t1: '#0b3a68', t2: '#1d8b98', desk: '#1f6f6b', sel: '#0b3a68' },
  sunset: { name: 'Sunset', t1: '#7a1f3a', t2: '#e0784a', desk: '#5a3a5a', sel: '#7a1f3a' },
  grape: { name: 'Grape', t1: '#3a1f6a', t2: '#9a5ad8', desk: '#3a3a6a', sel: '#3a1f6a' },
  forest: { name: 'Forest', t1: '#1f4a2a', t2: '#4a9a4a', desk: '#2f5a3a', sel: '#1f4a2a' },
  slate: { name: 'Slate', t1: '#000080', t2: '#1084d0', desk: '#008080', sel: '#000080' },
};
const Wall = {
  paint() {
    const cv = $('#wall'), d = $('#desk'), W = d.clientWidth, H = d.clientHeight; if (!W || !H) return;
    let id = Store.data.wall; if (id === 'golden' && !Store.data.secret) id = 'terraces'; if (id === 'custom' && !Store.data.customWall) id = 'terraces';
    const px = id === 'custom' ? 1 : 3;   // the painted ones are drawn chunky on purpose
    cv.width = Math.ceil(W / px); cv.height = Math.ceil(H / px); cv.style.imageRendering = px > 1 ? 'pixelated' : 'auto';
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    if (id === 'custom') { const im = new Image(); im.onload = () => { g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height); const k = Math.max(cv.width / im.width, cv.height / im.height); g.drawImage(im, (cv.width - im.width * k) / 2, (cv.height - im.height * k) / 2, im.width * k, im.height * k); }; im.src = Store.data.customWall; return; }
    (Gen[id] || Gen.terraces).call(Gen, g, cv.width, cv.height);
  },
  scheme(id) {
    const s = SCHEMES[id] || SCHEMES.ember, r = document.documentElement.style;
    r.setProperty('--t1', s.t1); r.setProperty('--t2', s.t2); r.setProperty('--desk', s.desk); r.setProperty('--sel', s.sel);
  },
};
/* ---------- screen savers ---------- */
const Saver = {
  idle: 0, on: false, raf: null, last: Date.now(),
  bump() { this.idle = 0; if (this.on) this.stop(); },
  tick() {
    const now = Date.now(), dt = (now - this.last) / 1000; this.last = now;
    if (!Boot.ready || Store.data.saver === 'none' || this.on || Music.playing() || (typeof Video !== 'undefined' && Video.playing())) { this.idle = 0; return; }
    this.idle += dt; if (this.idle > (Store.data.saverWait || 90)) this.start();
  },
  start(kind = Store.data.saver, preview = false) {
    if (kind === 'none') return;
    this.on = true; const o = h('div#saver.over', { 'aria-label': 'Screen saver' }), cv = h('canvas'); o.append(cv); document.body.append(o);
    const W = cv.width = Math.floor(innerWidth / 2), H = cv.height = Math.floor(innerHeight / 2), g = cv.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    let f = 0;
    const stars = Array.from({ length: 220 }, () => ({ x: rand(-1, 1), y: rand(-1, 1), z: rand(0.05, 1) }));
    const poly = () => ({ p: Array.from({ length: 4 }, () => ({ x: rand(0, W), y: rand(0, H), vx: rand(-2.4, 2.4), vy: rand(-2.4, 2.4) })), hist: [] });
    const polys = [poly(), poly()];
    const logo = { x: rand(0, W - 120), y: rand(0, H - 40), vx: 1.3, vy: 1.1, hue: 0 };
    const frame = () => {
      this.raf = requestAnimationFrame(frame); f++;
      if (kind === 'stars') {
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, W, H);
        for (const s of stars) { s.z -= 0.006; if (s.z <= 0.02) { s.x = rand(-1, 1); s.y = rand(-1, 1); s.z = 1; } const x = W / 2 + s.x / s.z * W * 0.25, y = H / 2 + s.y / s.z * H * 0.25, r = Math.max(0.5, (1 - s.z) * 2.2); if (x < 0 || y < 0 || x > W || y > H) { s.z = 1; continue; } const b = Math.round(255 * (1 - s.z)); g.fillStyle = `rgb(${b},${b},${Math.min(255, b + 40)})`; g.fillRect(x, y, r, r); }
      } else if (kind === 'mystify') {
        g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, 0, W, H);
        polys.forEach((P, k) => { for (const p of P.p) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; } g.strokeStyle = `hsl(${(f * 0.6 + k * 160) % 360},90%,60%)`; g.lineWidth = 1; g.beginPath(); P.p.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.stroke(); });
      } else {
        g.fillStyle = '#000'; g.fillRect(0, 0, W, H); logo.x += logo.vx; logo.y += logo.vy; let hit = 0;
        if (logo.x < 0 || logo.x > W - 124) { logo.vx *= -1; hit++; logo.hue = (logo.hue + 67) % 360; } if (logo.y < 0 || logo.y > H - 40) { logo.vy *= -1; hit++; logo.hue = (logo.hue + 67) % 360; }
        if (hit === 2) logo.corner = 90;
        g.fillStyle = `hsl(${logo.hue},85%,60%)`; g.font = '700 26px Silkscreen, monospace'; g.fillText('Burnware', logo.x, logo.y + 30);
        if (logo.corner > 0) { logo.corner--; g.fillStyle = '#fff'; g.font = '14px VT323, monospace'; g.fillText('IT HIT THE CORNER!!!', W / 2 - 70, 20); }
      }
    };
    frame();
    const exit = () => this.stop();
    setTimeout(() => { o.addEventListener('pointermove', exit, { once: true }); o.addEventListener('pointerdown', exit, { once: true }); addEventListener('keydown', exit, { once: true }); }, preview ? 600 : 300);
    this.el = o;
  },
  stop() { this.on = false; cancelAnimationFrame(this.raf); if (this.el) this.el.remove(); this.el = null; this.idle = 0; },
};
APPS.settings = {
  title: 'Display Properties', icon: 'display', w: 380, h: 440, single: true, resizable: false,
  open(win, args) {
    const tabs = h('div.tabs', { role: 'tablist' }), pane = h('div.tabpane');
    const T = [['bg', 'Background'], ['saver', 'Screen Saver'], ['look', 'Appearance']];
    let tab = args.tab || 'bg';
    const preview = h('canvas', { width: 152, height: 114 });
    const showPreview = (id) => { const g = preview.getContext('2d'); g.imageSmoothingEnabled = false; if (id === 'custom' && Store.data.customWall) { const im = new Image(); im.onload = () => g.drawImage(im, 0, 0, 152, 114); im.src = Store.data.customWall; } else { const t = document.createElement('canvas'); t.width = 76; t.height = 57; (Gen[id] || Gen.terraces).call(Gen, t.getContext('2d'), 76, 57); g.drawImage(t, 0, 0, 152, 114); } };
    const render = () => {
      tabs.replaceChildren(...T.map(([id, l]) => { const b = h('button' + (id === tab ? '.on' : ''), { role: 'tab', 'aria-selected': String(id === tab), text: l }); b.onclick = () => { tab = id; render(); }; return b; }));
      pane.replaceChildren();
      if (tab === 'bg') {
        const walls = WALLS.filter(([id]) => (id !== 'golden' || Store.data.secret) && (id !== 'custom' || Store.data.customWall));
        const list = h('div.list.sunk', walls.map(([id, label]) => { const b = h('button' + (Store.data.wall === id ? '.on' : ''), { text: label }); b.onclick = () => { Store.data.wall = id; Store.save(); Wall.paint(); showPreview(id); $$('button', list).forEach(x => x.classList.toggle('on', x === b)); }; return b; }));
        pane.append(h('div.monitor', preview), h('div', { style: { marginBottom: '4px' } }, 'Wallpaper:'), list, h('p', { style: { fontSize: '11px', color: '#555' } }, 'Tip: in Paint, File > Set As Wallpaper uses your own painting.'));
        showPreview(Store.data.wall);
      } else if (tab === 'saver') {
        const sel = h('select', { 'aria-label': 'Screen saver' }, [['none', '(None)'], ['stars', 'Starfield'], ['mystify', 'Mystify'], ['logo', 'Bouncing logo']].map(([v, l]) => h('option', { value: v, text: l, selected: Store.data.saver === v })));
        sel.onchange = () => { Store.data.saver = sel.value; Store.save(); };
        const waitIn = h('select', { 'aria-label': 'Wait' }, [[30, '30 seconds'], [60, '1 minute'], [90, '90 seconds'], [180, '3 minutes'], [600, '10 minutes']].map(([v, l]) => h('option', { value: v, text: l, selected: +Store.data.saverWait === v })));
        waitIn.onchange = () => { Store.data.saverWait = +waitIn.value; Store.save(); };
        pane.append(h('div.monitor', h('canvas', { width: 152, height: 114, style: { background: '#000' } })), h('div.row', 'Screen saver:', sel, h('button.btn', { text: 'Preview', on: { click: () => Saver.start(sel.value, true) } })), h('div.row', 'Wait:', waitIn), h('p', { style: { fontSize: '11px', color: '#555' } }, 'It starts when you leave Burnware alone. It stays off while music plays.'));
      } else {
        const grid = h('div.schemes', Object.entries(SCHEMES).map(([id, s]) => { const b = h('button' + (Store.data.scheme === id ? '.on' : ''), h('i', { style: { background: `linear-gradient(90deg, ${s.t1}, ${s.t2})` } }), s.name); b.onclick = () => { Store.data.scheme = id; Store.save(); Wall.scheme(id); Wall.paint(); render(); }; return b; }));
        const tk = h('input', { type: 'checkbox', id: 'opt-tuko', checked: Store.data.tuko !== false });
        tk.onchange = () => { Store.data.tuko = tk.checked; Store.save(); Tuko.show(tk.checked); };
        pane.append(h('div', { style: { marginBottom: '6px' } }, 'Colour scheme:'), grid, h('div.row', { style: { marginTop: '14px' } }, tk, h('label', { for: 'opt-tuko' }, 'Show Tuko, the desktop gecko')),
          h('div.row', h('button.btn', { text: 'Reset the C: drive', on: { click: () => WM.ask('Reset', 'Put every file back the way it came? Your saved files and paintings will be deleted.', ['Reset', 'Cancel'], 'warn').then(r => { if (r === 'Reset') { FS.reset(); Desktop.render(); WM.alert('Reset', 'The C: drive is as good as new.', 'info'); } }) } })));
      }
    };
    win.body.append(tabs, pane, h('div.dlgbtns', { style: { justifyContent: 'flex-end', padding: '0 6px 6px' } }, h('button.btn.def', { text: 'OK', on: { click: () => WM.close(win) } })));
    win.reopen = (w, a) => { if (a.tab) { tab = a.tab; render(); } };
    render();
  },
};
