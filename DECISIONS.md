# Marginalia plugin decisions

## D-0001 · Separate host and preserve native notes · 2026-10-21 · Phase 1
- Question: Where should Marginalia's Obsidian work live?
- Options: Separate Obsidian plugin / alter standalone application.
- Recommendation: A separate plugin adapting existing domain behavior to native Obsidian.
- Decision: A dedicated Marginalia Plugin project; standalone app and Reanimator stay unchanged during development.
- Impact: Native Obsidian views and editor insertion; no installation into the creative vault.

## D-0002 · Priorities and expansion storage · 2026-10-21 · Phase 1
- Question: Which workflows lead the build, and where do expansions live?
- Options: Librarian first / scripts first; hidden sidecar / ordinary note.
- Recommendation: Preserve the owner's two highest-priority workflows.
- Decision: Entry Enhancement and Entry Expansion first. Keep `.marginalia/expanded/<relative entry path>.md`; render in plugin-owned reading tabs.
- Impact: Enhancement is human-reviewed, undoable insertion; expansions never become retrieval evidence.

## D-0003 · Two icon roles · 2026-10-21 · Phase 1
- Question: How should Librarian and Marginalia be represented?
- Options: A–C Librarian marks and D–F Marginalia marks in exploration-02.
- Recommendation: A + D, with B + F as the more evocative pair.
- Decision: “I agree with B+F.” Lantern for Librarian; winged M and prominent nib for the left ribbon.
- Impact: Supersedes the single book/nib/star icon proposal. Original logos remain unchanged.

## D-0004 · Desktop local runtime and mockup · 2026-10-21 · Phase 1
- Question: Which runtime/platform should the first build target?
- Options: Desktop local Ollama first / cloud AI or mobile from the outset.
- Recommendation: Desktop Obsidian with selectable local Ollama model; Enhancement and Expansion first.
- Decision: “Desktop and Local matches what I want. Working to the look from the mockup in the previous chat.”
- Impact: Desktop-only plugin, loopback-only Ollama adapter. Appearance follows `design/reference/librarian-sidebar-concept.png`, with the two named entry actions beneath context and the selected icons.

## D-0005 · Disposable-vault installation authorized · 2026-10-21 · Phase 3
- Question: May the development build be installed in a disposable Obsidian vault for native acceptance?
- Options: Proceed with isolated installation / retain synthetic-only verification.
- Recommendation: Install only in a disposable vault with fictional fixtures.
- Decision: “Yes you may install.”
- Impact: Installation and native testing are authorized in `.preview/Marginalia Test Vault`; creative vaults and the standalone app remain outside this installation scope.

## D-0006 · Entry actions belong to Review · 2026-10-21 · Phase 3
- Question: Should Entry Enhancement and Entry Expansion appear in every Librarian tab?
- Options: Global actions beneath context / Review-only actions.
- Recommendation: Keep Ask conversational and Library focused on saved results.
- Decision: “Let's move the Entry Enhancement and Entry Expansion button to the Review tab to hold the tabs to their intended purpose.”
- Impact: Both actions appear only in Review; native commands and the expansion tab’s Regenerate action remain available. Supersedes the earlier global placement.

## D-0007 · Start native script work · 2026-10-21 · Phase 4
- Question: Should script work begin while the separate Librarian prose-quality gate remains open?
- Options: Continue only Librarian quality / begin the agreed native script organizer.
- Recommendation: Preserve the Librarian quality findings and begin a separately verified script increment.
- Decision: “Let's move towards the longform style comic script features now.”
- Impact: Phase 4 begins; Librarian quality and expansion portability remain open. Scripts stay native Markdown files with virtual page/panel children.

## D-0008 · Organizer owns script order · 2026-10-21 · Phase 4
- Question: Should reading order require author-maintained predecessor properties?
- Options: Require Preceded By links / arrange and remember order in Marginalia.
- Recommendation: Direct organization with stored order; existing links may seed the initial view.
- Decision: “Let's work toward something closer to Longform without recreating the needed precedded by.”
- Impact: Drag or Move Up/Down saves per-project/group order in plugin data. No creation, deletion or rewriting of Preceded By/Followed By fields. Once an organizer order is saved, it is the sole authority; legacy links are ignored for that group. Supersedes the predecessor-authority interpretation in earlier script planning. Longform is not a dependency.


