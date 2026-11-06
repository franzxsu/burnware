/* ============================================================
   Desktop mouse and finger work: click to select, drag a box to
   select many, drag icons to move them (or drop them on a folder
   or the Recycle Bin), right-click / long-press for menus, and
   Delete, F2, Ctrl+A on the keyboard.
   ============================================================ */
const DeskInput = {
  touchAt: 0,
  dropTargets() { return { 'app:Recycle Bin': 'BIN', 'app:My Documents': 'C:\\My Documents' }; },
  wire(b, it) {
    let st = null;
    const pt = (e) => [e.clientX, e.clientY];
    b.addEventListener('pointerdown', (e) => {
      if (e.target.closest('input')) return;
      if (e.pointerType !== 'mouse') this.touchAt = Date.now();
      const add = e.ctrlKey || e.metaKey, was = Desk.sel.has(it.key);
      if (e.button === 2) { if (!was) Desk.select([it.key]); return; }
      if (e.button !== 0) return;
      if (add) Desk.select(was ? [...Desk.sel].filter(k => k !== it.key) : [...Desk.sel, it.key]);
      else if (e.shiftKey) Desk.select([it.key], true);
      else if (!was) Desk.select([it.key]);
      if (!Desk.sel.has(it.key)) return;
      st = { id: e.pointerId, p: pt(e), moved: false, touch: e.pointerType !== 'mouse', add: add || e.shiftKey, drag: null };
      try { b.setPointerCapture(e.pointerId); } catch (_) {}
      if (st.touch) st.lp = setTimeout(() => { if (st && !st.moved) { st.menu = true; Sound.click(); this.iconMenu(it, st.p[0], st.p[1]); } }, 550);
    });
    b.addEventListener('pointermove', (e) => {
      if (!st || e.pointerId !== st.id || st.menu) return;
      const dx = e.clientX - st.p[0], dy = e.clientY - st.p[1];
      if (!st.moved && Math.hypot(dx, dy) > (st.touch ? 10 : 4)) { st.moved = true; clearTimeout(st.lp); st.drag = this.startDrag(it); }
      if (st.drag) this.dragTo(st.drag, dx, dy, e.clientX, e.clientY);
    });
    const up = (e, cancel) => {
      if (!st || e.pointerId !== st.id) return;
      const s = st; st = null; clearTimeout(s.lp);
      if (s.menu) { TapShield.until = Date.now() + 350; return; }
      if (s.drag) return cancel ? Desk.render() : this.drop(s.drag, e.clientX, e.clientY);
      if (cancel) return;
      if (!s.add) Desk.select([it.key]);
      if (s.touch) { TapShield.until = Date.now() + 450; Desk.launch(it); }
    };
    b.addEventListener('pointerup', (e) => up(e, false));
    b.addEventListener('pointercancel', (e) => up(e, true));
    b.addEventListener('dblclick', () => { if (!isTouch() || Date.now() - this.touchAt > 1500) Desk.launch(it); });
    b.addEventListener('click', (e) => e.preventDefault());
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.target.closest('input')) Desk.launch(it); });
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (Date.now() - this.touchAt < 1500) return;   // a long-press already opened the menu
      this.iconMenu(it, e.clientX, e.clientY);
    });
  },
  /* ---------- dragging icons ---------- */
  startDrag(it) {
    const keys = [...Desk.sel], els = keys.map(k => Desk.els.get(k)).filter(Boolean);
    els.forEach(el => el.classList.add('drag'));
    return { it, keys, els, target: null };
  },
  dragTo(d, dx, dy, x, y) {
    for (const el of d.els) el.style.transform = `translate(${dx}px, ${dy}px)`;
    d.dx = dx; d.dy = dy;
    const t = this.targetAt(d, x, y);
    if (t !== d.target) { if (d.target) d.target.el.classList.remove('drop'); d.target = t; if (t) t.el.classList.add('drop'); }
  },
  under(d, x, y) { return document.elementsFromPoint(x, y).find(el => !d.els.some(i => i.contains(el))) || null; },
  /* what's under the finger: a folder or the bin we can drop into, or nothing */
  targetAt(d, x, y) {
    const el = this.under(d, x, y), ic = el && el.closest('.icon');
    if (!ic) return null;
    const key = ic.dataset.key, it = Desk.get(key); if (!it) return null;
    const special = this.dropTargets()[key];
    if (special) return { el: ic, key, path: special };
    if (it.node && it.node.type === 'dir') return { el: ic, key, path: it.path };
    return null;
  },
  async drop(d, x, y) {
    const mine = d.keys.filter(k => { const it = Desk.get(k); return it && it.node; });
    if (d.target) {
      d.target.el.classList.remove('drop');
      if (d.target.path === 'BIN') { Desk.render(); return Desk.remove(d.keys); }
      if (mine.length && Desk.moveInto(mine, d.target.path)) return;
      return Desk.render();
    }
    const under = this.under(d, x, y);
    if (!under || !under.closest('#desk') || under.closest('.win')) return Desk.render();   // dropped on a window or off the desk: back it goes
    /* move the whole group by the same number of cells; anything that lands on a taken spot shuffles to the nearest free one */
    const { cols, rows, px, py } = Desk.dims(), cells = Desk.cells, from = cells[d.it.key];
    const dc = Math.round(d.dx / px), dr = Math.round(d.dy / py);
    const moving = new Set(d.keys), taken = new Set();
    for (const k in cells) if (!moving.has(k)) taken.add(cells[k].join(','));
    const order = d.keys.slice().sort((a, b) => (a === d.it.key ? -1 : b === d.it.key ? 1 : 0));
    for (const k of order) {
      const c = cells[k]; if (!c) continue;
      const want = [clamp(c[0] + dc, 0, cols - 1), clamp(c[1] + dr, 0, rows - 1)];
      const at = taken.has(want.join(',')) ? Desk.nearest(want[0], want[1], (cc, rr) => !taken.has(cc + ',' + rr), cols, rows) : want;
      cells[k] = at; taken.add(at.join(','));
    }
    if (from) Sound.click();
    Desk.freeze(); Desk.render();
  },
  /* ---------- the box select ---------- */
  initDesk() {
    const desk = $('#desk'), bg = (t) => t === desk || t.id === 'wall' || t.id === 'icons';
    let st = null;
    desk.addEventListener('pointerdown', (e) => {
      if (!bg(e.target)) return;
      if (e.pointerType !== 'mouse') this.touchAt = Date.now();
      if (document.activeElement && document.activeElement.closest && document.activeElement.closest('.icon')) document.activeElement.blur();
      if (e.button === 2) { Desk.select([]); return; }
      if (e.button !== 0) return;
      const add = e.ctrlKey || e.metaKey || e.shiftKey;
      if (!add) Desk.select([]);
      const box = $('#icons').getBoundingClientRect();
      st = { id: e.pointerId, x0: e.clientX, y0: e.clientY, box, base: add ? [...Desk.sel] : [], rect: null, touch: e.pointerType !== 'mouse', moved: false };
      try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
      if (st.touch) st.lp = setTimeout(() => { if (st && !st.moved) { st.menu = true; Sound.click(); this.deskMenu(st.x0, st.y0); } }, 550);
    });
    desk.addEventListener('pointermove', (e) => {
      if (!st || e.pointerId !== st.id || st.menu) return;
      const x = e.clientX, y = e.clientY;
      if (!st.moved && Math.hypot(x - st.x0, y - st.y0) < (st.touch ? 10 : 3)) return;
      if (!st.moved) { st.moved = true; clearTimeout(st.lp); st.rect = h('div.marq'); $('#icons').append(st.rect); }
      const l = Math.min(x, st.x0), t = Math.min(y, st.y0), w = Math.abs(x - st.x0), hh = Math.abs(y - st.y0);
      Object.assign(st.rect.style, { left: l - st.box.left + 'px', top: t - st.box.top + 'px', width: w + 'px', height: hh + 'px' });
      const hit = [];
      for (const [k, el] of Desk.els) {
        const r = el.querySelector('img').getBoundingClientRect(), s = el.querySelector('span,input').getBoundingClientRect();
        const L = Math.min(r.left, s.left), T = r.top, R = Math.max(r.right, s.right), B = s.bottom;
        if (L < l + w && R > l && T < t + hh && B > t) hit.push(k);
      }
      Desk.select(st.base.concat(hit.filter(k => !st.base.includes(k))));
    });
    const end = (e) => { if (!st || e.pointerId !== st.id) return; clearTimeout(st.lp); if (st.menu) TapShield.until = Date.now() + 350; if (st.rect) st.rect.remove(); st = null; };
    desk.addEventListener('pointerup', end); desk.addEventListener('pointercancel', end);
    desk.addEventListener('contextmenu', (e) => {
      if (!bg(e.target)) return;
      e.preventDefault();
      if (Date.now() - this.touchAt < 1500) return;
      this.deskMenu(e.clientX, e.clientY);
    });
    /* keyboard: only when you're on the desktop, not typing in a window */
    addEventListener('keydown', (e) => {
      const a = document.activeElement, onDesk = !a || a === document.body || (a.closest && a.closest('.icon'));
      if (!onDesk || Desk.renaming || !Boot.ready) return;
      const keys = [...Desk.sel];
      if (e.key === 'Delete' && keys.length) { e.preventDefault(); Desk.remove(keys); }
      else if (e.key === 'F2' && keys.length === 1) { e.preventDefault(); Desk.rename(keys[0]); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && a && a.closest && a.closest('.icon')) { e.preventDefault(); Desk.select([...Desk.els.keys()]); }
      else if (e.key === 'Escape' && keys.length && !Start.open) Desk.select([]);
    });
  },
  /* ---------- menus ---------- */
  deskMenu(x, y) {
    WM.ctx(x, y, [
      { label: 'Arrange icons by name', action: () => Desk.arrange('name') },
      { label: 'Arrange icons by type', action: () => Desk.arrange('type') },
      { label: 'Reset icon layout', action: () => Desk.arrange('default') },
      { label: 'Refresh', action: () => { Desk.render(); Wall.paint(); } },
      '-',
      { label: 'New folder', action: () => Desk.create('dir', x, y) },
      { label: 'New text document', action: () => Desk.create('txt', x, y) },
      '-',
      { label: 'Change wallpaper', action: () => WM.open('settings', { tab: 'bg' }) },
      { label: 'Properties', action: () => WM.open('settings') },
    ]);
  },
  iconMenu(it, x, y) {
    const keys = [...Desk.sel], many = keys.length > 1, mineCount = keys.filter(k => { const i = Desk.get(k); return i && i.node; }).length;
    const items = [{ label: 'Open', disabled: many, action: () => Desk.launch(it) }];
    if (it.key === 'app:Recycle Bin') items.push({ label: 'Empty Recycle Bin', disabled: !FS.bin.length, action: () => WM.ask('Confirm', 'Are you sure you want to permanently delete everything in the Recycle Bin?', ['Yes', 'No'], 'warn').then(r => { if (r === 'Yes') { FS.emptyBin(); Desk.render(); } }) });
    if (mineCount) {
      items.push('-');
      if (!many && it.node) items.push({ label: 'Rename', action: () => Desk.rename(it.key) });
      items.push({ label: many ? `Delete ${mineCount} item${mineCount === 1 ? '' : 's'}` : 'Delete', action: () => Desk.remove(keys) });
      if (!many && it.node) items.push('-', { label: 'Properties', action: () => Desk.props(it) });
    }
    WM.ctx(x, y, items);
  },
};

/* swap the old fixed-grid desktop for this one */
Desktop.render = () => Desk.render();
Desktop.init = () => {
  Desk.load(); Desk.render(); DeskInput.initDesk();
  const save = FS.save.bind(FS); FS.save = function () { save(); Desk.changed(); };
  let t = 0; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (!Desk.renaming) Desk.render(); }, 150); });
};
