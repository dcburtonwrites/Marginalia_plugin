# Project handoff — October 21, 2026

## Current request and status

The user explicitly requested a separate “Marginalia Plugin” Codex project with build folder `/Users/dante/Documents/GitHub/ai/Marginalia_plugin`. The icon directions have now been explicitly selected: B (Knowledge lantern) for Librarian and F (Winged M + nib) for Marginalia. This approves those directions, not the earlier book+nib+star proposal. The user has approved desktop/local scope and asked to follow the prior mockup. Initial Librarian implementation and installation in a disposable test vault are authorized. The corrected development build is installed in `.preview/Marginalia Test Vault`; native functional checks have passed, while prose quality remains unaccepted. This is an Obsidian plugin, not a Codex/ChatGPT MCP plugin.

## Agreed direction

- Bring Marginalia abilities into Obsidian instead of reproducing Obsidian in the standalone app.
- Recommended direction discussed: Marginalia owns its script organizer, borrowing Longform's organization and preserving native Obsidian editing. Longform is an optional reference/experiment, not a mandatory dependency or selected order authority.
- Preserve Templater, user templates, hotkeys and native editing/navigation/reference panes.
- Existing standalone app source: `/Users/dante/Documents/GitHub/ai/Marginalia_codex`. Its app-specific domain/Librarian TypeScript and generic vault-engine may be reusable. Rust/Swift/Tauri storage, inference, printing and TipTap integration need host adaptations; this is not a direct repackage.
- Do not move or modify the standalone app or creative vault as part of project setup. Do not copy entire private vault contents into this repository.

## Priority: Librarian

The user explicitly says Entry Enhancement and Entry Expansion are the TWO MOST IMPORTANT FEATURES. Do not treat them as later generic AI extras behind script work. Earlier advice suggested scripts first; this priority supersedes that emphasis. Plan the initial build around preserving these two workflows.

The user liked the supplied Obsidian screenshot concept: a Librarian tab immediately beside Source Control in the right sidebar selector; another matching icon in the active note header between view/edit and ellipsis, if supported. Right sidebar owns Librarian-related work. Concept shows Ask / Review / Library, active-note context, pin context, scope, references, local status, actions and composer. It is a design mockup, not a functioning plugin or evidence of readiness.

Refinement after the image: prominent Entry Enhancement and Entry Expansion actions directly beneath context in the Review tab only (the owner’s latest layout decision). Keep exact names instead of hiding them behind chat or “Suggest additions.” Ask handles conversation/refinement; Review handles enhancement suggestions/findings; Library browses saved expansions and sources. New chat/context pinning behavior and per-note result navigation need specification.

### Entry Enhancement

Improve the current canonical entry with selected, human-reviewed additions; never a full automatic rewrite. Retrieve the entry, incoming/outgoing links, script frontmatter references and explicit names/aliases with adjacent same-page scene context and bounded lore support. Nearly empty entry bodies can still have rich external evidence. Follow actual entry/template sections and canon-type/subtype guidance. Produce finished proposed prose, not just instructions to the writer. Keep supporting excerpts and consulted-source inventory inspectable; consulted sources do not establish sentence-level verification.

Review section suggestions with Insert into note and Dismiss. In native Obsidian, Insert is the approval and undoable editor action because editing normally autosaves; do not promise a separate Marginalia Save step. Existing suggestions are session-only, reopenable during that session. Persisting recoverable suggestions would be a new decision, not accepted parity. User can ask to refine a pending suggestion before insertion. Separate creative invention from evidence-based enhancement; do not invent missing backstory by default.

### Entry Expansion — storage explicitly agreed

A separate holistic, supported synthesis of everything the vault establishes about an entry. Original remains concise and untouched. Merge repeated information, respect identities, chronology, source status and uncertainty, omit unsupported sections and filler. Not speculative invention.

KEEP `.marginalia/expanded/<relative entry path>.md`, e.g. `.marginalia/expanded/02 Character/Herbert West.md`. User explicitly agreed. Obsidian hides dot-folder files from ordinary note/file/index APIs; use its adapter to read/write hidden storage. Browse via Librarian > Library > Expansions or current-note action. Render in a plugin-owned read-only main tab/split, with Generated / Not canon label, original-entry link, source inventory, generated time and Regenerate action. Track source changes/staleness. Preserve regenerate-only behavior, exclude generated expansions from canonical retrieval (no self-evidence feedback) and ordinary note search/graph by keeping hidden. Optional export as ordinary note is a separate explicit action/copy, not conversion of the stored original.

