# Marginalia inside Obsidian: Reanimator assessment

Date: October 21, 2026. Research and proposed direction, not an implementation contract.

## Evidence and limits

Inspected the open Reanimator workspace in Obsidian 1.14.4, its local configuration, all 13 Markdown templates, representative project/character/plot notes, both Lotus scripts, CSS snippets, and Marginalia's current script logic and shortcuts. Reviewed official Longform and Templater documentation and Longform's installed template integration. Longform was absent at the initial inventory; version 2.1.0 appeared during this assessment, with its settings visible. No projects were created and no vault notes, settings, or shortcuts were intentionally changed. Template execution, Longform project adoption, compilation, and mobile behavior were not exercised.

## What Reanimator already supplies

- Eight initially enabled community plugins: Templater 2.25.0, Auto Note Mover, Recent Files, File Explorer Note Count, Iconize, Paste image rename, Tag Wrangler, and Git. Longform 2.1.0 was subsequently installed.
- Enabled core facilities include navigation/search, graph/backlinks/outgoing links, outline, properties, bookmarks, file recovery, Sync and Bases. Enabled status establishes availability, not that synchronization or backups are healthy.
- Existing world layout: `00 Brainstorms`, numbered Canon type folders, and `08 Projects`, containing Lotus, Orthrus and Bardo plus a story overview area. Preserve these names and infer their meaning through configurable mappings.
- Templater uses `_templates`; eight folder rules map brainstorming and Canon folders to templates. Its creation matching mode is `folder`. These are configured rules; creation behavior was not live-tested.
- Affiliation and System templates prompt for a subtype and generate different sections. Plot prompts for Three-Act, Five-Act, Kishōtenketsu, Save the Cat, or Custom structure, with custom name/count prompts. Preserve execution through Templater instead of replacing these with static copies.
- Auto Note Mover is explicitly **Manual**, bound to Command+M, with type-tag destination rules. Projects and templates are excluded; some old named project exclusions remain. Keep new script commands from introducing competing automatic filing.
- Attachments are configured for `Assets/Attachments`. Reuse this setting and the attachment workflow.

## Shortcut conventions observed

On this Mac, `Mod` means Command.

| Action | Existing binding |
| --- | --- |
| Create a note from a selected type template | Command+Option+type key |
| Insert a type template into the active note | Command+Control+type key |
| Choose a template for a new note | Command+Option+' |
| Open Templater insertion chooser | Command+Option+T |
| Replace/evaluate Templater in the file | Command+Option+Control+T |
| Manually file a note | Command+M |
| Open local graph | Command+Shift+G |
| Cycle list/checklist | Command+. |

Type keys include B brainstorm, A affiliation, C character, E event, I item, L location, O lore, S system, P plot point, Shift+P plot, and R project parent. Project Note creation uses backtick while insertion uses N.

The hotkey file also retains Project.md bindings alongside Project Parent.md for the R combinations. Project.md is absent and is not in Templater's registered template list; treat these as stale saved bindings, not proof that two live commands conflict. Script.md exists but is absent from the registered template-hotkey list and folder rules. Command+Option+S already creates a System, so do not assign it to New Script.

## Script-specific findings

`Lotus Prologue.md` and `Evil Incarnate, Draft 1.md` both use `Group: Initial Drafts`; Evil Incarnate points to Lotus Prologue through `Preceded By`. Declared Pages are 4 and 12, matching the current numbers of `## Page` headings. Their panel callout counts are 12 and 54. Under Marginalia's current rules their global ranges are 1–4 and 5–16.

They already contain useful script structure: page side values, panel descriptions, bold speaker dialogue, notes, splash labels, named panel-in-panel callouts, and both linked and plain character names. A plugin must preserve this existing syntax.

The starter Script template still contains legacy `Followed By`, planned `Pages: 6`, capitalized `Tags`, and no modern manuscript identity fields. Existing authored scripts use lowercase `tags` and `Preceded By`. A template update should be a separately reviewed change; adoption must accept existing files without migration.

The enabled `comic-page-panel-autonumber` CSS counts H1 headings, but these scripts have H2 page headings. Its panel counter therefore lacks the intended per-page reset for this structure. Its selectors are also broader than script notes. The snippet's own documented start-page helper is manual and its numbering is intended for reading/print rather than Live Preview. Replace its responsibility with script-aware numbering; avoid leaving both systems rendering duplicate numbers.

## Lessons from Longform

Longform supplies an ordered manuscript sidebar, nested scene navigation, draft selection, writing sessions, navigation commands, and compilation. Its ordering lives in an index note's `longform.scenes` metadata; visual nesting does not require matching folders. This is a useful interaction model for the plugin. [Longform overview](https://github.com/kevboh/longform), [scene organization](https://github.com/kevboh/longform/blob/main/docs/MULTIPLE_SCENE_PROJECTS.md).

It also supports per-project scene templates; the installed code explicitly recognizes Templater and evaluates templates with it. Its settings describe core Templates support too. There is no reason to assume template creation requires a separate Marginalia template engine.

