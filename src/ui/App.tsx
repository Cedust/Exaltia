import { useState } from 'react'
import { runBattle, validateTeam } from '../core/battle'
import type { BattleResult, Team } from '../core/types'
import { CONTENT } from '../data'
import type { Encounter } from '../data/encounters'
import { PRESETS } from '../data/presets'
import { BattleScreen } from './BattleScreen'
import { EncounterSelect } from './EncounterSelect'
import { PreBattle } from './PreBattle'

const STORAGE_KEY = 'exaltia.spike1.team'

function loadTeam(): Team {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Team | null
    if (stored) {
      validateTeam(stored, CONTENT)
      return stored
    }
  } catch {
    // Missing, blocked or outdated storage: fall back to the default team.
  }
  return PRESETS.naive
}

function saveTeam(team: Team) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(team))
  } catch {
    // Storage unavailable; the plan simply isn't remembered.
  }
}

const newSeed = () => Math.floor(Math.random() * 1_000_000)

type Screen =
  | { name: 'select' }
  | { name: 'prebattle'; encounter: Encounter }
  | { name: 'battle'; encounter: Encounter; result: BattleResult; seed: number; id: number }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'select' })
  const [team, setTeam] = useState<Team>(loadTeam)
  const [speed, setSpeed] = useState(1)
  const [battleCount, setBattleCount] = useState(0)

  const changeTeam = (next: Team) => {
    setTeam(next)
    saveTeam(next)
  }
  const fight = (encounter: Encounter, seed: number) => {
    const result = runBattle({ player: team, enemy: encounter.enemy, seed }, CONTENT)
    setBattleCount(battleCount + 1)
    setScreen({ name: 'battle', encounter, seed, result, id: battleCount + 1 })
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-baseline justify-between border-b border-white/10 px-4 py-2">
        <h1 className="text-lg font-semibold tracking-wide">Exaltia: Paragons of the Oath</h1>
        <span className="text-xs text-physical">Spike 1 · Core Battle</span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {screen.name === 'select' && <EncounterSelect onSelect={(encounter) => setScreen({ name: 'prebattle', encounter })} />}
        {screen.name === 'prebattle' && (
          <PreBattle
            encounter={screen.encounter}
            team={team}
            onTeamChange={changeTeam}
            onBack={() => setScreen({ name: 'select' })}
            onFight={() => fight(screen.encounter, newSeed())}
          />
        )}
        {screen.name === 'battle' && (
          <BattleScreen
            key={screen.id}
            speed={speed}
            onSpeedChange={setSpeed}
            encounter={screen.encounter}
            result={screen.result}
            seed={screen.seed}
            onAdjust={() => setScreen({ name: 'prebattle', encounter: screen.encounter })}
            onRematch={() => fight(screen.encounter, newSeed())}
            onReplay={() => fight(screen.encounter, screen.seed)}
            onEncounters={() => setScreen({ name: 'select' })}
          />
        )}
      </div>
    </div>
  )
}
