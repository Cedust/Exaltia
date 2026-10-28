# Exaltia: Paragons of the Oath

A creature-collector auto battler for the browser. Built with Phaser (battle scene), React (menus as an overlay), Vite, TypeScript and Tailwind CSS.

Play: https://cedust.github.io/Exaltia/

## Development

```sh
npm install
npm run dev        # local dev server
npm test           # unit tests (Vitest)
npm run lint       # oxlint
npm run build      # type-check and production build to dist/
npm run campaign   # headless campaign simulator for balancing (see below)
```

## What's in the MVP

The whole story campaign (Prologue, 8 regions with Tournaments and Challenges, Cassian's duels, the finale and two endings) plus Rematches as a small endgame. All design decisions and added content are documented in [docs/MVP.md](docs/MVP.md).

## Structure

- `src/core/` battle simulation, pure TypeScript, no Phaser or React imports, deterministic via the seeded RNG
- `src/data/` content: creatures, skills, Skill Trees, regions and encounters, story
- `src/game/` campaign rules: save, progression, loadouts, rewards, auto planner
- `src/view/` the Phaser battle scene (portrait and landscape layouts)
- `src/ui/` React screens

## Campaign simulator

Plays the story headless with a simple counter-picking player, for balancing:

```sh
npm run campaign                                  # First Trial for every starter pair, then the story in ring order
npm run campaign -- --start fire --reverse --runs 200
```

## Art

`tools/prepare_art.py` converts the final art (creatures, characters, world map) into `public/art/`, including the blurred region backdrops cut from the world map.

## Deployment

- Every push to `main` builds and publishes to the `gh-pages` branch (site root).
- Every pull request gets a preview at `https://cedust.github.io/Exaltia/pr-preview/pr-<number>/`; the link is posted on the PR and the preview is removed when the PR closes.
- GitHub Pages must be set to *Deploy from a branch: `gh-pages` / root* (Settings → Pages).
