# Marginalia — Content Model

The contract between the user's Obsidian vaults and the app. The app reads and writes **standard Obsidian markdown**; canonical notes receive no proprietary metadata. Generated Librarian data is isolated in `.marginalia/` and is not canon (see §9).

**Inspect before assuming.** Real vaults vary. Before implementing structure detection, read the fixtures (`fixtures/GreekDemo` and, if provided, the user's real vault) and confirm these conventions against them. Where a fixture contradicts this document, raise it with the user rather than guessing. Items marked ⚠ are the least certain.

## 1. Vault folders

A **vault** is one imported folder. World is the default type. The folder mappings below describe World; `STORYBOARD.md` defines Storyboard root projects and shared areas. Inside a World vault, top-level folders map to app sections:

| Section     | Folder                                                              | Notes                                                                                                                     |
| ----------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Brainstorms | `00 Brainstorms`                                                    | Root notes appear in Uncategorized; immediate subfolders supply tabs using their exact names, including descendant notes. |
| Canon       | the other numbered top-level folders and an explicit `Canon` folder | Grouped by entry type, not by folder.                                                                                     |
| Projects    | `08 Project` (accept `08 Projects`)                                 | One subfolder per project.                                                                                                |

- Non-numbered top-level folders other than `Canon` are ignored for section mapping. Assets anywhere remain indexed except inside `.marginalia/`. Root `Archive` notes are excluded from app note lists, search, graph, retrieval and note resolution; the confirmed Duplicate Merge move keeps them available to Obsidian.
- Affiliation, System and Plot starters supplied by the owner have built-in subtype/structure choices, including Custom Plot name/count. Templater date/title expressions are filled as text; arbitrary JavaScript is never executed. Unsupported script templates require conversion to plain Markdown.
- `_templates` contains note creation templates (including Canon and Project subfolders), not browseable entries. The generic engine may index their files; the domain layer excludes them from entry lists, search, graphs and note counts. Reads never alter the templates.
- Numeric prefixes control ordering.
- Assets (images, PDFs, etc.) may live anywhere and are referenced by embeds and wikilinks.

## 2. Entry types (Canon)

Seven types: **Character, Location, Affiliation, System, Item, Lore, Event**.

- An entry's type is carried by a **type tag** in frontmatter `tags` (e.g. `Character`); the second-level folder normally matches. Recognized type tags are authoritative; a matching type folder is the fallback when no recognized type tag is present.
- A note beneath `08 Project/<Name>/` or `08 Projects/<Name>/` can carry the same type tag but is **project-scoped**: it appears on that project's page. Canon excludes project entries by default. **Include project entries** blends reference entries into Canon when enabled, with a project-name label and updated type-tab counts. This preference is remembered per world in app state; it never moves or rewrites notes.
- Use exactly one recognized type tag per reference entry; simple lowercase tags (`character`, `location`, `affiliation`, `system`, `item`, `lore`, `event`) are recommended. Existing `canon/<type>` and `project-<type>` tags remain recognized; matching type folders remain the fallback. `cssclasses` controls styling and alone does not classify a reference entry. Project scope comes from the enclosing project folder, not a new property or tag.
- Blending scans the existing parsed index at any project depth. Exclude the Scripts, Outline, Plot, Outputs and Archive areas (including numbered area prefixes), nested template folders, hidden/generated paths and notes marked `project-parent`, `project-outline` or `project-plot` through tags or cssclasses. Identically titled notes stay separate and open their exact paths.
- Entries use frontmatter fields as free-form properties. The app displays them as the note subtitle (excluding the redundant Title) and edits them through the structured form with explicit ordering/removal controls. Title is protected from deletion; user title edits synchronize the filename on Save. It must not require any specific field except where stated here.
- Event entries may carry an in-story date in frontmatter; surface it on the card when present. The fixture property is `in-story-date`.
- A typical entry begins with a **Summary callout** (`> [!abstract] Summary`) which the editor pins as the first block, followed by `##` sections. FM-008 recognizes this abstract callout titled Summary and suggests a Summary when missing or empty. This is a suggestion, not a required field.
- **Required frontmatter properties:** none for Character, Location, Affiliation, System, Item, Lore or Event. Scripts and other notes likewise have no newly required fields. FM-001 emits no findings under this contract; FM-002 may suggest vault conventions without making them requirements.

## 3. Projects

A project folder contains:

- **Overview note**: the note tagged **and/or** with `cssclasses: project-parent`. It is the project's home. The sub-nav always labels it "Overview".
- **Subfolders** become sub-nav sections named after the **actual folder name** (e.g. Outline, Plot, Scripts, Outputs, Cast, Notes). Show them as the mockup does.
- **Scripts** (`Scripts`, an unnumbered folder): holds script notes, any structure inside is allowed.
- **Outputs** is an ordinary folder with no special treatment other than being displayed as a card grid because it holds mixed file types.
- The **Outline** and **Plot** areas are plain notes and lists; plot beats may be separate notes.
- Project-specific entry folders (e.g. Character) become their own sections, as in §2.

## 4. Scripts

A supported script has explicit `role: manuscript` and `format: script`. Explicit other roles/formats override location. For World notes without explicit identity, the legacy project's `Scripts` folder still identifies scripts. See `STORYBOARD.md` for Storyboard identity and prose handling.

**Frontmatter** (all free-form; the form edits any key):

| Key                               | Meaning                                                                                                                                                                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Title`, `Part`, `Status`         | Descriptive.                                                                                                                                                                                                                           |
| `Pages`                           | Declared page count; used for global numbering.                                                                                                                                                                                        |
| `Characters`, `Locations`, `tags` | Arrays (often wikilinks). Tags may be nested, e.g. `comic/astd`.                                                                                                                                                                       |
| `Group`                           | Optional grouping; none = top-level.                                                                                                                                                                                                   |
| `Preceded By`                     | Wikilink or plain basename of the previous script in the same project/Group. New scripts use this field. An empty value starts an independent sequence.                                                                                |
| `Followed By`                     | Legacy link to the next script, still read. Consistent legacy/new edges are deduplicated; contradictory claims surface conflicts. Reorder saves Preceded By and clears legacy successor values only in the explicitly reordered Group. |

**Body structure**

- `## Page N` headers start each page; `## Page (Double Spread)` is also supported. Pages open by default and fold as temporary viewer state, without saved fold markers. Bulk Collapse All / Expand All also closes or opens every panel as temporary viewer state.
- Scene slugs: `INT.` / `EXT.` + location. A page's left/right/double-spread **side** is shown as a badge and supports **Double Spread** (2 slots). Explicit page sides use `Side: Left`, `Side: Right`, or `Side: Double Spread` immediately after the page heading. Existing script-level `Side` is a first-page fallback; subsequent pages alternate. New pages default from the previous page and save explicitly. A `+ Set location for this panel: [[Location]]` line before a panel supplies its location override. Optional INT./EXT. can precede the wikilink, e.g. `+ Set location for this panel: EXT. [[Location]]`; location-only lines remain valid. The override stays with its panel when reordered.
- Edited page structure is renumbered consecutively on Save; Double Spread occupies two labels. Side values stay with reordered pages, and planned frontmatter `Pages` is not changed automatically. A no-op save keeps the original source bytes.
- Panel numbers are computed per page from panel order, reset at 1 and are not written into source callout titles. Existing custom titles remain alongside the viewer number.
- Panels: callouts containing the **Panel Description** open by default in the app; new panels save `[!panel]+`. Existing markers survive unchanged saves. Bulk folding is temporary viewer state.
- `[!quote]`: the issue/title card. Callouts support Note, Tip, Warning, Danger, Success and Example; `[!warning]` can hold letterer notes. `/c` creates a Note callout; exact subtype commands select the corresponding kind without changing canonical Markdown.
- Dialogue blocks: a bold speaker name followed by the line. Speaker names are plain text unless the author deliberately wikilinked them.
- Obsidian-only helper markup that exists solely to number pages in Obsidian (e.g. a `page-counter-seed` span and a `--start-page` style) is **ignored** by the app, since page numbers are computed. Preserve it untouched on save.

**Chain rules** (`PRODUCT.md` §8): normalize `Preceded By` and legacy `Followed By` into forward edges and deduplicate matching claims. Independent sequences within a Group start numbering at 1; a valid standalone script is not an orphan. Missing relationship targets and conflicting incoming or outgoing claims are excluded to Needs attention. Scripts leading into excluded scripts, and scripts explicitly depending on excluded predecessors, are excluded as orphans without confirmed global numbering. Follow normalized edges from each script with no predecessor. Cycles show a warning and connected cards in alphabetical fallback order, with each affected script also listed in Needs attention as Cycle. Reading either field never changes the vault.

## 5. Wikilink and embed rules

- Syntax: `[[Note]]`, `[[Note|Alias]]`, `[[Note#Heading]]`, `[[Note#^block]]`, `![[file.png]]`, `![[file.png|300]]`.
- **Resolution**: match by basename (extension-aware) or by path. If no basename/path matches, resolve case-insensitive declared `Alias`/`Aliases` values (scalar or list). Exactly one match wins. With several, prefer the same folder as the linking note, then alphabetical order; expose the other candidates for the hover.
- **States**: resolved / broken / stub (target exists but is empty) / ambiguous (§5.4 of PRODUCT.md).
- A near-miss (e.g. `Paradise Island` vs a note named `Paradise Islands`, `The Ungifted` vs `Ungifted`) is simply **broken**; the app does not auto-correct.
- The **first image** in a note is its main entry image. Image attachment actions write ordinary Markdown embeds on explicit Save. Imported images use the vault’s Obsidian attachment location; existing assets can be linked without copying. Cancel writes nothing and imports never overwrite existing assets.

## 6. Callouts

Standard Obsidian callout syntax with optional title and fold marker (`-` collapsed, `+` expanded). Types map to the six color buckets plus Quote (`PRODUCT.md` §10). Unknown callout types fall back to Note. `[!panel]` is a Note-bucket callout.

## 7. Frontmatter handling

- YAML at the top of the file between `---` fences.
- Show every property as the note subtitle **except** `Title` (already shown as the page heading), `tags` (shown in the footer) and `cssclasses` (never shown).
- Preserve key order, unrelated keys, and formatting on save. Never reformat YAML the user did not edit.
- Invalid frontmatter → per-note warning, note still renders.

## 8. Test fixtures

`fixtures/GreekDemo/` is a purpose-built test vault with an `EDGE-CASES.md` index at its root mapping each fixture to the behavior it tests. It covers: all seven Canon types, a project with scripts, a stub note, a broken link, a near-miss link, an ambiguous link pair, a project-scoped character, all callout buckets, a clean script chain ending in a double spread, a standalone script, a two-way conflict, a cycle, a dangling `Followed By`, dialogue speaker auto-fill vs. opt-in wikilink, a per-panel location override, and valid `.canvas`, `.base`, image, and PDF files. Treat `EDGE-CASES.md` as the checklist for engine and domain tests. `SecondDemo/08 Projects/Chain Edges/Scripts` additionally covers transitive upstream orphans caused by missing successors and conflicts, while `ScriptEdges` covers explicit per-page sides, double-spread slots, independent sequences and Obsidian counter helpers.

Panel override lines also accept plain scene text with optional embedded wikilinks. Typed links retain their original target/alias syntax even when unresolved.

Frontmatter property names must be nonempty, single-line strings. Invalid top-level property names are excluded from the parsed mapping and flagged with warnings. Unnamed property repair removes only those source ranges; named values and body bytes are preserved. YAML syntax errors require manual repair.

## 9. Librarian generated data and imports

`LIBRARIAN.md` defines the complete contract. All functions operate on the selected vault. Each vault may contain `.marginalia/expanded/<relative entry path>.md`, `reports/`, `dismissed.json`, `imports/` and `index/`. Scans and watcher input exclude this dot-folder; generated content never enters ordinary note search, graph or retrieval sources. Read-only generated views use dedicated access, not the canonical note index.

Expansions carry generated/source/generated-at metadata and source note paths with modified times. They are read-only, regenerate-only and stale when a source changes. Enhancement suggestion notes remain session-only. Import drafts retain extracted source text/cues and flags to resume review, but do not retain the original source file.

Importer conversion maps recognized page/panel markers to existing script syntax. Content payloads (including dialogue, descriptions, speakers, captions, SFX and notes) preserve wording and source order; whitespace-normalized content is validated separately from structural markers. Unrecognized/failed blocks remain verbatim at their original position as generic text or supported note blocks. No new script-notes syntax is introduced. Derived frontmatter uses the existing keys and remains user-confirmed; empty Group/Preceded By is a valid standalone script.

The Librarian cannot save canon. Structured proposed fixes enter only the human's unsaved editor buffer. Generated writes stay in `.marginalia/`; Duplicate Merge's root Archive move is separately user-confirmed and link repairs require human Save.

Script import distinguishes explicit comic-page headings from physical PDF sheets. Heading suffix content is retained; page and panel numbers may be normalized. Manual page/type repair writes the existing page headings, side metadata, panel callouts and dialogue syntax only on Save; no new canonical format is introduced.

Recognized type labels such as leading `Panel Description:` may be removed once represented by the panel structure. This exception applies to the type marker only; description/dialogue wording remains preserved. Captions and sound effects use ordinary bold `CAPTION:` / `SFX:` speaker rows and the Dialogue editor, with their content in the body field. Existing unedited notes keep their original bytes.

Recurring document headers/footers are omitted from new imported scripts and their review queues, with an omission notice and original text retained in recoverable extraction data. PDF detection requires matching top/bottom-margin text on at least two distinct physical pages, allowing variable pagination, and protects comic page/panel markers, dialogue, artist notes and body repetitions. Word default/even-page header/footer stories are recurring by definition; first-page stories remain for review. Unique margin text is retained. Excluded blocks preserve their source IDs and payloads with empty converted Markdown; this does not interrupt script/dialogue continuity. Existing edited or saved scripts are not rewritten.

Generated Entry Expansions use normal Markdown sections and compact source links, with a separate ordered source inventory. They retain source fingerprints, original excerpts and generation/instruction version under `.marginalia/expanded/`, remain noncanonical and read-only, and are excluded from ordinary vault retrieval.

Script printing retains each panel’s viewer fold state, while authored page sections print continuously with dividers. The importer’s source/review sidebar and flag controls are hidden; source cues, classifications, repairs, reviewed state and draft checkpoints remain recoverable.

Global/local page display is a presentation preference; authored page headings remain local and unchanged. The default large heading is global when a confirmed chain exists, with Local Page in the secondary pill. Unconfirmed chains retain local headings and an unconfirmed global indicator.

Explicit title Save may rename the note and repair resolved references when the enabled-by-default rename-link setting is on. Preserve authored display aliases, heading/block fragments, code and comments; retain declared-alias display text when converting an alias target to the new path. No inferred prose-name replacement or automatic template/vault migration occurs.

Legacy `format: comic-script` remains recognized for compatibility; new manuscript scripts use `format: script`.
