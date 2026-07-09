#!/usr/bin/env node
/**
 * Regenerates favicon PNG/ICO assets from public/brand-icon.png (64×64 source).
 * Usage: pnpm --filter aniquizz-client generate:favicons
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, '../public');
const SRC = path.join(PUBLIC, 'brand-icon.png');

if (!fs.existsSync(SRC)) {
  console.error('Missing public/brand-icon.png — add the 64×64 master icon first.');
  process.exit(1);
}

const sizes = [
  [16, 'favicon-16x16.png'],
  [32, 'favicon-32x32.png'],
  [180, 'apple-touch-icon.png'],
  [192, 'android-chrome-192x192.png'],
  [512, 'android-chrome-512x512.png'],
] as const;

for (const [size, name] of sizes) {
  await sharp(SRC).resize(size, size).png().toFile(path.join(PUBLIC, name));
  console.log('wrote', name);
}

await sharp(SRC).resize(32, 32).toFile(path.join(PUBLIC, 'favicon.ico'));
console.log('wrote favicon.ico');
