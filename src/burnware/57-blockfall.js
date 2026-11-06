/* ============================================================
   Blockfall: falling blocks, the way the shareware disks had it.
   Bevelled squares, an LCD score, speed going up every 10 lines.
   Arrows move (hold them, and press other keys at the same time),
   Up rotates, Space drops, C holds a piece for later, P pauses.
   Touch buttons show up on phones and take several fingers.
   ============================================================ */
APPS.blocks = {
  title: 'Blockfall', icon: 'blocks', w: 420, h: 540, minW: 300, minH: 420,
  open(win) {
    gameCSS('css-blocks', `
.bf { flex: 1; min-height: 0; display: flex; gap: 8px; padding: 8px; justify-content: center; align-items: flex-start; background: var(--face); }
.bf-well { background: #000; box-shadow: inset 1px 1px var(--lo), inset -1px -1px var(--hi), 0 0 0 1px var(--dk); padding: 2px; flex: none; position: relative; }
.bf-well canvas { display: block; image-rendering: pixelated; }
.bf-side { display: flex; flex-direction: column; gap: 8px; width: 104px; flex: none; }
.bf-box { padding: 6px; display: flex; flex-direction: column; gap: 3px; align-items: stretch; }
.bf-box b { font-weight: 400; font-size: 11px; }
.bf-box .lcd { font-size: 24px; line-height: 22px; text-align: right; }
.bf-next { background: #000; height: 52px; display: grid; place-items: center; box-shadow: inset 1px 1px var(--lo), inset -1px -1px var(--hi); }
.bf-msg { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; color: #fff; font: 700 16px/1.5 var(--ui); background: rgba(0,0,0,.55); white-space: pre-line; }
.bf-touch { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; padding: 0 8px 8px; background: var(--face); }
.bf-touch .btn { min-width: 0; min-height: 48px; font-size: 18px; touch-action: none; }
.bf-touch .btn.small { font-size: 11px; }
.bf-touch .btn.down { box-shadow: inset 1px 1px var(--dk), inset -1px -1px var(--hi), inset 2px 2px var(--lo); }
.bf-next.used canvas { opacity: .35; }
`);
    const COLS = 10, ROWS = 20;
    const SHAPES = { I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]], S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]] };
    const COLOR = { I: '#00c0c0', O: '#c0c000', T: '#c000c0', S: '#00c000', Z: '#c00000', J: '#0000c0', L: '#c08000' };   // the 16-colour VGA box
    const well = h('canvas'), nextC = h('canvas', { width: 80, height: 44 }), holdC = h('canvas', { width: 80, height: 44 }), holdBox = h('div.bf-next', holdC), msg = h('div.bf-msg');
    const lcd = { score: h('div.lcd', '0'), lines: h('div.lcd', '0'), level: h('div.lcd', '1') };
    const side = h('div.bf-side',
      h('div.bf-box.bev', h('b', 'Next'), h('div.bf-next', nextC)),
      h('div.bf-box.bev', h('b', isTouch() ? 'Hold' : 'Hold (C)'), holdBox),
      h('div.bf-box.bev', h('b', 'Score'), lcd.score, h('b', 'Lines'), lcd.lines, h('b', 'Level'), lcd.level),
      h('div.bf-box.bev', h('b', { html: 'Hi-score' }), h('div.lcd', { style: { fontSize: '18px' } }, String(Store.data.scores.blocks || 0))));
    const wellBox = h('div.bf-well', well, msg);
    win.body.append(h('div.bf', wellBox, side));
    let touch = null;
    if (isTouch()) {
      const btn = (t, a, lbl, cls) => h('button.btn' + (cls || ''), { 'aria-label': lbl, 'data-a': a }, t);
      touch = h('div.bf-touch', btn('Hold', 'hold', 'Hold piece', '.small'), btn('◀', 'left', 'Left'), btn('▼', 'down', 'Soft drop'), btn('▶', 'right', 'Right'), btn('⟳', 'rot', 'Rotate'), btn('⤓', 'drop', 'Hard drop'));
      touch._tap = true; [...touch.children].forEach(b => { b._tap = true; });
      const fingers = new Map();   // pointer id -> action, so every finger is its own button press
      touch.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; e.preventDefault(); try { touch.setPointerCapture(e.pointerId); } catch (x) {} fingers.set(e.pointerId, b); b.classList.add('down'); press(b.dataset.a); });
      const up = (e) => { const b = fingers.get(e.pointerId); if (!b) return; fingers.delete(e.pointerId); b.classList.remove('down'); release(b.dataset.a); };
      touch.addEventListener('pointerup', up); touch.addEventListener('pointercancel', up);
      touch.addEventListener('contextmenu', (e) => e.preventDefault());
      win.body.append(touch);
    }
    let grid, cur, next, bag, score, lines, level, state = 'ready', acc = 0, last = 0, raf = 0, sz = 20, flash = null, hold = null, canHold = true;
    const held = new Map(); let horiz = null;   // keys/buttons being held down, and which way was pressed last
    const DAS = 150, ARR = 45, SOFT = 40;
    const ctx = well.getContext('2d'), nctx = nextC.getContext('2d'), hctx = holdC.getContext('2d');
    const fresh = () => { if (!bag || !bag.length) bag = Object.keys(SHAPES).sort(() => Math.random() - 0.5); const k = bag.pop(); return { k, cells: SHAPES[k].map(p => p.slice()), x: 3, y: 0 }; };
    const fits = (cells, x, y) => cells.every(([cx, cy]) => { const X = cx + x, Y = cy + y; return X >= 0 && X < COLS && Y < ROWS && (Y < 0 || !grid[Y][X]); });
    const speed = () => Math.max(60, 800 * Math.pow(0.82, level - 1));
    function start() {
      grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(null)); bag = null; score = 0; lines = 0; level = 1;
      cur = fresh(); next = fresh(); hold = null; canHold = true; state = 'play'; acc = 0; msg.hidden = true; hud(); draw();
    }
    function hud() { lcd.score.textContent = score; lcd.lines.textContent = lines; lcd.level.textContent = level; }
    function rotate(dir) {
      if (cur.k === 'O') return;
      const n = cur.k === 'I' ? 4 : 3, rot = cur.cells.map(([x, y]) => dir > 0 ? [n - 1 - y, x] : [y, n - 1 - x]);
      for (const k of [0, -1, 1, -2, 2]) if (fits(rot, cur.x + k, cur.y)) { cur.cells = rot; cur.x += k; Sound.key && Sound.key(); return; }
    }
    function lock() {
      for (const [cx, cy] of cur.cells) { const Y = cy + cur.y; if (Y < 0) return over(); grid[Y][cx + cur.x] = cur.k; }
      const full = []; grid.forEach((row, y) => { if (row.every(Boolean)) full.push(y); });
      if (full.length) {
        flash = { rows: full, t: 0 }; state = 'clear';
        score += [0, 40, 100, 300, 1200][full.length] * level; lines += full.length;
        level = Math.floor(lines / 10) + 1; full.length === 4 ? Sound.tada() : Sound.chord(); hud();
      } else { Sound.click(); spawn(); }
    }
    function spawn() { cur = next; next = fresh(); canHold = true; if (!fits(cur.cells, cur.x, cur.y)) over(); }
    /* hold: park this piece for later (once per piece), and bring back the one parked before */
    function doHold() {
      if (!canHold) return;
      const was = hold; hold = cur.k;
      if (was) cur = { k: was, cells: SHAPES[was].map(p => p.slice()), x: 3, y: 0 }; else spawn();
      canHold = false; acc = 0; Sound.click();
      if (state === 'play' && !fits(cur.cells, cur.x, cur.y)) over();
    }
    /* press / release: moves happen once now, then the loop repeats them while held */
    function press(a) {
      if (a === 'left' || a === 'right' || a === 'down') { act(a); held.set(a, performance.now() + (a === 'down' ? SOFT : DAS)); if (a !== 'down') horiz = a; }
      else act(a);
    }
    function release(a) { held.delete(a); if (horiz === a) horiz = held.has('left') ? 'left' : held.has('right') ? 'right' : null; }
    function repeat(now) {
      for (const a of ['left', 'right', 'down']) {
        if (!held.has(a) || (a !== 'down' && a !== horiz)) continue;
        if (now >= held.get(a)) { act(a); held.set(a, now + (a === 'down' ? SOFT : ARR)); }
      }
    }
    function over() {
      state = 'over'; Sound.crash(); const best = Store.data.scores.blocks || 0;
      if (score > best) { Store.data.scores.blocks = score; Store.save(); side.lastChild.lastChild.textContent = score; }
      msg.textContent = `GAME OVER\nScore ${score}${score > best ? '\nNew hi-score!' : ''}\n\nPress F2 or tap\nto play again`; msg.hidden = false;
    }
    function act(a) {
      if (state === 'ready' || state === 'over') { if (a === 'drop' || a === 'rot' || a === 'start') start(); return; }
      if (state === 'paused') { if (a === 'pause') { state = 'play'; msg.hidden = true; } return; }
      if (state !== 'play') return;
      if (a === 'left' && fits(cur.cells, cur.x - 1, cur.y)) cur.x--;
      else if (a === 'right' && fits(cur.cells, cur.x + 1, cur.y)) cur.x++;
      else if (a === 'rot') rotate(1); else if (a === 'rotb') rotate(-1); else if (a === 'hold') doHold();
      else if (a === 'down') { if (fits(cur.cells, cur.x, cur.y + 1)) { cur.y++; score += 1; acc = 0; hud(); } else lock(); }
      else if (a === 'drop') { let d = 0; while (fits(cur.cells, cur.x, cur.y + 1)) { cur.y++; d++; } score += d * 2; hud(); lock(); }
      else if (a === 'pause') { state = 'paused'; msg.textContent = 'PAUSED\n\nPress P to carry on'; msg.hidden = false; }
      draw();
    }
    /* bevelled squares: light top-left edge, dark bottom-right, like every block game in 1993 */
    function block(g, x, y, s, col, ghost) {
      if (ghost) { g.strokeStyle = col; g.lineWidth = 1; g.strokeRect(x + 1.5, y + 1.5, s - 3, s - 3); return; }
      const e = Math.max(2, Math.round(s / 7));
      g.fillStyle = col; g.fillRect(x, y, s, s);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x, y, s, e); g.fillRect(x, y, e, s);
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x, y + s - e, s, e); g.fillRect(x + s - e, y, e, s);
    }
    function draw() {
      const s = sz; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, well.width, well.height);
      ctx.fillStyle = '#101010'; for (let x = 1; x < COLS; x++) ctx.fillRect(x * s, 0, 1, ROWS * s);
      if (!grid) return;
      grid.forEach((row, y) => row.forEach((k, x) => { if (k) block(ctx, x * s, y * s, s, flash && flash.rows.includes(y) && (flash.t * 10 | 0) % 2 ? '#ffffff' : COLOR[k]); }));
      if (state === 'play' || state === 'paused') {
        let gy = cur.y; while (fits(cur.cells, cur.x, gy + 1)) gy++;
        if (gy !== cur.y) for (const [cx, cy] of cur.cells) if (cy + gy >= 0) block(ctx, (cx + cur.x) * s, (cy + gy) * s, s, COLOR[cur.k], true);
        for (const [cx, cy] of cur.cells) if (cy + cur.y >= 0) block(ctx, (cx + cur.x) * s, (cy + cur.y) * s, s, COLOR[cur.k]);
      }
      nctx.fillStyle = '#000'; nctx.fillRect(0, 0, 80, 44);
      const mini = (g, p, used) => { g.fillStyle = '#000'; g.fillRect(0, 0, 80, 44); if (!p) return; const cells = SHAPES[p], ns = 16, xs = cells.map(c => c[0]), ys = cells.map(c => c[1]), w = (Math.max(...xs) - Math.min(...xs) + 1) * ns, hh = (Math.max(...ys) - Math.min(...ys) + 1) * ns; for (const [cx, cy] of cells) block(g, (80 - w) / 2 + (cx - Math.min(...xs)) * ns, (44 - hh) / 2 + (cy - Math.min(...ys)) * ns, ns, used ? '#606060' : COLOR[p]); };
      mini(hctx, hold, !canHold); holdBox.classList.toggle('used', !canHold);
      if (next) { const ns = 16, xs = next.cells.map(p => p[0]), ys = next.cells.map(p => p[1]), w = (Math.max(...xs) - Math.min(...xs) + 1) * ns, hh = (Math.max(...ys) - Math.min(...ys) + 1) * ns; for (const [cx, cy] of next.cells) block(nctx, (80 - w) / 2 + (cx - Math.min(...xs)) * ns, (44 - hh) / 2 + (cy - Math.min(...ys)) * ns, ns, COLOR[next.k]); }
    }
    function loop(t) {
      raf = requestAnimationFrame(loop); const dt = Math.min(100, t - (last || t)); last = t;
      if (!win.el.isConnected) return cancelAnimationFrame(raf);
      if (state === 'clear') {
        flash.t += dt / 1000;
        if (flash.t > 0.35) { for (const y of flash.rows) { grid.splice(y, 1); grid.unshift(new Array(COLS).fill(null)); } flash = null; state = 'play'; spawn(); }
        return draw();
      }
      if (state !== 'play' || win.min) return;
      repeat(t);
      acc += dt; if (acc >= speed()) { acc = 0; if (fits(cur.cells, cur.x, cur.y + 1)) cur.y++; else lock(); draw(); }
    }
    const fit = () => {
      const body = win.body.getBoundingClientRect(), th = touch ? touch.offsetHeight : 0, mb = win.body.querySelector('.menubar');
      const availH = body.height - th - (mb ? mb.offsetHeight : 0) - 24, availW = body.width - 104 - 34;
      sz = Math.max(10, Math.floor(Math.min(availH / ROWS, availW / COLS)));
      well.width = COLS * sz; well.height = ROWS * sz; draw();
    };
    const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rot', x: 'rot', X: 'rot', z: 'rotb', Z: 'rotb', ' ': 'drop', p: 'pause', P: 'pause', Escape: 'pause', Enter: 'start', c: 'hold', C: 'hold', Shift: 'hold' };
    win.el.addEventListener('keydown', (e) => {
      if (e.key === 'F2') { e.preventDefault(); return start(); }
      const k = KEYS[e.key]; if (!k) return;
      e.preventDefault(); if (e.repeat) return;   // our own repeat handles held keys, so two keys at once both keep working
      press(k);
    });
    const keyUp = (e) => { const k = KEYS[e.key]; if (k) release(k); };
    const blur = () => { held.clear(); horiz = null; };
    addEventListener('keyup', keyUp); addEventListener('blur', blur); win.el.addEventListener('focusout', (e) => { if (!e.relatedTarget || !win.el.contains(e.relatedTarget)) blur(); });
    wellBox.addEventListener('pointerdown', () => { if (state === 'ready' || state === 'over') start(); else if (state === 'paused') act('pause'); });
    WM.menubar(win, [{ label: 'Game', items: () => [
      { label: 'New game', key: 'F2', action: start }, { label: state === 'paused' ? 'Resume' : 'Pause', key: 'P', disabled: state !== 'play' && state !== 'paused', action: () => act('pause') }, '-',
      { label: `Hi-score: ${Store.data.scores.blocks || 0}`, disabled: true }, { label: 'Exit', action: () => WM.close(win) },
    ] }, { label: 'Help', items: () => [{ label: 'Controls', action: () => WM.alert('Blockfall', 'Left / Right: move (hold to slide)\nUp or X: rotate   Z: rotate the other way\nDown: soft drop   Space: hard drop\nC or Shift: hold the piece for later (once per piece)\nP: pause   F2: new game\n\nClear 4 lines at once for the big points.', 'blocks') }] }]);
    gameFocus(win);
    msg.textContent = isTouch() ? 'BLOCKFALL\n\nTap to start' : 'BLOCKFALL\n\nPress Enter to start'; msg.hidden = false;
    const ro = new ResizeObserver(fit); ro.observe(win.body); win.onResize = fit;
    win.onClose = () => { cancelAnimationFrame(raf); ro.disconnect(); removeEventListener('keyup', keyUp); removeEventListener('blur', blur); };
    requestAnimationFrame(() => { fit(); raf = requestAnimationFrame(loop); });
  },
};
