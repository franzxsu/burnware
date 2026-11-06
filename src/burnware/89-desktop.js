/* ============================================================
   The desktop, take two: icons sit on a grid you can rearrange,
   your own folders and files live in C:\Desktop, and right-click
   (or long-press) gives you New Folder and friends.
   This file: layout, rendering, rename, delete and moving files.
   89-desktop-input.js does the mouse and finger work.
   ============================================================ */
const Desk = {
  key: 'burnware-desk-v1', dir: 'C:\\Desktop', pos: {}, cells: {}, sel: new Set(), els: new Map(), items: [], sig: '', renaming: null,
  load() { try { this.pos = JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { this.pos = {}; } },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.pos)); } catch (e) {} },
  pitch() { return matchMedia('(max-width: 720px)').matches ? [78, 78] : [84, 80]; },
  dims() {
    const r = $('#icons').getBoundingClientRect(), [px, py] = this.pitch();
    return { cols: Math.max(1, Math.floor((r.width + 6) / px)), rows: Math.max(1, Math.floor((r.height + 2) / py)), px, py, r };
  },
  folder() { return FS.resolve(this.dir) || FS.mkdir(this.dir); },
  /* everything on the desktop: the built-in shortcuts, then whatever is in C:\Desktop */
  list() {
    const apps = Desktop.items.map(it => ({ key: 'app:' + it.label, label: it.label, icon: typeof it.icon === 'function' ? it.icon() : it.icon, open: it.open, app: it }));
    const d = this.folder(), own = d ? d.children.map(n => { const path = FS.join(this.dir, n.name); return { key: 'fs:' + n.name, label: n.name, icon: FS.iconFor(n), node: n, path, open: () => Files.openFile(path) }; }) : [];
    return apps.concat(own);
  },
  signature() { const d = this.folder(); return (d ? d.children.map(n => n.name + (n.type === 'dir' ? '/' : '')).join('|') : '') + '#' + FS.bin.length; },
  get(key) { return this.items.find(i => i.key === key); },
  /* where every icon goes: saved spots first, then the first free cell, column by column */
  layout() {
    const { cols, rows } = this.dims(), taken = new Set(), cells = {};
    const free = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && !taken.has(c + ',' + r);
    const put = (key, c, r) => { taken.add(c + ',' + r); cells[key] = [c, r]; };
    const later = [];
    for (const it of this.items) { const p = this.pos[it.key]; if (p && free(p[0], p[1])) put(it.key, p[0], p[1]); else later.push(it); }
    for (const it of later) { const p = this.pos[it.key]; const at = p ? this.nearest(clamp(p[0], 0, cols - 1), clamp(p[1], 0, rows - 1), free, cols, rows) : this.firstFree(free, cols, rows); put(it.key, at[0], at[1]); }
    this.cells = cells; return cells;
  },
  firstFree(free, cols, rows) { for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) if (free(c, r)) return [c, r]; return [cols - 1, rows - 1]; },
  nearest(c0, r0, free, cols, rows) {
    let best = null, bd = Infinity;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) if (free(c, r)) { const d = (c - c0) ** 2 + (r - r0) ** 2 * 1.1; if (d < bd) { bd = d; best = [c, r]; } }
    return best || [cols - 1, rows - 1];
  },
  /* remember the spot of every icon, so moving one doesn't shuffle the rest */
  freeze() { for (const k in this.cells) this.pos[k] = this.cells[k].slice(); this.save(); },
  render() {
    const box = $('#icons'); if (!box) return;
    this.items = this.list(); this.sig = this.signature();
    for (const k of [...this.sel]) if (!this.get(k)) this.sel.delete(k);
    const cells = this.layout(), { px, py } = this.dims();
    box.replaceChildren(); this.els.clear();
    for (const it of this.items) {
      const b = h('button.icon', { role: 'listitem', 'aria-label': it.label, 'data-key': it.key }, Icons.img(it.icon), h('span', it.label));
      const [c, r] = cells[it.key]; b.style.left = c * px + 'px'; b.style.top = r * py + 'px';
      if (this.sel.has(it.key)) b.classList.add('sel');
      DeskInput.wire(b, it); box.append(b); this.els.set(it.key, b);
    }
  },
  /* something changed the C: drive (Exploring, the Command Prompt...): redraw if the desktop is affected */
  changed() { if (this.renaming) return; if (this.signature() !== this.sig) { cancelAnimationFrame(this._raf); this._raf = requestAnimationFrame(() => { if (!this.renaming && this.signature() !== this.sig) this.render(); }); } },
  select(keys, add) { if (!add) this.sel.clear(); for (const k of keys) this.sel.add(k); this.paintSel(); },
  paintSel() { for (const [k, el] of this.els) el.classList.toggle('sel', this.sel.has(k)); },
  launch(it) { const b = this.els.get(it.key), t = Date.now(); if (b && t - (b._t || 0) < 800) return; if (b) b._t = t; Sound.click(); it.open(); },
  /* the free cell nearest a point on screen */
  cellAt(x, y) {
    const { cols, rows, px, py, r } = this.dims(), taken = new Set(Object.values(this.cells).map(p => p.join(',')));
    const c0 = clamp(Math.round((x - r.left - 39) / px), 0, cols - 1), r0 = clamp(Math.round((y - r.top - 30) / py), 0, rows - 1);
    return this.nearest(c0, r0, (c, rr) => c >= 0 && rr >= 0 && c < cols && rr < rows && !taken.has(c + ',' + rr), cols, rows);
  },
  async create(kind, x, y) {
    const d = this.folder(); if (!d) return;
    const name = FS.uniqueName(d, kind === 'dir' ? 'New Folder' : 'New Text Document.txt'), path = FS.join(this.dir, name);
    const at = x == null ? this.cellAt(-1e4, -1e4) : this.cellAt(x, y);
    this.freeze(); this.pos['fs:' + name] = at; this.save();
    if (kind === 'dir') FS.mkdir(path); else FS.write(path, { kind: 'txt', text: '' });
    Sound.click(); this.render(); this.select(['fs:' + name]); this.rename('fs:' + name);
  },
  /* rename in place, like the real thing: type, then Enter */
  rename(key) {
    const it = this.get(key), b = this.els.get(key); if (!it || !it.node || !b) return;
    const span = b.querySelector('span'), inp = h('input.iren', { type: 'text', value: it.node.name, 'aria-label': 'New name', spellcheck: false });
    this.renaming = key; span.replaceWith(inp); inp.focus();
    const dot = it.node.type === 'dir' ? -1 : it.node.name.lastIndexOf('.'); inp.setSelectionRange(0, dot > 0 ? dot : it.node.name.length);
    let done = false;
    const finish = async (ok) => {
      if (done) return; done = true; this.renaming = null;
      const v = inp.value.trim(), n = it.node, d = this.folder();
      if (ok && v && v !== n.name) {
        if (/[\\/:*?"<>|]/.test(v)) await WM.alert('Rename', 'A file name cannot contain any of these characters:\n\\ / : * ? " < > |', 'err');
        else if (d.children.some(c => c !== n && c.name.toLowerCase() === v.toLowerCase())) await WM.alert('Error Renaming File', `Cannot rename ${n.name}: a file with the name '${v}' already exists.`, 'err');
        else { const old = 'fs:' + n.name; this.pos['fs:' + v] = this.pos[old]; delete this.pos[old]; n.name = v; this.save(); FS.save(); this.sel.delete(old); this.sel.add('fs:' + v); }
      }
      this.render();
    };
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); finish(true); } if (e.key === 'Escape') { e.preventDefault(); finish(false); } });
    const t0 = Date.now();   // on a phone the lifted finger can steal focus right away: keep the box open, tap it to type
    inp.addEventListener('blur', () => { if (Date.now() - t0 < 700 && !done) { setTimeout(() => { if (!done) inp.focus({ preventScroll: true }); }, 0); return; } finish(true); });
    for (const ev of ['pointerdown', 'pointerup', 'click', 'dblclick']) inp.addEventListener(ev, (e) => e.stopPropagation());
  },
  /* only your own files and folders can go in the bin; the built-in icons are load-bearing */
  async remove(keys) {
    const mine = keys.map(k => this.get(k)).filter(it => it && it.node);
    if (!mine.length) { if (keys.length) WM.alert('Burnware', 'That icon is part of Burnware, so it stays.\n(Your own folders and files can go in the Recycle Bin.)', 'info'); return; }
    const q = mine.length === 1 ? `Are you sure you want to send '${mine[0].label}' to the Recycle Bin?` : `Are you sure you want to send these ${mine.length} items to the Recycle Bin?`;
    if (await WM.ask(mine.length === 1 ? 'Confirm File Delete' : 'Confirm Multiple File Delete', q, ['Yes', 'No'], 'binfull') !== 'Yes') return;
    for (const it of mine) { FS.remove(it.path); delete this.pos[it.key]; this.sel.delete(it.key); }
    this.save(); this.render();
  },
  /* drop onto a folder: the files move inside it */
  moveInto(keys, destPath) {
    const dest = FS.resolve(destPath), d = this.folder(); if (!dest || dest.type !== 'dir') return 0;
    let n = 0;
    for (const k of keys) {
      const it = this.get(k); if (!it || !it.node || it.node === dest) continue;
      d.children.splice(d.children.indexOf(it.node), 1); it.node.name = FS.uniqueName(dest, it.node.name); dest.children.push(it.node);
      delete this.pos[k]; this.sel.delete(k); n++;
    }
    if (n) { this.save(); FS.save(); Sound.click(); this.render(); }
    return n;
  },
  props(it) {
    const n = it.node, kind = n.type === 'dir' ? 'File Folder' : { txt: 'Text Document', img: 'Bitmap Image', snd: 'Wave Sound', vid: 'Movie Clip', app: 'Shortcut' }[n.kind] || 'File';
    const kb = Math.max(1, Math.ceil(FS.size(n) / 1024));
    WM.alert(it.label + ' Properties', `${it.label}\n\nType:       ${kind}\nLocation:   ${this.dir}\nSize:       ${kb} KB` + (n.type === 'dir' ? `\nContains:   ${n.children.length} item${n.children.length === 1 ? '' : 's'}` : ''), n.type === 'dir' ? 'folder' : 'txt');
  },
  /* tidy up: by name or by type keeps the system icons first */
  arrange(how) {
    const sys = ['app:My Computer', 'app:My Documents', 'app:Recycle Bin'];
    let order = this.items.slice();
    if (how === 'default') { this.pos = {}; this.save(); return this.render(); }
    const rank = (it) => sys.includes(it.key) ? sys.indexOf(it.key) : 10;
    const type = (it) => !it.node ? 0 : it.node.type === 'dir' ? 1 : 2;
    order.sort((a, b) => rank(a) - rank(b) || (how === 'type' ? type(a) - type(b) : 0) || a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    const { cols, rows } = this.dims(); this.pos = {};
    order.forEach((it, i) => { this.pos[it.key] = [Math.min(cols - 1, Math.floor(i / rows)), i % rows]; });
    this.save(); this.render();
  },
};
