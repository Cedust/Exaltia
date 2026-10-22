import type { Team } from '../core/types'

/** Ready-made player setups for the simulator and as UI defaults. */
export const PRESETS: Record<string, Team> = {
  /** Fire duo, every Tactic is "Always → strongest skill". */
  naive: {
    members: [
      {
        creature: 'basaltor',
        position: { lane: 1, row: 'front' },
        tactics: [{ condition: { type: 'always' }, skill: 'magma-slam', target: 'sameLane' }],
      },
      {
        creature: 'pyrelle',
        position: { lane: 1, row: 'back' },
        tactics: [{ condition: { type: 'always' }, skill: 'flame-burst', target: 'lowestLifeforce' }],
      },
    ],
  },
  /** Golem in front, Mender keeping it alive. */
  'golem-mender': {
    members: [
      {
        creature: 'spire-golem',
        position: { lane: 1, row: 'front' },
        tactics: [
          { condition: { type: 'enemiesAtLeast', count: 2 }, skill: 'quake', target: 'lowestLifeforce' },
          { condition: { type: 'always' }, skill: 'stone-fist', target: 'lowestLifeforce' },
        ],
      },
      {
        creature: 'spire-mender',
        position: { lane: 1, row: 'back' },
        tactics: [
          { condition: { type: 'allyLifeforceBelow', percent: 40 }, skill: 'lantern-glow', target: 'lowestLifeforce' },
          { condition: { type: 'allyLifeforceBelow', percent: 70 }, skill: 'mend', target: 'lowestLifeforce' },
        ],
      },
    ],
  },
}
