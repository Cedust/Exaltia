# Exaltia MVP: decisions and added content

This document lists what the MVP contains, which decisions were made to fill gaps in the concept, and which content was added on top of the concept doc ("Paragons – Game Concept"). The concept doc stays the source of truth for the world, names and art; everything marked **[added]** is new and open for review.

## 1. What you can play

A complete story campaign from the first awakening to the ending, plus a small endgame:

1. **Title** → **Prologue** at the Shattered Spire: wake up, meet Tessa and Hesper, choose your name, pick 2 of 4 starter Acolytes, learn the Battle Plan, win the **First Trial** (2v2).
2. **Act I** (Tournaments 1–4) and **Act II** (5–8): the map opens. Any region can be the first; afterwards the two ring neighbours of every won region open. Each region has a **Tournament** (2 matches + a final against both Paragons) and **2 Challenges** that recruit the region's Acolytes.
3. After every final you **choose 1 of the 2 Paragons**. The other goes to **Cassian**. The Oath ceremony shows one **Oath Memory** (8 in total), which together reveal the twist.
4. **Cassian duels** you 1v1 after Tournament 2 and 5, with the Paragons he took.
5. **Act III**: after 8 Tournaments, the finale at the reforged Spire: 4v4 against Cassian's chained Paragons. Then you choose the ending: **speak a new Oath** or **let it go**.
6. **Act IV** (endgame): **Rematches** in every region win you the Paragon you did not choose. All Tactic Slots open.

Everything saves automatically in the browser (localStorage). A journey takes roughly 30–40 battles.

## 2. Gaps filled with design decisions

### Battle system

| Decision | Why |
| --- | --- |
| **Shared Status Effects**: Burn, Chill, Shock, Sunder, Hex (debuffs) and Regen, Haste, Barrier, Taunt (buffs). Burn −6% LF/turn, Regen +7%, Chill −30% Swiftness, Haste +35%, Shock 30% lost turn, Sunder −30% Guard/Ward, Hex −25% Might/Resonance, Barrier −30% damage taken, Taunt forces attacks. | The concept's "next open" item. Each region gets a signature status, so a region feels different to fight. |
| **Ascension** gauge (0–100) for Paragons only. It fills with every hit landed (+7), with damage taken (+0.9 per 1% Lifeforce lost) and when an ally falls (+25). When full, the Ascension skill fires on its own, before Tactics. | Keeps the auto battler hands-off but gives Paragons a dramatic peak. Acolytes stay simpler. |
| **The Surge**: from turn 50, damage +5% per turn and healing −2% per turn. | Two healers could stall forever. Every battle now ends; no draws in practice. |
| **Bosses**: final Paragons get a big Lifeforce bar and a **second phase** at 50% (fiercer plan, +25 Ascension). | Finals should feel like boss fights, not like a normal match. |
| **Damage scale** ×1.5 and **Weakness** +50% damage. | Battles last about 10–25 turns, readable at 1× and fast at 4×. |
| Buffs never target a creature that already has that buff. | Otherwise healers and tanks waste turns re-casting. |
| New Tactic Conditions: Enemy Lifeforce < X%, Ally without status. New target: Highest Swiftness. | Needed for finishers and for keeping buffs up. |

### Progression (approved system, numbers added)

| System | MVP numbers |
| --- | --- |
| **Awakening 1–10** | XP per battle (more for finals, duels, finale). Benched Paragons get 50%, losses give 30%. A new Paragon catches up to 60% of your best Paragon's XP. Each level = 1 Awakening Point. |
| **Skill Tree** | Each Paragon: 3 Paths × 4 nodes (skill, attribute, passive) + Capstone (2 points, upgrades the Ascension). Reset is free, so you can rebuild per opponent. |
| **Mastery ★1–5** | Per skill by use: 5 / 18 / 45 / 100 uses. ★2 +10% Power, ★3 −20% Essence cost, ★4 +20%, ★5 +30% and stronger statuses. |
| **Oath Rank I–V** | 10 Oath Shards per rank, each shard +0.9% to the role's main attributes. Perks: I +10 starting Essence, II/IV Attunement (offense or defense), III +10% own element, V +25% Ascension gain. Ranks VI–X (Sigil Shards) are left for the endgame Spire. |
| **Oath Shards** | From every win: Trial 5, match 4, final 8 + 12, Challenge 6 (2 on repeat), duel 10, finale 20, rematch 15. |
| **Acolytes** | Fixed kits, max 3 Tactics, grow +8.5% per Tournament won (same pace as the world). |
| **Tactic Slots** | 1 in the Prologue, 2 / 3 / 4 / 5 in Act I–IV (as in the concept). |
| **Team size** | 2v2 until 2 Tournaments are won, then 3v3, 4v4 from 6 wins; the finale is 4v4. 1v1 only in duels and some Challenges. |
| **Conditions** | Start with 4 (Always, Enemy Weak to, Ally LF <, Self Essence ≥). The First Trial and each first Challenge win unlock one more (6 more in total). |

### World and difficulty

- **The world scales with you**: enemies grow +8.5% per Tournament won, so any region order works and the ring stays fair.
- Finals: boss Lifeforce and attributes are tuned so the first final is a real wall but beatable with counters (a sensible plan wins, a naive one often loses), and later finals need Skill Tree and Oath investment.
- **Formation auto-fit**: entering a battle trims or fills your formation to the team size and drops creatures the rules forbid (e.g. "Acolytes only"). You can still change it before the fight.
- **Suggest** button builds a sensible Battle Plan from a creature's skills and the Conditions you unlocked. Enemies use the same planner.

