import { createRng, type Rng } from './rng'
import { RULES, isWeakTo } from './rules'
import { STATUS_NUMBERS } from './statuses'
import { chooseAction } from './tactics'
import { actionDelay, nextActor, previewTurnOrder } from './turnOrder'
import type { BattleEvent, BattleResult, BattleSetup, Content, Side, SkillDef, StatusId, Team, TeamMember } from './types'
import { effectiveStat, hasStatus, isAlive, lifeforceRatio, passiveSum, snapshot, type Unit } from './unit'

/** Skills a team member may put into its Tactics. */
export const usableSkills = (member: TeamMember, content: Content) =>
  member.loadout?.skills ?? content.creatures[member.creature].skills

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
    if (member.tactics.length > RULES.maxTacticSlots) {
      throw new Error(`${creature.name} has ${member.tactics.length} Tactics, max is ${RULES.maxTacticSlots}`)
    }
    const usable = usableSkills(member, content)
    for (const tactic of [...member.tactics, ...(member.boss?.phase2 ?? [])]) {
      if (!usable.includes(tactic.skill)) throw new Error(`${creature.name} does not know skill "${tactic.skill}"`)
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
      const loadout = member.loadout ?? {}
      const skill = (id: string): SkillDef => loadout.skillDefs?.[id] ?? content.skills[id]
      const ids = [...usableSkills(member, content), creature.basicAttack]
      const ascensionId = loadout.ascension === null ? undefined : (loadout.ascension ?? creature.ascension)
      const stats = loadout.stats ?? creature.stats
      const passives = loadout.passives ?? []
      const unit: Unit = {
        id: `${side}-${i}`,
        index: units.length,
        side,
        creature,
        stats,
        skills: Object.fromEntries(ids.map((id) => [id, skill(id)])),
        passives,
        ascensionSkill: ascensionId ? skill(ascensionId) : null,
        position: { ...member.position },
        tactics: member.tactics,
        phase2: member.boss?.phase2 ?? null,
        boss: !!member.boss,
        lifeforce: stats.lifeforce,
        essence: 0,
        ascension: 0,
        statuses: [],
        lastStandUsed: false,
        nextAt: 0,
      }
      unit.essence = Math.min(stats.essence, Math.round(stats.essence * RULES.startingEssenceRatio) + passiveSum(unit, 'startEssence'))
      for (const p of passives) if (p.type === 'startStatus') unit.statuses.push({ id: p.status, turnsLeft: p.turns })
      unit.nextAt = actionDelay(unit)
      units.push(unit)
    })
  }
  return units
}

const roll = (rng: Rng) => 1 - RULES.variance + rng() * 2 * RULES.variance

function damage(skill: SkillDef, source: Unit, target: Unit, rng: Rng, surge: number) {
  const attack = effectiveStat(source, skill.stat)
  const defense = skill.piercesDefense ? 0 : effectiveStat(target, skill.stat === 'might' ? 'guard' : 'ward')
  const weakness = isWeakTo(target.creature.element, skill.element)
  let multiplier = weakness ? RULES.weaknessMultiplier : 1
  if (skill.element !== 'physical' && skill.element === source.creature.element) {
    multiplier *= 1 + passiveSum(source, 'elementPower') / 100
  }
  let bonus = passiveSum(source, 'bonusVsStatus', (p) => hasStatus(target, p.status))
  if (skill.bonusVsStatus && hasStatus(target, skill.bonusVsStatus.status)) bonus += skill.bonusVsStatus.percent
  multiplier *= 1 + bonus / 100
  if (hasStatus(target, 'barrier')) multiplier *= STATUS_NUMBERS.barrierDamage
  multiplier *= Math.max(0.2, 1 + passiveSum(target, 'damageTaken') / 100)
  multiplier *= 1 + surge * RULES.surgeDamagePerTurn
  const base = ((skill.power * attack * RULES.defenseScale) / (RULES.defenseScale + defense)) * RULES.damageScale
  const amount = Math.max(1, Math.round(base * multiplier * roll(rng)))
  return { amount, weakness }
}

