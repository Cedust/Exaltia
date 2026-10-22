import type { CreatureDef } from '../core/types'

// Placeholder stats for Spike 1; balanced later with the simulator.
const list: CreatureDef[] = [
  {
    id: 'basaltor', name: 'Basaltor', kind: 'paragon', element: 'fire', role: 'Front Guardian',
    stats: { lifeforce: 720, might: 62, resonance: 30, guard: 70, ward: 45, swiftness: 38, essence: 60 },
    skills: ['magma-slam', 'searing-sweep', 'ember-renewal'], basicAttack: 'basic-attack',
  },
  {
    id: 'pyrelle', name: 'Pyrelle', kind: 'paragon', element: 'fire', role: 'Back Caster',
    stats: { lifeforce: 420, might: 28, resonance: 78, guard: 30, ward: 60, swiftness: 52, essence: 80 },
    skills: ['flame-burst', 'kindle', 'inferno'], basicAttack: 'basic-attack',
  },
  {
    id: 'spire-golem', name: 'Spire Golem', kind: 'acolyte', element: 'physical', role: 'Guardian',
    stats: { lifeforce: 650, might: 55, resonance: 20, guard: 65, ward: 40, swiftness: 30, essence: 50 },
    skills: ['stone-fist', 'quake'], basicAttack: 'basic-attack',
  },
  {
    id: 'spire-mender', name: 'Spire Mender', kind: 'acolyte', element: 'physical', role: 'Healer',
    stats: { lifeforce: 400, might: 25, resonance: 60, guard: 35, ward: 55, swiftness: 45, essence: 70 },
    skills: ['mend', 'lantern-glow'], basicAttack: 'basic-attack',
  },
  {
    id: 'frostguard', name: 'Frostguard', kind: 'acolyte', element: 'ice', role: 'Guardian',
    stats: { lifeforce: 600, might: 50, resonance: 25, guard: 60, ward: 45, swiftness: 32, essence: 50 },
    skills: ['ice-bash'], basicAttack: 'basic-attack',
  },
  {
    id: 'rime-mystic', name: 'Rime Mystic', kind: 'acolyte', element: 'ice', role: 'Caster',
    stats: { lifeforce: 380, might: 22, resonance: 62, guard: 28, ward: 50, swiftness: 44, essence: 70 },
    skills: ['frost-bolt', 'hail'], basicAttack: 'basic-attack',
  },
  {
    id: 'spark-monk', name: 'Spark Monk', kind: 'acolyte', element: 'thunder', role: 'Striker',
    stats: { lifeforce: 480, might: 66, resonance: 30, guard: 40, ward: 35, swiftness: 62, essence: 50 },
    skills: ['thunder-palm', 'spark-rush'], basicAttack: 'basic-attack',
  },
  {
    id: 'relic-archer', name: 'Relic Archer', kind: 'acolyte', element: 'physical', role: 'Archer',
    stats: { lifeforce: 380, might: 60, resonance: 20, guard: 30, ward: 35, swiftness: 50, essence: 60 },
    skills: ['piercing-shot', 'snipe'], basicAttack: 'basic-attack',
  },
  {
    id: 'kyrael', name: 'Kyrael', kind: 'paragon', element: 'ice', role: 'Front Striker',
    stats: { lifeforce: 640, might: 82, resonance: 35, guard: 50, ward: 45, swiftness: 66, essence: 60 },
    skills: ['frost-fang', 'glacial-pounce', 'rending-claws'], basicAttack: 'basic-attack',
  },
  {
    id: 'nivaris', name: 'Nivaris', kind: 'paragon', element: 'ice', role: 'Back Support',
    stats: { lifeforce: 460, might: 25, resonance: 72, guard: 35, ward: 65, swiftness: 48, essence: 80 },
    skills: ['winter-mend', 'hoarfrost', 'blizzard'], basicAttack: 'basic-attack',
  },
]

export const CREATURES: Record<string, CreatureDef> = Object.fromEntries(list.map((c) => [c.id, c]))

/** Creatures the player can pick in Spike 1. */
export const PLAYER_POOL = ['basaltor', 'pyrelle', 'spire-golem', 'spire-mender']
