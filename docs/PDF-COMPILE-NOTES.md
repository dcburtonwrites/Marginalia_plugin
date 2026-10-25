# Compile comic scripts to PDF

Implemented for the plugin under D-0039. Entry: Script Studio → Compile PDF… (or the command palette). Desktop PDF export; mobile script preview. PDF only; EPUB is excluded.

## Current workflow

1. Select exactly one Group; compilation uses its existing reading order. Repair order warnings before proceeding. No separate manuscript ordering authority.
2. Content Selections contains Panel Descriptions, Callouts and Notes and Title page, all enabled for fresh options. Existing saved choices remain respected. There are no presets. The included-script checklist can omit files without modifying the Group.
3. A selected title page reveals a required author-name input, remembered per vault across Groups after preview and editable for future prints. The subtitle appends the current local date to the Group; a By author byline follows. Preview snapshots both values. Advanced: Letter/A4, numbering restarted per script/continued through Group, per-script physical sheet breaks, metadata and PDF sheet numbers. Options persist per project and Group.
4. Desktop preview shows the generated PDF itself one sheet at a time. Export writes those bytes through the native save dialog. Mobile shows the semantic script without claiming PDF pagination. Restored preview tabs need an explicit rebuild.

## Boundaries and limitations

- Read-only source snapshot; current source/order/image changes block outdated export. Continuous numbering keeps excluded scripts’ original positions. Declared Pages is diagnostic; actual page slots determine labels and spreads count twice.
- Frontmatter is excluded unless metadata is enabled. Comments are omitted; fenced code stays literal. Panel-body inclusion is independent of temporary folds/focus/theme styles.
- Local PNG/JPEG/GIF/WebP: up to 20 MB each, 100 MB total. Embed as data URLs. Other assets, note transclusions and remote images receive readable omission markers and warnings; no remote-image downloads.
- Desktop uses Obsidian’s Electron host capability, not a public cross-platform export API. Missing capability produces a readable preview and clear error. Native macOS verified; Windows/Linux and physical mobile remain acceptance items.
- Save cancel does not write; temporary sibling plus rename protects previous output on write failure. A preview closed/rebuilt or Scripts disabled cancels pending work and closes compilation options.
- No new runtime dependency, cloud service, arbitrary user-code execution or EPUB.

## Standalone app references inspected

Read-only source: `../Marginalia_codex/apps/marginalia/src/ui/Scripts.tsx` and `Print.tsx`.

- Group export selects a Group and displays script count and chain-order messaging. Scripts requiring attention follow confirmed chains in the current app; decide explicitly how plugin warnings affect export rather than silently inheriting that policy.
- Options: **Collapse Panel Descriptions** and **Exclude frontmatter**. Group export requests per-file breaks.
- Printing operates on a separate clone, removes interactive controls, replaces clickable link controls with plain labels, and expands temporary page folds. Panel-description inclusion follows the explicit export choice.
- Waits for fonts and image decoding before invoking native print. Retains the print-only copy while an asynchronous native print sheet reads it.
- Print availability is platform/adapter-dependent. The app's Tauri bridge is not an Obsidian API; determine supported Obsidian desktop/mobile PDF paths before choosing the plugin implementation.

## Longform lessons

[Compile workflows](https://github.com/kevboh/longform/blob/main/docs/COMPILE.md) separate per-scene transformations, joining and final output. Apply that separation internally for predictable content transformations and preview, without importing arbitrary user-script execution or adding a second ordering authority.

[Ignored scenes](https://github.com/kevboh/longform/blob/main/docs/MULTIPLE_SCENE_PROJECTS.md#unknown-scenes--ignored-scenes) illustrate keeping scratch notes beside manuscript files while excluding them from output.

## Verification

Model and phone/tablet browser tests cover isolation/order, filtering, literal examples, numbering/spreads, checklist/empty selection, content defaults, author/date behavior and saved preferences. Native Obsidian 1.14.4/macOS test-vault runs generated a two-sheet Letter PDF and five-sheet A4 PDF (cover, local image, long dialogue, hidden descriptions and visible remote-image omission). Every physical sheet was rendered and inspected. A source edit disabled export; all 19 pre-existing test-vault Markdown notes retained their hashes. See VERIFICATION.md for the remaining platform acceptance checklist.
