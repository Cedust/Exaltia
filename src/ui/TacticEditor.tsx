import { describeTarget, elementName } from '../core/log'
import { describeSkill } from './describeSkill'
import { RULES } from '../core/rules'
import type { Condition, CreatureDef, Tactic } from '../core/types'
import { CONTENT } from '../data'
import { field } from './styles'
import {
  CONDITION_DEFAULTS,
  CONDITION_LABELS,
  COUNT_OPTIONS,
  ESSENCE_OPTIONS,
  PERCENT_OPTIONS,
  TARGET_OPTIONS,
  WEAKNESS_ELEMENTS,
} from './tacticOptions'
import { moveItem } from './team'

function Choice<T extends string | number>({
  value,
  options,
  label = String,
  onChange,
}: {
  value: T
  options: T[]
  label?: (value: T) => string
  onChange: (value: T) => void
}) {
  return (
    <select className={field} value={value} onChange={(e) => onChange(options.find((o) => String(o) === e.target.value)!)}>
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
      return (
        <Choice value={condition.percent} options={PERCENT_OPTIONS} label={(v) => `${v}%`} onChange={(percent) => onChange({ ...condition, percent })} />
      )
    case 'selfEssenceAtLeast':
      return <Choice value={condition.amount} options={ESSENCE_OPTIONS} onChange={(amount) => onChange({ ...condition, amount })} />
    default:
      return null
  }
}

/** Edits one creature's Battle Plan: Tactics checked top-down, Basic Attack as fallback. */
export function TacticEditor({
  creature,
  tactics,
  onChange,
}: {
  creature: CreatureDef
  tactics: Tactic[]
  onChange: (tactics: Tactic[]) => void
}) {
  const update = (index: number, patch: Partial<Tactic>) =>
    onChange(tactics.map((tactic, i) => (i === index ? { ...tactic, ...patch } : tactic)))
  const add = () =>
    onChange([...tactics, { condition: { type: 'always' }, skill: creature.skills[0], target: 'sameLane' }])

  return (
    <div className="space-y-2">
      {tactics.map((tactic, i) => {
        const skill = CONTENT.skills[tactic.skill]
        return (
          <div key={i} className="rounded border border-white/10 bg-black/20 p-2">
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="w-16 text-xs font-semibold text-physical">Tactic {i + 1}</span>
              <span className="text-xs text-physical">If</span>
              <select
                className={field}
                value={tactic.condition.type}
                onChange={(e) => update(i, { condition: CONDITION_DEFAULTS[e.target.value as Condition['type']] })}
              >
                {Object.entries(CONDITION_LABELS).map(([type, label]) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                ))}
              </select>
              <ConditionParam condition={tactic.condition} onChange={(condition) => update(i, { condition })} />
              <span className="text-xs text-physical">→</span>
              <select className={field} value={tactic.skill} onChange={(e) => update(i, { skill: e.target.value })}>
                {creature.skills.map((id) => (
                  <option key={id} value={id}>
                    {CONTENT.skills[id].name} ({CONTENT.skills[id].cost} ESS)
                  </option>
                ))}
              </select>
              <span className="text-xs text-physical">→ Target</span>
              <select className={field} value={tactic.target} onChange={(e) => update(i, { target: e.target.value as Tactic['target'] })}>
                {TARGET_OPTIONS.map((target) => (
                  <option key={target} value={target}>
                    {describeTarget(target)}
                  </option>
                ))}
              </select>
              <span className="ml-auto flex gap-1">
                <IconButton label="Move up" disabled={i === 0} onClick={() => onChange(moveItem(tactics, i, i - 1))}>
                  ↑
                </IconButton>
                <IconButton label="Move down" disabled={i === tactics.length - 1} onClick={() => onChange(moveItem(tactics, i, i + 1))}>
                  ↓
                </IconButton>
                <IconButton label="Remove" onClick={() => onChange(tactics.filter((_, j) => j !== i))}>
                  ✕
                </IconButton>
              </span>
            </div>
            <div className="mt-1 pl-[4.5rem] text-xs text-physical">{describeSkill(skill)}</div>
          </div>
        )
      })}
      {tactics.length < RULES.tacticSlots && (
        <button type="button" onClick={add} className="w-full rounded border border-dashed border-white/20 py-1.5 text-sm text-physical hover:bg-white/5">
          + Add Tactic ({tactics.length}/{RULES.tacticSlots})
        </button>
      )}
      <div className="px-2 text-xs text-physical">
        Otherwise → Basic Attack ({describeSkill(CONTENT.skills[creature.basicAttack])}) → {describeTarget(RULES.fallbackTarget)}
      </div>
    </div>
  )
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="h-7 w-7 rounded border border-white/15 text-xs hover:bg-white/10 disabled:opacity-30"
    >
      {children}
    </button>
  )
}
