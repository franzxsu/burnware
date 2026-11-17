/* ============================================================
   STATION 7: www.alitaptap.net, part 1 (1996 to 2001).

   One address, one person, thirty years. What Torch shows at
   www.alitaptap.net depends on the year the clock is set to, and
   each version is built the way pages were built that year:
   1996 bare HTML, 1997 GeoCities glitter, 1999 tables and frames.
   Part 2 carries on with the blog, the social profile and today.
   ============================================================ */
const QWeb = {
  eras: [],   // [first year, last year, page], filled in below and in part 2
  era() { const y = News.year(); const hit = this.eras.find(e => y >= e[0] && y <= e[1]); return hit ? hit[2] : this.eras[0][2]; },
};
/* ---------- before 1996: nothing there yet ---------- */
QWeb.eras.push([-1e9, 1990, {
  title: 'No carrier',
  html: () => `<div style="padding:18px;font:15px/1.5 var(--mono);background:#000;color:#5cff8a;min-height:100%">ATDT www.alitaptap.net<br>NO CARRIER<br><br>It is ${News.year()}.<br>The World Wide Web has not been invented yet.<br>Torch is not sure how you opened it.<br><br>Try a later year. Or a library.<span style="animation:qbl 1s steps(2) infinite">_</span><style>@keyframes qbl{50%{opacity:0}}</style></div>`,
}]);
QWeb.eras.push([1991, 1995, {
  title: 'Server not found',
  html: () => `<div style="padding:18px;font:14px/1.5 var(--ui);background:#fff;color:#000;min-height:100%">
    <h2 style="font:700 18px var(--ui);margin:0 0 8px">Torch cannot find the server at www.alitaptap.net</h2>
    <p>The server could not be found. Either:</p>
    <ul><li>the address is typed wrong, or</li><li>the site <b>does not exist yet</b>. It is ${News.year()}, and most of the Web has not been built.</li></ul>
    <p style="color:#666;font-size:12px">DNS_NOT_YET. The clock in the corner of your screen decides what year it is.</p></div>`,
}]);
/* ---------- 1996: her very first page. Grey, Times New Roman, made in Notepad ---------- */
QWeb.eras.push([1996, 1996, {
  title: "Luz's Home Page",
  html: () => {
    Quest.era('e96'); Quest.lead('web96');
    return `<div class="q96" style="background:#c0c0c0;min-height:100%;padding:12px 16px;font:16px/1.35 'Times New Roman',Times,serif;color:#000">
    <style>.q96 a{color:#0000ee;text-decoration:underline;cursor:pointer} .q96 h1{font:700 32px 'Times New Roman',serif;margin:6px 0} .q96 h3{font:700 19px 'Times New Roman',serif;margin:14px 0 4px} .q96 hr{border:0;border-top:2px groove #fff;margin:10px 0} .q96 .uc{display:inline-block;background:#ffd800;border:3px solid #000;font:700 13px Arial,sans-serif;padding:4px 10px;transform:rotate(-3deg)}</style>
    <center><h1>Luz's Home Page</h1><span class="uc">&#9888; UNDER CONSTRUCTION &#9888;</span>
    <p><i>Welcome to my first page on the World Wide Web!</i></p></center><hr>
    <p>Hello. My name is Luz. I am 15. I live in Ember Village. I made this page at <b>Kubo Net Cafe</b>, on Station 7 (the one by the window), because we do not have a computer at home.</p>
    <p>My friend Migs showed me how. He is at Station 6 right now, pretending he is not reading over my shoulder.</p>
    <h3>Things I like</h3>
    <ul><li>Computers</li><li>Fireflies (in our language: <i>alitaptap</i>)</li><li>Pancit canton with an egg</li><li>The moment the page finally finishes loading</li></ul>
    <h3>Our secret word</h3>
    <p>Migs says every page needs a secret word, so your friends know the page is really yours. Ours is:</p>
    <center><p><tt style="font:700 26px 'Courier New',monospace;letter-spacing:6px;background:#fff;border:2px inset #fff;padding:2px 12px">SINAG</tt></p></center>
    <p>It means <i>a ray of light</i>. He picked it. (Migs: yes, I know that putting it ON the page defeats the purpose. It's my page.)</p>
    <h3>Links</h3>
    <ul><li><a data-go="burn://home">SparkNet</a> (it is the only other page I know)</li><li>More links when I find more pages.</li></ul>
    <hr><address style="font-size:13px">Last updated: September 2, 1996. Made with Notepad.<br>This page is best viewed with Netscape Navigator 2.0.<br>You are visitor number <b style="font:15px 'Courier New',monospace;background:#000;color:#0f0;padding:0 3px">000012</b> (eleven of those are me)</address></div>`;
  },
}]);
/* ---------- 1997 and 1998: the GeoCities years. Stars, a marquee, a guestbook ---------- */
QWeb.eras.push([1997, 1998, {
  title: "~* aLiTaPtAp's cOrNeR *~",
  html: () => {
    const y98 = News.year() === 1998; Quest.era(y98 ? 'e98' : 'e97');
    const box = (t, body, c = '#66ffcc') => `<table class="bx" style="border-color:${c}"><tr><th style="background:${c}">${t}</th></tr><tr><td>${body}</td></tr></table>`;
    const gb = [['tala_migs', 'Sep 1997', 'LUZ!! i can see ur page from the library computer here!!! the city is so loud. no fireflies. back at christmas. PANGAKO.'], ['Ate Bing', 'Oct 1997', 'Luz your time is up. EXTEND?'], ['JunJun (age 11)', 'Nov 1997', 'cool page!! how do u make the stars. i will make a page 2 when my dad buys a computer'], ['cool_dude_99', 'Dec 1997', 'nice page. the firefly cursor would be better. visit mine (its not done)']];
    if (y98) gb.push(['Ate Bing', 'Jan 1998', 'Greetings from the airport. Sold all 8 stations. A family from the village took number 7. Be good Luz.'], ['alitaptap', 'Feb 1998', '(me) migs if you are reading this: the library gives me 30 minutes. the lights are still where I left them. they just moved house.']);
    return `<div class="q97" style="min-height:100%;color:#e8ffb0;font:15px/1.45 var(--comic);text-align:center;padding:12px;background:radial-gradient(#fff 1px,transparent 1.5px) 0 0/38px 38px,radial-gradient(#cfe 1px,transparent 1.5px) 19px 19px/38px 38px,#02041a">
    <style>.q97 a{color:#66ffff;cursor:pointer} .q97 .mq{overflow:hidden;white-space:nowrap;background:#102050;border:2px ridge #c8ff5a;color:#fff} .q97 .mq span{display:inline-block;padding-left:100%;animation:q97m 16s linear infinite} @keyframes q97m{to{transform:translateX(-100%)}} @keyframes qbl{50%{opacity:0}}
    .q97 .ff{display:inline-block;width:7px;height:7px;border-radius:50%;background:#f2ff9c;box-shadow:0 0 8px 4px rgba(200,255,90,.6);animation:q97g 2.2s ease-in-out infinite;margin:0 12px;vertical-align:middle} @keyframes q97g{0%,100%{opacity:.15}50%{opacity:1}}
    .q97 .bx{margin:12px auto;max-width:440px;width:100%;border:3px ridge;border-collapse:collapse;text-align:left;background:rgba(0,0,30,.75)} .q97 .bx th{color:#000;font:700 14px var(--comic);padding:2px 6px} .q97 .bx td{padding:6px 8px}
    .q97 .warn{border:3px dashed #ff5050;color:#ffd0d0;background:#300;max-width:440px;margin:12px auto;padding:6px 8px} .q97 .blink{animation:qbl 1s steps(2) infinite;color:#ff5050;font-weight:700}</style>
    <h1 style="font:700 28px/1.15 var(--comic);color:#c8ff5a;text-shadow:2px 2px #0a6a2a;margin:4px 0"><i class="ff"></i>~* aLiTaPtAp's cOrNeR *~<i class="ff" style="animation-delay:-1.1s"></i></h1>
    <div class="mq"><span>*** welcome to my corner of the web *** alitaptap means FIREFLY *** now with 100% more stars *** sign my guestbook or else *** best viewed at 640x480 in the dark ***</span></div>
    <div class="warn">${y98
      ? '<b>UPDATE, January 1998:</b> Kubo Net is gone. Ate Bing sold the stations. I update this page from the school library now.<br><br>If your family bought <b>STATION 7</b> (beige tower, my name scratched under the keyboard): <span class="blink">PLEASE DO NOT FORMAT IT.</span> There is something on it that is not mine to lose.'
      : '<span class="blink">!!! SAD NEWS !!!</span><br><b>KUBO NET CAFE CLOSES DECEMBER 31.</b> Ate Bing is going abroad to work. If you ever paid for an hour here, come and say bye. Bring pancit.'}</div>
    ${box('aBoUt mE', 'I am Luz, 16, from Ember Village. I live at <b>Station 7</b> of Kubo Net Cafe (the one by the window). I like fireflies, QBasic, pancit canton and the sound the modem makes right before it works.')}
    ${box('mY pRoGrAmS (QBasic!!)', '<b>GUESS.BAS</b>: guess my number. It cheats.<br><b>STARS.BAS</b>: stars. That is the whole program.<br><b>JAR</b>: top secret. For M only. It only has to work once.', '#ffcc66')}
    ${box('fOr M', 'Light number 4 used to live on this page. I took it down when the guestbook people started guessing.<br><br>But <b>you</b> saw it, the first week this page ever existed. Back when it was grey and ugly. You were there <i>then</i>.', '#ff99cc')}
    ${box('a pOeM', '<i>the power went out<br>and the monitors went dark<br>so the window lit up instead:<br>a hundred tiny screens,<br>none of them plugged in.</i>', '#99ccff')}
    <h2 style="color:#c8ff5a;font:700 20px var(--comic);margin:14px 0 2px">~ gUeStBoOk ~</h2>
    <div style="max-width:440px;margin:0 auto;text-align:left">${gb.map(([n, d, m]) => `<p style="margin:0 0 6px;padding:4px 7px;background:#101a48;border:1px solid #3a4a9a"><b style="color:#ffcc66">${n}</b> <small style="color:#9ab">${d}</small><br>${m}</p>`).join('')}
    <p style="font-size:12px;color:#9ab;text-align:center">The guestbook is closed. ${y98 ? 'The library computer will not let me run the script.' : 'Ate Bing says the script uses too much modem.'}</p></div>
    <p style="font-size:13px">&lt;&lt; <a data-go="www.junjun-rocks.com">prev</a> | <b>The Tiny Lights Web Ring</b> | <a data-go="www.dancing-tuko.com">next</a> &gt;&gt;</p>
    <p style="font-size:12px">You are visitor <b style="font:15px var(--mono);background:#000;color:#c8ff5a;padding:0 3px">${y98 ? '0000641' : '0000388'}</b> · made ${y98 ? 'at the school library, 30 minutes at a time' : 'at Kubo Net Cafe, Station 7'}</p></div>`;
  },
}]);
/* ---------- 1999 to 2001: version 3.0. Tables, a sidebar, a Y2K countdown ---------- */
QWeb.eras.push([1999, 2001, {
  title: 'alitaptap.net v3.0',
  html: () => {
    const y = News.year(); Quest.era('e99');
    const posts = [
      [2001, '08.20.01', 'The dorm has a LAN', 'Ten megabits. I downloaded a whole song in four minutes and had to lie down. Second year of Computer Science starts Monday.'],
      [2000, '01.01.00', 'Y2K', 'Nothing happened. I stayed up anyway, watching the dorm computer lab like it was a comet.'],
      [1999, '06.15.99', 'Leaving', 'I got in. Computer Science, at the university in the city. I leave Ember Village in two weeks.<br><br>Yes, the same city he moved to. No, I do not know where he lives. The phone number I had stopped working in \'98, and there are a lot of people called Reyes in a city.'],
      [1999, '03.02.99', 'FAQ, because you keep e-mailing', '<b>Q: What is "the jar"?</b><br>A program I wrote in 1997, for a friend, on a cafe computer. Five words open it.<br><br><b>Q: Where were the words?</b><br>All over that computer. One I "deleted", so the owner would not read it (deleted things do not go far: they sit in the Recycle Bin until somebody empties it). One you could only see with <tt>DIR /A</tt>. The others were harder.<br><br><b>Q: Where is the computer now?</b><br>If I knew, this page would be a lot shorter.'],
      [1999, '01.10.99', 'The pawnshop', 'Walked past where Kubo Net used to be. It is a pawnshop now. There is a rice cooker in the window, exactly where Station 7 was.'],
    ].filter(p => p[0] <= y);
    const y2k = y < 2000 ? `<b>Y2K COUNTDOWN</b><br><span style="font:700 20px var(--mono);color:#c00">${y === 1999 ? '00' : '01'}</span> year(s) to go.<br>I have a flashlight.` : '<b>Y2K STATUS</b><br>We survived.<br>The flashlight was not needed.';
    return `<div class="q99" style="min-height:100%;background:#fff;color:#000;font:12px/1.45 Verdana,Arial,sans-serif">
    <style>.q99 a{color:#003399;cursor:pointer} .q99 .nav{background:#003366;color:#fff;padding:3px 8px;font-size:11px} .q99 .nav b{color:#ffcc00} .q99 td{vertical-align:top} .q99 .side{background:#e6ecf5;border-right:1px solid #99aacc;width:132px;padding:8px;font-size:11px} .q99 .side div{border:1px solid #99aacc;background:#fff;padding:5px;margin-bottom:8px} .q99 h2{font:700 13px Verdana,sans-serif;color:#fff;background:#336699;margin:0 0 4px;padding:2px 6px} .q99 .post{margin:0 0 12px;border:1px solid #c8d2e4} .q99 .post p{margin:0;padding:6px 8px}</style>
    <div style="background:linear-gradient(90deg,#003366,#336699);color:#fff;padding:8px 10px"><span style="font:700 22px Verdana,sans-serif">alitaptap<span style="color:#ffcc00">.net</span></span> <span style="font-size:10px">v3.0 · a small light on the information superhighway</span></div>
    <div class="nav"><b>home</b> | about | programs | links | guestbook (broken) | <span style="color:#9bd">skip intro</span></div>
    <table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse"><tr>
    <td class="side"><div><b>WHO</b><br>Luz, ${y - 1981}.<br>Used to live at Station 7.</div><div>${y2k}</div><div><b>LINKS</b><br><a data-go="burn://home">SparkNet</a><br><a data-go="www.junjun-rocks.com">JunJun's page</a><br><a data-go="www.y2k-ready.com">Y2K test</a></div><div style="text-align:center;font-size:9px">Best viewed at<br><b>800 x 600</b><br>Internet Explorer 4+<br><br>hits: <b style="font-family:var(--mono);font-size:13px">${String(2000 + (y - 1999) * 3141).padStart(6, '0')}</b></div></td>
    <td style="padding:10px"><p style="margin:0 0 10px;font-size:11px;color:#555">Welcome to version 3.0. The stars are gone. I am told this is what a professional site looks like.</p>
    ${posts.map(([, d, t, b]) => `<div class="post"><h2>${d} :: ${t}</h2><p>${b}</p></div>`).join('')}
    <p style="font-size:10px;color:#777;text-align:center">&copy; 1996-${y} Luz N. · If you bought a beige computer from a cafe in Ember Village in 1998, <u>e-mail me</u>.</p></td></tr></table></div>`;
  },
}]);