## D-0009 · Restore automatic predecessor properties · 2026-10-22 · Phase 4
- Question: Should order remain only in plugin data or be expressed in script properties again?
- Options: Plugin-only order / author-maintained predecessors / predecessors maintained automatically by Marginalia.
- Recommendation: Use existing predecessor links as authority and maintain the chain automatically.
- Decision: “Let's bring back the "Preceded By" field. Make it something that if not present, is automatically filled in and adjusted when items are dragged and dropped. If present, use for ordering, but still update with drag and drop.”
- Impact: Supersedes D-0008. Missing fields are filled from the current unambiguous sequence; the first script gets an empty value. Drag updates the whole group's predecessor chain. Existing Followed By fields are maintained as compatibility projections on drag. Old saved order is a migration/tie seed only, never an override of predecessor links. Conflicts/cycles are flagged rather than filled arbitrarily.

## D-0010 · Names navigate; arrows disclose; project reads as a whole · 2026-10-22 · Phase 4
- Question: How should navigation and expansion work in the script outline?
- Options: Separate Open and Move buttons / names navigate and arrows disclose, with drag ordering.
- Recommendation: Separate arrow/name controls and a continuous project reading view.
- Decision: Remove Move Up/Down and Open script/page buttons; arrows expand/collapse, script/page names open their targets, and clicking a project shows all its scripts in order.
- Impact: Compact left-aligned outline. Project ItemView reads the source notes in group order without creating a combined file. Script headings link back to native editors. Native panel move commands remain available; the removed controls are sidebar buttons.


## D-0011 · Live outline and side after a spread · 2026-10-22 · Phase 4
- Question: Is manual Refresh needed, and which side follows a Double Spread?
- Options: Keep manual refresh / rely on native live events; treat spread as an ordinary side / treat it as ending on Right.
- Recommendation: Remove redundant Refresh and apply one shared side rule to parsing and page insertion.
- Decision: The owner questioned the Refresh control because Obsidian updates live, and specified that a spread occupies Left and Right, so the following page is Left. Opening Page 4 must be Left.
- Impact: No Refresh button; existing live event updates remain. Double Spread → Left → Right. Explicit authored Side overrides remain supported. Both outline calculation and insertion use the same rule; no authored note is rewritten to correct the derived display.


## D-0012 · Choose a writing session in Script Studio · 2026-10-22 · Phase 5
- Decision: Start from a project/grouping chooser. Choosing Copper Sky includes all its groupings; choosing Copper Sky > Draft includes only that grouping's scripts.
- Impact: The Scripts sidebar stays scoped to that selection until changed in Script Studio. Names still open the project/group reader or native script/page; arrows still disclose. Reuse the active main tab for scope selection. Existing notes and ordering remain authoritative.

## D-0013 · Countdown and daily writing goals · 2026-10-22 · Phase 5
- Decision: Use a countdown timer. Independently hide the timer and word count in settings and configure a daily goal. The owner's “Total Projects” means any project/script in the vault; label it “All projects.” “Current project” counts today's writing in the selected project; “Full vault” counts today's writing across ordinary notes.
- Impact: Footer sits beneath the scoped outline above Obsidian's vault bar. Default countdown is 25 minutes with Start/Pause/Reset and configurable duration. Daily counts track net local editor additions, including Undo/deletions, from a baseline taken when the plugin loads. Imported/pre-existing text earns no credit. Current project supports a separate target per project. Timer state restores paused; selection/preferences/totals are stored locally in plugin data. Goal 0 hides the goal bar; visibility settings do not disable tracking.


## D-0014 · Script Studio in the left sidebar · 2026-10-22 · Phase 5
- Question: Can the chooser be a sidebar view instead of occupying the main window?
- Options: Main tab / native left-sidebar tab.
- Recommendation: Left-sidebar tab, retaining the scoped Scripts outline and native main editor.
- Decision: The owner requested Script Studio as a sidebar view.
- Impact: M ribbon, Open Script Studio and the outline's Script Studio button open/reuse a native left-sidebar tab. Opening the chooser preserves the active main editor. Selecting a project/group still reveals the scoped Scripts outline and its main reading view. Older main-pane Studio tabs are retired after the sidebar is ready. Supersedes D-0012's chooser placement; source files, goals and timer behavior are unchanged.


