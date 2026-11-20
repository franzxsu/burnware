/* ============================================================
   Dream Machine: start-up. A new world every time, unless you
   followed a link to a particular dream (and spot).
   ============================================================ */
(function start() {
  if (!App.init()) return;
  const q = new URLSearchParams(location.hash.slice(1)), rules = {};
  for (const R of RULES) { const v = q.get(R.id); if (v && R.opts.some(o => o[0] === v)) rules[R.id] = v; }
  const at = q.has('x') ? { x: +q.get('x') || 0, z: +q.get('z') || 0, yaw: +q.get('yaw') || 0 } : null;
  App.dream(q.get('seed') || newSeed(), rules, at);
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}   // a reload is a new dream
  requestAnimationFrame((n) => App.frame(n));
})();
