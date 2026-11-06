/* ============================================================
   UI: banners, shop, missions, collection, THE GAME, ending, loop
   ============================================================ */
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtTime = (ms) => { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return h ? `${h}h ${m}m` : `${m}m ${s % 60}s`; };
const coinSvg = '<svg aria-hidden="true"><use href="#i-coin"/></svg>';
const DEFAULT_PAL = ['#ff5a3c', '#ffcf33', '#3ddcb4', '#4aa8ff', '#b06bff', '#ff5fa2'];
let freshTicket = -1;

/* ---------- banners ---------- */
function setMachineTheme(b) {
  const B = BANNERS[b], m = $('#machine');
  m.style.setProperty('--m-main', B.main);
  m.style.setProperty('--m-acc', B.acc);
  $('#m-price').textContent = b === META || hidden() ? '???' : fmt(B.cost);
  Dome.setPalette(b === META ? ['#ffffff', '#cfcfd8', '#2a2a33', '#8a8a96'] : b === 4 ? ['#6a5cff', '#dfe3f5', '#ffcf33', '#8ff0ff', '#ff5fa2'] : DEFAULT_PAL);
}
function renderBanners() {
  const wrap = $('#banners'); wrap.innerHTML = '';
  BANNERS.forEach((B, i) => {
    if (i === META && S.unlocked < 6) return;
    const open = i < S.unlocked;
    const el = document.createElement('button');
    el.className = 'ticket' + (i === S.banner ? ' active' : '') + (open ? '' : ' locked') + (i === META ? ' meta' : '') + (i === freshTicket ? ' fresh' : '');
    const prog = i === META ? `${S.meta}/12 taken` : open ? `${uniqueIn(S, i)}/12 found` : `locked · ${Math.min(uniqueIn(S, i - 1), UNLOCK_NEED)}/${UNLOCK_NEED}`;
    el.innerHTML = `<span class="t-jp">${B.jp}</span><span class="t-name">${esc(B.name)}</span><span class="t-prog">${esc(prog)}</span>`;
    el.setAttribute('aria-pressed', String(i === S.banner));
    el.onclick = () => selectBanner(i);
    wrap.appendChild(el);
  });
  freshTicket = -1;
  const act = wrap.querySelector('.active');
  if (act && wrap.scrollWidth > wrap.clientWidth + 2) wrap.scrollLeft = Math.max(0, act.offsetLeft - 16);
}
function selectBanner(i) {
  if (busy) return;
  AU.init(); AU.play('click');
  if (i >= S.unlocked) {
    const need = UNLOCK_NEED - uniqueIn(S, i - 1);
    say(`That one is locked. Find ${need} more thing${need === 1 ? '' : 's'} in ${BANNERS[i - 1].name} first.`, 3400, 'flat');
    return;
  }
  S.banner = i; setMachineTheme(i); renderBanners(); renderPity(); refreshPullButtons();
  say(i === META ? pick(LINES.metaIdle) : BANNERS[i].blurb, 3400, i === META ? 'worried' : 'smile');
}
function renderPity() {
  const b = S.banner;
  $('#pity').innerHTML = b === META
    ? `THE GAME · <b>${12 - S.meta}</b> pieces left`
    : `Pity <b>${S.pity[b] || 0}</b>/${PITY} · guaranteed Ultra Rare at ${PITY}`;
}
function refreshPullButtons() {
  const b = S.banner, c1 = pullCost(S, b);
  $('#cost1').textContent = money(c1);
  $('#pull1').classList.toggle('cant', S.tokens < c1);
  $('#pull1').disabled = busy || (b === META && S.meta >= 12);
  if (b === META) { $('#cost10').textContent = 'n/a'; $('#pull10').classList.add('cant'); }
  else { const c10 = multiCost(S, b); $('#cost10').textContent = money(c10); $('#pull10').classList.toggle('cant', S.tokens < c10); }
  $('#pull10').disabled = busy;
}
function ghostRate() { return 2 * upLvl(S, 'ghost') * tapValue(S, TPS); }
function updateWallet() {
  $('#tokens').textContent = hidden() ? '???' : fmt(S.tokens);
  $('#tps').textContent = hidden() ? '+???/s' : '+' + fmtRate(TPS + ghostRate()) + '/s';
}