Hidden-folder sync is UNVERIFIED; vault-local placement does not guarantee Obsidian Sync includes it. Decide and test portability/sync separately. Current artifact schemas and migration compatibility need inspection before writing old `.marginalia` data. Do not let the plugin and standalone app race over storage.

### Runtime

Local-first and source-grounded. Deterministic checks/retrieval separate from model generation. The user has now approved desktop Obsidian and local Ollama as the starting scope, with selectable local model. Cloud and mobile are deferred. Model availability, context budgeting and performance require implementation validation. Existing embedded Rust/Swift inference cannot simply run in mobile Obsidian; mobile lacks Node/Electron APIs. Do not promise full mobile model parity. Preserve original evidence, source-role attribution and omission disclosure.

## Scripts

User knows Longform and understands proposed script organization; avoid repeatedly explaining it. Keep current script notes as files; represent page/panel children as virtual outline items. Preserve Group. Per D-0009 (superseding D-0008), Preceded By determines order and is automatically filled when missing; drag updates the complete predecessor chain. Existing Followed By fields are compatibility projections, not a second authority. Old plugin order is only a migration/tie seed. Per D-0010, arrows disclose, names navigate, and project names open all scripts in order in a read-only project view. Preserve declared Pages versus actual slots, per-page Side and two-slot Double Spread. Panel numbering resets each page, display-only, preserves authored titles. Reordering must move owned dialogue/notes/location overrides with panels. Flag cycles, missing links and incompatible claims.

Exact case-sensitive structuring commands on Enter: `/P` page; `/p` panel; `/d` dialogue; `/t` title/display; `/c` note; `/cn`, `/ct`, `/cw`, `/cd`, `/cs`, `/ce` subtype variants. Appropriate cursor focus, one-step undo; avoid ordinary-note/code/frontmatter interception. Speaker completion from script Characters and prior speakers; links opt-in. Native commands for navigation/create/move/export with user-bindable shortcuts. Never give Longform and predecessor links independent simultaneous ordering authority. Group is not necessarily a formal alternate draft.

## Reanimator audit snapshot

Vault: `/Users/dante/Library/Mobile Documents/iCloud~md~obsidian/Documents/Reanimator`; inspected running Obsidian 1.14.4. User installed Longform 2.1.0 during research. No destructive/live-note mutation testing occurred.

World structure: `00 Brainstorms`, numbered Canon folders, `08 Projects` including Lotus/Orthrus/Bardo, `_templates` with 13 templates; attachment setting `Assets/Attachments`.

Templater 2.25.0 uses `_templates`, configured folder matching for Canon/Brainstorms. Affiliation/System templates execute subtype prompts; Plot offers Three-Act/Five-Act/Kishōtenketsu/Save the Cat/Custom with name/count. Preserve true Templater execution rather than standalone app's restricted interpreter. Creation rules were inspected, not executed.

Shortcut convention: Command+Option+type key creates; Command+Control+type key inserts. B brainstorm, A affiliation, C character, E event, I item, L location, O lore, S system, P plot point, Shift+P plot, R project parent. Project Note create uses backtick, insert uses N. Command+Option+' template creation chooser; Command+Option+T insert chooser; Command+Option+Control+T evaluate/replace; Command+M manual Auto Note Mover; Command+Shift+G local graph. System already uses Command+Option+S, so do not assign it to Script. Stale Project.md R bindings remain alongside actual Project Parent.md bindings; stale config is not proof of live conflict.

Auto Note Mover is MANUAL, tag-based, excludes projects/templates; do not add competing autofiling. Other installed plugins at initial inventory: Recent Files, Note Count, Iconize, Paste image rename, Tag Wrangler, Git. Core features include links/search/outline/properties/Bases/file recovery/Sync; enabled Sync/Git is not proof of healthy backups/synchronization.

`Lotus Prologue.md`: Group Initial Drafts, declared Pages 4, 4 page headings, 12 panels. `Evil Incarnate, Draft 1.md`: same Group, predecessor Lotus Prologue, Pages 12, 12 headings, 54 panels. Current numbering ranges 1–4 and 5–16. Keep private content outside test repo; use synthetic fixtures or explicitly authorized disposable copies.

