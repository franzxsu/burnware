/* boot: the viewer can hand back settings after a live update */
function boot(data) {
  try { if (data && data.settings) Object.assign(Store.data.settings, data.settings); } catch (e) { /* ignore */ }
  if (typeof THREE === 'undefined') { $('#veilTxt').textContent = 'Could not load the 3D engine. Check the connection and reload.'; return; }
  Game.init();
}
try { window.claude?.hot?.snapshot?.(() => ({ settings: Store.data.settings })); } catch (e) { /* not in a viewer */ }
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
