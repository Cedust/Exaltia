import { useEffect, useRef } from 'react'
import { REGIONS, SPIRE } from '../../data/world'
import { regionOpen, spireAction, tournamentWon } from '../../game/campaign'
import { actOf, type SaveState } from '../../game/save'
import { ElementGem } from '../kit'
import { ELEMENT_HEX, characterUrl } from '../styles'


/** The world map: pan on phones, region markers that open the region sheet. */
export function MapView({ save, onRegion, onSpire }: { save: SaveState; onRegion: (id: string) => void; onSpire: () => void }) {
  const scroller = useRef<HTMLDivElement>(null)
  const prologue = actOf(save) === 'prologue'
  const action = spireAction(save)

  useEffect(() => {
    const el = scroller.current
    if (el) {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
      el.scrollTop = (el.scrollHeight - el.clientHeight) * 0.35
    }
  }, [])

  return (
    <div ref={scroller} className="scrollbar-none relative h-full w-full overflow-auto">
      <div className="relative mx-auto" style={{ aspectRatio: '3 / 2', minWidth: '100%', minHeight: '100%', width: 'max(100%, calc(100dvh * 1.35))' }}>
        <img src="art/map/world.webp" alt="The world of Exaltia" className="absolute inset-0 h-full w-full select-none object-cover" draggable={false} />
        {/* Vignette and, in the Prologue, the mist that still hides the world. */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
          style={{
            background: prologue
              ? 'radial-gradient(circle at 50% 37%, transparent 0%, transparent 11%, rgba(10,9,24,0.88) 22%, rgba(10,9,24,0.97) 45%)'
              : 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(10,9,24,0.75) 100%)',
          }}
        />

        {!prologue &&
          REGIONS.map((region) => {
            const open = regionOpen(save, region.id)
            const won = tournamentWon(save, region.id)
            return (
              <button
                key={region.id}
                type="button"
                className="map-pin group flex flex-col items-center"
                style={{ left: `${region.x}%`, top: `${region.y}%` }}
                onClick={() => onRegion(region.id)}
              >
                <span className="relative flex h-9 w-9 items-center justify-center">
                  {open && !won && <span className="ring absolute inset-0 rounded-full border-2" style={{ borderColor: ELEMENT_HEX[region.element] }} />}
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 bg-night/85 shadow-lg"
                    style={{ borderColor: open ? ELEMENT_HEX[region.element] : '#555', boxShadow: open ? `0 0 16px ${ELEMENT_HEX[region.element]}` : 'none' }}
                  >
                    {won ? <span className="text-sm text-gold-bright">✦</span> : open ? <ElementGem element={region.element} /> : <span className="text-xs text-white/40">🔒</span>}
                  </span>
                </span>
                <span
                  className={`mt-1 whitespace-nowrap rounded-sm px-2 py-0.5 font-display text-[0.68rem] tracking-[0.12em] shadow ${open ? 'bg-night/80 text-gold-bright' : 'bg-night/70 text-white/45'}`}
                >
                  {region.name}
                </span>
              </button>
            )
          })}

        {/* The Spire in the center */}
        <button type="button" className="map-pin flex flex-col items-center" style={{ left: `${SPIRE.x}%`, top: `${SPIRE.y}%` }} onClick={onSpire}>
          <span className="relative flex h-12 w-12 items-center justify-center">
            {action && <span className="ring absolute inset-0 rounded-full border-2 border-gold" />}
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-gold bg-night/90 shadow-[0_0_24px_rgba(255,220,150,0.6)]">
              {action === 'duel' || action === 'finale' ? (
                <img src={characterUrl('cassian')} alt="" className="h-full w-full object-cover object-top" />
              ) : action === 'trial' ? (
                <img src={characterUrl('hesper')} alt="" className="h-full w-full object-cover object-top" />
              ) : (
                <span className="text-lg text-gold-bright">✧</span>
              )}
            </span>
          </span>
          <span className="mt-1 whitespace-nowrap rounded-sm bg-night/85 px-2 py-0.5 font-display text-[0.7rem] tracking-[0.12em] text-gold-bright">
            {action === 'trial' ? 'The First Trial' : action === 'duel' ? 'Cassian awaits' : action === 'finale' ? 'The Spire Reforged' : SPIRE.name}
          </span>
        </button>
      </div>
    </div>
  )
}