Its navigation commands include next/previous scene, same-indent navigation, project/scene jump, and compilation. Compilation transforms scenes, joins them, and transforms the combined manuscript, including optional user steps. [Commands](https://github.com/kevboh/longform/blob/main/docs/COMMANDS.md), [compilation](https://github.com/kevboh/longform/blob/main/docs/COMPILE.md).

The reviewed public API exposes nested-list conversion and scene numbering helpers, rather than a complete project-management interface. Any deeper integration needs an explicit compatibility boundary. [API source](https://github.com/kevboh/longform/blob/main/src/api/LongformAPI.ts).

## Proposed writing experience

Use a project selector with Scripts, Outline, References, and Export sections. For Lotus, Scripts would show Initial Drafts, then Lotus Prologue and Evil Incarnate in order. Expanding a script reveals pages and optionally panels. Selecting a page/panel jumps to its source range in Obsidian. Keep one Markdown file per current script; pages and panels are virtual outline items, not newly split files.

Display local and global page ranges, left/right/spread side, panel counts and structural warnings. Keep declared/planned Pages distinct from actual page slots. Existing numbering uses declared totals; retain that rule initially and show mismatches explicitly. A double spread consumes two page slots but has one panel sequence. Never make CSS-generated numbers the canonical data.

Retain exact standalone, case-sensitive commands on Enter inside script bodies: `/P` page, `/p` panel, `/d` dialogue, `/t` title/display, `/c` note; also `/cn`, `/ct`, `/cw`, `/cd`, `/cs`, `/ce` for note/tip/warning/danger/success/example. Do not intercept these in ordinary notes, frontmatter, fenced code, or literal prose. Insert a normal Markdown structure with an appropriate cursor target and a single undoable editor transaction. Preserve ordinary Enter everywhere else.

Dialogue commands should offer the script's Characters plus already used speakers, and keep speaker links optional. Caption/SFX remain speaker labels. Page and panel location helpers should retain exact wikilink targets and aliases.

Register named Obsidian commands for new script, new script after current, next/previous script, jump to script/page, insert page/panel/dialogue/callout, move page/panel, validate and export. Let the user bind commands through Obsidian. Preserve existing template shortcuts; show conflicts before suggesting additional bindings. Desktop chords are optional accelerators, with menu/command access on mobile.

## Longform integration versus a Marginalia organizer

**Smallest experiment:** a disposable copy of Lotus with one Longform index managing its two script notes; select the existing Script template for new scenes. Add a Marginalia companion layer for structural commands and derived numbering. Test its actual Templater behavior before promising seamless creation.

**Ordering constraint:** do not let Longform's scene list and Marginalia's predecessor links independently control the same manuscript. In a Longform-managed mode, Longform's list would be authoritative and the companion would derive numbering from it. This is a proposal requiring an integration test, not a capability already implemented. Any conversion back to predecessor links must be explicit.

**Likely durable fit:** a Marginalia-owned Scripts sidebar modeled on Longform, using the existing Group/Preceded By model. It can support script → page → panel structure and existing standalone compatibility without introducing a second ordering authority. Keep ordinary text editing native to Obsidian and leave Longform optional for other writing.

Group is currently a grouping label, not a formal draft identity. Do not assume every Group is an alternative draft; a real draft feature must distinguish an alternate manuscript from an ordered part/issue. Do not mix complete drafts during compilation.

## Scope and implementation direction

1. **Script essentials:** current-vault discovery, native editor commands, page/panel navigator, live numbering, script creation context, warnings and compatibility with existing templates/shortcuts.
2. **Manuscript organization:** explicit ordering authority, next/previous navigation, group handling, reorder undo, page/panel moves including owned dialogue/location blocks, and conflict-aware persistence. Multi-file reorder cannot assume Obsidian offers Marginalia's existing batch transaction guarantees.
3. **Output:** preview selected group/sequence, resolve numbering, include/exclude author notes, preserve dialogue and optional links, then generate a separate manuscript/print view. Authored comic pages and physical PDF sheets remain distinct.
4. **Broader Marginalia:** optional Canon/Project dashboards and deterministic Librarian checks, followed by model-backed Librarian work. Bases may cover general metadata tables; script relationships, page budgets and continuity remain custom responsibilities.

Reuse pure script parsing, grouping, ordering validation, source patching and relevant Librarian logic. Add an Obsidian adapter, native command registration and CodeMirror editor extensions. Prefer Obsidian's note/link/file APIs for host operations. The current TipTap editor cannot simply be inserted into CodeMirror; reimplement the interaction layer while sharing the underlying rules. A full structured alternate editor can be considered later if native Markdown enhancements prove insufficient.

## Prototype acceptance

- Open both current Lotus scripts without changing their source; show ranges 1–4 and 5–16 and page-specific panel numbers.
- Insert each structural command, focus useful content, undo cleanly, and preserve unrelated prose and metadata.
- Keep `/P` and `/p` distinct; ordinary note/code editing is unaffected.
- Reorder with one chosen authority; flag cycles, missing links and incompatible claims instead of choosing an arbitrary order.
- Detect declared/actual page mismatches and count spreads correctly.
- Preserve named panel-in-panel callouts and plain/linked speakers.
- Create one script from the vault-owned template without duplicate template expansion or unintended filing.
- Validate editor drafts, file changes, renamed notes, Sync updates and desktop/mobile behavior on disposable content before adopting the live vault.

The next evidence-producing step is the two-script prototype. The full standalone app does not need to be ported to evaluate this direction.
