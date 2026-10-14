import { Dog, Cat, Bird, Rabbit, Fish, Turtle, Rat, Snail, PawPrint, type LucideIcon } from 'lucide-react'
import type { PetSpecies } from '@/lib/types'

/**
 * One icon per species, shared by every screen that draws a pet.
 *
 * 'invert' is a legacy value written by an older build of the add-pet form;
 * it stays here so those rows still render an icon.
 */
export const SPECIES_ICONS: Record<PetSpecies | 'invert', LucideIcon> = {
  dog: Dog, cat: Cat, bird: Bird, rabbit: Rabbit, fish: Fish,
  reptile: Turtle, small: Rat, other: PawPrint, invert: Snail,
}

export function speciesIcon(species: string): LucideIcon {
  return SPECIES_ICONS[species as PetSpecies] ?? PawPrint
}
