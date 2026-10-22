import Phaser from 'phaser'
import { useEffect, useRef } from 'react'
import { BattleScene } from './BattleScene'

/** Mounts the Phaser canvas; React UI is layered on top of it. */
export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current!,
      backgroundColor: '#0f1117',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1280, height: 720 },
      scene: [BattleScene],
    })
    return () => game.destroy(true)
  }, [])

  return <div ref={containerRef} className="absolute inset-0" />
}
