---
title: Librarian Product Plan
type: Spec
date: 2026-10-03
tags:
  - spec
  - marginalia
  - librarian
---

# Librarian — Product Plan

> [!abstract] Summary
> The Librarian is Marginalia's on-device AI assistant. It reads the whole vault, finds problems, and suggests improvements, but it **never writes to canon**: every change to a note is a human edit and a human Save. Its functions come in two tiers. **Tier 1** is a catalog of explicit, deterministic rules that needs no model and never wakes the Librarian. **Tier 2** uses the bundled local LLM, is loaded only on request, and can be put back to sleep. This document is written for the AI coding agent building it, and slots into the existing `PRODUCT.md`, `ARCHITECTURE.md`, `CONTENT-MODEL.md` and `ROADMAP.md`.

This is the authoritative Phase 7 Librarian feature contract. Phase 7 is desktop-only; all mobile delivery belongs to future Phase 9. Product, architecture, content-model and roadmap summaries must agree with this document.

---

## 1. Principles (non-negotiable)

1. **The AI never changes canon.** The Librarian and the rule engine have no write path to vault notes. Suggestions are data shown in the UI. A suggestion can be inserted into the user's own _unsaved_ editor buffer by a user click; only the user's Save writes to disk.
2. **The Librarian writes only inside `.marginalia/`** (see §8). Nothing else in the vault is created, edited or deleted by the Librarian. The only other writes are the user's own Saves (including saving a new note through the app's existing new-entry feature, used by the Script Importer §6.9 and Gap Finder §6.6) and the user-confirmed Archive move in Duplicate Merge (§6.7).
3. **Rules are explicit.** Tier 1 behavior comes from the rule catalog in §5, not from an agent's judgment while building. Adding or changing a rule is a documented decision.
4. **Cite or drop.** Every Tier 2 finding must cite the vault entries it rests on (note path plus a short excerpt). A finding with no citation is discarded, not shown. Entry-writing draft prose carries consulted-source provenance rather than a claim of sentence-by-sentence verification.
5. **Deterministic never wakes the model.** Anything that can be computed from the parsed vault index is Tier 1.
6. **Synthesis, review and proposed lore.** The Librarian explains established material in its own words, identifies inconsistencies and helps shape fragments into structured, linked drafts. Established facts, interpretations and proposed additions are distinguished. Drafting is allowed; invention is never presented as existing canon, and only human Save establishes a note change. Its app-owned runtime voice is defined in `LIBRARIAN-SOUL.md`.
7. **Canon-type writing.** Entry drafts and expansions follow the target’s canon type, selected subtype and template sections, with distinct guidance for Character, Affiliation, Location, System, Event, Item and Lore. See `LIBRARIAN-CANON-WRITING.md` for the accepted writing process, experimental coverage and integration status. Empty target notes still use linked evidence; related individuals, collectives and systems remain distinct subjects.
8. **Offline and local.** Inference stays on the device. Built-in inference is embedded; Local Ollama uses only the loopback API at 127.0.0.1:11434. Internet access is limited to user-initiated model downloads (§9); advertised cloud models are not supported.
9. **Distinguish certainty.** Tier 1 findings are certain and carry a rule ID. Tier 2 findings are labeled as Librarian suggestions to verify.

---

## 2. Functions at a glance

| Function                                  | Scope                                       | Tier                                        | Wakes Librarian?          | Lives on                                                                  |
| ----------------------------------------- | ------------------------------------------- | ------------------------------------------- | ------------------------- | ------------------------------------------------------------------------- |
| **Alignment** (Frontmatter + Links)       | One entry or script                         | 1, plus a Tier 2 tag-fit step               | Only for the tag-fit step | Entry and Script Librarian menu (listed first)                            |
| **World Review, level 1** ("Run checks")  | Whole vault                                 | 1                                           | No                        | Home                                                                      |
| **World Review, level 2** ("Deep review") | Whole vault                                 | 2                                           | Yes                       | Home                                                                      |
| **Gap Finder**                            | Whole vault (project scope on Project page) | 1 candidate detection, 2 for prose mentions | Only for prose mentions   | Home; Project page Scripts tab                                            |
| **Entry Enhancement**                     | One entry                                   | 2                                           | Yes                       | Entry Librarian menu                                                      |
| **Entry Expansion**                       | One entry                                   | 2                                           | Yes                       | Entry Librarian menu                                                      |
| **Continuity Check**                      | One script/page; project scope              | 2                                           | Yes                       | Script Librarian menu; Project page Scripts tab                           |
| **Duplicate Merge**                       | Two entries                                 | n/a                                         | n/a                       | Not a button: an action offered on duplicate findings inside World Review |
| **Script Importer**                       | One document becomes one script             | 1 (extract + rules); 2 only for leftovers   | Only if leftovers exist   | Project Scripts tab and Script Studio rows                                |
| **Librarian chat** (retrieval)            | Whole vault, page-aware                     | 2                                           | Yes (first message)       | Right AI sidebar                                                          |

