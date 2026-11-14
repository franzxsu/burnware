/* ============================================================
   Pinball, part 3 of 3: the window. Every PC in 1998 had a pinball
   table on it somewhere; this one is Burnware's.

   Keys: Z and / (or the arrow keys, or the Shift keys) flip.
   Hold Space and let go to launch. N bumps the table. P pauses.
   Touch: left half of the table is the left flipper, right half
   the right one; hold and let go to launch.
   ============================================================ */
APPS.pinball = {
  title: 'Pinball', icon: 'pinball', w: 344, h: 720, minW: 250, minH: 380,
  open(win) {
    gameCSS('css-pinball', `
.pb { flex: 1; min-height: 0; display: flex; flex-direction: column; background: #000; }
.pb-dmd { flex: none; position: relative; background: #1c0d00; color: #ffa424; font: 26px/1 var(--mono); padding: 5px 8px 4px; text-shadow: 0 0 5px rgba(255,150,20,.6); box-shadow: inset 1px 1px var(--lo), inset -1px -1px var(--hi), inset 2px 2px #000; }
.pb-dmd::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0,0,0,.4) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,.4) 0 1px, transparent 1px 3px); }
.pb-top { display: flex; justify-content: space-between; gap: 8px; white-space: nowrap; }
.pb-msg { font-size: 17px; margin-top: 3px; min-height: 17px; white-space: nowrap; overflow: hidden; }
.pb-wrap { flex: 1; min-height: 0; display: grid; place-items: center; overflow: hidden; background: #000; touch-action: none; -webkit-touch-callout: none; user-select: none; -webkit-user-select: none; }
.pb-cv { display: block; pointer-events: none; }
`);
    const T = PB.create(), touch = isTouch();
    const elBall = h('span'), elMult = h('span'), elScore = h('span'), elMsg = h('div.pb-msg');
    const cv = h('canvas.pb-cv', { 'aria-label': 'Pinball table' }), wrap = h('div.pb-wrap', cv), base = document.createElement('canvas');
    win.body.append(h('div.pb', h('div.pb-dmd', h('div.pb-top', elBall, elMult, elScore), elMsg), wrap));
    const g = cv.getContext('2d'), bg = base.getContext('2d');
    let k = 1, raf = 0, last = 0, paused = false, demo = false, overAt = 0, knockAt = 0, shown = '';
    wrap._tap = true;
    /* ---- sounds ---- */
    const seq = (notes, dur, o, gap, at = 0) => notes.forEach((f, i) => Sound.beep(f, dur, o, at + i * gap));
    const SFX = {
      flip: () => { Sound.hiss(0.03, { vol: 0.18, freq: 700, q: 1.2 }); Sound.beep(95, 0.05, { type: 'square', vol: 0.05 }); },
      bumper: () => { Sound.beep(660, 0.08, { type: 'square', vol: 0.07, slide: 0.5 }); Sound.hiss(0.04, { vol: 0.12, freq: 2200 }); },
      sling: () => Sound.beep(240, 0.07, { type: 'sawtooth', vol: 0.07, slide: 2.2 }),
      lane: () => Sound.beep(1175, 0.12, { type: 'triangle', vol: 0.12 }),
      laneAll: () => seq([784, 988, 1175, 1568], 0.16, { type: 'square', vol: 0.06 }, 0.08),
      target: () => Sound.beep(880, 0.1, { type: 'square', vol: 0.06 }),
      bank: () => seq([659, 880, 1047, 1319], 0.14, { type: 'triangle', vol: 0.12 }, 0.07),
      jackpot: () => seq([523, 659, 784, 1047, 1319, 1568], 0.18, { type: 'square', vol: 0.06 }, 0.07),
      eject: () => Sound.beep(180, 0.12, { type: 'square', vol: 0.07, slide: 2.5 }),
      launch: () => { Sound.hiss(0.22, { vol: 0.14, freq: 500, q: 0.7 }); Sound.beep(80, 0.2, { type: 'sawtooth', vol: 0.06, slide: 5 }); },
      drain: () => Sound.beep(392, 0.7, { type: 'sawtooth', vol: 0.08, slide: 0.2 }),
      save: () => seq([523, 784], 0.15, { type: 'square', vol: 0.06 }, 0.12, 0.25),
      over: () => seq([392, 330, 262, 196], 0.3, { type: 'triangle', vol: 0.12 }, 0.22, 0.4),
      tilt: () => Sound.buzz(), extra: () => Sound.tada(), start: () => Sound.chord(),
      nudge: () => Sound.hiss(0.06, { vol: 0.2, freq: 200, q: 0.6 }),
      knock: () => { const n = performance.now(); if (n - knockAt > 70) { knockAt = n; Sound.hiss(0.02, { vol: 0.06, freq: 1500, q: 2 }); } },
    };
    /* ---- starting, pausing, the demo ---- */
    const best = () => Store.data.scores.pinball || 0;
    function start() { demo = false; paused = false; clearHeld(); PB.newGame(T); }
    function setPause(v) { if (T.state === 'idle' || T.state === 'over') return; paused = v; if (v) clearHeld(); last = 0; }
    function startDemo() { demo = true; paused = false; clearHeld(); PB.newGame(T); }
    function gameOver() {
      overAt = performance.now(); if (demo) return;
      if (T.score > best()) { Store.data.scores.pinball = T.score; Store.save(); T.msg = 'NEW HIGH SCORE!  ' + PB.fmt(T.score); T.msgT = T.t + 8; setTimeout(() => Sound.tada(), 1400); }
    }
    /* ---- controls. Each flipper and the plunger remember everything holding them down (keys and fingers),
            so two fingers or two keys never cancel each other ---- */
    const held = { l: new Set(), r: new Set(), p: new Set() };
    function sync() { T.flip[0].on = held.l.size > 0; T.flip[1].on = held.r.size > 0; }
    function clearHeld() { held.l.clear(); held.r.clear(); held.p.clear(); T.plunger.pull = false; T.plunger.charge = 0; sync(); }
    const canPlunge = () => T.state === 'ready' && T.auto <= 0 && T.ball.live && T.ball.x > 352 && T.ball.y > PB.PLY - 40;
    /* returns false when the press was used up by something else (leaving the demo, un-pausing, starting a game) */
    function wake(starts) {
      if (demo) { start(); return false; }
      if (paused) { setPause(false); return false; }
      if (T.state === 'idle' || T.state === 'over') { if (starts && performance.now() - overAt > 1200) start(); return !starts; }
      return true;
    }
    function press(ctl, id) {
      if (ctl === 'p') { if (canPlunge()) { held.p.add(id); T.plunger.pull = true; } return; }
      const was = held[ctl].size; held[ctl].add(id); sync(); if (!was && !T.tilt) SFX.flip();
    }
    function release(ctl, id) {
      if (!held[ctl].delete(id)) return;
      if (ctl === 'p') { if (!held.p.size && T.plunger.pull) PB.launch(T); } else sync();
    }
    const KEYS = { KeyZ: 'l', ArrowLeft: 'l', ShiftLeft: 'l', Slash: 'r', ArrowRight: 'r', ShiftRight: 'r', Space: 'p', ArrowDown: 'p', Enter: 'p', KeyN: 'n', ArrowUp: 'n', KeyP: 'pause', F2: 'new' };
    win.el.addEventListener('keydown', (e) => {
      const c = KEYS[e.code]; if (!c || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault(); if (e.repeat) return;
      if (c === 'new') return start();
      if (c === 'pause') return demo ? start() : setPause(!paused);
      if (!wake(c === 'p')) return;
      if (c === 'n') return PB.nudge(T);
      press(c, e.code);
    });
    const keyUp = (e) => { const c = KEYS[e.code]; if (c === 'l' || c === 'r' || c === 'p') release(c, e.code); };
    const blur = () => { for (const c of ['l', 'r']) for (const id of [...held[c]]) release(c, id); for (const id of [...held.p]) release('p', id); };
    addEventListener('keyup', keyUp); addEventListener('blur', blur);
    /* fingers (and the mouse): which half did it land on? The black space beside the table counts too */
    const fingers = new Map();
    wrap.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return; e.preventDefault();
      if (!wake(true)) return;
      const r = wrap.getBoundingClientRect(), side = e.clientX < r.left + r.width / 2 ? 'l' : 'r', id = 'f' + e.pointerId;
      try { wrap.setPointerCapture(e.pointerId); } catch (x) {}
      fingers.set(e.pointerId, side); press(side, id); press('p', id);
    });
    const up = (e) => { const side = fingers.get(e.pointerId); if (!side) return; fingers.delete(e.pointerId); const id = 'f' + e.pointerId; release(side, id); release('p', id); };
    wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up); wrap.addEventListener('contextmenu', (e) => e.preventDefault());
    /* ---- the display above the table ---- */
    function display() {
      const jack = 'JACKPOT ' + PB.fmt(T.jackpot * T.mult);
      const idle = touch ? 'TAP THE TABLE TO PLAY' : 'PRESS SPACE TO PLAY';
      const msg = paused ? (touch ? 'PAUSED  -  TAP TO CARRY ON' : 'PAUSED  -  PRESS P TO CARRY ON')
        : demo && T.state !== 'bonus' ? 'DEMO  -  ' + idle
        : T.t < T.msgT ? T.msg
        : T.state === 'ready' ? (T.auto > 0 ? 'GET READY' : touch ? 'HOLD THE TABLE, LET GO TO LAUNCH' : 'HOLD SPACE, LET GO TO LAUNCH')
        : T.state === 'play' ? (T.save > 0 ? 'BALL SAVE ON  -  ' + jack : jack)
        : T.state === 'over' ? 'GAME OVER  -  ' + idle : idle;
      const text = [demo ? 'DEMO' : 'BALL ' + Math.max(1, T.ballNo) + (T.extra ? '+' + T.extra : ''), 'x' + T.mult, PB.fmt(T.score), msg].join('|');
      if (text === shown) return; shown = text;
      [elBall.textContent, elMult.textContent, elScore.textContent, elMsg.textContent] = text.split('|');
    }
    /* ---- size the table to the window, and paint the part that never changes ---- */
    function fit() {
      const w = wrap.clientWidth, hh = wrap.clientHeight; if (w < 20 || hh < 20) return;
      const css = Math.min(w / PB.W, hh / PB.H), dpr = Math.min(window.devicePixelRatio || 1, 2);
      k = css * dpr; cv.width = base.width = Math.round(PB.W * k); cv.height = base.height = Math.round(PB.H * k);
      cv.style.width = Math.round(PB.W * css) + 'px'; cv.style.height = Math.round(PB.H * css) + 'px';
      bg.setTransform(k, 0, 0, k, 0, 0); PBDraw.table(bg); paint();
    }
    function paint() {
      g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(base, 0, 0);
      const sh = T.t - T.shake < 0.14 ? Math.sin((T.t - T.shake) * 90) * 3 : 0;
      g.setTransform(k, 0, 0, k, 0, sh * k); PBDraw.frame(g, T);
    }
    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (!win.el.isConnected) return cancelAnimationFrame(raf);
      const dt = last ? (now - last) / 1000 : 0; last = now;
      if (win.min || document.hidden) { if (!paused && !demo && T.state === 'play') setPause(true); last = 0; return; }
      if (!paused && !demo && WM.active !== win && T.state === 'play') setPause(true);   // clicked away mid-ball: hold everything
      if (!paused) {
        if (demo) PB.bot(T);
        PB.frame(T, dt);
        for (const f of T.fx) { if (f === 'over') gameOver(); if (!demo && SFX[f]) SFX[f](); }
        T.fx.length = 0;
      }
      paint(); display();
    }
    WM.menubar(win, [{ label: 'Game', items: () => [
      { label: 'New game', key: 'F2', action: start },
      { label: paused ? 'Resume' : 'Pause', key: 'P', disabled: demo || T.state === 'idle' || T.state === 'over', action: () => setPause(!paused) },
      { label: 'Demo', check: demo, action: () => demo ? start() : startDemo() }, '-',
      { label: `High score: ${PB.fmt(best())}`, disabled: true }, { label: 'Exit', action: () => WM.close(win) },
    ] }, { label: 'Help', items: () => [
      { label: 'Controls', action: () => WM.alert('Pinball', 'Left flipper:   Z,  Left Arrow  or  Left Shift\nRight flipper:  /,  Right Arrow  or  Right Shift\nLaunch:  hold Space, then let go (longer = harder)\nBump the table:  N  or  Up Arrow\nPause:  P        New game:  F2\n\nOn a touch screen: the left half of the table is the left flipper and the right half is the right one. Hold the table and let go to launch.', 'pinball') },
      { label: 'How to score', action: () => WM.alert('Pinball', 'BUMPERS  100 each, and every hit adds 250 to the jackpot.\nJACKPOT HOLE (top left)  pays the jackpot.\nB-U-R-N lanes (top)  light all four to raise the bonus multiplier, up to x5. It multiplies the jackpot too.\nTARGETS (the yellow bars on each side)  hit all three for 5,000 and ten seconds of ball save.\n\nA ball lost in the first 12 seconds comes back. Extra ball at 150,000.\nThree balls a game. Bump the table too much and it TILTS: the flippers go dead.', 'pinball') },
    ] }]);
    gameFocus(win);
    const ro = new ResizeObserver(fit); ro.observe(wrap); win.onResize = fit;
    win.onClose = () => { cancelAnimationFrame(raf); ro.disconnect(); removeEventListener('keyup', keyUp); removeEventListener('blur', blur); };
    PB.newGame(T); T.fx.length = 0;
    requestAnimationFrame(() => { fit(); raf = requestAnimationFrame(loop); });
  },
};
