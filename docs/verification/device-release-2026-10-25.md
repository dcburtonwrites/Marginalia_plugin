# Device and release checks — October 25, 2026

Step 4 (optional writing diagnostics) was skipped at the owner's request. Step 5 is **partially verified**, with the remaining physical-device/platform checks below. No blanket mobile-release approval is claimed.

## Environment and preservation

- Native iPhone Obsidian through Apple's iPhone Mirroring, using the authorized iCloud **Reanimator** vault. The phone's exact hardware/iOS/Obsidian versions were not recorded. Mirroring sends Mac keyboard/pointer input and is not a software-keyboard/IME or direct-finger test.
- Native macOS Obsidian **1.14.5**, using **Marginalia Test Vault** for the desktop popout check.
- Installed final production `main.js`, `styles.css`, `manifest.json`; file digests match the distribution. The final iPhone history screenshot displays the new singular session label, establishing that the final script was actually loaded there.
- Before installation: backed up the installed plugin, plugin data, community-plugin list and appearance/app settings under `/private/tmp/marginalia-step5-backup`. This temporary backup is local recovery, not a durable backup product.
- SHA-256 comparison: **all 60 pre-existing Reanimator Markdown files unchanged**. Editing used only the new fictional `08 Projects/Marginalia Device Checks` project. The test command and conversion were undone; its script retains one extra blank line from the editing exercise.
- Original writing preferences, module choices and saved compilation-author preference restored. The two fictional project notes, one finished sample session, a compilation configuration scoped to that project, and one writing-history CSV remain for review. Ordinary recent-note/selection state changed during navigation. No original note filing, model call, dependency, app-source change or Librarian generation.
- Nine existing community plugins were enabled during the iPhone smoke pass: Auto Note Mover, Templater, Recent Files, File Explorer Note Count, Iconize, Paste image rename, Tag Wrangler, Git and Marginalia. Coexistence during this workflow is not full compatibility certification of every action in those plugins.

## Requirement → evidence → result

| Requirement or rule | Evidence | Result |
| --- | --- | --- |
| Production builds and retains existing behavior | 196 tests (125 pure/core + 71 host), typecheck/package; desktop, workspace, structural, numbering, Librarian, focus, writing-history, Compile and mobile browser suites; Node-unavailable mobile startup | Pass, automated boundary |
| Native mobile drawer placement/navigation | Reanimator Files drawer → Projects → fictional project → Write in Script Studio; destination opens and drawer closes; native Studio drawer shows Compile, scope, outline and footer | Pass, iPhone |
| Named pages and panels are numbered | Authored Page 81/99/4 displays as 1/2/3 in outline/project reader/Reading; named panels display 1/2 with names retained | Pass, iPhone; middle insertion/deletion still pending direct device test |
| Focused writing stays near upper third | Named panel navigation and `/d` typing show active line in upper region with surrounding paragraphs dimmed; source literals remain authored | Pass visually with mirrored hardware input; no precise native pixel/soft-keyboard claim |
| Mobile character chooser is explicit | `/d` + Enter opens native modal; another Enter leaves it open; tap Orin selects Dialogue; Undo restores selected SPEAKER; next Undo restores `/d`; reopen + Cancel leaves SPEAKER selected | Pass, native iPhone with Mac keyboard |
| Compilation stays within one Group | Native Group select requires Device Tests before options are shown | Pass, iPhone |
| Compile content defaults and title page | All three content choices checked; author entry accepted; preview shows Group · October 25, 2026 and By Marginalia Device Test | Pass, iPhone |
| Mobile preview without PDF export | Rendered script preview includes calculated labels; explicit desktop-only explanation; tapping unavailable Export PDF does not export | Pass, iPhone |
| Countdown and short background/resume | Start 25:00 → 24:57; Home/app switcher/resume → 24:24; Pause at 24:19; Reset to 25:00 | Pass, short native lifecycle; not prolonged suspension/termination |
| Session report and export | One stopped session, about 41.7 active seconds, 0 words; visible 7/30-day summaries; CSV exported on phone and read on Mac | Pass, iPhone/iCloud |
| History/settings persist after reload | Whole plugin disabled, final build installed, re-enabled; unbound View writing history and progress command opens same saved session with corrected “1 session” label | Pass, final iPhone build |
| Scripts-module cleanup | Disabling closes Studio/project/Compile leaves, restores authored Reading numbers; native file sidebar remains; re-enable restores script registration and retains settings/history | Pass, iPhone |
| Mobile Librarian boundary | Native settings show desktop-only explanation with no mobile model controls; production Node-unavailable startup regression passes | Pass at observed UI/loading boundary |
| Native desktop popout | Project reader moved to new window; page disclosure collapsed its content; popout closed and original project reopened from Studio | Pass, macOS 1.14.5 |
| Ordinary iCloud delivery | Mac-created fictional project visible on phone; phone author/session/settings and CSV arrive on Mac | Pass for these ordinary files/settings only |
| Original content and final installation | Integrity JSON: 60 original hashes unchanged; production files match; writing preferences/modules/author restored | Pass |

