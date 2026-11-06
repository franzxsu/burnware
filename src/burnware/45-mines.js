/* ============================================================
   Minesweeper: the first click is always safe; flag with a right
   click or the flag switch; click a satisfied number to chord.
   ============================================================ */
APPS.mines = {
  title: 'Minesweeper', icon: 'mines', w: 260, h: 340, resizable: false,
  open(win) {
    const LV = { Beginner: [9, 9, 10], Intermediate: [16, 16, 40], Expert: [30, 16, 99] };
    let level = 'Beginner', W, H, M, cells, state, flags, opened, t0, timer = null, flagMode = false;
    const left = h('div.lcd', '010'), right = h('div.lcd', '000'), face = h('button.smiley', { 'aria-label': 'New game' }, Icons.img('smile', 22));
    const grid = h('div.mgrid.sunk'), flagBtn = h('button.btn', { text: 'Flag mode: off', style: { minWidth: '0', fontSize: '11px' } });
    const best = h('span');
    win.body.append(h('div.mines', h('div.mhead.sunk', left, face, right), grid, h('div.mflag', isTouch() ? flagBtn : null, best)));
    const setFace = (n) => face.firstChild.src = Icons.url(n, 2);
    const pad = (n) => String(clamp(n, -99, 999)).padStart(3, '0');
    const showBest = () => { const s = Store.data.scores['mines-' + level]; best.textContent = s ? `Best ${level.toLowerCase()}: ${s} s` : ''; };
    const fit = () => {
      const cs = isNarrow() ? 26 : 22, b = WM.bounds();
      if (!win.el.classList.contains('max')) { win.el.style.width = Math.min(b.w - 8, W * cs + 26) + 'px'; win.el.style.height = Math.min(b.h - 8, H * cs + 150) + 'px'; }
    };
    function reset() {
      [W, H, M] = LV[level]; cells = Array.from({ length: W * H }, () => ({ mine: false, n: 0, open: false, flag: false }));
      state = 'ready'; flags = 0; opened = 0; clearInterval(timer); timer = null; t0 = 0;
      left.textContent = pad(M); right.textContent = '000'; setFace('smile');
      grid.style.gridTemplateColumns = `repeat(${W}, auto)`;
      grid.replaceChildren(...cells.map((c, i) => { const b = h('button.mc', { 'aria-label': 'Hidden square' }); b.dataset.i = i; return b; }));
      fit(); showBest();
    }
    const nbrs = (i) => { const x = i % W, y = (i / W) | 0, out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) out.push(ny * W + nx); } return out; };
    const lay = (safe) => {
      const no = new Set([safe, ...nbrs(safe)]); let k = 0;
      while (k < M) { const i = Math.floor(Math.random() * W * H); if (no.has(i) || cells[i].mine) continue; cells[i].mine = true; k++; }
      cells.forEach((c, i) => { c.n = nbrs(i).filter(j => cells[j].mine).length; });
      state = 'play'; t0 = Date.now(); timer = setInterval(() => { right.textContent = pad(Math.floor((Date.now() - t0) / 1000)); }, 250);
    };
    const paint = (i) => {
      const c = cells[i], b = grid.children[i];
      b.className = 'mc' + (c.open ? ' open' : ''); b.replaceChildren();
      if (c.open) { if (c.mine) b.append(Icons.img('mine', 16)); else if (c.n) { b.textContent = c.n; b.classList.add('n' + c.n); } b.setAttribute('aria-label', c.mine ? 'Mine' : c.n ? c.n + ' mines nearby' : 'Empty'); }
      else if (c.flag) { b.append(Icons.img('flag', 16)); b.setAttribute('aria-label', 'Flagged'); }
      else b.setAttribute('aria-label', 'Hidden square');
    };
    const reveal = (i) => {
      const st = [i];
      while (st.length) {
        const j = st.pop(), c = cells[j]; if (c.open || c.flag) continue;
        c.open = true; opened++; paint(j);
        if (!c.mine && c.n === 0) for (const k of nbrs(j)) if (!cells[k].open) st.push(k);
      }
    };
    const lose = (i) => {
      state = 'dead'; clearInterval(timer); setFace('dead'); Sound.crash();
      cells.forEach((c, j) => { if (c.mine && !c.flag) { c.open = true; paint(j); } else if (!c.mine && c.flag) { grid.children[j].replaceChildren(h('span', { style: { color: '#d01818', fontWeight: 700 } }, '✕')); } });
      grid.children[i].classList.add('boom');
    };
    const checkWin = () => {
      if (opened !== W * H - M) return;
      state = 'won'; clearInterval(timer); setFace('cool'); Sound.tada();
      cells.forEach((c, j) => { if (c.mine && !c.flag) { c.flag = true; paint(j); } }); left.textContent = '000';
      const secs = Math.floor((Date.now() - t0) / 1000), key = 'mines-' + level, prev = Store.data.scores[key];
      if (!prev || secs < prev) { Store.data.scores[key] = secs; Store.save(); setTimeout(() => WM.alert('Minesweeper', `You have the fastest time for ${level.toLowerCase()} level: ${secs} seconds!` + (level === 'Expert' ? '\nExpert! You did the thing nobody does.' : ''), 'cool'), 300); }
      showBest();
    };
    const openAt = (i) => {
      if (state === 'dead' || state === 'won') return;
      const c = cells[i];
      if (state === 'ready') lay(i);
      if (c.flag) return;
      if (c.open) {   // chord: a number with the right flags around it opens its neighbours
        if (!c.n) return; const ns = nbrs(i); if (ns.filter(j => cells[j].flag).length !== c.n) return;
        for (const j of ns) if (!cells[j].open && !cells[j].flag) { if (cells[j].mine) { reveal(j); return lose(j); } reveal(j); }
        return checkWin();
      }
      if (c.mine) { reveal(i); return lose(i); }
      reveal(i); Sound.click(); checkWin();
    };
    const toggleFlag = (i) => {
      if (state === 'dead' || state === 'won') return; const c = cells[i]; if (c.open) return;
      c.flag = !c.flag; flags += c.flag ? 1 : -1; left.textContent = pad(M - flags); paint(i); Sound.click();
    };
    grid.addEventListener('contextmenu', (e) => { e.preventDefault(); const b = e.target.closest('.mc'); if (b) toggleFlag(+b.dataset.i); });
    grid.addEventListener('pointerdown', (e) => { if (e.button === 0 && state !== 'dead' && state !== 'won') setFace('ooh'); });
    grid.addEventListener('pointerup', () => { if (state !== 'dead' && state !== 'won') setFace('smile'); });
    grid.addEventListener('click', (e) => { const b = e.target.closest('.mc'); if (!b) return; const i = +b.dataset.i; if (flagMode) toggleFlag(i); else openAt(i); });
    flagBtn.onclick = () => { flagMode = !flagMode; flagBtn.textContent = 'Flag mode: ' + (flagMode ? 'on' : 'off'); flagBtn.classList.toggle('on', flagMode); };
    face.onclick = () => { Sound.click(); reset(); };
    WM.menubar(win, [{ label: 'Game', items: () => [
      { label: 'New', key: 'F2', action: reset }, '-',
      ...Object.keys(LV).map(k => ({ label: k, check: level === k, action: () => { level = k; reset(); } })), '-',
      { label: 'Best Times...', action: () => WM.alert('Fastest Mine Sweepers', Object.keys(LV).map(k => `${k}: ${Store.data.scores['mines-' + k] ? Store.data.scores['mines-' + k] + ' seconds' : '999 seconds   Anonymous'}`).join('\n'), 'mines') },
      { label: 'Exit', action: () => WM.close(win) },
    ] }]);
    win.el.addEventListener('keydown', (e) => { if (e.key === 'F2') { e.preventDefault(); reset(); } });
    win.onClose = () => clearInterval(timer);
    reset();
  },
};
