#!/usr/bin/env node
/** Print the sha256 hash for the static JSON-LD block in index.html (CSP script-src). */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const INDEX = path.join(path.dirname(fileURLToPath(import.meta.url)), '../index.html');
const html = readFileSync(INDEX, 'utf8');
const match = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);

if (!match) {
  console.error('[csp] JSON-LD script block not found in index.html');
  process.exit(1);
}

const hash = createHash('sha256').update(match[1], 'utf8').digest('base64');
console.log(`'sha256-${hash}'`);
