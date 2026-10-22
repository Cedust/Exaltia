import { useEffect, useMemo, useRef, useState } from 'react'
import { formatBattleLog } from '../core/log'
import type { BattleResult } from '../core/types'
import type { Encounter } from '../data/encounters'
import { Playback, type BattleSceneData } from '../view/BattleScene'
import { PhaserGame } from '../view/PhaserGame'
import { button, primaryButton } from './styles'

const SPEEDS = [1, 2, 4]

/** Battle playback with live Battle Log; afterwards the way back to the Battle Plan. */
export function BattleScreen({
  encounter,
  result,
  seed,
  speed,
  onSpeedChange,
  onAdjust,
  onRematch,
  onReplay,
  onEncounters,
}: {
  encounter: Encounter
  result: BattleResult
  seed: number
  speed: number
  onSpeedChange: (speed: number) => void
  onAdjust: () => void
  onRematch: () => void
  onReplay: () => void
  onEncounters: () => void
}) {
  const [progress, setProgress] = useState(0)
  // Mounted once per battle (keyed by the parent); the scene reads playback live while React changes it.
  const [playback] = useState(() => new Playback(speed))
  const [battle] = useState<BattleSceneData>(() => ({ result, playback, onProgress: setProgress }))
  const logEnd = useRef<HTMLDivElement>(null)

  const log = useMemo(() => formatBattleLog(result.events), [result])
  const visible = log.filter((line) => line.event <= progress)
  const finished = progress >= result.events.length - 1
  useEffect(() => logEnd.current?.scrollIntoView({ block: 'end' }), [visible.length])

  const changeSpeed = (value: number) => {
    onSpeedChange(value)
    playback.setSpeed(value)
  }

  const outcome = result.winner === 'player' ? 'Victory' : result.winner === 'enemy' ? 'Defeat' : 'Draw'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2">
        <h2 className="font-semibold">{encounter.name}</h2>
        <span className="text-xs text-physical">Seed {seed}</span>
        <div className="ml-auto flex items-center gap-1">
          {SPEEDS.map((value) => (
            <button key={value} type="button" className={`${button} ${speed === value ? 'bg-white/15' : ''}`} onClick={() => changeSpeed(value)}>
              {value}x
            </button>
          ))}
          <button type="button" className={button} disabled={finished} onClick={() => playback.skipToEnd()}>
            Skip
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          <PhaserGame battle={battle} />
          {finished && (
            <div className="absolute inset-x-0 bottom-6 flex justify-center">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/15 bg-black/80 px-4 py-3">
                <span className="mr-2 font-semibold">
                  {outcome} after {result.turns} turns
                </span>
                <button type="button" className={primaryButton} onClick={onAdjust}>
                  Adjust Battle Plan
                </button>
                <button type="button" className={button} onClick={onRematch}>
                  Fight again
                </button>
                <button type="button" className={button} onClick={onReplay}>
                  Replay
                </button>
                <button type="button" className={button} onClick={onEncounters}>
                  Encounters
                </button>
              </div>
            </div>
          )}
        </main>
        <aside className="flex w-96 shrink-0 flex-col border-l border-white/10">
          <h3 className="border-b border-white/10 px-3 py-2 text-sm font-semibold">Battle Log</h3>
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
