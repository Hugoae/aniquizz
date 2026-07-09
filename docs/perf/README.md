# Performance measurement

## Quick baseline refresh (bundle)

```bash
pnpm perf:baseline
```

Runs a production client build and writes `docs/perf/baseline-summary.json`.

## Lighthouse (production)

Requires Chrome/Chromium. On Windows, Lighthouse may log a harmless `EPERM` on temp cleanup — the JSON output is still written.

```bash
# Home — mobile
npx lighthouse https://aniquizz.com/ \
  --only-categories=performance \
  --form-factor=mobile \
  --screenEmulation.mobile=true \
  --throttling.cpuSlowdownMultiplier=4 \
  --output=json \
  --output-path=./docs/perf/baseline-home-mobile.json \
  --chrome-flags="--headless --no-sandbox"

# Home — desktop
npx lighthouse https://aniquizz.com/ \
  --only-categories=performance \
  --preset=desktop \
  --output=json \
  --output-path=./docs/perf/baseline-home-desktop.json \
  --chrome-flags="--headless --no-sandbox"
```

Then regenerate the summary:

```bash
node scripts/summarize-perf-baseline.mjs
```

## Auth-gated routes

`/play` and `/game` need a logged-in session. Use Chrome DevTools → Lighthouse on a logged-in tab, or Performance + Network waterfall.

## Human-readable report

See [`baseline.md`](./baseline.md) for snapshots and targets. Raw Lighthouse JSON
files (`baseline-*.json`) are gitignored — only the markdown summary is versioned.
