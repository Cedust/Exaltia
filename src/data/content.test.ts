import { describe, expect, it } from 'vitest'
import { runBattle, validateTeam } from '../core/battle'
import { CONTENT } from '.'
import { PLAYER_POOL } from './creatures'
import { ENCOUNTERS } from './encounters'
import { PRESETS } from './presets'

describe('Spike 1 content', () => {
  it('references only existing skills', () => {
    for (const creature of Object.values(CONTENT.creatures)) {
      for (const id of [...creature.skills, creature.basicAttack]) expect(CONTENT.skills[id], `${creature.id}: ${id}`).toBeDefined()
    }
  })

  it('has valid encounter and preset teams', () => {
    for (const encounter of ENCOUNTERS) validateTeam(encounter.enemy, CONTENT)
    for (const preset of Object.values(PRESETS)) validateTeam(preset, CONTENT)
    for (const id of PLAYER_POOL) expect(CONTENT.creatures[id]).toBeDefined()
  })

  it('runs every preset against every encounter', () => {
    for (const encounter of ENCOUNTERS) {
      for (const preset of Object.values(PRESETS)) {
        expect(runBattle({ player: preset, enemy: encounter.enemy, seed: 1 }, CONTENT).events.length).toBeGreaterThan(2)
      }
    }
  })

  it('simulates 1000 battles in well under 10 seconds', () => {
    const started = performance.now()
    for (let i = 0; i < 1000; i++) runBattle({ player: PRESETS.naive, enemy: ENCOUNTERS[2].enemy, seed: i }, CONTENT)
    expect(performance.now() - started).toBeLessThan(10000)
  })
})
