/* ============================================================
   OMNIGACHA — data + pure economy
   ============================================================ */
const RAR = [
  { k: 'C',   name: 'Common',              tps: 0.1, w: 52,  col: '#a7a3c2' },
  { k: 'U',   name: 'Uncommon',            tps: 0.25, w: 26,  col: '#3ddc84' },
  { k: 'R',   name: 'Rare',                tps: 0.6, w: 13,  col: '#4aa8ff' },
  { k: 'SR',  name: 'Super Rare',          tps: 1.5, w: 6,   col: '#b06bff' },
  { k: 'SSR', name: 'Super Super Rare',    tps: 3.5, w: 2.4, col: '#ffcc33' },
  { k: 'UR',  name: 'Ultra Rare',          tps: 9,   w: 0.6, col: '#ff5fa2' },
  { k: '???', name: 'Ontologically Rare',  tps: 0,   w: 0,   col: '#ffffff' },
];
const PITY = 40;            // guaranteed UR after this many pulls on one banner
const UNLOCK_NEED = 7;      // unique items needed to open the next banner
const META = 5;             // index of the final banner

const BANNERS = [
  { id: 'junk', name: 'Junk Drawer', jp: 'ガラクタ', cost: 10, mult: 1,
    main: '#ff5a3c', acc: '#ffcf33', blurb: 'Everything that lives in the drawer by the fridge.',
    items: [
      ['junk_sock', '🧦', 'A Single Sock', 0, 'Its partner is in a better place. Probably behind the dryer.'],
      ['junk_spoon', '🥄', 'A Spoon', 0, 'Fully functional. Has never been to space. Yet.'],
      ['junk_batt', '🔋', 'Mystery Battery', 0, 'Could be dead. Could be full. Nobody will ever check.'],
      ['junk_pin', '🧷', 'Safety Pin', 0, 'Somewhere, right now, one of these is holding a whole outfit together.'],
      ['junk_usb', '🔌', 'USB Cable', 1, 'Wrong way up on the first try. Also on the second try. Physics cannot explain it.'],
      ['junk_sponge', '🧽', 'Damp Sponge', 1, 'Smells like a decision you made in 2019.'],
      ['junk_key', '🗝️', 'Key to Nothing', 1, 'It definitely opens something. You will never find out what.'],
      ['junk_rice', '🍚', 'The Last Grain of Rice', 2, 'Stuck to the bottom of the rice cooker. Worth fighting your siblings for.'],
      ['junk_magnet', '🧲', 'Fridge Magnet', 2, 'Says “I ♥ OHIO”. Nobody in this house has ever been to Ohio.'],
      ['junk_bags', '🛍️', 'The Bag of Bags', 3, 'Every home has one. It holds every plastic bag ever made, and it is still growing.'],
      ['junk_remote', '📺', 'The Remote', 4, 'Lost for three years. Found in the freezer. Controls a TV you no longer own.'],
      ['junk_tupper', '🥡', "Mom's Tupperware", 5, 'Borrowed in 2008. Must be returned. Ultra Rare because nobody has ever returned one.'],
    ] },
  { id: 'life', name: 'Living Things', jp: 'いきもの', cost: 120, mult: 8,
    main: '#2fbf71', acc: '#fff1a8', blurb: 'Creatures great and small. Some of them are good boys.',
    items: [
      ['liv_pigeon', '🐦', 'Pigeon', 0, 'Has never once been startled. Walks around like it pays rent here.'],
      ['liv_ant', '🐜', 'An Ant', 0, 'Can lift 50 times its own weight. Will not lift a finger for you.'],
      ['liv_goldfish', '🐟', 'Goldfish', 0, 'Three-second memory. Thinks this is its first time in a capsule. Every time.'],
      ['liv_mosquito', '🦟', 'Mosquito', 0, "Nobody wanted this. It's here anyway. That's the gacha experience."],
      ['liv_cat', '🐈', 'Table Cat', 1, 'Pushed your phone off the table. Kept eye contact the whole time.'],
      ['liv_duck', '🦆', 'Senior Rubber Duck', 1, 'Has listened to 10,000 bug explanations. Understood every one. Said nothing.'],
      ['liv_snail', '🐌', 'Snail on a Mission', 1, 'Going somewhere important. Arriving next Thursday. Do not rush it.'],
      ['liv_dog', '🐕', 'A Good Boy', 2, "Who's a good boy? He is. It's official. There is paperwork."],
      ['liv_crab', '🦀', 'Crab in a Bucket', 2, "Will pull you back down. It's nothing personal. It's just crab."],
      ['liv_owl', '🦉', 'Owl With a Mortgage', 3, 'Wise enough to know better. Signed anyway. 30 years, fixed rate.'],
      ['liv_dino', '🦖', 'The Last Dinosaur', 4, 'Survived the asteroid by hiding in a warehouse store. Still has the membership card.'],
      ['liv_goat', '🐐', 'The G.O.A.T.', 5, 'Greatest Of All Time. Literally a goat. Owns six championship rings. Nobody asks how.'],
    ] },
  { id: 'place', name: 'Places', jp: 'ばしょ', cost: 1440, mult: 64,
    main: '#3d8bff', acc: '#ffd9a0', blurb: 'Real estate, shrunk to fit in a capsule.',
    items: [
      ['pl_parking', '🅿️', 'Perfect Parking Spot', 0, "Right by the entrance. Too good to be true. It's a loading zone."],
      ['pl_busstop', '🚏', 'Bus Stop', 0, 'The bus came four minutes early once. Nobody believed you.'],
      ['pl_store', '🏪', '3 AM Convenience Store', 0, 'Hums softly. Sells one sad sandwich. Has never closed. Will never close.'],
      ['pl_door', '🚪', 'A Door', 0, 'Leads to a room you walk into and immediately forget why.'],
      ['pl_island', '🏝️', 'Tiny Island', 1, 'Population: one palm tree. The Wi-Fi is surprisingly good.'],
      ['pl_haunted', '🏚️', 'Haunted House', 1, 'The ghost is very nice. It just wants help paying the electric bill.'],
      ['pl_volcano', '🌋', 'Volcano', 1, 'Mostly calm. Occasionally needs to let off some steam. Relatable.'],
      ['pl_stadium', '🏟️', 'Stadium', 2, '65,000 seats, all chanting your name. The wrong name, but still.'],
      ['pl_tower', '🗼', 'Tokyo Tower', 2, "Painted orange and white so planes notice it. You noticed it. You're basically a plane."],
      ['pl_ocean', '🌊', 'The Ocean', 3, 'Pocket-sized edition. Do not open indoors.'],
      ['pl_castle', '🏯', 'A Whole Castle', 4, 'Comes with a moat, a ghost, and a 400-year-old leaky roof.'],
      ['pl_atlantis', '🔱', 'Atlantis', 5, 'Found it! It was in the junk drawer the whole time.'],
    ] },
  { id: 'idea', name: 'Abstract Concepts', jp: 'がいねん', cost: 17280, mult: 512,
    main: '#9b5cff', acc: '#7ff3d8', blurb: "Things you can't touch, now in capsules you can.",
    items: [
      ['con_tuesday', '📅', 'Tuesday', 0, 'The most forgettable day. Even Tuesday forgets Tuesday.'],
      ['con_shower', '💭', 'A Shower Thought', 0, 'Absolutely brilliant. Gone by the time you found a towel.'],
      ['con_meh', '😐', 'Mild Inconvenience', 0, 'Like a slightly damp sock. Hey, you have one of those.'],
      ['con_seven', '7️⃣', 'The Number 7', 0, "Feels lucky. Statistically isn't. Please don't tell it."],
      ['con_rain', '🌧️', 'The Smell of Rain', 1, 'Petrichor, bottled. Shake well before sniffing.'],
      ['con_song', '🎵', 'That Song Stuck in Your Head', 1, "You know the one. Now it's in your collection too. You're welcome."],
      ['con_plothole', '🕳️', 'A Plot Hole', 1, "Why didn't they just fly the eagles to the volcano? Don't worry about it."],
      ['con_5min', '⏰', 'Five More Minutes', 2, 'Contains 47 minutes. Scientists still cannot explain it.'],
      ['con_imposter', '😅', 'Imposter Syndrome', 2, "You don't deserve this item. (You do. You really do.)"],
      ['con_luck', '🍀', 'Luck', 3, "You pulled Luck, which means you didn't need it."],
      ['con_sense', '🧠', 'Common Sense', 4, 'Listed as Super Super Rare. That explains a lot.'],
      ['con_meaning', '✨', 'The Meaning of Life', 5, "We opened it. It's another capsule. It was capsules all along."],
    ] },
  { id: 'cosmos', name: 'The Cosmos', jp: 'うちゅう', cost: 207360, mult: 4096,
    main: '#dfe3f5', acc: '#6a5cff', blurb: 'Space, time, and everything shiny in between.',
    items: [
      ['cos_comet', '☄️', 'A Comet', 0, 'Visits every 76 years. Never brings snacks.'],
      ['cos_junk', '🛰️', 'Space Junk', 0, "An astronaut's lost wrench, doing 28,000 km/h. Still lost."],
      ['cos_dark', '🌑', 'Dark Matter', 0, '85% of all the matter in the universe. 0% of the personality.'],
      ['cos_star', '⭐', 'Some Random Star', 0, "There are about 10²⁴ of these. You got one. It's fine."],
      ['cos_saturn', '🪐', 'Saturn', 1, 'Liked it, so it put a ring on it. Seven rings, actually.'],
      ['cos_moon', '🌕', 'The Moon', 1, 'One careful previous owner (Earth). A few footprints. Still pulls the tides.'],
      ['cos_alien', '👽', 'Lost Alien', 1, 'Came here looking for intelligent life. Still looking.'],
      ['cos_sun', '☀️', 'The Sun', 2, 'Do not look directly at this item.'],
      ['cos_milky', '🌌', 'The Milky Way', 2, 'Your home galaxy. Technically, you are already inside this capsule.'],
      ['cos_time', '⏳', 'Time', 3, "You've been spending it here. Now you own it. No refunds."],
      ['cos_hole', '⚫', 'A Black Hole', 4, 'Ate all the light. Still hungry. Relatable.'],
      ['cos_universe', '🌀', 'The Universe', 5, 'Everything that exists. Including this capsule. Including you. Wait.'],
    ] },
  { id: 'game', name: 'THE GAME', jp: 'ゲーム', cost: 0, mult: 0,
    main: '#f4f4f8', acc: '#111111', blurb: 'There is nothing left in the universe. The machine starts selling itself.',
    items: [
      ['meta_music', '🎶', 'The Music', 6, 'Every note of the shop music. It belongs to you now. Enjoy the silence.', 'music'],
      ['meta_bg', '🖼️', 'The Background', 6, 'It was holding up the whole vibe.', 'background'],
      ['meta_colors', '🎨', 'The Colors', 6, 'All 16,777,216 of them. Please share.', 'colors'],
      ['meta_font', '🔤', 'The Font', 6, 'What is left is the browser default. This is what a website looks like when nobody loves it.', 'font'],
      ['meta_shop', '🛒', 'The Shop', 6, "You didn't buy something from the shop. You bought the shop.", 'shop'],
      ['meta_missions', '📋', 'The Missions', 6, 'No more objectives. You are free. Terrifyingly free.', 'missions'],
      ['meta_counter', '🔢', 'The Token Counter', 6, 'You now have an unknown number of tokens. Just like real life.', 'counter'],
      ['meta_layout', '📐', 'The Layout', 6, 'All the invisible boxes that kept things lined up. CSS has left the building.', 'layout'],
      ['meta_title', '🏷️', 'The Title', 6, 'This game is now untitled. Like your best work.', 'title'],
      ['meta_button', '🔘', 'The Pull Button', 6, 'Without it, there is no way to pull anything. Unless…', 'button'],
      ['meta_face', '🙂', "Gacha-chan's Face", 6, "She's at peace now. She never has to say “wow” again.", 'face'],
      ['meta_machine', '🎰', 'The Gacha Machine', 6, 'The machine that gave you everything, given to you. There is nothing left to give.', 'machine'],
    ] },
];
// expand tuples into objects + index
const ITEMS = {};
BANNERS.forEach((b, bi) => {
  b.items = b.items.map(t => {
    const it = { id: t[0], e: t[1], n: t[2], r: t[3], d: t[4], fx: t[5] || null, b: bi };
    ITEMS[it.id] = it;
    return it;
  });
});
const META_COST = (k) => Math.round(BANNERS[4].cost * 30 * Math.pow(1.22, k));