## D-0015 · One Script Studio tab and script folding · 2026-10-22 · Phase 5
- Question: Can the chooser and Scripts outline be combined, and where should folding actions live?
- Options: Separate sidebar tabs / one sidebar tab with a project/grouping menu and view options.
- Recommendation: One native sidebar tab; project/grouping dropdown above the outline, folding in View options.
- Decision: The owner requested one tab similar to Longform's sidebar menu, with Collapse all, Collapse panel descriptions and Expand all. Compile/export belongs here in a future increment; shortcuts follow this work.
- Impact: Supersedes D-0014's two-tab layout. Canonical marginalia-scripts is displayed as Script Studio; legacy chooser tabs migrate into it and duplicates retire only after a unified leaf is ready. Project/group selection still opens the ordered main reader. Folding targets the most recent main script editor or project reader, not sidebar rows. This interpretation was offered in an optional clarification and subsequently confirmed in D-0016. All actions change presentation only, preserving source and editor selections. Compile/export and shortcuts are not implemented in this increment.


## D-0016 · Confirm main-view panel folding · 2026-10-22 · Phase 5
- Question: Should Collapse panel descriptions fold main script text or hide sidebar panel rows?
- Options: Main script view / sidebar outline.
- Recommendation: Main script view.
- Decision: “Fold panel text in the main script view.”
- Impact: Confirms the existing D-0015 implementation. Panel descriptions fold in the main editor/project reader; sidebar panel rows remain available. No code change required.


## D-0017 · Folding controls reflect current state · 2026-10-22 · Phase 5
- Question: Why does Opening's Double Spread stay open, and should expansion be a separate permanent action?
- Options: Fixed Collapse/Expand buttons / paired state-dependent controls.
- Recommendation: Fix selection-driven reopening, fold page ranges explicitly, and toggle each control's label.
- Decision: The owner reported Page 2 Double Spread not collapsing and requested collapse buttons change to “Expand…” with matching wording; show Expand all only when something is collapsed.
- Impact: Collapse all / Expand all share one control. Collapse panel descriptions / Expand panel descriptions share another. Labels use the current main view's folds, including manual disclosures. Expanding only panels leaves page folds intact. Native folding no longer reapplies selections, which reopened the cursor's page; explicit parsed page ranges include Double Spread. No source editing or shortcuts are introduced.


## D-0018 · Bring Marginalia script shortcuts into Obsidian · 2026-10-22 · Phase 6
- Question: Which original script shortcuts should be enabled in the native plugin?
- Options: Reassign system combinations / preserve Marginalia's exact Enter slash commands in script editors.
- Recommendation: Port the inspected case-sensitive Enter commands and preserve existing Obsidian/Templater bindings.
- Decision: “Now let's add in the shortcuts we built for the scripts in Marginalia.”
- Impact: /P page, /p panel, /d dialogue, /t title/display quote, /c and /cn note, /ct tip, /cw warning, /cd danger, /cs success, /ce example. Native source/Live Preview only; exact standalone line with a single caret at its end. New blocks replace the command line at the cursor in native Markdown; surrounding authored source remains untouched. /P uses shared numbering/side rules, including Left after a spread; blocks other than /P require an existing page. Focus selects the speaker or new placeholder; page creation leaves the caret in its body. Each conversion has isolated one-step Undo. No OS key combinations, template execution or speaker completion are added.


## D-0019 · Native app pages and vault navigation · 2026-10-22 · Phase 7
- Decision: Bring the inspected Marginalia Home, Brainstorms, Canon and project pages into native main-pane views, with navigation above Obsidian's existing file explorer. World / Storyboard is a per-vault setting that changes pages and classification.
- Impact: Live note cards, category/folder tabs, search/sort, project folders, pins/recents and Storyboard Project Register link to original native notes. Vault type changes presentation, not folder structure. Native file controls/tree remain. This increment does not port app creation/template execution or inline register editing.

## D-0020 · App colors and independent feature modules · 2026-10-22 · Phase 7
- Decision: Bring the app's light/dark palette and organize settings into three collapsible, independently enabled sections: Theme, Scripts, Librarian.
- Impact: Theme owns app pages/navigation and optional colors; Scripts owns Script Studio/editor features/countdown/word tracking; Librarian owns local AI views/actions. Changes apply immediately through feature lifecycles. Disabling preserves preferences and original notes. Theme also exposes separate color/navigation choices.

## D-0021 · Keep the original M and left-align the app menu · 2026-10-22 · Phase 7
- Decision: “Keep the Marginalia button they was for scripts where it was before. We only need Home through Projects in this menu.” Follow-up: “And make sure the menu is left-aligned.”
- Impact: Original M ribbon continues opening Script Studio separately. World menu contains Home, Brainstorms, Canon, Projects; Storyboard contains Home, Project Register, Projects. Shared Storyboard areas are links within main pages. Menu icons and labels align left.


