import { useState } from 'react'
import { elementName } from '../../core/log'
import { opposite } from '../../core/rules'
import { CONTENT } from '../../data'
import { OATH_MEMORIES } from '../../data/story'
import { REGION_BY_ID, type Encounter } from '../../data/world'
import type { BattleReport } from '../../game/campaign'
import { MASTERY_EFFECTS } from '../../game/rules'
import { describeSkill } from '../describeSkill'
import { useGame } from '../GameContext'
import { VowCard } from './MatchScreen'
import { Ambience, CreatureArt, Divider, ElementLabel, ShardIcon, Sigil, Stars } from '../kit'

function defeatTips(encounter: Encounter): string[] {
  const enemyElements = [...new Set(encounter.members.map((m) => CONTENT.creatures[m.creature].element))]
  const counters = enemyElements.map((e) => opposite(e)).filter((e): e is NonNullable<typeof e> => !!e)
  const tips = [
    counters.length > 0 ? `Bring ${counters.map(elementName).join(' or ')} skills: those enemies are Weak to them.` : '',
    'Check the Scouting tab: the opponent’s favourite Vows tell you what to answer with. Fireproof against Burn, Cleansing Oath against hexes.',
    'Lost a round? You see four Vows next time, one at least Rare. At match point against you, one is always Exalted.',
    'Move a fragile creature to the Back Row between rounds: the Front Row shields it.',
    'Lost creatures still gain some experience. Win a Challenge or two and come back stronger.',
  ]
  return tips.filter(Boolean)
}

