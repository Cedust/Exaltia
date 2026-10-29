import { useState, type ReactNode } from 'react'
import { opposite } from '../../core/rules'
import type { Element } from '../../core/types'
import { CONTENT } from '../../data'
import type { Encounter } from '../../data/world'
import { allowedIn, battleRules, bestOfFor, bossVowsFor, describeModifier, enemyMembers, formationProblems, joinFormation, type BattleRules } from '../../game/battles'
import { carrierName, type MatchMember } from '../../game/duel'
import { playerLoadout } from '../../game/loadout'
import { awakeningOf } from '../../game/rules'
import { tournamentsWon, type SaveState } from '../../game/save'
import { CreatureInfoSheet } from '../CreatureInfo'
import { useGame } from '../GameContext'
import { CreatureArt, Divider, ElementGem, ElementLabel } from '../kit'
import { FlowHeader, PrepareFlow } from '../PrepareFlow'
import { haptic, matchSteps, type PrepStep } from '../prepare'
import { ELEMENT_TEXT } from '../styles'
import { VowCard } from './MatchScreen'


const elementTitle = (e: Element) => e[0].toUpperCase() + e.slice(1)

/** Elements this team takes extra damage from. */
const weaknessesOf = (members: { creature: string }[]) =>
  [...new Set(members.map((m) => opposite(CONTENT.creatures[m.creature].element)).filter((e): e is Element => !!e))]

export function PreBattleScreen({
  encounter,
  step,
  onStep,
  onBack,
  onNext,
}: {
  encounter: Encounter
  step: PrepStep
  onStep: (step: PrepStep) => void
  onBack: () => void
  /** Starts the match: the flow continues with the first Vow. */
  onNext: () => void
}) {
  const { save } = useGame()
  const rules = battleRules(save, encounter)
  const enemy = enemyMembers(save, encounter)
  const problems = formationProblems(save, encounter)
  const bestOf = bestOfFor(encounter)
  const index = step === 'scout' ? 0 : 1
  const steps = matchSteps(index, (i) => onStep(i === 0 ? 'scout' : 'team'))

  const need = rules.teamSize - save.formation.length
  return (
    <PrepareFlow
      backdrop={encounter.backdrop}
      header={<FlowHeader title={encounter.name} subtitle={`vs ${encounter.opponent} · ${rules.teamSize}v${rules.teamSize} · best of ${bestOf}`} onBack={onBack} />}
      steps={steps}
      current={index}
      back={step === 'team' ? { label: 'Scout', onClick: () => onStep('scout') } : undefined}
      next={
        step === 'scout'
          ? { label: 'Next: Team ›', onClick: () => onStep('team') }
          : problems.length > 0
            ? { label: need > 0 ? `Choose ${need} more` : 'Fix your team', disabled: true, onClick: () => {} }
            : { label: 'Next: Vow ›', onClick: onNext }
      }
    >
      {step === 'scout' ? <ScoutStep encounter={encounter} enemy={enemy} rules={rules} bestOf={bestOf} /> : <TeamStep enemy={enemy} rules={rules} />}
    </PrepareFlow>
  )
}

// ── Scout: who you face and how they fight ──

