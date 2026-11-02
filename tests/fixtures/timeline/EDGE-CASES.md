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

Phase 3 adds Atlas, Atlas lost/found and Harbor for Lost/Found state and location history; Echo and its two simultaneous events exercise conflicting locations with unknown lifecycle. Mira/Founding checks own-date precedence and span-end effects. Automated variants add repeated cycles with an own Lost override, malformed own dates, opposing state effects, unknown locations, undated non-inference, type filters and Calendar lifecycle dates. The native recovery event is added as a new note to verify live refresh without editing baseline notes.

Phase 2 native acceptance adds Harbor, Harbor closes (416, preceded by Undated) and Atlas/Atlas lost (420) inside the disposable Timeline Demo. These bound the Undated run and exercise another location/item effect without modifying existing vault notes. The synthetic world preview supplies original Copper Sky fixtures and a 5,000-event density control.


Phase 4 queries these same fixtures at/before own dates and event endpoints: Mira before/at Born, Atlas before loss/at Lost/at Found, Echo at simultaneous conflicting presences, and Archive as stationary. Undated/invalid events never enter scrubber checkpoints. Automated snapshots include empty evidence, signed dates, arbitrary times between changes, filtering, parallel-calendar conversion and future-source exclusion. The synthetic 5,000-event control also verifies snapshot rows load 100 then 200 at a time.


Phase 6 uses these same original notes for Librarian context. Native Ask verifies Born 412 wins over Founding End 415 and that state/location at 411 remain Unknown. Timeline context exposes admitted records and the mismatch under Sources consulted. Separate automated fixtures in tests/timeline-librarian.test.ts attack project/provisional/asset/template exclusion, stale metadata, withheld/truncated frontmatter, context bounds, source identity, conflicts, undated records and chronology-setting freshness. These checks do not claim the deferred age/travel/lifecycle-sequence detectors.
