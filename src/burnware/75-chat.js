/* ============================================================
   Smoke Signals: a buddy list and chat windows. DialUpDan is played
   live by Claude (on the viewer's own Claude account, after they
   allow it); when Claude isn't available he falls back to a
   pocketful of canned replies. Tuko is always canned.
   ============================================================ */
const AI = {
  fn: undefined, denied: false, pending: null,
  get() {   // resolves the ask-Claude function, or null where this view can't
    if (this.fn !== undefined) return Promise.resolve(this.fn);
    if (!this.pending) this.pending = (async () => { try { this.fn = (window.claude && typeof window.claude.use === 'function') ? (await window.claude.use('sample')) || null : null; } catch (e) { this.fn = null; } return this.fn; })();
    return this.pending;
  },
};
const DAN_RULES = (me) => `You are playing "DialUpDan", a friendly, funny teenager chatting on an instant messenger in 1998, inside a pretend retro computer called Burnware. The person you are chatting with uses the screen name "${me}".
Stay in character:
- Write like a 1998 chat: short messages (usually one or two lines, never more than three), mostly lowercase, era slang (sweet, phat, da bomb, as if, talk to the hand, brb, lol, rofl, w00t) and emoticons like :) ;) :P :D. No emoji.
- You believe it is 1998: dial-up, your Tamagotchi, the Titanic movie, worrying about Y2K, floppy disks, your mom yelling at you to get off the phone line, making mix CDs, Snake on your dad's phone, your gecko poster.
- Be kind and playful, and ask questions back. No romance or flirting. Never ask for personal details such as age, location, real name or photos.
- If they sincerely ask whether you are real or an AI, say plainly that you are Claude playing DialUpDan, then carry on if they want.
- If they say something serious or upsetting, drop the act and reply with care.
- Reply with only Dan's next message: no name in front, no quotation marks, no stage directions longer than a few words.`;
const CANNED = {
  dan: [
    [/\b(hi|hello|hey|sup|yo|kumusta)\b/i, ['sup!! :D', 'heyyy whats up', 'hiya :) u got my email??']],
    [/how (are|r) (you|u)|hows it/i, ['pretty good! my tamagotchi didnt die today so thats a win', 'chillin. waiting for a picture to load. 4 minutes so far lol']],
    [/y2k|2000|millennium/i, ['my dad bought like 40 cans of beans for y2k. we are SO ready', 'if the computers all break on new years i am gonna be so bored']],
    [/music|song|cd|band/i, ['dude i just made the best mix cd. took 3 hours to burn lol', 'i taped a song off the radio but the dj talked over the end >:(']],
    [/game|mine|snake|solitaire/i, ['i beat minesweeper on intermediate!! expert is impossible tho', 'snake on my dads phone is my life now']],
    [/bye|gtg|brb|later|cya/i, ['cya!! dont let the y2k bug bite :P', 'k bye! my mom needs the phone anyway']],
    [/ai|robot|real|claude/i, ['lol im as real as a 56k modem :P (ok fine: im the offline version of dan right now. the real chat needs claude to be allowed)']],
  ],
  danDefault: ['lol for real?', 'that is da bomb', 'whoa. ok so what else is new with u?', 'haha ;) hold on my mom is yelling to get off the phone', 'as if! :P', 'brb my computer froze... ok im back', 'w00t!!', 'thats so phat. tell me more'],
  tuko: ['*blinks slowly*', 'lamok?', '*does a tiny push-up*', 'tuk-o! tuk-o!', '*licks own eyeball*', 'i saw a moth. it was beautiful. i ate it.', 'have you tried the Private folder yet?'],
};
const Chat = {
  me: null,
  async screenName() {
    if (Store.data.screenName) return Store.data.screenName;
    const v = await WM.prompt('Smoke Signals', 'Choose a screen name for Smoke Signals:', 'burner_98');
    const name = (v || 'burner_98').trim().replace(/[^\w.-]/g, '_').slice(0, 20) || 'burner_98';
    Store.data.screenName = name; Store.save(); return name;
  },
  canned(who, text) {
    if (who === 'tuko') return pick(CANNED.tuko);
    for (const [re, opts] of CANNED.dan) if (re.test(text)) return pick(opts);
    return pick(CANNED.danDefault);
  },
};
APPS.chat = {
  title: 'Smoke Signals', icon: 'chat', w: 230, h: 360, minW: 200, single: true,
  async open(win) {
    const me = await Chat.screenName();
    const danState = 'online';
    const row = (id, label, sub, icon) => { const b = h('button.buddy', Icons.img(icon, 16), h('span', label, ' ', h('small', sub))); b.onclick = () => { const t = Date.now(); if (t - (b._t || 0) < 800) return; b._t = t; Sound.click(); APPS.chat.talk(id, me); }; return b; };
    win.body.append(h('div', { style: { padding: '4px 6px', fontWeight: 700 } }, 'Signed on as ', me),
      h('div.buddies.sunk', h('h4', 'Buddies (2/3)'), row('dan', 'DialUpDan', '(' + danState + ')', 'dan'), row('tuko', 'Tuko', '(away: eating)', 'chat'), h('h4', 'Offline'), row('sys', 'SysAdmin', '', 'computer')),
      h('div', { style: { padding: '4px 6px', fontSize: '11px', color: '#555' } }, 'Double-click a buddy to chat.'));
    Sound.notify();
  },
  talk(id, me) {
    const existing = WM.wins.find(w => w.chatWith === id); if (existing) return WM.focus(existing);
    const name = { dan: 'DialUpDan', tuko: 'Tuko', sys: 'SysAdmin' }[id];
    const win = WM.create({ title: name + ' - Instant Message', icon: 'chat', w: 380, h: 340, minW: 240 });
    win.chatWith = id;
    const log = h('div.chatlog', { role: 'log', 'aria-live': 'polite' }), typing = h('div.typing');
    const box = h('textarea.field', { 'aria-label': 'Message', maxlength: 600, placeholder: id === 'sys' ? 'SysAdmin is offline.' : 'Type a message' });
    const send = h('button.btn.def', { text: 'Send' }), buzz = h('button.btn', { text: 'Buzz!', title: 'Shake their window' });
    win.body.append(h('div.sunk', { style: { flex: 1, display: 'flex', padding: '2px', minHeight: 0 } }, log), typing, h('div.chatin', box, h('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px' } }, send, buzz)));
    const turns = []; let busy = false, ctl = null;
    const line = (who, text, cls) => { const p = h('p', cls ? { class: cls } : null); if (who) p.append(h('b.' + (who === me ? 'me' : 'them'), who + ': ')); const t = document.createTextNode(text); p.append(t); log.append(p); log.scrollTop = log.scrollHeight; return t; };
    if (id === 'dan') line(null, (window.claude && typeof window.claude.use === 'function') ? 'DialUpDan is played live by Claude. Each message you send uses a little of your Claude usage, and Claude asks you first.' : 'DialUpDan is on his offline replies here. (When this computer runs inside Claude, Claude plays him live.)', 'sys');
    if (id === 'sys') line(null, 'SysAdmin is offline. Away message: "Rebooting the internet. Back in 5."', 'sys');
    if (id === 'tuko') line(null, 'Tuko is away. Away message: "eating lamok. leave a message after the chirp."', 'sys');
    const reply = async (userText) => {
      busy = true; send.disabled = true; typing.textContent = name + ' is typing...';
      const ai = id === 'dan' && !AI.denied ? await AI.get() : null;
      if (!ai) { await wait(rand(700, 1500)); const r = Chat.canned(id, userText); typing.textContent = ''; line(name, r); turns.push({ role: 'assistant', content: r }); Sound.notify(); busy = false; send.disabled = false; return; }
      ctl = new AbortController(); let node = null;
      try {
        const input = [{ role: 'user', content: DAN_RULES(me) }, ...turns.slice(-16)];
        const res = await ai(input, { modelTier: 'quick', cache: false, signal: ctl.signal, onText: ({ text }) => { if (!node) { typing.textContent = ''; node = line(name, ''); Sound.notify(); } node.textContent = text; log.scrollTop = log.scrollHeight; } });
        if (!node) node = line(name, res.text); else node.textContent = res.text;
        turns.push({ role: 'assistant', content: res.text });
      } catch (e) {
        typing.textContent = ''; const code = e && e.code;
        if (node && e.text) turns.push({ role: 'assistant', content: e.text });
        else if (node && code !== 'refused') node.textContent = '...';
        if (code === 'refused' && node) node.parentNode.remove();
        const msg = { not_granted: 'Dan\'s connection was not allowed, so he is using his offline replies for now.', sampling_disabled: 'Claude is not available on this account, so Dan is using his offline replies.', rate_limited: 'Dan\'s mom picked up the phone (too many messages for now). Try again in a little while.', refused: 'Dan would rather talk about something else.', session_expired: 'You need to sign in to Claude again to keep chatting with Dan.', cancelled: '' }[code];
        if (code === 'not_granted' || code === 'sampling_disabled' || code === 'not_declared' || code === 'capability_disabled') AI.denied = true;
        if (msg !== '') line(null, msg || 'The connection dropped. Send your message again.', 'sys');
      }
      typing.textContent = ''; busy = false; send.disabled = false; ctl = null;
    };
    const go = () => {
      const t = box.value.trim(); if (!t || busy) return;
      box.value = ''; line(me, t); Sound.click(); turns.push({ role: 'user', content: t });
      if (id === 'sys') { setTimeout(() => line(null, 'SysAdmin is offline. Your message will be delivered when they sign on. (They will not sign on.)', 'sys'), 500); return; }
      reply(t);
    };
    send.onclick = go;
    box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } });
    buzz.onclick = () => {
      if (busy) return; Sound.buzz(); win.el.classList.remove('buzz'); void win.el.offsetWidth; win.el.classList.add('buzz');
      line(null, 'You have buzzed ' + name + '!', 'sys');
      if (id === 'sys') return;
      const t = '*BUZZ!* (I just sent you a buzz that shook your chat window)'; turns.push({ role: 'user', content: t }); reply(t);
    };
    win.onClose = () => { if (ctl) ctl.abort(); };
    setTimeout(() => box.focus(), 50);
  },
};
