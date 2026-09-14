#!/usr/bin/env node
/**
 * Single source for Home news teasers: `newsData.ts` (`allNews`) + `SITE_VERSION`.
 * Writes `newsPreview.ts` (slim, no `content`) and patches `index.html` app-shell
 * so v26.7 cannot drift just because someone forgot the static HTML.
 *
 *   pnpm --filter aniquizz-client sync:news
 *   pnpm --filter aniquizz-client sync:news -- --check
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const CLIENT_ROOT = path.join(ROOT, '..');
export const NEWS_DATA_PATH = path.join(CLIENT_ROOT, 'src/features/news/data/newsData.ts');
export const NEWS_PREVIEW_PATH = path.join(CLIENT_ROOT, 'src/features/news/data/newsPreview.ts');
export const SITE_PATH = path.join(CLIENT_ROOT, 'src/lib/site.ts');
export const INDEX_HTML_PATH = path.join(CLIENT_ROOT, 'index.html');

export const NEWS_PREVIEW_COUNT = 2;
export const APP_SHELL_NEWS_START = '<!--app-shell-news-->';
export const APP_SHELL_NEWS_END = '<!--/app-shell-news-->';

const FR_SHORT_MONTHS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

const ZAP_SVG =
  '<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>';

const CHEVRON_SVG =
  '<svg class="app-shell-news-chevron" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

export function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeTs(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function newlineOf(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

function skipWs(src, i) {
  while (i < src.length && /\s/.test(src[i])) i += 1;
  return i;
}

/** Read a JS `'...'` / `"..."` string, including `'a' + "b"` concatenation. */
function readQuoted(src, start) {
  let i = skipWs(src, start);
  const quote = src[i];
  if (quote !== "'" && quote !== '"') {
    throw new Error(`Expected quoted string at index ${start}`);
  }
  i += 1;
  let out = '';
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\' && i + 1 < src.length) {
      out += src[i + 1];
      i += 2;
      continue;
    }
    if (ch === quote) {
      i += 1;
      const after = skipWs(src, i);
      if (src[after] === '+') {
        const next = readQuoted(src, after + 1);
        return { value: out + next.value, end: next.end };
      }
      return { value: out, end: i };
    }
    out += ch;
    i += 1;
  }
  throw new Error('Unterminated quoted string in newsData.ts');
}

function readNamedQuotedField(src, name, from) {
  const key = `${name}:`;
  const idx = src.indexOf(key, from);
  if (idx === -1) {
    throw new Error(`Missing ${name}: near index ${from} in newsData.ts`);
  }
  return readQuoted(src, idx + key.length);
}

/**
 * Teaser fields from `allNews` object literals. Skips `content` by locating the
 * indented `date:` / `type:` keys (article bodies do not use that indent).
 */
export function extractNewsItems(src) {
  const items = [];
  const idRe = /^ {4}id:\s*(\d+),/gm;
  let m;
  while ((m = idRe.exec(src)) !== null) {
    const id = Number(m[1]);
    const afterId = m.index + m[0].length;
    const title = readNamedQuotedField(src, 'title', afterId);
    const description = readNamedQuotedField(src, 'description', title.end);

    const rest = src.slice(description.end);
    const dateKey = rest.match(/\r?\n {4}date:/);
    if (!dateKey || dateKey.index === undefined) {
      throw new Error(`Missing date: for news id ${id}`);
    }
    const dateAt = description.end + dateKey.index + dateKey[0].length;
    const date = readQuoted(src, dateAt);

    const typeKey = src.slice(date.end).match(/\r?\n {4}type:/);
    if (!typeKey || typeKey.index === undefined) {
      throw new Error(`Missing type: for news id ${id}`);
    }
    const typeAt = date.end + typeKey.index + typeKey[0].length;
    const type = readQuoted(src, typeAt);

    items.push({
      id,
      title: title.value,
      description: description.value,
      date: date.value,
      type: type.value,
    });
  }
  if (items.length === 0) {
    throw new Error('extractNewsItems: no news items found in newsData.ts');
  }
  return items;
}

export function extractSiteVersion(src) {
  const m = src.match(/export const SITE_VERSION = '([^']+)'/);
  if (!m) throw new Error('SITE_VERSION not found in site.ts');
  return m[1];
}

/** Deterministic `fr-FR` day + short month (avoids ICU NNBSP differences in CI). */
export function formatShellDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid news date: ${iso}`);
  return `${d.getUTCDate()} ${FR_SHORT_MONTHS[d.getUTCMonth()]}`;
}

function tsField(name, value, indent = '    ') {
  const escaped = escapeTs(value);
  const inline = `${indent}${name}: '${escaped}',`;
  if (inline.length <= 100) return inline;
  return `${indent}${name}:\n${indent}  '${escaped}',`;
}

export function renderNewsPreviewTs(teasers) {
  const blocks = teasers.map((item) => {
    const lines = [
      '  {',
      `    id: ${item.id},`,
      tsField('title', item.title),
      tsField('description', item.description),
      tsField('date', item.date),
      tsField('type', item.type),
      '  },',
    ];
    return lines.join('\n');
  });

  return `import type { NewsItem } from './newsTypes';

