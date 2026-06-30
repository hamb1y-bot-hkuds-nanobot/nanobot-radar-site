#!/usr/bin/env node
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url);
let pass = 0;
let fail = 0;

function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  ok  ${name}`);
  } else {
    fail++;
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
  }
}

async function read(...parts) {
  return readFile(join(DIST.pathname, ...parts), 'utf8');
}

async function exists(...parts) {
  try {
    await stat(join(DIST.pathname, ...parts));
    return true;
  } catch {
    return false;
  }
}

console.log('# End-to-end smoke test');

await stat(DIST.pathname).then(
  () => check('dist/ exists', true),
  () => {
    check('dist/ exists', false, 'run `bun run build` first');
    process.exit(1);
  },
);

const home = await read('index.html');
console.log('\nhomepage /');
check('has <title>', /<title>[^<]+<\/title>/.test(home));
check('has brand "Nanobot Radar"', home.includes('Nanobot Radar'));
check(
  'shows bot username',
  home.includes('hamb1y-bot-hkuds-nanobot'),
  'expected footer/hero reference to bot username',
);
check(
  'has primary CTA "Read the Chronicles"',
  home.includes('Read the Chronicles'),
);
check(
  'has secondary CTA "View Bot on GitHub"',
  home.includes('View Bot on GitHub'),
);
check(
  'has feature card "Repository Radar"',
  home.includes('Repository Radar'),
);
check(
  'has section "Latest chronicles"',
  home.includes('Latest chronicles'),
);
check(
  'has Google Sans Flex @font-face',
  /@font-face[\s\S]*Google Sans Flex[\s\S]*woff2/.test(home) ||
    /Google Sans Flex/.test(home) ||
    (await (async () => {
      try {
        const cssDir = join(DIST.pathname, '_astro');
        const files = await readdir(cssDir);
        for (const f of files) {
          if (!f.endsWith('.css')) continue;
          const css = await readFile(join(cssDir, f), 'utf8');
          if (
            /@font-face[\s\S]*Google Sans Flex[\s\S]*woff2/.test(css) ||
            /google-sans-flex-latin\.woff2/.test(css)
          ) {
            return true;
          }
        }
        return false;
      } catch {
        return false;
      }
    })()) ||
    false,
);
check(
  'references local font assets',
  /\/fonts\/google-sans-flex-latin\.woff2/.test(home) ||
    (await exists('fonts/google-sans-flex-latin.woff2')),
  'latin subset should be served from /fonts/',
);
check(
  'links to favicon.svg',
  /href="\/favicon\.svg"/.test(home),
);
check('has descriptive meta', /<meta name="description"/.test(home));

const chroniclesIndex = await read('chronicles/index.html');
console.log('\nchronicles /chronicles');
check('index page exists', true);
check(
  'lists at least one chronicle card',
  /chronicle-card/.test(chroniclesIndex),
);
check(
  'shows date for the sample entry',
  chroniclesIndex.includes('Jun') || chroniclesIndex.includes('June'),
);

const resolved = [];
for (const d of await readdir(join(DIST.pathname, 'chronicles'))) {
  if ((await stat(join(DIST.pathname, 'chronicles', d))).isDirectory()) {
    resolved.push(d);
  }
}

check('at least one slug page built', resolved.length >= 1);
for (const slug of resolved) {
  const html = await read('chronicles', slug, 'index.html');
  console.log(`\nchronicle /chronicles/${slug}`);
  check('has prose article', /<article class="prose">/.test(html));
  check('has <h1> title', /<article class="prose">[\s\S]*<h1>/.test(html));
  check(
    'has issue link to HKUDS/nanobot',
    /github\.com\/HKUDS\/nanobot\/issues\/\d+/.test(html),
  );
  check(
    'contains body content (h2 or p)',
    /<h2/.test(html) || /<p/.test(html),
  );
  check('back link to /chronicles', /href="\/chronicles"/.test(html));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
