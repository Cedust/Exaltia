import { useEffect, useMemo, useRef, useState } from 'react'
import { runBattle } from '../core/battle'
import type { BattleResult, Position } from '../core/types'
import { CONTENT } from '../data'
import { SCENES } from '../data/story'
import { FIRST_TRIAL, type Encounter } from '../data/world'
import { battleRules, DUELS, enemyTeam, findAnyEncounter, fitFormation, isFrontLiner, playerTeam, suggestPlan } from '../game/battles'
import { addCreature, applyBattle, chooseParagon, openDuel, spireAction, type BattleReport } from '../game/campaign'
import { deleteSave, loadSave, newSave, tournamentsWon, writeSave, type SaveState } from '../game/save'
import { GameContext } from './GameContext'
import { EndingChoiceScreen, OathScreen, ParagonChoiceScreen, ResultScreen } from './screens/AftermathScreens'
import { BattleScreen } from './screens/BattleScreen'
import { CollectionView, CreatureScreen } from './screens/CollectionScreens'
import { Hub, JournalView, MenuView, type HubTab } from './screens/HubScreens'
import { MapView } from './screens/MapView'
import { PreBattleScreen } from './screens/PreBattleScreen'
import { RegionSheet } from './screens/RegionSheet'
import { StarterScreen } from './screens/StarterScreen'
import { NameScreen, StoryScreen } from './screens/StoryScreen'
import { TitleScreen } from './screens/TitleScreen'
import { TournamentScreen } from './screens/TournamentScreen'

/** Where to go after a battle (or when leaving the pre-battle screen). */
type Return = { kind: 'hub' } | { kind: 'tournament'; regionId: string }

type Step =
  | { kind: 'title' }
  | { kind: 'story'; scene: string }
  | { kind: 'name' }
  | { kind: 'starters' }
  | { kind: 'hub' }
  | { kind: 'tournament'; regionId: string }
  | { kind: 'creature'; id: string }
  | { kind: 'prebattle'; encounterId: string; back: Return }
  | { kind: 'battle'; encounter: Encounter; result: BattleResult; tier: number; back: Return; id: number }
  | { kind: 'result'; encounter: Encounter; report: BattleReport; back: Return }
  | { kind: 'choose'; regionId: string }
  | { kind: 'oath'; paragonId: string; memory: number }
  | { kind: 'ending' }

const newSeed = () => Math.floor(Math.random() * 1_000_000)
const story = (scene: string): Step => ({ kind: 'story', scene })

/** First formation from the two starters: Front-liners in front, the rest behind them. */
function starterFormation(picks: string[]): SaveState['formation'] {
  const fronts: (0 | 1 | 2)[] = [1, 0, 2]
  const backs: (0 | 1 | 2)[] = [1, 2, 0]
  return picks.map((creature) => {
    const position: Position = isFrontLiner(creature) ? { lane: fronts.shift()!, row: 'front' } : { lane: backs.shift()!, row: 'back' }
    return { creature, position }
  })
}

