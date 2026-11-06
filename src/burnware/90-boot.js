/* ============================================================
   Power on, the BIOS check, the splash, shutting down, and the
   blue screen you get for deleting the wrong thing.
   ============================================================ */
const Boot = {
  ready: false,
  async powerOn(fast) {
    this.ready = false;
    $('#power')?.remove();
    Sound.init();
    if (!fast && !calm()) await this.bios();
    await this.splash(fast ? 450 : 1300);
    this.ready = true;
    Sound.startup();
    Desktop.render(); Wall.paint();
    if (Store.data.firstBoot) {
      Store.data.firstBoot = false; Store.save();
      setTimeout(() => Tuko.say('Hi! I am Tuko, your desktop gecko. Double-click (or tap) an icon to open it. Start up there in the corner has everything else.', 11000, [['Show me around', () => WM.open('notepad', { path: 'C:\\My Documents\\readme.txt' })], ['Thanks', () => {}]]), 1400);
    }
  },
  bios() {
    return new Promise(res => {
      const o = h('div#bios.over', { 'aria-label': 'Starting up' }); document.body.append(o);
      const logo = h('div.logo', 'Ember BIOS v4.51PG\nAn Energy Star Ally\n   ▲ ▲ ▲');
      const pre = h('div'); o.append(logo, pre);
      const L = ['BurnBIOS (C) 1998 Ember Systems, Inc.', '', 'Main Processor : Pentium(R)-ish 233MHz', 'Memory Testing : ', '', 'Detecting IDE Primary Master ... BURN-HD 2.1GB', 'Detecting IDE Primary Slave  ... None', 'Detecting IDE Secondary Master ... CD-ROM 24X', 'Gecko ........................ 1 detected (Tuko)', 'Weekly tokens ................ 100% (now burning)', '', 'Starting Burnware...'];
      let k = 0, mem = 0, skip = false;
      const end = () => { o.remove(); res(); };
      o.addEventListener('pointerdown', () => { skip = true; }); addEventListener('keydown', () => { skip = true; }, { once: true });
      const next = () => {
        if (skip) return end();
        if (k === 3 && mem < 65536) { mem = Math.min(65536, mem + 8192); pre.textContent = L.slice(0, 3).join('\n') + '\nMemory Testing : ' + mem + 'K' + (mem === 65536 ? ' OK' : ''); Sound.key(); return setTimeout(next, 40); }
        if (k >= L.length) return setTimeout(end, 250);
        k++; pre.textContent = L.slice(0, k).map((l, i) => i === 3 ? 'Memory Testing : 65536K OK' : l).join('\n'); setTimeout(next, k === 1 ? 160 : 85);
      };
      Sound.bsod(); setTimeout(next, 120);
    });
  },
  splash(ms) {
    return new Promise(res => {
      const cv = h('canvas', { width: 64, height: 48 }), g = cv.getContext('2d'); Icons.draw(SPR.flame, 3, g, 8, 0);
      const o = h('div#splash.over', { 'aria-label': 'Burnware is starting' }, cv, h('h1', 'Burn', h('i', 'ware')), h('div.bar', h('i')), h('small', 'Starting Burnware...'));
      document.body.append(o);
      setTimeout(() => { o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 }).onfinish = () => { o.remove(); res(); }; }, ms);
    });
  },
  async askShutdown() {
    const r = await WM.ask('Shut Down Burnware', 'What do you want the computer to do?', ['Shut down', 'Restart', 'Cancel'], 'power');
    if (r === 'Shut down') this.shutdown(false); else if (r === 'Restart') this.shutdown(true);
  },
  async shutdown(restart) {
    this.ready = false; Sound.shutdown(); Music.stop(); Start.toggle(false);
    const o = h('div#splash.over', h('h1', 'Burn', h('i', 'ware')), h('small', restart ? 'Burnware is restarting...' : 'Burnware is shutting down...')); document.body.append(o);
    await wait(1300); WM.closeAll(); o.remove();
    if (restart) { await this.powerOn(false); return; }
    const off = h('div#off.over', { role: 'button', tabIndex: 0, 'aria-label': 'Turn the computer back on' }, h('div', 'It\'s now safe to turn off', h('br'), 'your computer.', h('small', '(or click to turn it back on)')));
    document.body.append(off);
    const on = () => { off.remove(); this.powerOn(false); };
    off.onclick = on; off.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') on(); };
  },
  bsod(code, why) {
    if ($('#bsod')) return;
    Sound.bsod(); Music.stop(); this.ready = false;
    const o = h('div#bsod.over', { role: 'alertdialog', tabIndex: 0, 'aria-label': 'Fatal error' }, h('div.box',
      h('div.hd', ' BURNWARE '),
      h('p', `A fatal exception 0E has occurred at 0028:C0FFEE42 in VXD BURN(01) + 00001998. The current application will be terminated.`),
      h('p', `${code}: ${why}`),
      h('p', '*  Press any key to restart your computer.', h('br'), '*  Nothing was actually deleted. Burnware is very forgiving.'),
      h('p', { style: { textAlign: 'center' } }, 'Press any key to continue ', h('span.blink', '_'))));
    document.body.append(o); setTimeout(() => o.focus(), 30);
    const go = () => { removeEventListener('keydown', go); o.remove(); WM.closeAll(); this.powerOn(false); };
    setTimeout(() => { o.addEventListener('pointerdown', go, { once: true }); addEventListener('keydown', go, { once: true }); }, 700);
  },
};