/* ---------- unlocks ---------- */
function checkUnlocks() {
  while (S.unlocked < 5 && uniqueIn(S, S.unlocked - 1) >= UNLOCK_NEED) { S.unlocked++; announceBanner(S.unlocked - 1); }
  if (S.unlocked === 5 && S.owned.cos_universe) { S.unlocked = 6; announceMeta(); }
}
function announceBanner(nb) {
  AU.play('fanfare');
  toast(`New banner unlocked: <b>${esc(BANNERS[nb].name)}</b>`, 3600);
  S.banner = nb; freshTicket = nb; setMachineTheme(nb);
  setTimeout(() => say(pick(LINES.unlock), 4200, 'joy'), 150);
  const r = $('#machine').getBoundingClientRect();
  FX.burst(r.left + r.width / 2, r.top + r.height * .3, 90, [BANNERS[nb].main, BANNERS[nb].acc, '#ffffff'], { speed: 760 });
}
function announceMeta() {
  AU.play('glitchLong'); AU.setWobble(.35);
  S.banner = META; freshTicket = META; setMachineTheme(META);
  const app = $('#app'); app.style.animation = 'shake 1s'; setTimeout(() => { app.style.animation = ''; }, 1000);
  setTimeout(() => say(LINES.metaWarn[0], 9000, 'worried'), 500);
  toast('A new banner appeared: <b>THE GAME</b>', 4600);
}
function afterPull(results) {
  TPS = calcTps(S);
  const best = results.reduce((a, x) => (x.it.r > a.it.r ? x : a), results[0]);
  if (best.it.r === 6) applyMeta(best.it, true);
  else if (results.length === 1 && !best.isNew) say(pick(LINES.dupe), 3000, 'smile');
  else say(pick(LINES['r' + best.it.r]), 3200, best.it.r >= 3 ? 'joy' : 'happy');
  checkUnlocks();
  renderAll();
  save();
}

/* ---------- shop ---------- */
function renderShop() {
  const p = $('#panel-shop');
  p.innerHTML = '<h3>The Shop</h3><p class="sub">Upgrades are permanent. Gacha-chan set the prices. Do not ask her about the prices.</p>' +
    UPGRADES.map(u => `<div class="row" data-up="${u.id}"><div class="ico" aria-hidden="true">${u.e}</div><div class="txt"><div class="ttl">${esc(u.n)}<span class="lv"></span></div><div class="dsc">${esc(u.d)}</div></div><button class="buy"></button></div>`).join('');
  p.querySelectorAll('.row').forEach(row => { row.querySelector('.buy').onclick = (e) => buyUp(row.dataset.up, e.currentTarget); });
  updateShop();
}
function updateShop() {
  document.querySelectorAll('#panel-shop .row').forEach(row => {
    const u = UPMAP[row.dataset.up], l = upLvl(S, u.id), btn = row.querySelector('.buy');
    row.querySelector('.lv').textContent = u.max > 1 ? ` Lv ${l}/${u.max}` : (l ? ' owned' : '');
    if (l >= u.max) { if (btn._h !== 'max') { btn.textContent = 'MAX'; btn._h = 'max'; } btn.disabled = true; btn.classList.add('maxed'); return; }
    btn.classList.remove('maxed');
    const c = upCost(u.id, l), html = coinSvg + money(c);
    if (btn._h !== html) { btn.innerHTML = html; btn._h = html; btn.setAttribute('aria-label', `Buy ${u.n} for ${money(c)} tokens`); }
    btn.disabled = S.tokens < c;
  });
}
function buyUp(id, btn) {
  const u = UPMAP[id], l = upLvl(S, id);
  if (l >= u.max) return;
  const c = upCost(id, l);
  if (S.tokens < c) { AU.play('nope'); return; }
  AU.init();
  S.tokens -= c; S.spent += c; S.up[id] = l + 1;
  AU.play('buy');
  if (id === 'gold') $('#crank').classList.add('gold');
  TPS = calcTps(S); updateShop(); updateWallet(); refreshPullButtons(); save();
  say(id === 'gold' ? 'A golden crank! I feel like royalty. Expensive royalty.' : pick(LINES.buy), 2600, 'joy');
  if (btn) { const r = btn.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 18, ['#ffcf33', '#3ddcb4', '#ffffff'], { speed: 360, size: 6 }); }
}

