/* ============================================================
   Start everything. A republish of this page keeps the computer
   switched on (it skips the boot) through the viewer's live hook.
   ============================================================ */
function startBurnware(data) {
  Store.load(); FS.load();
  Wall.scheme(Store.data.scheme);
  Desktop.init(); Start.init(); Tuko.init();
  AI.get();   // find out early whether Claude can play DialUpDan here
  let rz = null;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { Wall.paint(); for (const w of WM.wins) if (w.onResize) w.onResize(); }, 150); });
  for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel']) addEventListener(ev, () => Saver.bump(), { passive: true });
  setInterval(() => Saver.tick(), 1000);
  addEventListener('pointerdown', () => { const a = document.activeElement; if (a && a.tagName === 'IFRAME') a.blur(); }, true);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && Start.open) Start.toggle(false); if ((e.key === 'Meta' || (e.ctrlKey && e.key === 'Escape')) && Boot.ready) Start.toggle(); });
  try { window.claude?.hot?.snapshot?.(() => ({ burnware: 1, on: Boot.ready })); } catch (e) { /* no live updates here */ }
  Wall.paint();
  if (data && data.burnware === 1 && data.on) { Boot.powerOn(true); return; }   // a new version loaded in place: stay on
  const btn = $('#powerBtn');
  btn.onclick = () => Boot.powerOn(false);
  addEventListener('keydown', function k(e) { if ($('#power')) { removeEventListener('keydown', k); Boot.powerOn(false); } });
  setTimeout(() => btn.focus(), 50);
}
window.claude?.hot?.ready ? window.claude.hot.ready(startBurnware) : startBurnware(window.claude?.hot?.data ?? {});
