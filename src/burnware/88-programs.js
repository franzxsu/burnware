/* ============================================================
   The programs from earlier burns. Each big one runs in its own
   frame from apps/, inside a Burnware window. Rain.wav plays in
   the Media Player. Kaiju Rampage is still being built.
   ============================================================ */
const HOSTED = [
  { id: 'omni', title: 'Omnigacha', icon: 'gacha', src: 'apps/omnigacha.html', w: 460, h: 800, blurb: 'A gacha machine that pulls for everything.' },
  { id: 'pebble', title: 'Pebble Dash', icon: 'car', src: 'apps/pebble-dash.html', w: 1020, h: 640, blurb: 'Tiny rally cars. Loose gravel. Big slides.' },
  { id: 'sizzle', title: 'Sizzle Sand', icon: 'pan', src: 'apps/sizzle-sand.html', w: 960, h: 700, blurb: 'A kitchen where every grain is simulated.' },
];
const Host = {
  mount(win, a) {
    const frame = h('iframe.appframe', { src: a.src, title: a.title, allow: 'autoplay; fullscreen; gamepad; accelerometer; gyroscope', allowfullscreen: true });
    const veil = h('div.appveil', Icons.img(a.icon), h('span', 'Loading ' + a.title + '...'));
    const full = () => {
      const go = frame.requestFullscreen || frame.webkitRequestFullscreen;
      if (go) { const p = go.call(frame); if (p && p.catch) p.catch(() => window.open(a.src, '_blank', 'noopener')); }
      else window.open(a.src, '_blank', 'noopener');   // phones that can't do it for a frame get a tab instead
    };
    const bar = h('div.toolbar.appbar',
      tapBtn('↻ Restart', 'Start ' + a.title + ' again', () => { Sound.click(); veil.hidden = false; frame.src = a.src; }),
      tapBtn('⛶ Full screen', 'Give it the whole screen', () => { Sound.click(); full(); }),
      tapBtn('↗ New tab', 'Open it in a new tab', () => { window.open(a.src, '_blank', 'noopener'); }),
      h('span.appblurb', a.blurb));
    win.body.append(bar, h('div.apphost.sunk', frame, veil));
    const bubble = Tuko.el && Tuko.el.querySelector('.bubble'); if (bubble) { bubble.remove(); Tuko.el.classList.remove('talking'); }   // Tuko hushes when a big program opens
    frame.addEventListener('load', () => {
      veil.hidden = true;
      try {   // same site: clicks inside the frame bring its window forward and keep the screen saver away
        const cw = frame.contentWindow;
        cw.addEventListener('pointerdown', () => { if (WM.active !== win) WM.focus(win); Saver.bump(); if (Start.open) Start.toggle(false); $$('.ctx').forEach(c => c.remove()); }, true);
        cw.addEventListener('keydown', () => Saver.bump(), true);
        if (WM.active === win && !isTouch()) cw.focus();   // phones: let the first tap do it
      } catch (e) { /* another origin: the window still works, just without these niceties */ }
    });
    win.focusFrame = () => { try { frame.contentWindow.focus(); } catch (e) { /* ignore */ } };
    win.onClose = () => { try { frame.src = 'about:blank'; } catch (e) { /* ignore */ } };
  },
};
for (const a of HOSTED) APPS[a.id] = { title: a.title, icon: a.icon, w: a.w, h: a.h, minW: 300, minH: 260, center: true, hosted: true, open(win) { Host.mount(win, a); } };
function tapBtn(text, title, fn) { const b = h('button.tool', { text, title }); onTap(b, fn); return b; }
if (!isTouch()) {   // with a mouse and keyboard: when a hosted window comes to the front, hand the keyboard to the program inside it
  const focus = WM.focus.bind(WM);
  WM.focus = (win) => { focus(win); if (win && win.focusFrame && !win.min) setTimeout(() => { if (WM.active === win && !document.body.classList.contains('dragging')) win.focusFrame(); }, 0); };
}

