# Development verification — October 21, 2026

## Authoring controls and vault setup — October 23, 2026 (D-0029)

| Requirement | Evidence | Result |
| --- | --- | --- |
| One-session timer edit; no active/paused edits | Pure session tests, browser double-click/lock/reset, native 7-minute override with saved default 25 | Pass |
| Searchable reference pinning | Native Home dropdown selection/removal and Librarian local reference chip; browser typing | Pass |
| Sidebar pages default closed | Browser default aria-expanded/panel visibility and native page-only outline | Pass |
| New Entry on every menu page | Browser checks for each core/shared page; native right-side form and project page | Pass |
| Ordered type/subtype, title/folder/template flow | Native Brainstorm/Canon/Project menus, project canon group, matched Character/Script templates; browser creation | Pass |
| Configurable canon folders/templates and defaults | Browser/custom host routes; native Creature table save, creation, default restore, configured-folder creation | Pass |
| Vault and metadata suggestions; freehand statuses | Browser keyboard template choice; native Group → Draft suggestions and newly typed status, then original flow restored | Pass |
| Safe copies, failures and project scoping | Host collision/disk/concurrency/rollback, copied bodies, custom script folders and Storyboard root-project assertions | Pass |
| User data preserved | All 16 original Markdown hashes unchanged; five temporary notes removed; daily words 20, goal 500 and timer default 25 unchanged | Pass |

142 tests (95 pure, 47 host), typecheck/package and both expanded browser suites pass. Native Obsidian 1.14.4 checks used the disposable vault only; no original creative vault modification, model generation or optimization trial. Template commands remain literal. Evidence: `verification/authoring-setup.json`; screenshots `native-new-entry.png`, `native-new-entry-home.png`, `native-vault-setup.png`, `native-script-session-controls.png` under design/verification.


## Script creation — October 23, 2026 (D-0028)

| Requirement | Evidence | Result |
| --- | --- | --- |
| Configurable template path | Native Scripts setting, Browse picker, reload persistence; browser persistence | Pass |
| Folder right-click action | Native Harbor folder → Create a New Script; note created in that exact folder | Pass |
| Button below active list | Browser position assertion and native final layout above the footer | Pass |
| Grouping and order | Native Draft prefill and end predecessor; host/browser ordered-list assertions | Pass |
| Preserve owner edits | Both native created bodies match the edited template exactly; all 15 original note hashes unchanged | Pass |
| Safe creation failures | Host malformed/missing template, name/path/order guards, collision race, disk failure and concurrency tests; native missing template and duplicate errors | Pass |
| Recognition and editor | Native note opens with role/format and appears in correct sidebar scope, including outside Scripts | Pass |
| No writing credit for copies | Native total stays 20; host zero-credit assertion | Pass |

132 tests (93 pure, 39 host), typecheck/package, expanded script browser suite and workspace browser suite pass. Two temporary native scripts were removed; template edits preserved, test-vault setting configured and previous session restored. Build/ZIP updated and installed in the disposable vault only. No Librarian generation or performance work. Evidence: `verification/script-creation.json`, `design/verification/native-new-script.png`. Template code is copied literally; executing it remains outside this feature.

This is a development build, not a completed real-vault acceptance. The user authorized installation in a disposable vault, and Marginalia is now installed and enabled in `.preview/Marginalia Test Vault`. The standalone app, Reanimator, and existing private artifacts were not modified.

## Phase 1 review

| Requirement | Evidence | Result |
| --- | --- | --- |
| Desktop plugin compiles against official API | `npm run typecheck`; `npm run package`; desktop-only manifest | Pass |
| Mockup-aligned sidebar and selected icon directions | Same sidebar component rendered in browser; screenshots in `design/verification/`; theme-safe vectors in `design/icons/selected/` | Pass in harness and native host; exact ordering is host-controlled |
| Context, pinning, tabs, composer and explicit actions | Browser interactions; 300px pane without horizontal overflow | Pass in harness |
| Local runtime and model selection | Loopback validation tests; installed Ollama model listing; capability-gated direct output; model changes cannot affect an in-flight request | Pass |
| Light and dark appearance | Inspected `librarian-light.png`, `librarian-dark.png`, `enhancement-review.png`, `review-narrow.png` | Pass in harness |

The supplied mockup remains the visual authority. The browser's surrounding note/file chrome is illustrative and uses fictional content. Actual Obsidian controls determine header order and sidebar position.

## Phase 2 review

`npm test`: **42 passing tests** — 24 core checks, 7 HTTP/streaming checks and 11 synthetic host checks.

| Requirement or hard rule | Evidence | Result |
| --- | --- | --- |
| Empty target can have rich outside evidence | Aliases, resolved links, direct names and same-page adjacent script passages; exact offset tests | Pass |
| Preserve identity and source boundaries | Duplicate-alias rejection; longer identity masking; original excerpts with source owners | Pass |
| Generated content never supports itself | Hidden/generated/provisional/template/archive exclusion tests | Pass |
| Bounded evidence and inspectable omissions | Context-budget tests; source disclosure UI | Pass |
| Finished section suggestions and refinement | Model output validation, shared Review component, wired refinement route | Pass structurally; author-quality acceptance pending |
| No canonical changes during generation | Synthetic host tests observe zero editor transactions and no canonical writes before Insert | Pass |
| Insert is one native editor transaction | Synthetic host records a single transaction for each explicitly inserted section; Summary callout preservation tests | Pass in native host; disk comparison confirms exact restoration after one Undo |
| Stale sources cannot publish/insert | Host tests change sources during generation and target before insertion | Pass |
| Context switches do not move results | Host changes selected note during inference and checks original result ownership | Pass |
| Cancellation retains previous artifacts | Generation cancellation and cancellation during hidden folder preparation | Pass |
| Hidden expansion output preserves original | Host checks exact `.marginalia/expanded/<entry>.md` write and unchanged original; envelope round trip | Pass |
| Preserve legacy and competing output | Legacy-owner refusal, invalid metadata and pre-write conflict tests | Pass |
| Staleness and library | Source fingerprint tests; hidden library discovery in host harness; browser Library interaction | Pass at core/host boundary |
| Read-only expansion view | Plugin-owned ItemView, guarded controls, generation metadata and source rendering implemented and typechecked | Pass in native host; separate ItemView, generated label and working controls |

Real local inference used `gemma4:12b-mlx`, a 32,768-token requested window, and **only two fictional notes**. Both Enhancement and Expansion returned parseable section drafts: approximately 9.9 and 9.7 seconds respectively on this machine, after warm-up. These numbers do not predict large-vault or cold-model performance. The original model default spent its response budget on thinking; the adapter now requests direct output only when `/api/show` explicitly supports it.

