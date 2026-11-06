/* ============================================================
   Service: shifts of order tickets, paying customers, and the
   chaos achievements. Saves are per browser and optional.
   ============================================================ */
const Save = {
  key: 'sizzle-sand-v1',
  data: { sound: true, best: {}, ach: {}, shifts: 0, bestShift: 0, coinsAll: 0, seenHelp: false },
  load() { try { const s = localStorage.getItem(this.key); if (s) Object.assign(this.data, JSON.parse(s)); } catch (e) { /* storage blocked: play without saves */ } },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* ignore */ } },
};

/* ---------- customers: a name and a little pixel face ---------- */
const NAMES = ['Lola Nena', 'Kenji', 'Ms. Okafor', 'Coach Ramos', 'Ate Joy', 'Mr. Lindqvist', 'Dani', 'Grandpa Ruiz', 'Priya', 'Tito Boy', 'Mika', 'Dr. Haddad',
  'Sam', 'Yuki', 'Bea', 'Mang Tonyo', 'Aiko', 'Mrs. Park', 'Jun', 'Ollie', 'Nonna Rita', 'Chef Marco', 'Kai', 'Tala'];
const Faces = {
  cache: {},
  url(seed) {
    if (this.cache[seed]) return this.cache[seed];
    const critic = seed === 4242;
    if (typeof document === 'undefined') return '';
    const R = mulberry(seed * 977 + 13), c = document.createElement('canvas'); c.width = c.height = 16;
    const x = c.getContext('2d');
    const skins = ['#f3cfb3', '#e0ac7e', '#c68a5a', '#8d5a3b', '#5c3a26', '#f6d9c4'], hairs = ['#2b1d16', '#4a3020', '#c99a52', '#ddd6cf', '#8a3b22', '#151515', '#6b4a8a'];
    const shirt = ['#e8553d', '#3f7fd8', '#3caa72', '#f2b93b', '#9a5bd6', '#e07aa0'][Math.floor(R() * 6)];
    const sk = skins[Math.floor(R() * skins.length)], hr = hairs[Math.floor(R() * hairs.length)];
    const px = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    px(2, 13, 12, 3, shirt);
    px(4, 3, 8, 10, sk); px(3, 5, 1, 5, sk); px(12, 5, 1, 5, sk);
    const style = Math.floor(R() * 4);
    px(4, 2, 8, 2, hr); px(3, 3, 1, style === 1 ? 8 : 3, hr); px(12, 3, 1, style === 1 ? 8 : 3, hr);
    if (style === 2) { px(5, 1, 6, 1, hr); }
    if (style === 3) { px(4, 2, 8, 1, '#ddd6cf'); }
    px(5, 7, 2, 1, '#1b1b1b'); px(9, 7, 2, 1, '#1b1b1b');
    if (R() < 0.3 || critic) { px(4, 6, 4, 3, 'rgba(20,20,20,.55)'); px(8, 6, 4, 3, 'rgba(20,20,20,.55)'); px(8, 7, 1, 1, '#1b1b1b'); }
    if (critic) { px(3, 1, 10, 2, '#1d1d24'); px(11, 0, 2, 1, '#1d1d24'); px(2, 13, 12, 3, '#262630'); }   // beret, black turtleneck
    px(7, 10, 2, 1, '#9a4a3a');
    return (this.cache[seed] = c.toDataURL());
  },
};

