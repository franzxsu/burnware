/* ============================================================
   The C: drive: a little tree of folders and files kept in this
   browser. Deleting moves things to the Recycle Bin.
   ============================================================ */
const FS = {
  key: 'burnware-fs-v1', root: null, bin: [],
  file(name, kind, extra) { return Object.assign({ name, type: 'file', kind }, extra); },
  dir(name, kids, extra) { return Object.assign({ name, type: 'dir', children: kids }, extra); },
  defaults() {
    const F = this.file.bind(this), D = this.dir.bind(this);
    return D('C:', [
      D('My Documents', [
        F('readme.txt', 'txt', { text: README }),
        F('todo.txt', 'txt', { text: TODO }),
        F('poem.txt', 'txt', { text: POEM }),
        F('note-to-self.txt', 'txt', { text: 'Note to self:\r\n\r\nSTOP forgetting the password to the Private folder.\r\nHint: it is Tuko\'s favourite snack.\r\n\r\n(If you forget, ask Tuko. He talks about food constantly.)\r\n' }),
        D('Private', [F('treasure.txt', 'txt', { text: TREASURE })], { locked: true }),
      ], { icon: 'docs' }),
      D('My Pictures', [F('hut-in-the-rain.bmp', 'img', { gen: 'kubo' }), F('sunset.bmp', 'img', { gen: 'sunset' })]),
      D('Programs', APPS_LIST().map(a => F(a.title + '.lnk', 'app', { app: a.id }))),
      D('Burnware', [
        D('System', [
          F('kernel.sys', 'sys', { text: 'MZ\u0090\u0003 ... (this is the important one) ... \u0000\u0000\u0000 GECKO_DRIVER_OK' }),
          F('vxd_burn.sys', 'sys', { text: 'VXD BURN v4.10.1998  (c) Ember Systems, probably' }),
          F('config.sys', 'txt', { text: 'DEVICE=C:\\BURNWARE\\HIMEM.SYS\r\nFILES=40\r\nBUFFERS=20\r\nTURBO=ON\r\nMODEM=SCREAM\r\nGECKO=1\r\nRAIN=GENTLE\r\n' }),
          F('autoexec.bat', 'txt', { text: '@ECHO OFF\r\nPROMPT $P$G\r\nPATH C:\\BURNWARE;C:\\BURNWARE\\SYSTEM\r\nSET BLASTER=A220 I5 D1\r\nECHO Good morning, Dave.\r\nREM ^ wrong computer\r\n' }),
        ], { system: true }),
        D('Media', [F('rain.wav', 'snd', { track: 0 }), F('dialup-dreams.wav', 'snd', { track: 1 }), F('rain-wav.mp4', 'vid', { src: 'media/rain-wav.mp4' })]),
      ]),
    ]);
  },
  load() {
    try { const s = localStorage.getItem(this.key); if (s) { const d = JSON.parse(s); this.root = d.root; this.bin = d.bin || []; } } catch (e) { this.root = null; }
    const progs = this.root && this.root.children && this.root.children.find(c => c.name === 'Programs');   // new programs show up for returning visitors too
    if (progs) progs.children = APPS_LIST().map(a => this.file(a.title + '.lnk', 'app', { app: a.id }));
    if (!this.root) { this.root = this.defaults(); this.bin = [this.file('homework_FINAL_final_v3.txt', 'txt', { text: 'THE WATER CYCLE\r\nby me\r\n\r\nWater goes up. Then it comes down. Then it goes up again.\r\nThe end.\r\n\r\n(teacher said it needs to be 500 words)', from: 'C:\\My Documents' })]; }
  },
  save() {
    try { localStorage.setItem(this.key, JSON.stringify({ root: this.root, bin: this.bin })); }
    catch (e) { // full: drop the oldest saved paintings and try once more
      const pics = this.resolve('C:\\My Pictures'); if (pics) { const own = pics.children.filter(f => f.data); if (own.length) { pics.children.splice(pics.children.indexOf(own[0]), 1); try { localStorage.setItem(this.key, JSON.stringify({ root: this.root, bin: this.bin })); } catch (e2) { /* give up quietly */ } } }
    }
  },
  reset() { this.root = this.defaults(); this.bin = []; this.save(); },
  split(path) { return String(path).replace(/\//g, '\\').split('\\').filter(Boolean); },
  resolve(path) {
    const parts = this.split(path); if (!parts.length || parts[0].toUpperCase() !== 'C:') return null;
    let n = this.root;
    for (const p of parts.slice(1)) { if (!n || n.type !== 'dir') return null; n = n.children.find(c => c.name.toLowerCase() === p.toLowerCase()); }
    return n || null;
  },
  join(dir, name) { return (dir.endsWith('\\') ? dir : dir + '\\') + name; },
  parentPath(path) { const p = this.split(path); return p.length <= 1 ? 'C:' : p.slice(0, -1).join('\\'); },
  uniqueName(dir, name) {
    const base = name.replace(/(\.[^.]+)?$/, ''), ext = (name.match(/\.[^.]+$/) || [''])[0]; let n = name, k = 2;
    while (dir.children.some(c => c.name.toLowerCase() === n.toLowerCase())) n = `${base} (${k++})${ext}`;
    return n;
  },
  write(path, props) {
    const dir = this.resolve(this.parentPath(path)), name = this.split(path).pop();
    if (!dir || dir.type !== 'dir') return null;
    let f = dir.children.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!f) { f = this.file(name, props.kind || 'txt'); dir.children.push(f); }
    Object.assign(f, props); this.save(); return f;
  },
  mkdir(path) {
    const dir = this.resolve(this.parentPath(path)), name = this.split(path).pop();
    if (!dir || dir.type !== 'dir' || !name) return null;
    let d = dir.children.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!d) { d = this.dir(name, []); dir.children.push(d); this.save(); }
    return d;
  },
  /* delete = move to the bin (system files are a bad idea: see the blue screen) */
  remove(path) {
    const dir = this.resolve(this.parentPath(path)), n = this.resolve(path);
    if (!dir || !n || n === this.root) return false;
    dir.children.splice(dir.children.indexOf(n), 1);
    n.from = this.parentPath(path); this.bin.push(n); this.save(); Sound.recycle();
    return true;
  },
  restore(i) {
    const n = this.bin[i]; if (!n) return;
    const dir = this.resolve(n.from) || this.resolve('C:\\My Documents');
    n.name = this.uniqueName(dir, n.name); delete n.from; dir.children.push(n); this.bin.splice(i, 1); this.save();
  },
  emptyBin() { this.bin = []; this.save(); Sound.recycle(); },
  size(n) { if (n.type === 'dir') return n.children.reduce((s, c) => s + this.size(c), 0); return (n.text ? n.text.length : 0) + (n.data ? Math.round(n.data.length * 0.75) : 0) + (n.gen ? 49152 : 0) + (n.kind === 'snd' ? 1048576 : 0) + (n.kind === 'vid' ? 9437184 : 0) + (n.kind === 'app' ? 512 : 0); },
  iconFor(n) {
    if (n.type === 'dir') return n.locked ? 'folderlock' : n.icon || 'folder';
    if (n.kind === 'app') { const a = APPS[n.app]; return a ? a.icon : 'app'; }
    return { txt: 'txt', img: 'img', sys: 'sys', snd: 'music', vid: 'video' }[n.kind] || 'txt';
  },
};
const README = `Welcome to Burnware!\r\n====================\r\n\r\nYou are using the only operating system built entirely\r\nout of burnt tokens.\r\n\r\nOn the desktop:\r\n  * Omnigacha: a gacha machine that pulls for everything.\r\n    Tap it for tokens. The rates are what they are.\r\n  * Pebble Dash: tiny rally cars, loose gravel, big slides.\r\n  * Sizzle Sand: a kitchen where every grain is simulated.\r\n    Things will catch fire. Water makes it worse.\r\n  * Rain.wav: a lo-fi music video, made from code.\r\n  * Kaiju Rampage: still being built. Tuko is growing.\r\n\r\nThings to try:\r\n  * Drag windows around by their title bar. Resize them\r\n    from the bottom-right corner.\r\n  * Paint something, then use File > Set as Wallpaper.\r\n  * Beat Minesweeper on Expert. (Nobody has. Be the first.)\r\n  * Open Smoke Signals and say hi to DialUpDan.\r\n  * Open Command Prompt and type HELP.\r\n  * Surf the World Wide Web with Wildfire Navigator.\r\n  * There is a locked folder somewhere. Tuko knows things.\r\n\r\nEverything you save stays in this browser.\r\nWhen you are done, use Start > Shut Down like a civilised person.\r\n`;
const TODO = `TO DO\r\n-----\r\n[ ] beat Minesweeper on Expert\r\n[x] beat Minesweeper on Beginner (took 3 tries, dont tell anyone)\r\n[ ] DO NOT pick up the phone while the internet is on\r\n[ ] save up for a 2 GB hard drive (who even needs that much??)\r\n[ ] learn HTML. make a homepage. get a guestbook\r\n[ ] find out what Y2K actually is\r\n[ ] defragment the hard drive and watch the little blocks\r\n[ ] stop naming files FINAL_final\r\n`;
const POEM = `dial-up, at midnight\r\n\r\nthe modem sings its broken song,\r\na whistle, then a hiss,\r\nand somewhere down the copper line\r\nthe whole wide world says this:\r\n\r\n"hello, small hut, so warm and dry,\r\nwhile rain taps on your thatch,\r\nhere is a page, it loads one line\r\nat a time. you'll catch up. relax."\r\n`;
const TREASURE = `YOU FOUND IT!\r\n\r\nThe password was the snack. Tuko is very proud of you.\r\n\r\nAs a reward, a new wallpaper is waiting for you in\r\nDisplay Properties: "Golden hour".\r\n\r\nAlso, here is a secret: if you type  tuko dance  in the\r\nterminal, something happens.\r\n`;
