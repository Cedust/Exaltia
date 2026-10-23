import type { Passive, SkillDef, Stats } from '../core/types'

/**
 * Paragon Skill Trees (concept doc "Paragon Progression"): same structure for all, unique content.
 * Core = Signature Skill + Ascension (on the CreatureDef). 3 Paths x 4 Nodes + Capstone.
 * A Node costs 1 Awakening Point, a Capstone 2; Nodes of a Path unlock in order.
 */
export type TreeNode =
  | { kind: 'skill'; skill: string }
  | { kind: 'stat'; stat: keyof Stats; percent: number }
  | { kind: 'passive'; name: string; description: string; passive: Passive }

export interface Capstone {
  name: string
  description: string
  /** Changes applied to the Paragon's Ascension skill. */
  patch: Partial<SkillDef>
}

export interface SkillPath {
  name: string
  theme: string
  nodes: [TreeNode, TreeNode, TreeNode, TreeNode]
  capstone: Capstone
}

export type SkillTree = [SkillPath, SkillPath, SkillPath]

export const NODE_COST = 1
export const CAPSTONE_COST = 2

const skill = (id: string): TreeNode => ({ kind: 'skill', skill: id })
const stat = (key: keyof Stats, percent = 12): TreeNode => ({ kind: 'stat', stat: key, percent })
const passive = (name: string, description: string, p: Passive): TreeNode => ({ kind: 'passive', name, description, passive: p })
const path = (name: string, theme: string, nodes: SkillPath['nodes'], capstone: Capstone): SkillPath => ({ name, theme, nodes, capstone })

const fervor = (name: string, element: string) =>
  passive(name, `+15% damage with ${element} skills.`, { type: 'elementPower', percent: 15 })
const lastStand = (name: string) =>
  passive(name, 'Once per battle, survives a lethal blow with 1 Lifeforce.', { type: 'lastStand' })

