# Build roadmap

## Phase 1 — Librarian foundation and native host
- [x] Desktop plugin compiles and typechecks against the official Obsidian API.
- [x] Selected icons, mockup-aligned sidebar, context, pinning, tabs and settings.
- [x] Loopback-only local Ollama adapter with model selection, failure and cancellation handling.
- [x] Synthetic browser visual/interaction verification on light/dark and narrow panes.

## Phase 2 — Entry workflows
- [x] Source packet retrieval, ambiguity handling, original excerpts and omissions.
- [x] Section enhancement review, refinement, guarded single-transaction insertion and dismissal at the synthetic host boundary. Native undo remains in Phase 3.
- [x] Hidden expansion generation, browsing and source fingerprint staleness at the core/host boundary. Read-only view is implemented; native rendering remains in Phase 3.
- [x] Tests attack path escapes, self-evidence, stale input, malformed output, legacy storage and conflicting writes.

## Phase 3 — Real-host acceptance
- [x] Test build in the authorized disposable Obsidian vault.
- [x] Verify native undo, host placement, light/dark theme rendering and local inference; exact header/sidebar order is controlled by Obsidian.
- [ ] Evaluate prose quality against author expectations; verify hidden storage portability separately.

## Phase 4 — Native script organizer (owner requested)
- [x] Script/page/panel source outline, identities, Side/spread slots, separate declared/actual counts and initial legacy-link diagnostics.
- [x] Direct drag script ordering with authoritative Preceded By fields, automatic missing-field fill and guarded chain updates (D-0009).
- [x] Native page/panel insertion and owned-panel move commands; source-range and synthetic native transaction checks.
- [x] Shared-view browser verification for predecessor drag persistence, conflict repair, separate arrow/name clicks, project reading, dark/light and 300px pane.
- [x] Native acceptance: left placement, file/page/panel navigation, saved order after reload, and actual single-step Undo for script edits.

## Phase 4 follow-up — D-0009 / D-0010
- [x] Automatic predecessor maintenance and guarded rollback checks.
- [x] Remove sidebar Move/Open buttons; arrows disclose and names navigate.
- [x] Continuous project reading view with ordered source scripts.
- [x] Native missing-field fill, predecessor precedence, project rendering/reload and name/arrow checks.
- [ ] Native drag gesture verification: browser drag path passes; native automation pointer delivery is currently unreliable even for built-in Obsidian controls.

## Phase 4 correction — D-0011
- [x] Remove redundant Refresh while retaining native live event subscriptions.
- [x] Fix inferred and newly inserted sides after a spread; verify Opening Page 4 Left in native Obsidian.

## Phase 5 — Script Studio and writing sessions
- [x] One Script Studio sidebar tab with project/grouping menu, scoped outline and footer; opening preserves the main editor (D-0015).
- [x] View options with state-dependent Collapse/Expand controls; Double Spread folds even with the cursor in its body (D-0017).
- [x] Reuse main tab for project/group selection; preserve native script editing and order.
- [x] Bottom sidebar countdown with Start/Pause/Reset, configurable duration and paused restoration.
- [x] Optional daily word count and goals: All projects, Current project, Full vault; per-project targets.
- [x] Local editor delta tracking, Undo/deletions, local-midnight reset and baseline/import exclusions.
- [x] Automated core/host/browser checks and native project/group/footer/settings/typing/reload checks in the disposable vault.

## Phase 6 — Script typing shortcuts
- [x] Inspect the original Marginalia commands and port case-sensitive Enter replacements.
- [x] /P, /p, /d, /t, /c and six note variants, with placeholder focus and protected-context guards.
- [x] Isolated single-step Undo, shared spread-side rule, unchanged native bindings and template execution.
- [x] Automated command/history regressions and native typing, focus, Undo and modified-Enter checks.

## Following script increments
- [x] Add Script Studio compilation button and pop-up (D-0039).
- [x] Local /d dropdown from frontmatter characters, prior speakers and known mentions, preserving existing plain/wiki form (D-0025).
- [x] Configurable script template, folder context action and New Script button below the active sidebar list (D-0028).
- [x] Sidebar page/panel reordering and previous/next navigation commands without default shortcuts (D-0043); compilation/PDF is covered by D-0039/D-0040. Preserve Templater ownership.

The owner explicitly started Phase 4 while Librarian prose quality and hidden-storage portability remain open (D-0007). Predecessor properties are now maintained automatically and determine order (D-0009 supersedes D-0008). Script checks do not imply Librarian quality acceptance. See VERIFICATION.md.


