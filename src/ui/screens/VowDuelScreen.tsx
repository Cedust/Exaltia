import { useState } from 'react'
import { runBattle } from '../../core/battle'
import type { BattleResult, Row } from '../../core/types'
import { CONTENT } from '../../data'
import type { Encounter } from '../../data/world'
import {
  DUEL_OPPONENTS,
  DUEL_POOL,
  DUEL_TEAM_SIZE,
  OPPONENT_BY_ID,
  PLAYER_TIER,
  autoPick,
  carrierName,
  defaultRow,
  eligibleTargets,
  enemySwears,
  matchWinner,
  newMatch,
  offerFor,
  offerRules,
  recordRound,
  resolveVow,
  roundNumber,
  roundSeed,
  roundTeams,
  rowFull,
  swear,
  winsNeeded,
  type DuelMatch,
  type DuelSlot,
  type SwornVow,
} from '../../game/duel'
import { KIND_NAMES, VOW_BY_ID, type Rarity } from '../../game/vows'
import { Ambience, CreatureArt, Divider, ElementGem, ScreenHeader } from '../kit'
import { BattleScreen } from './BattleScreen'

const RARITY_STYLE: Record<Rarity, { label: string; color: string; ring: string }> = {
  common: { label: 'Common', color: 'text-[#d3d8e2]', ring: 'border-[#9aa3b5]/50' },
  rare: { label: 'Rare', color: 'text-[#a9c4ff]', ring: 'border-[#7d9cff]/70 shadow-[0_0_18px_rgba(125,156,255,0.25)]' },
  exalted: { label: 'Exalted', color: 'text-gold-bright', ring: 'border-gold shadow-[0_0_26px_rgba(230,196,122,0.45)]' },
}

type Phase =
  | { kind: 'setup' }
  | { kind: 'pick'; match: DuelMatch }
  | { kind: 'battle'; match: DuelMatch; result: BattleResult; id: number }
  | { kind: 'end'; match: DuelMatch }

const newSeed = () => Math.floor(Math.random() * 1_000_000)
const other = (row: Row): Row => (row === 'front' ? 'back' : 'front')

