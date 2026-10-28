import { useState } from 'react'
import { CONTENT } from '../../data'
import { STARTER_IDS } from '../../data/creatures'
import { describeSkill } from '../describeSkill'
import { Ambience, CreatureArt, Divider } from '../kit'

const HINTS: Record<string, string> = {
  'spire-golem': 'Stands in front and draws attacks with Taunt.',
  'ruin-scout': 'Fast striker; Ambush reaches the Back Row.',
  'spire-mender': 'Heals one ally or the whole team.',
  'relic-archer': 'Pierces through the Front Row or snipes the Back Row.',
}

export function StarterScreen({ onDone }: { onDone: (picks: string[]) => void }) {
  const [picks, setPicks] = useState<string[]>([])
  const toggle = (id: string) =>
    setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 2 ? [p[1], id] : [...p, id]))

  return (
    <div className="relative min-h-full px-4 pb-28 pt-8">
      <Ambience backdrop="spire" dim={0.55} />
      <div className="mx-auto max-w-3xl text-center">
        <p className="label-caps">Prologue</p>
        <h1 className="title-display mt-1 text-3xl">Choose two Acolytes</h1>
        <p className="lore mt-2 text-lg text-mist">Four servants of the old Spire have been watching you. Two of them will follow you into the world.</p>
      </div>
      <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
        {STARTER_IDS.map((id) => {
          const creature = CONTENT.creatures[id]
          const picked = picks.includes(id)
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={`ornate-soft group relative flex flex-col items-center p-3 text-left transition ${picked ? '!border-gold shadow-[0_0_30px_rgba(230,196,122,0.35)]' : 'opacity-85 hover:opacity-100'}`}
            >
              {picked && <span className="absolute right-2 top-2 rounded-full bg-gold px-2 text-xs font-bold text-night">{picks.indexOf(id) + 1}</span>}
              <CreatureArt creature={creature} className="h-32 w-full sm:h-40" />
              <span className="mt-1 font-display text-sm tracking-wider text-gold-bright">{creature.name}</span>
              <span className="text-xs text-mist">{creature.role}</span>
              <span className="mt-2 text-center text-xs leading-snug text-ivory/80">{HINTS[id]}</span>
              <div className="mt-2 w-full space-y-1 border-t border-gold/15 pt-2">
                {creature.skills.map((s) => (
                  <div key={s} className="text-[0.7rem] leading-tight">
                    <span className="text-gold">{CONTENT.skills[s].name}</span>
                    <span className="block text-mist">{describeSkill(CONTENT.skills[s])}</span>
                  </div>
                ))}
              </div>
            </button>
          )
        })}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-night via-night/90 to-transparent px-4 pb-4 pt-8 safe-bottom">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
          <Divider>{picks.length}/2 chosen</Divider>
          <button type="button" className="btn-oath w-full" disabled={picks.length !== 2} onClick={() => onDone(picks)}>
            Bind them to me
          </button>
        </div>
      </div>
    </div>
  )
}
