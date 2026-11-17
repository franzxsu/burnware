/* ============================================================
   STATION 7: Tuko's case notes. A yellow pad that fills in as you
   find things, a timeline of what you've learned from her website
   in different years, and hints (gentle first, blunt by the third).
   ============================================================ */
/* each note: [what Tuko says in his bubble, what he writes on the pad] */
const Q_NOTES = {
  start: ['there is a folder on C: that is not ours.', 'Found a folder behind the hard drive: C:\\STATION7. It is not ours. It smells like 1997 and instant noodles.'],
  readme: ['a girl left a locked jar for a boy.', 'A girl called Luz left a program, JAR.EXE, for a boy called Migs. Five "lights" open it. Each light is a word. I checked the walls: I do not think Migs ever came.'],
  bin: ['light 1 was in the bin!', 'Light 1 was in the Recycle Bin. People throw away the strangest things. Once I found a whole sandwich in there.'],
  bat: ['the black window had a secret.', 'Light 2 was in a hidden file. Only the Command Prompt could see it. DOS can keep a secret. I cannot.'],
  paint: ['the black picture was NOT black.', 'Light 3: the black picture was not black. I poured paint on the sky and a word came out. Art is confusing.'],
  web96: ['her homepage changes with the year!', 'Light 4: her homepage is different in different years. In 1996 the word was right there on the page. Time travel is easier than I thought.'],
  song: ['the song is four notes. suspicious.', 'The song is four notes, over and over. She says "read it". Notes have letter names. Humans hide words in everything.'],
  jar: ['THE JAR OPENED.', 'The jar opened. I read her letter. I am fine. I have something in my eye. Probably a moth.'],
  caught: ['seven fireflies. i ate none.', 'Caught all seven fireflies. I did not eat a single one. Please write that down. The last one is called PANGAKO.'],
  closed: ['CASE CLOSED.', 'CASE CLOSED. We told her. She is okay. He did come back. The rooftop is still there.'],
};
/* what her website tells you, by the year you visited it */
const Q_ERAS = {
  e96: [1996, 'Luz is 15. She makes her first web page at Kubo Net Cafe, on Station 7. A boy called Migs, at Station 6, shows her how.'],
  e97: [1997, 'Migs has moved to the city. The cafe is closing on December 31. She leaves the jar on Station 7 for him.'],
  e98: [1998, 'The cafe is gone and the stations were sold. One of them is this computer.'],
  e99: [1999, 'She leaves Ember Village to study computer science in the city. She has lost his phone number.'],
  e02: [2002, 'She keeps a blog. She still thinks about the jar.'],
  e04: [2004, 'Migs finds her blog, eight years after the brownout. He DID come back, in January 1998. The cafe was already empty.'],
  e08: [2008, 'They are friends again. She makes games for a living now.'],
  e16: [2016, 'She runs a small studio, Alitaptap Games. She is still looking for Station 7.'],
};
const Q_HINTS = {
  start: ['There is a folder on the C: drive that is not ours. Open My Computer, then STATION7, and read READ ME MIGS.'],
  L1: ['Clue 1 says she threw it away. Where do thrown-away files go on this computer?', 'Open the Recycle Bin on the desktop. One file in there came from C:\\STATION7.', 'In the Recycle Bin, open "not important.txt" and choose Restore. Then open it from the STATION7 folder.'],
  L2: ['Clue 2 wants the Command Prompt. She says: DIR with the slash-A.', 'Open Command Prompt. Type  cd station7  and then  dir /a  . A hidden file appears. Type its name to run it.', 'Type  lantern  . It asks what Ate Bing yelled when the hour ran out. Her diary says: EXTEND.'],
  L3: ['night.bmp looks like nothing. She says to fill the night with light. Which Paint tool fills things?', 'Open night.bmp. In Paint, pick a bright colour and the Fill bucket, then click on the black sky.', 'The word is painted in a black that is one tiny shade off the sky. One bucket of colour on the sky and you can read it.'],
  L4: ['Clue 4: the word WAS on her homepage "the very first week it existed". Not now. But this computer has a time machine.', 'Click the clock in the corner and change the year. Then open www.alitaptap.net in Torch. (If Torch is already open, press Refresh.)', 'Her diary says she made the page in September 1996. Set the year to 1996, open www.alitaptap.net and look for "Our secret word".'],
  L5: ['"our song" opens in Burn Studio. She says do not just listen: read it. Every note has a letter name.', 'In Burn Studio, each note sits on a row, and the row has a letter on the left (ignore the number after it). Read the four notes from left to right.', 'The four notes are B, A, G, A.'],
  type: ['You have found more lights than the jar knows about. Open JAR.EXE in the STATION7 folder and type each word in.'],
  jar: ['That is all five. Open JAR.EXE in the STATION7 folder and type them in, any order.'],
  catch: ['The jar is open, but she said there are two more inside. Run JAR.EXE again and stay to the very end. Tap the fireflies to catch them.'],
  tell: ['The jar said somebody should tell her it worked. "She\'ll still be alitaptap, wherever the web goes. WHENEVER the web goes." Hmm. Whenever.', 'Her homepage changes with the year. What does it look like NOW? Click the clock, set the year to this year, and open www.alitaptap.net.', 'On her newest site, scroll to the "Station 7" part and type the name of the last firefly you caught: PANGAKO.'],
  done: ['Case closed. I am keeping the notes, though. Detectives keep their notes.'],
};
const QuestNotes = {
  win: null, render: null,
  refresh() { if (this.win && this.win.el.isConnected && this.render) this.render(); },
};
APPS.casefile = {
  title: 'Case Notes', icon: 'casefile', w: 380, h: 470, minW: 260, minH: 300, single: true,
  open(win) {
    gameCSS('css-casefile', `
.cn { flex: 1; min-height: 0; display: flex; flex-direction: column; background: #fdf6b8; }
.cn-pad { flex: 1; min-height: 0; overflow-y: auto; padding: 10px 14px 14px 38px; font: 15px/24px var(--comic); color: #1a2a6a; background: linear-gradient(90deg, transparent 28px, #e89a9a 28px, #e89a9a 29px, transparent 29px), repeating-linear-gradient(#fdf6b8 0 23px, #b8cfe8 23px 24px); background-attachment: local; }
.cn-pad h3 { font: 700 19px/24px var(--comic); margin: 0; color: #a01818; } .cn-pad h4 { font: 700 15px/24px var(--comic); margin: 24px 0 0; text-decoration: underline; }
.cn-pad p { margin: 0; } .cn-pad small { font-size: 12px; color: #5a5a7a; }
.cn-lights { display: flex; flex-wrap: wrap; gap: 4px 10px; } .cn-lights span { white-space: nowrap; } .cn-lights b { color: #2a7a1a; letter-spacing: 1px; }
.cn-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; border: 1px solid #1a2a6a; margin-right: 4px; vertical-align: -1px; } .cn-dot.on { background: #e8ff5a; box-shadow: 0 0 5px 2px #c8f03a; }
.cn-stamp { display: inline-block; border: 3px double #a01818; color: #a01818; font: 700 18px/1 var(--comic); padding: 4px 10px; transform: rotate(-6deg); margin: 6px 0 0 30px; }
.cn-foot { flex: none; display: flex; flex-direction: column; gap: 5px; padding: 6px; background: var(--face); border-top: 1px solid var(--hi); }
.cn-foot .row { display: flex; gap: 6px; flex-wrap: wrap; } .cn-hint { background: var(--tip); border: 1px solid var(--ink); padding: 5px 7px; font-size: 12px; line-height: 1.35; }
`);
    const pad = h('div.cn-pad'), hintBox = h('div.cn-hint', { hidden: true }), hintB = h('button.btn', 'Ask Tuko for a hint'), folderB = h('button.btn', 'Open STATION7');
    win.body.append(h('div.cn', pad, h('div.cn-foot', hintBox, h('div.row', hintB, folderB))));
    const render = () => {
      const s = Quest.s, kids = [h('h3', 'CASE NOTES: STATION 7'), h('p', h('small', 'by Tuko (detective) (also a gecko)'))];
      if (!s.started) kids.push(h('p', 'No case yet. But I have a feeling about the C: drive.'));
      else {
        kids.push(h('h4', 'The five lights'), h('div.cn-lights', Q_LIGHTS.map(([w], i) => h('span', h('i.cn-dot' + (s.lights[i] ? '.on' : '')), s.lights[i] ? h('b', w) : `light ${i + 1}: ?`))));
        kids.push(h('h4', 'What I found'));
        for (const id of Object.keys(Q_NOTES)) if (s.leads[id]) kids.push(h('p', '• ' + Q_NOTES[id][1]));
        const eras = Object.keys(Q_ERAS).filter(id => s.eras[id]);
        if (eras.length) { kids.push(h('h4', 'What happened, in order'), h('p', h('small', `from her website. ${eras.length} of ${Object.keys(Q_ERAS).length} years found`))); for (const id of eras) kids.push(h('p', h('b', Q_ERAS[id][0] + ': '), Q_ERAS[id][1])); }
        if (s.closed) kids.push(h('div.cn-stamp', 'CASE CLOSED'), h('p', { style: { marginTop: '24px' } }, h('small', s.name ? `Solved by ${s.name} and Tuko.` : 'Solved by you and Tuko.')));
      }
      pad.replaceChildren(...kids);
    };
    hintB.onclick = () => { const hnt = Quest.hint(); hintBox.hidden = false; hintBox.replaceChildren(h('b', `Tuko says (hint ${hnt.n} of ${hnt.of}): `), hnt.text); Sound.click(); };
    folderB.onclick = () => Quest.begin();
    WM.menubar(win, [{ label: 'Notes', items: () => [
      { label: 'Put the case files back', action: () => WM.ask('Case Notes', 'Put fresh copies of the STATION7 folder and its files back on the C: drive?\n(Use this if you deleted something you needed. What you have found so far is kept.)', ['Yes', 'No'], 'casefile').then(r => { if (r === 'Yes') { Quest.seed(true); Desktop.render(); } }) },
      { label: 'Forget everything and start over', action: () => WM.ask('Case Notes', 'Erase all the case notes and hide the lights again?', ['Start over', 'Cancel'], 'warn').then(r => { if (r === 'Start over') { const seen = Store.data.quest && Store.data.quest.seeded; Store.data.quest = { seeded: seen, started: true }; if (Store.data.wall === 'fireflies') Store.data.wall = 'terraces'; Quest.seed(true); Quest.save(); Wall.paint(); Desktop.render(); hintBox.hidden = true; } }) },
      '-', { label: 'Close', action: () => WM.close(win) },
    ] }]);
    QuestNotes.win = win; QuestNotes.render = render; render();
    win.onClose = () => { QuestNotes.win = null; QuestNotes.render = null; };
  },
};
