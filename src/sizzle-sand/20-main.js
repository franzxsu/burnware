/* ============================================================
   Main loop: a fixed 60 simulation steps per second (times the
   speed setting), one render per frame, sound and achievements
   driven by what the steps reported.
   ============================================================ */
const Main = {
  touch: false, last: 0, acc: 0, t: 0, uiT: 0, prevTrips: 0,
  init(data) {
    Save.load();
    this.touch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
    this.calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    Kitchen.build();
    Render.init($('#cBg'), $('#cFx'), $('#cGlow'), $('#cHaze'));
    UI.init();
    Sfx.setOn(Save.data.sound !== false);
    Orient.apply();
    window.addEventListener('resize', () => Orient.apply());
    window.addEventListener('orientationchange', () => setTimeout(() => Orient.apply(), 150));
    let restored = false;
    try { restored = this.restore(data); } catch (e) { restored = false; }
    if (!restored) { Kitchen.build(); this.opening(); }
    try { window.claude?.hot?.snapshot?.(() => this.snapshot()); } catch (e) { /* no live updates here */ }
    $('#veil').hidden = true;
    if (!Save.data.seenHelp && !restored) UI.showMenu();
    requestAnimationFrame((t) => { this.last = t; requestAnimationFrame((n) => this.frame(n)); });
  },
  /* when a new version of the page loads in place, the kitchen comes along: every cell, the
     knobs and lids, and the shift in progress. Elements are matched by name, so a version that
     adds new ones still restores. */
  snapshot() {
    const b64 = (u8) => { let s = ''; for (let k = 0; k < u8.length; k += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(k, k + 0x8000)); return btoa(s); };
    const bytes = (ta) => new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength);
    const svc = Service, keep = ['mode', 'shift', 'coins', 'tickets', 'queue', 'results', 'spawnT', 'uid', 'time', 'patience', 'incidents', 'tipped'];
    return {
      sizzle: 1, keys: E.map(d => d.key),
      type: b64(type), temp: b64(bytes(temp)), cook: b64(bytes(cook)), aux: b64(aux), shade: b64(shade),
      burners: Kitchen.burners.map(b => [b.level, b.cur]), lids: Kitchen.lids.map(L => L.on), tap: Kitchen.tap.on, hood: Kitchen.hood.on,
      service: Object.fromEntries(keep.map(k => [k, svc[k]])), speed: UI.speed, tool: UI.tool, ing: UI.ing.key,
    };
  },
  restore(d) {
    if (!d || d.sizzle !== 1 || !d.type) return false;
    const un = (s) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k); return u; };
    const t = un(d.type), T = new Float32Array(un(d.temp).buffer), C = new Float32Array(un(d.cook).buffer), A = un(d.aux), H = un(d.shade);
    if (t.length !== GN || T.length !== GN) return false;
    const map = d.keys.map(k => EL[k] === undefined ? AIR : EL[k]);
    Kitchen.build();   // fixtures and their colours; then lay the saved cells over them
    for (let i = 0; i < GN; i++) {
      const id = map[t[i]] || AIR;
      if (CATA[type[i]] === STATIC && type[i] !== AIR) { temp[i] = T[i]; continue; }   // fixed parts stay as built
      if (CATA[id] === STATIC && id !== STEEL && id !== BRICK) continue;
      type[i] = id; temp[i] = T[i]; cook[i] = C[i]; aux[i] = A[i]; shade[i] = H[i]; vel[i] = 0;
    }
    d.burners.forEach(([lv, cur], k) => { if (Kitchen.burners[k]) { Kitchen.burners[k].level = lv; Kitchen.burners[k].cur = cur; } });
    (d.lids || []).forEach((on, k) => { const L = Kitchen.lids[k]; if (!L) return; if (on) { L.on = true; L.cells = Kitchen.lidCells(L); for (const i of L.cells) type[i] = STEEL; Kitchen.paintLid(L); } });
    for (let i = 0; i < GN; i++) if ((type[i] === STEEL || type[i] === BRICK) && !SC[i]) { const c = E[type[i]].col, v = (shade[i] / 255 - 0.5) * 20; SC[i] = rgba32(clamp(c[0] + v, 0, 255), clamp(c[1] + v, 0, 255), clamp(c[2] + v, 0, 255), 255); }
    Kitchen.tap.on = !!d.tap; Kitchen.hood.on = !!d.hood;
    if (d.service) Object.assign(Service, d.service);
    Service.tickets = (Service.tickets || []).filter(x => RECIPE_BY_ID[x.rid]); Service.queue = (Service.queue || []).filter(id => RECIPE_BY_ID[id]);
    UI.speed = d.speed || 1; $('#bSpeed').textContent = UI.speed + '×';
    const g = Tools.INGREDIENTS.find(x => x.key === d.ing); if (g) UI.setIng(g); if (d.tool) UI.setTool(d.tool);
    UI.syncFixtures(); UI.renderTickets(true);
    return true;
  },
  /* something already going when the page opens: rice ticking over on a low flame */
  opening() {
    const p = Kitchen.pot;
    let r = 0, w = 0;
    for (let y = p.y1; y >= p.y1 - 26 && (r < 150 || w < 300); y--) for (let x = p.x0; x <= p.x1; x++) {
      const i = idx(x, y); if (type[i] !== AIR) continue;
      if (r < 150) { setCell(i, RICE); r++; } else if (w < 300) { setCell(i, WATER, 60); w++; }
    }
    Kitchen.setBurner(0, 1); UI.syncFixtures();
    for (let k = 0; k < 240; k++) Sim.step();
  },
  shake: 0, shookTrips: 0,
  kick(a) { this.shake = Math.max(this.shake, a); },
  applyShake() {
    const sc = $('#scene');
    if (this.shake > 0.3 && !this.calm) { sc.style.transform = `translate(${((Math.random() * 2 - 1) * this.shake).toFixed(1)}px, ${((Math.random() * 2 - 1) * this.shake).toFixed(1)}px)`; this.shake *= 0.86; }
    else if (this.shake) { this.shake = 0; sc.style.transform = ''; }
  },
  frame(now) {
    requestAnimationFrame((n) => this.frame(n));
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000)); this.last = now;
    this.t += dt;
    Sim.resetEv();
    if (!UI.paused) {
      UI.apply();
      this.acc += dt * STEPS_PER_SEC * UI.speed;
      let n = 0;
      while (this.acc >= 1 && n < 9) { Sim.step(); this.acc -= 1; n++; }
      if (n === 9) this.acc = 0;
      Service.tick(dt * UI.speed);
      if (Service.mode === 'shift') {
        const inc = Service.incidents;
        if (Sim.ev.grease) inc.fires++;
        if (Kitchen.alarm.trips > this.prevTrips) inc.sprinklers++;
        if (Kitchen.alarm.beeping) inc.smoke = 1;
        if (Ach.spill) inc.boilovers++;
      }
      this.prevTrips = Kitchen.alarm.trips;
    }
    // big moments shake the kitchen a little
    const ev = Sim.ev;
    if (ev.flare) this.kick(6); if (ev.grease) this.kick(5); if (ev.dust > 4) this.kick(5); if (ev.lidpop) this.kick(7); if (ev.rattle) this.kick(1.2); if (ev.spit > 3) this.kick(1.5);
    if (ev.geyser > 25) this.kick(3); if (Kitchen.alarm.trips > this.shookTrips) { this.shookTrips = Kitchen.alarm.trips; this.kick(4); }
    this.applyShake();
    Cat.update(dt, ev); $('#hCat').hidden = Cat.state === 'gone';
    Render.frame(this.t, UI.overlay());
    Sfx.update(Sim.ev, dt);
    Ach.spill = false;
    Ach.check(Sim.ev, Render.counts);
    this.skyT = (this.skyT || 0) + dt;
    if (this.skyT > 30) { this.skyT = 0; if (skyPeriod() !== Render.period) Render.paintBackground(); }
    this.uiT += dt;
    if (this.uiT > 0.25) {
      this.uiT = 0;
      UI.renderTickets(false);
      UI.updateLcd();
      if (Kitchen.lids.some((L, k) => L.on !== (UI.lidShown || [])[k])) { UI.lidShown = Kitchen.lids.map(L => L.on); UI.syncFixtures(); }
      $('#hAlarm').hidden = !Kitchen.alarm.beeping;
      $('#hAlarm').textContent = Kitchen.alarm.sprinkler > 0 ? 'SPRINKLERS!' : 'SMOKE!';
    }
  },
};
function boot(data) {
  try { Main.init(data || window.claude?.hot?.data); }
  catch (e) { const v = $('#veil'); if (v) { v.hidden = false; v.textContent = 'The kitchen would not start: ' + e.message; } throw e; }
}
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
