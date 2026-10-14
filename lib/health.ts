/**
 * Shared rules for pet profiles and their health records.
 *
 * Every screen that writes a pet, a reminder or a weight goes through these,
 * so "what counts as a valid weight" or "what does overdue mean" has exactly
 * one answer in the app. The database enforces the same limits (see
 * supabase/schema.sql), so a crafted request cannot get round them either.
 */

import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'
import type { PetSpecies } from '@/lib/types'
import type { SpeciesKey } from '@/lib/nutrition'

/** Today's date in the user's own time zone, as yyyy-mm-dd. */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Whole calendar days from today to `iso`. Negative means it has passed. */
export function daysUntil(iso: string): number {
  const d = parseISO(iso)
  return isValid(d) ? differenceInCalendarDays(d, new Date()) : 0
}

/** "Today", "Tomorrow", "In 5 days", "Overdue by 2 days". */
export function describeDue(iso: string): string {
  const n = daysUntil(iso)
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n > 1) return n < 14 ? `In ${n} days` : format(parseISO(iso), 'd MMM yyyy')
  const late = -n
  return `Overdue by ${late} ${late === 1 ? 'day' : 'days'}`
}

/** "12 Mar 2026" for a yyyy-mm-dd value, or an em dash. */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = parseISO(iso)
  return isValid(d) ? format(d, 'd MMM yyyy') : '—'
}

/**
 * The heaviest a healthy adult of each species plausibly gets, with headroom.
 * Used to catch typos ("45" for a 4.5 kg cat) rather than to judge the pet.
 */
export const MAX_KG: Record<PetSpecies, number> = {
  dog: 120,
  cat: 15,
  rabbit: 10,
  bird: 2,
  fish: 50,
  reptile: 150,
  small: 5,
  other: 200,
}

export interface PetInput {
  name: string
  species: PetSpecies
  breed: string
  age: string
  /** Raw text from the form; blank means "not known". */
  weight: string
}

/** Returns a human-readable problem, or null when the input is acceptable. */
export function validatePet(input: PetInput): string | null {
  const name = input.name.trim()
  if (!name) return 'Give your pet a name.'
  if (name.length > 40) return 'Keep the name under 40 characters.'
  if (input.breed.trim().length > 60) return 'Keep the breed under 60 characters.'
  if (input.age.trim().length > 30) return 'Keep the age short — for example “3 years”.'
  if (input.weight.trim() !== '') {
    const problem = validateWeight(input.weight, input.species)
    if (problem) return problem
  }
  return null
}

/** Validates a weight typed into a form for a pet of `species`. */
export function validateWeight(raw: string, species: PetSpecies): string | null {
  const kg = Number(raw)
  if (!Number.isFinite(kg) || kg <= 0) return 'Weight must be a number above zero.'
  const max = MAX_KG[species] ?? 200
  if (kg > max) {
    return `${kg} kg is more than any healthy ${species === 'other' || species === 'small' ? 'pet of this kind' : species} weighs — check the number (it is in kilograms).`
  }
  return null
}

/**
 * The nutrition planner covers six species. Fish and "other" have no
 * meaningful calorie formula, so they get no planner link rather than a
 * plan calculated for the wrong animal.
 */
export function plannerSpecies(species: PetSpecies): SpeciesKey | null {
  switch (species) {
    case 'dog': case 'cat': case 'rabbit': case 'bird': case 'reptile': case 'small':
      return species
    default:
      return null
  }
}

/** Link to the planner pre-filled with this pet's species and weight. */
export function plannerHref(species: PetSpecies, weight: number | null): string | null {
  const key = plannerSpecies(species)
  if (!key) return null
  const params = new URLSearchParams({ species: key })
  if (weight && weight > 0) params.set('weight', String(weight))
  return `/nutrition?${params}`
}
