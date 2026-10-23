# Marginalia Plugin

A desktop Obsidian plugin bringing Marginalia's app pages, script organizer and local AI Librarian into the native workspace.

**Status: first development build.** Source, compiled plugin and synthetic verification are available. It is installed in the isolated `Marginalia Test Vault` under `.preview/`, using fictional notes. Native functional checks passed; source-grounding and prose-quality acceptance remain open. Reanimator and the standalone app remain unchanged. The updated script organizer passes automated checks and native functional checks; native drag-gesture verification is pending because pointer automation stopped responding.

Entry Enhancement and Entry Expansion lead the build. The interface follows `design/reference/librarian-sidebar-concept.png`, with Entry Enhancement and Entry Expansion beneath active-note context in **Review only**. Ask stays conversational; Library browses saved expansions. Selected icons: B (Knowledge lantern) for Librarian and F (Winged M + nib) for the left ribbon. Theme-safe production vectors are in `design/icons/selected/`.

## Included

- Left-aligned app navigation above the native vault viewer; original M ribbon remains Script Studio. Each top-level `_` folder adds its own section below Projects in either vault type, excluding Assets. Crypt, Research and Collections open directly from this menu.
- Home, tabbed Brainstorms/Canon cards, project pages and Storyboard Project Register.
- World/Storyboard layout, app light/dark colors and three independently enabled, collapsible settings sections: Theme, Scripts, Librarian.

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

For the shared-component browser preview, run `npm run preview:build` and open `.preview/index.html` for Librarian or `.preview/scripts.html` for Scripts, and `.preview/workspace.html` for app pages. Its notes and replies are fictional; it is not an installed Obsidian screenshot. UI automation is in `scripts/test-ui.mjs` and `scripts/test-workspace-ui.mjs` and uses Playwright supplied through `MARGINALIA_PLAYWRIGHT` or a local Playwright installation. It does not control Obsidian.

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