All Librarian functions operate within the currently selected vault, never across imported vaults. Project scope restricts targets to that project while Tier 2 may retrieve supporting canon from the selected vault. The chat always has whole-vault context. Page-awareness means it also knows the current page; it does not narrow its scope to it.

---

## 3. Lifecycle: asleep by default

The Librarian is **not loaded at app startup.**

| State            | Meaning                                                                                |
| ---------------- | -------------------------------------------------------------------------------------- |
| Asleep (default) | Model not loaded. Sidebar chat input and all Librarian buttons are visible and usable. |
| Waking           | Model loading. Brief "Waking the Librarian…" indicator.                                |
| Awake            | Model loaded, idle.                                                                    |
| Working          | Running a task.                                                                        |

- **Wake triggers:** pressing any Tier 2 function, or sending the first chat message. The request is queued and runs automatically when loading finishes (no second click).
- **Tier 1 functions run in the Asleep state** and never trigger a wake. On Home, label the two Review levels so the cost is visible, e.g. "Run checks" vs. "Deep review (wakes Librarian)".
- **Header state and Wake:** display Asleep with Wake and Awake as Idle with Sleep. Waking/Working display their state with Cancel task. Read-only browser review without local AI displays Desktop only. Wake loads a local model through the existing lifecycle without generating an answer, adding a chat turn or clearing a drafted question. Missing models use the existing explicit setup/download flow; cancellation and errors retain the transcript. This is an optional manual action, never an automatic startup wake.
- **Manual sleep:** a button in the sidebar header. If a task is running, it asks the user to cancel the task first.
- **Auto-sleep (Settings option):** enabled by default after 10 idle minutes on desktop. Idle means no active task; auto-sleep does not interrupt desktop work. Phase 9 native iOS uses 3 idle minutes and cancels active work before unloading when backgrounded.
- **Sleeping unloads the model but keeps the visible chat transcript** for the session. Waking re-reads context, so it is slower, but nothing on screen is lost.
- **Nothing the Librarian needs is built at startup.** Any retrieval index is built on first wake, cached in `.marginalia/`, and updated incrementally.
- The chosen local LLM runtime **must support an explicit load and unload** so sleep actually frees memory (see §12).

---

## 4. Shared finding model

Every function produces findings in one shape, so the UI can render them uniformly.

```ts
type Finding = {
  id: string;
  source: 'rule' | 'librarian'; // Tier 1 vs Tier 2
  ruleId?: string; // e.g. "LNK-002" (Tier 1)
  severity: 'error' | 'warning' | 'suggestion' | 'info';
  scope: 'entry' | 'script' | 'project' | 'vault';
  target: {
    notePath: string;
    location?: {
      line?: number;
      property?: string;
      page?: number;
      panel?: number;
    };
  };
  message: string;
  evidence: { notePath: string; excerpt?: string }[]; // required for source = "librarian"
  fix?: ProposedFix; // structured, applied only via an editor-buffer insert
  dismissKey: string; // ruleId + notePath + evidence hash
};
```

- **error:** structurally broken (unresolved reference, chain cycle). **warning:** likely a mistake. **suggestion:** convention or improvement. **info:** worth knowing.
- `ProposedFix` is structured data (replace text, set property, add/remove tag, set list item), never a file write.

---

## 5. Tier 1: the explicit rule catalog

### 5.1 How rules are decided

Rules are laid out here, in advance, and implemented exactly as written. Two kinds exist:

- **Structural rules:** fixed logic (a link resolves or it doesn't; a chain has a cycle or it doesn't).
- **Convention rules:** compare an entry against the _vault's own_ habits (what properties and tags similar entries use). The rule logic and thresholds are fixed here, but the "convention" itself is computed from the vault at runtime. Nothing about a particular vault's schema is hardcoded.

Required properties per entry type come from `CONTENT-MODEL.md`, which is the single source of truth. If a type declares no requirements, only the convention rule FM-002 applies.

Engine requirements:

- Each rule is a pure function over the parsed vault index: no I/O, no LLM, deterministic output for the same input.
- Rules register in a rule registry with ID, scope, severity, and message template, so adding a rule is additive.
- The same rules run at **item scope** (Alignment) and **vault scope** (World Review level 1). They are written once.
- Incremental: on Refresh, reuse unaffected findings. Note-local rules re-evaluate changed notes; link-dependent rules also re-evaluate affected neighbors and resolution changes. Convention, identity and chain rules re-evaluate when their vault-wide inputs change.
- Per-rule enable/disable in Settings, grouped by rule category. All rules start enabled; switches are remembered for the current vault and apply immediately to Alignment, reviews and Gap Finder without model wake. Per-rule thresholds are settled internal defaults, not user-facing.
- Every rule has at least one fixture and expected finding (see §11).

### 5.2 Link rules (body and frontmatter values)

