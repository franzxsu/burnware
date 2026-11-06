/* ============================================================
   The Games folder: on the desktop and in Start, Programs, like
   Accessories > Games used to be. Holds the classics and the new
   arrivals.
   ============================================================ */
const GAME_IDS = ['mines', 'solitaire', 'spider', 'blocks', 'sudoku', 'words', 'typing', 'snake'];
(() => {
  const i = APP_ORDER.indexOf('solitaire');
  APP_ORDER.splice(i + 1, 0, 'spider', 'blocks', 'sudoku', 'words', 'typing');
  const games = () => FS.dir('Games', GAME_IDS.filter(id => APPS[id]).map(id => FS.file(APPS[id].title + '.lnk', 'app', { app: id })), { icon: 'gamesdir' });
  const addGames = () => { const progs = FS.root && FS.root.children.find(c => c.name === 'Programs'); if (progs && !progs.children.some(c => c.name === 'Games')) progs.children.unshift(games()); };
  const load = FS.load.bind(FS); FS.load = function () { load(); addGames(); };
  const defaults = FS.defaults.bind(FS); FS.defaults = function () { const r = defaults(); const progs = r.children.find(c => c.name === 'Programs'); if (progs) progs.children.unshift(games()); return r; };
  const at = Desktop.items.findIndex(it => it.label === 'Solitaire');
  const sol = Desktop.items.findIndex(it => it.label === 'Solitaire');
  Desktop.items.splice(sol >= 0 ? sol + 1 : Desktop.items.length, 0, ...['spider', 'blocks', 'sudoku', 'words', 'typing'].map(id => ({ label: APPS[id].title, icon: APPS[id].icon, open: () => WM.open(id) })));
  Desktop.items.splice(at >= 0 ? at : Desktop.items.length, 0, { label: 'Games', icon: 'gamesdir', open: () => WM.open('explorer', { path: 'C:\\Programs\\Games' }) });
})();
