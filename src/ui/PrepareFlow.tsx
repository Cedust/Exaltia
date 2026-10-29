import { useState, type ReactNode } from 'react'
import { Ambience } from './kit'
import { haptic, type FlowStep } from './prepare'

/**
 * The shell for every screen before a fight: a header, a step bar, one step at a time, and an action bar whose
 * button bottom right walks through the steps. Only the last step's button starts the fight.
 *
 * Each step scrolls on its own and starts at the top, so nothing outside can move the scroll position.
 */

export interface FlowAction {
  label: ReactNode
  onClick: () => void
  disabled?: boolean
  /** The button that starts the fight glows. */
  fight?: boolean
}

export function PrepareFlow({
  backdrop,
  header,
  steps,
  current,
  hint,
  back,
  next,
  children,
}: {
  backdrop?: string
  header: ReactNode
  steps: FlowStep[]
  current: number
  /** One line above the action bar: what is missing, or what happens next. */
  hint?: ReactNode
  /** Bottom left: usually the previous step. */
  back?: { label: string; onClick: () => void }
  /** Bottom right: the next step, or the fight. */
  next: FlowAction
  children: ReactNode
}) {
  // Slide the new step in from the side it comes from.
  const [shown, setShown] = useState({ index: current, dir: 1 })
  if (shown.index !== current) setShown({ index: current, dir: current > shown.index ? 1 : -1 })

  return (
    <div className="fixed inset-0 flex flex-col">
      <Ambience backdrop={backdrop} dim={0.72} motes={6} />
      <div className="safe-top shrink-0 border-b border-gold/20 bg-night/85 backdrop-blur-md">
        {header}
        <StepBar steps={steps} current={current} />
      </div>

      <div key={steps[current]?.id} className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain ${shown.dir > 0 ? 'step-in-next' : 'step-in-prev'}`}>
        <div className="mx-auto max-w-xl px-3 pb-6 pt-4">{children}</div>
      </div>

      <footer className="safe-bottom relative shrink-0 border-t border-gold/25 bg-night/95 px-3 pt-2.5 shadow-[0_-12px_30px_rgba(0,0,0,0.5)]">
        <div className="mx-auto max-w-xl">
          {hint && <div className="mb-2 text-center text-xs text-mist">{hint}</div>}
          <div className="flex items-center gap-2.5">
            {back && (
              <button type="button" className="btn-ghost shrink-0 !px-3.5" onClick={back.onClick}>
                ‹ {back.label}
              </button>
            )}
            <button
              type="button"
              className={`btn-oath min-w-0 flex-1 !px-4 ${next.fight && !next.disabled ? 'fight-ready' : ''}`}
              disabled={next.disabled}
              onClick={() => {
                haptic(next.fight ? 25 : 10)
                next.onClick()
              }}
            >
              <span className="truncate">{next.label}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

/** Numbered diamonds on a gold line: done steps are ticked and can be revisited. */
function StepBar({ steps, current }: { steps: FlowStep[]; current: number }) {
  return (
    <nav className="mx-auto flex max-w-xl px-2 pb-2 pt-1" aria-label="Preparation steps">
      {steps.map((step, i) => {
        const active = i === current
        const reachable = !active && !!step.onSelect
        return (
          <button
            key={step.id}
            type="button"
            disabled={!reachable}
            onClick={() => {
              haptic()
              step.onSelect?.()
            }}
            aria-current={active ? 'step' : undefined}
            className="group relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-start gap-1 disabled:cursor-default"
          >
            {/* The line runs from this step's diamond to the next one. */}
            {i < steps.length - 1 && (
              <span className={`absolute left-1/2 top-[0.8rem] h-px w-full ${i < current ? 'bg-gold/70' : 'bg-gold/20'}`} aria-hidden />
            )}
            <span
              className={`relative z-10 mt-1 flex h-5 w-5 rotate-45 items-center justify-center border transition ${
                active
                  ? 'border-gold-bright bg-gold shadow-[0_0_14px_rgba(255,220,150,0.8)]'
                  : step.done
                    ? 'border-gold bg-gold/30'
                    : 'border-gold/35 bg-night'
              }`}
            >
              <span className={`-rotate-45 font-display text-2xs leading-none ${active ? 'font-bold text-night' : step.done ? 'text-gold-bright' : 'text-mist/70'}`}>
                {step.done && !active ? '✓' : i + 1}
              </span>
            </span>
            <span
              className={`max-w-full truncate px-0.5 font-display text-2xs uppercase tracking-[0.02em] ${active ? 'text-gold-bright' : step.done ? 'text-gold/80' : 'text-mist/60'}`}
            >
              {step.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

/** Compact title row inside the flow header. */
export function FlowHeader({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-1">
      {onBack ? (
        <button type="button" className="btn-icon shrink-0" onClick={onBack} aria-label="Back">
          ‹
        </button>
      ) : (
        <span className="w-11 shrink-0" />
      )}
      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate font-display text-lg tracking-[0.1em] text-gold-bright">{title}</h1>
        {subtitle && <p className="truncate text-xs text-mist">{subtitle}</p>}
      </div>
      <div className="flex w-11 shrink-0 justify-end">{right}</div>
    </div>
  )
}
