import { CONTENT } from '../../data'
import { REGION_INTROS } from '../../data/story'
import { REGION_BY_ID } from '../../data/world'
import { bestOfFor, describeModifier } from '../../game/battles'
import { CHALLENGE_VOWS } from '../../game/rules'
import { VOW_BY_ID } from '../../game/vows'
import { regionOpen, tournamentStage, tournamentWon } from '../../game/campaign'
import { actOf, type SaveState } from '../../game/save'
import { CreatureArt, Divider, ElementLabel, Sheet } from '../kit'
import { characterUrl } from '../styles'

export function RegionSheet({
  save,
  regionId,
  onClose,
  onTournament,
  onChallenge,
  onRematch,
}: {
  save: SaveState
  regionId: string
  onClose: () => void
  onTournament: () => void
  onChallenge: (id: string) => void
  onRematch: () => void
}) {
  const region = REGION_BY_ID[regionId]
  const open = regionOpen(save, regionId)
  const won = tournamentWon(save, regionId)
  const stage = tournamentStage(save, regionId)
  const chosen = save.tournaments[regionId]?.chosen
  const postgame = actOf(save) === 'act4'
  const missing = region.paragons.find((p) => !save.creatures[p])

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <ElementLabel element={region.element} />
          <h2 className="title-display mt-1 text-2xl">{region.name}</h2>
          <p className="lore mt-1 text-base text-mist">{region.landscape}</p>
        </div>
        <button type="button" className="btn-icon shrink-0" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      {open && (
        <div className="mt-3 flex items-start gap-2">
          <img src={characterUrl('tessa')} alt="Tessa" className="h-14 w-14 shrink-0 rounded-full border border-gold/50 bg-ink object-cover object-top" />
          <div className="ornate-soft relative flex-1 px-3 py-2 text-sm leading-snug">
            {REGION_INTROS[regionId].map((l, i) => (
              <p key={i} className={i > 0 ? 'mt-1 text-mist' : ''}>
                {l.text}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        {region.paragons.map((id) => {
          const creature = CONTENT.creatures[id]
          const mine = !!save.creatures[id]
          const chained = save.cassian.includes(id) && !mine
          return (
            <div key={id} className="ornate-soft flex flex-col items-center p-2 text-center">
              <CreatureArt creature={creature} className="h-24 w-full" />
              <span className="font-display text-sm text-gold-bright">{creature.name}</span>
              <span className="text-[0.7rem] text-mist">{creature.role}</span>
              <span className={`mt-1 text-[0.65rem] uppercase tracking-widest ${mine ? 'text-gold' : chained ? 'text-red-300' : 'text-mist/70'}`}>
                {mine ? (id === chosen ? 'Sworn to you' : 'Freed & sworn') : chained ? 'Chained by Cassian' : 'Awaits a worthy Oath'}
              </span>
            </div>
          )
        })}
      </div>

      {!open ? (
        <p className="mt-5 text-center text-sm text-mist">
          The roads to {region.name} are still sealed. Win a Tournament in a neighbouring region to open them.
        </p>
      ) : (
        <>
          <div className="mt-5">
            <Divider>Tournament</Divider>
          </div>
          <button type="button" onClick={onTournament} className="ornate-soft mt-3 flex w-full items-center gap-3 p-3 text-left transition hover:border-gold/60">
            <div className="flex-1">
              <div className="font-display text-base tracking-wider text-gold-bright">{region.tournament.name}</div>
              <div className="text-xs text-mist">{won ? 'Won. The Paragons remember you.' : `Three matches. The winner faces both Paragons.`}</div>
              <div className="mt-2 flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`h-1.5 w-8 rounded-full ${i < stage ? 'bg-gold' : 'bg-white/15'}`} />
                ))}
              </div>
            </div>
            <span className={won ? 'btn-ghost' : 'btn-oath !px-4 !py-2 !text-xs'}>{won ? 'View' : stage > 0 ? 'Continue' : 'Enter'}</span>
          </button>

          {postgame && won && missing && (
            <button type="button" onClick={onRematch} className="ornate mt-3 flex w-full items-center gap-3 p-3 text-left">
              <CreatureArt creature={CONTENT.creatures[missing]} className="h-14 w-14 shrink-0" />
              <div className="flex-1">
                <div className="font-display text-sm tracking-wider text-gold-bright">Rematch · Act IV</div>
                <div className="text-xs text-mist">Win at full strength and {CONTENT.creatures[missing].name} swears the Oath too.</div>
              </div>
              <span className="btn-oath !px-3 !py-2 !text-xs">Fight</span>
            </button>
          )}

          <div className="mt-5">
            <Divider>{region.challengeSite.name} · Challenges</Divider>
          </div>
          <div className="mt-3 space-y-2">
            {region.challengeSite.challenges.map((challenge, i) => {
              const done = save.challenges.includes(challenge.id)
              const recruit = CONTENT.creatures[region.acolytes[i]]
              return (
                <button
                  key={challenge.id}
                  type="button"
                  onClick={() => onChallenge(challenge.id)}
                  className="ornate-soft flex w-full items-center gap-3 p-2.5 text-left transition hover:border-gold/60"
                >
                  <CreatureArt creature={recruit} className="h-14 w-14 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-sm tracking-wide text-gold-bright">{challenge.name}</div>
                    <div className="text-xs leading-snug text-mist">{challenge.description}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(challenge.modifiers ?? []).map((m, j) => (
                        <span key={j} className="rounded-sm border border-gold/30 bg-black/30 px-1.5 text-[0.65rem] uppercase tracking-wider text-gold">
                          {describeModifier(m)}
                        </span>
                      ))}
                      <span className={`rounded-sm px-1.5 text-[0.65rem] uppercase tracking-wider ${done ? 'bg-gold/20 text-gold-bright' : 'bg-white/5 text-ivory/80'}`}>
                        {done ? '✓ Won · replay for XP' : `Reward: ${recruit.name} · Vow: ${VOW_BY_ID[CHALLENGE_VOWS[challenge.id]].name}`}
                      </span>
                      <span className="rounded-sm bg-white/5 px-1.5 text-[0.65rem] uppercase tracking-wider text-ivory/80">Bo{bestOfFor(challenge)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </Sheet>
  )
}
