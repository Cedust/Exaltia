import type { ReactNode } from 'react'
import { useState } from 'react'
import { elementName } from '../../core/log'
import { STATUS_IDS, STATUS_RULES } from '../../core/statuses'
import type { Element } from '../../core/types'
import { OATH_MEMORIES } from '../../data/story'
import { ACT_NAMES } from '../../game/rules'
import { actOf, tournamentsWon } from '../../game/save'
import { useGame } from '../GameContext'
import { VOWS } from '../../game/vows'
import { ElementGem, ShardIcon, Sigil } from '../kit'
import { ELEMENT_HEX, RARITY_STYLE, characterUrl } from '../styles'

/** Layout width, screen width and pixel ratio, for checking how a device renders the game. */
const viewportInfo = () =>
  `view ${window.innerWidth}×${window.innerHeight} · screen ${window.screen.width}×${window.screen.height} · dpr ${window.devicePixelRatio.toFixed(2)}` +
  ` · ${/Mobile/.test(navigator.userAgent) ? 'mobile' : 'desktop'} UA`

export type HubTab = 'map' | 'collection' | 'journal' | 'menu'

const TABS: { id: HubTab; label: string }[] = [
  { id: 'map', label: 'World' },
  { id: 'collection', label: 'Creatures' },
  { id: 'journal', label: 'Journal' },
  { id: 'menu', label: 'Menu' },
]

/** Line icons for the tab bar, drawn in the current text colour. */
function TabIcon({ tab, active }: { tab: HubTab; active: boolean }) {
  const fill = active ? 'currentColor' : 'none'
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {tab === 'map' && (
        <>
          <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20Z" fill={active ? 'currentColor' : 'none'} fillOpacity={0.18} />
          <path d="M9 4v13.5M15 6.5V20" />
        </>
      )}
      {tab === 'collection' && (
        <>
          <path d="M12 2.5 14.6 9 21 12l-6.4 3L12 21.5 9.4 15 3 12l6.4-3Z" fill={fill} fillOpacity={0.25} />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </>
      )}
      {tab === 'journal' && (
        <>
          <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5Z" fill={fill} fillOpacity={0.18} />
          <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3M9 7.5h6M9 11h4" />
        </>
      )}
      {tab === 'menu' && (
        <>
          <circle cx="12" cy="12" r="3" fill={fill} fillOpacity={0.3} />
          <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
        </>
      )}
    </svg>
  )
}

