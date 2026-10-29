import Phaser from 'phaser'
import { LANE_NAMES } from '../core/rules'
import { STATUS_RULES, statusName } from '../core/statuses'
import type { BattleEvent, BattleResult, Element, Side, StatusId, UnitSnapshot } from '../core/types'

/** Playback settings shared with React: the controls change them while the scene reads them each step. */
export class Playback {
  speed: number
  skip = false

  constructor(speed = 1) {
    this.speed = speed
  }

  setSpeed(speed: number) {
    this.speed = speed
  }

  skipToEnd() {
    this.skip = true
  }
}

export interface BattleSceneData {
  result?: BattleResult
  playback?: Playback
  onProgress?: (eventIndex: number) => void
  /** Region backdrop key in public/art/backdrops. */
  backdrop?: string
  /** Events up to this index are shown instantly (after a rotation restarts the scene). */
  startAt?: number
}

export type Orientation = 'landscape' | 'portrait'

interface Layout {
  width: number
  height: number
  portrait: boolean
  /** Size of the box a creature sprite is fitted into. */
  sprite: number
  /**
   * Scale for text, bars and the Turn Order. A portrait canvas is shrunk to fit a phone's width, so its labels
   * are drawn larger to stay readable without zooming.
   */
  ui: number
  /** Widest a creature's name may run before it wraps: the room between two neighbouring cells. */
  nameWidth: number
  turnY: number
  bossY: number
  pos: (side: Side, lane: number, row: 'front' | 'back') => { x: number; y: number }
}

/** Canvas size for a container: a fixed short side, the long side follows the screen within limits. */
export function canvasSize(orientation: Orientation, aspect: number) {
  if (orientation === 'portrait') return { width: 720, height: Math.round(Phaser.Math.Clamp(720 / aspect, 1240, 1600)) }
  return { width: Math.round(Phaser.Math.Clamp(720 * aspect, 1180, 1700)), height: 720 }
}

/** Positions for a canvas size. Always player left, enemies right, Lanes Top / Middle / Bottom as rows. */
export function makeLayout(width: number, height: number): Layout {
  if (height > width) {
    const mid = height / 2 + 50
    return {
      width,
      height,
      portrait: true,
      sprite: 168,
      ui: 1.5,
      nameWidth: 150,
      turnY: 74,
      bossY: 196,
      pos: (side, lane, row) => ({
        x: side === 'player' ? (row === 'front' ? 268 : 94) : row === 'front' ? 452 : 626,
        y: mid + (lane - 1) * Math.min(300, (height - 420) / 3),
      }),
    }
  }
  const dx = (width - 1280) / 2
  return {
    width,
    height,
    portrait: false,
    sprite: 165,
    ui: 1,
    nameWidth: 200,
    turnY: 46,
    bossY: 112,
    pos: (side, lane, row) => ({
      x: dx + (side === 'player' ? (row === 'front' ? 430 : 215) : row === 'front' ? 850 : 1065),
      y: 290 + lane * 152,
    }),
  }
}

const SIDE_COLOR: Record<Side, number> = { player: 0x6fa8ff, enemy: 0xff7a5c }
const ELEMENT_COLOR: Record<Element, number> = {
  fire: 0xf07a3a,
  ice: 0x5f9bff,
  thunder: 0xf6d04d,
  water: 0x36c9b8,
  earth: 0x5dbb72,
  wind: 0xd4f1ee,
  radiance: 0xfbe7a8,
  umbra: 0xa08af0,
  physical: 0xd8d4e4,
}
const css = (color: number) => `#${color.toString(16).padStart(6, '0')}`
const STATUS_COLOR: Record<StatusId, number> = {
  burn: 0xff8a3d,
  chill: 0x8fc3ff,
  shock: 0xffe14d,
  sunder: 0xc9a47a,
  hex: 0xb58cff,
  regen: 0x7cf29a,
  haste: 0xbff7f0,
  barrier: 0xfff1c9,
  taunt: 0xff6b6b,
}
const GOLD = 0xe6c47a

// Base durations in ms at 1x speed.
const DURATION = { turn: 220, action: 520, hit: 420, status: 280, ascension: 1300, phase: 900, surge: 1100 }

