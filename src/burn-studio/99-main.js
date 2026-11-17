/* ============================================================
   Start-up: a song from a shared link, else the one you were
   making, else the demo. Then the playhead, the LCD and the
   level meters follow the music on every frame.
   ============================================================ */
function start() {
  const peek = /&peek$/.test(location.hash);   // "&peek": a song opened just to look at; it is never saved over your own
  const linked = location.hash.startsWith('#s=') ? unpackSong(location.hash.slice(3).replace(/&peek$/, '')) : null;
  App.song = linked || Store.load() || demoSong();
  if (linked && peek) { App.peek = true; App.track = Math.max(0, App.song.tracks.findIndex(t => t.kind === 'keys')); }
  if (linked) history.replaceState(null, '', location.pathname + location.search);
  UI.init(); Typing.init(); UI.all();
  let lastScene = -1;
  const frame = () => {
    requestAnimationFrame(frame);
    if (!Seq.playing || !Audio.ctx) return;
    const c = Seq.now(); if (!c) return;
    UI.head(c.scene === App.scene ? c.step : -1); UI.lcd(); UI.meters();
    if (c.scene !== lastScene) { lastScene = c.scene; UI.scenes(); }
  };
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { if (document.hidden && Seq.playing) Seq.stop(); });
  const touch = matchMedia('(pointer: coarse)').matches;
  toast(App.peek ? 'Someone left you this song. Press ▶ (your own song is safe).' : linked ? 'Song loaded from the link. Press ▶' : touch ? 'Press ▶ to play. Tap the grid to add notes.' : 'Press ▶ (or Space) to play. A–K play notes.');
}
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start();
