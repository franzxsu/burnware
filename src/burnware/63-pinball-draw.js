/* ============================================================
   Pinball, part 2 of 3: painting the table.
   table() paints everything that never moves, once. frame() adds
   the lights, bumpers, flippers, plunger and ball on top, 60 times
   a second. All measurements are in table units (400 x 750).
   ============================================================ */
const PBDraw = {
  LANE_X: [81, 167, 237, 314], LETTERS: 'BURN',
  playfield(g) { g.beginPath(); g.moveTo(20, 750); g.lineTo(20, 130); for (const [x, y] of PB.DOME) g.lineTo(x, y); g.lineTo(384, 750); g.closePath(); },
  table(g) {
    const { W, H, SEGS, SAUCER } = PB;
    g.fillStyle = '#0b0b0f'; g.fillRect(0, 0, W, H);
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#222a5e'); bg.addColorStop(0.5, '#151b44'); bg.addColorStop(1, '#0a0d26');
    this.playfield(g); g.fillStyle = bg; g.fill();
    g.save(); this.playfield(g); g.clip();
    /* a night sky, the same stars every time */
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 110; i++) { const x = 20 + rnd() * 332, y = rnd() * 650, big = rnd() < 0.14; g.fillStyle = `rgba(255,255,255,${(0.2 + rnd() * 0.5).toFixed(2)})`; g.fillRect(x, y, big ? 2 : 1, big ? 2 : 1); }
    /* rings around the bumpers, and a big flame in the middle of the table */
    g.strokeStyle = 'rgba(255,140,40,.16)'; g.lineWidth = 2;
    for (const r of [64, 96, 128]) { g.beginPath(); g.arc(202, 245, r, 0, Math.PI * 2); g.stroke(); }
    const fl = g.createLinearGradient(0, 380, 0, 520); fl.addColorStop(0, 'rgba(255,200,60,.30)'); fl.addColorStop(1, 'rgba(216,48,48,.26)');
    g.fillStyle = fl; g.beginPath(); g.moveTo(188, 368); g.bezierCurveTo(236, 416, 252, 446, 238, 486); g.bezierCurveTo(226, 524, 148, 524, 136, 486); g.bezierCurveTo(126, 452, 160, 436, 164, 404); g.bezierCurveTo(176, 420, 184, 392, 188, 368); g.fill();
    g.fillStyle = 'rgba(255,236,150,.22)'; g.beginPath(); g.moveTo(188, 420); g.bezierCurveTo(212, 448, 220, 466, 212, 488); g.bezierCurveTo(204, 508, 170, 508, 162, 488); g.bezierCurveTo(156, 470, 176, 456, 188, 420); g.fill();
    /* arrows pointing at things worth hitting */
    g.fillStyle = 'rgba(255,160,40,.5)';
    const arrow = (x, y, a) => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(0, -9); g.lineTo(7, 6); g.lineTo(-7, 6); g.closePath(); g.fill(); g.restore(); };
    arrow(52, 400, -Math.PI / 2); arrow(320, 400, Math.PI / 2); arrow(92, 290, -2.2);
    g.fillStyle = '#05060f'; g.fillRect(352, 150, 34, 600);                                   // the shooter lane
    g.fillStyle = 'rgba(255,140,40,.35)'; for (let y = 240; y < 660; y += 44) { g.beginPath(); g.moveTo(368, y); g.lineTo(376, y + 12); g.lineTo(360, y + 12); g.closePath(); g.fill(); }
    g.restore();
    /* the metal aprons at the bottom */
    for (const pts of [[[20, 650], [165, 735], [165, 750], [20, 750]], [[352, 650], [207, 735], [207, 750], [352, 750]]]) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fillStyle = '#343a4a'; g.fill(); }
    g.font = 'bold 11px Tahoma, Verdana, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffb030';
    g.save(); g.translate(72, 714); g.rotate(0.53); g.fillText('BURNWARE', 0, 0); g.restore();
    g.save(); g.translate(300, 714); g.rotate(-0.53); g.fillText('PINBALL', 0, 0); g.restore();
    /* slingshot bodies */
    for (const m of [0, 1]) { const X = (x) => m ? 372 - x : x; g.beginPath(); g.moveTo(X(78), 498); g.lineTo(X(78), 570); g.lineTo(X(116), 594); g.closePath(); g.fillStyle = '#7c1626'; g.fill(); g.beginPath(); g.moveTo(X(84), 522); g.lineTo(X(84), 566); g.lineTo(X(106), 580); g.closePath(); g.fillStyle = '#c8303c'; g.fill(); }
    /* rails: a dark edge, steel, and a white glint down the middle */
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [w, c] of [[5.5, '#04050a'], [3.2, '#a4aec0'], [1, '#ffffff']]) {
      g.beginPath(); for (const s of SEGS) if (s.kind === 'wall' || s.kind === 'dome' || s.kind === 'post') { g.moveTo(s.x1, s.y1); g.lineTo(s.x2, s.y2); }
      g.lineWidth = w; g.strokeStyle = c; g.stroke();
    }
    g.beginPath(); g.moveTo(384, 150); g.lineTo(352, 178); g.lineWidth = 1.5; g.strokeStyle = '#5cff8a'; g.stroke();   // the one-way gate is just a wire
    /* the jackpot hole */
    g.beginPath(); g.arc(SAUCER.x, SAUCER.y, 17, 0, 7); g.fillStyle = '#ff9a1e'; g.fill();
    g.beginPath(); g.arc(SAUCER.x, SAUCER.y, 14, 0, 7); g.fillStyle = '#a4aec0'; g.fill();
    g.beginPath(); g.arc(SAUCER.x, SAUCER.y, 11.5, 0, 7); g.fillStyle = '#000'; g.fill();
    g.font = 'bold 8px Tahoma, Verdana, sans-serif'; g.fillStyle = '#ffb030'; g.fillText('JACKPOT', SAUCER.x + 4, SAUCER.y - 25);
  },
  frame(g, T) {
    const { BR, PLY, TARGETS, BUMPERS, POSTS, SAUCER } = PB, t = T.t, b = T.ball, blink = Math.floor(t * 8) % 2 === 0;
    const disc = (x, y, r, fill, stroke, lw) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = lw || 1; g.strokeStyle = stroke; g.stroke(); } };
    const label = (txt, x, y, col, px) => { g.font = `bold ${px}px Tahoma, Verdana, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(txt, x, y + 0.5); };
    /* lights set into the table */
    const laneFlash = t - T.laneT < 1;
    this.LANE_X.forEach((x, i) => { const on = laneFlash ? blink : T.lanes[i]; disc(x, 84, 12, on ? '#ffe45a' : '#3a3412', '#000', 1.5); label(this.LETTERS[i], x, 84, on ? '#000' : '#8a7c30', 13); });
    for (let n = 2; n <= 5; n++) { const x = 150 + (n - 2) * 24, on = T.mult >= n; disc(x, 546, 10, on ? '#ff8a1e' : '#3a1c0a', '#000', 1.5); label('x' + n, x, 546, on ? '#000' : '#8a4a1a', 9); }
    const saveOn = T.save > 0 && (T.save > 3 || blink); disc(186, 578, 12, saveOn ? '#5cff8a' : '#0f3a1c', '#000', 1.5); label('SAVE', 186, 578, saveOn ? '#000' : '#2a7a44', 7);
    if (T.extra > 0) { disc(186, 516, 12, blink ? '#ffe45a' : '#8a7c30', '#000', 1.5); label('AGAIN', 186, 516, '#000', 6); }
    /* targets */
    for (const s of TARGETS) { const flash = t - T.bankT[s.bank] < 0.8, on = flash ? blink : T.targets[s.bank][s.idx]; g.fillStyle = on ? '#ffe45a' : '#6a5a14'; const x = s.bank ? s.x1 : 21; g.fillRect(x, s.y1, 6.5, 22); g.strokeStyle = '#000'; g.lineWidth = 1; g.strokeRect(x, s.y1, 6.5, 22); }
    /* slingshot kickers */
    for (const s of PB.SLINGS) { const hit = t - T.slingT[s.side] < 0.09, k = hit ? 4 : 0; g.beginPath(); g.moveTo(s.x1 + (s.side ? -k : k), s.y1); g.lineTo(s.x2 + (s.side ? -k : k), s.y2); g.lineWidth = hit ? 5 : 3; g.strokeStyle = hit ? '#ffffff' : '#ffd23a'; g.lineCap = 'round'; g.stroke(); }
    /* bumpers and posts */
    BUMPERS.forEach((c, i) => {
      const hit = t - T.bumpT[i] < 0.11, r = c.r + (hit ? 2 : 0);
      disc(c.x, c.y, r, '#eceef4', '#000', 1.5);
      const cap = g.createRadialGradient(c.x - 6, c.y - 7, 2, c.x, c.y, 19); cap.addColorStop(0, hit ? '#ffffff' : '#ffc040'); cap.addColorStop(0.6, hit ? '#fff0a0' : '#f06a1e'); cap.addColorStop(1, hit ? '#ffb030' : '#a01c1c');
      disc(c.x, c.y, 18, cap, '#000', 1); disc(c.x, c.y, 7, hit ? '#fff' : '#ffe45a', '#000', 1); label('100', c.x, c.y, '#000', 6);
    });
    for (const c of POSTS) disc(c.x, c.y, c.r, '#f4f4f4', '#d83030', 2.5);
    /* the plunger: a rod, a red knob and a spring that squashes as you pull */
    const pl = PLY + 24 * T.plunger.charge;
    g.fillStyle = '#a4aec0'; g.fillRect(365, pl + 4, 6, 750 - pl); g.fillStyle = '#e04a2a'; g.fillRect(357, pl, 22, 6);
    g.beginPath(); for (let i = 0; i <= 8; i++) { const y = pl + 8 + (744 - pl - 8) * i / 8; g.lineTo(i % 2 ? 376 : 360, y); } g.lineWidth = 1.5; g.strokeStyle = '#e8ecf4'; g.stroke();
    /* flippers: white bats with a red rubber edge */
    for (const f of T.flip) {
      const c = Math.cos(f.ang), s = Math.sin(f.ang), tx = f.px + f.len * c, ty = f.py + f.len * s, a = f.ang;
      g.beginPath(); g.arc(f.px, f.py, 8, a + Math.PI / 2, a - Math.PI / 2); g.arc(tx, ty, 5, a - Math.PI / 2, a + Math.PI / 2); g.closePath();
      g.fillStyle = '#f6f6f6'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#d83030'; g.lineJoin = 'round'; g.stroke();
      disc(f.px, f.py, 3, '#8a8f9c', '#000', 1);
    }
    /* the ball, with a little shadow under it */
    if (b.live) {
      const sunk = b.held > 0, r = sunk ? BR - 2.5 : BR - 0.4;
      if (!sunk) disc(b.x + 2.5, b.y + 3.5, r, 'rgba(0,0,0,.38)');
      const ball = g.createRadialGradient(b.x - 3, b.y - 3.5, 0.5, b.x, b.y, r); ball.addColorStop(0, '#ffffff'); ball.addColorStop(0.35, sunk ? '#8a909c' : '#d4dae4'); ball.addColorStop(1, sunk ? '#30343c' : '#5a6270');
      disc(b.x, b.y, r, ball, '#000', 0.8);
    }
    if (T.tilt && blink) { g.fillStyle = 'rgba(216,48,48,.85)'; g.fillRect(110, 318, 152, 44); label('TILT', 186, 340, '#fff', 30); }
  },
};