const DISPLAY = 'Cinzel, Georgia, serif'
const SANS = '"Alegreya Sans", system-ui, sans-serif'
const RESOLUTION = Math.min(2, Math.max(1, Math.round(globalThis.devicePixelRatio || 1)))
const px = (size: number, scale = 1) => `${Math.round(size * scale)}px`
const style = (overrides: Phaser.Types.GameObjects.Text.TextStyle): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: SANS,
  resolution: RESOLUTION,
  ...overrides,
})

export const textureKey = (creature: string) => `creature-${creature}`

class UnitView {
  readonly container: Phaser.GameObjects.Container
  readonly sprite: Phaser.GameObjects.Image
  private readonly ring: Phaser.GameObjects.Graphics
  private readonly glow: Phaser.GameObjects.Image
  private readonly lifeforceFill: Phaser.GameObjects.Rectangle
  private readonly essenceFill: Phaser.GameObjects.Rectangle
  private readonly ascensionFill?: Phaser.GameObjects.Rectangle
  private readonly statusRow: Phaser.GameObjects.Container
  private readonly statuses = new Map<StatusId, number>()
  private readonly scene: Phaser.Scene
  private readonly barWidth: number
  private readonly ui: number
  readonly unit: UnitSnapshot
  readonly home: { x: number; y: number }
  readonly size: number
  private breathing?: Phaser.Tweens.Tween

