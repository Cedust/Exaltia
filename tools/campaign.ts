/**
 * Campaign balancing: plays the story with a "typical player" (expected XP, Oath Shards, Skill Tree and
 * Mastery at each step, Auto-pick for Vows, the Vows unlocked so far) and prints match win rates for every
 * encounter, plus the average turns per round.
 *
 *   npm run campaign                 # ring order from the Dawnreach
 *   npm run campaign -- --start fire --reverse --runs 200
 */
import { parseArgs } from 'node:util'
import { runBattle } from '../src/core/battle'
import { CONTENT } from '../src/data'
import { STARTER_IDS } from '../src/data/creatures'
import { SKILL_TREES, capstoneId, nodeId } from '../src/data/skillTrees'
import { FIRST_TRIAL, REGIONS, type Encounter } from '../src/data/world'
import { allowedIn, battleRules, duelEncounter, finaleEncounter, rowFor, startMatch } from '../src/game/battles'
import { addCreature, chooseParagon } from '../src/game/campaign'
import { autoPlay } from '../src/game/duel'
import { treeState } from '../src/game/loadout'
import { CHALLENGE_VOWS, MAX_OATH_RANK, SHARDS_PER_RANK, TRIAL_VOW, XP } from '../src/game/rules'
import { newSave, type SaveState } from '../src/game/save'

const { values } = parseArgs({
  options: {
    start: { type: 'string', default: 'radiance' },
    reverse: { type: 'boolean', default: false },
    runs: { type: 'string', default: '100' },
    starters: { type: 'string', default: 'spire-golem,spire-mender' },
    pick: { type: 'string', default: 'balanced' },
  },
})
const RUNS = Number(values.runs)

const isFront = (id: string) => /Front|Guardian|Striker/.test(CONTENT.creatures[id].role) && !/Back/.test(CONTENT.creatures[id].role)

const pct = (n: number) => `${Math.round(n * 100)}%`.padStart(4)
const turns: number[] = []

/** Share of matches won with Auto-pick, and of single rounds in brackets; also collects the turns of every round. */
function winRate(save: SaveState, encounter: Encounter): string {
  let wins = 0
  let rounds = 0
  let roundWins = 0
  for (let seed = 0; seed < RUNS; seed++) {
    const { match, results } = autoPlay(startMatch(save, encounter, seed), (setup) => runBattle(setup, CONTENT))
    if (match.wins.player > match.wins.enemy) wins++
    rounds += results.length
    roundWins += match.wins.player
    for (const r of results) turns.push(r.turns)
  }
  return `${pct(wins / RUNS)} (${pct(roundWins / rounds).trim()})`
}

/** Picks the strongest allowed creatures and places them: fronts in the Front Row, the rest behind. */
function formTeam(save: SaveState, encounter: Encounter): SaveState {
  const rules = battleRules(save, encounter)
  const allowed = save.order.filter((id) => allowedIn(rules, id))
  const score = (id: string) => (CONTENT.creatures[id].kind === 'paragon' ? 1000 + save.creatures[id].xp + save.creatures[id].oath * 20 : save.order.indexOf(id))
  const ranked = [...allowed].sort((a, b) => score(b) - score(a))
  const picks: string[] = []
  // At least one front-liner when possible, then the best of the rest.
  const firstFront = ranked.find(isFront)
  if (firstFront && rules.teamSize > 1) picks.push(firstFront)
  for (const id of ranked) if (picks.length < rules.teamSize && !picks.includes(id)) picks.push(id)
  const formation = picks.reduce<SaveState['formation']>((f, creature) => [...f, { creature, row: rowFor(f, creature) }], [])
  return { ...save, formation }
}

