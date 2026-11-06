/* ============================================================
   Sound: everything is synthesized with Web Audio
   ============================================================ */
const AU = (() => {
  let ctx = null, master, sfxBus, musBus, noiseBuf;
  let sfxOn = true, musicOn = true, owned = false, playing = false, timer = null, nextT = 0, step = 0;
  let wobble = 0, mode = 'shop';
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const R = Math.random;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = .003; comp.release.value = .2;
    master = ctx.createGain(); master.gain.value = .85;
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? .8 : 0;
    musBus = ctx.createGain(); musBus.gain.value = .32;
    sfxBus.connect(comp); musBus.connect(comp); comp.connect(master); master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1;
    if (musicOn && !owned) startMusic();
  }

  function tone(f, dur, o = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + (o.when || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    if (o.detune) osc.detune.value = o.detune;
    const v = o.vol == null ? .2 : o.vol, a = o.attack || .005;
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    let out = g;
    if (o.lp) { const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; g.connect(f2); out = f2; }
    osc.connect(g); out.connect(o.bus || sfxBus);
    osc.start(t); osc.stop(t + dur + .05);
  }
  function noise(dur, o = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + (o.when || 0);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 2000, t);
    if (o.slide) f.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain(); g.gain.setValueAtTime(o.vol == null ? .2 : o.vol, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    s.start(t, R() * .4); s.stop(t + dur + .05);
  }
  const chord = (notes, dur, o = {}) => notes.forEach((n, i) => tone(mtof(n), dur, { ...o, when: (o.when || 0) + (o.strum || 0) * i }));

  const SFX = {
    click() { tone(1300, .05, { type: 'square', vol: .04 }); },
    tap() { tone(1500 + R() * 600, .07, { type: 'triangle', vol: .12 }); tone(2600 + R() * 400, .05, { vol: .05, when: .02 }); },
    coin() { tone(1976, .09, { type: 'square', vol: .05 }); tone(2637, .3, { type: 'square', vol: .05, when: .08 }); },
    crank(turns) {
      const n = Math.round(8 * (turns || 1));
      for (let i = 0; i < n; i++) { noise(.035, { vol: .3, freq: 2600, q: 3, when: i * .085 }); tone(180, .03, { type: 'square', vol: .03, when: i * .085 }); }
    },
    thunk() { tone(190, .3, { vol: .45, slide: 55 }); noise(.09, { vol: .2, freq: 500 }); tone(150, .15, { vol: .2, slide: 70, when: .18 }); },
    capTap(n) { tone([520, 700, 940][n] || 940, .14, { type: 'triangle', vol: .3 }); noise(.05, { vol: .15, freq: 4500, q: 2 }); },
    rarityUp() { [72, 76, 79, 84, 88].forEach((m, i) => tone(mtof(m), .12, { type: 'square', vol: .06, when: i * .055 })); noise(.6, { vol: .08, freq: 8000, type: 'highpass', when: .2 }); },
    reveal(r) {
      noise(.3, { vol: .25, freq: 1400, type: 'lowpass', slide: 300 });
      if (r === 6) { return SFX.glitch(); }
      const base = [[72, 76], [72, 76, 79], [72, 76, 79, 83], [72, 76, 79, 83, 86], [60, 67, 72, 76, 79, 84], [60, 67, 72, 76, 79, 84, 88]][r];
      if (r <= 1) { chord(base, .5, { type: 'triangle', vol: .16, strum: .07 }); return; }
      chord(base, .9 + r * .2, { type: 'triangle', vol: .14, strum: .05 });
      if (r >= 3) for (let i = 0; i < 10; i++) tone(mtof(96 + (i % 4) * 2), .1, { vol: .035, when: .3 + i * .06 });
      if (r >= 4) { chord([48, 55, 60, 64, 67], 2.4, { type: 'sawtooth', vol: .05, lp: 1800, attack: .05 }); noise(1.6, { vol: .12, freq: 7000, type: 'highpass', when: .05 }); tone(70, .7, { vol: .5, slide: 38 }); }
      if (r >= 5) { [0, -12, 7].forEach(t => chord([60 + t, 64 + t, 67 + t], 3, { type: 'sawtooth', vol: .025, lp: 2400, attack: .4, when: .2 })); for (let i = 0; i < 16; i++) tone(mtof(72 + i * 2), .14, { type: 'square', vol: .03, when: .05 + i * .035 }); }
    },
    glitch() { for (let i = 0; i < 14; i++) tone(80 + R() * 1600, .05 + R() * .06, { type: 'square', vol: .06, when: i * .045 }); tone(440, .8, { type: 'sawtooth', vol: .06, slide: 40, when: .6, lp: 1200 }); },
    glitchLong() { for (let i = 0; i < 40; i++) tone(60 + R() * 2000, .04 + R() * .08, { type: R() < .5 ? 'square' : 'sawtooth', vol: .05, when: i * .04 + R() * .02 }); noise(1.6, { vol: .15, freq: 600, slide: 60, type: 'lowpass' }); },
    fanfare() { const s = [[67, 0], [72, .12], [76, .24], [79, .36], [84, .52]]; s.forEach(([m, w]) => tone(mtof(m), .22, { type: 'square', vol: .06, when: w })); chord([60, 64, 67, 72], .9, { type: 'triangle', vol: .1, when: .52 }); },
    buy() { noise(.06, { vol: .2, freq: 3000 }); tone(1568, .12, { type: 'square', vol: .05, when: .04 }); tone(2093, .3, { type: 'square', vol: .05, when: .1 }); },
    nope() { tone(220, .12, { type: 'square', vol: .07 }); tone(165, .18, { type: 'square', vol: .07, when: .12 }); },
    mission() { [79, 84, 88, 91].forEach((m, i) => tone(mtof(m), .16, { type: 'triangle', vol: .12, when: i * .08 })); },
    slurp() { tone(900, 1, { vol: .16, slide: 70 }); noise(1, { vol: .12, freq: 3000, slide: 200 }); },
    pop(i) { tone(mtof(64 + i * 2), .1, { type: 'triangle', vol: .14 }); noise(.04, { vol: .1, freq: 3500 }); },
    boom() { tone(60, 1.6, { vol: .6, slide: 25 }); noise(1.8, { vol: .3, freq: 400, type: 'lowpass', slide: 40 }); },
    type() { tone(1800 + R() * 300, .02, { type: 'square', vol: .015 }); },
  };

  /* ---------- music: a little shop loop ---------- */
  const CH = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [55, 59, 62, 65]];
  const BASS = [41, 40, 38, 43];
  const PENTA = [72, 74, 76, 79, 81, 84];
  function stepLen() { return mode === 'box' ? 60 / 66 / 2 : 60 / 94 / 2; }
  function playStep(s, when) {
    const bar = Math.floor(s / 8) % 4, i = s % 8, c = CH[bar];
    const wob = () => (wobble ? (R() - .5) * wobble * 90 : 0);
    if (mode === 'box') {
      const pat = [0, 2, 1, 3, 2, 1, 3, 2];
      tone(mtof(c[pat[i]] + 24), 1.4, { type: 'sine', vol: .11, when, bus: musBus });
      if (i === 0) tone(mtof(BASS[bar] + 12), 2.4, { type: 'triangle', vol: .09, when, bus: musBus });
      return;
    }
    const pat = [0, 1, 2, 3, 2, 1, 2, 3];
    tone(mtof(c[pat[i]] + 12), .28, { type: 'triangle', vol: .1, when, bus: musBus, detune: wob() });
    if (i === 0 || i === 3 || i === 4 || i === 6) tone(mtof(BASS[bar] + (i === 6 ? 12 : 0)), .3, { type: 'sine', vol: .26, when, bus: musBus, detune: wob() });
    if (i % 2 === 1) noise(.04, { vol: .05, freq: 8000, type: 'highpass', when, bus: musBus });
    if (i === 0 || i === 4) tone(120, .18, { vol: .3, slide: 45, when, bus: musBus });
    if ((i === 0 || i === 3 || i === 5) && R() < .35) tone(mtof(PENTA[Math.floor(R() * PENTA.length)]), .45, { type: 'sine', vol: .07, when, bus: musBus, detune: wob() * 2 });
    if (wobble > .6 && R() < .15) tone(60 + R() * 900, .06, { type: 'square', vol: .03, when, bus: musBus });
  }
  function sched() {
    if (!ctx) return;
    if (nextT < ctx.currentTime - .25) nextT = ctx.currentTime + .05;
    while (nextT < ctx.currentTime + .15) { playStep(step, nextT - ctx.currentTime); nextT += stepLen(); step = (step + 1) % 32; }
  }
  function startMusic() {
    if (!ctx || playing) return;
    if (owned && mode !== 'box') return;
    playing = true; nextT = ctx.currentTime + .08; step = 0;
    timer = setInterval(sched, 30);
  }
  function stopMusic() { playing = false; clearInterval(timer); timer = null; }

  return {
    init,
    play(name, arg) { if (!ctx || !sfxOn) return; try { SFX[name] && SFX[name](arg); } catch (e) { /* audio is optional */ } },
    setSfx(on) { sfxOn = on; if (sfxBus) sfxBus.gain.value = on ? .8 : 0; },
    setMusic(on) { musicOn = on; if (!ctx) return; if (on && !owned) startMusic(); else if (!on && mode !== 'box') stopMusic(); },
    own() { owned = true; if (mode !== 'box') stopMusic(); },
    isOwned() { return owned; },
    setWobble(w) { wobble = w; },
    musicBox() { mode = 'box'; stopMusic(); if (ctx) { musBus.gain.value = .5; startMusic(); } },
    shopMode() { mode = 'shop'; stopMusic(); if (ctx) musBus.gain.value = .32; owned = false; wobble = 0; if (musicOn) startMusic(); },
    ready() { return !!ctx; },
  };
})();