/** Prototype of the Vow Duel format: best of 5 short auto fights, one Vow per side before every round. */
export function VowDuelScreen({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' })
  const [speed, setSpeed] = useState(2)

  const startRound = (match: DuelMatch) => setPhase({ kind: 'pick', match: enemySwears(match) })

  switch (phase.kind) {
    case 'setup':
      return <SetupView onExit={onExit} onStart={(opponent, slots) => startRound(newMatch(opponent, slots, newSeed()))} />
    case 'pick':
      return (
        <PickView
          match={phase.match}
          onExit={onExit}
          onFight={(match) => {
            const result = runBattle({ ...roundTeams(match), seed: roundSeed(match) }, CONTENT)
            setPhase({ kind: 'battle', match, result, id: Date.now() })
          }}
        />
      )
    case 'battle': {
      const { match, result } = phase
      const opponent = OPPONENT_BY_ID[match.opponent]
      const encounter: Encounter = {
        id: `duel-round-${roundNumber(match)}`,
        kind: 'match',
        name: `Round ${roundNumber(match)} · ${match.wins.player}–${match.wins.enemy}`,
        opponent: opponent.name,
        description: '',
        members: [],
        backdrop: opponent.backdrop,
      }
      const next = recordRound(match, result.winner)
      const over = matchWinner(next) !== null
      return (
        <BattleScreen
          key={phase.id}
          encounter={encounter}
          result={result}
          speed={speed}
          onSpeed={setSpeed}
          doneLabel={over ? 'See the result' : result.winner === 'draw' ? 'Replay the round' : 'Next round'}
          onDone={() => (over ? setPhase({ kind: 'end', match: next }) : startRound(next))}
        />
      )
    }
    case 'end':
      return <EndView match={phase.match} onAgain={() => setPhase({ kind: 'setup' })} onExit={onExit} />
  }
}

// ── Setup: opponent and team ──

function SetupView({ onStart, onExit }: { onStart: (opponent: string, slots: DuelSlot[]) => void; onExit: () => void }) {
  const [opponent, setOpponent] = useState(DUEL_OPPONENTS[0].id)
  const [slots, setSlots] = useState<DuelSlot[]>([])

  const toggle = (id: string) =>
    setSlots((s) => {
      if (s.some((x) => x.creature === id)) return s.filter((x) => x.creature !== id)
      if (s.length >= DUEL_TEAM_SIZE) return s
      const row = defaultRow(id)
      return [...s, { creature: id, row: rowFull(s, row) ? other(row) : row }]
    })

  return (
    <div className="relative min-h-full pb-28">
      <Ambience backdrop={OPPONENT_BY_ID[opponent].backdrop} dim={0.7} />
      <ScreenHeader title="Vow Duel" subtitle="Prototype · best of 5" onBack={onExit} />
      <div className="mx-auto max-w-3xl px-4 pt-4">
        <p className="lore text-center text-lg text-mist">
          Short auto fights, best of 5. Your team is locked for the match. Before every round, both sides swear one Vow, and the opponent always
          reveals first.
        </p>

        <Divider>Opponent</Divider>
        <div className="grid gap-2 sm:grid-cols-3">
          {DUEL_OPPONENTS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setOpponent(o.id)}
              className={`ornate-soft p-3 text-left transition ${o.id === opponent ? '!border-gold shadow-[0_0_24px_rgba(230,196,122,0.3)]' : 'opacity-80'}`}
            >
              <div className="font-display text-sm tracking-wider text-gold-bright">{o.name}</div>
              <div className="label-caps !text-[0.6rem]">{o.theme}</div>
              <div className="mt-2 flex gap-1">
                {o.members.map((m, i) => (
                  <CreatureArt key={i} creature={CONTENT.creatures[m.creature]} className="h-14 w-14" halo={false} flip />
                ))}
              </div>
              <p className="mt-2 text-xs leading-snug text-mist">{o.description}</p>
            </button>
          ))}
        </div>

        <Divider>Your team · {slots.length}/{DUEL_TEAM_SIZE}</Divider>
        <div className="grid grid-cols-4 gap-2">
          {DUEL_POOL.map((id) => {
            const creature = CONTENT.creatures[id]
            const slot = slots.find((s) => s.creature === id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className={`ornate-soft relative flex flex-col items-center p-1.5 transition ${slot ? '!border-gold shadow-[0_0_20px_rgba(230,196,122,0.3)]' : 'opacity-75'}`}
              >
                <CreatureArt creature={creature} className="h-16 w-16 sm:h-20 sm:w-20" />
                <span className="mt-1 flex items-center gap-1 text-center font-display text-[0.65rem] tracking-wide text-gold-bright">
                  <ElementGem element={creature.element} className="!h-2 !w-2" />
                  {creature.name}
                </span>
                <span className="text-[0.6rem] text-mist">{creature.kind === 'paragon' ? 'Paragon' : 'Acolyte'}</span>
              </button>
            )
          })}
        </div>
        {slots.length > 0 && <RowEditor slots={slots} onChange={setSlots} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-night via-night/90 to-transparent px-4 pb-4 pt-8 safe-bottom">
        <div className="mx-auto max-w-sm">
          <button type="button" className="btn-oath w-full" disabled={slots.length !== DUEL_TEAM_SIZE} onClick={() => onStart(opponent, slots)}>
            Lock team and begin
          </button>
        </div>
      </div>
    </div>
  )
}

