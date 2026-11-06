/* ============================================================
   Tuko, the desktop gecko. He offers tips, talks about food a lot
   (that is a clue), and dances if you know how to ask.
   ============================================================ */
const TUKO_LINES = [
  'Tip: drag a window by its title bar. Double-click the title bar to make it big.',
  'Right-click the desktop to change the wallpaper. I like the rice terraces.',
  'I could really go for some lamok right now. Lamok means mosquito. Best snack in the world.',
  'Minesweeper tip: your first click is always safe. After that, you are on your own.',
  'JunJun would love it if you signed his guestbook. He checks it every day.',
  'DialUpDan is online in Smoke Signals. He talks a lot. So do I, I guess.',
  'Please do not delete the System folder. (Something happens if you do.)',
  'That modem screech is the internet saying hello. Very polite, very loud.',
  'I live in the walls of this computer. It is warm in here. Lamok sometimes.',
  'Command Prompt knows a few tricks. Try typing FORTUNE, or MATRIX.',
  'Pebble Dash tip: brake before the corner, not in it. I learned this the hard way. I am a gecko.',
  'Sizzle Sand tip: if the oil catches fire, use a lid. Not water. Never water.',
  'Omnigacha keeps asking me to pull. I do not have thumbs.',
  'Rain.wav is my favourite. It sounds like the roof of my old house.',
  'Kaiju Rampage is not ready yet. I am still growing. Forty metres is a lot of metres.',
  'You can make your own painting the wallpaper. Paint > File > Set As Wallpaper.',
  'If you leave me alone for a while, the screen saver comes out. I hide behind it.',
];
const Tuko = {
  el: null, cv: null, g: null, f: 0, bubbleT: null, quipT: null, visible: true,
  init() {
    this.el = $('#tuko'); this.cv = h('canvas', { width: 72, height: 48, title: 'Tuko', 'aria-label': 'Tuko the gecko. Click for a tip.', role: 'button', tabIndex: 0 }); this.g = this.cv.getContext('2d');
    this.el.append(this.cv);
    this.cv.onclick = () => { Sound.click(); this.say(pick(TUKO_LINES)); };
    this.cv.onkeydown = (e) => { if (e.key === 'Enter') this.cv.onclick(); };
    setInterval(() => this.draw(), 140);
    this.show(Store.data.tuko !== false);
    const quip = () => { this.quipT = setTimeout(quip, rand(80000, 150000)); if (Boot.ready && this.visible && !Saver.on && !this.el.querySelector('.bubble') && !WM.wins.some(w => w.hosted && !w.min)) this.say(pick(TUKO_LINES), 9000); };
    this.quipT = setTimeout(quip, rand(60000, 90000));
  },
  show(on) { this.visible = on; this.el.hidden = !on; },
  draw() {
    if (this.el.hidden) return; this.f++; const g = this.g;
    g.clearRect(0, 0, 72, 48);
    const blink = this.f % 40 < 2, lick = this.f % 57 < 3;
    const fr = lick ? TUKO[1] : TUKO[0];
    const rows = blink ? fr.map((r, i) => i === 4 ? r.replace('wk', 'GG').replace('kk', 'GG') : r) : fr;
    g.save(); g.translate(0, Math.sin(this.f / 6) > 0.95 ? -1 : 0); Icons.draw(rows, 3, g, 0, 0); g.restore();
  },
  say(text, ms = 7000, actions) {
    if (!this.visible) return;
    this.el.querySelector('.bubble')?.remove(); clearTimeout(this.bubbleT);
    // while he talks he sits above the windows; the rest of the time he lives on the desktop, behind them
    const done = () => { b.remove(); this.el.classList.remove('talking'); };
    const b = h('div.bubble', { role: 'status' }, h('button.bx', { 'aria-label': 'Close', text: '✕', on: { click: done } }), h('div', text));
    if (actions) b.append(h('div.acts', actions.map(([l, fn]) => h('button.btn', { text: l, on: { click: () => { done(); fn(); } } }))));
    this.el.prepend(b); this.el.classList.add('talking'); Sound.notify();
    this.bubbleT = setTimeout(done, ms);
  },
  dance() {
    const c = h('canvas', { width: 72, height: 48, style: { position: 'absolute', bottom: '6px', width: '216px', height: '144px', zIndex: 8500, pointerEvents: 'none', imageRendering: 'pixelated' } }), g = c.getContext('2d');
    $('#desk').append(c); Sound.init();
    const stop = Sound.jingle([[64, 1], [67, 1], [71, 1], [67, 1], [69, 1], [72, 1], [76, 2], [74, 1], [71, 1], [67, 2], [69, 1], [71, 1], [72, 2]], 170);
    const W = $('#desk').clientWidth; let f = 0;
    const iv = setInterval(() => {
      f++; const x = (f * 9) % (W + 260) - 220, bob = Math.abs(Math.sin(f * 0.6)) * 22; c.style.left = x + 'px'; c.style.transform = `translateY(${-bob}px) scaleX(${Math.floor(f / 8) % 2 ? -1 : 1})`;
      g.clearRect(0, 0, 72, 48); Icons.draw(TUKO[f % 6 < 2 ? 1 : 0], 3, g, 0, 0);
      if (f > 95) { clearInterval(iv); stop(); c.remove(); }
    }, 90);
  },
};
