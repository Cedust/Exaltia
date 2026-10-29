import { useState } from 'react'
import { runBattle } from '../../core/battle'
import type { BattleResult } from '../../core/types'
import { CONTENT } from '../../data'
import type { Encounter } from '../../data/world'
import {
  carrierName,
  chooseVow,
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
  type MatchMember,
  type SwornVow,
} from '../../game/duel'
import { KIND_NAMES, VOW_BY_ID } from '../../game/vows'
import { FormationGrid } from '../FormationGrid'
import { useGame } from '../GameContext'
import { CreatureArt, Sheet } from '../kit'
import { FlowHeader, PrepareFlow, type FlowAction } from '../PrepareFlow'
import { cellName, haptic, matchSteps, type FlowStep, type PrepStep } from '../prepare'
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
  onPrepare,
}: {
  encounter: Encounter
  initial: DuelMatch
  speed: number
  onSpeed: (speed: number) => void
  onDone: (match: DuelMatch, results: BattleResult[]) => void
  onForfeit: () => void
  /** Round 1 only: back to Scout or Team (the match has not really begun). */
  onPrepare?: (step: PrepStep) => void
}) {
  const [phase, setPhase] = useState<Phase>(() => ({ kind: 'pick', match: enemySwears(initial) }))
  const [results, setResults] = useState<BattleResult[]>([])

  if (phase.kind === 'pick') {
    return (
      <PickView
        match={phase.match}
        onForfeit={onForfeit}
        onPrepare={onPrepare}
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

export function VowCard({ id, selected, onClick, carrier, enemy }: { id: string; selected?: boolean; onClick?: () => void; carrier?: string; enemy?: boolean }) {
  const vow = VOW_BY_ID[id]
  const style = RARITY_STYLE[vow.rarity]
  const body = (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`font-display text-base tracking-wide ${style.color}`}>{vow.name}</span>
        <span className={`label-caps flex items-center gap-1.5 !text-2xs ${style.color}`}>
          {style.label}
          {selected && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-xs text-night">✓</span>}
        </span>
      </div>
      <div className="label-caps !text-2xs">
        {KIND_NAMES[vow.kind]} · {vow.carrier ?? (vow.scope === 'creature' ? 'one creature' : vow.scope === 'team' ? 'whole team' : 'Front Row')}
        {carrier && carrier !== vow.carrier && <span className="text-ivory"> · {carrier}</span>}
      </div>
      <p className="mt-1 text-sm leading-snug text-ivory/90">{vow.text}</p>
    </>
  )
  const cls = `relative block w-full rounded-md border p-3 text-left transition ${style.ring} ${enemy ? 'bg-[#2a0f16]/80' : 'bg-night/70'} ${
    onClick ? 'active:scale-[0.99]' : ''
  } ${selected ? 'bg-gold/10 ring-2 ring-gold' : ''}`
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

// ── Before every round: swear a Vow, then (re-)form ──

type RoundStep = 'vow' | 'formation'

function PickView({
  match: initial,
  onFight,
  onForfeit,
  onPrepare,
}: {
  match: DuelMatch
  onFight: (match: DuelMatch) => void
  onForfeit: () => void
  onPrepare?: (step: PrepStep) => void
}) {
  const { update } = useGame()
  const [match, setMatch] = useState(initial)
  const [step, setStep] = useState<RoundStep>('vow')
  const [choice, setChoice] = useState<string | null>(null)
  const [target, setTarget] = useState<number | undefined>(undefined)
  const [picking, setPicking] = useState(false)
  const [leaving, setLeaving] = useState(false)
  // The offer only changes on a reroll: moving creatures on the Formation step never reshuffles it.
  const [offer, setOffer] = useState(() => offerFor(initial, 'player'))
  const rules = offerRules(match, 'player')
  const revealed = match.rounds.length + 1 <= match.vows.enemy.length ? match.vows.enemy[match.vows.enemy.length - 1] : undefined
  const earlier = match.vows.enemy.slice(0, revealed ? -1 : undefined)
  const last = match.rounds[match.rounds.length - 1]
  const firstRound = match.rounds.length === 0
  const round = roundNumber(match)

  const chosen = choice ? VOW_BY_ID[choice] : null
  // Mirror Oath copies the opponent's last Vow, so its target rules are that Vow's.
  const effective = chosen && choice === 'mirror-oath' && revealed ? VOW_BY_ID[revealed.vow] : chosen
  const targets = effective?.scope === 'creature' ? eligibleTargets(effective, match.player, match.vows.player) : []
  const needsTarget = targets.length > 0
  const ready = offer.length === 0 || (!!choice && (!needsTarget || (target !== undefined && targets.includes(target))))
  const sworn = offer.length > 0 && choice && ready ? resolveVow(match, 'player', choice, target) : null
  // The preview already counts the Vow you are about to swear.
  const tentative = sworn ? swear(match, 'player', sworn) : match
  const preview = previewTargets(tentative.player, tentative.enemy, tentative.vows)

  const pick = (id: string) => {
    haptic()
    setChoice(id)
    setTarget(undefined)
    const vow = id === 'mirror-oath' && revealed ? VOW_BY_ID[revealed.vow] : VOW_BY_ID[id]
    // A creature Vow asks who carries it right away, in a sheet: nothing below the fold to scroll to.
    if (vow.scope === 'creature' && eligibleTargets(vow, match.player, match.vows.player).length > 0) setPicking(true)
  }
  const reroll = () => {
    haptic()
    const next = { ...match, rerollsLeft: match.rerollsLeft - 1, rerolls: match.rerolls + 1 }
    setMatch(next)
    setOffer(offerFor(next, 'player'))
    setChoice(null)
    setTarget(undefined)
  }
  const autoPick = () => {
    haptic()
    const id = chooseVow(offer, [], match.enemy)
    setChoice(id)
    setTarget(resolveVow(match, 'player', id).target)
  }
  const reform = (player: MatchMember[]) => {
    setMatch((m) => ({ ...m, player }))
    // Remember the formation for the next match too.
    update((s) => ({ ...s, formation: player.map(({ creature, lane, row }) => ({ creature, lane, row })) }))
  }

  const index = step === 'vow' ? 0 : 1
  const steps: FlowStep[] = firstRound
    ? matchSteps(2 + index, (i) => (i === 0 ? onPrepare?.('scout') : i === 1 ? onPrepare?.('team') : setStep('vow')))
    : [
        { id: 'vow', label: 'Vow', done: index > 0, onSelect: index > 0 ? () => setStep('vow') : undefined },
        { id: 'formation', label: 'Formation', done: false },
      ]
  const leave = () => (firstRound && onPrepare ? onPrepare('team') : setLeaving(true))

  const next: FlowAction =
    step === 'formation'
      ? { label: `⚔ Fight round ${round}`, fight: true, onClick: () => onFight(sworn ? swear(match, 'player', sworn) : match) }
      : ready
        ? { label: 'Next: Formation ›', onClick: () => setStep('formation') }
        : choice && needsTarget
          ? { label: 'Choose a carrier', onClick: () => setPicking(true) }
          : { label: 'Choose a Vow', disabled: true, onClick: () => {} }

  return (
    <PrepareFlow
      backdrop={match.backdrop}
      header={<FlowHeader title={`Round ${round}`} subtitle={`${match.name} · best of ${match.bestOf}`} onBack={leave} />}
      steps={steps}
      current={firstRound ? 2 + index : index}
      back={step === 'formation' ? { label: 'Vow', onClick: () => setStep('vow') } : firstRound && onPrepare ? { label: 'Team', onClick: () => onPrepare('team') } : undefined}
      next={next}
    >
      {step === 'vow' ? (
        <div className="space-y-4">
          <div className="ornate-soft bleed py-1">
            <Score match={match} />
            {last && (
              <p className="px-3 pb-2 text-center text-xs text-mist">
                {last === 'player' ? 'You won the last round.' : last === 'enemy' ? 'You lost the last round: you see 4 Vows, one at least Rare.' : 'The last round was a draw.'}
                {rules.atLeast === 'exalted' && ' Match point against you: one Exalted Vow is guaranteed.'}
              </p>
            )}
            {firstRound && <p className="px-3 pb-2 text-center text-xs text-mist">Every Vow you swear lasts until the match ends.</p>}
          </div>

          {revealed && (
            <section>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="h-2 w-2 rotate-45 bg-[#e0574f] shadow-[0_0_8px_#e0574f]" />
                <span className="label-caps !text-[#ffb0a8]">Their Vow</span>
              </div>
              <VowCard id={revealed.vow} carrier={carrierName(revealed, match.enemy)} enemy />
              {earlier.length > 0 && (
                <p className="mt-1.5 text-xs text-mist">
                  Also holds:{' '}
                  {earlier.map((v, i) => (
                    <span key={i} className={RARITY_STYLE[VOW_BY_ID[v.vow].rarity].color}>
                      {i > 0 && ', '}
                      {VOW_BY_ID[v.vow].name}
                    </span>
                  ))}
                </p>
              )}
            </section>
          )}

          <section>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="label-caps">Your answer</span>
              {match.vows.player.length > 0 && <span className="text-2xs uppercase tracking-wider text-mist">{match.vows.player.length} sworn so far</span>}
            </div>
            {offer.length === 0 ? (
              <p className="ornate-soft p-4 text-center text-sm text-mist">You have no Vow left to swear. Fight on with what you hold.</p>
            ) : (
              <div className="space-y-2">
                {offer.map((id) => (
                  <div key={id}>
                    <VowCard id={id} selected={choice === id} onClick={() => pick(id)} />
                    {choice === id && needsTarget && (
                      <button
                        type="button"
                        onClick={() => setPicking(true)}
                        className="fade-in -mt-1 flex min-h-11 w-full items-center justify-between rounded-b-md border border-t-0 border-gold/60 bg-gold/10 px-3 text-sm"
                      >
                        <span className="text-mist">
                          Carried by{' '}
                          <span className="font-bold text-gold-bright">{target !== undefined && targets.includes(target) ? CONTENT.creatures[match.player[target].creature].name : '?'}</span>
                        </span>
                        <span className="label-caps !text-2xs">{target !== undefined ? 'Change' : 'Choose'} ›</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {offer.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" className="btn-ghost" disabled={match.rerollsLeft <= 0} onClick={reroll}>
                  ↻ Reroll · {match.rerollsLeft}
                </button>
                <button type="button" className="btn-ghost" onClick={autoPick}>
                  ✦ Auto-pick
                </button>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          {match.reformed && <p className="rounded border border-red-300/30 bg-red-500/10 px-3 py-2 text-center text-sm text-[#ffb0a8]">{match.opponent} lost the last round and re-formed its team.</p>}
          <div className="ornate-soft bleed px-2 py-3">
            <FormationGrid player={match.player} enemy={match.enemy} opponent={match.opponent} preview={preview} onChange={reform} />
          </div>
          <div className="bleed grid grid-cols-2 gap-3 rounded border border-gold/15 bg-night/60 p-4">
            <VowList title="Your Vows" vows={tentative.vows.player} slots={match.player} />
            <VowList title="Their Vows" vows={tentative.vows.enemy} slots={match.enemy} />
          </div>
        </div>
      )}

      {picking && chosen && (
        <Sheet onClose={() => setPicking(false)}>
          <div className="label-caps !text-2xs">Who carries it?</div>
          <h2 className={`font-display text-xl ${RARITY_STYLE[chosen.rarity].color}`}>{chosen.name}</h2>
          <p className="mt-1 text-sm text-ivory/90">{chosen.text}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {match.player.map((s, i) => {
              const creature = CONTENT.creatures[s.creature]
              const allowed = targets.includes(i)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!allowed}
                  onClick={() => {
                    haptic()
                    setTarget(i)
                    setPicking(false)
                  }}
                  className={`ornate-soft flex flex-col items-center p-2 transition active:scale-[0.97] disabled:opacity-30 ${target === i ? '!border-gold shadow-[0_0_20px_rgba(230,196,122,0.35)]' : ''}`}
                >
                  <CreatureArt creature={creature} className="h-20 w-20" />
                  <span className={`line-clamp-1 w-full text-center font-display text-sm ${ELEMENT_TEXT[creature.element]}`}>{creature.name}</span>
                  <span className="text-2xs uppercase tracking-wider text-mist">{allowed ? cellName(s.lane, s.row) : 'Cannot carry it'}</span>
                </button>
              )
            })}
          </div>
        </Sheet>
      )}

      {leaving && (
        <Sheet onClose={() => setLeaving(false)}>
          <h2 className="font-display text-lg text-gold-bright">Leave the match?</h2>
          <p className="mt-1 text-sm text-mist">It ends without a result and you can start it again.</p>
          <div className="mt-4 flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setLeaving(false)}>
              Keep fighting
            </button>
            <button type="button" className="btn-oath flex-1 !px-3" onClick={onForfeit}>
              Leave
            </button>
          </div>
        </Sheet>
      )}
    </PrepareFlow>
  )
}
