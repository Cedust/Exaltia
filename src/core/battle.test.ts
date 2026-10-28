import { describe, expect, it } from 'vitest'
import { runBattle } from './battle'
import { formatBattleLog } from './log'
import { RULES } from './rules'
import { STATUS_NUMBERS } from './statuses'
import type { BattleEvent, Content, CreatureDef, SkillDef, Stats, Team, TeamMember } from './types'

const stats = (overrides: Partial<Stats> = {}): Stats => ({
  lifeforce: 500, might: 50, resonance: 50, guard: 50, ward: 50, swiftness: 50, essence: 60, ...overrides,
})

const skill = (id: string, overrides: Partial<SkillDef> = {}): SkillDef => ({
  id, name: id, element: 'physical', effect: 'damage', stat: 'might', power: 1, cost: 0, pattern: 'single', ...overrides,
})

const creature = (id: string, overrides: Partial<CreatureDef> = {}): CreatureDef => ({
  id, name: id, kind: 'acolyte', element: 'physical', role: 'Test', stats: stats(),
  skills: ['strike', 'big', 'fireball', 'snipe', 'pierce', 'sweep', 'heal', 'ignite'], basicAttack: 'basic', ...overrides,
})

const content = (...creatures: CreatureDef[]): Content => ({
  creatures: Object.fromEntries(creatures.map((c) => [c.id, c])),
  skills: Object.fromEntries(
    [
      skill('basic'),
      skill('strike', { power: 1.5, cost: 10 }),
      skill('big', { power: 2, cost: 15 }),
      skill('fireball', { element: 'fire', stat: 'resonance', power: 1.5, cost: 10 }),
      skill('snipe', { ignoresProtection: true }),
      skill('pierce', { pattern: 'pierce' }),
      skill('sweep', { pattern: 'sweep' }),
      skill('heal', { effect: 'heal', stat: 'resonance', power: 2 }),
      skill('ignite', { element: 'fire', power: 0.1, inflicts: { status: 'burn', chance: 1, turns: 2 } }),
    ].map((s) => [s.id, s]),
  ),
})

const member = (creatureId: string, lane: 0 | 1 | 2, row: 'front' | 'back', tactics: TeamMember['tactics'] = []): TeamMember => ({
  creature: creatureId, position: { lane, row }, tactics,
})

const team = (...members: TeamMember[]): Team => ({ members })

const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) =>
  events.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === type)