## D-0022 · Real-vault test baseline; defer optimization · 2026-10-22 · Phase 7 acceptance
- Decision: Test Reanimator and Shadowverse as World vaults and Storyboards as Storyboard; verify script recognition and Librarian workflows, record durations, and note speed/efficiency improvements without implementing or testing them.
- Impact: Native testing uses isolated copies to exercise automatic ordering fields, insertion/Undo and generated storage without altering originals. No production changes or optimization trials. Record runtime success separately from prose quality and compatibility failures. See real-vault-review-2026-10-22.md.


## D-0023 · Automatic shared-folder navigation, except Assets · 2026-10-22 · Phase 7
- Question: Why are Crypt, Research and Collections inside Project Register, and does the underscore rule still apply?
- Decision: Give Crypt, Research and Collections separate menu items below Projects. Follow the owner's broad rule that each top-level underscore-prefixed folder gets its own section/menu item, “Excluding Assets.” The Stacks was offered only as a fallback; a wrapper is unnecessary.
- Impact: Supersedes D-0021's menu cutoff and in-page shared links. Both World and Storyboard append discovered shared folders below Projects; known Crypt/Research/Collections come first, additional folders alphabetically. Assets (including _Assets, case-insensitive) stays excluded. Empty folders qualify; nested underscore folders stay within their parent page. Folder create/rename/delete events update navigation live. _templates qualifies for its own browse page while remaining excluded from Home/Canon/script recognition/Librarian retrieval; no template execution is added. The original M ribbon and left alignment remain. Existing saved Crypt/Research/Collections routes migrate to their actual folder paths.


## D-0024 · Configurable Project Status Flow · 2026-10-23 · Phase 7
- Decision: Add a per-vault setting for the Project Status Flow field and order in Project Register/Storyboard. The owner's field is stage; order is Foraged → Dried → Ground → Brewed → Distilled → Bottled.
- Impact: Theme settings expose field and multiline ordered values. Storyboard Projects and Project Register use the same configured property, display labels and filter order. All configured flow tabs remain available even when empty; other existing statuses follow alphabetically and missing values appear under Unassigned. Defaults apply to older settings. No property/value rewrite or alias migration; older Foraging/Grinding/Brewing/Distilling remain separate authored values until explicitly edited. World card status behavior remains unchanged.


## D-0025 · Clean panels and script character dropdown · 2026-10-23 · Scripts
- Decision: Remove the automatically inserted “Panel Description:” label. Offer a character dropdown when /d is used, including plain and wikilink characters. Owner additionally confirmed that frontmatter characters must qualify before appearing in dialogue.
- Impact: /p selects New panel without a label; the insert-panel command likewise creates a clean quoted body. /d retains editable SPEAKER and opens a local, keyboard/mouse picker when candidates exist. Sources are Characters/Character frontmatter, prior speakers and known character-note names/aliases mentioned in script body. Character-tagged notes qualify for recognition; unrelated links and unused vault characters do not. Existing speaker styling takes precedence over declarations/mentions, preserving plain text versus wikilinks. Choice selects Dialogue for immediate writing; Escape permits a new name. No model, template execution, new dependency or default OS shortcut. Existing notes remain unchanged.

## D-0026 · Review a script template before creation workflow · 2026-10-23 · Scripts
- Decision: Provide a script template in the disposable test vault's template folder for owner review. Defer the folder navigator “Create a New Script” action and configurable script template until the owner is happy with the template.
- Impact: `_templates/Comic Script.md` contains recognition/order/cast metadata, a brief, a collapsible writing and shortcut guide, and one titled page with location, panel, dialogue, title lettering and artist note. Uses ordinary Markdown and existing fictional vault links. Template paths stay excluded from script recognition. No production code or settings changed.

## D-0027 · Generic script template with blank properties · 2026-10-23 · Scripts
- Decision: Owner clarified the template must be a reusable starting point for any script, with no story-specific content and empty frontmatter values.
- Impact: Replaces D-0026's fictional scene and populated properties with generic PAGE TITLE, INT. LOCATION, CHARACTER/dialogue, panel, lettering and note placeholders. Retains a collapsible shortcut/writing guide. Recommended property keys have null values; role/format are omitted to allow recognition in a Scripts folder, with instructions for setting both when used elsewhere. Folder creation and template setting remain deferred until approval.

