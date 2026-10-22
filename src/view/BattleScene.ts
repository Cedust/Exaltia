import Phaser from 'phaser'
import { describeCondition, statusName } from '../core/log'
import type { BattleEvent, BattleResult, Element, Side, StatusId, UnitSnapshot } from '../core/types'
import { CREATURES } from '../data/creatures'

/** Shared, mutable playback settings; the React controls change them while a battle plays. */
export interface Playback {
  speed: number
  skip: boolean
}

export interface BattleSceneData {
  result?: BattleResult
  playback?: Playback
  onProgress?: (eventIndex: number) => void
}

const LANES = 3
const CELL_W = 160
const CELL_H = 160
const GAP = 12
const GRID_TOP = 160
const BAR_W = 120
const TURN_SLOTS = 9

// Column centers from left to right: player Back, player Front | enemy Front, enemy Back.
const COLUMN_X: Record<Side, Record<'front' | 'back', number>> = {
  player: { back: 230, front: 410 },
  enemy: { front: 870, back: 1050 },
}
const SIDE_COLOR: Record<Side, number> = { player: 0x2f6fd6, enemy: 0xe8642c }
const ELEMENT_COLOR: Record<Element, string> = {
  fire: '#e8642c',
  ice: '#6fa8ff',
  thunder: '#f2c94c',
  water: '#2bb5a8',
  earth: '#3f9d5a',
  wind: '#cfe8e6',
  radiance: '#f4e3b0',
  umbra: '#9a86e0',
  physical: '#c4c8cc',
}

// Base durations in ms at 1x speed.
const DURATION = { turn: 250, action: 550, hit: 450, status: 300, end: 0 }

const FONT = 'Inter, system-ui, Segoe UI, Roboto, sans-serif'
const style = (overrides: Phaser.Types.GameObjects.Text.TextStyle): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT,
  ...overrides,
})

const laneY = (lane: number) => GRID_TOP + lane * (CELL_H + GAP) + CELL_H / 2
const textureKey = (creature: string) => `creature-${creature}`

class UnitView {
  readonly container: Phaser.GameObjects.Container
  private readonly sprite: Phaser.GameObjects.Image
  private readonly lifeforceFill: Phaser.GameObjects.Rectangle
  private readonly essenceFill: Phaser.GameObjects.Rectangle
  private readonly statusText: Phaser.GameObjects.Text
  private readonly statuses = new Set<StatusId>()
  private readonly scene: Phaser.Scene
  readonly unit: UnitSnapshot
  readonly cell: Phaser.GameObjects.Rectangle

  constructor(scene: Phaser.Scene, unit: UnitSnapshot, cell: Phaser.GameObjects.Rectangle) {
    this.scene = scene
    this.unit = unit
    this.cell = cell
    this.container = scene.add.container(cell.x, cell.y)
    this.sprite = scene.add.image(0, -14, textureKey(unit.creature)).setFlipX(unit.side === 'enemy')
    this.sprite.setScale(Math.min((CELL_W - 16) / this.sprite.width, (CELL_H - 50) / this.sprite.height))

    const name = scene.add
      .text(0, CELL_H / 2 - 34, unit.name, style({ fontSize: '13px', color: ELEMENT_COLOR[unit.element], fontStyle: 'bold' }))
      .setOrigin(0.5)
    const bar = (y: number, h: number, color: number) => {
      const bg = scene.add.rectangle(-BAR_W / 2, y, BAR_W, h, 0x000000, 0.6).setOrigin(0, 0.5)
      const fill = scene.add.rectangle(-BAR_W / 2, y, BAR_W, h, color).setOrigin(0, 0.5)
      return [bg, fill] as const
    }
    const [lifeforceBg, lifeforceFill] = bar(CELL_H / 2 - 19, 7, 0x4cc36a)
    const [essenceBg, essenceFill] = bar(CELL_H / 2 - 10, 4, 0x5aa0ff)
    this.lifeforceFill = lifeforceFill
    this.essenceFill = essenceFill
    this.statusText = scene.add
      .text(CELL_W / 2 - 8, -CELL_H / 2 + 6, '', style({ fontSize: '11px', color: '#ff9c5a', fontStyle: 'bold' }))
      .setOrigin(1, 0)

    this.container.add([this.sprite, name, lifeforceBg, lifeforceFill, essenceBg, essenceFill, this.statusText])
    this.setLifeforce(unit.lifeforce, 0)
    this.setEssence(unit.essence, 0)
  }

