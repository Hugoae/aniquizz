#!/usr/bin/env node
/**
 * CI guard: server/shared/database code comments must stay in English.
 * User-facing French strings in emit payloads are allowed.
 * Known legacy violations are listed in scripts/english-code-baseline.txt.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TARGET_DIRS = [
  'apps/server/src',
  'packages/shared/src',
  'packages/database/scripts',
];

const ACCENT_RE = /[àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]/;
const SKIP_FILE_RE = /\.(test|integration\.test)\.[tj]sx?$/;
const BASELINE_FILE = path.join(ROOT, 'scripts/english-code-baseline.txt');

/** Strip string literals so French UI copy in server error payloads is ignored. */
function stripStrings(line) {
  return line
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

function commentPart(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('//')) return trimmed.slice(2);
  const block = trimmed.match(/^\*+\s?(.*)$/);
  if (block) return block[1];
  const inline = line.match(/\/\/(.*)$/);
  return inline ? inline[1] : null;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      walk(full, out);
    } else if (/\.(ts|tsx|mts|js)$/.test(entry) && !SKIP_FILE_RE.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function loadBaseline() {
  try {
    return new Set(
      readFileSync(BASELINE_FILE, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

const baseline = loadBaseline();
const newViolations = [];

for (const rel of TARGET_DIRS) {
  const abs = path.join(ROOT, rel);
  for (const file of walk(abs)) {
    const relFile = path.relative(ROOT, file);
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      const comment = commentPart(line);
      if (!comment) return;
      if (!ACCENT_RE.test(stripStrings(comment))) return;
      const key = `${relFile.replace(/\\/g, '/')}:${idx + 1}`;
      if (!baseline.has(key)) {
        newViolations.push(`${key}: ${comment.trim()}`);
      }
    });
  }
}

if (newViolations.length) {
  console.error('English-code check failed (new French accents in comments):\n');
  for (const v of newViolations) console.error(`  ${v}`);
  process.exit(1);
}

console.log(`English-code check passed (${baseline.size} legacy entries baselined).`);
