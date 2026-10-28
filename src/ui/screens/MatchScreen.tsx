import { useState } from 'react'
import { runBattle } from '../../core/battle'
import type { BattleResult, Row } from '../../core/types'
import { CONTENT } from '../../data'
import type { Encounter } from '../../data/world'
import {
  autoPick,
  carrierName,
  eligibleTargets,
  enemySwears,
  matchWinner,
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
import { KIND_NAMES, VOW_BY_ID } from '../../game/vows'
import { Ambience, CreatureArt, Divider, ScreenHeader } from '../kit'
import { ELEMENT_TEXT, RARITY_STYLE } from '../styles'
import { BattleScreen } from './BattleScreen'

type Phase = { kind: 'pick'; match: DuelMatch } | { kind: 'battle'; match: DuelMatch; result: BattleResult; id: number }

/**
 * A Vow Duel match: before every round the opponent reveals its Vow, the player swears one, then a short auto
 * fight plays. Ends when one side has won enough rounds.
 */
export function MatchScreen({
  encounter,
  initial,
  speed,
  onSpeed,
  onDone,
  onForfeit,
}: {
  encounter: Encounter
  initial: DuelMatch
  speed: number
  onSpeed: (speed: number) => void
  onDone: (match: DuelMatch, results: BattleResult[]) => void
  onForfeit: () => void
}) {
  const [phase, setPhase] = useState<Phase>(() => ({ kind: 'pick', match: enemySwears(initial) }))
  const [results, setResults] = useState<BattleResult[]>([])

  if (phase.kind === 'pick') {
    return (
      <PickView
        match={phase.match}
        onForfeit={onForfeit}
        onFight={(match) => {
          const result = runBattle({ ...roundTeams(match), seed: roundSeed(match) }, CONTENT)
          setPhase({ kind: 'battle', match, result, id: Date.now() })
        }}
      />
    )
  }

  const { match, result } = phase
  const next = recordRound(match, result.winner)
  const over = matchWinner(next) !== null
  return (
    <BattleScreen
      key={phase.id}
      encounter={{ ...encounter, name: `Round ${roundNumber(match)} · ${match.wins.player}–${match.wins.enemy}` }}
      result={result}
      speed={speed}
      onSpeed={onSpeed}
      doneLabel={over ? 'See the result' : result.winner === 'draw' ? 'Replay the round' : 'Next round'}
      onDone={() => {
        const all = [...results, result]
        setResults(all)
        if (over) onDone(next, all)
        else setPhase({ kind: 'pick', match: enemySwears(next) })
      }}
    />
  )
}

// ── Shared pieces (also used when scouting and after the match) ──

/** Front / Back toggle per creature (max 3 per row). */
export function RowEditor<T extends DuelSlot>({ slots, onChange }: { slots: T[]; onChange: (slots: T[]) => void }) {
  return (
    <div className="space-y-1.5">
      {slots.map((s, i) => {
        const creature = CONTENT.creatures[s.creature]
        return (
          <div key={s.creature} className="flex items-center justify-between gap-2 rounded border border-gold/15 bg-night/50 px-2 py-1">
            <span className="flex min-w-0 items-center gap-2">
              <CreatureArt creature={creature} className="h-9 w-9 shrink-0" halo={false} />
              <span className={`truncate text-sm font-bold ${ELEMENT_TEXT[creature.element]}`}>{creature.name}</span>
            </span>
            <div className="flex shrink-0 overflow-hidden rounded-full border border-gold/40">
              {(['front', 'back'] as const).map((row: Row) => (
                <button
                  key={row}
                  type="button"
                  disabled={s.row !== row && rowFull(slots, row, i)}
                  onClick={() => onChange(slots.map((x, j) => (j === i ? { ...x, row } : x)))}
                  className={`px-3 py-1 font-display text-[0.65rem] tracking-wider disabled:opacity-30 ${s.row === row ? 'bg-gold/25 text-gold-bright' : 'text-mist'}`}
                >
                  {row === 'front' ? 'Front' : 'Back'}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Both rows of a team as small portraits: the Front Row shields the Back Row. */
export function TeamRows({ slots, enemy }: { slots: DuelSlot[]; enemy?: boolean }) {
  const rows: Row[] = ['front', 'back']
  return (
    <div className="space-y-1.5">
      {rows.map((row) => {
        const members = slots.filter((s) => s.row === row)
        return (
          <div key={row} className="flex items-center gap-2">
            <span className="label-caps w-12 shrink-0 !text-[0.55rem]">{row} row</span>
            <div className="flex min-h-14 flex-1 flex-wrap gap-1.5">
              {members.length === 0 && <span className="self-center text-xs text-mist/60">empty</span>}
              {members.map((s, i) => {
                const creature = CONTENT.creatures[s.creature]
                return (
                  <div key={i} className="flex w-16 flex-col items-center">
                    <CreatureArt creature={creature} className="h-14 w-14" halo={false} flip={enemy} />
                    <span className={`w-full truncate text-center text-[0.6rem] font-bold ${ELEMENT_TEXT[creature.element]}`}>{creature.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function Score({ match }: { match: DuelMatch }) {
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
      <div className="flex w-24 flex-col items-center gap-1">
        <span className="label-caps !text-[0.6rem]">You</span>
        {pips(match.wins.player, 'bg-gold')}
      </div>
      <div className="font-display text-2xl text-gold-bright">
        {match.wins.player} – {match.wins.enemy}
      </div>
      <div className="flex w-24 flex-col items-center gap-1">
        <span className="label-caps max-w-full truncate !text-[0.6rem]">{match.opponent}</span>
        {pips(match.wins.enemy, 'bg-[#e0574f]')}
      </div>
    </div>
  )
}

export function VowCard({ id, selected, onClick, carrier }: { id: string; selected?: boolean; onClick?: () => void; carrier?: string }) {
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

export function VowList({ title, vows, slots }: { title: string; vows: SwornVow[]; slots: DuelSlot[] }) {
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

/** Round result pills: R1 W, R2 L ... */
export function RoundPills({ rounds }: { rounds: DuelMatch['rounds'] }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {rounds.map((r, i) => (
        <span
          key={i}
          className={`rounded px-2 py-0.5 font-display text-xs ${r === 'player' ? 'bg-gold/25 text-gold-bright' : r === 'enemy' ? 'bg-[#e0574f]/25 text-[#ffb0a8]' : 'bg-white/10 text-mist'}`}
        >
          R{i + 1} {r === 'player' ? 'W' : r === 'enemy' ? 'L' : 'D'}
        </span>
      ))}
    </div>
  )
}

// ── Picking a Vow ──

function PickView({ match: initial, onFight, onForfeit }: { match: DuelMatch; onFight: (match: DuelMatch) => void; onForfeit: () => void }) {
  const [match, setMatch] = useState(initial)
  const [choice, setChoice] = useState<string | null>(null)
  const [target, setTarget] = useState<number | undefined>(undefined)
  const [leaving, setLeaving] = useState(false)
  const offer = offerFor(match, 'player')
  const rules = offerRules(match, 'player')
  const revealed = match.rounds.length + 1 <= match.vows.enemy.length ? match.vows.enemy[match.vows.enemy.length - 1] : undefined
  const last = match.rounds[match.rounds.length - 1]
  const firstRound = match.rounds.length === 0

  const chosen = choice ? VOW_BY_ID[choice] : null
  // Mirror Oath copies the opponent's last Vow, so its target rules are that Vow's.
  const effective = chosen && choice === 'mirror-oath' && revealed ? VOW_BY_ID[revealed.vow] : chosen
  const targets = effective?.scope === 'creature' ? eligibleTargets(effective, match.player, match.vows.player) : []
  const needsTarget = targets.length > 0
  const ready = offer.length === 0 || (!!choice && (!needsTarget || (target !== undefined && targets.includes(target))))

  const pick = (id: string) => {
    setChoice(id)
    setTarget(undefined)
  }
  const fight = (sworn: SwornVow | null) => onFight(sworn ? swear(match, 'player', sworn) : match)

  return (
    <div className="relative min-h-full pb-32">
      <Ambience backdrop={match.backdrop} dim={0.72} />
      <ScreenHeader
        title={`Round ${roundNumber(match)}`}
        subtitle={`${match.name} · best of ${match.bestOf}`}
        onBack={() => setLeaving(true)}
      />
      <div className="mx-auto max-w-3xl px-4">
        {leaving && (
          <div className="ornate-soft mt-3 p-3 text-center fade-in">
            <p className="text-sm text-mist">Leave the match? It ends without a result and you can start it again.</p>
            <div className="mt-2 flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={() => setLeaving(false)}>
                Keep fighting
              </button>
              <button type="button" className="btn-oath flex-1 !px-3" onClick={onForfeit}>
                Leave
              </button>
            </div>
          </div>
        )}
        <Score match={match} />
        {last && (
          <p className="text-center text-xs text-mist">
            {last === 'player' ? 'You won the last round.' : last === 'enemy' ? 'You lost the last round: you see 4 Vows, one at least Rare.' : 'The last round was a draw.'}
            {rules.atLeast === 'exalted' && ' Match point against you: one Exalted Vow is guaranteed.'}
          </p>
        )}
        {firstRound && (
          <p className="text-center text-xs text-mist">Win {winsNeeded(match)} rounds to take the match. Every Vow you swear lasts until the match ends.</p>
        )}

        {revealed && (
          <>
            <Divider>{match.opponent} swore</Divider>
            <VowCard id={revealed.vow} carrier={carrierName(revealed, match.enemy)} />
          </>
        )}

        <Divider>Swear your Vow</Divider>
        {offer.length === 0 ? (
          <p className="text-center text-sm text-mist">You have no Vow left to swear. Fight on with what you hold.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {offer.map((id) => (
              <VowCard key={id} id={id} selected={choice === id} onClick={() => pick(id)} />
            ))}
          </div>
        )}
        {offer.length > 0 && (
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
        )}

        {needsTarget && (
          <>
            <Divider>Who carries {chosen!.name}?</Divider>
            <div className="flex flex-wrap justify-center gap-2">
              {match.player.map((s, i) => {
                const creature = CONTENT.creatures[s.creature]
                const allowed = targets.includes(i)
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!allowed}
                    onClick={() => setTarget(i)}
                    className={`ornate-soft flex w-20 flex-col items-center p-1.5 disabled:opacity-30 ${target === i ? '!border-gold shadow-[0_0_20px_rgba(230,196,122,0.35)]' : ''}`}
                  >
                    <CreatureArt creature={creature} className="h-14 w-14" />
                    <span className="w-full truncate text-center font-display text-[0.62rem] text-gold-bright">{creature.name}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {match.player.length > 1 && (
          <>
            <Divider>Formation</Divider>
            <RowEditor slots={match.player} onChange={(player) => setMatch((m) => ({ ...m, player }))} />
          </>
        )}

        <Divider>Opponent</Divider>
        <TeamRows slots={match.enemy} enemy />

        <div className="mt-4 grid grid-cols-2 gap-3 rounded border border-gold/15 bg-night/50 p-3">
          <VowList title="Your Vows" vows={match.vows.player} slots={match.player} />
          <VowList title="Their Vows" vows={match.vows.enemy} slots={match.enemy} />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-night via-night/90 to-transparent px-4 pb-4 pt-8 safe-bottom">
        <div className="mx-auto max-w-sm">
          <button
            type="button"
            className="btn-oath w-full"
            disabled={!ready}
            onClick={() => fight(offer.length === 0 ? null : resolveVow(match, 'player', choice!, target))}
          >
            {offer.length === 0 ? '⚔ Fight' : choice ? `Swear ${VOW_BY_ID[choice].name} and fight` : 'Choose a Vow'}
          </button>
        </div>
      </div>
    </div>
  )
}
