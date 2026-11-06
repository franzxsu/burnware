/* ============================================================
   Typing Racer: the typing tutor every school lab had, with cars.
   Type the passage; your car moves as you go. Three rivals type at
   a steady speed. Fix a mistake before moving on.
   ============================================================ */
const RACE_TEXTS = [
  'The modem screamed and hissed for a full minute before the page began to load, one slow line at a time. By the time the picture of the cat appeared, the tea had gone completely cold.',
  'Save your work often. Floppy disks are small, but losing a whole essay because the power went out is a very large problem. Press Control and S, and then breathe easy.',
  'Rain drummed on the tin roof of the little hut while the computer hummed in the corner. Somewhere down the phone line, the whole wide world was waiting to say hello.',
  'Tuko the gecko believes that every problem can be solved with a snack, a nap, or a very long stare at the ceiling. So far he has been right more often than not.',
  'To defragment the hard drive, close every program, open the tool, and then watch the little coloured blocks shuffle into order. It takes an hour, but it is strangely calming.',
  'The new computer came with a sound card, a CD drive, and a mouse with a ball inside it. Every few weeks the ball needed cleaning, and nobody ever wanted to do it.',
  'Quick brown foxes are a fine way to practise, but real typists learn by writing letters, stories and long angry emails that they wisely decide never to send.',
  'If the screen turns blue and shows a wall of white text, do not panic. Write down the error, restart the machine, and promise yourself you will save more often.',
  'A good password is long and strange. It is not the name of your dog, your birthday, or the word password, no matter how clever that seemed at the time.',
  'Burn a mix CD for a friend: pick twelve songs, put the best one third, and write the track list on the paper insert in your neatest handwriting.',
  'The video shop closed at nine, so the whole family argued in the car about which film to rent. In the end they got the same one as last week, again.',
  'Sit up straight, keep your wrists off the desk, and rest your fingers on the home keys. Look at the screen, not at your hands. Speed comes later; accuracy comes first.',
];
APPS.typing = {
  title: 'Typing Racer', icon: 'typing', w: 600, h: 470, minW: 320, minH: 400,
  open(win) {
    gameCSS('css-typing', `
.tr { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 6px; padding: 6px; background: var(--face); }
.tr-track { position: relative; height: 150px; flex: none; background: #404040; box-shadow: inset 1px 1px var(--lo), inset -1px -1px var(--hi), inset 2px 2px var(--dk); overflow: hidden; }
.tr-lane { position: absolute; left: 0; right: 0; height: 25%; border-bottom: 2px dashed #c0c000; box-sizing: border-box; }
.tr-lane:last-of-type { border-bottom: 0; }
.tr-flag { position: absolute; top: 0; bottom: 0; right: 18px; width: 12px; background: repeating-conic-gradient(#fff 0 25%, #000 0 50%) 0 0 / 12px 12px; }
.tr-car { position: absolute; left: 0; width: 34px; height: 34px; transition: left .12s linear; }
.tr-car img { width: 34px; height: 34px; }
.tr-name { position: absolute; left: 40px; font: 10px var(--ui); color: #fff; white-space: nowrap; text-shadow: 1px 1px #000; }
.tr-text { flex: 1; min-height: 60px; overflow-y: auto; background: #fff; padding: 8px 10px; font: 17px/1.55 "Courier New", var(--mono); color: #808080; user-select: none; }
.tr-text .ok { color: #008000; } .tr-text .cur { color: #000; text-decoration: underline; } .tr-text .bad { background: #ff8080; color: #000; } .tr-text .caret { border-left: 2px solid #000080; margin-left: -1px; }
.tr-in { display: flex; gap: 6px; align-items: center; }
.tr-in input { flex: 1; font: 16px "Courier New", var(--mono); padding: 4px 6px; }
.tr-in input.bad { background: #ffc0c0; }
.tr-count { position: absolute; inset: 0; display: grid; place-items: center; font: 700 56px var(--ui); color: #ffff00; text-shadow: 3px 3px #000; pointer-events: none; }
`);
    const CLASSES = { Rookie: [['Grandma Rosa', 22], ['Intern Jay', 31], ['Mr. Lim', 40]], Pro: [['Office Temp', 42], ['Court Clerk', 56], ['Night Editor', 68]], Legend: [['Ace Typist', 75], ['Stenographer', 92], ['The Champion', 110]] };
    let cls = Store.data.trClass || 'Rookie', text, words, wi, pos, errs, typed, t0, timer, raf, state = 'idle', racers, place;
    const track = h('div.tr-track'), passage = h('div.tr-text.sunk'), input = h('input.field', { type: 'text', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: false, 'aria-label': 'Type here', placeholder: 'Press Race! to start' });
    const go = h('button.btn.def', 'Race!'), count = h('div.tr-count');
    const stW = h('span'), stA = h('span'), stT = h('span', { style: { flex: '0 0 90px' } });
    win.body.append(h('div.tr', track, passage, h('div.tr-in', input, go)), h('div.status', stW, stA, stT));
    const carImg = (hue) => { const im = Icons.img('car'); if (hue) im.style.filter = `hue-rotate(${hue}deg)`; return im; };
    function setupTrack() {
      track.replaceChildren(h('div.tr-flag'), count);
      racers = [{ name: 'You', me: true, hue: 0 }, ...CLASSES[cls].map(([name, wpm], i) => ({ name: `${name} · ${wpm} wpm`, wpm, hue: [200, 110, 50][i] }))];
      racers.forEach((r, i) => {
        const lane = h('div.tr-lane', { style: { top: i * 25 + '%' } }); track.append(lane);
        r.el = h('div.tr-car', { style: { top: `calc(${i * 25}% + 2px)` } }, carImg(r.hue)); r.lbl = h('div.tr-name', { style: { top: `calc(${i * 25}% + 11px)` } }, r.name);
        r.p = 0; r.done = 0; track.append(r.el, r.lbl);
      });
      moveCars();
    }
    function moveCars() { const W = track.clientWidth - 34 - 34; for (const r of racers) { r.el.style.left = (4 + r.p * W) + 'px'; r.lbl.style.left = Math.min(W - 40, 44 + r.p * W) + 'px'; } }
    function showText() {
      const kids = []; let k = 0;
      words.forEach((w, i) => {
        const wTxt = w + (i < words.length - 1 ? ' ' : '');
        for (let j = 0; j < wTxt.length; j++, k++) {
          let cls2 = '';
          if (i < wi) cls2 = 'ok';
          else if (i === wi) { if (j < typed.length) cls2 = typed[j] === wTxt[j] ? 'ok' : 'bad'; else cls2 = 'cur'; if (j === typed.length) cls2 += ' caret'; }
          kids.push(cls2 ? h('span', { class: cls2 }, wTxt[j]) : wTxt[j]);
        }
      });
      passage.replaceChildren(...kids);
      const c = passage.querySelector('.caret'); if (c && c.offsetTop > passage.scrollTop + passage.clientHeight - 30) passage.scrollTop = c.offsetTop - 30;
    }
    const doneChars = () => words.slice(0, wi).reduce((s, w) => s + w.length + 1, 0);
    const wpmNow = () => { const m = (Date.now() - t0) / 60000; return m > 0 ? Math.round(doneChars() / 5 / m) : 0; };
    function newRace() {
      cancelAnimationFrame(raf); clearInterval(timer);
      text = pick(RACE_TEXTS); words = text.split(' '); wi = 0; pos = 0; errs = 0; typed = ''; place = 0;
      setupTrack(); showText(); input.value = ''; input.classList.remove('bad'); input.disabled = true; state = 'count';
      stW.textContent = 'WPM 0'; stA.textContent = 'Accuracy 100%'; stT.textContent = 'Time 0.0';
      let n = 3; count.textContent = n; Sound.ding();
      timer = setInterval(() => {
        n--; if (n > 0) { count.textContent = n; Sound.ding(); return; }
        clearInterval(timer); count.textContent = 'GO!'; Sound.chord(); setTimeout(() => { count.textContent = ''; }, 600);
        state = 'race'; t0 = Date.now(); input.disabled = false; input.placeholder = ''; input.focus(); tick();
      }, 800);
    }
    function tick() {
      if (state !== 'race' || !win.el.isConnected) return;
      const secs = (Date.now() - t0) / 1000;
      for (const r of racers) if (!r.me && !r.done) { r.p = Math.min(1, secs * r.wpm * 5 / 60 / text.length * (0.96 + 0.08 * Math.sin(secs * 0.7 + r.hue))); if (r.p >= 1) { r.done = ++place; r.lbl.textContent = r.name + ' · finished ' + ord(r.done); } }
      moveCars(); stT.textContent = 'Time ' + secs.toFixed(1); stW.textContent = 'WPM ' + wpmNow();
      raf = requestAnimationFrame(tick);
    }
    const ord = (n) => n + (['th', 'st', 'nd', 'rd'][n] || 'th');
    input.addEventListener('input', () => {
      if (state !== 'race') return;
      const w = words[wi], last = wi === words.length - 1, target = last ? w : w + ' ', v = input.value;
      if (v.length > typed.length && v[v.length - 1] !== target[v.length - 1]) { errs++; Sound.key && Sound.key(); }
      typed = v; pos = v.length;
      const ok = target.startsWith(v); input.classList.toggle('bad', !ok);
      if (v === target) { wi++; typed = ''; input.value = ''; if (last) return finish(); }
      const me = racers[0]; me.p = Math.min(1, (doneChars() + (ok ? typed.length : 0)) / text.length); moveCars();
      const total = doneChars() + typed.length; stA.textContent = 'Accuracy ' + Math.max(0, Math.round((1 - errs / Math.max(1, total + errs)) * 100)) + '%';
      showText();
    });
    function finish() {
      state = 'done'; cancelAnimationFrame(raf); input.disabled = true; const me = racers[0]; me.p = 1; me.done = ++place; moveCars(); showText();
      const secs = (Date.now() - t0) / 1000, wpm = Math.round(text.length / 5 / (secs / 60)), acc = Math.round((1 - errs / (text.length + errs)) * 100);
      me.lbl.textContent = 'You · ' + wpm + ' wpm · ' + ord(place); stW.textContent = 'WPM ' + wpm;
      const key = 'typing', best = Store.data.scores[key] || 0; if (wpm > best) { Store.data.scores[key] = wpm; Store.save(); }
      place === 1 ? Sound.tada() : Sound.chord();
      setTimeout(() => WM.alert('Typing Racer', `${place === 1 ? 'You won the race!' : 'You finished ' + ord(place) + '.'}\n\nSpeed: ${wpm} words per minute\nAccuracy: ${acc}%\nTime: ${secs.toFixed(1)} seconds` + (wpm > best ? `\n\nNew personal best! (was ${best} wpm)` : `\nYour best: ${best} wpm`) + (place === 1 && cls !== 'Legend' ? `\n\nReady for the ${cls === 'Rookie' ? 'Pro' : 'Legend'} class? (Race menu)` : ''), 'typing'), 500);
    }
    go.onclick = newRace;
    win.el.addEventListener('keydown', (e) => { if (e.key === 'F2') { e.preventDefault(); newRace(); } if (e.key === 'Enter' && state !== 'race' && state !== 'count') { e.preventDefault(); newRace(); } });
    WM.menubar(win, [{ label: 'Race', items: () => [
      { label: 'New race', key: 'F2', action: newRace }, '-',
      ...Object.keys(CLASSES).map(k => ({ label: k + ' class', check: cls === k, action: () => { cls = k; Store.data.trClass = k; Store.save(); newRace(); } })), '-',
      { label: `Best speed: ${Store.data.scores.typing || 0} wpm`, disabled: true }, { label: 'Exit', action: () => WM.close(win) },
    ] }, { label: 'Help', items: () => [{ label: 'How to race', action: () => WM.alert('Typing Racer', 'Press Race! and wait for GO. Then type the passage into the box.\n\nEach word finishes when you type its space. A wrong letter turns the box red: backspace and fix it to keep going.\n\nWPM = words per minute (5 letters = 1 word).', 'typing') }] }]);
    const ro = new ResizeObserver(() => racers && moveCars()); ro.observe(track);
    win.onClose = () => { cancelAnimationFrame(raf); clearInterval(timer); state = 'closed'; ro.disconnect(); };
    text = RACE_TEXTS[0]; words = text.split(' '); wi = 0; typed = ''; requestAnimationFrame(() => { setupTrack(); showText(); });
  },
};
