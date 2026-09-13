/**
 * PetPal — food & plant safety database and lookup.
 *
 * The previous lookup matched with `query.includes(alias) || alias.includes(query)`.
 * The second half of that test is dangerous: searching "chicken" matched the
 * alias "chicken bone" and reported plain cooked chicken as DO NOT FEED. A
 * safety tool that cries wolf on safe food is worse than no tool, because
 * owners stop believing the warnings that matter.
 *
 * Matching here is deliberately one-directional and specificity-ranked:
 *   - an alias matches only when it appears as a WHOLE PHRASE in the query,
 *     or the query is exactly that alias (allowing a simple plural),
 *   - when several entries match, the longest (most specific) alias wins, so
 *     "chicken bone" still resolves to the bone warning while "chicken" and
 *     "roast chicken breast" both resolve to safe poultry.
 */

export type SafetyLevel = 'safe' | 'caution' | 'toxic'

export interface FoodEntry {
  /** First alias is the canonical display name. */
  names: string[]
  level: SafetyLevel
  /** Why — the clinical reason, in plain language. */
  note: string
  /** Which animals this applies to most acutely. */
  appliesTo?: string
  /** What the owner should actually do. */
  action?: string
}

export const FOOD_DB: FoodEntry[] = [
  // ── TOXIC ────────────────────────────────────────────────────────────────
  {
    names: ['chocolate', 'cocoa', 'cacao', 'dark chocolate', 'milk chocolate'],
    level: 'toxic',
    appliesTo: 'Dogs and cats',
    note: 'Contains theobromine and caffeine, which pets clear far more slowly than we do. Causes vomiting, racing heart, tremors and seizures. Darker chocolate is far more dangerous per gram.',
    action: 'Call your vet immediately with the type and amount eaten and your pet’s weight.',
  },
  {
    names: ['grape', 'grapes', 'raisin', 'raisins', 'sultana', 'sultanas', 'currant', 'currants'],
    level: 'toxic',
    appliesTo: 'Dogs especially',
    note: 'Can cause sudden kidney failure, and the toxic dose is unpredictable — some dogs react to a very small amount.',
    action: 'Treat any amount as an emergency and phone your vet now.',
  },
  {
    names: ['onion', 'onions', 'garlic', 'leek', 'leeks', 'chive', 'chives', 'shallot', 'shallots', 'onion powder'],
    level: 'toxic',
    appliesTo: 'Cats especially, and dogs',
    note: 'The allium family damages red blood cells and causes anaemia. Cooked, raw and powdered forms are all toxic, and powders in gravy or stock are the most concentrated.',
    action: 'Call your vet. Signs such as weakness or pale gums can take several days to appear.',
  },
  {
    names: ['xylitol', 'birch sugar', 'sugar free gum', 'sugar-free gum', 'sugarfree sweetener'],
    level: 'toxic',
    appliesTo: 'Dogs',
    note: 'Triggers a dangerous insulin release and can cause liver failure. Tiny amounts matter, and it hides in sugar-free gum, mints, peanut butter and baked goods.',
    action: 'Emergency — go to a vet straight away, even if your pet seems fine.',
  },
  {
    names: ['macadamia', 'macadamia nut', 'macadamia nuts'],
    level: 'toxic',
    appliesTo: 'Dogs',
    note: 'Causes weakness (especially in the hind legs), tremors, vomiting and raised temperature.',
    action: 'Phone your vet for advice on the amount eaten.',
  },
  {
    names: ['alcohol', 'beer', 'wine', 'spirits', 'liquor', 'ethanol'],
    level: 'toxic',
    appliesTo: 'All pets',
    note: 'Pets are far more sensitive than people. Affects the nervous system, breathing and blood sugar even in small amounts.',
    action: 'Contact your vet immediately.',
  },
  {
    names: ['caffeine', 'coffee', 'coffee grounds', 'espresso', 'energy drink', 'energy drinks'],
    level: 'toxic',
    appliesTo: 'Dogs and cats',
    note: 'A stimulant that causes restlessness, a racing heart, tremors and seizures. Grounds and beans are the most concentrated.',
    action: 'Call your vet with the amount eaten.',
  },
  {
    names: ['lily', 'lilies', 'easter lily', 'tiger lily', 'day lily'],
    level: 'toxic',
    appliesTo: 'Cats — extremely',
    note: 'Every part is toxic to cats, including the pollen and the vase water. Causes fatal kidney failure, sometimes from grooming pollen off the coat.',
    action: 'Emergency. Remove the plant from the house and get to a vet immediately.',
  },
  {
    names: ['avocado', 'avocados', 'guacamole'],
    level: 'toxic',
    appliesTo: 'Birds and rabbits especially',
    note: 'Contains persin, which is most dangerous to birds and small pets. For dogs the bigger risk is the stone, which can obstruct the gut.',
    action: 'Keep away from birds entirely. For dogs, watch for choking or gut obstruction.',
  },
  {
    names: ['cooked bone', 'cooked bones', 'chicken bone', 'chicken bones', 'cooked chicken bone', 'rib bone', 'rib bones'],
    level: 'toxic',
    appliesTo: 'Dogs and cats',
    note: 'Cooking makes bone brittle, so it splinters into sharp fragments that can puncture the mouth, throat or intestines.',
    action: 'Never feed cooked bones. If one has been eaten, call your vet rather than waiting for symptoms.',
  },
  {
    names: ['raw dough', 'bread dough', 'yeast dough', 'rising dough'],
    level: 'toxic',
    appliesTo: 'Dogs',
    note: 'Yeast keeps rising in the warm stomach, causing painful bloating, and ferments into alcohol which is absorbed into the blood.',
    action: 'Emergency — call your vet immediately.',
  },
  {
    names: ['antifreeze', 'ethylene glycol'],
    level: 'toxic',
    appliesTo: 'All pets',
    note: 'Sweet-tasting and rapidly fatal to the kidneys. Even a small spill licked from a driveway can kill.',
    action: 'Emergency. Go to a vet immediately — treatment is only effective if given very early.',
  },
  {
    names: ['sago palm', 'cycad'],
    level: 'toxic',
    appliesTo: 'Dogs and cats',
    note: 'Every part is toxic and the seeds most of all. Causes liver failure.',
    action: 'Emergency veterinary treatment required.',
  },

  // ── CAUTION ──────────────────────────────────────────────────────────────
  {
    names: ['dairy', 'milk', 'cheese', 'ice cream', 'cream', 'yoghurt', 'yogurt'],
    level: 'caution',
    appliesTo: 'Most adult dogs and cats',
    note: 'Most adult pets lose the ability to digest lactose, so dairy commonly causes wind, loose stools and stomach pain. It is not poisonous, just poorly tolerated.',
    action: 'Offer only tiny amounts, or skip it. Plain unsweetened yoghurt is the best tolerated.',
  },
  {
    names: ['bread', 'toast', 'baked bread'],
    level: 'caution',
    appliesTo: 'Dogs',
    note: 'Plain baked bread is not toxic but is empty calories and can bloat. Raw dough is a separate, serious danger.',
    action: 'A small piece occasionally is fine. Never give raw dough.',
  },
  {
    names: ['salt', 'salty snacks', 'chips', 'crisps', 'pretzel', 'pretzels'],
    level: 'caution',
    appliesTo: 'All pets',
    note: 'Too much salt causes thirst, vomiting and, in larger amounts, sodium poisoning and tremors.',
    action: 'Avoid salty human snacks. Make sure fresh water is always available.',
  },
  {
    names: ['ham', 'bacon', 'sausage', 'fatty meat', 'fat trimmings', 'pork crackling'],
    level: 'caution',
    appliesTo: 'Dogs especially',
    note: 'Very high fat can trigger pancreatitis, a painful and sometimes serious illness. These are also extremely salty.',
    action: 'Best avoided. If you do share, make it a very small, lean piece.',
  },
  {
    names: ['tomato', 'tomatoes'],
    level: 'caution',
    appliesTo: 'Dogs and cats',
    note: 'Ripe red flesh is fine in moderation. The green parts — stems, leaves and unripe fruit — contain solanine and are mildly toxic.',
    action: 'Feed only ripe flesh, and keep pets away from tomato plants.',
  },
  {
    names: ['raw bone', 'raw bones', 'marrow bone'],
    level: 'caution',
    appliesTo: 'Dogs',
    note: 'Raw bone does not splinter like cooked bone, but still carries a risk of broken teeth, choking and bacterial contamination.',
    action: 'Supervise closely, pick a size too large to swallow, and ask your vet first.',
  },
  {
    names: ['nuts', 'almond', 'almonds', 'walnut', 'walnuts', 'cashew', 'cashews', 'peanut', 'peanuts'],
    level: 'caution',
    appliesTo: 'Dogs',
    note: 'Most nuts are not directly poisonous but are very high in fat and a common choking hazard. Walnuts can carry moulds that cause tremors. Macadamias are genuinely toxic.',
    action: 'Avoid as a habit. Never feed macadamias, and check nut butters for xylitol.',
  },
  {
    names: ['egg', 'eggs', 'raw egg'],
    level: 'caution',
    appliesTo: 'Dogs and cats',
    note: 'Cooked egg is a good protein. Raw egg carries a salmonella risk and raw white can interfere with biotin absorption over time.',
    action: 'Cook it plain, with no oil, salt or seasoning.',
  },

  // ── SAFE ─────────────────────────────────────────────────────────────────
  {
    names: ['chicken', 'cooked chicken', 'turkey', 'cooked turkey', 'chicken breast', 'poultry'],
    level: 'safe',
    appliesTo: 'Dogs and cats',
    note: 'Plain cooked, boneless, skinless and unseasoned poultry is an excellent lean protein and gentle on upset stomachs.',
    action: 'Serve plain — no salt, butter, onion or garlic. Remove all bones.',
  },
  {
    names: ['carrot', 'carrots', 'baby carrot', 'baby carrots'],
    level: 'safe',
    appliesTo: 'Dogs and rabbits',
    note: 'Crunchy, low in calories and good for the teeth. Safe raw or cooked.',
    action: 'Cut into sticks or coins for small pets to avoid choking.',
  },
  {
    names: ['apple', 'apples'],
    level: 'safe',
    appliesTo: 'Dogs and cats',
    note: 'A sweet, fibre-rich treat. The pips contain a trace of cyanide compound, so core it first.',
    action: 'Remove the core and seeds, then slice.',
  },
  {
    names: ['pumpkin', 'butternut', 'squash'],
    level: 'safe',
    appliesTo: 'Dogs and cats',
    note: 'Plain cooked pumpkin is rich in fibre and often recommended to settle mild digestive upsets.',
    action: 'Use plain cooked or tinned pumpkin — never spiced pie filling.',
  },
  {
    names: ['rice', 'white rice', 'cooked rice'],
    level: 'safe',
    appliesTo: 'Dogs',
    note: 'Plain cooked white rice is bland and easy to digest, which is why vets suggest it for recovery meals.',
    action: 'Cook plain with no salt, butter or stock.',
  },
  {
    names: ['blueberry', 'blueberries'],
    level: 'safe',
    appliesTo: 'Dogs and cats',
    note: 'Antioxidant-rich and exactly the right size for a low-calorie training treat.',
    action: 'Feed whole as an occasional treat.',
  },
  {
    names: ['banana', 'bananas'],
    level: 'safe',
    appliesTo: 'Dogs',
    note: 'Safe and a good source of potassium, but high in natural sugar.',
    action: 'Small slices only, as an occasional treat.',
  },
  {
    names: ['peanut butter'],
    level: 'safe',
    appliesTo: 'Dogs',
    note: 'A firm favourite and safe — but ONLY if it is xylitol-free. Some brands use xylitol, which is lethal to dogs.',
    action: 'Read the label every time and pick a plain, unsweetened, xylitol-free brand.',
  },
  {
    names: ['salmon', 'cooked salmon', 'sardine', 'sardines', 'white fish'],
    level: 'safe',
    appliesTo: 'Dogs and cats',
    note: 'Cooked, boneless fish is rich in omega-3 oils that support skin, coat and joints.',
    action: 'Always cook it — raw salmon can carry a parasite that is dangerous to dogs.',
  },
  {
    names: ['green beans', 'green bean'],
    level: 'safe',
    appliesTo: 'Dogs',
    note: 'Filling, low in calories and a useful swap when a dog is on a weight-loss plan.',
    action: 'Serve plain, raw or steamed, with no salt or butter.',
  },
  {
    names: ['watermelon'],
    level: 'safe',
    appliesTo: 'Dogs',
    note: 'Hydrating and refreshing in hot weather.',
    action: 'Remove the rind and all seeds first.',
  },
  {
    names: ['cucumber'],
    level: 'safe',
    appliesTo: 'Dogs and small pets',
    note: 'Very low in calories and high in water — a good hot-weather snack.',
    action: 'Slice into manageable pieces.',
  },
  {
    names: ['oats', 'oatmeal', 'porridge'],
    level: 'safe',
    appliesTo: 'Dogs',
    note: 'Plain cooked oats are a gentle source of fibre, useful for sensitive stomachs.',
    action: 'Cook with water, not milk, and add no sugar or sweetener.',
  },
]