  setLifeforce(value: number, duration: number) {
    const ratio = Math.max(0, value / this.unit.maxLifeforce)
    this.lifeforceFill.setFillStyle(ratio > 0.5 ? 0x4cc36a : ratio > 0.25 ? 0xe0b43c : 0xd9534f)
    this.tweenBar(this.lifeforceFill, ratio, duration)
  }

  setEssence(value: number, duration: number) {
    this.tweenBar(this.essenceFill, value / this.unit.maxEssence, duration)
  }

  private tweenBar(bar: Phaser.GameObjects.Rectangle, ratio: number, duration: number) {
    if (duration <= 0) bar.setScale(ratio, 1)
    else this.scene.tweens.add({ targets: bar, scaleX: ratio, duration })
  }

  setStatus(status: StatusId, active: boolean) {
    if (active) this.statuses.add(status)
    else this.statuses.delete(status)
    this.statusText.setText([...this.statuses].map(statusName).join(' '))
  }

  defeat() {
    this.statuses.clear()
    this.statusText.setText('')
    this.sprite.setTint(0x444444)
    this.container.setAlpha(0.35)
  }

  setActive(active: boolean) {
    this.cell.setStrokeStyle(active ? 4 : 2, active ? 0xffe28a : SIDE_COLOR[this.unit.side], active ? 1 : 0.6)
  }
}

/** Draws the Lane grid and replays a battle's event stream. It never decides anything itself. */
export class BattleScene extends Phaser.Scene {
  private views = new Map<string, UnitView>()
  private cells = new Map<string, Phaser.GameObjects.Rectangle>()
  private turnOrder?: Phaser.GameObjects.Container
  private playback: Playback = { speed: 1, skip: false }
  private onProgress?: (eventIndex: number) => void
  private result?: BattleResult
  private cancelled = false

  constructor() {
    super('BattleScene')
  }

  init(data: BattleSceneData) {
    this.result = data.result
    this.playback = data.playback ?? { speed: 1, skip: false }
    this.onProgress = data.onProgress
    this.views = new Map()
    this.cells = new Map()
    this.cancelled = false
  }