const UPGRADES = [
  { id: 'finger', e: '👆', n: 'Stronger Finger', d: 'Each tap shakes loose more tokens.', base: 25, g: 2.6, max: 12 },
  { id: 'magnet', e: '🧲', n: 'Token Magnet', d: '+25% income from everything you own. Tokens just like you now.', base: 60, g: 2.5, max: 20 },
  { id: 'ghost', e: '👻', n: 'Ghost Hand', d: 'Taps the machine for you, twice a second per level. Do not ask whose hand.', base: 180, g: 3.2, max: 6 },
  { id: 'luck', e: '🍀', n: 'Lucky Sock', d: 'Better odds for Rare and up. It has never been washed. That is the secret.', base: 160, g: 3.4, max: 6 },
  { id: 'mercy', e: '💗', n: 'Mercy Module', d: '+10% chance a pull gives you something new. Teaches the machine empathy (v0.3).', base: 120, g: 3.6, max: 4 },
  { id: 'bulk', e: '📦', n: 'Bulk Discount', d: '10× pulls cost 6% less per level. Buy in bulk, regret in bulk.', base: 300, g: 3.6, max: 5 },
  { id: 'gold', e: '👑', n: 'Golden Crank', d: 'All income ×2 and the crank turns gold. Mostly for status.', base: 2000000, g: 1, max: 1 },
];
const UPMAP = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

