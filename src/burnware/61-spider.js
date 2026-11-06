/* ============================================================
   Spider Solitaire (it came on the Plus! 98 disc). Two decks, ten
   columns. Build runs from King down to Ace in one suit and they
   fly off home. Deal ten new cards from the corner when stuck.
   ============================================================ */
APPS.spider = {
  title: 'Spider Solitaire', icon: 'spider', w: 700, h: 500, minW: 340, minH: 320,
  open(win) {
    gameCSS('css-spider', `.felt .slot.done { box-shadow: none; } .spider-dealpile { position: absolute; cursor: pointer; }`);
    const SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const felt = h('div.felt'), stScore = h('span'), stMoves = h('span'), stLeft = h('span', { style: { flex: '0 0 120px' } });
    win.body.append(h('div.sunk', { style: { flex: 1, display: 'flex', padding: '2px', minHeight: 0 } }, felt), h('div.status', stScore, stMoves, stLeft));
    let suits = Store.data.spiderSuits || 1, tab, stock, doneRuns, score, moves, history, cw, ch, gap, drag = null, over = false, slots = [];
    const makeCard = (s, r) => {
      const c = { s, r, up: false }, red = s === 1 || s === 2;
      c.el = h('div.card.' + (red ? 'red' : 'black'), { 'aria-label': RANKS[r] + ' of ' + ['spades', 'hearts', 'diamonds', 'clubs'][s] }, h('div.cr', h('span', RANKS[r]), h('span', SUITS[s])), r > 10 ? h('div.pip.face', RANKS[r] + SUITS[s]) : h('div.pip', SUITS[s]), h('div.cr.cr2', h('span', RANKS[r]), h('span', SUITS[s])));
      c.el._card = c; return c;
    };
    function deal() {
      felt.replaceChildren(); over = false;
      const use = suits === 1 ? [0] : suits === 2 ? [0, 1] : [0, 1, 2, 3], deck = [];
      for (let k = 0; k < 104 / (13 * use.length); k++) for (const s of use) for (let r = 1; r <= 13; r++) deck.push(makeCard(s, r));
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
      slots = Array.from({ length: 10 }, () => h('div.slot')); felt.append(...slots);
      tab = Array.from({ length: 10 }, () => []);
      for (let k = 0; k < 54; k++) tab[k % 10].push(deck.pop());
      tab.forEach(p => { p[p.length - 1].up = true; });
      stock = deck; doneRuns = []; score = 500; moves = 0; history = [];
      for (const c of [...stock, ...tab.flat()]) felt.append(c.el);
      layout();
    }
    function measure() {
      const W = felt.clientWidth, H = felt.clientHeight;
      gap = Math.max(3, Math.round(W * 0.01)); cw = Math.floor(clamp((W - gap * 11) / 10, 28, 86)); ch = Math.round(cw * 1.4);
      if (ch * 2.6 > H) { ch = Math.max(40, Math.floor(H / 2.6)); cw = Math.round(ch / 1.4); }
      felt.style.setProperty('--fs', Math.max(9, Math.round(cw * 0.2)) + 'px');
      return { W, H };
    }
    const colX = (i) => gap + i * (cw + gap) + Math.max(0, (felt.clientWidth - (gap * 11 + cw * 10)) / 2);
    const place = (c, x, y, z) => { const s = c.el.style; s.left = x + 'px'; s.top = y + 'px'; s.width = cw + 'px'; s.height = ch + 'px'; s.zIndex = z; c.el.classList.toggle('back', !c.up); for (const k of c.el.children) k.style.visibility = c.up ? '' : 'hidden'; c.el.querySelectorAll('.cr').forEach(e => e.style.fontSize = Math.max(9, cw * 0.19) + 'px'); c.el.querySelector('.pip').style.fontSize = (c.r > 10 ? cw * 0.3 : cw * 0.4) + 'px'; };
    function layout() {
      const { W, H } = measure(), top = gap;
      slots.forEach((el, i) => Object.assign(el.style, { left: colX(i) + 'px', top: top + 'px', width: cw + 'px', height: ch + 'px' }));
      const bottomRoom = ch * 0.5 + gap * 2;
      tab.forEach((p, i) => {
        const downs = p.filter(c => !c.up).length, ups = p.length - downs; let fd = Math.max(4, Math.round(ch * 0.1)), fu = Math.max(12, Math.round(ch * 0.26));
        const need = top + downs * fd + Math.max(0, ups - 1) * fu + ch;
        if (need > H - bottomRoom && ups > 1) fu = Math.max(7, Math.floor((H - bottomRoom - top - downs * fd - ch) / (ups - 1)));
        let y = top; p.forEach((c, k) => { place(c, colX(i), y, 10 + k); y += c.up ? fu : fd; });
      });
      // the stock sits bottom-right in little stacks of ten; finished runs bottom-left
      const piles = Math.ceil(stock.length / 10), sy = H - ch * 0.5 - gap;
      stock.forEach((c, k) => { c.up = false; const pile = Math.floor(k / 10); place(c, W - gap - cw - (piles - 1 - pile) * Math.round(cw * 0.22), sy, 600 + k); c.el.style.height = ch * 0.5 + 'px'; });
      doneRuns.forEach((run, k) => run.forEach((c, j) => { c.up = true; place(c, gap + k * Math.round(cw * 0.3), sy, 700 + k * 13 + j); c.el.style.height = ch * 0.5 + 'px'; }));
      stScore.textContent = 'Score: ' + score; stMoves.textContent = 'Moves: ' + moves; stLeft.textContent = `Deals left: ${piles}`;
    }
    /* a run you can pick up: face-up, same suit, each card one lower than the one above */
    const runFrom = (p, k) => { for (let j = k; j < p.length - 1; j++) if (!p[j].up || !p[j + 1].up || p[j].s !== p[j + 1].s || p[j].r !== p[j + 1].r + 1) return false; return p[k].up; };
    const canDrop = (c, i) => { const p = tab[i], t = p[p.length - 1]; return !t || (t.up && t.r === c.r + 1); };
    const snap = () => { history.push({ tab: tab.map(p => p.map(c => [c, c.up])), stock: stock.slice(), doneRuns: doneRuns.map(r => r.slice()), score, moves }); if (history.length > 100) history.shift(); };
    const undo = () => { const s = history.pop(); if (!s) return; tab = s.tab.map(p => p.map(([c, up]) => { c.up = up; return c; })); stock = s.stock; doneRuns = s.doneRuns; score = s.score; moves = s.moves; felt.querySelectorAll('.card').forEach(e => e.style.display = ''); layout(); };
    function after(i) {
      const p = tab[i];
      if (p.length >= 13) {   // a complete King-to-Ace run in one suit goes home
        const k = p.length - 13; if (p[k].r === 13 && runFrom(p, k)) { doneRuns.push(p.splice(k, 13)); score += 100; Sound.chord(); }
      }
      const t = p[p.length - 1]; if (t && !t.up) t.up = true;
      if (doneRuns.length === 8) return win98();
    }
    function moveRun(from, k, to) {
      snap(); const run = tab[from].splice(k); tab[to].push(...run); score--; moves++; Sound.click();
      after(from); after(to); layout();
    }
    function dealRow() {
      if (!stock.length) return;
      if (tab.some(p => !p.length)) { WM.alert('Spider', 'You are not allowed to deal a new row while there are any empty slots.', 'warn'); return; }
      snap(); for (let i = 0; i < 10; i++) { const c = stock.pop(); c.up = true; tab[i].push(c); felt.append(c.el); }
      moves++; Sound.whoosh ? Sound.whoosh() : Sound.click(); for (let i = 0; i < 10; i++) after(i); layout();
    }
    function hint() {
      for (let i = 0; i < 10; i++) { const p = tab[i]; let k = p.length - 1; while (k > 0 && runFrom(p, k - 1)) k--; if (k < 0 || !p[k]) continue;
        for (let j = 0; j < 10; j++) if (j !== i && tab[j].length && canDrop(p[k], j) && !(k > 0 && p[k - 1].up && p[k - 1].r === p[k].r + 1)) { const els = p.slice(k).map(c => c.el); els.forEach(e => e.classList.add('lift')); setTimeout(() => els.forEach(e => e.classList.remove('lift')), 700); return; } }
      WM.alert('Spider', stock.length ? 'No moves found. Try dealing a new row.' : 'There are no more moves.', 'info');
    }
    function win98() {
      over = true; score += 0; Sound.tada(); layout();
      const key = 'spider-' + suits, best = Store.data.scores[key] || 0; if (score > best) { Store.data.scores[key] = score; Store.save(); }
      setTimeout(() => WM.ask('Spider', `Congratulations, you won!\n\nScore: ${score}   Moves: ${moves}` + (score > best ? '\nThat is a new high score.' : '') + '\n\nPlay again?', ['Yes', 'No'], 'spider').then(r => { if (r === 'Yes') deal(); }), 400);
    }
    felt.addEventListener('pointerdown', (e) => {
      if (over) return; const el = e.target.closest('.card');
      if (el && stock.includes(el._card)) return dealRow();
      if (!el) return;
      const c = el._card, i = tab.findIndex(p => p.includes(c)); if (i < 0) return;
      const k = tab[i].indexOf(c); if (!runFrom(tab[i], k)) return;
      const run = tab[i].slice(k);
      drag = { i, k, run, sx: e.clientX, sy: e.clientY, moved: false, base: run.map(r => [r.el.offsetLeft, r.el.offsetTop]), fr: felt.getBoundingClientRect() };
      felt.setPointerCapture(e.pointerId);
    });
    felt.addEventListener('pointermove', (e) => {
      if (!drag) return; const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return; drag.moved = true;
      drag.run.forEach((c, j) => { c.el.style.left = drag.base[j][0] + dx + 'px'; c.el.style.top = drag.base[j][1] + dy + 'px'; c.el.style.zIndex = 900 + j; c.el.classList.add('lift'); });
    });
    felt.addEventListener('pointerup', (e) => {
      if (!drag) return; const d = drag; drag = null; d.run.forEach(c => c.el.classList.remove('lift'));
      const c = d.run[0];
      if (!d.moved) {   // a tap: best column = one with the same suit on top, then any that fits, then an empty one
        const order = [...Array(10).keys()].filter(j => j !== d.i && canDrop(c, j)).sort((a, b) => { const sa = tab[a].length ? (tab[a][tab[a].length - 1].s === c.s ? 0 : 1) : 2, sb = tab[b].length ? (tab[b][tab[b].length - 1].s === c.s ? 0 : 1) : 2; return sa - sb; });
        if (order.length) return moveRun(d.i, d.k, order[0]); Sound.ding(); return layout();
      }
      const x = e.clientX - d.fr.left;
      for (let j = 0; j < 10; j++) { const l = colX(j); if (j !== d.i && x > l - gap / 2 && x < l + cw + gap / 2 && canDrop(c, j)) return moveRun(d.i, d.k, j); }
      layout();
    });
    WM.menubar(win, [{ label: 'Game', items: () => [
      { label: 'New game', key: 'F2', action: deal }, { label: 'Undo', key: 'Ctrl+Z', action: undo, disabled: !history.length }, { label: 'Deal next row', key: 'D', action: dealRow, disabled: !stock.length }, { label: 'Show a move', key: 'M', action: hint }, '-',
      ...[[1, 'Easy: one suit'], [2, 'Medium: two suits'], [4, 'Difficult: four suits']].map(([n, lbl]) => ({ label: lbl, check: suits === n, action: () => { suits = n; Store.data.spiderSuits = n; Store.save(); deal(); } })), '-',
      { label: `High score: ${Store.data.scores['spider-' + suits] || 0}`, disabled: true }, { label: 'Exit', action: () => WM.close(win) },
    ] }, { label: 'Help', items: () => [{ label: 'How to play', action: () => WM.alert('Spider', 'Put every card into runs from King down to Ace in the same suit. A finished run leaves the table.\n\nYou can put any card on one that is one higher, whatever the suit. But only runs of ONE suit can be moved together.\n\nStuck? Click the cards in the bottom-right corner to deal a new card onto every column.\n\nKeys: F2 new game, Ctrl+Z undo, D deal, M show a move.', 'spider') }] }]);
    win.el.addEventListener('keydown', (e) => {
      if (e.key === 'F2') { e.preventDefault(); deal(); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      else if (e.key.toLowerCase() === 'd') dealRow(); else if (e.key.toLowerCase() === 'm') hint();
    });
    const ro = new ResizeObserver(() => tab && layout()); ro.observe(felt); win.onResize = () => tab && layout();
    win.onClose = () => ro.disconnect();
    gameFocus(win);
    requestAnimationFrame(deal);
  },
};