/* ---------- missions ---------- */
function metric(k) {
  switch (k) {
    case 'pulls': return S.pulls; case 'taps': return S.taps; case 'multi': return S.multi; case 'commons': return S.commons;
    case 'srplus': return S.srplus; case 'unlocked': return S.unlocked; case 'idle': return Math.floor(S.idleBest);
    case 'maxlv': return maxLevel(S); case 'ssr': return S.ssr; case 'unique': return uniqueAll(S); case 'ur': return S.ur;
    case 'spent': return S.spent; default: return 0;
  }
}
const notified = new Set();
let missionSig = '';
function renderMissions(force) {
  const rows = MISSIONS.map(m => {
    const v = Math.min(metric(m.k), m.n), done = v >= m.n, cl = !!S.claimed[m.id];
    return { m, v, done, cl, pct: Math.floor(v / m.n * 100), ord: cl ? 2 : done ? 0 : 1 };
  });
  const sig = rows.map(r => (r.cl ? 'c' : r.done ? 'd' : Math.floor(r.pct / 4))).join(',') + '|' + newestCost(S) + hidden();
  if (!force && sig === missionSig) return;
  missionSig = sig;
  rows.sort((a, b) => a.ord - b.ord);
  const p = $('#panel-missions');
  p.innerHTML = '<h3>Missions</h3><p class="sub">Rewards grow with your newest banner.</p>' + rows.map(({ m, v, done, cl, pct }) => {
    const prog = m.k === 'spent' ? `${money(v)} / ${fmt(m.n)}` : `${fmt(v)} / ${fmt(m.n)}`;
    const right = cl ? '<span class="claimed">done ✓</span>' : done ? `<button class="buy" data-claim="${m.id}">Claim ${coinSvg}${money(missionReward(S, m))}</button>` : `<span class="claimed">${pct}%</span>`;
    return `<div class="row"><div class="ico" aria-hidden="true" style="font-family:var(--display);font-size:18px">${cl ? '✓' : done ? '!' : '…'}</div><div class="txt"><div class="ttl">${esc(m.t)}</div>${m.d ? `<div class="dsc">${esc(m.d)}</div>` : ''}${cl ? '' : `<div class="bar${done ? ' done' : ''}"><i style="width:${pct}%"></i></div><div class="dsc" style="font-family:var(--pixel)">${prog}</div>`}</div>${right}</div>`;
  }).join('');
  p.querySelectorAll('[data-claim]').forEach(b => { b.onclick = () => claim(b.dataset.claim, b); });
}
function checkMissions() {
  let n = 0;
  const tabGone = $('#tab-missions').hidden;
  for (const m of MISSIONS) {
    if (S.claimed[m.id] || metric(m.k) < m.n) continue;
    n++;
    if (!notified.has(m.id)) {
      notified.add(m.id);
      if (!tabGone) { toast(`Mission complete: <b>${esc(m.t)}</b>`, 3000); AU.play('mission'); }
    }
  }
  const badge = $('#mbadge'); badge.hidden = !n; badge.textContent = n;
  if (activeTab === 'missions') renderMissions();
}
function claim(id, btn) {
  const m = MISSIONS.find(x => x.id === id);
  if (!m || S.claimed[id] || metric(m.k) < m.n) return;
  const rw = missionReward(S, m);
  S.claimed[id] = 1; S.tokens += rw; S.earned += rw;
  AU.init(); AU.play('coin');
  if (btn) { const r = btn.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top, 26, ['#ffcf33', '#ffe27a'], { shape: 'coin', up: true, speed: 520, size: 9 }); }
  toast(`+${money(rw)} tokens`, 2000);
  renderMissions(true); checkMissions(); save();
}

