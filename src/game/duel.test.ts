import { describe, expect, it } from 'vitest'
import { runBattle } from '../core/battle'
import { CONTENT } from '../data'
import {
  DUEL_OPPONENTS,
  autoPick,
  buildTeam,
  enemySwears,
  matchWinner,
  newMatch,
  offerFor,
  offerRules,
  positions,
  recordRound,
  resolveVow,
  roundSeed,
  roundTeams,
  swear,
  type DuelSlot,
} from './duel'
import { VOWS } from './vows'

const TEAM: DuelSlot[] = [
  { creature: 'basaltor', row: 'front' },
  { creature: 'pyrelle', row: 'back' },
  { creature: 'nivaris', row: 'back' },
]
const FIRE: DuelSlot[] = [
  { creature: 'cinder-knight', row: 'front' },
  { creature: 'ember-sage', row: 'back' },
  { creature: 'ember-sage', row: 'back' },
]

const fight = (player: DuelSlot[], playerVows: { vow: string; target?: number }[], enemyVows: { vow: string; target?: number }[] = [], seed = 7) =>
  runBattle({ player: buildTeam(player, playerVows, 2), enemy: buildTeam(FIRE, enemyVows, 4), seed }, CONTENT)

describe('Vow Duels', () => {
  it('places each row from the middle out', () => {
    expect(positions(TEAM)).toEqual([
      { lane: 1, row: 'front' },
      { lane: 1, row: 'back' },
      { lane: 0, row: 'back' },
    ])
  })

  it('every Vow builds a valid team and a battle that ends', () => {
    for (const vow of VOWS) {
      if (vow.id === 'mirror-oath') continue
      const result = fight(TEAM, [{ vow: vow.id, target: vow.scope === 'creature' ? 0 : undefined }], [{ vow: vow.id, target: vow.scope === 'creature' ? 1 : undefined }])
      expect(result.events.at(-1)?.type, vow.id).toBe('battleEnded')
    }
  })

  it('Fireproof stops Burn on the whole team', () => {
    const burns = (r: ReturnType<typeof fight>) => r.events.filter((e) => e.type === 'statusApplied' && e.status === 'burn' && e.target.startsWith('player')).length
    const enemy = [{ vow: 'kindling', target: 0 }, { vow: 'kindling', target: 1 }]
    expect(burns(fight(TEAM, [], enemy))).toBeGreaterThan(0)
    const guarded = fight(TEAM, [{ vow: 'fireproof' }], enemy)
    expect(burns(guarded)).toBe(0)
    expect(guarded.events.some((e) => e.type === 'vowTriggered' && e.vow === 'Fireproof')).toBe(true)
  })

  it('Undying Oath brings the first fallen creature back once', () => {
    const weak: DuelSlot[] = [{ creature: 'spire-mender', row: 'front' }]
    const result = fight(weak, [{ vow: 'undying-oath' }])
    const revived = result.events.filter((e) => e.type === 'revived')
    expect(revived).toHaveLength(1)
    expect(result.events.filter((e) => e.type === 'defeated' && e.unit === 'player-0')).toHaveLength(2)
  })

  it('Dawnbreak fires the Ascension on the first turn of the carrier', () => {
    const result = fight(TEAM, [{ vow: 'dawnbreak', target: 1 }])
    const first = result.events.find((e) => e.type === 'actionChosen' && e.actor === 'player-1')
    expect(first?.type === 'actionChosen' && first.ascension).toBe(true)
  })

  it('the loser of a round sees 4 offers, one at least Rare; match point guarantees an Exalted', () => {
    let match = newMatch('ashen-twins', TEAM, 3)
    expect(offerRules(match, 'player')).toEqual({ count: 3, atLeast: undefined })
    match = recordRound(match, 'enemy')
    expect(offerRules(match, 'player')).toEqual({ count: 4, atLeast: 'rare' })
    match = recordRound(match, 'enemy')
    const rules = offerRules(match, 'player')
    expect(rules.atLeast).toBe('exalted')
    match = enemySwears(match)
    const offer = offerFor(match, 'player')
    expect(offer).toHaveLength(4)
    expect(offer.some((id) => VOWS.find((v) => v.id === id)!.rarity === 'exalted')).toBe(true)
  })

  it('Mirror Oath copies the opponent’s last Vow', () => {
    let match = swear(newMatch('ashen-twins', TEAM, 3), 'enemy', { vow: 'blood-price', target: 0 })
    expect(resolveVow(match, 'player', 'mirror-oath', 1)).toEqual({ vow: 'blood-price', target: 1 })
    match = swear(match, 'enemy', { vow: 'fireproof' })
    expect(resolveVow(match, 'player', 'mirror-oath')).toEqual({ vow: 'fireproof' })
  })

  it('a best-of-5 auto match ends after 3 to 5 decided rounds against every opponent', () => {
    for (const opponent of DUEL_OPPONENTS) {
      let match = newMatch(opponent.id, TEAM, 11)
      while (!matchWinner(match) && match.rounds.length < 9) {
        match = enemySwears(match)
        match = swear(match, 'player', autoPick(match, offerFor(match, 'player')))
        match = recordRound(match, runBattle({ ...roundTeams(match), seed: roundSeed(match) }, CONTENT).winner)
      }
      const decided = match.rounds.filter((r) => r !== 'draw').length
      expect(matchWinner(match), opponent.id).not.toBeNull()
      expect(decided).toBeGreaterThanOrEqual(3)
      expect(decided).toBeLessThanOrEqual(5)
      expect(match.vows.enemy.length).toBe(match.rounds.length)
    }
  })
})
