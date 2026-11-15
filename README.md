# Stepping Stones Simulator

An unofficial, noncommercial browser simulator of the **Stepping Stones** minigame in *Forge Master*.

## Play

**[Play Stepping Stones](https://noodleshopfm.github.io/stepping-stones/)**

## Features

- Eight pairs of stones, with an independent 50% chance of success for each choice. Crossing all eight has probability **1/256**.
- Three cosmetic tile variants, independently randomized across all 16 stones for each new path.
- Token packs of 8, 42, 150, and 630, plus unlimited play.
- Cumulative rewards: hammers, coins, +1% skins, and set skins.
- **Your Rewards** shows actual totals alongside percentages of the theoretical expected rewards per completed attempt.
- **Auto ×20** simulates 20 attempts and quickly reveals their outcomes in a results table, without animating the path.
- A successful-steps distribution, run statistics, and a histogram of completed attempts.
- Progress saved locally in the browser, with a confirmation-protected **Reset All** option.

## How It Works

Each attempt uses one token when its first stone is selected. Rewards are awarded when that attempt finishes. Auto ×20 deducts 20 tokens and saves all outcomes before revealing the results; it cannot start during an unfinished manual attempt.

The **% of Expected** calculation compares actual rewards with the theoretical mean for the number of completed attempts. The successful-steps chart uses precomputed distributions for 1–630 completed attempts and an approximation for larger sessions.

## Development

The simulator is a static site with no backend or build step. The probability tables are generated offline; visitors do not need to run the generation scripts.

- [Probability engine: mathematical model, storage format, and validation](docs/probability-engine.md)
- Regenerate step distributions: `node scripts/generate_tables.mjs`
- Validate probability tables: `node scripts/validate_tables.mjs`
- Benchmark approximations: `node scripts/benchmark_approximations.mjs`

Run the automated tests with:

```sh
node --test tests/*.test.cjs
node scripts/validate_tables.mjs
```

GitHub Actions also runs validation on pushes and pull requests.

## Disclaimer

This is an unofficial, noncommercial fan project and is **not affiliated with or endorsed by Lessmore** or the developers of *Forge Master*.

*Forge Master* and its game artwork belong to their respective rights holders. Game graphics are used in this fan project with permission communicated by a community developer; that permission should not be understood as a formal license from the rights holder.

No license has yet been selected for this project's original code. Any future code license would not extend to third-party game artwork.
