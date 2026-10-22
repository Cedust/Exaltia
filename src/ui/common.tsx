import { elementName } from '../core/log'
import type { CreatureDef, Element, Position, Side, Team } from '../core/types'
import { CONTENT } from '../data'
import { ELEMENT_TEXT, artUrl } from './styles'

export function ElementLabel({ element }: { element: Element }) {
  return <span className={`text-xs font-semibold uppercase tracking-wide ${ELEMENT_TEXT[element]}`}>{elementName(element)}</span>
}

export function CreatureArt({ creature, flip = false, className = '' }: { creature: CreatureDef; flip?: boolean; className?: string }) {
  return (
    <img
      src={artUrl(creature.id)}
      alt={creature.name}
      draggable={false}
      className={`object-contain ${flip ? '-scale-x-100' : ''} ${className}`}
    />
  )
}

const LANES = [0, 1, 2] as const

/**
 * One side of the Lane grid. The player side shows Back | Front (facing right),
 * the enemy side Front | Back, matching the battle screen.
 */
export function FormationGrid({
  team,
  side,
  selected,
  onCellClick,
  size = 'md',
}: {
  team: Team
  side: Side
  selected?: string | null
  onCellClick?: (position: Position) => void
  size?: 'sm' | 'md'
}) {
  const rows = side === 'player' ? (['back', 'front'] as const) : (['front', 'back'] as const)
  const cell = size === 'sm' ? 'h-16 w-16' : 'h-28 w-28'
  return (
    <div className="inline-grid grid-cols-2 gap-1.5">
      {rows.map((row) => (
        <div key={row} className="text-center text-[11px] uppercase tracking-wide text-physical">
          {row}
        </div>
      ))}
      {LANES.flatMap((lane) =>
        rows.map((row) => {
          const member = team.members.find((m) => m.position.lane === lane && m.position.row === row)
          const creature = member && CONTENT.creatures[member.creature]
          const isSelected = !!member && member.creature === selected
          return (
            <button
              key={`${lane}-${row}`}
              type="button"
              disabled={!onCellClick}
              onClick={() => onCellClick?.({ lane, row })}
              title={`Lane ${lane + 1} ${row}`}
              className={`${cell} relative flex items-center justify-center rounded border transition ${
                side === 'player' ? 'border-ice/50' : 'border-fire/50'
              } ${isSelected ? 'border-2 border-[#ffe28a] bg-white/10' : 'bg-white/[0.03]'} ${onCellClick ? 'hover:bg-white/10' : ''}`}
            >
              {creature ? (
                <>
                  <CreatureArt creature={creature} flip={side === 'enemy'} className="h-full w-full p-1" />
                  {size === 'md' && (
                    <span className={`absolute bottom-0.5 text-[11px] font-semibold ${ELEMENT_TEXT[creature.element]}`}>
                      {creature.name}
                    </span>
                  )}
                </>
              ) : (
                size === 'md' && <span className="text-[11px] text-white/20">Lane {lane + 1}</span>
              )}
            </button>
          )
        }),
      )}
    </div>
  )
}
