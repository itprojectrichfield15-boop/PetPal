/**
 * The wellness check: its questions and how a set of answers is judged.
 *
 * Kept apart from the page so the scoring rules can be read, and tested, on
 * their own.
 *
 * `flag` marks an answer that on its own means "see a vet", whatever the
 * total. The score used to be a plain average, so a pet that was barely eating
 * AND lethargic could still come out as "Healthy" if everything else was fine —
 * the two answers that matter most were outvoted by coat shine and exercise.
 */

export interface WellnessOption { label: string; value: number; flag?: string }
export interface WellnessQuestion { q: string; area: string; opts: WellnessOption[] }

export const QUESTIONS: WellnessQuestion[] = [
  { q: 'How is your pet’s energy lately?', area: 'Energy', opts: [
    { label: 'Bright & playful', value: 3 }, { label: 'Normal', value: 2 }, { label: 'A bit flat', value: 1 },
    { label: 'Lethargic', value: 0, flag: 'Lethargy' }] },
  { q: 'How is their appetite?', area: 'Appetite', opts: [
    { label: 'Healthy & consistent', value: 3 }, { label: 'Okay', value: 2 }, { label: 'Picky', value: 1 },
    { label: 'Barely eating', value: 0, flag: 'Not eating' }] },
  // The old options ran from "ribs easy to feel" (ideal) to "can't feel them"
  // (overweight), so an underweight pet had no honest answer and was scored as
  // ideal. Both ends of the scale are now covered.
  { q: 'Body shape — run your hands along their ribs. What do you feel?', area: 'Body condition', opts: [
    { label: 'Ribs easy to feel under a thin layer, visible waist', value: 3 },
    { label: 'Ribs only with firm pressure, little waist', value: 1 },
    { label: 'Can’t feel the ribs at all', value: 0 },
    { label: 'Ribs, spine or hips stick out', value: 0, flag: 'Visibly underweight' }] },
  { q: 'Coat & skin condition?', area: 'Coat & skin', opts: [
    { label: 'Shiny & soft', value: 3 }, { label: 'Fine', value: 2 }, { label: 'Dull / shedding lots', value: 1 },
    { label: 'Bald patches / itchy', value: 0 }] },
  { q: 'Daily exercise / play?', area: 'Exercise', opts: [
    { label: 'Plenty', value: 3 }, { label: 'Some', value: 2 }, { label: 'Rarely', value: 1 }, { label: 'Almost none', value: 0 }] },
  { q: 'Vaccinations & vet checks up to date?', area: 'Preventive care', opts: [
    { label: 'All current', value: 3 }, { label: 'Mostly', value: 2 }, { label: 'Behind', value: 1 }, { label: 'Not sure', value: 0 }] },
  { q: 'Mood & behaviour?', area: 'Mood', opts: [
    { label: 'Happy & social', value: 3 }, { label: 'Normal', value: 2 }, { label: 'Withdrawn', value: 1 }, { label: 'Anxious / off', value: 0 }] },
  { q: 'Toilet habits?', area: 'Toilet habits', opts: [
    { label: 'Regular & normal', value: 3 }, { label: 'Mostly normal', value: 2 }, { label: 'Some changes', value: 1 },
    { label: 'Clearly abnormal', value: 0, flag: 'Abnormal toileting' }] },
]

export interface Verdict { label: string; color: string; msg: string }

export interface Assessment {
  /** 0–100. */
  score: number
  /** Red-flag answers, e.g. "Not eating". Any one of these means "See a vet". */
  flags: string[]
  /** Areas that scored 0 or 1 — what to actually look at. */
  weak: string[]
  verdict: Verdict
}

/** Judge a set of answers, given as the chosen option's index per question. */
export function assess(answers: Record<number, number>): Assessment {
  const chosen = QUESTIONS.map((qq, i) => (answers[i] === undefined ? null : qq.opts[answers[i]] ?? null))
  const total = chosen.reduce((sum, o) => sum + (o?.value ?? 0), 0)
  const score = Math.round((total / (QUESTIONS.length * 3)) * 100)
  const flags = chosen.flatMap(o => (o?.flag ? [o.flag] : []))
  const weak = QUESTIONS.filter((_, i) => chosen[i] !== null && chosen[i]!.value <= 1).map(qq => qq.area)

  const verdict: Verdict = flags.length > 0
    ? { label: 'See a vet', color: '#FF6B81', msg: `${flags.join(', ')} can be a sign of illness on its own — please book a vet visit, whatever the overall score.` }
    : score >= 80 ? { label: 'Thriving', color: '#FFAE6D', msg: 'Your pet is in great shape. Keep doing what you’re doing!' }
    : score >= 60 ? { label: 'Healthy', color: '#8E8BF5', msg: 'Mostly good — a couple of small things to keep an eye on.' }
    : score >= 40 ? { label: 'Needs attention', color: '#FFD98E', msg: 'Some signs worth addressing. Consider a vet check-up soon.' }
    : { label: 'See a vet', color: '#FF6B81', msg: 'Several concerns — please book a vet visit to be safe.' }

  return { score, flags, weak, verdict }
}
