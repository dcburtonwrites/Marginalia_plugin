# Real-vault baseline review · October 22, 2026

Tested the unchanged development build in native Obsidian 1.14.4 using isolated copies of **Reanimator**, **Shadowverse** (World), and **Storyboards** (Storyboard). Original vaults had no Marginalia installation; none was added. Copies contain actual Markdown, hidden Markdown artifacts and folder structure, with only Marginalia enabled. Other community plugins, binary assets and Sync behavior were outside this pass. Private source text, generated prose and screenshots were not copied into this repository.

**Result: script recognition and core workflows work; writing quality and several compatibility/navigation details fail acceptance.** No optimization was implemented or trialed. Original Markdown integrity: **267 of 267 files unchanged**, with no new Markdown files in the originals. Only the Shadowverse copy's first Lettering script gained a missing empty Preceded By field automatically. Temporary insertion/source-change tests were restored exactly.

## Script recognition

| Vault | Comic scripts | Page headings / slots | Panels | Result |
| --- | ---: | ---: | ---: | --- |
| Reanimator | 2 | 16 / 16 | 66 | Lotus Prologue followed by Evil Incarnate, Draft 1; no ordering issues |
| Shadowverse | 5 | 39 / 40 | 147 | Lettering Parts 1–5 ordered correctly; Part 3 spread occupies two slots |
| Storyboards | 1 | 11 / 11 | 64 | Manuscript identity and comic-script format recognize Gods Do Die: Web Script, Vision 2 |

Independent source heading/callout inventory agrees with the production parser, and all eight scripts were observed in native Script Studio. Compiled Outputs, templates, prose fragments and published excerpts are correctly excluded. Shadowverse Part 3 declares 6 pages but occupies 8; Gods Do Die declares 19 but contains 11. Native warnings show those discrepancies correctly. Authored explicit Side fields remain authoritative; the page following the double spread is Left. No declared counts were changed. Native Storyboard project-reader Collapse/Expand labels and folding round-trip passed. Native drag delivery was not reaccepted here.

## Librarian timings

Local `gemma4:12b-mlx`, 32,768 context, existing 4,096 output-token limit and temperature 0.2. No model, context, prompt or output-limit optimization was tested. These are sequential real-content samples under normal system activity, not averages or performance guarantees.

| Vault / target | Ask | Entry Enhancement | Entry Expansion |
| --- | ---: | ---: | ---: |
| Reanimator / Herbert West | 13.7 s (appearances) | 34.7 s | 46.4 s to saved result |
| Shadowverse / The Shadow Man; Asylum for expansion | 24.1 s (unresolved details) | 41.7 s | 21.1 s saved / 21.4 s UI ready |
| Storyboards / Conquest Overview | 63.0 s | 39.8 s (repeat unchanged baseline) | 109.2 s saved / 109.6 s UI ready |

Additional measurements: Reanimator Summary refinement **13.6 s**; Shadowverse Location regeneration **13.6 s to save**; legacy artifact rejection **0.5 s**; Storyboard cancellation **0.9 s from Cancel to cleared operation**. Insertion confirmation appeared within 0.8 s. Expansion save times use file modification timestamps relative to action start. Other precise completions were polled through native UI at roughly 0.1–0.2 s resolution, including request preparation and final verification/rendering.

The initial Reanimator established-facts Ask completed between the 16.9 s and 71.1 s observations. The initial Storyboard enhancement was still busy at 45.8 s, then the foreground changed; its finish time was not captured reliably. Its proposals were verified after returning, and the unchanged baseline was repeated for the precise 39.8 s measurement above. The first failed cancellation delivery on Shadowverse became a completed regeneration; it is not counted as a successful cancellation. No timeout was reproduced in the completed baseline requests.

## Requirement → evidence

