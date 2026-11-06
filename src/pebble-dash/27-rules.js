/* ============================================================
   Event rules: race, elimination, cup points, drift scoring,
   time-trial ghosts, HUD, results, menu backdrop camera, boot
   ============================================================ */
const CUP_POINTS = [10, 6, 4, 3];
// drift targets: "par" is what a steady rear-drive drifter scores per km on each stage; medals are multiples of it
const DRIFT_PAR = { pinewood: 2900, mesa: 4000, frost: 4200, coast: 2200 };
const DRIFT_TIERS = [['GOLD', 1.6, '#ffd23a'], ['SILVER', 1.0, '#d6dde6'], ['BRONZE', 0.5, '#d89058']];
function fmtPts(v) { return Math.round(v || 0).toLocaleString('en-US'); }
const hexOf = (c) => '#' + new THREE.Color(c).getHexString();

Object.assign(Game, {
  raceLogic(dt) {
    const W = this.W, P = this.player;
    if (this.state !== 'countdown') this.raceT += dt;   // keeps running after you finish, so the cars behind get real times
    let playerDone = false;
    for (const c of this.cars) {
      if (c.finished || c.out) continue;
      const lapsDone = Math.floor(c.prog / W.len);
      while (lapsDone > c.lapsDone) {
        c.lapsDone++;
        // when exactly did it cross? back the overshoot off at its current speed (photo finishes happen)
        const over = c.prog - c.lapsDone * W.len, tc = this.raceT - clamp(over / Math.max(c.speed, 1), 0, dt + 0.05);
        if (c.lapsDone >= 1) {
          const lt = tc - c.lapStart; c.lapStart = tc; c.lapTimes.push(lt);
          if (c === P) this.onPlayerLap(lt);
        } else if (c === P && this.rule === 'trial') this.startGhostLap();
        if (c.lapsDone >= this.laps) { c.finished = true; c.finishT = tc; if (c === P) playerDone = true; }
        else if (c === P && c.lapsDone === this.laps - 1 && this.laps > 1) HUD.msg('FINAL LAP', 'small', 1.6);
      }
    }
    if (playerDone) this.onPlayerFinish();
    if (this.rule === 'elim') this.elimCheck();
    if (this.rp && (this.state === 'race' || (this.state === 'finished' && this.resultsT < 3))) this.recordReplay();
    // knocked-out cars pull up, then leave the stage
    for (const c of this.cars) if (c.out && !c.gone && c !== P && this.raceT - c.outT > 1.6) {
      c.gone = true; c.mesh.root.visible = false; this.live = this.cars.filter(x => !x.gone);
      for (let k = 0; k < 4; k++) this.sk.lift(c.uid * 4 + k);
    }
    // rubber band the rivals a little so races stay close
    if (P && !this.solo && !P.finished && !P.out) for (let k = 0; k < this.cars.length; k++) {
      const c = this.cars[k]; if (c === P || c.out) continue;
      const hi = { easy: 0.03, pro: 0.05, ace: 0.07 }[Store.data.settings.diff] || 0.05;   // how hard rivals chase you down
      this.ais[k].rubber = 1 + clamp((P.prog - c.prog) / 260, -0.1, hi);
    }
    this.positions = this.order();
    if (P && this.state === 'race') {
      const dot = P.az.x * W.TX[P.idx] + P.az.z * W.TZ[P.idx];
      this.wrongT = dot < -0.35 && P.speed > 3 ? this.wrongT + dt : 0;
      if (this.wrongT > 1.2 && HUD.msgT <= 0.1) HUD.msg('WRONG WAY', 'small warn', 0.6);
      this.callNotes(false);
      if (this.rec) this.recordGhost();
      if (this.drift) this.driftTick(dt);
    }
    if (this.state === 'finished') {
      this.resultsT += dt;
      if (this.resultsT > (P && P.out ? 2.2 : 3) && $('#results').hidden) this.showResults();
      if (!$('#results').hidden && !this.solo && this.rule !== 'cup') this.fillResults();
    }
  },
  /* finished cars by time, then cars on stage by distance, then knocked-out cars (latest out ranks higher) */
  order() {
    return this.cars.slice().sort((a, b) => {
      if (a.out || b.out) return a.out && b.out ? b.outT - a.outT : a.out ? 1 : -1;
      if (a.finished || b.finished) return a.finished && b.finished ? a.finishT - b.finishT : a.finished ? -1 : 1;
      return b.prog - a.prog;
    });
  },
  /* elimination: each time the leader completes a lap (bar the last), whoever is last is out */
  elimCheck() {
    const active = this.cars.filter(c => !c.out);
    if (active.length <= 1) return;
    const lead = Math.max(...active.map(c => c.lapsDone));
    while (this.elimDone < Math.min(lead, this.laps - 1) && active.length > 1) {
      this.elimDone++;
      const run = active.filter(c => !c.finished).sort((a, b) => a.prog - b.prog), victim = run[0];
      if (!victim) break;
      victim.out = true; victim.outT = this.raceT; victim.outLap = this.elimDone;
      active.splice(active.indexOf(victim), 1);
      this.ais[this.cars.indexOf(victim)].out = true;
      if (victim === this.player) this.onPlayerOut();
      else if (this.state === 'race') {
        const txt = victim.name.replace(/^\w\. /, '').toUpperCase() + ' IS OUT', left = `${active.length} cars left`;
        if (HUD.msgT <= 0.2) { HUD.msg(txt, 'small warn', 1.8); HUD.toast(left, 2.2); } else HUD.toast(`${victim.name} is out · ${left}`, 2.6);
        SND.horn();
      }
    }
  },
  onPlayerOut() {
    this.state = 'finished'; this.resultsT = 0;
    HUD.msg('KNOCKED OUT', 'warn', 2.2); HUD.showNote(null);
    SND.horn(); this.buzz([70, 60, 70]);
  },
  callNotes(reset) {
    const W = this.W, P = this.player, notes = W.notes; if (!notes.length || !P) return;
    const s = P.idx * W.ds, ahead = (n) => (n.s - s + W.len) % W.len;
    if (reset) { let best = 0, bd = Infinity; notes.forEach((n, k) => { const a = ahead(n); if (a < bd) { bd = a; best = k; } }); this.noteI = best; this.noteCalled = -1; }
    let n = notes[this.noteI], guard = 0;
    while (ahead(n) > W.len - 25 && guard++ < notes.length) { this.noteI = (this.noteI + 1) % notes.length; n = notes[this.noteI]; }
    const dist = ahead(n), next = notes[(this.noteI + 1) % notes.length];
    const callDist = Math.max(70, P.speed * 3.3 + 30);
    if (dist < callDist && this.noteCalled !== this.noteI + this.lapsKey()) {
      this.noteCalled = this.noteI + this.lapsKey();
      SND.say(n.say + (n.into && next ? ', into ' + next.say : ''));
    }
    if (dist < callDist + 40 || dist > W.len - 25) HUD.showNote(n, next, dist); else HUD.showNote(null);
  },
  lapsKey() { return (this.player ? Math.max(0, this.player.lapsDone) : 0) * 1000; },
  onPlayerLap(lt) {
    const st = Store.data.settings, tid = this.W.T.id, cid = CARS[st.car].id, n = this.player.lapsDone;
    if (this.rule === 'drift') { HUD.toast(`Lap ${n}: ${fmtPts(this.drift.total + this.drift.cur)} pts`, 2.6); return; }
    const isBest = Store.record(tid, cid, 'lap', lt);
    $('#hBest').textContent = fmtTime(Store.best(tid, cid).lap);
    HUD.toast(`Lap ${n}: ${fmtTime(lt)}${isBest ? ' · NEW BEST' : ''}`, 2.6);
    if (isBest) SND.cheer(0.8);
    if (this.rule === 'trial') {
      if (this.rec && this.rec.length > 18) {
        const key = tid + '_' + cid, old = Store.data.ghosts[key];
        if (!old || lt < old.t) { Store.data.ghosts[key] = { t: lt, f: this.rec }; Store.save(); }
      }
      this.startGhostLap();
    }
  },
  onPlayerFinish() {
    const P = this.player, st = Store.data.settings;
    this.state = 'finished'; this.resultsT = 0;
    this.positions = this.order();
    const pos = this.positions.indexOf(P) + 1; this.finishPos = pos;
    if (!this.solo) Store.record(this.W.T.id, CARS[st.car].id, 'race', P.finishT);
    if (this.rule === 'cup') this.awardCup();
    if (this.rule === 'drift') this.driftEnd();
    const win = !this.solo && pos === 1;
    HUD.msg(win ? (this.rule === 'elim' ? 'WINNER!' : 'STAGE WIN!') : 'FINISH', '', 2.4);
    SND.fanfare(); SND.cheer(1); this.buzz(win ? [40, 50, 40, 50, 120] : 60);
    HUD.showNote(null);
  },
  /* ---------- rally cup ---------- */
  newCup(start) {
    const spec = CARS[Store.data.settings.car], others = CARS.filter(c => c !== spec).sort(() => Math.random() - 0.5);
    this.cup = { order: TRACKS.map((_, k) => (start + k) % TRACKS.length), idx: 0, done: false, history: [],
      rivals: RIVALS.map((l, k) => ({ k, spec: others[k % others.length].id })), pts: { you: 0, 0: 0, 1: 0, 2: 0 } };
  },
  awardCup() {
    const cup = this.cup; if (!cup || this.cupAwarded) return;
    this.cupAwarded = true;
    const stage = this.order().map((c, k) => ({ key: c.key, name: c.name, hex: c.hex, car: c.spec.name, pts: CUP_POINTS[k] || 0, t: c.finished ? c.finishT : 0 }));
    for (const s of stage) cup.pts[s.key] = (cup.pts[s.key] || 0) + s.pts;
    cup.history.push({ track: this.W.T.id, stage });
    cup.idx++; cup.done = cup.idx >= cup.order.length;
  },
  cupStandings() {
    const cup = this.cup, last = cup.history.length ? cup.history[cup.history.length - 1].stage : [], me = CARS[Store.data.settings.car];
    const ents = [{ key: 'you', name: 'You', hex: hexOf(me.color), car: me.name }]
      .concat(cup.rivals.map(r => ({ key: r.k, name: RIVALS[r.k].name, hex: hexOf(RIVALS[r.k].color), car: CAR_BY_ID[r.spec].name })));
    ents.forEach(e => { e.pts = cup.pts[e.key] || 0; e.lastPos = last.findIndex(s => s.key === e.key); });
    return ents.sort((a, b) => (b.pts - a.pts) || (a.lastPos - b.lastPos));
  },
  /* ---------- drift trial ---------- */
  driftTick(dt) {
    const d = this.drift, P = this.player, el = $('#hDrift');
    const slip = Math.abs(P.slipAngle) * 57.2958, spun = P.vF < -1.5 && P.speed > 3, crash = (this.frameImpact || 0) > 4.5;
    this.frameImpact = 0;
    if (d.cur > 0 && (crash || spun || P.offRoad > 2.2 || d.reset)) this.driftWipe(crash ? 'CRASHED' : spun ? 'SPUN OUT' : d.reset ? 'RESET' : 'OFF THE ROAD');
    d.reset = false;
    const sliding = !spun && P.grounded >= 2 && P.speed > 7 && slip > 12 && P.offRoad < 1.5;
    if (sliding) {
      d.chainT += dt; d.idle = 0;
      d.mult = Math.min(5, 1 + Math.floor(d.chainT / 1.6));
      d.cur += P.speed * Math.min(slip, 50) * 0.45 * d.mult * dt;
    } else if (d.cur > 0) { d.idle += dt; if (d.idle > 0.75) this.driftBank(); }
    if (d.cur > 0) {
      const txt = fmtPts(d.cur), mt = '×' + d.mult + ' DRIFT';
      if (d.ui !== 'live' || mt !== d.shownM) { el.hidden = false; el.className = 'drift'; void el.offsetWidth; el.className = 'drift pop'; d.ui = 'live'; d.showT = 0; }
      if (txt !== d.shown) { $('#hDCur').textContent = txt; d.shown = txt; }
      if (mt !== d.shownM) { $('#hDMult').textContent = mt; d.shownM = mt; }
    } else if (d.showT > 0) { d.showT -= dt; if (d.showT <= 0) { el.hidden = true; d.ui = 'none'; } }
    else if (d.ui === 'live') { el.hidden = true; d.ui = 'none'; }
  },
  driftBank() {
    const d = this.drift, pts = Math.round(d.cur);
    d.total += pts; d.best = Math.max(d.best, pts);
    d.cur = 0; d.chainT = 0; d.idle = 0; d.mult = 1;
    this.driftShow('+' + fmtPts(pts), pts >= 2500 ? 'HUGE COMBO' : 'BANKED', 'bank');
    SND.bank(pts >= 2500);
  },
  driftWipe(why) {
    const d = this.drift; d.cur = 0; d.chainT = 0; d.idle = 0; d.mult = 1;
    this.driftShow('WIPED', why, 'wipe'); SND.wipe(); this.buzz(40);
  },
  driftShow(big, small, cls) {
    const d = this.drift, el = $('#hDrift');
    $('#hDCur').textContent = big; $('#hDMult').textContent = small; d.shown = ''; d.shownM = '';
    el.hidden = false; el.className = 'drift ' + cls; void el.offsetWidth; el.className = 'drift ' + cls + ' pop';
    d.showT = 1.2; d.ui = cls;
  },
  driftEnd() {
    const d = this.drift; if (d.cur > 0) this.driftBank();
    const st = Store.data.settings;
    d.record = Store.recordMax(this.W.T.id, CARS[st.car].id, 'drift', d.total);
    $('#hTime').textContent = fmtPts(d.total);
  },
  driftTiers() {   // longer stages and tail-happy cars score more, so targets scale with both
    const km = this.W.len / 1000 * this.laps, k = { RWD: 1, AWD: 0.6, FWD: 0.4 }[this.player.spec.drive] || 1, par = DRIFT_PAR[this.W.T.id] || 3000;
    return DRIFT_TIERS.map(([n, f, c]) => [n, Math.round(par * f * km * k / 100) * 100, c]);
  },
  /* ---------- time-trial ghost ---------- */
  startGhostLap() { this.rec = []; this.recT = 0; this.ghostLapStart = this.raceT; },
  recordGhost() {
    const P = this.player, t = this.raceT - this.ghostLapStart;
    if (t < this.recT) return;
    this.recT = t + 0.05;
    const r = (v) => Math.round(v * 100) / 100, q = P.quat;
    this.rec.push(r(t), r(P.pos.x), r(P.pos.y), r(P.pos.z), r(q.x), r(q.y), r(q.z), r(q.w), Math.round(P.idx));
  },
  ghostTick() {
    const g = this.ghost, d = this.ghostData, P = this.player;
    if (!d || this.state === 'countdown' || !P || P.lapsDone < 0 || P.finished) { g.mesh.root.visible = false; return; }
    const t = this.raceT - (this.ghostLapStart || 0), f = d.f, n = f.length / 9;
    let k = Math.min(n - 2, Math.max(0, Math.floor(t / 0.05)));
    while (k < n - 2 && f[(k + 1) * 9] < t) k++;
    while (k > 0 && f[k * 9] > t) k--;
    const a = k * 9, b = (k + 1) * 9, u = clamp((t - f[a]) / Math.max(1e-3, f[b] - f[a]), 0, 1);
    if (t > d.t + 0.5) { g.mesh.root.visible = false; return; }
    g.mesh.root.visible = true;
    g.mesh.root.position.set(lerp(f[a + 1], f[b + 1], u), lerp(f[a + 2], f[b + 2], u), lerp(f[a + 3], f[b + 3], u));
    g.quat.set(f[a + 4], f[a + 5], f[a + 6], f[a + 7]); g.mesh.root.quaternion.copy(g.quat).slerp(new THREE.Quaternion(f[b + 4], f[b + 5], f[b + 6], f[b + 7]), u);
    const S = P.spec, wy = -((S.ride || 0.49) - (S.r || 0.31));
    g.mesh.wheels.forEach((w, i) => { w.pivot.position.set(P.wheels[i].x, wy, P.wheels[i].z); });
    // delta: ghost time at the player's position
    if ((this.dT = (this.dT || 0) + 1) % 6 === 0) {
      const pi = P.idx; let best = -1, bd = Infinity;
      for (let j = 0; j < n; j++) { let di = Math.abs(f[j * 9 + 8] - pi); if (di > this.W.N / 2) di = this.W.N - di; if (di < bd) { bd = di; best = j; } }
      if (best >= 0 && bd < 8) {
        const delta = t - f[best * 9];
        const el = $('#hDelta'); el.textContent = fmtDelta(delta); el.className = 'v ' + (delta <= 0 ? 'good' : 'bad');
      }
    }
  },
  /* ---------- HUD ---------- */
  hudUpdate(force, dt = 0) {
    this.hudT = (this.hudT || 0) + dt;
    const P = this.player; if (!P) return;
    HUD.speedo(P);
    if (!force && this.hudT < 0.08) return;
    this.hudT = 0;
    const lapN = clamp(P.lapsDone + 1, 1, this.laps), lapEl = $('#hLap').parentNode;
    if (this.touch) { const tilt = Store.data.settings.steer === 'tilt' && Tilt.fresh(); if (document.body.classList.contains('tilt') !== tilt) document.body.classList.toggle('tilt', tilt); }
    if (this.solo) {
      $('#hPos').innerHTML = `${lapN}<small>/${this.laps}</small>`;
      $('#hLap').textContent = this.rule === 'drift' ? 'DRIFT TRIAL' : 'TIME TRIAL';
      lapEl.classList.remove('out');
    } else {
      const running = this.cars.filter(c => !c.out).length, pos = this.positions.indexOf(P) + 1;
      $('#hPos').innerHTML = `P${pos}<small>/${P.out ? this.cars.length : running}</small>`;
      const danger = this.rule === 'elim' && !P.out && !P.finished && P.lapsDone < this.laps - 1 && running > 1 && pos === running;
      $('#hLap').textContent = P.out ? 'OUT' : (danger ? 'LAST · ' : '') + `LAP ${lapN}/${this.laps}`;
      lapEl.classList.toggle('out', danger || !!P.out);
    }
    if (this.rule === 'drift') $('#hTime').textContent = fmtPts(this.drift.total);
    else $('#hTime').textContent = fmtTime(P.finished ? P.finishT : P.out ? P.outT : this.raceT).replace('--:--.--', '0:00.00');
    $('#hLapT').textContent = fmtTime(P.finished ? P.lapTimes[P.lapTimes.length - 1] : (P.out ? P.outT : this.raceT) - P.lapStart).replace('--:--.--', '0:00.00');
    HUD.drawMap(this.live, P);
  },
  /* ---------- results ---------- */
  showResults() {
    $('#results').hidden = false; $('#touch').hidden = true; $('#hMsg').hidden = true; HUD.msgT = 0; $('#hDrift').hidden = true;
    this.focus = this.player; this.resHtml = null;
    this.fillResults();
    const st = Store.data.settings, cupNext = this.rule === 'cup' && this.cup && !this.cup.done, cupDone = this.rule === 'cup' && this.cup && this.cup.done;
    $('#rAgain').hidden = cupNext;
    $('#rAgain').textContent = cupDone ? 'New cup' : this.solo ? 'Try again' : 'Race again';
    $('#rNext').hidden = cupDone;
    $('#rNext').textContent = cupNext ? `Stage ${this.cup.idx + 1}/${this.cup.order.length}: ${TRACKS[this.cup.order[this.cup.idx]].name}` : 'Next: ' + TRACKS[(st.track + 1) % TRACKS.length].name;
    $('#rNext').classList.toggle('pri', cupNext); $('#rAgain').classList.toggle('pri', !cupNext);
    $('#rReplay').hidden = !(this.rp && this.rp.n > 40);
    (cupNext ? $('#rNext') : $('#rAgain')).focus({ preventScroll: true });
  },
  carRow(c, k, cells) {
    const P = this.player, mixed = this.ev && this.ev.field === 'mixed';
    return `<tr class="${c === P ? 'me' : ''}${c.out ? ' out' : ''}"><td>${k + 1}</td><td><span style="color:${c.hex}">■</span> ${c.name} <span style="color:var(--mute)">#${c.number}</span>${mixed ? ` <span class="carnm">${c.spec.name}</span>` : ''}</td>${cells}</tr>`;
  },
  fillResults() {
    const P = this.player, st = Store.data.settings, tid = this.W.T.id, cid = CARS[st.car].id, R = this.rule;
    let title = '', html = '';
    if (R === 'race' || R === 'elim') {
      const lead = this.positions[0], pos = this.positions.indexOf(P) + 1;
      const rows = this.positions.map((c, k) => {
        const best = c.lapTimes.length ? Math.min(...c.lapTimes) : 0;
        const time = c.out ? `out · lap ${c.outLap}` : c.finished ? (c === lead ? fmtTime(c.finishT) : '+' + (c.finishT - lead.finishT).toFixed(2)) : 'on stage';
        return this.carRow(c, k, `<td class="t">${time}</td><td class="t" style="color:var(--mute)">${best ? fmtTime(best) : ''}</td>`);
      }).join('');
      title = R === 'elim' ? (P.out ? `Knocked out on lap ${P.outLap}` : pos === 1 ? 'Last car standing!' : `You finished P${pos}`) : (pos === 1 ? 'Stage win!' : `You finished P${pos}`);
      html = `<table class="res"><tbody>${rows}</tbody></table><p class="help">${R === 'elim' ? 'Last place is knocked out every time the leader completes a lap.' : 'Best lap in the right-hand column. Records are kept per stage and car.'}</p>`;
    } else if (R === 'cup') {
      const cup = this.cup, h = cup.history[cup.history.length - 1];
      if (!h) return;
      const stand = this.cupStandings(), myStage = h.stage.findIndex(s => s.key === 'you') + 1, myCup = stand.findIndex(s => s.key === 'you') + 1;
      const sRows = h.stage.map((s, k) => `<tr class="${s.key === 'you' ? 'me' : ''}"><td>${k + 1}</td><td><span style="color:${s.hex}">■</span> ${s.name} <span class="carnm">${s.car}</span></td><td class="gain">+${s.pts}</td></tr>`).join('');
      const cRows = stand.map((s, k) => `<tr class="${s.key === 'you' ? 'me' : ''}"><td>${k + 1}</td><td><span style="color:${s.hex}">■</span> ${s.name}</td><td class="pts">${s.pts}</td></tr>`).join('');
      const tname = (TRACKS.find(T => T.id === h.track) || {}).name || '';
      title = cup.done ? (myCup === 1 ? 'Rally Cup champion!' : `Cup finished P${myCup}`) : (myStage === 1 ? 'Stage win!' : `Stage ${cup.history.length}: P${myStage}`);
      html = `<div class="rcols"><table class="res"><caption>STAGE ${cup.history.length} · ${tname.toUpperCase()}</caption><tbody>${sRows}</tbody></table>
        <table class="res"><caption>${cup.done ? 'FINAL STANDINGS' : `CUP AFTER ${cup.history.length} OF ${cup.order.length}`}</caption><tbody>${cRows}</tbody></table></div>
        <p class="help">${cup.done ? (myCup === 1 ? 'Four stages, one champion. The trophy is yours.' : 'Points: 10, 6, 4, 3. Another cup?') : `Points: 10, 6, 4, 3. Next up: ${TRACKS[cup.order[cup.idx]].name}. The points leader starts at the back.`}</p>`;
    } else if (R === 'trial') {
      const best = P.lapTimes.length ? Math.min(...P.lapTimes) : 0;
      const wetK = 1 / Math.sqrt(this.W.gripK || 1), m = medalFor(tid, cid, best, wetK), rec = Store.best(tid, cid).lap;
      const tiers = MEDAL_TIERS.map(([n, k, c]) => `<span style="color:${c}">${n} ${fmtTime(MEDALS[tid][cid] * k * wetK)}</span>`).join(' · ') + (wetK > 1 ? ' (wet)' : '');
      title = m ? `${m.name[0] + m.name.slice(1).toLowerCase()} medal` : 'Time trial done';
      html = `<div class="medal big"><i style="background:${m ? m.color : '#3a3f4b'}">${m ? m.name[0] : '–'}</i><div>Best lap this run <b>${fmtTime(best)}</b><br><span style="color:var(--mute)">Your record ${fmtTime(rec)}</span></div></div>
        <p class="help">Targets: ${tiers}</p><p class="help">Your best lap is saved as a ghost car you can race next time.</p>`;
    } else {
      const d = this.drift, tiers = this.driftTiers(), m = tiers.find(t => d.total >= t[1]), rec = Store.best(tid, cid).drift;
      title = m ? `${m[0][0] + m[0].slice(1).toLowerCase()} medal` : 'Drift trial done';
      html = `<div class="medal big"><i style="background:${m ? m[2] : '#3a3f4b'}">${m ? m[0][0] : '–'}</i><div>Score <b>${fmtPts(d.total)}</b>${d.record ? ' · <span style="color:var(--mint)">new record</span>' : ''}<br><span style="color:var(--mute)">Best combo ${fmtPts(d.best)} · record ${rec ? fmtPts(rec) : '—'}</span></div></div>
        <p class="help">Targets: ${tiers.map(([n, t, c]) => `<span style="color:${c}">${n} ${fmtPts(t)}</span>`).join(' · ')}</p>
        <p class="help">Points are speed × slide angle, multiplied while a combo keeps going. A crash, a spin or leaving the road wipes the combo in hand.</p>`;
    }
    if (html !== this.resHtml) { this.resHtml = html; $('#rBody').innerHTML = html; }
    if ($('#rTitle').textContent !== title) $('#rTitle').textContent = title;
  },
  /* ---------- menu backdrop camera ---------- */
  attractCam(dt) {
    this.attractT += dt;
    const W = this.W, n = this.cars.length, slot = Math.floor(this.attractT / 9);
    const lead = n > 1 && slot % 3 === 2 ? this.cars[1 + Math.floor(slot / 3) % (n - 1)] : this.cars[0];
    this.focus = lead;
    // frame the car where the menu leaves the scene uncovered
    const cl = document.documentElement.classList, key = (cl.contains('land') ? 'L' : 'P') + (cl.contains('short') ? 'S' : '');
    if (this.viewKey !== key) {
      this.viewKey = key;
      const el = $('#game'), cw = Math.max(1, el.clientWidth), ch = Math.max(1, el.clientHeight);
      const off = { L: [-0.13, 0.2], LS: [-0.12, 0.34], P: [0, 0.33], PS: [0, 0.33] }[key];
      this.camera.setViewOffset(cw, ch, off[0] * cw, off[1] * ch, cw, ch);
    }
    const phase = Math.floor(this.attractT / 7) % 3;
    if (phase === 1) {
      if (!this.tvCam || this.tvCam.car !== lead || ((this.tvCam.i - lead.idx + W.N) % W.N > W.N / 2 && (lead.idx - this.tvCam.i + W.N) % W.N > 35)) {
        const i = (lead.idx + 55) % W.N, side = (Math.random() < 0.5 ? -1 : 1), lat = side * (W.W[i] + 6);
        const x = W.X[i] + W.RX[i] * lat, z = W.Z[i] + W.RZ[i] * lat;
        this.tvCam = { car: lead, i, pos: new THREE.Vector3(x, W.heightAt(x, z) + 2.2, z) };
      }
      this.camera.up.set(0, 1, 0);
      this.camera.position.copy(this.tvCam.pos);
      this.camera.lookAt(lead.pos.x, lead.pos.y + 0.5, lead.pos.z);
      if (Math.abs(this.camera.fov - 38) > 0.1) { this.camera.fov = 38; this.camera.updateProjectionMatrix(); }
    } else {
      this.cc.setMode(phase === 0 ? 'far' : 'pocket');
      this.cc.update(dt, lead, W);
    }
  },
});
