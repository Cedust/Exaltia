import { Component, useEffect, useState, type ReactNode } from 'react'

import { REPORT_EVENT } from './report'

const describe = (value: unknown) =>
  value instanceof Error ? `${value.message}\n${value.stack ?? ''}` : String(value)

function ErrorPanel({ messages }: { messages: string[] }) {
  return (
    <div className="fixed inset-x-2 top-2 z-50 max-h-[50vh] overflow-auto rounded border border-red-400 bg-red-950/95 p-3 font-mono text-xs text-red-100">
      <p className="mb-1 font-sans text-sm font-semibold">Something went wrong (please send a screenshot)</p>
      <p className="mb-2 font-sans">{navigator.userAgent}</p>
      {messages.map((m, i) => (
        <pre key={i} className="whitespace-pre-wrap">
          {m}
        </pre>
      ))}
    </div>
  )
}

/** Shows uncaught errors on screen, so problems on phones can be reported without dev tools. */
export function ErrorOverlay() {
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    const add = (message: string) => setMessages((list) => [...list.slice(-4), message])
    const onError = (e: ErrorEvent) => add(describe(e.error ?? e.message))
    const onRejection = (e: PromiseRejectionEvent) => add(describe(e.reason))
    const onReport = (e: Event) => add(String((e as CustomEvent).detail))
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    window.addEventListener(REPORT_EVENT, onReport)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      window.removeEventListener(REPORT_EVENT, onReport)
    }
  }, [])

  return messages.length ? <ErrorPanel messages={messages} /> : null
}

/** Keeps a render crash visible instead of leaving an empty (black) page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  render() {
    return this.state.error ? <ErrorPanel messages={[describe(this.state.error)]} /> : this.props.children
  }
}