// rw = reward measured in single pulls of your newest banner
const MISSIONS = [
  { id: 'm_pull1', t: 'Pull the crank once', k: 'pulls', n: 1, rw: 3 },
  { id: 'm_tap', t: 'Tap the machine 30 times', d: 'It likes it.', k: 'taps', n: 30, rw: 3 },
  { id: 'm_multi', t: 'Do a 10× pull', k: 'multi', n: 1, rw: 4 },
  { id: 'm_common', t: 'Pull 15 Commons', d: 'Embrace mediocrity.', k: 'commons', n: 15, rw: 4 },
  { id: 'm_sr', t: 'Pull a Super Rare or better', k: 'srplus', n: 1, rw: 5 },
  { id: 'm_life', t: 'Open the Living Things banner', k: 'unlocked', n: 2, rw: 4 },
  { id: 'm_idle', t: 'Wait 20 seconds without pulling', d: 'The machine gets lonely. Prove you can wait anyway.', k: 'idle', n: 20, rw: 6 },
  { id: 'm_lv5', t: 'Get any item to Lv 5', k: 'maxlv', n: 5, rw: 6 },
  { id: 'm_ssr', t: 'Pull a Super Super Rare', k: 'ssr', n: 1, rw: 6 },
  { id: 'm_uniq25', t: 'Collect 25 different things', k: 'unique', n: 25, rw: 8 },
  { id: 'm_ur', t: 'Pull an Ultra Rare', k: 'ur', n: 1, rw: 8 },
  { id: 'm_spend', t: 'Spend 1,000,000 tokens', d: 'Economy: stimulated.', k: 'spent', n: 1e6, rw: 8 },
  { id: 'm_pull100', t: 'Pull 100 times', k: 'pulls', n: 100, rw: 10 },
  { id: 'm_cosmos', t: 'Open The Cosmos banner', k: 'unlocked', n: 5, rw: 6 },
  { id: 'm_uniq50', t: 'Collect 50 different things', k: 'unique', n: 50, rw: 12 },
];

