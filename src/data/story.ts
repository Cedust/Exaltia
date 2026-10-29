/**
 * Story scenes: short dialogue moments between battles (concept doc "Story"). The story stays light.
 * `{name}` is replaced with the player's name, `{paragon}` / `{other}` with Paragon names where a scene needs them.
 */
export type Speaker = 'narrator' | 'tessa' | 'hesper' | 'cassian' | 'player' | string

export interface StoryLine {
  speaker: Speaker
  text: string
}

export interface Scene {
  id: string
  /** Backdrop key in public/art/backdrops. */
  backdrop: string
  title?: string
  lines: StoryLine[]
}

export const CHARACTER_NAMES: Record<string, string> = {
  tessa: 'Tessa',
  hesper: 'Hesper',
  cassian: 'Cassian',
}

const n = (text: string): StoryLine => ({ speaker: 'narrator', text })
const t = (text: string): StoryLine => ({ speaker: 'tessa', text })
const h = (text: string): StoryLine => ({ speaker: 'hesper', text })
const c = (text: string): StoryLine => ({ speaker: 'cassian', text })

const list: Scene[] = [
  {
    id: 'prologue-1', backdrop: 'spire', title: 'Prologue · The Shattered Spire',
    lines: [
      n('Light. Dust. The hum of something ancient, still breathing beneath the stone.'),
      n('You wake among the ruins of the Spire with no memory of how you got here. On the back of your right hand, a golden mark glows softly.'),
      t("Oh! You're awake! I thought you were a statue. A very scruffy statue."),
      t("I'm Tessa. I find things in the ruins. Mostly junk. Today I found you!"),
      t('Wait... is that a sigil on your hand? A real one? Those are supposed to be gone!'),
      t('So, do you have a name, or should I keep calling you Statue?'),
    ],
  },
  {
    id: 'prologue-2', backdrop: 'spire',
    lines: [
      t('{name}! Nice. Strange, but nice.'),
      h('Strange is the right word, child.'),
      n('An old woman steps out of the shadows. A lantern of white Spire light sways from her staff.'),
      h('I am Hesper. I keep what is left of this place. And you, {name}, carry a mark that has not been seen since the Unbinding.'),
      t('The Unbinding? The night the Spire broke?'),
      h('Once, sixteen Paragons swore the Oath here, bound to the Oathkeepers who guarded Exaltia. Then the Spire shattered, every Oath dissolved, and the Paragons scattered to the eight regions.'),
      h('Now they bind only to those who prove themselves in their region\'s Tournament. Until then, you are simply... Unsworn.'),
      t('Unsworn. Ooh. That sounds tragic. I like it.'),
      h('Not everything scattered. The Acolytes, the small servants of the Spire, still linger in these halls. Some of them have been watching you since you woke.'),
    ],
  },
  {
    id: 'prologue-3', backdrop: 'spire',
    lines: [
      h('They have chosen you as much as you have chosen them. Good.'),
      h('Before you set foot outside these ruins, you will pass the First Trial. My old constructs will test whether you can think before you fight.'),
      t("And the best part: you don't fight yourself! Your creatures know their craft. You choose who fights and where they stand."),
      h('Every match is fought in rounds. Before each round your opponent swears a Vow, and then you answer with one of your own.'),
      h('A Vow is a promise of power: a tougher hide, a swifter step, a flame that spreads. It holds until the match is over, so choose with care.'),
      h('And mind the field. A creature in the Front shields only the one behind it in the same Lane, and every attack strikes its own Lane first.'),
      h('So place your creatures with intent: whoever stands across from an enemy is the one it will strike.'),
    ],
  },
  {
    id: 'act1-open', backdrop: 'spire', title: 'Act I · The Unsworn',
    lines: [
      h('Well thought, and well fought. The Spire remembers you, {name}.'),
      n('As the constructs power down, the mark on your hand flares. High above, the broken Spire answers with a pulse of light, and the mist over the land begins to lift.'),
      h('The roads are open. Eight regions, eight Tournaments. Win one, and its two Paragons will descend to test you. Pass their trial, and one of them may swear the Oath.'),
      t("And I'm coming with you. Obviously. Somebody has to carry the snacks."),
      h('Go wherever you wish first. The regions beside those you have won will open after. And {name}... the Oath was broken once. Ask yourself why.'),
    ],
  },
  {
    id: 'cassian-intro', backdrop: 'spire',
    lines: [
      t("You did it! You're not Unsworn anymore. You're a real Sigilbearer!"),
      c('How touching. The ruin rat and the Unsworn, playing at Oathkeepers.'),
      n('A man in wine-red and gold strolls across the arena. A golden chain hangs from his coat, and at its end the other Paragon stands with its head bowed.'),
      c('Cassian. Remember the name. You picked your pet; I will take the one that is left. Paragons should not roam free. They should serve.'),
      t("He can't just take a Paragon! Can he?"),
      c('Watch me. We will meet again, Sigilbearer. Try to be more interesting by then.'),
    ],
  },
  {
    id: 'duel-1-intro', backdrop: 'spire', title: 'A Rival Appears',
    lines: [
      c('There you are. I was getting bored of winning against nobodies.'),
      c('One Paragon each. No Acolytes, no tricks. Let us see what your little Oath is worth.'),
      t('{name}, his Paragon looks... sad. Like it does not want to be here.'),
      c('What it wants does not matter. That is the point.'),
    ],
  },
  {
    id: 'duel-1-won', backdrop: 'spire',
    lines: [
      c('Luck. Nothing more.'),
      n('Cassian yanks the chain, and his Paragon flinches. He turns away without another word.'),
      t('Did you see that? The chain hurt it. Every time he pulls, it hurts.'),
    ],
  },
  {
    id: 'act2-open', backdrop: 'spire', title: 'Act II · Broken Oaths',
    lines: [
      h('Four Oaths sworn. The Spire stirs, {name}. I can feel it in the stones.'),
      h('But so does Cassian. He holds four Paragons in chains now, and he is not collecting them for company.'),
      t('The memories, Hesper. Every Paragon shows {name} one. They are all sad. Why are they all sad?'),
      h('Because they are true. Keep listening to them.'),
      n('Four Challenges and more wait in every region, and each first victory there teaches a new Vow.'),
    ],
  },
  {
    id: 'duel-2-intro', backdrop: 'spire', title: 'The Chain Tightens',
    lines: [
      c('Again, Sigilbearer. And this time I have been practising.'),
      n('The chain on his coat glows a deep, angry gold. The Paragon at its end moves like a puppet.'),
      c('Do you know what the Oathkeepers did? They threw it all away. Power, order, peace. I will not make the same mistake.'),
    ],
  },
  {
    id: 'duel-2-won', backdrop: 'spire',
    lines: [
      c('Enough! Keep your victories. Soon they will not matter.'),
      h('He is close, {name}. Closer than I feared.'),
    ],
  },
  {
    id: 'act3-open', backdrop: 'spire', title: 'Act III · The Spire Reforged',
    lines: [
      h('So. You know.'),
      h('Yes. I was one of them, the youngest. We broke the Oath because it had become a cage. And I hid the last mark in you, so that the choice could be made again by someone better than us.'),
      t('Wait. So {name} is... a hundred years old?!'),
      h('Asleep, child, not old. The Spire kept you.'),
      n('The ground trembles. Golden chains of light rise from the heart of the ruins and drag the broken stones together into a tower.'),
      h('Cassian. He is forcing the old Oath back into the Spire with the Paragons he has chained. If he finishes, they will be servants forever.'),
      t('Then we stop him. Right, {name}? Right?'),
      n('Cassian waits at the top of the Spire. Four against four, best of seven.'),
    ],
  },
  {
    id: 'finale-intro', backdrop: 'spire', title: 'The Spire Reforged',
    lines: [
      c('There you are. Just in time to watch history correct itself.'),
      c('The Unbinding was a mistake made by sentimental fools. Power that answers to no one is chaos. I will bind them all again, and Exaltia will finally have order.'),
      c('Four against four, Sigilbearer. My chained Paragons against your... friends.'),
      t('{name}. Whatever happens, I am glad I found you in those ruins.'),
    ],
  },
  {
    id: 'finale-won', backdrop: 'spire',
    lines: [
      n("Cassian's chain shatters into a thousand golden sparks. The Paragons he held lift their heads, free for the first time since you met them."),
      c('No... I had them. I had them all.'),
      h('You had nothing, Cassian. An Oath taken by force is only a chain with prettier words.'),
      n('The Spire hums. The old Oath hangs in the air, half spoken, waiting for someone to finish it, or to let it go.'),
      h('The choice is yours, {name}. It was always meant to be.'),
    ],
  },
  {
    id: 'ending-oath', backdrop: 'spire', title: 'Epilogue · The New Oath',
    lines: [
      n('You speak the Oath, but not the old one. Word by word, you change it: no Paragon bound against its will, no Oathkeeper above the one they guard.'),
      n('One by one, the Paragons step forward and lay their Sigils against your hand. Not as servants. As equals.'),
      h('A better Oath than ours. Thank you, {name}.'),
      t('So does this mean we get a tower now? Can I have a room at the top?'),
      n('The Spire rises again, whole and shining, and its gates open to every challenger in Exaltia. The story is told. The journey is not.'),
    ],
  },
  {
    id: 'ending-unbound', backdrop: 'spire', title: 'Epilogue · Unbound',
    lines: [
      n('You let the Oath go. The golden words drift apart like embers and fade into the morning.'),
      n('The Paragons stay anyway. Not because they must, but because they choose to.'),
      h('Unbound, and still beside you. That is something no Oath could ever have given us.'),
      t('Aww. Okay, I am not crying. There is just Spire dust in my eyes.'),
      n('The Spire rises again, open to every challenger in Exaltia. The story is told. The journey is not.'),
    ],
  },
]

