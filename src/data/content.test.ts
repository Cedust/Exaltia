import { describe, expect, it } from 'vitest'
import { runBattle, validateTeam } from '../core/battle'
import { CONTENT } from '.'
import { PARAGON_IDS, STARTER_IDS } from './creatures'
import { SKILL_TREES } from './skillTrees'
import { OATH_MEMORIES, REGION_INTROS, SCENES } from './story'
import { FIRST_TRIAL, REGIONS, neighbours } from './world'
import { DUELS, duelEncounter, enemyTeam, finaleEncounter, fitFormation, playerTeam, rematchEncounter, suggestPlan } from '../game/battles'
import { addCreature, applyBattle, chooseParagon, regionOpen } from '../game/campaign'
import { newSave, type SaveState } from '../game/save'

describe('MVP content', () => {
  it('has 16 Paragons and 20 Acolytes', () => {
    const all = Object.values(CONTENT.creatures)
    expect(all.filter((c) => c.kind === 'paragon')).toHaveLength(16)
    expect(all.filter((c) => c.kind === 'acolyte')).toHaveLength(20)
    expect(PARAGON_IDS).toHaveLength(16)
    expect(STARTER_IDS).toHaveLength(4)
  })

  it('references only existing skills, including Ascensions and Skill Trees', () => {
    for (const creature of Object.values(CONTENT.creatures)) {
      const ids = [...creature.skills, creature.basicAttack, ...(creature.ascension ? [creature.ascension] : [])]
      for (const id of ids) expect(CONTENT.skills[id], `${creature.id}: ${id}`).toBeDefined()
      if (creature.kind === 'paragon') {
        expect(creature.ascension, creature.id).toBeDefined()
        const tree = SKILL_TREES[creature.id]
        expect(tree, creature.id).toHaveLength(3)
        for (const path of tree) {
          for (const node of path.nodes) if (node.kind === 'skill') expect(CONTENT.skills[node.skill], `${creature.id}: ${node.skill}`).toBeDefined()
        }
      }
    }
  })

  it('puts two Paragons and two Acolytes in each of the 8 regions, opposites facing each other on the ring', () => {
    expect(REGIONS).toHaveLength(8)
    const seen = new Set<string>()
    for (const region of REGIONS) {
      for (const id of [...region.paragons, ...region.acolytes]) {
        expect(CONTENT.creatures[id].element, id).toBe(region.element)
        expect(seen.has(id)).toBe(false)
        seen.add(id)
      }
      expect(region.tournament.matches.map((m) => m.kind)).toEqual(['match', 'match', 'final'])
      expect(region.challengeSite.challenges).toHaveLength(2)
      expect(REGION_INTROS[region.id]).toBeDefined()
      expect(neighbours(region.id)).toHaveLength(2)
    }
  })

  it('has every story scene the campaign plays', () => {
    const needed = ['prologue-1', 'prologue-2', 'prologue-3', 'act1-open', 'cassian-intro', 'act2-open', 'act3-open', 'finale-intro', 'finale-won', 'ending-oath', 'ending-unbound']
    for (const d of DUELS) needed.push(`${d.id}-intro`, `${d.id}-won`)
    for (const id of needed) expect(SCENES[id], id).toBeDefined()
    expect(OATH_MEMORIES).toHaveLength(8)
  })
})

/** A save that owns everything, to build every encounter at full size. */
function lateSave(): SaveState {
  let save = newSave('Test')
  for (const id of Object.keys(CONTENT.creatures)) save = addCreature(save, id)
  save = { ...save, firstTrialWon: true, tournamentOrder: REGIONS.map((r) => r.id), cassian: PARAGON_IDS.slice(0, 8) }
  return save
}