/* ---------- Media Player ---------- */
const Video = {
  el: null,
  playing() { return !!(this.el && this.el.isConnected && !this.el.paused && !this.el.ended); },
};
{
  const setMuted = Music.setMuted.bind(Music);
  Music.setMuted = (m) => { setMuted(m); if (Video.el) Video.el.muted = m; };
}
const fmtT = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
APPS.video = {
  title: 'Media Player', icon: 'video', w: 720, h: 480, minW: 300, minH: 250, center: true,
  open(win, args = {}) {
    const src = args.src || 'media/rain-wav.mp4', name = args.title || 'rain-wav.mp4';
    WM.setTitle(win, name + ' - Media Player');
    const v = h('video', { poster: 'media/rain-wav.jpg', preload: 'metadata', 'aria-label': name });
    v.append(h('source', { src, type: 'video/mp4' }));   // H.264 first (Safari, Chrome, Edge), then a WebM copy for browsers without it
    if (/\.mp4$/i.test(src)) v.append(h('source', { src: src.replace(/\.mp4$/i, '.webm'), type: 'video/webm' }));
    v.playsInline = true; v.setAttribute('playsinline', ''); v.muted = !Store.data.sound; v.volume = 0.8;
    const play = h('button.tool.vbtn', { text: '▶', 'aria-label': 'Play' }), stop = h('button.tool.vbtn', { text: '■', 'aria-label': 'Stop' });
    const seek = h('input.seek', { type: 'range', min: 0, max: 1000, value: 0, step: 1, 'aria-label': 'Position' });
    const time = h('span.vtime', '0:00 / 0:00');
    const vol = h('input.vvol', { type: 'range', min: 0, max: 100, value: 80, 'aria-label': 'Volume' });
    const big = h('button.tool.vbtn', { text: '⛶', 'aria-label': 'Full screen', title: 'Full screen' });
    const stage = h('div.vstage', v), status = h('span', 'Ready'), meta = h('span', name);
    win.body.append(stage, h('div.vctl', play, stop, seek, time, h('span.vlbl', 'Vol'), vol, big), h('div.status', status, meta));
    Video.el = v;
    let dragging = false;
    const sync = () => {
      const d = v.duration || 0; if (!dragging && d) seek.value = Math.round(v.currentTime / d * 1000);
      time.textContent = fmtT(v.currentTime) + ' / ' + fmtT(d);
      play.textContent = v.paused ? '▶' : '❚❚'; play.setAttribute('aria-label', v.paused ? 'Play' : 'Pause');
      status.textContent = v.ended ? 'Finished' : v.paused ? (v.currentTime ? 'Paused' : 'Ready') : 'Playing';
    };
    const toggle = () => { Sound.init(); if (v.paused || v.ended) { if (Music.playing()) Music.pause(); v.play().catch(() => { status.textContent = 'Press play again to start'; }); } else v.pause(); };
    let clickT = null;   // one click plays or pauses; a double click goes full screen instead
    play.onclick = toggle; stage.onclick = () => { clearTimeout(clickT); clickT = setTimeout(toggle, 230); };
    stop.onclick = () => { v.pause(); v.currentTime = 0; sync(); };
    seek.addEventListener('input', () => { dragging = true; const d = v.duration || 0; time.textContent = fmtT(seek.value / 1000 * d) + ' / ' + fmtT(d); });
    seek.addEventListener('change', () => { const d = v.duration || 0; if (d) v.currentTime = seek.value / 1000 * d; dragging = false; sync(); });
    vol.addEventListener('input', () => { v.volume = vol.value / 100; });
    const goBig = () => { const el = stage; const f = el.requestFullscreen || el.webkitRequestFullscreen; if (f) f.call(el); else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen(); };
    big.onclick = goBig; stage.ondblclick = (e) => { e.preventDefault(); clearTimeout(clickT); goBig(); };
    for (const ev of ['timeupdate', 'play', 'pause', 'ended', 'loadedmetadata', 'seeked']) v.addEventListener(ev, sync);
    v.addEventListener('waiting', () => { status.textContent = 'Buffering...'; });
    v.lastElementChild.addEventListener('error', () => { status.textContent = 'Could not load the video'; });
    v.addEventListener('loadedmetadata', () => { meta.textContent = `${name}  ·  ${v.videoWidth}×${v.videoHeight}  ·  ${fmtT(v.duration)}`; });
    win.body.addEventListener('keydown', (e) => { if (e.key === ' ' && e.target.tagName !== 'INPUT') { e.preventDefault(); toggle(); } });
    win.onClose = () => { v.pause(); v.replaceChildren(); v.load(); if (Video.el === v) Video.el = null; };
    win.playNow = () => { if (v.paused) toggle(); };
    if (args.autoplay) setTimeout(toggle, 60);
  },
};
APPS.video.single = true;
APPS.video.reopen = (w, a) => { if (a && a.autoplay && w.playNow) w.playNow(); };

/* ---------- the one still being built ---------- */
APPS.kaiju = {
  title: 'Kaiju Rampage', icon: 'gecko', w: 400, h: 250, resizable: false, center: true, single: true,
  open(win) {
    const cv = h('canvas', { width: 96, height: 64, style: { width: '120px', height: '80px', imageRendering: 'pixelated', flex: 'none' } });
    Icons.draw(TUKO[0], 4, cv.getContext('2d'), 0, 0);
    win.body.append(
      h('div.teaser', cv, h('div', h('b', 'KAIJU.EXE is still being built.'), h('p', 'Tuko is eating a lot of mosquitoes so he can grow 40 metres tall. When he is big enough, this is where the city gets it.'), h('p', h('small', 'Check back soon.')))),
      h('div.dlgbtns', h('button.btn.def', { text: 'OK', on: { click: () => { Sound.click(); WM.close(win); } } })));
    Sound.ding();
  },
};

/* the new programs go first in the Start menu, and on the desktop right after the system icons */
APP_ORDER.unshift('omni', 'pebble', 'sizzle', 'video', 'kaiju');
APPS.rainwav = Object.assign({}, APPS.video, { title: 'Rain.wav', open(win) { APPS.video.open(win, { src: 'media/rain-wav.mp4', title: 'rain-wav.mp4', autoplay: true }); } });
Desktop.items.splice(3, 0,
  { label: 'Omnigacha', icon: 'gacha', open: () => WM.open('omni') },
  { label: 'Pebble Dash', icon: 'car', open: () => WM.open('pebble') },
  { label: 'Sizzle Sand', icon: 'pan', open: () => WM.open('sizzle') },
  { label: 'Rain.wav', icon: 'video', open: () => WM.open('video', { src: 'media/rain-wav.mp4', title: 'rain-wav.mp4', autoplay: true }) },
  { label: 'Kaiju Rampage', icon: 'gecko', open: () => WM.open('kaiju') });