Script template is not registered for Templater hotkeys/folder rules, uses legacy Followed By/Pages 6/capital Tags. Existing scripts use lowercase tags and predecessor links. Enabled `comic-page-panel-autonumber` CSS counts H1 but actual page headings are H2, with broad panel selectors and reading-only behavior; replace responsibility carefully without duplicate counters.

## Icon directions selected — October 21, 2026

Approved standalone logo: open book with fountain-pen nib at bottom center, sharp four-point star above, small sparks, golden dimensional artwork. Current app default uses parchment/light palette; midnight alternative exists. Original artwork copied into design/reference. The user rejected the initial book+nib+star toolbar proposal as too close to Obsidian’s book icon. They explicitly selected B + F from `design/icons/exploration-02/icon-options.png`: B, Knowledge lantern, for the Librarian right sidebar and matching note action; F, Winged M + nib, for the Marginalia left ribbon where Longform places its icon. This supersedes the earlier plan to use one icon everywhere. F should emphasize the M silhouette already suggested by the original artwork and a prominent fountain-pen nib. The selected editable sources are `librarian-lantern.svg` and `marginalia-winged-m-nib.svg`. Theme-safe production vectors are in `design/icons/selected/`. Both icons have been observed in native Obsidian on light and dark themes; exact sidebar/header ordering is host-controlled. Source PNGs remain unchanged.

## Reference files and code

Snapshot docs under docs/reference are from standalone app and contain obsolete platform/status details: treat as source behavior/reference, NOT automatically binding plugin architecture. Most recent user decisions in this handoff take precedence.

Read source as needed: `packages/vault-engine/src`, `apps/marginalia/src/domain/scripts.ts`, `domain/script-edit.ts`, `domain/script-order.ts`, `librarian/tasks.ts`, `librarian/writing.ts`, `librarian/retrieval.ts`, `librarian/storage.ts`, `editor/ScriptEditor.tsx`, relevant tests. Do not claim source reuse correctness without inspecting imports/dependencies.

External references: https://docs.obsidian.md/ ; https://github.com/kevboh/longform ; https://github.com/kevboh/longform/blob/main/src/api/LongformAPI.ts ; https://github.com/SilentVoid13/Templater . Longform public API inspected exposes list conversion/numbering helpers, not a complete stable management API. Its installed template integration recognizes Templater; actual creation/compile integration remains untested.


## Current script increment (D-0009 / D-0010)

Preceded By is restored as the portable order authority, automatically filled if missing and updated on drag. Native sidebar Move Up/Down and Open script/page buttons are removed. Separate arrows expand levels; script/page names open native notes/headings without toggling. Project names open all source scripts in order in a read-only project view, with headings linking to editable notes. Metadata writes use whole-group preflight, atomic per-file compare/write and conditional rollback; never overwrite unsaved/newer edits. Old scriptOrders is only a migration/tie seed. No merged project file is created.

Automated core/host and browser checks pass. Native missing-field fill, precedence over old saved order, project rendering/reload and initial name/arrow interactions passed. Native pointer automation later stopped delivering clicks even to the core Files tab, preventing completion of the native drag gesture check; this is recorded separately from browser drag verification. The clean build is installed only in the disposable vault. Exact Enter commands, speaker completion, page moves, script creation and export remain future script work. Librarian prose quality remains open independently.


D-0011: Scripts has no Refresh button; its existing native event subscriptions provide live updates. Double Spread → Left → Right is the shared inference/insertion rule. Opening's Page 4 is now shown as Left; explicit Side overrides are preserved. This correction passed 68 automated tests, browser assertions and native outline inspection, with all current test-note hashes unchanged.


## Current writing-session increment — October 22, 2026 (D-0012 / D-0013)

Script Studio now opens from the M ribbon and lists projects and groupings. Project selection shows all its groups; grouping selection limits the Scripts outline to that grouping. Selection persists and reuses the active main tab. A bottom footer above the vault bar provides a 25-minute configurable countdown and today's net new words. Settings independently hide both and support All projects, Current project and Full vault goal modes; Current project has per-project targets. The owner clarified “Total Projects” means all scripts across all projects; the implemented label is All projects. All modes are daily local editor deltas, with startup baselines, Undo/deletion adjustments and local-midnight reset. Timer restores paused. No source text is persisted for counting.