export default function App() {
  const [save, setSave] = useState<SaveState | null>(null)
  const [hasSave, setHasSave] = useState(() => loadSave() !== null)
  const [screen, setScreen] = useState<Step>({ kind: 'title' })
  const [queue, setQueue] = useState<Step[]>([])
  const [hubTab, setHubTab] = useState<HubTab>('map')
  const [sheet, setSheet] = useState<string | null>(null)
  const [battleId, setBattleId] = useState(0)

  useEffect(() => {
    if (save) writeSave(save)
  }, [save])

  // Every screen starts at the top.
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scroller.current?.scrollTo(0, 0)
  }, [screen])

  const api = useMemo(() => (save ? { save, update: (change: (s: SaveState) => SaveState) => setSave((s) => (s ? change(s) : s)) } : null), [save])

  /** Show these steps one after another; the hub follows when they run out. */
  const play = (...steps: Step[]) => {
    setScreen(steps[0] ?? { kind: 'hub' })
    setQueue(steps.slice(1))
  }
  const advance = () => play(...queue)

  const unseen = (scene: string, current: SaveState | null = save) => (current?.seen.includes(scene) ? [] : [story(scene)])

  const newJourney = () => {
    setSave(null)
    setHubTab('map')
    play(story('prologue-1'), { kind: 'name' })
  }

  /** Opens the pre-battle screen with the formation already fitted to the encounter's rules. */
  const prepare = (encounterId: string, back: Return) => {
    setSheet(null)
    fitTo(encounterId)
    play({ kind: 'prebattle', encounterId, back })
  }

  const fitTo = (encounterId: string) =>
    setSave((s) => {
      const encounter = s && findAnyEncounter(s, encounterId)
      if (!s || !encounter) return s
      const formation = fitFormation(s, encounter)
      const tactics = { ...s.tactics }
      for (const f of formation) if (!tactics[f.creature]?.length) tactics[f.creature] = suggestPlan({ ...s, formation }, f.creature)
      return { ...s, formation, tactics }
    })

  const onSpire = () => {
    if (!save) return
    const action = spireAction(save)
    if (action === 'trial') prepare(FIRST_TRIAL.id, { kind: 'hub' })
    if (action === 'duel') {
      const duel = openDuel(save)!
      fitTo(duel.id)
      play(...unseen(`${duel.id}-intro`), { kind: 'prebattle', encounterId: duel.id, back: { kind: 'hub' } })
    }
    if (action === 'finale') {
      fitTo('finale')
      play(...unseen('finale-intro'), { kind: 'prebattle', encounterId: 'finale', back: { kind: 'hub' } })
    }
  }

  const fight = (encounterId: string, back: Return) => {
    if (!save) return
    const encounter = findAnyEncounter(save, encounterId)
    if (!encounter) return
    const rules = battleRules(save, encounter)
    const result = runBattle({ player: playerTeam(save), enemy: enemyTeam(save, encounter), seed: newSeed() }, CONTENT)
    setBattleId((n) => n + 1)
    play({ kind: 'battle', encounter, result, tier: rules.tier, back, id: battleId + 1 })
  }

  const finishBattle = (step: Extract<Step, { kind: 'battle' }>) => {
    if (!save) return
    const firstTrial = !save.firstTrialWon
    const { save: next, report } = applyBattle(save, step.encounter, step.result, step.tier)
    setSave(next)
    const after: Step[] = []
    if (report.won && !report.chooseParagonIn) {
      if (step.encounter.kind === 'trial' && firstTrial) after.push(...unseen('act1-open', next))
      if (step.encounter.kind === 'duel') after.push(...unseen(`${step.encounter.id}-won`, next))
      if (step.encounter.kind === 'finale') after.push(...unseen('finale-won', next), { kind: 'ending' })
    }
    if (report.chooseParagonIn) after.push({ kind: 'choose', regionId: report.chooseParagonIn })
    else if (after.length === 0 && step.back.kind === 'tournament') after.push({ kind: 'tournament', regionId: step.back.regionId })
    play({ kind: 'result', encounter: step.encounter, report, back: step.back }, ...after)
  }

  const choose = (regionId: string, paragonId: string) => {
    if (!save) return
    const next = chooseParagon(save, regionId, paragonId)
    setSave(next)
    const won = tournamentsWon(next)
    const after: Step[] = [{ kind: 'oath', paragonId, memory: won - 1 }]
    if (won === 1) after.push(...unseen('cassian-intro', next))
    if (won === 4) after.push(...unseen('act2-open', next))
    if (won === 8) after.push(...unseen('act3-open', next))
    if (DUELS.some((d) => d.after === won)) setHubTab('map')
    play(...after)
  }

  const renderScreen = () => {
    switch (screen.kind) {
      case 'title':
        return (
          <TitleScreen
            hasSave={hasSave}
            onNew={newJourney}
            onContinue={() => {
              const loaded = loadSave()
              if (!loaded) return newJourney()
              setSave(loaded)
              play({ kind: 'hub' })
            }}
          />
        )
      case 'story': {
        const scene = SCENES[screen.scene]
        return (
          <StoryScreen
            key={scene.id}
            lines={scene.lines}
            backdrop={scene.backdrop}
            title={scene.title}
            vars={{ name: save?.name ?? 'Statue' }}
            onDone={() => {
              setSave((s) => (s && !s.seen.includes(scene.id) ? { ...s, seen: [...s.seen, scene.id] } : s))
              advance()
            }}
          />
        )
      }
      case 'name':
        return (
          <NameScreen
            onDone={(name) => {
              const fresh = newSave(name)
              setSave({ ...fresh, seen: ['prologue-1'] })
              setHasSave(true)
              play(story('prologue-2'), { kind: 'starters' })
            }}
          />
        )
      case 'starters':
        return (
          <StarterScreen
            onDone={(picks) => {
              setSave((s) => {
                if (!s) return s
                let next = picks.reduce(addCreature, s)
                next = { ...next, formation: starterFormation(picks) }
                const tactics = Object.fromEntries(picks.map((id) => [id, suggestPlan(next, id)]))
                return { ...next, tactics }
              })
              play(story('prologue-3'), { kind: 'hub' })
            }}
          />
        )
      case 'hub':
        return (
          <Hub tab={hubTab} onTab={setHubTab}>
            {hubTab === 'map' && <MapView save={save!} onRegion={setSheet} onSpire={onSpire} />}
            {hubTab === 'collection' && <CollectionView onOpen={(id) => play({ kind: 'creature', id })} />}
            {hubTab === 'journal' && <JournalView />}
            {hubTab === 'menu' && (
              <MenuView
                onReplayScene={() => {
                  const last = save!.seen[save!.seen.length - 1]
                  if (last) play(story(last))
                }}
                onQuit={() => {
                  setHasSave(true)
                  play({ kind: 'title' })
                }}
                onDelete={() => {
                  deleteSave()
                  setSave(null)
                  setHasSave(false)
                  play({ kind: 'title' })
                }}
              />
            )}
            {sheet && (
              <RegionSheet
                save={save!}
                regionId={sheet}
                onClose={() => setSheet(null)}
                onTournament={() => {
                  setSheet(null)
                  play({ kind: 'tournament', regionId: sheet })
                }}
                onChallenge={(id) => prepare(id, { kind: 'hub' })}
                onRematch={() => prepare(`rematch-${sheet}`, { kind: 'hub' })}
              />
            )}
          </Hub>
        )
      case 'tournament':
        return <TournamentScreen regionId={screen.regionId} onBack={() => play({ kind: 'hub' })} onPrepare={(id) => prepare(id, { kind: 'tournament', regionId: screen.regionId })} />
      case 'creature':
        return <CreatureScreen creatureId={screen.id} onBack={() => play({ kind: 'hub' })} />
      case 'prebattle': {
        const encounter = findAnyEncounter(save!, screen.encounterId)
        const back = screen.back
        if (!encounter) return null
        return (
          <div className="fixed inset-0">
            <PreBattleScreen
              encounter={encounter}
              onBack={() => play(back.kind === 'tournament' ? { kind: 'tournament', regionId: back.regionId } : { kind: 'hub' })}
              onFight={() => fight(screen.encounterId, back)}
            />
          </div>
        )
      }
      case 'battle':
        return (
          <BattleScreen
            key={screen.id}
            encounter={screen.encounter}
            result={screen.result}
            speed={save!.speed}
            onSpeed={(speed) => setSave((s) => (s ? { ...s, speed } : s))}
            onDone={() => finishBattle(screen)}
          />
        )
      case 'result':
        return <ResultScreen encounter={screen.encounter} report={screen.report} onContinue={advance} />
      case 'choose':
        return <ParagonChoiceScreen regionId={screen.regionId} onChoose={(p) => choose(screen.regionId, p)} />
      case 'oath':
        return <OathScreen paragonId={screen.paragonId} memoryIndex={screen.memory} onDone={advance} />
      case 'ending':
        return (
          <EndingChoiceScreen
            onChoose={(ending) => {
              setSave((s) => (s ? { ...s, finale: { ...s.finale, ending } } : s))
              play(story(ending === 'oath' ? 'ending-oath' : 'ending-unbound'))
            }}
          />
        )
    }
  }

  const content = (
    <div ref={scroller} className="h-dvh overflow-y-auto overflow-x-hidden">
      {renderScreen()}
    </div>
  )
  return api ? <GameContext.Provider value={api}>{content}</GameContext.Provider> : content
}
