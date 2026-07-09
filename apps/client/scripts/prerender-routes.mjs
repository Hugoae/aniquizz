#!/usr/bin/env node
/**
 * Injects crawlable HTML into #root for public routes (post-`vite build`).
 * React replaces this content on hydrate; crawlers without JS still see real text.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, '../dist');
const INDEX = path.join(DIST, 'index.html');

const SITE = 'AniQuizz';
const TAGLINE = 'Blindtest anime en ligne';
const DEFAULT_DESC =
  "Blindtest anime gratuit : devine l'opening ou l'ending, solo ou multijoueur, avec ta liste AniList.";

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractNewsItems() {
  const src = readFileSync(
    path.join(ROOT, '../src/features/news/data/newsData.ts'),
    'utf8',
  );
  const items = [];
  const re =
    /id:\s*(\d+),\s*\n\s*title:\s*'((?:\\'|[^'])*)',\s*\n\s*description:\s*'((?:\\'|[^'])*)',/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    items.push({
      id: Number(m[1]),
      title: m[2].replace(/\\'/g, "'"),
      description: m[3].replace(/\\'/g, "'"),
    });
  }
  return items;
}

function shell(title, body) {
  return `<main id="main-content"><h1>${escapeHtml(title)}</h1>${body}</main>`;
}

function homeBody() {
  return `<p>${escapeHtml(DEFAULT_DESC)}</p><p>${escapeHtml(TAGLINE)}</p>`;
}

function newsBody() {
  const items = extractNewsItems();
  const list = items
    .map(
      (n) =>
        `<article><h2>${escapeHtml(n.title)}</h2><p>${escapeHtml(n.description)}</p></article>`,
    )
    .join('');
  return `<p>Actualités et feuille de route ${SITE}.</p>${list || ''}`;
}

function comingSoonBody(label, blurb) {
  return `<p>${escapeHtml(blurb)}</p><p>${escapeHtml(label)} — bientôt disponible sur ${SITE}.</p>`;
}

function legalBody(intro) {
  return `<p>${escapeHtml(intro)}</p>`;
}

const ROUTES = {
  '/': { title: SITE, body: homeBody() },
  '/news': { title: `Actus · ${SITE}`, body: newsBody() },
  '/leaderboard': {
    title: `Classement · ${SITE}`,
    body: comingSoonBody('Classement global', 'Classements par niveau, victoires et précision.'),
  },
  '/library': {
    title: `Librairie · ${SITE}`,
    body: comingSoonBody('Librairie musicale', 'Catalogue des openings et endings.'),
  },
  '/legal/confidentialite': {
    title: `Confidentialité · ${SITE}`,
    body: legalBody('Politique de confidentialité et protection des données personnelles (RGPD).'),
  },
  '/legal/cgu': {
    title: `CGU · ${SITE}`,
    body: legalBody("Conditions générales d'utilisation du service."),
  },
  '/legal/mentions': {
    title: `Mentions légales · ${SITE}`,
    body: legalBody("Informations légales sur l'éditeur et l'hébergement."),
  },
};

function injectRoot(html, inner) {
  return html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${inner}</div>`);
}

const templateHtml = readFileSync(INDEX, 'utf8');
if (!templateHtml.includes('id="root"')) {
  console.error('dist/index.html missing #root — run vite build first.');
  process.exit(1);
}

function writeRoute(routePath, content) {
  const html = injectRoot(templateHtml, content);
  if (routePath === '/') {
    writeFileSync(INDEX, html, 'utf8');
    console.log('prerender / → dist/index.html');
    return;
  }
  const dir = path.join(DIST, routePath.slice(1));
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  console.log(`prerender ${routePath} → dist${routePath}/index.html`);
}

for (const [route, { title, body }] of Object.entries(ROUTES)) {
  writeRoute(route, shell(title, body));
}

console.log('Prerender complete.');
