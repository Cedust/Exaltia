import Phaser from 'phaser'
import { useEffect, useRef } from 'react'
import { reportProblem } from '../ui/report'
import { BattleScene, type BattleSceneData } from './BattleScene'

interface Props {
  /** A new object restarts the scene with that battle. */
  battle: BattleSceneData | null
}

/** Mounts the Phaser canvas; React UI is layered around and on top of it. */
/** `?renderer=canvas` forces the Canvas renderer, to rule out WebGL problems on a device. */
function rendererType() {
  const choice = new URLSearchParams(window.location.search).get('renderer')
  if (choice === 'canvas') return Phaser.CANVAS
  if (choice === 'webgl') return Phaser.WEBGL
  return Phaser.AUTO
}

export function PhaserGame({ battle }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    const game = new Phaser.Game({
      type: rendererType(),
      parent: containerRef.current!,
      backgroundColor: '#0f1117',
      // Creature art is 512x512 (power of two), so mipmaps keep it smooth when shrunk into the grid.
      render: { mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1280, height: 720 },
    })
    game.scene.add('BattleScene', BattleScene)
    game.events.once(Phaser.Core.Events.READY, () => {
      game.canvas.addEventListener('webglcontextlost', () =>
        reportProblem('WebGL context lost. Try again with ?renderer=canvas in the address.'),
      )
    })
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