82 automated tests, typecheck/package and shared-view browser interactions pass. Native Obsidian checks passed for project/group scoping, footer placement, settings persistence/visibility, countdown Start/Pause and reload, and +4 actual typed words followed by one Undo returning to 0. The clean build remains installed only in the disposable test vault, with default 25 minutes, visible controls, All projects and goal 0 restored. All 14 pre-existing note hashes are preserved and the temporary second-group fixture removed. See the latest VERIFICATION.md section and studio-writing-session.json. Earlier Librarian quality/sync and native drag acceptance gaps remain open; this increment does not imply those are resolved.


## Sidebar chooser adjustment — October 22, 2026 (D-0014)

Script Studio now opens/reuses its own left-sidebar tab through the M ribbon, command or Scripts return button. Its layout is compact at sidebar width. Opening it preserves the main editor; project/group selection continues to show the scoped outline and main reading view. Older main-pane Studio tabs are retired after a sidebar instance opens successfully. Native verification kept Opening in the main editor while returning to the sidebar chooser. No source-note edits were needed.


## Unified Script Studio — October 22, 2026 (D-0015)

The chooser and Scripts outline now share one tab named Script Studio, using a project/grouping dropdown. Legacy two-tab workspaces consolidate on layout-ready or opening the ribbon. View options contains Collapse all, Collapse panel descriptions and Expand all, targeting the main script/project content. Panel-only folding retains dialogue, notes and locations. Native editor commands plus CodeMirror folds/Live Preview presentation handle native scripts; rendered project pages/panels use local disclosures. Source files and cursor selections are preserved. All 86 core/host tests, typecheck/package and browser interactions pass; native unified menu and all three fold controls passed in both editor and project reader. Compile/export and shortcuts remain future work as requested. The latest build is installed only in the disposable test vault. Current evidence: native-unified-script-studio.png and native-unified-panels-collapsed.png.

The owner explicitly confirmed main-script-view panel folding (D-0016); this matches the installed implementation.


## Folding correction — October 22, 2026 (D-0017)

Fixed cursor-selection restoration reopening the page containing it, and added explicit parsed page folds including Double Spread. Controls now toggle Collapse all / Expand all and Collapse panel descriptions / Expand panel descriptions based on actual main-view state. Expand all is absent when nothing is folded. Expanding panels alone preserves page folds. Native Opening spread and label round-trips pass; actual CodeMirror-state regression preserves cursor and source. 87 tests and the browser suite pass. Final build is installed in the disposable test vault with source-note hashes preserved.


## Script shortcuts — October 22, 2026 (D-0018, Phase 6)

Inspected original script-edit.ts, RichText.tsx and ScriptEditor.tsx; ported /P, /p, /d, /t, /c, /cn, /ct, /cw, /cd, /cs and /ce as exact standalone Enter commands in recognized native script editors. Current-line Markdown replacement preserves surrounding text; /P infers the next local page/side. Speaker/placeholder selection is ready for typing. Code/frontmatter/comments/math, template/ordinary files, modified Enter, composition and nonempty/multiple selections are guarded. Native CodeMirror history isolation gives one conversion Undo. No OS combinations assigned, Templater execution unchanged; speaker completion remains separate future work.

107 tests pass (79 core/script/transport/writing/shortcuts and 28 host), typecheck/package and browser regressions pass. Native Obsidian 1.14.4 verified /p panel placeholder selection, /d speaker selection, /cw warning, /P Page 2 Left, conversion Undo and Shift+Enter passthrough. Temporary Shortcut Verification script was restored and removed; all 14 existing note hashes preserved. Final plugin files are installed in the disposable test vault only. See script-shortcuts.json and native-script-shortcuts.png.


## App workspace — October 22, 2026 (Phase 7, D-0019–D-0021)

Implemented native Home, Brainstorms/Canon tabbed cards, Projects/project folder pages and Storyboard Project Register from the inspected open Marginalia app. App navigation sits above Obsidian's existing file controls/tree and is left-aligned. World: Home, Brainstorms, Canon, Projects. Storyboard: Home, Project Register, Projects. Original M ribbon remains Script Studio; shared Storyboard areas are in-page links. Native notes remain editable through card links. Per-vault layout selection changes presentation only.

Three collapsible settings sections independently enable Theme, Scripts and Librarian immediately. Theme includes World/Storyboard, app colors and app navigation; palette matches inspected app light/dark tokens. Disabling features unloads their own views/actions/listeners while preserving saved preferences and original editors. No creative-vault/app source changes were made.

