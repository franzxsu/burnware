/* ============================================================
   Command Prompt: a little command line over the C: drive, with
   history, tab completion and a few things that are just for fun.
   ============================================================ */
const FORTUNES = ['A modem that sings is a modem that works.', 'You will save the file right before the power goes out. Probably.', 'Do not trust a floppy disk that says "backup".', 'The year 2000 will be fine. Mostly.', 'Your homepage will get 12 visitors. Nine of them will be you.', 'Defragment your hard drive and your mind will follow.', 'A watched progress bar never reaches 100%.', 'Somewhere, a gecko believes in you.', 'It is never too late to sign a guestbook.', 'Rain on the roof means the internet is slower. That is science.'];
APPS.terminal = {
  title: 'Command Prompt', icon: 'terminal', w: 560, h: 340, minW: 260,
  open(win) {
    const out = h('div.term', { role: 'log', 'aria-live': 'polite' });
    const inp = h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: false, 'aria-label': 'Command' });
    const promptEl = h('span');
    const line = h('div.in', promptEl, inp);
    win.body.append(out); out.append(line);
    let cwd = 'C:', hist = [], hi = 0, busy = null;
    const P = () => (cwd === 'C:' ? 'C:\\' : cwd) + '>';
    const print = (s = '', cls) => { const d = h('div' + (cls ? '.' + cls : ''), s); out.insertBefore(d, line); out.scrollTop = out.scrollHeight; return d; };
    const setPrompt = () => { promptEl.textContent = P(); };
    const abs = (p) => { if (!p) return cwd; p = p.replace(/\//g, '\\'); if (/^c:/i.test(p)) return p.replace(/\\+$/, '') || 'C:'; if (p.startsWith('\\')) return 'C:' + p.replace(/\\+$/, ''); const parts = FS.split(cwd); for (const seg of p.split('\\')) { if (!seg || seg === '.') continue; if (seg === '..') { if (parts.length > 1) parts.pop(); } else parts.push(seg); } return parts.join('\\'); };
    const stop = () => { if (busy) { busy(); busy = null; } };
    const cmds = {
      help: () => print('Commands:\n  DIR [path]     list files            CD [path]       change folder\n  TYPE file      show a text file      MD name         make a folder\n  DEL file       delete (careful)      START program   open a program\n  CLS            clear the screen      ECHO text       say something\n  DATE / TIME    what it is            VER             Burnware version\n  TREE           folder tree           COLOR a|b|c|d   change colours\n  PING host      test the internet     CALC 2+2        a calculator\n  FORTUNE        wisdom                MATRIX          follow the white rabbit\n  HACK           look busy             TUKO [dance|say text]\n  WEATHER, WHOAMI, BEEP, HISTORY, EXIT'),
      dir: (a) => {
        const p = abs(a[0]), n = FS.resolve(p); if (!n || n.type !== 'dir') return print('File Not Found', 'err');
        if (n.locked) return print('Access is denied.', 'err');
        print(` Volume in drive C is BURNWARE\n Directory of ${p === 'C:' ? 'C:\\' : p}\n`);
        let files = 0, dirs = 0, bytes = 0;
        for (const c of n.children) { const s = FS.size(c); if (c.type === 'dir') dirs++; else { files++; bytes += s; } print(`${c.type === 'dir' ? '<DIR>'.padEnd(10) : String(s).padStart(10)}  ${c.name}`); }
        print(`${String(files).padStart(10)} file(s) ${String(bytes).padStart(12)} bytes\n${String(dirs).padStart(10)} dir(s)    1,337,000,000 bytes free`);
      },
      cd: (a) => { if (!a[0]) return print(cwd === 'C:' ? 'C:\\' : cwd); const p = abs(a.join(' ')), n = FS.resolve(p); if (!n || n.type !== 'dir') return print('Invalid directory', 'err'); if (n.locked) return print('Access is denied. (It is password protected. Open it in My Computer.)', 'err'); cwd = p; },
      type: (a) => { const n = FS.resolve(abs(a.join(' '))); if (!n || n.type !== 'file') return print('File not found', 'err'); if (n.kind === 'img') return print('That is a picture. Try: start ' + n.name, 'dim'); if (n.kind === 'snd') return print('♪ ♫ ♪  (it is a sound. Try: start ' + n.name + ')', 'dim'); if (n.kind === 'app') return print('[shortcut to ' + n.app + ']', 'dim'); print((n.text || '').replace(/\r\n/g, '\n')); },
      md: (a) => { if (!a[0]) return print('Required parameter missing', 'err'); const p = abs(a.join(' ')); if (!FS.mkdir(p)) print('Unable to create directory', 'err'); },
      del: (a) => {
        const raw = a.join(' ');
        if (!raw) return print('Required parameter missing', 'err');
        if (/^(-rf|\/s|\/q)/i.test(raw) || /^c:\\?\*?$/i.test(raw) || raw === '*' || raw === '/') return nuke();
        const p = abs(raw), n = FS.resolve(p); if (!n || n === FS.root) return print('File not found', 'err');
        if (n.system || n.kind === 'sys' || /\\Burnware\\System/i.test(p)) return Boot.bsod('BURNWARE_SYSTEM_FILE_DELETED', `Someone typed DEL ${n.name}. Bold move.`);
        FS.remove(p); Desktop.render(); print(`${n.name} sent to the Recycle Bin.`, 'dim');
      },
      cls: () => { $$('div', out).forEach(d => { if (d !== line && !line.contains(d)) d.remove(); }); },
      echo: (a, raw) => print(raw.replace(/^\S+\s?/, '') || 'ECHO is on.'),
      date: () => print('The current date is: ' + new Date().toDateString()),
      time: () => print('The current time is: ' + new Date().toLocaleTimeString()),
      ver: () => print('\nBurnware [Version 4.10.1998]\n'),
      whoami: () => print('burnware\\you  (a person burning tokens on a very fancy computer)'),
      weather: () => print('Rain, gentle, on the roof. Same as always. ☂'),
      beep: () => { Sound.ding(); print('*beep*', 'dim'); },
      history: () => hist.forEach((c, i) => print(String(i + 1).padStart(3) + '  ' + c)),
      fortune: () => print(pick(FORTUNES), 'hot'),
      sudo: () => print('nice try. this is Burnware, not that other thing.', 'err'),
      exit: () => WM.close(win),
      color: (a) => { const s = { a: ['#0c0c0c', '#b9f5c4'], b: ['#140c00', '#ffb547'], c: ['#000033', '#e6e6ff'], d: ['#0c0c0c', '#d0d0d0'] }[(a[0] || '').toLowerCase()]; if (!s) return print('COLOR a (green), b (amber), c (blue), d (grey)'); out.style.background = s[0]; out.style.color = s[1]; },
      tree: () => { const walk = (n, pre) => n.children.forEach((c, i) => { const lastOne = i === n.children.length - 1; if (c.type === 'dir') { print(pre + (lastOne ? '└── ' : '├── ') + c.name + (c.locked ? '  [locked]' : '')); if (!c.locked) walk(c, pre + (lastOne ? '    ' : '│   ')); } }); print('C:\\'); walk(FS.root, ''); },
      start: (a) => { const s = a.join(' '); if (!s) return print('START what? Try: start paint', 'err'); const n = FS.resolve(abs(s)); if (n && n.type === 'file') return Files.openFile(abs(s)); const alias = { paint: 'paint', notepad: 'notepad', mines: 'mines', minesweeper: 'mines', solitaire: 'solitaire', snake: 'snake', browser: 'browser', torch: 'browser', music: 'music', amp: 'music', mixburner: 'music', chat: 'chat', smoke: 'chat', omnigacha: 'omni', gacha: 'omni', pebble: 'pebble', pebbledash: 'pebble', rally: 'pebble', sizzle: 'sizzle', sizzlesand: 'sizzle', video: 'video', rainwav: 'rainwav', kaiju: 'kaiju', settings: 'settings', help: 'help', explorer: 'explorer', terminal: 'terminal' }[s.toLowerCase()]; if (alias) return WM.open(alias); if (/^(www\.|https?:|burn:)/i.test(s)) return WM.open('browser', { url: s }); print(`'${s}' is not recognized as a program.`, 'err'); },
      calc: (a) => { const e = a.join(''); if (!/^[\d+\-*/().%\s]+$/.test(e)) return print('CALC only does numbers and + - * / ( ) %', 'err'); try { const v = Function('"use strict";return (' + e + ')')(); print(String(Math.round(v * 1e10) / 1e10)); } catch (x) { print('That does not compute.', 'err'); } },
      ping: (a) => {
        const host = a[0] || 'sparknet.com'; print(`Pinging ${host} with 32 bytes of data:`); let k = 0;
        const t = setInterval(() => { if (k++ >= 4) { clearInterval(t); busy = null; print(`Ping statistics for ${host}: Sent = 4, Received = 4, Lost = 0 (0% loss)`); return; } print(`Reply from ${host}: bytes=32 time=${Math.round(rand(180, 420))}ms TTL=${50 + k}`); }, 650);
        busy = () => clearInterval(t);
      },
      matrix: () => {
        const cols = 48, drops = Array.from({ length: cols }, () => Math.floor(rand(-20, 0))); let n = 0;
        const box = print('', 'hot'); box.style.whiteSpace = 'pre'; box.style.lineHeight = '1';
        const t = setInterval(() => { n++; const rows = []; for (let r = 0; r < 14; r++) { let s = ''; for (let c = 0; c < cols; c++) { const d = drops[c]; s += (r === d ? String.fromCharCode(0x30a0 + Math.floor(Math.random() * 90)) : (r < d && r > d - 6 && Math.random() < 0.6) ? String.fromCharCode(33 + Math.floor(Math.random() * 90)) : ' '); } rows.push(s); } box.textContent = rows.join('\n'); drops.forEach((d, i) => { drops[i] = d > 20 ? Math.floor(rand(-10, 0)) : d + 1; }); out.scrollTop = out.scrollHeight; if (n > 120) stopM(); }, 60);
        const stopM = () => { clearInterval(t); busy = null; print('wake up.', 'dim'); };
        busy = stopM;
      },
      hack: () => {
        const lines = ['Initializing h4x0r mode...', 'Bypassing the mainframe...', 'Downloading more RAM... 64KB', 'Reversing the polarity...', 'Decrypting the gibson...', 'Enhancing... enhancing...', 'ACCESS GRANTED'];
        let k = 0; const t = setInterval(() => { if (k >= lines.length) { clearInterval(t); busy = null; print('(nothing was hacked. you just look very cool now.)', 'dim'); return; } print(lines[k], k === lines.length - 1 ? 'hot' : ''); Sound.key(); k++; }, 380);
        busy = () => clearInterval(t);
      },
      tuko: (a) => {
        if ((a[0] || '').toLowerCase() === 'dance') { Tuko.dance(); return print('♪ ┏(・o･)┛ ♪ ┗( ･o･)┓ ♪', 'hot'); }
        const say = (a[0] || '').toLowerCase() === 'say' ? a.slice(1).join(' ') : 'lamok?';
        const bub = ' ' + '_'.repeat(say.length + 2) + '\n< ' + say + ' >\n ' + '-'.repeat(say.length + 2);
        print(bub + '\n   \\\n    \\    __\n      (o >_______\n       \\  ___  _ \\___~\n        \'-\'  \'-\' \'-\'', 'hot');
      },
    };
    Object.assign(cmds, { ls: cmds.dir, cat: cmds.type, mkdir: cmds.md, rm: cmds.del, erase: cmds.del, clear: cmds.cls, '?': cmds.help, quit: cmds.exit, format: () => nuke(true), 'cd..': () => cmds.cd(['..']), 'cd\\': () => cmds.cd(['\\']) });
    function nuke(fmt) {
      print(fmt ? 'WARNING, ALL DATA ON NON-REMOVABLE DISK DRIVE C: WILL BE LOST!\nProceed with Format (Y/N)?' : 'Deleting everything...', 'err');
      setTimeout(() => Boot.bsod('BURNWARE_WAS_ASKED_TO_DELETE_ITSELF', 'You asked Burnware to delete everything. Burnware politely declined, by crashing.'), 1200);
    }
    const run = (raw) => {
      print(P() + raw);
      const s = raw.trim(); if (!s) return;
      hist.push(s); hi = hist.length;
      const parts = s.match(/"[^"]*"|\S+/g).map(x => x.replace(/^"|"$/g, '')), c = parts[0].toLowerCase();
      if (c === 'rm' && parts[1] === '-rf') return nuke();
      const f = cmds[c]; if (f) { try { f(parts.slice(1), s); } catch (e) { print('Error: ' + e.message, 'err'); } }
      else if (/^c:$/i.test(c)) cwd = 'C:';
      else print(`Bad command or file name: ${parts[0]}`, 'err');
      setPrompt();
    };
    inp.addEventListener('keydown', (e) => {
      if (busy && (e.key === 'c' && e.ctrlKey || e.key === 'Escape')) { stop(); print('^C'); return; }
      if (e.key === 'Enter') { const v = inp.value; inp.value = ''; if (busy) stop(); run(v); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) inp.value = hist[--hi]; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); if (hi < hist.length - 1) inp.value = hist[++hi]; else { hi = hist.length; inp.value = ''; } }
      else if (e.key === 'Tab') {   // finish a file name
        e.preventDefault(); const m = inp.value.match(/^(.*\s)?(\S*)$/), stem = m[2], dir = FS.resolve(cwd);
        const hit = dir && dir.children.filter(c => c.name.toLowerCase().startsWith(stem.toLowerCase()));
        if (hit && hit.length === 1) inp.value = (m[1] || '') + (hit[0].name.includes(' ') ? '"' + hit[0].name + '"' : hit[0].name);
        else if (hit && hit.length > 1) print(hit.map(c => c.name).join('   '), 'dim');
      } else Sound.key();
    });
    out.addEventListener('click', () => { if (!getSelection().toString()) inp.focus(); });
    win.onClose = stop;
    print('Burnware [Version 4.10.1998]\n(C) Ember Systems. Type HELP for commands.\n', 'dim');
    setPrompt(); setTimeout(() => inp.focus(), 60);
  },
};
