import type { Element } from '../core/types'

export const ELEMENT_TEXT: Record<Element, string> = {
  fire: 'text-fire',
  ice: 'text-ice',
  thunder: 'text-thunder',
  water: 'text-water',
  earth: 'text-earth',
  wind: 'text-wind',
  radiance: 'text-radiance',
  umbra: 'text-umbra',
  physical: 'text-physical',
}

export const artUrl = (creatureId: string) => `art/creatures/${creatureId}.webp`

export const button =
  'rounded border border-white/20 px-3 py-1.5 text-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40'
export const primaryButton = `${button} border-fire/70 bg-fire/25 font-semibold hover:bg-fire/40`
export const field = 'rounded border border-white/20 bg-black/40 px-2 py-1 text-sm'
