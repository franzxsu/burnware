/* ============================================================
   STATION 7: JAR.EXE, the program Luz wrote in QBasic in 1997.
   A DOS text screen (40 columns, 16 colours) with fireflies drawn
   over it. Type the five lights and the jar opens; then there is
   a letter, and two more fireflies to catch by hand.
   ============================================================ */
const JAR_LETTER = [
  ['MIGS.', '', "If you're reading this, you came back.", 'I knew it.', '', "(If you're not Migs: hello, stranger.", 'You must be patient, and a little', 'nosy. I like you already.)', '', 'I wanted to say this on the rooftop,', "but I'm better at typing."],
  ['The night of the brownout, I thought', 'the dark was the worst thing that', 'could happen to an internet cafe.', '', 'Then the fireflies came in, and you', 'said they looked like tiny monitors,', 'and I have not been bored one single', 'day since.'],
  ["You're going to do big things in the", "city. I'm going to stay here a while", 'and learn how to make these machines', 'do what I tell them.', '', "Someday I'll make games. Real ones.", 'This jar is the first.'],
  ['I named the lights, so you could', 'carry them with you:', '', '~NINGNING  for the first time my page', '          finished loading.', '~KISLAP    for the comet.', '~LIWANAG   for the night the power', '          came back on.', '~SINAG     because you picked it.', '~BAGA      because embers keep, even', '          after the fire is out.'],
  ['There are two more in the jar.', "I didn't hide those.", '', 'You have to catch them yourself.', '', '', '- Luz', '  Station 7, Kubo Net Cafe', '  December 30, 1997'],
];
const JAR_END = ["That's all of them.", '', '~PANGAKO means promise.', 'He made one. I kept it in here.', '', '', 'JAR.EXE finished. Fireflies: 7 of 7.', '(C) 1997 L. Navarro, Station 7.', 'Made with QBasic and too much', 'pancit canton.', '', '', 'If you are not Migs:', 'somebody should tell her it worked.', "She said she'd still be alitaptap,", 'wherever the web goes.', '~Whenever the web goes.'];
const JAR_FLIES = [...Q_LIGHTS, ['TALA', 'a star. That one is you.'], ['PANGAKO', 'a promise.']];
APPS.jar = {
  title: 'JAR.EXE', icon: 'jar', w: 460, h: 580, minW: 270, minH: 320, single: true,
  open(win) {
    gameCSS('css-jar', `
.jar { flex: 1; min-height: 0; display: flex; flex-direction: column; background: #000; }
.jar.touch { flex-direction: column-reverse; }   /* on a phone the typing bar sits on top, clear of the keyboard */
.jar-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.jar-scr { flex: 1; min-height: 0; position: relative; overflow: hidden; touch-action: manipulation; user-select: none; -webkit-user-select: none; }
.jar-scr canvas { display: block; width: 100%; height: 100%; }
.jar-bar { flex: none; display: flex; align-items: center; gap: 8px; min-height: 34px; padding: 4px 8px 6px; background: #000; color: #aaaaaa; font: 20px/1 var(--mono); }
.jar-bar input { flex: 1; min-width: 0; background: #000; color: #ffff55; border: 0; outline: 0; font: 20px/1 var(--mono); text-transform: uppercase; caret-color: #ffff55; padding: 2px 0; border-radius: 0; }
.jar-bar button { background: #aaaaaa; color: #000; border: 0; border-radius: 0; font: 18px/1 var(--mono); padding: 5px 10px; cursor: pointer; } .jar-bar button:active { background: #ffff55; }
`);
    const COLS = 40, ROWS = 22, PAL = { w: '#aaaaaa', W: '#ffffff', Y: '#ffff55', d: '#555555', C: '#55ffff', G: '#55ff55', R: '#ff5555' };
    const cv = h('canvas', { 'aria-label': 'JAR.EXE screen' }), scr = h('div.jar-scr', cv), bar = h('div.jar-bar');
    const sr = h('div.jar-sr', { role: 'status', 'aria-live': 'polite' }), tell = (s) => { sr.textContent = s; };   // the screen is a canvas, so say what it shows for screen readers
    win.body.append(h('div.jar' + (isTouch() ? '.touch' : ''), scr, bar, sr));
    const g = cv.getContext('2d'), S = Quest.s;
    let cw = 10, chh = 20, ox = 0, oy = 0, font = '20px monospace', raf = 0, last = 0, t = 0, scene = '', sceneT = 0;
    let buf = [], title = ['', ''], msg = [], flies = [], page = 0, typed = 0, lines = [], caughtMsg = ['', ''], input = null, endTuko = false;
    /* ---- a tiny text screen ---- */
    const cls = () => { buf = Array.from({ length: ROWS }, () => []); };
    const at = (x, y, text, col = 'w') => { if (y < 0 || y >= ROWS) return; for (let i = 0; i < text.length; i++) if (x + i >= 0 && x + i < COLS && text[i] !== ' ') buf[y][x + i] = [text[i], col]; };
    const mid = (y, text, col) => at(Math.floor((COLS - text.length) / 2), y, text, col);
    const wrap = (text, n = 38) => { const out = []; for (const para of String(text).split('\n')) { let line = ''; for (const w of para.split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); } out.push(line); } return out; };
    function fit() {
      const W = scr.clientWidth, H = scr.clientHeight; if (W < 20 || H < 20) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cw = Math.min(cv.width / COLS, cv.height / ROWS / 2); chh = cw * 2; ox = (cv.width - cw * COLS) / 2; oy = 0;
      const fam = getComputedStyle(document.documentElement).getPropertyValue('--mono').trim() || 'monospace';
      g.font = `100px ${fam}`; const adv = g.measureText('M').width / 100 || 0.6;
      font = `${Math.floor(Math.min(chh * 0.98, cw / adv * 0.98))}px ${fam}`;
    }
    function draw() {
      g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
      g.fillStyle = '#0000aa'; g.fillRect(ox, oy, cw * COLS, chh);
      g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
      const put = (x, y, c, col) => { g.fillStyle = PAL[col] || col; g.fillText(c, ox + (x + 0.5) * cw, oy + (y + 0.52) * chh); };
      for (let i = 0; i < title[0].length; i++) put(1 + i, 0, title[0][i], 'W');
      for (let i = 0; i < title[1].length; i++) put(COLS - 1 - title[1].length + i, 0, title[1][i], 'Y');
      for (let y = 0; y < ROWS; y++) { const row = buf[y]; for (let x = 0; x < COLS; x++) if (row[x]) put(x, y, row[x][0], row[x][1]); }
      for (const f of flies) {   // a firefly: a soft glow, a brighter halo, and a hot little dot
        if (f.gone) continue;
        const a = (f.dim ? 0.12 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * f.rate + f.ph))) * (f.fade ?? 1), px = ox + f.x * cw, py = oy + f.y * chh, r = cw * (f.big ? 1.5 : 1);
        for (const [k, al] of [[2.8, 0.09], [1.6, 0.24]]) { g.fillStyle = `rgba(200,255,90,${al * a})`; g.beginPath(); g.arc(px, py, r * k, 0, 7); g.fill(); }
        g.fillStyle = `rgba(244,255,170,${Math.min(1, a + 0.1)})`; g.beginPath(); g.arc(px, py, r * 0.55, 0, 7); g.fill();
      }
    }
    /* ---- the bar under the screen: a place to type, or a button or two ---- */
    function setBar(kind) {
      input = null;
      if (kind === 'input') {
        input = h('input', { type: 'text', maxlength: 16, autocomplete: 'off', autocapitalize: 'characters', spellcheck: false, 'aria-label': 'Type a light' });
        input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { const v = input.value; input.value = ''; tryLight(v); } else Sound.key(); });
        const ok = h('button', 'ENTER'); ok.onclick = () => { const v = input.value; input.value = ''; tryLight(v); if (!isTouch()) input.focus(); };
        bar.replaceChildren(h('span', 'LIGHT?'), input, ok); if (!isTouch()) setTimeout(() => input && input.focus(), 60);
      } else if (kind === 'next') { const b = h('button', 'NEXT >'); b.onclick = advance; bar.replaceChildren(h('span', { style: { flex: 1 } }, isTouch() ? 'TAP TO GO ON' : 'PRESS ENTER'), b); }
      else if (kind === 'menu') { const a = h('button', 'READ THE LETTER'), b = h('button', 'THE FIREFLIES'); a.onclick = () => go('letter'); b.onclick = () => go('catch'); bar.replaceChildren(a, b); }
      else bar.replaceChildren(h('span', ' '));
    }
    /* ---- scene 1: the shut jar, waiting for five words ---- */
    const JAR_ART = ['    _________    ', '   [_________]   ', '   /         \\   ', '  |           |  ', '  |           |  ', '  |           |  ', '  |           |  ', '  |           |  ', '  |           |  ', '   \\_________/   '];
    const SLOTS = [[16, 6.2], [22.5, 5.6], [19.4, 7.7], [15.6, 9.4], [22.8, 9.3]];
    function paintJar(lift = 0) {
      cls(); title = ['JAR.EXE  v1.0', '(C) 1997 ALITAPTAP'];
      JAR_ART.forEach((row, i) => { const y = 2 + i - (i < 2 ? Math.round(lift) : 0); if (y >= 1) at(11, y, row, i < 2 ? 'W' : 'C'); });   // the lid lifts off and out of sight
      const n = S.lights.filter(Boolean).length;
      if (scene === 'jar') { mid(13, 'LIGHTS  ' + S.lights.map(v => v ? '*' : '.').join(' ') + `   ${n} OF 5`, 'Y'); msg.slice(0, 5).forEach((m, i) => mid(15 + i, m[0], m[1])); mid(21, 'TYPE A LIGHT, THEN PRESS ENTER', 'd'); }
    }
    function jarFlies() { flies = SLOTS.map(([x, y], i) => ({ x, y, hx: x, hy: y, ph: i * 1.7, rate: 1.6 + i * 0.23, dim: !S.lights[i], home: true })); }
    const say = (text, col = 'w') => { msg = wrap(text, 36).map(l => [l, col]); paintJar(); tell(text); if (isTouch() && input) input.blur(); };   // on a phone, put the keyboard away so the answer can be seen
    function tryLight(v) {
      const w = String(v).toUpperCase().replace(/[^A-Z]/g, ''); if (!w || scene !== 'jar') return;
      const i = Q_LIGHTS.findIndex(l => l[0] === w);
      if (i >= 0 && S.lights[i]) return say(`${w} is already glowing.`, 'd');
      if (i >= 0) {
        Quest.light(i); flies[i].dim = false; Sound.beep(660 + i * 110, 0.14, { type: 'triangle', vol: 0.14 }); Sound.beep(990 + i * 110, 0.22, { type: 'triangle', vol: 0.12 }, 0.11);
        const left = S.lights.filter(v2 => !v2).length;
        say(`${w}.\nA light wakes up. (It means ${Q_LIGHTS[i][1]}.)\n${left ? left + ' to go.' : 'That is all five.'}`, 'Y');
        if (!left) { setBar('none'); setTimeout(() => go('opening'), 1600); }
        return;
      }
      const egg = { ALITAPTAP: "That's me. I'm not in the jar.", TALA: "He's not a light in this jar. He's on a bus.", PANGAKO: 'Not yet.', MIGS: 'Is that you?? Then you know the lights.', LUZ: 'Present.', HELP: 'Five lights. Any order. The clues are in READ ME MIGS.', OPEN: 'Nice try.', PLEASE: 'Nice try. Polite, though.', EXTEND: 'Wrong program, Ate Bing.' }[w];
      Sound.beep(150, 0.12, { type: 'square', vol: 0.05 }); say(egg || pick(['The jar stays dark.', 'Not a light.', 'Nothing happens. The jar is patient.']), egg ? 'C' : 'R');
    }
    /* ---- scene 2: the lid comes off ---- */
    function opening(dt) {
      paintJar(Math.min(6, sceneT * 2.4));
      for (const f of flies) { f.home = false; f.vy = (f.vy || -0.5) - dt * (3 + f.ph * 0.4); f.y += f.vy * dt; f.x += Math.sin(t * 2 + f.ph) * dt * 2.2; if (f.y < -2) f.gone = true; }
      if (sceneT > 3) { S.opened = S.opened || Date.now(); Quest.lead('jar'); Quest.save(); go('letter'); }
    }
    /* ---- scene 3: the letter, typed out a page at a time ---- */
    function paintText(src, y0 = 2) {
      cls(); let left = Math.floor(typed);
      src.forEach((raw, i) => { const hot = raw[0] === '~', line = hot ? raw.slice(1) : raw; if (left <= 0) return; const shown = line.slice(0, left); left -= line.length + 1; at(1, y0 + i, shown, hot ? 'Y' : 'W'); });
      return left > 0;   // true once the whole page is showing
    }
    const pageLen = (src) => src.reduce((n, l) => n + l.length + 1, 0);
    /* ---- scene 4: catch them ---- */
    function startCatch() {
      title = ['ALITAPTAP.BAS', 'CAUGHT 0 OF 7']; caughtMsg = [isTouch() ? 'TAP A FIREFLY TO CATCH IT' : 'CLICK A FIREFLY TO CATCH IT', isTouch() ? '' : '(or press Space)'];
      flies = JAR_FLIES.slice(0, 6).map(([name, means], i) => ({ name, means, x: 5 + (i * 6.1) % 30, y: 4 + (i * 3.7) % 12, vx: rand(-2.4, 2.4), vy: rand(-1.2, 1.2), ph: i * 1.3, rate: 1.4 + i * 0.3 }));
    }
    function catchStep(dt) {
      cls(); const n = flies.filter(f => f.caught).length; title[1] = `CAUGHT ${n} OF 7`;
      for (const f of flies) {
        if (f.caught) { f.fade = Math.max(0, f.fade - dt * 1.6); f.y -= dt * 3; if (f.fade <= 0) f.gone = true; continue; }
        f.vx += rand(-1, 1) * dt * 5; f.vy += rand(-1, 1) * dt * 3; const sp = f.big ? 1.3 : 3; f.vx = clamp(f.vx, -sp, sp); f.vy = clamp(f.vy, -sp / 2, sp / 2);
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.x < 2) { f.x = 2; f.vx = Math.abs(f.vx); } if (f.x > COLS - 2) { f.x = COLS - 2; f.vx = -Math.abs(f.vx); } if (f.y < 2.5) { f.y = 2.5; f.vy = Math.abs(f.vy); } if (f.y > 16.5) { f.y = 16.5; f.vy = -Math.abs(f.vy); }
      }
      mid(19, caughtMsg[0], 'Y'); mid(20, caughtMsg[1], 'W');
    }
    function grab(e) {
      const r = cv.getBoundingClientRect(), k = cv.width / r.width, px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k, reach = Math.max(34 * k, cw * 3.4);
      let best = null, bd = reach;
      for (const f of flies) { if (f.caught) continue; const d = Math.hypot(ox + f.x * cw - px, oy + f.y * chh - py); if (d < bd) { bd = d; best = f; } }
      if (!best) return;
      best.caught = true; best.fade = 1; const n = flies.filter(f => f.caught).length;
      Sound.beep(520 + n * 90, 0.12, { type: 'triangle', vol: 0.14 }); Sound.beep(780 + n * 90, 0.2, { type: 'triangle', vol: 0.1 }, 0.09);
      caughtMsg = [best.name, 'It means ' + best.means]; tell(`Caught ${best.name}. It means ${best.means} ${n} of 7.`);
      if (n === 6) setTimeout(() => { if (scene !== 'catch') return; flies.push({ name: 'PANGAKO', means: 'a promise.', x: COLS / 2, y: 9, vx: 0.6, vy: 0.2, ph: 0, rate: 1.1, big: true }); caughtMsg = ['ONE LEFT.', 'It was hiding behind the others.']; }, 1500);
      if (n === 7) { [523, 659, 784, 1047, 1319].forEach((f, i) => Sound.beep(f, 0.3, { type: 'triangle', vol: 0.12 }, 0.2 + i * 0.13)); S.caught = S.caught || Date.now(); Quest.lead('caught'); Quest.save(); setTimeout(() => { if (scene === 'catch') go('end'); }, 2600); }
    }
    /* ---- moving between scenes ---- */
    function go(name) {
      scene = name; sceneT = 0; typed = 0; flies = [];
      if (name === 'jar') { msg = wrap(S.lights.some(Boolean) ? 'The jar remembers the lights you already gave it.' : 'A jar. It is shut.\nIt wants five lights.').map(l => [l, 'w']); jarFlies(); paintJar(); setBar('input'); }
      else if (name === 'opening') { jarFlies(); setBar('none'); [392, 523, 659, 784, 1047].forEach((f, i) => Sound.beep(f, 0.4, { type: 'triangle', vol: 0.12 }, i * 0.16)); }
      else if (name === 'letter') { page = 0; lines = JAR_LETTER[0]; title = ['JAR.EXE', 'PAGE 1 OF ' + JAR_LETTER.length]; setBar('next'); tell(lines.join(' ').replace(/~/g, '')); }
      else if (name === 'catch') { startCatch(); setBar('none'); tell('Fireflies are loose on the screen. ' + caughtMsg[0]); }
      else if (name === 'end') { lines = JAR_END; title = ['JAR.EXE', 'THE END']; setBar('menu'); tell(lines.join(' ').replace(/~/g, '')); }
      else if (name === 'open') { cls(); title = ['JAR.EXE  v1.0', '(C) 1997 ALITAPTAP']; mid(8, 'THE JAR IS OPEN.', 'Y'); mid(10, S.caught ? 'All seven fireflies know you now.' : 'There are fireflies still inside.', 'w'); setBar('menu'); }
    }
    function advance() {
      if (scene === 'letter') {
        if (typed < pageLen(lines)) { typed = 1e9; return; }
        if (++page >= JAR_LETTER.length) return go('catch');
        lines = JAR_LETTER[page]; typed = 0; title[1] = `PAGE ${page + 1} OF ${JAR_LETTER.length}`; tell(lines.join(' ').replace(/~/g, ''));
      } else if (scene === 'end') typed = 1e9;
    }
    function loop(now) {
      raf = requestAnimationFrame(loop); if (!win.el.isConnected) return cancelAnimationFrame(raf);
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0); last = now; if (win.min) return; t += dt; sceneT += dt;
      if (scene === 'jar') for (const f of flies) { f.x = f.hx + Math.sin(t * 0.9 + f.ph) * 0.5; f.y = f.hy + Math.cos(t * 1.3 + f.ph) * 0.22; }
      else if (scene === 'opening') opening(dt);
      else if (scene === 'letter' || scene === 'end') {
        const before = Math.floor(typed); typed += dt * (scene === 'end' ? 26 : 34); if (Math.floor(typed) !== before && Math.floor(typed) % 3 === 0 && typed < pageLen(lines)) Sound.key();
        paintText(lines, scene === 'end' ? 2 : 3);
        if (scene === 'end' && !endTuko && typed > pageLen(lines) + 60) { endTuko = true; if (!S.closed) Tuko.say('"Whenever the web goes." ...The clock! Her homepage changes with the year. I wonder what it looks like NOW.', 14000); }
      } else if (scene === 'catch') catchStep(dt);
      draw();
    }
    scr.addEventListener('pointerdown', (e) => { if (scene === 'catch') grab(e); else if (scene === 'letter' || scene === 'end') advance(); else if (scene === 'jar' && input) input.focus(); });
    win.el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (scene === 'letter' || scene === 'end') { e.preventDefault(); advance(); }
      else if (scene === 'catch') {   // no mouse? Space catches whichever firefly is nearest the middle
        e.preventDefault(); const f = flies.filter(x => !x.caught).sort((a, b) => Math.hypot(a.x - 20, a.y - 9) - Math.hypot(b.x - 20, b.y - 9))[0]; if (!f) return;
        const r = cv.getBoundingClientRect(), k = r.width / cv.width; grab({ clientX: r.left + (ox + f.x * cw) * k, clientY: r.top + (oy + f.y * chh) * k });
      }
    });
    gameFocus(win);
    const ro = new ResizeObserver(fit); ro.observe(scr); win.onResize = fit;
    win.onClose = () => { cancelAnimationFrame(raf); ro.disconnect(); };
    cls(); go(S.opened ? 'open' : S.lights.every(Boolean) ? 'jar' : 'jar');
    if (!S.opened && S.lights.every(Boolean)) { setBar('none'); setTimeout(() => go('opening'), 1200); }
    requestAnimationFrame(() => { fit(); raf = requestAnimationFrame(loop); });
  },
};
