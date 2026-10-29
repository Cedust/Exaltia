import { useState } from 'react'
import { opposite } from '../../core/rules'
import type { Stats } from '../../core/types'
import { CONTENT } from '../../data'
import type { Encounter } from '../../data/world'
import { allowedIn, battleRules, bestOfFor, bossVowsFor, describeModifier, enemyMembers, formationProblems, joinFormation, playerMembers, themeOf } from '../../game/battles'
import { LANE_NAMES, carrierName, previewTargets, type MatchMember } from '../../game/duel'
import type { SaveState } from '../../game/save'
import { VOW_BY_ID } from '../../game/vows'
import { describeSkill } from '../describeSkill'
import { useGame } from '../GameContext'
import { Ambience, CreatureArt, Divider, ElementGem, ElementLabel, ScreenHeader } from '../kit'
import { ELEMENT_TEXT, RARITY_STYLE } from '../styles'
import { FormationGrid } from '../FormationGrid'
import { VowCard } from './MatchScreen'

type Tab = 'scout' | 'team'

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

export function PreBattleScreen({ encounter, onBack, onFight }: { encounter: Encounter; onBack: () => void; onFight: () => void }) {
  const { save, update } = useGame()
  const rules = battleRules(save, encounter)
  const enemy = enemyMembers(save, encounter)
  const problems = formationProblems(save, encounter)
  const theme = themeOf(encounter)
  const bossVows = bossVowsFor(save, encounter)
  const bestOf = bestOfFor(encounter)
  const [tab, setTab] = useState<Tab>(problems.length === 0 ? 'scout' : 'team')
  const preview = previewTargets(playerMembers(save), enemy, { player: [], enemy: bossVows })

  const setFormation = (formation: SaveState['formation']) => update((s) => ({ ...s, formation }))
  const toggle = (id: string) => {
    const formation = save.formation
    if (formation.some((f) => f.creature === id)) return setFormation(formation.filter((f) => f.creature !== id))
    if (formation.length >= rules.teamSize || !allowedIn(rules, id)) return
    setFormation(joinFormation(formation, id))
  }

  const enemyWeakness = [...new Set(enemy.map((m) => opposite(CONTENT.creatures[m.creature].element)).filter(Boolean))]

  return (
    <div className="relative flex h-full flex-col">
      <Ambience backdrop={encounter.backdrop} dim={0.7} motes={6} />
      <ScreenHeader title={encounter.name} subtitle={`vs ${encounter.opponent} · ${rules.teamSize}v${rules.teamSize} · best of ${bestOf}`} onBack={onBack} />
      {(encounter.modifiers?.length ?? 0) > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 bg-black/30 px-3 py-1.5">
          {encounter.modifiers!.map((m, i) => (
            <span key={i} className="rounded-sm border border-gold/40 px-2 py-0.5 text-xs uppercase tracking-wider text-gold-bright">
              {describeModifier(m)}
            </span>
          ))}
        </div>
      )}
      <nav className="flex border-b border-gold/20 bg-night/70">
        {(['scout', 'team'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 font-display text-xs tracking-[0.16em] uppercase transition ${tab === t ? 'border-b-2 border-gold text-gold-bright' : 'text-mist'}`}
          >
            {t === 'scout' ? 'Scouting' : `Your Team · ${save.formation.length}/${rules.teamSize}`}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-36 pt-3">
        <div className="mx-auto max-w-xl">
          {tab === 'scout' && (
            <div className="space-y-3 fade-in">
              <p className="text-center text-sm text-mist">{encounter.description}</p>
              <p className="text-center text-xs text-mist">
                Best of {bestOf}: win {Math.ceil(bestOf / 2)} round{bestOf > 1 ? 's' : ''}. Before every round {encounter.opponent} swears a Vow first, then you answer with
                one of yours.
              </p>
              <div className="ornate-soft bleed px-2 py-3">
                <FormationGrid player={save.formation} enemy={enemy} opponent={encounter.opponent} preview={preview} />
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
              <div className="ornate-soft bleed p-4">
                <div className="label-caps !text-2xs">Favourite Vows · {theme.theme}</div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                  {theme.prefers.map((id) => (
                    <span key={id} className={RARITY_STYLE[VOW_BY_ID[id].rarity].color}>
                      {VOW_BY_ID[id].name}
                    </span>
                  ))}
                </div>
              </div>
              {bossVows.length > 0 && (
                <>
                  <Divider>Boss Vows · sworn before round 1</Divider>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {bossVows.map((v) => (
                      <VowCard key={v.vow} id={v.vow} carrier={carrierName(v, enemy)} />
                    ))}
                  </div>
                </>
              )}
              {enemy.map((member, i) => (
                <EnemyCard key={i} member={member} />
              ))}
            </div>
          )}

          {tab === 'team' && (
            <div className="space-y-4 fade-in">
              <p className="text-center text-xs text-mist">
                Choose {rules.teamSize} creature{rules.teamSize > 1 ? 's' : ''}. The team is locked for the whole match, but you may re-form it before every
                round. A Front creature protects the Back creature in its own Lane, and attacks go to their own Lane first.
              </p>
              <div className="ornate-soft bleed px-2 py-3">
                <FormationGrid player={save.formation} enemy={enemy} opponent={encounter.opponent} preview={preview} onChange={setFormation} />
              </div>
              <div>
                <div className="label-caps mb-2">Your creatures</div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {save.order.map((id) => {
                    const c = CONTENT.creatures[id]
                    const ok = allowedIn(rules, id)
                    const placed = save.formation.some((f) => f.creature === id)
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={!ok}
                        onClick={() => toggle(id)}
                        className={`relative flex flex-col items-center rounded-md border p-1 transition ${placed ? 'border-gold bg-gold/15' : 'border-gold/15 bg-black/25'} ${ok ? '' : 'opacity-30'}`}
                      >
                        <CreatureArt creature={c} className="h-14 w-full" />
                        <span className={`line-clamp-2 w-full text-center text-xs font-bold leading-tight ${ELEMENT_TEXT[c.element]}`}>{c.name}</span>
                        {placed && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-gold shadow-[0_0_6px_#e6c47a]" />}
                        {c.kind === 'paragon' && <span className="absolute left-1 top-0.5 text-2xs text-gold">✦</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
              <p className="text-center text-xs text-mist">Your Vows: {save.vows.length}. Challenges teach new ones.</p>
            </div>
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-night via-night/95 to-transparent px-4 pb-3 pt-6 safe-bottom">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-1.5">
          {problems.length > 0 && (
            <button type="button" onClick={() => setTab('team')} className="rounded-full border border-red-300/40 bg-night/95 px-3 py-1 text-center text-xs text-red-200">
              {problems[0]}
            </button>
          )}
          <button type="button" className="btn-oath w-full" disabled={problems.length > 0} onClick={onFight}>
            ⚔ Begin the match
          </button>
        </div>
      </div>
    </div>
  )
}

function EnemyCard({ member }: { member: MatchMember }) {
  const creature = CONTENT.creatures[member.creature]
  const stats = member.loadout.stats ?? creature.stats
  const skills = member.loadout.skills ?? creature.skills
  return (
    <div className={`ornate-soft bleed p-4 ${member.boss ? '!border-gold/60' : ''}`}>
      <div className="flex gap-3">
        <CreatureArt creature={creature} flip className="h-20 w-20 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-base text-gold-bright">{creature.name}</span>
            {member.boss && <span className="rounded-sm bg-red-500/25 px-1.5 text-2xs uppercase tracking-widest text-red-200">Boss</span>}
            <span className="label-caps !text-2xs">
              {LANE_NAMES[member.lane]} {member.row}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ElementLabel element={creature.element} />
            <span className="text-xs text-mist">{creature.role}</span>
          </div>
          <div className="mt-1">
            <StatLine stats={stats} />
          </div>
        </div>
      </div>
      <div className="mt-2 space-y-1 text-xs">
        {member.boss && <p className="text-xs italic text-red-200/80">Below 50% Lifeforce its Sigil blazes and it fights fiercer.</p>}
        <details className="text-mist">
          <summary className="cursor-pointer text-xs text-gold">Skills</summary>
          <ul className="mt-1 space-y-0.5">
            {skills.map((id) => (
              <li key={id}>
                <span className="text-ivory">{CONTENT.skills[id].name}</span> · {describeSkill(member.loadout.skillDefs?.[id] ?? CONTENT.skills[id])}
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