/** After the battle: what was won and how the team grew. */
export function ResultScreen({ encounter, report, onContinue }: { encounter: Encounter; report: BattleReport; onContinue: () => void }) {
  const recruit = report.recruited ? CONTENT.creatures[report.recruited] : null
  const rematch = report.rematchReward ? CONTENT.creatures[report.rematchReward] : null
  const gains = report.gains.filter((g) => g.xp > 0 || g.masteryUps.length > 0)

  return (
    <div className="relative min-h-full px-4 pb-28 pt-10">
      <Ambience backdrop={encounter.backdrop} dim={0.7} />
      <div className="mx-auto max-w-xl text-center rise-in">
        <p className="label-caps">{encounter.name}</p>
        <h1 className={`title-display mt-1 text-5xl ${report.won ? '' : '!text-[#ff9b8a] !bg-none'}`}>{report.won ? 'Victory' : 'Defeat'}</h1>
        <p className="mt-1 font-display text-xl text-gold-bright">
          {report.score.player} – {report.score.enemy}
        </p>
        {report.won && report.shards > 0 && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-black/40 px-4 py-1.5 font-display text-gold-bright">
            <ShardIcon /> +{report.shards} Oath Shards
          </p>
        )}
      </div>

      <div className="mx-auto mt-6 max-w-xl space-y-4">
        {recruit && (
          <div className="ornate fade-in flex items-center gap-3 p-3">
            <CreatureArt creature={recruit} className="h-24 w-24 shrink-0" />
            <div>
              <p className="label-caps">A new Acolyte joins you</p>
              <p className="font-display text-xl text-gold-bright">{recruit.name}</p>
              <p className="text-xs text-mist">{recruit.role}</p>
            </div>
          </div>
        )}
        {rematch && (
          <div className="ornate fade-in flex items-center gap-3 p-3">
            <CreatureArt creature={rematch} className="h-28 w-28 shrink-0" />
            <div>
              <p className="label-caps">A second Oath</p>
              <p className="font-display text-xl text-gold-bright">{rematch.name}</p>
              <p className="lore text-mist">{rematch.title}</p>
            </div>
          </div>
        )}
        {report.unlockedVow && (
          <div className="fade-in">
            <p className="label-caps mb-1 text-center">A new Vow · it can now appear in your offers</p>
            <VowCard id={report.unlockedVow} />
          </div>
        )}

        {gains.length > 0 && (
          <div>
            <Divider>Growth</Divider>
            <div className="mt-3 space-y-2">
              {gains.map((g) => {
                const creature = CONTENT.creatures[g.id]
                const awakened = g.awakeningAfter > g.awakeningBefore
                return (
                  <div key={g.id} className="ornate-soft flex items-center gap-3 p-2.5">
                    <CreatureArt creature={creature} className="h-12 w-12 shrink-0" halo={false} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-display text-sm text-ivory">{creature.name}</span>
                        <span className="text-xs text-mist">+{g.xp} XP</span>
                      </div>
                      {awakened && (
                        <p className="text-xs font-bold text-gold-bright">
                          Awakening {g.awakeningAfter}! +{g.awakeningAfter - g.awakeningBefore} Awakening Point
                        </p>
                      )}
                      {g.masteryUps.map((m) => (
                        <p key={m.skill} className="text-xs text-ivory/90">
                          {CONTENT.skills[m.skill].name} <Stars value={m.stars} /> <span className="text-mist">{MASTERY_EFFECTS[m.stars]}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!report.won && (
          <div>
            <Divider>Hesper's counsel</Divider>
            <ul className="mt-3 space-y-2">
              {defeatTips(encounter).map((tip) => (
                <li key={tip} className="lore text-base text-mist">
                  ✦ {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-night via-night/90 to-transparent px-4 pb-4 pt-8 safe-bottom">
        <div className="mx-auto max-w-xs">
          <button type="button" className="btn-oath w-full" onClick={onContinue}>
            {report.chooseParagonIn ? 'The Paragons approach…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** The heart of a Tournament: choose one of the two Paragons. The other goes to Cassian. */
export function ParagonChoiceScreen({ regionId, onChoose }: { regionId: string; onChoose: (paragonId: string) => void }) {
  const region = REGION_BY_ID[regionId]
  const [selected, setSelected] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)

  return (
    <div className="relative min-h-full px-4 pb-32 pt-8">
      <Ambience backdrop={regionId} dim={0.5} motes={20} />
      <div className="mx-auto max-w-2xl text-center rise-in">
        <ElementLabel element={region.element} />
        <h1 className="title-display mt-1 text-3xl">Choose your Paragon</h1>
        <p className="lore mt-2 text-lg text-mist">Both have seen you fight. Only one may swear the Oath to you. The other will walk away.</p>
      </div>
      <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-3">
        {region.paragons.map((id) => {
          const creature = CONTENT.creatures[id]
          const picked = selected === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setSelected(id)
                setConfirm(false)
              }}
              className={`ornate-soft flex flex-col items-center p-3 text-left transition ${picked ? '!border-gold shadow-[0_0_40px_rgba(230,196,122,0.4)]' : selected ? 'opacity-60' : ''}`}
            >
              <CreatureArt creature={creature} className={`h-40 w-full sm:h-56 ${picked ? 'float' : ''}`} />
              <span className="mt-2 font-display text-lg tracking-wider text-gold-bright">{creature.name}</span>
              <span className="lore text-center text-sm text-mist">{creature.title}</span>
              <span className="mt-1 text-xs text-ivory/70">{creature.role}</span>
              <div className="mt-2 w-full space-y-1.5 border-t border-gold/15 pt-2">
                {[...creature.skills, creature.ascension!].map((s) => (
                  <div key={s} className="text-xs leading-tight">
                    <span className={s === creature.ascension ? 'text-gold-bright' : 'text-gold'}>
                      {s === creature.ascension ? '✦ ' : ''}
                      {CONTENT.skills[s].name}
                    </span>
                    <span className="block text-mist">{describeSkill(CONTENT.skills[s])}</span>
                  </div>
                ))}
              </div>
              {creature.lore && <p className="lore mt-2 text-sm leading-snug text-mist/90">{creature.lore}</p>}
            </button>
          )
        })}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-night via-night/90 to-transparent px-4 pb-4 pt-8 safe-bottom">
        <div className="mx-auto max-w-sm text-center">
          {selected && confirm && (
            <p className="mb-2 text-xs text-mist">
              {CONTENT.creatures[region.paragons.find((p) => p !== selected)!].name} will not join you. You can win it back much later.
            </p>
          )}
          <button
            type="button"
            className="btn-oath w-full"
            disabled={!selected}
            onClick={() => (confirm ? onChoose(selected!) : setConfirm(true))}
          >
            {!selected ? 'Choose one' : confirm ? `Swear the Oath with ${CONTENT.creatures[selected].name}` : `Choose ${CONTENT.creatures[selected].name}`}
          </button>
        </div>
      </div>
    </div>
  )
}

/** The Oath ceremony: the Sigil blazes and the Paragon shares one memory of the Unbinding. */
export function OathScreen({ paragonId, memoryIndex, onDone }: { paragonId: string; memoryIndex: number; onDone: () => void }) {
  const { save } = useGame()
  const creature = CONTENT.creatures[paragonId]
  const [step, setStep] = useState<'oath' | 'memory'>('oath')
  const memory = OATH_MEMORIES[Math.min(memoryIndex, OATH_MEMORIES.length - 1)]

  if (step === 'oath') {
    return (
      <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-6 py-10 text-center" onClick={() => setStep('memory')}>
        <Ambience motes={30} dim={0.75} />
        <div className="relative flex h-[340px] w-[340px] items-center justify-center">
          <div className="absolute inset-0 opacity-80">
            <Sigil size={340} />
          </div>
          <CreatureArt creature={creature} className="rise-in relative h-64 w-64" />
        </div>
        <p className="label-caps mt-4 fade-in" style={{ animationDelay: '0.4s' }}>
          The Oath is sworn
        </p>
        <h1 className="title-display mt-1 text-4xl fade-in" style={{ animationDelay: '0.6s' }}>
          {creature.name}
        </h1>
        <p className="lore mt-1 text-lg text-mist fade-in" style={{ animationDelay: '0.8s' }}>
          {creature.title}
        </p>
        <p className="lore mt-6 max-w-sm text-lg text-ivory/90 fade-in" style={{ animationDelay: '1.1s' }}>
          "By light and by will, I stand beside you, {save.name}."
        </p>
        <p className="mt-8 text-xs tracking-widest text-mist/70 pulse-glow">TAP TO CONTINUE</p>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center px-6 py-10 text-center" onClick={onDone}>
      <Ambience motes={10} dim={0.85} />
      <p className="label-caps">Oath Memory {Math.min(memoryIndex, OATH_MEMORIES.length - 1) + 1} of {OATH_MEMORIES.length}</p>
      <div className="divider mx-auto mt-3 w-40" />
      <p className="lore fade-in mt-6 max-w-lg text-xl leading-relaxed text-ivory/95 sm:text-2xl">{memory}</p>
      <p className="mt-6 text-sm text-mist">— as {creature.name} remembers it</p>
      <p className="mt-10 text-xs tracking-widest text-mist/70 pulse-glow">TAP TO CONTINUE</p>
    </div>
  )
}

/** The final choice after the finale: rewrite the Oath, or let it go. */
export function EndingChoiceScreen({ onChoose }: { onChoose: (ending: 'oath' | 'unbound') => void }) {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center px-5 py-10 text-center">
      <Ambience motes={26} dim={0.6} />
      <Sigil size={200} className="opacity-80" />
      <h1 className="title-display mt-2 text-3xl">The Oath hangs in the air</h1>
      <p className="lore mt-2 max-w-md text-lg text-mist">Half spoken, waiting. What will you do with it?</p>
      <div className="mt-8 grid w-full max-w-xl gap-3 sm:grid-cols-2">
        <button type="button" className="ornate-soft p-4 text-left transition hover:!border-gold" onClick={() => onChoose('oath')}>
          <p className="font-display text-lg text-gold-bright">Speak a new Oath</p>
          <p className="lore mt-1 text-base text-mist">Rewrite the words: no Paragon bound against its will. Bound as equals.</p>
        </button>
        <button type="button" className="ornate-soft p-4 text-left transition hover:!border-gold" onClick={() => onChoose('unbound')}>
          <p className="font-display text-lg text-gold-bright">Let it go</p>
          <p className="lore mt-1 text-base text-mist">Release the Oath forever, and trust the Paragons to stay by choice.</p>
        </button>
      </div>
    </div>
  )
}