describe('encounters', () => {
  it('builds a valid enemy team for every encounter, early and late', () => {
    const early = { ...newSave('Test'), firstTrialWon: true }
    const late = lateSave()
    const encounters = [FIRST_TRIAL, ...REGIONS.flatMap((r) => [...r.tournament.matches, ...r.challengeSite.challenges]), ...REGIONS.map((r) => rematchEncounter(r.id))]
    for (const save of [early, late]) {
      for (const encounter of encounters) {
        const team = enemyTeam(save, encounter)
        expect(() => validateTeam(team, CONTENT), encounter.id).not.toThrow()
        expect(team.members.length).toBeGreaterThan(0)
      }
    }
    expect(() => validateTeam(enemyTeam(late, finaleEncounter(late)), CONTENT)).not.toThrow()
  })

  it('simulates 1000 battles in well under 10 seconds', () => {
    const save = lateSave()
    const final = REGIONS[0].tournament.matches[2]
    const formation = [
      { creature: 'solvane', position: { lane: 1 as const, row: 'front' as const } },
      { creature: 'lumion', position: { lane: 1 as const, row: 'back' as const } },
    ]
    const ready = { ...save, formation, tactics: { solvane: suggestPlan({ ...save, formation }, 'solvane'), lumion: suggestPlan({ ...save, formation }, 'lumion') } }
    const enemy = enemyTeam(ready, final)
    const player = playerTeam(ready)
    const started = performance.now()
    for (let seed = 0; seed < 1000; seed++) runBattle({ player, enemy, seed }, CONTENT)
    expect(performance.now() - started).toBeLessThan(10000)
  })
})

describe('campaign', () => {
  it('plays the Prologue: two starters with suggested plans beat the First Trial', () => {
    let wins = 0
    for (let a = 0; a < STARTER_IDS.length; a++) {
      for (let b = a + 1; b < STARTER_IDS.length; b++) {
        const picks = [STARTER_IDS[a], STARTER_IDS[b]]
        let save = picks.reduce(addCreature, newSave('Test'))
        save = {
          ...save,
          formation: [
            { creature: picks[0], position: { lane: 1, row: 'front' } },
            { creature: picks[1], position: { lane: 1, row: 'back' } },
          ],
        }
        save = { ...save, tactics: Object.fromEntries(picks.map((id) => [id, suggestPlan(save, id)])) }
        const result = runBattle({ player: playerTeam(save), enemy: enemyTeam(save, FIRST_TRIAL), seed: 7 }, CONTENT)
        const { save: next, report } = applyBattle(save, FIRST_TRIAL, result, 0)
        if (report.won) {
          wins++
          expect(next.firstTrialWon).toBe(true)
          expect(next.conditions.length).toBe(save.conditions.length + 1)
          expect(REGIONS.every((r) => regionOpen(next, r.id))).toBe(true)
        }
      }
    }
    expect(wins).toBe(6)
  })

  it('choosing a Paragon gives the other to Cassian and opens only the neighbours', () => {
    const region = REGIONS[0]
    let save: SaveState = { ...newSave('Test'), firstTrialWon: true, tournaments: { [region.id]: { stage: 3 } } }
    save = chooseParagon(save, region.id, region.paragons[0])
    expect(save.creatures[region.paragons[0]]).toBeDefined()
    expect(save.cassian).toEqual([region.paragons[1]])
    const [left, right] = neighbours(region.id)
    for (const r of REGIONS) expect(regionOpen(save, r.id), r.id).toBe(r.id === region.id || r.id === left || r.id === right)
  })

  it('fits the formation to each encounter: trims for a duel, fills up for a bigger team, respects Acolytes only', () => {
    const late = lateSave()
    const duel = fitFormation(late, duelEncounter(late, 'duel-1'))
    expect(duel).toHaveLength(1)
    expect(CONTENT.creatures[duel[0].creature].kind).toBe('paragon')
    const full = fitFormation({ ...late, formation: duel }, REGIONS[0].tournament.matches[0])
    expect(full).toHaveLength(4)
    expect(new Set(full.map((f) => `${f.position.lane}${f.position.row}`)).size).toBe(4)
    const acolytesOnly = REGIONS.flatMap((r) => r.challengeSite.challenges).find((c) => c.modifiers?.some((m) => m.type === 'onlyAcolytes'))!
    for (const f of fitFormation({ ...late, formation: full }, acolytesOnly)) expect(CONTENT.creatures[f.creature].kind).toBe('acolyte')
  })
})
