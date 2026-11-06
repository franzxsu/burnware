/* ============================================================
   The kitchen cat. It sleeps on the warm range hood, sits up when
   the kitchen gets lively, and leaves when the smoke alarm goes.
   Drawn over the cells; tap it to pet it.
   ============================================================ */
const Cat = {
  PAL: { o: [226, 140, 62], d: [180, 98, 38], l: [248, 206, 150], k: [52, 32, 24], e: [120, 200, 90], w: [250, 246, 236], t: [200, 116, 48] },
  SPR: {
    sleep: [
      '............k...k',
      '...........kok.kok',
      '....ooooo..ooooooo',
      '..ooddooddooooooooo',
      '.oooooooooooookkoo.',
      'oooodooooddoooolllo',
      'ooooooooooooooollo.',
      '.tttttttttooooooo..',
    ],
    sit: [
      '......k...k',
      '......kokok',
      '.....ooooooo',
      '.....ooekooll',
      '......oooollk',
      '.....ooooo..',
      '....oooooo..',
      '...ooddooo..',
      't..oooooooo.',
      't..oodoooooo',
      'tt.ooooooooo',
      '.ttoooooooo.',
      '..ttwwoowwo.',
    ],
    alert: [
      '.....k....k',
      '.....kk..kk',
      '.....oooooo',
      '....ooeooeo',
      '....oooookol',
      '.....ooolll',
      '....ooooo..',
      '...oooooo..',
      '..oooddooo.',
      't.ooooooooo',
      't.oodooooooo',
      'ttoooooooooo',
      '.ttwwoooww..',
    ],
  },
  x: 96, base: 15, state: 'sleep', calm: 0, away: 0, leaving: 0, t: 0,
  update(dt, ev) {
    this.t += dt;
    if (this.leaving > 0) { this.leaving -= dt; if (this.leaving <= 0) this.state = 'gone'; return; }
    let smoke = 0;
    for (let y = 4; y <= 15; y++) for (let x = 90; x <= 116; x++) { const ty = type[idx(x, y)]; if (ty === SMOKE || ty === FIRE) smoke++; }
    const scary = Kitchen.alarm.beeping || Kitchen.alarm.sprinkler > 0 || smoke > 30 || ev.lidpop || ev.flare || ev.dust > 4;
    const lively = ev.pop > 0 || ev.fire > 40 || ev.geyser > 0 || ev.rattle > 0 || ev.spit > 0 || Kitchen.hood.on;
    if (this.state === 'gone') { if (scary) this.away = 0; else if ((this.away += dt) > 18) { this.state = 'sit'; this.calm = 0; } return; }
    if (scary) { this.leaving = 0.5; this.away = 0; Sfx.hiss && Sfx.hiss(); return; }
    if (lively) { this.state = 'alert'; this.calm = 0; return; }
    this.calm += dt;
    if (this.state === 'alert' && this.calm > 3) this.state = 'sit';
    else if (this.state === 'sit' && this.calm > 22) this.state = 'sleep';
  },
  pet() {
    if (this.state === 'gone' || this.leaving > 0) return false;
    this.state = 'sit'; this.calm = 0; this.purr = 1.2;
    Sfx.meow && Sfx.meow(); Ach.give('cat');
    return true;
  },
  draw(R, t) {
    if (this.state === 'gone') return;
    let spr = this.SPR[this.state === 'alert' ? 'alert' : this.state === 'sleep' ? 'sleep' : 'sit'], ox = this.x, oy = this.base - spr.length + 1;
    let fade = 255;
    if (this.leaving > 0) {   // a hop off the back of the hood, out of sight
      const u = 1 - this.leaving / 0.5; spr = this.SPR.alert; ox = Math.round(this.x + u * 14); oy = Math.round(this.base - spr.length + 1 - Math.sin(u * Math.PI) * 7);
      fade = Math.round(255 * Math.min(1, 2.2 - 2.2 * u));
    }
    const blink = this.state !== 'sleep' && (t % 4.3) < 0.14, swish = Math.floor(t * 2.2) % 2;
    const breathe = this.state === 'sleep' && Math.floor(t / 1.6) % 2;
    for (let r = 0; r < spr.length; r++) {
      const row = spr[r];
      for (let c = 0; c < row.length; c++) {
        let ch = row[c]; if (ch === '.') continue;
        if (ch === 'e' && blink) ch = 'o';
        let x = ox + c, y = oy + r;
        if (ch === 't' && this.state === 'sit' && swish && r < spr.length - 2) x -= 1;   // the tail flicks
        if (breathe && r === 2 && ch !== 'k') y -= 1;
        const p = this.PAL[ch]; if (p) R.dot(x, y, p[0], p[1], p[2], fade);
      }
    }
    if (this.state === 'sleep') {   // a little z drifts up now and then
      const u = (t % 3.2) / 3.2, zx = ox + 15 + Math.round(u * 4), zy = oy - 2 - Math.round(u * 7), a = Math.round(220 * Math.sin(u * Math.PI));
      if (a > 30) { for (const [dx, dy] of [[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]]) R.dot(zx + dx, zy + dy, 230, 236, 245, a); }
    }
    if (this.purr > 0) {   // a heart when petted
      this.purr -= 1 / 60; const u = 1 - this.purr / 1.2, hx = ox + 9, hy = oy - 3 - Math.round(u * 6);
      for (const [dx, dy] of [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1], [1, 2]]) R.dot(hx + dx, hy + dy, 255, 96, 120, Math.round(255 * (1 - u)));
    }
  },
};
