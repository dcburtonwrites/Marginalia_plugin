# Timelines Phase 4 verification · 2026-11-01

Phase 4 supplies the read-only World Snapshot for owner review (D-0059). **v0.20.0** remains the development version; Phase 5 has not started.

| Requirement / rule | Evidence | Result |
| --- | --- | --- |
| Query known state/location at or before T | Snapshot model uses existing stateAt checkpoints; native Atlas is Absent/Harbor at 420 (81 MC), Present/Archive at 425 (86 MC) | Pass |
| Own-date precedence and span-end changes | Model covers own Born -2 and span End 3; native Mira is Present from own Born 412 (73 MC), location Unknown before later dated presence | Pass |
| Unknown differs from absent | Model filters and before-first query tests; native unrecorded entries show Unknown, not Absent | Pass |
| Conflicting locations and effects stay unresolved | Snapshot conflict regression and inherited state tests; browser Orin shows both Observatory and Archive, native Echo shows Archive and Harbor | Pass |
| Stationary locations | Snapshot model/native table retains Stationary location rather than moving a place | Pass |
| No future or undated evidence | Automated source-time assertions and checkpoint list; native recovery event has no evidence at the preceding Lost snapshot; invalid/undated records never create scrubber stops | Pass |
| Date entry and arbitrary time queries | Parser-backed form; automated before/between/after evidence cases; native invalid input shows expected format without changing state | Pass |
| Calendar conversion keeps the same instant | Model day/year calendar conversion; browser 17 MC becomes 1 Emberfall 22 AS with snapshot retained | Pass |
| Scrub and previous/next recorded changes | Binary-search checkpoint tests; native next changes Lost to Found; browser repeated ArrowLeft retains slider focus and changes T | Pass |
| Single default toolbar and requested expansion | Snapshot access sits under View; native compact World Snapshot header/table visually inspected; Back returns to the chart | Pass |
| Filtering and bounded rendering | Model search/type/state cases; dense browser table has 5,024 entries, initially 100 rows, Show more yields 200; scrubbing resets batch to 100 | Pass |
| Native time persistence and guards | Finite native leaf state normalization tests and observed workspace.json snapshot value; existing desktop/World/disable/mobile host tests remain passing | Pass |
| Read-only architecture and note preservation | Package hash check; all 53 baseline Markdown notes unchanged; no writer/new dependency added | Pass |

## Checks

- `npm test`: **264 passing, zero failures** — 177 pure/model tests and 87 host tests, including all prior phases.
- `npm run package`: typecheck and production build pass.
- `npm run preview:build`: passes; production UI tested in the browser.
- `node scripts/verify-mobile-load.mjs`: passes; no Node imports or TimelineFeature mobile startup. [Mobile evidence](mobile-load.json).
- `git diff --check`: passes.
- Native **Obsidian 1.14.5 / macOS**, disposable **Marginalia Test Vault**: View access, snapshot list, own-date precedence, Lost/Found transition, future-evidence exclusion, unknown/stationary/conflicting rows, input error handling, native saved time and layout inspected. Plugin refreshed through Community plugins disable/enable, preserving note contents.
- [Package/native-state evidence](timeline-phase-4-package.json) records file hashes, installed package equality, saved snapshot time and **53 unchanged baseline notes**. No production or creative vault modified.

## Scope and limits

The snapshot is an on-demand body of the existing World Timeline, with the same palette/type and native controls. It builds on the approved mockup's time/state direction and the owner's single-bar refinement. The slider visits exact recorded checkpoints, while the form accepts dates between them or outside the evidence range. A year-only display discloses fractional instants rather than shifting them to a year boundary. Table filters are separate from chart event filters/lane selection, ensuring hidden chart events do not erase world facts.

Only the finite selected time is persisted in native leaf state. Derived facts and table filters remain in memory; sources are existing notes. No automatic playback, travel inference, structured date/calendar editing or new Librarian checks are included. Full app restart and physical mobile interaction were not exercised; native saved-state serialization and packaged mobile guards were verified. Density evidence uses synthetic browser fixtures, not a native-vault performance benchmark.

No unresolved Phase 4 requirements or known failing checks. Review before Phase 5; reserve v0.30.0 for complete feature acceptance.
