import { assess, QUESTIONS } from '../lib/wellness.ts'
let pass = 0, fail = 0
const ok = (c: boolean, n: string, x: unknown = '') => { if (c) { pass++; console.log('  PASS', n) } else { fail++; console.log('  FAIL', n, x) } }
const best = Object.fromEntries(QUESTIONS.map((_, i) => [i, 0]))
ok(assess(best).verdict.label === 'Thriving' && assess(best).score === 100, 'all best answers: Thriving 100')
const notEating = { ...best, 1: 3 }
const r = assess(notEating)
ok(r.score === 88 && r.verdict.label === 'See a vet', 'perfect except "Barely eating": 88 but See a vet (was Thriving)', r)
ok(r.weak.includes('Appetite'), 'appetite listed as worth looking at')
const thin = { ...best, 2: 3 }
ok(assess(thin).verdict.label === 'See a vet', 'visibly underweight is flagged (old quiz scored it as ideal)')
const unsure = { ...best, 5: 3 }
ok(assess(unsure).verdict.label === 'Thriving', 'unsure about vaccines alone does not trigger See a vet')
const worst = Object.fromEntries(QUESTIONS.map((q, i) => [i, q.opts.length - 1]))
ok(assess(worst).verdict.label === 'See a vet' && assess(worst).score === 0, 'all worst: See a vet 0')
console.log(`${pass} passed, ${fail} failed`)
