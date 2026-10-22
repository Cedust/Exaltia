import { createRng, type Rng } from './rng'
import { RULES, isWeakTo } from './rules'
import { chooseAction } from './tactics'
import { actionDelay, nextActor, previewTurnOrder } from './turnOrder'
import type { BattleEvent, BattleResult, BattleSetup, Content, Side, SkillDef, Team } from './types'
import { isAlive, snapshot, type Unit } from './unit'

export function validateTeam(team: Team, content: Content): void {
  if (team.members.length === 0 || team.members.length > RULES.maxTeamSize) {
    throw new Error(`Team size must be 1-${RULES.maxTeamSize}, got ${team.members.length}`)
  }
  const taken = new Set<string>()
  for (const member of team.members) {
    const creature = content.creatures[member.creature]
    if (!creature) throw new Error(`Unknown creature "${member.creature}"`)
    const slot = `${member.position.lane}:${member.position.row}`
    if (taken.has(slot)) throw new Error(`Two creatures on Lane ${member.position.lane} ${member.position.row}`)
    taken.add(slot)
    if (member.tactics.length > RULES.tacticSlots) {
      throw new Error(`${creature.name} has ${member.tactics.length} Tactics, max is ${RULES.tacticSlots}`)
    }
    for (const tactic of member.tactics) {
      if (!creature.skills.includes(tactic.skill)) {
        throw new Error(`${creature.name} does not know skill "${tactic.skill}"`)
      }
    }
  }
}

function createUnits(setup: BattleSetup, content: Content): Unit[] {
  const sides: [Side, Team][] = [
    ['player', setup.player],
    ['enemy', setup.enemy],
  ]
  const units: Unit[] = []
  for (const [side, team] of sides) {
    team.members.forEach((member, i) => {
      const creature = content.creatures[member.creature]
      const unit: Unit = {
        id: `${side}-${i}`,
        index: units.length,
        side,
        creature,
        position: { ...member.position },
        tactics: member.tactics,
        lifeforce: creature.stats.lifeforce,
        essence: Math.round(creature.stats.essence * RULES.startingEssenceRatio),
        statuses: [],
        nextAt: 0,
      }
      unit.nextAt = actionDelay(unit)
      units.push(unit)
    })
  }
  return units
}

const roll = (rng: Rng) => 1 - RULES.variance + rng() * 2 * RULES.variance

function damage(skill: SkillDef, source: Unit, target: Unit, rng: Rng) {
  const attack = source.creature.stats[skill.stat]
  const defense = skill.stat === 'might' ? target.creature.stats.guard : target.creature.stats.ward
  const weakness = isWeakTo(target.creature.element, skill.element)
  const base = (skill.power * attack * RULES.defenseScale) / (RULES.defenseScale + defense)
  const amount = Math.max(1, Math.round(base * (weakness ? RULES.weaknessMultiplier : 1) * roll(rng)))
  return { amount, weakness }
}

/** Runs a complete battle deterministically from its seed and returns every event in order. */
export function runBattle(setup: BattleSetup, content: Content): BattleResult {
  validateTeam(setup.player, content)
  validateTeam(setup.enemy, content)
  const rng = createRng(setup.seed)
  const units = createUnits(setup, content)
  const events: BattleEvent[] = [{ type: 'battleStarted', units: units.map(snapshot) }]

  const defeat = (unit: Unit) => {
    unit.statuses = []
    events.push({ type: 'defeated', unit: unit.id })
  }
  const winner = (): Side | null => {
    if (!units.some((u) => u.side === 'enemy' && isAlive(u))) return 'player'
    if (!units.some((u) => u.side === 'player' && isAlive(u))) return 'enemy'
    return null
  }

  let turn = 0
  let result: Side | 'draw' | null = null
  while (!result && turn < RULES.maxTurns) {
    const actor = nextActor(units)!
    turn++
    actor.essence = Math.min(actor.creature.stats.essence, actor.essence + RULES.essenceRegen)
    actor.nextAt += actionDelay(actor)
    events.push({
      type: 'turnStarted',
      turn,
      actor: actor.id,
      essence: actor.essence,
      upcoming: previewTurnOrder(units, RULES.upcomingTurns).map((u) => u.id),
    })

    for (const status of [...actor.statuses]) {
      if (status.id === 'burn') {
        const amount = Math.max(1, Math.round(actor.creature.stats.lifeforce * RULES.burnPercent))
        actor.lifeforce = Math.max(0, actor.lifeforce - amount)
        events.push({ type: 'statusTicked', unit: actor.id, status: 'burn', amount, lifeforce: actor.lifeforce })
      }
      if (--status.turnsLeft <= 0) {
        actor.statuses = actor.statuses.filter((s) => s !== status)
        events.push({ type: 'statusExpired', unit: actor.id, status: status.id })
      }
    }
    if (!isAlive(actor)) {
      defeat(actor)
      result = winner()
      continue
    }

    const action = chooseAction(actor, units, content)
    if (!action) continue
    const { skill, targets } = action
    actor.essence -= skill.cost
    events.push({
      type: 'actionChosen',
      actor: actor.id,
      skill: skill.id,
      skillName: skill.name,
      tactic: action.tactic,
      condition: action.tactic === null ? null : actor.tactics[action.tactic].condition,
      targets: targets.map((t) => t.id),
      essence: actor.essence,
    })

    for (const target of targets) {
      if (skill.effect === 'heal') {
        const missing = target.creature.stats.lifeforce - target.lifeforce
        const amount = Math.min(missing, Math.round(skill.power * actor.creature.stats.resonance * roll(rng)))
        target.lifeforce += amount
        events.push({ type: 'healed', source: actor.id, target: target.id, amount, lifeforce: target.lifeforce })
        continue
      }
      const hit = damage(skill, actor, target, rng)
      target.lifeforce = Math.max(0, target.lifeforce - hit.amount)
      events.push({ type: 'damageDealt', source: actor.id, target: target.id, ...hit, lifeforce: target.lifeforce })
      if (!isAlive(target)) {
        defeat(target)
        continue
      }
      if (skill.inflicts && rng() < skill.inflicts.chance) {
        const { status, turns } = skill.inflicts
        target.statuses = [...target.statuses.filter((s) => s.id !== status), { id: status, turnsLeft: turns }]
        events.push({ type: 'statusApplied', target: target.id, status, turns })
      }
    }
    result = winner()
  }

  const final = result ?? 'draw'
  events.push({ type: 'battleEnded', winner: final, turns: turn })
  return { winner: final, turns: turn, events }
}