## D-0028 · Configured template and two script creation entry points · 2026-10-23 · Scripts
- Decision: Owner accepted the generic template after editing it and requested a script template location setting, Create a New Script in folder right-click menus, and a New Script button below the active sidebar list.
- Impact: Supersedes the D-0026/D-0027 creation gate. A shared native name/grouping dialog copies the configured Markdown template into the clicked folder or active list's last parent folder. It preserves edited template body/unrelated fields, fills title/identity/group/predecessor fields in the new note, appends within its group and opens it for writing. Blank grouping means Top-level; the active specific grouping is prefilled. Per-vault Scripts setting supports typing/browsing and follows renames. No executable template expansion, external services, model calls, default hotkeys or compile/export work. Original creative vaults remain untouched.

## D-0029 · Authoring controls, New Entry and configurable vault setup · 2026-10-23 · Phase 7
- Decision: Owner requested a double-click session-only timer edit, no mid-session edits, searchable reference selection, default-closed sidebar pages, New Entry on all menu pages, type/subtype choices and configurable canon/folder/template routing with their numbered setup as default. Also requested suggestions for vault items, used property names and status values while retaining freehand statuses.
- Impact: A started session stays locked while paused until completion/Reset; the runtime duration never overwrites countdown preferences. Clock ticks update text in place to preserve double-clicks/focus. Home pins use a typed dropdown; Librarian references also offer a type filter. New Entry uses ordered type/subtype selectors and a title/destination/template form, matching templates locally and optionally creating missing folders. Theme → Vault setup beneath Vault type configures canon types, global/project folders, templates, project root and subtype routes; save/cancel/defaults/folder creation are explicit. Configured classifications replace numeric-folder assumptions while retaining legacy recognition. Project/subtype creation is scoped to its project; scripts reuse existing safe creation, retaining custom-folder project scope via a plain Project path. Template bodies and unrelated metadata remain intact; conflicting classification tags are replaced with the chosen type. Source moves, template execution, new dependencies, cloud access, compile/export and Librarian performance changes remain outside scope.


## D-0030 · Simplify template and status settings · 2026-10-23 · Phase 7
- Decision: Owner requested removing Browse beside Script template location and removing the separate Add a status to the flow control. Keep template dropdown suggestions and the typed status list.
- Impact: Template selection now uses only the existing suggested path input; obsolete picker code is removed. Project Status Flow retains the property-name suggestions and editable ordered textarea, with no separate add-status field/button. Stored settings, templates and notes are unchanged. Supersedes those UI details in D-0028/D-0029.


## D-0031 · Compact pinned-reference editing · 2026-10-23 · Phase 7
- Decision: Owner requested only Edit beside Pinned References by default; reveal selector text and a dropdown input on editing, with the same soft corner radius as other page boxes.
- Impact: Home header has right-aligned Edit; editing reveals Select a reference/project and the existing typing dropdown, plus unpin controls. Done hides editing controls while keeping pinned cards visible. Edit mode is view-local, survives pin redraws and closes when changing pages or reloading. The input uses the shared page-card 8px radius. Applies to Storyboard Pinned Projects as well; Librarian reference selection is unchanged.


## D-0032 · Consistent settings columns · 2026-10-23 · Phase 7
- Decision: Owner requested a shared boundary between explanatory text and controls, with equal-width text boxes. Preserve toggle/button sizing and alignment.
- Impact: Theme, Scripts and Librarian settings use two proportional columns with a 24px gap. Labels/descriptions wrap in the left two-thirds; text/number inputs, suggestions, selectors and textareas fill the right third. Textareas resize vertically only. Toggle/button widgets retain native dimensions and right alignment. Styles are scoped to the main module settings, leaving entry/setup dialogs unchanged.


## D-0033 · Mobile app pages and script tools; desktop Librarian · 2026-10-23 · Mobile increment
- Decision: Owner requested mobile loading, prioritizing the app-like menu/pages and native script editor/shortcuts. Hide Librarian or explain its mobile limitation if it appears. Acknowledge that a networked local model is possible without adding that connection feature in this pass.
- Impact: Supersedes desktop-only loading/deferred mobile scope. The manifest permits mobile; Node HTTP loads only on desktop requests. Mobile skips Librarian lifecycle/AI actions and exposes desktop-only messages for settings/restored leaves, preserving synced desktop preferences. Navigation collapses the native drawer after opening content; phone layouts/touch targets and suggestion selection are adapted. iOS soft line breaks use existing guarded script transactions; Android retains CodeMirror’s deferred IME-aware Enter path. No LAN/cloud transport, on-device model runtime, new dependency, inference optimization or creative-vault installation. Synthetic loading/browser evidence is separate from pending physical-device acceptance.


