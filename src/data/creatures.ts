import type { CreatureDef, Element, Stats } from '../core/types'

/** Base attributes per role at the start of the journey. Progression and enemy scaling multiply these. */
const ROLE_STATS: Record<string, Stats> = {
  Guardian: { lifeforce: 720, might: 58, resonance: 32, guard: 72, ward: 52, swiftness: 36, essence: 60 },
  Bulwark: { lifeforce: 780, might: 50, resonance: 52, guard: 68, ward: 68, swiftness: 32, essence: 64 },
  Striker: { lifeforce: 580, might: 86, resonance: 36, guard: 46, ward: 40, swiftness: 62, essence: 60 },
  Duelist: { lifeforce: 560, might: 82, resonance: 44, guard: 42, ward: 46, swiftness: 72, essence: 60 },
  Bruiser: { lifeforce: 700, might: 82, resonance: 30, guard: 60, ward: 42, swiftness: 42, essence: 60 },
  Lancer: { lifeforce: 630, might: 82, resonance: 50, guard: 56, ward: 50, swiftness: 52, essence: 64 },
  Disruptor: { lifeforce: 600, might: 74, resonance: 56, guard: 48, ward: 46, swiftness: 66, essence: 64 },
  Caster: { lifeforce: 440, might: 28, resonance: 82, guard: 32, ward: 60, swiftness: 52, essence: 80 },
  Archer: { lifeforce: 500, might: 82, resonance: 38, guard: 34, ward: 40, swiftness: 56, essence: 70 },
  Healer: { lifeforce: 480, might: 26, resonance: 74, guard: 36, ward: 64, swiftness: 48, essence: 80 },
  Support: { lifeforce: 500, might: 28, resonance: 74, guard: 38, ward: 62, swiftness: 56, essence: 80 },
  Enchanter: { lifeforce: 490, might: 28, resonance: 76, guard: 36, ward: 62, swiftness: 60, essence: 80 },
  Controller: { lifeforce: 500, might: 30, resonance: 78, guard: 38, ward: 58, swiftness: 50, essence: 80 },
  Hexer: { lifeforce: 480, might: 30, resonance: 80, guard: 36, ward: 58, swiftness: 52, essence: 80 },
  Purifier: { lifeforce: 500, might: 30, resonance: 78, guard: 38, ward: 64, swiftness: 50, essence: 80 },
}

/** Acolytes are plainer than Paragons. */
const ACOLYTE_SCALE = 0.86

function scaled(stats: Stats, factor: number, tweak: Partial<Stats> = {}): Stats {
  const s = { ...stats }
  for (const key of ['lifeforce', 'might', 'resonance', 'guard', 'ward'] as const) s[key] = Math.round(s[key] * factor)
  return { ...s, ...tweak }
}

const paragon = (
  id: string, name: string, title: string, element: Element, row: 'Front' | 'Back', role: string,
  skills: string[], ascension: string, lore: string, tweak: Partial<Stats> = {},
): CreatureDef => ({
  id, name, title, kind: 'paragon', element, role: `${row} ${role}`, stats: scaled(ROLE_STATS[role], 1, tweak),
  skills, basicAttack: 'basic-attack', ascension, lore,
})

const acolyte = (id: string, name: string, element: Element, role: string, skills: string[], lore: string, tweak: Partial<Stats> = {}): CreatureDef => ({
  id, name, kind: 'acolyte', element, role, stats: scaled(ROLE_STATS[role], ACOLYTE_SCALE, tweak), skills, basicAttack: 'basic-attack', lore,
})

