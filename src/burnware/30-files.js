/* ============================================================
   Exploring: My Computer, folders, the Recycle Bin, and opening
   a file with the right program. Also the Help window.
   ============================================================ */
const Files = {
  openFile(path) {
    const n = FS.resolve(path); if (!n) return WM.alert('Error', `Cannot find '${path}'.`, 'err');
    if (n.type === 'dir') return WM.open('explorer', { path });
    if (n.kind === 'app') return WM.open(n.app);
    if (n.kind === 'img') return WM.open('paint', { path });
    if (n.kind === 'snd') return WM.open('music', { track: n.track });
    if (n.kind === 'vid') return WM.open('video', { src: n.src, title: n.name });
    if (n.kind === 'sys') return WM.ask('Open System File', `${n.name} is a system file. Burnware needs it to keep running.\nOpening it is fine. Editing it is how blue screens are made.`, ['Open anyway', 'Cancel'], 'warn').then(r => { if (r === 'Open anyway') WM.open('notepad', { path }); });
    return WM.open('notepad', { path });
  },
  unlock(path) {
    return WM.prompt('Private', 'This folder is password protected.\nPassword:', '', 'password').then(v => {
      if (v === null) return false;
      const ok = ['lamok', 'mosquito', 'mosquitos', 'mosquitoes'].includes(v.trim().toLowerCase());
      if (!ok) { WM.alert('Access denied', 'That is not the password.\n(Hint: someone small and green talks about it a lot.)', 'err'); return false; }
      const n = FS.resolve(path); n.locked = false; FS.save(); Store.data.secret = true; Store.save();
      Sound.tada(); Tuko.say('You got in! I told you. I really do love lamok. A new wallpaper is waiting for you in Display Properties.', 9000);
      return true;
    });
  },
};
APPS.explorer = {
  title: 'Exploring', icon: 'computer', w: 520, h: 360,
  open(win, args) {
    let path = args.path || 'C:', hist = [], sel = null;
    const addr = h('input.field', { type: 'text', 'aria-label': 'Address' });
    const grid = h('div.fgrid.scroller'), stL = h('span'), stR = h('span');
    const back = h('button.tool', { title: 'Back', 'aria-label': 'Back', text: '◀ Back' });
    const up = h('button.tool', { title: 'Up one level', 'aria-label': 'Up', text: '▲ Up' });
    const newF = h('button.tool', { text: 'New folder' }), del = h('button.tool', { text: '✕ Delete' }), rest = h('button.tool', { text: 'Restore' }), empty = h('button.tool', { text: 'Empty bin' });
    win.body.append(h('div.toolbar', back, up, newF, del, rest, empty), h('div.addr', h('span', 'Address'), addr), h('div.sunk', { style: { flex: 1, minHeight: 0, display: 'flex', padding: '2px' } }, grid), h('div.status', stL, stR));
    const inBin = () => path === 'BIN';
    const go = async (p, push = true) => {
      if (p !== 'BIN') {
        const n = FS.resolve(p);
        if (!n) return WM.alert('Exploring', `Cannot find '${p}'.`, 'err');
        if (n.type !== 'dir') return Files.openFile(p);
        if (n.locked && !(await Files.unlock(p))) return;
      }
      if (push && p !== path) hist.push(path);
      path = p; sel = null; render();
    };
    const openItem = (n, i) => {
      if (inBin()) return WM.ask('Recycle Bin', `Restore '${n.name}' to ${n.from || 'My Documents'}?`, ['Restore', 'Cancel'], 'binfull').then(r => { if (r === 'Restore') { FS.restore(i); render(); Desktop.render(); } });
      const p = FS.join(path, n.name);
      if (n.type === 'dir') go(p); else Files.openFile(p);
    };
    const remove = (n) => {
      if (!n || inBin()) return;
      const p = FS.join(path, n.name), sys = n.system || /\\Burnware\\System/i.test(p) || n.kind === 'sys';
      WM.ask('Confirm File Delete', `Are you sure you want to send '${n.name}' to the Recycle Bin?` + (sys ? '\n\nWarning: this is part of Burnware itself.' : ''), ['Yes', 'No'], sys ? 'warn' : 'binfull').then(r => {
        if (r !== 'Yes') return;
        if (sys) return Boot.bsod('BURNWARE_SYSTEM_FILE_DELETED', `Someone deleted ${n.name}. Bold move.`);
        FS.remove(p); render(); Desktop.render();
      });
    };
    function render() {
      const node = inBin() ? null : FS.resolve(path), kids = inBin() ? FS.bin : node.children;
      WM.setTitle(win, inBin() ? 'Recycle Bin' : path === 'C:' ? 'My Computer' : 'Exploring - ' + FS.split(path).pop());
      win.icon = inBin() ? (FS.bin.length ? 'binfull' : 'bin') : path === 'C:' ? 'computer' : 'folder';
      win.tb.querySelector('img').src = Icons.url(win.icon, 1);
      addr.value = inBin() ? 'Recycle Bin' : path === 'C:' ? 'C:\\' : path;
      back.disabled = !hist.length; up.disabled = inBin() || path === 'C:';
      newF.hidden = del.hidden = inBin(); rest.hidden = empty.hidden = !inBin();
      grid.replaceChildren();
      if (!kids.length) grid.append(h('div.empty-note', inBin() ? 'The Recycle Bin is empty.' : 'This folder is empty.'));
      kids.forEach((n, i) => {
        const b = h('button.fitem', { title: n.name }, Icons.img(FS.iconFor(n)), h('span', n.name));
        const launch = () => { const t = Date.now(); if (t - (b._t || 0) < 800) return; b._t = t; openItem(n, i); };
        b.onclick = () => { $$('.fitem.sel', grid).forEach(x => x.classList.remove('sel')); b.classList.add('sel'); sel = { n, i }; stR.textContent = n.type === 'dir' ? 'Folder' : fmtSize(FS.size(n)); if (isTouch()) launch(); };
        b.ondblclick = () => { if (!isTouch()) launch(); };
        b.oncontextmenu = (e) => { e.preventDefault(); b.onclick(); WM.ctx(e.clientX, e.clientY, inBin() ? [{ label: 'Restore', action: () => { FS.restore(i); render(); Desktop.render(); } }] : [
          { label: 'Open', action: () => openItem(n, i) },
          { label: 'Rename', action: async () => { const v = await WM.prompt('Rename', 'New name:', n.name); if (v && v.trim()) { const dir = FS.resolve(path); n.name = FS.uniqueName(dir, v.trim().replace(/[\\/:*?"<>|]/g, '')); FS.save(); render(); } } },
          { label: 'Delete', action: () => remove(n) },
          '-',
          { label: 'Properties', action: () => WM.alert(n.name + ' Properties', `Type: ${n.type === 'dir' ? 'File Folder' : ({ txt: 'Text Document', img: 'Bitmap Image', sys: 'System file', app: 'Shortcut', snd: 'Wave Sound', vid: 'Video Clip' })[n.kind] || 'File'}\nLocation: ${path}\nSize: ${fmtSize(FS.size(n))}`, FS.iconFor(n) === 'folder' ? 'info' : 'info') },
        ]); };
        grid.append(b);
      });
      stL.textContent = `${kids.length} object(s)`; stR.textContent = inBin() ? '' : fmtSize(FS.size(node));
    }
    back.onclick = () => { if (hist.length) go(hist.pop(), false); };
    up.onclick = () => go(FS.parentPath(path));
    addr.onkeydown = (e) => { if (e.key === 'Enter') { const v = addr.value.trim(); go(/^recycle/i.test(v) ? 'BIN' : v.replace(/\\$/, '') || 'C:'); } };
    del.onclick = () => sel && remove(sel.n);
    rest.onclick = () => { if (sel) { FS.restore(sel.i); render(); Desktop.render(); } };
    empty.onclick = () => WM.ask('Confirm', 'Are you sure you want to permanently delete everything in the Recycle Bin?', ['Yes', 'No'], 'warn').then(r => { if (r === 'Yes') { FS.emptyBin(); render(); Desktop.render(); } });
    newF.onclick = async () => { const v = await WM.prompt('New Folder', 'Folder name:', 'New Folder'); if (v && v.trim()) { const dir = FS.resolve(path); FS.mkdir(FS.join(path, FS.uniqueName(dir, v.trim()))); render(); } };
    win.body.addEventListener('keydown', (e) => { if (e.key === 'Delete' && sel) remove(sel.n); if (e.key === 'Backspace' && e.target === win.body) up.click(); });
    win.reopen = (w, a) => { if (a.path) go(a.path); };
    go(path, false);
  },
};
function fmtSize(b) { return b < 1024 ? b + ' bytes' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB'; }

APPS.help = {
  title: 'Burnware Help', icon: 'help', w: 520, h: 420, single: true,
  open(win) {
    const page = h('div.web.scroller', { style: { padding: '12px 16px', font: '13px/1.45 var(--ui)' }, html: `
      <h2 style="font:700 20px var(--pix);margin:0 0 6px">Burnware Help</h2>
      <p>Burnware is a pretend computer from the late nineties that runs in your browser. It holds everything that got made while someone burned through a week of tokens on purpose. Everything you make here (files, paintings, high scores) is saved in this browser only.</p>
      <h3>Getting around</h3>
      <ul><li><b>Open things:</b> double-click a desktop icon (tap once on a touch screen).</li>
      <li><b>Move a window:</b> drag its title bar. <b>Resize:</b> drag the bottom-right corner. <b>Maximise:</b> double-click the title bar.</li>
      <li><b>Start menu:</b> every program, plus Run and Shut Down.</li>
      <li><b>Right-click the desktop</b> to change the wallpaper or make a new text file.</li></ul>
      <h3>The big ones</h3>
      <ul><li><b>Omnigacha:</b> a gacha machine that pulls for everything. Tap the machine to shake loose tokens, then pull.</li>
      <li><b>WRC 1988:</b> a fan-made rally game, dressed like it's 1988, on loose gravel. Arrow keys or WASD, Space for the handbrake. On a phone, turn it sideways.</li>
      <li><b>Sizzle Sand:</b> a kitchen where every grain is simulated. Cook what the tickets ask for, or just cook. Things will catch fire.</li>
      <li><b>Rain.wav:</b> a lo-fi music video, every pixel and note made in code. It plays in the Media Player.</li>
      <li><b>Kaiju Rampage:</b> still being built.</li></ul>
      <p>Each of the big ones runs in its own window. Use <b>Full screen</b> or <b>New tab</b> in its toolbar to give it the whole screen.</p>
      <h3>The time machine</h3>
      <p>Click the clock on the taskbar to pick a year. Burnware moves to it, and <b>SparkNet News</b> in Torch shows real headlines from that year, read live from Wikipedia. Any year from 1000 to now works.</p>
      <h3>Everything else</h3>
      <ul><li><b>Paint:</b> pencil, brush, spray, fill, shapes. File &gt; Set as Wallpaper.</li>
      <li><b>Minesweeper:</b> right-click (or turn on the flag button) to flag a mine. Click a number with the right flags around it to clear its neighbours.</li>
      <li><b>Solitaire:</b> drag cards, or double-click a card to send it home. Click the deck to draw.</li>
      <li><b>Snake:</b> arrow keys or WASD, or swipe on a touch screen.</li>
      <li><b>Command Prompt:</b> a command line. Type <code>help</code>.</li>
      <li><b>Torch:</b> the World Wide Web, as it was. Try the bookmarks.</li>
      <li><b>Smoke Signals:</b> chat with DialUpDan. Here he uses his offline replies; when this computer runs inside Claude, Claude plays him live.</li>
      <li><b>MixBurner:</b> plays music made from scratch in code.</li></ul>
      <h3>Secrets</h3>
      <p>There is a locked folder. There is a gecko. They are related.</p>
      <h3>About</h3>
      <p>Every program here was built in code, from the boot beep to the last pixel, by Claude.</p>` });
    win.body.append(h('div.sunk', { style: { flex: 1, display: 'flex', padding: '2px', minHeight: 0 } }, page));
  },
};
