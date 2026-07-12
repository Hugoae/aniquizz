#!/usr/bin/env node
/**
 * Fail the build if production JS bundles contain eval-like constructs.
 * Keeps script-src strict (no unsafe-eval) without risking runtime CSP violations.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(ROOT, '../dist/assets');

const RISKY = [
  { label: 'eval()', pattern: /\beval\s*\(/ },
  { label: 'new Function()', pattern: /\bnew\s+Function\s*\(/ },
  { label: "setTimeout('…')", pattern: /setTimeout\s*\(\s*['"`]/ },
  { label: "setInterval('…')", pattern: /setInterval\s*\(\s*['"`]/ },
];

let failed = false;

for (const file of readdirSync(ASSETS)) {
  if (!file.endsWith('.js')) continue;
  const source = readFileSync(path.join(ASSETS, file), 'utf8');
  for (const { label, pattern } of RISKY) {
    if (pattern.test(source)) {
      console.error(`[csp] ${file} contains ${label}`);
      failed = true;
    }
  }
}

if (failed) {
  console.error('[csp] Production bundles must not use eval-like APIs when unsafe-eval is omitted.');
  process.exit(1);
}

console.log('[csp] Production bundles are eval-free.');