  preload() {
    for (const id of Object.keys(CREATURES)) {
      if (!this.textures.exists(textureKey(id))) this.load.image(textureKey(id), `art/creatures/${id}.webp`)
    }
  }

  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (this.cancelled = true))
    this.drawGrid()
    this.turnOrder = this.add.container(0, 0)
    const start = this.result?.events[0]
    if (start?.type !== 'battleStarted') return
    for (const unit of start.units) {
      const cell = this.cells.get(`${unit.side}:${unit.position.lane}:${unit.position.row}`)!
      this.views.set(unit.id, new UnitView(this, unit, cell))
    }
    void this.play(this.result!.events)
  }

  private drawGrid() {
    const label = (x: number, text: string) =>
      this.add.text(x, GRID_TOP - 16, text, style({ fontSize: '13px', color: '#9aa0a6' })).setOrigin(0.5)
    for (const side of ['player', 'enemy'] as const) {
      for (const row of ['front', 'back'] as const) {
        const x = COLUMN_X[side][row]
        label(x, row === 'front' ? 'Front' : 'Back')
        for (let lane = 0; lane < LANES; lane++) {
          const cell = this.add
            .rectangle(x, laneY(lane), CELL_W, CELL_H, 0xffffff, 0.03)
            .setStrokeStyle(2, SIDE_COLOR[side], 0.6)
          this.cells.set(`${side}:${lane}:${row}`, cell)
        }
      }
    }
    for (let lane = 0; lane < LANES; lane++) {
      this.add.text(640, laneY(lane), `Lane ${lane + 1}`, style({ fontSize: '12px', color: '#5c6370' })).setOrigin(0.5)
    }
  }

  private async play(events: BattleEvent[]) {
    for (let i = 1; i < events.length; i++) {
      if (this.cancelled) return
      const instant = this.playback.skip
      const duration = this.apply(events[i], instant)
      this.onProgress?.(i)
      if (!instant && duration > 0) await this.wait(duration / this.playback.speed)
    }
  }

  private wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, resolve))
  }

  /** Shows one event and returns how long playback should pause after it (at 1x speed). */
  private apply(event: BattleEvent, instant: boolean): number {
    const speed = this.playback.speed
    const animate = (ms: number) => (instant ? 0 : ms / speed)
    switch (event.type) {
      case 'battleStarted':
        return 0
      case 'turnStarted': {
        for (const view of this.views.values()) view.setActive(view.unit.id === event.actor)
        this.views.get(event.actor)!.setEssence(event.essence, animate(200))
        this.drawTurnOrder([event.actor, ...event.upcoming])
        return DURATION.turn
      }
      case 'statusTicked': {
        const view = this.views.get(event.unit)!
        view.setLifeforce(event.lifeforce, animate(250))
        if (!instant) this.float(view, `-${event.amount}`, '#ff9c5a')
        return DURATION.status
      }
      case 'statusExpired':
        this.views.get(event.unit)!.setStatus(event.status, false)
        return 0
      case 'actionChosen': {
        const view = this.views.get(event.actor)!
        view.setEssence(event.essence, animate(200))
        if (!instant) {
          const reason = event.tactic === null ? 'Fallback' : `Tactic ${event.tactic + 1}: ${describeCondition(event.condition!)}`
          this.banner(view, event.skillName, reason)
          const direction = view.unit.side === 'player' ? 1 : -1
          this.tweens.add({ targets: view.container, x: view.cell.x + direction * 28, duration: 130 / speed, yoyo: true })
        }
        return DURATION.action
      }
      case 'damageDealt': {
        const view = this.views.get(event.target)!
        view.setLifeforce(event.lifeforce, animate(300))
        if (!instant) {
          this.float(view, event.weakness ? `WEAK! -${event.amount}` : `-${event.amount}`, event.weakness ? '#ffd23f' : '#ffffff')
          this.tweens.add({ targets: view.container, x: view.cell.x + 6, duration: 50 / speed, yoyo: true, repeat: 2 })
        }
        return DURATION.hit
      }
      case 'healed': {
        const view = this.views.get(event.target)!
        view.setLifeforce(event.lifeforce, animate(300))
        if (!instant) this.float(view, `+${event.amount}`, '#7cf29a')
        return DURATION.hit
      }
      case 'statusApplied': {
        const view = this.views.get(event.target)!
        view.setStatus(event.status, true)
        if (!instant) this.float(view, statusName(event.status), '#ff9c5a', 20)
        return DURATION.status
      }
      case 'defeated':
        this.views.get(event.unit)!.defeat()
        return DURATION.status
      case 'battleEnded': {
        for (const view of this.views.values()) view.setActive(false)
        const text = event.winner === 'draw' ? 'Draw' : event.winner === 'player' ? 'Victory' : 'Defeat'
        const color = event.winner === 'player' ? '#ffe28a' : event.winner === 'enemy' ? '#ff7b72' : '#c4c8cc'
        this.add
          .text(640, 380, text, style({ fontSize: '72px', color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 8 }))
          .setOrigin(0.5)
        return DURATION.end
      }
    }
  }

  private float(view: UnitView, text: string, color: string, offsetY = 0) {
    const label = this.add
      .text(view.cell.x, view.cell.y - 30 + offsetY, text, style({
        fontSize: '22px',
        color,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5,
      }))
      .setOrigin(0.5)
    this.tweens.add({
      targets: label,
      y: label.y - 40,
      alpha: 0,
      duration: 900 / this.playback.speed,
      onComplete: () => label.destroy(),
    })
  }

  private banner(view: UnitView, title: string, subtitle: string) {
    const y = view.cell.y - CELL_H / 2 - 4
    const group = this.add.container(view.cell.x, y, [
      this.add.text(0, -14, title, style({ fontSize: '16px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 })).setOrigin(0.5),
      this.add.text(0, 6, subtitle, style({ fontSize: '11px', color: '#c4c8cc', backgroundColor: '#000000aa', padding: { x: 4, y: 1 } })).setOrigin(0.5),
    ])
    group.setDepth(10)
    this.tweens.add({ targets: group, alpha: 0, delay: 500 / this.playback.speed, duration: 300 / this.playback.speed, onComplete: () => group.destroy() })
  }

  /** The visible Turn Order: current actor first, then the predicted next turns. */
  private drawTurnOrder(ids: string[]) {
    this.turnOrder!.removeAll(true)
    const size = 56
    const startX = 640 - ((TURN_SLOTS - 1) * (size + 8)) / 2
    this.turnOrder!.add(this.add.text(startX - size / 2, 22, 'Turn Order', style({ fontSize: '12px', color: '#9aa0a6' })))
    ids.slice(0, TURN_SLOTS).forEach((id, i) => {
      const unit = this.views.get(id)!.unit
      const x = startX + i * (size + 8)
      const slot = this.add
        .rectangle(x, 80, size, size, 0x000000, 0.5)
        .setStrokeStyle(i === 0 ? 3 : 2, i === 0 ? 0xffe28a : SIDE_COLOR[unit.side])
      const image = this.add.image(x, 80, textureKey(unit.creature)).setFlipX(unit.side === 'enemy')
      image.setScale(Math.min((size - 6) / image.width, (size - 6) / image.height))
      this.turnOrder!.add([slot, image])
    })
  }
}
