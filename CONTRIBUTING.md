# Contributing to compliance-grid-data

This is the **Commons** half of [Compliance Grid](https://github.com/akshay93aditya/compliance-grid). The code that produces the data lives in the main repo; this repo accumulates what was extracted.

## The two ways to contribute

### 1. Via `cg publish` (recommended)

If you've been running the Compliance Grid pipeline against a regulator, your local Postgres has obligations marked `published_at IS NULL`. Push them to the Commons:

```bash
# From a checkout of the MAIN repo, not this one
export DATABASE_URL=postgres://...
export COMPLIANCE_GRID_DATA_REMOTE=git@github.com:akshay93aditya/compliance-grid-data.git
export COMPLIANCE_GRID_DATA_WORKSPACE=/tmp/cg-data
export PUBLISH_EXTRACTED_BY=<your-github-handle>
npm run publish
```

`cg publish` will:

1. Partition unpublished rows into `(jurisdiction, domain)` buckets.
2. Clone this repo into the workspace.
3. Merge the new rows into `<jurisdiction>/<domain>/{sources,instruments,obligations}.jsonl` (dedup by id, sorted for stable diffs).
4. Commit on a branch, push, and open a PR here via `gh`.
5. After the maintainer merges, your next `npm run publish` knows not to re-emit them.

External contributors (no write access to this repo): see "Fork-PR flow" below.

### 2. Hand-authored PR

For one-off corrections (typo in an instrument title, broken citation, mis-categorised obligation), you can edit the JSONL directly and open a PR. Be aware:

- Files are **sorted by id, one row per line**. Insert your changed row in the right position.
- The schema-lint CI will reject malformed JSON, missing required fields, or rows that fail the receiver-side validation gates.
- Use the PR template — describe the source of the correction.

## Fork-PR flow (external contributors)

Until the main repo's `cg publish` learns native fork-PR support, this is the path:

1. **Fork** this repo on GitHub.
2. Point your publish env at your fork:
   ```bash
   export COMPLIANCE_GRID_DATA_REMOTE=git@github.com:<your-handle>/compliance-grid-data.git
   ```
3. Run `cg publish` — it'll open a PR in your fork (against your fork's `main`).
4. Manually open a PR from your fork's branch to upstream's `main` via the GitHub UI.

Yes, this is awkward. It's tracked: <https://github.com/akshay93aditya/compliance-grid/issues> (look for the publish.ts fork-PR issue).

## File layout

```
<jurisdiction>/<domain>/sources.jsonl       # rows from src/schemas/source.ts
<jurisdiction>/<domain>/instruments.jsonl   # rows from src/schemas/instrument.ts
<jurisdiction>/<domain>/obligations.jsonl   # rows from src/schemas/obligation.ts
```

- `<jurisdiction>` is the ISO-3166 / OGC-style code used in the main repo's Source Index (`IN-KA`, `IN-DL`, `UK`, …).
- `<domain>` is a short slug (`labour`, `gazette`, `tax`, …) — see existing buckets for the established list.

## What gets rejected at lint

- Non-JSON lines.
- Missing required fields per the canonical Zod schemas (`id`, `canonical_id`, `instrument_ref`, etc.).
- Obligations with empty `source_refs` (D6 invariant — every obligation must cite its source).
- Duplicate ids within a file.
- Files at unexpected paths (anything outside `<juris>/<domain>/*.jsonl`).

## What gets rejected at review

- Citations that don't substantiate the claim (`summary` invents text not present in the source PDF).
- Confidence below the local threshold without a reviewer note explaining why.
- Bulk imports from a non-primary source (we accept only `trust_tier: govt-portal` sources for v1).

## License

By contributing, you agree to dedicate your contribution to the public domain under [CC0-1.0](LICENSE).

## Trust

Compliance Grid is a community-extending project, not a self-extending one. Maintainer review is the trust gate. We trust contributors; we verify the data.