  constructor(scene: Phaser.Scene, unit: UnitSnapshot, layout: Layout) {
    this.scene = scene
    this.unit = unit
    this.home = layout.pos(unit.side, unit.position.lane, unit.position.row)
    this.size = layout.sprite * (unit.boss ? 1.22 : 1)
    this.ui = layout.ui
    const ui = layout.ui
    const { x, y } = this.home
    this.container = scene.add.container(x, y)
    this.container.setDepth(y)

    const element = ELEMENT_COLOR[unit.element]
    const shadow = scene.add.ellipse(0, this.size * 0.42, this.size * 0.8, this.size * 0.2, 0x000000, 0.45)
    this.glow = scene.add.image(0, this.size * 0.38, 'glow').setTint(element).setAlpha(0.55).setScale((this.size * 1.1) / 128, (this.size * 0.36) / 128)
    this.glow.setBlendMode(Phaser.BlendModes.ADD)
    this.ring = scene.add.graphics()
    this.drawRing(false)

    this.sprite = scene.add.image(0, this.size * 0.42, textureKey(unit.creature)).setOrigin(0.5, 1).setFlipX(unit.side === 'enemy')
    this.sprite.setScale(Math.min(this.size / this.sprite.width, this.size / this.sprite.height))

    this.barWidth = Math.round(this.size * (layout.portrait ? 0.9 : 0.82))
    const top = this.size * 0.5
    const name = scene.add
      .text(0, top + 4, unit.name, style({ fontFamily: DISPLAY, fontSize: px(unit.boss ? 17 : 15, ui), color: css(element), fontStyle: 'bold', stroke: '#0a0918', strokeThickness: 4 * ui, align: 'center', wordWrap: { width: layout.nameWidth } }))
      .setOrigin(0.5, 0)
      .setLineSpacing(-4 * ui)
    // Every name gets room for two lines, so all bars line up whether a name wraps or not; a one-line name sits
    // just above its bars.
    const lines = Math.max(1, name.getWrappedText().length)
    const lineH = (name.height + 4 * ui * (lines - 1)) / lines
    const block = Math.max(name.height, lineH * 2 - 4 * ui)
    name.setY(top + 4 + block - name.height)
    const barsY = top + 4 + block + 4 * ui
    const bar = (yy: number, h: number, color: number) => {
      const bg = scene.add.rectangle(-this.barWidth / 2, yy, this.barWidth, h, 0x05040c, 0.85).setOrigin(0, 0.5).setStrokeStyle(1, 0xe6c47a, 0.35)
      const fill = scene.add.rectangle(-this.barWidth / 2, yy, this.barWidth, h, color).setOrigin(0, 0.5)
      return [bg, fill] as const
    }
    const lifeH = (unit.boss ? 10 : 8) * ui
    const [lifeforceBg, lifeforceFill] = bar(barsY + lifeH / 2, lifeH, 0x5fd38a)
    const [essenceBg, essenceFill] = bar(barsY + lifeH + 3 * ui, 4 * ui, 0x6fa8ff)
    this.lifeforceFill = lifeforceFill
    this.essenceFill = essenceFill
    const parts: Phaser.GameObjects.GameObject[] = [this.glow, shadow, this.ring, this.sprite, name, lifeforceBg, lifeforceFill, essenceBg, essenceFill]
    if (unit.hasAscension) {
      const [ascBg, ascFill] = bar(barsY + lifeH + 9 * ui, 4 * ui, GOLD)
      this.ascensionFill = ascFill
      ascFill.setScale(0, 1)
      parts.push(ascBg, ascFill)
    }
    this.statusRow = scene.add.container(0, -this.size * 0.62)
    parts.push(this.statusRow)
    this.container.add(parts)
    this.setLifeforce(unit.lifeforce, 0)
    this.setEssence(unit.essence, 0)
    this.breathing = scene.tweens.add({
      targets: this.sprite,
      scaleY: this.sprite.scaleY * 1.025,
      duration: 1600 + (unit.position.lane * 170),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private drawRing(active: boolean) {
    const r = this.size * 0.42
    this.ring.clear()
    this.ring.lineStyle(active ? 3 : 1.5, active ? 0xffe7ad : SIDE_COLOR[this.unit.side], active ? 1 : 0.55)
    this.ring.strokeEllipse(0, this.size * 0.42, r * 2, r * 0.55)
    if (active) {
      this.ring.lineStyle(1, 0xffe7ad, 0.5)
      this.ring.strokeEllipse(0, this.size * 0.42, r * 2.3, r * 0.68)
    }
  }

  setActive(active: boolean) {
    this.drawRing(active)
    this.glow.setAlpha(active ? 0.95 : 0.55)
  }

  setLifeforce(value: number, duration: number) {
    const ratio = Math.max(0, value / this.unit.maxLifeforce)
    this.lifeforceFill.setFillStyle(ratio > 0.5 ? 0x5fd38a : ratio > 0.25 ? 0xe6c04a : 0xe0574f)
    this.tweenBar(this.lifeforceFill, ratio, duration)
  }

  setEssence(value: number, duration: number) {
    this.tweenBar(this.essenceFill, value / this.unit.maxEssence, duration)
  }

  setAscension(value: number, duration: number) {
    if (!this.ascensionFill) return
    this.ascensionFill.setFillStyle(value >= 100 ? 0xfff1c9 : GOLD)
    this.tweenBar(this.ascensionFill, value / 100, duration)
  }

  private tweenBar(bar: Phaser.GameObjects.Rectangle, ratio: number, duration: number) {
    if (duration <= 0) bar.setScale(ratio, 1)
    else this.scene.tweens.add({ targets: bar, scaleX: ratio, duration })
  }

  setStatus(status: StatusId, turns: number | null) {
    if (turns === null) this.statuses.delete(status)
    else this.statuses.set(status, turns)
    this.statusRow.removeAll(true)
    const list = [...this.statuses.keys()]
    const ui = this.ui
    const w = 50 * ui
    const h = 18 * ui
    // Larger pills (portrait) go two to a row, stacking upwards, so they stay within the creature's cell.
    const perRow = ui > 1 ? 2 : list.length
    list.forEach((s, i) => {
      const row = Math.floor(i / perRow)
      const inRow = Math.min(perRow, list.length - row * perRow)
      const x = ((i % perRow) - (inRow - 1) / 2) * (w + 4)
      const y = -row * (h + 3)
      const pill = this.scene.add.rectangle(x, y, w, h, 0x0a0918, 0.85).setStrokeStyle(1, STATUS_COLOR[s], 0.9)
      const label = this.scene.add
        .text(x, y, statusName(s), style({ fontSize: px(11, ui), color: css(STATUS_COLOR[s]), fontStyle: 'bold' }))
        .setOrigin(0.5)
      this.statusRow.add([pill, label])
    })
  }

  flash() {
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL)
    this.scene.time.delayedCall(90, () => this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.MULTIPLY))
  }

  defeat(instant: boolean) {
    this.statuses.clear()
    this.statusRow.removeAll(true)
    this.breathing?.pause()
    this.sprite.setTint(0x555566)
    this.glow.setAlpha(0)
    if (instant) this.container.setAlpha(0.3)
    else this.scene.tweens.add({ targets: this.container, alpha: 0.3, duration: 500 })
  }

  revive(lifeforce: number) {
    this.sprite.setTint(0xffffff)
    this.breathing?.resume()
    this.container.setAlpha(1)
    this.glow.setAlpha(0.55)
    this.setLifeforce(lifeforce, 300)
  }
}

/** Replays a battle's event stream with the region backdrop. It never decides anything itself. */
export class BattleScene extends Phaser.Scene {
  private views = new Map<string, UnitView>()
  private turnOrder?: Phaser.GameObjects.Container
  private bossBars = new Map<string, { fill: Phaser.GameObjects.Rectangle; max: number }>()
  private playback = new Playback()
  private onProgress?: (eventIndex: number) => void
  private result?: BattleResult
  private backdrop = 'spire'
  private startAt = 0
  private layout: Layout = makeLayout(1280, 720)
  private cancelled = false

