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
- [x] Direct-evidence writing briefs without word-count pressure; label incomplete/unsupported sections and run a separate source review, preserving usable prose and earlier results (D-0046).
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


## Step 4 — Optional writing diagnostics

Skipped by owner (D-0044). No writing-check interface, finding persistence or diagnostics highlighting is planned in this increment.

## Step 5 — Device and release acceptance (D-0044)

- [x] Build/typecheck and 196 automated tests; desktop/workspace/structural/numbering/Librarian/focus/history/Compile/mobile browser regressions and Node-unavailable startup.
- [x] Install verified production files in the authorized Reanimator iCloud vault; back up installed plugin/settings and hash-check original Markdown.
- [x] Native iPhone Mirroring: app/project drawer navigation, Script Studio placement, named page/panel labels, character picker explicit choice/repeated Enter/Cancel/native Undo, hardware-keyboard focus positioning, Compile Group/options/date/byline/script preview and disabled mobile PDF.
- [x] Native iPhone: short timer background/resume, Pause/Reset, session report and CSV export; verify phone-saved settings/history/CSV arrive at the Mac through iCloud.
- [x] Native iPhone Scripts-module shutdown/restoration and desktop 1.14.5 project-reader popout/disclosures.
- [x] Final-build phone reload and persisted-history acceptance; unbound history command opens the retained session.
- [ ] Direct iPhone software keyboard/IME, keyboard resize/rotation, sustained background/lock/termination, long-press structural dragging with Undo, middle-page insertion/deletion and horizontal access to all session-report columns.
- [ ] Physical Android phone/tablet acceptance.
- [ ] Windows/Linux native PDF generation/save/cancel and preview acceptance.
- [ ] Hidden `.marginalia` saved/recovery delivery and opening on a second desktop; ordinary iCloud files/settings arriving is not proof.
- [ ] Wider themes/plugin combinations, user-assigned shortcut conflicts, sustained large-project native profiling and remaining editor/sidebar popout cases.

[Device/release evidence and remaining checklist](verification/device-release-2026-10-25.md). Step 5 is partial until these device/platform checks are completed.


## Compact mobile dialogue picker — reversible trial (D-0045)

- [x] Native bottom sheet with six quick choices, session-only recency and optional full-cast search/custom name.
- [x] Preserve explicit choice, repeated-Enter guard, original source/file checks, Cancel, Dialogue selection, native Undo and desktop dropdown.
- [x] Retain previous source plus installable three-file ZIP; preserve data.json and avoid setting/schema migration.
- [x] 196 tests, package/typecheck; phone/Android/tablet browser behavior and modal-dependent Compile/workspace regressions.
- [x] Native iPhone Mirroring: bottom position, collapsed search, repeated Enter, explicit choice, Dialogue selection, Undo and recent ordering.
- [ ] Direct software-keyboard dismissal/reopening smoothness, search placement above keyboard, IME and physical Android acceptance. Mirroring uses hardware keyboard input.

See verification/dialogue-picker-2026-10-25.md for evidence and rollback instructions.


## October 31 writing and Librarian refinements — D-0046

- [x] Keep incomplete/unsupported sections visible with local warnings; preserve healthy neighboring sections, bounded correction, previous-version recovery and stale-source checks.
- [x] Put Review progress inside the selected action; hide launch buttons while pending Enhancement results occupy the pane.
- [x] Move typewriter top spacing before Properties and verify desktop/mobile positioning.
- [x] Replace sidebar View options with a right-edge hover/tap checkbox menu for descriptions, callouts/notes and dialogue across native editing/Reading and project views; source and Compile unchanged.
- [x] 200 automated tests, typecheck/package, content/focus/Librarian/desktop/structural/mobile/Compile browser checks, mobile-load smoke and native desktop test-vault checks.
- [x] Activate the final packaged test-vault revision; native reload and Reading dialogue hide/restore verified after unlock. Final package hashes and all 34 original Markdown files remain unchanged.
- [ ] Physical mobile acceptance of the new menu/keyboard geometry and wider themes/popouts.

See verification/writing-librarian-2026-10-31.md.