## Phase 7 — App workspace and modular settings
- [x] Inspect actual standalone World/Storyboard pages and palette without modifying creative content.
- [x] Native Home, tabbed Brainstorms/Canon cards, Projects/project folders and Storyboard Project Register.
- [x] Left-aligned core navigation and automatic shared-folder entries below Projects, excluding Assets (D-0023); retain original M Script Studio ribbon.
- [x] Per-vault World/Storyboard presentation, app light/dark colors and independent color/navigation toggles.
- [x] Three collapsible settings sections with immediate Theme/Scripts/Librarian lifecycle switches.
- [x] Core/host/browser regressions and native pages/palette/module checks; all existing fixture notes preserved.

This increment provides browsing and navigation pages, not complete standalone-app feature parity. Script creation copies a configured template (D-0028); executing template code and inline register editing remain separate work.


## Phase 7 acceptance follow-up — real-content baseline (D-0022)
- [x] Test World content from Reanimator/Shadowverse and Storyboard content from Storyboards in isolated native copies; record timings and preserve originals.
- [x] Verify all eight script identities/order, pages/spreads, app pages and local Librarian workflow controls.
- [x] Record efficiency proposals without implementing or trialing them, as requested.
- [ ] Complete author acceptance of RV-01/RV-04 prose after D-0041 safeguards; RV-02 citations and RV-03 writing profile have reliability coverage. RV-05 legacy compatibility and RV-06 project classification remain separate work.

See verification/real-vault-review-2026-10-22.md. Successful runtime checks do not close prose-quality or live-vault interoperability acceptance.


## Phase 7 — Project Status Flow (D-0024)
- [x] Per-vault property selector by name and editable status order under Theme settings.
- [x] Shared ordered tabs/filtering/status labels for Storyboard Projects and Project Register; retain unlisted and missing states.
- [x] Owner defaults, settings persistence, automated and native custom-field/order/reload checks without rewriting notes.


## Phase 7 — Authoring and vault setup (D-0029)
- [x] Double-click one-session countdown edit with active/paused lock, default-preserving Reset and stable clock DOM.
- [x] Searchable Home pinning and Librarian reference dropdown with type filter.
- [x] Sidebar pages closed by default, retaining explicit disclosure state through redraw.
- [x] New Entry on every app page with ordered entry/subtype choices, routing, template matching, project/script creation and safe failure handling.
- [x] Per-vault setup table for canon types, folders/templates, project roots/options and explicit folder creation; owner defaults preserved.
- [x] Vault-item, frontmatter-field and status-value suggestions with typed new-status support.
- [x] Pure/host/browser regressions and native disposable-vault checks; user template, notes, word goal and totals preserved.

## Mobile increment — D-0033
- [x] Permit loading without Node/Electron APIs; preserve desktop AI transport behavior.
- [x] Keep app pages/navigation and Script Studio in native leaves/drawers, with touch layout and controls.
- [x] Route mobile script shortcuts through native CodeMirror transactions; touch character/suggestion selection.
- [x] Skip mobile Librarian startup/actions/networking; explain the limitation and preserve desktop preferences.
- [x] Package/typecheck, core/host regressions, Node-unavailable bundle startup, phone/tablet browser profiles and desktop native reload.
- [ ] Physical iOS/Android acceptance: native file drawer integration, software keyboard/IME, touch dropdowns, Undo, background/resume, vault/settings persistence and sync. This remains required for mobile v1 readiness.

## Phase 7 follow-up — D-0034
- [x] Configurable hidden shared-menu folder list, editable _Assets default, empty-list support and live active-section fallback.
- [x] Pinned Reference/Project selector matches Find an entry size and styling.
- [x] Settings/model migration, World/Storyboard browser coverage, mobile regression and native settings verification.

## Mobile dialogue follow-up — D-0035
- [x] Native mobile character dialog with explicit choices, local search/new name, safe Cancel and no first-result acceptance from repeated Enter.
- [x] Reuse native transaction/Undo, preserve desktop inline picker, reject stale source/file and close on editor destruction.
- [x] Core/host regressions, package/typecheck, mobile bundle smoke, three touch profiles and real-CodeMirror desktop dropdown checks.
- [ ] Confirm on the owner’s actual mobile device; the original missing-tooltip failure was not reproduced in Chromium emulation.


## Optional writing features — D-0036
- [x] Treat existing Groups as draft separation; no separate draft-version implementation.
- [x] Independent, default-off script-focused writing preference and command; native document/Undo preserved.
- [x] Independent, default-off session history, pause/reload restoration, running word deltas and bounded local persistence.
- [x] Session list, rolling 7/30-day reports, CSV export and confirmed clear controls.
- [ ] Physical desktop/mobile acceptance: cursor centering with software keyboard, focus readability, module disable cleanup, timer background/resume and history persistence.

