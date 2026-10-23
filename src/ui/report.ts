/** Dispatch this to show a problem that doesn't throw, e.g. a lost WebGL context. */
export const REPORT_EVENT = 'exaltia:error'

export function reportProblem(message: string) {
  window.dispatchEvent(new CustomEvent(REPORT_EVENT, { detail: message }))
}