/** One Oath Memory per Paragon you bind, in order. Together they reveal what the Unbinding really was. */
export const OATH_MEMORIES: string[] = [
  'A hall of light. Sixteen Paragons kneel in a ring, and sixteen Oathkeepers lay their hands upon their Sigils. "Together we guard Exaltia," they say. It sounds like a promise. It sounds like love.',
  'Years pass in a heartbeat. The Oathkeepers grow old and their children take their place. The Paragons are sent against storms, against floods, against each other\'s regions. They go. The Oath leaves them no choice.',
  'An Oathkeeper sits alone at night, her hand on a Paragon\'s Sigil. "I asked you to burn a village today," she whispers. "And you did. You could not refuse." She does not sleep.',
  'The Oathkeepers meet in secret beneath the Spire. "The Oath was meant to bind us together," one says. "It has made them our servants. Our weapons." Nobody disagrees.',
  'A plan, whispered by candlelight. To break the Oath, the Spire itself must fall. Every Oathkeeper will lose their bond; some will lose far more. They vote. Every hand is raised.',
  'The night of the Unbinding. The Oathkeepers stand at the heart of the Spire and speak the Oath backwards, word by word. The stone cracks. The light screams. The Paragons are free. It was not an accident. It was a gift.',
  'As the dust settles, one Oathkeeper remains: a young woman with a lantern, weeping. She hides the last Sigil mark inside a sleeping child deep in the ruins, so that one day someone might choose to swear a better Oath.',
  'The memory clears, and at last you recognise the lantern. Hesper. She was there. She has been waiting for you all along.',
]

