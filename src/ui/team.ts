import type { Content, CreatureDef, Position, Tactic, Team } from '../core/types'

/** Spike 1 battles are 2v2. */
export const MAX_MEMBERS = 2

export const samePosition = (a: Position, b: Position) => a.lane === b.lane && a.row === b.row

export function defaultTactics(creature: CreatureDef, content: Content): Tactic[] {
  const skill = content.skills[creature.skills[0]]
  if (skill.effect === 'heal') {
    return [{ condition: { type: 'allyLifeforceBelow', percent: 50 }, skill: skill.id, target: 'lowestLifeforce' }]
  }
  return [{ condition: { type: 'always' }, skill: skill.id, target: 'sameLane' }]
}

/**
 * Puts a creature on a cell. A creature already in the team moves (swapping with whoever stands there);
 * a new one replaces the occupant, or joins if there is room.
 */
export function placeCreature(team: Team, creature: CreatureDef, position: Position, content: Content): Team {
  const members = team.members
  const current = members.find((m) => m.creature === creature.id)
  const occupant = members.find((m) => samePosition(m.position, position))
  if (current) {
    return {
      members: members.map((m) =>
        m === current ? { ...m, position } : m === occupant ? { ...m, position: current.position } : m,
      ),
    }
  }
  const joining = { creature: creature.id, position, tactics: defaultTactics(creature, content) }
  if (occupant) return { members: members.map((m) => (m === occupant ? joining : m)) }
  if (members.length >= MAX_MEMBERS) return team
  return { members: [...members, joining] }
}

export const removeCreature = (team: Team, creatureId: string): Team => ({
  members: team.members.filter((m) => m.creature !== creatureId),
})

export const setTactics = (team: Team, creatureId: string, tactics: Tactic[]): Team => ({
  members: team.members.map((m) => (m.creature === creatureId ? { ...m, tactics } : m)),
})

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