### Storyboard register and display-menu correction · D-0047
- [x] Keep Show content inside the View box.
- [x] Storyboard menu: Home, Project Register, Projects, divider, visible shared folders, native file navigation.
- [x] App-style register totals, four dropdown filters and metadata table, using an optional assigned Base’s first query view.
- [x] No source/Base writes; validate selection, safe missing-source disclosure and native query lifecycle cleanup.
- [x] 202 automated tests, desktop/mobile register and workspace browser checks, native Base-filter refresh and empty-result verification.
- [ ] Physical mobile acceptance of Base-backed mode.

## Timelines · v0.20.0 development → v0.30.0 completion · D-0048–D-0054

Each phase requires verification and owner review before the next phase.

### Timeline Phase 1 — Calendar and date foundation
- [x] Host-independent calendar definitions, signed years/zero, authored precision and shared sort key.
- [x] Parallel calendar anchors, alias/primary resolution and deterministic configuration/date validation.
- [x] World/desktop-only opt-in with non-overwriting default Calendar setup.
- [x] Tracked-field groups/type filters and preferences in existing plugin settings.
- [x] Model/host regressions, settings UI verification and phase evidence for owner review.

[Phase 1 verification and limits](verification/timeline-phase-1-2026-11-01.md). Owner continued into Phase 2 (D-0054).

### Timeline Phase 2 — World Timeline view
- [x] Native main-pane view, reusable tab, ribbon/command/settings access and World/desktop lifecycle guards.
- [x] Location selection/grouping/order, unknown/multiple lanes, point precision ranges and span bars.
- [x] Search, participant type/tag/shared-project filters, zoom/pan/Fit, display calendar and selected-event details.
- [x] Related frontmatter-linked script/plot references; guarded native note navigation.
- [x] Read-only undated components, bounded relational placement, unanchored lane and chain diagnostics.
- [x] Heap collision packing, windowed card/row rendering and batched undated/issues lists.
- [x] Automated/model/host/mobile-load checks, browser dense dataset and native disposable-vault interaction/persistence/live refresh; original-note hashes preserved.

[Phase 2 verification and limits](verification/timeline-phase-2-2026-11-01.md). Owner authorized Phase 3 (D-0056).

### Later reviewed phases
- [x] Phase 3: state derivation/precedence, unknown/conflict handling, per-entry timelines and header action (D-0056–D-0057).
- [x] Phase 4: snapshot scrubber/state/location view (D-0059).
- [ ] Phase 5: structured date/calendar editing — **deferred by owner, D-0060**; native property editing remains available.
- [x] Phase 6: evaluate optional Librarian deterministic/LLM integration; document implemented and deferred rules (D-0060).
- [ ] Complete feature acceptance and bump to v0.30.0.

### Timeline Phase 2 refinement — D-0055
- [x] One compact default bar including the title; search/filters and secondary View controls expand on request.
- [x] Active-filter count, mutually exclusive panels, Escape/focus handling and narrow-pane zoom placement.
- [x] Chart-edge hover/keyboard pan arrows; no permanent panning row.
- [x] 239 regression tests, typecheck/package/mobile-load smoke, browser interactions and native disposable-vault layout check.

[Compact toolbar verification](verification/timeline-compact-toolbar-2026-11-01.md). Owner authorized and completed Phase 3 below.


### Timeline Phase 3 — Entry state/location histories · D-0056–D-0057
- [x] Span-end effects, own-field precedence across repeated cycles, corroboration and mismatch provenance.
- [x] Unknown versus absent; simultaneous state/location conflicts; stationary locations and undated non-inference.
- [x] Native per-entry timeline, compact header, calendar display, source links and progressive history loading.
- [x] Header icon beside Librarian, independent module lifecycle, reusable/rename-aware native tabs and disabled/mobile guards.
- [x] Hide the empty selected-event footer while retaining one default World toolbar.
- [x] 259 automated tests, package/mobile-load checks, browser dense history and native disposable-vault acceptance; all 49 baseline notes unchanged.