A small report-copy defect found on the phone (“1 sessions”) was corrected to “1 session”, rebuilt and reverified on the final physical-phone build. The 196 tests and writing-feature browser suite pass after that correction. Other suites were run immediately before this copy-only change.

## Remaining checklist

- [ ] **Direct iPhone input:** software keyboard, predictive text, IME/composition, repeated soft Enter, picker search/custom name, focus target with keyboard resize and rotation.
- [ ] **Structural dragging:** long-press page/panel moves, cross-page complete-content movement, dynamic numbering and one native Undo with a finger. The Mirroring drag attempt navigated to the panel instead of moving it; its gesture does not establish the required held touch.
- [ ] **Numbering after edits:** insert/remove a middle page and named panel, then save/Reading/project view/Compile; check spreads and Side overrides on device.
- [ ] **History table on a phone:** Started/Project/Minutes are visible, but later table columns are clipped to its horizontal scrolling region. Mirroring's horizontal scroll attempts did not expose them. Confirm direct-finger horizontal access; if it also fails, fix the mobile report layout. CSV includes all columns correctly.
- [ ] **Long lifecycle:** lock/background for a representative writing session; force termination/reopen and remaining-time restoration; completion notice and paused/resumed word credit. The short Home/resume check is not this test.
- [ ] **Physical Android/tablet:** native drawer, keyboard/IME, modal choice/Cancel/Undo, touch dragging, rotation, history/settings persistence and Compile preview. Chromium profiles are supporting evidence only.
- [ ] **Windows/Linux PDF:** actual native print engine, Letter/A4 pagination/assets, preview navigation, save/cancel/errors and source preservation. macOS PDF was verified in the earlier Compile acceptance, not rerun in this pass.
- [ ] **Hidden Librarian files:** `.marginalia/expanded` and `.marginalia/recovery` arrive through the actual sync setup and reopen on a second desktop. Ordinary iCloud CSV/settings delivery does not establish this. Mobile Librarian remains unavailable.
- [ ] **Compatibility breadth:** additional themes/CSS snippets and plugin workflows, user-assigned shortcut conflicts, editor/Studio/Compile/Librarian popouts and repeated load/unload; representative sustained large-project device profiling.

## Evidence

- `device-release-integrity-2026-10-25.json`: preservation and final installed-file checks, without private note contents.
- `../../design/verification/device-2026-10-25/iphone-compile.png`: native dated/bylined preview and platform explanation.
- `../../design/verification/device-2026-10-25/iphone-character-picker.png`: native unselected chooser after repeated Enter.
- `../../design/verification/device-2026-10-25/iphone-focus.png`: focus presentation in the fictional script.
- `../../design/verification/device-2026-10-25/iphone-history.png`: final production history survives reload and displays singular label.
- `../../design/verification/device-2026-10-25/iphone-mobile-settings.png`: explicit mobile Librarian boundary.
