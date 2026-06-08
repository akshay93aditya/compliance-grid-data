<!--
PRs from `cg publish` already follow this shape — its auto-generated body
maps to these sections. If you're authoring this by hand, fill them in.
-->

## Payload

- Extractor: `<github-handle / commons / demo>`
- Jurisdiction(s):
- Domain(s):
- Source URL(s):

## Counts

| | added |
|---|---|
| Obligations | |
| Instruments | |
| Sources | |

## Confidence

Min / max / avg confidence across the obligations in this PR (if known):

## Notes

<!--
- For `cg publish` PRs, the runner fills this in. Edit only if you want to add maintainer-facing context.
- For hand-authored PRs, explain what changed and why. If correcting an earlier extraction, link the row(s) being amended.
-->

## Checklist

- [ ] JSONL files validate locally (`npm run validate` in this repo)
- [ ] All obligations have non-empty `source_refs` (D6 invariant)
- [ ] No Org Vault content (entity profiles / proofs / filings) included — by construction, but worth eyeballing
- [ ] Citations substantiate the obligation summary; no fabricated quotes
