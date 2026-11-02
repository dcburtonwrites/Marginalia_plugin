# Timelines Phase 3 verification · 2026-11-01

Phase 3 is complete for review under D-0056–D-0057. Development version remains **0.20.0**. Phase 4 has not started.

## Requirement trace

| Requirement / hard rule | Evidence | Result |
| --- | --- | --- |
| Own lifecycle fields override every same-field event occurrence | Model tests for birth mismatch, matching corroboration, repeated Lost/Found cycles and invalid own date; native Mira Born 412 overrides Founding End 415 while retaining both sources | Pass |
| Span effects apply at End | Model endpoint/state tests; native history explicitly shows 410–415 and end-effective effect | Pass |
| Unknown differs from absent; presence does not invent birth | Model before-first-evidence, event-only presence and state query cases; browser Orin and native Echo remain lifecycle unknown | Pass |
| Opposing simultaneous changes remain unresolved | Model tests including both effects in one event and order-independent same-time effects; World effect badges preserve conflicts | Pass |
| Movement records only known event locations; locations stationary | Model simultaneous known/unknown/multiple location cases; native Echo conflict and Archive stationary summary with hosted events | Pass |
| Undated/invalid events never gain state dates | Model tests reject relational-position inference; native Mira Undated row explicitly states no inference | Pass |
| Own date does not replace event presence/location | Model provenance and frames; native Mira retains later Harbor presence alongside authoritative birth | Pass |
| Entry header icon, Librarian independence and native tab identity | Host tests for adjacency, standalone icon lifecycle, template exclusion, reuse, missing source and file/folder rename; native button adjacent to Librarian opens Mira timeline | Pass |
| Compact entry history and on-demand controls | Browser screenshots/interactions: latest state, sources, override, recovery and collapsed View; native summary/history/calendar inspected | Pass |
| Empty World footer hidden until selection | Browser measured hidden footer at zero height, selected footer visible; native World tree has no empty details prompt | Pass |
| Long history remains bounded | Browser 5,007-record entry initially renders 100 rows, Show more renders 200; 3,000-record model checkpoint/input-preservation case | Pass |
| Parallel-calendar display | Model conversion and Calendar lifecycle regressions; native Mortal Count selection converts history dates while retaining states | Pass |
| Live refresh without canonical-note rewriting | Native Atlas transitions Absent/Harbor to Present/Archive after a new recovery event; original 49 notes retain identical hashes | Pass |
| World-only desktop lifecycle, disable and restored views | Host guards and detach/cleanup tests; mobile bundle loads four view factories without starting TimelineFeature or loading Node dependencies | Pass |
| Earlier phase regressions | Complete test suite and packaged mobile smoke | Pass |

## Checks performed

- `npm test`: **259 passing, 0 failures** (172 pure/model tests and 87 host tests).
- `npm run package`: passed; packaged desktop bundle and metadata generated.
- `node scripts/verify-mobile-load.mjs`: passed; [mobile load evidence](mobile-load.json).
- `npm run preview:build`: passed; production World/Entry UI exercised in the browser.
- `git diff --check`: passed.
- Obsidian **1.14.5 on macOS**, disposable **Marginalia Test Vault**: note-header access, birth precedence, live recovery, simultaneous location conflict, stationary location history, calendar switching and empty-footer behavior verified. Final packaged plugin activated through Community plugins disable/enable; final Mira history and meaningful native pane/tab titles verified again.
- [Package and note-preservation evidence](timeline-phase-3-package.json): installed files match `dist/marginalia`; **49 existing Markdown notes unchanged**. Four new fictional native test notes were added. No production/creative vault modified.

## Architecture and scope review

The calendar index, World presentation model, state histories and DOM renderer remain separate from the native Obsidian adapter. State checkpoints are ephemeral; existing plugin settings retain preferences and native leaf state retains entry identity. No new dependency, network service, derived-fact persistence or canonical-note writer was added.

Earlier-phase boundary corrections are covered by regression tests: tracked-field type restrictions recognize raw frontmatter types, Calendar notes can carry own lifecycle dates, and multiple effects on a participant remain authored conflicts rather than last-field wins. The mockup's horizontal location lanes remain in the World view; the per-entry chronological history supplies the Phase 3 state/provenance detail. D-0055/D-0056 govern the compact toolbar and hidden empty footer.

## Limits and next review gate

No snapshot scrubber, structured calendar/date editor or optional Librarian continuity integration is claimed. The core time query is available for Phase 4, but the snapshot UI is not implemented. Full application restart was not exercised; native verification used a safe plugin refresh. Browser density evidence is synthetic and is not a native-vault performance benchmark. Mobile verification is a packaged-load/guard test, consistent with desktop-first scope.

No unresolved Phase 3 questions or known failed checks. Review Phase 3 before starting Phase 4. Reserve v0.30.0 for complete feature acceptance.
