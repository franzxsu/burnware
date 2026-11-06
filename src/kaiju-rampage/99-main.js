/* ============================================================
   Start-up: the scene, the city and everyone in it, then the
   show runs one frame at a time.
   ============================================================ */
async function boot() {
  const L = $('#loading');
  Save.load();
  try {
    World.init($('#view'));
    Mesher.init(); Vox.init(World.scene); Debris.init(World.scene); Fx.init(World.scene);
    Kaiju.init(World.scene); Units.init(World.scene);
    Input.init(World.renderer.domElement); HUD.init();
    L.textContent = 'BUILDING THE CITY…';
    await new Promise(r => setTimeout(r, 40));
    Game.build();
    L.hidden = true; Game.toTitle();
    requestAnimationFrame(frame);
  } catch (e) { console.error(e); L.textContent = 'Something went wrong while building the city (' + e.message + '). Try reloading the page.'; }
}
let lastT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
  if (Game.paused) dt = 0;
  if (dt > 0) { Game.update(dt); Debris.update(dt); Fx.update(dt); World.update(dt); }
  Vox.flush(Game.state === 'play' ? 6 : 14);
  HUD.update(dt);
  World.renderer.render(World.scene, World.camera);
}
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot();
