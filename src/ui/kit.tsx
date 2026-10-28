import { useMemo, type ReactNode } from 'react'
import { elementName } from '../core/log'
import type { CreatureDef, Element } from '../core/types'
import { ELEMENT_GLOW, ELEMENT_HEX, ELEMENT_TEXT, artUrl, backdropUrl } from './styles'

/** Night sky, twinkling stars and drifting motes of Spire light. */
export function Ambience({ backdrop, motes = 14, dim = 0.6 }: { backdrop?: string; motes?: number; dim?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: motes }, (_, i) => ({
        left: `${(i * 37 + 11) % 100}%`,
        delay: `${-((i * 1.7) % 14)}s`,
        duration: `${12 + ((i * 3.1) % 10)}s`,
        dx: `${((i * 23) % 80) - 40}px`,
        size: 2 + ((i * 7) % 4),
      })),
    [motes],
  )
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden sky">
      {backdrop && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backdropUrl(backdrop)})`, opacity: 1 - dim, filter: 'saturate(1.1)' }}
        />
      )}
      <div className="absolute inset-0 stars" />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 120%, rgba(0,0,0,0.6), transparent 60%)' }} />
      {particles.map((p, i) => (
        <span
          key={i}
          className="mote"
          style={{ left: p.left, bottom: '-10px', width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.duration, ['--dx' as string]: p.dx }}
        />
      ))}
    </div>
  )
}

/** The Sigil: rotating rune rings with the Oathkeeper mark at the center. */
export function Sigil({ size = 220, className = '', glow = true }: { size?: number; className?: string; glow?: boolean }) {
  const runes = 'ᚨᛟᚦᛉᛞᚱᛊᛏᛗᛚᚾᛁᛃᛇᛈᛋ'
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" className="absolute inset-0 spin-slow" aria-hidden>
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff3d1" />
            <stop offset="1" stopColor="#b48a3e" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="94" fill="none" stroke="url(#sg)" strokeWidth="1" opacity="0.7" />
        <circle cx="100" cy="100" r="86" fill="none" stroke="url(#sg)" strokeWidth="0.6" strokeDasharray="2 5" opacity="0.6" />
        {[...runes].map((r, i) => {
          const a = (i / runes.length) * Math.PI * 2
          return (
            <text key={i} x={100 + Math.cos(a) * 90 - 3} y={100 + Math.sin(a) * 90 + 3} fontSize="8" fill="#f0d08a" opacity="0.75">
              {r}
            </text>
          )
        })}
      </svg>
      <svg viewBox="0 0 200 200" className="absolute inset-0 spin-rev" aria-hidden>
        <polygon points="100,22 168,140 32,140" fill="none" stroke="#e6c47a" strokeWidth="0.8" opacity="0.55" />
        <polygon points="100,178 32,60 168,60" fill="none" stroke="#e6c47a" strokeWidth="0.8" opacity="0.55" />
        <circle cx="100" cy="100" r="58" fill="none" stroke="#e6c47a" strokeWidth="0.8" opacity="0.5" />
      </svg>
      <svg viewBox="0 0 200 200" className={`absolute inset-0 ${glow ? 'pulse-glow' : ''}`} aria-hidden>
        <path d="M100 62 L114 100 L100 138 L86 100 Z" fill="url(#sg)" opacity="0.95" />
        <circle cx="100" cy="100" r="10" fill="#fff6dc" />
        <path d="M70 100 H86 M114 100 H130 M100 48 V62 M100 138 V152" stroke="#fff1c9" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

export function Divider({ children }: { children?: ReactNode }) {
  return <div className="divider label-caps">{children ?? '◆'}</div>
}

export function ElementGem({ element, className = '' }: { element: Element; className?: string }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rotate-45 ${className}`}
      style={{ background: ELEMENT_HEX[element], boxShadow: `0 0 8px ${ELEMENT_HEX[element]}` }}
      title={elementName(element)}
    />
  )
}

export function ElementLabel({ element }: { element: Element }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-display text-[0.65rem] tracking-[0.18em] uppercase ${ELEMENT_TEXT[element]}`}>
      <ElementGem element={element} />
      {elementName(element)}
    </span>
  )
}

export function CreatureArt({
  creature,
  flip = false,
  className = '',
  halo = true,
  dim = false,
}: {
  creature: CreatureDef
  flip?: boolean
  className?: string
  halo?: boolean
  dim?: boolean
}) {
  return (
    <div className={`relative ${halo ? 'halo' : ''} ${className}`} style={{ ['--glow' as string]: ELEMENT_GLOW[creature.element] }}>
      <img
        src={artUrl(creature.id)}
        alt={creature.name}
        draggable={false}
        loading="lazy"
        className={`h-full w-full object-contain ${dim ? 'opacity-60' : 'creature-shadow'} ${flip ? '-scale-x-100' : ''}`}
        style={dim ? { filter: 'brightness(0) drop-shadow(0 0 5px rgba(170, 150, 255, 0.45))' } : undefined}
      />
    </div>
  )
}

export function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="tracking-tight text-gold" aria-label={`Mastery ${value} of ${max}`}>
      {'★'.repeat(value)}
      <span className="text-white/20">{'★'.repeat(max - value)}</span>
    </span>
  )
}

export function Bar({ value, max, color = '#e6c47a', className = '' }: { value: number; max: number; color?: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10 ${className}`}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}aa, ${color})` }} />
    </div>
  )
}

/** Screen header with a back button and a centered title. */
export function ScreenHeader({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gold/20 bg-night/80 px-3 py-2.5 backdrop-blur-md">
      {onBack ? (
        <button type="button" className="btn-icon shrink-0" onClick={onBack} aria-label="Back">
          ‹
        </button>
      ) : (
        <span className="w-9" />
      )}
      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate font-display text-base tracking-[0.12em] text-gold-bright">{title}</h1>
        {subtitle && <p className="truncate text-xs text-mist">{subtitle}</p>}
      </div>
      <div className="flex min-w-9 shrink-0 justify-end">{right}</div>
    </header>
  )
}

/** Bottom sheet on phones, centered dialog on wide screens. */
export function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-[2px] sm:items-center" onClick={onClose}>
      <div className="ornate fade-in max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-b-none p-4 sm:rounded-b-md safe-bottom" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export function ShardIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`inline-block h-4 w-4 ${className}`} aria-hidden>
      <path d="M8 1 L13 6 L8 15 L3 6 Z" fill="url(#shardg)" stroke="#fff3d1" strokeWidth="0.6" />
      <defs>
        <linearGradient id="shardg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6dc" />
          <stop offset="1" stopColor="#c9a253" />
        </linearGradient>
      </defs>
    </svg>
  )
}