/** Generated by \`pnpm --filter aniquizz-client sync:news\` from newsData.ts. Do not edit. */
export type NewsPreviewItem = Omit<NewsItem, 'content'>;

export const latestNewsPreview: NewsPreviewItem[] = [
${blocks.join('\n')}
];
`;
}

export function renderAppShellNewsList(teasers, nl = '\n') {
  return teasers
    .map((item) => {
      const title = escapeHtml(item.title);
      const desc = escapeHtml(item.description);
      const date = escapeHtml(formatShellDate(item.date));
      return [
        '                  <article class="app-shell-news-card">',
        '                    <div class="app-shell-news-card-icon" aria-hidden="true">',
        `                      ${ZAP_SVG}`,
        '                    </div>',
        '                    <div class="app-shell-news-card-body">',
        '                      <div class="app-shell-news-card-top">',
        `                        <h3>${title}</h3>`,
        `                        <span class="app-shell-news-card-date">${date}</span>`,
        '                      </div>',
        `                      <p class="app-shell-news-card-desc">${desc}</p>`,
        '                    </div>',
        `                    ${CHEVRON_SVG}`,
        '                  </article>',
      ].join(nl);
    })
    .join(nl);
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function applyAppShell(html, { version, teasers }) {
  const nl = newlineOf(html);
  let next = html.replace(
    /<div class="app-shell-version">[\s\S]*?<\/div>/,
    `<div class="app-shell-version">v${escapeHtml(version)}</div>`,
  );

  const list = renderAppShellNewsList(teasers, nl);
  const wrapped = `${APP_SHELL_NEWS_START}${nl}${list}${nl}                  ${APP_SHELL_NEWS_END}`;

  if (!next.includes(APP_SHELL_NEWS_START) || !next.includes(APP_SHELL_NEWS_END)) {
    throw new Error('index.html missing <!--app-shell-news--> / <!--/app-shell-news--> markers');
  }
  next = next.replace(
    new RegExp(`${escapeRegExp(APP_SHELL_NEWS_START)}[\\s\\S]*?${escapeRegExp(APP_SHELL_NEWS_END)}`),
    wrapped,
  );

  return next;
}

function writeIfChanged(filePath, contents) {
  let prev = null;
  try {
    prev = readFileSync(filePath, 'utf8');
  } catch {
    prev = null;
  }
  if (prev === contents) return false;
  writeFileSync(filePath, contents, 'utf8');
  return true;
}

export function loadNewsTeaserInputs() {
  return {
    newsDataSrc: readFileSync(NEWS_DATA_PATH, 'utf8'),
    siteSrc: readFileSync(SITE_PATH, 'utf8'),
    indexHtml: readFileSync(INDEX_HTML_PATH, 'utf8'),
    previewSrc: (() => {
      try {
        return readFileSync(NEWS_PREVIEW_PATH, 'utf8');
      } catch {
        return '';
      }
    })(),
  };
}

/**
 * @param {{ check?: boolean }} [opts]
 * @returns {{ changed: boolean, teasers: object[], version: string }}
 */
export function syncNewsTeasers(opts = {}) {
  const check = Boolean(opts.check);
  const files = loadNewsTeaserInputs();
  const teasers = extractNewsItems(files.newsDataSrc).slice(0, NEWS_PREVIEW_COUNT);
  const version = extractSiteVersion(files.siteSrc);
  const previewTs = renderNewsPreviewTs(teasers);
  const html = applyAppShell(files.indexHtml, { version, teasers });

  if (check) {
    if (files.previewSrc !== previewTs || files.indexHtml !== html) {
      throw new Error(
        'News teasers are stale (newsPreview.ts / index.html). Run `pnpm --filter aniquizz-client sync:news`.',
      );
    }
    return { changed: false, teasers, version };
  }

  const previewChanged = writeIfChanged(NEWS_PREVIEW_PATH, previewTs);
  const htmlChanged = writeIfChanged(INDEX_HTML_PATH, html);
  return { changed: previewChanged || htmlChanged, teasers, version };
}

function isCli() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

if (isCli()) {
  const check = process.argv.includes('--check');
  try {
    const { changed, version } = syncNewsTeasers({ check });
    if (check) {
      console.log(`news teasers ok (v${version})`);
    } else if (changed) {
      console.log(`synced newsPreview.ts + index.html from newsData.ts (v${version})`);
    } else {
      console.log(`news teasers already in sync (v${version})`);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
