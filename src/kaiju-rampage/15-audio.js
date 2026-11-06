/* ============================================================
   Sound, synthesized: footsteps, crumbling, explosions, a roar,
   the beam, rotors, sirens, and a taiko-drum war march.
   ============================================================ */
const Audio2 = (() => {
  let ctx = null, master = null, sfx = null, mus = null, on = true, noiseBuf = null, beamNode = null, heli = null, siren = null, march = null;
  const T = () => ctx.currentTime;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = on ? 0.8 : 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; master.connect(comp); comp.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.connect(master); mus = ctx.createGain(); mus.gain.value = 0.32; mus.connect(master);
    const n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  function noise(t, dur, { vol = 0.3, f = 800, q = 0.7, type = 'lowpass', to = sfx, attack = 0.005, slide = 0 } = {}) {
    if (!ctx) return; const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (slide) fl.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur); fl.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(to); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  function tone(f, t, dur, { type = 'sine', vol = 0.2, slide = 0, attack = 0.005, to = sfx } = {}) {
    if (!ctx) return; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(to); o.start(t); o.stop(t + dur + 0.05);
  }
  let lastCrumble = 0, lastBoom = 0;
  return {
    init, get on() { return on; },
    setOn(v) { on = v; if (master) master.gain.setTargetAtTime(v ? 0.8 : 0, T(), 0.05); },
    step(big) { if (!ctx) return; const t = T(); tone(big ? 70 : 58, t, big ? 0.6 : 0.35, { vol: big ? 0.9 : 0.55, slide: 0.45 }); noise(t, big ? 0.5 : 0.25, { vol: big ? 0.5 : 0.22, f: 260 }); },
    crumble(n = 1) { if (!ctx) return; const t = T(); if (t - lastCrumble < 0.07) return; lastCrumble = t; const v = Math.min(0.5, 0.08 + n * 0.012); noise(t, 0.35 + Math.min(1, n / 60), { vol: v, f: 900 + Math.random() * 900, q: 0.6, type: 'bandpass' }); noise(t, 0.6, { vol: v * 0.6, f: 180 }); },
    collapse() { if (!ctx) return; const t = T(); noise(t, 2.6, { vol: 0.6, f: 700, slide: 0.3, attack: 0.05 }); tone(48, t, 2.2, { vol: 0.5, slide: 0.6, attack: 0.05 }); },
    boom(big) { if (!ctx) return; const t = T(); if (t - lastBoom < 0.05) return; lastBoom = t; noise(t, big ? 1.4 : 0.8, { vol: big ? 0.75 : 0.45, f: 1600, slide: 0.12 }); tone(big ? 55 : 80, t, big ? 1.0 : 0.5, { vol: big ? 0.7 : 0.4, slide: 0.4 }); },
    pop() { if (!ctx) return; tone(rand(500, 900), T(), 0.08, { type: 'triangle', vol: 0.05, slide: 1.6 }); },
    shot() { if (!ctx) return; const t = T(); noise(t, 0.4, { vol: 0.25, f: 2200, slide: 0.2 }); tone(140, t, 0.3, { vol: 0.25, slide: 0.4 }); },
    pew() { if (!ctx) return; tone(1400, T(), 0.06, { type: 'square', vol: 0.03, slide: 0.6 }); },
    swoosh() { if (!ctx) return; noise(T(), 0.55, { vol: 0.35, f: 400, slide: 4, q: 1.5, type: 'bandpass', attack: 0.05 }); },
    roar() {
      if (!ctx) return; const t = T(), o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o2.type = 'sawtooth'; o.frequency.setValueAtTime(150, t); o.frequency.linearRampToValueAtTime(190, t + 0.4); o.frequency.exponentialRampToValueAtTime(70, t + 1.8); o2.frequency.setValueAtTime(153, t); o2.frequency.exponentialRampToValueAtTime(68, t + 1.8);
      f.type = 'bandpass'; f.Q.value = 2.2; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(900, t + 0.5); f.frequency.exponentialRampToValueAtTime(300, t + 1.8);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 2);
      o.connect(f); o2.connect(f); f.connect(g); g.connect(sfx); o.start(t); o2.start(t); o.stop(t + 2.1); o2.stop(t + 2.1);
      noise(t, 1.8, { vol: 0.35, f: 1200, q: 0.8, type: 'bandpass', attack: 0.1, slide: 0.4 });
    },
    beam(onOff) {
      if (!ctx) return;
      if (onOff && !beamNode) {
        const t = T(), o = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = 220; o2.type = 'square'; o2.frequency.value = 331; lfo.frequency.value = 9; lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
        f.type = 'lowpass'; f.frequency.value = 1800; f.Q.value = 6; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.12);
        o.connect(f); o2.connect(f); f.connect(g); g.connect(sfx); o.start(); o2.start(); lfo.start(); beamNode = { o, o2, lfo, g };
      } else if (!onOff && beamNode) { const b = beamNode, t = T(); b.g.gain.setTargetAtTime(0.0001, t, 0.05); setTimeout(() => { b.o.stop(); b.o2.stop(); b.lfo.stop(); }, 300); beamNode = null; }
    },
    heli(level) {   // rotor chop, louder with more helicopters about
      if (!ctx) return;
      if (level > 0 && !heli) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; const g = ctx.createGain(); g.gain.value = 0; const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.type = 'square'; lfo.frequency.value = 13; lg.gain.value = 0.5; lfo.connect(lg); const am = ctx.createGain(); am.gain.value = 0.5; lg.connect(am.gain); s.connect(f); f.connect(am); am.connect(g); g.connect(sfx); s.start(); lfo.start(); heli = { g }; }
      if (heli) heli.g.gain.setTargetAtTime(Math.min(0.35, level * 0.08), T(), 0.3);
    },
    siren(level) {
      if (!ctx) return;
      if (level > 0 && !siren) { const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 760; lfo.frequency.value = 0.55; lg.gain.value = 190; lfo.connect(lg); lg.connect(o.frequency); g.gain.value = 0; o.connect(g); g.connect(sfx); o.start(); lfo.start(); siren = { g }; }
      if (siren) siren.g.gain.setTargetAtTime(Math.min(0.06, level * 0.015), T(), 0.4);
    },
    /* taiko drums and a low brass stab, looping while the rampage runs */
    music(play) {
      if (!ctx) return;
      if (!play) { if (march) { clearInterval(march); march = null; } return; }
      if (march) return;
      const bpm = 132, beat = 60 / bpm; let step = 0, next = T() + 0.1;
      const pattern = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0], kat = [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0];
      const brass = [[45, 49, 52], [43, 47, 50], [41, 45, 48], [43, 47, 50]];
      march = setInterval(() => {
        while (next < T() + 0.25) {
          const s = step % 16, bar = Math.floor(step / 16);
          if (pattern[s]) { tone(s === 0 ? 72 : 96, next, 0.5, { vol: s === 0 ? 0.9 : 0.6, slide: 0.55, to: mus }); noise(next, 0.18, { vol: 0.2, f: 400, to: mus }); }
          if (kat[s]) noise(next, 0.05, { vol: 0.18, f: 3000, q: 2, type: 'bandpass', to: mus });
          if (s === 0 && bar % 2 === 0) brass[(bar / 2) % 4].forEach(m => tone(440 * Math.pow(2, (m - 69) / 12), next, beat * 3.5, { type: 'sawtooth', vol: 0.06, attack: 0.04, to: mus }));
          if (s % 4 === 2) tone(440 * Math.pow(2, (brass[Math.floor(bar / 2) % 4][0] - 81) / 12), next, beat * 0.4, { type: 'square', vol: 0.05, to: mus });
          next += beat / 4; step++;
        }
      }, 80);
    },
  };
})();