/** Quick-pick chips shown under the search box. */
export const QUICK_CHECKS = [
  'Chocolate', 'Grapes', 'Onion', 'Xylitol', 'Chicken', 'Peanut butter', 'Carrot', 'Lily',
]

export type LookupResult =
  | { status: 'empty' }
  | { status: 'found'; entry: FoodEntry; matched: string }
  | { status: 'unknown'; query: string; suggestions: string[] }

/** Lowercase, strip punctuation, collapse whitespace. */
function normalise(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Crude singular form, enough for "grapes" -> "grape", "berries" -> "berry". */
function singular(s: string) {
  if (s.endsWith('ies') && s.length > 4) return s.slice(0, -3) + 'y'
  if (s.endsWith('ses') || s.endsWith('xes') || s.endsWith('zes')) return s.slice(0, -2)
  if (s.endsWith('s') && !s.endsWith('ss')) return s.slice(0, -1)
  return s
}

/** True when `phrase` occurs in `text` on whole-word boundaries. */
function containsPhrase(text: string, phrase: string) {
  const i = text.indexOf(phrase)
  if (i === -1) return false
  const before = i === 0 ? ' ' : text[i - 1]
  const afterIdx = i + phrase.length
  const after = afterIdx >= text.length ? ' ' : text[afterIdx]
  return /[\s-]/.test(before) && /[\s-]/.test(after)
}

/**
 * Look up a food, plant or household item.
 *
 * Returns the most specific matching entry, or an `unknown` result carrying
 * near-miss suggestions. It never guesses: an unrecognised item is reported as
 * unrecognised rather than being force-matched to the closest string, because
 * a wrong "safe" here could kill an animal.
 */
export function lookupFood(rawQuery: string): LookupResult {
  const q = normalise(rawQuery)
  // One or two characters is not a meaningful search — treat as no query
  // rather than letting it fuzzy-match something alarming.
  if (q.length < 2) return { status: 'empty' }

  const qSingular = singular(q)

  let best: { entry: FoodEntry; alias: string; score: number } | null = null

  for (const entry of FOOD_DB) {
    for (const alias of entry.names) {
      const a = normalise(alias)
      let score = 0

      if (q === a) score = 1000
      else if (qSingular === singular(a)) score = 900
      // The alias appears as a whole phrase inside a longer query, e.g.
      // "my dog ate a chicken bone" -> "chicken bone". Longer alias wins.
      else if (containsPhrase(q, a)) score = 500 + a.length
      // Deliberately NOT matching `a.includes(q)`: typing "chicken" must not
      // resolve to "chicken bone".

      if (score > 0 && (!best || score > best.score)) {
        best = { entry, alias, score }
      }
    }
  }

  if (best) return { status: 'found', entry: best.entry, matched: best.alias }

  // Offer near misses so the owner has somewhere to go next.
  const suggestions: string[] = []
  for (const entry of FOOD_DB) {
    for (const alias of entry.names) {
      const a = normalise(alias)
      if (a.startsWith(q.slice(0, 3)) || a.includes(qSingular)) {
        if (!suggestions.includes(entry.names[0])) suggestions.push(entry.names[0])
        break
      }
    }
    if (suggestions.length >= 4) break
  }

  return { status: 'unknown', query: rawQuery.trim(), suggestions }
}

export const LEVEL_META: Record<SafetyLevel, { label: string; color: string; short: string }> = {
  safe: { label: 'SAFE TO FEED', color: '#34D399', short: 'Safe' },
  caution: { label: 'ONLY IN MODERATION', color: '#FFB84D', short: 'Caution' },
  toxic: { label: 'DO NOT FEED', color: '#FF5A5F', short: 'Toxic' },
}
