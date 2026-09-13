/**
 * PetPal — feeding engine.
 *
 * Single source of truth for every calorie/portion number shown anywhere in the
 * app. The landing-page demo and the full planner previously carried their own
 * copies of this maths and had drifted apart, so the same pet could be quoted
 * two different daily calorie targets on two different screens. Everything now
 * calls `computePlan`.
 *
 * Maths follows the standard small-animal energy equations:
 *   RER (Resting Energy Requirement)     = 70 x bodyweight_kg ^ 0.75
 *   MER (Maintenance Energy Requirement) = RER x activity x lifeStage x species x bodyCondition
 *
 * These are planning guides, not prescriptions — medical/therapeutic diets are
 * always the treating vet's call. The UI states this wherever a number appears.
 */

export type SpeciesKey = 'dog' | 'cat' | 'rabbit' | 'bird' | 'reptile' | 'small'
export type LifeStage = 'young' | 'adult' | 'senior'

export interface SpeciesConfig {
  label: string
  /** Species metabolic multiplier applied on top of RER. */
  factor: number
  /** What a juvenile of this species is called. */
  youngLabel: string
  /** Plausible upper bound for a healthy pet, used to clamp input. */
  maxKg: number
  /** Sensible starting weight for the sliders. */
  defaultKg: number
  foodLabel: string
  /** kcal per gram of typical dry food for this species. */
  kcalPerGramDry: number
  /** ml of water per kg of bodyweight per day. */
  waterMlPerKg: number
  note: string
  macros: { axis: string; value: number }[]
}

export const SPECIES_CFG: Record<SpeciesKey, SpeciesConfig> = {
  dog: {
    label: 'Dog', factor: 1.0, youngLabel: 'Puppy', maxKg: 90, defaultKg: 12,
    foodLabel: 'Dry food', kcalPerGramDry: 3.5, waterMlPerKg: 55,
    note: 'Based on canine RER/MER energy formulas.',
    macros: [{ axis: 'Protein', value: 75 }, { axis: 'Fat', value: 60 }, { axis: 'Carbs', value: 50 }, { axis: 'Fibre', value: 55 }, { axis: 'Moisture', value: 60 }],
  },
  cat: {
    label: 'Cat', factor: 0.9, youngLabel: 'Kitten', maxKg: 12, defaultKg: 4.5,
    foodLabel: 'Dry food', kcalPerGramDry: 3.8, waterMlPerKg: 55,
    note: 'Cats are obligate carnivores — protein-rich diets only.',
    macros: [{ axis: 'Protein', value: 90 }, { axis: 'Fat', value: 70 }, { axis: 'Carbs', value: 25 }, { axis: 'Fibre', value: 40 }, { axis: 'Moisture', value: 80 }],
  },
  rabbit: {
    label: 'Rabbit', factor: 0.7, youngLabel: 'Kit', maxKg: 8, defaultKg: 2,
    foodLabel: 'Pellets', kcalPerGramDry: 2.6, waterMlPerKg: 100,
    note: 'Rabbits need unlimited hay first — pellets and greens are a small top-up.',
    macros: [{ axis: 'Protein', value: 40 }, { axis: 'Fat', value: 18 }, { axis: 'Carbs', value: 45 }, { axis: 'Fibre', value: 95 }, { axis: 'Moisture', value: 65 }],
  },
  bird: {
    label: 'Bird', factor: 1.3, youngLabel: 'Chick', maxKg: 2, defaultKg: 0.4,
    foodLabel: 'Seed / pellets', kcalPerGramDry: 3.4, waterMlPerKg: 50,
    note: 'Birds have fast metabolisms — fresh pellets, seed and veg daily.',
    macros: [{ axis: 'Protein', value: 65 }, { axis: 'Fat', value: 45 }, { axis: 'Carbs', value: 70 }, { axis: 'Fibre', value: 50 }, { axis: 'Moisture', value: 55 }],
  },
  reptile: {
    label: 'Reptile', factor: 0.35, youngLabel: 'Juvenile', maxKg: 15, defaultKg: 1,
    foodLabel: 'Food', kcalPerGramDry: 1.8, waterMlPerKg: 20,
    note: 'Reptiles are ectotherms — feeding frequency varies hugely by species.',
    macros: [{ axis: 'Protein', value: 70 }, { axis: 'Fat', value: 40 }, { axis: 'Carbs', value: 35 }, { axis: 'Fibre', value: 60 }, { axis: 'Moisture', value: 70 }],
  },
  small: {
    label: 'Small pet', factor: 1.1, youngLabel: 'Young', maxKg: 3, defaultKg: 0.8,
    foodLabel: 'Pellets / mix', kcalPerGramDry: 3.0, waterMlPerKg: 100,
    note: 'Hamsters, rats and guinea pigs — small frequent portions plus fresh veg.',
    macros: [{ axis: 'Protein', value: 60 }, { axis: 'Fat', value: 40 }, { axis: 'Carbs', value: 65 }, { axis: 'Fibre', value: 70 }, { axis: 'Moisture', value: 55 }],
  },
}

