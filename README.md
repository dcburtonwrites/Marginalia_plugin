# Marginalia Plugin

An Obsidian plugin bringing Marginalia's app pages and script organizer to desktop/mobile, with a local AI Librarian on desktop.

**Status: first development build.** Source, compiled plugin and synthetic verification are available. It is installed in the isolated `Marginalia Test Vault` under `.preview/`, using fictional notes. Native functional checks passed; source-grounding and prose-quality acceptance remain open. Reanimator and the standalone app remain unchanged. The updated script organizer passes automated checks and native functional checks; native drag-gesture verification is pending because pointer automation stopped responding.

Review starts with Entry Enhancement, Entry Expansion, Entry Development and Vault Review. Selecting an action hides the alternatives. Development opens a saved, adaptive conversation with individually accepted changes; Vault Review produces a source-linked checklist. Ask stays conversational; Library resumes developments/reports and browses saved expansions. Selected icons: B (Knowledge lantern) for Librarian and F (Winged M + nib) for the left ribbon. Theme-safe production vectors are in `design/icons/selected/`.

## Included

- Left-aligned app navigation above the native vault viewer; original M ribbon remains Script Studio. Each top-level `_` folder adds its own section below Projects in either vault type, except names listed under Theme → Hidden folders. `_Assets` is the editable default exclusion. Crypt, Research and Collections open directly from this menu.
- Home, tabbed Brainstorms/Canon cards, project pages and Storyboard Project Register.
- World/Storyboard layout, app light/dark colors and independently enabled Theme, Scripts and Librarian settings. Desktop World vaults also offer opt-in Timelines.

- World Timeline with ordinary Calendar notes, date validation, location lanes/grouping, filters, zoom, parallel-calendar display, event details and read-only undated chains. Enable under Settings → Marginalia → Timelines, then use its ribbon icon or Open World Timeline command. Per-entry timelines open beside Librarian and show derived state/location histories, own-date precedence and unresolved conflicts. View → Snapshot at time opens a date scrubber and state/location table with source evidence. Librarian uses source-linked timeline dates, precedence and diagnostics. Structured editing is deferred; ordinary note properties remain editable.

- One Script Studio sidebar tab with a project/grouping dropdown, scoped outline and persistent writing-session scope.
- View options with Collapse/Expand all and Collapse/Expand panel descriptions; labels reflect the main script/project fold state.
- Optional sidebar countdown and daily word goals for All projects, Current project or Full vault.
- Left Scripts organizer with virtual pages/panels and drag ordering that automatically maintains Preceded By properties.
- Native page/panel insertion and panel move commands; panel ownership and authored titles preserved.
- Script typing shortcuts: `/P`, `/p`, `/d`, `/t`, `/c`, `/cn`, `/ct`, `/cw`, `/cd`, `/cs`, `/ce` followed by Enter, with one-step conversion Undo. Clean panel bodies and a local character dropdown for dialogue.

- Ask / Review / Library sidebar, active-note context, session pinning and explicit references.
- Local Ollama connection and installed model selection; streamed activity, separate timeout/connection errors, no cloud fallback or automatic downloads.
- Original-source retrieval, section suggestions, refinement, dismissal and explicit undoable insertion.
- Hidden `.marginalia/expanded/<entry path>.md` output, expansion library and plugin-owned read-only reading tabs, with source inventory and staleness checks.
- Guards against stale input, cancellation, path escapes, generated self-evidence and replacement of standalone-owned expansions.

Open the M ribbon and choose a project or grouping from the menu above the outline. Choose a project to work with all its groupings, or a grouping to limit Scripts to that session. Switch scope using the same menu. **View options** controls script folding. The footer has a countdown (25 minutes by default) and today's tracked words. In **Settings → Marginalia → Scripts → Writing session**, change duration, hide either item, choose a word-goal scope and set a target. Current project supports its own target; 0 hides the goal bar. Counts track net local editor additions from plugin startup, with Undo/deletions reflected; they do not backfill earlier writing. Reload restores the countdown paused.

## Build and verify

Requires Node 22.18+ for development. Node is not a separate plugin runtime installation requirement.

```sh
npm ci
npm test
npm run typecheck
npm run package
```