function ScoutStep({ encounter, enemy, rules, bestOf }: { encounter: Encounter; enemy: MatchMember[]; rules: BattleRules; bestOf: number }) {
  const { save } = useGame()
  const [info, setInfo] = useState<number | null>(null)
  const bossVows = bossVowsFor(save, encounter)
  const weak = weaknessesOf(enemy)
  const counters = save.order.filter((id) => allowedIn(rules, id) && weak.includes(CONTENT.creatures[id].element))
  const shown = info !== null ? enemy[info] : null

  return (
    <div className="space-y-5">
      <section className="text-center">
        <div className="label-caps !text-2xs">Your opponent</div>
        <h2 className="title-display text-2xl">{encounter.opponent}</h2>
        <p className="lore mx-auto mt-1 max-w-md text-base leading-snug text-ivory/85">{encounter.description}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          <Chip>
            {rules.teamSize}v{rules.teamSize}
          </Chip>
          <Chip>
            Best of {bestOf}
          </Chip>
          {(encounter.modifiers ?? [])
            .filter((m) => m.type !== 'teamSize')
            .map((m, i) => (
              <Chip key={i} warn>
                {describeModifier(m)}
              </Chip>
            ))}
        </div>
      </section>

      <section>
        <Divider className="mb-2">Their lineup</Divider>
        <div className={`grid gap-2 ${enemy.length === 1 ? 'mx-auto max-w-[12rem] grid-cols-1' : 'grid-cols-2'}`}>
          {enemy.map((member, i) => {
            const creature = CONTENT.creatures[member.creature]
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  haptic()
                  setInfo(i)
                }}
                className={`ornate-soft relative flex flex-col items-center px-2 pb-2 pt-5 text-center transition active:scale-[0.98] ${member.boss ? '!border-red-300/50 shadow-[0_0_20px_rgba(224,87,79,0.25)]' : ''}`}
              >
                {member.boss && <span className="absolute right-1.5 top-1 rounded-sm bg-red-500/30 px-1.5 text-2xs uppercase tracking-widest text-red-100">Boss</span>}
                <CreatureArt creature={creature} flip className="h-24 w-24" />
                <span className="mt-1 line-clamp-1 font-display text-sm text-gold-bright">{creature.name}</span>
                <ElementLabel element={creature.element} />
                <span className="line-clamp-1 text-xs text-mist">{creature.role}</span>
                <span className="mt-1 text-2xs uppercase tracking-widest text-gold/70">Tap for details</span>
              </button>
            )
          })}
        </div>
      </section>

      {weak.length > 0 && (
        <section className="ornate-soft bleed">
          <div className="px-4 py-3">
            <div className="label-caps !text-2xs">Their weakness</div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              {weak.map((e) => (
                <span key={e} className={`inline-flex items-center gap-1.5 font-display text-base ${ELEMENT_TEXT[e]}`}>
                  <ElementGem element={e} />
                  {elementTitle(e)}
                </span>
              ))}
            </div>
            <p className="mt-1 text-xs text-mist">
              {counters.length > 0
                ? `${counters.length} of your creatures strike${counters.length > 1 ? '' : 's'} this weakness: look for ▲ Counter when you pick your team.`
                : 'None of your creatures strikes this weakness yet.'}
            </p>
          </div>
        </section>
      )}

      {bossVows.length > 0 && (
        <section>
          <Divider className="mb-2">Boss Vows · already sworn</Divider>
          <div className="space-y-2">
            {bossVows.map((v) => (
              <VowCard key={v.vow} id={v.vow} carrier={carrierName(v, enemy)} />
            ))}
          </div>
        </section>
      )}

      {shown && (
        <CreatureInfoSheet
          creature={CONTENT.creatures[shown.creature]}
          loadout={shown.loadout}
          enemy
          boss={shown.boss}
          onClose={() => setInfo(null)}
        />
      )}
    </div>
  )
}

