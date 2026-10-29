# Compact dialogue picker trial — October 25, 2026

D-0045 implements the owner's approved reversible trial in the Obsidian plugin only. Installed in the authorized Reanimator iCloud vault and packaged in `dist/marginalia-0.1.0-dev.zip`; the test-vault installation also has matching files. No saved-data schema or note migration.

## Behavior

`/d` plus Enter retains the existing native shortcut transaction. On mobile, the editor blurs and a native Modal appears as a compact bottom sheet with up to six character buttons. It starts without a visible/focused text field. Recent successful choices for the current script come first; recency is bounded, in memory and resets with the plugin session. Search or add a name explicitly opens the search field, makes the complete cast available, and exposes a named Use action for entered text. The sheet tracks the owner window's visual viewport. Selection and Cancel synchronously restore native editor focus; choosing selects Dialogue, while Cancel leaves SPEAKER selected. The existing source/document/file checks, isolated Undo, mobile lifecycle cleanup and desktop inline dropdown remain.

## Verification

| Requirement | Evidence | Result |
| --- | --- | --- |
| Existing behavior/build | 196 automated tests (125 pure/core + 71 host), typecheck/package | Pass |
| Bottom layout with no initial text focus | Production component in phone/Android/tablet Chromium profiles; native iPhone Mirroring screenshot | Pass at these boundaries |
| Six quick choices; full cast searchable | Eight-candidate browser fixture shows six quick choices; search selects the eighth; previous successful Orin sorts first | Pass, browser |
| Native recent ordering | Explicit Orin choice, Undo/reopen; Orin appears before Mira | Pass, iPhone |
| Explicit character choice and focus | Native Orin tap closes sheet and selects Dialogue in editor; subsequent Undo restores SPEAKER, then `/d` | Pass, iPhone with Mac keyboard |
| Repeated Enter cannot pick first item | Native host focuses first character button after opening; repeated Enter leaves sheet open; browser tests also exercise repeated soft line breaks | Pass at observed boundaries |
| Optional search/custom name | Native Search opens field; type Nova; Enter does not accept; explicit Use “Nova” selects Dialogue in editor | Pass, iPhone with Mac keyboard |
| Cancel | Native tap closes sheet with SPEAKER selected; no name replacement | Pass, iPhone |
| Stale source and destroyed editor | Browser regression edits document while open (no overwrite); destroys editor (sheet closes) | Pass, browser |
| Viewport changes during search | Browser reduces viewport to 60% height with search open; sheet stays within visible bounds in all three profiles | Pass, simulated viewport |
| Desktop behavior | Real-CodeMirror browser desktop inline dropdown/arrows/Enter retained; no mobile dialog | Pass, browser |
| Other Modal consumers | Compile and workspace browser regressions after realistic preview Modal wrapper change | Pass, browser |
| Preservation | All 60 original creative-vault Markdown hashes unchanged; only the owned fictional Device Checks script changed during owner/assistant testing | Pass |
| Final installation and rollback | Three installed files match distribution; prior ZIP contents match saved previous three-file build | Pass |
| Actual software keyboard animation/IME/Android | Mirroring uses the Mac hardware keyboard. No measured direct-device animation, keyboard reopening, IME or physical Android acceptance | Pending owner device trial |

The owner enabled the installed trial and performed an initial check; afterward Mira: Dialogue was visible with Dialogue selected. Native automation then separately observed bottom placement, Orin choice, recency, search/custom name, Cancel and Undo. The owner's short “Done” reply is not treated as a specific confirmation of software-keyboard smoothness. Mirroring intermittently displayed taps without applying them, requiring reconnection and owner-assisted toggles; keyboard shortcuts and later taps allowed the functional checks. These tool problems are not attributed to the picker.

Assistant-added test dialogue was undone; the owner's Mira: Dialogue example remains in the fictional project. No model calls, settings edits, new persistence, dependencies or original-script edits.

## Rollback

The previous working dialog is preserved locally under `.rollback/dialogue-picker-2026-10-25/`, ignored by Git:

- `marginalia-before-bottom-picker.zip`: prior installable three-file plugin.
- `plugin/`: prior main.js, styles.css and manifest.json.
- `source/`: prior mobile picker, styles, browser harness/test and governing-document snapshots.
- `base.txt`: starting Git revision; `README.md`: restore instructions.

To revert the installed trial: disable Marginalia, replace only main.js/styles.css/manifest.json from the saved build, retain data.json, and enable Marginalia again. No data migration is needed. Restore source selectively; never blindly replace later unrelated work or rewrite subsequent decision-log entries.

## Screenshots

- `../../design/verification/dialogue-picker-2026-10-25/iphone-quick-picker.png`: actual native quick choices.
- `../../design/verification/dialogue-picker-2026-10-25/iphone-search.png`: explicit new-name action.
- `../../design/verification/mobile-{phone,android,tablet}-character-dialog.png`: initial quick sheet in browser profiles.
