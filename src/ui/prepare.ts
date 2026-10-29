import type { Lane, Row } from '../core/types'
import { LANE_NAMES } from '../game/duel'

/** The steps before a match. The match itself adds Vow and Formation before every round (see MatchScreen). */
export type PrepStep = 'scout' | 'team'

export interface FlowStep {
  id: string
  label: string
  done: boolean
  /** Steps you may jump to from the step bar. */
  onSelect?: () => void
}

/** The step bar from Scouting to the first fight; `at` is the current step, earlier ones can be revisited. */
export function matchSteps(at: number, select: (index: number) => void): FlowStep[] {
  return ['Scout', 'Team', 'Vow', 'Formation'].map((label, i) => ({
    id: label.toLowerCase(),
    label,
    done: i < at,
    onSelect: i < at ? () => select(i) : undefined,
  }))
}

/** A short buzz on phones that support it (Android), nothing elsewhere. */
export function haptic(ms = 8) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    // Some browsers refuse without a user gesture; a missing buzz is fine.
  }
}

export const cellName = (lane: Lane, row: Row) => `${LANE_NAMES[lane]} ${row === 'front' ? 'Front' : 'Back'}`
