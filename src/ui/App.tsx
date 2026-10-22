import { useEffect, useMemo, useRef, useState } from 'react'
import { runBattle } from '../core/battle'
import { formatBattleLog } from '../core/log'
import type { BattleResult } from '../core/types'
import { CONTENT } from '../data'
import { ENCOUNTERS } from '../data/encounters'
import { PRESETS } from '../data/presets'
import type { BattleSceneData, Playback } from '../view/BattleScene'
import { PhaserGame } from '../view/PhaserGame'

const SPEEDS = [1, 2, 4]

/** Milestone 2 debug screen: pick an encounter and a preset, watch the battle, read the log. */
export default function App() {
  const [encounterId, setEncounterId] = useState(ENCOUNTERS[0].id)
  const [presetId, setPresetId] = useState(Object.keys(PRESETS)[0])
  const [seed, setSeed] = useState(1)
  const [speed, setSpeed] = useState(1)
  const [result, setResult] = useState<BattleResult | null>(null)
  const [battle, setBattle] = useState<BattleSceneData | null>(null)
  const [progress, setProgress] = useState(0)
  const playback = useRef<Playback>({ speed: 1, skip: false })
  const logEnd = useRef<HTMLDivElement>(null)

  const encounter = ENCOUNTERS.find((e) => e.id === encounterId)!
  const log = useMemo(() => (result ? formatBattleLog(result.events) : []), [result])
  const visible = log.filter((line) => line.event <= progress)

  useEffect(() => logEnd.current?.scrollIntoView({ block: 'end' }), [visible.length])

  const fight = () => {
    const next = runBattle({ player: PRESETS[presetId], enemy: encounter.enemy, seed }, CONTENT)
    playback.current = { speed, skip: false }
    setProgress(0)
    setResult(next)
    setBattle({ result: next, playback: playback.current, onProgress: setProgress })
  }

  const changeSpeed = (value: number) => {
    setSpeed(value)
    playback.current.speed = value
  }

  const button = 'rounded border border-white/20 px-3 py-1 text-sm hover:bg-white/10 disabled:opacity-40'
  const field = 'rounded border border-white/20 bg-black/40 px-2 py-1 text-sm'

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-2">
        <h1 className="mr-4 text-lg font-semibold tracking-wide">Exaltia</h1>
        <label className="flex items-center gap-2 text-sm">
          Encounter
          <select className={field} value={encounterId} onChange={(e) => setEncounterId(e.target.value)}>
            {ENCOUNTERS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Team
          <select className={field} value={presetId} onChange={(e) => setPresetId(e.target.value)}>
            {Object.keys(PRESETS).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Seed
          <input className={`${field} w-20`} type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
        </label>
        <button className={`${button} border-fire/60 bg-fire/20`} onClick={fight}>
          Fight
        </button>
        <div className="ml-auto flex items-center gap-1">
          {SPEEDS.map((value) => (
            <button key={value} className={`${button} ${speed === value ? 'bg-white/15' : ''}`} onClick={() => changeSpeed(value)}>
              {value}x
            </button>
          ))}
          <button className={button} disabled={!result} onClick={() => (playback.current.skip = true)}>
            Skip
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          <PhaserGame battle={battle} />
          {!result && (
            <p className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-sm text-physical">
              {encounter.description} Pick a team and press Fight.
            </p>
          )}
        </main>
        <aside className="flex w-96 flex-col border-l border-white/10">
          <h2 className="border-b border-white/10 px-3 py-2 text-sm font-semibold">Battle Log</h2>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed">
            {visible.map((line, i) => (
              <div key={i} className={line.text.startsWith('—') ? 'mt-2 text-physical' : 'whitespace-pre-wrap'}>
                {line.text}
              </div>
            ))}
            <div ref={logEnd} />
          </div>
        </aside>
      </div>
    </div>
  )
}
