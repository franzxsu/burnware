/* ============================================================
   Solitaire (Klondike). Drag cards, or tap one to send it where it
   fits best. Winning gets the famous bouncing cards.
   ============================================================ */
APPS.solitaire = {
  title: 'Solitaire', icon: 'cards', w: 640, h: 470, minW: 320, minH: 300,
  open(win) {
    const SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const felt = h('div.felt'), stScore = h('span'), stTime = h('span', { style: { flex: '0 0 110px' } });
    win.body.append(h('div.sunk', { style: { flex: 1, display: 'flex', padding: '2px', minHeight: 0 } }, felt), h('div.status', stScore, stTime));
    let stock, waste, found, tab, score, t0, timer, cw, ch, gap, top2, fan, drag = null, won = false, draw = Store.data.solDraw || 1, history = [];
    const red = (c) => c.s === 1 || c.s === 2;
    const makeCard = (s, r) => {
      const c = { s, r, up: false };
      const face = r > 10 ? h('div.pip.face', RANKS[r] + SUITS[s]) : h('div.pip', SUITS[s]);
      c.el = h('div.card.' + (s === 1 || s === 2 ? 'red' : 'black'), { 'aria-label': RANKS[r] + ' of ' + ['spades', 'hearts', 'diamonds', 'clubs'][s] }, h('div.cr', h('span', RANKS[r]), h('span', SUITS[s])), face, h('div.cr.cr2', h('span', RANKS[r]), h('span', SUITS[s])));
      c.el._card = c; return c;
    };
    const slots = { stock: h('div.slot.stock'), found: [0, 1, 2, 3].map(() => h('div.slot.f')), tab: [0, 1, 2, 3, 4, 5, 6].map(() => h('div.slot')) };
    felt.append(slots.stock, ...slots.found, ...slots.tab);
    const deal = () => {
      felt.querySelectorAll('.card').forEach(e => e.remove()); felt.querySelector('canvas')?.remove();
      const deck = []; for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push(makeCard(s, r));
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
      tab = [[], [], [], [], [], [], []]; found = [[], [], [], []]; waste = []; history = [];
      for (let i = 0; i < 7; i++) for (let j = i; j < 7; j++) { const c = deck.pop(); c.up = i === j; tab[j].push(c); }
      stock = deck; deck.forEach(c => { c.up = false; });
      for (const c of [...stock, ...tab.flat()]) felt.append(c.el);
      score = 0; won = false; t0 = Date.now(); clearInterval(timer); timer = setInterval(() => { if (!won) stTime.textContent = 'Time: ' + Math.floor((Date.now() - t0) / 1000); }, 1000);
      layout();
    };
    const measure = () => {
      const W = felt.clientWidth, H = felt.clientHeight;
      gap = Math.max(4, Math.round(W * 0.012)); cw = Math.floor(clamp((W - gap * 8) / 7, 34, 92)); ch = Math.round(cw * 1.4);
      if (ch * 3.2 > H) { ch = Math.max(46, Math.floor(H / 3.2)); cw = Math.round(ch / 1.4); }
      top2 = gap + ch + Math.round(gap * 1.6); fan = Math.max(12, Math.round(ch * 0.24));
      const fs = Math.max(10, Math.round(cw * 0.2));
      felt.style.setProperty('--fs', fs + 'px');
      return { W, H };
    };
    const colX = (i) => gap + i * (cw + gap) + Math.max(0, (felt.clientWidth - (gap * 8 + cw * 7)) / 2);
    const place = (c, x, y, z) => { const s = c.el.style; s.left = x + 'px'; s.top = y + 'px'; s.width = cw + 'px'; s.height = ch + 'px'; s.zIndex = z; c.el.classList.toggle('back', !c.up); for (const k of c.el.children) k.style.visibility = c.up ? '' : 'hidden'; c.el.querySelectorAll('.cr').forEach(e => e.style.fontSize = Math.max(10, cw * 0.19) + 'px'); c.el.querySelector('.pip').style.fontSize = (c.r > 10 ? cw * 0.34 : cw * 0.42) + 'px'; };
    function layout() {
      const { H } = measure();
      const ss = (el, x, y) => Object.assign(el.style, { left: x + 'px', top: y + 'px', width: cw + 'px', height: ch + 'px' });
      ss(slots.stock, colX(0), gap); slots.found.forEach((el, i) => ss(el, colX(3 + i), gap)); slots.tab.forEach((el, i) => ss(el, colX(i), top2));
      stock.forEach((c, k) => place(c, colX(0) + Math.min(k, 6) * 0.3, gap, 10 + k));
      const wv = draw === 3 ? waste.slice(-3) : waste.slice(-1);
      waste.forEach((c, k) => { const vi = wv.indexOf(c); place(c, colX(1) + (vi > 0 ? vi * Math.round(cw * 0.22) : 0), gap, 10 + k); });
      found.forEach((p, i) => p.forEach((c, k) => place(c, colX(3 + i), gap, 10 + k)));
      tab.forEach((p, i) => {
        let downs = p.filter(c => !c.up).length, ups = p.length - downs, fd = Math.max(4, Math.round(ch * 0.09)), fu = fan;
        const need = top2 + downs * fd + Math.max(0, ups - 1) * fu + ch;
        if (need > H - 4 && ups > 1) fu = Math.max(8, Math.floor((H - 4 - top2 - downs * fd - ch) / (ups - 1)));
        let y = top2; p.forEach((c, k) => { place(c, colX(i), y, 10 + k); y += c.up ? fu : fd; });
      });
      stScore.textContent = 'Score: ' + score;
    }
    const where = (c) => {
      if (stock.includes(c)) return ['stock', stock]; if (waste.includes(c)) return ['waste', waste];
      for (let i = 0; i < 4; i++) if (found[i].includes(c)) return ['found', found[i], i];
      for (let i = 0; i < 7; i++) if (tab[i].includes(c)) return ['tab', tab[i], i];
      return [null];
    };
    const canFound = (c, i) => { const p = found[i], t = p[p.length - 1]; return t ? (t.s === c.s && t.r === c.r - 1) : c.r === 1; };
    const canTab = (c, i) => { const p = tab[i], t = p[p.length - 1]; return t ? (t.up && red(t) !== red(c) && t.r === c.r + 1) : c.r === 13; };
    const snapshot = () => { history.push(JSON.stringify({ stock: stock.map(id), waste: waste.map(id), found: found.map(p => p.map(id)), tab: tab.map(p => p.map(id)), score })); if (history.length > 60) history.shift(); };
    const all = () => [...stock, ...waste, ...found.flat(), ...tab.flat()];
    const id = (c) => c.s * 13 + c.r + (c.up ? 100 : 0);
    const undo = () => {
      const s = history.pop(); if (!s) return; const d = JSON.parse(s), byId = {}; all().forEach(c => { byId[c.s * 13 + c.r] = c; });
      const back = (arr) => arr.map(v => { const c = byId[v % 100]; c.up = v >= 100; return c; });
      stock = back(d.stock); waste = back(d.waste); found = d.found.map(back); tab = d.tab.map(back); score = d.score; layout();
    };
    const move = (cards, from, to, toIdx) => {
      snapshot();
      from.splice(from.length - cards.length, cards.length);
      const dest = to === 'found' ? found[toIdx] : tab[toIdx]; dest.push(...cards);
      const last = from[from.length - 1];
      if (last && !last.up && tab.includes(from)) { last.up = true; score += 5; }
      Sound.click(); layout(); checkEnd();
    };
    const drawCards = () => {
      snapshot();
      if (!stock.length) { if (!waste.length) return; stock = waste.reverse(); waste = []; stock.forEach(c => { c.up = false; }); if (draw === 1) score = Math.max(0, score - 100); }
      else { const n = Math.min(draw, stock.length); for (let k = 0; k < n; k++) { const c = stock.pop(); c.up = true; waste.push(c); felt.append(c.el); } }
      Sound.click(); layout();
    };
    const smart = (c) => {   // tap: home if it can go home, otherwise the first column that takes it
      const [kind, pile, pi] = where(c); if (!kind || kind === 'stock') return false;
      const k = pile.indexOf(c), cards = pile.slice(k);
      if (cards.length === 1) for (let i = 0; i < 4; i++) if (canFound(c, i)) { score += kind === 'waste' || kind === 'tab' ? 10 : 0; move(cards, pile, 'found', i); return true; }
      for (let i = 0; i < 7; i++) if (!(kind === 'tab' && i === pi) && canTab(c, i)) { score += kind === 'waste' ? 5 : kind === 'found' ? -15 : 0; move(cards, pile, 'tab', i); return true; }
      return false;
    };
    function checkEnd() {
      if (found.every(p => p.length === 13)) return victory();
      if (!stock.length && !waste.length && tab.every(p => p.every(c => c.up)) && !won) {   // only easy moves left: finish it
        won = 'auto';
        const step = () => { for (let i = 0; i < 7; i++) { const c = tab[i][tab[i].length - 1]; if (!c) continue; for (let f = 0; f < 4; f++) if (canFound(c, f)) { tab[i].pop(); found[f].push(c); score += 10; Sound.click(); layout(); if (found.every(p => p.length === 13)) return victory(); return setTimeout(step, 70); } } };
        setTimeout(step, 200);
      }
    }
    function victory() {
      won = true; clearInterval(timer); const secs = Math.floor((Date.now() - t0) / 1000), bonus = secs > 30 ? Math.round(700000 / secs) : 0; score += bonus; layout(); Sound.tada();
      const best = Store.data.scores.solitaire || 0; if (score > best) { Store.data.scores.solitaire = score; Store.save(); }
      if (calm()) { WM.alert('Solitaire', `You won! Score ${score}. Deal again?`, 'cards'); return; }
      // the bouncing cards
      const cvs = h('canvas.solwin'), W = felt.clientWidth, H = felt.clientHeight; cvs.width = W; cvs.height = H; felt.append(cvs); cvs.style.zIndex = 500;
      const g = cvs.getContext('2d'), img = (c) => { const k = document.createElement('canvas'); k.width = cw; k.height = ch; const x = k.getContext('2d'); x.fillStyle = '#fff'; x.strokeStyle = '#111'; x.lineWidth = 1; x.beginPath(); x.roundRect ? x.roundRect(0.5, 0.5, cw - 1, ch - 1, 5) : x.rect(0.5, 0.5, cw - 1, ch - 1); x.fill(); x.stroke(); x.fillStyle = red(c) ? '#d01818' : '#111'; x.font = `700 ${Math.round(cw * 0.22)}px Tahoma, sans-serif`; x.fillText(RANKS[c.r], 4, cw * 0.24); x.fillText(SUITS[c.s], 4, cw * 0.46); x.font = `${Math.round(cw * 0.45)}px Tahoma, sans-serif`; x.textAlign = 'center'; x.fillText(c.r > 10 ? RANKS[c.r] : SUITS[c.s], cw / 2, ch * 0.66); return k; };
      const queue = []; for (let r = 13; r >= 1; r--) for (let f = 0; f < 4; f++) queue.push(found[f][r - 1]);
      let cur = null, stopped = false;
      const launch = () => { const c = queue.shift(); if (!c) { stopped = true; return; } c.el.style.visibility = 'hidden'; const fi = found.findIndex(p => p.includes(c)); cur = { im: img(c), x: colX(3 + fi), y: gap, vx: (Math.random() < 0.5 ? -1 : 1) * rand(2, 6), vy: -rand(0, 6) }; };
      launch();
      const tickWin = () => {
        if (stopped || !cvs.isConnected) return;
        if (cur) { cur.vy += 0.6; cur.x += cur.vx; cur.y += cur.vy; if (cur.y + ch > H) { cur.y = H - ch; cur.vy *= -0.78; } g.drawImage(cur.im, cur.x, cur.y); if (cur.x < -cw || cur.x > W) launch(); }
        requestAnimationFrame(tickWin);
      };
      requestAnimationFrame(tickWin);
      cvs.style.pointerEvents = 'auto'; cvs.onclick = () => { stopped = true; cvs.remove(); deal(); };
      setTimeout(() => WM.alert('Solitaire', `You won! Score: ${score}${bonus ? ` (time bonus ${bonus})` : ''}.\nClick the felt to deal again.`, 'cards'), 400);
    }
    // pointer: drag a run, or tap for a smart move
    felt.addEventListener('pointerdown', (e) => {
      if (won === true) return;
      const el = e.target.closest('.card'), slot = e.target.closest('.slot');
      if (!el) { if (slot === slots.stock) drawCards(); return; }
      const c = el._card, [kind, pile] = where(c);
      if (kind === 'stock') { drawCards(); return; }
      if (!c.up) { if (kind === 'tab' && pile[pile.length - 1] === c) { snapshot(); c.up = true; score += 5; Sound.click(); layout(); checkEnd(); } return; }
      if (kind === 'waste' && waste[waste.length - 1] !== c) return;
      if (kind === 'found' && pile[pile.length - 1] !== c) return;
      const cards = pile.slice(pile.indexOf(c));
      const fr = felt.getBoundingClientRect();
      drag = { cards, from: pile, kind, sx: e.clientX, sy: e.clientY, moved: false, base: cards.map(k => [k.el.offsetLeft, k.el.offsetTop]), fr };
      felt.setPointerCapture(e.pointerId);
    });
    felt.addEventListener('pointermove', (e) => {
      if (!drag) return; const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return;
      drag.moved = true;
      drag.cards.forEach((k, j) => { k.el.style.left = drag.base[j][0] + dx + 'px'; k.el.style.top = drag.base[j][1] + dy + 'px'; k.el.style.zIndex = 400 + j; k.el.classList.add('lift'); });
    });
    felt.addEventListener('pointerup', (e) => {
      if (!drag) return; const d = drag; drag = null; d.cards.forEach(k => k.el.classList.remove('lift'));
      if (!d.moved) { if (!smart(d.cards[0])) layout(); return; }
      const fr = d.fr, x = e.clientX - fr.left, y = e.clientY - fr.top, c = d.cards[0];
      const cx = x, cy = y;
      for (let i = 0; i < 4; i++) { const l = colX(3 + i); if (d.cards.length === 1 && cx > l - gap && cx < l + cw + gap && cy < gap + ch + gap && canFound(c, i)) { score += d.kind !== 'found' ? 10 : 0; return move(d.cards, d.from, 'found', i); } }
      for (let i = 0; i < 7; i++) { const l = colX(i); if (cx > l - gap / 2 && cx < l + cw + gap / 2 && cy > top2 - gap && canTab(c, i) && tab[i] !== d.from) { score += d.kind === 'waste' ? 5 : d.kind === 'found' ? -15 : 0; return move(d.cards, d.from, 'tab', i); } }
      layout();
    });
    felt.addEventListener('dblclick', (e) => { const el = e.target.closest('.card'); if (el && el._card.up) { const c = el._card; for (let i = 0; i < 4; i++) if (canFound(c, i)) { const [, pile] = where(c); if (pile[pile.length - 1] === c) { score += 10; move([c], pile, 'found', i); } return; } } });
    WM.menubar(win, [{ label: 'Game', items: () => [
      { label: 'Deal', key: 'F2', action: deal }, { label: 'Undo', key: 'Ctrl+Z', action: undo, disabled: !history.length }, '-',
      { label: 'Draw one', check: draw === 1, action: () => { draw = 1; Store.data.solDraw = 1; Store.save(); deal(); } },
      { label: 'Draw three', check: draw === 3, action: () => { draw = 3; Store.data.solDraw = 3; Store.save(); deal(); } }, '-',
      { label: `Best score: ${Store.data.scores.solitaire || 0}`, disabled: true }, { label: 'Exit', action: () => WM.close(win) },
    ] }]);
    win.el.addEventListener('keydown', (e) => { if (e.key === 'F2') { e.preventDefault(); deal(); } if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); } });
    win.onResize = () => layout();
    const ro = new ResizeObserver(() => layout()); ro.observe(felt);
    win.onClose = () => { clearInterval(timer); ro.disconnect(); };
    requestAnimationFrame(deal);
  },
};
