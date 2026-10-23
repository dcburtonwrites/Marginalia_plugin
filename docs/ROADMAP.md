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
- [ ] Move compile/export workflows into Script Studio when the owner starts that increment.
- [x] Local /d dropdown from frontmatter characters, prior speakers and known mentions, preserving existing plain/wiki form (D-0025).
- [x] Configurable script template, folder context action and New Script button below the active sidebar list (D-0028).
- [ ] Page reordering, further navigation commands and export with user-bindable shortcuts; preserve Templater ownership.

The owner explicitly started Phase 4 while Librarian prose quality and hidden-storage portability remain open (D-0007). Predecessor properties are now maintained automatically and determine order (D-0009 supersedes D-0008). Script checks do not imply Librarian quality acceptance. See VERIFICATION.md.


## Phase 7 — App workspace and modular settings
- [x] Inspect actual standalone World/Storyboard pages and palette without modifying creative content.
- [x] Native Home, tabbed Brainstorms/Canon cards, Projects/project folders and Storyboard Project Register.
- [x] Left-aligned core navigation and automatic shared-folder entries below Projects, excluding Assets (D-0023); retain original M Script Studio ribbon.
- [x] Per-vault World/Storyboard presentation, app light/dark colors and independent color/navigation toggles.
- [x] Three collapsible settings sections with immediate Theme/Scripts/Librarian lifecycle switches.
- [x] Core/host/browser regressions and native pages/palette/module checks; all existing fixture notes preserved.

This increment provides browsing and navigation pages, not complete standalone-app feature parity. Script creation copies a configured template (D-0028); executing template code, inline register editing and compile/export remain separate work.


## Phase 7 acceptance follow-up — real-content baseline (D-0022)
- [x] Test World content from Reanimator/Shadowverse and Storyboard content from Storyboards in isolated native copies; record timings and preserve originals.
- [x] Verify all eight script identities/order, pages/spreads, app pages and local Librarian workflow controls.
- [x] Record efficiency proposals without implementing or trialing them, as requested.
- [ ] Resolve/evaluate RV-01–RV-06 prose, citation, Storyboard profile, legacy compatibility and project-classification findings in a later authorized increment.

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
