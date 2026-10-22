import { describe, expect, it } from 'vitest'
import type { Team } from '../core/types'
import { CONTENT } from '../data'
import { MAX_MEMBERS, defaultTactics, moveItem, placeCreature, removeCreature } from './team'

const { basaltor, pyrelle, 'spire-mender': mender } = CONTENT.creatures
const empty: Team = { members: [] }

describe('team editing', () => {
  it('adds creatures until the team is full', () => {
    let team = placeCreature(empty, basaltor, { lane: 1, row: 'front' }, CONTENT)
    team = placeCreature(team, pyrelle, { lane: 1, row: 'back' }, CONTENT)
    expect(team.members).toHaveLength(MAX_MEMBERS)
    expect(placeCreature(team, mender, { lane: 0, row: 'back' }, CONTENT)).toBe(team)
  })

  it('moves a creature that is already placed and swaps with the occupant', () => {
    let team = placeCreature(empty, basaltor, { lane: 1, row: 'front' }, CONTENT)
    team = placeCreature(team, pyrelle, { lane: 1, row: 'back' }, CONTENT)
    team = placeCreature(team, basaltor, { lane: 1, row: 'back' }, CONTENT)
    expect(team.members.find((m) => m.creature === 'basaltor')!.position).toEqual({ lane: 1, row: 'back' })
    expect(team.members.find((m) => m.creature === 'pyrelle')!.position).toEqual({ lane: 1, row: 'front' })
  })

  it('replaces the occupant when a new creature is placed on a taken cell', () => {
    let team = placeCreature(empty, basaltor, { lane: 1, row: 'front' }, CONTENT)
    team = placeCreature(team, mender, { lane: 1, row: 'front' }, CONTENT)
    expect(team.members.map((m) => m.creature)).toEqual(['spire-mender'])
  })

  it('gives healers a heal Tactic by default', () => {
    expect(defaultTactics(mender, CONTENT)[0]).toMatchObject({ skill: 'mend', target: 'lowestLifeforce' })
  })

  it('removes creatures and reorders lists', () => {
    const team = placeCreature(empty, basaltor, { lane: 1, row: 'front' }, CONTENT)
    expect(removeCreature(team, 'basaltor').members).toEqual([])
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
  })
})
