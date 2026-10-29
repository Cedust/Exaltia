import type { Element } from '../core/types'
import type { Rarity } from '../game/vows'

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

/** Glow colors behind creature art, per element. */
export const ELEMENT_GLOW: Record<Element, string> = {
  fire: 'rgba(240, 122, 58, 0.45)',
  ice: 'rgba(95, 155, 255, 0.45)',
  thunder: 'rgba(246, 208, 77, 0.42)',
  water: 'rgba(54, 201, 184, 0.42)',
  earth: 'rgba(93, 187, 114, 0.42)',
  wind: 'rgba(212, 241, 238, 0.35)',
  radiance: 'rgba(251, 231, 168, 0.45)',
  umbra: 'rgba(160, 138, 240, 0.45)',
  physical: 'rgba(185, 182, 196, 0.3)',
}

export const ELEMENT_HEX: Record<Element, string> = {
  fire: '#f07a3a',
  ice: '#5f9bff',
  thunder: '#f6d04d',
  water: '#36c9b8',
  earth: '#5dbb72',
  wind: '#d4f1ee',
  radiance: '#fbe7a8',
  umbra: '#a08af0',
  physical: '#b9b6c4',
}

export const artUrl = (creatureId: string) => `art/creatures/${creatureId}.webp`
export const characterUrl = (id: string) => `art/characters/${id}.webp`
export const backdropUrl = (id: string) => `art/backdrops/${id}.webp`

/** Vow card colours by rarity. */
export const RARITY_STYLE: Record<Rarity, { label: string; color: string; ring: string }> = {
  common: { label: 'Common', color: 'text-[#d3d8e2]', ring: 'border-[#9aa3b5]/50' },
  rare: { label: 'Rare', color: 'text-[#a9c4ff]', ring: 'border-[#7d9cff]/70 shadow-[0_0_18px_rgba(125,156,255,0.25)]' },
  exalted: { label: 'Exalted', color: 'text-gold-bright', ring: 'border-gold shadow-[0_0_26px_rgba(230,196,122,0.45)]' },
}