function Chip({ children, warn }: { children: ReactNode; warn?: boolean }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wider ${warn ? 'border-red-300/40 bg-red-500/10 text-red-100' : 'border-gold/40 bg-black/30 text-gold-bright'}`}>
      {children}
    </span>
  )
}

// ── Team: who you bring ──

function TeamStep({ enemy, rules }: { enemy: MatchMember[]; rules: BattleRules }) {
  const { save, update } = useGame()
  const [info, setInfo] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const weak = weaknessesOf(enemy)
  const enemyElements = new Set(enemy.map((m) => CONTENT.creatures[m.creature].element))
  const won = tournamentsWon(save)

  const setFormation = (formation: SaveState['formation']) => update((s) => ({ ...s, formation }))
  const toggle = (id: string) => {
    const formation = save.formation
    setNotice(null)
    if (formation.some((f) => f.creature === id)) {
      haptic()
      return setFormation(formation.filter((f) => f.creature !== id))
    }
    if (!allowedIn(rules, id)) return setNotice(blockedReason(rules, id))
    if (formation.length >= rules.teamSize) {
      haptic(30)
      return setNotice(`Your team is full. Tap a chosen creature to make room.`)
    }
    haptic()
    setFormation(joinFormation(formation, id))
  }

  const shown = info ? CONTENT.creatures[info] : null
  return (
    <div className="space-y-4">
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="label-caps">Your team</span>
          <span className="font-display text-sm text-gold-bright">
            {save.formation.length} / {rules.teamSize}
          </span>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(2, rules.teamSize)}, minmax(0, 1fr))` }}>
          {Array.from({ length: rules.teamSize }, (_, i) => {
            const member = save.formation[i]
            const creature = member && CONTENT.creatures[member.creature]
            return creature ? (
              <button
                key={i}
                type="button"
                onClick={() => toggle(member.creature)}
                className="ornate-soft relative flex flex-col items-center !border-gold/70 p-1.5 pt-2 shadow-[0_0_16px_rgba(230,196,122,0.25)] transition active:scale-[0.97]"
                aria-label={`Remove ${creature.name}`}
              >
                <span className="absolute right-1.5 top-1 text-sm leading-none text-mist">×</span>
                <CreatureArt creature={creature} className="h-16 w-16" />
                <span className={`line-clamp-1 w-full text-center text-xs font-bold ${ELEMENT_TEXT[creature.element]}`}>{creature.name}</span>
              </button>
            ) : (
              <div key={i} className="flex min-h-[6.5rem] flex-col items-center justify-center rounded-md border border-dashed border-gold/35 bg-black/20 text-gold/50">
                <span className="text-2xl leading-none">+</span>
                <span className="text-2xs uppercase tracking-widest">Empty</span>
              </div>
            )
          })}
        </div>
        {notice && <p className="mt-2 text-center text-xs text-red-200 fade-in">{notice}</p>}
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="label-caps">Your creatures</span>
          <span className="text-2xs uppercase tracking-wider text-mist">
            <span className="text-earth">▲</span> counter · <span className="text-red-300">▼</span> at risk
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {save.order.map((id) => {
            const c = CONTENT.creatures[id]
            const ok = allowedIn(rules, id)
            const slot = save.formation.findIndex((f) => f.creature === id)
            const placed = slot >= 0
            const counter = weak.includes(c.element)
            const atRisk = !!opposite(c.element) && enemyElements.has(opposite(c.element)!)
            return (
              <div key={id} className="relative">
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-pressed={placed}
                  className={`relative flex w-full flex-col items-center rounded-md border px-1 pb-1.5 pt-4 transition active:scale-[0.97] ${
                    placed ? 'border-gold bg-gold/15 shadow-[0_0_14px_rgba(230,196,122,0.3)]' : 'border-gold/15 bg-black/30'
                  } ${ok ? '' : 'opacity-35 grayscale'}`}
                >
                  {placed && (
                    <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold font-display text-2xs font-bold text-night">{slot + 1}</span>
                  )}
                  {!placed && c.kind === 'paragon' && <span className="absolute left-1.5 top-0.5 text-xs text-gold">✦</span>}
                  <CreatureArt creature={c} className="h-16 w-full" />
                  <span className={`line-clamp-1 w-full text-center text-xs font-bold leading-tight ${ELEMENT_TEXT[c.element]}`}>{c.name}</span>
                  <span className="line-clamp-1 w-full text-center text-2xs text-mist">
                    {c.kind === 'paragon' ? `Awakening ${awakeningOf(save.creatures[id].xp)}` : c.role}
                  </span>
                  {ok && (counter || atRisk) && (
                    <span className={`mt-0.5 text-2xs font-bold uppercase tracking-wider ${counter ? 'text-earth' : 'text-red-300'}`}>{counter ? '▲ Counter' : '▼ At risk'}</span>
                  )}
                  {!ok && <span className="mt-0.5 text-2xs uppercase tracking-wider text-red-200">Not allowed</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setInfo(id)}
                  className="absolute right-0 top-0 flex h-9 w-9 items-start justify-end p-1"
                  aria-label={`About ${c.name}`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gold/40 bg-night/80 font-lore text-xs italic text-gold">i</span>
                </button>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-center text-xs text-mist">The team stays together for the whole match. You can re-form it before every round.</p>
      </section>

      {shown && (
        <CreatureInfoSheet
          creature={shown}
          loadout={playerLoadout(save.creatures[shown.id], won)}
          note={allowedIn(rules, shown.id) ? undefined : blockedReason(rules, shown.id)}
          onClose={() => setInfo(null)}
        />
      )}
    </div>
  )
}

function blockedReason(rules: BattleRules, id: string): string {
  const c = CONTENT.creatures[id]
  if (rules.onlyAcolytes && c.kind === 'paragon') return `${c.name} is a Paragon: this Challenge allows Acolytes only.`
  return `${elementTitle(c.element)} creatures are not allowed here.`
}
