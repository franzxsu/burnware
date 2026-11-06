/* ============================================================
   Notepad: plain text, saved into the C: drive
   ============================================================ */
APPS.notepad = {
  title: 'Notepad', icon: 'txt', w: 480, h: 360,
  open(win, args) {
    let path = args.path || null, dirty = false, wrap = true;
    const ta = h('textarea.note.field', { spellcheck: false, 'aria-label': 'Text' });
    const title = () => WM.setTitle(win, (dirty ? '*' : '') + (path ? FS.split(path).pop() : 'Untitled') + ' - Notepad');
    const load = (p) => { const n = FS.resolve(p); if (!n) { WM.alert('Notepad', `Cannot find the ${p} file.`, 'err'); return; } path = p; ta.value = (n.text || '').replace(/\r\n/g, '\n'); dirty = false; title(); };
    const saveTo = (p) => { FS.write(p, { kind: 'txt', text: ta.value.replace(/\n/g, '\r\n') }); path = p; dirty = false; title(); return true; };
    const saveAs = async () => {
      const def = path || 'C:\\My Documents\\Untitled.txt';
      const v = await WM.prompt('Save As', 'File name (put a path in front to save somewhere else):', FS.split(def).pop());
      if (!v || !v.trim()) return false;
      let p = v.trim(); if (!/^c:/i.test(p)) p = 'C:\\My Documents\\' + p; if (!/\.[a-z0-9]+$/i.test(p)) p += '.txt';
      if (!FS.resolve(FS.parentPath(p))) { WM.alert('Save As', 'That folder does not exist.', 'err'); return false; }
      return saveTo(p);
    };
    const save = () => path && !/\\Burnware\\System/i.test(path) ? saveTo(path) : saveAs();
    const askSave = async () => {
      if (!dirty) return true;
      const r = await WM.ask('Notepad', `The text in the ${path ? FS.split(path).pop() : 'Untitled'} file has changed.\nDo you want to save the changes?`, ['Yes', 'No', 'Cancel'], 'warn');
      if (r === 'Cancel') return false; if (r === 'Yes') return await save(); return true;
    };
    WM.menubar(win, [
      { label: 'File', items: [
        { label: 'New', action: async () => { if (await askSave()) { path = null; ta.value = ''; dirty = false; title(); } } },
        { label: 'Open...', action: async () => { if (!(await askSave())) return; const v = await WM.prompt('Open', 'File to open:', 'C:\\My Documents\\todo.txt'); if (v) load(/^c:/i.test(v) ? v : 'C:\\My Documents\\' + v); } },
        { label: 'Save', key: 'Ctrl+S', action: save },
        { label: 'Save As...', action: saveAs },
        '-', { label: 'Exit', action: () => WM.tryClose(win) },
      ] },
      { label: 'Edit', items: () => [
        { label: 'Select All', key: 'Ctrl+A', action: () => { ta.focus(); ta.select(); } },
        { label: 'Time/Date', key: 'F5', action: () => insert(new Date().toLocaleString()) },
      ] },
      { label: 'Format', items: () => [{ label: 'Word Wrap', check: wrap, action: () => { wrap = !wrap; ta.classList.toggle('nowrap', !wrap); } }] },
      { label: 'Help', items: [{ label: 'About Notepad', action: () => WM.alert('About Notepad', 'Notepad for Burnware\nIt edits text. That is the whole idea.', 'txt') }] },
    ]);
    const insert = (s) => { const a = ta.selectionStart, b = ta.selectionEnd; ta.setRangeText(s, a, b, 'end'); dirty = true; title(); ta.focus(); };
    ta.addEventListener('input', () => { if (!dirty) { dirty = true; title(); } });
    ta.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } if (e.key === 'F5') { e.preventDefault(); insert(new Date().toLocaleString()); } });
    win.body.append(ta);
    win.beforeClose = askSave;
    if (path) load(path); else title();
    setTimeout(() => ta.focus(), 50);
  },
};
