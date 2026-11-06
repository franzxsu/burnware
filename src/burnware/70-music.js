/* ============================================================
   MixBurner: a little skinned music player with a spectrum
   analyser. The two songs were made from scratch in code.
   ============================================================ */
const Music = {
  audio: null, src: null, analyser: null, i: 0, repeat: true, muted: false,
  ensure() {
    if (this.audio) return;
    this.audio = new Audio(); this.audio.preload = 'auto'; this.audio.crossOrigin = 'anonymous';
    this.audio.addEventListener('ended', () => { if (this.i < TRACKS.length - 1 || this.repeat) this.play((this.i + 1) % TRACKS.length); });
    this.setMuted(!Store.data.sound);
  },
  hook() {   // route through the analyser once audio is allowed to start
    if (this.analyser || !Sound.ctx) return;
    try { const c = Sound.ctx; this.src = c.createMediaElementSource(this.audio); this.analyser = c.createAnalyser(); this.analyser.fftSize = 256; this.src.connect(this.analyser); this.analyser.connect(c.destination); } catch (e) { this.analyser = null; }
  },
  load(i) { this.ensure(); this.i = (i + TRACKS.length) % TRACKS.length; this.audio.src = TRACKS[this.i].src; },
  play(i) { Sound.init(); this.ensure(); if (i !== undefined && (i !== this.i || !this.audio.src)) this.load(i); else if (!this.audio.src) this.load(0); this.hook(); this.audio.play().catch(() => {}); },
  pause() { if (this.audio) this.audio.pause(); },
  stop() { if (this.audio) { this.audio.pause(); this.audio.currentTime = 0; } },
  setMuted(m) { this.muted = m; if (this.audio) this.audio.muted = m; },
  playing() { return this.audio && !this.audio.paused; },
};
APPS.music = {
  title: 'MixBurner', icon: 'music', w: 330, h: 330, minW: 280, minH: 280, single: true,
  open(win, args) {
    const time = h('div.amptime', '00:00'), marq = h('div.ampmarq'), info = h('div.ampinfo', h('span', '96 kbps'), h('span', '44 kHz'), h('span', 'stereo'));
    const viz = h('canvas.ampviz', { width: 280, height: 54 }), g = viz.getContext('2d');
    const seek = h('input', { type: 'range', min: 0, max: 1000, value: 0, 'aria-label': 'Position' }), vol = h('input', { type: 'range', min: 0, max: 100, value: 80, 'aria-label': 'Volume', style: { flex: '0 0 70px' } });
    const btn = (t, l, fn) => h('button', { text: t, 'aria-label': l, title: l, on: { click: fn } });
    const rep = btn('⟳', 'Repeat', () => { Music.repeat = !Music.repeat; rep.classList.toggle('on', Music.repeat); });
    rep.classList.toggle('on', Music.repeat);
    const list = h('div.amplist', { role: 'listbox', 'aria-label': 'Playlist' });
    win.body.append(h('div.amp', h('div.ampscreen', time, h('div', { style: { minWidth: 0 } }, marq, info), viz),
      h('div.ampctl', btn('⏮', 'Previous', () => Music.play(Music.i - 1)), btn('▶', 'Play', () => Music.play(Music.i)), btn('⏸', 'Pause', () => Music.pause()), btn('⏹', 'Stop', () => Music.stop()), btn('⏭', 'Next', () => Music.play(Music.i + 1)), rep),
      h('div.ampctl', seek, h('span', { style: { fontSize: '11px' } }, 'vol'), vol), list));
    const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
    const renderList = () => list.replaceChildren(...TRACKS.map((t, k) => { const d = h('div' + (k === Music.i ? '.cur' : ''), { role: 'option', 'aria-selected': String(k === Music.i) }, `${k + 1}. ${t.artist} - ${t.title}  (${fmt(t.dur)})`); d.ondblclick = d.onclick = () => Music.play(k); return d; }));
    let off = 0, raf = null, seeking = false;
    seek.addEventListener('input', () => { seeking = true; }); seek.addEventListener('change', () => { if (Music.audio && Music.audio.duration) Music.audio.currentTime = seek.value / 1000 * Music.audio.duration; seeking = false; });
    vol.addEventListener('input', () => { Music.ensure(); Music.audio.volume = vol.value / 100; });
    const bars = new Uint8Array(128), peaks = new Float32Array(28);
    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (win.min) return;
      const a = Music.audio, t = TRACKS[Music.i];
      time.textContent = fmt(a ? a.currentTime : 0);
      if (a && a.duration && !seeking) seek.value = Math.round(a.currentTime / a.duration * 1000);
      off = (off + 0.6) % 400; const label = `${Music.i + 1}. ${t.artist} - ${t.title} (${fmt(t.dur)})  ***  `; marq.textContent = (label + label).slice(Math.floor(off / 8) % label.length).slice(0, 60);
      g.fillStyle = '#000'; g.fillRect(0, 0, viz.width, viz.height);
      const n = 28, bw = viz.width / n;
      if (Music.analyser && Music.playing()) Music.analyser.getByteFrequencyData(bars);
      else for (let k = 0; k < bars.length; k++) bars[k] = Music.playing() ? 60 + Math.random() * 120 : Math.max(0, bars[k] * 0.9);
      for (let k = 0; k < n; k++) {
        const v = bars[Math.floor(Math.pow(k / n, 1.6) * 100) + 1] / 255, hgt = Math.round(v * (viz.height - 2));
        for (let y = 0; y < hgt; y += 3) { const u = y / viz.height; g.fillStyle = u > 0.75 ? '#ff4a3a' : u > 0.5 ? '#ffd23a' : '#5cff8a'; g.fillRect(k * bw + 1, viz.height - 1 - y - 2, bw - 2, 2); }
        peaks[k] = Math.max(peaks[k] - 0.6, hgt); g.fillStyle = '#c8e6ff'; g.fillRect(k * bw + 1, viz.height - 2 - peaks[k], bw - 2, 1);
      }
      if (renderList.cur !== Music.i) { renderList.cur = Music.i; renderList(); }
    };
    renderList();
    win.onClose = () => { cancelAnimationFrame(raf); Music.stop(); };
    win.reopen = (w, a) => { if (a.track !== undefined) Music.play(a.track); };
    draw();
    if (args.track !== undefined) Music.play(args.track); else Music.play(0);
  },
};
