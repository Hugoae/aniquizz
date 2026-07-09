#!/usr/bin/env node
/**
 * Copies missing test-related env vars into apps/server/.env from sibling .env files.
 * Never prints secret values.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER_ENV = path.join(ROOT, 'apps/server/.env');
const CLIENT_ENV = path.join(ROOT, 'apps/client/.env');

function parseEnv(filePath) {
  const map = new Map();
  if (!existsSync(filePath)) return map;
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    map.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }
  return map;
}

function upsertEnvLine(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  return `${content.trimEnd()}\n${line}\n`;
}

if (!existsSync(SERVER_ENV)) {
  console.error('Missing apps/server/.env');
  process.exit(1);
}

const server = parseEnv(SERVER_ENV);
const client = parseEnv(CLIENT_ENV);
let content = readFileSync(SERVER_ENV, 'utf8');
let changed = false;

const anon = client.get('VITE_SUPABASE_ANON_KEY');
if (anon && !server.has('SUPABASE_ANON_KEY')) {
  content = upsertEnvLine(content, 'SUPABASE_ANON_KEY', anon);
  changed = true;
  console.log('Added SUPABASE_ANON_KEY to apps/server/.env');
}

if (!server.has('TEST_ACCOUNTS_PASSWORD')) {
  console.error(
    'TEST_ACCOUNTS_PASSWORD is missing from apps/server/.env.\n' +
      'Run: pnpm rotate-test-credentials',
  );
  process.exit(1);
}

if (changed) {
  writeFileSync(SERVER_ENV, content, 'utf8');
} else {
  console.log('apps/server/.env already has test auth vars.');
}