| ID      | Check                                                                                                                                                                                                | Suggested fix                       | Severity |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | -------- |
| LNK-001 | Wikilink target does not resolve (body or any frontmatter value)                                                                                                                                     | none, or LNK-002 fix                | error    |
| LNK-002 | Unresolved link has a **near-miss** note: equal after normalizing (case, leading "The/A/An", trailing "s"), or 1 letter off for names of 6+ characters, or 2 letters off for names of 12+ characters | Replace link with the matching note | warning  |
| LNK-003 | Link resolves to a note with an empty body (the "stub" state)                                                                                                                                        | none                                | info     |
| LNK-004 | Link matches multiple notes (tie-break applied)                                                                                                                                                      | Show other candidates               | info     |

### 5.3 Frontmatter rules (entries)

| ID     | Check                                                                                                                      | Suggested fix                                             | Severity   |
| ------ | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------- |
| FM-001 | A property required for this type by `CONTENT-MODEL.md` is missing or empty                                                | Add property                                              | warning    |
| FM-002 | Convention gap: property is present in ≥ 75% of same-type entries (minimum 5 entries) but missing here                     | Add property                                              | suggestion |
| FM-003 | Near-miss tag: normalizes equal to a more frequently used tag (case, separator, plural), e.g. `comic/astd` vs `comic/ASTD` | Replace with the frequent tag                             | warning    |
| FM-004 | Peer tags: tags used by ≥ 50% of entries in the same folder/project (minimum 5 entries) that this entry lacks              | Add tag                                                   | suggestion |
| FM-005 | Duplicate or empty values inside a list property                                                                           | Remove                                                    | warning    |
| FM-006 | Title or alias collides with another entry's title or alias                                                                | Review (feeds duplicates)                                 | warning    |
| FM-007 | Property type drift (same property is a list in some entries, a string in others)                                          | Normalize                                                 | suggestion |
| FM-008 | Entry outside Scripts and `00 Brainstorms/` has no Summary callout, or it is empty (callout form per `CONTENT-MODEL.md`)   | none (Enhancement can draft)                              | suggestion |
| FM-009 | Script missing Preceded By (an existing empty field is valid)                                                              | Insert a unique clean-chain predecessor or an empty field | suggestion |

### 5.4 Script rules

| ID      | Check                                                                                                                                                                                                                        | Suggested fix            | Severity          |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ----------------- |
| SCR-001 | "Preceded By" or legacy "Followed By" does not resolve, or an explicit "Group" wikilink does not resolve. Plain Group labels remain valid                                                                                    | LNK-002 fix if near-miss | error             |
| SCR-002 | Script relationship cycle (app already falls back to alphabetical order; this surfaces it)                                                                                                                                   | none                     | error             |
| SCR-003 | Conflicting predecessor/successor claims, including disagreement between legacy and new links                                                                                                                                | none                     | error             |
| SCR-004 | Orphan: script is excluded from a confirmed chain because it leads directly or indirectly into a broken chain (missing successor or conflicting sources). Valid standalone scripts and independent sequences are not orphans | none                     | warning           |
| SCR-005 | Declared `Pages` ≠ number of page slots in the script (a Double Spread counts as 2)                                                                                                                                          | Set declared Pages       | warning           |
| SCR-006 | `## Page N` numbering has gaps or duplicates                                                                                                                                                                                 | none                     | warning           |
| SCR-007 | A speaker or named character appears in the script but not in frontmatter `characters`; or a frontmatter character never appears (info)                                                                                      | Add/remove list item     | suggestion / info |
| SCR-008 | `locations` listed vs. locations actually used in scene slugs and panel locations                                                                                                                                            | Add/remove list item     | suggestion        |

### 5.5 Vault-only rules (World Review level 1)

| ID      | Check                                                                                                                                               | Severity   |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| VLT-001 | Same normalized title/alias on entries in different folders. A project-local entry sharing a name with a Canon entry is flagged as likely duplicate | warning    |
| VLT-002 | Orphan note: no inbound and no outbound links. No areas are exempt; the user dismisses what they don't need (dismissals persist)                    | info       |
| VLT-003 | Entry with an empty body or only empty sections                                                                                                     | suggestion |

### 5.6 Gap Finder candidate detection (Tier 1 part)

| ID      | Check                                                                                                                                                                      | Output                                                           |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| GAP-001 | Aggregate unresolved link targets (body and frontmatter) referenced by **at least two distinct source notes**, with **no near-miss** match (near-misses belong to LNK-002) | Ranked list: target name, reference count, distinct source notes |
| GAP-002 | Names listed in `characters` / `locations` frontmatter with no matching note                                                                                               | Merged into the same ranked list                                 |

Near-miss fixes require a unique closest match. Tag and property-form proposals require a unique frequency leader or clear majority; ties show candidates/type drift without Insert. Scalar proposals never discard a multi-value list.

SCR-007 uses explicit speaker names and existing entry titles/aliases in authored prose. SCR-008 uses scene slugs and explicit panel locations. Names match case-insensitively; shortened identities are never guessed without a declared alias. Code and comments do not count as authored mentions.

Project scope restricts the same rules to a project's notes.

---

## 6. Tier 2: Librarian functions

