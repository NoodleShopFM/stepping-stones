# Probability engine — Phase 1 groundwork

This folder contains **precomputed, validated probability distributions** for cumulative successful steps across 1–630 completed attempts. It does not change the live game UI yet.

## Model

Each attempt consists of eight 50/50 choices and ends on the first failure. With `X` the number of successes in one attempt:

- `P(X=k) = 2^(-k-1)` for `k=0..7`
- `P(X=8) = 1/256` (survive all eight)

The total after `n` attempts is `S_n = X_1 + ... + X_n`.
`P(S_n=s)` is computed by Float64 convolution (offline), then packed into static Float32 tables.
The process is deterministic and reproducible; no Monte Carlo sampling is used.

## Exact one-attempt moments

| Statistic | Mean | Variance |
| --- | ---: | ---: |
| Successful steps | 255/256 = 0.99609375 | 126719/65536 = 1.9335784912109375 |
| Hammers | 427/64 = 6.671875 | 2169671/4096 = 529.704833984375 |
| Coins | 3225/8 = 403.125 | 38239375/64 = 597490.234375 |

The *cumulative* reward schedule by final step count `0..8`:

- Hammers: `[0,2,6,14,34,74,74,224,224]`
- Coins: `[0,200,700,1400,2100,3100,3100,5100,5100]`

Basic head skins: `P(X>=6)=1/64`. Set skins: `P(X=8)=1/256`.
For `n` attempts, each skin count has an exact binomial marginal, although the two counts are dependent.

## Format and sizes

`data/index.json` describes all 630 distributions and their locations.
The table is divided into 12 binary chunks (total 2,506,428 bytes), each
covering a fixed range of attempt counts. A client only needs to fetch the
chunk referenced by its current record. Each retained `s` takes **12 bytes**:

| Float32 LE field | Meaning |
| --- | --- |
| PMF | `P(S_n=s)` |
| CDF | `P(S_n<=s)` |
| Survival | `P(S_n>=s)` |

The index's `records[n]` contains `chunk`, `offset` (byte offset in that
chunk), `min` (first retained `s`), and `count` (retained outcomes).
If `s` is below or above the stored range, the missing probabilities are
bounded by the truncation policy. Specifically, each removed tail has less
than `5e-13` probability mass. Float32 introduces additional rounding,
typically at the scale of `1e-8` for probabilities near 0.5. The data are
*approximations to exact distributions*; do not advertise Float32 outputs
as arbitrary-precision exact values.

For discrete "luck percentile" displays, the mid-distribution percentile
is `100*(P(S_n<s)+0.5*P(S_n=s))`. Use the saved CDF and PMF.

The browser should **not** calculate any DP at normal attempt counts.
Only load `data/index.json` and the binary chunk for the current `n`.

## Rebuild and validate

No npm packages are required:

```sh
node scripts/generate_tables.mjs
node scripts/validate_tables.mjs
```

The generator is deterministic. The validator checks:
- Probabilities, exact known rational moments, and cumulative reward schedule
- Small-`n` independent integer-convolution reference
- Every table's bounds, normalization, monotonicity and CDF/survival identity
- Float64 reference distributions for selected `n`
- Trimmed tail limits

## For sessions longer than 630 attempts

The intended design is a cheap continuity-corrected approximation in the center,
with a specialized high-accuracy tail method invoked only when needed.

The single-attempt skewness is approximately 1.9160; the uncorrected normal
approximation retains visible asymmetry error at `n=630`.
Against the Float64 DP reference at `n=630` and `|z|<=3`, worst absolute CDF
errors observed were:

- Continuity-corrected normal: **0.50782 percentage points**
- First-order skewness-corrected Edgeworth: **0.00919 percentage points**
- Second-order Edgeworth: **0.00115 percentage points**

These are validation results in the **central region**, not guarantees in
extreme tails. We have **not yet implemented** a browser-side tail algorithm,
and should benchmark it separately before promising exact arbitrarily-large-`n` tails.
A full DP for extremely large n on a phone would defeat the point of these tables.
