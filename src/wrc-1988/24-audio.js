/* ============================================================
   Sound: synthesized engines, tyres, wind, impacts, co-driver
   ============================================================ */
const SND = (() => {
  let ctx = null, master = null, sfx = null, eng = null, noiseBuf = null, enabled = true, voiceOn = true;
  const voices = [];
  let tyre = null, wind = null, rain = null, rainLevel = 0, splashT = 0;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return true; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = enabled ? 0.9 : 0;
    sfx = ctx.createGain(); sfx.gain.value = 0.9; eng = ctx.createGain(); eng.gain.value = 0.75;
    sfx.connect(comp); eng.connect(comp); comp.connect(master); master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    tyre = makeLoop('bandpass', 1400, 0.9); wind = makeLoop('lowpass', 700, 0.5); rain = makeLoop('highpass', 2400, 0.3);
    rain.g.gain.value = rainLevel;
    return true;
  }
  function makeLoop(type, f, q) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    s.connect(fl); fl.connect(g); g.connect(sfx); s.start();
    return { s, fl, g };
  }
  const shaperCurve = (() => { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(x * 2.2); } return c; })();
  class EngineVoice {
    constructor(car) {
      this.car = car; const t = ctx.currentTime;
      this.o1 = ctx.createOscillator(); this.o1.type = 'sawtooth';
      this.o2 = ctx.createOscillator(); this.o2.type = 'square';
      this.o3 = ctx.createOscillator(); this.o3.type = 'triangle';
      // firing pulses per crank turn = cylinders / 2; twins thump, V8s rumble underneath
      this.cyl = car.spec.cyl || 4; this.fk = this.cyl / 2; this.subK = this.cyl >= 8 ? 0.25 : 0.5;
      this.g1 = ctx.createGain(); this.g1.gain.value = this.cyl >= 6 ? 0.42 : 0.5;
      this.g2 = ctx.createGain(); this.g2.gain.value = this.cyl >= 8 ? 0.4 : this.cyl <= 2 ? 0.36 : 0.22;
      this.g3 = ctx.createGain(); this.g3.gain.value = this.cyl === 6 ? 0.62 : 0.5;
      this.mix = ctx.createGain();
      this.shape = ctx.createWaveShaper(); this.shape.curve = shaperCurve;
      this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.Q.value = 2.2; this.lp.frequency.value = 800;
      this.out = ctx.createGain(); this.out.gain.value = 0;
      this.pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      this.o1.connect(this.g1); this.o2.connect(this.g2); this.o3.connect(this.g3);
      this.g1.connect(this.mix); this.g2.connect(this.mix); this.g3.connect(this.mix);
      this.mix.connect(this.shape); this.shape.connect(this.lp); this.lp.connect(this.out);
      if (this.pan) { this.out.connect(this.pan); this.pan.connect(eng); } else this.out.connect(eng);
      // intake roar
      this.ns = ctx.createBufferSource(); this.ns.buffer = noiseBuf; this.ns.loop = true;
      this.nf = ctx.createBiquadFilter(); this.nf.type = 'bandpass'; this.nf.Q.value = 1.4; this.ng = ctx.createGain(); this.ng.gain.value = 0;
      this.ns.connect(this.nf); this.nf.connect(this.ng); this.ng.connect(this.out);
      // turbo whistle
      if (car.spec.turbo) { this.tb = ctx.createOscillator(); this.tb.type = 'sine'; this.tg = ctx.createGain(); this.tg.gain.value = 0; this.tb.connect(this.tg); this.tg.connect(this.out); this.tb.start(t); }
      [this.o1, this.o2, this.o3, this.ns].forEach(o => o.start(t));
      this.lastLift = 0; this.lastShift = 0;
    }
    update(listener, isPlayer) {
      const c = this.car, t = ctx.currentTime;
      if (c.gone) { this.out.gain.setTargetAtTime(0, t, 0.08); return; }
      const f = Math.max(22, c.rpm / 60 * this.fk);
      this.o1.frequency.setTargetAtTime(f, t, 0.025); this.o2.frequency.setTargetAtTime(f * this.subK, t, 0.025); this.o3.frequency.setTargetAtTime(f * 1.5, t, 0.025);
      const load = c.pedal, r = c.rpm / c.spec.redline;
      this.lp.frequency.setTargetAtTime(300 + load * 1700 + r * 1500, t, 0.04);
      this.nf.frequency.setTargetAtTime(500 + r * 1800, t, 0.05);
      this.ng.gain.setTargetAtTime(0.05 + load * 0.16 * r, t, 0.05);
      let vol = 0.16 + load * 0.16 + r * 0.1;
      if (!isPlayer) { const d = Math.hypot(c.pos.x - listener.x, c.pos.z - listener.z); vol *= 0.6 * clamp(1 - d / 140, 0, 1) / (1 + d * 0.03); }
      if (c.shiftT > 0) vol *= 0.55;
      this.out.gain.setTargetAtTime(vol, t, 0.04);
      if (this.pan && !isPlayer) {
        const dx = c.pos.x - listener.x, dz = c.pos.z - listener.z;
        this.pan.pan.setTargetAtTime(clamp((dx * listener.rx + dz * listener.rz) / 25, -0.8, 0.8), t, 0.1);
      }
      if (this.tb) { this.tb.frequency.setTargetAtTime(1800 + c.boost * 2600, t, 0.08); this.tg.gain.setTargetAtTime(c.boost * 0.05, t, 0.08); }
      if (isPlayer && c.lift && t - this.lastLift > 0.6) { this.lastLift = t; backfire(c.spec.turbo); }
      if (isPlayer && c.shifted) { c.shifted = 0; if (t - this.lastShift > 0.2) { this.lastShift = t; blip(160, 0.05, 0.08, 'square'); } }
    }
    stop() { try { [this.o1, this.o2, this.o3, this.ns, this.tb].forEach(o => o && o.stop()); this.out.disconnect(); } catch (e) { /* already stopped */ } }
  }
  function blip(f, dur, vol, type = 'sine', when = 0, slide = null) {
    const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  function burst(dur, vol, type, freq, q = 1, when = 0, slide = null) {
    const t = ctx.currentTime + when, s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (slide) f.frequency.exponentialRampToValueAtTime(slide, t + dur); f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfx); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  function backfire(turbo) {
    if (turbo) burst(0.35, 0.18, 'highpass', 2200, 0.7, 0, 5000);
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) { const w = 0.05 + i * 0.07 + Math.random() * 0.04; burst(0.06, 0.5, 'lowpass', 900, 1, w); blip(70, 0.07, 0.3, 'sine', w, 40); }
  }
  return {
    init, ready: () => !!ctx,
    setEnabled(on) { enabled = on; if (master) master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.05); },
    setVoice(on) { voiceOn = on; if (!on && window.speechSynthesis) speechSynthesis.cancel(); },
    attach(cars) { if (!ctx) return; voices.forEach(v => v.stop()); voices.length = 0; cars.forEach(c => voices.push(new EngineVoice(c))); },
    detach() { voices.forEach(v => v.stop()); voices.length = 0; if (tyre) { tyre.g.gain.value = 0; wind.g.gain.value = 0; } },
    setRain(v) { rainLevel = v; if (rain) rain.g.gain.setTargetAtTime(v, ctx.currentTime, 0.4); },
    update(player, cam) {
      if (!ctx || !player) return;
      const t = ctx.currentTime;
      const lis = { x: cam.position.x, z: cam.position.z, rx: -player.ax.x, rz: -player.ax.z };
      voices.forEach(v => v.update(lis, v.car === player));
      // tyres: surface flavoured noise driven by sliding
      let sl = 0, surf = 'gravel', wet = 0;
      for (const w of player.wheels) if (w.contact) { if (w.slide > sl) { sl = w.slide; surf = SURF_LIST[w.surf].snd; } if (w.inWater) wet++; }
      const sp = player.speed;
      const roll = clamp(sp / 30, 0, 1) * (surf === 'tarmac' ? 0.02 : 0.08);
      const amt = clamp(sl * clamp(sp / 8, 0, 1), 0, 1);
      const P = { tarmac: [1100, 6, 0.24], gravel: [1500, 0.8, 0.3], sand: [800, 0.7, 0.25], snow: [2600, 0.7, 0.18], grass: [600, 0.6, 0.25], water: [900, 0.5, 0.35] }[surf] || [1400, 0.8, 0.3];
      tyre.fl.frequency.setTargetAtTime(P[0] * (0.85 + 0.3 * Math.random()), t, 0.03); tyre.fl.Q.setTargetAtTime(P[1], t, 0.05);
      tyre.g.gain.setTargetAtTime(player.grounded ? roll + amt * P[2] : 0, t, 0.05);
      wind.g.gain.setTargetAtTime(clamp(sp / 45, 0, 1) ** 2 * 0.22, t, 0.1);
      wind.fl.frequency.setTargetAtTime(400 + sp * 12, t, 0.1);
      if (wet && sp > 4 && t - splashT > 0.25) { splashT = t; burst(0.4, clamp(sp / 20, 0.1, 0.6), 'lowpass', 1800, 0.6, 0, 400); }
    },
    impact(a) { if (!ctx) return; const v = clamp(a / 12, 0.08, 1); burst(0.25, v * 0.7, 'lowpass', 600, 1, 0, 120); blip(90, 0.2, v * 0.5, 'sine', 0, 40); burst(0.08, v * 0.4, 'highpass', 2500); },
    land(a) { if (!ctx) return; const v = clamp(a, 0.2, 1); blip(70, 0.25, v * 0.6, 'sine', 0, 35); burst(0.2, v * 0.35, 'lowpass', 500); },
    thump(sp) { if (!ctx) return; burst(0.18, clamp(sp / 15, 0.1, 0.5), 'lowpass', 500, 1, 0, 150); },
    beep(hi) { if (!ctx) return; blip(hi ? 1320 : 660, hi ? 0.6 : 0.22, 0.25, 'square'); },
    cheer(v) { if (!ctx) return; for (let i = 0; i < 5; i++) burst(0.9 + Math.random() * 0.6, v * 0.12, 'bandpass', 900 + Math.random() * 1400, 3, Math.random() * 0.3); },
    click() { if (!ctx) return; blip(1600, 0.04, 0.06, 'square'); },
    bank(big) { if (!ctx) return; blip(990, 0.09, 0.09, 'triangle'); blip(1320, 0.14, 0.08, 'triangle', 0.07); if (big) blip(1760, 0.2, 0.07, 'triangle', 0.15); },
    wipe() { if (!ctx) return; blip(260, 0.3, 0.1, 'sawtooth', 0, 110); },
    horn() { if (!ctx) return; blip(330, 0.28, 0.1, 'square'); blip(247, 0.5, 0.1, 'square', 0.26); },
    fanfare() { if (!ctx) return; [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.32, 0.14, 'square', i * 0.12)); blip(1047, 0.9, 0.12, 'triangle', 0.5); },
    say(text) {
      if (!voiceOn || !window.speechSynthesis || !text) return;
      try {
        if (speechSynthesis.speaking && speechSynthesis.pending) speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const vs = speechSynthesis.getVoices();
        const v = vs.find(x => /en-GB/i.test(x.lang)) || vs.find(x => /^en/i.test(x.lang));
        if (v) u.voice = v;
        u.rate = 1.22; u.pitch = 0.95; u.volume = 0.9;
        speechSynthesis.speak(u);
      } catch (e) { /* speech is optional */ }
    },
  };
})();
