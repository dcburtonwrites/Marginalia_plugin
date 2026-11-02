# Librarian Development and Vault Review

Owner-approved contract · D-0061 · 2026-11-01

## Review entry point

Review opens with four descriptive actions: Entry Enhancement, Entry Expansion, Entry Development and Vault Review. No chat composer or New chat control appears on the initial Review screen. Choosing an action hides the alternatives; Back to Review restores the launcher. Ask remains separate. The Development conversation alone introduces a composer within Review. Library exposes saved developments/reports as well as existing expansions.

## Entry Development

Available on desktop with Librarian enabled in World and Storyboard vaults. Adapt to configured entry type, current original text, linked/nearby material and available timeline context. Use general craft and system-design knowledge for adaptive reasoning and hypothetical questions, never as invented vault facts. There is no prescribed interview sequence. Investigate useful gaps, stakes, incentives, limits, costs, exceptions, dependencies, relationships, consequences and consistency with story usage. Respect intentional mystery, metaphor and soft systems. Missing whereabouts may prompt a useful question but is not absence or a plot hole by itself.

Start/resume separate conversations for an entry. Autosave user input before model generation and save each model reply. Preserve failures for retry. Default destination follows the configured Brainstorms root plus Development. A vault-wide visible/hidden preference and custom folder may be overridden for each new conversation. Hidden sessions use .marginalia/development. Changing preferences does not move existing sessions. Persist only the settings/index in existing plugin storage; transcripts and owned metadata live in their note. Saved conversation and report material is provisional/generated and never external canon evidence.

End Development explicitly summarizes the conversation. The model may also declare a useful stopping point; it then triggers the same wrap-up. Continue Development remains available. The summary distinguishes author choices and unresolved possibilities. Propose individual insertions, replacements and deletions against unique exact original body passages. Each change requires acceptance; never edit frontmatter or generate canonical dates. Verify original sources and configuration before publication/application. Preserve unrelated text and use one native editor transaction per accepted edit with native Undo. Ambiguous/stale edits are withheld rather than guessed. Rebase remaining proposals only over the accepted edit, without adopting intervening external changes.

## Vault Review

Available in both vault types. World defaults to the world; Storyboard defaults to the current project plus shared references. Entire vault is an explicit scope choice. Use eligible original entries/manuscript material, excluding generated workspaces, configured templates, assets, hidden/archive and provisional brainstorming/research material.

Review source text in bounded batches with linked-entry context, followed by comparisons of verified original quotations selected from mapping passes. Cover all primary source characters; disclose supplied-note/pass counts and exclusions. Do not claim all possible cross-entry pairings were checked. Findings must cite exact supplied original quotations. A source-supported contradiction needs at least two distinct supported excerpts and remains an AI judgement; otherwise downgrade to a concern. Missing information/links are opportunities unless actual source evidence conflicts.

Save a Markdown checklist grouped into source-supported contradictions, possible concerns and development opportunities, with priorities, author actions, source evidence and suggested next entries. Reports save only in .marginalia/reviews because their content is AI-generated. Library lists and opens them in the Review reader; there is no report destination setting or per-run location override. Legacy visible reports remain readable, but their next save creates a hidden copy and updates the Library index while preserving the old note. Support marking items complete in the UI or saved Markdown. Preserve manually edited output rather than overwrite it. Source/configuration changes during the run block publication of a completed report. Cancellation does not publish an incomplete review as complete.

## Deterministic versus AI reasoning

Mechanical date/order/state diagnostics remain a separate timeline facility. When available, existing admitted timeline notices appear in their own report section and do not masquerade as AI discoveries. These workflows do not implement the previously deferred mechanical lifecycle/age/travel detectors. AI thinking addresses narrative meaning, causal explanations, character decisions, system/story contradictions and development opportunities, with explicit uncertainty.

## Architecture and validation

Host-independent model, prompt, storage and controller modules live in src/librarian. The existing sidebar and native adapter supply rendering, local generation, source snapshots/freshness, native note creation/process and editor transactions. No cloud runtime, model date writer, new dependency or new global settings store. Owned Markdown saves compare expected bytes and validate ownership; visible replacement uses public vault.process and refuses dirty output-editor buffers. Hidden adapter replacement is guarded/verified but not a cross-process atomic transaction. Development preserves complete transcripts; oversized model requests fail explicitly rather than silently dropping conversation history.

Validation covers storage collisions, malformed/edited output, retry/resume, auto-wrap-up/continue, individually accepted edits, source/configuration freshness, scope separation, evidence quotation, checklist persistence, batching coverage, generated-output exclusion, browser interaction, packaged mobile guards and native local-model acceptance in an isolated pilot vault.