describe('runBattle', () => {
  const c = content(creature('a'), creature('b'), creature('fast', { stats: stats({ swiftness: 100 }) }))

  it('is deterministic for the same seed', () => {
    const setup = { player: team(member('a', 1, 'front')), enemy: team(member('b', 1, 'front')), seed: 9 }
    expect(runBattle(setup, c)).toEqual(runBattle(setup, c))
  })

  it('ends with a winner once one side is defeated', () => {
    const strong = creature('strong', { stats: stats({ might: 200 }) })
    const result = runBattle({ player: team(member('strong', 1, 'front')), enemy: team(member('b', 1, 'front')), seed: 1 }, content(strong, creature('b')))
    expect(result.winner).toBe('player')
    expect(result.events.at(-1)).toEqual({ type: 'battleEnded', winner: 'player', turns: result.turns })
  })

  it('gives the faster unit more turns', () => {
    const result = runBattle({ player: team(member('fast', 1, 'front')), enemy: team(member('a', 1, 'front')), seed: 1 }, c)
    const actors = ofType(result.events, 'turnStarted').slice(0, 6).map((e) => e.actor)
    expect(actors.filter((id) => id === 'player-0')).toHaveLength(4)
  })

  it('falls back to the Basic Attack when no Tactic matches', () => {
    const tactics = [{ condition: { type: 'selfLifeforceBelow' as const, percent: 10 }, skill: 'strike', target: 'sameLane' as const }]
    const result = runBattle({ player: team(member('a', 1, 'front', tactics)), enemy: team(member('b', 1, 'front')), seed: 1 }, c)
    const first = ofType(result.events, 'actionChosen').find((e) => e.actor === 'player-0')!
    expect(first.skill).toBe('basic')
    expect(first.tactic).toBeNull()
  })

  it('fires the first matching Tactic top-down and spends Essence', () => {
    const tactics = [
      { condition: { type: 'enemiesAtLeast' as const, count: 3 }, skill: 'sweep', target: 'sameLane' as const },
      { condition: { type: 'always' as const }, skill: 'strike', target: 'sameLane' as const },
    ]
    const result = runBattle({ player: team(member('a', 1, 'front', tactics)), enemy: team(member('b', 1, 'front')), seed: 1 }, c)
    const first = ofType(result.events, 'actionChosen').find((e) => e.actor === 'player-0')!
    expect(first).toMatchObject({ skill: 'strike', tactic: 1 })
    const start = Math.round(60 * RULES.startingEssenceRatio) + RULES.essenceRegen
    expect(first.essence).toBe(start - 10)
  })

  it('skips a Tactic the actor cannot afford', () => {
    const broke = creature('broke', { stats: stats({ essence: 16 }) })
    const tactics = [{ condition: { type: 'always' as const }, skill: 'big', target: 'sameLane' as const }]
    // Starts with 8 + 10 regen = 16 (capped): one Big (15) leaves 1, and 1 + 10 is not enough for a second.
    const result = runBattle({ player: team(member('broke', 1, 'front', tactics)), enemy: team(member('b', 1, 'front')), seed: 1 }, content(broke, creature('b')))
    const actions = ofType(result.events, 'actionChosen').filter((e) => e.actor === 'player-0')
    expect(actions[0].skill).toBe('big')
    expect(actions[1].skill).toBe('basic')
  })

  it('protects the Back Row while the Front Row stands, unless the skill ignores protection', () => {
    const enemy = team(member('b', 0, 'front'), member('b', 1, 'back'))
    const pick = (skillId: string) => {
      const tactics = [{ condition: { type: 'always' as const }, skill: skillId, target: 'sameLane' as const }]
      const result = runBattle({ player: team(member('fast', 1, 'front', tactics)), enemy, seed: 1 }, c)
      return ofType(result.events, 'actionChosen')[0].targets
    }
    expect(pick('strike')).toEqual(['enemy-0'])
    expect(pick('snipe')).toEqual(['enemy-1'])
  })

  it('expands Pierce to the whole Lane and Sweep to the whole Row', () => {
    const enemy = team(member('b', 0, 'front'), member('b', 0, 'back'), member('b', 2, 'front'))
    const pick = (skillId: string) => {
      const tactics = [{ condition: { type: 'always' as const }, skill: skillId, target: 'sameLane' as const }]
      const result = runBattle({ player: team(member('fast', 0, 'front', tactics)), enemy, seed: 1 }, c)
      return ofType(result.events, 'actionChosen')[0].targets
    }
    expect(pick('pierce')).toEqual(['enemy-0', 'enemy-1'])
    expect(pick('sweep')).toEqual(['enemy-0', 'enemy-2'])
  })

  it('deals extra damage against the opposing element', () => {
    const iceFoe = creature('ice-foe', { element: 'ice' })
    const tactics = [{ condition: { type: 'always' as const }, skill: 'fireball', target: 'sameLane' as const }]
    const hit = (enemyId: string) => {
      const result = runBattle({ player: team(member('fast', 1, 'front', tactics)), enemy: team(member(enemyId, 1, 'front')), seed: 3 }, content(creature('fast', { stats: stats({ swiftness: 100 }) }), creature('b'), iceFoe))
      return ofType(result.events, 'damageDealt')[0]
    }
    const neutral = hit('b')
    const weak = hit('ice-foe')
    expect(neutral.weakness).toBe(false)
    expect(weak.weakness).toBe(true)
    expect(weak.amount / neutral.amount).toBeCloseTo(RULES.weaknessMultiplier, 1)
  })

  it('heals the ally with the lowest Lifeforce and never over the maximum', () => {
    const tactics = [{ condition: { type: 'allyLifeforceBelow' as const, percent: 100 }, skill: 'heal', target: 'lowestLifeforce' as const }]
    const result = runBattle({ player: team(member('a', 1, 'front'), member('a', 1, 'back', tactics)), enemy: team(member('fast', 1, 'front')), seed: 1 }, c)
    for (const heal of ofType(result.events, 'healed')) {
      expect(heal.target).toBe('player-0')
      expect(heal.lifeforce).toBeLessThanOrEqual(500)
    }
    expect(ofType(result.events, 'healed').length).toBeGreaterThan(0)
  })

  it('applies Burn, ticks it on the victim’s turn and lets it expire', () => {
    const tactics = [{ condition: { type: 'enemyWithoutStatus' as const, status: 'burn' as const }, skill: 'ignite', target: 'sameLane' as const }]
    const result = runBattle({ player: team(member('fast', 1, 'front', tactics)), enemy: team(member('a', 1, 'front')), seed: 1 }, c)
    expect(ofType(result.events, 'statusApplied')[0]).toMatchObject({ target: 'enemy-0', status: 'burn', turns: 2 })
    const ticks = ofType(result.events, 'statusTicked')
    expect(ticks[0]).toMatchObject({ unit: 'enemy-0', amount: Math.round(500 * STATUS_NUMBERS.burnPercent) })
    expect(ofType(result.events, 'statusExpired').length).toBeGreaterThan(0)
  })

  it('ends in a draw after the turn limit', () => {
    const wall = creature('wall', { stats: stats({ might: 1, guard: 1000 }) })
    const result = runBattle({ player: team(member('wall', 1, 'front')), enemy: team(member('wall', 1, 'front')), seed: 1 }, content(wall))
    expect(result).toMatchObject({ winner: 'draw', turns: RULES.maxTurns })
  })

  it('rejects invalid teams', () => {
    const tooMany = Array.from({ length: RULES.maxTacticSlots + 1 }, () => ({ condition: { type: 'always' as const }, skill: 'strike', target: 'sameLane' as const }))
    expect(() => runBattle({ player: team(member('a', 1, 'front', tooMany)), enemy: team(member('b', 1, 'front')), seed: 1 }, c)).toThrow(/Tactics/)
    expect(() => runBattle({ player: team(member('a', 1, 'front'), member('a', 1, 'front')), enemy: team(member('b', 1, 'front')), seed: 1 }, c)).toThrow(/Two creatures/)
    expect(() => runBattle({ player: team(member('nope', 1, 'front')), enemy: team(member('b', 1, 'front')), seed: 1 }, c)).toThrow(/Unknown creature/)
  })

  it('writes a Battle Log line naming actor, skill and targets for every action', () => {
    const tactics = [{ condition: { type: 'always' as const }, skill: 'strike', target: 'sameLane' as const }]
    const result = runBattle({ player: team(member('a', 1, 'front', tactics)), enemy: team(member('b', 1, 'front')), seed: 1 }, c)
    const log = formatBattleLog(result.events)
    const actionLines = log.map((line) => line.text).filter((text) => text.includes(' → '))
    expect(actionLines.length).toBe(ofType(result.events, 'actionChosen').length)
    for (const line of actionLines) expect(line).toMatch(/^ {2}(a|b) → \w+ → (a|b)/)
  })
})