The three installable development files are prepared in `dist/marginalia/`: `main.js`, `manifest.json`, and `styles.css`. Nothing is copied to a vault automatically. Real-host acceptance should use a disposable vault before any live-vault adoption.

For the shared-component browser preview, run `npm run preview:build` and open `.preview/index.html` for Librarian or `.preview/scripts.html` for Scripts, and `.preview/workspace.html` for app pages. Timeline settings and the World Timeline have `.preview/timeline.html` and `.preview/world-timeline.html` previews. Its notes and replies are fictional; it is not an installed Obsidian screenshot. UI automation is in `scripts/test-ui.mjs` and `scripts/test-workspace-ui.mjs` and uses Playwright supplied through `MARGINALIA_PLAYWRIGHT` or a local Playwright installation. It does not control Obsidian.

The optional `scripts/check-local-ai.ts` smoke test uses only fictional notes and a running local Ollama model. No creative-vault content is read or sent by that test.

See [verification](docs/VERIFICATION.md), [roadmap](docs/ROADMAP.md), [decisions](DECISIONS.md), and [project handoff](docs/PROJECT-CONTEXT.md). Existing app source remains in `/Users/dante/Documents/GitHub/ai/Marginalia_codex`.

## Remaining acceptance work

Native startup, light/dark rendering, local generation, persisted insertion with one-step undo, hidden expansions, read-only tabs, Library, source links, cancellation, staleness, search exclusion and context pin/unpin have been checked in Obsidian 1.14.4 with fictional fixtures. The corrected build remains installed there. See `docs/verification/native-acceptance.json` and `design/verification/native-installed-final.png`.

**Prose quality is not accepted yet.** The native model sample adds unsupported purpose/capability claims and repeats some details. Tighter grounding and representative canon-type evaluation are required before live-vault adoption. Hidden-folder Sync portability and simultaneous standalone/plugin use remain unverified.

Legacy expansions with the inspected inline JSON metadata and Markdown draft can be read. Earlier sections-only artifacts are preserved but not rendered in this increment; no migration or overwrite is performed.


Scripts appear from existing `Scripts/` folders, or explicit `role: manuscript` and `format: comic-script` properties. The M ribbon opens Script Studio; the lantern and Open Librarian command keep Librarian available. Click an arrow to expand/collapse; click a script or page name to open it. Click a project name to read all its scripts in order, with headings linking to the editable notes. Drag script names to reorder: missing Preceded By fields are filled automatically, existing fields determine order, and drops update the chain. The first script has an empty predecessor. Conflicts stay visible until resolved; unsaved/newer edits block unsafe order writes. Type a shortcut alone on a line and press Enter in a script editor. `/P` creates a page; `/p` a panel; `/d` dialogue; `/t` title/display; `/c` or `/cn` a note; `/ct`, `/cw`, `/cd`, `/cs`, `/ce` create tip, warning, danger, success and example callouts. Commands are case-sensitive and do not run in code/frontmatter or ordinary notes. The `/d` character dropdown includes frontmatter characters, prior speakers and known character mentions, preserving plain names or wikilinks. Type to filter, use arrows and Enter/Tab or click, then write over the selected Dialogue placeholder. Escape keeps the speaker editable. Page moves and export remain future work.

Choose **Script template location** under Marginalia → Scripts settings, using a vault-relative path with dropdown suggestions. Right-click a folder and choose **Create a New Script**, or use **New Script** beneath Script Studio's active list. Name the script and choose its grouping (blank means Top-level). Creation copies the template, adds script identity and ordering fields, and opens the new note. The template itself is preserved; template code is copied literally and is not executed.


Every Marginalia menu page now has **New Entry** at the right of its main header. Choose Brainstorm, Canon or Project, then a subtype where relevant, title, destination and template. Missing folders can be created as part of the operation. **Theme → Vault type → Configure vault…** opens the setup table for canon types and folder/template routes. Inputs suggest matching vault paths as you type. Status Flow suggests used property names; statuses are typed directly in the ordered list. Home reference pinning is searchable.

Double-click the countdown to change only the next session’s duration. A running or paused session must finish or be reset first; Reset returns to the settings default. Script sidebar pages start closed, with panels revealed by their page arrow.

## Mobile development build

