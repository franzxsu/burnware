/* ============================================================
   News & Interests: a button on the taskbar that cycles through
   headlines from the time machine's year, and opens a board of
   top stories, what happened on today's date that year, the
   weather in Ember Village and a word from Tuko.
   ============================================================ */
const NewsBoard = {
  open: false, list: null, i: 0, year: null, el: null, btn: null, label: null, cycleT: null,
  init() {
    this.btn = h('button#newsbtn', { title: 'News & Interests', 'aria-label': 'News and interests', 'aria-expanded': 'false' }, Icons.img('news', 16), this.label = h('span', 'News'));
    $('#start').after(this.btn);
    onTap(this.btn, (e) => { e.stopPropagation(); Sound.click(); this.toggle(); });
    document.addEventListener('pointerdown', (e) => { if (this.open && !e.target.closest('#newsboard') && !e.target.closest('#newsbtn')) this.toggle(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.open) this.toggle(false); });
    this.load();
    this.cycleT = setInterval(() => { this.i++; this.refreshButton(); }, 9000);
  },
  load() {
    const y = News.year(); this.year = y; this.list = null; this.refreshButton();
    News.get(y).then(list => { if (this.year !== y) return; this.list = list; this.i = Math.floor(Math.random() * list.length); this.refreshButton(); if (this.open) this.render(); })
      .catch(() => { if (this.year !== y) return; this.list = []; this.refreshButton(); if (this.open) this.render(); });
  },
  refreshButton() {
    if (!this.btn) return;
    if (this.year !== News.year()) return this.load();
    const L = this.list, e = L && L.length ? L[this.i % L.length] : null;
    this.label.replaceChildren(h('b', String(this.year)), ' ', e ? e.text : L ? 'News & Interests' : 'Dialing the news wire...');
    this.btn.title = e ? `${e.date ? e.date + ', ' : ''}${this.year}: ${e.text}` : 'News & Interests';
  },
  toggle(v) {
    this.open = v !== undefined ? v : !this.open;
    this.btn.classList.toggle('on', this.open); this.btn.setAttribute('aria-expanded', String(this.open));
    if (this.open) { if (Start.open) Start.toggle(false); this.render(); } else if (this.el) { this.el.remove(); this.el = null; }
  },
  weather(month) {   // Ember Village gets a lot of rain
    const W = [['Cool and clear', 19, 'sunny'], ['Breezy', 21, 'cloud'], ['Warm, a little hazy', 26, 'sunny'], ['Hot', 31, 'sunny'], ['Thunderstorms later', 29, 'storm'], ['Rain, then more rain', 25, 'rain'], ['Monsoon rain', 24, 'rain'], ['Typhoon warning', 23, 'storm'], ['Light rain', 24, 'rain'], ['Showers', 25, 'rain'], ['Light rain, cooler', 22, 'rain'], ['Cool evenings', 20, 'cloud']][month];
    return { text: W[0], deg: W[1], icon: { sunny: '☀', cloud: '☁', rain: '☂', storm: '⚡' }[W[2]] };
  },
  render() {
    if (this.el) this.el.remove();
    const y = this.year, L = this.list, now = new Date(), today = `${MONTHS[now.getMonth()]} ${now.getDate()}`;
    const story = (e) => h('li', h('button', { on: { click: () => { this.toggle(false); WM.open('browser', { url: 'burn://news?q=' + y }); } } }, e.date ? h('b', e.date + ', ' + y) : null, e.text));
    const body = h('div.nbbody');
    if (!L) body.append(h('div.nbcard', h('h4', 'Top stories'), h('p', { style: { margin: 0 } }, `Dialing the news wire for ${y}...`)));
    else if (!L.length) body.append(h('div.nbcard', h('h4', 'Top stories'), h('p', { style: { margin: 0 } }, `The news wire is down (couldn't reach Wikipedia for ${y}). Check you're online and open the board again.`)));
    else {
      const top = [...L].sort(() => Math.random() - 0.5).slice(0, 5);
      body.append(h('div.nbcard', h('h4', 'Top stories · ' + y), h('ul', top.map(story))));
      // on this day: events dated today (in that year), else the nearest dated ones
      const dated = L.filter(e => /^[A-Z][a-z]+ \d{1,2}\b/.test(e.date)), key = (e) => { const m = e.date.match(/^([A-Z][a-z]+) (\d{1,2})/); const mi = m ? MONTHS.indexOf(m[1]) : -1; return mi < 0 ? 999 : mi * 31 + +m[2]; };
      const t = now.getMonth() * 31 + now.getDate(); let same = dated.filter(e => key(e) === t), label = 'On this day · ' + today + ', ' + y;
      if (!same.length && dated.length) { const best = Math.min(...dated.map(e => Math.abs(key(e) - t))); same = dated.filter(e => Math.abs(key(e) - t) === best).slice(0, 2); label = `Closest to ${today}, ${y}`; }
      if (same.length) body.append(h('div.nbcard', h('h4', label), h('ul', same.slice(0, 3).map(story))));
    }
    const W = this.weather(now.getMonth());
    body.append(h('div.nbcard', h('h4', 'Weather · Ember Village'), h('div.nbweather', h('span', { style: { fontSize: '30px' } }, W.icon), h('span.deg', W.deg + '°'), h('span', W.text, h('br'), h('small', { style: { color: '#666' } }, 'Bring a banana leaf.')))));
    body.append(h('div.nbcard', h('h4', 'From Tuko'), h('p', { style: { margin: 0 } }, pick(TUKO_LINES))));
    const stepY = (d) => { News.setYear(News.year() + d); this.load(); this.render(); };
    this.el = h('div#newsboard', { role: 'dialog', 'aria-label': 'News and interests' },
      h('div.nbhead', h('span', 'News & Interests'), h('button.btn', { text: '◀', title: 'A year earlier', 'aria-label': 'A year earlier', disabled: y <= News.MIN, on: { click: () => stepY(-1) } }), h('b', String(y)), h('button.btn', { text: '▶', title: 'A year later', 'aria-label': 'A year later', disabled: y >= News.max(), on: { click: () => stepY(1) } })),
      body,
      h('div.nbfoot', h('a', { text: 'Open SparkNet News ›', on: { click: () => { this.toggle(false); WM.open('browser', { url: 'burn://news?q=' + y }); } } }), h('a', { text: 'Change the year', on: { click: () => { this.toggle(false); WM.open('datetime'); } } })),
      h('small', { style: { padding: '0 8px 4px', color: '#666', fontSize: '10px' } }, 'Headlines come from Wikipedia (CC BY-SA).'));
    $('#taskbar').append(this.el);
  },
};
