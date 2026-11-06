/* ============================================================
   The time machine. Click the clock to pick the year Burnware
   lives in; SparkNet News in Wildfire Navigator then shows real
   headlines from that year, read live from the Events section of
   Wikipedia's article about it (and kept in this browser after).
   ============================================================ */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const News = {
  mem: {}, MIN: 1000,
  max() { return new Date().getFullYear(); },
  year() { const y = +Store.data.year; return y >= this.MIN && y <= this.max() ? y : 1998; },
  setYear(y) { y = clamp(Math.round(+y || 1998), this.MIN, this.max()); Store.data.year = y; Store.save(); Clock.tick(); return y; },
  dateString(d = new Date()) { return `${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(this.year(), d.getMonth(), d.getDate()).getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${this.year()}`; },
  async get(y) {
    if (this.mem[y]) return this.mem[y];
    const key = 'burnware-news-' + y;
    try { const s = localStorage.getItem(key); if (s) { const v = JSON.parse(s); if (v && v.length) return (this.mem[y] = v); } } catch (e) { /* no storage: just fetch */ }
    const base = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&origin=*&action=parse&redirects=1&page=' + encodeURIComponent(String(y));
    const sec = await (await fetch(base + '&prop=sections')).json();
    const list = (sec.parse && sec.parse.sections) || [], plain = (s) => String(s.line || '').replace(/<[^>]+>/g, '').trim();
    const ev = list.find(s => /^events$/i.test(plain(s)) && +s.toclevel === 1) || list.find(s => /^events/i.test(plain(s)));
    if (!ev) throw new Error('This year has no events list on Wikipedia.');
    const res = await (await fetch(base + '&prop=text&disableeditsection=1&disabletoc=1&section=' + ev.index)).json();
    const out = this.parse((res.parse && res.parse.text) || '');
    if (!out.length) throw new Error('No headlines found for this year.');
    this.mem[y] = out;
    try { localStorage.setItem(key, JSON.stringify(out)); } catch (e) { /* full: keep it for this visit only */ }
    return out;
  },
  /* turn the article's lists into {group, date, text}: a heading per month, a bullet per event */
  parse(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html'), root = doc.querySelector('.mw-parser-output') || doc.body, out = [];
    let group = '';
    const clean = (el) => { const c = el.cloneNode(true); c.querySelectorAll('ul, ol, sup, style, link, figure, table, .mw-editsection, .reference, .noprint').forEach(x => x.remove()); return c.textContent.replace(/\[[^\]]{0,12}\]/g, '').replace(/\s+/g, ' ').trim(); };
    const push = (date, text) => { text = text.replace(/^[–—:\s]+/, ''); if (text.length < 10) return; out.push({ group, date: date.trim(), text: text.length > 260 ? text.slice(0, 257).replace(/\s+\S*$/, '') + '…' : text }); };
    const split = (s) => { const m = s.match(/^(.{3,40}?)\s+[–—]\s+(.+)$/); return m ? [m[1], m[2]] : null; };
    const item = (li) => {
      const own = clean(li), sub = [...li.children].find(c => c.tagName === 'UL'), sp = split(own);
      if (sub) { let date = own; if (sp) { push(sp[0], sp[1]); date = sp[0]; } for (const s of sub.children) if (s.tagName === 'LI') { const t = clean(s), sp2 = split(t); if (sp2) push(sp2[0], sp2[1]); else push(date, t); } }
      else if (sp) push(sp[0], sp[1]); else push('', own);
    };
    const walk = (node) => {
      for (const el of node.children) {
        const tag = el.tagName;
        if (/^H[2-5]$/.test(tag) || el.classList.contains('mw-heading')) { const t = el.textContent.trim(); if (!/^events$/i.test(t)) group = t; continue; }
        if (tag === 'UL') { for (const li of el.children) if (li.tagName === 'LI') item(li); continue; }
        if (tag === 'DIV' || tag === 'SECTION') walk(el);
      }
    };
    walk(root);
    return out;
  },
  esc(s) { return esc(s); },
};
/* ---------- the taskbar clock and Date/Time Properties ---------- */
const Clock = {
  tick() { const c = $('#clock'); if (!c) return; c.textContent = fmtClock(); c.title = News.dateString() + ' (click to time travel)'; },
};
APPS.datetime = {
  title: 'Date/Time Properties', icon: 'clock', w: 340, h: 330, resizable: false, single: true, center: true,
  open(win) {
    const now = new Date(); let y = News.year();
    const yr = h('input.field', { type: 'number', min: News.MIN, max: News.max(), value: y, 'aria-label': 'Year', style: { width: '84px' } });
    const mLabel = h('b'), cal = h('div.cal'), note = h('p.small');
    const draw = () => {
      y = clamp(Math.round(+yr.value || y), News.MIN, News.max());
      mLabel.textContent = MONTHS[now.getMonth()] + ' ' + y;
      const first = new Date(y, now.getMonth(), 1).getDay(), days = new Date(y, now.getMonth() + 1, 0).getDate();
      cal.replaceChildren(...['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => h('span.dow', d)), ...Array.from({ length: first }, () => h('span')), ...Array.from({ length: days }, (_, i) => h('span' + (i + 1 === now.getDate() ? '.today' : ''), String(i + 1))));
      note.textContent = y === News.max() ? 'That is now. SparkNet News will show this year so far.' : `Wildfire Navigator's news will come from ${y}.`;
    };
    const step = (d) => { yr.value = clamp(y + d, News.MIN, News.max()); draw(); Sound.click(); };
    yr.addEventListener('input', draw);
    const apply = () => { const v = News.setYear(yr.value); Sound.chord(); return v; };
    win.body.append(h('div.dtp',
      h('div.dtrow', h('button.btn', { text: '◀', 'aria-label': 'Earlier', on: { click: () => step(-1) } }), yr, h('button.btn', { text: '▶', 'aria-label': 'Later', on: { click: () => step(1) } }), h('button.btn', { text: 'Now', on: { click: () => { yr.value = News.max(); draw(); } } })),
      h('div.calbox.sunk', mLabel, cal), note,
      h('p.small', 'The time machine sets the year Burnware lives in. Real headlines come from Wikipedia.')),
      h('div.dlgbtns', h('button.btn.def', { text: 'OK', on: { click: () => { const v = apply(); WM.close(win); Tuko.say(`Whoosh. It is ${v} now. Open SparkNet News in Wildfire Navigator to read the headlines.`, 7000); } } }), h('button.btn', { text: 'Cancel', on: { click: () => WM.close(win) } }), h('button.btn', { text: 'Apply', on: { click: apply } })));
    draw();
  },
};
/* ---------- SparkNet News ---------- */
WEB_PAGES['burn://news'] = {
  title: 'SparkNet News',
  html: (q) => {
    const y = clamp(parseInt(q, 10) || News.year(), News.MIN, News.max()), nb = (d, label) => `<button class="btn" data-y="${y + d}" ${y + d < News.MIN || y + d > News.max() ? 'disabled' : ''}>${label}</button>`;
    return `<div style="background:#fffdf4;min-height:100%;font:14px/1.45 Georgia,'Times New Roman',serif;color:#1a1208">
      <div style="background:linear-gradient(#5c1408,#b8401c);color:#fff;padding:12px 16px 10px"><div style="font:700 28px/1 var(--pix);letter-spacing:1px">SparkNet <span style="color:#ffd46a">News</span></div>
      <div style="font:12px Verdana,sans-serif;opacity:.9">The year in headlines · Time machine set to <b>${y}</b></div></div>
      <div style="display:flex;gap:6px;align-items:center;padding:8px 16px;background:#f3e2c6;flex-wrap:wrap;font:13px Verdana,sans-serif">
        ${nb(-10, '« 10 yrs')}${nb(-1, '◀ ' + (y - 1))}
        <form data-jump style="display:flex;gap:4px"><input class="field" name="y" type="number" min="${News.MIN}" max="${News.max()}" value="${y}" style="width:76px" aria-label="Year"><button class="btn">Go</button></form>
        ${nb(1, (y + 1) + ' ▶')}${nb(10, '10 yrs »')}</div>
      <div data-body style="padding:10px 16px 4px"><p style="font:13px Verdana,sans-serif">Dialing the news wire for ${y}...</p></div>
      <div style="padding:6px 16px 14px;font:11px Verdana,sans-serif;color:#6a5a48">Headlines are the Events section of the Wikipedia article <a href="https://en.wikipedia.org/wiki/${y}" target="_blank" rel="noopener">${y}</a>, shared under CC BY-SA.</div></div>`;
  },
  wire(root, nav, q) {
    const y = clamp(parseInt(root.querySelector('[data-jump] input').value, 10), News.MIN, News.max());
    if (y !== News.year()) News.setYear(y);
    root.querySelectorAll('[data-y]').forEach(b => { b.onclick = () => nav('burn://news?q=' + b.dataset.y); });
    root.querySelector('[data-jump]').onsubmit = (e) => { e.preventDefault(); nav('burn://news?q=' + e.target.y.value); };
    const body = root.querySelector('[data-body]'), token = root._news = Math.random();
    News.get(y).then(list => {
      if (root._news !== token) return;
      const groups = []; for (const e of list) { let g = groups[groups.length - 1]; if (!g || g.name !== e.group) groups.push(g = { name: e.group, items: [] }); g.items.push(e); }
      body.innerHTML = `<p style="font:12px Verdana,sans-serif;color:#6a5a48;margin:0 0 6px">${list.length} stories from ${y}.</p>` + groups.map(g => `<h3 style="font:700 17px Georgia,serif;border-bottom:2px solid #b8401c;margin:14px 0 6px;color:#5c1408">${esc(g.name || String(y))}</h3><ul style="margin:0;padding-left:18px">${g.items.map(e => `<li style="margin:0 0 6px">${e.date ? `<b>${esc(e.date)}</b> · ` : ''}${esc(e.text)}</li>`).join('')}</ul>`).join('');
    }).catch(err => {
      if (root._news !== token) return;
      body.innerHTML = `<p style="font:13px Verdana,sans-serif"><b>The news wire is down.</b> Couldn't reach Wikipedia for ${y} (${esc(err && err.message || 'no connection')}).</p><p style="font:13px Verdana,sans-serif">Check that you're online, then press Refresh. Or try another year.</p>`;
    });
  },
};
{   // SparkNet Home shows five headlines from the year the time machine is set to
  const H = WEB_PAGES['burn://home'], html = H.html, wire = H.wire;
  H.html = (q) => {
    const y = News.year();
    return html(q).replace(/<h3([^>]*)>Today's headlines<\/h3><ul([^>]*)>[\s\S]*?<\/ul>/, (m, a, b) => `<h3${a}>Headlines from ${y}</h3><ul${b} data-news><li>Dialing the news wire...</li></ul><p style="margin:6px 0 0;font-size:12px"><a data-go="burn://news?q=${y}">More from ${y} »</a> · <a href="#" data-clock>Change the year</a></p>`)
      .replace(/Last updated [^·<]*·/, `Last updated ${News.dateString()} ·`);
  };
  H.wire = (root, nav) => {
    wire(root, nav);
    const c = root.querySelector('[data-clock]'); if (c) c.onclick = (e) => { e.preventDefault(); WM.open('datetime'); };
    const ul = root.querySelector('[data-news]'); if (!ul) return; const token = root._news = Math.random();
    News.get(News.year()).then(list => {
      if (root._news !== token) return;
      const pickN = [...list].sort(() => Math.random() - 0.5).slice(0, 5);
      ul.innerHTML = pickN.map(e => `<li>${e.date ? `<b>${esc(e.date)}:</b> ` : ''}${esc(e.text.length > 140 ? e.text.slice(0, 137).replace(/\s+\S*$/, '') + '…' : e.text)}</li>`).join('');
    }).catch(() => { if (root._news === token) ul.innerHTML = HEADLINES.slice(0, 5).map(t => `<li>${t}</li>`).join(''); });
  };
}
Web.bookmarks.splice(1, 0, ['SparkNet News', 'burn://news']);
