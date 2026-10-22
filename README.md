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
npm run sim        # headless battle simulator (see below)
```

## Structure

- `src/core/` battle simulation, pure TypeScript, no Phaser or React imports, deterministic via the seeded RNG
- `src/view/` Phaser scenes that render the battle
- `src/ui/` React menus layered over the canvas

## Battle simulator

Runs battles without graphics, for balancing and for reading Battle Logs:

```sh
npm run sim                                              # every encounter, 1000 runs, preset "naive"
npm run sim -- --encounter winter-court --preset golem-mender --runs 5000
npm run sim -- --encounter frost-wardens --log --seed 7  # one battle with its full Battle Log
```

Content (creatures, skills, encounters, player presets) lives in `src/data/`.

## Deployment

- Every push to `main` builds and publishes to the `gh-pages` branch (site root).
- Every pull request gets a preview at `https://cedust.github.io/Exaltia/pr-preview/pr-<number>/`; the link is posted on the PR and the preview is removed when the PR closes.
- GitHub Pages must be set to *Deploy from a branch: `gh-pages` / root* (Settings → Pages).