/* ---------- collection ---------- */
function renderDex() {
  const p = $('#panel-dex');
  let h = `<div class="dex-stats"><div><b>${uniqueAll(S)}/60</b><span>things collected</span></div><div><b>${fmt(S.pulls)}</b><span>capsules opened</span></div><div><b>${money(S.spent)}</b><span>tokens spent</span></div><div><b>${fmtTime(S.playMs)}</b><span>time in the shop</span></div></div>`;
  BANNERS.forEach((B, bi) => {
    if (bi === META && S.unlocked < 6) return;
    const have = B.items.filter(i => S.owned[i.id]).length;
    h += `<div class="dex-sec"><div class="dex-head"><h3>${esc(B.name)}</h3><span class="cnt">${B.jp} · ${have}/12</span></div><div class="dex-grid">`;
    for (const it of B.items) {
      const c = S.owned[it.id] || 0, meta = it.b === META;
      if (c) h += `<button class="tile${it.r === 5 ? ' ur' : ''}${meta ? ' meta' : ''}" style="--rcol:${meta ? '#1a1433' : RAR[it.r].col}" data-item="${it.id}" aria-label="${esc(it.n)}, ${RAR[it.r].name}${meta ? '' : ', level ' + c}"><span class="em">${it.e}</span><span class="rk">${RAR[it.r].k}</span>${meta ? '' : `<span class="lvb">Lv${Math.min(c, 99)}</span>`}</button>`;
      else h += `<div class="tile no" role="img" aria-label="Not found yet"><span class="em">${meta ? '?' : it.e}</span></div>`;
    }
    h += '</div></div>';
  });
  p.innerHTML = h;
  p.querySelectorAll('[data-item]').forEach(t => { t.onclick = () => showItem(t.dataset.item); });
}
function showItem(id) {
  const it = ITEMS[id], c = S.owned[id] || 0, meta = it.b === META;
  const info = meta ? '<p style="font-family:var(--pixel)">You took this from the game.</p>'
    : `<p style="font-family:var(--pixel)">Lv ${c} · earns ${money(itemTps(S, it) * incomeMult(S))} tokens/s</p>`;
  openModal(`<div class="m-em">${it.e}</div><span class="tag" style="display:inline-block;background:${meta ? '#ffffff' : RAR[it.r].col}">${RAR[it.r].name}</span><h2>${esc(it.n)}</h2><p>${esc(it.d)}</p>${info}<p style="font-size:12px">From the ${esc(BANNERS[it.b].name)} banner</p>`);
}
function openModal(html) { $('#modal-body').innerHTML = html; $('#modal').hidden = false; $('#modal-x').focus({ preventScroll: true }); }
function closeModal() { $('#modal').hidden = true; }
function openMenu() {
  AU.init(); AU.play('click');
  openModal(`<h2>Menu</h2>
    <div class="opt"><span><b>How to play</b><br><span style="font-size:13px;color:var(--ink2)">Pull capsules. Everything you own earns tokens every second, and duplicates level up. Find ${UNLOCK_NEED} things in a banner to open the next one. Something happens after the universe.</span></span></div>
    <div class="opt"><span><b>Start over</b><br><span style="font-size:13px;color:var(--ink2)">Erases this save and refills the machine.</span></span><button class="buy danger" id="btn-reset">Start over</button></div>
    <p style="font-size:12px">Made by Claude, with tokens that were about to expire anyway.</p>`);
  const b = $('#btn-reset'); let armed = false;
  b.onclick = () => { if (!armed) { armed = true; b.textContent = 'Tap again to erase'; return; } closeModal(); hardReset(); };
}
function setTab(t) {
  activeTab = t;
  ['shop', 'missions', 'dex'].forEach(k => {
    const on = k === t;
    $('#tab-' + k).setAttribute('aria-selected', String(on));
    $('#panel-' + k).hidden = !on;
  });
  if (t === 'dex') renderDex();
  if (t === 'missions') renderMissions(true);
  if (t === 'shop') updateShop();
}
function renderAll() {
  renderBanners(); renderPity(); refreshPullButtons(); updateWallet(); updateShop(); checkMissions();
  if (activeTab === 'dex') renderDex();
  if (activeTab === 'missions') renderMissions(true);
}

