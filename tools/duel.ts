/**
 * Balancing check for the Vow Duels prototype: every 3-creature team from the pool plays best-of-5 matches
 * against each opponent, with both sides using Auto-pick. Usage: npm run duel -- --runs 6
 */
import { runBattle } from '../src/core/battle'
import { CONTENT } from '../src/data'
import {
  DUEL_OPPONENTS,
  DUEL_POOL,
  autoPick,
  defaultRow,
  enemySwears,
  matchWinner,
  newMatch,
  offerFor,
  recordRound,
  roundSeed,
  roundTeams,
  rowFull,
  swear,
  type DuelSlot,
} from '../src/game/duel'

const runsArg = process.argv.indexOf('--runs')
const runs = runsArg > 0 ? Number(process.argv[runsArg + 1]) : 4

function teams(): DuelSlot[][] {
  const out: DuelSlot[][] = []
  for (let a = 0; a < DUEL_POOL.length; a++)
    for (let b = a + 1; b < DUEL_POOL.length; b++)
      for (let c = b + 1; c < DUEL_POOL.length; c++) {
        const slots: DuelSlot[] = []
        for (const id of [DUEL_POOL[a], DUEL_POOL[b], DUEL_POOL[c]]) {
          const row = defaultRow(id)
          slots.push({ creature: id, row: rowFull(slots, row) ? (row === 'front' ? 'back' : 'front') : row })
        }
        out.push(slots)
      }
  return out
}

const vowCount = new Map<string, number>()
for (const opponent of DUEL_OPPONENTS) {
  let matches = 0
  let won = 0
  let rounds = 0
  let comebacks = 0
  let turns = 0
  let firstRoundsWon = 0
  for (const slots of teams()) {
    for (let r = 0; r < runs; r++) {
      let match = newMatch(opponent.id, slots, 1000 + r * 97 + matches)
      let behind = false
      while (!matchWinner(match)) {
        match = enemySwears(match)
        const offer = offerFor(match, 'player')
        if (offer.length) match = swear(match, 'player', autoPick(match, offer))
        const result = runBattle({ ...roundTeams(match), seed: roundSeed(match) }, CONTENT)
        turns += result.turns
        rounds++
        if (match.rounds.length === 0 && result.winner === 'player') firstRoundsWon++
        match = recordRound(match, result.winner)
        if (match.wins.enemy - match.wins.player >= 2) behind = true
        if (match.rounds.length > 9) break
      }
      for (const v of [...match.vows.player, ...match.vows.enemy]) vowCount.set(v.vow, (vowCount.get(v.vow) ?? 0) + 1)
      matches++
      if (matchWinner(match) === 'player') {
        won++
        if (behind) comebacks++
      }
    }
  }
  console.log(
    `${opponent.name.padEnd(30)} match win ${((won / matches) * 100).toFixed(0)}% · round 1 won ${((firstRoundsWon / matches) * 100).toFixed(0)}% · ` +
      `${(rounds / matches).toFixed(1)} rounds/match · ${(turns / rounds).toFixed(0)} turns/round · comebacks from 0-2: ${comebacks}`,
  )
}
console.log('\nVows sworn:', [...vowCount.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', '))
