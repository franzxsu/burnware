/* ============================================================
   Recipes and how a plate gets judged. Each judge looks at what
   is physically in the vessel: counts of each element, how far
   along they cooked, and how hot the food still is.
   ============================================================ */
const RECIPES = [
  { id: 'rice', name: 'Steamed rice', vessel: 'bowl', price: 4,
    how: 'Rice in the pot with about twice as much water. Medium heat. When the water has gone, turn it off and scoop the rice into the bowl.' },
  { id: 'egg', name: 'Sunny-side egg', vessel: 'plate', price: 5,
    how: 'A splash of oil in the pan on medium. Crack an egg in. Lift it onto the plate once the white is set but the yolk is still bright orange.' },
  { id: 'popcorn', name: 'Popcorn', vessel: 'bowl', price: 4,
    how: 'A little oil and a pile of kernels in the pot, high heat. When the popping slows, scoop it out before it scorches.' },
  { id: 'caramel', name: 'Caramel', vessel: 'plate', price: 6,
    how: 'Sugar in the dry pan on medium. It melts, then turns golden, then amber. Get it onto the plate at amber. Dark brown is bitter.' },
  { id: 'pancake', name: 'Pancakes', vessel: 'plate', price: 7,
    how: 'Flour and milk (or water), stirred into batter. Butter the pan on medium, pour the batter, wait for golden, then plate it.' },
  { id: 'sinangag', name: 'Garlic fried rice', vessel: 'plate', price: 8,
    how: 'Oil in the pan on medium. Fry garlic until golden, add day-old rice and stir until the grains turn gold too.' },
  { id: 'cocoa', name: 'Hot chocolate', vessel: 'mug', price: 6,
    how: 'Milk in the pot on low with a piece of chocolate. Stir as it melts. Pour into the mug while it is hot. Watch it does not boil over.' },
  { id: 'ramen', name: 'Instant ramen', vessel: 'bowl', price: 7,
    how: 'Boil water in the pot, drop in a noodle block and some seasoning. When the noodles soften, move noodles and broth to the bowl. An egg earns a tip.' },
  { id: 'adobo', name: 'Chicken adobo', vessel: 'bowl', price: 10,
    how: 'Chicken, soy sauce, vinegar and garlic in the pot. Simmer on medium until the chicken turns dark and glossy, then bowl it with the sauce.' },
  { id: 'scrambled', name: 'Scrambled eggs', vessel: 'plate', price: 6,
    how: 'Butter in the pan on low or medium. Crack in two or three eggs and stir them until yolk and white are one colour, then keep stirring while they set into soft curds.' },
  { id: 'omelette', name: 'Omelette', vessel: 'plate', price: 7,
    how: 'Crack two or three eggs into the cold pan and stir until they are one colour. Then butter or oil, medium heat, and leave it alone. Lift it out once the top has set.' },
  { id: 'kettle', name: 'Caramel corn', vessel: 'bowl', price: 9,
    how: 'Pop some corn in the pot. Melt sugar into caramel in the pan. Scoop the hot caramel over the popcorn, put the pot on low and stir to coat, then bowl it before it scorches.' },
  { id: 'cola', name: 'Iced cola', vessel: 'mug', price: 3,
    how: 'Pour cola into the mug and drop in some ice. Whatever you do, keep the mints away from it.' },
  { id: 'silog', name: 'Silog plate', vessel: 'plate', price: 14,
    how: 'Garlic fried rice with a sunny-side egg on top. Fry the rice and plate it, then fry an egg in the same pan and lay it over the rice.' },
  { id: 'fried', name: 'Fried chicken', vessel: 'plate', price: 9,
    how: 'A deep layer of oil in the pan on medium. Fry chicken pieces until golden brown outside and cooked through. Lift them out from the top so the oil stays behind.' },
];
const RECIPE_BY_ID = Object.fromEntries(RECIPES.map(r => [r.id, r]));
/* one dish a day is the special: it pays half as much again (the day is the viewer's own) */
function specialId(d = new Date()) { const n = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate(); return RECIPES[(n * 7 + 3) % RECIPES.length].id; }

