/* ============================================================
   Sound, all synthesized: a sizzle bed that follows how much is
   frying, bubbles, popcorn pops, fire roar, running tap, alarm,
   and little UI chimes. Nothing plays until the first tap.
   ============================================================ */
const Sfx = (() => {
  let ctx = null, master = null, noise = null, on = true;
  const loops = {};
  let alarmT = 0, bubbleT = 0, popT = 0, rattleT = 0;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = on ? 0.8 : 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5;
    master.connect(comp); comp.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    loops.sizzle = loop('bandpass', 5200, 0.6);
    loops.fire = loop('lowpass', 520, 0.8);
    loops.tap = loop('bandpass', 1300, 1.2);
    loops.rain = loop('highpass', 2600, 0.4);
  }
  function loop(type, f, q) {
    const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    s.connect(fl); fl.connect(g); g.connect(master); s.start(0, Math.random() * 2);
    return { fl, g };
  }
  function blip(f, dur, vol, type = 'sine', when = 0, slide = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function burst(dur, vol, type, f, q = 1, when = 0, slide = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when, s = ctx.createBufferSource(); s.buffer = noise;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (slide) fl.frequency.exponentialRampToValueAtTime(slide, t + dur); fl.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  const set = (l, v, tc = 0.08) => { if (l) l.g.gain.setTargetAtTime(v, ctx.currentTime, tc); };
  return {
    init,
    get on() { return on; },
    setOn(v) { on = v; if (master) master.gain.setTargetAtTime(v ? 0.8 : 0, ctx.currentTime, 0.05); },
    /* called once a frame with what the simulation did since the last frame */
    update(ev, dt) {
      if (!ctx) return;
      set(loops.sizzle, Math.min(0.32, Math.sqrt(ev.sizzle) * 0.05), 0.12);
      loops.sizzle.fl.frequency.setTargetAtTime(4200 + Math.random() * 2400, ctx.currentTime, 0.03);
      set(loops.fire, Math.min(0.5, Math.sqrt(ev.fire) * 0.012), 0.15);
      set(loops.tap, Kitchen.tap.on ? 0.12 : 0, 0.1);
      set(loops.rain, Kitchen.alarm.sprinkler > 0 ? 0.16 : 0, 0.3);
      bubbleT -= dt; popT -= dt; alarmT -= dt; rattleT -= dt;
      if (ev.rattle > 0 && rattleT <= 0) { rattleT = 0.07 + Math.random() * 0.05; blip(2300 + Math.random() * 900, 0.035, 0.05, 'square'); burst(0.04, 0.12, 'highpass', 3500, 1); }
      if (ev.spit > 0 && popT <= 0) { popT = 0.04; burst(0.06, Math.min(0.35, 0.12 + ev.spit * 0.03), 'highpass', 2600 + Math.random() * 2000, 0.8); }
      if (ev.lidpop > 0) { burst(0.8, 0.5, 'bandpass', 500, 0.5, 0, 3000); blip(520, 0.6, 0.14, 'triangle', 0.02, 260); }
      if (ev.bubble > 0 && bubbleT <= 0) { bubbleT = 0.05 + Math.random() * 0.12; const f = 240 + Math.random() * 360; blip(f, 0.07, Math.min(0.12, 0.03 + ev.bubble * 0.01), 'sine', 0, f * 1.9); }
      if (ev.pop > 0 && popT <= 0) { popT = 0.035; burst(0.05, 0.4, 'bandpass', 900 + Math.random() * 900, 1.4); blip(140, 0.06, 0.12, 'sine', 0, 70); }
      if (ev.flare > 0) burst(0.7, 0.6, 'lowpass', 1600, 0.7, 0, 140);
      if (Kitchen.alarm.beeping && alarmT <= 0) { alarmT = 0.6; blip(3150, 0.18, 0.08, 'square'); blip(3150, 0.18, 0.08, 'square', 0.25); }
    },
    click() { blip(1500, 0.04, 0.05, 'square'); },
    plop() { burst(0.08, 0.2, 'lowpass', 700, 1, 0, 200); },
    scoop() { burst(0.12, 0.12, 'bandpass', 1200, 1, 0, 500); },
    ding() { blip(1320, 0.5, 0.12, 'triangle'); blip(1760, 0.6, 0.1, 'triangle', 0.09); },
    coins(n) { for (let k = 0; k < Math.min(6, n); k++) blip(1900 + k * 140, 0.08, 0.06, 'square', k * 0.06); },
    sad() { blip(330, 0.25, 0.1, 'triangle'); blip(247, 0.4, 0.1, 'triangle', 0.2); },
    fanfare() { [523, 659, 784, 1047].forEach((f, k) => blip(f, 0.25, 0.09, 'square', k * 0.1)); },
    whoosh() { burst(0.5, 0.35, 'bandpass', 600, 0.6, 0, 2400); },
    meow() { blip(620, 0.16, 0.07, 'triangle', 0, 900); blip(900, 0.34, 0.07, 'triangle', 0.14, 470); blip(1240, 0.3, 0.02, 'sine', 0.14, 700); },
    hiss() { burst(0.45, 0.18, 'highpass', 3800, 0.7); },
  };
})();
