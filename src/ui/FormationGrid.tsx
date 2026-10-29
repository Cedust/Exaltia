import { useState } from 'react'
import type { Lane, Row, Side } from '../core/types'
import { CONTENT } from '../data'
import { LANES, LANE_NAMES, moveTo, occupant, type DuelSlot, type TargetPreview } from '../game/duel'
import { CreatureArt } from './kit'
import { haptic } from './prepare'
import { ELEMENT_TEXT } from './styles'

/**
 * The battlefield as a grid: you on the left, the opponent on the right, Lanes Top / Middle / Bottom as rows.
 * Tap one of your creatures, then a cell, to move it (or swap). Arrows show who attacks whom first.
 */

// Five columns: your Back, your Front, a narrow one for the Lane names, their Front, their Back.
// COLUMNS sets the grid; CENTER is the middle of each creature column in percent, for the arrows.
const COLUMNS = 'grid-cols-[23fr_23fr_8fr_23fr_23fr]'
const CENTER: Record<Side, Record<Row, number>> = { player: { back: 11.5, front: 34.5 }, enemy: { front: 65.5, back: 88.5 } }
const center = (side: Side, slot: DuelSlot) => ({ x: CENTER[side][slot.row], y: slot.lane * 33.33 + 16.67 })

export function FormationGrid<T extends DuelSlot>({
  player,
  enemy,
  opponent,
  preview,
  onChange,
}: {
  player: T[]
  enemy: DuelSlot[]
  opponent: string
  preview?: TargetPreview
  onChange?: (player: T[]) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [showArrows, setShowArrows] = useState(true)

  const tap = (lane: Lane, row: Row) => {
    if (!onChange) return
    haptic()
    const here = occupant(player, lane, row)
    if (selected === null) return setSelected(here >= 0 ? here : null)
    if (here !== selected) onChange(moveTo(player, selected, lane, row))
    setSelected(null)
  }

  const cell = (side: Side, lane: Lane, row: Row) => {
    const slots = side === 'player' ? player : enemy
    const index = occupant(slots, lane, row)
    const slot = slots[index]
    const creature = slot && CONTENT.creatures[slot.creature]
    const open = slot && preview?.open[side][index]
    const editable = side === 'player' && !!onChange
    const isSelected = editable && selected === index && index >= 0
    const target = editable && selected !== null && !isSelected
    return (
      <button
        key={`${side}-${lane}-${row}`}
        type="button"
        disabled={!editable}
        onClick={() => tap(lane, row)}
        aria-label={`${side === 'player' ? 'Your' : 'Their'} ${LANE_NAMES[lane]} ${row}${creature ? `: ${creature.name}` : ''}`}
        className={`relative flex h-24 min-w-0 flex-col items-center justify-center rounded-md border transition ${
          isSelected ? 'border-gold bg-gold/20 shadow-[0_0_16px_rgba(230,196,122,0.4)]' : target ? 'border-gold/50 border-dashed bg-gold/5' : 'border-gold/10 bg-black/25'
        } ${row === 'front' ? 'bg-white/[0.03]' : ''}`}
      >
        {creature ? (
          <>
            <CreatureArt creature={creature} className="h-14 w-14" halo={false} flip={side === 'enemy'} />
            <span className={`line-clamp-2 w-full px-0.5 text-center text-2xs font-bold leading-tight ${ELEMENT_TEXT[creature.element]}`}>{creature.name}</span>
            {slot.row === 'back' && preview && (
              <span
                className={`absolute top-0.5 text-xs ${side === 'player' ? 'left-1' : 'right-1'} ${open ? 'text-red-300' : 'text-gold/80'}`}
                title={open ? 'Open: no Front ally guards this Lane' : 'Protected by the Front ally in its Lane'}
              >
                {open ? '◇' : '◆'}
              </span>
            )}
          </>
        ) : (
          <span className="text-2xs uppercase tracking-widest text-mist/30">{row}</span>
        )}
      </button>
    )
  }

  return (
    <div className="space-y-1">
      {(onChange || preview) && (
        <div className="flex min-h-11 items-center gap-2 pb-1">
          <p className={`min-w-0 flex-1 px-1 text-sm leading-snug ${selected !== null ? 'text-gold-bright' : 'text-mist/80'}`}>
            {onChange && (selected !== null && player[selected]
              ? `Move ${CONTENT.creatures[player[selected].creature].name}: tap a cell, or another creature to swap.`
              : 'Tap one of your creatures to move it.')}
          </p>
          {preview && (
            <button
              type="button"
              aria-pressed={showArrows}
              aria-label={showArrows ? 'Hide target arrows' : 'Show target arrows'}
              onClick={() => {
                haptic()
                setShowArrows((v) => !v)
              }}
              className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 font-display text-2xs uppercase tracking-wider transition ${
                showArrows ? 'border-gold bg-gold/20 text-gold-bright' : 'border-gold/30 bg-black/30 text-mist'
              }`}
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
                <path d="M2 13 L12 4 M8 3.5 H12.5 V8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Targets
            </button>
          )}
        </div>
      )}
      <div className={`grid ${COLUMNS} gap-1 text-center`}>
        <span className="label-caps col-span-2 !text-2xs">You</span>
        <span />
        <span className="label-caps col-span-2 truncate !text-2xs">{opponent}</span>
        <span className="text-2xs uppercase tracking-widest text-mist/70">Back</span>
        <span className="text-2xs uppercase tracking-widest text-mist/70">Front</span>
        <span />
        <span className="text-2xs uppercase tracking-widest text-mist/70">Front</span>
        <span className="text-2xs uppercase tracking-widest text-mist/70">Back</span>
      </div>
      <div className="relative">
        <div className={`grid ${COLUMNS} gap-1`}>
          {LANES.map((lane) => [
            cell('player', lane, 'back'),
            cell('player', lane, 'front'),
            <div key={`name-${lane}`} className="flex items-center justify-center">
              <span className="font-display text-2xs uppercase tracking-[0.18em] text-gold/60 [writing-mode:vertical-rl] rotate-180">{LANE_NAMES[lane]}</span>
            </div>,
            cell('enemy', lane, 'front'),
            cell('enemy', lane, 'back'),
          ])}
        </div>
        {preview && showArrows && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <defs>
              {(['player', 'enemy'] as Side[]).map((side) => (
                <marker key={side} id={`tip-${side}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill={side === 'player' ? '#e6c47a' : '#ff8a7a'} />
                </marker>
              ))}
            </defs>
            {preview.arrows.map((a, i) => {
              const from = a.side === 'player' ? player[a.from] : enemy[a.from]
              const to = a.side === 'player' ? enemy[a.to] : player[a.to]
              if (!from || !to) return null
              const other: Side = a.side === 'player' ? 'enemy' : 'player'
              const p = center(a.side, from)
              const q = center(other, to)
              // Your arrows run a little above the centre line, theirs a little below, so both stay visible.
              const dy = a.side === 'player' ? -4 : 4
              const dx = a.side === 'player' ? 6 : -6
              return (
                <line
                  key={i}
                  x1={p.x + dx}
                  y1={p.y + dy}
                  x2={q.x - dx}
                  y2={q.y + dy}
                  stroke={a.side === 'player' ? '#e6c47a' : '#ff8a7a'}
                  strokeOpacity={0.75}
                  strokeWidth={1.6}
                  strokeDasharray={a.snipe ? '3 2' : undefined}
                  vectorEffect="non-scaling-stroke"
                  markerEnd={`url(#tip-${a.side})`}
                />
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
}
