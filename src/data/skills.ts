import type { Element, SkillDef, StatusId, TargetPattern } from '../core/types'

type Extra = Partial<Omit<SkillDef, 'id' | 'name' | 'element' | 'effect' | 'stat' | 'power' | 'cost' | 'pattern'>>

/** Damage skill scaling with Might (physical style) or Resonance (elemental style). */
const hit = (id: string, name: string, element: Element, stat: 'might' | 'resonance', power: number, cost: number, pattern: TargetPattern = 'single', extra: Extra = {}): SkillDef => ({
  id, name, element, effect: 'damage', stat, power, cost, pattern, ...extra,
})
const might = (id: string, name: string, element: Element, power: number, cost: number, pattern: TargetPattern = 'single', extra: Extra = {}) =>
  hit(id, name, element, 'might', power, cost, pattern, extra)
const res = (id: string, name: string, element: Element, power: number, cost: number, pattern: TargetPattern = 'single', extra: Extra = {}) =>
  hit(id, name, element, 'resonance', power, cost, pattern, extra)
const heal = (id: string, name: string, element: Element, power: number, cost: number, pattern: TargetPattern = 'single', extra: Extra = {}): SkillDef => ({
  id, name, element, effect: 'heal', stat: 'resonance', power, cost, pattern, ...extra,
})
const buff = (id: string, name: string, element: Element, status: StatusId, turns: number, cost: number, pattern: TargetPattern = 'single', extra: Extra = {}): SkillDef => ({
  id, name, element, effect: 'buff', stat: 'resonance', power: 0, cost, pattern, inflicts: { status, chance: 1, turns }, ...extra,
})
const self = (id: string, name: string, element: Element, status: StatusId, turns: number, cost: number, extra: Extra = {}) =>
  buff(id, name, element, status, turns, cost, 'single', { selfOnly: true, ...extra })
const inflict = (status: StatusId, chance: number, turns: number) => ({ inflicts: { status, chance, turns } })

