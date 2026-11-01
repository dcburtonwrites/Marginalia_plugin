# Timeline fixture index

These are fictional notes for a disposable World vault. Copy the notes into a test vault to inspect native calendar/date checks; do not copy into a creative vault. Enable Timelines after copying to reuse the supplied primary Calendar. No GreekDemo vault exists in this repository, so these fixtures are isolated here.

| Fixture / automated test | Expected behavior | Phase |
| --- | --- | --- |
| Calendar.md / signed years and authored precision tests | Primary day calendar; accepts year/month/day input, zero and negative years | 1 |
| Mortal Count.md / parallel and chained anchor tests | 72 MC = 411 AS; no separate flow of time | 1 |
| Arrival.md / day and month parsing tests | Month precision, first day internally; no fake displayed day | 1 |
| Founding.md / event endpoint index test | Span effective date is End, 415 | 1 |
| Mira.md / lifecycle parsing test | Own Born 412 is parsed independently of the event | 1 |
| Invalid span.md / reversed span test | A deterministic error, no effective date | 1 |
| tests/timeline.test.ts invalid-calendar/anchor/primary/alias cases | Malformed and ambiguous data is diagnosed, not guessed | 1 |
| tests/timeline.test.ts setup cases + tests/host.test.ts | Filename collisions, uncached notes, repeated requests and save failures do not overwrite notes or start an invalid runtime | 1 |
| Undated.md | Date remains absent; predecessor sequence is read-only. Adding a dated successor creates bounded relational placement | 2 |
| Archive.md | Stationary selectable/groupable location lane | 2 |
| Script.md + Plot Point.md | Two related frontmatter references on Arrival, with normal note navigation | 2 |
| Mira.md + Founding.md | Own lifecycle date supersedes event-derived 415, conflict retained | 3 |

Future phase fixtures will add unknown/conflicting state/location and Lost/Found cycles when those derivation rules are implemented. Phase 1 checks do not claim those features work.

Phase 2 native acceptance adds Harbor, Harbor closes (416, preceded by Undated) and Atlas/Atlas lost (420) inside the disposable Timeline Demo. These bound the Undated run and exercise another location/item effect without modifying existing vault notes. The synthetic world preview supplies original Copper Sky fixtures and a 5,000-event density control.
