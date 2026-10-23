import Phaser from 'phaser'
import { useEffect, useRef } from 'react'
import { reportProblem } from '../ui/report'
import { BattleScene, canvasSize, type BattleSceneData, type Orientation } from './BattleScene'

/** `?renderer=canvas` forces the Canvas renderer, to rule out WebGL problems on a device. */
function rendererType() {
  const choice = new URLSearchParams(window.location.search).get('renderer')
  if (choice === 'canvas') return Phaser.CANVAS
  if (choice === 'webgl') return Phaser.WEBGL
  return Phaser.AUTO
}

/**
 * Mounts the Phaser canvas for one battle. The parent remounts it (via `key`) when the orientation flips;
 * `battle.startAt` then fast-forwards to where playback was.
 */
export function PhaserGame({ battle, orientation }: { battle: BattleSceneData; orientation: Orientation }) {
  const containerRef = useRef<HTMLDivElement>(null)
  // The scene reads the latest data when it starts; later prop changes are not needed.
  const battleRef = useRef(battle)

  useEffect(() => {
    const rect = containerRef.current!.getBoundingClientRect()
    const { width, height } = canvasSize(orientation, rect.width / Math.max(1, rect.height))
    const game = new Phaser.Game({
      type: rendererType(),
      parent: containerRef.current!,
      backgroundColor: '#0a0918',
      render: { mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width, height },
    })
    let destroyed = false
    game.events.once(Phaser.Core.Events.READY, () => {
      game.canvas.addEventListener('webglcontextlost', () => reportProblem('WebGL context lost. Try again with ?renderer=canvas in the address.'))
      // Wait for the web fonts so the canvas text uses Cinzel instead of a fallback.
      const fonts = document.fonts
        ? Promise.all([document.fonts.load('bold 20px Cinzel'), document.fonts.load('20px Cinzel'), document.fonts.load('bold 14px "Alegreya Sans"'), document.fonts.load('14px "Alegreya Sans"')]).catch(() => undefined)
        : Promise.resolve()
      void fonts.then(() => {
        if (!destroyed) game.scene.add('BattleScene', BattleScene, true, battleRef.current)
      })
    })
    return () => {
      destroyed = true
      game.destroy(true)
    }
  }, [orientation])

  return <div ref={containerRef} className="absolute inset-0" />
}