[Phase 3 verification and limits](verification/timeline-phase-3-2026-11-01.md). Owner authorized Phase 4 (D-0059). Development remains v0.20.0.


### Timeline Phase 4 — Snapshots · D-0059
- [x] Calendar-aware time input and recorded-change scrubber with previous/next navigation.
- [x] State/location table using Phase 3 checkpoints; unknown/absent/conflicts and stationary locations remain explicit.
- [x] Evidence limited to at/before T, entry-history/source navigation, independent table filters and batched rows.
- [x] Native saved snapshot time, calendar conversion without time changes and default single-bar preservation.
- [x] 264 passing automated tests, packaged/mobile-load checks, dense browser interaction and native date/state acceptance; 53 baseline notes unchanged.

[Phase 4 verification and limits](verification/timeline-phase-4-2026-11-01.md). Owner deferred Phase 5 and authorized Phase 6 (D-0060). Version remains v0.20.0.


### Timeline Phase 6 — Librarian integration · D-0060
- [x] Interpret admitted Calendar/event/lifecycle metadata using the same timeline models and existing precedence rules.
- [x] Supply bounded source-linked context to Ask, Enhancement, Expansion, Refine and grounding review; disclose incomplete coverage.
- [x] Show interpreted dates/overrides and existing deterministic diagnostics within Sources consulted.
- [x] Preserve World/desktop opt-in, project/provisional/template/asset boundaries and original-note-only citations.
- [x] Chronology settings invalidate stale results; presentation-only calendar/lane preferences do not.
- [x] 276 automated tests, packaged/mobile-load checks and native local-model birth/unknown-state acceptance; original test-vault notes preserved.
- [x] Publish rule coverage and explicitly deferred lifecycle/age/travel detectors.

[Phase 6 verification and limits](verification/timeline-phase-6-2026-11-01.md). Ready for feature review; Phase 5 remains deferred. Final v0.30.0 acceptance/bump remains pending.


## Librarian Development and Vault Review · D-0061
- [x] Research and document adaptive, author-led development and source-backed AI thinking; distinguish mechanical timeline checks.
- [x] Four-action Review launcher without initial chat; hide alternatives after selection and provide Back to Review.
- [x] Autosaved, resumable multi-session Development, visible/hidden default and per-session destinations, automatic/manual wrap-up and continuation.
- [x] Individually accepted exact-body insertions, replacements and deletions; source/configuration guards and native Undo.
- [x] Scoped batched Vault Review with cross-entry quote comparison, source-supported/possible/opportunity categories, priorities, actions and saved checklists.
- [x] Separate deterministic timeline notices, generated-workspace exclusion and backwards-compatible existing settings/expansion workflows.
- [x] Automated model/storage/controller/host regression, packaging and mobile-load checks.
- [x] Native local-model Development/wrap-up/individual insertion/Undo, scoped report, saved checklist and hidden-session acceptance; all 58 baseline originals preserved.
- [x] Final package native reactivation and saved report/checkbox, hidden session and completed Development reopening verified on 2026-11-02.

[Workflow contract](Librarian-Review-Plan.md) · [Research](verification/librarian-review-research-2026-11-01.md) · [Verification and limits](verification/librarian-review-2026-11-01.md). 301 tests pass. Version remains v0.20.0 pending feature acceptance.


### Librarian storage correction · D-0062
- [x] Vault Review saves only to .marginalia/reviews, with no destination controls; Library opens reports.
- [x] Development retains Brainstorms defaults and its existing preferences/overrides.
- [x] Legacy visible report reads remain supported; subsequent saves create hidden copies without modifying the old note.
- [x] 302 automated tests, package/typecheck/mobile-load checks and browser setup/save/Library-reopen verification pass.

[Storage correction verification](verification/librarian-review-storage-2026-11-02.md).


### Timeline viewport and styled groups · D-0063
- [x] Contained chart and full-card Fit events; arrows centered on visible chart height.
- [x] Horizontal trackpad-style time panning with ordinary vertical lane scrolling.
- [x] Explicit group create/name/style flow, callout-color or neutral bands, membership menus, editing/removal and persisted legacy groups.
- [x] 304 automated tests, package/typecheck/mobile-load checks, browser geometry/gesture/group persistence and native themed group acceptance.

