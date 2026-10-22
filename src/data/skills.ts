import type { SkillDef } from '../core/types'

// Placeholder numbers for Spike 1; balanced later with the simulator.
const list: SkillDef[] = [
  { id: 'basic-attack', name: 'Basic Attack', element: 'physical', effect: 'damage', stat: 'might', power: 1, cost: 0, pattern: 'single' },

  // Basaltor
  { id: 'magma-slam', name: 'Magma Slam', element: 'fire', effect: 'damage', stat: 'might', power: 1.4, cost: 15, pattern: 'single' },
  {
    id: 'searing-sweep', name: 'Searing Sweep', element: 'fire', effect: 'damage', stat: 'might', power: 0.8, cost: 25, pattern: 'sweep',
    inflicts: { status: 'burn', chance: 0.5, turns: 3 },
  },
  { id: 'ember-renewal', name: 'Ember Renewal', element: 'fire', effect: 'heal', stat: 'resonance', power: 3, cost: 25, pattern: 'single' },

  // Pyrelle
  { id: 'flame-burst', name: 'Flame Burst', element: 'fire', effect: 'damage', stat: 'resonance', power: 1.5, cost: 15, pattern: 'single' },
  {
    id: 'kindle', name: 'Kindle', element: 'fire', effect: 'damage', stat: 'resonance', power: 0.6, cost: 10, pattern: 'single',
    ignoresProtection: true, inflicts: { status: 'burn', chance: 1, turns: 3 },
  },
  { id: 'inferno', name: 'Inferno', element: 'fire', effect: 'damage', stat: 'resonance', power: 0.8, cost: 35, pattern: 'all' },

  // Spire Golem
  { id: 'stone-fist', name: 'Stone Fist', element: 'physical', effect: 'damage', stat: 'might', power: 1.3, cost: 10, pattern: 'single' },
  { id: 'quake', name: 'Quake', element: 'physical', effect: 'damage', stat: 'might', power: 0.8, cost: 20, pattern: 'sweep' },

  // Spire Mender
  { id: 'mend', name: 'Mend', element: 'physical', effect: 'heal', stat: 'resonance', power: 1.8, cost: 10, pattern: 'single' },
  { id: 'lantern-glow', name: 'Lantern Glow', element: 'physical', effect: 'heal', stat: 'resonance', power: 1, cost: 25, pattern: 'all' },

  // Frostguard
  { id: 'ice-bash', name: 'Ice Bash', element: 'ice', effect: 'damage', stat: 'might', power: 1.2, cost: 10, pattern: 'single' },

  // Rime Mystic
  { id: 'frost-bolt', name: 'Frost Bolt', element: 'ice', effect: 'damage', stat: 'resonance', power: 1.4, cost: 15, pattern: 'single' },
  { id: 'hail', name: 'Hail', element: 'ice', effect: 'damage', stat: 'resonance', power: 0.8, cost: 20, pattern: 'sweep' },

  // Spark Monk
  { id: 'thunder-palm', name: 'Thunder Palm', element: 'thunder', effect: 'damage', stat: 'might', power: 1.3, cost: 10, pattern: 'single' },
  { id: 'spark-rush', name: 'Spark Rush', element: 'thunder', effect: 'damage', stat: 'might', power: 0.9, cost: 20, pattern: 'pierce' },

  // Relic Archer
  { id: 'piercing-shot', name: 'Piercing Shot', element: 'physical', effect: 'damage', stat: 'might', power: 1, cost: 15, pattern: 'pierce' },
  { id: 'snipe', name: 'Snipe', element: 'physical', effect: 'damage', stat: 'might', power: 1.2, cost: 20, pattern: 'single', ignoresProtection: true },

  // Kyrael
  { id: 'frost-fang', name: 'Frost Fang', element: 'ice', effect: 'damage', stat: 'might', power: 1.6, cost: 15, pattern: 'single' },
  {
    id: 'glacial-pounce', name: 'Glacial Pounce', element: 'ice', effect: 'damage', stat: 'might', power: 1.3, cost: 25, pattern: 'single',
    ignoresProtection: true,
  },
  { id: 'rending-claws', name: 'Rending Claws', element: 'ice', effect: 'damage', stat: 'might', power: 0.9, cost: 20, pattern: 'sweep' },

  // Nivaris
  { id: 'winter-mend', name: 'Winter Mend', element: 'ice', effect: 'heal', stat: 'resonance', power: 2, cost: 15, pattern: 'single' },
  { id: 'hoarfrost', name: 'Hoarfrost', element: 'ice', effect: 'damage', stat: 'resonance', power: 1.3, cost: 15, pattern: 'single' },
  { id: 'blizzard', name: 'Blizzard', element: 'ice', effect: 'damage', stat: 'resonance', power: 0.7, cost: 30, pattern: 'all' },
]

export const SKILLS: Record<string, SkillDef> = Object.fromEntries(list.map((s) => [s.id, s]))