/** Expected growth between Tournaments: XP for every Paragon, Shards into the team, tree and Mastery. */
function grow(save: SaveState, tier: number): SaveState {
  const creatures = { ...save.creatures }
  const paragons = save.order.filter((id) => CONTENT.creatures[id].kind === 'paragon')
  const gained = 5.5 * (XP.base + XP.perTier * tier)
  let shards = save.shards + 40
  for (const id of paragons.slice(-4)) {
    const owned = { ...creatures[id], tree: [...creatures[id].tree], mastery: { ...creatures[id].mastery } }
    owned.xp += Math.round(gained * 0.85)
    const invest = Math.min(shards, MAX_OATH_RANK * SHARDS_PER_RANK - owned.oath, 15)
    owned.oath += invest
    shards -= invest
    owned.attunements = ['offense', 'defense']
    // Buy Path 1 completely, then Path 3.
    const order = [0, 1, 2, 3].map((n) => nodeId(id, 0, n)).concat([capstoneId(id, 0)], [0, 1, 2, 3].map((n) => nodeId(id, 2, n)))
    for (const node of order) {
      const cost = node.endsWith('.cap') ? 2 : 1
      if (!owned.tree.includes(node) && treeState(owned).available >= cost) owned.tree.push(node)
    }
    for (const skill of [...CONTENT.creatures[id].skills, ...SKILL_TREES[id].flatMap((p) => p.nodes.flatMap((n) => (n.kind === 'skill' ? [n.skill] : [])))]) {
      owned.mastery[skill] = (owned.mastery[skill] ?? 0) + 8
    }
    creatures[id] = owned
  }
  return { ...save, creatures, shards }
}


// ── Prologue ──
console.log(`First Trial (each starter pair, ${RUNS} matches each):`)
for (let i = 0; i < STARTER_IDS.length; i++) {
  for (let j = i + 1; j < STARTER_IDS.length; j++) {
    let save = newSave('Test')
    save = addCreature(addCreature(save, STARTER_IDS[i]), STARTER_IDS[j])
    save = formTeam(save, FIRST_TRIAL)
    console.log(`  ${STARTER_IDS[i]} + ${STARTER_IDS[j]}: ${(winRate(save, FIRST_TRIAL))}`)
  }
}

// ── Story ──
let save = newSave('Test')
for (const id of values.starters!.split(',')) save = addCreature(save, id)
save = { ...save, firstTrialWon: true, vows: [...save.vows, TRIAL_VOW] }
const start = REGIONS.findIndex((r) => r.id === values.start)
const ring = REGIONS.map((_, i) => REGIONS[(start + (values.reverse ? -i : i) + REGIONS.length * 2) % REGIONS.length])

ring.forEach((region, step) => {
  const line: string[] = []
  for (const challenge of region.challengeSite.challenges) {
    save = formTeam(save, challenge)
    line.push(`${challenge.id} ${(winRate(save, challenge))}`)
    save = addCreature(save, region.acolytes[Number(challenge.id.slice(-1)) - 1])
    save = { ...save, vows: [...save.vows, CHALLENGE_VOWS[challenge.id]] }
  }
  for (const match of region.tournament.matches) {
    save = formTeam(save, match)
    line.push(`${match.id.split('-')[1]} ${(winRate(save, match))}`)
  }
  const team = save.formation.map((f) => f.creature).join(', ')
  console.log(`T${step + 1} ${region.name.padEnd(18)} ${line.join(' · ')}   [${team}]`)
  const paragons = save.order.filter((id) => CONTENT.creatures[id].kind === 'paragon')
  const fronts = paragons.filter(isFront).length
  const pick =
    values.pick === 'front' ? region.paragons[0] : values.pick === 'back' ? region.paragons[1] : fronts <= paragons.length - fronts ? region.paragons[0] : region.paragons[1]
  save = chooseParagon(save, region.id, pick)
  save = grow(save, step)
  for (const duel of [{ id: 'duel-1', after: 2 }, { id: 'duel-2', after: 5 }]) {
    if (step + 1 === duel.after) {
      const encounter = duelEncounter(save, duel.id)
      save = formTeam(save, encounter)
      console.log(`   ${duel.id} vs ${encounter.members[0].creature}: ${(winRate(save, encounter))} [${save.formation[0].creature}]`)
    }
  }
})

const finale = finaleEncounter(save)
save = formTeam(save, finale)
console.log(`Finale vs ${finale.members.map((m) => m.creature).join(', ')}: ${(winRate(save, finale))}  [${save.formation.map((f) => f.creature).join(', ')}]`)
const lead = save.formation[0].creature
const avg = turns.reduce((a, b) => a + b, 0) / turns.length
const sorted = [...turns].sort((a, b) => a - b)
console.log(`Turns per round: avg ${avg.toFixed(1)}, median ${sorted[Math.floor(sorted.length / 2)]}, p90 ${sorted[Math.floor(sorted.length * 0.9)]}`)
console.log(`Lead Paragon ${lead}: Awakening ${treeState(save.creatures[lead]).points}, Oath ${save.creatures[lead].oath} shards`)
