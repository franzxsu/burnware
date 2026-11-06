/* ============================================================
   The band leader: a look-ahead clock that schedules every note a
   moment before it sounds (so timing stays tight), scene changes
   on the loop, the metronome, and recording what you play live,
   snapped to the nearest 16th.
   ============================================================ */
const App = {
  song: null, track: 0, scene: 0, bar: 0, rec: false, len: 2, surface: null, octave: 0, saveT: null,
  changed(full) { clearTimeout(this.saveT); this.saveT = setTimeout(() => Store.save(this.song), 350); UI.scenes(); if (full) UI.all(); },
  pick(i) { this.track = i; this.surface = null; UI.all(); },
  setScene(s) {
    if (Seq.playing && !this.song.chain && s !== Seq.scene) { Seq.queued = s; this.scene = s; UI.all(); toast('Scene ' + 'ABCD'[s] + ' comes in on the next loop'); return; }
    this.scene = s; if (this.bar >= this.song.bars) this.bar = 0; UI.all();
  },
};
const sceneHas = (song, s) => song.tracks.some(t => t.pats[s].some(n => n.s < song.bars * 16));
function nextScene(song, s) { for (let k = 1; k <= SCENES; k++) { const q = (s + k) % SCENES; if (sceneHas(song, q)) return q; } return s; }
const Seq = {
  playing: false, step: 0, scene: 0, nextT: 0, timer: null, heard: [], cur: null, queued: null,
  stepDur(song = App.song) { return 60 / song.bpm / 4; },
  start() {
    const E = Audio.ensure(); if (!E) { toast('This browser has no Web Audio, so Burn Studio cannot play.'); return; }
    E.mix(App.song);
    this.playing = true; this.step = 0; this.scene = App.scene; this.queued = null; this.heard = []; this.cur = null;
    this.nextT = E.ctx.currentTime + 0.08;
    clearInterval(this.timer); this.timer = setInterval(() => this.pump(), 25); this.pump();
    UI.transport();
  },
  stop() { this.playing = false; clearInterval(this.timer); this.timer = null; this.heard = []; this.cur = null; Live.allOff(); UI.head(-1); UI.transport(); },
  pump() {
    const E = Audio.eng, song = App.song; if (!E) return;
    if (this.nextT < E.ctx.currentTime - 0.25) this.nextT = E.ctx.currentTime + 0.02;   // the tab slept: catch up instead of a burst
    while (this.nextT < E.ctx.currentTime + 0.12) { this.schedule(E, song, this.scene, this.step, this.nextT); this.advance(song); }
  },
  schedule(E, song, sc, step, t) {
    const sd = this.stepDur(song), tt = t + (step % 2 === 1 ? song.swing * sd * 0.66 : 0);
    song.tracks.forEach((tr, i) => { for (const n of tr.pats[sc]) if (n.s === step) E.play(song, i, n, tt, n.l * sd * 0.96); });
    if (song.metro && step % 4 === 0) E.tick(t, step % 16 === 0);
    this.heard.push({ t: tt, step, scene: sc });
  },
  advance(song) {
    this.nextT += this.stepDur(song); this.step++;
    if (this.step >= song.bars * 16) {
      this.step = 0;
      if (this.queued !== null) { this.scene = this.queued; this.queued = null; }
      else if (song.chain) this.scene = nextScene(song, this.scene);
    }
  },
  /* the step you can hear right now */
  now() { const t = Audio.ctx.currentTime; while (this.heard.length && this.heard[0].t <= t) this.cur = this.heard.shift(); return this.cur; },
};
const Live = {
  held: new Map(),
  on(id, i, n, vel = 0.85) {
    const E = Audio.ensure(); if (!E) return; E.mix(App.song);
    const t = E.ctx.currentTime, tr = App.song.tracks[i];
    if (this.held.has(id)) this.off(id);
    let handle = null; if (tr.kind === 'drums') E.drum(i, n, t, vel, tr.preset); else handle = E.voice(i, tr.kind, tr.preset, n, t, vel, Infinity);
    const rec = Seq.playing && App.rec ? this.quant(t) : null;
    this.held.set(id, { handle, i, n, vel, t, rec });
    if (rec && tr.kind === 'drums') this.write(i, rec, n, 1, vel);
  },
  off(id) {
    const hd = this.held.get(id); if (!hd) return; this.held.delete(id);
    const t = Audio.ctx.currentTime; if (hd.handle) hd.handle.stop(t);
    if (hd.rec && App.song.tracks[hd.i].kind !== 'drums') this.write(hd.i, hd.rec, hd.n, Math.max(1, Math.round((t - hd.t) / Seq.stepDur())), hd.vel);
  },
  quant(t) {
    const cur = Seq.cur || Seq.heard[0]; if (!cur) return null;
    const L = App.song.bars * 16; let s = Math.round(cur.step + (t - cur.t) / Seq.stepDur()); s = ((s % L) + L) % L;
    return { s, scene: cur.scene };
  },
  write(i, rec, n, len, vel) {
    const pat = App.song.tracks[i].pats[rec.scene], k = pat.findIndex(x => x.s === rec.s && x.n === n); if (k >= 0) pat.splice(k, 1);
    pat.push(N(rec.s, n, Math.min(len, 32), vel)); App.changed(); if (rec.scene === App.scene && i === App.track) UI.grid();
  },
  allOff() { for (const id of [...this.held.keys()]) this.off(id); },
};
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); }
