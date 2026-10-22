import Phaser from 'phaser'

const LANES = 3
const CELL = 110
const GAP = 12

/** Placeholder battle stage: both sides' 3 Lanes x Front/Back Row grid. */
export class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene')
  }

  create() {
    const { width, height } = this.scale
    const gridHeight = LANES * CELL + (LANES - 1) * GAP
    const top = (height - gridHeight) / 2

    // Columns from left to right: player Back, player Front | enemy Front, enemy Back.
    const columns = [
      { x: width / 2 - 2 * CELL - 60, label: 'Back', color: 0x2f6fd6 },
      { x: width / 2 - CELL - 40, label: 'Front', color: 0x2f6fd6 },
      { x: width / 2 + 40, label: 'Front', color: 0xe8642c },
      { x: width / 2 + CELL + 60, label: 'Back', color: 0xe8642c },
    ]

    for (const column of columns) {
      this.add
        .text(column.x + CELL / 2, top - 24, column.label, { fontSize: '14px', color: '#9aa0a6' })
        .setOrigin(0.5)
      for (let lane = 0; lane < LANES; lane++) {
        const y = top + lane * (CELL + GAP)
        this.add
          .rectangle(column.x, y, CELL, CELL)
          .setOrigin(0)
          .setStrokeStyle(2, column.color, 0.8)
      }
    }
  }
}
