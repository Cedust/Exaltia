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
  /** Storm and Arrow: same plan as naive, but Pyrelle stands in another Lane so Spark Rush can't pierce both. */
  'storm-split': {
    members: [
      {
        creature: 'basaltor',
        position: { lane: 1, row: 'front' },
        tactics: [{ condition: { type: 'always' }, skill: 'magma-slam', target: 'sameLane' }],
      },
      {
        creature: 'pyrelle',
        position: { lane: 2, row: 'back' },
        tactics: [{ condition: { type: 'always' }, skill: 'flame-burst', target: 'lowestLifeforce' }],
      },
    ],
  },
  /** The Winter Court: naive plus one Tactic that keeps both enemies Burning. */
  'winter-burn': {
    members: [
      {
        creature: 'basaltor',
        position: { lane: 1, row: 'front' },
        tactics: [{ condition: { type: 'always' }, skill: 'magma-slam', target: 'sameLane' }],
      },
      {
        creature: 'pyrelle',
        position: { lane: 1, row: 'back' },
        tactics: [
          { condition: { type: 'enemyWithoutStatus', status: 'burn' }, skill: 'kindle', target: 'lowestLifeforce' },
          { condition: { type: 'always' }, skill: 'flame-burst', target: 'lowestLifeforce' },
        ],
      },
    ],
  },
  /** The Winter Court: Spire Mender (not Weak to Ice) tanks and heals while Pyrelle burns and blasts. */
  'winter-sustain': {
    members: [
      {
        creature: 'spire-mender',
        position: { lane: 1, row: 'front' },
        tactics: [{ condition: { type: 'allyLifeforceBelow', percent: 75 }, skill: 'mend', target: 'lowestLifeforce' }],
      },
      {
        creature: 'pyrelle',
        position: { lane: 1, row: 'back' },
        tactics: [
          { condition: { type: 'enemyWithoutStatus', status: 'burn' }, skill: 'kindle', target: 'highestResonance' },
          { condition: { type: 'selfEssenceAtLeast', amount: 50 }, skill: 'inferno', target: 'lowestLifeforce' },
          { condition: { type: 'always' }, skill: 'flame-burst', target: 'lowestLifeforce' },
        ],
      },
    ],
  },
}
