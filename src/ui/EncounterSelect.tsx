import { CONTENT } from '../data'
import { ENCOUNTERS, type Encounter } from '../data/encounters'
import { ElementLabel, FormationGrid } from './common'

/** Scouting: every encounter with its enemies, their elements and formation. */
export function EncounterSelect({ onSelect }: { onSelect: (encounter: Encounter) => void }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h2 className="mb-1 text-2xl font-semibold">Choose an Encounter</h2>
      <p className="mb-6 text-sm text-physical">Scout your opponent, then build a team and Battle Plan that counters it.</p>
      <div className="grid gap-4 md:grid-cols-3">
        {ENCOUNTERS.map((encounter, i) => (
          <button
            key={encounter.id}
            type="button"
            onClick={() => onSelect(encounter)}
            className="flex flex-col gap-3 rounded-lg border border-white/15 bg-white/[0.03] p-4 text-left transition hover:border-fire/60 hover:bg-white/[0.06]"
          >
            <div>
              <div className="text-xs uppercase tracking-wide text-physical">Encounter {i + 1}</div>
              <div className="text-lg font-semibold">{encounter.name}</div>
            </div>
            <div className="self-center">
              <FormationGrid team={encounter.enemy} side="enemy" size="sm" />
            </div>
            <ul className="space-y-1 text-sm">
              {encounter.enemy.members.map((member) => {
                const creature = CONTENT.creatures[member.creature]
                return (
                  <li key={member.creature} className="flex items-baseline justify-between gap-2">
                    <span>
                      {creature.name} <span className="text-xs text-physical">{creature.role}</span>
                    </span>
                    <ElementLabel element={creature.element} />
                  </li>
                )
              })}
            </ul>
            <p className="text-xs leading-relaxed text-physical">{encounter.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
