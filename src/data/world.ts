import type { Element, Position, StatusId, Tactic } from '../core/types'
import { CREATURES } from './creatures'

/** Where a creature stands in an enemy team, in priority order (teams are trimmed to the battle's team size). */
export interface EnemySpec {
  creature: string
  position: Position
  /** Boss rules: big Lifeforce bar and a second phase below 50%. */
  boss?: boolean
  /** Hand-written Tactics; otherwise the auto plan is used. */
  tactics?: Tactic[]
}

export type Modifier =
  | { type: 'teamSize'; size: number }
  | { type: 'onlyAcolytes' }
  | { type: 'bannedElement'; element: Element }
  | { type: 'enemyStartStatus'; status: StatusId; turns: number }

export type EncounterKind = 'trial' | 'match' | 'final' | 'challenge' | 'duel' | 'finale' | 'rematch'

export interface Encounter {
  id: string
  kind: EncounterKind
  name: string
  /** Who you fight, shown on the Scouting card. */
  opponent: string
  description: string
  members: EnemySpec[]
  modifiers?: Modifier[]
  /** Backdrop key in public/art/backdrops. */
  backdrop: string
}

export interface Location {
  name: string
  /** Position on the world map in percent (0-100). */
  x: number
  y: number
}

export interface Region {
  id: string
  element: Element
  name: string
  landscape: string
  /** Paragons of this region: [Front, Back]. */
  paragons: [string, string]
  acolytes: [string, string]
  /** Label position on the map in percent. */
  x: number
  y: number
  tournament: Location & { matches: Encounter[] }
  challengeSite: Location & { challenges: Encounter[] }
}

const F = (lane: 0 | 1 | 2): Position => ({ lane, row: 'front' })
const B = (lane: 0 | 1 | 2): Position => ({ lane, row: 'back' })
const spec = (creature: string, position: Position): EnemySpec => ({ creature, position })

interface RegionInput {
  id: string
  element: Element
  name: string
  landscape: string
  paragons: [string, string]
  acolytes: [string, string]
  x: number
  y: number
  tournament: Location
  challengeSite: Location
  matches: { name: string; opponent: string; description: string; members: EnemySpec[] }[]
  challenges: { name: string; description: string; members: EnemySpec[]; modifiers: Modifier[] }[]
}

function region(input: RegionInput): Region {
  const [front, back] = input.paragons
  const [acolyteFront, acolyteBack] = input.acolytes
  return {
    id: input.id,
    element: input.element,
    name: input.name,
    landscape: input.landscape,
    paragons: input.paragons,
    acolytes: input.acolytes,
    x: input.x,
    y: input.y,
    tournament: {
      ...input.tournament,
      matches: [
        ...input.matches.map((m, i) => ({ id: `${input.id}-m${i + 1}`, kind: 'match' as const, backdrop: input.id, ...m })),
        {
          id: `${input.id}-final`,
          kind: 'final',
          name: 'The Final',
          opponent: 'The Paragons',
          description: 'The two Paragons of the region descend to test you themselves. Defeat both, and one will swear the Oath.',
          backdrop: input.id,
          members: [
            { creature: front, position: F(1), boss: true },
            { creature: back, position: B(1), boss: true },
            spec(acolyteFront, F(0)),
            spec(acolyteBack, B(2)),
          ],
        },
      ],
    },
    challengeSite: {
      ...input.challengeSite,
      challenges: input.challenges.map((c, i) => ({
        id: `${input.id}-c${i + 1}`,
        kind: 'challenge' as const,
        opponent: CREATURES[i === 0 ? acolyteFront : acolyteBack].name,
        backdrop: input.id,
        ...c,
      })),
    },
  }
}

