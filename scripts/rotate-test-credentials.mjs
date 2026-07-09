#!/usr/bin/env node
/**
 * Generates a strong TEST_ACCOUNTS_PASSWORD, writes it to apps/server/.env,
 * and updates Supabase Auth users via ensureTestAuthUsers.
 * Never prints the password.
 */
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER_ENV = path.join(ROOT, 'apps/server/.env');

function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const bytes = randomBytes(24);
  let out = '';
  for (let i = 0; i < 24; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function upsertEnvLine(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  return `${content.trimEnd()}\n${line}\n`;
}

if (!existsSync(SERVER_ENV)) {
  console.error('Missing apps/server/.env — copy from apps/server/.env.example first.');
  process.exit(1);
}

const password = generatePassword();
let content = readFileSync(SERVER_ENV, 'utf8');
content = upsertEnvLine(content, 'TEST_ACCOUNTS_PASSWORD', password);
writeFileSync(SERVER_ENV, content, 'utf8');
console.log('Updated TEST_ACCOUNTS_PASSWORD in apps/server/.env');

const ensure = spawnSync('pnpm', ['--filter', 'aniquizz-server', 'test:ensure-auth'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, TEST_ACCOUNTS_PASSWORD: password },
  shell: process.platform === 'win32',
});

if (ensure.status !== 0) {
  process.exit(ensure.status ?? 1);
}

console.log('Supabase Auth test users updated.');
console.log('Run `pnpm secrets:sync` to push the new password to GitHub Actions.');
