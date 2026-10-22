import type { BattleEvent, Condition, Element, StatusId, TargetPriority, UnitSnapshot } from './types'

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

const STATUS_NAMES: Record<StatusId, string> = { burn: 'Burn' }

export const elementName = (element: Element) => ELEMENT_NAMES[element]
export const statusName = (status: StatusId) => STATUS_NAMES[status]

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
  weakToSkill: 'Weak to Skill Element',
  sameLane: 'Same Lane',
  self: 'Self',
}

export const describeTarget = (priority: TargetPriority) => TARGET_NAMES[priority]

/** Turns the event stream into readable Battle Log lines; every action names the Tactic that fired. */
export function formatBattleLog(events: BattleEvent[]): string[] {
  const units = new Map<string, UnitSnapshot>()
  const name = (id: string) => units.get(id)?.name ?? id
  const lifeforce = (id: string, value: number) => `LF ${value}/${units.get(id)?.maxLifeforce ?? '?'}`
  const lines: string[] = []

  for (const event of events) {
    switch (event.type) {
      case 'battleStarted':
        for (const unit of event.units) units.set(unit.id, unit)
        for (const side of ['player', 'enemy'] as const) {
          const team = event.units
            .filter((u) => u.side === side)
            .map((u) => `${u.name} (Lane ${u.position.lane + 1} ${u.position.row === 'front' ? 'Front' : 'Back'})`)
          lines.push(`${side === 'player' ? 'Player' : 'Enemy'}: ${team.join(', ')}`)
        }
        break
      case 'turnStarted':
        lines.push(`— Turn ${event.turn}: ${name(event.actor)} (ESS ${event.essence})`)
        break
      case 'statusTicked':
        lines.push(`  ${name(event.unit)} suffers ${event.amount} from ${statusName(event.status)} · ${lifeforce(event.unit, event.lifeforce)}`)
        break
      case 'statusExpired':
        lines.push(`  ${statusName(event.status)} wears off ${name(event.unit)}`)
        break
      case 'actionChosen': {
        const reason =
          event.tactic === null
            ? 'Fallback: no Tactic matched'
            : `Tactic ${event.tactic + 1}: ${describeCondition(event.condition!)}`
        lines.push(`  ${name(event.actor)} → ${event.skillName} → ${event.targets.map(name).join(', ')} · ${reason}`)
        break
      }
      case 'damageDealt':
        lines.push(
          `  ${name(event.target)} takes ${event.amount}${event.weakness ? ' (WEAK!)' : ''} · ${lifeforce(event.target, event.lifeforce)}`,
        )
        break
      case 'healed':
        lines.push(`  ${name(event.target)} recovers ${event.amount} · ${lifeforce(event.target, event.lifeforce)}`)
        break
      case 'statusApplied':
        lines.push(`  ${name(event.target)} is afflicted with ${statusName(event.status)} (${event.turns} turns)`)
        break
      case 'defeated':
        lines.push(`  ${name(event.unit)} is defeated!`)
        break
      case 'battleEnded':
        lines.push(
          event.winner === 'draw'
            ? `Draw after ${event.turns} turns.`
            : `${event.winner === 'player' ? 'Victory' : 'Defeat'} after ${event.turns} turns.`,
        )
        break
    }
  }
  return lines
}
