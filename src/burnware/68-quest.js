/* ============================================================
   STATION 7: a mystery hidden inside Burnware itself.

   This computer had an owner before you. In 1997 it was Station 7
   at an internet cafe, and a girl called Luz left a locked program
   on it for a friend who never came. Five words open it. She hid
   them in the Recycle Bin, behind DIR /A, in a painting, in a song,
   and on a web page that only exists in the past.

   This file: what has been found so far, the files it puts on the
   C: drive, and the hooks into the rest of Burnware.
   68-quest-notes.js is Tuko's notebook, 68-quest-web*.js is her
   website through the years, 68-quest-jar.js is her program.
   ============================================================ */
const Q_LIGHTS = [['NINGNING', 'sparkle'], ['KISLAP', 'a glint'], ['LIWANAG', 'light'], ['SINAG', 'a ray of light'], ['BAGA', 'an ember']];
const Q_SONG = 'WzEsImZvciBtaWdzIiw3NiwwLDcsIm1ham9yIiwxLDAsW1siODA4Iiw5MCwwLDAsNixbIjAuMC4xLjcwLDguMC4xLjcwLDQuMy4xLjM1LDEyLjMuMS4zNSwyLjMuMS4zNSw2LjMuMS4zNSwxMC4zLjEuMzUsMTQuMy4xLjM1IiwiIiwiIiwiIl1dLFsiU3ViIiw3NSwwLDAsNixbIjAuNDcuNC43MCw0LjQ1LjQuNzAsOC40My40LjcwLDEyLjQ1LjQuNzAiLCIiLCIiLCIiXV0sWyJFLVBpYW5vIiw3NSwwLDAsMjUsWyIwLjcxLjQuODUsNC42OS40Ljg1LDguNjcuNC44NSwxMi42OS40Ljg1IiwiIiwiIiwiIl1dLFsiTGVhZCIsNzUsMCwwLDI1LFsiIiwiIiwiIiwiIl1dXV0';
/* The text files. Each paragraph is one long line, so Notepad wraps it to fit any window (or phone). */
const crlf = (s) => s.trim().replace(/\n/g, '\r\n') + '\r\n';
const Q_README = crlf(`
MIGS!!!

(If you are not Migs, close this. It's private. ...ok fine, read it. But be nice.)

December 28, 1997
Kubo Net Cafe, Station 7
(the one by the window)

You promised you'd be back for Christmas and we'd open the jar together. Then the landslide closed the road, and Ate Bing shuts the cafe for good on the 31st. So I'm leaving it here, on OUR station, and hoping.

JAR.EXE is my program. My first real one. It needs FIVE LIGHTS to open. Each light is one word. I hid them the way you taught me to hide things:

1. The first one I threw away, so Ate Bing wouldn't read it. Things you throw away don't go far.

2. The second only shows itself if you ask DOS nicely. Remember? DIR with the slash-A. Then run what you find.

3. The third is in a picture of the night we met. It looks like nothing. Fill the night with light.

4. The fourth was on my homepage, www.alitaptap.net, the very first week it existed. It isn't there now. But you were there THEN.

5. The fifth is our song. Don't just listen. Read it. The notes are the letters.

When you have all five, run JAR.EXE and type them in. Any order.

I'll wait as long as the cafe lets me.

- Luz (alitaptap)

P.S. Don't let Ate Bing format this machine.
`);
const Q_DIARY = crlf(`
LUZ'S DIARY. DO NOT READ.
(This means you, Ate Bing.)

Saved on Station 7 because we don't have a computer at home. Yet.

--- Aug 14, 1996 ---
Brownout. The whole village went dark at 7 and everybody went home except me and the new boy at Station 6, because we had both paid for two hours and Ate Bing does not do refunds. We sat in the dark waiting for the power. Then the fireflies came in through the window. Dozens. He said "they look like tiny monitors." His name is Migs. He is weird.

--- Sep 2, 1996 ---
Migs showed me how to make a web page!! He says every page needs a secret word, so your friends know it's really yours. I put ours right on the page. He says that defeats the purpose.

He calls me alitaptap now. Firefly. Because of the brownout, and because I "can't sit still and glow when I'm right." Fine. Then he is Tala, the star, since he thinks he's so far above everyone.

--- Apr 1, 1997 ---
THE COMET. Ate Bing let us up on the rooftop after closing. Two tails, right over the rice terraces. Migs brought pancit canton. We didn't talk for like an hour. Best night of my life. Do not tell him.

--- Jun 20, 1997 ---
Migs is moving to the city. His dad got a job there. Eight hours by bus. He says he'll be back at Christmas. He PROMISED. "Pangako," he said, like it was a magic word.

I am not crying. Station 7's monitor is just very bright.

--- Oct 9, 1997 ---
Learning QBasic from the library book. I'm making him something. A jar. You put lights in and it opens. It only has to work once.

--- Nov 23, 1997 ---
Wrote him a song in the tracker. Four notes that keep coming back. It's not just a song. He'll get it. He reads everything.

--- Dec 20, 1997 ---
Ate Bing put a sign on the door: KUBO NET CLOSES DEC 31. She's going abroad to work. Everything must go, even the stations.

Every time my hour runs out she still yells "EXTEND?" across the room like nothing is changing. I always say yes. I am out of allowance.

--- Dec 27, 1997 ---
Landslide on the mountain road. No buses. Migs called the cafe phone. He's not coming.

OK. Plan B. I hide the lights. I leave the jar. Station 7 remembers.
`);
const Q_LIGHT1 = crlf(`
(If you are Ate Bing: this is just homework. Very boring. Close it.)

Migs. You found the first one. Of course you checked the bin.

LIGHT 1 is

    N I N G N I N G

It means sparkle. It's my word for the first time my page finished loading and I knew I had made a thing.

Four more.
- L
`);
const Q_BAT = crlf(`
@ECHO OFF
REM  LANTERN.BAT
REM  by alitaptap, Station 7, Dec 1997
REM
REM  Migs: yes, I know you can TYPE
REM  a batch file to read it.
REM  The light is not in here.
REM  I'm not new.
REM  Run it and answer the question.
REM
CALL C:\\STATION7\\LANTERN.COM %1
`);
const Q_PRICES = crlf(`
*** KUBO NET CAFE ***
Ember Village's FIRST internet cafe!
8 stations * 28.8k modem * air-con (when it works)

Internet / games ..... P30 an hour
Typing & printing .... P5 a page
Floppy disk .......... P25
Pancit canton ........ P12
  (with egg) ......... P17
Iced tea ............. P8

RULES (by Ate Bing)
1. No feet on the tower.
2. When your time is up, I will ask you: EXTEND?
3. No saving on the stations.  <-- Luz. I can see your folder. - A.B.
4. No refunds. Not even in a brownout.

*** CLOSING DEC 31, 1997 ***
Thank you for two good years. All 8 stations are for sale. Ask Ate Bing.
`);
const Q_NOTE = crlf(`
hello it is me, tuko.

i was chasing a moth behind the hard drive and i found a folder that is not ours:

    C:\\STATION7

it smells like 1997 and instant noodles. there is a letter in it for somebody called Migs. i do not think he ever read it.

open My Computer and have a look. i started some case notes. i am a detective now.

- tuko
`);
/* LANTERN.BAT: the hidden program behind clue 2 */
const TermProgs = {
  lantern({ print, ask }) {
    print('\nLANTERN.BAT  (c) 1997 alitaptap, Station 7\nA lantern only lights for people who were there.\n', 'hot');
    print('Every time my hour ran out, what did Ate Bing yell across the room?');
    ask('>', (v) => {
      if (!/extend/i.test(v)) return print(v ? '\nThe lantern stays dark.  (It\'s in my diary, Migs.)\n' : '\nThe lantern waits. Run it again when you know.\n', 'err');
      Sound.chord();
      print('\n...the lantern flickers...\n\n    .---.\n   (  *  )\n    \'---\'\n     |_|\n\nLIGHT 2 is   K I S L A P\n\nIt means a glint. Like a comet\'s tail, seen from a rooftop.\n\nThree more.\n', 'hot');
      Quest.lead('bat');
    });
  },
};
const Quest = {
  get s() {
    const d = Store.data; if (!d.quest) d.quest = {};
    const q = d.quest; q.leads = q.leads || {}; q.eras = q.eras || {}; q.hint = q.hint || {}; if (!Array.isArray(q.lights) || q.lights.length !== 5) q.lights = [0, 0, 0, 0, 0];
    return q;
  },
  save() { Store.save(); if (typeof QuestNotes !== 'undefined') QuestNotes.refresh(); },
  /* ---- the files ---- */
  station() {
    const F = FS.file.bind(FS);
    return FS.dir('STATION7', [
      F('READ ME MIGS.txt', 'txt', { text: Q_README }), F('diary.txt', 'txt', { text: Q_DIARY }),
      F('night.bmp', 'img', { gen: 'night' }), F('our song.bsg', 'song', { hash: '#s=' + Q_SONG + '&peek', text: 'BSG1 tracker module: for migs' }),
      F('JAR.EXE', 'app', { app: 'jar' }), F('LANTERN.BAT', 'bat', { hidden: true, prog: 'lantern', text: Q_BAT }), F('KUBONET.TXT', 'txt', { text: Q_PRICES }),
    ]);
  },
  /* put the case on the C: drive (once; again only if you ask for the files back) */
  seed(force) {
    const s = this.s; if (!FS.root || (s.seeded && !force)) return;
    const kids = FS.root.children, old = kids.findIndex(c => c.name.toUpperCase() === 'STATION7');
    if (old >= 0) kids.splice(old, 1);
    kids.push(this.station());
    FS.bin = FS.bin.filter(n => !n.quest); FS.bin.push(FS.file('not important.txt', 'txt', { text: Q_LIGHT1, from: 'C:\\STATION7', quest: 'bin' }));
    const desk = FS.resolve('C:\\Desktop') || FS.mkdir('C:\\Desktop');
    if (desk && !s.started && !desk.children.some(c => c.name === 'note from tuko.txt')) desk.children.push(FS.file('note from tuko.txt', 'txt', { text: Q_NOTE }));
    s.seeded = true; Store.save(); FS.save();
  },
  /* ---- finding things ---- */
  lead(id) {
    const s = this.s; if (s.leads[id]) return false;
    s.leads[id] = Date.now(); s.started = true; this.icon(); this.marks(); this.save();
    const n = Q_NOTES[id]; if (n && Boot.ready) Tuko.say('New case note: ' + n[0], 6500, [['Open my notes', () => WM.open('casefile')]]);
    return true;
  },
  era(id) { const s = this.s; if (s.eras[id]) return; s.eras[id] = Date.now(); if (s.started) this.save(); else Store.save(); },
  light(i) { const s = this.s; if (s.lights[i]) return false; s.lights[i] = 1; s.started = true; this.icon(); this.save(); return true; },
  onOpen(path) {
    const p = String(path).toLowerCase();
    if (p.startsWith('c:\\station7') || p.endsWith('note from tuko.txt')) this.lead('start');
    if (p.endsWith('read me migs.txt')) this.lead('readme');
    if (p.endsWith('station7\\not important.txt')) this.lead('bin');
    if (p.endsWith('our song.bsg')) this.lead('song');
  },
  painted(path) { if (path && /station7\\night\.bmp$/i.test(path)) this.lead('paint'); },
  begin() { this.lead('start'); WM.open('explorer', { path: 'C:\\STATION7' }); },
  /* ---- what to do next, for hints ---- */
  stage() {
    const s = this.s, L = s.leads;
    if (!L.readme) return 'start';
    const found = [L.bin, L.bat, L.paint, L.web96, 0];
    for (let i = 0; i < 5; i++) if (!s.lights[i] && !found[i]) return 'L' + (i + 1);
    if (s.lights.includes(0)) return 'type';
    if (!s.opened) return 'jar';
    if (!s.caught) return 'catch';
    return s.closed ? 'done' : 'tell';
  },
  /* is everything the case needs still on the C: drive? (people empty Recycle Bins) */
  missing() {
    const s = this.s, need = ['READ ME MIGS.txt', 'diary.txt', 'JAR.EXE'];
    if (!s.lights[1] && !s.leads.bat) need.push('LANTERN.BAT'); if (!s.lights[2] && !s.leads.paint) need.push('night.bmp'); if (!s.lights[4]) need.push('our song.bsg');
    if (need.some(f => !FS.resolve('C:\\STATION7\\' + f))) return true;
    return !s.lights[0] && !s.leads.bin && !FS.bin.some(n => n.quest === 'bin') && !FS.resolve('C:\\STATION7\\not important.txt');
  },
  hint() {
    if (!this.s.closed && this.missing()) return { text: 'Uh oh. Some of the case files are gone (deleted, or the Recycle Bin was emptied). In this notebook, open the Notes menu and choose "Put the case files back".', n: 1, of: 1 };
    const s = this.s, st = this.stage(), list = Q_HINTS[st], k = Math.min(s.hint[st] || 0, list.length - 1);
    s.hint[st] = k + 1; Store.save();
    return { text: list[k], n: k + 1, of: list.length };
  },
  /* ---- the end: tell her, and the fireflies come home ---- */
  close(name) {
    const s = this.s; s.name = String(name || '').trim().slice(0, 24); s.closed = Date.now(); this.lead('closed');
    Store.data.wall = 'fireflies'; this.save(); Wall.paint(); Sound.tada();
    setTimeout(() => Tuko.say('Um. There are fireflies on the desktop. They came down the phone line. I am trying VERY hard not to eat them. (You can change the wallpaper back in Display Properties.)', 16000), 2500);
  },
  /* ---- plumbing ---- */
  marks() { if (this.s.leads.readme && !Web.bookmarks.some(b => b[1] === 'www.alitaptap.net')) Web.bookmarks.push(['alitaptap (from the READ ME)', 'www.alitaptap.net']); },
  icon() {
    if (!this.s.started || Desktop.items.some(it => it.label === 'Case Notes')) return;
    Desktop.items.push({ label: 'Case Notes', icon: 'casefile', open: () => WM.open('casefile') });
    if (Boot.ready) Desktop.render();
  },
  init() {
    this.icon(); this.marks(); Flies.sync();
    /* Tuko brings it up a few seconds after start-up (a good while later on a first visit, so his welcome goes first) */
    const first = !!Store.data.firstBoot; let waited = 0;
    const wait = setInterval(() => {
      if (!Boot.ready) return; waited += 1;
      if (this.s.started) return clearInterval(wait);
      if (waited < (first ? 50 : 7) || $('#tuko .bubble') || WM.wins.some(w => w.hosted && !w.min)) return;
      clearInterval(wait);
      Tuko.say('Psst. I was chasing a moth behind the hard drive and I found a folder that is not ours. C:\\STATION7. Somebody used this computer before us.', 40000, [['Show me', () => this.begin()], ['Later', () => {}]]);
    }, 1000);
  },
};
/* fireflies drifting over the desktop: the "Firefly night" wallpaper you earn at the end */
const Flies = {
  el: null,
  sync() {
    const on = Store.data.wall === 'fireflies' && !!(Store.data.quest && Store.data.quest.closed);
    if (!on) { if (this.el) { this.el.remove(); this.el = null; } return; }
    if (this.el) return;
    gameCSS('css-flies', `
#flies { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
#flies span { position: absolute; animation: fly-x linear infinite alternate; }
#flies i { display: block; width: 4px; height: 4px; border-radius: 50%; background: #f2ff9c; box-shadow: 0 0 6px 3px rgba(200,255,90,.55), 0 0 16px 7px rgba(170,255,60,.22); animation: fly-y ease-in-out infinite alternate, fly-glow ease-in-out infinite; }
@keyframes fly-x { from { transform: translateX(-9vw); } to { transform: translateX(9vw); } }
@keyframes fly-y { from { transform: translateY(-7vh); } to { transform: translateY(7vh); } }
@keyframes fly-glow { 0%, 100% { opacity: .15; } 45%, 60% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { #flies span, #flies i { animation: none; } }
`);
    const R = mulberry(1997);
    this.el = h('div#flies', { 'aria-hidden': 'true' }, Array.from({ length: 16 }, () => h('span', { style: { left: (6 + R() * 88) + '%', top: (28 + R() * 60) + '%', animationDuration: (14 + R() * 18) + 's', animationDelay: (-R() * 20) + 's' } },
      h('i', { style: { animationDuration: `${9 + R() * 12}s, ${2.4 + R() * 3.5}s`, animationDelay: `${-R() * 12}s, ${-R() * 5}s` } }))));
    $('#wall').after(this.el);
  },
};
/* pictures: the night she met him (clue 3), and the wallpaper from the ending */
Gen.night = function (g, w, h) {
  g.fillStyle = '#000000'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#010101'; g.textAlign = 'center'; g.textBaseline = 'middle';   // one shade off black: invisible until the sky around it changes colour
  g.font = `bold ${Math.floor(w / 6.4)}px Arial, Helvetica, sans-serif`; g.fillText('LIWANAG', w / 2, h * 0.42);
  g.font = `bold ${Math.floor(w / 22)}px Arial, Helvetica, sans-serif`; g.fillText('LIGHT 3.  It means light.', w / 2, h * 0.66);
  const R = mulberry(814); g.fillStyle = '#ffffff'; for (let k = 0; k < 26; k++) g.fillRect(Math.floor(R() * w), Math.floor(R() * h * 0.9), 1, 1);
  g.fillStyle = '#4a4a4a'; g.font = '11px "Courier New", monospace'; g.textAlign = 'right'; g.fillText('the night we met. 8/14/96  -L', w - 8, h - 10); g.textAlign = 'left';
};
Gen.fireflies = function (g, w, h) {
  this.sky(g, w, h, [[0, '#03051a'], [0.7, '#0c1a44'], [1, '#16305a']]); const R = mulberry(97);
  for (let k = 0; k < w * h / 260; k++) { const b = 110 + R() * 130; g.fillStyle = `rgb(${b},${b},${Math.min(255, b + 30)})`; g.fillRect(Math.floor(R() * w), Math.floor(R() * h * 0.7), 1, 1); }
  this.ridge(g, w, h, h * 0.8, h * 0.05, '#081226', 7); this.ridge(g, w, h, h * 0.9, h * 0.03, '#050b18', 3);
  /* the cafe, with one window still lit */
  const bw = Math.max(26, Math.floor(w * 0.16)), bh = Math.floor(bw * 0.55), bx = Math.floor(w * 0.6), by = Math.floor(h * 0.86) - bh;
  g.fillStyle = '#04070f'; g.fillRect(bx, by, bw, bh + 4); g.fillRect(bx - 2, by - 2, bw + 4, 3); g.fillRect(bx + bw - 7, by - 9, 3, 8);
  g.fillStyle = '#ffd84a'; g.fillRect(bx + 4, by + Math.floor(bh * 0.35), Math.floor(bw * 0.28), Math.floor(bh * 0.34));
  g.fillStyle = '#fff4b0'; g.fillRect(bx + 5, by + Math.floor(bh * 0.35) + 1, Math.floor(bw * 0.1), 2);
};
/* hooks: opening a file, restoring from the bin, a fresh C: drive, the wallpaper, start-up */
(() => {
  const open0 = Files.openFile; Files.openFile = function (path) { const r = open0.call(this, path); Quest.onOpen(path); return r; };
  const load0 = FS.load.bind(FS); FS.load = function () { load0(); Quest.seed(); };
  const reset0 = FS.reset.bind(FS); FS.reset = function () { reset0(); Quest.seed(true); };
  const paint0 = Wall.paint.bind(Wall); Wall.paint = function () { paint0(); Flies.sync(); };
  const init0 = Tuko.init.bind(Tuko); Tuko.init = function () { init0(); Quest.init(); };
})();