/* ---------- THE GAME: taking the game apart ---------- */
const META_FX = {
  music() { AU.own(); const b = $('#btn-music'); b.disabled = true; b.setAttribute('aria-pressed', 'false'); b.title = 'You own the music now'; },
  background() { document.body.classList.add('fx-nobg'); },
  colors() { document.body.classList.add('fx-gray'); },
  font() { document.body.classList.add('fx-font'); },
  shop() { $('#tab-shop').hidden = true; if (activeTab === 'shop') setTab('dex'); },
  missions() { $('#tab-missions').hidden = true; if (activeTab === 'missions') setTab('dex'); },
  counter() { document.body.classList.add('fx-nocount'); $('#m-price').textContent = '???'; },
  layout() { document.body.classList.add('fx-layout'); },
  title() { const l = $('#logo-main'); l.textContent = 'untitled'; l.className = 'logo-untitled'; $('#logo-jp').hidden = true; document.title = 'untitled'; $('#m-svg .m-sign').textContent = '?????'; },
  button() { document.body.classList.add('fx-nobutton'); $('#pull-row').hidden = true; $('#tap-hint').textContent = 'There is no pull button anymore. There is still a crank.'; },
  face() { document.body.classList.add('fx-noface'); },
  machine() { startEnding(); },
};
const META_TARGET = { music: '#btn-music', shop: '#tab-shop', missions: '#tab-missions', counter: '#wallet', title: '#logo', button: '#pull-row' };
function suck(el) {
  if (!el) return;
  const r = el.getBoundingClientRect(), m = $('#machine').getBoundingClientRect();
  if (!r.width) return;
  const g = el.cloneNode(true);
  g.removeAttribute('id'); g.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  g.classList.add('ghosted');
  Object.assign(g.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  document.body.appendChild(g);
  el.style.visibility = 'hidden';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const dx = (m.left + m.width / 2) - (r.left + r.width / 2), dy = (m.top + m.height * .34) - (r.top + r.height / 2);
    g.style.transform = `translate(${dx}px, ${dy}px) scale(.04) rotate(620deg)`;
    g.style.opacity = '0';
  }));
  setTimeout(() => { g.remove(); el.style.visibility = ''; }, 1100);
}
function applyMeta(it, animate) {
  const fx = it.fx, k = BANNERS[META].items.indexOf(it);
  AU.setWobble(Math.min(1, .35 + k * .06));
  if (!animate) { META_FX[fx](); return; }
  if (fx === 'machine') { META_FX.machine(); return; }
  AU.play('slurp');
  const tgt = META_TARGET[fx];
  if (tgt) suck($(tgt));
  if (fx === 'face') { const f = $('#m-face'); f.style.transition = 'transform .9s cubic-bezier(.6,-0.4,.7,.3), opacity .9s'; f.style.transformBox = 'view-box'; f.style.transformOrigin = '150px 300px'; f.style.transform = 'translateY(-200px) scale(.1) rotate(300deg)'; f.style.opacity = '0'; }
  setTimeout(() => {
    META_FX[fx]();
    renderAll();
    if (LINES.meta[k]) say(LINES.meta[k], 6500, 'worried');
    if (fx === 'layout') AU.play('boom');
  }, tgt ? 750 : 250);
}

