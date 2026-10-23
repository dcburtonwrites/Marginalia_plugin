# Marginalia plugin

The current owner decisions in PROJECT-CONTEXT.md and DECISIONS.md govern. The reference mockup governs appearance; its generic book icon and “Suggest additions” are superseded.

- Desktop Obsidian, local Ollama, selectable installed local model. No cloud fallback or automatic model download.
- Left ribbon: winged M/nib opens Script Studio in the left sidebar. Right sidebar and native note-header action: lantern.
- Follow active note; pin holds current context. Ask / Review / Library tabs. Active-note context, references, local status, conversation and composer follow the mockup.
- Entry Enhancement and Entry Expansion appear beneath context only in the Review tab. Ask remains conversational and Library browses saved results. Enhancements provide finished section prose with source excerpts. Insert adds a single section addition using an undoable native editor transaction; Dismiss removes it. Pending suggestions and conversations are session-only, keyed to the target note. New chat clears that note's conversation; review suggestions remain available.
- Retrieval includes original target text, aliases, resolved links, incoming links, explicit mentions and bounded supporting lore. Script mentions retain adjacent same-page context. Declared blank fields are not facts. Ambiguous aliases must not merge identities. Exclude generated, research, archived and provisional sources from evidence-based entry writing. Sources, offsets and omission counts are inspectable.
- Expansions are supported synthesis, not invention. Store only under `.marginalia/expanded/<relative entry path>.md` through the adapter. Canonical source remains unchanged. Open in a plugin-owned read-only main tab/split with Generated / Not canon, original link, time, sources, staleness and Regenerate.
- Exclude expansions from canonical search/retrieval. No export or editable generated-note conversion in this increment.
- Preserve existing hidden artifacts. Read compatible standalone expansion metadata; never overwrite an artifact owned by the standalone app in this increment. Reject malformed files and competing changes.
- Errors and cancellation retain previous results. Source changes during generation invalidate the result. Changing context does not attach a result to a different note.
- Templater remains responsible for executing templates; the plugin does not run template code or alter native shortcuts or filing. Script ordering properties are maintained only by the script workflow below.

Deferred: remaining script editing/export features, mobile, cloud, hidden-folder sync verification and legacy expansion migration. Placement immediately beside Source Control and note-header button ordering are host-controlled and require verification in Obsidian.


## Script organizer increment

- Left Scripts pane: project/group → script file → virtual page → virtual panel. Notes stay in native Obsidian editors; Longform is not required.
- Existing Preceded By properties determine reading order. Missing fields are automatically created from the unambiguous current sequence; the first script has an empty predecessor. Old plugin order only seeds migration/ties where links are absent. Do not overwrite conflicting, dangling or cyclic claims during automatic fill; show them for resolution.
- Dragging scripts within a project/group updates the complete predecessor chain in source frontmatter, including the old and new neighbors. Existing Followed By fields are updated as compatibility projections; they are not a competing authority once predecessor fields exist. New fields use full vault-relative wiki links without the .md suffix.
- Prepare and validate all property changes before writing. Reject stale snapshots and dirty editor buffers, atomically compare/write each file, and roll back prior changes when a later write fails if those files still match the plugin's write. Preserve newer author edits. This is not a cross-process multi-file transaction.
- Arrows alone expand/collapse each level; names navigate without toggling expansion. Script names open their notes, page names open the correct heading. Remove sidebar Move Up/Down, Open script/page and adoption buttons. Script ordering uses drag and drop.
- Project names open a continuous read-only reading view of all script notes in order, with groups shown separately and script headings linking back to native editors. No combined source file is created; closing/reloading restores the view from project state.
- No automatic filing or template execution.
- The Scripts outline updates through native vault, metadata, editor and workspace events; no manual Refresh control.
- A Double Spread ends on Right, so the next inferred or newly inserted page is Left, followed by Right. Explicit authored Side overrides remain valid.
- Display declared Pages separately from actual slots, show count mismatches, respect Side and two-slot Double Spread, and compute group ranges from declared counts. Missing/invalid declared counts leave later ranges unknown.
- Panel numbering resets per page and is display-only. Authored titles remain unchanged. Navigation opens the file at the selected page/panel in the native editor.
- Commands insert a page at the end, insert a panel after the current panel, and move a panel up/down within its page. Moves include all owned source through the next sibling panel/page (dialogue, notes and overrides). Each edit uses one native transaction. No default shortcuts are assigned.
- Exact Enter slash commands are enabled in comic script editors (see below). Speaker completion, page reordering, script creation and export remain later increments.


## Script Studio and writing sessions (D-0012 / D-0013)

The M ribbon opens one native left-sidebar Script Studio tab. Its Project or grouping dropdown switches between all groupings in a project and a specific grouping; the scoped Scripts outline and writing footer remain in the same tab. Opening the tab preserves the main editor. A project opens its complete ordered reader and scopes Scripts to all its groups. A grouping opens that reader with only its scripts and scopes the sidebar accordingly. The project/grouping menu remains available above the outline; unrelated note navigation does not change the chosen writing scope.

