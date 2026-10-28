import { createContext, useContext } from 'react'
import type { SaveState } from '../game/save'

export interface GameApi {
  save: SaveState
  update: (change: (save: SaveState) => SaveState) => void
}

export const GameContext = createContext<GameApi | null>(null)

export function useGame(): GameApi {
  const api = useContext(GameContext)
  if (!api) throw new Error('useGame outside of a running game')
  return api
}

export const fill = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`)
