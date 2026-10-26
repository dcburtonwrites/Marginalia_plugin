# Step 3 — project organization and script navigation

Implemented only in the Obsidian plugin. Owner selected sidebar dragging for pages/panels, allowed commands with user-assigned shortcuts and no defaults, and authorized all four Step 3 items. No standalone app changes or creative-vault installation.

| Requirement / rule | Evidence | Result |
| --- | --- | --- |
| Organizational folders do not appear as projects | World/Storyboard tests include `00 Overview` with a misleading project-parent tag; native Home excludes the synthetic organizational overview while listing real projects | Pass |
| Custom roots and explicit project boundaries agree across features | Pure/host cases cover configured Books root, explicit overview outside root, custom manuscript folder, inline project marker, shared canon, Librarian brief/scope and writing-credit baseline | Pass |
| Native script dragging persists and readers agree | Dragged Following before Opening in native 1.14.4; reader shows Following first; closed only Marginalia Test Vault and reopened through the vault manager; sidebar still shows Following then Opening | Pass |
| Ordering conflicts, dirty buffers and write failures retain safeguards | Existing predecessor, cross-Group, rollback, competing-write and persistence host/browser tests | Pass |
| Pages move by sidebar drag with their full content | Native last Empty page dragged before Arrival; sidebar becomes Empty (1), Arrival (2), Wide (3–4); one native Cmd-Z restores original order | Pass |
| Panels move between pages with dialogue and notes | Native Lantern dragged to Empty page, carrying its dialogue and editorial note; one Cmd-Z restores original bytes. Pure/real-CodeMirror browser tests cover sibling, empty destination and CRLF cases | Pass |
| No movement buttons; commands have no default shortcuts | UI assertion and command registration tests for page/panel movement and previous/next navigation | Pass |
| Navigation changes only the cursor | Pure boundary/EOF tests and host selection test; native next-page command moves from selected Door passage to Wide heading without editing text | Pass |
| Stale or incompatible drops do not rewrite source | Host stale-editor/module-disabled tests; browser cross-script rejection and Escape cancellation | Pass |
| Touch uses deliberate dragging while normal scrolling remains available | Synthetic touch long-press test reaches the guarded move path; early movement cancels the hold in implementation | Browser verification; physical acceptance pending |
| Unchanged scripts avoid repeated reads/parsing | 1,200 scripts / 7,200 pages / 12 projects synthetic benchmark: warm scan adds zero reads/parses; a changed script adds one read and one parse | Pass in synthetic host |
| Ordinary text edits do not rebuild the outline | Browser retains the same outline node while live source/offsets update | Pass |
| Readers reuse unchanged articles | Browser retains the first article when another project changes or a second script changes; updated script appears correctly | Pass |
| Earlier features still work | 196 automated tests, workspace/desktop/mobile/Compile/Librarian browser suites and Node-unavailable mobile startup | Pass |
| Existing test content is preserved | SHA-256 baseline of all 23 pre-existing Markdown notes; no changes | Pass |

Native testing used the newly created Sidebar Movement Verification project and a synthetic organizational overview only. Page and panel changes were undone; the two new scripts intentionally retain their reordered predecessor properties to demonstrate persistence. A command-palette input timing issue briefly inserted text into the owned synthetic script; native Undo removed it before final source checks. Daily writing count remains zero. Reanimator and Reanimator Review were not edited or updated.

A native HTML drag attempt initially failed to complete; the final implementation uses pointer gestures. Native page/panel/script dragging then passed. Final navigation testing also prompted selection-safe navigation; structural commands retain their clear-selection guard. These are resolved findings, not pending defects.

[Performance data](project-navigation-performance.json) comes from `scripts/check-project-navigation.ts` bundled against the synthetic host. It excludes real disk latency, Markdown DOM work and physical-device performance. Browser evidence comes from `scripts/test-structure-ui.mjs` and the existing regressions. The final package and ZIP are installed only in Marginalia Test Vault.

Remaining physical acceptance:

- [ ] iOS and Android: long-press dragging, ordinary scrolling, cancellation and keyboard/drawer interactions.
- [ ] Native large-project profiling on representative hardware; synthetic timings are not a responsiveness guarantee.
- [ ] Pop-out windows, accessibility, supported versions/themes and other plugin combinations remain in release-readiness bucket 5.
