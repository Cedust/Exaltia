import { useState } from 'react'
import { elementName } from '../../core/log'
import type { Stats } from '../../core/types'
import { CONTENT } from '../../data'
import { PARAGON_IDS, STARTER_IDS } from '../../data/creatures'
import { SKILL_TREES, capstoneId, nodeId, type TreeNode } from '../../data/skillTrees'
import { REGIONS } from '../../data/world'
import { canBuy, oathRank, playerLoadout, treeState } from '../../game/loadout'
import { AWAKENING_XP, MASTERY_EFFECTS, MASTERY_USES, MAX_AWAKENING, MAX_OATH_RANK, OATH_PERKS, SHARDS_PER_RANK, awakeningOf, masteryOf } from '../../game/rules'
import { tournamentsWon, type OwnedCreature } from '../../game/save'
import { describeSkill } from '../describeSkill'
import { useGame } from '../GameContext'
import { Ambience, Bar, CreatureArt, Divider, ElementGem, ElementLabel, ScreenHeader, ShardIcon, Stars } from '../kit'
import { ELEMENT_HEX } from '../styles'
import { StatLine } from '../CreatureInfo'

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

/** Every creature of Exaltia, owned ones in full colour, the rest as silhouettes. */
export function CollectionView({ onOpen }: { onOpen: (id: string) => void }) {
  const { save } = useGame()
  const regionAcolytes = REGIONS.flatMap((r) => r.acolytes)
  const groups: { title: string; ids: string[] }[] = [
    { title: 'Paragons', ids: REGIONS.flatMap((r) => r.paragons).filter((id) => PARAGON_IDS.includes(id)) },
    { title: 'Acolytes', ids: [...STARTER_IDS, ...regionAcolytes] },
  ]
  const owned = Object.keys(save.creatures).length

  return (
    <div className="mx-auto max-w-3xl px-3 pb-6 pt-4">
      <p className="text-center text-sm text-mist">
        {owned} of {Object.keys(CONTENT.creatures).length} creatures found
      </p>
      {groups.map((group) => (
        <section key={group.title} className="mt-4">
          <Divider>{group.title}</Divider>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {group.ids.map((id) => {
              const creature = CONTENT.creatures[id]
              const mine = save.creatures[id]
              const inTeam = save.formation.some((f) => f.creature === id)
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!mine}
                  onClick={() => onOpen(id)}
                  className={`ornate-soft relative flex flex-col items-center px-1 pb-2 pt-1 transition ${mine ? 'active:scale-[0.98]' : 'opacity-70'}`}
                >
                  {inTeam && <span className="absolute left-1.5 top-1.5 rounded-full bg-gold/80 px-1.5 text-2xs font-bold text-night">TEAM</span>}
                  <ElementGem element={creature.element} className="absolute right-1.5 top-1.5" />
                  <CreatureArt creature={creature} className="h-24 w-full" dim={!mine} halo={!!mine} />
                  <span className={`mt-1 truncate font-display text-xs tracking-wide ${mine ? 'text-ivory' : 'text-mist'}`}>{mine ? creature.name : '???'}</span>
                  {mine && creature.kind === 'paragon' && <span className="text-2xs text-gold">Awakening {awakeningOf(mine.xp)}</span>}
                  {!mine && <span className="text-2xs text-mist/70">{elementName(creature.element)}</span>}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function nodeLabel(node: TreeNode): { title: string; detail: string } {
  switch (node.kind) {
    case 'skill':
      return { title: CONTENT.skills[node.skill].name, detail: describeSkill(CONTENT.skills[node.skill]) }
    case 'stat':
      return { title: `+${node.percent}% ${STAT_NAMES[node.stat]}`, detail: 'Attribute boost' }
    case 'passive':
      return { title: node.name, detail: node.description }
  }
}

const STAT_NAMES: Record<keyof Stats, string> = {
  lifeforce: 'Lifeforce',
  might: 'Might',
  resonance: 'Resonance',
  guard: 'Guard',
  ward: 'Ward',
  swiftness: 'Swiftness',
  essence: 'Essence',
}

/** One creature in detail: attributes, skills with Mastery, Skill Tree and Oath Rank. */
export function CreatureScreen({ creatureId, onBack }: { creatureId: string; onBack: () => void }) {
  const { save, update } = useGame()
  const creature = CONTENT.creatures[creatureId]
  const owned = save.creatures[creatureId]
  const [tab, setTab] = useState<'skills' | 'tree' | 'oath'>('skills')
  if (!owned) return null
  const loadout = playerLoadout(owned, tournamentsWon(save))
  const paragon = creature.kind === 'paragon'
  const awakening = awakeningOf(owned.xp)
  const nextXp = AWAKENING_XP[Math.min(MAX_AWAKENING, awakening + 1)]
  const skills = loadout.skills ?? creature.skills
  const setOwned = (change: (o: OwnedCreature) => OwnedCreature) =>
    update((s) => ({ ...s, creatures: { ...s.creatures, [creatureId]: change(s.creatures[creatureId]) } }))

  return (
    <div className="relative min-h-full pb-10">
      <Ambience dim={0.7} motes={8} />
      <ScreenHeader title={creature.name} subtitle={creature.title ?? creature.role} onBack={onBack} />
      <div className="mx-auto max-w-2xl px-3">
        <div className="relative mt-3 flex flex-col items-center">
          <div className="absolute inset-x-0 top-6 mx-auto h-48 w-48 rounded-full blur-3xl" style={{ background: `${ELEMENT_HEX[creature.element]}33` }} />
          <CreatureArt creature={creature} className="float relative h-56 w-56" />
          <div className="mt-1 flex items-center gap-2">
            <ElementLabel element={creature.element} />
            <span className="text-xs text-mist">{creature.role}</span>
          </div>
          {creature.lore && <p className="lore mt-2 max-w-md text-center text-base text-mist">{creature.lore}</p>}
        </div>

        <div className="ornate-soft bleed mt-4 space-y-2 p-4">
          {paragon ? (
            <div>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-sm text-gold-bright">Awakening {awakening}</span>
                <span className="text-xs text-mist">{awakening >= MAX_AWAKENING ? 'Fully awakened' : `${owned.xp} / ${nextXp} XP`}</span>
              </div>
              <Bar value={owned.xp - AWAKENING_XP[awakening]} max={awakening >= MAX_AWAKENING ? 1 : nextXp - AWAKENING_XP[awakening]} className="mt-1" />
            </div>
          ) : (
            <p className="text-xs text-mist">Acolytes keep their skills but grow stronger with every Tournament you win.</p>
          )}
          <StatLine stats={loadout.stats ?? creature.stats} />
        </div>

        {paragon && (
          <div className="bleed mt-4 flex overflow-hidden rounded-md border border-gold/30">
            {(['skills', 'tree', 'oath'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`min-h-11 flex-1 py-2 font-display text-xs tracking-[0.12em] ${tab === t ? 'bg-gold/20 text-gold-bright' : 'text-mist'}`}>
                {t === 'skills' ? 'SKILLS' : t === 'tree' ? `SKILL TREE${treeState(owned).available > 0 ? ` (${treeState(owned).available})` : ''}` : `OATH ${ROMAN[oathRank(owned)]}`}
              </button>
            ))}
          </div>
        )}

        {(tab === 'skills' || !paragon) && (
          <div className="mt-3 space-y-2">
            {skills.map((id) => {
              const def = loadout.skillDefs?.[id] ?? CONTENT.skills[id]
              const uses = owned.mastery[id] ?? 0
              const stars = masteryOf(uses)
              return (
                <div key={id} className="ornate-soft bleed px-4 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-sm text-gold">{def.name}</span>
                    {paragon && <Stars value={stars} />}
                  </div>
                  <p className="text-xs text-ivory/85">{describeSkill(def)}</p>
                  {paragon && (
                    <p className="mt-0.5 text-xs text-mist">
                      Mastery {stars}: {MASTERY_EFFECTS[stars]}
                      {stars < 5 && ` · next at ${MASTERY_USES[stars + 1]} uses (${uses} so far)`}
                    </p>
                  )}
                </div>
              )
            })}
            {creature.ascension && (
              <div className="ornate bleed px-4 py-3">
                <div className="label-caps !text-2xs">Ascension</div>
                <span className="font-display text-sm text-gold-bright">✦ {(loadout.skillDefs?.[creature.ascension] ?? CONTENT.skills[creature.ascension]).name}</span>
                <p className="text-xs text-ivory/85">{describeSkill(loadout.skillDefs?.[creature.ascension] ?? CONTENT.skills[creature.ascension])}</p>
                <p className="mt-0.5 text-xs text-mist">Fires on its own when the golden gauge is full. The gauge fills when this Paragon acts, takes damage or sees an ally fall.</p>
              </div>
            )}
          </div>
        )}

        {paragon && tab === 'tree' && <SkillTreeView owned={owned} setOwned={setOwned} />}
        {paragon && tab === 'oath' && <OathView owned={owned} shards={save.shards} setOwned={setOwned} spend={(n) => update((s) => ({ ...s, shards: s.shards - n }))} />}
      </div>
    </div>
  )
}

function SkillTreeView({ owned, setOwned }: { owned: OwnedCreature; setOwned: (change: (o: OwnedCreature) => OwnedCreature) => void }) {
  const tree = SKILL_TREES[owned.id]
  const state = treeState(owned)
  if (!tree) return null
  const buy = (id: string) => {
    if (canBuy(owned, id)) setOwned((o) => ({ ...o, tree: [...o.tree, id] }))
  }
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-ivory">
          <span className="font-display text-gold-bright">{state.available}</span> Awakening Point{state.available === 1 ? '' : 's'} free
        </p>
        <button
          type="button"
          className="btn-ghost !px-3 !py-1 text-xs"
          disabled={owned.tree.length === 0}
          onClick={() => setOwned((o) => ({ ...o, tree: [] }))}
        >
          Reset paths
        </button>
      </div>
      <p className="mt-1 px-1 text-xs text-mist">Each Awakening level gives 1 point. Nodes cost 1, Capstones 2. Resetting is free: try builds against each opponent.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {tree.map((path, p) => (
          <div key={path.name} className="ornate-soft bleed p-3">
            <div className="text-center">
              <div className="font-display text-sm tracking-wider text-gold-bright">{path.name}</div>
              <div className="label-caps !text-2xs">{path.theme}</div>
            </div>
            <div className="mt-2 space-y-1.5">
              {path.nodes.map((node, n) => {
                const id = nodeId(owned.id, p, n)
                const has = owned.tree.includes(id)
                const can = canBuy(owned, id)
                const label = nodeLabel(node)
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!can}
                    onClick={() => buy(id)}
                    className={`relative w-full rounded border px-2 py-1.5 text-left transition ${
                      has ? 'border-gold bg-gold/15' : can ? 'border-gold/50 bg-black/30 hover:bg-gold/10' : 'border-white/10 bg-black/20 opacity-55'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`text-2xs ${has ? 'text-gold-bright' : 'text-mist'}`}>{has ? '◆' : '◇'}</span>
                      <span className="text-xs font-bold text-ivory">{label.title}</span>
                      <span className="ml-auto text-2xs uppercase text-mist">{node.kind}</span>
                    </div>
                    <p className="text-xs leading-snug text-mist">{label.detail}</p>
                  </button>
                )
              })}
              {(() => {
                const id = capstoneId(owned.id, p)
                const has = owned.tree.includes(id)
                const can = canBuy(owned, id)
                return (
                  <button
                    type="button"
                    disabled={!can}
                    onClick={() => buy(id)}
                    className={`w-full rounded border-2 px-2 py-2 text-left transition ${has ? 'border-gold bg-gold/20 shadow-[0_0_16px_rgba(230,196,122,0.35)]' : can ? 'border-gold/60 bg-black/30' : 'border-white/10 bg-black/20 opacity-55'}`}
                  >
                    <div className="label-caps !text-2xs">Capstone · 2 points</div>
                    <div className="text-xs font-bold text-gold-bright">{path.capstone.name}</div>
                    <p className="text-xs leading-snug text-mist">{path.capstone.description}</p>
                  </button>
                )
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OathView({
  owned,
  shards,
  setOwned,
  spend,
}: {
  owned: OwnedCreature
  shards: number
  setOwned: (change: (o: OwnedCreature) => OwnedCreature) => void
  spend: (n: number) => void
}) {
  const rank = oathRank(owned)
  const max = MAX_OATH_RANK * SHARDS_PER_RANK
  const invest = (n: number) => {
    const amount = Math.min(n, shards, max - owned.oath)
    if (amount <= 0) return
    spend(amount)
    setOwned((o) => ({ ...o, oath: o.oath + amount }))
  }
  const needsAttunement = (rank >= 2 && owned.attunements.length < 1) || (rank >= 4 && owned.attunements.length < 2)

  return (
    <div className="mt-3 space-y-3">
      <div className="ornate bleed p-4 text-center">
        <div className="label-caps">Oath Rank</div>
        <div className="title-display text-5xl">{ROMAN[rank]}</div>
        <Bar value={owned.oath - rank * SHARDS_PER_RANK} max={rank >= MAX_OATH_RANK ? 0.0001 : SHARDS_PER_RANK} className="mx-auto mt-2 max-w-xs" />
        <p className="mt-1 text-xs text-mist">
          {owned.oath} / {max} shards · each shard makes this Paragon a little stronger
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 text-sm text-gold-bright">
            <ShardIcon /> {shards}
          </span>
          <button type="button" className="btn-ghost !px-3 !py-1 text-xs" disabled={shards < 1 || owned.oath >= max} onClick={() => invest(1)}>
            +1
          </button>
          <button type="button" className="btn-oath !px-4 !py-1.5 text-xs" disabled={shards < 1 || owned.oath >= max} onClick={() => invest(SHARDS_PER_RANK)}>
            +10
          </button>
        </div>
        <p className="mt-2 text-xs text-mist">Ranks VI–X need this Paragon's own Sigil Shards (coming with the endgame Spire).</p>
      </div>

      {needsAttunement && (
        <div className="ornate fade-in p-3 text-center">
          <p className="label-caps">Choose an Attunement</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="flex flex-1 flex-col items-center rounded-md border border-gold/50 bg-black/30 px-2 py-2 transition hover:bg-gold/10"
              onClick={() => setOwned((o) => ({ ...o, attunements: [...o.attunements, 'offense'] }))}
            >
              <span className="font-display text-sm tracking-wider text-gold-bright">Offense</span>
              <span className="text-xs text-mist">+8% Might & Resonance</span>
            </button>
            <button
              type="button"
              className="flex flex-1 flex-col items-center rounded-md border border-gold/50 bg-black/30 px-2 py-2 transition hover:bg-gold/10"
              onClick={() => setOwned((o) => ({ ...o, attunements: [...o.attunements, 'defense'] }))}
            >
              <span className="font-display text-sm tracking-wider text-gold-bright">Defense</span>
              <span className="text-xs text-mist">+8% Guard & Ward</span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {Object.entries(OATH_PERKS).map(([r, perk]) => {
          const reached = rank >= Number(r)
          const attunement = Number(r) === 2 ? owned.attunements[0] : Number(r) === 4 ? owned.attunements[1] : undefined
          return (
            <div key={r} className={`flex items-center gap-3 rounded border px-3 py-2 ${reached ? 'border-gold/60 bg-gold/10' : 'border-white/10 opacity-60'}`}>
              <span className="w-8 font-display text-gold-bright">{ROMAN[Number(r)]}</span>
              <div>
                <div className="text-xs font-bold text-ivory">
                  {perk.name}
                  {attunement && <span className="ml-1 font-normal capitalize text-gold">({attunement})</span>}
                </div>
                <div className="text-xs text-mist">{perk.description}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
