/* ============================================================
   STATION 7: www.alitaptap.net, part 2 (2002 to today).
   The blog years, the social network years, and the site as it
   is now, which is where the case gets closed.
   ============================================================ */
/* ---------- 2002 to 2007: a blog. Date headers, comments, a blogroll ---------- */
QWeb.eras.push([2002, 2007, {
  title: 'a small light :: the alitaptap blog',
  html: () => {
    const y = News.year(); Quest.era('e02'); if (y >= 2004) Quest.era('e04');
    const reunion = `<div class="cm"><b>3 comments</b>
      <p><b>migs_r</b> said...<br>Luz. It's Migs. I searched "alitaptap" on a whim at 2 in the morning.<br><br>I went back, you know. January '98. The road reopened and I took the first bus up. The cafe was empty and there was a SOLD sign on the door. I stood at Station 7's window for an hour like an idiot.<br><br>I still don't know what the jar says.</p>
      <p><b>luz</b> said...<br>MIGS.<br>EIGHT YEARS.<br>Check your e-mail. CHECK YOUR E-MAIL.</p>
      <p><b>anonymous</b> said...<br>i don't know either of you and i am crying at work</p></div>`;
    const posts = [
      [2007, 'Tuesday, March 6, 2007', 'employed', 'First real job. I get paid to make a cartoon fish jump over things. Mama still tells the neighbours I "fix computers".', '11:02 PM', 5, ''],
      [2006, 'Sunday, April 2, 2006', 'we went back', 'Migs and I took the bus up to Ember Village. Eight hours. He complained for six of them.<br><br>The rooftop is still there. The pawnshop man let us go up. He does not remember who bought the stations: "some families, a school, I think one went to a church."<br><br>So Station 7 is still out there, with the jar still shut. Neither of us has ever seen it open. I wrote it, and I honestly can\'t remember what the last part says.', '9:40 PM', 12, ''],
      [2005, 'Friday, April 15, 2005', 'graduated', 'Bachelor of Science in Computer Science. It took five years and one thesis about pathfinding for fireflies. (They are bad at it. That is the thesis.)', '6:15 PM', 9, ''],
      [2004, 'Saturday, August 14, 2004', 'eight years since the brownout', 'August 14, 1996: the power went out in an internet cafe and a boy said the fireflies looked like tiny monitors. I think about that sentence more than is healthy.<br><br>I never found him in this city. I never found the computer either. Happy anniversary, Station 7, wherever you are.', '11:58 PM', 3, reunion],
      [2003, 'Monday, September 8, 2003', 'things I can do now', 'I can make a linked list cry. I can make a compiler say things about my mother. Third year.', '1:12 AM', 2, ''],
      [2002, 'Thursday, November 21, 2002', 'things I never finished', 'Found my old QBasic book at the bottom of a box, which made me think of the jar again.<br><br>My favourite of the five hiding places was the picture. I drew the night we met, and to anyone else it looked like nothing: a plain black rectangle. But the word was in there, painted in a black that was just barely not the same black. You had to <i>pour light into it</i>. One click with the paint bucket on the sky, any bright colour, and the word would just be standing there.<br><br>I was sixteen and I thought that was the cleverest thing anyone had ever done.', '12:31 AM', 1, ''],
      [2002, 'Wednesday, July 3, 2002', 'hello, blog', 'Everyone in the dorm has one of these now, so here is mine. I have had a homepage at this address since 1996. It has been grey, then covered in stars, then "professional". Now it is a diary again, which is what it always was.', '10:05 PM', 0, ''],
    ].filter(p => p[0] <= y);
    return `<div class="q02" style="min-height:100%;background:#f3efe4;color:#333;font:13px/1.55 Georgia,'Times New Roman',serif;padding:0 0 16px">
    <style>.q02 a{color:#5588aa;cursor:pointer} .q02 .wrap{max-width:560px;margin:0 auto;padding:0 12px} .q02 .hd{border:1px solid #ccc;background:#fff;margin:12px 0;padding:14px;text-align:center} .q02 .hd h1{font:400 26px Georgia,serif;letter-spacing:3px;text-transform:uppercase;margin:0;color:#666} .q02 .hd p{margin:4px 0 0;font:11px 'Trebuchet MS',Verdana,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#999}
    .q02 .date{font:11px 'Trebuchet MS',Verdana,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#999;margin:18px 0 4px} .q02 h3{font:400 18px Georgia,serif;color:#cc6600;margin:0 0 4px} .q02 .ft{font:10px 'Trebuchet MS',Verdana,sans-serif;letter-spacing:1px;text-transform:uppercase;color:#999;border-bottom:1px dotted #ccc;padding-bottom:10px;margin-top:6px}
    .q02 .cm{background:#fff;border:1px solid #ddd;margin:8px 0 0;padding:8px 10px;font-size:12px} .q02 .cm p{margin:8px 0 0;border-top:1px dotted #ccc;padding-top:6px} .q02 .sb{font:11px/1.5 'Trebuchet MS',Verdana,sans-serif;color:#666;border-top:1px dotted #999;margin-top:14px;padding-top:8px;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px} .q02 .sb b{letter-spacing:2px;text-transform:uppercase;color:#999;font-weight:400}</style>
    <div class="wrap"><div class="hd"><h1>a small light</h1><p>alitaptap.net · online since 1996</p></div>
    ${posts.map(([, d, t, b, tm, n, extra]) => `<div class="date">${d}</div><h3>${t}</h3><div>${b}</div><div class="ft">posted by luz at ${tm} | ${extra ? '3' : n} comments</div>${extra}`).join('')}
    <div class="sb"><div><b>about me</b><br>Luz, ${y - 1981}. Computer person. Nicknamed after a bug.</div><div><b>archives</b><br>${[2007, 2006, 2005, 2004, 2003, 2002].filter(a => a <= y).join(' · ')}<br>1996-2001: see the Wayback of my heart</div><div><b>currently</b><br>mood: ${y >= 2004 ? 'found' : 'looking'}<br>music: four notes, on repeat</div></div>
    <p style="text-align:center;font:10px 'Trebuchet MS',Verdana,sans-serif;color:#aaa;margin-top:14px">powered by Blogster · template: Minimal</p></div></div>`;
  },
}]);
/* ---------- 2008 to 2015: a profile on a social network that no longer exists ---------- */
QWeb.eras.push([2008, 2015, {
  title: 'Luz Navarro | Friendzy',
  html: () => {
    const y = News.year(); Quest.era('e08');
    const c = (who, text) => `<div class="c"><b>${who}</b> ${text}</div>`;
    const posts = [
      [2015, 'March 2015', 'Friendzy is shutting down next month, so this wall is going away. That\'s fine. I\'ve had the same address since 1996 and I have moved house four times on it. Find me at alitaptap.net. I\'ll leave a light on.', 41, ''],
      [2014, 'June 2014', 'Migs is officially a godfather. He cried more than the baby did.', 96, c('Migs Reyes', 'I had something in my eye') + c('Luz Navarro', 'for forty minutes')],
      [2012, 'October 2012', 'We quit our jobs. We shipped a game. It\'s called BROWNOUT, it\'s about fireflies coming in through a window, and it has 37 downloads. Thirty of them are my mother.', 58, c('Migs Reyes', 'the other 7 are my mother')],
      [2011, 'Throwback Thursday, 2011', 'Found my 1997 diary. I wrote Migs a song that year, in a tracker, on a cafe computer: four notes, over and over. I was SO proud of the trick. It was never just a song. <b>The notes spell a word.</b> Every note has a letter name. You just read them, left to right.', 73, c('Migs Reyes', 'I NEVER GOT TO HEAR IT. where is station 7') + c('Luz Navarro', 'somewhere out there, a beige tower is holding my best work hostage') + c('Ate Bing', 'I told you no saving on the stations')],
      [2009, 'May 2009', 'The first game I worked on is in an actual store. My name is in the credits. It is spelled wrong.', 22, ''],
      [2008, 'February 2008', '<i>Luz Navarro is now friends with <b>Migs Reyes</b>.</i>', 14, c('Migs Reyes', 'took you long enough. it has only been 4 years since the blog')],
      [2008, 'January 2008', '<i>Luz Navarro joined Friendzy.</i>', 3, ''],
    ].filter(p => p[0] <= y);
    return `<div class="q08" style="min-height:100%;background:#e9ebee;color:#1c1e21;font:12px/1.4 'Lucida Grande',Tahoma,Verdana,sans-serif">
    <style>.q08 .top{background:#3b5998;color:#fff;padding:6px 10px;display:flex;gap:10px;align-items:center} .q08 .top b{font:700 20px Tahoma,sans-serif;letter-spacing:-1px} .q08 .top span{flex:1;background:#fff;color:#999;padding:2px 6px;font-size:11px;max-width:200px}
    .q08 .wrap{max-width:560px;margin:0 auto;padding:10px} .q08 .fc{background:#fff;border:1px solid #c4cde0;margin-bottom:10px;padding:8px 10px} .q08 .who{display:flex;gap:10px;align-items:center} .q08 .av{width:56px;height:56px;flex:none;background:#0a1030 radial-gradient(circle at 60% 45%,#f2ff9c 0 4px,rgba(200,255,90,.5) 5px 9px,transparent 14px)} .q08 h1{font:700 17px Tahoma,sans-serif;margin:0;color:#3b5998}
    .q08 .ftabs{display:flex;gap:2px;margin:0 0 10px} .q08 .ftabs i{font-style:normal;background:#d8dfea;border:1px solid #c4cde0;padding:3px 10px;color:#3b5998} .q08 .ftabs i.on{background:#fff;font-weight:700;border-bottom-color:#fff}
    .q08 .meta{color:#90949c;font-size:11px;margin:4px 0} .q08 .meta u{color:#3b5998;text-decoration:none} .q08 .c{background:#edeff4;border-top:1px solid #fff;padding:4px 6px;margin-top:1px} .q08 .c b{color:#3b5998} .q08 input{width:100%;box-sizing:border-box;border:1px solid #bdc7d8;padding:4px;font:12px Tahoma,sans-serif;background:#f7f7f7}</style>
    <div class="top"><b>friendzy</b><span>Search for friends</span></div>
    <div class="wrap"><div class="fc who"><div class="av"></div><div><h1>Luz Navarro</h1><div>${y >= 2012 ? 'Co-founder at <b>Alitaptap Games</b>' : 'Game Programmer at a studio with a fish for a logo'} · From <b>Ember Village</b><br><span style="color:#90949c">${y >= 2012 ? 'is making small games about light.' : 'is debugging a fish.'}</span></div></div></div>
    <div class="ftabs"><i class="on">Wall</i><i>Info</i><i>Photos (7)</i></div>
    <div class="fc"><input disabled value="Write on Luz's wall... (you must be logged in)"></div>
    ${posts.map(([, d, b, likes, cm]) => `<div class="fc"><div><b style="color:#3b5998">Luz Navarro</b> ${b}</div><div class="meta">${d} · <u>Like</u> · <u>Comment</u> · ${likes} people like this</div>${cm}</div>`).join('')}
    <p style="text-align:center;color:#90949c;font-size:10px">Friendzy &copy; ${y} · About · Advertising · Developers · Poke everyone</p></div></div>`;
  },
}]);
/* ---------- 2016 to now: the studio. Dark, big type, a cookie notice. And a form ---------- */
QWeb.eras.push([2016, 1e9, {
  title: 'Alitaptap Games: small games about light',
  letter(name) {
    const yrs = News.max() - 1997;
    return `<div class="reply"><div class="rh"><b>Luz Navarro</b> <span>replied · just now</span></div>
      <p>${name ? esc(name) + ',' : 'Hello, whoever you are,'}</p>
      <p>I had to read your message three times.</p>
      <p>It worked? JAR.EXE actually ran? After ${yrs} years?</p>
      <p>I had forgotten that the last one was <i>Pangako</i>. I was sixteen, and so sure he would be back before the cafe closed. He did come back, you know. January 1998: the road reopened and he took the first bus up. The cafe was already empty. He stood at Station 7's window for an hour, and then he went home, and we lost each other for seven years.</p>
      <p>He found my blog in 2004. These days he writes the music for our games, and he is godfather to my daughter. I just called him. He is laughing, and also definitely crying. He says: <i>"Tell them the rooftop is still there."</i></p>
      <p>So that is the whole story. You opened a jar that two people have been wondering about for most of their lives.</p>
      <p>I can't give you much from here. But I have sent the fireflies back down the wire to Station 7. Look at your desktop. They know the way home.</p>
      <p>Keep the machine. Don't let anyone format it.</p>
      <p>Luz<br><span style="opacity:.6">alitaptap, still</span></p></div>`;
  },
  html() {
    const y = News.year(), s = Quest.s; Quest.era('e16');
    const game = (t, yr, d, hue) => `<div class="g"><div class="th" style="background:radial-gradient(circle at ${30 + hue % 40}% ${40 + hue % 30}%,hsl(${hue},100%,80%) 0 3px,hsla(${hue},100%,60%,.45) 4px 9px,transparent 16px),radial-gradient(circle at 72% 30%,#f2ff9c 0 2px,rgba(200,255,90,.4) 3px 7px,transparent 12px),linear-gradient(#0a1030,#16224a)"></div><b>${t}</b> <span>${yr}</span><p>${d}</p></div>`;
    return `<div class="q16" style="min-height:100%;background:#0b0f1a;color:#e8ecf4;font:15px/1.6 system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <style>.q16 a{color:#d8ff7a;cursor:pointer;text-decoration:none} .q16 .in{max-width:620px;margin:0 auto;padding:0 18px} .q16 nav{display:flex;justify-content:space-between;align-items:center;padding:14px 0;font-size:13px;gap:10px;flex-wrap:wrap} .q16 nav b{font-size:15px;letter-spacing:.3px} .q16 nav b::before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;background:#e8ff7a;box-shadow:0 0 10px 3px rgba(200,255,90,.7);margin-right:8px} .q16 nav span{opacity:.7}
    .q16 .eyebrow{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#8a94ac;margin:34px 0 10px} .q16 h1{font:700 clamp(30px,8vw,46px)/1.05 system-ui,-apple-system,'Segoe UI',sans-serif;letter-spacing:-1.5px;margin:0 0 12px} .q16 h2{font:700 22px/1.2 system-ui,sans-serif;letter-spacing:-.5px;margin:0 0 8px} .q16 p{margin:0 0 12px;color:#b8c0d2}
    .q16 .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin:8px 0 6px} .q16 .g{background:#131a2c;border:1px solid #232c44;border-radius:14px;padding:10px 12px 4px} .q16 .g .th{height:84px;border-radius:9px;margin-bottom:8px} .q16 .g span{color:#8a94ac;font-size:12px} .q16 .g p{font-size:13px;line-height:1.45;margin:4px 0 8px}
    .q16 .s7{background:#131a2c;border:1px solid #2c3a1a;border-radius:16px;padding:18px;margin:10px 0 0} .q16 form{display:grid;gap:8px;margin-top:10px} .q16 input{background:#0b0f1a;border:1px solid #2a3450;border-radius:9px;color:#e8ecf4;font:15px system-ui,sans-serif;padding:10px 12px;min-width:0} .q16 button{background:#d8ff7a;color:#0b0f1a;border:0;border-radius:999px;font:600 15px system-ui,sans-serif;padding:10px 18px;cursor:pointer;justify-self:start}
    .q16 .out{color:#ffd28a;font-size:14px;min-height:20px} .q16 .reply{background:#0b0f1a;border:1px solid #2c3a1a;border-radius:12px;padding:14px 16px;margin-top:6px} .q16 .reply p{color:#e8ecf4} .q16 .rh{margin-bottom:10px;font-size:13px} .q16 .rh span{color:#8a94ac} .q16 .rh b::before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;background:#e8ff7a;box-shadow:0 0 10px 3px rgba(200,255,90,.7);margin-right:8px}
    .q16 footer{font-size:12px;color:#6a748c;padding:26px 0 14px} .q16 .ck{background:#1a2238;border-radius:10px;padding:8px 12px;font-size:12px;color:#b8c0d2;display:flex;gap:10px;align-items:center;justify-content:space-between;margin-top:12px}</style>
    <div class="in"><nav><b>alitaptap games</b><span>Games · About · Station 7</span></nav>
    <div class="eyebrow">Independent studio · est. 2012</div><h1>Small games about light.</h1>
    <p>Short, quiet games you can finish in an evening. Made by two people and one cat, in a room with a very good window.</p>
    <div class="eyebrow">Games</div><div class="grid">
      ${game('Brownout', '2012', 'The power goes out. Fireflies come in through the window. That is the whole game.', 75)}
      ${game('Two Tails', '2017', 'Watch a comet from a rooftop, next to someone you are about to miss.', 200)}
      ${y >= 2021 ? game('Extend?', '2021', 'Run an internet cafe with eight stations and one very loud owner.', 30) : ''}
      ${game('Station 7', 'since 1997', 'In development. We are missing one file.', 110)}</div>
    <div class="eyebrow">About</div>
    <p><b style="color:#e8ecf4">Luz Navarro</b> learned to program at fifteen, on a rented computer by a window, thirty pesos an hour. She has been trying to get back to that feeling ever since. Music and sound are by <b style="color:#e8ecf4">Migs Reyes</b>, whom she met during a power cut in 1996.</p>
    <div class="eyebrow">Station 7</div>
    <div class="s7"><h2>${s.closed ? 'Station 7 has been found.' : 'Still looking for Station 7.'}</h2>
      ${s.closed ? this.letter(s.name) : `<p>In December 1997 I left a program on a cafe computer in Ember Village, for a friend. The cafe closed and the computer was sold before he could open it. Neither of us has ever seen what it says. I wrote it, and I no longer remember.</p>
      <p>It is a beige tower with <b style="color:#e8ecf4">STATION 7</b> on the side in marker. If you have it, and you got the jar open: tell me the name of the last firefly. That is how I will know it is really you.</p>
      <form data-s7><input name="n" maxlength="24" placeholder="Your name (so I know who to thank)" aria-label="Your name" autocomplete="off"><input name="w" maxlength="24" placeholder="The name of the last firefly" aria-label="The name of the last firefly" autocomplete="off" autocapitalize="off"><button>Send to Luz</button></form><div class="out" data-out role="status"></div>`}
    </div>
    <footer>&copy; 1996-${y} Alitaptap Games. This site has lived at the same address since 1996. Try doing that with an app.
      <div class="ck"><span>This site uses cookies. In 1997 that meant something you could eat.</span><a data-ck>OK</a></div></footer></div></div>`;
  },
  wire(root) {
    const ck = root.querySelector('[data-ck]'); if (ck) ck.onclick = () => ck.parentNode.remove();
    const f = root.querySelector('[data-s7]'), out = root.querySelector('[data-out]'); if (!f) return;
    f.onsubmit = (e) => {
      e.preventDefault(); const v = f.w.value.trim().toLowerCase(); if (!v) return;
      if (!/^(pangako|promise|a promise)$/.test(v)) { out.textContent = 'Hmm. That is not what I remember hiding. (No hard feelings. I get a lot of guesses.)'; Sound.ding(); return; }
      if (!Quest.s.caught) { out.textContent = '...that IS the word. But you would only know it for certain if the jar had really opened. Run JAR.EXE to the very end and catch every firefly. Then come back and tell me.'; Sound.ding(); return; }
      const name = f.n.value; Quest.close(name);
      const box = root.querySelector('.s7'); box.innerHTML = '<h2>Station 7 has been found.</h2>' + this.letter(Quest.s.name); box.scrollIntoView({ block: 'start', behavior: calm() ? 'auto' : 'smooth' });
    };
  },
}]);
/* the address itself: whatever year it is, that is the page you get */
WEB_PAGES['www.alitaptap.net'] = {
  get title() { return QWeb.era().title; },
  html: () => QWeb.era().html(),
  wire(root, nav) { const e = QWeb.era(); if (e.wire) e.wire(root, nav); },
};