The fictional smoke-test outputs are in `verification/local-ai-smoke.json`. This is pipeline evidence, not prose-quality acceptance: the model still repeats a daily routine in several sections and uses broad preservation language. Sparse-source omission and precise attribution need author review and further evaluation before live adoption. Native and factual-quality requirements remain open rather than being marked done.

## Phase 3 native functional review

Installed and enabled in `.preview/Marginalia Test Vault` after explicit owner authorization (D-0005). All fixtures are fictional. The current installed files match `dist/marginalia/` and contain no diagnostic logging. The vault remains open in Obsidian for review.

| Requirement or rule | Native evidence | Result |
| --- | --- | --- |
| Plugin startup and local model settings | Obsidian 1.14.4 enabled the plugin, displayed settings and listed local models | Pass |
| Selected icons and mockup appearance | M/nib in left ribbon; lantern in right selector and note header; `native-light.png`, `native-dark.png` | Pass; exact ordering host-controlled |
| Entry Enhancement | Real local generation produced Review cards and rendered Markdown/source links | Pass functionally |
| Insert and native undo | Original was initially in reading mode; Insert activated editing, saved the Summary without changing properties, and one Undo restored the exact original bytes | Pass |
| Stale insertion | After Undo changed the source baseline, another pending suggestion was rejected without mutation | Pass |
| Entry Expansion | Generated file exists only under `.marginalia/expanded/02 Character/Mira Vale.md`; original remains unchanged | Pass |
| Read-only tab and Library | Expansion opened in plugin-owned ItemView with Generated / Not canon, original link, source inventory, time and Regenerate; Library found it and it reopened after reload | Pass |
| Cancellation | Cancelled a native regeneration; the prior generated timestamp remained and controls re-enabled | Pass |
| Source staleness | Appended a fictional source sentence; native tab showed the staleness notice; restored source; expansion bytes never changed | Pass |
| Source inspection/navigation | Source inventory exposed original passages; clicking a source opened its canonical note using native navigation | Pass |
| Hidden storage excluded from ordinary search | A unique phrase found only in the expansion returned 0 core Search results | Pass |
| Pin/unpin | Pinned context survived switching notes; unpin immediately followed the currently active canonical note | Pass after correction |
| Source-grounded prose without filler/invention | Native model added navigational purpose and generalized capability claims not supplied by fixtures, plus an unsupported Appearance placeholder | **Fail — quality gate remains open** |

Native tests exposed and fixed three integration areas: echoed model frontmatter is discarded rather than applied; actual Character template callouts/navigation sections are recognized; Insert activates the live native editor instead of modifying the dormant reading-mode buffer. Pin release was also corrected to follow the latest canonical note immediately. Regression cases cover each fix, including a captured fictional response.

Functional evidence is recorded in `verification/native-acceptance.json`; the observed model sample is `verification/native-expansion-output.md`. The original fictional notes were restored after tests. Screenshots are under `design/verification/native-*`.

## Remaining acceptance

- Tighten model grounding and sparse-source omission; evaluate representative canon types/subtypes against author expectations. Functional success does not establish prose-quality acceptance. The plugin is not ready for creative-vault adoption yet.
- Verify expansion sync/portability separately. No hidden-folder Sync guarantee or concurrent standalone/plugin write guarantee is claimed.
- Earlier standalone sections-only expansions are preserved but not rendered in this increment. Migration remains separate.
- Source Control is not installed in the isolated vault, so its relative tab placement has not been tested. The native note action appears before view/edit through Obsidian's public `addAction` API, rather than between view/edit and ellipsis as in the conceptual mockup.

## Reference APIs checked

