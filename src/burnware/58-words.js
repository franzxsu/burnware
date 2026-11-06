/* ============================================================
   Five Letters: guess the word in six tries. Green = right letter,
   right spot; yellow = in the word somewhere; grey = not in it.
   One word a day (same for everyone), plus endless practice.
   Coloured with the 16 VGA colours, like it's 1998.
   ============================================================ */
const WORD_ANSWERS = 'aboutaboveactoracuteadmitadoptadultafteragainagentagreeaheadalarmalbumalertalikealiveallowalonealongalteramberamongangelangerangleangryankleapartappleapplyarenaarguearisearmorarrayarrowasideassetaudioavoidawakeawardawareawfulbaconbadgebakerbasicbasinbatchbeachbeardbeastbeginbeingbelowbenchberrybirthblackbladeblameblankblastblazebleedblendblessblindblinkblockbloomblownboardboastbonusboostboothbrainbrakebrandbravebreadbreakbrickbridebriefbringbroadbrokebrookbrownbrushbuddybuildbuiltbunchburstcabincablecamelcandycanoecargocarrycatchcausecedarchainchairchalkcharmchartchasecheapcheckcheekcheerchesschestchickchiefchildchillchordcivicclaimclampclasscleanclearclerkclickcliffclimbclockcloseclothcloudclowncoachcoastcocoacolorcometcomiccoralcouchcouldcountcourtcovercrackcraftcranecrashcrawlcrazycreamcrispcrowdcrowncrudecrumbcrustcurvecycledailydairydancedealtdeathdebugdecaydelaydensedepthdiarydirtydiscoditchdizzydodgedoingdonutdoubtdoughdozendraftdraindramadrankdrawndreamdressdrieddriftdrilldrinkdrivedwarfeagereagleearlyeartheaseleightelbowelderemailemptyenemyenjoyenterentryequalerroressayeventeveryexactexistextrafablefaintfairyfaithfalsefancyfaultfeastfenceferryfeverfiberfieldfifthfiftyfightfinalflameflashflaskfleetfleshfloatflockfloodfloorflourfluidflushflutefocusfoggyforceforgeforthfortyfoundframefreshfriedfrostfrownfruitfudgefullyfunnygamergaugeghostgiantgivenglassgleamglobeglovegnomegoosegracegradegraingrandgrantgrapegraphgrassgravegravygreatgreengreetgrillgrindgroangroupgrovegrownguardguessguestguidehabithappyharshhastehatchhauntheartheavyhedgehellohobbyhollyhoneyhonorhorsehotelhousehumanhumidhumorhurryiglooimageinboxindexinnerinputissueivoryjellyjeweljointjokerjollyjudgejuicejuicykayakknifeknockknownlabellaserlaterlaughlayerlearnlemonlevellightlimitlinenliverllamalobbylocallodgelogiclooseloverlowerloyalluckylunarlunchmagicmajormakermangomaplemarchmarshmatchmayormedalmediamelonmercymerrymetalmetermidstmightmixermodelmodemmoistmoneymonthmoralmotormousemouthmoviemuddymusicnaivenervenevernightninjanoblenoisenorthnotchnovelnursenylonoceanofferoftenoliveonionoperaorbitorderotherotteroughtounceouterowneroxidepaintpanelpanicpaperpartypastapastepatchpausepeacepeachpearlpedalpennyperchphasephonephotopianopiecepilotpinchpixelpizzaplaceplainplaneplantplateplazapleadpluckplumbplumppointpolarporchpouchpoundpowerpresspriceprideprimeprintprismprizeprobeproofproudprovepulsepunchpupilpuppypursequackqueenqueryquestquickquietquiltquitequotaquoteradarradiorainyraiserallyranchrangerapidravenreachreactreadyrealmrebelreferrelaxrelayreplyriderridgeriflerightrigidrivalriverroastrobinrobotrockyrougeroughroundrouteroyalrugbyrulerrumorruralsaladsalsasandysaucescalescarfscenescentscoopscopescorescoutscrapscrewseizesenseservesevenshadeshakeshallshapesharesharksharpsheepsheetshelfshellshiftshineshinyshirtshockshoreshortshoutshrugsightsillysincesirenskateskillskirtskullslatesleepsliceslideslopesmartsmellsmilesmokesnacksnakesneaksolarsolidsolvesorrysoundsouthspacesparesparkspeakspearspeedspellspendspicespicyspillspinespoonsportspraysquadstackstaffstagestainstairstakestampstandstartstatesteaksteamsteelsteepsternstickstillstingstockstonestoodstoolstormstorystovestrawstripstuckstudystuffstylesugarsunnysupersurgeswampswearsweatsweepsweetswiftswingswordsyruptabletakentasteteachteethtempotensethankthemethickthiefthingthinkthirdthornthosethreethrewthrowthumbtigertighttimertiredtitletoasttodaytokentoothtopictorchtotaltouchtoughtoweltowertoxictracetracktradetrailtraintraittreattrendtrialtribetricktriedtrooptrucktrulytrunktrusttruthtuliptutortwicetwistultrauncleunderunityuntilupperupseturbanusageusualvalidvaluevaporvaultversevideovigorvinylviralvirusvisitvitalvividvocalvoicevoterwagonwaistwastewatchwaterwearyweavewedgeweirdwhalewheatwheelwherewhichwhilewhirlwhitewholewhosewidenwidthwitchwomanworldworryworseworstworthwouldwoundwovenwrathwreckwristwritewrongyachtyearnyeastyieldyoungyouthzebra';
const Words = {
  valid: null,
  load() {
    if (this.valid) return Promise.resolve(this.valid);
    return fetch('media/words5.txt').then(r => r.ok ? r.text() : Promise.reject()).then(t => { const s = new Set(); for (let i = 0; i < t.length; i += 5) s.add(t.slice(i, i + 5)); for (let i = 0; i < WORD_ANSWERS.length; i += 5) s.add(WORD_ANSWERS.slice(i, i + 5)); return (this.valid = s); }).catch(() => null);
  },
  answer(k) { const n = WORD_ANSWERS.length / 5, i = ((k * 7919) % n + n) % n; return WORD_ANSWERS.slice(i * 5, i * 5 + 5); },
  dayNo() { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 864e5); },
  /* score a guess: 2 = green, 1 = yellow, 0 = grey (repeated letters handled properly) */
  mark(g, a) {
    const res = [0, 0, 0, 0, 0], left = {};
    for (let i = 0; i < 5; i++) if (g[i] === a[i]) res[i] = 2; else left[a[i]] = (left[a[i]] || 0) + 1;
    for (let i = 0; i < 5; i++) if (res[i] !== 2 && left[g[i]]) { res[i] = 1; left[g[i]]--; }
    return res;
  },
};
APPS.words = {
  title: 'Five Letters', icon: 'words', w: 360, h: 540, minW: 300, minH: 440,
  open(win) {
    gameCSS('css-words', `
.wd { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px 6px; background: var(--face); }
.wd-board { display: grid; grid-template-rows: repeat(6, 1fr); gap: 4px; height: min(52vh, 300px); aspect-ratio: 5 / 6; }
.wd-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
.wd-row.shake { animation: wdshake .4s; }
@keyframes wdshake { 20%, 60% { transform: translateX(-5px); } 40%, 80% { transform: translateX(5px); } }
.wd-t { display: grid; place-items: center; background: #fff; font: 700 clamp(16px, 4.6vh, 26px) var(--ui); text-transform: uppercase; box-shadow: inset 1px 1px var(--lo), inset -1px -1px var(--hi), inset 2px 2px var(--dk), inset -2px -2px var(--mid); }
.wd-t.g2 { background: #008000; color: #fff; box-shadow: inset -1px -1px var(--dk), inset 1px 1px #00c000; }
.wd-t.g1 { background: #ffff00; color: #000; box-shadow: inset -1px -1px #808000, inset 1px 1px #ffffc0; }
.wd-t.g0 { background: #808080; color: #fff; box-shadow: inset -1px -1px var(--dk), inset 1px 1px #c0c0c0; }
.wd-kb { display: flex; flex-direction: column; gap: 4px; width: 100%; max-width: 440px; }
.wd-kr { display: flex; gap: 3px; justify-content: center; }
.wd-kr .btn { min-width: 0; flex: 1; max-width: 38px; min-height: 40px; padding: 0; font-weight: 700; }
.wd-kr .btn.big { max-width: 60px; flex: 1.6; font-size: 11px; font-weight: 400; }
.wd-kr .btn.g2 { background: #008000; color: #fff; } .wd-kr .btn.g1 { background: #ffff00; } .wd-kr .btn.g0 { background: #808080; color: #fff; }
.wd-msg { min-height: 18px; font-weight: 700; color: #000080; }
.wd-stats { display: flex; flex-direction: column; gap: 3px; min-width: 220px; }
.wd-bar { display: flex; gap: 4px; align-items: center; } .wd-bar i { display: block; height: 14px; background: #000080; color: #fff; font: 700 10px/14px var(--ui); text-align: right; padding-right: 3px; font-style: normal; min-width: 14px; }
`);
    let mode = 'daily', answer, guesses, cur, done, msgT;
    const board = h('div.wd-board'), msg = h('div.wd-msg'), kb = h('div.wd-kb'), keys = {};
    const stL = h('span'), stR = h('span');
    win.body.append(h('div.wd', board, msg, kb), h('div.status', stL, stR));
    const rows = Array.from({ length: 6 }, () => { const r = h('div.wd-row', Array.from({ length: 5 }, () => h('div.wd-t'))); board.append(r); return r; });
    ['qwertyuiop', 'asdfghjkl', '+zxcvbnm-'].forEach(line => {
      const r = h('div.wd-kr'); kb.append(r);
      for (const ch of line) {
        const b = ch === '+' ? h('button.btn.big', 'Enter') : ch === '-' ? h('button.btn.big', { 'aria-label': 'Backspace' }, '⌫') : h('button.btn', ch.toUpperCase());
        b.onclick = () => press(ch === '+' ? 'Enter' : ch === '-' ? 'Backspace' : ch); if (ch !== '+' && ch !== '-') keys[ch] = b; r.append(b);
      }
    });
    const say = (t, ms = 1800) => { msg.textContent = t; clearTimeout(msgT); if (ms) msgT = setTimeout(() => { msg.textContent = ''; }, ms); };
    const stats = () => Store.data.words || (Store.data.words = { played: 0, won: 0, streak: 0, best: 0, dist: [0, 0, 0, 0, 0, 0], lastDay: -1 });
    function paint() {
      rows.forEach((r, i) => {
        const g = guesses[i], word = g || (i === guesses.length ? cur : ''), m = g ? Words.mark(g, answer) : null;
        [...r.children].forEach((t, j) => { t.textContent = word[j] || ''; t.className = 'wd-t' + (m ? ' g' + m[j] : ''); });
      });
      const best = {}; for (const g of guesses) Words.mark(g, answer).forEach((v, j) => { best[g[j]] = Math.max(best[g[j]] ?? -1, v); });
      for (const [ch, b] of Object.entries(keys)) b.className = 'btn' + (best[ch] !== undefined ? ' g' + best[ch] : '');
      stL.textContent = mode === 'daily' ? `Daily word #${Words.dayNo() + 1}` : 'Practice';
      const s = stats(); stR.textContent = `Streak ${s.streak}  ·  Won ${s.won}/${s.played}`;
    }
    function save() { if (mode === 'daily') { Store.data.wordsDay = { day: Words.dayNo(), guesses }; Store.save(); } }
    function begin(m) {
      mode = m; cur = ''; done = false; msg.textContent = '';
      if (m === 'daily') { answer = Words.answer(Words.dayNo()); const sv = Store.data.wordsDay; guesses = sv && sv.day === Words.dayNo() ? sv.guesses.slice() : []; done = guesses.includes(answer) || guesses.length >= 6; if (done) say(guesses.includes(answer) ? 'Already solved today. Try Practice!' : 'The word was ' + answer.toUpperCase(), 0); }
      else { answer = Words.answer(Math.floor(Math.random() * 1e6)); guesses = []; }
      paint();
    }
    async function submit() {
      if (cur.length < 5) { rows[guesses.length].classList.remove('shake'); void rows[guesses.length].offsetWidth; rows[guesses.length].classList.add('shake'); return say('Not enough letters'); }
      const valid = await Words.load();
      if (valid && !valid.has(cur)) { const r = rows[guesses.length]; r.classList.remove('shake'); void r.offsetWidth; r.classList.add('shake'); Sound.ding(); return say('Not in word list'); }
      guesses.push(cur); cur = ''; save(); paint(); Sound.click();
      const won = guesses[guesses.length - 1] === answer;
      if (won || guesses.length >= 6) {
        done = true; const s = stats();
        if (mode === 'daily') { s.played++; if (won) { s.won++; s.streak++; s.best = Math.max(s.best, s.streak); s.dist[guesses.length - 1]++; } else s.streak = 0; Store.save(); }
        paint();
        if (won) { Sound.tada(); say(['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'][guesses.length - 1], 0); }
        else { Sound.crash(); say('The word was ' + answer.toUpperCase(), 0); }
        setTimeout(showStats, 1100);
      }
    }
    function press(k) {
      if (done) return;
      if (k === 'Enter') return submit();
      if (k === 'Backspace') { cur = cur.slice(0, -1); return paint(); }
      if (/^[a-z]$/i.test(k) && cur.length < 5) { cur += k.toLowerCase(); Sound.key && Sound.key(); paint(); }
    }
    function showStats() {
      const s = stats(), max = Math.max(1, ...s.dist), w = WM.create({ title: 'Statistics', icon: 'words', w: 270, h: 300, resizable: false });
      const share = guesses.map(g => Words.mark(g, answer).map(v => ['⬜', '🟨', '🟩'][v]).join('')).join('\n');
      const copy = h('button.btn', 'Copy result'); copy.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(`Five Letters ${mode === 'daily' ? '#' + (Words.dayNo() + 1) : '(practice)'} ${guesses.includes(answer) ? guesses.length : 'X'}/6\n\n${share}`).then(() => { copy.textContent = 'Copied!'; }, () => {}); };
      const again = h('button.btn', 'Practice'); again.onclick = () => { WM.close(w); begin('practice'); };
      w.body.append(h('div.wd-stats', { style: { padding: '8px' } },
        h('div', `Played ${s.played}   Won ${s.played ? Math.round(s.won / s.played * 100) : 0}%`), h('div', `Streak ${s.streak}   Best streak ${s.best}`), h('hr.groove'), h('b', 'Guesses'),
        s.dist.map((n, i) => h('div.wd-bar', h('span', String(i + 1)), h('i', { style: { width: (8 + n / max * 170) + 'px' } }, String(n)))),
        h('div.row', { style: { display: 'flex', gap: '6px', marginTop: '8px', justifyContent: 'center' } }, copy, again)));
    }
    win.el.addEventListener('keydown', (e) => { if (e.ctrlKey || e.metaKey || e.altKey) return; if (e.key === 'Enter' || e.key === 'Backspace' || /^[a-z]$/i.test(e.key)) { e.preventDefault(); press(e.key); } });
    WM.menubar(win, [{ label: 'Game', items: () => [
      { label: "Today's word", check: mode === 'daily', action: () => begin('daily') }, { label: 'Practice (new word)', key: 'F2', action: () => begin('practice') }, '-',
      { label: 'Statistics...', action: showStats }, { label: 'Exit', action: () => WM.close(win) },
    ] }, { label: 'Help', items: () => [{ label: 'How to play', action: () => WM.alert('Five Letters', 'Guess the 5-letter word in 6 tries. Type a word and press Enter.\n\nGreen: right letter, right spot.\nYellow: the letter is in the word, somewhere else.\nGrey: not in the word at all.\n\nA new daily word every day at midnight.', 'words') }] }]);
    win.el.addEventListener('keydown', (e) => { if (e.key === 'F2') { e.preventDefault(); begin('practice'); } });
    gameFocus(win);
    Words.load(); begin('daily');
  },
};