## Compilation and PDF export — D-0039
- [x] Script Studio button and pop-up with progressively disclosed inclusion and Advanced options.
- [x] Group isolation, predecessor order, blocking order errors and explicit content selections (D-0040).
- [x] Independent print document, description/notes/metadata controls, cover, script breaks and calculated numbering.
- [x] Native desktop Letter/A4 PDF generation, actual PDF preview, sheet navigation and guarded save/cancel.
- [x] Mobile compilation options/script preview and explicit desktop-only PDF export.
- [x] Native macOS test-vault PDF/layout/image/long-dialogue/source-integrity and stale-preview checks; model/browser regressions.
- [ ] Physical iOS/Android preview acceptance and Windows/Linux desktop PDF acceptance. EPUB is excluded.

Implementation behavior, limitations and app references: PDF-COMPILE-NOTES.md.


## Automatic script numbering — D-0037
- [x] Number named/unnamed panels per page in outline, Reading view and project reader.
- [x] Derive displayed page numbers from structural order; preserve names and two-slot spreads.
- [x] Use actual slots for downstream group ranges, retaining declared Pages diagnostics.
- [x] Refresh reused native rendered sections after middle insertion/deletion; preserve source/Undo and inline title elements.
- [x] Automated/model/DOM/full browser regressions and native acceptance in Marginalia Test Vault.
- [ ] Confirm physical mobile Reading view numbering/scrolling after edits; source/Live Preview labels remain authored literal text by design.


## Focus scrolling and Librarian access — D-0038
- [x] Measure desktop center/mobile upper-third positions against the visible editor; support first/last lines, typing, resizing and focus cleanup.
- [x] Browser position assertions within 5 px, including a smaller mobile viewport; native desktop typing/Undo in Marginalia Test Vault.
- [x] Restore/add the enabled desktop Librarian tab without focus stealing; reuse deferred views and coalesce creation.
- [x] Add Open Librarian to settings; confirm existing command/header route and open Reanimator sidebar without note edits.
- [ ] Physical iOS/Android software-keyboard and rotation acceptance for the mobile focus target.


## Compilation refinement — D-0040
- [x] Replace presets with Content Selections; all three choices default on for fresh settings.
- [x] Callouts and Notes label; hide empty warning border without hiding real errors.
- [x] Conditional author field, shared editable vault preference and dated title-page subtitle/byline.
- [x] Core/host and phone/tablet browser tests; native menu/PDF inspection in Marginalia Test Vault with unchanged source hashes.


## First Librarian bucket — D-0041
- [x] Project isolation through configured World/Storyboard/custom roots; foreign references cannot bypass it.
- [x] Original-note citation normalization, unresolved-source/incomplete/no-citation/limited-coverage notices and native existing-source navigation.
- [x] Direct-evidence writing briefs without word-count pressure; reject incomplete drafts and add a separate pre-publication source review while preserving earlier results.
- [x] Configured custom types/templates, project overview brief, template freshness and Storyboard labels.
- [x] Core/host/browser regressions and synthetic local-model before/after examples; native Ask/isolation/citation checks in Marginalia Test Vault.
- [ ] Author acceptance of the before/after writing samples and broader real-vault semantic/prose quality. Structural checks are not proof of grounding.

Optional continuity reporting remains outside this reliability increment. Saved-output portability/freshness expansion work remains in the second Librarian bucket.

## Second Librarian bucket — D-0042

- [x] Normalize insertion placeholder spacing and preserve native Undo/CRLF.
- [x] Make legacy/damaged/missing-recoverable outputs visible; retain standalone ownership and read-only fallback.
- [x] Verify a prior plugin recovery copy before replacement and provide guarded explicit restore.
- [x] Test vault-relative saved/recovery bytes after copying to a second local root.
- [x] Detect new/changed possible evidence outside the original source inventory, respecting configured project scope and dirty buffers.
- [x] Reduce repeated native reads and progress/Markdown redraws; measure retrieval/model/render/storage separately in memory.
- [ ] Physical sync delivery of hidden saved/recovery files and reopening on a second desktop. No cloud/account or device test is implied by local copying.

Standalone ownership migration remains explicitly deferred; unsupported original artifacts are preserved and viewable, not rewritten.


## Step 3 — Project organization and script navigation (D-0043)

- [x] Share classification across workspace, creation, Script Studio, writing credit and Librarian; exclude organizational `00 Overview` and honor custom layouts.
- [x] Verify native script drag ordering, reader agreement and persistence after closing/reopening Marginalia Test Vault.
- [x] Add sidebar page/panel drag-and-drop, complete-block ownership, isolated native Undo, dynamic numbering and optional unbound movement/navigation commands. No movement buttons.
- [x] Cache unchanged reads/parsing, coalesce scans, preserve outline DOM for prose edits and reuse unchanged reader articles. Verify with a large synthetic project inventory and browser identity checks.

Physical iOS/Android long-press dragging and native large-project profiling remain part of device/release acceptance, not a claim established by browser emulation.