const list: SkillDef[] = [
  might('basic-attack', 'Basic Attack', 'physical', 1, 0),

  // ── Starter Acolytes ──
  might('stone-fist', 'Stone Fist', 'physical', 1.3, 10),
  self('bulwark-stance', 'Bulwark Stance', 'physical', 'taunt', 3, 20, { selfStatus: { status: 'barrier', turns: 2 } }),
  might('quick-slash', 'Quick Slash', 'physical', 1.25, 8),
  might('ambush', 'Ambush', 'physical', 1.35, 18, 'single', { ignoresProtection: true }),
  heal('mend', 'Mend', 'physical', 1.8, 10),
  heal('lantern-glow', 'Lantern Glow', 'physical', 1, 25, 'all'),
  might('piercing-shot', 'Piercing Shot', 'physical', 1, 15, 'pierce'),
  might('snipe', 'Snipe', 'physical', 1.2, 18, 'single', { ignoresProtection: true }),

  // ── Regional Acolytes ──
  might('sun-spear', 'Sun Spear', 'radiance', 1.2, 10),
  self('shield-of-dawn', 'Shield of Dawn', 'radiance', 'taunt', 3, 20, { selfStatus: { status: 'barrier', turns: 2 } }),
  heal('candlelight', 'Candlelight', 'radiance', 1.7, 10),
  buff('warding-glow', 'Warding Glow', 'radiance', 'barrier', 2, 15),
  might('heron-thrust', 'Heron Thrust', 'wind', 1.3, 10),
  might('feather-flurry', 'Feather Flurry', 'wind', 0.8, 20, 'sweep'),
  res('breeze-bolt', 'Breeze Bolt', 'wind', 1.1, 10, 'single', { ignoresProtection: true }),
  buff('tailwind-puff', 'Tailwind Puff', 'wind', 'haste', 3, 15),
  might('thunder-palm', 'Thunder Palm', 'thunder', 1.3, 10, 'single', inflict('shock', 0.2, 2)),
  might('spark-rush', 'Spark Rush', 'thunder', 0.9, 20, 'pierce'),
  res('bell-bolt', 'Bell Bolt', 'thunder', 1.3, 12),
  res('thunder-peal', 'Thunder Peal', 'thunder', 0.7, 22, 'sweep', inflict('shock', 0.4, 2)),
  might('flame-blade', 'Flame Blade', 'fire', 1.2, 10),
  self('ember-shield', 'Ember Shield', 'fire', 'taunt', 3, 18, { selfStatus: { status: 'barrier', turns: 2 } }),
  res('fire-bolt', 'Fire Bolt', 'fire', 1.3, 12),
  res('kindle', 'Kindle', 'fire', 0.6, 12, 'single', { ignoresProtection: true, ...inflict('burn', 1, 3) }),
  might('night-fang', 'Night Fang', 'umbra', 1.25, 10, 'single', { drain: 0.3 }),
  might('shadowstep', 'Shadowstep', 'umbra', 1.2, 20, 'single', { ignoresProtection: true }),
  res('shadow-thread', 'Shadow Thread', 'umbra', 1.1, 10, 'single', inflict('hex', 0.5, 2)),
  res('veil-of-dread', 'Veil of Dread', 'umbra', 0.6, 25, 'all', inflict('hex', 0.4, 2)),
  might('root-lash', 'Root Lash', 'earth', 1.2, 10),
  self('bark-skin', 'Bark Skin', 'earth', 'taunt', 3, 20, { selfStatus: { status: 'barrier', turns: 2 } }),
  res('crystal-shard', 'Crystal Shard', 'earth', 1.2, 12, 'single', inflict('sunder', 0.4, 2)),
  res('shard-storm', 'Shard Storm', 'earth', 0.7, 22, 'sweep'),
  might('trident-thrust', 'Trident Thrust', 'water', 1, 15, 'pierce'),
  might('riptide', 'Riptide', 'water', 1.4, 14),
  heal('spring-water', 'Spring Water', 'water', 1.5, 12, 'single', inflict('regen', 1, 2)),
  heal('shell-song', 'Shell Song', 'water', 0.8, 25, 'all'),
  might('ice-bash', 'Ice Bash', 'ice', 1.2, 10, 'single', inflict('chill', 0.3, 2)),
  self('glacier-wall', 'Glacier Wall', 'ice', 'taunt', 3, 18, { selfStatus: { status: 'barrier', turns: 2 } }),
  res('frost-bolt', 'Frost Bolt', 'ice', 1.3, 12),
  res('hail', 'Hail', 'ice', 0.8, 20, 'sweep', inflict('chill', 0.3, 2)),

  // ── Paragons: Radiance ──
  // Solvane, the Shining Vow
  might('radiant-lance', 'Radiant Lance', 'radiance', 1.3, 15, 'pierce'),
  might('shining-vow', 'Shining Vow', 'radiance', 2.1, 0, 'all'),
  might('dawnspear-charge', 'Dawnspear Charge', 'radiance', 1.8, 25, 'single', { ignoresProtection: true }),
  might('judgement-strike', 'Judgement Strike', 'radiance', 1.5, 20, 'single', { bonusVsStatus: { status: 'hex', percent: 40 } }),
  buff('vow-of-light', 'Vow of Light', 'radiance', 'barrier', 2, 18),
  buff('halo-guard', 'Halo Guard', 'radiance', 'barrier', 2, 32, 'all'),
  heal('mending-light', 'Mending Light', 'radiance', 1.6, 15),
  self('unbroken-oath', 'Unbroken Oath', 'radiance', 'taunt', 3, 20, { selfStatus: { status: 'regen', turns: 3 } }),
  // Lumion, the First Light
  res('purifying-ray', 'Purifying Ray', 'radiance', 1.3, 12),
  heal('first-light', 'First Light', 'radiance', 2, 0, 'all', inflict('barrier', 1, 2)),
  res('sunflare', 'Sunflare', 'radiance', 0.9, 22, 'sweep'),
  res('solar-judgement', 'Solar Judgement', 'radiance', 1.7, 24, 'single', { bonusVsStatus: { status: 'hex', percent: 40 } }),
  heal('dawnlight', 'Dawnlight', 'radiance', 0.9, 25, 'all'),
  heal('radiant-bloom', 'Radiant Bloom', 'radiance', 2.1, 18, 'single', inflict('regen', 1, 3)),
  buff('sanctuary', 'Sanctuary', 'radiance', 'barrier', 2, 30, 'all'),
  heal('rekindled-dawn', 'Rekindled Dawn', 'radiance', 0.35, 40, 'single', { revive: true }),

  // ── Paragons: Wind ──
  // Sirocco, the Silver Tail
  might('silver-fang', 'Silver Fang', 'wind', 1.4, 12),
  might('thousand-tails', 'Thousand Tails', 'wind', 1.9, 0, 'all'),
  might('tail-whirl', 'Tail Whirl', 'wind', 0.9, 20, 'sweep'),
  might('cyclone-rend', 'Cyclone Rend', 'wind', 1.9, 26, 'single', { bonusVsStatus: { status: 'sunder', percent: 30 } }),
  self('gale-step', 'Gale Step', 'wind', 'haste', 3, 14),
  buff('tailwind', 'Tailwind', 'wind', 'haste', 2, 30, 'all'),
  might('mirage-cut', 'Mirage Cut', 'wind', 1.25, 20, 'single', { ignoresProtection: true }),
  might('fox-fire-feint', 'Foxfire Feint', 'wind', 1, 14, 'single', { drain: 0.5 }),
  // Lunelle, the Silken Wind
  res('silk-gust', 'Silk Gust', 'wind', 1.2, 12, 'single', { ignoresProtection: true }),
  res('silken-storm', 'Silken Storm', 'wind', 1.6, 0, 'all', inflict('sunder', 1, 2)),
  res('cyclone', 'Cyclone', 'wind', 0.85, 28, 'all'),
  res('shearing-wind', 'Shearing Wind', 'wind', 1, 18, 'pierce', inflict('sunder', 0.6, 2)),
  buff('swiftwing-dust', 'Swiftwing Dust', 'wind', 'haste', 3, 15),
  buff('silken-veil', 'Silken Veil', 'wind', 'barrier', 2, 15),
  heal('moonpollen', 'Moonpollen', 'wind', 0.8, 25, 'all', inflict('regen', 1, 2)),
  heal('cocoon', 'Cocoon', 'wind', 1.8, 16, 'single', inflict('barrier', 1, 1)),

  // ── Paragons: Thunder ──
  // Fenric, the Storm Howl
  might('storm-bite', 'Storm Bite', 'thunder', 1.3, 12, 'single', inflict('shock', 0.3, 2)),
  might('storm-howl', 'Storm Howl', 'thunder', 1.7, 0, 'all', inflict('shock', 1, 2)),
  might('lightning-lunge', 'Lightning Lunge', 'thunder', 1.7, 22),
  might('voltaic-maul', 'Voltaic Maul', 'thunder', 1.4, 20, 'single', { bonusVsStatus: { status: 'shock', percent: 40 } }),
  might('thunderclap', 'Thunderclap', 'thunder', 0.8, 20, 'sweep', inflict('shock', 0.4, 2)),
  res('static-field', 'Static Field', 'thunder', 0.55, 26, 'all', inflict('shock', 0.6, 2)),
  buff('howl-of-the-pack', 'Howl of the Pack', 'thunder', 'haste', 2, 30, 'all'),
  self('stormhide', 'Stormhide', 'thunder', 'barrier', 3, 16, { selfStatus: { status: 'taunt', turns: 2 } }),
  // Nimbara, the Sky Tide
  might('sky-bolt', 'Sky Bolt', 'thunder', 1.3, 15, 'single', { ignoresProtection: true }),
  might('sky-tide', 'Sky Tide', 'thunder', 2, 0, 'all'),
  might('stormpiercer', 'Stormpiercer', 'thunder', 1.9, 28, 'single', { ignoresProtection: true }),
  might('arc-volley', 'Arc Volley', 'thunder', 1.1, 22, 'pierce', { bonusVsStatus: { status: 'shock', percent: 30 } }),
  res('chain-lightning', 'Chain Lightning', 'thunder', 0.9, 18, 'pierce', inflict('shock', 0.35, 2)),
  res('thunderhead', 'Thunderhead', 'thunder', 0.75, 30, 'all', inflict('shock', 0.4, 2)),
  self('updraft', 'Updraft', 'thunder', 'haste', 3, 14),
  self('cloud-veil', 'Cloud Veil', 'thunder', 'barrier', 3, 16),

  // ── Paragons: Fire ──
  // Basaltor, the Ember Wall
  might('magma-slam', 'Magma Slam', 'fire', 1.4, 15),
  might('eruption', 'Eruption', 'fire', 1.8, 0, 'all', inflict('burn', 0.6, 3)),
  might('searing-sweep', 'Searing Sweep', 'fire', 0.8, 25, 'sweep', inflict('burn', 0.5, 3)),
  might('molten-fist', 'Molten Fist', 'fire', 1.6, 20, 'single', { bonusVsStatus: { status: 'burn', percent: 30 } }),
  self('ember-wall', 'Ember Wall', 'fire', 'taunt', 3, 20, { selfStatus: { status: 'barrier', turns: 2 } }),
  self('obsidian-skin', 'Obsidian Skin', 'fire', 'barrier', 3, 15),
  heal('ember-renewal', 'Ember Renewal', 'fire', 2.6, 25),
  heal('hearthglow', 'Hearthglow', 'fire', 0.9, 28, 'all', inflict('regen', 1, 2)),
  // Pyrelle, the Last Flame (Skill Tree as in the concept doc)
  res('flame-burst', 'Flame Burst', 'fire', 1.5, 15),
  res('last-flame', 'Last Flame', 'fire', 1.9, 0, 'all'),
  res('fire-rain', 'Fire Rain', 'fire', 0.9, 22, 'sweep'),
  res('searing-lance', 'Searing Lance', 'fire', 1.2, 20, 'pierce'),
  heal('warm-embers', 'Warm Embers', 'fire', 1.8, 14),
  heal('rekindle', 'Rekindle', 'fire', 0.3, 40, 'single', { revive: true }),
  res('ignite', 'Ignite', 'fire', 0.6, 10, 'single', { ignoresProtection: true, ...inflict('burn', 1, 3) }),
  res('scorch', 'Scorch', 'fire', 0.9, 16, 'single', { ignoresProtection: true, ...inflict('sunder', 1, 2) }),

  // ── Paragons: Umbra ──
  // Umbrok, the Night Warden
  might('night-maul', 'Night Maul', 'umbra', 1.35, 14),
  might('eclipse', 'Eclipse', 'umbra', 1.7, 0, 'all', inflict('hex', 1, 2)),
  might('moonfall', 'Moonfall', 'umbra', 0.85, 24, 'sweep', inflict('hex', 0.4, 2)),
  might('devouring-dark', 'Devouring Dark', 'umbra', 1.4, 20, 'single', { drain: 0.5 }),
  self('night-warden', 'Night Warden', 'umbra', 'taunt', 3, 20, { selfStatus: { status: 'barrier', turns: 2 } }),
  self('starless-hide', 'Starless Hide', 'umbra', 'barrier', 3, 15),
  might('crushing-gloom', 'Crushing Gloom', 'umbra', 1.2, 18, 'single', inflict('sunder', 0.7, 2)),
  self('moonlit-rest', 'Moonlit Rest', 'umbra', 'regen', 3, 18),
  // Velune, the Starless Tide
  res('starless-sting', 'Starless Sting', 'umbra', 1.2, 12, 'single', inflict('hex', 0.5, 2)),
  res('abyssal-tide', 'Abyssal Tide', 'umbra', 1.6, 0, 'all', inflict('hex', 1, 3)),
  res('void-pulse', 'Void Pulse', 'umbra', 0.8, 26, 'all'),
  res('night-terror', 'Night Terror', 'umbra', 1.6, 22, 'single', { bonusVsStatus: { status: 'hex', percent: 35 } }),
  res('dread-tendrils', 'Dread Tendrils', 'umbra', 0.7, 22, 'sweep', inflict('hex', 0.7, 2)),
  res('siphon-soul', 'Siphon Soul', 'umbra', 1.1, 16, 'single', { drain: 0.6, ignoresProtection: true }),
  res('ink-cloud', 'Ink Cloud', 'umbra', 0.5, 20, 'all', inflict('chill', 0.6, 2)),
  heal('tidal-shroud', 'Tidal Shroud', 'umbra', 1.6, 16, 'single', inflict('barrier', 1, 1)),

  // ── Paragons: Earth ──
  // Terrak, the Mountain Breaker
  might('horn-breaker', 'Horn Breaker', 'earth', 1.4, 14, 'single', inflict('sunder', 0.3, 2)),
  might('mountain-breaker', 'Mountain Breaker', 'earth', 2.1, 0, 'all'),
  might('rampage', 'Rampage', 'earth', 1.1, 22, 'pierce'),
  might('avalanche-charge', 'Avalanche Charge', 'earth', 1.9, 26, 'single', { bonusVsStatus: { status: 'sunder', percent: 30 } }),
  might('earthshatter', 'Earthshatter', 'earth', 0.85, 24, 'sweep', inflict('sunder', 0.5, 2)),
  self('stoneplate', 'Stoneplate', 'earth', 'barrier', 3, 15, { selfStatus: { status: 'taunt', turns: 2 } }),
  might('tremor-stomp', 'Tremor Stomp', 'earth', 0.7, 20, 'all', inflict('chill', 0.4, 2)),
  self('bedrock-rest', 'Bedrock Rest', 'earth', 'regen', 3, 16),
  // Eldwyn, the Deep Root
  res('crystal-bloom', 'Crystal Bloom', 'earth', 1.2, 12, 'single', inflict('sunder', 0.5, 2)),
  res('deep-root', 'Deep Root', 'earth', 1.5, 0, 'all', inflict('chill', 1, 2)),
  res('thornfield', 'Thornfield', 'earth', 0.8, 26, 'all'),
  res('geode-burst', 'Geode Burst', 'earth', 1.7, 22, 'single', { bonusVsStatus: { status: 'sunder', percent: 35 } }),
  res('binding-roots', 'Binding Roots', 'earth', 0.7, 20, 'sweep', inflict('chill', 0.8, 2)),
  res('shatter-sigil', 'Shatter Sigil', 'earth', 0.6, 18, 'all', inflict('sunder', 0.7, 2)),
  heal('verdant-pulse', 'Verdant Pulse', 'earth', 0.9, 25, 'all', inflict('regen', 1, 2)),
  heal('heartwood', 'Heartwood', 'earth', 2, 16),

  // ── Paragons: Water ──
  // Pelagon, the Unbroken Shell
  might('shell-crash', 'Shell Crash', 'water', 1.3, 14),
  heal('unbroken-tide', 'Unbroken Tide', 'water', 1.6, 0, 'all', inflict('barrier', 1, 3)),
  might('tidal-ram', 'Tidal Ram', 'water', 1.6, 20),
  might('maelstrom', 'Maelstrom', 'water', 0.85, 24, 'sweep', inflict('chill', 0.3, 2)),
  self('unbroken-shell', 'Unbroken Shell', 'water', 'taunt', 3, 20, { selfStatus: { status: 'barrier', turns: 2 } }),
  buff('coral-ward', 'Coral Ward', 'water', 'barrier', 2, 16),
  heal('tidepool', 'Tidepool', 'water', 1.7, 16, 'single', inflict('regen', 1, 2)),
  self('deep-current', 'Deep Current', 'water', 'regen', 4, 16),
  // Maressa, the Healing Spring
  heal('healing-spring', 'Healing Spring', 'water', 1.9, 12),
  heal('wellspring', 'Wellspring', 'water', 2.2, 0, 'all', inflict('regen', 1, 3)),
  heal('rainfall', 'Rainfall', 'water', 0.9, 24, 'all'),
  heal('lifebloom', 'Lifebloom', 'water', 1.2, 14, 'single', inflict('regen', 1, 4)),
  res('tide-lash', 'Tide Lash', 'water', 1.25, 12, 'single', { ignoresProtection: true }),
  res('torrent', 'Torrent', 'water', 0.8, 24, 'sweep'),
  heal('springs-return', "Spring's Return", 'water', 0.4, 38, 'single', { revive: true }),
  buff('sea-veil', 'Sea Veil', 'water', 'barrier', 2, 28, 'all'),

  // ── Paragons: Ice ──
  // Kyrael, the Frost Fang
  might('frost-fang', 'Frost Fang', 'ice', 1.5, 14),
  might('white-death', 'White Death', 'ice', 2.1, 0, 'all', inflict('chill', 0.6, 2)),
  might('glacial-pounce', 'Glacial Pounce', 'ice', 1.35, 24, 'single', { ignoresProtection: true }),
  might('rending-claws', 'Rending Claws', 'ice', 0.9, 20, 'sweep'),
  might('frostbite-maul', 'Frostbite Maul', 'ice', 1.3, 16, 'single', inflict('chill', 0.7, 2)),
  might('shatterclaw', 'Shatterclaw', 'ice', 1.5, 22, 'single', { bonusVsStatus: { status: 'chill', percent: 40 } }),
  self('snowveil', 'Snowveil', 'ice', 'haste', 3, 14),
  self('pack-ice', 'Pack Ice', 'ice', 'barrier', 3, 15),
  // Nivaris, the Winter Sage
  res('hoarfrost', 'Hoarfrost', 'ice', 1.3, 14, 'single', inflict('chill', 0.4, 2)),
  res('aurora-veil', 'Aurora Veil', 'ice', 1.4, 0, 'all', inflict('chill', 1, 2)),
  res('blizzard', 'Blizzard', 'ice', 0.75, 28, 'all'),
  res('icicle-lance', 'Icicle Lance', 'ice', 1.1, 18, 'pierce', { bonusVsStatus: { status: 'chill', percent: 30 } }),
  heal('winter-mend', 'Winter Mend', 'ice', 2, 15),
  buff('frost-ward', 'Frost Ward', 'ice', 'barrier', 2, 16),
  res('deep-freeze', 'Deep Freeze', 'ice', 0.6, 20, 'all', inflict('chill', 0.8, 2)),
  buff('sages-insight', "Sage's Insight", 'ice', 'haste', 3, 16),
]

export const SKILLS: Record<string, SkillDef> = Object.fromEntries(list.map((s) => [s.id, s]))
