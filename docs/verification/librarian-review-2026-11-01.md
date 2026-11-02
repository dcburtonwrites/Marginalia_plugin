# Librarian Development and Vault Review verification

2026-11-01 · D-0061 · development package v0.20.0

The approved workflows are implemented. Automated checks and native local-model workflow acceptance passed. The final package was staged into both isolated test vaults. On 2026-11-02, after the Mac was unlocked, native plugin disable/enable successfully reactivated the final package. Library reopened the saved report with its completed checkbox, the hidden active conversation, and the completed Development with transcript, summary and accepted-change history. Both installed package hashes and all 58 original-note hashes still match.

## Requirement trace

| Requirement or rule | Evidence | Result |
| --- | --- | --- |
| Four descriptive Review actions; no initial chat; hide alternatives after selection | Browser production-renderer interaction and native Obsidian launcher/Development | Pass |
| Adaptive development grounded in entry and surrounding sources | Native gemma4:12b-mlx asked about the Tidegate two-operator rule versus Mira opening it alone; prompt fixtures cover type-specific reasoning and intentional ambiguity | Pass |
| Autosave, retry, multiple resumable sessions | Native failed-generation recovery, Library resume across plugin refreshes; controller/storage tests | Pass |
| Visible/hidden default and per-session override | Native visible transcript and separate hidden cancelled session; path/settings tests | Pass |
| Manual/automatic wrap-up and continuation | Native automatic summary after author answer; controller end/continue tests | Pass |
| Individually accepted insert/replace/delete; native Undo | Native insertion accepted and one Undo restored original bytes; exact-body/frontmatter/stale-source tests cover all three edit kinds | Pass |
| World and Storyboard scope, generated-output exclusion | Five-note native World review; project/shared/entire-vault and uncached-generated-metadata tests | Pass |
| Saved prioritized source-linked checklist | Native five-note report, two reasoning passes, exact quotes and checkbox persisted; report validation/decoding tests | Pass |
| AI thinking separate from deterministic checks | Dedicated report section; prompt and controller tests; no new mechanical lifecycle/age/travel detectors | Pass |
| Complete primary-source batching within serialized request bounds | Tests concatenate all original primary text, including Unicode/escaped-control-character edge cases; source evidence and cross-pass coverage disclosed | Pass |
| Preserve source notes and existing workflows | 301 regression tests pass; all 5 pilot and 53 prior test-vault baseline notes match original SHA-256 hashes after Undo | Pass |
| Package, desktop/mobile guard and preview | Typecheck, package, preview build, mobile-load verification and diff whitespace checks pass | Pass |
| Final package native reactivation and saved checklist/session reopening | Native final-package disable/enable and Library resume on 2026-11-02; completed checkbox, hidden session and completed transcript/history restored | Pass |

## Native acceptance details

Obsidian 1.14.5 on macOS used an isolated `Librarian Review Pilot` vault and the existing local Ollama-compatible endpoint with `gemma4:12b-mlx`, context 32768. Only synthetic pilot material was supplied. No creative vault was used. The five original notes describe Mira, Tidegate, a harbor escape, Harbor and a Calendar.

Development saved the author's answer before generation, resumed after plugin refreshes, and automatically produced a summary plus an individually selectable insertion. Accept changed only Mira's body. One native Undo restored the exact original file. The saved conversation retains the historical accepted-change record; Undo does not rewrite conversation history.

The native report covered five notes in five primary parts and two reasoning passes, excluding the generated conversation. It saved three findings and persisted one completed checkbox. Later source changes consolidate repeated evidence sets and suppress suggestions to create entries already present; the historical saved report is preserved. A second Development session used `.marginalia/development` without changing the visible global default and survived cancellation.

The local proxy initially returned malformed JSON, including literal newlines and an incomplete JSON prefix under grammar enforcement. Review generation now validates the expected schema, escapes literal JSON-string control characters where unambiguous, retries the full original task without grammar enforcement for incompatible responses, and permits one bounded serialization repair. Missing content is never fabricated by parsing. Native generation then completed successfully. Normal Ask/Enhancement/Expansion transport formatting remains unchanged.

## Limits

- These checks prove workflow, persistence and source-edit boundaries, not universal editorial accuracy. The live model identified a meaningful system/story conflict but also produced overlapping findings and imperfect prose. Individual acceptance remains required for source changes.
- All primary text is admitted across bounded passes, but verified quotations selected by the model bound later comparisons. Reports do not claim exhaustive pairwise continuity coverage. Sources or configuration changing during a run block completed publication.
- Complete conversation history is preserved. Requests exceeding the configured model context fail explicitly rather than silently discard earlier exchanges. Increasing the configured context increases the available history budget.
- Reports render 50 findings at a time with Show more; the saved report retains all findings. Owned workspaces have an explicit size limit and reject unsupported outside edits rather than overwrite them. Markdown checklist changes are supported.
- Hidden adapter writes use expected-byte checks and verification, not a cross-process atomic transaction. Simultaneous external writers remain unsupported. Visible output opens in reading mode; dirty output editors prevent automatic replacement.
- Timeline thinking may ask about unexplained whereabouts or causal relationships. Missing dates/locations do not establish absence, impossible travel or a plot hole. Previously deferred mechanical detectors and Timeline structured editing remain deferred.

[Package hashes and preserved-note proof](librarian-review-package.json) · [Approved workflow contract](../Librarian-Review-Plan.md) · [Research and primary sources](librarian-review-research-2026-11-01.md).