All Tier 2 functions share these constraints: whole-vault awareness through retrieval (not by loading everything), a per-device context budget (§9), original-source provenance, cancellable, progress shown, and results labeled as Librarian suggestions.

### 6.1 World Review, level 2 ("Deep review")

- **Looks for:** contextual contradictions between entries, semantic duplicates and unresolved complications. Compare subject, world/project, date, chronology and evidence status (narration, dialogue, allegation or speculation). Development over time and different speakers’ beliefs are not automatically contradictions. Findings explain the precise disagreement, cite both sides and distinguish conflict from possible conflict; the creator decides which account to retain.
- **Process:** build clusters from link neighborhoods, shared tags and entry type; extract compact cited claims across context batches, compare relevant claims, and verify proposed conflicts against original passages. Include original-text comparison as a fallback; generated claims are navigation aids, never independent evidence. For duplicates, a deterministic prefilter proposes candidate pairs and the LLM verifies them. Cache validity includes instruction/pipeline version, context and source fingerprints.
- **Output:** progressive report (findings stream in), same Review report as level 1 with a Librarian badge. Reports are cached in `.marginalia/` and invalidated per entry by modified time.

### 6.2 Entry Enhancement

- **Input:** the current entry, incoming/outgoing links, declared script references and explicit name/alias mentions, with nearby same-page panel/dialogue context and a bounded supporting-lore hop. Original passages retain owner, source status and script order; omitted material is disclosed.
- **Output:** human-reviewed draft additions organized by existing/template sections, each with proposed natural lore and a consulted-source inventory. Consulted sources are not claims that every generated sentence has been verified. Types include: empty or thin sections, contradictions with connected entries, undeveloped relationships, missing cross-references, and a draft Summary when none exists.
- **Never** a full rewrite of the entry.
- **UI:** the user’s own editor with temporary suggestions in the lower section of the existing right sidebar. Chat remains in the upper section; closing suggestions restores the open-entries section. Each suggestion has **Insert into editor** and **Dismiss**. Notes are **session-only**: closing the view hides them, an Open Entry Enhancement action can reopen them, and nothing is stored.

### 6.3 Entry Expansion

- **Purpose:** a holistic view of everything the vault says about an entry. The original entry stays a summary. The expansion is a separate, generated artifact.
- **Gathers from:** backlinks; scripts, outlines, and plots where the entry is listed in frontmatter (`characters`, `locations`); and plain-name or alias mentions in scripts. Scripts wikilink a character only for information important to that character, so frontmatter and name matching are required, not just links.
- **Organized by:** coherent entry sections, starting with the source entry and matching template headings. Add supported sections where useful; omit empty sections. History respects in-story dates and script chronology. Project/script/page order belongs to the source inventory, not the main prose.
- **Content:** a detailed synthesis of the original entry and gathered evidence. Merge repeated facts, distinguish events/identities, explain relationships, preserve limitations and surface unresolved contradictions. Draft prose is generated directly from a bounded packet of original passages using the shared writer and canon profiles. Consulted-source excerpts remain available for human verification; they are not fabricated paragraph citations. No speculative additions or arbitrary length padding. When material exceeds context, selection retains target and source coverage and visibly reports omissions; generated claims are not used as substitute evidence. Legacy generated artifacts remain readable but are marked for regeneration after instruction changes.
- **Storage and behavior:**
  - Saved under `.marginalia/expanded/`, with frontmatter marking it generated, the source entry, the generated-at time, and the list of source notes with their modified times.
  - Read-only and **regenerate-only**. A stale banner appears when any source note changed ("N sources changed since this was generated") with a Regenerate button.
  - Excluded by default from Canon tabs, the graph, search, and Librarian retrieval.
  - Displayed in the main pane with a "Generated, not canon" label.

### 6.4 Continuity Check