/** Ring clockwise from the north. Opposing elements face each other across the Spire. */
export const REGIONS: Region[] = [
  region({
    id: 'radiance', element: 'radiance', name: 'The Dawnreach', x: 52, y: 6,
    landscape: 'A plateau of white marble, sunlit meadows and the ruins of ancient temples.',
    paragons: ['solvane', 'lumion'], acolytes: ['dawn-sentinel', 'lumen-wisp'],
    tournament: { name: 'Aurelion Lists', x: 50, y: 10 },
    challengeSite: { name: 'Lumen Sanctum', x: 59, y: 16 },
    matches: [
      { name: 'Round of Dawn', opponent: 'Squire Aldric', description: 'A young squire with more courage than sense. His Dawn Sentinel shields a gentle Lumen Wisp.',
        members: [spec('dawn-sentinel', F(1)), spec('lumen-wisp', B(1)), spec('gale-dancer', F(0)), spec('zephyr-sprite', B(2))] },
      { name: 'Semifinal', opponent: 'The Gilded Choir', description: 'Temple singers whose wards turn blows aside. Break their barriers or outlast them.',
        members: [spec('dawn-sentinel', F(1)), spec('rime-mystic', B(2)), spec('lumen-wisp', B(0)), spec('frostguard', F(2))] },
    ],
    challenges: [
      { name: 'Trial of the Spear', description: 'A Dawn Sentinel will only follow those who win without a Paragon at their side.',
        members: [spec('dawn-sentinel', F(1)), spec('lumen-wisp', B(1)), spec('dawn-sentinel', F(0))], modifiers: [{ type: 'onlyAcolytes' }] },
      { name: 'Trial of the Candle', description: 'The Lumen Wisps hide behind wards of light. Can you break through?',
        members: [spec('lumen-wisp', B(1)), spec('dawn-sentinel', F(1)), spec('lumen-wisp', B(0))], modifiers: [{ type: 'enemyStartStatus', status: 'barrier', turns: 3 }] },
    ],
  }),
  region({
    id: 'wind', element: 'wind', name: 'The Galeheights', x: 77, y: 15,
    landscape: 'A windswept grass steppe that rises into floating islands.',
    paragons: ['sirocco', 'lunelle'], acolytes: ['gale-dancer', 'zephyr-sprite'],
    tournament: { name: 'Whisperpeak', x: 82, y: 9 },
    challengeSite: { name: 'Silkveil Gardens', x: 69, y: 23 },
    matches: [
      { name: 'Round of Winds', opponent: 'The Kite-Runners', description: 'Two siblings who fly kites between the islands. Fast, chaotic, hard to pin down.',
        members: [spec('gale-dancer', F(1)), spec('zephyr-sprite', B(1)), spec('spark-monk', F(2)), spec('lumen-wisp', B(0))] },
      { name: 'Semifinal', opponent: "Mistress Vela's Featherguard", description: 'A fencing master and her pupils. Expect Haste and blades from every side.',
        members: [spec('gale-dancer', F(0)), spec('zephyr-sprite', B(1)), spec('gale-dancer', F(2)), spec('storm-chanter', B(0))] },
    ],
    challenges: [
      { name: 'Duel of Feathers', description: 'A Gale Dancer challenges you to a true duel: one creature each.',
        members: [spec('gale-dancer', F(1))], modifiers: [{ type: 'teamSize', size: 1 }] },
      { name: 'Chase the Dandelion', description: 'The Zephyr Sprites are already fast. Today the wind is on their side.',
        members: [spec('zephyr-sprite', B(1)), spec('gale-dancer', F(1)), spec('zephyr-sprite', B(2))], modifiers: [{ type: 'enemyStartStatus', status: 'haste', turns: 4 }] },
    ],
  }),
  region({
    id: 'thunder', element: 'thunder', name: 'The Stormreach', x: 85, y: 33,
    landscape: 'Jagged cliffs under an eternal thunderstorm, crowned with lightning towers.',
    paragons: ['fenric', 'nimbara'], acolytes: ['spark-monk', 'storm-chanter'],
    tournament: { name: 'Howling Ridge', x: 88, y: 29 },
    challengeSite: { name: 'Nimbus Harbor', x: 92, y: 44 },
    matches: [
      { name: 'Round of Storms', opponent: 'The Thunderbell Brothers', description: 'Bell-ringers of the storm temples. One rushes in, the other calls lightning on the rows.',
        members: [spec('spark-monk', F(1)), spec('storm-chanter', B(1)), spec('gale-dancer', F(0)), spec('ember-sage', B(2))] },
      { name: 'Semifinal', opponent: "Captain Brannoc's Stormcrew", description: 'Sky-sailors from Nimbus Harbor. Their Shock leaves your creatures twitching in place.',
        members: [spec('spark-monk', F(0)), spec('storm-chanter', B(1)), spec('cinder-knight', F(2)), spec('zephyr-sprite', B(2))] },
    ],
    challenges: [
      { name: 'Lightning Without Water', description: 'The Spark Monks fight with no Water creatures against them. Find another way.',
        members: [spec('spark-monk', F(1)), spec('storm-chanter', B(1)), spec('spark-monk', F(2))], modifiers: [{ type: 'bannedElement', element: 'water' }] },
      { name: 'The Bell Tolls Once', description: 'A Storm Chanter accepts a single opponent. Whoever stands last wins.',
        members: [spec('storm-chanter', B(1))], modifiers: [{ type: 'teamSize', size: 1 }] },
    ],
  }),
  region({
    id: 'fire', element: 'fire', name: 'The Emberlands', x: 82, y: 57,
    landscape: 'Volcanic country of lava rivers and ash plains.',
    paragons: ['basaltor', 'pyrelle'], acolytes: ['cinder-knight', 'ember-sage'],
    tournament: { name: 'Cinderforge', x: 84, y: 50 },
    challengeSite: { name: 'Phoenix Rest', x: 72, y: 65 },
    matches: [
      { name: 'Round of Embers', opponent: 'Forgehand Tilda', description: 'A smith who tests her blades on her opponents. Her Cinder Knight hits like a hammer.',
        members: [spec('cinder-knight', F(1)), spec('ember-sage', B(1)), spec('duskblade', F(0)), spec('spark-monk', F(2))] },
      { name: 'Semifinal', opponent: 'The Ashen Twins', description: 'Two fire scholars who set everything ablaze. Burn will eat you alive if you dawdle.',
        members: [spec('cinder-knight', F(1)), spec('ember-sage', B(0)), spec('ember-sage', B(2)), spec('veil-weaver', B(1))] },
    ],
    challenges: [
      { name: 'Trial Without Frost', description: 'Prove you can face fire without leaning on Ice.',
        members: [spec('cinder-knight', F(1)), spec('ember-sage', B(1)), spec('cinder-knight', F(0))], modifiers: [{ type: 'bannedElement', element: 'ice' }] },
      { name: 'Ash and Apprentices', description: 'Ember Sages only respect those who win with Acolytes alone.',
        members: [spec('ember-sage', B(1)), spec('cinder-knight', F(1)), spec('ember-sage', B(2))], modifiers: [{ type: 'onlyAcolytes' }] },
    ],
  }),
  region({
    id: 'umbra', element: 'umbra', name: 'The Nightvale', x: 52, y: 80,
    landscape: 'A valley in eternal twilight with moon lakes and star-lit forests.',
    paragons: ['umbrok', 'velune'], acolytes: ['duskblade', 'veil-weaver'],
    tournament: { name: 'Moonhollow', x: 50, y: 72 },
    challengeSite: { name: 'Mirror Mere', x: 59, y: 63 },
    matches: [
      { name: 'Round of Dusk', opponent: 'Lanternless Mira', description: 'A wanderer who sees in the dark. Her Duskblade drinks from every wound.',
        members: [spec('duskblade', F(1)), spec('veil-weaver', B(1)), spec('cinder-knight', F(0)), spec('shardcaller', B(2))] },
      { name: 'Semifinal', opponent: 'The Moonless Court', description: 'Nobles of the night. Their Hex saps your strength while blades find your back row.',
        members: [spec('duskblade', F(0)), spec('veil-weaver', B(1)), spec('duskblade', F(2)), spec('rootbound-sentinel', F(1))] },
    ],
    challenges: [
      { name: 'Blade in the Dark', description: 'A Duskblade waits alone by the lake. One against one.',
        members: [spec('duskblade', F(1))], modifiers: [{ type: 'teamSize', size: 1 }] },
      { name: 'Night Without Dawn', description: 'No Radiance may enter the Mirror Mere tonight.',
        members: [spec('veil-weaver', B(1)), spec('duskblade', F(1)), spec('veil-weaver', B(0))], modifiers: [{ type: 'bannedElement', element: 'radiance' }] },
    ],
  }),
  region({
    id: 'earth', element: 'earth', name: 'The Rootlands', x: 25, y: 66,
    landscape: 'Ancient forests and table mountains veined with crystal.',
    paragons: ['terrak', 'eldwyn'], acolytes: ['rootbound-sentinel', 'shardcaller'],
    tournament: { name: "Breaker's Mesa", x: 31, y: 58 },
    challengeSite: { name: 'Eldergrove', x: 19, y: 69 },
    matches: [
      { name: 'Round of Roots', opponent: 'Warden Oskar', description: 'An old forest warden. His Rootbound Sentinel does not move, and does not need to.',
        members: [spec('rootbound-sentinel', F(1)), spec('shardcaller', B(1)), spec('duskblade', F(2)), spec('brook-nymph', B(0))] },
      { name: 'Semifinal', opponent: 'The Mesa Breakers', description: 'Miners who sing to crystals. They Sunder your armour, then break through it.',
        members: [spec('rootbound-sentinel', F(0)), spec('shardcaller', B(1)), spec('tide-lancer', F(1)), spec('rootbound-sentinel', F(2))] },
    ],
    challenges: [
      { name: 'Rootbound Oath', description: 'The tree wardens test the patience of Acolytes, not the might of Paragons.',
        members: [spec('rootbound-sentinel', F(1)), spec('shardcaller', B(1)), spec('rootbound-sentinel', F(0))], modifiers: [{ type: 'onlyAcolytes' }] },
      { name: 'Grove Without Wind', description: 'No Wind creature may disturb the Eldergrove.',
        members: [spec('shardcaller', B(1)), spec('rootbound-sentinel', F(1)), spec('shardcaller', B(2))], modifiers: [{ type: 'bannedElement', element: 'wind' }] },
    ],
  }),
  region({
    id: 'water', element: 'water', name: 'The Tidewild Coast', x: 11, y: 30,
    landscape: 'Lagoons, coral reefs and tide caves.',
    paragons: ['pelagon', 'maressa'], acolytes: ['tide-lancer', 'brook-nymph'],
    tournament: { name: 'Shellback Atoll', x: 15, y: 34 },
    challengeSite: { name: 'Springveil Lagoon', x: 9, y: 46 },
    matches: [
      { name: 'Round of Tides', opponent: 'Coral-Diver Nami', description: 'A pearl diver with a Tide Lancer that hits like a breaking wave.',
        members: [spec('tide-lancer', F(1)), spec('brook-nymph', B(1)), spec('rootbound-sentinel', F(0)), spec('rime-mystic', B(2))] },
      { name: 'Semifinal', opponent: 'The Lagoon Keepers', description: 'Healers of the lagoon. If you cannot out-damage their healing, you will not win.',
        members: [spec('tide-lancer', F(1)), spec('brook-nymph', B(1)), spec('frostguard', F(2)), spec('brook-nymph', B(0))] },
    ],
    challenges: [
      { name: 'Calm Before the Storm', description: 'No Thunder may be used against the Tide Lancers.',
        members: [spec('tide-lancer', F(1)), spec('brook-nymph', B(1)), spec('tide-lancer', F(2))], modifiers: [{ type: 'bannedElement', element: 'thunder' }] },
      { name: 'The Otter Duel', description: 'A Brook Nymph challenges you to a 1v1. It heals. A lot.',
        members: [spec('brook-nymph', B(1))], modifiers: [{ type: 'teamSize', size: 1 }] },
    ],
  }),
  region({
    id: 'ice', element: 'ice', name: 'The Frostmere', x: 24, y: 10,
    landscape: 'A frozen sea, glaciers and the northern lights.',
    paragons: ['kyrael', 'nivaris'], acolytes: ['frostguard', 'rime-mystic'],
    tournament: { name: 'Fangridge', x: 29, y: 13 },
    challengeSite: { name: 'Whitesage Watch', x: 17, y: 21 },
    matches: [
      { name: 'Round of Frost', opponent: 'Huntress Sigrun', description: 'A glacier hunter. Her Frostguard holds the line while hail falls from behind.',
        members: [spec('frostguard', F(1)), spec('rime-mystic', B(1)), spec('tide-lancer', F(0)), spec('lumen-wisp', B(2))] },
      { name: 'Semifinal', opponent: 'The Whitesage Acolytes', description: 'Students of the Winter Sage. Their Chill slows you until you can barely act.',
        members: [spec('frostguard', F(0)), spec('rime-mystic', B(0)), spec('dawn-sentinel', F(2)), spec('rime-mystic', B(2))] },
    ],
    challenges: [
      { name: 'Penguin Standoff', description: 'A Frostguard plants its shield in the snow: one against one.',
        members: [spec('frostguard', F(1))], modifiers: [{ type: 'teamSize', size: 1 }] },
      { name: 'Winter Without Fire', description: 'No Fire creature may melt the Whitesage Watch.',
        members: [spec('rime-mystic', B(1)), spec('frostguard', F(1)), spec('rime-mystic', B(0))], modifiers: [{ type: 'bannedElement', element: 'fire' }] },
    ],
  }),
]

