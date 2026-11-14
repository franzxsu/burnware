/* ============================================================
   Pinball, part 1 of 3: the table, the physics and the rules.
   No drawing in here, so it can be tested on its own.

   The table is 400 x 750 units. The ball moves in tiny steps
   (480 a second) so it can never slip through a wall or a flipper.
   Everything solid is either a line (walls, rails, targets), a
   circle (bumpers, posts) or a flipper (a fat line that swings).
   ============================================================ */
const PB = (() => {
  const W = 400, H = 750, BR = 9, G = 1050, DT = 1 / 480, VMAX = 2100, PLY = 690;
  const mirror = (x) => 372 - x;
  const mk = (x1, y1, x2, y2, o) => {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    return Object.assign({ x1, y1, x2, y2, dx, dy, len2: len * len, nx: -dy / len, ny: dx / len, e: 0.45, kind: 'wall',
      minx: Math.min(x1, x2) - BR, maxx: Math.max(x1, x2) + BR, miny: Math.min(y1, y2) - BR, maxy: Math.max(y1, y2) + BR }, o);
  };
  /* ---- the table ---- */
  const SEGS = [], DOME = [], add = (...a) => { const s = mk(...a); SEGS.push(s); return s; };
  for (let i = 0; i <= 28; i++) { const a = Math.PI * (1 + i / 28); DOME.push([202 + 182 * Math.cos(a), 130 + 130 * Math.sin(a)]); }
  for (let i = 0; i < 28; i++) add(DOME[i][0], DOME[i][1], DOME[i + 1][0], DOME[i + 1][1], { kind: 'dome' });
  add(20, 130, 20, 650); add(20, 650, 165, 735);                    // left wall, left apron
  add(352, 178, 352, 700); add(352, 650, 207, 735);                 // right wall (the shooter lane is behind it), right apron
  add(384, 130, 384, 700);                                          // shooter lane, outer wall
  add(384, 150, 352, 178, { kind: 'gate', oneWay: true, e: 0.2 });  // one-way gate: out of the lane, never back in
  add(352, 236, 326, 262); add(20, 300, 44, 324);                   // deflectors keep balls off the side walls
  const DIVIDERS = [30, 132, 202, 272, 356], LANE_Y = 84;           // four lanes at the top: B U R N (edges of each lane)
  for (const x of DIVIDERS.slice(1, 4)) add(x, 62, x, 106, { kind: 'post' });
  const SLINGS = [];
  for (const m of [0, 1]) {
    const X = (x) => m ? mirror(x) : x;
    add(X(48), 540, X(48), 590); add(X(48), 590, X(120), 620.5);    // the rail between inlane and outlane; it meets the flipper smoothly
    add(X(78), 498, X(78), 570); add(X(78), 570, X(116), 594);      // slingshot: two plain sides...
    SLINGS.push(add(X(78), 498, X(116), 594, { kind: 'sling', side: m, e: 0.5 }));   // ...and the side that kicks
  }
  const TARGETS = [];
  for (const bank of [0, 1]) [360, 388, 416].forEach((y, idx) => TARGETS.push(add(bank ? 345 : 27, y, bank ? 345 : 27, y + 22, { kind: 'target', bank, idx, e: 0.6 })));
  const BUMPERS = [{ x: 140, y: 215, r: 24 }, { x: 264, y: 215, r: 24 }, { x: 202, y: 292, r: 24 }];
  const POSTS = [{ x: 110, y: 400, r: 8, e: 0.8 }, { x: 262, y: 400, r: 8, e: 0.8 }, { x: 60, y: 66, r: 8, e: 0.55 }];   // the last one stops a launched ball going all the way round
  const SAUCER = { x: 64, y: 262, r: 13 };

  function create() {
    return {
      t: 0, acc: 0, state: 'idle', score: 0, ballNo: 0, balls: 3, mult: 1, jackpot: 5000, bonus: 0, extra: 0, extraAt: 150000,
      save: 0, saveUsed: false, saveStarted: false, tilt: false, nudges: [], wait: 0, auto: 0, launched: false, msg: '', msgT: 0, shake: -9,
      lanes: [false, false, false, false], targets: [[false, false, false], [false, false, false]],
      bumpT: [-9, -9, -9], slingT: [-9, -9], laneT: -9, bankT: [-9, -9], saucerT: -9, flipT: -9,
      ball: { x: 368, y: PLY - BR, vx: 0, vy: 0, live: false, held: 0, still: 0 },
      flip: [{ px: 117, py: 628, len: 60, rest: 0.489, up: -0.489, ang: 0.489, av: 0, on: false },
        { px: 255, py: 628, len: 60, rest: Math.PI - 0.489, up: Math.PI + 0.489, ang: Math.PI - 0.489, av: 0, on: false }],
      plunger: { charge: 0, pull: false }, fx: [], stats: { unstuck: 0 },
    };
  }
  /* ---- the rules ---- */
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const say = (T, text, secs = 2.2) => { T.msg = text; T.msgT = T.t + secs; };
  function score(T, n) { T.score += n; if (T.score >= T.extraAt) { T.extraAt = Infinity; T.extra++; say(T, 'EXTRA BALL!', 3); T.fx.push('extra'); } }
  function serve(T, auto) {
    Object.assign(T.ball, { x: 368, y: PLY - BR, vx: 0, vy: 0, live: true, held: 0, still: 0 });
    T.state = 'ready'; T.launched = false; T.plunger.charge = 0; T.plunger.pull = false; T.auto = auto ? 0.9 : 0;
  }
  function newGame(T) {
    Object.assign(T, { score: 0, ballNo: 1, mult: 1, jackpot: 5000, bonus: 0, extra: 0, extraAt: 150000, tilt: false, nudges: [], save: 0, saveUsed: false, saveStarted: false,
      lanes: [false, false, false, false], targets: [[false, false, false], [false, false, false]] });
    serve(T); say(T, 'BALL 1', 1.6); T.fx.push('start');
  }
  /* let go of the plunger: the further it was pulled, the harder the shot */
  function launch(T, power) {
    const b = T.ball, P = T.plunger, c = power == null ? P.charge : power;
    P.pull = false; P.charge = 0;
    if (!b.live || b.x < 352 || b.y < PLY - BR - 30 || Math.abs(b.vy) > 60) return false;
    b.x = 368; b.y = PLY - BR; b.vx = 0; b.vy = -(1150 + 650 * c); T.launched = true; T.fx.push('launch'); return true;
  }
  function drained(T) {
    T.ball.live = false; T.fx.push('drain');
    if (T.save > 0 && !T.tilt) { T.save = 0; T.saveUsed = true; say(T, 'BALL SAVED'); T.fx.push('save'); return serve(T, true); }
    const bonus = T.tilt ? 0 : T.bonus * T.mult; score(T, bonus);
    say(T, T.tilt ? 'TILT - NO BONUS' : 'BONUS ' + fmt(bonus), 2.2); T.state = 'bonus'; T.wait = 2;
  }
  function next(T) {
    Object.assign(T, { tilt: false, nudges: [], bonus: 0, mult: 1, save: 0, saveUsed: false, saveStarted: false, lanes: [false, false, false, false] });
    if (T.extra > 0) { T.extra--; say(T, 'SHOOT AGAIN'); return serve(T); }
    if (T.ballNo >= T.balls) { T.state = 'over'; say(T, 'GAME OVER', 2.5); T.fx.push('over'); return; }
    T.ballNo++; serve(T); say(T, 'BALL ' + T.ballNo, 1.6);
  }
  function hitBumper(T, i) { if (T.t - T.bumpT[i] < 0.05) return; T.bumpT[i] = T.t; score(T, 100); T.jackpot += 250; T.bonus += 50; T.fx.push('bumper'); }
  function hitSling(T, s) { if (T.t - T.slingT[s] < 0.08) return; T.slingT[s] = T.t; score(T, 10); T.fx.push('sling'); }
  function hitLane(T, i) {
    if (T.lanes[i]) { score(T, 100); return T.fx.push('lane'); }
    T.lanes[i] = true; score(T, 500); T.bonus += 200;
    if (!T.lanes.every(Boolean)) return T.fx.push('lane');
    T.lanes = [false, false, false, false]; T.laneT = T.t; T.mult = Math.min(5, T.mult + 1); score(T, 2000);
    say(T, 'B-U-R-N!  BONUS x' + T.mult); T.fx.push('laneAll');
  }
  function hitTarget(T, bank, i) {
    const B = T.targets[bank];
    if (B[i]) { score(T, 50); return T.fx.push('knock'); }
    B[i] = true; score(T, 300); T.bonus += 200;
    if (!B.every(Boolean)) return T.fx.push('target');
    T.targets[bank] = [false, false, false]; T.bankT[bank] = T.t; score(T, 5000); T.save = Math.max(T.save, 10);
    say(T, 'TARGETS DOWN  +5,000  BALL SAVE ON'); T.fx.push('bank');
  }
  function hitSaucer(T) {
    const b = T.ball, j = T.jackpot * T.mult;
    b.x = SAUCER.x; b.y = SAUCER.y; b.vx = b.vy = 0; b.held = 1.1; score(T, j); T.jackpot = 5000;
    say(T, 'JACKPOT  ' + fmt(j), 2.6); T.fx.push('jackpot');
  }
  /* bump the table. Three bumps in four seconds and the machine tilts: flippers go dead */
  function nudge(T) {
    const b = T.ball; if (T.state !== 'play' || T.tilt || !b.live || b.held > 0) return;
    b.vy -= 240; b.vx += (Math.random() - 0.5) * 200; T.shake = T.t;
    T.nudges = T.nudges.filter(t => T.t - t < 4); T.nudges.push(T.t);
    if (T.nudges.length >= 3) { T.tilt = true; say(T, 'TILT', 1e9); T.fx.push('tilt'); } else { if (T.nudges.length === 2) say(T, 'CAREFUL...', 1.2); T.fx.push('nudge'); }
  }
  /* ---- one tiny step of time ---- */
  function sub(T) {
    const dt = DT; T.t += dt;
    for (const f of T.flip) {
      const up = f.on && !T.tilt, d = (up ? f.up : f.rest) - f.ang;
      if (d) { const sp = (up ? 20 : 14) * dt, st = Math.abs(d) <= sp ? d : Math.sign(d) * sp; f.ang += st; f.av = st / dt; } else f.av = 0;
    }
    if (T.state === 'bonus') { T.wait -= dt; if (T.wait <= 0) next(T); return; }
    if (T.state === 'idle' || T.state === 'over') return;
    const P = T.plunger, b = T.ball;
    if (P.pull) P.charge = Math.min(1, P.charge + dt / 0.9);
    if (T.auto > 0) { T.auto -= dt; if (T.auto <= 0) launch(T, 0.45 + Math.random() * 0.5); }
    if (T.save > 0 && T.state === 'play') T.save -= dt;
    if (!b.live) return;
    if (b.held > 0) { b.held -= dt; if (b.held <= 0) { b.vx = 380; b.vy = 150; T.saucerT = T.t; T.fx.push('eject'); } return; }
    const y0 = b.y;
    b.vy += G * dt;
    const s2 = b.vx * b.vx + b.vy * b.vy; if (s2 > VMAX * VMAX) { const k = VMAX / Math.sqrt(s2); b.vx *= k; b.vy *= k; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    const plY = PLY + 24 * P.charge;                       // the plunger is the floor of the shooter lane
    if (b.x > 352 && b.y + BR > plY) { b.y = plY - BR; if (b.vy > 0) b.vy = 0; }
    for (const s of SEGS) {                                // walls, rails, slingshots, targets
      if (b.x < s.minx || b.x > s.maxx || b.y < s.miny || b.y > s.maxy) continue;
      let t = ((b.x - s.x1) * s.dx + (b.y - s.y1) * s.dy) / s.len2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = s.x1 + s.dx * t, cy = s.y1 + s.dy * t; let nx = b.x - cx, ny = b.y - cy; const d2 = nx * nx + ny * ny;
      if (d2 >= BR * BR) continue;
      const d = Math.sqrt(d2) || 1e-6; nx /= d; ny /= d;
      const vn = b.vx * nx + b.vy * ny;
      if (s.oneWay && (nx * s.nx + ny * s.ny <= 0 || vn >= 0)) continue;
      b.x = cx + nx * BR; b.y = cy + ny * BR;
      if (vn >= 0) continue;
      const hard = -vn, e = hard < 70 ? 0 : s.e;           // a gentle touch doesn't bounce, so the ball can roll and rest
      b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
      if (s.kind === 'sling' && hard > 90 && t > 0.06 && t < 0.94) { b.vx += nx * 470; b.vy += ny * 470; hitSling(T, s.side); }
      else if (s.kind === 'target' && hard > 90) hitTarget(T, s.bank, s.idx);
      else if (hard > 420) T.fx.push('knock');
    }
    for (let i = 0; i < BUMPERS.length + POSTS.length; i++) {   // bumpers kick; posts just bounce
      const c = i < 3 ? BUMPERS[i] : POSTS[i - 3], R = BR + c.r; let nx = b.x - c.x, ny = b.y - c.y; const d2 = nx * nx + ny * ny;
      if (d2 >= R * R) continue;
      const d = Math.sqrt(d2) || 1e-6; nx /= d; ny /= d; b.x = c.x + nx * R; b.y = c.y + ny * R;
      const vn = b.vx * nx + b.vy * ny;
      if (i < 3) { if (vn < 0) { b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny; } const out = b.vx * nx + b.vy * ny; if (out < 560) { b.vx += (560 - out) * nx; b.vy += (560 - out) * ny; } hitBumper(T, i); }
      else if (vn < 0) { const e = -vn < 70 ? 0 : c.e; b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; }
    }
    for (const f of T.flip) {                               // flippers: the ball takes on the speed of the bit that hits it
      const ex = f.len * Math.cos(f.ang), ey = f.len * Math.sin(f.ang);
      let t = ((b.x - f.px) * ex + (b.y - f.py) * ey) / (f.len * f.len); t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = f.px + ex * t, cy = f.py + ey * t, R = BR + 8 - 3 * t; let nx = b.x - cx, ny = b.y - cy; const d2 = nx * nx + ny * ny;
      if (d2 >= R * R) continue;
      const d = Math.sqrt(d2) || 1e-6; nx /= d; ny /= d; b.x = cx + nx * R; b.y = cy + ny * R;
      const vn = (b.vx + f.av * (cy - f.py)) * nx + (b.vy - f.av * (cx - f.px)) * ny;
      if (vn < 0) { const e = -vn < 70 ? 0 : 0.26; b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; if (f.av && -vn > 300) T.flipT = T.t; }
    }
    const v2 = b.vx * b.vx + b.vy * b.vy; if (v2 > VMAX * VMAX) { const k = VMAX / Math.sqrt(v2); b.vx *= k; b.vy *= k; }
    if ((y0 - LANE_Y) * (b.y - LANE_Y) < 0) for (let i = 0; i < 4; i++) if (b.x > DIVIDERS[i] && b.x < DIVIDERS[i + 1]) hitLane(T, i);
    if (T.t - T.saucerT > 1.5 && s2 < 900 * 900 && Math.hypot(b.x - SAUCER.x, b.y - SAUCER.y) < 10) hitSaucer(T);
    if (T.state === 'ready' && T.launched && b.x < 352) {   // out of the lane and into play
      T.state = 'play'; if (!T.saveUsed && !T.saveStarted) { T.save = 12; T.saveStarted = true; }
    }
    if (b.y > H + 14) return drained(T);
    /* a ball that has stopped dead in play (it shouldn't) gets a free kick */
    if (s2 < 64 && T.state === 'play' && !T.flip[0].on && !T.flip[1].on) { b.still += dt; if (b.still > 2.5) { b.still = 0; T.stats.where = [b.x | 0, b.y | 0]; b.vy = -280; b.vx = (Math.random() - 0.5) * 300; T.stats.unstuck++; } } else b.still = 0;
  }
  /* run the table forward by one screen frame */
  function frame(T, secs) { T.acc += Math.min(secs, 0.05); while (T.acc >= DT) { sub(T); T.acc -= DT; } }
  /* the demo player: flips when the ball is over a flipper, plunges when it's in the lane */
  function bot(T) {
    const b = T.ball;
    if (T.state === 'idle' || T.state === 'over') return newGame(T);
    if (T.state === 'ready' && !T.launched && T.auto <= 0) T.auto = 0.7;
    T.flip.forEach((f, i) => {   // flip for a moment, then let go, so it never just holds the ball
      const mid = i ? 225 : 147, near = b.live && Math.abs(b.x - mid) < 36 && b.y > 596 && b.y < 652 && b.vy > -120;
      if (f.on) { if (T.t - f.botT > 0.22) f.on = false; } else if (near && T.t - (f.botT || 0) > 0.45) { f.on = true; f.botT = T.t; }
    });
  }
  return { W, H, BR, PLY, SEGS, DOME, DIVIDERS, LANE_Y, SLINGS, TARGETS, BUMPERS, POSTS, SAUCER, create, newGame, launch, nudge, frame, bot, fmt };
})();