| Requirement / rule | Evidence | Result |
| --- | --- | --- |
| World pages use real vault content | Native Home, Brainstorms folder tabs, Canon categories and Projects in both World copies | Pass, with RV-06 |
| Storyboard presentation differs | Three-item menu; register stages and Distilling filter; working-document link opens native manuscript | Pass |
| Storyboard shared areas and project stages | Native Home/Projects, Crypt, Research and Collections tabs | Pass |
| Recognize intended scripts and preserve order | All eight native Studio entries; production parser and independent source inventory | Pass |
| Correct page/spread interpretation | Native Part 3 two-slot spread then Left; actual/declared warnings agree with source | Pass |
| Ask, enhancement and expansion execute | Real local generation in all three copies; timings above | Runtime pass; prose not accepted |
| Refinement, Insert, Undo and Dismiss | Refined Summary, native insertion confirmation, one Undo restores copied source bytes; Dismiss removes a pending proposal | Pass |
| Pin and explicit references | Pin retained context across navigation; unpin followed new note; added Ungifted reference shown in Asylum expansion context | Pass |
| Separate generated output and Library | Three new hidden expansions, read-only Generated / Not canon views, source disclosure, Library links | Pass for new format |
| Source freshness | Altered a closed copied source, reopened expansion → stale warning; exact restoration clears warning | Pass |
| Cancellation preserves earlier expansion | Native cancelled status; previous Conquest expansion timestamp/content retained | Pass |
| No generated self-evidence or note instructions as authority | New expansion source inventories contain no dot-folder generated/migration artifacts or AI Agent Instructions note | Pass for sampled packets |
| Original content stays intact | Before/after SHA-256 inventory across all 267 original Markdown files, including hidden artifacts; no new original notes | Pass |
| Existing baseline regressions | 86 core/pure + 31 host tests and typecheck | Pass |

## Issues and limits to address later

- **RV-01 — Grounding:** character enhancement/expansion promoted indirect evidence into unsupported laboratory ownership, motives and legacy claims. Explicit refinement successfully reduced the sampled Summary to a directly supported fact. Successful generation is not quality acceptance.
- **RV-02 — Citations:** Shadowverse Ask produced a wiki target with a `, S2` suffix inside the brackets. This does not identify an original note. The target was inspected without opening it or creating a note.
- **RV-03 — Storyboard writing profile:** project overviews use the existing Lore fallback, producing Causes/Consequences sections rather than a dedicated project brief. Librarian still says “This world” in Storyboard mode. Lore directions exist; these runs did not fail because directions were missing. Neither World copy contains an ordinary Lore entry, so no World Lore note was generated in this pass.
- **RV-04 — Malformed prose:** a Storyboard enhancement sentence was incomplete, and the saved expansion Summary ended mid-sentence despite successful request completion. This needs investigation before accepting the prose.
- **RV-05 — Legacy expansion:** Shadowverse's existing Ungifted standalone artifact lacks the supported draft field. Library omits it; attempting expansion returns “Unsupported or damaged saved expansion. File preserved.” in about 0.5 s. It is not a connection timeout. Artifact bytes remain unchanged; no migration attempted.
- **RV-06 — Projects classification:** Reanimator's `00 Overview` organizational folder appears as a project. Native Projects confirms this false positive.
- **RV-07 — Source metadata:** the two declared Pages discrepancies above are author metadata differences, not missing page headings in the parser. Their global ranges continue to follow declared Pages by the current design.

## Speed and efficiency backlog — notes only

None of the following was implemented, benchmarked or trialed:

1. Add stage timings for snapshot/retrieval, model prefill/generation, source verification and rendering before attributing the longer request to a specific bottleneck. Current measurements are end to end.
2. Consider invalidation-based note/metadata caching or bounded reads: the current snapshot reads permitted notes serially on each request. Preserve dirty editor buffers, original-source fingerprints and cancellation.
3. Consider removing duplicated target/source context and basing requested output length on direct evidence density. The current prompt includes original text plus passages; many indirect passages can trigger a longer writing target despite sparse facts about the subject. This may also affect grounding.
4. Consider updating only progress/status while streaming. Current progress refreshes rebuild the sidebar, repeatedly invalidating native accessibility controls during one cancellation attempt. The successful cancellation used fresh controls within the same action sequence.

Detailed structured evidence: [real-vault-review-2026-10-22.json](real-vault-review-2026-10-22.json). Private review copies and raw local inventory/timing files remain under `/tmp/marginalia-real-vault-review-20261022`; they are not durable backups. Model quality, original-vault community-plugin interactions, binary-media rendering, native drag delivery and hidden-folder Sync portability remain separate acceptance work.