export const SKILL_TREES: Record<string, SkillTree> = {
  solvane: [
    path('Lance', 'Damage', [skill('dawnspear-charge'), stat('might'), skill('judgement-strike'), fervor('Dawnfire Edge', 'Radiance')],
      { name: 'Vow Unbroken', description: 'Shining Vow strikes far harder.', patch: { power: 2.9 } }),
    path('Aegis', 'Protection', [skill('vow-of-light'), stat('guard', 15), skill('halo-guard'), passive('Sacred Plate', 'Takes 12% less damage.', { type: 'damageTaken', percent: -12 })],
      { name: 'Bulwark of Dawn', description: 'Shining Vow also grants Solvane Barrier for 3 turns.', patch: { selfStatus: { status: 'barrier', turns: 3 } } }),
    path('Oath', 'Sustain', [skill('mending-light'), stat('lifeforce'), skill('unbroken-oath'), lastStand('Faith Undying')],
      { name: 'Radiant Communion', description: 'Shining Vow heals Solvane for 40% of the damage dealt.', patch: { drain: 0.4 } }),
  ],
  lumion: [
    path('Purge', 'Damage', [skill('sunflare'), stat('resonance'), skill('solar-judgement'), passive('Purge the Hexed', '+30% damage against Hexed foes.', { type: 'bonusVsStatus', status: 'hex', percent: 30 })],
      { name: 'Noon Eternal', description: 'First Light heals much more.', patch: { power: 2.8 } }),
    path('Grace', 'Healing', [skill('radiant-bloom'), stat('ward'), skill('dawnlight'), passive('Gentle Radiance', '+25% healing.', { type: 'healPower', percent: 25 })],
      { name: 'Endless Morning', description: 'First Light also grants Regen for 3 turns.', patch: { inflicts: { status: 'regen', chance: 1, turns: 3 } } }),
    path('Sanctum', 'Protection', [skill('sanctuary'), stat('lifeforce'), skill('rekindled-dawn'), passive('Dawn Shield', 'Starts every battle with Barrier for 2 turns.', { type: 'startStatus', status: 'barrier', turns: 2 })],
      { name: 'Unfading Ward', description: 'First Light grants Barrier for 4 turns.', patch: { inflicts: { status: 'barrier', chance: 1, turns: 4 } } }),
  ],
  sirocco: [
    path('Blade', 'Damage', [skill('tail-whirl'), stat('might'), skill('cyclone-rend'), fervor('Silver Edge', 'Wind')],
      { name: 'Ten Thousand Tails', description: 'Thousand Tails strikes far harder.', patch: { power: 2.7 } }),
    path('Zephyr', 'Speed', [skill('gale-step'), stat('swiftness'), skill('tailwind'), passive('Running Start', 'Starts every battle with Haste for 2 turns.', { type: 'startStatus', status: 'haste', turns: 2 })],
      { name: 'Endless Gale', description: 'Thousand Tails grants Sirocco Haste for 3 turns.', patch: { selfStatus: { status: 'haste', turns: 3 } } }),
    path('Mirage', 'Evasion', [skill('mirage-cut'), stat('guard'), skill('fox-fire-feint'), lastStand('Nine Lives')],
      { name: 'Phantom Fox', description: 'Thousand Tails heals Sirocco for 40% of the damage dealt.', patch: { drain: 0.4 } }),
  ],
  lunelle: [
    path('Gale', 'Damage', [skill('cyclone'), stat('resonance'), skill('shearing-wind'), passive('Tearing Winds', '+25% damage against Sundered foes.', { type: 'bonusVsStatus', status: 'sunder', percent: 25 })],
      { name: 'Eye of the Storm', description: 'Silken Storm strikes far harder.', patch: { power: 2.3 } }),
    path('Silk', 'Enchantment', [skill('swiftwing-dust'), stat('swiftness'), skill('silken-veil'), passive('Lingering Silk', 'Statuses Lunelle applies last 1 turn longer.', { type: 'statusDuration', turns: 1 })],
      { name: 'Silken Cocoon', description: 'Silken Storm grants Lunelle Barrier for 3 turns.', patch: { selfStatus: { status: 'barrier', turns: 3 } } }),
    path('Moonmoth', 'Healing', [skill('moonpollen'), stat('lifeforce'), skill('cocoon'), passive('Moonlit Wings', '+20% healing.', { type: 'healPower', percent: 20 })],
      { name: 'Night Bloom', description: 'Silken Storm heals Lunelle for 30% of the damage dealt.', patch: { drain: 0.3 } }),
  ],
  fenric: [
    path('Fang', 'Damage', [skill('lightning-lunge'), stat('might'), skill('voltaic-maul'), fervor('Storm Fury', 'Thunder')],
      { name: 'World-Ending Howl', description: 'Storm Howl strikes far harder.', patch: { power: 2.4 } }),
    path('Tempest', 'Disruption', [skill('thunderclap'), stat('swiftness'), skill('static-field'), passive('Lingering Static', 'Statuses Fenric applies last 1 turn longer.', { type: 'statusDuration', turns: 1 })],
      { name: 'Endless Storm', description: 'Storm Howl Shocks for 3 turns.', patch: { inflicts: { status: 'shock', chance: 1, turns: 3 } } }),
    path('Pack', 'Leadership', [skill('howl-of-the-pack'), stat('lifeforce'), skill('stormhide'), lastStand('Alpha')],
      { name: 'Thunderhide', description: 'Storm Howl grants Fenric Barrier for 3 turns.', patch: { selfStatus: { status: 'barrier', turns: 3 } } }),
  ],
  nimbara: [
    path('Deadeye', 'Damage', [skill('stormpiercer'), stat('might'), skill('arc-volley'), fervor('Charged Quills', 'Thunder')],
      { name: 'Skyfall', description: 'Sky Tide strikes far harder.', patch: { power: 2.8 } }),
    path('Overcast', 'Disruption', [skill('chain-lightning'), stat('resonance'), skill('thunderhead'), passive('Static Tide', '+30% damage against Shocked foes.', { type: 'bonusVsStatus', status: 'shock', percent: 30 })],
      { name: 'Living Storm', description: 'Sky Tide Shocks every foe for 2 turns.', patch: { inflicts: { status: 'shock', chance: 1, turns: 2 } } }),
    path('Glide', 'Evasion', [skill('updraft'), stat('swiftness'), skill('cloud-veil'), passive('High Currents', 'Starts every battle with Haste for 2 turns.', { type: 'startStatus', status: 'haste', turns: 2 })],
      { name: 'Eye in the Clouds', description: 'Sky Tide ignores Guard.', patch: { piercesDefense: true } }),
  ],
  basaltor: [
    path('Magma', 'Damage', [skill('searing-sweep'), stat('might'), skill('molten-fist'), passive('Smouldering Fists', '+25% damage against Burning foes.', { type: 'bonusVsStatus', status: 'burn', percent: 25 })],
      { name: 'Cataclysm', description: 'Eruption strikes far harder.', patch: { power: 2.6 } }),
    path('Bastion', 'Protection', [skill('ember-wall'), stat('guard', 15), skill('obsidian-skin'), passive('Obsidian Hide', 'Takes 12% less damage.', { type: 'damageTaken', percent: -12 })],
      { name: 'Living Fortress', description: 'Eruption makes Basaltor Taunt for 3 turns.', patch: { selfStatus: { status: 'taunt', turns: 3 } } }),
    path('Hearth', 'Sustain', [skill('ember-renewal'), stat('lifeforce'), skill('hearthglow'), lastStand('Unquenchable')],
      { name: 'Heart of the Forge', description: 'Eruption heals Basaltor for 40% of the damage dealt.', patch: { drain: 0.4 } }),
  ],
  pyrelle: [
    path('Inferno', 'Damage', [skill('fire-rain'), stat('resonance'), skill('searing-lance'), passive('Kindling', '+25% damage against Burning foes.', { type: 'bonusVsStatus', status: 'burn', percent: 25 })],
      { name: 'Wardless Flame', description: 'Last Flame ignores Ward.', patch: { piercesDefense: true } }),
    path('Rebirth', 'Sustain', [skill('warm-embers'), stat('lifeforce'), skill('rekindle'), lastStand('Rise from Ashes')],
      { name: 'Phoenix Dawn', description: 'Last Flame heals Pyrelle for 50% of the damage dealt.', patch: { drain: 0.5 } }),
    path('Cinder', 'Control', [skill('ignite'), passive('Lingering Flames', 'Statuses Pyrelle applies last 1 turn longer.', { type: 'statusDuration', turns: 1 }), skill('scorch'), passive('Ember Feed', '+5 Essence every turn.', { type: 'essenceRegen', amount: 5 })],
      { name: 'Ashen Sky', description: 'Last Flame sets every foe Burning.', patch: { inflicts: { status: 'burn', chance: 1, turns: 3 } } }),
  ],
  umbrok: [
    path('Eclipse', 'Damage', [skill('moonfall'), stat('might'), skill('devouring-dark'), fervor('Nightfall', 'Umbra')],
      { name: 'Total Eclipse', description: 'Eclipse strikes far harder.', patch: { power: 2.4 } }),
    path('Warden', 'Protection', [skill('night-warden'), stat('guard', 15), skill('starless-hide'), passive('Night Sky Hide', 'Takes 12% less damage.', { type: 'damageTaken', percent: -12 })],
      { name: 'Eternal Watch', description: 'Eclipse grants Umbrok Taunt for 3 turns.', patch: { selfStatus: { status: 'taunt', turns: 3 } } }),
    path('Dream', 'Sustain', [skill('crushing-gloom'), stat('lifeforce'), skill('moonlit-rest'), lastStand('Sleepless')],
      { name: 'Devouring Night', description: 'Eclipse heals Umbrok for 40% of the damage dealt.', patch: { drain: 0.4 } }),
  ],
  velune: [
    path('Abyss', 'Damage', [skill('void-pulse'), stat('resonance'), skill('night-terror'), fervor('Starless Depths', 'Umbra')],
      { name: 'Drowned Stars', description: 'Abyssal Tide strikes far harder.', patch: { power: 2.3 } }),
    path('Hex', 'Curses', [skill('dread-tendrils'), passive('Long Shadows', 'Statuses Velune applies last 1 turn longer.', { type: 'statusDuration', turns: 1 }), skill('ink-cloud'), passive('Dread Feast', '+25% damage against Hexed foes.', { type: 'bonusVsStatus', status: 'hex', percent: 25 })],
      { name: 'Endless Night', description: 'Abyssal Tide also Chills every foe.', patch: { inflicts: { status: 'chill', chance: 1, turns: 2 }, power: 1.8 } }),
    path('Tide', 'Sustain', [skill('siphon-soul'), stat('lifeforce'), skill('tidal-shroud'), passive('Deep Calm', '+5 Essence every turn.', { type: 'essenceRegen', amount: 5 })],
      { name: 'Undertow', description: 'Abyssal Tide heals Velune for 40% of the damage dealt.', patch: { drain: 0.4 } }),
  ],
  terrak: [
    path('Breaker', 'Damage', [skill('rampage'), stat('might'), skill('avalanche-charge'), fervor('Landslide', 'Earth')],
      { name: 'Continental Drift', description: 'Mountain Breaker strikes far harder.', patch: { power: 2.9 } }),
    path('Quake', 'Control', [skill('earthshatter'), stat('guard'), skill('tremor-stomp'), passive('Fault Lines', '+25% damage against Sundered foes.', { type: 'bonusVsStatus', status: 'sunder', percent: 25 })],
      { name: 'Shattered Earth', description: 'Mountain Breaker Sunders every foe.', patch: { inflicts: { status: 'sunder', chance: 1, turns: 3 } } }),
    path('Bedrock', 'Sustain', [skill('stoneplate'), stat('lifeforce'), skill('bedrock-rest'), lastStand('Immovable')],
      { name: 'Heart of the Mountain', description: 'Mountain Breaker heals Terrak for 35% of the damage dealt.', patch: { drain: 0.35 } }),
  ],
  eldwyn: [
    path('Crystal', 'Damage', [skill('thornfield'), stat('resonance'), skill('geode-burst'), fervor('Resonant Antlers', 'Earth')],
      { name: 'Geode Heart', description: 'Deep Root strikes far harder.', patch: { power: 2.2 } }),
    path('Root', 'Control', [skill('binding-roots'), passive('Ancient Grip', 'Statuses Eldwyn applies last 1 turn longer.', { type: 'statusDuration', turns: 1 }), skill('shatter-sigil'), passive('Crystal Fracture', '+25% damage against Sundered foes.', { type: 'bonusVsStatus', status: 'sunder', percent: 25 })],
      { name: 'World Roots', description: 'Deep Root also Sunders every foe.', patch: { inflicts: { status: 'sunder', chance: 1, turns: 3 } } }),
    path('Grove', 'Healing', [skill('heartwood'), stat('lifeforce'), skill('verdant-pulse'), passive('Evergreen', '+20% healing.', { type: 'healPower', percent: 20 })],
      { name: 'Grove Eternal', description: 'Deep Root heals Eldwyn for 40% of the damage dealt.', patch: { drain: 0.4 } }),
  ],
  pelagon: [
    path('Breaker', 'Damage', [skill('tidal-ram'), stat('might'), skill('maelstrom'), fervor('Rising Tide', 'Water')],
      { name: 'Flood Tide', description: 'Unbroken Tide heals far more.', patch: { power: 2.4 } }),
    path('Shell', 'Protection', [skill('unbroken-shell'), stat('guard', 15), skill('coral-ward'), passive('Reef Armour', 'Takes 12% less damage.', { type: 'damageTaken', percent: -12 })],
      { name: 'Living Reef', description: 'Unbroken Tide grants Barrier for 4 turns.', patch: { inflicts: { status: 'barrier', chance: 1, turns: 4 } } }),
    path('Current', 'Sustain', [skill('tidepool'), stat('lifeforce'), skill('deep-current'), lastStand('Ten Thousand Tides')],
      { name: 'Eternal Current', description: 'Unbroken Tide grants Regen instead, for 4 turns.', patch: { inflicts: { status: 'regen', chance: 1, turns: 4 } } }),
  ],
  maressa: [
    path('Spring', 'Healing', [skill('rainfall'), stat('resonance'), skill('lifebloom'), passive('Overflowing Spring', '+25% healing.', { type: 'healPower', percent: 25 })],
      { name: 'Endless Spring', description: 'Wellspring heals far more.', patch: { power: 3 } }),
    path('Tide', 'Damage', [skill('tide-lash'), stat('might'), skill('torrent'), fervor('Riptide Song', 'Water')],
      { name: 'Healing Flood', description: 'Wellspring also grants Barrier for 2 turns.', patch: { inflicts: { status: 'barrier', chance: 1, turns: 2 } } }),
    path('Return', 'Revival', [skill('springs-return'), stat('ward'), skill('sea-veil'), passive('Deep Wellspring', '+5 Essence every turn.', { type: 'essenceRegen', amount: 5 })],
      { name: 'Tide of Life', description: 'Wellspring grants Regen for 5 turns.', patch: { inflicts: { status: 'regen', chance: 1, turns: 5 } } }),
  ],
  kyrael: [
    path('Fang', 'Damage', [skill('glacial-pounce'), stat('might'), skill('shatterclaw'), fervor('Killing Cold', 'Ice')],
      { name: 'Absolute Zero', description: 'White Death strikes far harder.', patch: { power: 2.9 } }),
    path('Hunt', 'Control', [skill('frostbite-maul'), stat('swiftness'), skill('rending-claws'), passive('Patient Hunter', '+25% damage against Chilled foes.', { type: 'bonusVsStatus', status: 'chill', percent: 25 })],
      { name: 'Winter Hunt', description: 'White Death always Chills, for 3 turns.', patch: { inflicts: { status: 'chill', chance: 1, turns: 3 } } }),
    path('Snow', 'Evasion', [skill('snowveil'), stat('lifeforce'), skill('pack-ice'), lastStand('Ninth Winter')],
      { name: 'Frozen Heart', description: 'White Death heals Kyrael for 40% of the damage dealt.', patch: { drain: 0.4 } }),
  ],
  nivaris: [
    path('Blizzard', 'Damage', [skill('blizzard'), stat('resonance'), skill('icicle-lance'), fervor('Winter Wisdom', 'Ice')],
      { name: 'Polar Night', description: 'Aurora Veil strikes far harder.', patch: { power: 2.1 } }),
    path('Ward', 'Protection', [skill('frost-ward'), stat('ward'), skill('sages-insight'), passive('Foresight', 'Starts every battle with Barrier for 2 turns.', { type: 'startStatus', status: 'barrier', turns: 2 })],
      { name: 'Aurora Shield', description: 'Aurora Veil grants Nivaris Barrier for 3 turns.', patch: { selfStatus: { status: 'barrier', turns: 3 } } }),
    path('Frost', 'Control', [skill('deep-freeze'), passive('Long Winter', 'Statuses Nivaris applies last 1 turn longer.', { type: 'statusDuration', turns: 1 }), passive('Frozen Insight', '+5 Essence every turn.', { type: 'essenceRegen', amount: 5 }), passive('Cold Clarity', '+25% healing.', { type: 'healPower', percent: 25 })],
      { name: 'Eternal Winter', description: 'Aurora Veil Chills for 3 turns and heals Nivaris for 30% of the damage.', patch: { inflicts: { status: 'chill', chance: 1, turns: 3 }, drain: 0.3 } }),
  ],
}

export const nodeId = (paragon: string, path: number, node: number) => `${paragon}.${path}.${node}`
export const capstoneId = (paragon: string, path: number) => `${paragon}.${path}.cap`
