#!/usr/bin/env node
// Lightweight JSONL schema-lint for compliance-grid-data.
//
// Catches the common failure modes without pulling in the main repo's
// Zod schemas:
//   - non-JSON lines
//   - missing required fields
//   - duplicate ids within a file
//   - confidence outside [0, 1]
//   - empty source_refs (D6 invariant)
//   - files at unexpected paths
//
// For full semantic validation (citation substantiation, etc.), `cg pull`
// re-validates everything through routeCandidate on the receiver side.
// This linter is the cheap, dependency-free first gate.

import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const ROOT = process.argv[2] ?? '.';
const errors = [];
const stats = { files: 0, rows: 0 };

// Required fields per the on-disk publish payload (flat row, mirrors DB
// columns). The pull-side reconstructs the nested instrument_ref from
// instrument_id + section, so we validate the flat shape here.
const REQUIRED = {
  'sources.jsonl': ['id', 'jurisdiction', 'domain', 'url', 'fetch_recipe', 'trust_tier', 'last_seen', 'content_hash'],
  'instruments.jsonl': ['id', 'type', 'title', 'jurisdiction', 'citation'],
  'obligations.jsonl': ['canonical_id', 'instrument_id', 'type', 'summary', 'applicability_conditions', 'frequency', 'deadline_rule', 'proof_types', 'penalty', 'source_refs', 'version', 'confidence'],
};
const ID_FIELD = {
  'sources.jsonl': 'id',
  'instruments.jsonl': 'id',
  'obligations.jsonl': 'canonical_id',
};
const ALLOWED_NAMES = new Set(['sources.jsonl', 'instruments.jsonl', 'obligations.jsonl']);
const ALLOWED_INSTRUMENT_TYPES = new Set(['Act', 'Rule', 'Notification']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
    } else if (entry.isFile() && extname(entry.name) === '.jsonl') {
      await validateFile(path);
    }
  }
}

function pathBucket(rel) {
  // Expect: <juris>/<domain>/<name>
  const parts = rel.split('/');
  if (parts.length !== 3) return null;
  const [jurisdiction, domain, name] = parts;
  if (!ALLOWED_NAMES.has(name)) return null;
  return { jurisdiction, domain, name };
}

async function validateFile(absPath) {
  const rel = relative(ROOT, absPath);
  const bucket = pathBucket(rel);
  if (!bucket) {
    errors.push({ file: rel, msg: `unexpected path; expected <jurisdiction>/<domain>/{sources,instruments,obligations}.jsonl` });
    return;
  }
  stats.files += 1;
  const required = REQUIRED[bucket.name];
  const idField = ID_FIELD[bucket.name];
  const text = await readFile(absPath, 'utf-8');
  const lines = text.split('\n');
  const seenIds = new Set();
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim().length === 0) continue;
    stats.rows += 1;
    let row;
    try {
      row = JSON.parse(line);
    } catch (err) {
      errors.push({ file: rel, line: i + 1, msg: `invalid JSON: ${err.message}` });
      continue;
    }
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
      errors.push({ file: rel, line: i + 1, msg: `row is not a JSON object` });
      continue;
    }
    for (const field of required) {
      if (!(field in row)) {
        errors.push({ file: rel, line: i + 1, msg: `missing required field: ${field}` });
      }
    }
    if (idField in row) {
      const id = row[idField];
      if (typeof id !== 'string' || id.length === 0) {
        errors.push({ file: rel, line: i + 1, msg: `${idField} is not a non-empty string` });
      } else if (seenIds.has(id)) {
        errors.push({ file: rel, line: i + 1, msg: `duplicate ${idField}: ${id}` });
      } else {
        seenIds.add(id);
      }
    }
    if (bucket.name === 'obligations.jsonl') {
      if (Array.isArray(row.source_refs) && row.source_refs.length === 0) {
        errors.push({ file: rel, line: i + 1, msg: `source_refs must be non-empty (D6 invariant)` });
      }
      if (typeof row.confidence === 'number' && (row.confidence < 0 || row.confidence > 1)) {
        errors.push({ file: rel, line: i + 1, msg: `confidence out of range [0,1]: ${row.confidence}` });
      }
    }
    if (bucket.name === 'instruments.jsonl' && row.type !== undefined && !ALLOWED_INSTRUMENT_TYPES.has(row.type)) {
      errors.push({ file: rel, line: i + 1, msg: `instrument.type must be one of ${[...ALLOWED_INSTRUMENT_TYPES].join('|')}, got ${JSON.stringify(row.type)}` });
    }
  }
}

try {
  await stat(ROOT);
} catch {
  console.error(`root not found: ${ROOT}`);
  process.exit(2);
}

await walk(ROOT);

if (errors.length === 0) {
  console.log(`OK: ${stats.files} files, ${stats.rows} rows`);
  process.exit(0);
}

for (const e of errors) {
  const loc = e.line ? `${e.file}:${e.line}` : e.file;
  console.error(`${loc}  ${e.msg}`);
}
console.error(`\n${errors.length} error(s) across ${stats.files} files / ${stats.rows} rows`);
process.exit(1);
