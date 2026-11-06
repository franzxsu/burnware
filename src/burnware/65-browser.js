/* ============================================================
   Wildfire Navigator: the World Wide Web as it was. A dial-up
   connection, pages that load a line at a time, and a handful of
   sites: a portal, a search engine, a homepage with a guestbook,
   a Y2K checker and a dancing gecko.
   ============================================================ */
const Web = {
  connected: false,
  bookmarks: [['SparkNet Home', 'burn://home'], ["JunJun's Totally Rad Homepage", 'www.junjun-rocks.com'], ['Is Your PC Y2K Ready?', 'www.y2k-ready.com'], ['The Dancing Gecko', 'www.dancing-tuko.com'], ['SparkSearch', 'burn://search']],
  norm(u) { u = String(u || '').trim(); if (!u) return 'burn://home'; u = u.replace(/^https?:\/\//i, '').replace(/\/$/, ''); if (!/^burn:/.test(u) && !/^www\./i.test(u) && /\./.test(u)) u = 'www.' + u; return u.toLowerCase().startsWith('burn:') ? u : u.toLowerCase(); },
  /* each page: {title, html(q), wire(root, nav)} */
  page(url) {
    const [base, query] = url.split('?'), q = new URLSearchParams(query || '').get('q') || '';
    const P = WEB_PAGES[base]; if (P) return Object.assign({ q }, P);
    if (/^burn:\/\/search/.test(base)) return Object.assign({ q }, WEB_PAGES['burn://search']);
    return Object.assign({ q: url }, WEB_PAGES['404']);
  },
};
const HEADLINES = ['Scientists confirm the internet is "probably here to stay"', 'Local family gets second phone line so they can be online AND get calls', 'Y2K experts advise: "have a flashlight, just in case"', 'Virtual pets now outnumber real pets in three classrooms', 'Is e-mail the end of the handwritten letter? Readers write in (by e-mail)', 'Man waits 11 minutes for one picture to load, says it was "worth it"', 'New "search engine" finds websites for you. Librarians intrigued'];
const SEARCH_TPL = ['The Official {q} Homepage (Under Construction)', '{q} - Frequently Asked Questions (FAQ)', "Jun-Jun's links about {q} !!!", '10 reasons {q} will be HUGE in the year 2000', '{q} Web Ring - next site >>', "Bob's {q} Page. Best viewed at 800x600"];
const WEB_PAGES = {
  'burn://home': {
    title: 'SparkNet Home',
    html: () => `<div style="background:#eef3ff;min-height:100%;font:14px/1.4 Verdana,Tahoma,sans-serif">
      <div style="background:linear-gradient(#0b3a68,#1d8b98);color:#fff;padding:14px 16px 10px"><div style="font:700 30px/1 var(--pix);letter-spacing:1px">Spark<span style="color:#ffd46a">Net</span></div><div style="font-size:12px;opacity:.85">Your home on the Information Superhighway</div></div>
      <form data-search style="display:flex;gap:6px;padding:10px 16px;background:#dde6ff;flex-wrap:wrap"><input name="q" class="field" style="flex:1;min-width:140px" placeholder="Search the World Wide Web" aria-label="Search"><button class="btn">Search</button></form>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;padding:12px 16px">
        <div><h3 style="margin:0 0 6px;color:#0b3a68">Today's headlines</h3><ul style="margin:0;padding-left:18px">${HEADLINES.slice(0, 5).map(t => `<li>${t}</li>`).join('')}</ul></div>
        <div><h3 style="margin:0 0 6px;color:#0b3a68">Cool sites</h3><ul style="margin:0;padding-left:18px">
          <li><a data-go="www.junjun-rocks.com">JunJun's Totally Rad Homepage</a> <b style="color:#d01818">NEW!</b></li>
          <li><a data-go="www.dancing-tuko.com">The Dancing Gecko</a></li>
          <li><a data-go="www.y2k-ready.com">Is your PC Y2K ready? Free test!</a></li>
          <li><a data-go="www.totally-real-site.com">A site that does not exist</a></li></ul>
          <h3 style="margin:12px 0 6px;color:#0b3a68">Weather</h3><div>Ember Village: light rain, 24°C. More rain tomorrow. Bring a banana leaf.</div></div>
      </div>
      <div style="text-align:center;padding:10px;font-size:11px;color:#555">You are visitor number <b style="font:16px var(--mono);background:#000;color:#5cff8a;padding:0 4px">${String(Math.floor(rand(10000, 99999))).padStart(7, '0')}</b><br>Last updated ${new Date().toDateString()} · Best viewed with Wildfire Navigator 3.0</div></div>`,
    wire(root, nav) { root.querySelector('[data-search]').onsubmit = (e) => { e.preventDefault(); nav('burn://search?q=' + encodeURIComponent(e.target.q.value || 'gecko')); }; },
  },
  'burn://search': {
    title: 'SparkSearch',
    html: (q) => {
      const term = esc(q || 'nothing in particular');
      const results = SEARCH_TPL.map((t, i) => ({ t: t.replace('{q}', term), u: ['www.junjun-rocks.com', 'www.dancing-tuko.com', 'www.y2k-ready.com', 'www.' + (q || 'nothing').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.com', 'www.junjun-rocks.com', 'burn://home'][i] }));
      return `<div style="padding:12px 16px;font:14px/1.4 Verdana,Tahoma,sans-serif"><div style="font:700 24px var(--pix);color:#0b3a68">Spark<span style="color:#d08a10">Search</span></div>
      <form data-search style="display:flex;gap:6px;margin:8px 0 12px;flex-wrap:wrap"><input name="q" class="field" value="${term}" style="flex:1;min-width:140px" aria-label="Search"><button class="btn">Search</button></form>
      <p style="font-size:12px;color:#555">Results 1-6 of about ${Math.floor(rand(200, 2000)).toLocaleString()} for <b>${term}</b>. Search took ${rand(4, 19).toFixed(1)} seconds.</p>
      ${results.map(r => `<p style="margin:0 0 12px"><a data-go="${r.u}" style="font-size:15px">${r.t}</a><br><span style="font-size:12px;color:#060">${r.u}</span><br><span style="font-size:12px">...the best place on the web for ${term}. Updated weekly. Sign the guestbook...</span></p>`).join('')}</div>`;
    },
    wire(root, nav) { root.querySelector('[data-search]').onsubmit = (e) => { e.preventDefault(); nav('burn://search?q=' + encodeURIComponent(e.target.q.value)); }; },
  },
  'www.junjun-rocks.com': {
    title: "~*~ JuNjUn's TOTALLY RAD HoMePaGe ~*~",
    html: () => `<div class="gc" style="min-height:100%;color:#ffff66;font:16px/1.4 var(--comic);background:#000020 radial-gradient(#fff 1px,transparent 1.5px) 0 0/34px 34px,radial-gradient(#ffd 1px,transparent 1.5px) 17px 17px/34px 34px;padding:14px;text-align:center">
      <style>.gc a{color:#66ffff} .gc .blink{animation:blink 1s steps(2) infinite} .gc .mq{overflow:hidden;white-space:nowrap;background:#330066;border:2px ridge #ff66ff} .gc .mq span{display:inline-block;padding-left:100%;animation:mq 11s linear infinite} @keyframes mq{to{transform:translateX(-100%)}} .gc .uc{background:repeating-linear-gradient(45deg,#ffd400 0 14px,#111 14px 28px);color:#000;font:700 15px var(--pix);padding:6px;display:inline-block;margin:8px} .gc .uc b{background:#ffd400;padding:2px 8px} .gc table{margin:10px auto;border:3px outset #ff66ff;background:#220044} .gc td{border:2px inset #ff66ff;padding:6px 10px;text-align:left}</style>
      <h1 style="font:700 30px/1.1 var(--comic);color:#ff66ff;text-shadow:3px 3px #00ffff;margin:6px 0">~*~ WeLcOmE 2 JuNjUn's TOTALLY RAD HoMePaGe ~*~</h1>
      <div class="mq"><span>*** Thanks for visiting!!! *** Please sign my GUESTBOOK *** This page is best viewed at 800x600 *** NO STEALING MY GRAPHICS *** New: I learned the &lt;BLINK&gt; tag ***</span></div>
      <div class="uc"><b>UNDER CONSTRUCTION</b></div>
      <p><span class="blink" style="color:#ff3333;font-weight:700">NEW!!!</span> I got a 56k modem. It is SO fast. I can download a song in like 40 minutes!!!</p>
      <canvas data-gecko width="72" height="48" style="width:108px;height:72px"></canvas>
      <table><tr><td><b>About me</b></td><td>I am 12. I like computers, basketball and my gecko. My dad says the internet is a fad.</td></tr>
      <tr><td><b>My favorite things</b></td><td>Snake on my dad's phone · Minesweeper (beginner) · rainy days · pancit</td></tr>
      <tr><td><b>Cool links</b></td><td><a data-go="www.dancing-tuko.com">The Dancing Gecko!!!</a> · <a data-go="www.y2k-ready.com">Y2K test</a> · <a data-go="burn://home">SparkNet</a></td></tr></table>
      <p><button class="btn" data-midi>♪ Play my song (MIDI)</button></p>
      <h2 style="color:#66ff66;margin:14px 0 4px">~ Sign my Guestbook!!! ~</h2>
      <form data-gb style="display:grid;gap:6px;max-width:360px;margin:0 auto;font:13px var(--ui);color:#000"><input name="n" class="field" maxlength="24" placeholder="Your name" aria-label="Your name"><textarea name="m" class="field" maxlength="200" rows="3" placeholder="Your message" aria-label="Your message"></textarea><button class="btn">Sign it!</button></form>
      <div data-gblist style="max-width:420px;margin:10px auto;text-align:left;font:14px var(--comic)"></div>
      <p style="font-size:13px">&lt;&lt; <a data-go="www.y2k-ready.com">prev</a> | <a data-go="www.dancing-tuko.com">random</a> | <a data-go="burn://home">next</a> &gt;&gt;<br>a member of the <b>Cool Kids Web Ring</b></p>
      <p style="font-size:12px">You are visitor # <b style="font:15px var(--mono);background:#000;color:#ff0;padding:0 3px">0001337</b> since 1998</p></div>`,
    wire(root) {
      const list = root.querySelector('[data-gblist]');
      const show = () => { const g = [{ n: 'JunJun', m: 'first!!! (its my page)' }, { n: 'cool_dude_99', m: 'nice page. check out mine (its not done)' }, ...Store.data.guestbook].slice(-8); list.replaceChildren(...g.map(e => h('p', { style: { margin: '0 0 6px', padding: '4px 6px', background: '#220044', border: '1px dashed #ff66ff' } }, h('b', { style: { color: '#66ffff' } }, e.n), ': ', e.m))); };
      show();
      root.querySelector('[data-gb]').onsubmit = (e) => { e.preventDefault(); const n = e.target.n.value.trim() || 'Anonymous', m = e.target.m.value.trim(); if (!m) return; Store.data.guestbook.push({ n, m }); Store.data.guestbook = Store.data.guestbook.slice(-12); Store.save(); e.target.reset(); show(); Sound.chord(); };
      const midi = root.querySelector('[data-midi]'); let stop = null;
      midi.onclick = () => { Sound.init(); if (stop) { stop(); stop = null; midi.textContent = '♪ Play my song (MIDI)'; return; } stop = Sound.jingle([[72, 1], [76, 1], [79, 1], [76, 1], [77, 2], [74, 2], [72, 1], [74, 1], [76, 2], [0, 2], [79, 1], [81, 1], [79, 1], [77, 1], [76, 2], [72, 2], [74, 2], [71, 2], [72, 4]], 150); midi.textContent = '■ Stop the song'; };
      root._stop = () => stop && stop();
      Web.gecko(root.querySelector('[data-gecko]'));
    },
  },
  'www.y2k-ready.com': {
    title: 'Is Your PC Y2K Ready?',
    html: () => `<div style="padding:16px;font:15px/1.45 var(--serif);background:#fffbe6;min-height:100%">
      <h1 style="font:700 26px var(--serif);color:#a00000;margin:0 0 6px">IS YOUR COMPUTER READY FOR THE YEAR 2000?</h1>
      <p>On January 1st, 2000, computers that store years as two digits may think it is <b>1900</b>. Elevators! Banks! Toasters! Find out NOW if your PC is at risk, with our <b>FREE</b> online test.</p>
      <p style="text-align:center"><button class="btn def" data-test style="font-size:14px;padding:6px 16px">Test my PC now</button></p>
      <div data-out style="font:18px var(--mono);background:#000;color:#5cff8a;padding:10px;min-height:80px;white-space:pre-wrap;display:none"></div>
      <p style="font-size:12px;color:#666">This site is not responsible for any elevators.</p></div>`,
    wire(root) {
      const out = root.querySelector('[data-out]');
      root.querySelector('[data-test]').onclick = async (e) => {
        e.target.disabled = true; out.style.display = 'block'; out.textContent = '';
        const yr = new Date().getFullYear();
        for (const l of ['Scanning BIOS clock...', 'Checking two-digit years...', 'Asking the toaster...', 'Consulting the gecko...', '', `RESULT: It is already ${yr}.`, `The year 2000 came and went ${yr - 2000} years ago.`, 'Everything was mostly fine. You made it. Congratulations!']) { out.textContent += l + '\n'; Sound.key(); await wait(l ? 520 : 300); }
        Sound.tada();
      };
    },
  },
  'www.dancing-tuko.com': {
    title: 'The Dancing Gecko',
    html: () => `<div style="min-height:100%;background:#ff66cc repeating-conic-gradient(#ff66cc 0 25%,#ffcc00 0 50%) 0 0/40px 40px;padding:16px;text-align:center;font:700 18px var(--comic)">
      <div style="background:#fff;border:4px dashed #6600cc;display:inline-block;padding:12px 18px;max-width:92%">
      <h1 style="margin:0;font:700 28px var(--comic);color:#6600cc">THE DANCING GECKO</h1>
      <canvas data-gecko width="72" height="48" style="width:216px;height:144px;margin:8px auto;display:block"></canvas>
      <p style="margin:4px 0" data-count>He has been dancing for 0 seconds.</p>
      <p style="margin:8px 0;color:#d01818;animation:blink 1s steps(2) infinite">CONGRATULATIONS! You are the 1,000,000th visitor!</p>
      <button class="btn" data-prize>Claim my prize</button></div></div>`,
    wire(root) {
      const t0 = Date.now(), c = root.querySelector('[data-count]'), iv = setInterval(() => { if (!c.isConnected) return clearInterval(iv); c.textContent = `He has been dancing for ${Math.floor((Date.now() - t0) / 1000)} seconds.`; }, 500);
      Web.gecko(root.querySelector('[data-gecko]'), true);
      const stop = Sound.jingle([[64, 1], [67, 1], [71, 1], [67, 1], [69, 1], [72, 1], [76, 2], [74, 1], [71, 1], [67, 2], [69, 1], [71, 1], [72, 2]], 170, 'square');
      root._stop = () => { stop(); clearInterval(iv); };
      root.querySelector('[data-prize]').onclick = () => WM.alert('Your prize', 'There is no prize.\nThere is only the dance.', 'info');
    },
  },
  '404': {
    title: 'The page cannot be displayed',
    html: (q) => `<div style="padding:18px;font:13px/1.5 Verdana,Tahoma,sans-serif;max-width:560px"><h2 style="font:700 18px Verdana,Tahoma,sans-serif;margin:0 0 8px">The page cannot be displayed</h2>
      <p>The page you are looking for (<b>${esc(q)}</b>) is currently unavailable. The Web site might be experiencing technical difficulties, or it might not exist yet because it is the nineties.</p><hr>
      <p>Please try the following:</p><ul><li>Click the <a data-go="burn://home">SparkNet Home</a> page.</li><li>Check that the phone line is plugged in.</li><li>Ask whoever is on the phone to hang up.</li></ul>
      <p style="color:#777">HTTP 404 - File not found<br>Wildfire Navigator</p></div>`,
  },
};
Web.gecko = (cv, wild) => {   // Tuko, dancing in a page
  if (!cv) return; const g = cv.getContext('2d'); let f = 0;
  const iv = setInterval(() => {
    if (!cv.isConnected) return clearInterval(iv);
    g.clearRect(0, 0, 72, 48); f++;
    g.save(); const bob = Math.sin(f * 0.8) * 3, flip = wild && Math.floor(f / 6) % 2;
    if (flip) { g.translate(72, 0); g.scale(-1, 1); }
    g.translate(0, 8 + bob); Icons.draw(TUKO[f % 10 < 2 ? 1 : 0], 3, g, 0, -10); g.restore();
  }, 110);
};
APPS.browser = {
  title: 'Wildfire Navigator', icon: 'globe', w: 680, h: 480, minW: 300, minH: 260,
  open(win, args) {
    let hist = [], fwd = [], cur = null, loadT = null;
    const B = (label, title) => h('button.tool', { title, 'aria-label': title, text: label });
    const back = B('◀ Back', 'Back'), next = B('Forward ▶', 'Forward'), stopB = B('✕ Stop', 'Stop'), reload = B('↻ Refresh', 'Refresh'), home = B('⌂ Home', 'Home'), favs = B('★ Favorites', 'Favorites');
    const addr = h('input.field', { type: 'text', 'aria-label': 'Address', autocapitalize: 'off', spellcheck: false });
    const goB = h('button.btn', { text: 'Go', style: { minWidth: '40px' } });
    const globe = h('div.globe', Icons.img('globe', 24));
    const page = h('div.web'), status = h('span', 'Done'), bar = h('i'), prog = h('span.progress', bar);
    win.body.append(h('div.brand', h('div.toolbar', { style: { flex: 1, padding: 0 } }, back, next, stopB, reload, home, favs), globe), h('div.addr', h('span', 'Address'), addr, goB), h('div.sunk', { style: { flex: 1, display: 'flex', padding: '2px', minHeight: 0 } }, page), h('div.status', status, prog));
    const show = (url) => {
      if (page._stop) { page._stop(); page._stop = null; }
      const P = Web.page(url); cur = url; addr.value = url.startsWith('burn:') ? url : 'http://' + url + '/';
      WM.setTitle(win, P.title + ' - Wildfire Navigator');
      page.innerHTML = P.html(P.q); page.scrollTop = 0;
      page.querySelectorAll('[data-go]').forEach(a => { a.href = '#'; a.onclick = (e) => { e.preventDefault(); nav(a.dataset.go); }; });
      if (P.wire) P.wire(page, nav);
      page._stop = page._stop || null;
      back.disabled = !hist.length; next.disabled = !fwd.length;
      // the page arrives a band at a time, the way it used to
      if (!calm()) { page.firstElementChild.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 1400, easing: 'steps(14)' }); }
      let p = 0; clearInterval(loadT); status.textContent = `Opening page ${url}...`;
      loadT = setInterval(() => { p += rand(6, 16); bar.style.width = Math.min(100, p) + '%'; if (p >= 100) { clearInterval(loadT); status.textContent = 'Done'; setTimeout(() => { bar.style.width = '0'; }, 400); } }, 110);
    };
    const connect = () => new Promise(res => {
      if (Web.connected) return res();
      const b = WM.bounds(), dw = Math.min(330, b.w - 16);
      const d = WM.create({ title: 'Connecting to SparkNet', icon: 'net', w: dw, h: 150, resizable: false, x: (b.w - dw) / 2, y: b.h / 2 - 90 });
      const msg = h('p', 'Dialing...'), cancel = h('button.btn', { text: 'Cancel' });
      d.body.append(h('div.dlg', Icons.img('net'), h('div', msg, h('p', { style: { color: '#555', fontSize: '11px' } }, 'Dial-up Networking · 555-0198'))), h('div.dlgbtns', cancel));
      let done = false; const finish = () => { if (done) return; done = true; Web.connected = true; WM.close(d); WM.focus(win); res(); };
      cancel.onclick = finish; d.onClose = finish;
      Sound.init(); const len = Store.data.sound ? Sound.modem() : 1.2;
      setTimeout(() => { msg.textContent = 'Verifying user name and password...'; }, len * 450);
      setTimeout(() => { msg.textContent = 'Connected at 56,600 bps.'; }, len * 850);
      setTimeout(finish, len * 1000 + 300);
    });
    const nav = async (u, push = true) => {
      const url = Web.norm(u);
      await connect();
      if (push && cur) { hist.push(cur); fwd = []; }
      show(url);
    };
    back.onclick = () => { if (!hist.length) return; fwd.push(cur); show(hist.pop()); };
    next.onclick = () => { if (!fwd.length) return; hist.push(cur); show(fwd.pop()); };
    reload.onclick = () => cur && show(cur);
    home.onclick = () => nav('burn://home');
    stopB.onclick = () => { clearInterval(loadT); bar.style.width = '0'; status.textContent = 'Stopped'; if (page._stop) page._stop(); };
    favs.onclick = (e) => { const r = favs.getBoundingClientRect(); WM.ctx(r.left, r.bottom, Web.bookmarks.map(([t, u]) => ({ label: t, action: () => nav(u) }))); };
    goB.onclick = () => nav(addr.value);
    addr.onkeydown = (e) => { if (e.key === 'Enter') nav(addr.value); };
    win.onClose = () => { clearInterval(loadT); if (page._stop) page._stop(); };
    win.reopen = (w, a) => { if (a.url) nav(a.url); };
    nav(args.url || 'burn://home', false);
  },
};