/** Runs a complete battle deterministically from its seed and returns every event in order. */
export function runBattle(setup: BattleSetup, content: Content): BattleResult {
  validateTeam(setup.player, content)
  validateTeam(setup.enemy, content)
  const rng = createRng(setup.seed)
  const units = createUnits(setup, content)
  const events: BattleEvent[] = [{ type: 'battleStarted', units: units.map(snapshot) }]

  const gainAscension = (unit: Unit, amount: number) => {
    if (!unit.ascensionSkill || !isAlive(unit) || unit.ascension >= RULES.ascensionMax) return
    const before = Math.floor(unit.ascension)
    unit.ascension = Math.min(RULES.ascensionMax, unit.ascension + amount * (1 + passiveSum(unit, 'ascensionGain') / 100))
    if (Math.floor(unit.ascension) !== before) events.push({ type: 'ascensionGauge', unit: unit.id, value: Math.floor(unit.ascension) })
  }
  const defeat = (unit: Unit) => {
    unit.statuses = []
    events.push({ type: 'defeated', unit: unit.id })
    for (const ally of units) if (ally.side === unit.side && ally !== unit) gainAscension(ally, RULES.ascensionPerFallenAlly)
  }
  /** Lowers Lifeforce; Last Stand keeps a creature at 1 once per battle. Returns the damage actually taken. */
  const loseLifeforce = (unit: Unit, amount: number) => {
    if (amount >= unit.lifeforce && !unit.lastStandUsed && passiveSum(unit, 'lastStand') > 0) {
      unit.lastStandUsed = true
      const taken = unit.lifeforce - 1
      unit.lifeforce = 1
      events.push({ type: 'lastStand', unit: unit.id })
      return taken
    }
    const taken = Math.min(unit.lifeforce, amount)
    unit.lifeforce -= taken
    gainAscension(unit, (taken / unit.stats.lifeforce) * RULES.ascensionPerLifeforceLost)
    return taken
  }
  const applyStatus = (target: Unit, status: StatusId, turns: number) => {
    const existing = target.statuses.find((s) => s.id === status)
    if (existing) existing.turnsLeft = Math.max(existing.turnsLeft, turns)
    else target.statuses.push({ id: status, turnsLeft: turns })
    events.push({ type: 'statusApplied', target: target.id, status, turns })
  }
  const heal = (source: Unit, target: Unit, amount: number) => {
    const healed = Math.min(target.stats.lifeforce - target.lifeforce, amount)
    target.lifeforce += healed
    events.push({ type: 'healed', source: source.id, target: target.id, amount: healed, lifeforce: target.lifeforce })
  }
  const checkPhases = () => {
    for (const unit of units) {
      if (unit.phase2 && isAlive(unit) && lifeforceRatio(unit) < RULES.bossPhaseThreshold) {
        unit.tactics = unit.phase2
        unit.phase2 = null
        events.push({ type: 'phaseShift', unit: unit.id })
        gainAscension(unit, 25)
      }
    }
  }
  const winner = (): Side | null => {
    if (!units.some((u) => u.side === 'enemy' && isAlive(u))) return 'player'
    if (!units.some((u) => u.side === 'player' && isAlive(u))) return 'enemy'
    return null
  }

  let turn = 0
  const surge = () => Math.max(0, turn - RULES.surgeTurn)
  let result: Side | 'draw' | null = null
  while (!result && turn < RULES.maxTurns) {
    const actor = nextActor(units)!
    turn++
    if (turn === RULES.surgeTurn + 1) events.push({ type: 'surge', turn })
    actor.essence = Math.min(actor.stats.essence, actor.essence + RULES.essenceRegen + passiveSum(actor, 'essenceRegen'))
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
        const amount = loseLifeforce(actor, Math.max(1, Math.round(actor.stats.lifeforce * STATUS_NUMBERS.burnPercent)))
        events.push({ type: 'statusTicked', unit: actor.id, status: 'burn', amount, heal: false, lifeforce: actor.lifeforce })
      }
      if (status.id === 'regen') {
        const amount = Math.min(actor.stats.lifeforce - actor.lifeforce, Math.round(actor.stats.lifeforce * STATUS_NUMBERS.regenPercent))
        actor.lifeforce += amount
        events.push({ type: 'statusTicked', unit: actor.id, status: 'regen', amount, heal: true, lifeforce: actor.lifeforce })
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
    checkPhases()
    if (hasStatus(actor, 'shock') && rng() < STATUS_NUMBERS.shockChance) {
      events.push({ type: 'turnLost', unit: actor.id, status: 'shock' })
      continue
    }

    const action = chooseAction(actor, units)
    if (!action) continue
    const { skill, targets } = action
    if (action.ascension) {
      actor.ascension = 0
      events.push({ type: 'ascensionGauge', unit: actor.id, value: 0 })
    } else {
      actor.essence -= skill.cost
    }
    events.push({
      type: 'actionChosen',
      actor: actor.id,
      skill: skill.id,
      skillName: skill.name,
      tactic: action.tactic,
      condition: action.tactic === null ? null : actor.tactics[action.tactic].condition,
      ascension: action.ascension,
      targets: targets.map((t) => t.id),
      essence: actor.essence,
    })

    const extraTurns = passiveSum(actor, 'statusDuration')
    for (const target of targets) {
      if (skill.revive) {
        if (isAlive(target)) continue
        target.lifeforce = Math.max(1, Math.round(target.stats.lifeforce * skill.power))
        target.ascension = 0
        target.nextAt = Math.max(target.nextAt, actor.nextAt - actionDelay(actor) + actionDelay(target))
        events.push({ type: 'revived', source: actor.id, target: target.id, lifeforce: target.lifeforce })
        continue
      }
      if (!isAlive(target)) continue
      if (skill.effect === 'heal') {
        const power =
          skill.power * effectiveStat(actor, 'resonance') * RULES.damageScale * (1 + passiveSum(actor, 'healPower') / 100) *
          Math.max(0.1, 1 - surge() * RULES.surgeHealingPerTurn)
        heal(actor, target, Math.round(power * roll(rng)))
        if (skill.inflicts) applyStatus(target, skill.inflicts.status, skill.inflicts.turns + extraTurns)
        continue
      }
      if (skill.effect === 'buff') {
        if (skill.inflicts) applyStatus(target, skill.inflicts.status, skill.inflicts.turns + extraTurns)
        continue
      }
      const hit = damage(skill, actor, target, rng, surge())
      const taken = loseLifeforce(target, hit.amount)
      events.push({ type: 'damageDealt', source: actor.id, target: target.id, amount: taken, weakness: hit.weakness, lifeforce: target.lifeforce })
      gainAscension(actor, RULES.ascensionPerHit)
      if (skill.drain && isAlive(actor)) heal(actor, actor, Math.round(taken * skill.drain))
      if (!isAlive(target)) {
        defeat(target)
        continue
      }
      if (skill.inflicts && rng() < skill.inflicts.chance) {
        applyStatus(target, skill.inflicts.status, skill.inflicts.turns + extraTurns)
      }
    }
    if (skill.selfStatus && isAlive(actor)) applyStatus(actor, skill.selfStatus.status, skill.selfStatus.turns)
    if (skill.essenceGain) actor.essence = Math.min(actor.stats.essence, actor.essence + Math.round(actor.stats.essence * skill.essenceGain))
    checkPhases()
    result = winner()
  }

  const final = result ?? 'draw'
  events.push({ type: 'battleEnded', winner: final, turns: turn })
  return { winner: final, turns: turn, events }
}
