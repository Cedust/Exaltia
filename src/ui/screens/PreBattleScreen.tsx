import { useState } from 'react'
import { describeCondition, describeTarget } from '../../core/log'
import { isWeakTo, opposite } from '../../core/rules'
import type { Position, Stats, Team, TeamMember } from '../../core/types'
import { CONTENT } from '../../data'
import type { Encounter } from '../../data/world'
import { battleRules, describeModifier, enemyTeam, formationProblems, slotsFor, suggestPlan } from '../../game/battles'
import { playerLoadout } from '../../game/loadout'
import { masteryOf } from '../../game/rules'
import { tournamentsWon, type SaveState } from '../../game/save'
import { describeSkill } from '../describeSkill'
import { useGame } from '../GameContext'
import { Ambience, CreatureArt, ElementGem, ElementLabel, ScreenHeader, Stars } from '../kit'
import { ELEMENT_TEXT } from '../styles'
import { TacticEditor } from './TacticEditor'

type Tab = 'scout' | 'formation' | 'plan'

const STAT_LABELS: [keyof Stats, string][] = [
  ['lifeforce', 'LF'],
  ['might', 'MGT'],
  ['resonance', 'RSN'],
  ['guard', 'GRD'],
  ['ward', 'WRD'],
  ['swiftness', 'SWF'],
]

export function StatLine({ stats }: { stats: Stats }) {
  return (
    <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[0.72rem] text-mist">
      {STAT_LABELS.map(([key, label]) => (
        <span key={key}>
          {label} <span className="font-bold text-ivory">{stats[key]}</span>
        </span>
      ))}
    </div>
  )
}

const LANES = [0, 1, 2] as const
const samePosition = (a: Position, b: Position) => a.lane === b.lane && a.row === b.row

/** One side of the Lane grid. Player: Back | Front (facing right). Enemy: Front | Back. */
export function FormationGrid({
  members,
  side,
  selected,
  onCell,
}: {
  members: { creature: string; position: Position }[]
  side: 'player' | 'enemy'
  selected?: string | null
  onCell?: (position: Position) => void
}) {
  const rows = side === 'player' ? (['back', 'front'] as const) : (['front', 'back'] as const)
  return (
    <div className="grid grid-cols-2 gap-2">
      {rows.map((row) => (
        <div key={row} className="label-caps text-center !text-[0.6rem]">
          {row} row
        </div>
      ))}
      {LANES.flatMap((lane) =>
        rows.map((row) => {
          const member = members.find((m) => m.position.lane === lane && m.position.row === row)
          const creature = member && CONTENT.creatures[member.creature]
          const isSelected = !!member && member.creature === selected
          return (
            <button
              key={`${lane}-${row}`}
              type="button"
              disabled={!onCell}
              onClick={() => onCell?.({ lane, row })}
              className={`relative aspect-square w-full overflow-hidden rounded-md border transition ${
                isSelected ? 'border-gold bg-gold/15 shadow-[0_0_18px_rgba(230,196,122,0.4)]' : side === 'player' ? 'border-gold/25 bg-black/30' : 'border-red-300/25 bg-black/30'
              } ${onCell ? 'active:scale-[0.98]' : ''}`}
            >
              <span
                className="pointer-events-none absolute inset-2 rounded-full opacity-40"
                style={{ background: 'radial-gradient(circle, rgba(230,196,122,0.25), transparent 65%)' }}
              />
              {creature ? (
                <>
                  <CreatureArt creature={creature} flip={side === 'enemy'} className="absolute inset-1" halo={false} />
                  <span className={`absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/90 to-transparent px-1 pb-0.5 pt-3 text-center text-[0.68rem] font-bold ${ELEMENT_TEXT[creature.element]}`}>
                    {creature.name}
                  </span>
                </>
              ) : (
                <span className="text-[0.65rem] text-white/25">Lane {lane + 1}</span>
              )}
            </button>
          )
        }),
      )}
    </div>
  )
}

