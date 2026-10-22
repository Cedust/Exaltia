import Phaser from 'phaser'
import { useEffect, useRef } from 'react'
import { BattleScene, type BattleSceneData } from './BattleScene'

interface Props {
  /** A new object restarts the scene with that battle. */
  battle: BattleSceneData | null
}

/** Mounts the Phaser canvas; React UI is layered around and on top of it. */
export function PhaserGame({ battle }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current!,
      backgroundColor: '#0f1117',
      // Creature art is 512x512 (power of two), so mipmaps keep it smooth when shrunk into the grid.
      render: { mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1280, height: 720 },
    })
    game.scene.add('BattleScene', BattleScene)
    gameRef.current = game
    return () => {
      game.destroy(true)
      gameRef.current = null
    }
  }, [])

  useEffect(() => {
    gameRef.current?.scene.start('BattleScene', battle ?? {})
  }, [battle])

  return <div ref={containerRef} className="absolute inset-0" />
}