const list: CreatureDef[] = [
  // ── Paragons (core: Signature Skill + Ascension; more skills come from the Skill Tree) ──
  paragon('solvane', 'Solvane', 'the Shining Vow', 'radiance', 'Front', 'Lancer', ['radiant-lance'], 'shining-vow',
    'A unicorn whose mane is woven from first light. Solvane swore to shield the weak and has never broken a vow, not even the one that was taken from it.'),
  paragon('lumion', 'Lumion', 'the First Light', 'radiance', 'Back', 'Purifier', ['purifying-ray'], 'first-light',
    'The light dragon was the first to answer the Oath, and the first to feel it break. Its fire burns away rot, curses and lies alike.'),
  paragon('sirocco', 'Sirocco', 'the Silver Tail', 'wind', 'Front', 'Duelist', ['silver-fang'], 'thousand-tails',
    'A many-tailed fox who duels for the joy of it. Every tail is said to be a victory nobody else remembers.'),
  paragon('lunelle', 'Lunelle', 'the Silken Wind', 'wind', 'Back', 'Enchanter', ['silk-gust'], 'silken-storm',
    'A moth-sylph that spins wind into silk. Where Lunelle passes, allies move as if the sky itself were carrying them.'),
  paragon('fenric', 'Fenric', 'the Storm Howl', 'thunder', 'Front', 'Disruptor', ['storm-bite'], 'storm-howl',
    'The storm wolf of the Stormreach. His howl rolls ahead of every thunderstorm and leaves foes trembling and numb.'),
  paragon('nimbara', 'Nimbara', 'the Sky Tide', 'thunder', 'Back', 'Archer', ['sky-bolt'], 'sky-tide',
    'A manta that swims through storm clouds and looses lightning like arrows. She never misses what she can see, and she sees everything.'),
  paragon('basaltor', 'Basaltor', 'the Ember Wall', 'fire', 'Front', 'Guardian', ['magma-slam'], 'eruption',
    'A ram-lion of magma and obsidian. Basaltor once held the Spire gate alone for three days; the scorch marks are still there.'),
  paragon('pyrelle', 'Pyrelle', 'the Last Flame', 'fire', 'Back', 'Caster', ['flame-burst'], 'last-flame',
    'The phoenix who burns out and rises again. Pyrelle remembers every ending she has survived, and she has survived all of them.'),
  paragon('umbrok', 'Umbrok', 'the Night Warden', 'umbra', 'Front', 'Guardian', ['night-maul'], 'eclipse',
    'A bear woven from the night sky. Umbrok watches over sleepers and strays; his darkness is a shelter, not a threat.'),
  paragon('velune', 'Velune', 'the Starless Tide', 'umbra', 'Back', 'Hexer', ['starless-sting'], 'abyssal-tide',
    'A jellyfish drifting through moonless lakes. Her touch dims the strongest will, and her silence holds the oldest secrets.'),
  paragon('terrak', 'Terrak', 'the Mountain Breaker', 'earth', 'Front', 'Bruiser', ['horn-breaker'], 'mountain-breaker',
    'A rhino of living stone. Terrak charged a mountain once to prove a point. The mountain lost, and so did the point.'),
  paragon('eldwyn', 'Eldwyn', 'the Deep Root', 'earth', 'Back', 'Controller', ['crystal-bloom'], 'deep-root',
    'A stag whose crystal antlers drink from the roots of the world. Eldwyn hears every footstep in the Rootlands.'),
  paragon('pelagon', 'Pelagon', 'the Unbroken Shell', 'water', 'Front', 'Bulwark', ['shell-crash'], 'unbroken-tide',
    'An ancient sea turtle carrying a reef on its back. Pelagon has never retreated, because the tide always returns.'),
  paragon('maressa', 'Maressa', 'the Healing Spring', 'water', 'Back', 'Healer', ['healing-spring'], 'wellspring',
    'A leafy sea dragon born in a spring that cannot run dry. Her waters close wounds and calm storms.'),
  paragon('kyrael', 'Kyrael', 'the Frost Fang', 'ice', 'Front', 'Striker', ['frost-fang'], 'white-death',
    'A snow leopard of living ice. Kyrael hunts in silence; most foes only notice her when the cold reaches their bones.'),
  paragon('nivaris', 'Nivaris', 'the Winter Sage', 'ice', 'Back', 'Support', ['hoarfrost', 'winter-mend'], 'aurora-veil',
    'A four-winged owl who reads the future in frost patterns. Nivaris speaks rarely, and is never wrong when she does.'),

  // ── Starter Acolytes (neutral, from the Spire ruins) ──
  acolyte('spire-golem', 'Spire Golem', 'physical', 'Guardian', ['stone-fist', 'bulwark-stance'],
    'A slate construct that still guards the Spire, long after its masters left. Slow, stubborn and very hard to move.'),
  acolyte('ruin-scout', 'Ruin Scout', 'physical', 'Striker', ['quick-slash', 'ambush'],
    'A ferret who grew up in the rubble and knows every shortcut. Strikes fast, from angles nobody expects.'),
  acolyte('spire-mender', 'Spire Mender', 'physical', 'Healer', ['mend', 'lantern-glow'],
    'A small construct carrying a lantern of white Spire light. It patches up anything, including its friends.'),
  acolyte('relic-archer', 'Relic Archer', 'physical', 'Archer', ['piercing-shot', 'snipe'],
    'A wren with a bow made from Spire relics. It shoots over the front line and rarely misses.'),

  // ── Regional Acolytes ──
  acolyte('dawn-sentinel', 'Dawn Sentinel', 'radiance', 'Guardian', ['sun-spear', 'shield-of-dawn'],
    'An oryx spear-bearer of the Dawnreach temples, sworn to stand in front of others.'),
  acolyte('lumen-wisp', 'Lumen Wisp', 'radiance', 'Healer', ['candlelight', 'warding-glow'],
    'A floating candle-flame spirit that keeps the temple lights burning, and its friends alive.'),
  acolyte('gale-dancer', 'Gale Dancer', 'wind', 'Striker', ['heron-thrust', 'feather-flurry'],
    'A heron fencer from the Galeheights who fights like the wind: elegant, fast, everywhere.'),
  acolyte('zephyr-sprite', 'Zephyr Sprite', 'wind', 'Support', ['breeze-bolt', 'tailwind-puff'],
    'A dandelion wind spirit. It giggles, it drifts, and it makes its allies faster.'),
  acolyte('spark-monk', 'Spark Monk', 'thunder', 'Striker', ['thunder-palm', 'spark-rush'],
    'A lynx monk of the storm temples whose palms crackle with lightning.'),
  acolyte('storm-chanter', 'Storm Chanter', 'thunder', 'Caster', ['bell-bolt', 'thunder-peal'],
    'A raven shaman whose bell staff calls thunder down on whole rows of foes.'),
  acolyte('cinder-knight', 'Cinder Knight', 'fire', 'Guardian', ['flame-blade', 'ember-shield'],
    'A salamander knight of the Cinderforge. Its shield glows hotter the harder it is struck.'),
  acolyte('ember-sage', 'Ember Sage', 'fire', 'Caster', ['fire-bolt', 'kindle'],
    'A red panda scholar of fire. Polite, curious, and frighteningly good at setting things alight.'),
  acolyte('duskblade', 'Duskblade', 'umbra', 'Striker', ['night-fang', 'shadowstep'],
    'A bat assassin of the Nightvale who steps through shadows and drinks a little of every wound.'),
  acolyte('veil-weaver', 'Veil Weaver', 'umbra', 'Hexer', ['shadow-thread', 'veil-of-dread'],
    'A slow loris mystic weaving threads of shadow that sap strength from body and mind.'),
  acolyte('rootbound-sentinel', 'Rootbound Sentinel', 'earth', 'Guardian', ['root-lash', 'bark-skin'],
    'A slender tree warden of the Rootlands. It has stood guard for a hundred years and can stand a hundred more.'),
  acolyte('shardcaller', 'Shardcaller', 'earth', 'Controller', ['crystal-shard', 'shard-storm'],
    'A badger shaman who sings crystals out of the ground and shatters armour with them.'),
  acolyte('tide-lancer', 'Tide Lancer', 'water', 'Striker', ['riptide', 'trident-thrust'],
    'An axolotl warrior of the Tidewild Coast. Its trident hits like a breaking wave.'),
  acolyte('brook-nymph', 'Brook Nymph', 'water', 'Healer', ['spring-water', 'shell-song'],
    'An otter healer who carries spring water in a shell bowl and hums while it works.'),
  acolyte('frostguard', 'Frostguard', 'ice', 'Guardian', ['ice-bash', 'glacier-wall'],
    'A penguin knight with an ice shield. Unimpressed by everything, including fire.'),
  acolyte('rime-mystic', 'Rime Mystic', 'ice', 'Caster', ['frost-bolt', 'hail'],
    'An arctic hare mage who calls hailstorms with a flick of her staff.'),
]

export const CREATURES: Record<string, CreatureDef> = Object.fromEntries(list.map((c) => [c.id, c]))

export const PARAGON_IDS = list.filter((c) => c.kind === 'paragon').map((c) => c.id)
export const STARTER_IDS = ['spire-golem', 'ruin-scout', 'spire-mender', 'relic-archer']