### Balancing evidence

`npm run campaign` plays the whole story headless with a simple "always pick the counter" player and expected growth. Last run (40 seeds per battle, start in Radiance): First Trial won by every starter pair; Tournament 3 final ~85%; Tournament 8 final ~40%; finale ~68%. The simulated player never tunes its plans, so a real player should do better. The first final is the intended wall: with suggested plans, 23 of 60 starter/Acolyte pairings and placements beat the Dawnreach final, 28 of 60 the Emberlands one and 56 of 60 the Tidewild one; splitting Lanes is often the key. Some 1v1 Challenges are hard by design (optional content).

## 3. Look and feel

- **Mystic, divine, painterly**: night-sky backgrounds with drifting motes of Spire light, gold ornate frames with diamond jewels, a rotating rune **Sigil**, Cinzel (titles), Cormorant Garamond (lore) and Alegreya Sans (UI). Element colours follow the concept (Thunder yellow on charcoal, Water turquoise, Ice sapphire …).
- **Mobile first**: everything works one-handed in portrait. The battle canvas switches between a **portrait layout** (enemies on top, Lanes as columns) and a **landscape layout** (player left, enemies right) and adapts to the screen's aspect ratio. Rotating mid-battle resumes where you were.
- **Battle scene**: region backdrop, glowing unit circles, Lifeforce / Essence / Ascension bars, status pills, boss bars, a visible Turn Order strip, projectiles in the attacker's element colour, floating numbers ("WEAK" on weakness hits), an **Ascension cinematic**, banners for the boss phase shift and the Surge, speed 1× / 2× / 4×, skip, and a Battle Log drawer that names the Tactic behind every action.
- **Art**: the final art in `/mnt/project-files/art` was converted with `tools/prepare_art.py` to 36 creature images (512² WebP), 4 character portraits, the world map and 9 blurred region backdrops cut from the world map.

## 4. Content added [added]

### Story

- **Prologue** in three scenes (awakening with Tessa, Hesper and the Unbinding, the First Trial briefing).
- **Act openings** for Act I, II and III, Cassian's introduction after the first Paragon, **two duel scenes**, the finale, and **two endings** ("The New Oath" and "Unbound").
- **8 Oath Memories**, one per sworn Paragon, which tell the twist step by step: the Oath had turned the Paragons into weapons, the Oathkeepers broke it on purpose, and the young Oathkeeper with the lantern (Hesper) hid the last Sigil mark in the sleeping player.
- **Cassian's motive**: he believes power that answers to no one is chaos and forces the old Oath back with chained Paragons.
- **Region intros** by Tessa for all 8 regions, each with a hint about the region's status and its counter element.

### Creatures and skills

- All **16 Paragons** with title, lore, Signature skill, Ascension and a full Skill Tree (3 Paths + Capstone each), and all **20 Acolytes** with 2 skills each. 169 skills in total. Names come from the concept doc; skills, numbers and lore lines are new.

### Regions

Each region has a named Tournament venue with two named opponents plus the final, and a Challenge site with two Challenges:

| Region | Tournament | Opponents | Challenges (rule) |
| --- | --- | --- | --- |
| The Dawnreach (Radiance) | Aurelion Lists | Squire Aldric, The Gilded Choir | Trial of the Spear (Acolytes only), Trial of the Candle (enemies start with Barrier) |
| The Galeheights (Wind) | Whisperpeak | The Kite-Runners, Mistress Vela's Featherguard | Duel of Feathers (1v1), Chase the Dandelion (enemies start with Haste) |
| The Stormreach (Thunder) | Howling Ridge | The Thunderbell Brothers, Captain Brannoc's Stormcrew | Lightning Without Water (no Water), The Bell Tolls Once (1v1) |
| The Emberlands (Fire) | Cinderforge | Forgehand Tilda, The Ashen Twins | Trial Without Frost (no Ice), Ash and Apprentices (Acolytes only) |
| The Nightvale (Umbra) | Moonhollow | Lanternless Mira, The Moonless Court | Blade in the Dark (1v1), Night Without Dawn (no Radiance) |
| The Rootlands (Earth) | Breaker's Mesa | Warden Oskar, The Mesa Breakers | Rootbound Oath (Acolytes only), Grove Without Wind (no Wind) |
| The Tidewild Coast (Water) | Shellback Atoll | Coral-Diver Nami, The Lagoon Keepers | Calm Before the Storm (no Thunder), The Otter Duel (1v1) |
| The Frostmere (Ice) | Fangridge | Huntress Sigrun, The Whitesage Acolytes | Penguin Standoff (1v1), Winter Without Fire (no Fire) |

The first Challenge of a region recruits its Front Acolyte, the second its Back Acolyte.

## 5. Not in the MVP yet

- Act IV's **rebuilt Spire ladder** (floor by floor) and **Sigil Shards** for Oath Rank VI–X. Rematches are in.
- Sound and music.
- Rival 1v1s with handpicked Cassian plans (he uses the same auto planner as other enemies).
- Animations per skill: attacks use a shared lunge + elemental orb.
- Cloud saves; the save lives in the browser only.

## 6. Code map

- `src/core/` deterministic battle simulation (no Phaser/React): statuses, Ascension, Surge, bosses, targeting, Battle Log.
- `src/data/` content: creatures, skills, Skill Trees, regions and encounters, story.
- `src/game/` campaign rules: save format, progression numbers, loadouts, rewards, auto planner, formation fitting.
- `src/ui/` React screens; `src/view/` the Phaser battle scene.
- `tools/campaign.ts` balancing simulator (`npm run campaign -- --runs 40 --start radiance`).