/** First visit to a region: a few words from Tessa about what lies ahead. */
export const REGION_INTROS: Record<string, StoryLine[]> = {
  radiance: [
    t('The Dawnreach! Everything here is so white I need to squint. Even the sheep look holy.'),
    t('Their fighters love Barriers and healing. If you cannot hit hard, you will be here all day. Umbra cuts through Radiance, by the way.'),
  ],
  wind: [
    t('Hold on to something! The Galeheights blow you off your feet if you stop paying attention.'),
    t('Everyone here is fast and loves Haste. Earth creatures are what the wind fears most.'),
  ],
  thunder: [
    t('My hair is standing up. Literally. The Stormreach is not a place for a picnic.'),
    t('Shock can make your creatures lose their turn. Water douses Thunder, if you have any.'),
  ],
  fire: [
    t('It is so hot here my boots are sweating. Is that possible? That should not be possible.'),
    t('The Emberlands love Burn, and Burn eats you slowly. Ice is your friend here, and Fire is very much not.'),
  ],
  umbra: [
    t('It is always dusk in the Nightvale. Hesper says Umbra is not evil. It is just... very, very dark.'),
    t('Their Hex weakens your attacks. Radiance shines right through them.'),
  ],
  earth: [
    t('These trees are older than the Spire! Probably. Do not tell them I said they look old.'),
    t('Rootland fighters Sunder armour and refuse to fall over. Wind wears down even mountains.'),
  ],
  water: [
    t('The Tidewild Coast! Shells, waves, and otters. I love it here already.'),
    t('Their healers can outlast you if you are slow. Thunder hits Water creatures hard.'),
  ],
  ice: [
    t('Brr. The Frostmere. Even the light is cold here.'),
    t('Chill slows your creatures down until they barely move. Fire melts all of it.'),
  ],
}

export const SCENES: Record<string, Scene> = Object.fromEntries(list.map((s) => [s.id, s]))