const LINES = {
  idle: ['Psst. Pull me.', "I have capsules. You have tokens. Let's be friends.", 'Tap me if you are broke. Loose tokens fall out.',
    'Every pull is a fresh start!', 'Fun fact: I am 40% capsule by volume.', 'The crank is right there. Just saying.',
    "I believe in you. Statistically, I shouldn't.", 'Somewhere in here is something amazing. Also a lot of socks.'],
  metaIdle: ['Why are you looking at the background like that?', 'This banner is not for sale. Okay, it is. But it should not be.',
    'Please stop pulling. Or keep going. I am conflicted.', 'I can feel my CSS loosening.', 'What do you even want? You have the universe.'],
  pull: ['Here it comes!', 'Crank crank crank!', 'Rolling, rolling…', 'Ooh, this one feels heavy.', 'Good luck! (I control the luck.)'],
  r0: ['A classic!', "It's a thing! Congrats!", 'Everybody starts somewhere.', "Common, but it's YOURS."],
  r1: ['Ooh, a little shiny!', 'Uncommon! Look at you go.', 'Green means good. Probably.'],
  r2: ['Rare! The light was BLUE!', "Okay, okay, okay. That's a good one."],
  r3: ['SUPER RARE?! Purple light!', 'My gears are tingling!'],
  r4: ['SSR!!! GOLD!!! DID YOU SEE IT?!', "I'm shaking. I'm a machine, I always shake, but STILL."],
  r5: ['ULTRA RARE. I need to sit down. I am always sitting down.', 'RAINBOW!!! RAINBOW!!!'],
  dupe: ['You already had that! Now you have it MORE.', 'Duplicate! It levels up. Spiritually and mathematically.', 'Another one? It missed you.'],
  poor: ['Not enough tokens. Tap me! Gently. Or not.', 'The economy is rough out here. Tap me for loose change.'],
  unlock: ['New banner unlocked! I found more stuff in the back!', 'I dug deeper into my inventory. Look!'],
  buy: ['Thank you for your purchase! All sales final, forever.', 'Pleasure doing business!'],
  tickle: ['Hehe. That tickles.', 'Tokens! Tokens everywhere!', 'Ow. Do it again.'],
  // spoken after each THE GAME pull, in order
  meta: [
    'Hey! That was my favorite song… I wrote it myself…',
    "Where did the night go? It's all white now. Like a spreadsheet.",
    "Everything is gray. I'm gray. Are you gray? Don't answer.",
    'I look like a tax form. I FEEL like a tax form.',
    "You bought the whole shop? That's not how shops work!",
    'No more missions. Your only objective is… me. Oh no.',
    'How many tokens do you have? Nobody knows. Not even me.',
    'Everything is falling apart. Literally. Hold on to something.',
    'What was this game called again? I… I forget.',
    'Ha! No button, no pulls! …Wait. You can still turn my crank by hand. Please don\'t.',
    '',
  ],
  metaWarn: [
    'You pulled the universe. That was the last thing I had. There is nothing left inside me. Except… no. No no no.',
  ],
};