- **Scope:** a page, a script, or a whole project (project scope lives on the Project page's Scripts tab).
- **Input:** the script content, the canon entries for characters and locations in its frontmatter and links, and summaries of earlier scripts in the chain.
- **Looks for:** statements in dialogue or panel descriptions that conflict with established canon (abilities, relationships, locations, prior events). Not style, pacing, or taste.
- **UI:** findings occupy the lower right sidebar section, replacing open entries while visible; chat remains in the upper section and closing findings restores open entries.
- **Output:** findings anchored to a page/panel, each citing the script text and the canon text it conflicts with, with a confidence label (conflict / possible conflict). Results appear in the sidebar; clicking one jumps to the anchor in the script viewer.

### 6.5 Alignment: Tier 2 tag-fit step

- Alignment runs Tier 1 first without waking the model. An explicitly selected, clearly labeled AI tag-fit action runs this step, even if the model is already awake.
- Suggests tags that fit the entry's content. **Chosen only from the vault's existing tag vocabulary.** A genuinely new tag may be suggested only if labeled "new tag". Merged into the Frontmatter section of Alignment alongside Tier 1 findings.

### 6.6 Gap Finder: Tier 2 prose mentions

- Find gaps runs GAP-001/002 first without waking the model. A clearly labeled optional AI prose scan adds these findings only on explicit request.
- Finds entities mentioned in prose that are never linked or listed anywhere, so GAP-001/002 can't see them. They are merged into the ranked list. Each gap has a **Create entry** button that hands off to the app's existing new-entry feature (project dropdown, human Save). The same New Entry popup as Home prefills the title and keeps the type, template and destination choices. With the Librarian awake it can prefill a draft Summary for the user to edit, retaining the chosen template’s other sections.

### 6.7 Duplicate Merge (action, not a function)

- Appears on duplicate findings (VLT-001, FM-006, and level 2 semantic duplicates).
- Opens the two entries side-by-side. The user reconciles by editing **one** of them in the editor; the Librarian never edits either.
- Afterwards it offers **Archive the other entry**: a user-confirmed move of that note to a root-level `Archive` folder in the vault. The folder is non-numbered, so the app ignores it, while it stays visible in Obsidian, where name-based links still resolve. Never automatic, never a delete.
- Because the app ignores `Archive` in indexing and resolution, notes that still link to the archived entry will show as unresolved links (LNK-001). Alignment then lists them with a proposed fix pointing at the kept entry, preserving fragments/display aliases and applied through the usual insert-and-Save. The human-confirmed relationship is remembered in `.marginalia/reports/archive-repairs.json`. Archive refuses an existing destination or changed source; a repair-record write failure preserves the moved note, shows a warning and offers retry.

### 6.8 Librarian chat (retrieval)

- Lives in the upper right AI sidebar. Answers in natural, coherent prose with compact clickable citations; quotations are supporting evidence, not the default answer. Supports recall/synthesis, contextual canon review and proposed lore drafts from user fragments. Distinguish facts, interpretation and proposal. Acknowledge insufficient evidence and incomplete retrieval; clarify ambiguous named subjects. Conversation retains subject/draft context while prior model answers remain untrusted conversation, not evidence. No automatic canon writes.
- Retrieval resolves the subject named in the question first (title, alias or explicit path), then its links, backlinks, frontmatter references and relevant name mentions. The current page is a fallback, not a substitute for the requested subject. Select relevant sections across long notes and scripts within budget; additional useful linked context is bounded. Report omitted coverage. Link neighborhoods plus existing full-text search remain the foundation. Embeddings may be added later if the chosen runtime makes them cheap; retrieval sits behind an interface so they can be added without changing any function.

### 6.9 Script Importer

- **Purpose:** turn an uploaded Word (`.docx`) or text-based PDF script into a markdown script note matching the system's script syntax (defined in `CONTENT-MODEL.md`), ready for review and Save.
- **Supported input:** `.docx`, and PDFs with a text layer. A scanned PDF (no text layer) is detected and rejected with a clear message. OCR and multi-issue documents are backlog (Gemma 4's image input could handle scanned pages later). One document is treated as one script. Legacy binary `.doc` must first be saved as `.docx`.
- **Guardrail: structure, never wording.** Structural markers may change (for example, "PAGE ONE" becomes `## Page 1`, and a leading "Panel Description:" becomes panel structure without repeating the label). Dialogue, descriptions, speaker names, captions, SFX and notes retain their wording and original order. A deterministic check compares whitespace-normalized content payloads separately from recognized structural markers; any block that fails falls back to a verbatim "needs review" block at its original position. Unrecognized content, including artist notes, appendices and margin notes, remains verbatim at its original position, using existing supported note syntax where recognized or a generic text block otherwise. Story content is not dropped or moved to an end appendix. Reliably detected recurring page headers/footers are omitted from the script and review queue, with a notice, while retained in extracted source data. Images are skipped with a notice; tables are flagged for review.
- **Pipeline:**
  1. **Extraction (Tier 1):** text plus structure cues (docx styles, bold/italic, caps, alignment; PDF text with layout positions). Word extraction uses fflate and an app-owned XML reader; PDF extraction uses bundled PDF.js and a local worker.
  2. **Rule pass (Tier 1):** recognize explicit comic-page headers (digits or words, suffixes such as scene details or panel counts, and adjacent page ranges), word/number panel markers and numbered `1)` descriptions, double-spread/splash markers, scene and location lines, speaker lines (`NAME:` or centered caps followed by dialogue), captions, and SFX; map them to the system's syntax (e.g. `## Page N`). Each block is marked parsed, ambiguous, or unparsed.
  3. **AI pass (Tier 2, only if ambiguous or unparsed blocks exist):** given a block and its surrounding context, the model chooses only its structural role. It never rewrites text. With no leftovers, the Librarian never wakes.
  4. **Verbatim check, then frontmatter derivation.**
- **Derived frontmatter (user confirms):** title (document title or file name); `characters` (speaker names, matched to existing character entries, unmatched names kept as plain names); `locations` (from scene lines, matched to existing entries); `Pages` (computed, a double spread counts as 2 slots); status and default tags from the selected vault’s Script template, always including a script-type tag. If no template default exists, status is empty and only the script-type tag is supplied; project overview tags are not inferred. "Preceded By" and "Group" are left empty. The imported script is not wired into a chain and remains a valid standalone script; SCR-004 does not flag it merely for being unconnected.
- **Draft editing:** full-width converted draft in the existing script editor, after confirming its project/file destination. Source classifications, priority flags and reviewed state are stored but have no sidebar or navigation/count UI. Any block can be repaired using its type menu or selected-text conversion. Selected text converted to a page becomes a panel description and keeps following content in order. Human repairs are distinct from optional AI proposals. No canonical script exists until Save; recovery data lives only in `.marginalia/imports/`.
- **Saving is a human act:** it reuses the app's existing new-entry feature: the project location dropdown (preselected from the Scripts tab or Studio row) and the file name. The user's Save creates the note in that project's scripts folder. Discard deletes the draft.
- **Drafts:** kept in `.marginalia/imports/` until saved or discarded, so closing the app does not lose review work. The source file itself is not kept; the draft retains extracted source text, structural cues, review flags and editor changes so the editable draft can resume.
- **Entry points:** an **Import Script** button on the Project page's Scripts tab and on Script Studio project rows. Future Phase 9 mobile uses the native file picker.

---

## 7. Placement and interaction

The Librarian's triggers live **in the page**, not in the sidebar. The sidebar keeps its existing behavior (page-aware, content does not swap on navigation).

| Page                            | Control                                                                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Home**                        | Librarian cards: Run checks (Tier 1), Deep review, Find gaps. Eventually also the central Librarian presence already planned for Home. |
| **Entry view**                  | Action row: Gallery / Graph / Edit, plus a single **Librarian menu**: Alignment (first), Enhancement, Expansion.                       |
| **Script view**                 | Toolbar **Librarian menu**: Alignment (first), Continuity Check.                                                                       |
| **Project page, Scripts tab**   | **Import Script** (project preselected), plus project-scope Continuity Check, Gap Finder, and the script chain checks.                 |
| **Script Studio, project rows** | **Import Script** (project preselected)                                                                                                |
| **Right AI sidebar**            | Chat; wake/sleep indicator; sleep button. Collapsed state stays a single expand button.                                                |

Result surfaces:

- **World Review and Gap Finder:** full main-pane report; each finding links to its entry; filter by rule, severity, level; Duplicate Merge action on duplicates.
- **Alignment:** a panel with two sections, **Frontmatter** and **Links**, showing proposed fixes. **Insert** places the fix into the editor buffer (entering edit mode in place if needed, per the existing edit-mode transition). The existing unsaved-edit prompt applies on leaving.
- **Enhancement:** lower right-sidebar suggestions beside the editor (§6.2).
- **Expansion:** read-only generated view (§6.3).
- **Continuity Check:** sidebar list with jump-to-anchor.
- **Script Importer:** a full-width editable draft (source/flag UI hidden, classification and recovery data retained), then the existing new-entry flow to Save (§6.9).

Future Phase 9 mobile: same functions and editing (native wrapper). The Enhancement side-by-side stacks vertically or becomes tabs. Tier 1 runs at full strength. Tier 2 targets the smaller E2B model with a lower context budget; on-device performance and quality must be verified in Phase 9.

---

## 8. Files the app writes (`.marginalia/`)

`.marginalia/` is a dot-folder in each vault's root folder, so the generated files travel with the vault:

```
<vault>/.marginalia/
  expanded/<relative entry path>.md   # generated expansions (§6.3)
  reports/                            # cached Deep review reports
  dismissed.json                      # dismissed findings, keyed by dismissKey
  imports/                            # unsaved import drafts, until saved or discarded
  index/                              # lazy retrieval cache; future embeddings may use it
```

- Because it lives inside the vault, renaming or moving a vault keeps its generated files, and the app needs access only to the vault folder it already opens.
- Every vault scan, Search, Graph and the file-watcher must ignore `.marginalia/`. Obsidian also ignores dot-folders, so it never shows up there.
- Sync tools may sync it. Users who don't want that can exclude `.marginalia/`; everything in it regenerates except dismissals and import drafts.
- Nothing in `.marginalia/` is canon.
- The only vault writes outside this folder are the user's Saves and the user-confirmed Archive move (§6.7).

---

## 9. Models and platform

Settings and first-use model setup offer **Built-in** or **Local Ollama**. Built-in offers a single Gemma 4 E4B download button; after installation it becomes Use selected model, or Model Selected for the active choice. File/folder and installed-model chooser buttons are removed. Local Ollama lists installed local models through the local API, including supported MLX models managed by Ollama. The user installs and starts Ollama separately. No automatic model download, external endpoint or server configuration change occurs. Provider/model selection is remembered only after choosing a model. Context and thinking capabilities are checked on wake; server allocation must match the requested context. Progress, cancellation, explicit sleep and auto-sleep reuse the existing task lifecycle. Sources and prompts remain the same across providers; generated output still requires human review and Save.

- The Librarian uses the **Gemma 4** family. **E2B** on mobile and **E4B** on every computer by default. Larger installed models can be selected through Local Ollama. E2B and E4B have a 128K native context window.
- Built-in setup discovers the downloaded default locally. Context help mentions Ollama only while that provider is selected; compatible-12B helper text is removed.
- The **context budget per Tier 2 call scales by device**: 32k tokens on mobile and 64k on computers by default, well under the native limits, to protect battery, memory and speed. Settings can raise it, up to what the selected model's context supports and the device's memory allows.
- Gemma 4's configurable **thinking mode** is **on for Deep review and Continuity Check** and **off** for chat, tag-fit and the Importer's AI pass (speed and battery).
- **Runtime:** desktop uses embedded llama.cpp through the pinned `llama-cpp-2` 0.1.158 Rust binding, with Metal enabled on macOS and iOS, behind a small **inference adapter** (load, unload, generate, with thinking-mode, context-size and app-owned system-message options). Librarian code never depends on the engine, so an Apple MLX backend can be added later if benchmarks on real devices justify it. The engine supports explicit load and unload (§3). Phase 9 iOS reuses this engine with the pinned ggml-org E2B Q4_0 artifact (D-0133); simulator generation/lifecycle evidence and outstanding device checks are recorded in `PHASE9-NATIVE-AI-REVIEW.md`.
- **Model delivery:** Gemma 4 is released under Apache 2.0, so bundling and redistributing it is allowed; the app ships the license text and attribution in its legal notices. Computers get **two installers**: a small one that downloads the model on the first Librarian wake and then works fully offline, and a full offline installer that includes E4B. On iOS, the E2B model downloads after install rather than inside the app bundle, with a Files-app import as a fallback.
- Phase 9 uses the existing Tauri iOS/Xcode wrapper, writable Swift vault plugin and shared local inference engine. The owner also approved and accepted a separate responsive read-only mobile web release (D-0119/D-0124/D-0125); that browser release has no local AI. Native device acceptance and distribution remain pending.

---

## 10. Roadmap phases

Phase 7 follows the verified completion of Phase 6. Its desktop milestones run in the order below; each requires requirement evidence and regression checks before completion. The embedded Rust GGUF binding, default E4B Q4_0 artifact, native downloader and local extraction dependencies are settled. Mobile work is reserved for Phase 9.

- [x] **L0 — Foundations:** `.marginalia/` handling (and ignoring it everywhere), finding model, rule registry and engine, Librarian menu shells, Home Librarian cards
- [x] **L1 — Tier 1 rules:** link rules, frontmatter rules, script rules, vault-only rules, Gap Finder candidates; Alignment panel (Frontmatter + Links); World Review level 1 report; insert-into-editor; dismissals; Gap Finder Create entry (normal template popup)
- [x] **L1b — Script Importer, rules half:** `.docx` and text-based PDF extraction, rule-based conversion, verbatim check, frontmatter derivation, draft review view, hand-off to the existing new-entry flow, Import Script buttons
- [x] **L2 — Librarian runtime:** embedded GGUF runtime integrated; wake/sleep state machine, manual sleep, auto-sleep setting, queued wake and chat with cited retrieval verified (`PHASE7-L2-REVIEW.md`)
- [x] **L3 — Tier 2 functions:** Entry Enhancement (temporary lower-sidebar suggestions), Entry Expansion (+ staleness/regenerate), Continuity Check, tag-fit, Gap Finder prose mentions, Deep review, Script Importer AI pass for leftover blocks
- [x] **L4 — Finish:** Duplicate Merge action with human-confirmed Archive, project-scope views, per-rule Settings toggles

---

## 11. Testing and fixtures

- The GreekDemo vault is the primary fixture. Seed one defect per active rule with an expected finding, and keep a clean control entry per rule. FM-001 currently has no required-property defects because all fields are optional; test its empty output under that contract.
- Real cases to keep as regression fixtures: a singular/plural link typo (`Paradise Island` vs. `Paradise Islands`), a leading-article link typo (`The Ungifted` vs. `Ungifted`), a character in frontmatter with no note (`Aleesha`), a script whose location links are all unresolved, an entry with an empty Summary callout and an empty section, a link to an empty stub note, a Script relationship cycle, and two scripts claiming the same successor.
- Rule engine: unit tests per rule (pure functions); a test that item scope and vault scope agree on shared rules.
- Tier 2: a cite-or-drop test (review findings without citations never render), plus writing regressions distinguishing consulted-source provenance from factual verification, and a test that the Librarian never writes outside `.marginalia/` (the only other Librarian-related writes are user Saves and the separately user-confirmed Archive move).
- Script Importer: sample `.docx` and text-based PDF scripts in several layouts ("PAGE ONE / Panel 1" style, numbered pages, `NAME:` speakers, centered-caps speakers); a scanned PDF (rejected with a message); a document with a table and an image (flagged and skipped); a document with artist notes (preserved verbatim); the content-payload preservation and source-order check on every fixture, including changed page/panel markers and notes interleaved with dialogue. Valid standalone scripts and independent sequences are clean controls for SCR-004. FM-001 produces no findings while all type fields remain optional. Verify optional AI steps never run implicitly, selected-vault isolation, queued wake, cancellation, unload and 10-minute desktop auto-sleep.

---

## 12. Decisions and open items

**Decided in review:** dismissed findings, cached Deep review reports and unsaved import drafts persist in `.marginalia/`, which lives inside each vault; Duplicate Merge offers a user-confirmed move to the vault's root-level `Archive` folder; Gap Finder has a Create entry button; Script Importer v1 is one document = one script, with OCR and multi-issue documents later; the Librarian uses Gemma 4 (E2B on mobile, E4B on every computer, 12B and existing-folder models as Settings options); the runtime is a GGUF engine behind an adapter, with MLX possible later; on iOS the E2B model downloads after install, with Files-app import as a fallback; computers get a small download-on-first-wake installer and a full offline installer; existing-folder loading is pick-a-file-or-folder plus auto-detect of common library folders; thinking mode is on for Deep review and Continuity Check only; the context budget scales by device and can be raised in Settings; retrieval is link neighborhoods plus existing search first, embeddings later if cheap; all Tier 1 thresholds in §5 are settled.

**Settled on 2026-10-05:** all entry-type frontmatter fields remain optional; Summary uses `> [!abstract] Summary`; Phase 7 is desktop-only with mobile reserved for Phase 9; whole-vault means the selected vault; Alignment tag-fit and Gap Finder prose scans are explicit optional AI actions; valid standalone scripts remain valid; importer structural markers may change while content wording and source order are preserved; auto-sleep defaults to enabled (10 minutes desktop, future iOS 3 minutes and cancellation on background).

**Implementation decisions settled:** import extraction uses fflate, app-owned Word XML reading and bundled PDF.js (D-0062); the embedded Rust engine uses llama-cpp-2 (D-0063); the explicit first-use download uses ggml-org's E4B Q4_0 artifact, pinned revision/checksum, and native reqwest/sha2 (D-0064). The default file is 4,590,807,392 bytes and its real macOS/Metal 64k-context loading, cited generation, thinking control, cancellation and unloading are verified. Settings supports compatible 12B files, with actual model/device limits checked on wake; a 12B performance benchmark and mobile parity are not claimed. License text and attribution are bundled. Full/small installer production and signing remain Phase 8.

Related contracts: `PRODUCT.md`, `ARCHITECTURE.md`, `CONTENT-MODEL.md`, `ROADMAP.md`, `GLOSSARY.md`; decision history lives in root `DECISIONS.md`.

L3 implementation is recorded in `PHASE7-L3-REVIEW.md`; Duplicate Merge, per-rule Settings and final Phase 7 desktop acceptance are verified in `PHASE7-L4-REVIEW.md`. Release work remains Phase 8 and mobile remains Phase 9.

Model discovery/loading treats bundled Resources as optional in the small installer. Downloaded models and explicitly granted files work without it. Saved models in known model-library locations remain available after restart; unavailable optional locations do not abort discovery.

Importer AI classification receives role definitions, comic-script examples, nearby extracted text/layout cues and the preceding page/panel context. It classifies one unparsed block at a time; parsed or human-reviewed blocks are excluded. Only a unique current-block suggestion with confidence at least 0.9 and matching explicit role cues can apply. Missing/invalid output or uncertain roles keep the deterministic draft unchanged. Model confidence is a screening signal, not proof of correctness; human review and Save remain required.

The importer uses compact persistent controls and a full-width editor. The review/source sidebar, checkmarks, flags and flag counts are hidden. Deterministic classification, review priority, source cues and reviewed checkpoints remain stored for a future surface; AI leftover classification remains optional. Users can inspect and repair any block in the editor. PDF wraps join only with strong layout evidence; larger gaps, short intentional lines, indentation changes and page/structural headings remain boundaries. DOCX font family/size do not alter the app’s fonts; indentation distinguishes dialogue from descriptions.

Recurring document headers/footers are omitted from new imported scripts and their review queues, with an omission notice and original text retained in recoverable extraction data. PDF detection requires matching top/bottom-margin text on at least two distinct physical pages, allowing variable pagination, and protects comic page/panel markers, dialogue, artist notes and body repetitions. Word default/even-page header/footer stories are recurring by definition; first-page stories remain for review. Unique margin text is retained. Excluded blocks preserve their source IDs and payloads with empty converted Markdown; this does not interrupt script/dialogue continuity. Existing edited or saved scripts are not rewritten.

### Background task presentation

All model tasks expose progress and Cancel Librarian task in the lower right sidebar, keeping chat above. On successful completion, replace cancellation with Open Entry Enhancement, Open Entry Expansion, Open Deep Review, Open Script Continuity or the corresponding result label. Do not navigate or enter editing automatically. Explicit Open shows the result; closing it keeps the completed session result available. Cancellation/failure shows the error and does not offer a successful result. Script Import classification uses the same status surface while its draft remains generated recovery data until human Save.