The current package allows mobile loading. Use the same three plugin files (`main.js`, `manifest.json`, `styles.css`) from `dist/marginalia` in your mobile vault’s `.obsidian/plugins/marginalia` folder, then enable Marginalia in that vault. This build is not yet a published community-plugin release.

Open the native Files drawer for the app menu, or use Marginalia: Open Home from the command palette. Use Marginalia: Open Script Studio for the script drawer. Choose a script to write in the native editor; slash commands followed by Enter retain conversion Undo. Mobile dialogue uses a native searchable character dialog with explicit choices or a new name; Enter never silently accepts a first result. Desktop retains the inline dialogue dropdown. Librarian is desktop-only in this version and explains that limit on mobile. Your desktop Librarian preferences are preserved.

Automated loading and phone/tablet browser checks pass; physical iOS/Android acceptance is pending. Before v1, check the actual Files drawer menu, World/Storyboard pages, opening/scoping scripts, all slash shortcuts with the device keyboard, touch character selection, Undo, background/resume and note/settings persistence. Plugin settings/hidden-file sync behavior is not guaranteed by these checks.

Additional developer checks after packaging: `node scripts/verify-mobile-load.mjs`; after preview build, run `node scripts/test-mobile-ui.mjs` with Playwright available through `MARGINALIA_PLAYWRIGHT`.

### Optional writing tools

Under **Settings → Marginalia → Scripts**, enable **Focused writing** to emphasize the active paragraph and keep the typed line centered in native script editors (upper third of the visible editor on mobile, above the keyboard). It is off by default; the **Toggle focused writing** command is also available without an assigned shortcut.

Enable **Record session history** to keep countdown-session minutes and added/deleted/net words. **History & progress** in Script Studio, **View history** in settings, or the **View writing history and progress** command opens session rows, 7/30-day totals, CSV export and confirmed clearing. History is off by default, local to plugin data, capped at 500 finished sessions, and excludes pauses/imported changes/offline time. Reload restores the countdown paused. Project/Group labels reflect the initial selection; word totals include all eligible notes edited during the running timer.

Groups provide draft separation. In Script Studio, choose a project/Group and click **Compile PDF…**. Choose included scripts and use **Content Selections** for **Panel Descriptions**, **Callouts and Notes** and **Title page** (all on by default). A selected title page asks for an author name, prefilled from previous prints in this vault, and includes a dated subtitle and byline. Expand **Advanced** for paper, numbering, metadata and script breaks. **Preview PDF** opens the generated desktop PDF with sheet navigation; **Export PDF…** opens the native save dialog. Source or image edits require rebuilding the preview. Preferences are saved per project/Group.

On mobile, **Preview script** provides the compiled script with the same options; export the PDF on desktop. External/unsupported images and embedded notes are explicitly omitted with warnings. Desktop export depends on the host’s local print capability; unavailable hosts retain readable preview and show an explanation. [PDF compilation notes](docs/PDF-COMPILE-NOTES.md) document behavior and app references. EPUB is excluded.


### Automatic script numbering

Script Studio, native **Reading view**, and the continuous project reader calculate numbers from the current page/panel sequence. Named panels show **Panel 1 — Name**, restarting each page. Spreads consume two page numbers; inserting/deleting pages adjusts later labels and group ranges automatically. Stale or missing `Pages` metadata is reported but does not control numbering.

Source/Live Preview keeps authored text unchanged. Use `## Page ? — Name` as a placeholder if preferred, then save/switch to Reading view for authoritative numbering. Numbers in existing headings are ignored for the rendered sequence. No automatic edits or extra Undo steps are introduced.


### Opening the Librarian

On desktop, enabling Librarian adds its tab to the right sidebar without taking focus. To reveal it, use **Command Palette → Marginalia: Open Librarian**, click the note-header lantern, or choose **Settings → Marginalia → Librarian → Open Librarian**. If the module is disabled, enable it in settings first. Librarian remains desktop-only.


Librarian reliability now uses configured project boundaries, validates original-note citation destinations and discloses apparent incomplete answers, missing citations and omitted context. Custom entry templates supply writing sections; project overviews receive a project brief. Revised prompts avoid inferring ownership, recurring traits or completed actions from indirect scenes. Review the [fictional before/after writing samples](docs/verification/librarian-writing-comparison-2026-10-24.md); wider prose-quality acceptance remains open.
