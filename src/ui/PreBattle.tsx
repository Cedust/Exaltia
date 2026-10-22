import { useState } from 'react'
import { describeCondition, describeTarget } from '../core/log'
import type { CreatureDef, Position, Stats, Team } from '../core/types'
import { CONTENT } from '../data'
import { PLAYER_POOL } from '../data/creatures'
import type { Encounter } from '../data/encounters'
import { CreatureArt, ElementLabel, FormationGrid } from './common'
import { ELEMENT_TEXT, button, primaryButton } from './styles'
import { TacticEditor } from './TacticEditor'
import { MAX_MEMBERS, placeCreature, removeCreature, samePosition, setTactics } from './team'

const STAT_LABELS: [keyof Stats, string][] = [
  ['lifeforce', 'LF'],
  ['might', 'MGT'],
  ['resonance', 'RSN'],
  ['guard', 'GRD'],
  ['ward', 'WRD'],
  ['swiftness', 'SWF'],
  ['essence', 'ESS'],
]

function StatLine({ creature }: { creature: CreatureDef }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-xs text-physical">
      {STAT_LABELS.map(([key, label]) => (
        <span key={key}>
          {label} <span className="text-white">{creature.stats[key]}</span>
        </span>
      ))}
    </div>
  )
}

/** Team selection, formation and Battle Plan for one encounter. */
export function PreBattle({
  encounter,
  team,
  onTeamChange,
  onBack,
  onFight,
}: {
  encounter: Encounter
  team: Team
  onTeamChange: (team: Team) => void
  onBack: () => void
  onFight: () => void
}) {
  const [selected, setSelected] = useState<string | null>(team.members[0]?.creature ?? null)
  const inTeam = (id: string) => team.members.some((m) => m.creature === id)
  const selectedMember = team.members.find((m) => m.creature === selected)
  const selectedCreature = selected ? CONTENT.creatures[selected] : null
  const full = team.members.length >= MAX_MEMBERS

  const onCellClick = (position: Position) => {
    const occupant = team.members.find((m) => samePosition(m.position, position))
    if (occupant && !(selected && !inTeam(selected))) {
      setSelected(occupant.creature)
      return
    }
    if (selected) onTeamChange(placeCreature(team, CONTENT.creatures[selected], position, CONTENT))
  }

  let hint = 'Pick a creature, then click a cell to place it. Click a placed creature to edit its Battle Plan.'
  if (selected && !inTeam(selected)) {
    hint = full
      ? `The team is full (${MAX_MEMBERS}). Click a placed creature's cell to replace it with ${CONTENT.creatures[selected].name}.`
      : `Click a cell to place ${CONTENT.creatures[selected].name}.`
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
      <div className="flex items-center gap-3">
        <button type="button" className={button} onClick={onBack}>
          ← Encounters
        </button>
        <h2 className="text-xl font-semibold">{encounter.name}</h2>
        <button type="button" className={`${primaryButton} ml-auto px-6`} disabled={team.members.length !== MAX_MEMBERS} onClick={onFight}>
          Fight
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto]">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-physical">Your Formation</h3>
          <FormationGrid team={team} side="player" selected={selected} onCellClick={onCellClick} />
          <p className="max-w-60 text-xs text-physical">{hint}</p>
          <h3 className="pt-2 text-sm font-semibold uppercase tracking-wide text-physical">Collection</h3>
          <div className="grid grid-cols-2 gap-2">
            {PLAYER_POOL.map((id) => {
              const creature = CONTENT.creatures[id]
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelected(id)}
                  className={`relative flex w-28 flex-col items-center rounded border p-1.5 text-center transition hover:bg-white/10 ${
                    selected === id ? 'border-[#ffe28a] bg-white/10' : 'border-white/15'
                  }`}
                >
                  <CreatureArt creature={creature} className="h-16 w-16" />
                  <span className={`text-xs font-semibold ${ELEMENT_TEXT[creature.element]}`}>{creature.name}</span>
                  <span className="text-[10px] text-physical">{creature.role}</span>
                  {inTeam(id) && <span className="absolute right-1 top-1 rounded bg-ice/60 px-1 text-[10px]">in team</span>}
                </button>
              )
            })}
          </div>
        </section>

        <section className="min-w-0 space-y-3 rounded-lg border border-white/10 p-4">
          {selectedCreature ? (
            <>
              <div className="flex items-start gap-3">
                <CreatureArt creature={selectedCreature} className="h-20 w-20" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-lg font-semibold">{selectedCreature.name}</h3>
                    <ElementLabel element={selectedCreature.element} />
                    <span className="text-xs text-physical">
                      {selectedCreature.kind === 'paragon' ? 'Paragon' : 'Acolyte'} · {selectedCreature.role}
                    </span>
                  </div>
                  <StatLine creature={selectedCreature} />
                </div>
                {selectedMember && (
                  <button type="button" className={button} onClick={() => onTeamChange(removeCreature(team, selectedCreature.id))}>
                    Remove
                  </button>
                )}
              </div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-physical">Battle Plan</h4>
              {selectedMember ? (
                <TacticEditor
                  creature={selectedCreature}
                  tactics={selectedMember.tactics}
                  onChange={(tactics) => onTeamChange(setTactics(team, selectedCreature.id, tactics))}
                />
              ) : (
                <p className="text-sm text-physical">Place {selectedCreature.name} in your formation to give it a Battle Plan.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-physical">Select a creature to see its stats and Battle Plan.</p>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-physical">Scouting</h3>
          <FormationGrid team={encounter.enemy} side="enemy" />
          <div className="max-w-72 space-y-2">
            {encounter.enemy.members.map((member) => {
              const creature = CONTENT.creatures[member.creature]
              return (
                <div key={member.creature} className="rounded border border-white/10 p-2 text-xs">
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className={`font-semibold ${ELEMENT_TEXT[creature.element]}`}>{creature.name}</span>
                    <span className="text-physical">{creature.role}</span>
                  </div>
                  <StatLine creature={creature} />
                  <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-physical">
                    {member.tactics.map((tactic, i) => (
                      <li key={i}>
                        {describeCondition(tactic.condition)} → <span className="text-white">{CONTENT.skills[tactic.skill].name}</span> →{' '}
                        {describeTarget(tactic.target)}
                      </li>
                    ))}
                  </ol>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