Below the outline, above the vault bar, show a countdown and today's net new words. Settings independently hide each, change countdown duration, and set a daily goal. Modes are All projects (all recognized script notes), Current project (selected project, including its other groupings), and Full vault (ordinary Markdown notes, excluding templates/hidden storage). All modes measure today's tracked local editor changes, not current manuscript size. Opening notes/importing changes does not earn words; Undo/deletions adjust the total. Existing text becomes the baseline on startup, and local midnight resets daily totals. Counting excludes frontmatter and automatic script scaffolding. No historical/offline writing attribution is promised.

Start/Pause/Reset control the countdown. Default is 25 minutes; duration is configurable from 1 to 1440 minutes. Reload restores the remaining time paused. Goal 0 shows words without a target bar; Current project permits a separate target for each project. Hidden controls retain their tracking state.


View options in Script Studio offers two state-dependent controls for the most recent main script editor or project reader: Collapse all / Expand all, and Collapse panel descriptions / Expand panel descriptions. Expand all appears only while some content is collapsed; expanding panels alone leaves page folds intact. Collapse all folds page content; panel-only folding opens pages and hides only panel descriptions, keeping their titles, dialogue, notes and locations visible. Expand all reveals everything. These actions do not edit source. Ordinary notes are excluded. In native Reading mode, an individual script switches to editing before applying native folds. The project reader uses local disclosures. Compile/export will later join this tab; it is not an enabled placeholder. Shortcuts are the next requested increment.


## Script typing shortcuts (D-0018)

Type an exact command on its own unindented line and press Enter in native Source or Live Preview. /P creates a page with the next local number and inferred Side; /p creates a panel; /d creates dialogue with SPEAKER selected; /t creates a quote callout for title/display. /c and /cn create a note, /ct a tip, /cw a warning, /cd a danger, /cs a success, and /ce an example. Callout placeholder text is selected for replacement. Commands are case-sensitive: /P and /p differ. /P can start an empty script; other commands require an existing page. In Markdown, the new block replaces the command line at the current cursor position; downstream authored text/headings are preserved rather than reserialized.

Conversion is one isolated native history step: Undo restores the typed command, and a further Undo can undo typing separately. Unknown commands, ordinary notes, templates (including _templates), code fences, indented/quoted/list text, frontmatter, HTML comments, math blocks, selected text and multiple carets retain native Enter behavior. Shift/Alt/Ctrl/Command+Enter and composition are not captured. Existing Obsidian/Templater key bindings and execution remain owned by those tools. No default OS shortcuts are assigned.


## App pages, appearance and modules (D-0019–D-0021)

Place a left-aligned app menu above the existing native vault viewer. World exposes Home, Brainstorms, Canon and Projects; Storyboard exposes Home, Project Register and Projects. Both append one menu item for each top-level underscore-prefixed folder, excluding Assets (including _Assets, case-insensitive). Crypt, Research and Collections come first below Projects when present, followed by additional shared folders alphabetically. Empty shared folders qualify; nested folders become tabs within their own section. Creation, rename and deletion update the menu live. Keep the original M ribbon for Script Studio in its existing location. Home offers Continue Writing, pins and recents; Brainstorms/Canon use searchable cards and folder/category tabs; projects offer folder tabs and original-note links. Storyboard adds a status register. Shared areas have their own menu entries and searchable folder-tab pages, with no shared-area buttons inside Project Register. These views browse live vault notes and open the native editor; creation/template execution and inline register editing are not included.

Settings has three collapsible sections, each with an immediate enable switch: Theme, Scripts and Librarian. Theme contains World/Storyboard selection, App colors and App navigation. App light/dark palette applies while colors are enabled. Module preferences survive disabling. Switching vault type does not migrate or rewrite notes. Disabling Theme removes its pages/menu/palette; disabling Scripts or Librarian removes only that feature's views/actions/listeners.

Templates in a top-level `_templates` folder are browsable only through that shared section; they remain excluded from Home/Canon cards, script recognition and Librarian evidence. Opening a template uses the native editor and does not execute it. The menu can scroll while preserving space for the native file tree.


## Project Status Flow (D-0024)

Settings → Marginalia → Theme exposes Project Status Flow field (default stage) and Project Status Flow order (one value per line; pasted arrows also accepted). Default order: Foraged → Dried → Ground → Brewed → Distilled → Bottled. Each vault stores its own choices.

Storyboard Projects and Project Register use the chosen field consistently for tabs, filtering and status labels. Field names are matched case-insensitively; status values use the exact authored wording. Configured stages appear in order even when empty. Unlisted existing statuses follow alphabetically; missing values appear under Unassigned. All Entries remains first, Unassigned last. Trimming and deduplication affect settings only; notes are not renamed or rewritten. World card behavior keeps its existing stage/status lookup.
