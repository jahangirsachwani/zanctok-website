/*
 * Zanctok website builder — no dependencies.
 * Assembles src/pages/*.html with shared partials into site/.
 *
 *   node build.js
 *
 * Each page starts with a meta comment block:
 *   <!--
 *   title: Page title
 *   description: Meta description
 *   nav: home|about|manufacturing|quality|certifications|distribution|products|contact
 *   -->
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'site');
const SITE_URL = 'https://www.zanctok.com';

const partial = (name) => fs.readFileSync(path.join(SRC, 'partials', name), 'utf8');
const head = partial('head.html');
const header = partial('header.html');
const footer = partial('footer.html');

const pages = fs.readdirSync(path.join(SRC, 'pages')).filter((f) => f.endsWith('.html'));
const sitemap = [];

for (const file of pages) {
  let raw = fs.readFileSync(path.join(SRC, 'pages', file), 'utf8');
  const meta = {};
  raw = raw.replace(/^<!--([\s\S]*?)-->\s*/, (_, block) => {
    block.split('\n').forEach((line) => {
      const m = line.match(/^\s*([a-z]+):\s*(.*)$/i);
      if (m) meta[m[1]] = m[2].trim();
    });
    return '';
  });

  const url = file === 'index.html' ? '/' : '/' + file;
  const vars = {
    title: meta.title || 'Zanctok Pharmaceutical Laboratories',
    description: meta.description || '',
    canonical: SITE_URL + url,
    nav: meta.nav || '',
    year: new Date().getFullYear(),
    // pages served from any URL depth (e.g. 404) need a root base so relative assets resolve
    base: meta.base ? `<base href="${meta.base}">` : '',
  };

  let html = head + header + raw + footer;
  html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
  // mark active nav item
  if (vars.nav) {
    html = html.replace(new RegExp(`data-nav="${vars.nav}"`, 'g'), `data-nav="${vars.nav}" aria-current="page"`);
  }
  fs.writeFileSync(path.join(OUT, file), html);
  if (meta.sitemap !== 'no') sitemap.push(SITE_URL + url);
  console.log('built', file);
}

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(
  path.join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    sitemap.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
    `\n</urlset>\n`
);
console.log('built sitemap.xml (' + sitemap.length + ' urls)');