/** Activity multipliers offered in the UI. */
export const ACTIVITY_LEVELS = [
  { label: 'Low', value: 1.3, hint: 'Mostly indoors, short walks' },
  { label: 'Normal', value: 1.6, hint: 'Daily walks and play' },
  { label: 'High', value: 2.0, hint: 'Working, sporting or very active' },
] as const

/** Body-condition score, 1 (very thin) to 5 (obese). 3 is ideal. */
export const BODY_CONDITIONS = [
  { score: 1, label: 'Very thin' },
  { score: 2, label: 'Lean' },
  { score: 3, label: 'Ideal' },
  { score: 4, label: 'Overweight' },
  { score: 5, label: 'Obese' },
] as const

export interface PlanInput {
  species: SpeciesKey
  /** Bodyweight in kilograms. */
  weightKg: number
  /** Activity multiplier — see ACTIVITY_LEVELS. */
  activity: number
  lifeStage: LifeStage
  /** Body-condition score 1..5. Defaults to 3 (ideal). */
  bodyCondition?: number
}

export interface FeedingPlan {
  /** Resting energy requirement, kcal/day. */
  rer: number
  /** Maintenance energy requirement, kcal/day — the headline number. */
  mer: number
  /** Grams of dry food per day. */
  dryGrams: number
  /** Grams of wet food per day, if feeding wet only. */
  wetGrams: number
  /** Approximate US cups of dry food per day. */
  cups: number
  /** Meals per day appropriate to the life stage. */
  meals: number
  /** Grams of dry food in each meal. */
  gramsPerMeal: number
  /** Target daily water intake in ml. */
  waterMl: number
  /** True when inputs had to be clamped to a sane range. */
  clamped: boolean
}

/** Average grams of dry kibble in one standard US cup. */
const GRAMS_PER_CUP = 110
/** kcal per gram of typical wet food (roughly 80% moisture). */
const KCAL_PER_GRAM_WET = 1.2

const LIFE_STAGE_FACTOR: Record<LifeStage, number> = {
  young: 2.0,
  adult: 1.0,
  senior: 1.1,
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/**
 * Turn a pet's details into a feeding plan.
 *
 * Every input is clamped before use, so a blank, negative, absurd or NaN
 * weight can never produce `NaN kcal`, `Infinity g` or a negative portion on
 * screen — it produces the nearest sensible plan and reports `clamped: true`
 * so the UI can say the value was adjusted.
 */
export function computePlan(input: PlanInput): FeedingPlan {
  const cfg = SPECIES_CFG[input.species] ?? SPECIES_CFG.dog

  const rawWeight = Number(input.weightKg)
  const safeWeight = Number.isFinite(rawWeight) ? rawWeight : cfg.defaultKg
  const weight = clamp(safeWeight, 0.05, cfg.maxKg)

  const rawActivity = Number(input.activity)
  const activity = clamp(Number.isFinite(rawActivity) ? rawActivity : 1.6, 1.0, 2.5)

  const rawBc = input.bodyCondition === undefined ? 3 : Number(input.bodyCondition)
  const bodyCondition = clamp(Number.isFinite(rawBc) ? rawBc : 3, 1, 5)

  const clamped =
    !Number.isFinite(rawWeight) || rawWeight !== weight ||
    !Number.isFinite(rawActivity) || rawActivity !== activity

  // Overweight pets are fed to a slightly reduced target, underweight to a
  // slightly raised one, so the plan moves them toward an ideal condition.
  const bcFactor = bodyCondition >= 4 ? 0.85 : bodyCondition <= 2 ? 1.15 : 1.0
  const stageFactor = LIFE_STAGE_FACTOR[input.lifeStage] ?? 1.0

  const rer = 70 * Math.pow(weight, 0.75)
  const mer = Math.max(1, Math.round(rer * activity * stageFactor * cfg.factor * bcFactor))

  const dryGrams = Math.max(1, Math.round(mer / cfg.kcalPerGramDry))
  const wetGrams = Math.max(1, Math.round(mer / KCAL_PER_GRAM_WET))
  const meals = input.lifeStage === 'young' ? 3 : 2

  return {
    rer: Math.round(rer),
    mer,
    dryGrams,
    wetGrams,
    cups: Math.round((dryGrams / GRAMS_PER_CUP) * 10) / 10,
    meals,
    gramsPerMeal: Math.max(1, Math.round(dryGrams / meals)),
    waterMl: Math.round(weight * cfg.waterMlPerKg),
    clamped,
  }
}

/** Label for the juvenile life stage of a given species ("Puppy", "Kitten"...). */
export function youngLabelFor(species: SpeciesKey) {
  return (SPECIES_CFG[species] ?? SPECIES_CFG.dog).youngLabel
}