## D-0034 · User-controlled hidden menu folders and matching search fields · 2026-10-23 · Phase 7 follow-up
- Decision: Owner requested a Hidden folders settings section explaining that underscore-prefix folders appear in the menu unless listed, moving _Assets from a fixed menu exclusion to a user rule. Also requested Pinned Reference input match Find an entry in style and size.
- Impact: Theme → Hidden folders → Hide from menu stores one full top-level underscore folder name per line, case-insensitive and deduplicated. Existing installations default to [_Assets]; an explicitly empty list shows every qualifying prefix folder, including _Assets. Menu rebuilds and restored section validation use the same preference; hiding the active section falls back to Home. Assets can be browsed in their own shared section when unhidden without changing general retrieval/entry eligibility. Native file explorer contents are unaffected. Home reference/project selectors now share the search input type/class and 260px responsive width with Find an entry; the previous pin-specific 8px radius override is removed. No model or source-note changes.


## D-0035 · Explicit mobile dialogue choice; desktop inline picker retained · 2026-10-23 · Mobile fix
- Report: Owner observed that the character dropdown is absent on mobile and dialogue automatically uses the first entry. Existing highlighted-first Enter acceptance can explain this; browser emulation had not reproduced the physical-device rendering failure.
- Decision: Fix mobile dialogue selection while retaining desktop behavior. Use the public native Obsidian Modal on mobile, with searchable explicit character buttons, Use this name and Cancel. No implicit first-candidate acceptance from Enter/Tab/soft line breaks.
- Impact: Mobile suppresses the editor tooltip and preserves picker state across blur into the dialog. A queued open lets the originating Enter finish; repeated acceptance keys consume without choosing. Explicit choices use the existing guarded single native transaction and select Dialogue; Cancel leaves SPEAKER selected. New names require a button click. Source/file changes block stale insertion, and editor destruction/module unload closes the dialog through a CodeMirror ViewPlugin. Desktop inline filtering/arrows/Enter/Tab/mouse and Undo remain. No external service, dependency, template or vault migration. Physical mobile confirmation remains pending despite browser regressions.


## D-0036 · Optional focus/history; Groups for drafts; PDF compilation next · 2026-10-24 · Writing tools
- Question: Which proposed writing features should the plugin implement first?
- Options: Separate draft versions / existing Groups; optional focus and history now / compilation next.
- Recommendation: Extend native editing and the existing countdown/word tracker; keep compilation together with output presets and inclusion choices.
- Decision: Owner says draft versions are covered by Groups; implement optional focused-writing mode and optional session history/progress reports. Group compilation work for the next step, taking notes from the standalone app export. Stick to PDF; EPUB is unnecessary for comic scripts.
- Impact: Adds default-off script-editor focus and bounded local session history/reporting in the existing TypeScript/native Obsidian architecture. No new dependencies. Settings, command and footer entry points; no source-note changes except explicit CSV export. Updates PRODUCT, ARCHITECTURE, PROJECT-CONTEXT and ROADMAP. App export inspected read-only; no standalone app implementation changes. Native physical-device acceptance remains separate.


## D-0037 · Structural page/panel numbering in rendered scripts · 2026-10-24 · Scripts
- Question: How should named panels and page numbers behave after middle insertions/deletions?
- Recommendation: Derive display labels from parsed structure; preserve authored titles/source and native Undo, count spreads as two slots, and use actual slots for downstream ranges.
- Decision: Owner requests automatic panel numbers even when panels have names and automatically correct page numbers after adding/removing pages in the middle. Placeholder-until-save/Reading-view is acceptable. Owner explicitly authorizes testing in Marginalia Test Vault.
- Impact: Shared structural labels in outline/native Reading/project reader; source numbers are ignored for display, panel numbers restart per page. Actual counts supersede the earlier declared-count range rule in PRODUCT. Declared Pages remains visible diagnostic metadata. Native cached sections refresh together. No source renumbering writes, no new dependency. Updated package installed only in the authorized disposable test vault.