/* ---------- achievements: mostly for making a mess ---------- */
const ACH = [
  { id: 'grease', name: 'Grease fire', how: 'Leave oil on high until it catches.' },
  { id: 'smoke', name: 'Smoke signals', how: 'Set off the smoke alarm.' },
  { id: 'sprinkler', name: 'Fire drill', how: 'Keep the alarm going until the sprinklers open.' },
  { id: 'boilover', name: 'Boil-over', how: 'Let milk foam spill over the pot.' },
  { id: 'geyser', name: 'Cola geyser', how: 'Drop mints into cola and hit the ceiling.' },
  { id: 'dust', name: 'Flour power', how: 'Light a cloud of flour.' },
  { id: 'flare', name: 'Never add water', how: 'Pour water on burning oil.' },
  { id: 'smother', name: 'Lid on it', how: 'Put out a grease fire with a lid.' },
  { id: 'lidpop', name: 'Pressure cooker', how: 'Leave a lid on a boiling pot until it blows.' },
  { id: 'tutong', name: 'Tutong', how: 'Scorch a crust of rice onto the pot.' },
  { id: 'storm', name: 'Popcorn storm', how: 'Have 300 pieces of popcorn in the kitchen.' },
  { id: 'charcoal', name: 'Charcoal special', how: 'Serve something that is mostly burnt.' },
  { id: 'chef', name: 'Chef’s kiss', how: 'Serve a three-star dish.' },
  { id: 'perfect', name: 'Flawless shift', how: 'Three stars on every order in a shift.' },
  { id: 'eggs', name: 'Eggs three ways', how: 'Serve a sunny-side egg, scrambled eggs and an omelette.' },
  { id: 'rush', name: 'Short-order cook', how: 'Serve five different dishes in one shift.' },
  { id: 'cat', name: 'Kitchen cat', how: 'Pet the cat that naps on the range hood.' },
  { id: 'critic', name: 'Critic’s choice', how: 'Serve the food critic a three-star dish.' },
  { id: 'inspector', name: 'Clean bill', how: 'Pass a surprise health inspection.' },
  { id: 'menu', name: 'Full menu', how: 'Three stars on every dish in the book.' },
];
const Ach = {
  unlocked(id) { return !!Save.data.ach[id]; },
  give(id) {
    if (Save.data.ach[id]) return;
    Save.data.ach[id] = Date.now(); Save.save();
    const a = ACH.find(x => x.id === id);
    if (a && UI.toast) { UI.toast({ kind: 'ach', title: a.name, text: a.how }); Sfx.fanfare(); }
  },
  /* look at what the kitchen did this frame */
  check(ev, counts) {
    if (ev.grease) this.give('grease');
    if (Kitchen.alarm.beeping) this.give('smoke');
    if (Kitchen.alarm.trips > 0) this.give('sprinkler');
    if (ev.colaTop < 12) this.give('geyser');
    if (ev.dust > 4) this.give('dust');
    if (ev.flare) this.give('flare');
    if (ev.tutong) this.give('tutong');
    if (ev.smother) this.give('smother');
    if (ev.lidpop) this.give('lidpop');
    if (counts[POPCORN] >= 300) this.give('storm');
    if (ev.boilover && (Kitchen.steps % 30) === 0) {
      for (let y = 66; y < 111; y++) for (const x of [12, 16, 20, 70, 74, 78]) { const t = type[idx(x, y)]; if (t === MILKFOAM || t === MILK || t === COCOA) { this.spill = true; this.give('boilover'); return; } }
    }
  },
};