/* ---------- ending ---------- */
async function startEnding() {
  S.ended = true; save();
  busy = true; refreshPullButtons();
  AU.play('glitchLong');
  $('#machine').classList.add('vanish');
  await sleep(1700);
  AU.play('boom');
  $('#app').style.opacity = '0';
  await sleep(1400);
  await playEnding();
}
function journey() {
  const picks = [];
  for (let b = 1; b <= 3; b++) {
    const own = BANNERS[b].items.filter(i => S.owned[i.id]).sort((x, y) => y.r - x.r);
    if (own.length) picks.push(own[0].n);
  }
  return picks.length ? `Then you collected ${picks.join(', ')}, and The Universe.` : 'Then you collected The Universe.';
}
async function playEnding() {
  const E = $('#ending'); E.hidden = false;
  const box = $('#end-lines'); box.hidden = false; box.innerHTML = '';
  const lines = ['There is nothing left to pull.', `Your first capsule was ${S.first || 'A Single Sock'}.`, journey(), 'Then you collected the game itself.', 'The machine is empty now.'];
  for (const t of lines) { const p = document.createElement('p'); p.textContent = t; box.appendChild(p); AU.play('type'); await sleep(2200); }
  await sleep(900);
  box.hidden = true;
  await rollCredits();
  await lastCapsule();
  finalScreen();
}
const CREDIT_ROLE = {
  junk_sock: 'as the protagonist', junk_tupper: 'as itself (still not returned)', liv_duck: 'as code reviewer', liv_goat: 'as the GOAT',
  pl_parking: 'as a loading zone', pl_atlantis: 'as a junk drawer', con_imposter: 'as you, sometimes', con_meaning: 'as more capsules',
  cos_universe: 'as everything', meta_face: 'as herself', meta_machine: 'as Gacha-chan', meta_font: 'as Times New Roman',
};
function rollCredits() {
  return new Promise(resolve => {
    if (S.music) AU.musicBox();
    const C = $('#credits'), roll = $('#credits-roll');
    let h = `<div class="big">OMNIGACHA</div><div class="stat">a game about wanting things</div><h4>STARRING</h4>`;
    for (let b = 0; b <= META; b++) for (const it of BANNERS[b].items) {
      const own = S.owned[it.id];
      h += `<div class="cr"><span class="a">${esc(it.n)}</span><span class="e">${it.e}</span><span class="b">${own ? esc(CREDIT_ROLE[it.id] || 'as itself') : '<i style="opacity:.45">never pulled</i>'}</span></div>`;
    }
    h += `<h4>BY THE NUMBERS</h4><div class="stat">${fmt(S.spent)} tokens spent</div><div class="stat">${fmt(S.pulls)} capsules opened</div><div class="stat">${fmt(S.commons)} Commons (we are sorry)</div><div class="stat">${fmt(S.taps)} taps on a machine that never asked for it</div><div class="stat">${fmtTime(S.playMs)} in the shop</div>`;
    h += '<h4>MUSIC</h4><div class="stat">“The Music”, on loan from your collection</div>';
    h += '<h4>SPECIAL THANKS</h4><div class="stat">You, for spending your tokens on this</div><div class="stat">Claude, for building it out of tokens that were about to expire</div><div style="height:30vh"></div>';
    roll.innerHTML = h;
    C.hidden = false;
    const skip = $('#end-skip'); skip.hidden = false;
    let finished = false;
    const done = () => { if (finished) return; finished = true; C.hidden = true; skip.hidden = true; roll.style.animation = ''; resolve(); };
    requestAnimationFrame(() => {
      const dist = roll.offsetHeight + innerHeight;
      roll.style.setProperty('--roll-dist', `-${dist}px`);
      roll.style.animation = `roll ${Math.max(22, dist / 60)}s linear forwards`;
    });
    roll.onanimationend = done;
    skip.onclick = done;
  });
}
function lastCapsule() {
  return new Promise(resolve => {
    const F = $('#end-final'); F.hidden = false;
    F.innerHTML = `<p>One more capsule rolls out from somewhere.</p><p style="font-size:13px;opacity:.7">This one is free.</p>
      <button class="cap drop" id="last-cap" aria-label="Tap to open the last capsule" style="--cc:#ffffff"><span class="cap-glow"></span><span class="cap-half cap-top"></span><span class="cap-half cap-bot"></span><svg class="cracks" viewBox="0 0 170 170" aria-hidden="true"><path class="k1" d="M14 86 L38 74 L52 94 L76 70 L92 92"/><path class="k2" d="M92 92 L110 72 L124 96 L156 80"/></svg></button>
      <p class="rv-hint" id="last-hint">TAP TO OPEN</p>`;
    const cap = $('#last-cap'); let taps = 0;
    cap.focus({ preventScroll: true });
    cap.onclick = () => {
      AU.init(); taps++;
      AU.play('capTap', taps - 1);
      cap.classList.remove('drop', 'wob'); void cap.offsetWidth; cap.classList.add('wob');
      cap.style.setProperty('--glow', taps * .35);
      if (taps === 1) cap.classList.add('c1');
      if (taps === 2) cap.classList.add('c2');
      if (taps >= 3) {
        cap.onclick = null; cap.classList.add('open');
        AU.play('reveal', 5);
        const q = cap.getBoundingClientRect();
        FX.burst(q.left + q.width / 2, q.top + q.height / 2, 220, ['#ff5fa2', '#ffcf33', '#3ddcb4', '#4aa8ff', '#b06bff', '#ffffff'], { speed: 820, size: 9 });
        setTimeout(resolve, 650);
      }
    };
  });
}
function finalScreen() {
  document.body.classList.remove('fx-nobg', 'fx-gray', 'fx-font', 'fx-layout', 'fx-nocount');
  const F = $('#end-final'); F.hidden = false;
  F.innerHTML = `<div class="rv-rarity" style="--rc:#ff5fa2;animation:slam .55s cubic-bezier(.2,1.6,.4,1) both, hue 2.2s linear infinite">1 OF 1</div>
    <div class="rv-emoji" aria-hidden="true">👤</div>
    <div class="rv-label"><div class="rv-tags"><span class="tag new">NEW!</span></div><h2 class="rv-name">You</h2><p class="rv-flavor">The rarest thing that was ever in the machine. There has only ever been one.</p></div>
    <div class="the-end">THE END</div>
    <p>Everything you took has been put back.</p>
    <p class="fin-stats">${fmt(S.spent)} tokens spent · ${fmt(S.pulls)} pulls · ${fmtTime(S.playMs)}</p>
    <p>Your tokens have been successfully wasted.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="big-btn" id="btn-ngp">New Game+ (income ×${(S.ng || 0) + 2})</button><button class="big-btn ghost" id="btn-stay">Stay here</button></div>`;
  $('#btn-ngp').onclick = newGamePlus;
  $('#btn-stay').onclick = (e) => { e.currentTarget.textContent = 'Okay. Staying.'; };
}
function newGamePlus() {
  const ng = (S.ng || 0) + 1, keep = { music: S.music, sfx: S.sfx };
  S = Object.assign(freshState(ng), keep); save();
  applyWorld(); AU.shopMode();
  toast(`New Game+ ${ng}: all income ×${ng + 1}. The machine is full again.`, 4200);
}
function hardReset() {
  const keep = { music: S.music, sfx: S.sfx };
  S = Object.assign(freshState(0), keep); save();
  notified.clear();
  applyWorld(); AU.shopMode();
  toast('Fresh start. The machine is full again.', 3200);
}