## D-0038 · Correct typewriter scrolling and expose the Librarian · 2026-10-24 · Writing fixes
- Report: Owner reports typewriter scrolling does not keep typing centered; requests a mobile position two-thirds toward the top. Librarian was absent from the sidebar after installation in Reanimator.
- Decision: Fix focused-writing scrolling and make Librarian discoverable. Mobile position is implemented as the upper third of the visible editor, as communicated during work; desktop uses the midpoint. Preserve native editing and avoid editing creative-vault content during diagnosis.
- Impact: Visible-viewport measurement, first/last-line padding, resize/keyboard viewport and composition hooks, cleanup. Default-off focus behavior remains. Enabled desktop Librarian creates/reuses a sidebar tab after layout restoration without focus/reveal, with explicit Open Librarian in settings. Reanimator's existing note-header action was used to open its sidebar successfully; no source edits or model generations there. Updated package installed in Marginalia Test Vault for native typing/Undo checks. Physical mobile keyboard verification remains pending.


## D-0039 · Compile button and pop-up; desktop PDF/mobile preview · 2026-10-24 · Compilation
- Question: Where should compilation options live, and how should native export capability differ across platforms?
- Options: Script Studio button with pop-up / separate Compile tab; desktop native PDF with mobile script preview / add a cross-platform PDF dependency.
- Recommendation: Button and progressively disclosed pop-up; use the desktop host's local print engine without adding a dependency, and offer mobile script preview.
- Decision: Owner chose “Let's do the button and pop-up menu” and “Desktop PDF export; mobile script preview (Recommended)”. PDF only; EPUB remains excluded by D-0036.
- Impact: One Group per compilation, existing reading order, saved inclusion/preset options per project/Group, independent print document, calculated page/panel labels, Letter/A4, exact generated-PDF preview and guarded native save. Desktop-only Electron capabilities load lazily; unsupported desktop hosts show readable script preview and an explicit capability error. No cloud service, runtime dependency or source-note writes. PRODUCT, ARCHITECTURE, ROADMAP, README and PDF-COMPILE-NOTES updated. Test-vault installation only; physical mobile and other desktop OS acceptance remain pending.


## D-0040 · Content selections and credited, dated title pages · 2026-10-24 · Compilation refinement
- Decision: Owner requested removing presets, adding Content Selections, renaming Production & editorial notes to Callouts and Notes, selecting all three content options by default, removing the persistent orange line, appending the current date to the title-page subtitle, and remembering an editable author name within the vault.
- Impact: Supersedes D-0039’s preset UI/defaults. Fresh options include Panel Descriptions, Callouts and Notes and Title page; existing saved explicit selections remain respected. Title page reveals an author field and requires a nonblank name before preview. Successful preview saves that name as a vault-wide compilation preference for other Groups/future prints. Each compilation snapshots its author and local date; the subtitle is Group · date, followed by By author. An empty modal error is hidden; actual errors remain visible. No note writes, dependency or platform changes.


## D-0041 · First Librarian reliability bucket · 2026-10-24 · Librarian
- Decision: Owner requested starting the first Librarian set and authorized implementation after the scope was restated: project isolation, Ask citations/incomplete answers, grounded Enhancement/Expansion, configured entry types/templates. Optional continuity reporting remains separate.
- Impact: Configured workspace project boundaries apply before retrieval/identity resolution, including root Storyboards and custom roots. Known original-note citations are normalized; unresolved citations become plain text with disclosure. Ask is question-focused and exposes unfinished/no-citation/omitted-evidence notices; obvious incomplete drafts retain previous results. Prompts remove length pressure and unsupported Character defaults. Enhancement, Expansion and refinement also use a separate local-model source review before publication; a flagged draft may receive one correction and another review; unresolved flags or unreadable reviews retain previous results, and sources are rechecked afterward. Project overviews use a project brief; custom types/templates determine sections, templates are not evidence and their changes invalidate in-flight results. Native rendered citations explicitly open only existing originals. No source-note writes, app changes, model/settings changes or new runtime dependency. Synthetic before/after local-model examples are supplied for author acceptance; semantic correctness is not guaranteed by structural validation.

