/* ============================================================
   Number Place, which is what puzzle magazines called sudoku in
   1998. Every puzzle has exactly one answer. Click a square, then
   type or tap a number; pencil marks for the unsure.
   ============================================================ */
const gameCSS = (id, css) => { if (!document.getElementById(id)) document.head.append(h('style#' + id, css)); };
/* games listen for keys on their window, so the window takes focus when it opens and whenever it's clicked */
const gameFocus = (win) => {
  win.el.tabIndex = -1; win.el.style.outline = 'none';
  win.el.addEventListener('pointerdown', (e) => { if (!e.target.closest('input, textarea, select')) setTimeout(() => { if (!win.el.contains(document.activeElement) || document.activeElement === document.body) win.el.focus({ preventScroll: true }); }); });
  setTimeout(() => win.el.focus({ preventScroll: true }), 30);
};
APPS.sudoku = {
  title: 'Number Place', icon: 'sudoku', w: 380, h: 520, minW: 300, minH: 420,
  open(win) {
    gameCSS('css-sudoku', `
.sdk { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 6px; }
.sdk-board { display: grid; grid-template-columns: repeat(9, 1fr); background: #000; padding: 2px; gap: 1px; width: min(100%, var(--bs)); aspect-ratio: 1; box-shadow: inset 1px 1px var(--lo), inset -1px -1px var(--hi); }
.sdk-c { background: #fff; border: 0; padding: 0; display: grid; place-items: center; font: 700 calc(var(--bs) / 15) var(--ui); color: #000080; cursor: pointer; position: relative; min-width: 0; }
.sdk-c.given { color: #000; background: #e8e8e8; }
.sdk-c { box-sizing: border-box; } .sdk-c.c2, .sdk-c.c5 { border-right: 2px solid #000; } .sdk-c.r2, .sdk-c.r5 { border-bottom: 2px solid #000; }
.sdk-c.peer { background: #ffffe0; } .sdk-c.given.peer { background: #e0e0c8; }
.sdk-c.same { background: #c0e0ff; } .sdk-c.sel { background: #000080 !important; color: #fff; }
.sdk-c.bad { color: #d00000; } .sdk-c.sel.bad { color: #ff8080; }
.sdk-c .pm { position: absolute; inset: 1px; display: grid; grid-template-columns: repeat(3, 1fr); font: calc(var(--bs) / 34) var(--ui); color: #606060; line-height: 1; }
.sdk-c .pm span { display: grid; place-items: center; }
.sdk-c.sel .pm { color: #c0c0ff; }
.sdk-pad { display: grid; grid-template-columns: repeat(6, 1fr); gap: 3px; width: min(100%, var(--bs)); }
.sdk-pad .btn { min-width: 0; padding: 3px 0; font-weight: 700; }
.sdk-pad .btn.wide { grid-column: span 2; font-weight: 400; }
`);
    const LV = { Easy: 38, Medium: 47, Hard: 54 };
    let level = Store.data.sdkLevel || 'Easy', puzzle, solution, cells, sel = -1, notes = false, t0 = 0, timer = null, done = false, mistakes = 0, history = [];
    const board = h('div.sdk-board'), pad = h('div.sdk-pad'), box = h('div.sdk', board, pad);
    const stL = h('span'), stM = h('span'), stR = h('span', { style: { flex: '0 0 90px' } });
    win.body.append(h('div.sunk', { style: { flex: 1, display: 'flex', minHeight: 0, padding: '2px', background: 'var(--face)' } }, box), h('div.status', stL, stM, stR));
    /* ---- the puzzle maker: fill a grid at random, then take numbers away while the answer stays unique ---- */
    const rc = (i) => [(i / 9) | 0, i % 9], bx = (r, c) => ((r / 3) | 0) * 3 + ((c / 3) | 0);
    function solve(g, limit) {   // counts solutions (stops at limit); fills g with the first one found
      const R = new Array(9).fill(0), C = new Array(9).fill(0), B = new Array(9).fill(0);
      for (let i = 0; i < 81; i++) if (g[i]) { const [r, c] = rc(i), m = 1 << g[i]; R[r] |= m; C[c] |= m; B[bx(r, c)] |= m; }
      let count = 0, first = null;
      const go = () => {
        let best = -1, bestOpts = 0, bestN = 10;
        for (let i = 0; i < 81; i++) if (!g[i]) { const [r, c] = rc(i), opts = ~(R[r] | C[c] | B[bx(r, c)]) & 0x3fe; let n = 0; for (let v = opts; v; v &= v - 1) n++; if (n < bestN) { bestN = n; best = i; bestOpts = opts; if (!n) return; } }
        if (best < 0) { count++; if (!first) first = g.slice(); return; }
        const [r, c] = rc(best), b = bx(r, c), vals = []; for (let v = 1; v <= 9; v++) if (bestOpts & (1 << v)) vals.push(v);
        if (limit === 1) vals.sort(() => Math.random() - 0.5);
        for (const v of vals) { const m = 1 << v; g[best] = v; R[r] |= m; C[c] |= m; B[b] |= m; go(); g[best] = 0; R[r] &= ~m; C[c] &= ~m; B[b] &= ~m; if (count >= limit) return; }
      };
      go(); return { count, first };
    }
    function make() {
      const full = solve(new Array(81).fill(0), 1).first, g = full.slice(), order = [...Array(81).keys()].sort(() => Math.random() - 0.5);
      let removed = 0;
      for (const i of order) { if (removed >= LV[level]) break; const keep = g[i]; g[i] = 0; if (solve(g.slice(), 2).count !== 1) g[i] = keep; else removed++; }
      return [g, full];
    }
    /* ---- drawing ---- */
    const els = Array.from({ length: 81 }, (_, i) => { const [r, c] = rc(i); const b = h('button.sdk-c.r' + r + '.c' + c, { 'aria-label': `Row ${r + 1} column ${c + 1}` }); b.onclick = () => { sel = i; paint(); }; board.append(b); return b; });
    const conflict = (i) => { const v = cells[i].v; if (!v) return false; const [r, c] = rc(i); for (let j = 0; j < 81; j++) { if (j === i || cells[j].v !== v) continue; const [r2, c2] = rc(j); if (r2 === r || c2 === c || bx(r2, c2) === bx(r, c)) return true; } return false; };
    function paint() {
      const sv = sel >= 0 ? cells[sel].v : 0, [sr, sc] = sel >= 0 ? rc(sel) : [-9, -9];
      cells.forEach((cl, i) => {
        const b = els[i], [r, c] = rc(i);
        b.className = `sdk-c r${r} c${c}` + (cl.given ? ' given' : '') + (i === sel ? ' sel' : '') + (sel >= 0 && i !== sel && (r === sr || c === sc || bx(r, c) === bx(sr, sc)) ? ' peer' : '') + (sv && cl.v === sv && i !== sel ? ' same' : '') + (!cl.given && conflict(i) ? ' bad' : '');
        if (cl.v) b.textContent = cl.v;
        else if (cl.pm.size) b.replaceChildren(h('div.pm', [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => h('span', cl.pm.has(n) ? String(n) : ''))));
        else b.textContent = '';
      });
      const filled = cells.filter(c => c.v).length;
      stL.textContent = level; stM.textContent = notes ? 'Pencil marks: ON' : `${81 - filled} squares to go`;
    }
    const fit = () => { const w = box.clientWidth - 12, hh = box.clientHeight - pad.offsetHeight - 18; box.style.setProperty('--bs', Math.max(200, Math.min(w, hh)) + 'px'); };
    function newGame() {
      [puzzle, solution] = make(); cells = puzzle.map(v => ({ v, given: !!v, pm: new Set() }));
      sel = -1; done = false; mistakes = 0; history = []; t0 = Date.now(); clearInterval(timer);
      timer = setInterval(() => { if (!done) stR.textContent = 'Time ' + fmt(Math.floor((Date.now() - t0) / 1000)); }, 500);
      stR.textContent = 'Time 0:00'; paint(); fit();
    }
    const fmt = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    /* ---- input ---- */
    function put(n) {
      if (done || sel < 0 || cells[sel].given) return;
      const cl = cells[sel]; history.push([sel, cl.v, [...cl.pm]]);
      if (notes && n) { cl.v = 0; cl.pm.has(n) ? cl.pm.delete(n) : cl.pm.add(n); Sound.click(); return paint(); }
      cl.v = cl.v === n ? 0 : n; cl.pm.clear();
      if (n && cl.v) {   // a placed number clears that pencil mark from its row, column and box
        const [r, c] = rc(sel); cells.forEach((o, j) => { const [r2, c2] = rc(j); if (r2 === r || c2 === c || bx(r2, c2) === bx(r, c)) o.pm.delete(n); });
        if (conflict(sel)) { mistakes++; Sound.ding(); } else Sound.click();
      }
      paint(); check();
    }
    function check() {
      if (!cells.every((c, i) => c.v === solution[i])) return;
      done = true; clearInterval(timer); sel = -1; paint(); Sound.tada();
      const secs = Math.floor((Date.now() - t0) / 1000), key = 'sudoku-' + level, prev = Store.data.scores[key];
      const best = !prev || secs < prev; if (best) { Store.data.scores[key] = secs; Store.save(); }
      setTimeout(() => WM.alert('Number Place', `Solved! ${level} in ${fmt(secs)}` + (best ? '\nThat is your best time for this level.' : `\nYour best: ${fmt(prev)}`) + (mistakes ? '' : '\nNot one wrong number. Very tidy.'), 'sudoku'), 300);
    }
    const undo = () => { const u = history.pop(); if (!u) return; const [i, v, pm] = u; cells[i].v = v; cells[i].pm = new Set(pm); sel = i; paint(); };
    const hint = () => {
      if (done) return; let i = sel >= 0 && !cells[sel].given && cells[sel].v !== solution[sel] ? sel : cells.findIndex((c, j) => c.v !== solution[j]);
      if (i < 0) return; sel = i; history.push([i, cells[i].v, [...cells[i].pm]]); cells[i].v = solution[i]; cells[i].pm.clear(); t0 -= 30000; Sound.chord(); paint(); check();
    };
    for (let n = 1; n <= 9; n++) { const b = h('button.btn', String(n)); b.onclick = () => put(n); pad.append(b); }
    const pencil = h('button.btn.wide', 'Pencil'); pencil.onclick = () => { notes = !notes; pencil.classList.toggle('on', notes); paint(); };
    const erase = h('button.btn', '⌫'); erase.setAttribute('aria-label', 'Erase'); erase.onclick = () => { if (sel >= 0 && !cells[sel].given && (cells[sel].v || cells[sel].pm.size)) { history.push([sel, cells[sel].v, [...cells[sel].pm]]); cells[sel].v = 0; cells[sel].pm.clear(); paint(); } };
    const hb = h('button.btn.wide', 'Hint'); hb.onclick = hint;
    pad.append(erase, pencil, hb);
    win.el.addEventListener('keydown', (e) => {
      if (e.key === 'F2') { e.preventDefault(); return newGame(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); return undo(); }
      if (/^[1-9]$/.test(e.key)) { e.preventDefault(); return put(+e.key); }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { e.preventDefault(); return erase.onclick(); }
      if (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'p') { e.preventDefault(); return pencil.onclick(); }
      const mv = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (mv) { e.preventDefault(); if (sel < 0) sel = 40; else { const [r, c] = rc(sel); if (mv === -1 && c > 0 || mv === 1 && c < 8 || mv === -9 && r > 0 || mv === 9 && r < 8) sel += mv; } paint(); }
    });
    WM.menubar(win, [{ label: 'Game', items: () => [
      { label: 'New puzzle', key: 'F2', action: newGame }, { label: 'Undo', key: 'Ctrl+Z', action: undo, disabled: !history.length }, { label: 'Hint (+30 s)', action: hint }, '-',
      ...Object.keys(LV).map(k => ({ label: k, check: level === k, action: () => { level = k; Store.data.sdkLevel = k; Store.save(); newGame(); } })), '-',
      { label: 'Best Times...', action: () => WM.alert('Best Times', Object.keys(LV).map(k => `${k}: ${Store.data.scores['sudoku-' + k] ? fmt(Store.data.scores['sudoku-' + k]) : '--:--'}`).join('\n'), 'sudoku') },
      { label: 'Exit', action: () => WM.close(win) },
    ] }, { label: 'Help', items: () => [{ label: 'How to play', action: () => WM.alert('Number Place', 'Fill the grid so every row, every column and every 3 x 3 box has the numbers 1 to 9, once each.\n\nClick a square, then type a number or tap one below.\nPencil: jot down maybes.  Arrow keys move.  Ctrl+Z undoes.\n\nIn Japan they call it Sudoku. Catchy, but it will never take off.', 'sudoku') }] }]);
    win.onResize = fit; const ro = new ResizeObserver(fit); ro.observe(box);
    win.onClose = () => { clearInterval(timer); ro.disconnect(); };
    gameFocus(win);
    requestAnimationFrame(newGame);
  },
};
