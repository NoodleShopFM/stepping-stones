# Stepping Stones Simulator

A fan-made browser simulation of the **Stepping Stones** minigame in *Forge Master*.

## Play

Open `index.html` in a modern browser, or enable GitHub Pages in **Settings → Pages → Deploy from a branch → main → /(root)**.

## Phase 1 — Functional prototype

- Eight pairs of upper/lower stones
- 50% independent survival chance per selection
- Success and failure states, with a restart button
- A simple player marker and mobile-friendly layout
- No dependencies, build steps, accounts, or server needed

The chance of successfully crossing all eight pairs is `(1/2)^8 = 1/256`.

## Precomputed probability engine

Exact step-total distributions for **1–630 attempts** have been computed and validated offline, then stored as small static binary chunks in `data/`. These are not wired into the playable page yet.

- [Mathematical model, storage format, validation results, and approximation benchmarks](docs/probability-engine.md)
- Regenerate: `node scripts/generate_tables.mjs`
- Validate: `node scripts/validate_tables.mjs`
- Compare large-session approximations: `node scripts/benchmark_approximations.mjs`

All three scripts use Node.js without external dependencies. Visitors won't run them.

## Roadmap

- **Phase 2:** Replace placeholder graphics with faithful game visuals, animation, and camera behavior.
- **Phase 3:** Add optional statistics, batch runs, autoplay, and other enhancements.

## Disclaimer

This is an unofficial fan-made tool, not affiliated with or endorsed by the developers of *Forge Master*. Forge Master and its game assets belong to their respective owners. No third-party game assets are included in Phase 1.

A license for this project's original code has not yet been selected. Any future license for the code will not cover third-party game artwork or assets.