/* ---------- world state from save ---------- */
function applyWorld() {
  document.body.className = '';
  $('#tab-shop').hidden = false; $('#tab-missions').hidden = false; $('#pull-row').hidden = false;
  const l = $('#logo-main'); l.textContent = 'OMNIGACHA'; l.className = 'logo-main'; $('#logo-jp').hidden = false;
  document.title = 'Omnigacha'; $('#m-svg .m-sign').textContent = '全部ガチャ';
  const mb = $('#btn-music'); mb.disabled = false; mb.title = 'Music';
  $('#tap-hint').textContent = 'Tap the machine to shake loose tokens.';
  $('#machine').classList.remove('vanish'); $('#m-face').removeAttribute('style');
  $('#app').style.opacity = ''; $('#ending').hidden = true; $('#end-final').hidden = true; $('#end-final').innerHTML = '';
  $('#crank').classList.toggle('gold', !!upLvl(S, 'gold'));
  $('#ng-badge').hidden = !S.ng; $('#ng-badge').textContent = 'NG+' + S.ng;
  AU.setMusic(S.music); AU.setSfx(S.sfx);
  mb.setAttribute('aria-pressed', String(S.music)); $('#btn-sfx').setAttribute('aria-pressed', String(S.sfx));
  AU.setWobble(S.unlocked >= 6 ? Math.min(1, .3 + S.meta * .06) : 0);
  setTab(activeTab);
  for (let k = 0; k < Math.min(S.meta, 11); k++) META_FX[BANNERS[META].items[k].fx]();
  TPS = calcTps(S);
  setMachineTheme(S.banner);
  renderShop(); renderAll(); face(defaultMood());
  busy = false;
  if (S.ended) { $('#app').style.opacity = '0'; $('#ending').hidden = false; finalScreen(); }
}

