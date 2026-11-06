/* ============================================================
   Snake, on a little green LCD. Arrows, WASD, swipes or the pad.
   ============================================================ */
APPS.snake = {
  title: 'Snake', icon: 'snake', w: 420, h: 420, minW: 260, minH: 300,
  open(win) {
    const GWD = 24, GHT = 18, CELL = 14;
    const cv = h('canvas', { width: GWD * CELL, height: GHT * CELL, 'aria-label': 'Snake game' }), g = cv.getContext('2d');
    const sc = h('span'), hi = h('span'), msg = h('span');
    const pad = h('div.pad', ['u', 'l', 'd', 'r'].map(k => h('button.' + k, { 'aria-label': { u: 'Up', l: 'Left', d: 'Down', r: 'Right' }[k], text: { u: '▲', l: '◀', d: '▼', r: '▶' }[k], on: { pointerdown: (e) => { e.preventDefault(); turn(k); } } })));
    win.body.append(h('div.snake', h('div.info', sc, hi), cv, h('div.info', msg), pad));
    let snake, dir, next, food, bonus, score, alive, speed, acc = 0, last = 0, raf = null, paused = false;
    const best = () => Store.data.scores.snake || 0;
    const C = ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'];
    const spot = () => { for (;;) { const p = [Math.floor(Math.random() * GWD), Math.floor(Math.random() * GHT)]; if (!snake.some(s => s[0] === p[0] && s[1] === p[1])) return p; } };
    function reset() { snake = [[8, 9], [7, 9], [6, 9]]; dir = [1, 0]; next = [1, 0]; food = spot(); bonus = null; score = 0; alive = true; speed = 7; msg.textContent = 'eat the dots. press space to pause'; draw(); }
    const turn = (k) => { const d = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] }[k]; if (!d) return; if (!alive) { reset(); return; } if (d[0] === -dir[0] && d[1] === -dir[1]) return; next = d; };
    function step() {
      dir = next; const head = [(snake[0][0] + dir[0] + GWD) % GWD, (snake[0][1] + dir[1] + GHT) % GHT];
      if (snake.some((s, i) => i < snake.length - 1 && s[0] === head[0] && s[1] === head[1])) { alive = false; Sound.crash(); msg.textContent = 'game over. press any arrow to play again'; if (score > best()) { Store.data.scores.snake = score; Store.save(); msg.textContent = 'new high score! press any arrow'; } return; }
      snake.unshift(head);
      if (head[0] === food[0] && head[1] === food[1]) { score += 10; Sound.eat(); food = spot(); speed = Math.min(16, speed + 0.35); if (!bonus && Math.random() < 0.25) bonus = { p: spot(), t: 60 }; }
      else if (bonus && head[0] === bonus.p[0] && head[1] === bonus.p[1]) { score += 50; Sound.tada(); bonus = null; }
      else snake.pop();
      if (bonus && --bonus.t <= 0) bonus = null;
    }
    function draw() {
      g.fillStyle = C[0]; g.fillRect(0, 0, cv.width, cv.height);
      g.fillStyle = C[1]; for (let x = 0; x < GWD; x++) for (let y = 0; y < GHT; y++) if ((x + y) % 2) g.fillRect(x * CELL, y * CELL, CELL, CELL);
      g.fillStyle = C[3]; const f = food; g.fillRect(f[0] * CELL + 4, f[1] * CELL + 4, CELL - 8, CELL - 8); g.fillRect(f[0] * CELL + 6, f[1] * CELL + 2, 2, 2);
      if (bonus && (bonus.t > 15 || bonus.t % 2)) { g.fillStyle = C[2]; g.fillRect(bonus.p[0] * CELL + 2, bonus.p[1] * CELL + 2, CELL - 4, CELL - 4); g.fillStyle = C[0]; g.fillRect(bonus.p[0] * CELL + 5, bonus.p[1] * CELL + 5, CELL - 10, CELL - 10); }
      snake.forEach((s, i) => { g.fillStyle = i === 0 ? C[3] : C[2]; g.fillRect(s[0] * CELL + 1, s[1] * CELL + 1, CELL - 2, CELL - 2); });
      const hd = snake[0]; g.fillStyle = C[0]; g.fillRect(hd[0] * CELL + 4 + dir[0] * 2, hd[1] * CELL + 4 + dir[1] * 2, 2, 2);
      sc.textContent = 'SCORE ' + String(score).padStart(4, '0'); hi.textContent = 'HI ' + String(Math.max(best(), score)).padStart(4, '0');
    }
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (t - last) / 1000 || 0); last = t;
      if (!alive || paused || win.min || win !== WM.active) return;
      acc += dt * speed; let n = 0; while (acc >= 1 && n < 3) { step(); acc -= 1; n++; if (!alive) break; }
      draw();
    };
    win.el.tabIndex = -1;
    const keys = (e) => {
      if (WM.active !== win) return;
      const k = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r', W: 'u', S: 'd', A: 'l', D: 'r' }[e.key];
      if (k) { e.preventDefault(); turn(k); } else if (e.key === ' ') { e.preventDefault(); paused = !paused; msg.textContent = paused ? 'paused' : ''; }
    };
    document.addEventListener('keydown', keys);
    let sw = null;
    cv.addEventListener('pointerdown', (e) => { sw = [e.clientX, e.clientY]; });
    cv.addEventListener('pointerup', (e) => { if (!sw) return; const dx = e.clientX - sw[0], dy = e.clientY - sw[1]; if (Math.hypot(dx, dy) > 20) turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u')); else if (!alive) reset(); sw = null; });
    win.onClose = () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', keys); };
    reset(); raf = requestAnimationFrame(loop);
  },
};
