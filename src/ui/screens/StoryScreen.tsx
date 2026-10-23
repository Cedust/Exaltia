import { useEffect, useState } from 'react'
import { CONTENT } from '../../data'
import { CHARACTER_NAMES, type StoryLine } from '../../data/story'
import { fill } from '../GameContext'
import { Ambience } from '../kit'
import { artUrl, characterUrl } from '../styles'

function speakerArt(speaker: string): { url: string; creature: boolean } | null {
  if (speaker === 'narrator') return null
  if (speaker === 'player') return { url: characterUrl('sigilbearer'), creature: false }
  if (CHARACTER_NAMES[speaker]) return { url: characterUrl(speaker), creature: false }
  if (CONTENT.creatures[speaker]) return { url: artUrl(speaker), creature: true }
  return null
}

function speakerName(speaker: string, vars: Record<string, string>) {
  if (speaker === 'player') return vars.name ?? 'You'
  return CHARACTER_NAMES[speaker] ?? CONTENT.creatures[speaker]?.name ?? ''
}

/** Light visual-novel style story moment. Tap to advance; the typewriter finishes on the first tap. */
export function StoryScreen({
  lines,
  backdrop,
  title,
  vars,
  onDone,
}: {
  lines: StoryLine[]
  backdrop: string
  title?: string
  vars: Record<string, string>
  onDone: () => void
}) {
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(0)
  const [showTitle, setShowTitle] = useState(!!title)
  const line = lines[index]
  const text = fill(line.text, vars)
  const typing = shown < text.length

  useEffect(() => {
    if (showTitle) {
      const timer = setTimeout(() => setShowTitle(false), 2200)
      return () => clearTimeout(timer)
    }
    if (!typing) return
    const timer = setTimeout(() => setShown((s) => Math.min(text.length, s + 2)), 18)
    return () => clearTimeout(timer)
  }, [shown, typing, text.length, showTitle])

  const advance = () => {
    if (showTitle) return setShowTitle(false)
    if (typing) return setShown(text.length)
    if (index + 1 >= lines.length) return onDone()
    setIndex(index + 1)
    setShown(0)
  }

  const art = speakerArt(line.speaker)
  const name = speakerName(line.speaker, vars)
  const narrator = line.speaker === 'narrator'

  return (
    <div className="relative flex h-full select-none flex-col overflow-hidden" onClick={advance}>
      <Ambience backdrop={backdrop} dim={0.35} motes={12} />
      <button
        type="button"
        className="btn-ghost absolute right-3 top-3 z-20 !px-3 !py-1.5 !text-[0.65rem]"
        onClick={(e) => {
          e.stopPropagation()
          onDone()
        }}
      >
        Skip ›
      </button>

      {showTitle && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
          <h2 className="rise-in title-display px-6 text-center text-2xl sm:text-4xl">{title}</h2>
        </div>
      )}

      {/* Portrait */}
      <div className="relative flex min-h-0 flex-1 items-end justify-center">
        {art && !showTitle && (
          <img
            key={line.speaker}
            src={art.url}
            alt={name}
            className={`fade-in pointer-events-none max-h-full object-contain creature-shadow ${art.creature ? 'mb-8 w-[min(80vw,520px)]' : 'h-[min(78vh,760px)]'}`}
          />
        )}
      </div>

      {/* Dialogue box */}
      {!showTitle && (
        <div className="relative z-10 mx-auto w-full max-w-3xl px-3 pb-4 safe-bottom">
          <div className={`ornate fade-in min-h-36 px-5 pb-5 pt-6 ${narrator ? 'text-center' : ''}`} key={index}>
            {!narrator && (
              <div className="absolute -top-4 left-5 rounded border border-gold/60 bg-night px-3 py-1 font-display text-sm tracking-[0.16em] text-gold-bright shadow-lg">
                {name}
              </div>
            )}
            <p className={`${narrator ? 'lore text-xl text-ivory/90' : 'text-[1.08rem] leading-relaxed'}`}>
              {text.slice(0, shown)}
              <span className="opacity-0">{text.slice(shown)}</span>
            </p>
            <span className={`absolute bottom-2 right-4 text-gold ${typing ? 'opacity-0' : 'pulse-glow'}`}>▼</span>
          </div>
        </div>
      )}
    </div>
  )
}

export function NameScreen({ onDone }: { onDone: (name: string) => void }) {
  const [name, setName] = useState('')
  const clean = name.trim().slice(0, 16)
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
      <Ambience backdrop="spire" dim={0.5} />
      <img src={characterUrl('sigilbearer')} alt="" className="fade-in mb-2 h-[38vh] object-contain creature-shadow" />
      <p className="label-caps mb-2">The mark on your hand glows</p>
      <h2 className="title-display mb-5 text-2xl">What is your name?</h2>
      <form
        className="flex w-full max-w-xs flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (clean) onDone(clean)
        }}
      >
        <input className="field text-center text-lg" autoFocus maxLength={16} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        <button type="submit" className="btn-oath" disabled={!clean}>
          This is my name
        </button>
      </form>
    </div>
  )
}
