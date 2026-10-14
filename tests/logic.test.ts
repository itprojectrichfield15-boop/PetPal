import { computePlan, SPECIES_CFG } from '../lib/nutrition.ts'
import { lookupFood, FOOD_DB } from '../lib/food-safety.ts'
import { validatePet, validateWeight, describeDue, plannerHref, todayISO } from '../lib/health.ts'

let pass = 0, fail = 0
function ok(cond: boolean, name: string, extra: unknown = '') {
  if (cond) { pass++; console.log('  PASS', name) } else { fail++; console.log('  FAIL', name, extra) }
}

console.log('nutrition')
const biscuit = computePlan({ species: 'dog', weightKg: 12.4, activity: 1.6, lifeStage: 'adult' })
ok(biscuit.mer === 740, "12.4 kg adult beagle = 740 kcal (hero chip now computed from this)", biscuit.mer)
ok(biscuit.meals === 2, 'adult dog gets 2 meals')
const adult = computePlan({ species: 'dog', weightKg: 20, activity: 1.6, lifeStage: 'adult' })
const senior = computePlan({ species: 'dog', weightKg: 20, activity: 1.6, lifeStage: 'senior' })
const puppy = computePlan({ species: 'dog', weightKg: 20, activity: 1.6, lifeStage: 'young' })
ok(senior.mer < adult.mer, 'senior needs less than adult', [senior.mer, adult.mer])
ok(puppy.mer > adult.mer, 'puppy needs more than adult')
const bcs = [1, 2, 3, 4, 5].map(b => computePlan({ species: 'cat', weightKg: 4.5, activity: 1.3, lifeStage: 'adult', bodyCondition: b }).mer)
ok(bcs.every((v, i) => i === 0 || v < bcs[i - 1]), 'each body-condition step lowers the target', bcs)
ok(computePlan({ species: 'cat', weightKg: 4, activity: 1.6, lifeStage: 'young' }).meals === 4, 'kitten gets 4 meals')
ok(computePlan({ species: 'reptile', weightKg: 1, activity: 1.3, lifeStage: 'adult' }).meals === 1, 'reptile gets 1 meal, not 2')
for (const bad of [NaN, -5, 0, 1e9, Infinity]) {
  const p = computePlan({ species: 'dog', weightKg: bad, activity: 1.6, lifeStage: 'adult' })
  ok(Number.isFinite(p.mer) && p.mer > 0 && p.dryGrams > 0, `weight ${bad} still gives a finite, positive plan`, p)
}
const sum = (p: ReturnType<typeof computePlan>) => p.gramsPerMeal * p.meals
ok(Math.abs(sum(biscuit) - biscuit.dryGrams) <= biscuit.meals, 'meals × grams-per-meal ≈ daily grams')
for (const k of Object.keys(SPECIES_CFG) as (keyof typeof SPECIES_CFG)[]) {
  const c = SPECIES_CFG[k]
  ok(c.defaultKg > 0 && c.defaultKg <= c.maxKg, `${k}: default weight is inside its range`)
}

console.log('\nfood safety')
const v = (q: string) => { const r = lookupFood(q); return r.status === 'found' ? r.entry.level : r.status }
ok(v('chicken') === 'safe', 'chicken is safe')
ok(v('chicken bone') === 'toxic', 'chicken bone is toxic')
ok(v('my dog ate a chicken bone') === 'toxic', 'phrase inside a sentence')
ok(v('peanut butter') === 'caution', 'peanut butter is caution')
ok(v('xylitol free peanut butter') === 'caution', 'xylitol-free peanut butter agrees with plain peanut butter')
ok(v('xylitol') === 'toxic', 'xylitol is toxic')
ok(v('grapes') === 'toxic' && v('Grapes!') === 'toxic', 'plurals and punctuation')
ok(v('my dog ate a weed') !== 'toxic', '"a weed" is no longer a cannabis emergency', v('my dog ate a weed'))
ok(v('cannabis') === 'toxic', 'cannabis still toxic')
ok(v('plain yoghurt') === 'safe' && v('yoghurt') === 'caution', 'plain yoghurt safe, generic dairy caution')
ok(v('spaceship') === 'unknown', 'unknown items are not guessed')
ok(v('a') === 'empty', 'one letter is not a search')
// Every alias must resolve to its own entry (no alias shadowed by another entry).
const shadowed: string[] = []
for (const e of FOOD_DB) for (const n of e.names) {
  const r = lookupFood(n)
  if (r.status !== 'found' || r.entry.level !== e.level) shadowed.push(`${n} -> ${r.status === 'found' ? r.entry.names[0] : r.status}`)
}
ok(shadowed.length === 0, 'every alias resolves to a verdict that agrees with its own entry', shadowed)
const seen = new Map<string, string>()
const dupes: string[] = []
for (const e of FOOD_DB) for (const n of e.names) {
  const k = n.toLowerCase()
  if (seen.has(k) && seen.get(k) !== e.names[0]) dupes.push(k)
  seen.set(k, e.names[0])
}
ok(dupes.length === 0, 'no alias appears in two entries', dupes)

console.log('\nhealth helpers')
ok(validatePet({ name: '  ', species: 'dog', breed: '', age: '', weight: '' }) !== null, 'blank name rejected')
ok(validatePet({ name: 'Luna', species: 'cat', breed: '', age: '', weight: '45' }) !== null, '45 kg cat rejected as a likely typo')
ok(validatePet({ name: 'Luna', species: 'cat', breed: '', age: '', weight: '4.5' }) === null, '4.5 kg cat accepted')
ok(validatePet({ name: 'Rex', species: 'dog', breed: '', age: '', weight: '' }) === null, 'weight is optional')
ok(validateWeight('-1', 'dog') !== null && validateWeight('abc', 'dog') !== null, 'negative / non-numeric weight rejected')
ok(describeDue(todayISO()) === 'Today', 'due today reads "Today"')
const d = new Date(); d.setDate(d.getDate() - 3)
const past = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
ok(describeDue(past) === 'Overdue by 3 days', 'three days ago reads overdue', describeDue(past))
ok(plannerHref('fish', 2) === null, 'no planner link for fish')
ok(plannerHref('dog', 12.4) === '/nutrition?species=dog&weight=12.4', 'planner link carries species and weight')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