[Verification and limits](verification/timeline-groups-2026-11-02.md). Version remains 0.20.0.


### Swim-lane centering and inline groups · D-0064
- [x] Arrow midpoint follows actual visible location lanes, including sparse/empty windows, resizing and scroll.
- [x] Undated is a separate bottom-aligned, bounded region.
- [x] Inline group textbox, color squares/no-color banding, check/cancel and colored edit buttons.
- [x] Drag/drop lane ordering and cross-group membership, plus keyboard access on drag handles; remove up/down buttons.
- [x] 306 passing tests, package/mobile checks, browser geometry/inline edit/actual drag/save/reload and native sparse-lane/footer acceptance.

[Verification](verification/timeline-inline-groups-2026-11-02.md). Version remains 0.20.0.


### Timeline Canon filter suggestions · D-0065
- [x] Matching Canon dropdown on typing, with name/type/path and bounded results.
- [x] Click and keyboard selection, dismissal, exact identity filtering and free-text fallback.
- [x] 308 passing tests, package/mobile/preview checks and browser/native dropdown/selection acceptance.

[Verification](verification/timeline-canon-filter-2026-11-02.md). Version remains 0.20.0.


### Multiple Canon chips · D-0066
- [x] Multiple unique Canon selections, independently removable chips and match-any event filtering.
- [x] Preserve other filters, exclude selected suggestions and migrate saved single-selection state.
- [x] 310 passing tests, package/mobile/preview checks, browser selection/removal and native two-chip/removal acceptance.

[Verification](verification/timeline-canon-chips-2026-11-02.md). Version remains 0.20.0.


### Threads view · D-0067
- [x] Optional per-tab Threads view preserving location lanes, full participant marker grids and stable identity connections.
- [x] Canon-selected threads, hover/focus highlighting, entry-history navigation, spans and explicit undated/same-time behavior.
- [x] Configurable local image property, initials fallback and remembered per-tab image choice.
- [x] Separate native fixture: 12 dated + 1 undated events, 20 mixed participants occurring 2–5 times, four locations/two groups and ten local icons.
- [x] 316 automated tests, package/typecheck/mobile checks, browser geometry/filter/toggle/focus/navigation and native image/filter/history/tab-retention acceptance.

[Threads contract](Threads-Plan.md) · [Verification and limits](verification/timeline-threads-2026-11-02.md). Version remains 0.20.0; structured editing remains deferred.


### Threads continuation and interaction · D-0068
- [x] Connections continue beyond the current time window, including across lanes and through a window between known occurrences, with no hidden cards or row expansion.
- [x] Compact 44px Threads cards with aligned marker grids and spans.
- [x] Single-click pinned marker/line highlights, double-click history, widened line targets and keyboard/clear behavior.
- [x] 318 passing tests, package/mobile checks, browser offscreen/empty-window/click checks and native Sol Pike close-up/double-click/retained-pin acceptance.

[Verification](verification/timeline-thread-continuation-2026-11-02.md). Version remains 0.20.0.


## Version 0.5.0 release preparation · D-0069
Owner accepted the current Threads work and requested a 0.5 release, superseding earlier 0.20/0.30 target statements above. Structured timeline editing remains deferred.
- [x] Version metadata, MIT license, donation URL, release notes and Community portal submission instructions.
- [x] Verify minified package/regression tests and prepare raw assets, plugin ZIP and checksums.
- [x] Verify the unpublished three-page website on desktop/mobile, internal navigation, donation destination and request validation without sending.
- [ ] Before Community submission: dedicated minimum-version acceptance and public source/release verification; resolve any scanner feedback.
- [ ] Before website launch: owner FormSubmit activation and approved delivery test; Community install flag only after listing approval.
- [ ] Publication/submission: not performed; owner explicitly requested an unpublished website.

[Release verification](verification/release-0.5.0-2026-11-02.md): 318 plugin tests, mobile bundle load, 57 website routes/assets/anchors and 13 simulated form cases pass. Nothing published.