describe('conditions narrow targets', () => {
  const c = content(
    creature('fast', { stats: stats({ swiftness: 100 }) }),
    creature('ice-foe', { element: 'ice' }),
    creature('b'),
  )

  it('only hits enemies that match an enemy Condition', () => {
    const tactics = [{ condition: { type: 'enemyWeakTo' as const, element: 'fire' as const }, skill: 'fireball', target: 'lowestLifeforce' as const }]
    const enemy = team(member('b', 0, 'front'), member('ice-foe', 2, 'front'))
    const result = runBattle({ player: team(member('fast', 0, 'front', tactics)), enemy, seed: 1 }, c)
    expect(ofType(result.events, 'actionChosen')[0]).toMatchObject({ skill: 'fireball', targets: ['enemy-1'] })
  })

  it('skips the Tactic when the matching enemy is protected', () => {
    const tactics = [{ condition: { type: 'enemyWeakTo' as const, element: 'fire' as const }, skill: 'fireball', target: 'lowestLifeforce' as const }]
    const enemy = team(member('b', 1, 'front'), member('ice-foe', 1, 'back'))
    const result = runBattle({ player: team(member('fast', 1, 'front', tactics)), enemy, seed: 1 }, c)
    expect(ofType(result.events, 'actionChosen')[0]).toMatchObject({ skill: 'basic', tactic: null })
  })
})
