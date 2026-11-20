/* ============================================================
   Dream Machine: start-up. Open the dream in the link if there is
   one (so shared links work), otherwise a new one.
   ============================================================ */
(function start() {
  if (typeof THREE === 'undefined') { $('#loading').textContent = 'The dream needs a connection to load (three.js could not be reached).'; return; }
  App.init();
  const q = new URLSearchParams(location.hash.slice(1)), rules = {};
  for (const R of RULES) { const v = q.get(R.id); if (v && R.opts.some(o => o[0] === v)) rules[R.id] = v; }
  App.dream(q.get('seed') || newSeed(), rules);
  requestAnimationFrame((n) => App.frame(n));
})();