/* ---------- main loop ---------- */
let lastT = 0, accUI = 0, accSave = 0, accM = 0, accGhost = 0;
function frame(now) {
  let dt = (now - lastT) / 1000; lastT = now;
  if (!(dt >= 0)) dt = 0;
  if (dt > 300) dt = 300;
  if (S && !S.ended) {
    const inc = TPS * dt; S.tokens += inc; S.earned += inc; S.playMs += dt * 1000;
    const g = upLvl(S, 'ghost');
    if (g) { accGhost += dt * 2 * g; const n = Math.floor(accGhost); if (n) { accGhost -= n; ghostTaps(n); } }
    if (!busy) { S.idle += dt; if (S.idle > S.idleBest) S.idleBest = S.idle; }
    chatT -= dt;
    if (chatT <= 0 && !busy) { chatT = 11 + Math.random() * 6; say(pick(S.unlocked >= 6 ? LINES.metaIdle : LINES.idle), 4200); }
    blinkT -= dt;
    if (blinkT <= 0) { blinkT = 2.5 + Math.random() * 3; const f = $('#m-face'); f.classList.add('blink'); setTimeout(() => f.classList.remove('blink'), 130); }
  }
  const pdt = Math.min(dt, .05);
  Dome.step(pdt); Dome.draw(); FX.step(pdt);
  accUI += dt; if (accUI > .1) { accUI = 0; if (S && !S.ended) { updateWallet(); refreshPullButtons(); } }
  accM += dt; if (accM > .5) { accM = 0; if (S && !S.ended) { checkMissions(); if (activeTab === 'shop') updateShop(); } }
  accSave += dt; if (accSave > 5) { accSave = 0; if (S) save(); }
  requestAnimationFrame(frame);
}

/* ---------- wiring + boot ---------- */
function wire() {
  const mach = $('#machine');
  mach.addEventListener('pointerdown', (e) => {
    if (!S || S.ended || !$('#reveal').hidden || !$('#multi').hidden) return;
    if (document.body.classList.contains('fx-nobutton') && e.target.closest && e.target.closest('#crank')) { e.preventDefault(); doPull(1); return; }
    tapMachine(e);
  });
  mach.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (document.body.classList.contains('fx-nobutton')) doPull(1); else tapMachine(null);
  });
  $('#pull1').onclick = () => doPull(1);
  $('#pull10').onclick = () => doPull(10);
  document.querySelectorAll('.tab').forEach(t => { t.onclick = () => { AU.init(); AU.play('click'); setTab(t.dataset.tab); }; });
  $('#btn-music').onclick = () => { AU.init(); S.music = !S.music; $('#btn-music').setAttribute('aria-pressed', String(S.music)); AU.setMusic(S.music); save(); };
  $('#btn-sfx').onclick = () => { AU.init(); S.sfx = !S.sfx; $('#btn-sfx').setAttribute('aria-pressed', String(S.sfx)); AU.setSfx(S.sfx); save(); AU.play('click'); };
  $('#btn-menu').onclick = openMenu;
  $('#modal-x').onclick = closeModal;
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
  document.addEventListener('pointerdown', () => AU.init(), { once: true });
  window.addEventListener('resize', () => { Dome.resize(); FX.resize(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && S) save(); });
}
let booted = false;
function start(data) {
  let restored = null;
  if (data && data.save) { try { restored = Object.assign(freshState(0), JSON.parse(data.save)); } catch (e) { restored = null; } }
  S = restored || load() || freshState(0);
  if (!booted) {
    booted = true;
    wire();
    Dome.resize(); Dome.fill(18); FX.resize();
    try { window.claude?.hot?.snapshot?.(() => ({ save: JSON.stringify(S) })); } catch (e) { /* not in a viewer */ }
    requestAnimationFrame(t => { lastT = t; requestAnimationFrame(frame); });
    console.log('%cOMNIGACHA', 'font: 900 30px sans-serif; color: #ffcf33; text-shadow: 2px 2px 0 #ff5a3c, 4px 4px 0 #1a1433');
    console.log('A developer has opened the console. Gacha-chan respects you.\nTry: OMNI.give(1e6)');
  }
  applyWorld();
}
window.OMNI = {
  give(n) { S.tokens += +n || 0; updateWallet(); return `+${fmt(+n || 0)} tokens. Gacha-chan saw that.`; },
  state: () => S,
};
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
