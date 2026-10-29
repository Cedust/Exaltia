import { useState } from 'react'
import { Ambience, Sigil } from '../kit'

export function TitleScreen({ hasSave, onContinue, onNew }: { hasSave: boolean; onContinue: () => void; onNew: () => void }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-6 py-10 text-center">
      <Ambience motes={22} />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center opacity-25 blur-[2px]"
        style={{ backgroundImage: 'url(art/map/world.webp)', maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)' }}
      />
      <div className="rise-in relative flex flex-col items-center">
        <Sigil size={190} className="mb-2 opacity-90" />
        <h1 className="title-display text-5xl font-bold sm:text-7xl">EXALTIA</h1>
        <p className="shimmer-text mt-2 font-display text-sm tracking-[0.42em] sm:text-base">PARAGONS OF THE OATH</p>
        <p className="lore mt-6 max-w-sm text-lg text-mist">
          Sixteen Paragons once swore the Oath. Then the Spire shattered, and every Oath was broken.
        </p>
      </div>
      <div className="fade-in mt-10 flex w-full max-w-xs flex-col gap-3" style={{ animationDelay: '0.6s' }}>
        {hasSave && (
          <button type="button" className="btn-oath" onClick={onContinue}>
            Continue Journey
          </button>
        )}
        {!confirm ? (
          <button type="button" className={hasSave ? 'btn-ghost' : 'btn-oath'} onClick={() => (hasSave ? setConfirm(true) : onNew())}>
            New Journey
          </button>
        ) : (
          <div className="ornate-soft flex flex-col gap-2 p-3">
            <p className="text-sm text-mist">Start over? Your current journey will be lost.</p>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={() => setConfirm(false)}>
                Keep it
              </button>
              <button type="button" className="btn-oath flex-1 !px-3" onClick={onNew}>
                Start over
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="absolute bottom-3 text-xs tracking-widest text-mist/60">MVP · v0.1</p>
    </div>
  )
}
