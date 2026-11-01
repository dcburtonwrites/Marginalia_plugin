# Writing and Librarian refinements — October 31, 2026

D-0046 implements four requested plugin changes. No standalone app changes, new dependencies, settings migration or creative-vault installation.

## Requirements and evidence

| Requirement | Evidence | Result |
| --- | --- | --- |
| One failing section does not discard the whole draft | Core incomplete-section warning; host two-section grounding test retains healthy Summary without a warning and flags Backstory; failed-correction test preserves both and limits the correction error to Backstory | Pass |
| Review errors are visible at their section | Production sidebar warning card browser test; Refine/Insert error host tests preserve previous prose and attach warning to the card; unfinished section retained | Pass |
| Saved expansions retain warnings and prior version | Host test replaces generated draft with visible section warning callout and verifies previous saved result in recovery | Pass |
| Source safety is preserved | Stale insertion still makes no editor transaction; changed evidence during review blocks publication; ownership/conflict/cancellation regressions remain | Pass |
| Selected Review action carries progress | Browser checks selected Enhancement aria-busy and in-button source-check text, no duplicate footer label, Cancel available; existing progress-update host test | Pass |
| Large Review buttons hide when results are ready | Browser: two pending cards, warning only on Backstory, no action buttons; dismiss both and both buttons return | Pass |
| Typewriter does not add a gap below Properties | Source moves top spacing to scroll container; real-CodeMirror browser simulated Properties block remains within 30px of content while first/middle/last/typing/resize centering tests pass for desktop and mobile | Pass, browser |
| Native Properties/focus layout | Native Obsidian 1.14.5 test-vault editor, focus toggle, start-of-document navigation; Properties and content stay together with no focus-sized blank block below metadata; focus preference restored | Pass visually, no native pixel measurement claimed |
| Right-edge content menu replaces sidebar View options | Desktop hover/click and phone tap browser checks; native editor, project reader and Reading mode show menu; sidebar no longer has View options; Compile launcher remains | Pass |
| Independent panel/callout/dialogue display | Pure source-range test excludes metadata, code, comments and titles; browser real editor hides all three categories while source bytes remain identical; native Live Preview/project reader checks all three; native Reading dialogue hide/restore | Pass |
| Hidden editing never conceals the active selection | Browser navigates into hidden dialogue and verifies it reappears, source preserved | Pass |
| Existing interactions | 200 tests (126 pure/core + 74 host), typecheck/package; desktop, focus, content controls, Librarian, structural drag/Undo, mobile phone/Android/tablet profiles, Compile and Node-unavailable mobile startup | Pass |
| Original content | SHA-256 of all 34 pre-existing Marginalia Test Vault Markdown files unchanged; no new note/source edits or model generations for native verification | Pass |
| Package and native reload | Final three-file distribution, ZIP and test-vault install match. Final packaged build disabled/re-enabled in native Obsidian 1.14.5; floating View menu and Reading dialogue hide/restore verified after reload. All 34 original Markdown files remain unchanged. | Pass |

Native tests used only Marginalia Test Vault. Shadowverse, Storyboards and Reanimator windows were not edited or updated. The test-vault writing focus preference was returned to its starting enabled value, and all display checkboxes restored to shown. The latest development ZIP is `dist/marginalia-0.1.0-dev.zip`.

## Behavior and limits

- A valid section draft is shown with warnings rather than withheld by incompleteness, an unsupported verdict, an unreadable review or a failed correction. A flagged claim remains unverified prose; a warning is not approval or source verification. Original-note insertion remains explicit.
- The existing correction is bounded to one attempt. A correction failure does not mark healthy neighboring original sections. If review is unavailable and cannot identify affected sections, each returned section discloses that its check could not be completed.
- Malformed output with no usable sections, source/entry changes, cancellation and storage conflicts still prevent unsafe publication/writes. Existing results remain intact. Without usable section content there is no section result to display.
- Expansion warnings are saved as visible Markdown callouts immediately after the relevant section, including Summary. Suggestion warnings remain session state and are not inserted as canonical prose.
- Display choices are local to a pane/file during the session and independent of Compile inclusion. Checked means shown. Native manual page/callout folding remains separate. Hidden source ranges reveal themselves if the editor selection enters them.
- Dialogue follows comic script speaker syntax (bold speaker labels, or plain uppercase names) and excludes known structural field labels. This is not a prose dialogue detector or writing-diagnostics feature.
- Physical iOS/Android behavior, keyboard/rotation and additional themes/popouts remain acceptance items. Browser mobile profiles are not physical-device verification.

## Evidence files

- `../../design/verification/librarian-review-progress.png`: source-check progress inside the selected action.
- `../../design/verification/librarian-section-warning.png`: localized warning and results without large launch buttons.
- `../../design/verification/content-controls-desktop.png` and `content-controls-mobile.png`: native editor components in browser layouts.
- `../../design/verification/native-content-controls-2026-10-31.png`: actual Obsidian Reading menu during the native test pass.
- `scripts/test-content-controls.mjs`, `scripts/test-focus-scroll.mjs`, `scripts/test-librarian-reliability-ui.mjs`: interaction checks; core/host tests cover section recovery and source guards.
