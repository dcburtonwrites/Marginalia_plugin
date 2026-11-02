# Timelines Phase 6 — Librarian integration · 2026-11-01

Phase 6 is implemented for review under D-0060. The owner deferred Phase 5 structured editing; normal note-property editing remains available. Development version remains **0.20.0**, pending feature acceptance and the v0.30.0 completion bump.

## Requirement trace

| Requirement / rule | Evidence | Result |
| --- | --- | --- |
| Interpret original Calendar/event/lifecycle dates using existing rules | Pure adapter uses existing calendar/index/World/state models; host packet test and real local Ask | Pass |
| Own date wins across every same-field event occurrence | Prior repeated-cycle model regressions plus context inactive-record/mismatch assertions; native Mira Born 412 wins over span End 415 | Pass |
| Respect unknown versus absent; no undated date inference | Context tests retain undated time as absent; native Ask at 411 AS reports unknown state/location | Pass |
| Preserve author precision, parallel alignment and span-end effective dates | Existing date/index/state suite plus context source-key/precision assertions; native records show Highsun 412 AS and span-effective 415 | Pass |
| Expose existing diagnostics and source provenance | Nested Timeline context under Sources consulted: native 7 records, one mismatch, clickable original-note paths and override explanations | Pass |
| Bound facts to admitted original metadata and target text | Tests remove/partially supply metadata; no excluded event facts appear; native raw excerpts remain available alongside interpretation | Pass |
| Preserve project, provisional, hidden, template and asset boundaries | Shared evidence policy plus explicit asset/template tests; host module gates; prior project/retrieval suite remains passing | Pass |
| Calendar context shares budget and cannot invent a fallback primary | Metadata-only retrieval reference test, UTF-8 bounds at 250/500/1,000/3,000 bytes, omission-count assertions, omitted-primary regression | Pass |
| Same interpretation in Ask/writing/refine/source review | Prompt tests for Ask/Enhancement/Expansion and grounding review; Refine uses the same packet/prompt/cleanDraft paths | Pass |
| Coverage and stale-result disclosure | Answer/writing warnings, source disclosure and existing warning callouts; tests for chronology settings changing freshness while display/lane changes do not | Pass |
| Current editor dates win over stale cache | Pure exact-text test and native-host packet test: buffered Born 412 versus cached 400 yields 412 | Pass |
| Preserve write and mobile/runtime boundaries | Host tests assert no note transactions/generated files from packet construction; full regression and packaged mobile load pass | Pass |

## Deterministic rule evaluation

Coverage below describes actual detectors, not everything the model could discuss when asked.

| Rule | Current integration |
| --- | --- |
| Invalid dates/calendars/anchors, ambiguous configuration, mixed Date/Start/End, incomplete/reversed spans, non-event date misuse | Existing foundation diagnostics supplied when represented in admitted evidence |
| Entry/event lifecycle date mismatch | Existing mismatch diagnostic, own field remains authoritative; overridden source retained |
| Undated-chain dangling/branch/cycle/order problems | Existing World diagnostics within admitted evidence; unavailable links are labeled as evidence-limited |
| Simultaneous opposing lifecycle changes or conflicting locations | Existing state diagnostics; no arbitrary winner |
| Missing dates/location, pre-evidence state | Explicit unknown/undated context; not an absence/error detector |
| Died before Born | **Deferred** separate lifecycle-order detector |
| Presence before birth or after death/destruction | **Deferred** lifecycle/presence detector |
| Item presence after Lost without Found | **Deferred** detector; existing state model still applies authored Lost/Found changes |
| Other invalid lifecycle sequences | **Deferred** beyond existing same-instant conflict checks |
| Age calculations, travel time/impossibility, inferred journeys | **Deferred** automatic checks; no travel assumptions derived from sort fractions |
| Entry Alignment convention gaps, Gap Finder, expanded-entry timeline views | **Deferred** |
| LLM assistance | Existing local Ask/writing with timeline policy/context and original-note citations; not a complete continuity proof |

## Verification performed

- `npm test`: **276 passing, zero failures** — 187 pure/model tests and 89 host tests. Includes all prior feature phases and new adversarial timeline/Librarian tests.
- `npm run package`: typecheck and production build pass.
- `node scripts/verify-mobile-load.mjs`: passes; no Node imports at mobile startup, no mobile AI/timeline feature activation. [Mobile evidence](mobile-load.json).
- `git diff --check`: passes.
- Native **Obsidian 1.14.5 / macOS**, disposable **Marginalia Test Vault**, existing local model **gemma4:12b-mlx**, context 32,768: two real Ask requests completed. Birth question answered **412**, explaining own-date precedence over **415**, with original-note citations. At **411 AS**, answer explicitly says state is **unknown** and there is no dated location evidence. These are narrow successful samples, not general model-quality guarantees.
- Native Sources consulted expands to original passages plus interpreted timeline records: own Born 412; Arrival Highsun 412 AS; Founding presence/effect 415 with inactive Born override; later presences; undated record without a date; one source-linked mismatch diagnostic.
- Native plugin activation uses Community plugins disable/enable; no full app reload or source insertion performed. Final package includes the additional omission/asset-boundary guards, backed by regression tests.
- [Package and preservation evidence](timeline-phase-6-package.json): installed test-vault files match the package; **all 53 baseline Markdown notes unchanged**. No creative/production vault modified.

## Architecture and limits

The adapter rebuilds context from the same request originals, never the live feature's broader state index. Raw complete admitted frontmatter and the full target are the only factual inputs. Calendar metadata-only references count against retrieval; timeline summaries are separately bounded within the existing source allocation. Incomplete Calendar coverage withholds date interpretation rather than promoting a secondary calendar. Sources unavailable within the request are not silently consulted.

Timeline records remain ephemeral. Existing source stamps, optional freshness digests, original-note citation guards, explicit insertion and hidden-output warning/recovery paths remain in place; no new output schema, dependency, cloud call, date writer or automatic correction was introduced. Old saved outputs remain readable and can become conservatively stale when the new enabled chronology interpretation changes configuration.

Additional deterministic detectors are explicitly deferred as evaluated above. There is no new standalone continuity-review mode. Native live Enhancement/Expansion quality and every possible local model/calendar combination were not separately sampled here; their transport, prompt, grounding, freshness, insertion and storage paths passed regression tests. Physical mobile remains outside desktop-first acceptance. Phase 5 is deferred, not silently implemented.

Ready for feature review. The completion version bump remains pending acceptance.
