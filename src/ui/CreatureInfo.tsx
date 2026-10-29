import type { CreatureDef, Lane, Loadout, Row, SkillDef, Stats } from '../core/types'
import { CONTENT } from '../data'
import { describeSkill } from './describeSkill'
import { CreatureArt, ElementLabel, Sheet } from './kit'
import { cellName } from './prepare'

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
    <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs text-mist">
      {STAT_LABELS.map(([key, label]) => (
        <span key={key}>
          {label} <span className="font-bold text-ivory">{stats[key]}</span>
        </span>
      ))}
    </div>
  )
}

/** Stats in a 3x2 grid of tiles, easier to compare at a glance than a line. */
function StatTiles({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {STAT_LABELS.map(([key, label]) => (
        <div key={key} className="rounded border border-gold/15 bg-black/30 px-2 py-1 text-center">
          <div className="label-caps !text-2xs text-gold/70">{label}</div>
          <div className="font-display text-base text-ivory">{stats[key]}</div>
        </div>
      ))}
    </div>
  )
}

/** A bottom sheet with everything about one creature as it would enter this match. */
export function CreatureInfoSheet({
  creature,
  loadout,
  enemy,
  boss,
  place,
  note,
  onClose,
}: {
  creature: CreatureDef
  loadout: Loadout
  enemy?: boolean
  boss?: boolean
  place?: { lane: Lane; row: Row }
  note?: string
  onClose: () => void
}) {
  const stats = loadout.stats ?? creature.stats
  const skills = loadout.skills ?? creature.skills
  const def = (id: string): SkillDef => loadout.skillDefs?.[id] ?? CONTENT.skills[id]
  return (
    <Sheet onClose={onClose}>
      <div className="flex gap-3">
        <CreatureArt creature={creature} flip={enemy} className="h-28 w-28 shrink-0" />
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {boss && <span className="rounded-sm bg-red-500/25 px-1.5 text-2xs uppercase tracking-widest text-red-200">Boss</span>}
            {creature.kind === 'paragon' && <span className="label-caps !text-2xs">✦ Paragon</span>}
          </div>
          <h2 className="font-display text-xl text-gold-bright">{creature.name}</h2>
          <ElementLabel element={creature.element} />
          <p className="text-xs text-mist">{creature.role}</p>
          {place && <p className="text-xs text-mist">Starts {cellName(place.lane, place.row)}</p>}
        </div>
      </div>
      {note && <p className="mt-2 text-sm text-ivory/90">{note}</p>}
      {boss && <p className="mt-2 text-sm italic text-red-200/80">Below 50% Lifeforce its Sigil blazes and it fights fiercer.</p>}
      <div className="mt-3">
        <StatTiles stats={stats} />
      </div>
      <div className="label-caps mb-1 mt-4">Skills</div>
      <ul className="space-y-2 text-sm">
        {skills.map((id) => (
          <li key={id} className="rounded border border-gold/10 bg-black/20 px-3 py-2">
            <div className="font-display text-ivory">{def(id).name}</div>
            <div className="text-xs text-mist">{describeSkill(def(id))}</div>
          </li>
        ))}
        {creature.ascension && (
          <li className="rounded border border-gold/40 bg-gold/10 px-3 py-2">
            <div className="font-display text-gold-bright">Ascension · {CONTENT.skills[creature.ascension].name}</div>
            <div className="text-xs text-mist">{describeSkill(CONTENT.skills[creature.ascension])}</div>
          </li>
        )}
      </ul>
      <button type="button" className="btn-ghost mt-4 w-full" onClick={onClose}>
        Close
      </button>
    </Sheet>
  )
}