/** Front / Back toggle per creature (max 3 per row). */
function RowEditor({ slots, onChange }: { slots: DuelSlot[]; onChange: (slots: DuelSlot[]) => void }) {
  return (
    <div className="mt-3 space-y-1.5">
      {slots.map((s, i) => (
        <div key={s.creature} className="flex items-center justify-between gap-2 rounded border border-gold/15 bg-night/50 px-2 py-1">
          <span className="text-sm text-ivory">{CONTENT.creatures[s.creature].name}</span>
          <div className="flex overflow-hidden rounded-full border border-gold/40">
            {(['front', 'back'] as const).map((row) => (
              <button
                key={row}
                type="button"
                disabled={s.row !== row && rowFull(slots, row, i)}
                onClick={() => onChange(slots.map((x, j) => (j === i ? { ...x, row } : x)))}
                className={`px-3 py-0.5 font-display text-[0.65rem] tracking-wider disabled:opacity-30 ${s.row === row ? 'bg-gold/25 text-gold-bright' : 'text-mist'}`}
              >
                {row === 'front' ? 'Front' : 'Back'}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Picking a Vow ──

function Score({ match }: { match: DuelMatch }) {
  const need = winsNeeded(match)
  const pips = (wins: number, color: string) => (
    <span className="flex gap-1">
      {Array.from({ length: need }, (_, i) => (
        <span key={i} className={`h-2.5 w-2.5 rotate-45 border ${i < wins ? `${color} border-transparent` : 'border-gold/40'}`} />
      ))}
    </span>
  )
  return (
    <div className="flex items-center justify-center gap-4 py-2">
      <div className="flex flex-col items-center gap-1">
        <span className="label-caps !text-[0.6rem]">You</span>
        {pips(match.wins.player, 'bg-gold')}
      </div>
      <div className="font-display text-2xl text-gold-bright">
        {match.wins.player} – {match.wins.enemy}
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="label-caps !text-[0.6rem]">{OPPONENT_BY_ID[match.opponent].name}</span>
        {pips(match.wins.enemy, 'bg-[#e0574f]')}
      </div>
    </div>
  )
}

function VowCard({ id, selected, onClick, carrier }: { id: string; selected?: boolean; onClick?: () => void; carrier?: string }) {
  const vow = VOW_BY_ID[id]
  const style = RARITY_STYLE[vow.rarity]
  const body = (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`font-display text-sm tracking-wide ${style.color}`}>{vow.name}</span>
        <span className={`label-caps !text-[0.55rem] ${style.color}`}>{style.label}</span>
      </div>
      <div className="label-caps !text-[0.55rem]">
        {KIND_NAMES[vow.kind]} · {vow.scope === 'creature' ? 'one creature' : vow.scope === 'team' ? 'whole team' : 'Front Row'}
        {carrier && <span className="text-ivory"> · {carrier}</span>}
      </div>
      <p className="mt-1 text-xs leading-snug text-ivory/85">{vow.text}</p>
    </>
  )
  const cls = `block w-full rounded-md border bg-night/70 p-2.5 text-left transition ${style.ring} ${selected ? 'ring-2 ring-gold' : ''}`
  return onClick ? (
    <button type="button" className={cls} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

function VowList({ title, vows, slots }: { title: string; vows: SwornVow[]; slots: DuelSlot[] }) {
  return (
    <div>
      <div className="label-caps mb-1 !text-[0.6rem]">{title}</div>
      {vows.length === 0 ? (
        <p className="text-xs text-mist/70">No Vows yet.</p>
      ) : (
        <div className="space-y-1">
          {vows.map((v, i) => (
            <div key={i} className="text-xs">
              <span className={RARITY_STYLE[VOW_BY_ID[v.vow].rarity].color}>{VOW_BY_ID[v.vow].name}</span>
              <span className="text-mist"> · {carrierName(v, slots)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PickView({ match: initial, onFight, onExit }: { match: DuelMatch; onFight: (match: DuelMatch) => void; onExit: () => void }) {
  const [match, setMatch] = useState(initial)
  const [choice, setChoice] = useState<string | null>(null)
  const [target, setTarget] = useState<number | undefined>(undefined)
  const offer = offerFor(match, 'player')
  const rules = offerRules(match, 'player')
  const opponent = OPPONENT_BY_ID[match.opponent]
  const revealed = match.vows.enemy[match.vows.enemy.length - 1]
  const last = match.rounds[match.rounds.length - 1]

  const chosen = choice ? VOW_BY_ID[choice] : null
  // Mirror Oath copies the opponent's last Vow, so its target rules are that Vow's.
  const effective = chosen && choice === 'mirror-oath' && revealed ? VOW_BY_ID[revealed.vow] : chosen
  const targets = effective?.scope === 'creature' ? eligibleTargets(effective, match.player, match.vows.player, PLAYER_TIER) : []
  const needsTarget = targets.length > 0
  const ready = !!choice && (!needsTarget || (target !== undefined && targets.includes(target)))

  const pick = (id: string) => {
    setChoice(id)
    setTarget(undefined)
  }
  const fight = (sworn: SwornVow) => onFight(swear(match, 'player', sworn))

  return (
    <div className="relative min-h-full pb-32">
      <Ambience backdrop={opponent.backdrop} dim={0.72} />
      <ScreenHeader title={`Round ${roundNumber(match)}`} subtitle={`Best of ${match.bestOf} vs ${opponent.name}`} onBack={onExit} />
      <div className="mx-auto max-w-3xl px-4">
        <Score match={match} />
        {last && (
          <p className="text-center text-xs text-mist">
            {last === 'player' ? 'You won the last round.' : last === 'enemy' ? 'You lost the last round: you see 4 Vows, one at least Rare.' : 'The last round was a draw.'}
            {rules.atLeast === 'exalted' && ' Match point against you: one Exalted Vow is guaranteed.'}
          </p>
        )}

        {revealed && (
          <>
            <Divider>{opponent.name} swore</Divider>
            <VowCard id={revealed.vow} carrier={carrierName(revealed, match.enemy)} />
          </>
        )}

        <Divider>Swear your Vow</Divider>
        <div className="grid gap-2 sm:grid-cols-2">
          {offer.map((id) => (
            <VowCard key={id} id={id} selected={choice === id} onClick={() => pick(id)} />
          ))}
        </div>
        <div className="mt-2 flex justify-center gap-2">
          <button
            type="button"
            className="btn-ghost !px-3 !py-1 text-xs"
            disabled={match.rerollsLeft <= 0}
            onClick={() => {
              setMatch((m) => ({ ...m, rerollsLeft: m.rerollsLeft - 1, rerolls: m.rerolls + 1 }))
              setChoice(null)
            }}
          >
            Reroll · {match.rerollsLeft}
          </button>
          <button type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={() => fight(autoPick(match, offer))}>
            Auto-pick
          </button>
        </div>

        {needsTarget && (
          <>
            <Divider>Who carries {chosen!.name}?</Divider>
            <div className="flex justify-center gap-2">
              {match.player.map((s, i) => {
                const creature = CONTENT.creatures[s.creature]
                const allowed = targets.includes(i)
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!allowed}
                    onClick={() => setTarget(i)}
                    className={`ornate-soft flex w-24 flex-col items-center p-1.5 disabled:opacity-30 ${target === i ? '!border-gold shadow-[0_0_20px_rgba(230,196,122,0.35)]' : ''}`}
                  >
                    <CreatureArt creature={creature} className="h-14 w-14" />
                    <span className="text-center font-display text-[0.62rem] text-gold-bright">{creature.name}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        <Divider>Formation</Divider>
        <RowEditor slots={match.player} onChange={(player) => setMatch((m) => ({ ...m, player }))} />

        <div className="mt-4 grid grid-cols-2 gap-3 rounded border border-gold/15 bg-night/50 p-3">
          <VowList title="Your Vows" vows={match.vows.player} slots={match.player} />
          <VowList title="Their Vows" vows={match.vows.enemy} slots={match.enemy} />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-night via-night/90 to-transparent px-4 pb-4 pt-8 safe-bottom">
        <div className="mx-auto max-w-sm">
          <button type="button" className="btn-oath w-full" disabled={!ready} onClick={() => fight(resolveVow(match, 'player', choice!, target))}>
            {choice ? `Swear ${VOW_BY_ID[choice].name} and fight` : 'Choose a Vow'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Result ──

function EndView({ match, onAgain, onExit }: { match: DuelMatch; onAgain: () => void; onExit: () => void }) {
  const won = matchWinner(match) === 'player'
  const opponent = OPPONENT_BY_ID[match.opponent]
  return (
    <div className="relative flex min-h-full flex-col items-center px-4 pb-10 pt-10 text-center">
      <Ambience backdrop={opponent.backdrop} dim={0.65} />
      <p className="label-caps">Best of {match.bestOf} · {opponent.name}</p>
      <h1 className="title-display mt-1 text-4xl">{won ? 'Victory' : 'Defeat'}</h1>
      <Score match={match} />
      <div className="mt-2 flex gap-1.5">
        {match.rounds.map((r, i) => (
          <span key={i} className={`rounded px-2 py-0.5 font-display text-xs ${r === 'player' ? 'bg-gold/25 text-gold-bright' : r === 'enemy' ? 'bg-[#e0574f]/25 text-[#ffb0a8]' : 'bg-white/10 text-mist'}`}>
            R{i + 1} {r === 'player' ? 'W' : r === 'enemy' ? 'L' : 'D'}
          </span>
        ))}
      </div>
      <div className="mt-6 grid w-full max-w-xl grid-cols-2 gap-3 rounded border border-gold/15 bg-night/50 p-3 text-left">
        <VowList title="Your Vows" vows={match.vows.player} slots={match.player} />
        <VowList title="Their Vows" vows={match.vows.enemy} slots={match.enemy} />
      </div>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <button type="button" className="btn-oath" onClick={onAgain}>
          Duel again
        </button>
        <button type="button" className="btn-ghost" onClick={onExit}>
          Back to title
        </button>
      </div>
    </div>
  )
}
