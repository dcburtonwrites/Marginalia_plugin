# Timelines Phase 1 verification · 2026-11-01

Version: 0.20.0. Completed feature target: 0.30.0. This increment implements calendar/date foundations, not the visual timeline or state/snapshot views.

## Requirement evidence

| Requirement / rule | Evidence | Result |
| --- | --- | --- |
| Signed years, year zero, no epoch/direction | timeline.test.ts default calendar cases | Pass |
| Lower precision begins at unit one and preserves authored display precision | year/month/day and declared-format tests, including negative full-day roundtrip | Pass |
| Uniform month/day units on a shared year-based key | month/date and parallel-calendar tests | Pass |
| Whole-year anchors chain; dangling/cyclic/subyear anchors cannot produce dates | parallel, chained and invalid anchor tests | Pass |
| Ambiguous aliases and missing/conflicting primary flags do not choose alphabetically | primary and alias tests; explicit primary choice | Pass |
| Point/span date validation and span-end effective instant | index tests including zero date, incomplete/reversed/mixed/invalid spans | Pass |
| Self lifecycle dates and optional entry-type filters | lifecycle index and settings normalization tests | Pass |
| World/desktop-only, independent of Theme/Librarian | host gating/lifecycle tests; browser World/Storyboard switch | Pass |
| Default Calendar creation never overwrites notes | setup collision/reuse/error tests, host uncached-calendar race test | Pass |
| Concurrent setup and failed saves do not activate a failed feature | host enable/save/concurrency tests | Pass |
| Settings persist alongside existing workspace/writing/AI data | host settings persistence and timeline enable tests | Pass |
| Open source buffers override stale cache; validation is read-only | host editor/date test, zero editor transactions | Pass |
| Feature teardown cancels scheduled indexing | host lifecycle test after timer deadline | Pass |
| Native-style settings controls, custom fields/type filters, calendar navigation, errors, disable/re-enable | Synthetic browser preview: enable, add Summoned, set Character filter, open Calendar, inject reversed span, Storyboard unavailability, disable/re-enable retaining Summoned; dark screenshot inspected, light DOM inspected | Pass at synthetic boundary |
| Build remains compatible with mobile startup despite desktop timeline gate | verify-mobile-load.mjs on production bundle | Pass |
| Existing regressions | npm test: 141 pure/model tests + 80 host tests, 221 total, zero failures | Pass |
| Production typecheck/build/package and version consistency | npm run package; dist/marginalia manifest 0.20.0; git diff --check | Pass |

## Deliverables

- `src/timeline/`: pure settings/calendar/date/index/setup modules; thin native feature/settings layer.
- `tests/timeline.test.ts` and five additional host tests, included in normal test/typecheck workflows where applicable.
- `tests/fixtures/timeline/`: fictional Calendar, parallel notation, lifecycle, span, location, partial/undated and intentional-error notes, with EDGE-CASES.md.
- Reusable synthetic settings preview at `.preview/timeline.html`, built by `npm run preview:build`.
- Updated Timeline-Plan, Product, Architecture, Roadmap and decisions D-0048–D-0053.
- Installable development files under `dist/marginalia`; no vault installation performed in this increment.

## Limits and next gate

Browser verification uses production settings code with a synthetic Obsidian adapter. It is not native Obsidian UI acceptance or sync/device evidence. Metadata-only indexing relies on the native cache for closed notes; open-buffer YAML errors and uncached files encountered during explicit setup are parsed directly. Successfully created Calendar notes remain if the later settings save fails; they are not deleted.

No visual timeline, entry header action, participant/state derivation, snapshots, date/calendar forms or Librarian continuity integration is claimed by this phase. Their implementation follows the separate review gates. Event predecessor fields and existing authored notes are never rewritten. The only new note writer is explicit default-calendar setup.

No new dependencies, network calls, settings sidecars, production-vault changes or standalone-app changes. Existing unrelated device/Librarian acceptance items remain open.

Phase 1 is ready for owner review before Phase 2 begins.
