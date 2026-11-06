/* ============================================================
   Paint: hard-edged pixel tools on a white canvas. Save to
   My Pictures, or make a painting the wallpaper.
   ============================================================ */
const PAINT_COLORS = ['#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040'];
const PAINT_TOOLS = [
  ['pick', 'Pick a colour', ['................', '..........kk....', '.........kkkk...', '........kkkkk...', '.......kkkkk....', '......wkkkk.....', '.....wwwkk......', '....wwww........', '...wwww.........', '..wwww..........', '.www............', '.kw.............', '................', '................', '................', '................']],
  ['fill', 'Fill', ['................', '.....kk.........', '....kwwk........', '...kwwwwk.......', '..kwwwwwwk......', '.kwwwwwwwwk.....', 'kbbbwwwwwwwk....', 'kbbbbbwwwwkb....', '.kbbbbbwwkbbb...', '..kbbbbbkbbbbb..', '...kbbbkbbbbbb..', '....kkk..bbbb...', '..........bb....', '................', '................', '................']],
  ['pencil', 'Pencil', ['................', '...........kk...', '..........krrk..', '.........kyyrk..', '........kyyyk...', '.......kyyyk....', '......kyyyk.....', '.....kyyyk......', '....kyyyk.......', '...kNNyk........', '...kNNk.........', '..kkkk..........', '..kk............', '................', '................', '................']],
  ['brush', 'Brush', ['................', '............kk..', '...........kNk..', '..........kNk...', '.........kNk....', '........kNk.....', '.......kNk......', '......kddk......', '.....kdddk......', '....kkkkk.......', '...kbbbk........', '..kbbbbk........', '..kbbbk.........', '..kkk...........', '................', '................']],
  ['spray', 'Airbrush', ['................', '...k.k..........', '.k...k.k........', '...k..kkk.......', '..k.k.kgk.......', '......kkkkk.....', '.....kggggk.....', '.....krrrrk.....', '.....krrrrk.....', '.....krrrrk.....', '.....krrrrk.....', '.....krrrrk.....', '.....kkkkkk.....', '................', '................', '................']],
  ['eraser', 'Eraser', ['................', '................', '.........kkkkk..', '........kppppk..', '.......kppppkk..', '......kppppkwk..', '.....kppppkwwk..', '....kwwwwkwwk...', '...kwwwwkwwk....', '..kwwwwkwwk.....', '..kwwwwkwk......', '..kkkkkkk.......', '................', '................', '................', '................']],
  ['line', 'Line', ['................', '..............k.', '.............k..', '............k...', '...........k....', '..........k.....', '.........k......', '........k.......', '.......k........', '......k.........', '.....k..........', '....k...........', '...k............', '..k.............', '................', '................']],
  ['rect', 'Rectangle', ['................', '................', '..kkkkkkkkkkkk..', '..k..........k..', '..k..........k..', '..k..........k..', '..k..........k..', '..k..........k..', '..k..........k..', '..kkkkkkkkkkkk..', '................', '................', '................', '................', '................', '................']],
  ['ellipse', 'Ellipse', ['................', '................', '.....kkkkkk.....', '...kk......kk...', '..k..........k..', '.k............k.', '.k............k.', '.k............k.', '..k..........k..', '...kk......kk...', '.....kkkkkk.....', '................', '................', '................', '................', '................']],
  ['frect', 'Filled rectangle', ['................', '................', '..kkkkkkkkkkkk..', '..kddddddddddk..', '..kddddddddddk..', '..kddddddddddk..', '..kddddddddddk..', '..kddddddddddk..', '..kddddddddddk..', '..kkkkkkkkkkkk..', '................', '................', '................', '................', '................', '................']],
];
APPS.paint = {
  title: 'Paint', icon: 'paint', w: 640, h: 470, minW: 300, minH: 260,
  open(win, args) {
    const b = WM.bounds(), CW = clamp(Math.floor((isNarrow() ? b.w - 90 : 520)), 200, 640), CH = clamp(Math.floor(isNarrow() ? b.h - 170 : 340), 160, 480);
    const cv = h('canvas', { width: CW, height: CH, 'aria-label': 'Painting' }), ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    let tool = 'pencil', size = 2, fg = '#000000', bg = '#ffffff', path = null, dirty = false, undo = [], down = false, last = null, start = null, snap = null, sprayT = null;
    const blank = () => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height); };
    blank();
    const title = () => WM.setTitle(win, (path ? FS.split(path).pop() : 'untitled') + (dirty ? '*' : '') + ' - Paint');
    const push = () => { undo.push(ctx.getImageData(0, 0, cv.width, cv.height)); if (undo.length > 25) undo.shift(); };
    const doUndo = () => { const s = undo.pop(); if (s) { ctx.putImageData(s, 0, 0); dirty = true; title(); } };
    // tools column
    const toolBtns = {}, tools = h('div.ptools');
    for (const [id, name, spr] of PAINT_TOOLS) {
      const c = document.createElement('canvas'); c.width = 16; c.height = 16; Icons.draw(spr, 1, c.getContext('2d'));
      const t = h('button.tool', { title: name, 'aria-label': name }, h('img', { src: c.toDataURL(), alt: '', width: 16, height: 16 }));
      t.onclick = () => { tool = id; Object.values(toolBtns).forEach(x => x.classList.toggle('on', x === t)); };
      toolBtns[id] = t; tools.append(t);
    }
    toolBtns.pencil.classList.add('on');
    const sizes = h('div.psizes.sunk'); [1, 2, 4, 7].forEach(s => { const sb = h('button', { title: s + ' px', 'aria-label': 'Size ' + s }, h('i', { style: { height: Math.min(s, 7) + 'px' } })); if (s === size) sb.classList.add('on'); sb.onclick = () => { size = s; $$('button', sizes).forEach(x => x.classList.toggle('on', x === sb)); }; sizes.append(sb); });
    tools.append(sizes);
    // palette
    const curFg = h('i.fg'), curBg = h('i.bg2'), cur = h('div.pcur', { title: 'Current colours (tap to swap)' }, curFg, curBg);
    const showCur = () => { curFg.style.background = fg; curBg.style.background = bg; };
    cur.onclick = () => { [fg, bg] = [bg, fg]; showCur(); };
    const sw = h('div.swatches', PAINT_COLORS.map(c => { const s = h('button', { title: c, 'aria-label': 'Colour ' + c, style: { background: c } }); s.onclick = () => { fg = c; showCur(); }; s.oncontextmenu = (e) => { e.preventDefault(); bg = c; showCur(); }; return s; }));
    showCur();
    const stat = h('span', 'For help, see Burnware Help.'), pos = h('span', { style: { flex: '0 0 90px' } });
    const area = h('div.pcanvas.scroller', cv);
    win.body.append(h('div.paint', tools, area), h('div.palette', cur, sw), h('div.status', stat, pos));
    // drawing helpers: hard-edged, like the real thing
    const hex2 = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const dot = (x, y, s, col) => { ctx.fillStyle = col; if (s <= 1) { ctx.fillRect(x, y, 1, 1); return; } const r = s / 2; for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) if (dx * dx + dy * dy <= r * r) ctx.fillRect(x + dx, y + dy, 1, 1); };
    const lineTo = (x0, y0, x1, y1, s, col) => { let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy; for (;;) { dot(x0, y0, s, col); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } };
    const ellipse = (x0, y0, x1, y1, s, col) => { const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.abs(x1 - x0) / 2, ry = Math.abs(y1 - y0) / 2, n = Math.max(24, Math.round((rx + ry) * 3)); let px = null, py = null; for (let k = 0; k <= n; k++) { const a = k / n * Math.PI * 2, x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry); if (px !== null) lineTo(px, py, x, y, s, col); px = x; py = y; } };
    const flood = (x, y, col) => {
      const img = ctx.getImageData(0, 0, cv.width, cv.height), d = img.data, W = cv.width, H = cv.height, i0 = (y * W + x) * 4, t = [d[i0], d[i0 + 1], d[i0 + 2]], [r, g, bb] = hex2(col);
      if (t[0] === r && t[1] === g && t[2] === bb) return;
      const st = [[x, y]], same = (i) => d[i] === t[0] && d[i + 1] === t[1] && d[i + 2] === t[2];
      while (st.length) {
        let [sx, sy] = st.pop(); let i = (sy * W + sx) * 4; while (sx > 0 && same(i - 4)) { sx--; i -= 4; }
        let up = false, dn = false;
        for (; sx < W && same(i); sx++, i += 4) {
          d[i] = r; d[i + 1] = g; d[i + 2] = bb; d[i + 3] = 255;
          if (sy > 0) { const u = i - W * 4; if (same(u)) { if (!up) { st.push([sx, sy - 1]); up = true; } } else up = false; }
          if (sy < H - 1) { const v = i + W * 4; if (same(v)) { if (!dn) { st.push([sx, sy + 1]); dn = true; } } else dn = false; }
        }
      }
      ctx.putImageData(img, 0, 0);
    };
    const at = (e) => { const r = cv.getBoundingClientRect(); return [clamp(Math.floor((e.clientX - r.left) / r.width * cv.width), 0, cv.width - 1), clamp(Math.floor((e.clientY - r.top) / r.height * cv.height), 0, cv.height - 1)]; };
    const spray = (x, y, col) => { ctx.fillStyle = col; const r = size * 3 + 4; for (let k = 0; k < 10 + size * 3; k++) { const a = Math.random() * Math.PI * 2, d = Math.random() * r; ctx.fillRect(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d), 1, 1); } };
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId); const [x, y] = at(e), col = e.button === 2 ? bg : fg;
      if (tool === 'pick') { const p = ctx.getImageData(x, y, 1, 1).data; const c = '#' + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join(''); if (e.button === 2) bg = c; else fg = c; showCur(); return; }
      push(); dirty = true; title(); down = { col }; last = [x, y]; start = [x, y];
      if (tool === 'fill') { flood(x, y, col); down = false; return; }
      if (tool === 'pencil') dot(x, y, 1, col);
      if (tool === 'brush') dot(x, y, size + 1, col);
      if (tool === 'eraser') dot(x, y, size * 3 + 3, bg);
      if (tool === 'spray') { spray(x, y, col); sprayT = setInterval(() => spray(last[0], last[1], col), 40); }
      if (['line', 'rect', 'ellipse', 'frect'].includes(tool)) snap = ctx.getImageData(0, 0, cv.width, cv.height);
    });
    cv.addEventListener('pointermove', (e) => {
      const [x, y] = at(e); pos.textContent = x + ',' + y; if (!down) return;
      const col = down.col;
      if (tool === 'pencil') lineTo(last[0], last[1], x, y, 1, col);
      else if (tool === 'brush') lineTo(last[0], last[1], x, y, size + 1, col);
      else if (tool === 'eraser') lineTo(last[0], last[1], x, y, size * 3 + 3, bg);
      else if (snap) {
        ctx.putImageData(snap, 0, 0); const [sx, sy] = start;
        if (tool === 'line') lineTo(sx, sy, x, y, size, col);
        else if (tool === 'rect') { lineTo(sx, sy, x, sy, size, col); lineTo(x, sy, x, y, size, col); lineTo(x, y, sx, y, size, col); lineTo(sx, y, sx, sy, size, col); }
        else if (tool === 'frect') { ctx.fillStyle = col; ctx.fillRect(Math.min(sx, x), Math.min(sy, y), Math.abs(x - sx) + 1, Math.abs(y - sy) + 1); }
        else ellipse(sx, sy, x, y, size, col);
      }
      last = [x, y];
    });
    const end = (e) => { down = false; snap = null; clearInterval(sprayT); sprayT = null; try { if (e && cv.hasPointerCapture(e.pointerId)) cv.releasePointerCapture(e.pointerId); } catch (x) { /* already let go */ } };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    // files
    const loadImage = (p) => {
      const n = FS.resolve(p); if (!n) return;
      const fin = () => { path = p; dirty = false; undo = []; title(); };
      if (n.gen) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); Gen[n.gen] && Gen[n.gen](ctx, cv.width, cv.height); fin(); return; }
      if (n.data) { const im = new Image(); im.onload = () => { blank(); ctx.drawImage(im, 0, 0); fin(); }; im.src = n.data; }
    };
    const saveTo = (p) => { FS.write(p, { kind: 'img', data: cv.toDataURL('image/png'), gen: undefined }); path = p; dirty = false; title(); stat.textContent = 'Saved to ' + p; };
    const saveAs = async () => { const v = await WM.prompt('Save As', 'File name (it goes in My Pictures):', path ? FS.split(path).pop() : 'my painting.bmp'); if (!v || !v.trim()) return false; let name = v.trim().replace(/[\\/:*?"<>|]/g, ''); if (!/\.\w+$/.test(name)) name += '.bmp'; saveTo('C:\\My Pictures\\' + name); return true; };
    const save = () => path && !FS.resolve(path)?.gen ? saveTo(path) : saveAs();
    WM.menubar(win, [
      { label: 'File', items: [
        { label: 'New', action: () => { push(); blank(); path = null; dirty = false; title(); } },
        { label: 'Open...', action: async () => { const v = await WM.prompt('Open', 'Picture to open (from My Pictures):', 'hut-in-the-rain.bmp'); if (v) loadImage(/^c:/i.test(v) ? v : 'C:\\My Pictures\\' + v); } },
        { label: 'Save', key: 'Ctrl+S', action: save }, { label: 'Save As...', action: saveAs }, '-',
        { label: 'Set As Wallpaper', action: () => { Store.data.wall = 'custom'; Store.data.customWall = cv.toDataURL('image/png'); Store.save(); Wall.paint(); Sound.chord(); stat.textContent = 'Your painting is now the wallpaper.'; } },
        '-', { label: 'Exit', action: () => WM.tryClose(win) },
      ] },
      { label: 'Edit', items: [{ label: 'Undo', key: 'Ctrl+Z', action: doUndo }, { label: 'Clear Image', action: () => { push(); blank(); dirty = true; title(); } }] },
      { label: 'Image', items: [
        { label: 'Flip Horizontal', action: () => { push(); const t = document.createElement('canvas'); t.width = cv.width; t.height = cv.height; const tc = t.getContext('2d'); tc.translate(cv.width, 0); tc.scale(-1, 1); tc.drawImage(cv, 0, 0); ctx.drawImage(t, 0, 0); dirty = true; title(); } },
        { label: 'Invert Colours', action: () => { push(); const im = ctx.getImageData(0, 0, cv.width, cv.height); for (let i = 0; i < im.data.length; i += 4) { im.data[i] = 255 - im.data[i]; im.data[i + 1] = 255 - im.data[i + 1]; im.data[i + 2] = 255 - im.data[i + 2]; } ctx.putImageData(im, 0, 0); dirty = true; title(); } },
      ] },
    ]);
    win.body.tabIndex = -1;
    win.el.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); doUndo(); } if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } });
    win.beforeClose = async () => { if (!dirty) return true; const r = await WM.ask('Paint', 'Save changes to ' + (path ? FS.split(path).pop() : 'untitled') + '?', ['Yes', 'No', 'Cancel'], 'warn'); if (r === 'Cancel') return false; if (r === 'Yes') return await save() !== false; return true; };
    if (args.path) loadImage(args.path); else title();
  },
};