117 automated tests pass (86 pure, 31 host), both browser suites pass, typecheck/package pass. Native Obsidian 1.14.4 verified pages/category/project tabs, original M, left-aligned four-row World menu, light/dark palette and all three module switches. All 14 baseline note hashes remain unchanged. Production installed only in disposable test vault. See app-pages-modules.json and native-app-home-light.png/native-app-canon-dark.png/native-app-project.png/native-modular-settings.png. Earlier Librarian quality/Sync and native drag-gesture acceptance gaps remain open.


## Real-vault acceptance baseline — October 22, 2026 (D-0022)

Owner requested actual Reanimator/Shadowverse World and Storyboards content tests, with feature timings and deferred optimization ideas. Tested unchanged build in three native isolated copies under /tmp/marginalia-real-vault-review-20261022, only Marginalia enabled; no original installation. All eight comic scripts recognized and ordered, source page/panel inventory agrees. Native app pages, register, working-document navigation, project folding, local Ask/Enhancement/Expansion, refinement, Insert/Undo, Dismiss, pin/reference, Library, stale warning and cancellation checked. All 267 original Markdown hashes unchanged; only a missing first predecessor changed in the Shadowverse copy. 117 automated tests/typecheck pass.

Representative Ask / Enhancement / Expansion seconds: Reanimator 13.7 / 34.7 / 46.4; Shadowverse 24.1 / 41.7 / 21.1; Storyboards 63.0 / 39.8 (repeat baseline) / 109.2. Expansion figures are saved-file completion; report distinguishes final UI and uncertain initial measurements.

No optimization code/trials or production fixes. Record RV-01–RV-07 before next build: unsupported prose; malformed Ask wiki citation (, S2); generic Lore profile/This world label for Storyboard; incomplete generated sentences; sections-only legacy Ungifted artifact unsupported and preserved; 00 Overview falsely listed as Reanimator project; declared Pages mismatches (Shadowverse Part 3 actual8/declared6, Gods Do Die actual11/declared19). Lore instructions are present; none of the completed baseline requests timed out. Prose acceptance remains failed. See docs/verification/real-vault-review-2026-10-22.md and .json. Private inventories/prose remain outside repo. Existing original-vault plugin interoperability, Sync and native drag acceptance are not implied by isolated-copy tests.


## Automatic shared-folder menu — October 22, 2026 (D-0023)

Owner clarified Crypt/Research/Collections must be separate menu entries below Projects, and the broad rule is every top-level underscore-prefixed folder gets its own section, excluding Assets. Implemented dynamically for BOTH World and Storyboard; no Stacks wrapper needed. Additional folders are alphabetical after the known three. Empty folders qualify, nested folders remain page tabs, and create/rename/delete updates live. Top-level _templates consequently has its own page, remaining excluded from global Home/Canon/script/Librarian eligibility; template opening never executes it. Original M ribbon and left alignment retained. Shared buttons removed from Project Register and other page bodies. Saved old shared routes migrate to root-folder paths.

118 automated tests (87 pure, 31 host), typecheck/package and expanded workspace browser suite pass. Automated checks verify generic/nested/empty folders, both vault types, Assets exclusion, scoped templates, core route label collisions, legacy restoration, active nav and live creation/rename/deletion. Native Obsidian 1.14.4: Storyboard six-row menu and shared page; native empty folder create, application rename (menu + open page), deletion/Home fallback; Reanimator World automatically shows Templates with 13 source cards. Updated test builds/ZIP only; all 284 pre-existing Markdown hashes across four test copies remain unchanged, as do all 267 originals. No Librarian generations, model settings, speed experiments or prior acceptance fixes in this increment. See shared-folder-navigation.json.


## Project Status Flow — October 23, 2026 (D-0024)

Implemented per-vault field/order controls under Theme settings. Defaults are stage and Foraged, Dried, Ground, Brewed, Distilled, Bottled. Both Storyboard register and project cards use the configured property and ordered tabs, including empty stages. Unlisted authored statuses follow alphabetically; missing values use Unassigned. Old progressive labels are not automatically rewritten or aliased. World card lookup remains unchanged.

119 tests (88 pure, 31 host), typecheck/package and workspace browser suite pass. Native Storyboards Review verified both settings, custom progress field with Bottled/Foraged order, immediate register changes, restoring requested stage flow, persistence after reload, Bottled/Lone filtering and matching Projects tabs. Updated test copies/ZIP only; no original installation, source edits, Librarian generation or performance experiments. See project-status-flow.json.
