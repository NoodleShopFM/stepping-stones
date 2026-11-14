# Stepping Stones Simulator

A fan-made browser simulation of the **Stepping Stones** minigame in *Forge Master*.

## Play

Open `index.html` in a modern browser, or enable GitHub Pages in **Settings → Pages → Deploy from a branch → main → /(root)**.

## Phase 1 — Gameplay, wallets, and banking

- Eight pairs of stones, each selected with independent 50% survival probability.
- Cumulative milestone rewards: hammers, coins, basic head skins, and set skins.
- Token packs: 8, 42, 150, and 630; buying another pack adds to the balance.
- Unlimited mode toggles without resetting winnings or the stored wallet.
- Tap a completed bridge to restart when tokens are available.
- Auto ×20 generates twenty independent runs and briefly replays each path.
- The Bank and outcome histogram retain progress in browser localStorage.
- Reset All requires confirmation and erases wallet, outcomes, and winnings.
- No build step, backend, or external runtime dependencies.

**Accounting details:** An attempt spends one token on its first stone selection, regardless of outcome; milestones are paid cumulatively once when the attempt ends. Autoplay spends 20 tokens in one transaction, saves its results before replaying them, and cannot run with an active manual attempt.


The chance of successfully crossing all eight pairs is `(1/2)^8 = 1/256`.

## Precomputed probability engine

Exact step-total distributions for **1–630 attempts** have been computed and validated offline, then stored as small static binary chunks in `data/`. The tables are available for the upcoming luck-distribution visualizations; they are not yet loaded by the playable page.

- [Mathematical model, storage format, validation results, and approximation benchmarks](docs/probability-engine.md)
- Regenerate: `node scripts/generate_tables.mjs`
- Validate: `node scripts/validate_tables.mjs`
- Compare large-session approximations: `node scripts/benchmark_approximations.mjs`

All three scripts use Node.js without external dependencies. Visitors won't run them.

## Roadmap

- **Phase 2:** Replace placeholder graphics with faithful game visuals, animation, and camera behavior.
- **Next Phase 1 milestone:** Integrate theoretical luck distributions, percentile displays, and skin PMFs using the offline tables.\n- **Phase 3:** Add additional analytics, configuration, and other enhancements.

## Disclaimer

This is an unofficial fan-made tool, not affiliated with or endorsed by the developers of *Forge Master*. Forge Master and its game assets belong to their respective owners. No third-party game assets are included in Phase 1.

A license for this project's original code has not yet been selected. Any future license for the code will not cover third-party game artwork or assets.

## Tests

```sh
node --test tests/game-core.test.cjs
node scripts/validate_tables.mjs
```

GitHub Actions also runs both test suites on pushes and pull requests.