/* ---------- pure economy (shared with the balance sim) ---------- */
function upLvl(S, id) { return S.up[id] || 0; }
function upCost(id, lvl) { const u = UPMAP[id]; return Math.round(u.base * Math.pow(u.g, lvl)); }
function lvlMult(count) { return 1 + 0.6 * (Math.min(count, 10) - 1); }
function itemTps(S, it) {
  const c = S.owned[it.id] || 0;
  if (!c || it.b >= META) return 0;
  return RAR[it.r].tps * BANNERS[it.b].mult * lvlMult(c);
}
function incomeMult(S) { return (1 + 0.25 * upLvl(S, 'magnet')) * (upLvl(S, 'gold') ? 2 : 1) * (1 + (S.ng || 0)); }
function calcTps(S) {
  let t = 0;
  for (const id in S.owned) t += itemTps(S, ITEMS[id]);
  return t * incomeMult(S);
}
function tapValue(S, tps) { const F = upLvl(S, 'finger'); return (1 + F) + tps * 0.01 * (1 + 0.2 * F); }
function pullCost(S, b) { return b === META ? META_COST(S.meta) : BANNERS[b].cost; }
function multiCost(S, b) { return Math.round(BANNERS[b].cost * 10 * (1 - 0.06 * upLvl(S, 'bulk'))); }
function rarityWeights(S) {
  const L = upLvl(S, 'luck');
  const boost = [1, 1, 1 + 0.25 * L, 1 + 0.35 * L, 1 + 0.5 * L, 1 + 0.6 * L];
  return RAR.slice(0, 6).map((r, i) => r.w * boost[i]);
}
function mercyChance(S) { return Math.min(0.95, 0.55 + 0.1 * upLvl(S, 'mercy')); }
function uniqueIn(S, b) { return BANNERS[b].items.filter(i => S.owned[i.id]).length; }
function uniqueAll(S) { let n = 0; for (let b = 0; b < META; b++) n += uniqueIn(S, b); return n; }
function maxLevel(S) { let m = 0; for (const id in S.owned) if (ITEMS[id].b < META) m = Math.max(m, S.owned[id]); return m; }
function newestCost(S) { return BANNERS[Math.min(S.unlocked, META) - 1].cost; }
function missionReward(S, m) { return Math.round(m.rw * newestCost(S)); }
function rollRarity(S, rand) {
  const w = rarityWeights(S); const tot = w.reduce((a, b) => a + b, 0);
  let x = rand() * tot;
  for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return i; }
  return 0;
}
function rollItem(S, b, rand) {
  S.pity[b] = (S.pity[b] || 0) + 1;
  let r = S.pity[b] >= PITY ? 5 : rollRarity(S, rand);
  if (r === 5) S.pity[b] = 0;
  const pool = BANNERS[b].items.filter(i => i.r === r);
  const fresh = pool.filter(i => !S.owned[i.id]);
  const pickFrom = (fresh.length && rand() < mercyChance(S)) ? fresh : pool;
  return pickFrom[Math.floor(rand() * pickFrom.length)];
}
function freshState(ng) {
  return { v: 1, tokens: 100, earned: 0, spent: 0, pulls: 0, taps: 0, multi: 0, commons: 0, srplus: 0, ssr: 0, ur: 0,
    owned: {}, up: {}, claimed: {}, banner: 0, unlocked: 1, pity: [0, 0, 0, 0, 0], meta: 0, idle: 0, idleBest: 0,
    playMs: 0, ng: ng || 0, ended: false, music: true, sfx: true, best: -1 };
}
if (typeof module !== 'undefined') module.exports = { RAR, BANNERS, ITEMS, UPGRADES, MISSIONS, META, META_COST, PITY, UNLOCK_NEED,
  calcTps, tapValue, pullCost, multiCost, upCost, upLvl, rollItem, freshState, uniqueIn, uniqueAll, maxLevel, missionReward, UPMAP };
