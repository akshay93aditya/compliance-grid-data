# compliance-grid-data

Federated CKG Commons for [Compliance Grid](https://github.com/akshay93aditya/compliance-grid).

This repository holds the shared, open-data side of the four-layer Compliance Grid architecture: the **accumulating extracted knowledge** (Instruments, Sources, Obligations) that participating operators contribute back via `cg publish` and pull into their local CKGs via `cg pull`.

## What this is

Per `docs/specs/08-federation.md` in the main repo:

- **Source Index** (lives in the main repo at `sources/`) — registry of WHERE the law lives.
- **CKG Commons** (this repo) — WHAT the law says, accumulated from extractions.
- **Org Vault** (per-deployment, local-only) — never reaches this repo. By construction.

## Layout

JSONL files chunked by jurisdiction + domain:

```
<jurisdiction>/<domain>/instruments.jsonl
                       /sources.jsonl
                       /obligations.jsonl
```

One row per line. Field shapes match the canonical Zod schemas in the main repo's `src/schemas/`. Files are append-mode-with-dedupe: `cg publish` merges new rows by id (sorted, for stable diffs).

## How contributions land here

1. An operator runs their pipeline locally and extracts obligations from a source.
2. They run `cg publish` (see main repo's README "Publish to the CKG Commons" section).
3. The publisher opens a PR against this repo with a summary table — counts, jurisdictions touched, confidence distribution, list of source URLs.
4. A maintainer reviews the diff and merges.
5. Other operators get the contribution on their next `cg pull` (which runs daily via `.github/workflows/sync.yml` in the main repo).

## Trust gates

- **Publisher-side**: schema/CHECK constraints (`source_refs.min(1)`) prevent malformed payloads from being opened.
- **Maintainer review**: a human merges this repo's PRs.
- **Receiver-side**: every pulled obligation runs through the local `routeCandidate` gate (D9 confidence + semantic validation). Sub-threshold rows land in the receiver's review queue rather than auto-committing. Provenance (`extracted_by`) rides with the row so reviewers see who supplied it.

See `docs/specs/08-federation.md` in the main repo for the full protocol.

## License

MIT. The same as the main repo. Data here is open data.