/** The frame around the map, collection and journal: a HUD on top and thumb-friendly tabs below. */
export function Hub({ tab, onTab, children }: { tab: HubTab; onTab: (tab: HubTab) => void; children: ReactNode }) {
  const { save } = useGame()
  const act = actOf(save)
  const title = save.tournamentOrder.length > 0 ? 'Sigilbearer' : 'Unsworn'
  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="safe-top relative z-20 flex items-center gap-3 border-b border-gold/25 bg-night/85 px-4 pb-3 backdrop-blur-md">
        <Sigil size={44} glow={false} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg font-bold tracking-[0.1em] text-gold-bright">{save.name}</div>
          <div className="truncate text-sm text-mist">
            {title} · {ACT_NAMES[act]}
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-gold/35 bg-black/40 px-3.5 py-2 font-display text-lg text-gold-bright" title="Oath Shards">
          <ShardIcon className="!h-5 !w-5" /> {save.shards}
        </div>
      </header>
      <main className="relative flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      {/* A native-style tab bar: big icons with a pill behind the active one, labels in the sans face. */}
      <nav className="relative z-20 grid grid-cols-4 border-t border-gold/20 bg-[#0d0b20]/95 px-1 pt-2 backdrop-blur-md safe-bottom">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[4.25rem] flex-col items-center justify-start gap-1 transition-colors ${active ? 'text-gold-bright' : 'text-mist'}`}
            >
              <span className={`flex h-9 w-16 items-center justify-center rounded-full transition-colors ${active ? 'bg-gold/20 shadow-[0_0_16px_rgba(230,196,122,0.25)]' : ''}`}>
                <TabIcon tab={t.id} active={active} />
              </span>
              <span className={`text-sm leading-none ${active ? 'font-bold' : 'font-medium'}`}>{t.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

const ELEMENT_PAIRS: [Element, Element][] = [
  ['fire', 'ice'],
  ['thunder', 'water'],
  ['earth', 'wind'],
  ['radiance', 'umbra'],
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ornate-soft bleed p-4">
      <h2 className="font-display text-base tracking-[0.15em] text-gold-bright">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}

/** Memories, rules and the element wheel, all in one scroll. */
export function JournalView() {
  const { save } = useGame()
  const memories = Math.min(tournamentsWon(save), OATH_MEMORIES.length)
  return (
    <div className="mx-auto max-w-2xl space-y-3 px-3 pb-6 pt-3">
      <Section title="Oath Memories">
        {memories === 0 ? (
          <p className="lore text-base text-mist">Every Paragon who swears the Oath shares a memory of the night the Spire broke. You have none yet.</p>
        ) : (
          <ol className="space-y-3">
            {OATH_MEMORIES.slice(0, memories).map((m, i) => (
              <li key={i} className="lore text-base leading-snug text-ivory/90">
                <span className="mr-2 font-display text-xs text-gold">{i + 1}.</span>
                {m}
              </li>
            ))}
            {memories < OATH_MEMORIES.length && <li className="text-sm text-mist">{OATH_MEMORIES.length - memories} memories remain hidden.</li>}
          </ol>
        )}
      </Section>

      <Section title={`Vows · ${save.vows.length} / ${VOWS.length}`}>
        <p className="text-sm text-mist">Vows you know can appear in your offers between rounds. The First Trial and every Challenge teach new ones.</p>
        <div className="mt-2 space-y-1.5">
          {VOWS.map((v) =>
            save.vows.includes(v.id) ? (
              <div key={v.id} className="text-sm">
                <span className={`font-bold ${RARITY_STYLE[v.rarity].color}`}>{v.name}</span>
                <span className="text-mist"> · {v.text}</span>
              </div>
            ) : (
              <div key={v.id} className="text-sm text-mist/50">
                ??? · {RARITY_STYLE[v.rarity].label}
              </div>
            ),
          )}
        </div>
      </Section>

      <Section title="Elements">
        <p className="text-sm text-mist">Every element has an opposite. A skill against a creature of its opposite element is Weak: +50% damage. Physical has no opposite.</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {ELEMENT_PAIRS.map(([a, b]) => (
            <div key={a} className="flex items-center justify-center gap-2 rounded border border-white/10 bg-black/25 py-1.5 text-sm">
              <ElementGem element={a} />
              <span style={{ color: ELEMENT_HEX[a] }}>{elementName(a)}</span>
              <span className="text-mist">⇄</span>
              <span style={{ color: ELEMENT_HEX[b] }}>{elementName(b)}</span>
              <ElementGem element={b} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Status Effects">
        <div className="grid gap-1.5 sm:grid-cols-2">
          {STATUS_IDS.map((id) => (
            <div key={id} className="text-sm">
              <span className={`font-bold ${STATUS_RULES[id].kind === 'buff' ? 'text-emerald-300' : 'text-rose-300'}`}>{STATUS_RULES[id].name}</span>
              <span className="text-mist"> · {STATUS_RULES[id].description}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="How battles work">
        <ul className="space-y-1.5 text-sm leading-snug text-ivory/85">
          <li>✦ Every battle is a <b>match</b> of short auto rounds: best of 5 in Tournaments, best of 3 or 1 in Challenges and duels.</li>
          <li>✦ Before each round the opponent swears a <b>Vow</b> and shows it. Then you pick one of 3 (4 after a lost round). Vows last until the match ends.</li>
          <li>✦ Your team is locked for the match, but you may move creatures to any cell of the grid before every round. The opponent re-forms only after it loses a round.</li>
          <li>✦ The field has three <b>Lanes</b> (Top, Middle, Bottom) with a Front and a Back cell on each side.</li>
          <li>✦ Your creatures act on their own, by their role: healers heal, guardians protect, attackers follow the <b>Lane Rule</b>.</li>
          <li>✦ <b>Swiftness</b> decides the Turn Order. Faster creatures act more often.</li>
          <li>✦ Skills cost <b>Essence</b>, which refills a little every turn.</li>
          <li>✦ A Front creature protects the Back creature <b>in its own Lane</b>. A Back creature with no Front ally in its Lane stands open.</li>
          <li>✦ <b>Lane Rule</b>: attacks go to their own Lane first, else the nearest one, Front before Back. Taunt overrides it.</li>
          <li>✦ <b>Reach</b>: Single hits one target, Snipe reaches the Back Row and aims there first, Pierce hits a whole Lane, Sweep a whole Row.</li>
          <li>✦ Paragons fill a golden <b>Ascension</b> gauge and unleash their strongest skill on their own.</li>
          <li>✦ After 50 turns the <b>Sigils Surge</b>: damage rises and healing fades, so every battle ends.</li>
          <li>✦ Bosses blaze their Sigil at half Lifeforce and fight fiercer. Tournament champions start the match with a <b>Boss Vow</b>.</li>
        </ul>
      </Section>

      <Section title="Growing stronger">
        <ul className="space-y-1.5 text-sm leading-snug text-ivory/85">
          <li>✦ <b>Awakening 1–10</b>: Paragons gain XP in every battle. Each level gives an Awakening Point for the Skill Tree.</li>
          <li>✦ <b>Mastery ★1–5</b>: every skill grows stronger the more it is used.</li>
          <li>✦ <b>Oath Rank I–V</b>: spend Oath Shards on a Paragon for steady growth and a perk at every rank.</li>
          <li>✦ <b>Acolytes</b> grow with every Tournament you win. Challenges recruit new ones.</li>
          <li>✦ <b>New Vows</b>: the First Trial and the first win of every Challenge teach a Vow for your offers.</li>
        </ul>
      </Section>
    </div>
  )
}

const SPEEDS = [1, 2, 4]

export function MenuView({ onReplayScene, onQuit, onDelete }: { onReplayScene: () => void; onQuit: () => void; onDelete: () => void }) {
  const { save, update } = useGame()
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="mx-auto max-w-md space-y-3 px-3 pb-6 pt-3">
      <Section title="Journey">
        <div className="grid grid-cols-2 gap-2 text-sm text-mist">
          <span>Battles fought</span>
          <span className="text-right text-ivory">{save.stats.battles}</span>
          <span>Victories</span>
          <span className="text-right text-ivory">{save.stats.wins}</span>
          <span>Tournaments won</span>
          <span className="text-right text-ivory">{tournamentsWon(save)} / 8</span>
          <span>Creatures</span>
          <span className="text-right text-ivory">{Object.keys(save.creatures).length} / 36</span>
        </div>
      </Section>
      <Section title="Battle speed">
        <div className="flex overflow-hidden rounded-full border border-gold/40">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update((x) => ({ ...x, speed: s }))}
              className={`flex-1 py-2.5 font-display text-base ${s === save.speed ? 'bg-gold/25 text-gold-bright' : 'text-mist'}`}
            >
              {s}×
            </button>
          ))}
        </div>
      </Section>
      <Section title="Companions">
        <div className="flex justify-around">
          {['tessa', 'hesper', 'cassian'].map((id) => (
            <div key={id} className="flex flex-col items-center">
              <img src={characterUrl(id)} alt={id} className="h-20 w-16 rounded border border-gold/30 bg-ink object-cover object-top" />
              <span className="mt-1 font-display text-sm capitalize text-ivory">{id}</span>
            </div>
          ))}
        </div>
        <button type="button" className="btn-ghost mt-3 w-full" onClick={onReplayScene}>
          Replay the last story scene
        </button>
      </Section>
      <button type="button" className="btn-ghost w-full" onClick={onQuit}>
        Back to title
      </button>
      {!confirm ? (
        <button type="button" className="w-full py-3 text-sm text-rose-300/80 underline-offset-2 hover:underline" onClick={() => setConfirm(true)}>
          Delete this journey
        </button>
      ) : (
        <div className="ornate-soft p-3 text-center">
          <p className="text-sm text-mist">Delete your journey for good? This cannot be undone.</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setConfirm(false)}>
              Keep it
            </button>
            <button type="button" className="btn-oath flex-1 !px-3" onClick={onDelete}>
              Delete
            </button>
          </div>
        </div>
      )}
      <p className="pt-2 text-center text-xs leading-relaxed text-mist/70">
        Exaltia: Paragons of the Oath · MVP v0.1
        <br />
        Design by Timo · built with Claude · art generated with ChatGPT
        <br />
        <span className="font-mono">{viewportInfo()}</span>
      </p>
    </div>
  )
}

