/* ============================================================
   The sound, all made live: a drum kit (three flavours), three
   basses, three keyboards and three synths, each track through
   its own fader and a shared reverb, into a gentle limiter.
   The same engine renders offline when you export a WAV.
   ============================================================ */
class Engine {
  constructor(ctx, offline = false) {
    this.ctx = ctx; this.offline = offline;
    const c = ctx, comp = c.createDynamicsCompressor(); comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.18;
    this.master = c.createGain(); this.master.gain.value = 0.85; this.master.connect(comp); comp.connect(c.destination);
    this.verb = c.createConvolver(); this.verb.buffer = this.impulse(2.6); const vr = c.createGain(); vr.gain.value = 0.9; this.verb.connect(vr); vr.connect(this.master);
    const n = c.sampleRate, nb = c.createBuffer(1, n, n), d = nb.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.noiseBuf = nb;
    this.bus = []; this.meters = [];
    for (let i = 0; i < 4; i++) {
      const g = c.createGain(), send = c.createGain(); g.connect(this.master); g.connect(send); send.connect(this.verb);
      let an = null; if (!offline) { an = c.createAnalyser(); an.fftSize = 256; g.connect(an); }
      this.bus.push({ g, send }); this.meters.push(an);
    }
    this.click = c.createGain(); this.click.gain.value = 0.5; this.click.connect(this.master);
  }
  impulse(sec) { const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); } return b; }
  mix(song) { const solo = song.tracks.some(t => t.solo); song.tracks.forEach((t, i) => { const on = !t.mute && (!solo || t.solo); this.bus[i].g.gain.setTargetAtTime(on ? t.vol * t.vol : 0, this.ctx.currentTime, 0.02); this.bus[i].send.gain.setTargetAtTime(t.rev * 0.6, this.ctx.currentTime, 0.02); }); }
  level(i) { const an = this.meters[i]; if (!an) return 0; const a = new Uint8Array(an.fftSize); an.getByteTimeDomainData(a); let m = 0; for (const v of a) m = Math.max(m, Math.abs(v - 128)); return m / 128; }
  /* ---------- small building blocks ---------- */
  env(g, t, a, peak, dcy, sus, dur, rel) {   // attack, decay to sustain, hold, release; returns the release start
    const p = g.gain; p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(peak, t + a); p.setTargetAtTime(peak * sus, t + a, dcy / 3);
    if (dur !== Infinity) { p.setTargetAtTime(0.0001, t + Math.max(a, dur), rel / 4); }
    return { stop: (rt) => { p.cancelScheduledValues(rt); p.setTargetAtTime(0.0001, rt, rel / 4); } };
  }
  osc(type, f, t, end) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); if (end) o.stop(end); return o; }
  noise(t, end) { const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; s.start(t, Math.random() * 0.5); if (end) s.stop(end); return s; }
  filt(type, f, q = 0.7) { const fl = this.ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; return fl; }
  /* ---------- drums: lane 0..7 ---------- */
  drum(i, lane, t, vel, kit) {
    const c = this.ctx, out = this.bus[i].g, lo = kit === 'Lo-fi', g = c.createGain(); g.connect(out);
    let tail = 0.5;
    const hit = (node, peak, dcy) => { const e = c.createGain(); node.connect(e); e.connect(g); e.gain.setValueAtTime(peak * vel, t); e.gain.exponentialRampToValueAtTime(0.0001, t + dcy); };
    if (lo) { const f = this.filt('lowpass', 3800, 0.9); g.disconnect(); g.connect(f); f.connect(out); }
    if (lane === 0) {   // kick: a falling sine with a click
      const boom = kit === '808' ? 0.9 : 0.42, o = this.osc('sine', 150, t, t + boom + 0.05); o.frequency.exponentialRampToValueAtTime(kit === '808' ? 42 : 52, t + 0.12);
      hit(o, 1.1, boom); const n = this.noise(t, t + 0.02), f = this.filt('highpass', 1200); n.connect(f); hit(f, 0.25, 0.015); tail = boom;
    } else if (lane === 1) {   // snare: tone body and a burst of filtered noise
      const o = this.osc('triangle', 190, t, t + 0.2); o.frequency.exponentialRampToValueAtTime(140, t + 0.1); hit(o, 0.5, 0.12);
      const n = this.noise(t, t + 0.3), f = this.filt('bandpass', kit === 'Studio' ? 2400 : 1800, 0.8); n.connect(f); hit(f, 0.9, kit === '808' ? 0.22 : 0.17); tail = 0.3;
    } else if (lane === 2) {   // clap: three quick slaps and a tail
      const f = this.filt('bandpass', 1200, 1.2); for (let k = 0; k < 3; k++) { const n = this.noise(t + k * 0.011, t + k * 0.011 + 0.03), e = c.createGain(); n.connect(e); e.connect(f); e.gain.setValueAtTime(0.8, t + k * 0.011); e.gain.exponentialRampToValueAtTime(0.001, t + k * 0.011 + 0.03); }
      const n2 = this.noise(t + 0.033, t + 0.3), e2 = c.createGain(); n2.connect(e2); e2.connect(f); e2.gain.setValueAtTime(0.5, t + 0.033); e2.gain.exponentialRampToValueAtTime(0.001, t + 0.25); f.connect(g); g.gain.value = vel; tail = 0.3;
    } else if (lane === 3 || lane === 4) {   // hats
      const n = this.noise(t, t + 0.5), f = this.filt('highpass', lane === 3 ? 7500 : 6800), f2 = this.filt('peaking', 10000, 1); f2.gain.value = 6; n.connect(f); f.connect(f2); hit(f2, lane === 3 ? 0.42 : 0.38, lane === 3 ? 0.05 : 0.34); tail = 0.4;
    } else if (lane === 5 || lane === 6) {   // toms
      const f0 = lane === 5 ? 110 : 170, o = this.osc('sine', f0 * 1.4, t, t + 0.5); o.frequency.exponentialRampToValueAtTime(f0, t + 0.08); hit(o, 0.9, 0.4); tail = 0.45;
    } else {   // crash
      const n = this.noise(t, t + 1.6), f = this.filt('highpass', 4800), f2 = this.filt('bandpass', 7000, 0.4); n.connect(f); f.connect(f2); hit(f2, 0.5, 1.5); tail = 1.6;
    }
    if (!this.offline) setTimeout(() => { try { g.disconnect(); } catch (e) { /* already gone */ } }, (t - c.currentTime + tail + 0.5) * 1000);
  }
  /* ---------- tuned voices: returns {stop(t)} for notes you hold ---------- */
  voice(i, kind, preset, midi, t, vel, dur) {
    const c = this.ctx, out = this.bus[i].g, f = mtof(midi), end = dur === Infinity ? null : t + dur + 1.6, g = c.createGain(); g.connect(out);
    const parts = [];
    const tidy = () => { for (const p of parts) try { p.stop(); } catch (e) { /* stopped */ } setTimeout(() => { try { g.disconnect(); } catch (e) { /* gone */ } }, 300); };
    let E;
    if (kind === 'bass') {
      if (preset === 'Sub') { const o = this.osc('sine', f, t, end), o2 = this.osc('triangle', f * 2, t, end), m = c.createGain(); m.gain.value = 0.18; o2.connect(m); m.connect(g); o.connect(g); parts.push(o, o2); E = this.env(g, t, 0.008, 0.85 * vel, 0.4, 0.75, dur, 0.12); }
      else if (preset === 'Pluck') { const o = this.osc('sawtooth', f, t, end), fl = this.filt('lowpass', 2400, 2); fl.frequency.setValueAtTime(2600, t); fl.frequency.exponentialRampToValueAtTime(220, t + 0.25); o.connect(fl); fl.connect(g); parts.push(o); E = this.env(g, t, 0.004, 0.6 * vel, 0.3, 0.25, dur, 0.1); }
      else { const o = this.osc('sawtooth', f, t, end), fl = this.filt('lowpass', 300, 11); fl.frequency.setValueAtTime(1800 * vel + 300, t); fl.frequency.exponentialRampToValueAtTime(260, t + 0.22); o.connect(fl); const ws = c.createWaveShaper(); ws.curve = Engine.curve(2.5); fl.connect(ws); ws.connect(g); parts.push(o); E = this.env(g, t, 0.004, 0.42 * vel, 0.25, 0.55, dur, 0.06); }
    } else if (kind === 'keys') {
      if (preset === 'E-Piano') {   // a little FM: a sine bent by another sine, bell at the start, warm after
        const car = this.osc('sine', f, t, end), mod = this.osc('sine', f * 2, t, end), mg = c.createGain(); mg.gain.setValueAtTime(f * 2.2 * vel, t); mg.gain.exponentialRampToValueAtTime(f * 0.25, t + 0.9); mod.connect(mg); mg.connect(car.frequency);
        const trem = this.osc('sine', 4.6, t, end), tg = c.createGain(); tg.gain.value = 0.12; trem.connect(tg); const amp = c.createGain(); amp.gain.value = 0.88; tg.connect(amp.gain); car.connect(amp); amp.connect(g); parts.push(car, mod, trem);
        E = this.env(g, t, 0.006, 0.42 * vel, 1.6, 0.35, dur, 0.35);
      } else if (preset === 'Organ') { [1, 2, 3, 4, 6].forEach((k, j) => { const o = this.osc('sine', f * k, t, end), m = c.createGain(); m.gain.value = [0.5, 0.35, 0.2, 0.15, 0.08][j]; o.connect(m); m.connect(g); parts.push(o); }); E = this.env(g, t, 0.01, 0.3 * vel, 0.05, 1, dur, 0.06); }
      else { const o = this.osc('triangle', f, t, end), o2 = this.osc('sine', f * 2.001, t, end), m = c.createGain(); m.gain.value = 0.3; o2.connect(m); m.connect(g); const fl = this.filt('lowpass', 3000 + 2000 * vel); o.connect(fl); fl.connect(g); parts.push(o, o2); E = this.env(g, t, 0.003, 0.55 * vel, 1.1, 0.12, dur, 0.4); }
    } else {
      if (preset === 'Lead') { const fl = this.filt('lowpass', 2600, 3); [-7, 7].forEach(dt => { const o = this.osc('sawtooth', f, t, end); o.detune.value = dt; o.connect(fl); parts.push(o); }); const lfo = this.osc('sine', 5.4, t, end), lg = c.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + 0.35); lfo.connect(lg); parts.forEach(o => lg.connect(o.frequency)); parts.push(lfo); fl.connect(g); E = this.env(g, t, 0.012, 0.22 * vel, 0.3, 0.8, dur, 0.18); }
      else if (preset === 'Pad') { const fl = this.filt('lowpass', 1500, 0.8); [-14, -5, 5, 14].forEach(dt => { const o = this.osc('sawtooth', f, t, end); o.detune.value = dt; o.connect(fl); parts.push(o); }); fl.connect(g); E = this.env(g, t, 0.45, 0.13 * vel, 1, 0.85, dur, 1.1); }
      else { const o = this.osc('square', f, t, end), o2 = this.osc('square', f * 2, t, end), m = c.createGain(); m.gain.value = 0.25; o2.connect(m); m.connect(g); o.connect(g); parts.push(o, o2); E = this.env(g, t, 0.002, 0.16 * vel, 0.2, 0.55, dur, 0.05); }
    }
    if (dur !== Infinity && !this.offline) setTimeout(tidy, (t - c.currentTime + dur + 2) * 1000);
    return { stop: (rt) => { E.stop(rt); for (const p of parts) try { p.stop(rt + 1.5); } catch (e) { /* fine */ } setTimeout(tidy, (rt - c.currentTime + 1.8) * 1000); } };
  }
  /* one note of a track, at a time, for a length */
  play(song, i, note, t, dur) {
    const tr = song.tracks[i];
    if (tr.kind === 'drums') return this.drum(i, note.n, t, note.v, tr.preset);
    return this.voice(i, tr.kind, tr.preset, note.n, t, note.v, dur);
  }
  tick(t, down) { const o = this.osc('square', down ? 1760 : 1320, t, t + 0.05), g = this.ctx.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04); o.connect(g); g.connect(this.click); }
  static curve(k) { const n = 512, a = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; a[i] = Math.tanh(x * k) / Math.tanh(k); } return a; }
}
const Audio = {
  ctx: null, eng: null,
  ensure() {
    if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; this.ctx = new C(); this.eng = new Engine(this.ctx); this.eng.mix(App.song); }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.eng;
  },
};
