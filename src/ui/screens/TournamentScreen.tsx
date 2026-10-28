import { CONTENT } from '../../data'
import { REGION_BY_ID } from '../../data/world'
import { battleRules } from '../../game/battles'
import { tournamentStage, tournamentWon } from '../../game/campaign'
import type { SaveState } from '../../game/save'
import { useGame } from '../GameContext'
import { Ambience, CreatureArt, Divider, ElementLabel, ScreenHeader } from '../kit'

/** The bracket of one region's Tournament: two matches, then the Paragons themselves. */
export function TournamentScreen({ regionId, onBack, onPrepare }: { regionId: string; onBack: () => void; onPrepare: (encounterId: string) => void }) {
  const { save } = useGame()
  const region = REGION_BY_ID[regionId]
  const stage = tournamentStage(save, regionId)
  const won = tournamentWon(save, regionId)
  const [front, back] = region.paragons

  return (
    <div className="relative min-h-full pb-10">
      <Ambience backdrop={regionId} dim={0.45} />
      <ScreenHeader title={region.tournament.name} subtitle={`${region.name} Tournament`} onBack={onBack} />
      <div className="mx-auto max-w-xl px-4 pt-4">
        <div className="flex justify-center">
          <ElementLabel element={region.element} />
        </div>
        <div className="relative mt-2 flex items-end justify-center gap-2">
          <CreatureArt creature={CONTENT.creatures[front]} className="float h-36 w-1/2 max-w-56" />
          <CreatureArt creature={CONTENT.creatures[back]} className="float h-36 w-1/2 max-w-56 [animation-delay:-2.5s]" />
        </div>
        <p className="lore mt-2 text-center text-lg text-mist">
          {won
            ? `You have won this Tournament. ${CONTENT.creatures[save.tournaments[regionId]!.chosen!].name} swore the Oath here.`
            : `Win both matches, and ${CONTENT.creatures[front].name} and ${CONTENT.creatures[back].name} will descend to test you themselves.`}
        </p>

        <div className="mt-5">
          <Divider>The Bracket</Divider>
        </div>
        <ol className="mt-4 space-y-3">
          {region.tournament.matches.map((match, i) => {
            const done = i < stage
            const current = i === stage && !won
            const rules = battleRules(save, match)
            const final = match.kind === 'final'
            return (
              <li key={match.id}>
                <div
                  className={`${current ? 'ornate' : 'ornate-soft'} flex items-center gap-3 p-3 ${!done && !current ? 'opacity-55' : ''} ${final ? 'border-gold/60' : ''}`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-display ${done ? 'border-gold bg-gold/20 text-gold-bright' : 'border-gold/40 text-gold'}`}>
                    {done ? '✓' : final ? '♛' : i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="label-caps !text-[0.6rem]">{match.name}</div>
                    <div className="truncate font-display text-base tracking-wide text-ivory">{match.opponent}</div>
                    <div className="text-xs text-mist">
                      {rules.teamSize}v{rules.teamSize}
                      {final ? ' · Boss battle' : ''}
                    </div>
                  </div>
                  <div className="flex -space-x-3">
                    {match.members.slice(0, rules.teamSize).map((m, j) => (
                      <CreatureArt key={j} creature={CONTENT.creatures[m.creature]} flip className="h-11 w-11" halo={false} />
                    ))}
                  </div>
                </div>
                {current && (
                  <div className="mt-2 flex flex-col items-center gap-2 fade-in">
                    <p className="text-center text-sm text-mist">{match.description}</p>
                    <button type="button" className="btn-oath w-full max-w-xs" onClick={() => onPrepare(match.id)}>
                      {final ? 'Face the Paragons' : 'Prepare for battle'}
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
        <TeamSizeNote save={save} />
      </div>
    </div>
  )
}

function TeamSizeNote({ save }: { save: SaveState }) {
  const paragons = Object.keys(save.creatures).filter((id) => CONTENT.creatures[id].kind === 'paragon').length
  if (paragons > 0) return null
  return (
    <p className="mt-6 text-center text-xs text-mist">
      Tip: Challenges in each region recruit new Acolytes. A larger roster gives you more answers to each puzzle.
    </p>
  )
}
