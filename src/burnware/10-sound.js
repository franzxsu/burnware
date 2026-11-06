/* ============================================================
   System sounds, synthesized: the startup chime, clicks, dings,
   a dial-up modem, a crumpled-paper recycle bin, little jingles.
   ============================================================ */
const Sound = (() => {
  let ctx = null, master = null, on = true;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = on ? 0.6 : 0; master.connect(ctx.destination);
  }
  const now = () => ctx.currentTime;
  function tone(f, t0, dur, { type = 'sine', vol = 0.2, attack = 0.01, slide = 0, to = master, release = null } = {}) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (release || dur));
    o.connect(g); g.connect(to); o.start(t0); o.stop(t0 + (release || dur) + 0.05);
  }
  function noise(t0, dur, { vol = 0.2, freq = 1200, q = 0.8, type = 'bandpass' } = {}) {
    if (!ctx) return;
    const n = Math.ceil(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + dur);
  }
  // a soft wash of echo for the chimes
  function echoBus() {
    const d = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain(), lp = ctx.createBiquadFilter();
    d.delayTime.value = 0.23; fb.gain.value = 0.38; wet.gain.value = 0.5; lp.type = 'lowpass'; lp.frequency.value = 2600;
    const inp = ctx.createGain(); inp.connect(master); inp.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(master);
    return inp;
  }
  return {
    init, get ctx() { return ctx; }, get on() { return on; },
    setOn(v) { on = v; if (master) master.gain.value = v ? 0.6 : 0; },
    startup() {   // a warm major-seventh bloom, then a sparkle
      if (!ctx) return; const t = now() + 0.05, bus = echoBus();
      [[261.6, 0], [329.6, 0.12], [392, 0.24], [493.9, 0.36], [587.3, 0.55]].forEach(([f, d]) => {
        tone(f, t + d, 2.6, { type: 'triangle', vol: 0.11, attack: 0.04, to: bus });
        tone(f * 2, t + d, 1.6, { type: 'sine', vol: 0.04, attack: 0.02, to: bus });
      });
      [1567, 1975, 2349, 3136].forEach((f, k) => tone(f, t + 1.0 + k * 0.09, 0.9, { type: 'sine', vol: 0.03, to: bus }));
      tone(130.8, t, 3, { type: 'sine', vol: 0.09, attack: 0.3 });
    },
    shutdown() {
      if (!ctx) return; const t = now() + 0.05, bus = echoBus();
      [[587.3, 0], [493.9, 0.18], [392, 0.36], [329.6, 0.54], [261.6, 0.75]].forEach(([f, d]) => tone(f, t + d, 1.8, { type: 'triangle', vol: 0.1, attack: 0.03, to: bus }));
    },
    click() { if (!ctx) return; noise(now(), 0.025, { vol: 0.12, freq: 3200, q: 2 }); },
    ding() { if (!ctx) return; const t = now(); tone(880, t, 0.5, { type: 'triangle', vol: 0.16 }); tone(1318, t + 0.02, 0.6, { type: 'sine', vol: 0.06 }); },
    chord() { if (!ctx) return; const t = now(); [523, 659, 784].forEach((f, k) => tone(f, t + k * 0.02, 0.7, { type: 'triangle', vol: 0.09 })); },
    notify() { if (!ctx) return; const t = now(); tone(988, t, 0.12, { type: 'square', vol: 0.05 }); tone(1319, t + 0.11, 0.2, { type: 'square', vol: 0.05 }); },
    buzz() { if (!ctx) return; const t = now(); for (let k = 0; k < 6; k++) tone(70 + k * 4, t + k * 0.07, 0.07, { type: 'sawtooth', vol: 0.1 }); },
    recycle() { if (!ctx) return; const t = now(); for (let k = 0; k < 7; k++) noise(t + k * 0.035 + Math.random() * 0.02, 0.05, { vol: 0.16, freq: 1500 + Math.random() * 2500, q: 1.2 }); },
    whoosh(up = true) { if (!ctx) return; const t = now(); tone(up ? 300 : 900, t, 0.16, { type: 'sine', vol: 0.05, slide: up ? 3 : 0.33 }); },
    tada() { if (!ctx) return; const t = now(), bus = echoBus(); [[523, 0], [659, 0.1], [784, 0.2], [1046, 0.32]].forEach(([f, d]) => { tone(f, t + d, 0.9, { type: 'square', vol: 0.05, to: bus }); tone(f / 2, t + d, 0.9, { type: 'triangle', vol: 0.06, to: bus }); }); },
    bsod() { if (!ctx) return; tone(440, now(), 0.6, { type: 'square', vol: 0.08 }); },
    key() { if (!ctx) return; noise(now(), 0.018, { vol: 0.05, freq: 2500 + Math.random() * 1500, q: 3 }); },
    eat() { if (!ctx) return; tone(660, now(), 0.08, { type: 'square', vol: 0.06, slide: 1.6 }); },
    crash() { if (!ctx) return; tone(220, now(), 0.5, { type: 'sawtooth', vol: 0.09, slide: 0.3 }); },
    /* the handshake: dial tone, the number, then the screech everyone remembers */
    modem() {
      if (!ctx) return 0; const t = now() + 0.05;
      tone(350, t, 0.6, { vol: 0.05 }); tone(440, t, 0.6, { vol: 0.05 });
      const dtmf = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], 0: [941, 1336] };
      [...'5550198'].forEach((d, k) => { const [a, b] = dtmf[d], s = t + 0.7 + k * 0.11; tone(a, s, 0.08, { vol: 0.06, attack: 0.003 }); tone(b, s, 0.08, { vol: 0.06, attack: 0.003 }); });
      const s = t + 1.6;
      tone(2100, s, 0.9, { vol: 0.05, attack: 0.02 });
      tone(980, s + 1.0, 0.25, { type: 'square', vol: 0.03 }); tone(1650, s + 1.25, 0.25, { type: 'square', vol: 0.03 });
      for (let k = 0; k < 10; k++) noise(s + 1.5 + k * 0.12, 0.16, { vol: 0.05, freq: 1200 + (k % 3) * 600, q: 0.6 });
      tone(1800, s + 1.5, 1.2, { type: 'sawtooth', vol: 0.02, slide: 0.6 });
      return 3.4;
    },
    /* a short looping tune for the 90s homepage; returns a stop function */
    jingle(notes, bpm = 140, wave = 'square') {
      if (!ctx) return () => {};
      let stopped = false, k = 0; const step = 60 / bpm / 2;
      const loop = () => {
        if (stopped) return;
        const t = now() + 0.02, [n, d] = notes[k % notes.length];
        if (n) tone(440 * Math.pow(2, (n - 69) / 12), t, step * d * 0.9, { type: wave, vol: 0.035, attack: 0.005 });
        k++; setTimeout(loop, step * d * 1000);
      };
      loop();
      return () => { stopped = true; };
    },
  };
})();