/* judge(recipe id, contents) -> { stars 0-3, notes [], bonus } */
function judge(id, c) {
  const n = (el) => c.counts[el] || 0, ck = (el) => c.cookAvg[el] || 0;
  const notes = [], good = []; let stars = 3, bonus = 0;
  const fault = (msg) => { stars--; notes.push(msg); };
  const none = (msg) => ({ stars: 0, notes: [msg], good: [], bonus: 0 });
  const burnt = n(BURNT), cold = c.avgT < 45;
  if (burnt > 25 && burnt > c.n * 0.45) return none('This is charcoal.');
  switch (id) {
    case 'rice': {
      const main = n(RICE_C);
      if (main < 60) return none(n(RICE) > 20 ? 'This rice is raw.' : main ? 'That is a spoonful, not a bowl.' : 'There is no rice in this bowl.');
      if (n(RICE) > main * 0.1) fault('Crunchy. Some grains are still raw.');
      if (burnt > main * 0.06) fault('Tastes of smoke. The bottom burned.');
      if (n(WATER) > main * 0.15) fault('Soupy. Cook the water off first.');
      if (ck(RICE_C) > 120) fault('Dry and toasty, close to scorched.');
      if (cold) fault('It has gone cold.');
      if (stars === 3) good.push('Fluffy, every grain separate.');
      break;
    }
    case 'egg': {
      const white = n(EGG_C), raw = n(EGG_W), yolk = n(YOLK), set = n(YOLK_C);
      if (white + raw + yolk + set < 15) return none('Where is the egg?');
      if (white < 12) return none('That is raw egg on a plate.');
      if (yolk < 4 && set > 0) fault('The yolk is hard. Sunny side means runny.');
      else if (yolk + set < 4) fault('The yolk went missing.');
      if (raw > white * 0.15) fault('The white is still slimy.');
      if (burnt > 6) fault('Burnt edges.');
      else if (ck(EGG_C) > 300) fault('A bit too crispy underneath.');
      if (cold) fault('Cold egg.');
      if (stars === 3) good.push('Set white, glowing yolk. Perfect.');
      break;
    }
    case 'popcorn': {
      const main = n(POPCORN);
      if (main < 80) return none(n(KERNEL) > 20 ? 'These are kernels. They need to pop first.' : 'That is barely a handful.');
      if (n(KERNEL) > main * 0.1) fault('Watch your teeth: lots of unpopped kernels.');
      if (burnt > main * 0.06 || ck(POPCORN) > 200) fault('Scorched.');
      if (n(OIL) > main * 0.2) fault('Swimming in oil.');
      if (stars === 3) good.push('Light, crisp, not a burnt one in sight.');
      break;
    }
    case 'caramel': {
      const main = n(CARAMEL) + n(CANDY), level = main ? (ck(CARAMEL) * n(CARAMEL) + ck(CANDY) * n(CANDY)) / main : 0;
      if (main < 40) return none(n(SUGAR) > 20 ? 'This is just sugar.' : 'There is hardly any caramel.');
      if (level < 230) fault('Pale. Cook it on to amber.');
      else if (level > 700) fault('Bitter. That is nearly burnt.');
      if (n(SUGAR) > main * 0.1) fault('Still grainy with raw sugar.');
      if (burnt > main * 0.05) fault('Black flecks of burnt sugar.');
      if (stars === 3) good.push('Deep amber and glossy.');
      break;
    }
    case 'pancake': {
      const main = n(PANCAKE), level = ck(PANCAKE);
      if (main < 50) return none(n(BATTER) > 20 ? 'This is batter, not pancakes.' : 'There is hardly any pancake here.');
      if (n(BATTER) > main * 0.08) fault('Raw in the middle.');
      if (n(FLOUR) > main * 0.1) fault('Lumps of dry flour. Stir the batter.');
      if (level < 110) fault('Pale. A bit longer on the heat.');
      else if (level > 470) fault('Very dark on the bottom.');
      if (burnt > main * 0.05) fault('Burnt patches.');
      if (n(BUTTER_M) + n(BUTTER) + n(CARAMEL) > 4) { bonus += 2; good.push('Butter on top. Lovely.'); }
      if (stars === 3) good.push('Golden all over.');
      break;
    }
    case 'sinangag': {
      const main = n(RICE_F);
      if (main < 60) return none(n(RICE_C) > 40 ? 'That is plain rice. Fry it.' : 'Where is the rice?');
      if (n(GARLIC_F) < 4) fault(n(GARLIC) > 3 ? 'Raw garlic. Fry it golden first.' : 'Garlic rice without garlic?');
      else if (ck(GARLIC_F) > 230) fault('The garlic went bitter.');
      if (n(RICE_C) > main * 0.3) fault('Half of it is not fried.');
      if (burnt > main * 0.06) fault('Burnt bits in there.');
      if (stars === 3) good.push('Golden, garlicky, just like home.');
      break;
    }
    case 'cocoa': {
      const main = n(COCOA);
      if (main < 40) return none(n(MILK) > 30 ? 'This is warm milk.' : 'There is almost nothing in the mug.');
      if (n(MILK) > main * 0.3) fault('Weak. It needs more chocolate.');
      if (n(CHOC) + n(CHOC_M) > 8) fault('Lumps of chocolate at the bottom.');
      if (c.avgT < 50) fault('Lukewarm.');
      if (burnt > 3) fault('Scorched milk taste.');
      if (stars === 3) good.push('Rich, hot and smooth.');
      break;
    }
    case 'ramen': {
      const nood = n(NOODLE), broth = n(BROTH);
      if (nood < 30) return none(n(NOODLE_D) > 20 ? 'The noodles are still a hard block.' : 'Ramen needs noodles.');
      if (broth < 40) fault(n(WATER) > 30 ? 'Noodles in plain water. Add the seasoning.' : 'Where is the soup?');
      if (n(NOODLE_D) > 5) fault('Crunchy bits of noodle.');
      if (c.avgT < 55) fault('Cold ramen.');
      if (burnt > 4) fault('Burnt bits.');
      if (n(EGG_C) + n(YOLK_C) + n(YOLK) > 8) { bonus += 3; good.push('An egg! You get me.'); }
      if (stars === 3) good.push('Slurp-worthy.');
      break;
    }
    case 'adobo': {
      const meat = n(MEAT_A), sauce = n(ADOBO);
      if (meat < 20) return none(n(MEAT) > 10 ? 'This chicken is RAW.' : n(MEAT_C) > 10 ? 'That is boiled chicken, not adobo.' : 'Adobo with no chicken?');
      if (n(MEAT) > 2) fault('Pink in the middle!');
      if (sauce < 15) fault('Dry. Where is the sauce?');
      if (n(MEAT_C) > meat * 0.3) fault('Some pieces never met the sauce.');
      if (burnt > meat * 0.1) fault('Burnt on the bottom.');
      if (n(GARLIC_F) + n(GARLIC) > 3) { bonus += 2; good.push('Plenty of garlic.'); }
      if (stars === 3) good.push('Tangy, salty, tender. Lola approves.');
      break;
    }
    case 'scrambled': case 'omelette': {
      const curds = n(EGG_SCR), sheet = n(EGG_OM), raw = n(EGG_MIX) + n(EGG_W) + n(YOLK), fried = n(EGG_C) + n(YOLK_C);
      const omelette = id === 'omelette', main = omelette ? sheet : curds, other = omelette ? curds : sheet;
      if (curds + sheet < 20) return none(raw > 15 ? 'That is raw egg on a plate.' : fried > 15 ? 'That is a fried egg.' : 'Where are the eggs?');
      if (other > main) { stars = 1; notes.push(omelette ? 'These are scrambled eggs. Leave an omelette alone while it sets.' : 'This is an omelette. Keep stirring while the eggs set.'); }
      else if (other > main * (omelette ? 0.3 : 0.4)) fault(omelette ? 'It broke up into pieces.' : 'Big rubbery sheets. Stir more.');
      if (fried > (curds + sheet) * 0.3) fault('Fried egg bits. Beat the eggs before they set.');
      if (raw > (curds + sheet) * 0.12) fault(omelette ? 'Runny on top.' : 'Wet and runny.');
      if (burnt > 6 || ck(omelette ? EGG_OM : EGG_SCR) > (omelette ? 300 : 230)) fault(omelette ? 'Brown and leathery underneath.' : 'Browned. Scrambled eggs should stay soft.');
      if (cold) fault('Cold eggs.');
      if (!omelette && n(BUTTER_M) + n(BUTTER) > 3) { bonus += 1; good.push('Buttery.'); }
      if (stars === 3) good.push(omelette ? 'Soft, golden and all in one piece.' : 'Soft, creamy curds. Perfect.');
      break;
    }
    case 'kettle': {
      const main = n(POPCORN_K), plain = n(POPCORN), puddle = n(CARAMEL) + n(CANDY);
      if (main < 50) return none(plain > 40 ? 'Plain popcorn. Where is the caramel?' : puddle > 30 ? 'This is a puddle of caramel.' : 'Hardly any caramel corn here.');
      if (plain > main * 0.35) fault('Patchy. Lots of it has no caramel.');
      if (puddle > main * 0.6) fault('More caramel than corn.');
      if (n(KERNEL) > 10) fault('Unpopped kernels in there.');
      if (burnt > main * 0.06 || ck(POPCORN_K) > 220) fault('Scorched.');
      if (stars === 3) good.push('Crunchy, glossy, gone in a minute.');
      break;
    }
    case 'cola': {
      const main = n(COLA), ice = n(ICE), fizz = n(COLAFOAM) + n(MENTOS);
      if (main < 30) return none(fizz > 10 ? 'All foam, no cola.' : 'There is barely any cola.');
      if (ice < 4 && c.avgT > 12) fault('Warm. It needs ice.');
      if (n(WATER) > main * 0.4) fault('Watered down.');
      if (fizz > 6) fault('Foaming everywhere.');
      if (stars === 3) good.push('Ice cold. Ahh.');
      break;
    }
    case 'silog': {
      const rice = n(RICE_F), white = n(EGG_C), yolk = n(YOLK), set = n(YOLK_C);
      if (rice < 50 && white < 12) return none('Where is the silog?');
      if (rice < 50) return none(n(RICE_C) > 40 ? 'Plain rice. Silog needs garlic fried rice.' : 'An egg with no rice.');
      if (white < 12) return none(n(EGG_W) > 12 ? 'The egg is raw.' : 'Silog without the egg?');
      if (n(GARLIC_F) < 4) fault('Garlic rice without garlic?');
      if (yolk < 4 && set > 0) fault('Hard yolk. It should run into the rice.');
      else if (yolk + set < 4) fault('The yolk went missing.');
      if (n(EGG_W) > white * 0.15) fault('Slimy egg white.');
      if (n(RICE_C) > rice * 0.3) fault('Half the rice is not fried.');
      if (burnt > (rice + white) * 0.06) fault('Burnt bits.');
      if (cold) fault('It has gone cold.');
      if (stars === 3) good.push('Sinangag and itlog. Breakfast of champions.');
      break;
    }
    case 'fried': {
      const meat = n(MEAT_C), raw = n(MEAT), level = ck(MEAT_C);
      if (meat < 20) return none(raw > 10 ? 'This chicken is RAW.' : n(MEAT_A) > 10 ? 'That is adobo.' : 'Fried chicken with no chicken?');
      if (raw > 2) fault('Pink in the middle!');
      if (n(MEAT_A) > meat * 0.3) fault('Why is it in soy sauce?');
      if (level < 110) fault('Pale and soggy. Fry it longer.');
      else if (level > 380) fault('Dark and dry. Overdone.');
      if (burnt > meat * 0.1) fault('Burnt bits.');
      if (n(OIL) > meat * 0.8) fault('Swimming in oil.');
      if (cold) fault('Cold fried chicken.');
      if (stars === 3) good.push('Golden, crunchy, juicy.');
      break;
    }
  }
  // anything else that should not be there
  const odd = [POPCORN, COLA, COLAFOAM, FOAM, MENTOS, SALT].filter(el => !((id === 'popcorn' || id === 'kettle') && el === POPCORN) && !(id === 'cola' && (el === COLA || el === COLAFOAM || el === MENTOS))).reduce((s, el) => s + n(el), 0);
  if (odd > c.n * 0.12 && odd > 6) fault('Something in here does not belong.');
  return { stars: Math.max(0, stars), notes, good, bonus };
}