export const REGION_BY_ID: Record<string, Region> = Object.fromEntries(REGIONS.map((r) => [r.id, r]))

/** Ring neighbours (clockwise order above). */
export function neighbours(regionId: string): [string, string] {
  const i = REGIONS.findIndex((r) => r.id === regionId)
  const n = REGIONS.length
  return [REGIONS[(i + n - 1) % n].id, REGIONS[(i + 1) % n].id]
}

export const SPIRE = { name: 'The Shattered Spire', x: 50, y: 37 }

/** Prologue: Hesper's training constructs in the Spire ruins. */
export const FIRST_TRIAL: Encounter = {
  id: 'first-trial',
  kind: 'trial',
  name: 'The First Trial',
  opponent: "Hesper's Constructs",
  description: 'Two old training constructs of the Spire. They hit softly, but they will not go easy on a plan that makes no sense.',
  backdrop: 'spire',
  members: [
    { creature: 'spire-golem', position: F(1), tactics: [{ condition: { type: 'always' }, skill: 'stone-fist', target: 'sameLane' }] },
    { creature: 'relic-archer', position: B(1), tactics: [{ condition: { type: 'always' }, skill: 'piercing-shot', target: 'lowestLifeforce' }] },
  ],
}

export function findEncounter(id: string): Encounter | undefined {
  if (id === FIRST_TRIAL.id) return FIRST_TRIAL
  for (const r of REGIONS) {
    const found = r.tournament.matches.find((m) => m.id === id) ?? r.challengeSite.challenges.find((c) => c.id === id)
    if (found) return found
  }
  return undefined
}