  constructor() {
    super('BattleScene')
  }

  init(data: BattleSceneData) {
    this.result = data.result
    this.playback = data.playback ?? new Playback()
    this.onProgress = data.onProgress
    this.backdrop = data.backdrop ?? 'spire'
    this.startAt = data.startAt ?? 0
    this.views = new Map()
    this.bossBars = new Map()
    this.cancelled = false
    this.layout = makeLayout(this.scale.width, this.scale.height)
  }

  preload() {
    const start = this.result?.events[0]
    const creatures = start?.type === 'battleStarted' ? [...new Set(start.units.map((u) => u.creature))] : []
    for (const id of creatures) {
      if (!this.textures.exists(textureKey(id))) this.load.image(textureKey(id), `art/creatures/${id}.webp`)
    }
    const backdropKey = `backdrop-${this.backdrop}`
    if (!this.textures.exists(backdropKey)) this.load.image(backdropKey, `art/backdrops/${this.backdrop}.webp`)
  }

  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (this.cancelled = true))
    this.makeTextures()
    this.drawBackground()
    this.turnOrder = this.add.container(0, 0).setDepth(2000)
    const start = this.result?.events[0]
    if (start?.type !== 'battleStarted') return
    for (const unit of start.units) this.views.set(unit.id, new UnitView(this, unit, this.layout))
    this.drawBossBars(start.units.filter((u) => u.boss))
    void this.play(this.result!.events)
  }

  private makeTextures() {
    if (this.textures.exists('glow')) return
    const canvas = this.textures.createCanvas('glow', 128, 128)
    if (!canvas) return
    const ctx = canvas.getContext()
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.45)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
    canvas.refresh()
  }

  private drawBackground() {
    const { width, height, portrait } = this.layout
    const key = `backdrop-${this.backdrop}`
    if (this.textures.exists(key)) {
      const bg = this.add.image(width / 2, height / 2, key)
      bg.setScale(Math.max(width / bg.width, height / bg.height))
    }
    // Night veil, vignette and a band of light where the two sides meet.
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0918, 0.35)
    const veil = this.add.graphics()
    veil.fillGradientStyle(0x0a0918, 0x0a0918, 0x0a0918, 0x0a0918, 0.85, 0.85, 0, 0)
    veil.fillRect(0, 0, width, height * 0.22)
    veil.fillGradientStyle(0x0a0918, 0x0a0918, 0x0a0918, 0x0a0918, 0, 0, 0.8, 0.8)
    veil.fillRect(0, height * 0.82, width, height * 0.18)
    const band = this.add.image(width / 2, this.layout.pos('player', 1, 'front').y, 'glow').setTint(0xffe7ad).setAlpha(0.18)
    band.setScale(portrait ? 1.6 : 2.2, height / 90).setBlendMode(Phaser.BlendModes.ADD)
    // Lane lines between the Lanes and faint Lane names in the middle.
    const g = this.add.graphics()
    g.lineStyle(1, 0xe6c47a, 0.16)
    const left = this.layout.pos('player', 0, 'back').x - this.layout.sprite / 2
    const right = this.layout.pos('enemy', 0, 'back').x + this.layout.sprite / 2
    for (let lane = 0; lane < 3; lane++) {
      const y = this.layout.pos('player', lane, 'back').y
      if (lane > 0) {
        const between = (y + this.layout.pos('player', lane - 1, 'back').y) / 2
        g.lineBetween(left, between, right, between)
      }
      this.add
        .text(width / 2, y, LANE_NAMES[lane].toUpperCase(), style({ fontFamily: DISPLAY, fontSize: px(13, this.layout.ui), color: '#e6c47a' }))
        .setOrigin(0.5)
        .setAlpha(0.35)
        .setAngle(-90)
    }
    // Rising motes of light.
    for (let i = 0; i < 18; i++) {
      const mote = this.add.image(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 'glow').setTint(0xffe7ad)
      mote.setScale(0.05 + Math.random() * 0.06).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD)
      this.tweens.add({
        targets: mote,
        y: mote.y - height * 0.6,
        x: mote.x + Phaser.Math.Between(-40, 40),
        alpha: 0,
        duration: 6000 + Math.random() * 6000,
        repeat: -1,
        delay: Math.random() * 4000,
        onRepeat: () => mote.setPosition(Phaser.Math.Between(0, width), height + 10).setAlpha(0.6),
      })
    }
  }

  /** A short glow along the Lane an attack goes to. */
  private laneFlash(y: number, color: number) {
    const { width, sprite } = this.layout
    const band = this.add.rectangle(width / 2, y, width, sprite * 1.05, color, 0.14).setDepth(1).setBlendMode(Phaser.BlendModes.ADD)
    this.tweens.add({ targets: band, alpha: 0, duration: 520 / this.playback.speed, onComplete: () => band.destroy() })
  }

  private drawBossBars(bosses: UnitSnapshot[]) {
    const { width, bossY, portrait, ui } = this.layout
    bosses.forEach((boss, i) => {
      const w = portrait ? width - 120 : 420
      const x = portrait ? width / 2 : width / 2 + (i - (bosses.length - 1) / 2) * (w + 40)
      const y = bossY + (portrait ? i * 44 * ui : 0)
      this.add.text(x - w / 2, y - 24 * ui, boss.name.toUpperCase(), style({ fontFamily: DISPLAY, fontSize: px(15, ui), color: css(ELEMENT_COLOR[boss.element]), fontStyle: 'bold', stroke: '#0a0918', strokeThickness: 4 * ui })).setDepth(2000)
      this.add.rectangle(x, y + 6, w + 6, 16 * ui, 0x05040c, 0.9).setStrokeStyle(1.5, GOLD, 0.8).setDepth(2000)
      const fill = this.add.rectangle(x - w / 2, y + 6, w, 10 * ui, 0xe0574f).setOrigin(0, 0.5).setDepth(2000)
      this.bossBars.set(boss.id, { fill, max: boss.maxLifeforce })
    })
  }

  private async play(events: BattleEvent[]) {
    for (let i = 1; i < events.length; i++) {
      if (this.cancelled) return
      const instant = this.playback.skip || i <= this.startAt
      const duration = this.apply(events, i, instant)
      this.onProgress?.(i)
      if (!instant && duration > 0) await this.wait(duration / this.playback.speed)
    }
  }

  private wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, resolve))
  }

  private setBoss(unit: string, lifeforce: number, duration: number) {
    const bar = this.bossBars.get(unit)
    if (!bar) return
    const ratio = Math.max(0, lifeforce / bar.max)
    if (duration <= 0) bar.fill.setScale(ratio, 1)
    else this.tweens.add({ targets: bar.fill, scaleX: ratio, duration })
  }

  /** Shows one event and returns how long playback should pause after it (at 1x speed). */
  private apply(events: BattleEvent[], index: number, instant: boolean): number {
    const event = events[index]
    const speed = this.playback.speed
    const animate = (ms: number) => (instant ? 0 : ms / speed)
    switch (event.type) {
      case 'battleStarted':
        return 0
      case 'turnStarted': {
        for (const view of this.views.values()) view.setActive(view.unit.id === event.actor)
        this.views.get(event.actor)!.setEssence(event.essence, animate(200))
        if (!instant || index === this.startAt) this.drawTurnOrder([event.actor, ...event.upcoming])
        return DURATION.turn
      }
      case 'statusTicked': {
        const view = this.views.get(event.unit)!
        view.setLifeforce(event.lifeforce, animate(250))
        this.setBoss(event.unit, event.lifeforce, animate(250))
        if (!instant) this.float(view, `${event.heal ? '+' : '-'}${event.amount}`, css(STATUS_COLOR[event.status]))
        return DURATION.status
      }
      case 'statusExpired':
        this.views.get(event.unit)!.setStatus(event.status, null)
        return 0
      case 'turnLost': {
        const view = this.views.get(event.unit)!
        if (!instant) this.float(view, 'Paralysed!', css(STATUS_COLOR.shock), -20)
        return DURATION.status
      }
      case 'actionChosen': {
        const view = this.views.get(event.actor)!
        view.setEssence(event.essence, animate(200))
        if (instant) return 0
        if (event.ascension) {
          this.ascension(view, event.skillName)
          return DURATION.ascension
        }
        const targets = event.targets.map((id) => this.views.get(id)!)
        this.banner(view, event.skillName, targets.length === 1 ? `→ ${targets[0].unit.name}` : `→ ${targets.length} targets`)
        const enemyTargets = targets.filter((t) => t.unit.side !== view.unit.side)
        if (enemyTargets.length > 0) {
          const target = enemyTargets[0]
          for (const y of new Set(enemyTargets.map((t) => t.home.y))) this.laneFlash(y, SIDE_COLOR[view.unit.side])
          const dx = (target.home.x - view.home.x) * 0.12
          const dy = (target.home.y - view.home.y) * 0.12
          this.tweens.add({ targets: view.container, x: view.home.x + dx, y: view.home.y + dy, duration: 140 / speed, yoyo: true, ease: 'Quad.easeOut' })
          for (const t of enemyTargets) this.projectile(view, t)
        } else {
          for (const t of targets) this.sparkle(t, 0xfff1c9)
        }
        return DURATION.action
      }
      case 'damageDealt': {
        const view = this.views.get(event.target)!
        view.setLifeforce(event.lifeforce, animate(300))
        this.setBoss(event.target, event.lifeforce, animate(300))
        if (!instant) {
          view.flash()
          this.float(view, event.weakness ? `${event.amount}!` : `${event.amount}`, event.weakness ? '#ffd23f' : '#ffffff', 0, event.weakness ? 34 : 26)
          if (event.weakness) this.float(view, 'WEAK', '#ffd23f', 34, 15)
          this.tweens.add({ targets: view.container, x: view.home.x + 7, duration: 45 / speed, yoyo: true, repeat: 2, onComplete: () => view.container.setX(view.home.x) })
          this.sparkle(view, 0xffffff)
          if (event.weakness || view.unit.boss) this.cameras.main.shake(120, 0.004)
        }
        return DURATION.hit
      }
      case 'healed': {
        const view = this.views.get(event.target)!
        view.setLifeforce(event.lifeforce, animate(300))
        this.setBoss(event.target, event.lifeforce, animate(300))
        if (!instant) {
          this.float(view, `+${event.amount}`, '#7cf29a')
          this.sparkle(view, 0x7cf29a)
        }
        return DURATION.hit
      }
      case 'statusApplied': {
        const view = this.views.get(event.target)!
        view.setStatus(event.status, event.turns)
        if (!instant) this.float(view, statusName(event.status), css(STATUS_COLOR[event.status]), 26, 17)
        return STATUS_RULES[event.status].kind === 'buff' ? DURATION.status / 2 : DURATION.status
      }
      case 'ascensionGauge':
        this.views.get(event.unit)?.setAscension(event.value, animate(200))
        return 0
      case 'phaseShift': {
        const view = this.views.get(event.unit)!
        if (instant) return 0
        this.cameras.main.flash(300, 255, 200, 120)
        this.float(view, 'SIGIL BLAZES', '#ffe7ad', -40, 22)
        this.sparkle(view, GOLD, 16)
        return DURATION.phase
      }
      case 'surge': {
        if (instant) return 0
        this.centerTitle('THE SIGILS SURGE', 'Damage rises, healing fades', '#ffb36b')
        return DURATION.surge
      }
      case 'vowTriggered': {
        const view = this.views.get(event.unit)!
        if (!instant) this.float(view, event.vow, '#d9b8ff', -30, 17)
        return DURATION.status
      }
      case 'lastStand': {
        const view = this.views.get(event.unit)!
        if (!instant) this.float(view, 'Last Stand!', '#ffe7ad', -30, 20)
        return DURATION.status
      }
      case 'defeated':
        this.views.get(event.unit)!.defeat(instant)
        this.setBoss(event.unit, 0, 0)
        return DURATION.status
      case 'revived': {
        const view = this.views.get(event.target)!
        view.revive(event.lifeforce)
        if (!instant) {
          this.float(view, 'Revived', '#fff1c9', -20, 20)
          this.sparkle(view, 0xfff1c9, 14)
        }
        return DURATION.hit
      }
      case 'battleEnded': {
        for (const view of this.views.values()) view.setActive(false)
        const won = event.winner === 'player'
        const text = event.winner === 'draw' ? 'DRAW' : won ? 'VICTORY' : 'DEFEAT'
        this.centerTitle(text, '', won ? '#ffe7ad' : event.winner === 'enemy' ? '#ff8a7a' : '#d8d4e4', true)
        return 0
      }
    }
  }

  private float(view: UnitView, text: string, color: string, offsetY = 0, size = 24) {
    const ui = Math.sqrt(this.layout.ui)
    const label = this.add
      .text(view.home.x + Phaser.Math.Between(-10, 10), view.home.y - view.size * 0.25 - offsetY * ui, text, style({
        fontFamily: DISPLAY,
        fontSize: px(size, ui),
        color,
        fontStyle: 'bold',
        stroke: '#0a0918',
        strokeThickness: 5,
      }))
      .setOrigin(0.5)
      .setDepth(3000)
    this.tweens.add({
      targets: label,
      y: label.y - 46,
      alpha: 0,
      duration: 1000 / this.playback.speed,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    })
  }

  private sparkle(view: UnitView, color: number, count = 7) {
    const cx = view.home.x
    const cy = view.home.y
    for (let i = 0; i < count; i++) {
      const p = this.add.image(cx, cy, 'glow').setTint(color).setScale(0.12).setBlendMode(Phaser.BlendModes.ADD).setDepth(2500)
      const angle = (i / count) * Math.PI * 2 + Math.random()
      const dist = view.size * (0.3 + Math.random() * 0.25)
      this.tweens.add({
        targets: p,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist * 0.7,
        scale: 0.02,
        alpha: 0,
        duration: 450 / this.playback.speed,
        onComplete: () => p.destroy(),
      })
    }
  }

  private projectile(from: UnitView, to: UnitView) {
    const color = ELEMENT_COLOR[from.unit.element]
    const orb = this.add.image(from.home.x, from.home.y - from.size * 0.1, 'glow').setTint(color).setScale(0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(2600)
    this.tweens.add({
      targets: orb,
      x: to.home.x,
      y: to.home.y - to.size * 0.1,
      scale: 0.5,
      duration: 220 / this.playback.speed,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.tweens.add({ targets: orb, scale: 1.1, alpha: 0, duration: 180 / this.playback.speed, onComplete: () => orb.destroy() })
      },
    })
  }

  private banner(view: UnitView, title: string, subtitle: string) {
    const ui = this.layout.ui
    const y = view.home.y - view.size * 0.62 - 26 * ui
    const group = this.add.container(view.home.x, y)
    const titleText = this.add
      .text(0, -10 * ui, title, style({ fontFamily: DISPLAY, fontSize: px(19, ui), color: '#fff3d1', fontStyle: 'bold', stroke: '#0a0918', strokeThickness: 5 }))
      .setOrigin(0.5)
    const sub = this.add.text(0, 12 * ui, subtitle, style({ fontSize: px(13, ui), color: '#e6c47a', backgroundColor: '#0a0918cc', padding: { x: 6, y: 2 } })).setOrigin(0.5)
    group.add([sub, titleText])
    // Keep the banner inside the screen.
    const half = Math.max(titleText.width, sub.width) / 2 + 8
    group.setX(Phaser.Math.Clamp(view.home.x, half, this.layout.width - half))
    group.setDepth(2800)
    group.setAlpha(0)
    this.tweens.add({ targets: group, alpha: 1, y: y - 6, duration: 120 / this.playback.speed })
    this.tweens.add({ targets: group, alpha: 0, delay: 650 / this.playback.speed, duration: 280 / this.playback.speed, onComplete: () => group.destroy() })
  }

  private ascension(view: UnitView, skillName: string) {
    const { width, height } = this.layout
    const speed = this.playback.speed
    const veil = this.add.rectangle(width / 2, height / 2, width, height, 0x05040c, 0).setDepth(2700)
    this.tweens.add({ targets: veil, fillAlpha: 0.6, duration: 200 / speed, yoyo: true, hold: 700 / speed, onComplete: () => veil.destroy() })
    const halo = this.add.image(view.home.x, view.home.y, 'glow').setTint(0xffe7ad).setScale(0.5).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(2750)
    this.tweens.add({ targets: halo, scale: 4, alpha: { from: 0.9, to: 0 }, duration: 1000 / speed, onComplete: () => halo.destroy() })
    view.container.setDepth(2760)
    this.tweens.add({ targets: view.container, scale: 1.15, duration: 250 / speed, yoyo: true, hold: 500 / speed, onComplete: () => view.container.setDepth(view.home.y) })
    this.centerTitle('ASCENSION', skillName, '#ffe7ad')
    this.time.delayedCall(800 / speed, () => {
      this.cameras.main.flash(250, 255, 236, 190)
      this.cameras.main.shake(260, 0.008)
    })
  }

  private centerTitle(title: string, subtitle: string, color: string, stay = false) {
    const { width, height } = this.layout
    const speed = this.playback.speed
    const group = this.add.container(width / 2, height / 2).setDepth(3500)
    const glow = this.add.image(0, 0, 'glow').setTint(0xffe7ad).setScale(width / 160, 1.4).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD)
    const big = this.add
      .text(0, -8, title, style({ fontFamily: DISPLAY, fontSize: stay ? '84px' : '58px', color, fontStyle: 'bold', stroke: '#0a0918', strokeThickness: 8 }))
      .setOrigin(0.5)
    const parts: Phaser.GameObjects.GameObject[] = [glow, big]
    if (subtitle) {
      const ui = this.layout.ui
      parts.push(this.add.text(0, (stay ? 54 : 42) * ui, subtitle, style({ fontFamily: DISPLAY, fontSize: px(22, ui), color: '#fff3d1', stroke: '#0a0918', strokeThickness: 5, align: 'center', wordWrap: { width: width - 40 } })).setOrigin(0.5, 0.3))
    }
    group.add(parts)
    group.setScale(0.8).setAlpha(0)
    this.tweens.add({ targets: group, scale: 1, alpha: 1, duration: 260 / speed, ease: 'Back.easeOut' })
    if (!stay) this.tweens.add({ targets: group, alpha: 0, delay: 900 / speed, duration: 300 / speed, onComplete: () => group.destroy() })
  }

  /**
   * The visible Turn Order, kept short: who acts now (large, gold ring), then the next three turns smaller and
   * fainter. A thin bar under each portrait marks the side (blue yours, red theirs).
   */
  private drawTurnOrder(ids: string[]) {
    const container = this.turnOrder!
    container.removeAll(true)
    const { width, turnY, ui } = this.layout
    const now = Math.round(66 * ui)
    const next = Math.round(46 * ui)
    const gap = Math.round(10 * ui)
    const shown = ids.slice(0, 4)
    const total = now + (shown.length - 1) * (next + gap) + gap
    let x = width / 2 - total / 2 + now / 2
    shown.forEach((id, i) => {
      const unit = this.views.get(id)!.unit
      const s = i === 0 ? now : next
      if (i === 1) x += now / 2 + gap * 2 + next / 2
      else if (i > 1) x += next + gap
      const disc = this.add.circle(x, turnY, s / 2, 0x0a0918, 0.85).setStrokeStyle(i === 0 ? 3 * ui : 1.5 * ui, i === 0 ? 0xffe7ad : 0xe6c47a, i === 0 ? 1 : 0.35)
      const image = this.add.image(x, turnY + s * 0.36, textureKey(unit.creature)).setOrigin(0.5, 1).setFlipX(unit.side === 'enemy')
      image.setScale(Math.min((s - 6) / image.width, (s - 6) / image.height))
      const side = this.add.rectangle(x, turnY + s / 2 + 5 * ui, s * 0.6, 3 * ui, SIDE_COLOR[unit.side])
      const parts = [disc, image, side]
      if (i > 0) parts.forEach((p) => p.setAlpha(0.65))
      container.add(parts)
    })
  }
}
