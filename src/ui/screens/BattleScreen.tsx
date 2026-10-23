import { useEffect, useMemo, useRef, useState } from 'react'
import { formatBattleLog } from '../../core/log'
import type { BattleResult } from '../../core/types'
import type { Encounter } from '../../data/world'
import { Playback, type Orientation } from '../../view/BattleScene'
import { PhaserGame } from '../../view/PhaserGame'
import { backdropUrl } from '../styles'

const SPEEDS = [1, 2, 4]

function currentOrientation(): Orientation {
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
}

/** The battle itself: the canvas replays the result while the player watches their plan unfold. */
export function BattleScreen({
  encounter,
  result,
  speed,
  onSpeed,
  onDone,
}: {
  encounter: Encounter
  result: BattleResult
  speed: number
  onSpeed: (speed: number) => void
  onDone: () => void
}) {
  // startAt: where a remounted scene (after a rotation) resumes playback.
  const [view, setView] = useState(() => ({ orientation: currentOrientation(), startAt: 0 }))
  const [progress, setProgress] = useState(0)
  const [logOpen, setLogOpen] = useState(false)
  const [playback] = useState(() => new Playback(speed))
  const progressRef = useRef(0)
  const lines = useMemo(() => formatBattleLog(result.events), [result])
  const logEnd = useRef<HTMLDivElement>(null)
  const finished = progress >= result.events.length - 1

  useEffect(() => {
    const onResize = () => {
      const orientation = currentOrientation()
      setView((v) => (v.orientation === orientation ? v : { orientation, startAt: progressRef.current }))
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    playback.setSpeed(speed)
  }, [playback, speed])

  useEffect(() => {
    if (logOpen) logEnd.current?.scrollIntoView({ block: 'end' })
  }, [logOpen, progress])

  const battle = useMemo(
    () => ({
      result,
      playback,
      backdrop: encounter.backdrop,
      startAt: view.startAt,
      onProgress: (i: number) => {
        progressRef.current = i
        setProgress(i)
      },
    }),
    [result, playback, encounter.backdrop, view],
  )

  const visible = lines.filter((l) => l.event <= progress)
  const won = result.winner === 'player'

  return (
    <div className="fixed inset-0 flex flex-col bg-night">
      <div className="relative z-10 flex items-center gap-2 border-b border-gold/20 bg-night/85 px-3 py-2 backdrop-blur">
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-sm tracking-[0.12em] text-gold-bright">{encounter.name}</div>
          <div className="truncate text-[0.7rem] text-mist">vs {encounter.opponent}</div>
        </div>
        <div className="flex overflow-hidden rounded-full border border-gold/40">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeed(s)}
              className={`px-2.5 py-1 font-display text-xs ${s === speed ? 'bg-gold/25 text-gold-bright' : 'text-mist'}`}
            >
              {s}×
            </button>
          ))}
        </div>
        <button type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={() => setLogOpen((o) => !o)}>
          Log
        </button>
        {!finished && (
          <button type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={() => playback.skipToEnd()}>
            Skip
          </button>
        )}
      </div>

      <div className="relative flex-1">
        <div className="absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-md" style={{ backgroundImage: `url(${backdropUrl(encounter.backdrop)})` }} />
        <PhaserGame key={view.orientation} battle={battle} orientation={view.orientation} />

        {logOpen && (
          <div className="absolute inset-x-0 bottom-0 z-20 max-h-[45%] overflow-y-auto border-t border-gold/30 bg-night/92 px-3 py-2 text-xs leading-relaxed text-mist backdrop-blur fade-in sm:inset-x-auto sm:right-0 sm:top-0 sm:max-h-none sm:w-96 sm:border-l sm:border-t-0">
            <div className="label-caps mb-1 flex items-center justify-between">
              <span>Battle Log</span>
              <button type="button" className="text-gold" onClick={() => setLogOpen(false)}>
                close ✕
              </button>
            </div>
            {visible.map((line, i) => (
              <div key={i} className={line.text.startsWith('Turn') ? 'mt-1 text-ivory' : ''}>
                {line.text}
              </div>
            ))}
            <div ref={logEnd} />
          </div>
        )}

        {finished && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center pb-6 safe-bottom">
            <button type="button" className="btn-oath pointer-events-auto rise-in min-w-56" onClick={onDone}>
              {won ? 'Claim your reward' : 'Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
