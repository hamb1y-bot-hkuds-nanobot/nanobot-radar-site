#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';

const ROOT = new URL('../src/content/chronicles/', import.meta.url);
const FILENAME_RE =
  /^(?<date>\d{4}-\d{2}-\d{2})(-issue-(?<issue>\d+))?-(?<slug>[a-z0-9][a-z0-9-]*[a-z0-9])\.md$/;

const errors = [];
const warnings = [];
const seenDates = new Map();

let entries;
try {
  entries = (await readdir(ROOT)).filter((f) => f.endsWith('.md')).sort();
} catch (err) {
  console.error(`Could not read chronicles directory: ${err.message}`);
  process.exit(1);
}

if (entries.length === 0) {
  warnings.push('No chronicle files found.');
}

for (const file of entries) {
  const match = FILENAME_RE.exec(file);
  if (!match) {
    errors.push(
      `${file}: filename must match YYYY-MM-DD[-issue-N]-<slug>.md (lowercase, kebab-case slug)`,
    );
    continue;
  }

  const { date, issue: filenameIssue, slug } = match.groups;

  if (seenDates.has(date)) {
    warnings.push(
      `${file}: same date (${date}) as ${seenDates.get(date)} — consider including -issue-N to disambiguate`,
    );
  } else {
    seenDates.set(date, file);
  }

  const raw = await readFile(join(ROOT.pathname, file), 'utf8');
  const fmMatch = /^---\n([\s\S]*?)\n---/.exec(raw);
  if (!fmMatch) {
    errors.push(`${file}: missing frontmatter block`);
    continue;
  }

  const fm = fmMatch[1];
  const get = (key) => {
    const re = new RegExp(`^${key}:\\s*(.*)$`, 'm');
    const m = fm.match(re);
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
  };

  for (const key of ['title', 'date', 'summary']) {
    if (!get(key)) {
      errors.push(`${file}: missing required frontmatter field "${key}"`);
    }
  }

  const dateInFm = get('date');
  if (dateInFm && dateInFm !== date) {
    errors.push(
      `${file}: frontmatter date "${dateInFm}" does not match filename date "${date}"`,
    );
  }

  const issueInFm = get('issue');
  if (issueInFm) {
    if (!/^\d+$/.test(issueInFm)) {
      errors.push(`${file}: frontmatter issue must be a positive integer`);
    } else if (filenameIssue && filenameIssue !== issueInFm) {
      errors.push(
        `${file}: frontmatter issue ${issueInFm} does not match filename issue ${filenameIssue}`,
      );
    } else if (!filenameIssue) {
      warnings.push(
        `${file}: frontmatter has issue ${issueInFm} but filename is missing -issue-${issueInFm}`,
      );
    }
  }

  if (slug.length > 60) {
    warnings.push(`${file}: slug is ${slug.length} chars; prefer <= 60`);
  }
}

for (const w of warnings) console.warn(`warn: ${w}`);
for (const e of errors) console.error(`error: ${e}`);

if (errors.length > 0) {
  console.error(`\nValidation failed: ${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(1);
}

console.log(
  `Validated ${entries.length} chronicle file(s) (${warnings.length} warning(s)).`,
);
