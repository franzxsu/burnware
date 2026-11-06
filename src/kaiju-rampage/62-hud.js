/* ============================================================
   The broadcast: bars, the clock, the damage counter, combo
   pops, big toasts, floating dollar amounts, the BREAKING ticker
   along the bottom, and the title, pause and results screens.
   ============================================================ */
const LINES = {
  first: ['FIRST BUILDING FALLS AS GECKO REACHES DOWNTOWN'],
  tower: ['ANOTHER TOWER DOWN · ARCHITECTS "TAKING IT PERSONALLY"', 'SKYSCRAPER FALLS · WINDOW CLEANERS FINALLY GET A DAY OFF', 'OFFICE BLOCK COLLAPSES · MONDAY MEETING CANCELLED'],
  'Ember Tower': ['EMBER TOWER TOPPLED · POSTCARD INDUSTRY IN SHOCK'],
  'Ember Dome': ["EMBER DOME FLATTENED · TONIGHT'S GAME POSTPONED"],
  bridge: ['BRIDGE DOWN · COMMUTERS ADVISED TO SWIM'],
  'gantry crane': ['DOCK CRANE GOES INTO THE HARBOUR'],
  fuel: ['FUEL DEPOT GOES UP IN A FIREBALL · "WE ASKED IT NOT TO," SAYS MANAGER', 'ANOTHER FUEL TANK GOES UP · FIRE BRIGADE "WATCHING FROM A DISTANCE"'],
  police: ['POLICE RESPOND · GECKO UNIMPRESSED'],
  'The army': ['ARMY DEPLOYED · TANKS ROLL INTO THE CITY'],
  'Air support': ['ATTACK HELICOPTERS SCRAMBLED OVER THE CITY'],
  'Air force': ['FIGHTER JETS INBOUND · AIR FORCE "QUIETLY CONFIDENT"'],
  'Final stand': ['GENERAL: "WE HAVE TRIED EVERYTHING EXCEPT ASKING NICELY"'],
  tankDown: ['TANK FLIPPED · CREW SAFE, "A BIT DIZZY"', 'ARMY "REASSESSING STRATEGY"', 'TANK BATTALION REPORTS "MIXED RESULTS"'],
  heliDown: ['HELICOPTER DOWN · PILOT PARACHUTES TO SAFETY, FILES COMPLAINT', 'CHOPPER SPINS OUT · PILOT FLOATS DOWN, WAVES'],
  jetDown: ['JET DOWN · PILOT EJECTS, "FINE, JUST EMBARRASSED"'],
  b1: ['DAMAGE PASSES ONE BILLION DOLLARS'], b3: ['DAMAGE TOPS THREE BILLION · INSURERS ISSUE JOINT SIGH'], b6: ['SIX BILLION AND COUNTING'], b10: ['TEN BILLION · EXPERTS RUN OUT OF ADJECTIVES'],
};
const FILLER = ['LOCAL EXPERT: "IT IS PROBABLY JUST HUNGRY"', 'MOSQUITO POPULATION REPORTED NERVOUS', 'SUBWAY RIDERSHIP AT AN ALL-TIME HIGH', 'WEATHER: CLEAR, WITH A CHANCE OF FALLING DEBRIS', 'GECKO EXPERT: "THAT IS A TOKAY. THEY BITE."', 'STOCKS IN BRICKS SOAR', 'TRAFFIC REPORT: YES', 'CITY COUNCIL CALLS EMERGENCY MEETING, THEN CANCELS IT', 'OFFICIALS: NOBODY HURT · EVERYONE MADE IT TO THE SUBWAY', 'PIZZA DELIVERIES SUSPENDED DOWNTOWN', 'GECKO SEEN LICKING OWN EYEBALL · SCIENTISTS "NOT SURPRISED"'];
const Ticker = {
  queue: [], x: 0, w: 0, el: null, last: {},
  say(text) { this.queue.unshift(text); if (this.el && this.x > 0) this.next(); },
  event(key) { const L = LINES[key]; if (!L) return; const now = performance.now(); if (now - (this.last[key] || -1e9) < 20000) return; this.last[key] = now; this.queue.push(pick(L)); },
  next() { this.el.textContent = this.queue.length ? this.queue.shift() : pick(FILLER); this.w = this.el.offsetWidth; this.x = this.el.parentElement.clientWidth + 10; },
  update(dt) {
    if (!this.el) { this.el = $('#ticker'); if (!this.el) return; this.next(); }
    this.x -= dt * (calm() ? 60 : 95); if (this.x < -this.w - 20) this.next();
    this.el.style.transform = `translate(${this.x.toFixed(1)}px, -50%)`;
  },
};
const News = { event: (k) => Ticker.event(k) };
const HUD = {
  floats: [], v: new THREE.Vector3(), shownMult: 1,
  init() {
    $('#keys').innerHTML = Input.touch
      ? '<div><b>Left thumb</b> walk</div><div><b>Drag right side</b> look</div><div><b>STOMP</b> shockwave</div><div><b>TAIL</b> spin attack</div><div><b>ROAR</b> scare the choppers</div><div><b>Hold BEAM</b> drill where you aim</div>'
      : '<div><b>WASD</b> walk</div><div><b>Drag</b> look · <b>wheel</b> zoom</div><div><b>Space</b> stomp</div><div><b>E</b> tail spin</div><div><b>R</b> roar</div><div><b>Hold F</b> or right mouse: beam</div><div><b>P</b> pause</div>';
    this.best();
    $('#go').onclick = () => Game.start(); $('#again').onclick = () => { HUD.screen(null); Game.start(); };
    $('#bMute').onclick = () => { const on = !Audio2.on; Audio2.setOn(on); Save.data.sound = on; Save.save(); $('#bMute').textContent = on ? 'Sound on' : 'Sound off'; };
    $('#bPause').onclick = () => this.pause(!Game.paused);
    $('#bMute').textContent = Save.data.sound ? 'Sound on' : 'Sound off'; Audio2.setOn(Save.data.sound);
    addEventListener('keydown', (e) => { if ((e.code === 'KeyP' || e.code === 'Escape') && (Game.state === 'play' || Game.paused)) this.pause(!Game.paused); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && Game.state === 'play') this.pause(true); });
    this.hurtEl = document.createElement('div'); this.hurtEl.id = 'hurt'; document.body.append(this.hurtEl);
  },
  best() { $('#best').textContent = Save.data.best ? `Best rampage: ${money(Save.data.best)} · ${Save.data.bestRank}` : ''; },
  show(on) { for (const id of ['#tl', '#tc', '#tr', '#news', '#topbtns']) $(id).hidden = !on; $('#cross').classList.toggle('on', on); },
  screen(name) { for (const id of ['title', 'results']) $('#' + id).hidden = id !== name; if (name === 'title') this.best(); },
  toast(big, small) { const t = $('#toast'); t.innerHTML = ''; t.append(big); if (small) { const s = document.createElement('small'); s.textContent = small; t.append(s); } t.classList.remove('show'); void t.offsetWidth; t.classList.add('show'); },
  combo(m) { const c = $('#combo'); c.textContent = 'x' + m + ' COMBO'; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); },
  wave(w) { $('#wave').textContent = w; },
  hurt(n) { this.hurtEl.style.opacity = Math.min(0.85, 0.25 + n * 0.12); clearTimeout(this.hurtT); this.hurtT = setTimeout(() => { this.hurtEl.style.opacity = 0; }, 160); },
  float(text, x, y, z, big) {
    this.v.set(x, y, z).project(World.camera); if (this.v.z > 1) return;
    const el = document.createElement('div'); el.className = 'fl' + (big ? ' xl' : ''); el.textContent = text;
    el.style.left = ((this.v.x + 1) / 2 * innerWidth).toFixed(0) + 'px'; el.style.top = ((1 - this.v.y) / 2 * innerHeight).toFixed(0) + 'px';
    document.body.append(el); el.animate([{ transform: 'translate(-50%,-50%) scale(.7)', opacity: 0 }, { transform: 'translate(-50%,-90%) scale(1)', opacity: 1, offset: 0.15 }, { transform: 'translate(-50%,-260%) scale(1)', opacity: 0 }], { duration: big ? 1800 : 1200, easing: 'ease-out' }).onfinish = () => el.remove();
  },
  update(dt) {
    if (Game.state === 'play' || Game.state === 'intro' || Game.state === 'results') {
      const K = Kaiju, hp = Math.ceil(K.hp), en = Math.floor(K.energy);
      $('#hpbar i').style.width = `calc(${K.hp}% - 4px)`; $('#hpnum').textContent = hp;
      $('#enbar i').style.width = `calc(${K.energy}% - 4px)`; $('#ennum').textContent = en;
      const s = Math.ceil(Game.left), tm = $('#timer'); tm.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); tm.classList.toggle('low', s <= 20 && Game.state === 'play');
      $('#dmg').textContent = money(Game.score);
      if (Game.mult === 1 && this.shownMult !== 1) $('#combo').textContent = ''; this.shownMult = Game.mult;
    }
    if (Game.state !== 'title') Ticker.update(dt);
  },
  pause(on) {
    if (Game.state !== 'play' && !Game.paused) return;
    Game.paused = on; Audio2.music(!on && Game.state === 'play'); if (on) { Audio2.beam(false); Audio2.heli(0); Audio2.siren(0); }
    let p = $('#pausebox');
    if (on && !p) {
      p = document.createElement('section'); p.id = 'pausebox'; p.className = 'screen';
      p.innerHTML = '<div class="card"><h1 class="title" style="font-size:clamp(40px,9vw,80px)">PAUSED</h1><button class="big" id="resume">KEEP STOMPING</button><button class="sbtn" id="quit">Quit to the title</button></div>';
      document.body.append(p); $('#resume').onclick = () => this.pause(false); $('#quit').onclick = () => { this.pause(false); Game.over('quit'); };
    }
    if (!on && p) p.remove();
    $('#bPause').textContent = on ? 'Resume' : 'Pause';
  },
  results(why, best) {
    const S = Game.stats, rank = rankOf(Game.score);
    $('#resWhy').textContent = { time: "Time's up. The army is out of ideas.", down: 'Tuko got tired and waded back out to sea.', quit: 'Tuko went home early.' }[why] || 'Rampage report';
    $('#rank').textContent = rank;
    const rows = [['Damage', money(Game.score)], ['Buildings flattened', S.buildings], ['Blocks smashed', S.voxels.toLocaleString()], ['Cars crushed', S.car + S.police], ['Tanks flipped', S.tank], ['Helicopters downed', S.heli], ['Jets downed', S.jet], ['Biggest combo', 'x' + S.bestMult], ['Landmarks', S.landmarks.length ? [...new Set(S.landmarks)].join(', ') : 'none (yet)'], ['People who made it to the subway', 'all of them']];
    $('#report').innerHTML = ''; for (const [a, b] of rows) { const d = document.createElement('div'); d.innerHTML = '<span></span><span></span>'; d.children[0].textContent = a; d.children[1].textContent = b; $('#report').append(d); }
    $('#resBest').textContent = best ? 'New best rampage!' : `Best: ${money(Save.data.best)} · ${Save.data.bestRank}`;
    this.show(false); this.screen('results');
  },
};