function placeCreature(save: SaveState, creature: string, position: Position, teamSize: number): SaveState['formation'] {
  const members = save.formation
  const current = members.find((m) => m.creature === creature)
  const occupant = members.find((m) => samePosition(m.position, position))
  if (current) {
    return members.map((m) => (m === current ? { ...m, position } : m === occupant ? { ...m, position: current.position } : m))
  }
  if (occupant) return members.map((m) => (m === occupant ? { creature, position } : m))
  if (members.length >= teamSize) return members
  return [...members, { creature, position }]
}

export function PreBattleScreen({ encounter, onBack, onFight }: { encounter: Encounter; onBack: () => void; onFight: () => void }) {
  const { save, update } = useGame()
  const rules = battleRules(save, encounter)
  const enemy: Team = enemyTeam(save, encounter)
  const problems = formationProblems(save, encounter)
  const [tab, setTab] = useState<Tab>(save.formation.length === rules.teamSize && problems.length === 0 ? 'plan' : 'formation')
  const [selected, setSelected] = useState<string | null>(null)

  const setFormation = (formation: SaveState['formation']) =>
    update((s) => {
      const tactics = { ...s.tactics }
      // New members get a sensible plan right away.
      for (const f of formation) if (!tactics[f.creature]?.length) tactics[f.creature] = suggestPlan({ ...s, formation }, f.creature)
      return { ...s, formation, tactics }
    })

  const allowed = (id: string) => {
    const c = CONTENT.creatures[id]
    return !(rules.onlyAcolytes && c.kind === 'paragon') && !rules.banned.includes(c.element)
  }

  const onCell = (position: Position) => {
    const occupant = save.formation.find((m) => samePosition(m.position, position))
    if (selected && (!occupant || occupant.creature !== selected)) {
      if (!allowed(selected)) return
      setFormation(placeCreature(save, selected, position, rules.teamSize))
      setSelected(null)
      return
    }
    setSelected(occupant ? (occupant.creature === selected ? null : occupant.creature) : null)
  }

  const enemyWeakness = [...new Set(enemy.members.map((m) => opposite(CONTENT.creatures[m.creature].element)).filter(Boolean))]

  return (
    <div className="relative flex h-full flex-col">
      <Ambience backdrop={encounter.backdrop} dim={0.7} motes={6} />
      <ScreenHeader title={encounter.name} subtitle={`vs ${encounter.opponent} · ${rules.teamSize}v${rules.teamSize}`} onBack={onBack} />
      {(encounter.modifiers?.length ?? 0) > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 bg-black/30 px-3 py-1.5">
          {encounter.modifiers!.map((m, i) => (
            <span key={i} className="rounded-sm border border-gold/40 px-2 py-0.5 text-[0.68rem] uppercase tracking-wider text-gold-bright">
              {describeModifier(m)}
            </span>
          ))}
        </div>
      )}
      <nav className="flex border-b border-gold/20 bg-night/70">
        {(['scout', 'formation', 'plan'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 font-display text-xs tracking-[0.16em] uppercase transition ${tab === t ? 'border-b-2 border-gold text-gold-bright' : 'text-mist'}`}
          >
            {t === 'scout' ? 'Scouting' : t === 'formation' ? 'Formation' : 'Battle Plan'}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-36 pt-3">
        <div className="mx-auto max-w-xl">
          {tab === 'scout' && (
            <div className="space-y-3 fade-in">
              <p className="text-center text-sm text-mist">{encounter.description}</p>
              <div className="mx-auto max-w-[17rem]">
                <FormationGrid members={enemy.members} side="enemy" />
              </div>
              {enemyWeakness.length > 0 && (
                <p className="text-center text-xs text-mist">
                  Weak to:{' '}
                  {enemyWeakness.map((e) => (
                    <span key={e} className={`ml-1 font-bold ${ELEMENT_TEXT[e!]}`}>
                      <ElementGem element={e!} className="mr-1" />
                      {e![0].toUpperCase() + e!.slice(1)}
                    </span>
                  ))}
                </p>
              )}
              {enemy.members.map((member, i) => (
                <EnemyCard key={i} member={member} />
              ))}
            </div>
          )}

          {tab === 'formation' && (
            <div className="space-y-4 fade-in">
              <div className="mx-auto max-w-[17rem]">
                <FormationGrid members={save.formation} side="player" selected={selected} onCell={onCell} />
              </div>
              <p className="text-center text-xs text-mist">
                {selected
                  ? save.formation.some((f) => f.creature === selected)
                    ? `Tap a cell to move ${CONTENT.creatures[selected].name}.`
                    : `Tap a cell to place ${CONTENT.creatures[selected].name}.`
                  : `Pick a creature below, then tap a cell. The Front Row shields the Back Row.`}
              </p>
              {selected && save.formation.some((f) => f.creature === selected) && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setFormation(save.formation.filter((f) => f.creature !== selected))
                      setSelected(null)
                    }}
                  >
                    Remove {CONTENT.creatures[selected].name}
                  </button>
                </div>
              )}
              <div>
                <div className="label-caps mb-2">Your creatures</div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {save.order.map((id) => {
                    const c = CONTENT.creatures[id]
                    const ok = allowed(id)
                    const placed = save.formation.some((f) => f.creature === id)
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={!ok}
                        onClick={() => setSelected(selected === id ? null : id)}
                        className={`relative flex flex-col items-center rounded-md border p-1 transition ${selected === id ? 'border-gold bg-gold/15' : 'border-gold/15 bg-black/25'} ${ok ? '' : 'opacity-30'}`}
                      >
                        <CreatureArt creature={c} className="h-14 w-full" />
                        <span className={`w-full truncate text-center text-[0.65rem] font-bold ${ELEMENT_TEXT[c.element]}`}>{c.name}</span>
                        {placed && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-gold shadow-[0_0_6px_#e6c47a]" />}
                        {c.kind === 'paragon' && <span className="absolute left-1 top-0.5 text-[0.6rem] text-gold">✦</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'plan' && (
            <div className="space-y-4 fade-in">
              {save.formation.length === 0 && <p className="text-center text-sm text-mist">Place creatures in your formation first.</p>}
              {save.formation.map((f) => (
                <PlanCard key={f.creature} save={save} creatureId={f.creature} enemy={enemy} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-night via-night/95 to-transparent px-4 pb-3 pt-6 safe-bottom">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-1.5">
          {problems.length > 0 && (
            <button type="button" onClick={() => setTab('formation')} className="rounded-full border border-red-300/40 bg-night/95 px-3 py-1 text-center text-xs text-red-200">
              {problems[0]}
            </button>
          )}
          <button type="button" className="btn-oath w-full" disabled={problems.length > 0} onClick={onFight}>
            ⚔ Fight
          </button>
        </div>
      </div>
    </div>
  )
}

function EnemyCard({ member }: { member: TeamMember }) {
  const creature = CONTENT.creatures[member.creature]
  const stats = member.loadout?.stats ?? creature.stats
  const skills = member.loadout?.skills ?? creature.skills
  return (
    <div className={`ornate-soft p-3 ${member.boss ? '!border-gold/60' : ''}`}>
      <div className="flex gap-3">
        <CreatureArt creature={creature} flip className="h-20 w-20 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-base text-gold-bright">{creature.name}</span>
            {member.boss && <span className="rounded-sm bg-red-500/25 px-1.5 text-[0.6rem] uppercase tracking-widest text-red-200">Boss</span>}
          </div>
          <div className="flex items-center gap-2">
            <ElementLabel element={creature.element} />
            <span className="text-[0.7rem] text-mist">{creature.role}</span>
          </div>
          <div className="mt-1">
            <StatLine stats={stats} />
          </div>
        </div>
      </div>
      <div className="mt-2 space-y-1 text-[0.75rem]">
        <div className="label-caps !text-[0.58rem]">Battle Plan</div>
        <ol className="list-decimal space-y-0.5 pl-5 text-mist">
          {member.tactics.map((t, i) => (
            <li key={i}>
              {describeCondition(t.condition)} → <span className="text-ivory">{CONTENT.skills[t.skill].name}</span> → {describeTarget(t.target)}
            </li>
          ))}
        </ol>
        {member.boss && <p className="text-[0.7rem] italic text-red-200/80">Below 50% Lifeforce its Sigil blazes and it changes tactics.</p>}
        <details className="text-mist">
          <summary className="cursor-pointer text-[0.7rem] text-gold">Skills</summary>
          <ul className="mt-1 space-y-0.5">
            {skills.map((id) => (
              <li key={id}>
                <span className="text-ivory">{CONTENT.skills[id].name}</span> · {describeSkill(member.loadout?.skillDefs?.[id] ?? CONTENT.skills[id])}
              </li>
            ))}
            {creature.ascension && (
              <li>
                <span className="text-gold-bright">Ascension: {CONTENT.skills[creature.ascension].name}</span> · {describeSkill(CONTENT.skills[creature.ascension])}
              </li>
            )}
          </ul>
        </details>
      </div>
    </div>
  )
}

function PlanCard({ save, creatureId, enemy }: { save: SaveState; creatureId: string; enemy: Team }) {
  const { update } = useGame()
  const creature = CONTENT.creatures[creatureId]
  const owned = save.creatures[creatureId]
  const loadout = playerLoadout(owned, tournamentsWon(save))
  const skills = (loadout.skills ?? creature.skills).map((id) => loadout.skillDefs?.[id] ?? CONTENT.skills[id])
  const slots = slotsFor(save, creatureId)
  const tactics = save.tactics[creatureId] ?? []
  const strongAgainst = enemy.members.filter((m) => skills.some((s) => s.effect === 'damage' && isWeakTo(CONTENT.creatures[m.creature].element, s.element)))
  const setTactics = (next: typeof tactics) => update((s) => ({ ...s, tactics: { ...s.tactics, [creatureId]: next } }))

  return (
    <div className="ornate p-3">
      <div className="flex items-center gap-3">
        <CreatureArt creature={creature} className="h-16 w-16 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-display text-base text-gold-bright">{creature.name}</div>
          <div className="flex items-center gap-2">
            <ElementLabel element={creature.element} />
            <span className="text-[0.7rem] text-mist">{creature.role}</span>
          </div>
          {strongAgainst.length > 0 && (
            <div className="text-[0.7rem] text-gold">Hits {strongAgainst.map((m) => CONTENT.creatures[m.creature].name).join(', ')} for weakness damage</div>
          )}
        </div>
        <button type="button" className="btn-ghost !px-2.5 !py-1.5 !text-[0.62rem]" onClick={() => setTactics(suggestPlan(save, creatureId))}>
          ✧ Suggest
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {skills.map((s) => (
          <span key={s.id} className="rounded-sm bg-black/35 px-1.5 py-0.5 text-[0.66rem] text-ivory/90">
            {s.name}
            {creature.kind === 'paragon' && (
              <span className="ml-1 text-[0.6rem]">
                <Stars value={masteryOf(owned.mastery[s.id] ?? 0)} />
              </span>
            )}
          </span>
        ))}
        {creature.ascension && <span className="rounded-sm bg-gold/15 px-1.5 py-0.5 text-[0.66rem] text-gold-bright">Ascension: {CONTENT.skills[creature.ascension].name}</span>}
      </div>
      <div className="mt-3">
        <TacticEditor
          skills={skills}
          basicAttack={CONTENT.skills[creature.basicAttack]}
          tactics={tactics}
          slots={slots}
          conditions={save.conditions}
          onChange={setTactics}
        />
      </div>
    </div>
  )
}