## D-0042 · Saved Librarian outputs, freshness and responsiveness · 2026-10-24 · Librarian
- Question: The owner requested the second Librarian checklist bucket and reported excess blank space after inserting section prose.
- Options: Continue preserving standalone-owned artifacts with visible compatibility status / introduce a destructive ownership migration. Existing PRODUCT and D-0041 boundaries require preservation.
- Recommendation: Keep the compatible vault-relative envelope; retain a recoverable previous plugin version, disclose unsupported legacy formats and track possible evidence changes beyond the original source list.
- Decision: Owner authorized “the next step (step 2 from the checklist)” together with the insertion spacing fix, then requested continuation. No standalone overwrite/migration or creative-vault installation was requested.
- Impact: Insertion replaces trailing section placeholder whitespace in one native undo transaction, preserving CRLF. Library lists compatible standalone, older-format, damaged and recoverable missing outputs. Legacy prose is read-only; supported standalone replacement stays disabled. Plugin replacements verify a previous-version copy in `.marginalia/recovery/<entry path>` before saving; explicit restore retains the replaced bytes. New optional envelope freshness digests cover configured scope/shared originals and retrieval configuration; older outputs disclose limited freshness coverage. Native cached reads, throttled progress-label updates and debounced/coalesced expansion rendering reduce repeated work. In-memory retrieval/model/render/storage timings support diagnostics. Local synthetic two-directory portability is verified; actual Sync delivery and cross-device acceptance remain open. No new dependency, source migration, standalone-app changes or mobile AI.

## D-0043 · Project classification, sidebar structural dragging and responsive navigation · 2026-10-25 · Step 3
- Question: The owner requested the proposed work for all four Step 3 items and clarified how structural movement should be exposed.
- Options: Sidebar page/panel movement buttons or commands first / sidebar drag-and-drop with optional commands. Owner explicitly chose dragging and optional unbound commands.
- Recommendation: Share project recognition across workspace, creation, Script Studio and Librarian; preserve predecessor ordering; move original page/panel ranges in native editors; cache unchanged work and preserve view state.
- Decision: “It should all be done through drag-and-drop on the sidebar”; commands may be exposed for user-assigned shortcuts with no defaults. Owner then authorized “all items in step 3.” Pages reorder within their original script; panels can move between pages in that script, preserving one native Undo. Cross-file moves remain outside this single-editor operation.
- Impact: Shared configured-root/explicit-project/legacy-script resolver excludes organizational overview/index/dashboard folders and shared canon; no filing migration. Sidebar desktop dragging and touch long-press provide structural movement without movement buttons. Added page move and previous/next page/panel commands, retaining panel commands with no assigned hotkeys. Native isolated history, stale-editor guards, revision/lifecycle checks, parsed-script/stat caching and invalidation, coalesced refreshes, outline reuse with live offsets, and per-script reader component reuse. Verification must distinguish synthetic, native desktop, reopened-vault and pending physical mobile evidence.


## D-0044 · Skip writing diagnostics; device and release acceptance · 2026-10-25 · Step 5
- Question: Proceed with optional writing diagnostics or move directly to device/release checks.
- Decision: Owner said “Let's skip step 4: Optional writing diagnostics. You can do step 5” and explicitly authorized the newest plugin installation in the iCloud Reanimator vault for iPhone Mirroring tests.
- Impact: No writing-diagnostics feature is implemented. Device checks use a separate fictional project and a backed-up plugin/settings baseline; original notes are hash-checked. Report native iPhone/Mac evidence separately from browser emulation and unavailable Android/Windows/Linux/direct-keyboard/rotation/Sync checks. Preserve the desktop-only Librarian and PDF-export boundaries. A singular session-count label found during acceptance is corrected.


## D-0045 · Reversible mobile bottom character picker trial · 2026-10-25 · Mobile writing
- Question: Streamline mobile dialogue-name insertion while handling the software keyboard.
- Options: Compact bottom picker that temporarily blurs the editor / persistent chips above the keyboard / typed-name shortcut.
- Recommendation: Reuse the native guarded Modal and editor transaction; blur the editor for quick character taps, explicitly open search, then restore editor focus and Dialogue selection.
- Decision: Owner said “Let's try this, but keep what's needed to revert if it doesn't work smoothly.” Reanimator installation and Mirroring checks remain authorized.
- Impact: Up to six session-recent script characters appear as touch buttons in a bottom sheet; search exposes the complete existing cast and explicit custom-name action. No new setting, saved-name history, note migration or dependency. Existing source/file guards, explicit selection, Cancel, native Undo and desktop dropdown remain. Prior source and installable build retained in the ignored .rollback/dialogue-picker-2026-10-25 folder. Native Mirroring evidence is distinguished from direct software-keyboard smoothness acceptance.
