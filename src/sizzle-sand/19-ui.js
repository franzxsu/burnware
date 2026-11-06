/* ============================================================
   UI: tool rail, ingredient shelf, pointer input on the kitchen,
   the little controls drawn over fixtures, tickets, toasts, sheets,
   and turning the frame sideways on upright phones.
   ============================================================ */
const $ = (s) => document.querySelector(s);
const TOOLS = [
  { id: 'pour', label: 'Pour', r: 2 },
  { id: 'scoop', label: 'Scoop', r: 7 },
  { id: 'stir', label: 'Stir', r: 6 },
  { id: 'wipe', label: 'Wipe', r: 4 },
  { id: 'torch', label: 'Torch', r: 2 },
  { id: 'foam', label: 'Foam', r: 4 },
  { id: 'build', label: 'Brick', r: 1 },
];
/* pixel icons as tiny SVGs: each string row is a line of pixels, letters pick colours */
function pixSvg(rows, pal) {
  let r = '';
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = pal[row[x]]; if (c) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; } });
  return `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
const TOOL_ICONS = {
  scoop: pixSvg(['.........', '......cc.', '.....c...', '....c....', '...c.....', 'ss.c.....', 'sssss....', '.sss.....', '.........'], { c: '#c8ced6', s: '#9aa3ad' }),
  stir: pixSvg(['......w..', '.....w...', '....w....', '...w.....', '..w......', '.www.....', 'wwwww....', '.www.....', '.........'], { w: '#c8955a' }),
  wipe: pixSvg(['.........', '.........', '.yyyyyyy.', '.yyyyyyy.', '.ggggggg.', '.ggggggg.', '.........', '.b..b..b.', '..b..b...'], { y: '#ffd23a', g: '#3caa72', b: '#6fc3ff' }),
  torch: pixSvg(['....y....', '...yoy...', '...ooo...', '..oroo...', '...rr....', '...ss....', '..ssss...', '..ssss...', '..ssss...'], { y: '#fff3a0', o: '#ff9a2e', r: '#e8462a', s: '#5a6270' }),
  foam: pixSvg(['...kk....', '..kkkw...', '...rr.w..', '..rrrr...', '..rwwr...', '..rrrr...', '..rrrr...', '..rrrr...', '..rrrr...'], { k: '#30343c', r: '#d6392f', w: '#f4f6f8' }),
  build: pixSvg(['.........', 'bbbmbbbb.', 'bbbmbbbb.', 'mmmmmmmmm', 'bmbbbbmbb', 'bmbbbbmbb', 'mmmmmmmmm', 'bbbmbbbb.', '.........'], { b: '#b4523a', m: '#d9cfc0' }),
};
const Icons = {
  cache: {},
  /* a 12x12 pixel drawing of an ingredient: heaps for grains, drops for liquids, little objects for stamps */
  ing(ing) {
    if (this.cache[ing.key]) return this.cache[ing.key];
    const c = document.createElement('canvas'); c.width = c.height = 12; const x = c.getContext('2d');
    const R = mulberry(ing.key.length * 31 + ing.key.charCodeAt(0));
    const px = (a, b, col) => { x.fillStyle = col; x.fillRect(a, b, 1, 1); };
    const hex = (rgb, d = 0) => `rgb(${clamp(rgb[0] + d, 0, 255)},${clamp(rgb[1] + d, 0, 255)},${clamp(rgb[2] + d, 0, 255)})`;
    const shape = {
      egg: () => { for (let yy = 1; yy < 12; yy++) for (let xx = 1; xx < 11; xx++) { const d = ((xx - 5.5) / 4.6) ** 2 + ((yy - 6.5) / 5) ** 2; if (d < 1) px(xx, yy, d < 0.22 ? '#ffb01c' : '#f4f2ea'); } },
      butter: () => { for (let yy = 4; yy < 10; yy++) for (let xx = 1; xx < 11; xx++) px(xx, yy, yy === 4 ? '#fff3b8' : '#fce68a'); },
      choc: () => { for (let yy = 2; yy < 11; yy++) for (let xx = 2; xx < 10; xx++) px(xx, yy, (xx % 3 === 1 || yy % 3 === 1) ? '#5a301a' : '#7a4428'); },
      garlic: () => { for (let yy = 2; yy < 11; yy++) for (let xx = 2; xx < 10; xx++) { const d = ((xx - 5.5) / 3.6) ** 2 + ((yy - 7) / 4) ** 2; if (d < 1) px(xx, yy, xx === 5 ? '#d8cfb0' : '#f4eedc'); } px(5, 2, '#9ab86a'); px(6, 1, '#9ab86a'); },
      chicken: () => { for (let yy = 1; yy < 9; yy++) for (let xx = 3; xx < 11; xx++) { const d = ((xx - 7) / 3.8) ** 2 + ((yy - 4.5) / 3.6) ** 2; if (d < 1) px(xx, yy, '#ee9c90'); } for (let k = 0; k < 4; k++) { px(3 - (k > 2 ? 1 : 0) + k * 0, 8 + k * 0, '#f4f0e6'); } px(2, 9, '#f4f0e6'); px(3, 9, '#f4f0e6'); px(1, 10, '#f4f0e6'); px(2, 10, '#f4f0e6'); px(4, 8, '#f4f0e6'); },
      noodles: () => { for (let yy = 3; yy < 10; yy++) for (let xx = 1; xx < 11; xx++) px(xx, yy, ((xx + (yy % 2)) % 2) ? '#e8cc88' : '#d4b26a'); },
      ice: () => { for (let yy = 2; yy < 10; yy++) for (let xx = 2; xx < 10; xx++) px(xx, yy, xx === 2 || yy === 2 ? '#eef9ff' : '#bfe6f8'); },
      mints: () => { for (let yy = 3; yy < 9; yy++) for (let xx = 1; xx < 11; xx++) px(xx, yy, (xx % 3 === 0) ? '#d8dde2' : '#fbfbfb'); x.fillStyle = '#2f8f5a'; x.fillRect(1, 5, 10, 2); },
    }[ing.key];
    if (shape) shape();
    else {
      const d = E[ing.el], col = d.ramp ? d.ramp[0] : d.col;
      if (d.cat === LIQUID) {   // a droplet
        for (let yy = 1; yy < 12; yy++) for (let xx = 1; xx < 11; xx++) { const w = yy < 6 ? (yy - 1) * 0.9 : 4.6 - Math.max(0, yy - 9) * 1.2; if (Math.abs(xx - 5.5) <= w) px(xx, yy, hex(col, xx < 5 && yy > 4 && yy < 9 ? 40 : 0)); }
      } else {   // a little heap of grains
        for (let yy = 4; yy < 12; yy++) for (let xx = 0; xx < 12; xx++) { if (Math.abs(xx - 5.5) <= (yy - 4) * 0.9 + 0.5) px(xx, yy, hex(col, (R() - 0.5) * d.vary * 2)); }
      }
    }
    return (this.cache[ing.key] = c.toDataURL());
  },
};

const UI = {
  tool: 'pour', ing: Tools.INGREDIENTS[0], held: null, ptr: null, hover: null, paused: false, speed: 1, lastStamp: null,
  init() {
    // tool rail
    const tools = $('#tools');
    tools.innerHTML = TOOLS.map(t => `<button class="tool" data-tool="${t.id}" aria-pressed="false">${t.id === 'pour' ? '<img class="sw" id="pourIcon" alt="">' : TOOL_ICONS[t.id]}<span>${t.id === 'pour' ? 'Pour' : t.label}</span></button>${t.id === 'pour' ? '<div class="tsep"></div>' : ''}`).join('');
    tools.querySelectorAll('.tool').forEach(b => b.onclick = () => { Sfx.init(); Sfx.click(); this.setTool(b.dataset.tool); });
    // ingredient shelf
    const tray = $('#tray');
    tray.innerHTML = Tools.INGREDIENTS.map((g, k) => `<button class="ing" data-k="${k}" aria-pressed="false"><img alt="" src="${Icons.ing(g)}"><span>${g.label}</span></button>`).join('');
    tray.querySelectorAll('.ing').forEach(b => b.onclick = () => { Sfx.init(); Sfx.click(); this.setIng(Tools.INGREDIENTS[+b.dataset.k]); });
    this.setIng(this.ing);
    // fixtures you can operate
    const hot = $('#hot');
    const at = (x, y) => `left:${(x / GW * 100).toFixed(2)}%;top:${(y / GH * 100).toFixed(2)}%`;
    hot.innerHTML = Kitchen.burners.map((b, k) => `<button class="knob" data-b="${k}" style="${at(b.knobX, 124)}" aria-label="${b.label} burner"><span></span></button><div class="lcd" id="lcd${k}" style="${at(b.knobX + 21, 124)}" title="${b.label} temperature">--°</div>`).join('')
      + `<button class="chip" id="hTap" style="${at(274, 78)}" aria-pressed="false">Tap</button>`
      + `<button class="chip" id="hHood" style="${at(80, 30)}" aria-pressed="false">Fan</button>`
      + Kitchen.lids.map((L, k) => `<button class="chip lidchip" data-l="${k}" style="${at(k === 0 ? 12 : 146, k === 0 ? 70 : 96)}" aria-pressed="false" aria-label="Lid on the ${L.id}">Lid</button>`).join('')
      + Kitchen.vessels.map(v => `<div class="serve" data-v="${v.id}" style="${at((v.x0 + v.x1) / 2, 122)}"><button class="go" data-v="${v.id}">Serve</button><button class="clear" data-v="${v.id}" aria-label="Empty the ${v.name.toLowerCase()}">Empty</button></div>`).join('')
      + `<button class="pet" id="hCat" style="${at(105, 10)}" aria-label="Pet the cat"></button>`
      + `<div class="alarm" id="hAlarm" style="${at(190, 11)}" hidden>SMOKE!</div>`
      + `<div class="knobpop" id="knobpop" hidden></div>`;
    hot.querySelectorAll('.knob').forEach(b => b.onclick = (e) => { e.stopPropagation(); Sfx.init(); Sfx.click(); this.openKnob(+b.dataset.b); });
    $('#hCat').onclick = () => { Sfx.init(); Cat.pet(); };
    $('#hTap').onclick = () => { Sfx.init(); Sfx.click(); Kitchen.tap.on = !Kitchen.tap.on; this.syncFixtures(); };
    $('#hHood').onclick = () => { Sfx.init(); Sfx.click(); Kitchen.hood.on = !Kitchen.hood.on; this.syncFixtures(); };
    hot.querySelectorAll('.lidchip').forEach(b => b.onclick = () => {
      Sfx.init(); const k = +b.dataset.l, L = Kitchen.lids[k];
      if (Kitchen.setLid(k, !L.on)) Sfx.plop(); else this.toast({ kind: 'bad', title: 'The lid will not fit', text: 'Something is piled up too high in the ' + L.id + '.' });
      this.syncFixtures();
    });
    hot.querySelectorAll('.serve .go').forEach(b => b.onclick = () => this.serve(b.dataset.v));
    hot.querySelectorAll('.serve .clear').forEach(b => b.onclick = () => { Sfx.init(); Sfx.scoop(); Kitchen.emptyVessel(Kitchen.vessels.find(v => v.id === b.dataset.v)); });
    document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#knobpop') && !e.target.closest('.knob')) $('#knobpop').hidden = true; });
    this.syncFixtures();
    this.bindPointer();
    // top bar
    $('#bBook').onclick = () => { Sfx.init(); Sfx.click(); this.showBook(); };
    $('#bSpeed').onclick = () => { Sfx.click(); this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 4 : 1; $('#bSpeed').textContent = this.speed + '×'; };
    $('#bPause').onclick = () => { Sfx.click(); this.paused = !this.paused; $('#bPause').setAttribute('aria-pressed', String(this.paused)); $('#bPause').textContent = this.paused ? '▶' : 'II'; };
    $('#bMenu').onclick = () => { Sfx.init(); Sfx.click(); this.showMenu(); };
    $('#bookClose').onclick = () => { $('#book').hidden = true; };
    $('#mShift').onclick = () => { Sfx.init(); Sfx.ding(); this.startShift(); };
    $('#mFree').onclick = () => { Sfx.init(); Sfx.click(); Service.stop(); Save.data.seenHelp = true; Save.save(); $('#menu').hidden = true; this.renderTickets(true); };
    $('#mClean').onclick = () => { Sfx.init(); Sfx.whoosh(); Kitchen.clearMess(); for (const b of Kitchen.burners) b.level = 0; Kitchen.tap.on = false; Kitchen.hood.on = false; this.syncFixtures(); $('#menu').hidden = true; if (Service.mode !== 'shift') { Service.stop(); this.renderTickets(true); } this.toast({ kind: 'ok', title: 'Spotless', text: 'Every pot scrubbed and the burners off.' }); };
    $('#mSound').onclick = () => { Sfx.init(); Save.data.sound = !Save.data.sound; Sfx.setOn(Save.data.sound); Save.save(); this.renderMenu(); };
    $('#mScreen').onclick = () => { const s = Save.data.screen || 'land'; Save.data.screen = { land: 'land2', land2: 'portrait', portrait: 'land' }[s]; Save.save(); Orient.apply(); this.renderMenu(); };
    $('#sumNext').onclick = () => { Sfx.init(); Sfx.ding(); $('#summary').hidden = true; this.startShift(); };
    $('#sumFree').onclick = () => { $('#summary').hidden = true; Service.stop(); this.renderTickets(true); };
    window.addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('input,textarea')) return;
      if (e.code === 'Space') { e.preventDefault(); $('#bPause').click(); }
      const n = '1234567'.indexOf(e.key); if (n >= 0 && n < TOOLS.length) this.setTool(TOOLS[n].id);
    });
  },
  setTool(id) { this.tool = id; document.querySelectorAll('#tools .tool').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === id))); },
  setIng(g) {
    this.ing = g; this.setTool('pour');
    document.querySelectorAll('#tray .ing').forEach(b => b.setAttribute('aria-pressed', String(Tools.INGREDIENTS[+b.dataset.k] === g)));
    $('#pourIcon').src = Icons.ing(g);
    document.querySelector('#tools .tool[data-tool="pour"] span').textContent = g.mode === 'stamp' ? 'Place' : 'Pour';
  },
  openKnob(k) {
    const pop = $('#knobpop'), b = Kitchen.burners[k];
    pop.style.left = (b.knobX / GW * 100) + '%'; pop.style.top = (124 / GH * 100) + '%';
    pop.innerHTML = Kitchen.LEVELS.map((l, i) => `<button data-l="${i}" aria-pressed="${i === b.level}">${l}</button>`).join('');
    pop.querySelectorAll('button').forEach(x => x.onclick = () => { Kitchen.setBurner(k, +x.dataset.l); Sfx.click(); pop.hidden = true; this.syncFixtures(); });
    pop.hidden = false;
  },
  /* the stove displays: food temperature in the pot and pan */
  updateLcd() {
    for (let k = 0; k < Kitchen.burners.length; k++) {
      const el = $('#lcd' + k); if (!el) continue;
      const T = Kitchen.reading(k);
      el.textContent = Math.round(T) + '°';
      el.className = 'lcd ' + (T < 60 ? 't-cool' : T < 140 ? 't-warm' : T < 240 ? 't-hot' : 't-smoke');
    }
  },
  /* money floating up off the dish that was just served */
  floatPay(vid, r) {
    const v = Kitchen.vessels.find(x => x.id === vid); if (!v) return;
    const el = document.createElement('div');
    el.className = 'floaty ' + (r.stars ? 'ok' : 'bad');
    el.style.left = ((v.x0 + v.x1) / 2 / GW * 100) + '%'; el.style.top = ((v.y0 + 2) / GH * 100) + '%';
    el.innerHTML = r.stars ? `<b>${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</b>+$${r.pay}` : '<b>☆☆☆</b>no tip';
    $('#hot').appendChild(el);
    setTimeout(() => el.remove(), 1700);
  },
  syncFixtures() {
    document.querySelectorAll('#hot .knob').forEach(el => { const b = Kitchen.burners[+el.dataset.b]; el.classList.toggle('on', b.level > 0); el.querySelector('span').textContent = b.label.toUpperCase() + ' ' + Kitchen.LEVELS[b.level]; });
    $('#hTap').setAttribute('aria-pressed', String(Kitchen.tap.on)); $('#hTap').textContent = Kitchen.tap.on ? 'Tap: on' : 'Tap';
    $('#hHood').setAttribute('aria-pressed', String(Kitchen.hood.on)); $('#hHood').textContent = Kitchen.hood.on ? 'Fan: on' : 'Fan';
    document.querySelectorAll('#hot .lidchip').forEach(el => { const on = Kitchen.lids[+el.dataset.l].on; el.setAttribute('aria-pressed', String(on)); el.textContent = on ? 'Lid: on' : 'Lid'; });
  },
  /* ---------- pointer on the kitchen ---------- */
  toFrame(e) {
    const h = document.documentElement, vw = window.innerWidth, vh = window.innerHeight;
    if (!h.classList.contains('rot')) return [e.clientX, e.clientY];
    return h.classList.contains('flip') ? [vh - e.clientY, e.clientX] : [e.clientY, vw - e.clientX];
  },
  sceneBox() {   // the scene's box in frame coordinates (offsets ignore the rotation)
    let el = $('#scene'), x = 0, y = 0;
    while (el && el.id !== 'root') { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    return { x, y, w: $('#scene').clientWidth, h: $('#scene').clientHeight };
  },
  toGrid(e) {
    const [fx, fy] = this.toFrame(e), b = this.sceneBox();
    return { x: Math.floor((fx - b.x) / b.w * GW), y: Math.floor((fy - b.y) / b.h * GH) };
  },
  bindPointer() {
    const sc = $('#scene');
    sc.addEventListener('pointerdown', (e) => {
      if (e.target.closest('#hot > *')) return;
      e.preventDefault(); Sfx.init();
      try { sc.setPointerCapture(e.pointerId); } catch (x) { /* fine */ }
      $('#knobpop').hidden = true;
      const g = this.toGrid(e); this.ptr = { id: e.pointerId, x: g.x, y: g.y, px: g.x, py: g.y, down: true };
      this.begin(g.x, g.y);
    });
    sc.addEventListener('pointermove', (e) => {
      const g = this.toGrid(e);
      this.hover = e.pointerType === 'mouse' && !e.target.closest('#hot > *') ? g : null;
      if (this.ptr && this.ptr.id === e.pointerId) { this.ptr.x = g.x; this.ptr.y = g.y; }
    });
    const end = (e) => { if (!this.ptr || this.ptr.id !== e.pointerId) return; this.finish(this.ptr.x, this.ptr.y); this.ptr = null; };
    sc.addEventListener('pointerup', end); sc.addEventListener('pointercancel', end);
    sc.addEventListener('pointerleave', () => { this.hover = null; });
    sc.addEventListener('contextmenu', (e) => e.preventDefault());
  },
  begin(x, y) {
    if (this.tool === 'pour' && this.ing.mode === 'stamp') { if (Tools.stamp(this.ing.key, x, y)) Sfx.plop(); this.lastStamp = { x, y }; }
    if (this.tool === 'scoop') { this.held = Tools.pick(x, y, 7); if (this.held.length) Sfx.scoop(); }
  },
  /* runs every frame while a finger or button is down */
  apply() {
    const p = this.ptr; if (!p) return;
    const { x, y } = p;
    switch (this.tool) {
      case 'pour':
        if (this.ing.mode === 'pour') Tools.pour(x, y, this.ing.el, CATA[this.ing.el] === LIQUID ? 3 : 4);
        else if ((this.ing.key === 'garlic' || this.ing.key === 'mints') && this.lastStamp && Math.hypot(x - this.lastStamp.x, y - this.lastStamp.y) > 7) { Tools.stamp(this.ing.key, x, y); this.lastStamp = { x, y }; }
        break;
      case 'stir': Tools.stir(x, y, 6, 140); break;
      case 'wipe': Tools.wipe(x, y, 4); break;
      case 'torch': Tools.torch(x, y); break;
      case 'foam': Tools.spray(x, y); break;
      case 'build': {   // join up fast strokes so walls have no gaps
        const n = Math.max(1, Math.ceil(Math.hypot(x - p.px, y - p.py)));
        for (let k = 0; k <= n; k++) Tools.build(Math.round(lerp(p.px, x, k / n)), Math.round(lerp(p.py, y, k / n)), 1);
        break;
      }
    }
    p.px = x; p.py = y;
  },
  finish(x, y) {
    if (this.tool === 'scoop' && this.held) {
      const v = Kitchen.vessels.find(v => x >= v.x0 - 4 && x <= v.x1 + 4 && y <= v.y1 + 2);
      Tools.drop(x, y, this.held, v ? v.x1 - v.x0 - 1 : 0); if (this.held.length) Sfx.plop();
      this.held = null;
    }
  },
  overlay() {
    const ov = {};
    if (this.held && this.ptr) { ov.held = this.held; ov.x = this.ptr.x; ov.y = this.ptr.y; }
    const at = this.ptr || this.hover;
    if (at) { const t = TOOLS.find(t => t.id === this.tool); const r = this.tool === 'pour' && this.ing.mode === 'stamp' ? 4 : t.r; ov.ring = { x: at.x, y: at.y, r }; }
    return ov;
  },
  /* ---------- service ---------- */
  startShift() {
    Save.data.seenHelp = true; Save.save();
    $('#menu').hidden = true; $('#summary').hidden = true;
    Kitchen.clearMess(); for (const b of Kitchen.burners) b.level = 0; Kitchen.tap.on = false; this.syncFixtures();
    Service.startShift(); this.renderTickets(true);
    this.toast({ kind: 'ok', title: 'Shift ' + Service.shift + ' is open', text: 'Tickets clip onto the rail. Serve from the plate, bowl or mug.' });
  },
  serve(vid) {
    Sfx.init();
    if (Service.mode !== 'shift') { this.toast({ kind: 'bad', title: 'Nobody ordered yet', text: 'Start a shift from the menu to get tickets.' }); return; }
    const r = Service.serve(vid);
    if (r.empty) { this.toast({ kind: 'bad', title: 'The ' + vid + ' is empty', text: 'Scoop some food onto it first.' }); return; }
    if (r.nobody) { this.toast({ kind: 'bad', title: 'No ticket wants a ' + vid, text: 'Check which dish goes in which: plate, bowl or mug.' }); return; }
    const rec = RECIPE_BY_ID[r.rid];
    let words = (r.notes[0] || (r.good && r.good[0]) || 'Thanks!');
    if (r.critic) words = r.stars === 3 ? 'A rave review! Double pay.' : 'Not impressed. ' + words;
    this.toast({ kind: r.stars ? 'ok' : 'bad', face: r.seed, title: `${r.name}: ${rec.name}`, text: words, stars: r.stars, pay: r.pay });
    if (r.stars) { Sfx.ding(); Sfx.coins(r.stars * 2); } else Sfx.sad();
    this.floatPay(vid, r);
    this.renderTickets(true);
  },
  renderTickets(full) {
    const box = $('#tickets');
    if (Service.mode !== 'shift') {
      if (full) box.innerHTML = `<span class="idle">${Service.mode === 'done' ? 'Shift over.' : 'Free cooking. Make a mess.'}</span>`;
      $('#coins').textContent = '$' + Math.round(Service.coins || 0); $('#shiftInfo').textContent = 'free cook';
      return;
    }
    const have = [...box.querySelectorAll('.ticket')].map(t => +t.dataset.uid), want = Service.tickets.map(t => t.uid);
    if (full || have.join() !== want.join()) {
      box.innerHTML = Service.tickets.map(t => {
        const r = RECIPE_BY_ID[t.rid];
        return `<div class="ticket ${have.includes(t.uid) ? '' : 'new'}${t.critic ? ' critic' : ''}" data-uid="${t.uid}"><img alt="" src="${Faces.url(t.seed)}"><span class="who">${t.name}${t.critic ? ' <em class="spec">critic</em>' : t.rid === specialId() ? ' <em class="spec">special</em>' : ''}</span><span class="dish">${r.name}</span><span class="ves">${r.vessel}</span><div class="pat"><b></b></div><button class="how" data-r="${t.rid}" aria-label="How to make ${r.name}">?</button></div>`;
      }).join('') || '<span class="idle">Waiting for the next order…</span>';
      box.querySelectorAll('.how').forEach(b => b.onclick = () => { Sfx.click(); this.showBook(b.dataset.r); });
    }
    box.querySelectorAll('.ticket').forEach(el => {
      const t = Service.tickets.find(x => x.uid === +el.dataset.uid); if (!t) return;
      const f = clamp(t.left / t.total, 0, 1); el.querySelector('.pat b').style.width = (f * 100).toFixed(1) + '%';
      el.classList.toggle('late', f < 0.45); el.classList.toggle('urgent', f < 0.2);
    });
    const done = Service.results.length, total = done + Service.tickets.length + Service.queue.length;
    const insp = Service.inspecting();
    $('#coins').textContent = '$' + Math.round(Service.coins); $('#shiftInfo').textContent = `shift ${Service.shift} · ${done}/${total} served` + (insp ? ` · inspector ${insp}s` : '');
    document.querySelectorAll('#hot .serve').forEach(el => { const n = Service.wants(el.dataset.v).length; el.querySelector('.go').disabled = !n; });
  },
  toast(o) {
    const box = $('#toasts'), el = document.createElement('div');
    el.className = 'toast ' + (o.kind || 'ok');
    const lead = o.face ? `<img alt="" src="${Faces.url(o.face)}">` : o.kind === 'ach' ? '<div class="badge">★</div>' : o.kind === 'tip' ? '<div class="badge" style="background:var(--good);color:#06130b">?</div>' : '<div class="badge" style="background:var(--panel2);color:var(--chalk)">!</div>';
    const stars = o.stars !== undefined ? ` <span class="stars">${'★'.repeat(o.stars)}${'☆'.repeat(3 - o.stars)}</span>${o.pay ? ` <span style="color:var(--good)">+$${o.pay}</span>` : ''}` : '';
    el.innerHTML = `${lead}<b>${o.title}${stars}</b><span>${o.text || ''}</span>`;
    box.prepend(el);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => el.remove(), o.long ? 9000 : o.kind === 'ach' ? 4200 : 3600);
  },
  /* ---------- sheets ---------- */
  renderMenu() {
    $('#mSound').textContent = 'Sound: ' + (Save.data.sound ? 'on' : 'off');
    $('#mScreen').hidden = !Main.touch;
    $('#mScreen').textContent = 'Screen: ' + ({ land: 'sideways ↻', land2: 'sideways ↺', portrait: 'upright' }[Save.data.screen || 'land']);
    $('#mShift').textContent = Service.mode === 'shift' ? 'Restart the shift' : (Save.data.shifts ? `Start shift ${Save.data.shifts + 1}` : 'Start a shift');
    $('#achs').innerHTML = ACH.map(a => `<div class="${Ach.unlocked(a.id) ? 'got' : ''}">${Ach.unlocked(a.id) ? '★ ' : ''}${a.name}<small>${a.how}</small></div>`).join('');
  },
  showMenu() { this.renderMenu(); $('#menu').hidden = false; },
  showBook(focus) {
    const spec = specialId();
    $('#recipes').innerHTML = RECIPES.map(r => { const b = Save.data.best[r.id] || 0; return `<div class="recipe${r.id === spec ? ' special' : ''}" id="rc-${r.id}"><small>${r.vessel} · $${r.price}${r.id === spec ? ' · today’s special, pays 1.5×' : ''}</small><b>${r.name}</b><p>${r.how}</p><span class="best">${b ? '★'.repeat(b) + '☆'.repeat(3 - b) : 'not served yet'}</span></div>`; }).join('');
    $('#book').hidden = false;
    if (focus) { const el = $('#rc-' + focus); if (el) { el.scrollIntoView({ block: 'center' }); el.style.boxShadow = '0 0 0 3px var(--flame)'; } }
  },
  showSummary(s) {
    const [quote, by] = Service.review(s.stars, s.max, s.incidents);
    $('#sumTitle').textContent = `Shift ${s.shift}: $${Math.round(s.coins)}`;
    $('#sumQuote').innerHTML = `${quote}<small>${by}</small>`;
    $('#sumRows').innerHTML = s.results.map(r => `<tr><td><img alt="" src="${Faces.url(r.seed)}"> ${r.name}</td><td>${RECIPE_BY_ID[r.rid].name}</td><td class="st">${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</td><td class="pay">${r.pay ? '$' + r.pay : '–'}</td></tr>`).join('');
    const inc = s.incidents, bits = [];
    if (inc.fires) bits.push(`${inc.fires} fire${inc.fires > 1 ? 's' : ''}`); if (inc.sprinklers) bits.push(`${inc.sprinklers} sprinkler soaking${inc.sprinklers > 1 ? 's' : ''}`);
    if (inc.smoke) bits.push('the smoke alarm'); if (inc.boilovers) bits.push('a boil-over');
    let extra = '';
    if (s.inspection) extra += s.inspection === 'pass' ? ' Passed the health inspection.' : ' Failed the health inspection.';
    $('#sumChaos').textContent = (bits.length ? 'Incidents: ' + bits.join(', ') + '.' : 'No incidents. The fire inspector is impressed.') + extra;
    $('#summary').hidden = false;
    Sfx.fanfare(); this.renderTickets(true);
  },
  /* ---------- frame sizing ---------- */
  fit() {
    const st = $('#stage'), cs = getComputedStyle(st);
    const w = st.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), h = st.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const sw = Math.max(100, Math.min(w, h * GW / GH)), sh = sw * GH / GW;
    const sc = $('#scene'); sc.style.width = Math.floor(sw) + 'px'; sc.style.height = Math.floor(sh) + 'px';
  },
};

/* phones held upright still get a landscape kitchen: the whole frame turns 90 degrees */
const Orient = {
  apply() {
    const root = $('#root'), vw = window.innerWidth, vh = window.innerHeight, scr = Save.data.screen || 'land';
    const rot = !!Main.touch && vh > vw && scr !== 'portrait', flip = rot && scr === 'land2';
    const ew = rot ? vh : vw, eh = rot ? vw : vh, h = document.documentElement;
    h.classList.toggle('rot', rot); h.classList.toggle('flip', flip); h.classList.toggle('short', eh < 560); h.classList.toggle('narrow', ew < 760);
    if (rot) { root.style.width = vh + 'px'; root.style.height = vw + 'px'; root.style.transform = flip ? `translateY(${vh}px) rotate(-90deg)` : `translateX(${vw}px) rotate(90deg)`; }
    else { root.style.width = ''; root.style.height = ''; root.style.transform = ''; }
    UI.fit();
  },
};
