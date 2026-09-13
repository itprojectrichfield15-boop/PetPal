/**
 * PetPal domain types.
 *
 * This file previously held the type definitions of the unrelated workplace app
 * this project was forked from (toxicity reports, burnout assessments) and was
 * imported by nothing. These are the shapes the app actually stores.
 */

/** Species a pet profile can be created for. Mirrors the `pets.species` column. */
export type PetSpecies =
  | 'dog' | 'cat' | 'bird' | 'rabbit'
  | 'fish' | 'reptile' | 'small' | 'other'

export type PetSex = 'male' | 'female' | 'unknown'

/** A row of the `pets` table. */
export interface Pet {
  id: string
  owner_id: string | null
  name: string
  species: PetSpecies
  breed: string | null
  /** Free text ("3 years", "8 months") — owners rarely know an exact date. */
  age: string | null
  weight: number | null
  sex: PetSex
  photo_url: string | null
  created_at: string
}

/** The two kinds of account, plus the administrator. */
export type UserRole = 'user' | 'vet' | 'admin'

/** A row of the `profiles` table. */

export interface UserProfile {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
}

/**
 * A veterinary professional — PetPal's second user type.
 *
 * `verified` is set by an administrator after checking the registration number
 * against the professional register. Only verified vets can post answers, and
 * that is enforced by a row-level security policy rather than by the UI, so a
 * crafted request cannot publish clinical advice under a vet badge.
 */
export interface VetProfile {
  id: string
  full_name: string
  practice_name: string | null
  city: string | null
  country: string | null
  registration_no: string | null
  specialities: string | null
  bio: string | null
  verified: boolean
  created_at: string
}

/** A question posted by an owner on Ask a Vet. */
export interface Question {
  id: string
  asker_id: string | null
  title: string
  body: string
  species: PetSpecies
  resolved: boolean
  answer_count: number
  created_at: string
}

/** A verified vet's reply to a question. */
export interface Answer {
  id: string
  question_id: string
  vet_id: string | null
  body: string
  created_at: string
  /** Joined in for display. */
  vet?: Pick<VetProfile, 'full_name' | 'practice_name' | 'verified' | 'specialities'> | null
}

/** Mood tag on a community post. */
export type PostMood = 'happy' | 'proud' | 'help' | 'sad'

/**
 * A row of the `confessions` table (the community wall).
 * The table name is a leftover from the original project; the migration that
 * renames it is tracked separately so live data isn't dropped.
 */
export interface WallPost {
  id: string
  text: string
  mood: PostMood
  hearts: number
  created_at: string
}

/** A veterinary practice shown in the directory and on the finder map. */
export interface VetPractice {
  id: string | number
  name: string
  city: string | null
  lat: number
  lng: number
  rating: number | null
  /** True when the practice runs a 24-hour emergency service. */
  emergency: boolean
  open: boolean
  phone: string | null
  distanceKm?: number
}

/** Display labels for each species, used across the pet screens. */
export const SPECIES_LABELS: Record<PetSpecies, string> = {
  dog: 'Dog',
  cat: 'Cat',
  bird: 'Bird',
  rabbit: 'Rabbit',
  fish: 'Fish',
  reptile: 'Reptile',
  small: 'Small pet',
  other: 'Other',
}

/** Narrow an arbitrary string from the database to a known species. */
export function toSpecies(value: unknown): PetSpecies {
  return typeof value === 'string' && value in SPECIES_LABELS
    ? (value as PetSpecies)
    : 'other'
}