/* ---------- shifts ---------- */
/* first-shift coaching for the two opening orders */
const TIPS = {
  cola: 'Pick Cola on the shelf and drag over the mug to pour. Add an Ice cube, then press Serve under the mug.',
  egg: 'Pour a little Oil into the pan and tap the pan knob for MED. Place an Egg in the pan. When the white sets, Scoop it onto the plate.',
};
const Service = {
  mode: 'free', shift: 0, coins: 0, tickets: [], queue: [], results: [], spawnT: 0, uid: 0, time: 0,
  startShift() {
    this.mode = 'shift'; this.shift = (Save.data.shifts || 0) + 1;
    const n = Math.min(10, 5 + this.shift);
    const easy = ['rice', 'egg', 'popcorn', 'cocoa', 'caramel', 'cola', 'scrambled'], all = RECIPES.map(r => r.id);
    const pool = this.shift === 1 ? easy : all, spec = specialId();
    this.queue = []; let last = '';
    for (let k = 0; k < n; k++) {
      let id; do { id = pool[Math.floor(Math.random() * pool.length)]; } while (id === last && pool.length > 1);
      if (pool.includes(spec) && spec !== last && Math.random() < 0.2) id = spec;   // the special sells well
      this.queue.push(id); last = id;
    }
    if (this.shift === 1) this.queue.splice(0, 2, 'cola', 'egg');   // the first ever orders are gentle ones
    this.tickets = []; this.results = []; this.coins = 0; this.spawnT = 0; this.time = 0; this.tipped = {};
    // from the second shift on: maybe a food critic among the orders, and one surprise
    this.spawned = 0; this.criticAt = this.shift >= 2 && Math.random() < 0.6 ? 2 + Math.floor(Math.random() * (n - 2)) : -1;
    this.criticResult = null; this.inspection = null; this.busRush = 0;
    this.event = this.shift >= 2 ? { kind: Math.random() < 0.5 ? 'bus' : 'inspector', at: 45 + Math.random() * 60, state: 'wait' } : null;
    this.incidents = { fires: 0, sprinklers: 0, smoke: 0, boilovers: 0 };
    this.patience = Math.max(150, 260 - this.shift * 15);
    this.spawn(); this.spawn();
  },
  stop() { this.mode = 'free'; this.tickets = []; this.queue = []; },
  spawn() {
    if (!this.queue.length || this.tickets.length >= 3) return;
    const critic = this.spawned++ === this.criticAt, id = this.queue.shift(), seed = critic ? 4242 : 1 + Math.floor(Math.random() * 9999);
    const pat = critic ? Math.round(this.patience * 0.8) : this.patience;
    this.tickets.push({ uid: ++this.uid, rid: id, name: critic ? 'The Critic' : NAMES[seed % NAMES.length], seed, left: pat, total: pat, critic });
    if (critic && typeof UI !== 'undefined') { UI.toast({ kind: 'tip', face: seed, title: 'A food critic just sat down', text: 'Three stars pays double. Anything less pays nothing.' }); Sfx.ding(); }
    this.spawnT = this.busRush > 0 ? (this.busRush--, 5 + Math.random() * 5) : 30 + Math.random() * 25;
  },
  tick(dt) {
    if (this.mode !== 'shift') return;
    this.time += dt;
    const first = this.tickets[0];   // in the first shift, coach the order at the front of the rail
    if (this.shift === 1 && first && TIPS[first.rid] && !this.tipped[first.rid] && this.time > 1.2) { this.tipped[first.rid] = 1; UI.toast({ kind: 'tip', title: 'How to: ' + RECIPE_BY_ID[first.rid].name.toLowerCase(), text: TIPS[first.rid], long: true }); }
    this.surprise();
    for (const t of this.tickets) t.left -= dt;
    const gone = this.tickets.filter(t => t.left <= 0);
    for (const t of gone) { this.results.push({ rid: t.rid, stars: 0, pay: 0, name: t.name, seed: t.seed, notes: ['Gave up waiting.'], left: true }); UI.toast({ kind: 'bad', face: t.seed, title: t.name + ' left', text: 'Waited too long for ' + RECIPE_BY_ID[t.rid].name.toLowerCase() + '.' }); Sfx.sad(); }
    this.tickets = this.tickets.filter(t => t.left > 0);
    this.spawnT -= dt;
    if (this.spawnT <= 0 || this.tickets.length === 0) this.spawn();
    if (!this.tickets.length && !this.queue.length) this.finish();
  },
  /* the one surprise of a shift: a tour bus (three quick extra orders) or a health inspector */
  surprise() {
    const ev = this.event; if (!ev || ev.state === 'done') return;
    if (ev.state === 'wait' && this.time >= ev.at && this.queue.length + this.tickets.length > 0) {
      ev.state = 'on'; Sfx.ding();
      if (ev.kind === 'bus') {
        const extra = ['cola', 'popcorn', 'egg', 'rice', 'cocoa', 'scrambled'].sort(() => Math.random() - 0.5).slice(0, 3);
        this.queue.unshift(...extra); this.spawnT = Math.min(this.spawnT, 3); this.busRush = 3; ev.state = 'done';
        UI.toast({ kind: 'tip', title: 'A tour bus just pulled up', text: 'Three extra orders, coming in fast.' });
      } else {
        ev.until = this.time + 30;
        UI.toast({ kind: 'tip', title: 'Health inspector!', text: 'No fire and no smoke alarm for the next 30 seconds.' });
      }
      return;
    }
    if (ev.state === 'on' && ev.kind === 'inspector') {
      if (Sim.ev.fire > 20 || Kitchen.alarm.beeping) { ev.state = 'done'; this.coins -= 6; this.inspection = 'fail'; UI.toast({ kind: 'bad', title: 'The inspector saw that', text: 'Fined $6 for fire safety.' }); Sfx.sad(); }
      else if (this.time >= ev.until) { ev.state = 'done'; this.coins += 6; this.inspection = 'pass'; UI.toast({ kind: 'ok', title: 'Inspection passed', text: 'Spotless. +$6' }); Sfx.coins(4); Ach.give('inspector'); }
    }
  },
  inspecting() { const ev = this.event; return ev && ev.kind === 'inspector' && ev.state === 'on' ? Math.max(0, Math.ceil(ev.until - this.time)) : 0; },
  wants(vid) { return this.tickets.filter(t => RECIPE_BY_ID[t.rid].vessel === vid); },
  /* serve whatever is in a vessel to the ticket it suits best */
  serve(vid) {
    const v = Kitchen.vessels.find(x => x.id === vid), c = Kitchen.contents(v);
    if (c.n < 5) return { empty: true };
    const cands = this.wants(vid);
    if (!cands.length) return { nobody: true };
    let best = null;
    for (const t of cands) { const r = judge(t.rid, c); if (!best || r.stars > best.r.stars || (r.stars === best.r.stars && t.left < best.t.left)) best = { t, r }; }
    const { t, r } = best, rec = RECIPE_BY_ID[t.rid];
    const speedTip = r.stars > 0 && t.left > t.total * 0.5 ? 2 : 0, special = t.rid === specialId() ? 1.5 : 1;
    let pay = r.stars ? Math.round(rec.price * special * (0.4 + 0.2 * r.stars) * 10) / 10 + r.bonus + speedTip : 0;
    if (t.critic) { pay = r.stars === 3 ? Math.round(rec.price * special * 2 * 10) / 10 + r.bonus + speedTip : 0; this.criticResult = r.stars; if (r.stars === 3) Ach.give('critic'); }
    this.coins += pay; Save.data.coinsAll = (Save.data.coinsAll || 0) + pay;
    this.tickets = this.tickets.filter(x => x !== t);
    const res = { rid: t.rid, stars: r.stars, pay, name: t.name, seed: t.seed, notes: r.notes, good: r.good, speedTip, critic: !!t.critic };
    this.results.push(res);
    const prev = Save.data.best[t.rid] || 0; if (r.stars > prev) Save.data.best[t.rid] = r.stars;
    if (r.stars === 3) Ach.give('chef');
    if (['egg', 'scrambled', 'omelette'].every(x => (Save.data.best[x] || 0) >= 1)) Ach.give('eggs');
    if (new Set(this.results.filter(x => x.stars > 0).map(x => x.rid)).size >= 5) Ach.give('rush');
    if (r.notes[0] === 'This is charcoal.') Ach.give('charcoal');
    if (RECIPES.every(x => (Save.data.best[x.id] || 0) >= 3)) Ach.give('menu');
    Save.save();
    Kitchen.emptyVessel(v);
    if (!this.tickets.length) this.spawn();
    return res;
  },
  finish() {
    if (this.mode !== 'shift') return;
    this.mode = 'done';
    const stars = this.results.reduce((s, r) => s + r.stars, 0), max = this.results.length * 3;
    if (this.results.length && this.results.every(r => r.stars === 3)) Ach.give('perfect');
    Save.data.shifts = this.shift; Save.data.bestShift = Math.max(Save.data.bestShift || 0, this.coins); Save.save();
    UI.showSummary({ shift: this.shift, coins: this.coins, stars, max, results: this.results, incidents: this.incidents, critic: this.criticResult, inspection: this.inspection });
  },
  review(stars, max, inc) {
    const f = max ? stars / max : 0;
    if (this.criticResult === 3) return ['“A revelation in falling sand. Book a table now.”', 'The Critic'];
    if (this.criticResult !== null && this.criticResult !== undefined) return ['“Overrated. I have had better from a vending machine.”', 'The Critic'];
    const chaos = inc.fires + inc.sprinklers * 2 + inc.boilovers;
    if (f > 0.9 && !chaos) return ['“Immaculate. I cried into my rice.”', 'The Pixel Gazette'];
    if (f > 0.9) return ['“Perfect food. The fire was a bit much.”', 'Grain & Flame Weekly'];
    if (inc.sprinklers) return ['“Got soaked by the sprinklers. Food was ' + (f > 0.5 ? 'worth it' : 'not worth it') + '.”', 'A damp diner'];
    if (f > 0.6) return ['“Solid cooking, friendly chaos.”', 'Neighbourhood Eats'];
    if (f > 0.3) return ['“Some of it was food.”', 'Honest Reviews Monthly'];
    return ['“I have seen better kitchens on fire. Actually, this one was.”', 'Inspector Ruiz'];
  },
};
