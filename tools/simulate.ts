/**
 * Headless battle simulator.
 *
 *   npm run sim -- --encounter winter-court --preset naive --runs 1000
 *   npm run sim -- --encounter frost-wardens --log --seed 7
 */
import { parseArgs } from 'node:util'
import { runBattle } from '../src/core/battle'
import { formatBattleLog } from '../src/core/log'
import type { Side } from '../src/core/types'
import { CONTENT } from '../src/data'
import { ENCOUNTERS, findEncounter } from '../src/data/encounters'
import { PRESETS } from '../src/data/presets'

const { values } = parseArgs({
  options: {
    encounter: { type: 'string' },
    preset: { type: 'string', default: 'naive' },
    runs: { type: 'string', default: '1000' },
    seed: { type: 'string', default: '1' },
    log: { type: 'boolean', default: false },
  },
})

const player = PRESETS[values.preset]
if (!player) throw new Error(`Unknown preset "${values.preset}". Available: ${Object.keys(PRESETS).join(', ')}`)
const encounters = values.encounter ? [findEncounter(values.encounter)] : ENCOUNTERS
if (encounters.some((e) => !e)) {
  throw new Error(`Unknown encounter "${values.encounter}". Available: ${ENCOUNTERS.map((e) => e.id).join(', ')}`)
}
const seed = Number(values.seed)

for (const encounter of encounters.map((e) => e!)) {
  if (values.log) {
    const result = runBattle({ player, enemy: encounter.enemy, seed }, CONTENT)
    console.log(`\n# ${encounter.name} (preset ${values.preset}, seed ${seed})\n`)
    console.log(formatBattleLog(result.events).join('\n'))
    continue
  }

  const runs = Number(values.runs)
  const wins: Record<Side | 'draw', number> = { player: 0, enemy: 0, draw: 0 }
  let turns = 0
  const started = performance.now()
  for (let i = 0; i < runs; i++) {
    const result = runBattle({ player, enemy: encounter.enemy, seed: seed + i }, CONTENT)
    wins[result.winner]++
    turns += result.turns
  }
  const ms = performance.now() - started
  const pct = (n: number) => `${((n / runs) * 100).toFixed(1)}%`
  console.log(
    `${encounter.name.padEnd(18)} preset ${values.preset}: win ${pct(wins.player)} · loss ${pct(wins.enemy)} · draw ${pct(wins.draw)} · avg ${(turns / runs).toFixed(1)} turns · ${runs} runs in ${ms.toFixed(0)} ms`,
  )
}