Native view/editor integration follows the [official Obsidian API](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts) and [plugin lifecycle guidance](https://docs.obsidian.md/plugins/guides/lifecycle-management). Local inference follows Ollama's [chat](https://docs.ollama.com/api/chat) and [model listing](https://docs.ollama.com/api/tags) endpoints; capability flags were also checked against the installed server.

## Review layout and Lore timeout follow-up

The owner moved Entry Enhancement and Entry Expansion into Review only (D-0006). Native Ask/Review and the browser Ask/Review/Library checks confirm the new placement. The installed update is visible in `design/verification/native-review-entry-actions.png`; `native-ask-actions-moved.png` shows Ask without those buttons.

The reported message combined two different diagnoses. The original socket inactivity timeout fired after 180 seconds, but a catch-all request error handler prepended “Cannot reach local Ollama.” Ollama's log shows that the model had received those requests and that they ended when the client cancelled them. Lore-specific guidance and the shared canon writer are present in the captured fictional request (2,383 system characters and 5,933 user characters); they were not missing.

The HTTP adapter now streams active output, exposes waiting/thinking/receiving progress, distinguishes timeouts from actual connection failures, preserves server error details, and rejects incomplete responses without publishing them. Tests cover a silent timeout, refused connection, HTTP/API failure, partial/malformed output, stream cancellation, oversized output, active generation exceeding one idle window, and the overall deadline.

An initial streamed native retry also emitted no text before manual cancellation, so streaming alone does not prove that the underlying model-side stall is resolved. Two subsequent Eastern Archive expansions completed, including one on the clean installed build; the second immediately showed streamed output and was saved at 2026-10-21 17:42:56 America/New_York. The exact cause of the intermittent model stall remains unestablished. The user’s current test-note text, including their post-install edits, was preserved. See `verification/lore-timeout-fix.json`.

Protocol handling follows Ollama's [streaming documentation](https://docs.ollama.com/api/streaming) and [API error format](https://docs.ollama.com/api/errors).

## Script organizer increment — D-0007 / D-0008

The owner moved script development forward, then explicitly chose direct Longform-style organization without required Preceded By maintenance. The left M ribbon now opens Scripts; Librarian remains available through the lantern and its command. The build is copied to the disposable vault, with two new fictional Copper Sky script fixtures. All 9 pre-existing Markdown file hashes remained unchanged. The running app has loaded this increment and was reloaded again to verify saved ordering.

| Requirement or rule | Evidence | Result |
| --- | --- | --- |
| Organizer order without required predecessor fields or note rewrites | Pure tests for saved order, initial unlinked order, range updates, group membership, file/folder renames; shared-view button/drag tests | Pass |
| One order authority after adoption | Conflicting legacy links produce initial warnings; saved organizer order ignores those links; explicit adoption tested | Pass |
| Order persists without losing AI settings | Browser reload test; shared settings/order save queue host test | Pass |
| Separate declared Pages and actual slots; Side/spreads; authored panel titles | Synthetic CRLF, spread/override, count and source-preservation cases | Pass |
| Panel move owns dialogue, notes and location | Full-block round-trip, page-boundary rejection, EOF case, unchanged metadata | Pass |
| One native transaction per edit | Synthetic host transaction/focus test | Pass at host boundary and in Obsidian; see native follow-up below |
| Light/dark, 300px pane, drag/button controls, outline | Same ItemView implementation in fictional browser host; `design/verification/scripts-organizer-*.png` | Pass in browser harness |
| Librarian regression | Existing source/transport/host cases and browser Ask/Review/Library workflow | Pass |
| Native placement, navigation, persisted order after native reload, actual script Undo | Following explicit owner authorization to inspect, the identified window was Marginalia Test Vault. M ribbon placement, source navigation, reload persistence and exact-byte single Undo checks passed there. No other vault was accessed. | Pass |
| Enter slash commands, speaker completion, page moves, script creation, export | Explicit following script increments | Not implemented |

`npm test`: 59 tests passed (46 core/script/transport + 13 synthetic-host). Typecheck, development packaging and shared-view browser checks passed. See `verification/scripts-organizer.json`. Native acceptance of this organizer increment passed; the following script features remain separate. Librarian prose-quality and expansion portability findings remain open separately.


### Native script follow-up

With the owner's explicit window-inspection authorization, Obsidian identified the active window as `Marginalia Test Vault`. The installed build opened Scripts on the left through the M ribbon, with Librarian still on the right. Moving Opening before After the Bell saved organizer order and changed their ranges to 1–4 and 5–6, without adding predecessor/successor fields. A full app reload retained that sequence and range display.

Panel navigation focused the authored callout in the native source editor; double-spread page navigation focused its H2 heading; cross-file navigation opened After the Bell at its selected panel. Moving the first Opening panel down carried MIRA's dialogue, the Lighting note and Location reference together. One Undo restored the exact saved file hash. Panel insertion and page insertion each also restored that hash with one Undo. Page insertion appended Page 5 / Side Left, preserved Pages: 4 and displayed the actual/declared mismatch. After all checks, all 11 baseline Markdown file hashes matched, including the user's existing test-note text and both new fictional script fixtures.

The final build remains active with Opening and the script organizer visible. Native screenshot: `design/verification/native-scripts-organizer.png`. The earlier app-access review block was resolved by the owner's explicit authorization; no private vault was accessed. Native drag gestures were not separately tested; browser drag/drop and native Move Up/Down share the saved-order path.

## Predecessor maintenance and project reading — 2026-10-22

D-0009 restores Preceded By as the order authority, replacing the plugin-only ordering model from D-0008. D-0010 removes the sidebar Move/Open controls and separates disclosure from navigation. Historical verification sections above describe earlier builds.

| Requirement or rule | Evidence | Result |
| --- | --- | --- |
| Automatically create missing Preceded By; first script empty | Pure write-plan and host coordinator cases; three fictional native script fields filled on startup | Pass |
| Existing predecessors override old plugin order | Core case plus native reversal of source properties against the old saved array; outline and project both followed properties before/after reload | Pass |
| Drag updates the whole chain and existing legacy successor projections | Source write-plan cases; browser drag by script names, persisted source properties and reload | Pass in automated/browser checks |
| Missing/conflicting/cyclic claims are not silently filled | Core cases and browser dangling-link diagnosis/drag repair | Pass |
| Never discard dirty/stale/newer edits | Whole-group preflight, per-file compare/write and conditional rollback host cases | Pass at synthetic host boundary; multi-file writes are not crash-atomic |
| Preserve source bodies and unrelated metadata | CRLF/BOM/comment pure case; native comparison of all 14 current notes: only Preceded By changed in three scripts | Pass |
| Arrows expand/collapse; names open without toggling | Browser interactions and initial native script/page/disclosure checks | Pass |
| Remove Move Up/Down, Open script/page, adoption buttons | Browser absence assertions and native accessibility inspection | Pass |
| Project click shows all scripts in order, with links back to notes | Same-view browser assertions; native Markdown-rendered Copper Sky project and restored view state after app reload | Pass |
| Native drag gesture on the final build | Native pointer automation stopped emitting mouse events, including on the built-in Files tab; temporary diagnostics received no events and were removed. Keyboard input continued working. | Not verified; no native drag success claim |
| Prior Librarian and script behavior | Full automated suite and browser Ask/Review/Library regression checks | Pass |

`npm test`: **66 passing tests** (49 core/script/transport + 17 host). Typecheck, development packaging, browser light/dark and 300px checks passed. The host/browser YAML test codec covers flat fixtures; native Obsidian's YAML codec was exercised by actual automatic source updates. Unusual valid flow/complex YAML may be serialized through the host fallback and normalize metadata formatting/comments; body content is preserved.

The clean packaged build matches the installed plugin files byte-for-byte. The project is left open in the authorized disposable vault. Predecessor fields reflect Opening then After the Bell; no other note properties or body text changed, no combined project file was written, and no private vault or standalone app was modified. Native evidence: `design/verification/native-project-reading.png`; structured report: `verification/predecessors-project-view.json`.


## Live outline and spread-side correction — 2026-10-22

| Requirement | Evidence | Result |
| --- | --- | --- |
| No manual Refresh control | Browser absence assertion and native accessibility tree; existing metadata/vault/editor subscriptions remain | Pass |
| Opening Page 4 Left after Page 2–3 Double Spread | Pure fixture, browser label assertion and native installed outline | Pass |
| Shared insertion rule | Regression appending a page after a spread produces Side: Left; the following single page alternates Right | Pass |
| Respect authored overrides and preserve existing source | Explicit Side: Right after a spread remains Right; all 14 current native note hashes unchanged | Pass |

68 automated tests passed (51 core/script/transport + 17 host); typecheck, packaging and the browser suite passed. Clean package files match the installed disposable-vault plugin. Native screenshot: `design/verification/native-scripts-spread-side.png`. No inference/model changes or creative-vault writes were made. Earlier sections reporting Page 4 Right / subsequent Page 5 Left describe the superseded calculation.


## Script Studio and writing sessions — 2026-10-22

| Requirement | Evidence | Result |
| --- | --- | --- |
| Initial project/grouping chooser | Shared native view, browser actions and installed Obsidian chooser | Pass |
| Project includes every grouping; grouping excludes other groups/projects | Browser fixtures and temporary native second grouping; unrelated Harbor excluded | Pass |
| Scope persists and selection reuses the main tab | Host regression, browser reload and native reload | Pass |
| Footer beneath outline and above vault name | Native final screenshots; qualified host padding reset | Pass |
| Countdown Start/Pause/Reset, duration and paused restoration | Unit/browser interactions; native Start/Pause, 1-minute test and reload; defaults restored to 25 | Pass |
| Completion announced only once | Controlled-clock unit check; no full native completion wait | Pass at unit boundary |
| Three goal modes and independent project target | Unit/browser checks; native menu and saved Copper Sky target | Pass |
| Visibility controls remove footer when both hidden | Browser and native settings interaction | Pass |
| Actual local editor deltas and Undo | Native +4 words, save, one Undo returns to 0; exact note hash restored | Pass |
| Initial/imported/hidden/template/attachment text earns no words; day rollover and rename handling | Core/host regressions, synthetic clock | Pass at automated boundary |

82 automated tests passed (61 core/script/transport/writing and 21 host). Typecheck, packaging and shared-component browser suite passed. Native tests used Obsidian 1.14.4 in the authorized disposable vault. Final settings are visible timer/words, 25 minutes paused, All projects and daily goal 0. All 14 pre-existing note hashes are unchanged, the temporary native second-group note is removed, and installed main.js/manifest.json/styles.css match dist byte-for-byte.

Evidence: `design/verification/native-script-studio.png`, `native-writing-session.png`, `native-writing-settings.png`, and the intermediate `native-writing-progress.png` (+4 words); shared-view `script-studio-home.png` and `script-studio-session.png`. Structured report: `verification/studio-writing-session.json`.

Limits: daily totals represent local changes observed while Marginalia is loaded, not a reconstruction of earlier/offline edits. Imported/external changes update baselines without earning words. Saved remaining time restores paused; no cross-device timing/sync guarantee or history view is included. Native completion and midnight rollover are covered by controlled tests rather than waiting in the native host. Earlier acceptance gaps remain separately recorded above.


## Sidebar Script Studio — 2026-10-22 (D-0014)

| Requirement | Evidence | Result |
| --- | --- | --- |
| Chooser opens in a native left-sidebar tab | Installed Obsidian ribbon action and screenshot `design/verification/native-studio-sidebar.png`; browser sidebar containment assertion | Pass |
| Opening chooser preserves the main script editor | Native Opening remains editable beside chooser; host regression rejects main-leaf access; browser main-content preservation assertion | Pass |
| Reuse sidebar and retire older main chooser tabs safely | Host tests verify reuse and detach only after sidebar opens; native old main chooser migrated | Pass |
| Project/group selection returns to scoped outline and reader | Native Draft selection and browser project/group cases | Pass |
| Word metrics, timer and prior script/Librarian behavior retained | Existing core/host/browser regression suite | Pass |

84 automated tests pass (61 core/script/transport/writing, 23 host). Typecheck, packaging and full shared-view browser interactions pass. Native Obsidian 1.14.4 shows the compact chooser beside Opening. All 14 existing baseline note hashes remain unchanged. The clean development files match the installed disposable-vault plugin, and the development ZIP is refreshed. Earlier main-window Studio screenshots describe the prior placement; `native-studio-sidebar.png` is the current evidence.


## Unified Script Studio and main-view folding — 2026-10-22 (D-0015)

| Requirement | Evidence | Result |
| --- | --- | --- |
| One tab for chooser and outline | Native reload consolidated old Studio/Scripts into one Script Studio selector; browser menu containment and host reuse/migration checks | Pass |
| Project/grouping menu scopes scripts | Native dropdown exposes Copper Sky all/Draft and Harbor all/Top-level; native Draft selection and browser project/group cases | Pass |
| Main editor remains available when opening Studio | Host regression, native Opening beside the unified sidebar | Pass |
| Collapse all / Expand all main script | Native Opening folds to page titles and restores descriptions; host native command/selection assertions | Pass |
| Panel-only folding preserves dialogue/notes/location | Native Live Preview hides courier/door descriptions while MIRA, Lighting and Eastern Archive remain; host range/source checks | Pass |
| Project reader fold controls | Native page/panel disclosures collapse and restore correctly; browser assertions for page/panel open states | Pass |
| No source edits or lost writing settings | All 14 pre-existing note hashes unchanged; word count remains 0; footer present | Pass |

86 tests pass (61 core/script/transport/writing, 25 host), typecheck/package pass, and the full shared-view browser suite passes. Native checks ran in Obsidian 1.14.4 in the authorized disposable vault. The final package matches installed files and the development ZIP is refreshed. Screenshots: `design/verification/native-unified-script-studio.png` and `native-unified-panels-collapsed.png`. Structured report: `verification/unified-script-studio.json`.

Folding is local view state, not source markup. Individual native Reading mode switches to editing to apply folding; project reading uses disclosures. Main-view folding is explicitly confirmed by the owner in D-0016. Compile/export and shortcuts are intentionally future increments. Prior separate-tab screenshots document superseded layouts; earlier Librarian quality/portability and native drag acceptance gaps remain open.


## Double Spread folding and toggle labels — 2026-10-22 (D-0017)

| Requirement | Evidence | Result |
| --- | --- | --- |
| Collapse includes Page 2 Double Spread | Real CodeMirror-state regression with cursor inside spread; native Opening displays all three page headings collapsed | Pass |
| No selection-driven reopening | Regression rejects setSelections; cursor offset and source remain unchanged | Pass |
| Collapse all becomes Expand all only while folded | Browser absence/presence assertions; native existing-fold recognition and expand round-trip | Pass |
| Panel control changes to Expand panel descriptions | Browser and native panel fold/expand round-trip | Pass |
| Expanding panels retains collapsed pages | Browser project-disclosure assertions | Pass |
| Preserve notes and install clean package | 14 existing baseline hashes unchanged; installed three plugin files match dist; ZIP refreshed | Pass |

87 tests pass (61 core/script/transport/writing, 26 host), typecheck/package and full browser interactions pass. Native test: Obsidian 1.14.4, disposable Marginalia Test Vault. Screenshot: `design/verification/native-spread-fold-toggle.png`. The native test used a text selection in the spread before Collapse all; the controlled CodeMirror regression proves preservation of the exact cursor offset. Final native view was expanded and both labels reverted to Collapse. Earlier static three-button descriptions are superseded. No source-note edit was required.


## Native script shortcuts — 2026-10-22 (D-0018)

| Requirement | Evidence | Result |
| --- | --- | --- |
| Original commands and case distinctions | Inspected original domain/script-edit.ts and editor handlers; all 11 mappings exercised in pure tests | Pass |
| Native panel/dialogue/warning/page creation and typing selection | Actual /p, /d, /cw, /P + Enter in a temporary script; New panel, SPEAKER and New warning selections observed; Page 2 Left generated | Pass |
| Shared side following a spread | Pure /P regression after Page 2 Double Spread yields Page 4 Side: Left | Pass |
| Isolated conversion Undo | Actual CodeMirror history regression and native one-step Undo restoring the typed command | Pass |
| Protect native editing contexts | Tests for ordinary/template/hidden/noncomic files, case/line/cursor mismatch, fenced code, YAML, comments, math, selections, multiple carets and composition; native Shift+Enter retains literal /p | Pass |
| Preserve source and existing shortcuts | No hotkeys assigned/template code executed; all 14 current baseline note hashes unchanged | Pass |
| Earlier behavior retained | Full core/host and shared-view browser regression suite | Pass |

107 tests pass: 79 core/script/transport/writing/shortcut tests and 28 host tests. Typecheck, package and browser suite pass. Native Obsidian 1.14.4 tested only in the authorized disposable vault. Temporary fixture was restored byte-for-byte then removed; daily footer returned to 0. The installed plugin files match dist and development ZIP is refreshed. Screenshot: `design/verification/native-script-shortcuts.png`; structured evidence: `verification/script-shortcuts.json`.

Native typing sampled four commands; all note subtypes and protected-context edge cases are covered by automated tests rather than claimed as individually native-tested. These are current-line Markdown transformations, not the standalone app's rich-block storage model. Authored downstream headings are not rewritten, and declared Pages remains author-owned. Speaker completion, compile/export and other future script work remain separate.


## App pages, left navigation and feature modules — 2026-10-22 (D-0019–D-0021)

| Requirement | Evidence | Result |
| --- | --- | --- |
| Left-aligned menu above native file viewer | Native final four-row World menu with original file controls/tree; CSS and browser checks | Pass |
| Keep original M for Script Studio | Native ribbon opens separate Studio while main project page stays open; no app-menu Studio entry | Pass |
| Home, tabbed cards and project views | Browser page/filter/search/link/pin cases; native Home, Character tab and Copper Sky Scripts tab | Pass |
| World/Storyboard changes pages | Pure classification/menu tests; browser register/shared-area/mode-switch cases; native selector/register check | Pass |
| App light/dark palette | Browser palette toggles; native light Home and dark Canon screenshots | Pass |
| Three collapsible independent modules | Host persistence/save-failure guards; native each switch off/on and settings collapse | Pass |
| Preserve notes and earlier workflows | All 14 current baseline hashes unchanged; both browser suites and full core/host regression tests | Pass |

117 tests pass (86 pure and 31 host). Typecheck/package and both browser suites pass. Native checks used Obsidian 1.14.4 and the authorized disposable vault only. Current installed plugin matches dist. Evidence: `verification/app-pages-modules.json`, `design/verification/native-app-home-light.png`, `native-app-canon-dark.png`, `native-app-project.png`, `native-modular-settings.png`.

Final Storyboard three-row menu is covered by browser/model tests; native Storyboard register was checked before the final menu trim. Native final four-row World menu and original M were checked after final reload. Pages browse live notes; app creation/template execution and inline register editing are not implemented. File-explorer placement uses observed native DOM structure rather than a dedicated stable extension API. Earlier prose-quality, Sync-portability and native drag-gesture acceptance gaps remain open.


## Real-content vault baseline — 2026-10-22 (D-0022)

Native isolated copies of Reanimator, Shadowverse and Storyboards verified all eight comic scripts, World/Storyboard pages and real local Ask/Enhancement/Expansion workflows. Original SHA-256 baseline: all 267 Markdown files unchanged; no original plugin installation. 117 automated tests and typecheck pass. Timed generation spans 13.7–109.2 seconds across the representative samples; precise per-vault table and timing limitations are in [real-vault review](verification/real-vault-review-2026-10-22.md).

Runtime success does not pass writing-quality acceptance: unsupported character claims, malformed citation targets, generic Lore sections for Storyboard overviews, incomplete prose, unsupported legacy expansion format, and the Reanimator Overview-folder project false positive were recorded. Two declared Pages mismatches are accurately surfaced by the parser. No optimization was implemented or trialed, and no failures were fixed during this requested baseline. The report contains the requirement/evidence table and deferred efficiency proposals.


## Shared-folder navigation — 2026-10-22 (D-0023)

| Requirement | Evidence | Result |
| --- | --- | --- |
| Separate Crypt/Research/Collections entries below Projects | Exact browser navigation order; native Storyboard six-row menu | Pass |
| Every top-level underscore folder in either vault type | Pure World/Storyboard discovery, nested/reserved-label cases; browser arbitrary Ideas page and native World Templates | Pass |
| Exclude Assets | Pure case-insensitive root exclusion and nested asset checks; fixture _Assets never appears; native Storyboard _Assets absent from menu | Pass |
| Browse shared folder contents, including templates only in own section | Browser nested Signals tab/Templates card and existing Canon counts; native Templates displays 13 cards without execution | Pass |
| Live create/rename/delete and empty folders | Browser events; native empty folder discovery, native Rename updates active page and menu, deletion removes item and falls back Home | Pass |
| Preserve old saved routes and native workspace | Browser legacy Crypt restoration/active item; native M, original file tree and source editors remain | Pass |
| Preserve source and test build | 284 existing test-copy Markdown files and 267 originals unchanged; installed test files match dist; ZIP refreshed | Pass |

118 automated tests pass (87 pure, 31 host), typecheck/package and expanded workspace browser suite pass. Native checks used authorized isolated copies only. No Librarian generations or performance experiments were repeated. Screenshot: design/verification/app-storyboard-register.png uses fictional browser fixtures. Structured evidence: verification/shared-folder-navigation.json. Earlier four-/three-row menu evidence is historical and superseded by automatic discovery. External filesystem renames can arrive as delete/create and safely return an old open section to Home; native Rename follows the new path in place.


## Project Status Flow — 2026-10-23 (D-0024)

| Requirement | Evidence | Result |
| --- | --- | --- |
| Configurable per-vault field/order with owner defaults | Pure legacy defaults/input normalization; native settings show stage and six requested values | Pass |
| Follow configured field without unrelated fallback | Pure/browser custom progress versus stage; native progress changes register values to Unassigned | Pass |
| Ordered, consistent tabs and labels | Browser register/project cards; native requested six tabs precede actual older values in both views | Pass |
| Empty configured stages, extra statuses and missing values | Pure/browser empty Foraged and unknown Drafting; native old progressive values remain visible | Pass |
| Save and reload | Host saved workspace fields/order; native restored stage + requested flow persists after reload | Pass |
| Actual stage filter and source preservation | Native Bottled shows Lone and excludes Conquest; all 284 pre-existing test-copy Markdown files unchanged | Pass |

119 tests (88 pure, 31 host), typecheck/package and expanded workspace browser suite pass. Native tests use the isolated Storyboards copy only. No notes were rewritten; old status wording remains authored data. Test copies match dist and ZIP is refreshed. No Librarian generation/performance experiments. Structured evidence: verification/project-status-flow.json.


## Scriptwriting: clean panels and character dropdown — 2026-10-23 (D-0025)

| Requirement | Evidence | Result |
| --- | --- | --- |
| Remove generated Panel Description: | Shortcut and insert-block pure assertions; native /p saved body has only New panel selected | Pass |
| Include frontmatter characters even before dialogue | Pure arrays/scalars/comma lists; native linked ORIN and plain Mira Vale options | Pass |
| Character use and identity | Pure known aliases/mentions, prior plain/wiki forms, deduplication and ambiguity; native SIDNEY without OFF and unrelated location excluded | Pass |
| Efficient local selection and writing focus | Native Down/Enter wiki, Mi/Tab plain and mouse choices select Dialogue; no model request | Pass |
| Free typing and safe Undo | Native Escape/new name and Undo/reopen; actual CodeMirror history/state tests cover filtering, outside edits, no-match and arrow cycling | Pass |
| Native modules and source integrity | Existing browser regressions, all 14 original disposable hashes unchanged, temporary owned script removed | Pass |

127 tests (93 pure, 34 host), typecheck/package and both browser suites pass. Native evidence uses fictional disposable notes only: design/verification/native-dialogue-picker.png. Structured report: verification/script-dialogue-picker.json. The picker does not guess unknown prose names or list unused vault characters; explicit frontmatter/previous dialogue can introduce names without character notes. No original vault installation, AI generation, performance experiment or new dependency.

## Settings columns — 2026-10-23

D-0032: typecheck and package passed. Installed and reloaded in the disposable test vault; native visual checks covered Theme status field/textarea, Scripts template/number inputs and Librarian endpoint/selectors. Descriptions wrap within the left column; field edges match, buttons/toggles remain native size and right aligned. Screenshots: design/verification/native-settings-columns-{theme,scripts,librarian}.png. CSS-only change; no model generation or note edits.

## Mobile loading and writing — D-0033 · 2026-10-23

| Requirement / rule | Evidence | Result |
| --- | --- | --- |
| Mobile may load without Node/Electron | Actual main.js evaluated with unavailable Node modules; onload selects Scripts/Workspace children and registers message-only restored AI leaves | Pass, synthetic host |
| No mobile model startup; desktop preferences retained | Mobile lifecycle host regression; connection/generation guards; restored view message check | Pass |
| World/Storyboard menu and app pages, touch references | Three Chromium touch/device profiles; real production pages/navigation within a simulated drawer shell, true mobile viewport widths; Canon/Home fit and reference selection | Pass, browser |
| Native script organization and shortcuts | Production Studio/controller and real CodeMirror; closed page default, drawer navigation, all 11 slash commands, hardware Enter, synthetic paragraph/line-break input, touch speaker choice, Dialogue selection, Undo and composition guards | Pass, browser |
| Desktop behavior retained | 95 pure + 48 host tests, existing script and workspace browser suites, typecheck/package; final native desktop reload shows Home, Script Studio and Local · Ready | Pass |
| Source/preferences preserved | 16 disposable Markdown hashes unchanged; no new Markdown; writing preferences/workspace settings unchanged; original creative vaults not modified | Pass |
| Physical mobile release acceptance | Native iOS/Android sidebar integration, software keyboard/IME, background/resume, persisted vault state and sync have not been exercised on a device | Pending |

Evidence: verification/mobile-load.json, mobile-ui.json and mobile-preservation.json. Screenshots: design/verification/mobile-{phone,android,tablet}-{home,editor}.png and native-mobile-build-desktop.png. Chromium device profiles are not native iOS WebKit or Android Capacitor execution. The load smoke test records selected children but does not execute their entire real-device lifecycle. Android retains the host CodeMirror deferred Enter pipeline rather than intercepting its beforeinput/IME changes; iOS uses the shared guarded conversion for cancelable soft-keyboard line breaks. No LAN/cloud transport, model generation or efficiency experiment was added. The final three-file development package is installed/reloaded only in the disposable vault and the ZIP is updated.

## Hidden menu folders and input parity — D-0034 · 2026-10-23

| Requirement | Evidence | Result |
| --- | --- | --- |
| Editable _Assets exclusion and all-prefix default rule | 96 pure tests include defaults, empty persisted list, normalization, World/Storyboard menus, unhidden Assets browsing and retained evidence exclusions | Pass |
| Menu responds live and hidden active page returns Home | Workspace browser suite removes _Assets, opens its actual fixture card, hides Assets/Research, checks Home fallback and restores Research | Pass |
| Pin field matches entry search | Workspace browser compares measured width/height, radius, padding, font, border and background of both production inputs | Pass |
| Mobile and desktop stability | 48 host tests, typecheck/package, three mobile browser profiles, production mobile-load smoke; native disposable plugin reload and Hidden folders text/default | Pass |

144 automated tests total. Updated three-file package and ZIP installed only in the disposable test vault. No model calls, preference edits or source-note edits performed for native verification. Physical mobile acceptance remains pending as described in D-0033.

## Explicit mobile character choice — D-0035 · 2026-10-23

| Requirement / rule | Evidence | Result |
| --- | --- | --- |
| No implicit first-candidate acceptance | New host regression: repeated accept keys/implicit choose do not change SPEAKER; explicit second candidate succeeds, composition is untouched, Undo restores placeholder | Pass |
| Visible mobile dialog independent of tooltip | Three Chromium touch profiles open native-Modal fixture with real CodeMirror; no inline tooltip; duplicate editor soft Enter and dialog-search Enter leave dialog/placeholder intact | Pass, browser |
| Explicit touch choice / cancel / new name / stale source / cleanup | Choose second candidate, select Dialogue, Undo; Cancel retains SPEAKER selection; use Nova explicitly; source changes prevent insertion; editor destruction removes dialog | Pass, browser |
| Desktop behavior preserved | Real CodeMirror desktop fixture shows inline listbox, no dialog; ArrowDown/Enter selects second candidate and Dialogue | Pass, browser |
| Bundle / regressions | 96 pure + 49 host tests, package/typecheck, production mobile-load smoke | Pass |
| Physical-device fix confirmed | Original reported mobile tooltip failure was not reproduced here; native iOS/Android keyboard/dialog check remains necessary | Pending |

Structured evidence: verification/mobile-ui.json and mobile-load.json. Visuals: design/verification/mobile-{phone,android,tablet}-character-dialog.png and desktop-character-dropdown.png. Browser native-modal mocks do not establish device keyboard/WebKit/Capacitor compatibility. Development package/ZIP updated and copied only to the disposable vault; no model generation, preference edits or creative-vault writes.

## Optional writing features — 2026-10-24 (D-0036)

| Requirement / rule | Evidence | Result |
| --- | --- | --- |
| Focus/history opt in; existing defaults preserved | Writing preference regression; typecheck | Pass |
| Focus scoped to native script editor, presentation only; live toggle | Production CodeMirror extension in light/dark browser harness; document unchanged on toggle; paragraph decorations visible and removed when disabled | Pass at browser boundary |
| History counts only running local changes; excludes pauses/imports; Undo reflected | Added writing tests: pause/reload restoration, additions/deletions, deadline cap, completion/reset deduplication | Pass |
| History can be disabled while timer continues; bounded validated storage | Disable/retention/corrupt-record tests, 500-record limit | Pass |
| Report, CSV and clear confirmation | Light/dark production Modal browser checks: 3-word session, reload persistence, CSV, Cancel preserves history, confirm clears | Pass at browser boundary |
| Existing core/host behavior | npm test: 101 core/pure tests + 49 host tests, all passing | Pass |
| Build/package | npm run package: typecheck, esbuild, dist/marginalia | Pass |
| Existing mobile behavior | test-mobile-ui.mjs: phone, Android, tablet Chromium touch profiles; verify-mobile-load.mjs: startup without Node | Pass at synthetic boundary |
| Native/physical acceptance | Actual desktop Obsidian and iOS/Android focus centering/keyboard, report layout, background/resume, disable cleanup and persisted history | Pending |

New repeatable browser check: scripts/test-writing-features.mjs (uses the existing MARGINALIA_PLAYWRIGHT environment override). Screenshots: design/verification/writing-focus-{light,dark}.png and writing-features-{light,dark}.png. Screenshots were visually inspected for focus contrast and report readability. Browser checks use synthetic scripts, not original creative notes. No live vault installation or standalone app change was made.

PDF compilation is documented for the next increment in PDF-COMPILE-NOTES.md; it is not implemented or accepted by these checks.


## Automatic page/panel numbering — 2026-10-24 (D-0037)

| Requirement | Evidence | Result |
| --- | --- | --- |
| Named/unnamed panels numbered per page; duplicate names safe | Pure label/parser tests; DOM source-line matching; native named doorway renumbers Panel 2 → Panel 1 after prior panel deletion | Pass |
| Page numbers follow actual structure, preserve names and spreads | Pure middle insertion/deletion test with stale Page 91 labels; native Page 88 source displays 1, 2–3, 4 | Pass |
| Reused rendered sections update without reopening | Native Reading view kept open: middle insertion produces 1, 2, 3–4, 5; deletion restores 1, 2–3, 4. Initially discovered stale unchanged chunks; fixed by per-file live-section invalidation | Pass |
| Group ranges ignore stale declared counts | Native test uses Pages 99 and 81; first actual four slots → next pp. 5–5; adding middle page → next pp. 6–6 | Pass |
| Project reader and outline match native Reading | Native Numbering Verification group shows correct page/panel disclosures and outline labels/ranges | Pass |
| Source unchanged by numbering; inline controls retained | No automatic file writer; pure original-byte assertions; DOM test preserves link identity/click handler and emphasis; idempotent updates and cleanup restoration | Pass |
| Automated baseline | 102 core/pure + 49 host tests; typecheck/package; numbering DOM checks; full test-ui browser interactions; phone/Android/tablet browser regressions; Node-unavailable mobile bundle smoke | Pass |
| Physical mobile acceptance | Actual iOS/Android native Reading layout/refresh after edits | Pending |

Native host: Obsidian 1.14.4, only `.preview/Marginalia Test Vault`. Added synthetic `08 Projects/Numbering Verification/Scripts/{Numbering Check,Following Check}.md`. Test edits deliberately retain stale source labels and metadata to prove display numbering is independent. Source/Live Preview remains literal authoring text; save/Reading view is authoritative under the owner's accepted placeholder option.

Native checks used accessibility observations of rendered headings/panels and group ranges. An attempt to invoke “Reload app without saving” was blocked by automatic approval review due to possible unsaved state loss; it was not executed. Plugin reload instead used disable/enable through community-plugin settings, preserving editor state.

Repeatable DOM regression: `scripts/test-numbering.mjs`. New source/build installed only in the named test vault. Creative vaults and standalone app were not modified.


## Typewriter scroll and Librarian access — 2026-10-24 (D-0038)

| Requirement | Evidence | Result |
| --- | --- | --- |
| Desktop center/mobile upper third | test-focus-scroll.mjs measures caret error <5 px at first/middle/last lines, typing and resized visible editor in desktop/mobile browser fixtures | Pass at browser boundary |
| Native desktop geometry and Undo | Obsidian 1.14.4, Marginalia Test Vault, new synthetic Focus Scroll Check script: typed near beginning and end stays at midpoint; each test insertion undone; source marker absence checked | Pass |
| Optional mode cleanup/history preserved | test-writing-features.mjs: light/dark focus toggles, source preservation, history/CSV/clear/reload | Pass |
| Sidebar registration without duplication/focus changes | Host tests: startup ensureSideLeaf right/active:false/reveal:false; reuse current and deferred views; concurrent creation coalesces; disabled module skips | Pass |
| Live-vault diagnosis | Reanimator's note-header lantern opened Librarian right sidebar, Local Ready. No note edits/model calls. Existing user navigation remained intact | Pass |
| Baseline/package/mobile load | 102 core/pure + 51 host tests; typecheck/package; mobile bundle Node-unavailable smoke | Pass |
| Actual mobile keyboard/rotation | Native iOS/Android visual viewport positioning above the keyboard | Pending |

The original focus check verified classes and unchanged text, not actual caret coordinates; D-0038 adds those missing measurements. Native core styling needed a scoped padding override. Browser screenshots: design/verification/focus-scroll-{desktop,mobile}.png. Test-only source typing was undone; existing user edits to other test-vault fixtures were preserved. Updated package is in dist/marginalia and installed only in Marginalia Test Vault; Reanimator's plugin files were not replaced.


## Compilation button/pop-up — October 24, 2026 (D-0039)

| Requirement or rule | Evidence | Result |
| --- | --- | --- |
| Single Group, existing order, explicit inclusion, reject order errors/empty selection | Pure model tests; phone/tablet checklist tests; native modal Group selection | Pass |
| Presets, content/Advanced options and per-Group persistence | Pure preference validation; browser preset/custom/checklist/A4/reopen/reload; native A4/cover/description controls | Pass |
| Structural numbers, spreads, named panels, comments and literal examples | Pure compile/model regressions including adjacent panels; native generated PDFs | Pass |
| Desktop actual PDF preview/export, Letter/A4, per-script breaks and sheet numbers | Obsidian 1.14.4/macOS: two-sheet Letter and five-sheet A4 exported via native save; all seven sheets rendered with Poppler and visually inspected | Pass |
| Images, long dialogue and content omission | Native A4 includes a local raster, cover and 32 long dialogue paragraphs; description/note/comment omission and explicit remote-image warning checked | Pass |
| Stale export and source integrity | Native synthetic source edit disabled Export PDF; exact restoration re-enabled it. SHA-256 of all 19 pre-existing Markdown files unchanged. Test note restored. | Pass |
| Cancel and view/module cleanup | Native save Cancel; plugin off/on safely restores an unbuilt preview tab. Abort guards, temporary-file save and sandbox boundaries inspected | Pass for exercised paths; disk-full/permission-failure injection not exercised |
| Mobile preview and unsupported desktop | Phone/tablet browser compilation tests; desktop browser without Electron exposes readable preview and disabled export; mobile bundle has no startup Node imports | Pass in harness |
| Earlier functionality | 106 core/pure + 51 host tests; full browser UI, workspace, numbering DOM, focus/history and phone/Android/tablet navigation/editing regressions | Pass |
| Physical mobile; Windows/Linux PDF | No physical-device/other-OS test performed | Pending acceptance |

Test PDFs were saved under the system temporary directory, not a creative vault. Latest package is installed only in `.preview/Marginalia Test Vault/.obsidian/plugins/marginalia/`. Standalone app and Reanimator were not changed. Native Electron PDF export is an explicitly capability-checked host bridge; it is not a public Obsidian cross-platform PDF API. PDF pagination does not equate to comic-story pages.


## Content selections and title-page credit — October 24, 2026 (D-0040)

| Requirement | Evidence | Result |
| --- | --- | --- |
| Remove presets; heading and renamed controls; all three fresh defaults | Core option test, phone/tablet browser assertions, native modal inspection | Pass |
| Remove orange line without masking real errors | Empty error element hidden until a failure; phone/tablet visibility assertion and native screenshot inspection | Pass |
| Conditional editable author, required for title page, remembered within vault | Core persistence/validation tests; phone/tablet hide/show, changed author across Groups and reload checks; native remembered field | Pass |
| Current local date appended to subtitle and By author | Deterministic core date test; mobile preview assertions; native PDF export and Poppler cover rendering inspected | Pass |
| Preserve source files and previous saved content selections | All 20 pre-existing test-vault Markdown SHA-256 hashes unchanged; explicit saved flags retained; no source writer added | Pass |

Core/host: 107 + 51 passing tests. Compilation browser tests passed for phone/tablet and unavailable desktop print engine. Updated package installed only in Marginalia Test Vault. Physical mobile acceptance remains open.


## First Librarian reliability set — October 24, 2026 (D-0041)

| Requirement / rule | Evidence | Result |
| --- | --- | --- |
| Project isolation before identity/graph expansion; no explicit-reference bypass | Core root Storyboard and nested custom-root scenarios; host project overview packet; native Nara scenario with a same-name conflicting character in another project | Pass |
| Retain useful explicit references inside the selected project | Core reference without repeated target name, with foreign reference excluded | Pass |
| Original-note citation normalization and no missing-note creation | Core full path/title/ID/comma-suffix/ambiguity tests; host exact existing-file navigation; production click-handler browser test; native repaired citation activated with Enter opens the original Gate scene | Pass |
| Incomplete/no-citation/omission disclosure; previous results retained | Core validation, per-answer browser notices/New chat cleanup, host unfinished suggestion and saved-expansion preservation tests | Pass |
| Configured entry types, custom templates and project brief | Host Creature template/sections/freshness and root Storyboard project-overview tests; configured templates excluded from evidence and never executed | Pass |
| Grounding challenge: changed object, unsupported certainty, invented ownership, supported prose | Existing local gemma4:12b-mlx, fictional evidence, separate source review plus deterministic non-observation check: first three withheld, supported control accepted; librarian-grounding-check.json | Pass for these four scenarios |
| Native writing failure containment | Initial native Enhancement exposed object substitution and unsupported certainty; review initially over-rejected a supported pronoun and later missed an ambiguity. These are recorded failures that drove revised review inputs/object checks, a deterministic absence rule and the exact ambiguous-source challenge. A withheld native draft left original notes untouched. | Safeguards verified; not a general proof of semantic accuracy |
| Regression/build/mobile startup | 114 core/pure + 59 host tests, typecheck/package, desktop UI, mobile UI, compilation UI and Librarian reliability browser checks; mobile startup without Node | Pass |
| Original content intact | SHA-256 of all 20 pre-existing test-vault Markdown notes unchanged; three new fictional acceptance notes only; no Insert action executed | Pass |
| Wider prose-quality and real-vault author acceptance | Fictional before/after writing comparison supplied; original private-vault prose not regenerated or published in this increment | Pending author review |

The final reliability flow has an extra local-model review for Enhancement, Expansion and refinement, with at most one corrected draft and another review when flagged. This adds latency and potentially conservative refusals. A model reviewer can miss errors or over-reject supported wording; deterministic coverage is limited to tested syntax. No accuracy guarantee or benchmark is claimed. Before/after samples show the writing step; the final guard challenge is recorded separately. To reproduce fictional comparisons, run scripts/check-librarian-quality.mjs (uses the fixed local baseline revision and installed model); the separate grounding challenge is scripts/check-librarian-grounding.ts, bundled as CommonJS like the desktop transport. No cloud, model download, standalone app change or creative-vault installation.

Bounded correction regression: a flagged ownership claim is corrected once, independently reviewed again, and only the supported replacement becomes a suggestion. Repeated failure retains the earlier suggestion/saved expansion. Source edits during review invalidate the attempt. Final total: 173 automated tests passing.

Final native bounded-correction run: the initial Key Scenes allegation was flagged; the model made one correction from gate to laboratory, but the follow-up review still considered the original “it” insufficiently explicit. The result was withheld, with no insertable suggestion published and no source modification. This confirms the conservative refusal path; it does not establish author acceptance of the reviewer’s strictness. Supported-prose acceptance is covered by the separate actual-model control and the complete bounded-correction host test.

## October 24 — second Librarian bucket (D-0042)

185 tests (119 pure/core + 66 host), package/typecheck, desktop and Librarian browser regressions, and Node-unavailable mobile loading pass. Native Marginalia Test Vault checks verify insertion whitespace, second insertion, one-step Undo, saved previous-version restoration, legacy/damaged visibility and a new original note triggering stale status. All 20 pre-existing Markdown hashes unchanged. Local two-root saved/recovery portability passes; physical Sync delivery and second-device reopening remain pending. See [the requirement/evidence report](verification/librarian-storage-2026-10-24.md). Standalone ownership migration remains deferred; only plugin files were built/installed in the test vault.
