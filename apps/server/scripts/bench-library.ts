/**
 * Lightweight load benchmark for GET /library/tree.
 * Run with a live server: pnpm --filter aniquizz-server exec tsx scripts/bench-library.ts
 * Optional: BENCH_BASE_URL=http://localhost:3001 BENCH_ROUNDS=30
 */
const BASE_URL = process.env.BENCH_BASE_URL ?? 'http://localhost:3001';
const ROUNDS = Number(process.env.BENCH_ROUNDS ?? 20);

const endpoints = [
  '/library/tree?pageSize=20',
  '/library/tree?sort=popularity&pageSize=20',
  '/library/tree?q=naruto&pageSize=24',
  '/library/tree?songType=OP,ED&pageSize=20',
];

const percentile = (values: number[], p: number): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
};

async function benchPath(path: string): Promise<number> {
  const start = performance.now();
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`${path} failed with ${res.status}`);
  }
  await res.json();
  return performance.now() - start;
}

async function main(): Promise<void> {
  console.log(`Library bench → ${BASE_URL} (${ROUNDS} rounds per endpoint)\n`);

  for (const path of endpoints) {
    const samples: number[] = [];
    for (let i = 0; i < ROUNDS; i += 1) {
      samples.push(await benchPath(path));
    }
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    console.log(path);
    console.log(`  avg ${avg.toFixed(1)}ms · p50 ${percentile(samples, 50).toFixed(1)}ms · p95 ${percentile(samples, 95).toFixed(1)}ms`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
