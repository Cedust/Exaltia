import { useEffect, useRef, useState } from 'react'
import { runBattle } from '../../core/battle'
import type { BattleResult } from '../../core/types'
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
  previewTargets,
  recordRound,
  resolveVow,
  roundNumber,
  roundSeed,
  roundTeams,
  swear,
  winsNeeded,
  type DuelMatch,
  type DuelSlot,
  type SwornVow,
} from '../../game/duel'
import { KIND_NAMES, VOW_BY_ID } from '../../game/vows'
import { FormationGrid } from '../FormationGrid'
import { Ambience, CreatureArt, Divider, ScreenHeader } from '../kit'
import { RARITY_STYLE } from '../styles'
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

export function Score({ match }: { match: DuelMatch }) {
  const need = winsNeeded(match)
  const pips = (wins: number, color: string) => (
    <span className="flex gap-1">
      {Array.from({ length: need }, (_, i) => (
        <span key={i} className={`h-3 w-3 rotate-45 border ${i < wins ? `${color} border-transparent` : 'border-gold/40'}`} />
      ))}
    </span>
  )
  return (
    <div className="flex items-center justify-center gap-4 py-2">
      <div className="flex w-28 flex-col items-center gap-1">
        <span className="label-caps !text-2xs">You</span>
        {pips(match.wins.player, 'bg-gold')}
      </div>
      <div className="font-display text-3xl text-gold-bright">
        {match.wins.player} – {match.wins.enemy}
      </div>
      <div className="flex w-28 flex-col items-center gap-1">
        <span className="label-caps line-clamp-2 max-w-full text-center !text-2xs leading-tight">{match.opponent}</span>
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
        <span className={`font-display text-base tracking-wide ${style.color}`}>{vow.name}</span>
        <span className={`label-caps !text-2xs ${style.color}`}>{style.label}</span>
      </div>
      <div className="label-caps !text-2xs">
        {KIND_NAMES[vow.kind]} · {vow.carrier ?? (vow.scope === 'creature' ? 'one creature' : vow.scope === 'team' ? 'whole team' : 'Front Row')}
        {carrier && carrier !== vow.carrier && <span className="text-ivory"> · {carrier}</span>}
      </div>
      <p className="mt-1 text-sm leading-snug text-ivory/90">{vow.text}</p>
    </>
  )
  const cls = `block w-full rounded-md border bg-night/70 p-3 text-left transition ${style.ring} ${selected ? 'ring-2 ring-gold' : ''}`
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
      <div className="label-caps mb-1">{title}</div>
      {vows.length === 0 ? (
        <p className="text-sm text-mist/70">No Vows yet.</p>
      ) : (
        <div className="space-y-1">
          {vows.map((v, i) => (
            <div key={i} className="text-sm">
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
  // On a phone the carrier picker sits below the fold: bring it into view once a Vow needs one.
  const carriers = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (needsTarget) carriers.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [choice, needsTarget])
  const fight = (sworn: SwornVow | null) => onFight(sworn ? swear(match, 'player', sworn) : match)
  // The preview already counts the Vow you are about to swear.
  const tentative = choice && ready ? swear(match, 'player', resolveVow(match, 'player', choice, target)) : match
  const preview = previewTargets(tentative.player, tentative.enemy, tentative.vows)

  return (
    <div className="relative min-h-full pb-36">
      <Ambience backdrop={match.backdrop} dim={0.72} />
      <ScreenHeader
        title={`Round ${roundNumber(match)}`}
        subtitle={`${match.name} · best of ${match.bestOf}`}
        onBack={() => setLeaving(true)}
      />
      <div className="mx-auto max-w-3xl px-3">
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
          <p className="text-center text-sm text-mist">
            {last === 'player' ? 'You won the last round.' : last === 'enemy' ? 'You lost the last round: you see 4 Vows, one at least Rare.' : 'The last round was a draw.'}
            {rules.atLeast === 'exalted' && ' Match point against you: one Exalted Vow is guaranteed.'}
          </p>
        )}
        {firstRound && (
          <p className="text-center text-sm text-mist">Win {winsNeeded(match)} rounds to take the match. Every Vow you swear lasts until the match ends.</p>
        )}

        {revealed && (
          <>
            <Divider className="mb-2 mt-5">{match.opponent} swore</Divider>
            <VowCard id={revealed.vow} carrier={carrierName(revealed, match.enemy)} />
          </>
        )}

        <Divider className="mb-2 mt-5">Swear your Vow</Divider>
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
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn-ghost"
              disabled={match.rerollsLeft <= 0}
              onClick={() => {
                setMatch((m) => ({ ...m, rerollsLeft: m.rerollsLeft - 1, rerolls: m.rerolls + 1 }))
                setChoice(null)
              }}
            >
              Reroll · {match.rerollsLeft}
            </button>
            <button type="button" className="btn-ghost" onClick={() => fight(autoPick(match, offer))}>
              Auto-pick
            </button>
          </div>
        )}

        {needsTarget && (
          <div ref={carriers} className="scroll-mb-36">
            <Divider className="mb-2 mt-5">Who carries {chosen!.name}?</Divider>
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
                    className={`ornate-soft flex w-24 flex-col items-center p-1.5 disabled:opacity-30 ${target === i ? '!border-gold shadow-[0_0_20px_rgba(230,196,122,0.35)]' : ''}`}
                  >
                    <CreatureArt creature={creature} className="h-16 w-16" />
                    <span className="line-clamp-2 w-full text-center font-display text-2xs leading-tight text-gold-bright">{creature.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <Divider className="mb-2 mt-5">Formation</Divider>
        {match.reformed && <p className="mb-2 text-center text-sm text-[#ffb0a8]">{match.opponent} lost the last round and re-formed its team.</p>}
        <FormationGrid
          player={match.player}
          enemy={match.enemy}
          opponent={match.opponent}
          preview={preview}
          onChange={(player) => setMatch((m) => ({ ...m, player }))}
        />

        <div className="bleed mt-5 grid grid-cols-2 gap-3 rounded border border-gold/15 bg-night/50 p-4">
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
