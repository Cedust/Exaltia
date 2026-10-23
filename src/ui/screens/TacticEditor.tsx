import { describeTarget, elementName } from '../../core/log'
import { RULES } from '../../core/rules'
import { statusName } from '../../core/statuses'
import type { Condition, SkillDef, Tactic } from '../../core/types'
import { describeSkill } from '../describeSkill'
import {
  CONDITION_DEFAULTS,
  CONDITION_HELP,
  CONDITION_LABELS,
  COUNT_OPTIONS,
  ESSENCE_OPTIONS,
  PERCENT_OPTIONS,
  STATUS_IDS,
  TARGET_OPTIONS,
  WEAKNESS_ELEMENTS,
} from '../tactics'

function Choice<T extends string | number>({
  value,
  options,
  label = String,
  onChange,
  className = '',
}: {
  value: T
  options: T[]
  label?: (value: T) => string
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <select className={`field ${className}`} value={value} onChange={(e) => onChange(options.find((o) => String(o) === e.target.value)!)}>
      {options.map((option) => (
        <option key={option} value={option}>
          {label(option)}
        </option>
      ))}
    </select>
  )
}

function ConditionParam({ condition, onChange }: { condition: Condition; onChange: (c: Condition) => void }) {
  switch (condition.type) {
    case 'enemyWeakTo':
      return <Choice value={condition.element} options={WEAKNESS_ELEMENTS} label={elementName} onChange={(element) => onChange({ ...condition, element })} />
    case 'enemiesAtLeast':
      return <Choice value={condition.count} options={COUNT_OPTIONS} onChange={(count) => onChange({ ...condition, count })} />
    case 'allyLifeforceBelow':
    case 'selfLifeforceBelow':
    case 'enemyLifeforceBelow':
      return <Choice value={condition.percent} options={PERCENT_OPTIONS} label={(v) => `${v}%`} onChange={(percent) => onChange({ ...condition, percent })} />
    case 'selfEssenceAtLeast':
      return <Choice value={condition.amount} options={ESSENCE_OPTIONS} onChange={(amount) => onChange({ ...condition, amount })} />
    case 'enemyWithoutStatus':
    case 'enemyHasStatus':
    case 'allyWithoutStatus':
      return <Choice value={condition.status} options={STATUS_IDS} label={statusName} onChange={(status) => onChange({ ...condition, status })} />
    default:
      return null
  }
}

/** Edits one creature's Battle Plan: Tactics checked top-down, Basic Attack as fallback. Built for thumbs. */
export function TacticEditor({
  skills,
  basicAttack,
  tactics,
  slots,
  conditions,
  onChange,
}: {
  skills: SkillDef[]
  basicAttack: SkillDef
  tactics: Tactic[]
  slots: number
  conditions: Condition['type'][]
  onChange: (tactics: Tactic[]) => void
}) {
  const update = (index: number, patch: Partial<Tactic>) => onChange(tactics.map((t, i) => (i === index ? { ...t, ...patch } : t)))
  const move = (from: number, to: number) => {
    if (to < 0 || to >= tactics.length) return
    const next = [...tactics]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }
  const usable = skills.filter((s) => s.id !== basicAttack.id)
  const add = () => {
    const skill = usable.find((s) => !tactics.some((t) => t.skill === s.id)) ?? usable[0]
    if (skill) onChange([...tactics, { condition: { type: 'always' }, skill: skill.id, target: skill.selfOnly ? 'self' : 'lowestLifeforce' }])
  }
  const conditionTypes = Object.keys(CONDITION_LABELS).filter((type) => conditions.includes(type as Condition['type'])) as Condition['type'][]

  return (
    <div className="space-y-2.5">
      {tactics.slice(0, Math.max(slots, tactics.length)).map((tactic, i) => {
        const skill = skills.find((s) => s.id === tactic.skill)
        const locked = i >= slots
        const types = conditionTypes.includes(tactic.condition.type) ? conditionTypes : [...conditionTypes, tactic.condition.type]
        return (
          <div key={i} className={`rounded-md border border-gold/25 bg-black/30 p-2.5 ${locked ? 'opacity-40' : ''}`}>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gold/60 font-display text-xs text-gold-bright">{i + 1}</span>
              <span className="label-caps flex-1 !text-[0.6rem]">{locked ? 'Slot locked in this Act' : 'Tactic'}</span>
              <button type="button" className="btn-icon !h-7 !w-7 text-xs" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move up">
                ↑
              </button>
              <button type="button" className="btn-icon !h-7 !w-7 text-xs" disabled={i === tactics.length - 1} onClick={() => move(i, i + 1)} aria-label="Move down">
                ↓
              </button>
              <button type="button" className="btn-icon !h-7 !w-7 text-xs" onClick={() => onChange(tactics.filter((_, j) => j !== i))} aria-label="Remove">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-[2.6rem_1fr] items-center gap-x-2 gap-y-1.5 text-sm">
              <span className="label-caps !text-[0.6rem] text-right">If</span>
              <div className="flex gap-1.5">
                <select
                  className="field"
                  value={tactic.condition.type}
                  onChange={(e) => update(i, { condition: CONDITION_DEFAULTS[e.target.value as Condition['type']] })}
                >
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {CONDITION_LABELS[type]}
                    </option>
                  ))}
                </select>
                {tactic.condition.type !== 'always' && (
                  <div className="w-[42%] shrink-0">
                    <ConditionParam condition={tactic.condition} onChange={(condition) => update(i, { condition })} />
                  </div>
                )}
              </div>
              <span className="label-caps !text-[0.6rem] text-right">Use</span>
              <select className="field" value={tactic.skill} onChange={(e) => update(i, { skill: e.target.value })}>
                {usable.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.cost} ESS
                  </option>
                ))}
              </select>
              <span className="label-caps !text-[0.6rem] text-right">On</span>
              <select className="field" value={tactic.target} onChange={(e) => update(i, { target: e.target.value as Tactic['target'] })}>
                {TARGET_OPTIONS.map((target) => (
                  <option key={target} value={target}>
                    {describeTarget(target)}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1.5 text-[0.72rem] leading-snug text-mist">
              {skill ? describeSkill(skill) : 'Unknown skill'} · <span className="italic">{CONDITION_HELP[tactic.condition.type]}</span>
            </p>
          </div>
        )
      })}
      {tactics.length < Math.min(slots, RULES.maxTacticSlots) && usable.length > 0 && (
        <button type="button" onClick={add} className="w-full rounded-md border border-dashed border-gold/40 py-2 font-display text-xs tracking-[0.15em] text-gold hover:bg-gold/5">
          + ADD TACTIC ({tactics.length}/{slots})
        </button>
      )}
      <p className="px-1 text-xs text-mist">
        Otherwise → <span className="text-ivory">Basic Attack</span> on the nearest Lane.
      </p>
    </div>
  )
}
