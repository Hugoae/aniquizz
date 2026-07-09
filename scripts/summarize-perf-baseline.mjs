#!/usr/bin/env node
/**
 * Summarize Phase 10 performance baseline artifacts.
 * Usage: node scripts/summarize-perf-baseline.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const perfDir = path.join(root, 'docs', 'perf');
const clientDist = path.join(root, 'apps', 'client', 'dist', 'assets');

const KB = (n) => `${(n / 1024).toFixed(1)} kB`;

function readLighthouse(file) {
  const full = path.join(perfDir, file);
  if (!fs.existsSync(full)) return null;
  const json = JSON.parse(fs.readFileSync(full, 'utf8'));
  const audits = json.audits ?? {};
  const pick = (id) => audits[id]?.displayValue ?? audits[id]?.numericValue ?? 'n/a';
  const score = Math.round((json.categories?.performance?.score ?? 0) * 100);
  return {
    file,
    score,
    fcp: pick('first-contentful-paint'),
    lcp: pick('largest-contentful-paint'),
    tbt: pick('total-blocking-time'),
    cls: pick('cumulative-layout-shift'),
    si: pick('speed-index'),
    inp: pick('interaction-to-next-paint'),
  };
}

function bundleSummary() {
  if (!fs.existsSync(clientDist)) {
    return { error: 'Run pnpm --filter aniquizz-client build first.' };
  }
  const files = fs.readdirSync(clientDist).filter((f) => f.endsWith('.js'));
  const entries = files.map((name) => {
    const stat = fs.statSync(path.join(clientDist, name));
    return { name, bytes: stat.size };
  });
  entries.sort((a, b) => b.bytes - a.bytes);

  const byRoute = {
    shell: entries.find((e) => e.name.startsWith('index-')) ?? null,
    home: entries.find((e) => e.name.startsWith('Home-')) ?? null,
    gameHub: entries.find((e) => e.name.startsWith('GameHub-')) ?? null,
    game: entries.find((e) => e.name.startsWith('Game-')) ?? null,
    profile: entries.find((e) => e.name.startsWith('Profile-')) ?? null,
    admin: entries.find((e) => e.name.startsWith('Admin-')) ?? null,
  };

  const css = entries.find((e) => e.name.startsWith('index-') && e.name.endsWith('.css'))
    ?? fs.readdirSync(clientDist).find((f) => f.endsWith('.css'));

  let cssBytes = 0;
  if (css && typeof css === 'string') {
    cssBytes = fs.statSync(path.join(clientDist, css)).size;
  }

  const totalJs = entries.reduce((sum, e) => sum + e.bytes, 0);

  return {
    totalJsBytes: totalJs,
    cssBytes,
    topChunks: entries.slice(0, 8).map((e) => ({ name: e.name, size: KB(e.bytes) })),
    routeChunks: Object.fromEntries(
      Object.entries(byRoute).map(([k, v]) => [k, v ? { name: v.name, size: KB(v.bytes) } : null]),
    ),
  };
}

const lighthouseFiles = [
  'baseline-home-mobile.json',
  'baseline-home-desktop.json',
  'baseline-news-mobile.json',
];

const report = {
  generatedAt: new Date().toISOString(),
  lighthouse: lighthouseFiles.map(readLighthouse).filter(Boolean),
  bundle: bundleSummary(),
  notes: [
    '/play and /game require auth — measure manually after login (DevTools Performance + Network).',
    'Socket payload sizes are documented in docs/perf/baseline.md (estimated from wire types).',
  ],
};

const outPath = path.join(perfDir, 'baseline-summary.json');
fs.mkdirSync(perfDir, { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify(report, null, 2));
console.log(`\nWrote ${path.relative(root, outPath)}`);
