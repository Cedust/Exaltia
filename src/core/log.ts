import { statusName } from './statuses'
import type { BattleEvent, Condition, Element, TargetPriority, UnitSnapshot } from './types'

const ELEMENT_NAMES: Record<Element, string> = {
  fire: 'Fire',
  ice: 'Ice',
  thunder: 'Thunder',
  water: 'Water',
  earth: 'Earth',
  wind: 'Wind',
  radiance: 'Radiance',
  umbra: 'Umbra',
  physical: 'Physical',
}

export const elementName = (element: Element) => ELEMENT_NAMES[element]
export { statusName }

export function describeCondition(condition: Condition): string {
  switch (condition.type) {
    case 'always':
      return 'Always'
    case 'enemyWeakTo':
      return `Enemy is Weak to ${elementName(condition.element)}`
    case 'allyLifeforceBelow':
      return `Ally Lifeforce < ${condition.percent}%`
    case 'selfLifeforceBelow':
      return `Self Lifeforce < ${condition.percent}%`
    case 'enemyLifeforceBelow':
      return `Enemy Lifeforce < ${condition.percent}%`
    case 'allyWithoutStatus':
      return `Ally without ${statusName(condition.status)}`
    case 'selfEssenceAtLeast':
      return `Self Essence ≥ ${condition.amount}`
    case 'enemyWithoutStatus':
      return `Enemy without ${statusName(condition.status)}`
    case 'enemyHasStatus':
      return `Enemy has ${statusName(condition.status)}`
    case 'enemiesAtLeast':
      return `Enemies ≥ ${condition.count}`
  }
}

const TARGET_NAMES: Record<TargetPriority, string> = {
  lowestLifeforce: 'Lowest Lifeforce %',
  highestLifeforce: 'Highest Lifeforce %',
  highestMight: 'Highest Might',
  highestResonance: 'Highest Resonance',
  highestSwiftness: 'Highest Swiftness',
  weakToSkill: 'Weak to Skill Element',
  sameLane: 'Same Lane',
  self: 'Self',
}

export const describeTarget = (priority: TargetPriority) => TARGET_NAMES[priority]

export interface BattleLogLine {
  /** Index of the event this line describes, so playback can reveal lines as it goes. */
  event: number
  text: string
}

/** Turns the event stream into readable Battle Log lines; every action names the Tactic that fired. */
export function formatBattleLog(events: BattleEvent[]): BattleLogLine[] {
  const units = new Map<string, UnitSnapshot>()
  const name = (id: string) => units.get(id)?.name ?? id
  const lifeforce = (id: string, value: number) => `LF ${value}/${units.get(id)?.maxLifeforce ?? '?'}`
  const lines: BattleLogLine[] = []

  for (const [index, event] of events.entries()) {
    const push = (text: string) => lines.push({ event: index, text })
    switch (event.type) {
      case 'battleStarted':
        for (const unit of event.units) units.set(unit.id, unit)
        for (const side of ['player', 'enemy'] as const) {
          const team = event.units
            .filter((u) => u.side === side)
            .map((u) => `${u.name} (Lane ${u.position.lane + 1} ${u.position.row === 'front' ? 'Front' : 'Back'})`)
          push(`${side === 'player' ? 'Player' : 'Enemy'}: ${team.join(', ')}`)
        }
        break
      case 'turnStarted':
        push(`— Turn ${event.turn}: ${name(event.actor)} (ESS ${event.essence})`)
        break
      case 'statusTicked':
        push(
          event.heal
            ? `  ${name(event.unit)} recovers ${event.amount} from ${statusName(event.status)} · ${lifeforce(event.unit, event.lifeforce)}`
            : `  ${name(event.unit)} suffers ${event.amount} from ${statusName(event.status)} · ${lifeforce(event.unit, event.lifeforce)}`,
        )
        break
      case 'turnLost':
        push(`  ${name(event.unit)} is paralysed by ${statusName(event.status)} and loses the turn`)
        break
      case 'surge':
        push(`The arena's Sigils surge! From now on damage rises and healing fades with every turn.`)
        break
      case 'phaseShift':
        push(`  ${name(event.unit)}'s Sigil blazes: a new phase begins!`)
        break
      case 'lastStand':
        push(`  ${name(event.unit)} refuses to fall and holds on with 1 Lifeforce!`)
        break
      case 'vowTriggered':
        push(`  Vow · ${event.vow} (${name(event.unit)})`)
        break
      case 'ascensionGauge':
        break
      case 'statusExpired':
        push(`  ${statusName(event.status)} wears off ${name(event.unit)}`)
        break
      case 'actionChosen': {
        const reason = event.ascension
          ? 'ASCENSION'
          : event.tactic === null
            ? 'Fallback: no Tactic matched'
            : `Tactic ${event.tactic + 1}: ${describeCondition(event.condition!)}`
        push(`  ${name(event.actor)} → ${event.skillName} → ${event.targets.map(name).join(', ')} · ${reason}`)
        break
      }
      case 'damageDealt':
        push(
          `  ${name(event.target)} takes ${event.amount}${event.weakness ? ' (WEAK!)' : ''} · ${lifeforce(event.target, event.lifeforce)}`,
        )
        break
      case 'healed':
        push(`  ${name(event.target)} recovers ${event.amount} · ${lifeforce(event.target, event.lifeforce)}`)
        break
      case 'statusApplied':
        push(`  ${name(event.target)} is afflicted with ${statusName(event.status)} (${event.turns} turns)`)
        break
      case 'revived':
        push(`  ${name(event.target)} rises again · ${lifeforce(event.target, event.lifeforce)}`)
        break
      case 'defeated':
        push(`  ${name(event.unit)} is defeated!`)
        break
      case 'battleEnded':
        push(
          event.winner === 'draw'
            ? `Draw after ${event.turns} turns.`
            : `${event.winner === 'player' ? 'Victory' : 'Defeat'} after ${event.turns} turns.`,
        )
        break
    }
  }
  return lines
}
