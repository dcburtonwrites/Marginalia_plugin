# Marginalia — Architecture

Behavior is defined in `PRODUCT.md`; the detailed Phase 7 Librarian contract is `LIBRARIAN.md`; vault file conventions are in `CONTENT-MODEL.md`. This document defines how it is built.

**Legend**: items marked **Default** were not locked by the product owner. Treat each as a recommendation to confirm, not a final choice (see §16). When a decision is settled, replace the default in this file with the final answer only (no options, no history). The full write-up goes in `DECISIONS.md`.

## 1. Shape of the system

Marginalia is a **client-only, offline-first application**. There is no server. The vault's markdown files are the database.

```
┌────────────────────────── UI app (React + Vite) ──────────────────────────┐
│ Screens · Editor · Graph · Search UI · Librarian UI · routing · UI state  │
└───────────────▲───────────────────────────────────────────▲───────────────┘
                │ typed queries / commands                  │ events
┌───────────────┴──────────── Domain layer ─────────────────┴───────────────┐
│ Entry types · Projects · Script chains · Page numbering · Graph building   │
└───────────────▲────────────────────────────────────────────────────────────┘
                │
┌───────────────┴──────────── Vault engine (framework-agnostic TS) ─────────┐
│ Parsing · Index · Wikilink resolution · Assets · Refresh · Write-back     │
└───────────────▲────────────────────────────────────────────────────────────┘
                │ VaultAdapter interface (read / list / stat / write? / watch?)
     ┌──────────┴──────────┐
     │ Tauri adapter       │ Browser preview adapter
     │ (desktop, r/w)      │ (preview, read-only)
     └─────────────────────┘
```

**Hard boundary**: the vault engine knows only generic Obsidian concepts (notes, frontmatter, links, backlinks, tags, embeds, callouts, assets, canvas/base files). It has **no knowledge** of Character, Project, Script, Canon, or any app vocabulary, and it imports nothing from the UI or domain layer. All Marginalia-specific meaning lives in the domain layer. This keeps the engine independently testable and reusable by another app later.

## 2. Targets

| Target                | Wrapper                                          | Adapter                               | Capabilities                                                                            |
| --------------------- | ------------------------------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------- |
| Desktop (macOS first) | Tauri 2                                          | Tauri adapter                         | read, write, system print/PDF, optional watch, local AI                                 |
| Browser / mobile web  | Static responsive web, intended here.now hosting | Read-only local-folder / demo adapter | read-only; no native inference                                                          |
| Native iOS (Phase 9)  | Existing Tauri app with generated Xcode target   | Swift bookmark-scoped vault adapter   | writable storage, print bridge and E2B inference implemented; device acceptance pending |

Phase 9 is in progress. Responsive read-only mobile web is published at https://ivory-muse-b2mx.here.now/ (D-0125); the initial anonymous release requires owner claim for permanent hosting. The native iOS wrapper is the existing Tauri app with an Xcode target (D-0120); its iOS-only Swift vault plugin and writable adapter are implemented under D-0126/D-0127, with native provider/editor acceptance still pending. Browser adapters remain read-only and do not expose disposable in-memory editing. The desktop and browser also offer a bundled read-only GreekDemo through the existing preview adapter, supplied with a separate generated content dataset from `demo/GreekDemo`. The deployment factory restores its opaque `demo:GreekDemo` location without filesystem permission or downloads. Parent-folder rescans retain the registered demo independently of discovered local folders. Its registration is hidden from world cards/switcher menus; Enter Demo Vault is the entry action. Discovery excludes the demo dataset unless its world is active, so demo content does not blend into real-world search. Canonical regression fixtures remain separate.

One UI codebase builds both ways. Features are gated by **adapter capability flags** (`canWrite`, `canWatch`, `canPrint`, `hasLocalAI`) rather than by platform checks, so absent features (edit mode, script editor) are not rendered.

## 3. Frontend

- **Language / framework**: TypeScript (strict), React, Vite. Framework: React.
- **State**: Zustand for UI state; the vault index is not UI state and is read through engine queries wrapped in subscriptions.
- **Routing**: Hash-based router (works inside Tauri and on any static host with no server rewrites). Route encodes vault id, note path, and mode (`view` | `edit`), plus top-level section.
- **Math rendering**: KaTeX, including bundled CSS and fonts.
- **Styling**: CSS variables for all design tokens (`PRODUCT.md` §10), light and dark themes via a root attribute. No CDN assets; fonts and icons are bundled.
- **Rich-text / structured editor**: TipTap (ProseMirror), with original-source patches for unchanged Markdown regions. Requirements matter more than the library: callouts, wikilinks (with autocomplete), embeds, sections as draggable blocks, and a **lossless markdown round trip** (§6.4).
- **Graph**: `d3-force` for layout; render with SVG or canvas as performance requires. Dragging nodes sets a temporary fixed position in the simulation; positions are never persisted.
- **Drag and drop**: one shared reorder primitive (grip handle, dashed drop outline in the edit accent) reused for sections, frontmatter pill lists, script pages/blocks, and the Script Studio list.
- **Search**: MiniSearch (in-memory full-text index) built at load, plus structured filtering over frontmatter properties.
- **Print / PDF**: Dedicated offline print layouts and stylesheets for entries and scripts, using bundled fonts and `@page` rules. Export PDF opens the macOS system print dialog with Save as PDF; no separate PDF rendering library. The native adapter invokes Tauri’s existing webview print API; no new dependency is required. Controls are removed from a print-only copy without changing the vault. Page sections are available for print, while script panel fold state is retained. Group exports reuse the same print pipeline.

## 4. Backend

**None.** There is no server process, no cloud function, and no network API.

Desktop-native code (Rust, Tauri commands) is limited to: filesystem access scoped to user-chosen vault folders, optional file watching, app-data persistence, managing the embedded local inference engine (§9), scoped generated-file storage, user-confirmed Archive moves and opening validated HTTP/HTTPS/mailto links through the operating system. Import extraction bindings, if needed, must be confirmed before adding them. Keep Rust thin; all logic stays in TypeScript.

## 5. Database, persistence, and authentication

**Database**: none. Three kinds of data exist.

1. **Vault data**: markdown/asset files owned by the user. Read at load into an **in-memory index**; written back only by explicit user save actions (§6.4) and by Script Studio reorder (which writes `Preceded By` and clears legacy successor values only for Groups whose order changed in the explicit project reorder save).
2. **App state** (small, non-vault): known vaults (id, display name, location), theme, sidebar width and collapsed state, recently used items per vault, Home reference pins per vault, selected AI model path, context budget and idle-sleep preference. Desktop: Tauri store plugin in app-data, with the persisted-scope plugin restoring previously granted folder authorization. Web: IndexedDB. **Not persisted**: graph node positions, navigation history stack, search state, per-vault session chat transcripts.

3. **Generated Librarian data**: per-vault `.marginalia/` expansions, cached reports, dismissals, import drafts and retrieval caches. These are not canonical notes and are excluded from normal indexing and watcher input. Enhancement suggestion notes and chat transcript are session-only. See `LIBRARIAN.md` §8 for paths and lifetimes.

**Authentication**: none. No accounts, sessions, or tokens. Security boundary on desktop is the Tauri filesystem **scope allowlist**: the app may only touch folders the user explicitly picked.

## 6. Vault engine

### 6.1 Adapter contract

```ts
interface TextStore {
  read(key: string): Promise<string | null>;
  write(key: string, content: string, expected: string | null): Promise<void>;
}
interface VaultAdapter {
  readonly privateData?: TextStore; // private sidecar data, outside the note index
  capabilities: { canWrite: boolean; canWatch: boolean };
  list(dir: string): Promise<EntryInfo[]>; // files + folders, with mtime/size
  read(path: string): Promise<string>; // text
  readBinary(path: string): Promise<Uint8Array>; // assets, lazy
  stat(path: string): Promise<{ mtime: number; size: number }>;
  readConfig?(): Promise<string | null>; // standard .obsidian/app.json only
  write?(
    path: string,
    content: string,
    expected: string | null,
    assets?: readonly StagedAsset[],
  ): Promise<void>;
  createAsset?(path: string, bytes: Uint8Array): Promise<void>; // create only
  delete?(path: string, expected: string): Promise<void>; // only if canWrite
  watch?(cb: (changes: PathChange[]) => void): Unsubscribe; // best-effort only
}
```

Desktop `privateData` is implemented through separate restricted native commands for `.marginalia/` keys; generated writes use expected-content checks and atomic replacement without indexing the result. The Librarian storage wrapper receives only this narrow port, never the note writer.

Obtaining an adapter (folder picker, folder upload) is each adapter's own concern. Only the resulting adapter shape is standardized. The engine never touches the filesystem directly.

### 6.2 Load, index, query

- Hybrid model: async `load()` once per vault parses **everything eagerly** (frontmatter, links, tags, headings, callouts, embeds) into an in-memory index. After that, **queries are synchronous**.
- `refresh()` re-stats files and re-parses only those whose mtime/size changed, then emits change events. It is the primary "update from disk" mechanism (the top-bar Refresh button). Watching is an optional bonus where the adapter supports it.
- A **VaultRegistry** holds multiple loaded vaults; notes are addressed by `(vaultId, path)`. Cross-vault operations (search) iterate the registry.
- Index provides: note lookup, frontmatter, outgoing links, **backlinks**, tags (including nested `a/b`), headings, assets, and "all notes where property = value".

### 6.3 Parsing

Two layers, always applied together:

1. **CommonMark + GFM**: tables, task lists, footnotes, strikethrough, math.
2. **Obsidian extensions**: wikilinks (`[[x]]`, `[[x|alias]]`, `[[x#heading]]`, `[[x#^block]]`), embeds (`![[x]]`, with `|width`), callouts (type, title, fold marker), inline tags, block IDs, `==highlight==`, `%%comments%%`.

Parsing is **non-destructive**: the parsed model retains source ranges so unedited regions can be re-emitted verbatim. Unknown syntax degrades to plain text, never dropped.

- **Wikilink resolution**: match by extension-aware basename or path; a single exact match wins; ambiguous matches prefer same folder, then alphabetical order; the result exposes `ambiguousMatches` so the UI can show other candidates. A link resolving to an **empty note** is flagged `stub`; no match is `broken`. Embeds resolve to any vault entry kind, not only notes.
- **Assets**: any non-markdown, non-canvas, non-base file is a generic `AssetFile`. Metadata is indexed at load; bytes are fetched lazily via `readBinary` (important for mobile memory).
- **Canvas / Base**: recognized, indexed, raw content available; **not** structurally parsed in v1.

### 6.4 Write-back and conflicts (desktop)

Native text reads decode UTF-8 bytes with BOM retention. Hidden vault files stay excluded from indexing; the scoped read-only configuration command reads only `.obsidian/app.json`. macOS deletion first uses the approved trash library’s NSFileManager backend. On failure, recheck the original expected content and retry through the same library’s Finder backend; the bundle declares its Automation usage purpose. Both paths move to recoverable Trash; failures never fall back to permanent deletion.

- Image imports are staged until Save. The native command creates assets without overwrites and commits the expected-content note write; a failed note save removes only unchanged assets newly created by that operation.
- Read-only domain link-display helpers derive entry titles and the shortest distinguishing context from the current index. WikiInput keeps canonical controlled values separate from focus-dependent display values; field pills edit those same draft values. TipTap inline node views reveal retained raw syntax on selection/focus without changing node attributes or document state. Autocomplete continues inserting canonical paths. No display label is written back as a target.
- The shared NoteEditor renders the entry/script Properties disclosure and consolidated title input. Expansion is presentation-only, remembered in a WeakMap keyed by VaultIndex and entry path for the current session; it is never persisted to Markdown or app preferences. Collapsed controls use native hidden semantics and aria-expanded/aria-controls on the toggle. The existing field and body editing/serialization paths remain authoritative.
- Rich-text toolbar visibility follows focus within its existing editor wrapper. Hidden controls are removed from sequential focus; shared keyboard handling exposes enabled controls on Shift+Tab from the text body, including WebKit's native-button Tab behavior. Toolbar activation is presentation-only and never changes the document.
- Current-entry Outline/Backlinks/Outgoing links reuse the sidebar and existing parsed index. Read-only domain helpers collect individual wikilink and Markdown-link occurrences with source context; no new engine vocabulary, dependency or storage is introduced. The shared NoteEditor publishes its composed unsaved source to an App-memory preview for the inspector, including ScriptEditor's existing NoteEditor wrapper. The canonical index is untouched until Save. Outline maps headings to rendered source positions or the current structured-editor order and scrolls/focuses within the existing main pane, preserving dirty drafts. Reference-note tabs remain separately mounted across inspector-view changes.
- Edits operate on the parsed note model: frontmatter as an ordered YAML document (preserve key order, quoting, and comments where the YAML library allows), body as ordered blocks/sections. **A note that was opened and saved without edits must produce a byte-identical file.** Enforce with round-trip tests over every fixture note.
- On Save, compare the file's current mtime/content hash with the snapshot taken at load/last save. If unchanged → write. If changed → **three-way merge** with base = snapshot, mine = editor state, theirs = disk. Non-overlapping changes merge automatically; same-line conflicts go to the diff UI for a per-conflict side choice. Never overwrite silently. The diff UI is triggered **only** by a conflicting save.
- Desktop writes use thin Rust filesystem commands: recheck expected content, write a temporary sibling file, then atomically replace the target. Deletion moves the file to macOS Trash. Parsing, editing and three-way merge remain TypeScript.
- Script Studio chain saves use a generic expected-content batch write: preflight all files, commit each atomic replacement, and restore completed files if a later write fails. Never overwrite an external change during rollback.
- After a successful write, update the index for that note, staged assets and their folders immediately.
- The Librarian has **no canonical-note write path**. Restricted generated storage may write only under `.marginalia/`. Proposed fixes are data applied by a human action to the unsaved editor; only the existing Save flow commits them. Duplicate Merge invokes a separate user-confirmed Archive move through the native adapter, never an AI command. The engine/adapter primitives stay generic; app-specific storage and archive policy belongs above them.

## 7. Domain layer (app vocabulary)

Pure functions over engine queries; no UI imports.

- **Vault structure mapping**: top-level folders → Brainstorms / Canon / Projects (`CONTENT-MODEL.md` §1).
- **Entry typing**: note → entry type (Character, Location, …) and project-scoped vs canon.
- **Brainstorm grouping**: All Entries, actual immediate folder tabs (including descendant notes and empty folders), and root-only Uncategorized. Selection uses the existing route `tab` value.
- **Project model**: overview note, tabs derived from actual subfolders, project-specific entries. Canon optionally blends project reference notes from the existing immutable index using domain type-tag/folder classification, with explicit exclusion of non-reference project areas and role markers. The per-world boolean preference lives in app state and defaults off; cards retain project names and exact note paths. No additional filesystem scan, note metadata or vault-engine app vocabulary is introduced.
- **Script chain**: build independent sequences within each `Group` (absent = top-level) from unreferenced roots. Standalone scripts are valid. Missing successors and conflicting sources go to Needs attention and are excluded from confirmed chains; cycles use connected cards in alphabetical fallback order with a warning, and each affected script also appears in Needs attention with a Cycle label. Propagate exclusion backward through all scripts that lead into excluded targets, flagging them as orphans in Needs attention without confirmed global numbering. Number each valid sequence from 1.
- **Page numbering**: global page = sum of preceding scripts' declared `Pages` + local position, double spread counts 2.
- **Graph builder**: nodes/edges per vault from wikilinks; node type from entry type; flags for project-local and unresolved.
- Keep domain mapping configurable in structure (a single mapping module), so deferred features such as a configurable heading→container mapping or per-vault types can be added without engine changes.

Per-page script sides are stored as explicit `Side: Left`, `Side: Right`, or `Side: Double Spread` lines immediately after page headings. Existing script-level `Side` supplies a first-page fallback with subsequent sides alternating; newly added pages receive a default from their predecessor and save explicitly.

## 8. API structure

There is no hosted application API. Optional Local Ollama inference uses a fixed loopback HTTP API from Rust; the WebView never accesses it directly. The internal API surface is:

- **Engine → domain**: typed synchronous queries (`getNote`, `getBacklinks`, `findByProperty`, `resolveLink`, `listAssets`, …) plus async `load`, `refresh`, `write`, and a change-event emitter.
- **Domain → UI**: typed selector functions and React hooks that subscribe to engine change events.
- **UI → Desktop native**: Tauri `invoke` commands only through the Tauri adapter and the app-data store, never directly from components.
- **Librarian**: task/chat interface with cancellation, progress and cited findings, scoped to the selected vault and current page. A separate inference adapter exposes load, unload and generate with context/thinking and optional app-owned system-message options; retrieval and restricted generated-storage interfaces hide implementation details. No canonical write adapter is supplied to inference or rule functions.

## 9. Librarian (local checks and AI)

`LIBRARIAN.md` governs full behavior, rule catalog, lifecycle and result surfaces. Phase 7 is desktop-only.

- **Tier 1:** pure deterministic domain functions over the existing parsed vault index; no I/O or model calls. A registry holds ID, scope, severity and message template. Item/vault checks share implementations; Refresh re-evaluates affected notes and neighbors. App vocabulary remains outside the vault engine.
- **Findings:** the shared rule/Librarian finding model carries target anchors, evidence, structured proposed fixes and stable dismissal keys. Tier 2 review findings require note-path/excerpt citations or are dropped. Entry-writing proposals explicitly distinguish consulted original passages from verified claim citations. Rules carry rule IDs and certainty labels.
- **Runtime:** embedded llama.cpp through the pinned `llama-cpp-2` 0.1.158 Rust binding behind an inference adapter exposing explicit load/unload and cancellable generation, context-size and thinking options. The macOS and iOS builds enable Metal; native operations are serialized, load callbacks can cancel, and generation checks cancellation between bounded prompt batches and decoded tokens. Contexts are dropped after tasks and model weights are released on sleep. CMake and the native C/C++ toolchain are build prerequisites. Optional Local Ollama routes installed server model IDs through the same adapter. Rust uses fixed loopback HTTP, disables proxies/redirects, rejects advertised cloud models, bounds streamed NDJSON and aborts the request on cancellation. Model discovery is explicit; no startup server call or automatic pull occurs. Wake validates completion/context metadata and confirms actual allocated context; sleep unloads only the app-selected model. The server controls memory allocation/eviction and may be shared with other applications. A bundled native MLX runtime remains deferred.
- **Models:** Gemma 4 E4B Q4_0 is the desktop default, larger installed models through Local Ollama. Built-in UI offers only default E4B download/selection; existing native GGUF loading remains compatible with saved paths. User-selected GGUF files/folders and compatible models detected in LM Studio, Ollama and Hugging Face library folders are supported through bounded local metadata scans. Model weights live outside vaults in app-data `models/`, or the offline installer's resource `models/` folder. Desktop context defaults to 65,536 tokens; Settings offers bounded values through 262,144, subject to the selected model's declared context limit and native memory fitting/allocation checks. E4B's verified limit is 131,072. Thinking is enabled only for Deep review and Continuity Check, including its earlier-script summary passes.
- **Lifecycle:** no startup model load or Librarian retrieval-index construction. A Tier 2 action queues while waking, then executes automatically. Manual sleep requires cancellation of active work. Enabled auto-sleep unloads after 10 idle minutes, preserving session transcript. Ordinary vault parsing and the existing full-text index still load normally; lazy construction applies to Librarian-specific retrieval work.
- **Retrieval:** selected-vault link neighborhoods, backlinks, frontmatter references and the existing MiniSearch implementation; context assembly includes current-page context within budget. The search snapshot and per-note source fingerprints persist lazily in `.marginalia/index/retrieval.json`; unchanged snapshots restore on wake, and in-session changes update only changed/deleted search documents. Expected-content checks preserve externally changed caches. Chat requests structured statements with source IDs and exact excerpts; unsupported or uncited statements are dropped before rendering. Supporting canon stays in the selected vault even for project-targeted tasks. Retrieval is behind an interface; embeddings are deferred. Generated artifacts and Archive notes are excluded as sources.
- **Tasks:** Enhancement, Expansion, page/script/project Continuity Check, explicit optional tag-fit/prose gap scans, clustered progressive Deep review and importer role classification use the same on-demand local runtime and cancellation/progress surface. Source units are page-aware and budgeted by escaped UTF-8 size; oversized neighborhoods use focused passes at the default 64k context. Continuity includes cited summaries of earlier scripts, retaining original quotations and falling back to original source text when a summary is unsupported. Deep review verifies only prefiltered duplicate pairs and streams completed clusters. Expansion and private report caches retain source paths, modified times and content fingerprints; changed/deleted sources invalidate affected work. Expected-content writes preserve external changes, cancellation preserves completed artifacts, and source changes during generation reject the result. Enhancement suggestions remain session-only; Insert changes the current unsaved editor buffer. Gap Summaries prefill human-reviewed new-entry drafts only when the model is already awake.
- **Rule settings:** Settings groups every deterministic rule by Links, Frontmatter, Scripts, Vault review and Gap Finder. All start enabled; disabled IDs are remembered per vault in the existing app-state store. Changes apply immediately to Alignment, vault/project review and Gap Finder without inference. Catalog version 2 drops the former unlinked-mention LNK-004 preference and maps the former ambiguous-target LNK-005 preference to LNK-004 on load; legacy ambiguity dismissal keys remain recognized. Rule thresholds remain internal, and FM-001 remains inactive while the content model declares no required properties.
- **Duplicate Merge:** duplicate findings open two entries for human reconciliation using the existing editor, conflict handling and Save. Only after Save is a separate Archive confirmation offered. The generic native move rechecks expected source bytes and creates the destination exclusively, refusing collisions and symbolic paths. App-created vault indexes exclude root `Archive` through a generic engine option, so archived notes leave resolution, search and graph even after Refresh. User-confirmed archive records in `.marginalia/reports/archive-repairs.json` supply kept-entry link repair proposals to LNK-001; fragments and display aliases are preserved. Repairs still require Insert and human Save. Private record failures preserve the successful move, surface a warning and offer explicit retry.
- **Storage and writes:** generated-data access is restricted to `.marginalia/`, ignored by normal scan/search/graph/retrieval/watcher input. Canon writes require the existing human editor Save. Archive is a separately confirmed generic native move, with app-domain policy and subsequent human-saved link repairs. Runtime/rules receive no canon writer.
- **Importer:** local `.docx` and text-layer PDF extraction, rules first and AI structural classification only for leftovers. Preserve content wording and source order while allowing structural-marker conversion. Validate content payloads independently, using verbatim in-place fallback. Extraction uses fflate for the Word ZIP container, an app-owned XML reader for text/styles/alignment, and bundled PDF.js with its local worker for PDF text/layout. No document is uploaded or rendered through remote services. Derived status/tags use the selected vault’s Script template defaults, always including a script-type tag; absent defaults leave status empty and use only the script tag. Recoverable drafts retain source text/cues, review state and edits inside `.marginalia/imports/drafts.json`; the original Word/PDF files are not retained. The collection is written atomically with expected-content checks. Save/Discard removes the corresponding record.
- **Mobile:** Native iOS reuses the pinned embedded engine with the E2B Q4_0 artifact, 32k initial context and enabled three-minute idle auto-sleep. Native background notifications cancel operations and release weights without depending on webview execution; the shared runtime also cancels and drains work before sleep, blocks wake/unload races and preserves transcripts. Returning does not wake a model. Physical-device performance and feature acceptance remain pending.
- **Offline:** no cloud inference. After a model is on device, every Librarian operation is local; only a user-initiated model download uses the network.

## 10. External services

**None required.** The only optional network use is a one-time user-initiated model download. Fonts, icons, and all libraries are bundled so the app is fully offline.

## 11. Deployment

- **Phase 0–4 review**: the Tauri desktop app is the primary build. A local Safari preview uses the same UI with a read-only fixture adapter. All mobile ingestion and delivery work is deferred to Phase 9.

- **Desktop**: `tauri build` producing a signed-for-personal-use macOS app. The initial release targets Apple silicon Macs for the owner and a few macOS testers. Local candidates use ad hoc signing; Developer ID notarization and transferred clean-machine acceptance are not yet verified. Distribution and updates are manual (user installs the build); no updater is included.
- **Desktop model delivery:** the small installer offers an explicit first-use download and resumes the queued request after installation; no startup download. The native reqwest/sha2 downloader pins ggml-org's E4B Q4_0 revision and SHA-256, streams to a private partial file, verifies size/digest, then installs without overwriting an existing model. Failures/cancellation remove that attempt's partial file. Interrupted downloads restart rather than resume byte ranges. The full offline installer supplies E4B in resource `models/`; final installer construction/signing remains Phase 8. Model/runtime license texts and attribution ship locally under `public/legal/`.
- **Browser:** responsive read-only review is supported; here.now is the intended static host. Publication and hosted-device verification are pending. The initial deployment continues to use read-only adapters; it is not a cloud vault or synchronization service.
- **Mobile:** Phase 9 uses a shared Rust library entry point and a Tauri-generated iOS/Xcode target. Desktop filesystem commands, Trash integration and Ollama remain desktop-only. iOS registers the shared inference commands and separate Swift vault plugin for bookmark-scoped writable folders, model Files import, external links, lifecycle notifications and a native print sheet. E2B downloads after install with Files-app import fallback. Device acceptance and distribution remain pending.

## 12. Dependencies (expected)

Runtime: `react`, `react-dom`, a router, `zustand`, `unified`/`remark` with GFM and math support plus a custom Obsidian-extension layer, a YAML library with document-level round-trip support (`yaml`), `minisearch`, `d3-force`, TipTap/ProseMirror, a vendored icon set, bundled fonts. Native: Tauri 2 and its fs/dialog/store/persisted-scope plugins, `llama-cpp-2` 0.1.158, reqwest and sha2. Importer extraction uses fflate and pdfjs-dist; PDF.js workers and support resources ship locally.
Dev/test: `vitest`, Playwright (**including a WebKit project**, since Safari is a target), TypeScript strict, ESLint, Prettier.
Prefer few dependencies; justify any heavy addition.

## 13. Repository layout

```
/                      pnpm workspace; DECISIONS.md at root
  packages/
    vault-engine/      framework-agnostic TypeScript; no UI/domain imports
    adapter-tauri/     TS side of the Tauri adapter
    adapter-web/       read-only browser/preview adapter
  apps/
    marginalia/        React + Vite app (domain layer lives in src/domain)
      src-tauri/       Rust shell
  fixtures/
    GreekDemo/         test vault (see CONTENT-MODEL.md §8)
    ...
  docs/
    PRODUCT.md  ARCHITECTURE.md  CONTENT-MODEL.md  ROADMAP.md
    LIBRARIAN.md  GLOSSARY.md
    mockup/            high-fidelity mockup
```

## 14. Testing

- **Engine**: fixture-driven tests against real vault folders (clean, ambiguous links, broken links, stub notes, canvas/base, asset embeds, two-vault set) plus focused unit tests for wikilink resolution edge cases.
- **Round trip**: every fixture note opened → saved unedited must be byte-identical.
- **Domain**: script chain (clean chain, orphan, cycle, duplicate successor, dangling target), page numbering including double spreads.
- **UI**: Playwright flows for entry import, navigation, search, edit/save, conflict diff. Run on Chromium and **WebKit**.
- Fixtures are the contract. Add a fixture before fixing a bug it exposes.

## 15. Performance and robustness

- Tier 1 catalog runs share per-snapshot name/peer summaries and mention prefilters. UI reviews run in cooperative batches with cancellation and atomic cache publication; the synchronous engine API remains available for tests. Canceled, superseded or index-invalidated runs never publish partial caches.
- Eager parse at load, lazy asset bytes, index kept in memory. Filename/alias resolution and reverse-link indexes are built lazily in memory and invalidated by indexed file changes and successful scans. Target: vaults of several thousand notes load and become interactive in seconds; queries stay synchronous and fast.
- Long scans yield to browser tasks after roughly 12 ms of processing while keeping the next index private until completion. Never block the UI thread on a full-vault parse; use a worker for load/parse if further measurements require one.
- Malformed frontmatter or unparseable notes surface as a per-note warning and still render as plain text; they never abort a vault load.

## 16. Open decisions

Each item below is a question for the product owner, asked when its phase is reached, with your recommendation (the default shown is a starting point; base your recommendation on what exists by then). Do not build anything that depends on an item until it is answered; keep working on unblocked items.

When the owner answers:

1. Add the full write-up to `DECISIONS.md`.
2. Update this file **in place** with the final decision only: replace the default and remove the row from this table. Keep it as a plain statement of how the app is built, with no alternatives or rationale.

| Decision                                    | Default                                     | When    |
| ------------------------------------------- | ------------------------------------------- | ------- |
| Native iOS wrapper/adapter and distribution | Full functionality target; details deferred | Phase 9 |

The other **Default** items elsewhere in this file (UI framework, state library, router, search library, repository layout, retrieval approach) follow the same process: confirm with the owner before building on them, then record the final choice here and in `DECISIONS.md`.

### Script repair boundaries

PDF.js retains page coordinates and relative indentation. Deterministic script conversion recognizes explicit comic-page headings independently of physical PDF sheet boundaries, keeps heading suffix payloads, and groups descriptions/dialogue using structure and indentation. Repeating running headers remain notes in source order. Human type repairs use the existing importer draft storage and rich-text/script draft model; they do not invoke AI or write canonical notes until Save. Legacy binary `.doc` remains unsupported; save as `.docx` before import. No new extraction dependency is added.

Native model authorization uses available app-owned directories, explicitly granted paths and approved auto-discovery libraries. Missing optional bundle resources do not prevent discovery or loading; no arbitrary filesystem root is authorized as a fallback.

Page find uses visible DOM text ranges and noninteractive highlight overlays; it never wraps/mutates note or editor content. Session route history, scroll positions and report filters stay in UI memory. New project child folders use the existing scoped note-save path; creation remains staged until the human saves, with no new folder-writing API. Recoverable import metadata records only reviewed status per source ID.

The import sidebar projects only unchecked non-parsed source blocks; extraction and draft content remain intact. Source navigation centers matching editor content. Enhancement uses a React portal into the existing lower sidebar, retaining the current editor’s Insert callback and unsaved-buffer boundary. Gap creation uses the shared NewEntry template workflow, filling only the Summary when supplied. Sidebar width is constrained by the available viewport and middle-pane minimum rather than a fixed maximum; the height split supports pointer/keyboard interaction and stays in session memory. No new dependency or storage format is introduced.

DOCX extraction ignores font family/size and uses paragraph alignment and inherited indentation only as structural cues. PDF physical lines join only when tight spacing, matching indentation/height and a filled text measure indicate wrapping, preserving heading and paragraph boundaries and words. Current deterministic recognition filters outdated ordinary-prose flags from resumed reviews without rewriting their saved edits.

Recurring document headers/footers are omitted from new imported scripts and their review queues, with an omission notice and original text retained in recoverable extraction data. PDF detection requires matching top/bottom-margin text on at least two distinct physical pages, allowing variable pagination, and protects comic page/panel markers, dialogue, artist notes and body repetitions. Word default/even-page header/footer stories are recurring by definition; first-page stories remain for review. Unique margin text is retained. Excluded blocks preserve their source IDs and payloads with empty converted Markdown; this does not interrupt script/dialogue continuity. Existing edited or saved scripts are not rewritten.

The main desktop window has explicit `core:window:allow-close` and `core:window:allow-destroy` permissions. Tauri’s registered close-request listener uses destroy when no unsaved edits block closing, and the existing Save/Discard flow retries close after a human decision. These permissions do not grant filesystem writes.

Chat/review prompts use bundled app-owned `docs/LIBRARIAN-SOUL.md`; entry writing uses the accepted `LIBRARIAN-CHARACTER-WRITER.md` / `LIBRARIAN-CANON-WRITER.md` and `LIBRARIAN-CANON-PROFILES.json`. Vault files cannot override these briefs. Subject-aware retrieval and cited synthesis live in the app domain and receive only read queries. Review claim inventories retain exact source provenance; factual chat and review findings must cite original excerpts. Enhancement and Expansion use bounded original-passage Markdown writing with canon-type/subtype guidance and a consulted-source inventory; they do not pass generated claims back as evidence. Context omissions are disclosed and malformed output preserves previous artifacts. Legacy cited expansions remain readable; Deep Review compares claims across batches and verifies original passages. Prompt/pipeline versions participate in cache validity. Proposed chat drafts are session-only and have no canon writer.

Native generation reserves up to 3,072 output tokens for non-thinking tasks and 4,096 for thinking tasks, capped at half the selected context. Chat reserves framing/output space before retrieval; section synthesis uses bounded batches.

Citation validation rejects a whole factual paragraph if any declared citation is invalid. Chat permits one bounded correction attempt for malformed output or invalid quotations, with additional reserved context; unsupported paragraphs remain suppressed. Explicit proposals and clarification questions can be uncited and are visibly distinguished.

Frontmatter reorder/removal uses the vault engine’s YAML source ranges; retained properties, fences and bodies stay intact, with validity checks before Save. Title save uses the existing expected-content move/write adapter APIs in the same folder. Destination collisions and invalid titles block the operation; failed writes roll the move back. Merge resolution uses the resolved title and follows the same path. No native dependency is added and no automatic backlink migration is performed. Callout titles use the normal inline Markdown/wiki renderer; fragment navigation waits for the target to render. Focus/input/selection tracking scrolls the editor’s own scroll surface with sticky-header/footer clearance.

Title rename/reference updates remain app-level orchestration of generic engine move, expected-content batch write and note Save. Compute source-range patches before moving, update referring notes with expected-byte checks, then save the renamed note and staged assets. If Save fails, restore the reference batch and original filename with expected-byte checks; report incomplete recovery rather than overwriting concurrent changes. This is a recoverable multi-step operation, not a cross-file filesystem transaction. Local app-state preferences default to reference updates and global-primary page display.

Model task progress/completion is held by the vault-scoped Librarian provider, rendered in the lower sidebar. Completion stores a result-opening action and never triggers it automatically. Enhancement and Continuity visibility are explicit session state, independent of task completion; navigation within the vault retains generated results. Editor bands and Group export options are presentation-only. Group export reuses the existing cloned DOM print adapter with file-boundary print CSS.

Entry image/gallery presentation uses the existing parsed note and lazy asset reader. A derived render tree removes direct embeds of the header image from that entry's viewer body without mutating the parsed tree or source. The clickable header and gallery thumbnails open the shared modal image viewer; object URLs retain the existing asset lifecycle. The gallery reuses modal focus containment/restoration and keeps non-image files as links. The print-only clone converts the clickable image wrapper to a noninteractive container, preserving the thumbnail while excluding gallery controls. Librarian task status uses the same spacing tokens as sidebar entry search, with flexible right-aligned action groups; task/inference state and cancellation semantics are unchanged.

Image location preferences are a per-world app-state record. The default import policy reads the adapter's existing Obsidian attachmentFolderPath configuration; explicit root/note-folder/world-folder choices override it only within Marginalia. Default lookup filters all indexed assets by supported image extension, independently of top-level section mapping, with optional folder-descendant and case-insensitive filename/path query filters. It reads no image bytes to enumerate choices. Relative folder validation excludes escape paths and non-browsable internal/archive/template areas. Changes do not move files, create folders or rewrite Obsidian settings. Existing staged-asset Save/Cancel and collision handling remain the write boundary. The app's guarded Refresh supplies updated inventory; there is no unguarded editor-side note rescan.

### Phase 9 shared mobile interface

`useMobileLayout` subscribes to a 600px media query. Layout selection does not grant capabilities or persist a second set of sidebar preferences. Mobile navigation reuses existing hash routes, and folder routes use the existing project `tab` field with a `folder:` relative-path prefix. Folder browsing reads the existing index only. Desktop ProjectView maps a mobile folder route back to its top-level section on resize.

The existing Sidebar stays mounted across layout changes and switches to a full-screen mobile dialog with Chat/Tools tabs. The shared chat owns its draft and uses the existing per-world ChatSession; no second chat runtime or storage is introduced. Underlying header, reading pane and bottom navigation are inert while it is open. Closing restores trigger focus without scrolling; cited entries open in the main pane on mobile. Browser write guards remain in App/editor/adapter boundaries. No native write or inference capability is assumed by the iOS shell before its adapter/runtime is ready.

Vite exposes only the specific Tauri target value needed at the deployment boundary, and uses `TAURI_DEV_HOST` for physical-device development. The iOS-specific Tauri configuration removes desktop window sizing/chrome and selects mobile-only capabilities. Desktop code moves from main.rs to lib.rs without changing its registered commands; main.rs delegates to the shared library. iOS initialization excludes desktop filesystem/Ollama commands and registers the shared embedded inference engine plus the app-local Swift plugin.

### Read-only browser folder selection

Browser Choose parent folder / Reselect parent folder opens a native browser directory-selection input (`webkitdirectory`). A `BrowserFolderAdapter` keeps the selected File objects in this tab, derives immediate folders from their relative paths and reads text/binary contents lazily. It never uploads selected files, writes vault files, persists file contents or exposes desktop AI. Hidden content is excluded except the explicit Obsidian attachment configuration read. Empty directories cannot be recovered from a flat file selection; folders containing selected files retain their hierarchy.

A selection receives an opaque `browser:` session location. Child adapters are scoped beneath the selected parent. Selecting a different parent replaces the browser worlds through the existing guarded flow; cancellation does not change the selection. Browser Refresh (including Settings → Refresh world) opens the directory picker, stages fresh indexes for registered worlds beneath the same session parent and commits them together without changing world IDs or the current route. The current world must exist in the selected parent; cancellation, a wrong parent or a read failure preserves published indexes. Missing other registered worlds are dropped; newly discovered worlds still use the import flow. Full page reload still requires initial folder selection. Session browser worlds are excluded from the persisted known-world list. The bundled demo remains independently reopenable. Stale automatic fixture registrations are skipped in ordinary browser startup. An explicit `?fixtures=1` opt-in is available only in development for existing regression scenarios; production never substitutes fixtures for selected user folders. Native desktop authorization remains independent; iOS uses the native bookmark adapter described below.

The browser adapter builds one shared directory index per selection; child adapters reuse it instead of rescanning all selected files on each directory listing. The successful directory input remains mounted for the selected File lifetime. Browser reads use FileReader with a 30-second deadline and actionable failure reporting. VaultIndex load/refresh accepts optional progress and AbortSignal inputs; interrupted scans do not publish a partial index. App routes use the History API, with popstate/hashchange listeners, to preserve session-only browser selections during navigation. These measures cannot bypass iCloud provider downloads or guarantee that a physical iPhone grants every requested file.

### Native iOS vault authorization (Phase 9, D-0126/D-0127)

An app-local `tauri-plugin-vault` Swift package owns the Files folder picker, bookmark persistence and provider I/O. `IOSAdapter` implements the existing vault port through `plugin:vault|pick` and `plugin:vault|access`. Webview locations are opaque `ios:<UUID>/<world relative path>` identities, never absolute roots. The native side requires a persisted bookmark for the UUID, resolves it on each operation, balances security-scoped access and refreshes the bookmark while authorized. Reselecting the same resolved parent reuses its identity. Picker cancellation does not replace the current parent. Unknown/revoked bookmarks fail through the normal error flow; syntactically valid locations do not grant native access.

Provider operations run on a serial background queue. Reads coordinate the requested file/directory with `NSFileCoordinator`; multi-file writes coordinate the authorized world directory. Every relative component is validated and symbolic links are rejected. Canon writes are limited to visible Markdown paths. Expected-content checks precede sibling temporary-file replacement; new destinations and assets refuse overwrites. Batch/attachment failures attempt rollback only while committed bytes still match; incomplete recovery retains assets and reports the need to inspect affected files. There is no claim of a filesystem-wide atomic transaction or crash-recovery journal. UTF-8 note bytes retain BOM and line endings.

Generated data has separate restricted read/write operations beneath `.marginalia/`, matching the desktop key categories. Native iOS deletion moves the original entry into `.marginalia/trash/<UUID>/<original relative path>` after rechecking its expected bytes. Recovery is through Files; the app never permanently deletes the entry. Hidden folders, including trash and generated data, stay outside the normal index. This does not change macOS Trash behavior.

Native iOS advertises writes, local AI and native printing; watching remains unavailable. Shared editors, creation and deterministic import review consequently use the existing capability boundary. Simulator compilation and native Foundation safety tests do not establish real iCloud/provider authorization, relaunch/revocation, or phone editor acceptance; those remain required before completing the roadmap milestone. See `PHASE9-NATIVE-VAULT-REVIEW.md`.

### Mobile editor viewport

The shared NoteEditor (including ScriptEditor and importer drafts) mounts `useEditorViewport`. A ResizeObserver measures the action bar and supplies scroll clearance to the enclosing main pane. VisualViewport resize/scroll listeners report keyboard occlusion only at normal zoom, update a mobile layout variable and call the existing editor visibility helper. Effects remove their observers/listeners/layout variables on unmount. This is a layout-only concern; no second draft state or write boundary is introduced. Mobile CSS clears desktop footer offsets, positions actions above navigation/safe-area or the keyboard, and wraps delete confirmation while retaining Save/Cancel together. Verification and native-device limitations are recorded in `PHASE9-MOBILE-EDITING-REVIEW.md`.

### Collection controls

`domain/entry-sort.ts` provides read-only copied-array sorting against displayed note titles, authored frontmatter dates and existing adapter modification times. Date values are resolved once per note per sort, with invalid/missing values last; no filesystem creation metadata, dependency or adapter port is added. App holds session-only sort values keyed by world ID and section; project-folder choices use a world/project/folder key shared by desktop and mobile. The same domain sorter also handles project assets using filenames and existing adapter times; created dates remain authored note properties only. The shared EntrySortControl renders the existing options in collections and project listings. Shared collection headers render responsive sort/create controls; the existing capability guard hides creation on read-only adapters. Both sections invoke the existing NewEntry flow; initial types now include canon types, using existing matching root folders/templates without creating or writing anything on open. See `COLLECTION-CONTROLS-REVIEW.md`.

### Parent checklist and sidebar-link actions

World visibility management reuses App's current parent adapter, or reconstructs it from a retained registered-world location through the existing restore factory. The dev-only fixture parent root is explicitly recognized during restoration; production still has no fixture fallback. Newly selected indexes are staged before registry/visible-world changes, selected existing indexes are reused, and unchecked registrations are removed without invoking file deletion. The existing app-state record gains a backward-compatible parentLocation string, independent of visible registrations. Sanitization excludes browser/demo session locations and control characters. This stores no new authorization: restore still uses the original filesystem scope or native bookmark. Absent or inaccessible retained parents require the existing picker/reselection flow.

SidebarLinkProvider is a world-scoped React context around the existing UI. Wiki renders an out-of-flow hover/focus action for resolved note targets; completed editor nodes delegate pointer hover through their existing raw wikilink attributes and current-note resolution to a fixed portal button. No context-menu event is intercepted. App sends a sequence-tagged resolved path to Sidebar and expands it. Sidebar consumes each request once, reuses its unique path stack, exposes Note mode and limits fragment scrolling to its own viewer. The context is absent on phone layout, which retains normal navigation. All operations are reads/session UI state; no draft rewrite, model cancellation or new write port. Verification: `WORLD-SIDEBAR-SHORTCUTS-REVIEW.md`.

### Native iOS model delivery and lifecycle (Phase 9, D-0133)

The deployment boundary selects an iOS TauriInference port. Its UI offers E2B download or Files import and excludes desktop Ollama discovery. Rust selects platform-specific pinned model metadata: iOS ggml-org E2B Q4_0 revision `b4243c156154b6dca9324415f8c7ccc098b4aed1`, 2,841,481,184 bytes, SHA-256 `8e30dff3ac4c8434c49a7036fa15564bdbb6044e42bf04550bf1a096ad7e6a52`. Downloads use the existing native HTTPS/checksum pipeline. No weights are bundled in iOS installers. Model discovery/loading is restricted to app-private models, without desktop library or vault scope authority. Symbolic model-root/file escapes are rejected.

Rust gives the Swift picker a private staging destination through the plugin handle, with no webview permission for that method. Swift coordinates the selected provider file while holding its security scope, copies it, and closes the scope. Rust checks the exact size/digest and GGUF metadata before atomically publishing the default. Cancel/error removes staging data and preserves the installed model. Interrupted staging files are cleaned on retry; a verified incoming default can repair a damaged private default. The model directory is excluded from iCloud/device backups through native resource values. User vaults never store weights.

The existing app preferences default to 32,768 tokens on iOS and 65,536 elsewhere. `aiContextVersion: 1` migrates the pre-inference iOS shell's unused 65,536 default to 32,768 once, preserving later explicit choices and other valid saved budgets. Runtime memory/context fitting remains authoritative. Idle intervals follow the inference platform, independently of viewport width.

Swift lifecycle notifications call an iOS-only Rust C entry point directly before notifying JavaScript. Rust marks background state, cancels the active operation, waits for backend/model locks to drain and releases weights. New operations are rejected during background/release. JavaScript reconciles native and document visibility events, drains cancellation before unload, and aborts setup downloads/imports to prevent a queued first wake after returning. Desktop idle behavior remains ten minutes. Debug-only, explicitly requested simulator smoke modes test real 32k generation, download/reuse and native background cancellation; they are absent from release builds.

Native print uses the existing print-only article and stylesheet through WKWebView's formatter and UIPrintInteractionController, including an iPad popover anchor. External links delegate only HTTP, HTTPS and nonempty mailto URLs to UIApplication, leaving the current entry intact. Native printing/provider workflows and physical-device accessibility/performance require manual acceptance; see `PHASE9-NATIVE-AI-REVIEW.md`.


### Editor and project refinements (D-0134–D-0136)

The existing TipTap table schema remains authoritative, with no additional editor dependency. Table helpers replace only the selected table in the draft and restore the cell selection. Markdown serialization retains unchanged source, strips cell separator pipes when composing an edited row, escapes literal pipes and treats inline `<br>` as retained hard breaks. A title-only callout change patches the original header, preserving body bytes.

Script transfer/merge helpers live in the app domain; the generic vault engine remains unaware of comic objects. Transfers retain stable block IDs and include a panel's complete band and location override. Cross-page drag shares the existing reorder group; Move to page provides a direct alternative. Merge concatenates page content in reading order and retains the destination identity/side. Confirmations and action menus use the shared focus lifecycle. All edits continue through the existing draft, conflict and explicit Save boundary.

Project folder navigation uses the original 160px left menu on desktop, with New Entry between the project status and Overview. The shared NewEntry popup receives a validated project-scoped initial folder. The mobile folder browser keeps its indexed hierarchy. Scripts actions reuse the existing Librarian tools and Studio route. Entry/script/project content fills the main pane in both view and edit modes, including the rendered Markdown body; a document-layout class applies responsive desktop horizontal padding of 40–80px. For the desktop project layout, the outer left gutter is 10–20px and the larger left gutter is applied inside the content column after the menu divider, with no additional grid gap. Content-width controls and preferences are removed; obsolete saved width values are ignored by app-state sanitization. No new storage authority, network calls or model behavior is introduced.


### Formatting controls and safe inline HTML (D-0144)

The toolbar reuses StarterKit's existing heading, underline, strike and history commands, with no new editor dependency. Headings/Callouts use a shared lightweight submenu with click/hover, Escape/outside dismissal and keyboard focus support. Callouts wrap the current block/selection or update the current callout's subtype.

The app-layer inline HTML helper groups balanced exact `<u>`/`</u>` delimiters into an underline node for rich-text conversion and safe React rendering. Underline marks serialize as `<u>` markup; unchanged blocks still retain their original source. Only exact `<br>`/`<br/>` variants render as line breaks. Arbitrary HTML remains displayed as text; no raw HTML injection or vault-engine vocabulary is introduced.


### Script page-end drop targets (D-0146)

ReorderGrip accepts an optional page-end callback and recognizes dedicated end targets only in the matching reorder group. End targets are separate from block IDs and cannot be serialized as script content. ScriptEditor appends through the existing domain transfer helper for cross-page moves; same-page movement accepts the array-end boundary and normalizes the moved group's separator. Panel-band and override grouping stays authoritative. Page-end areas are hidden without layout space until item dragging activates them; activation precedes hit-testing. Completion/cancellation removes visibility and highlighting. ScriptItemActions replaces the persistent dropdown with a click-open, focus-managed destination popup and an X remove control. Desktop actions reveal on item hover/focus; touch actions remain available. The popup supports same-page end and other-page destinations, outside/Escape dismissal and focus return to the moved item. No dependency, engine or storage change is introduced.


### Editor Find and Replace (D-0148)

PageFind captures Cmd/Ctrl+F before editor key handlers and retains the shared overlay search UI. The app-layer page-search helper finds literal, case-insensitive matches across inline formatting and visible content fields. Replace eligibility requires an active editable NoteEditor draft and unchanged matched text. Protected atomic nodes and auxiliary controls are excluded from replacement. Rich-text replacements use descending-position ProseMirror transactions through existing serialization/history; controlled field replacements dispatch normal input changes, committed individually so callbacks receive fresh draft state. Replace all uses a snapshot and never recursively processes replacement text. Neither search nor replacement writes files; the existing Save/conflict boundary remains authoritative. Convert selection precedes all formatting buttons when present. No dependency, engine, or storage change is introduced.


### Refinement verification and synchronized artifacts (D-0149)

The standalone Blockquote toolbar button is hidden without changing its schema or existing content rendering. Markdown emphasis/strike serialization keeps boundary whitespace outside its delimiters so combined underline and marks parse correctly beside retained Obsidian atoms. Applying world visibility persists the completed registration snapshot before closing the selection view or changing the registry; a failed save leaves the checklist available. Reorder handles take keyboard focus on pointer start, allowing Escape cancellation to reach the active handle. These changes retain the existing adapter, storage and Save boundaries.

## Vault-type interpretation

World/Storyboard and per-vault status-flow preferences extend existing app-state storage; old registrations default to World. Hidden folders retain type preferences by location. Type changes never write vault data. The app configures each loaded index in a domain-owned WeakMap; engine types remain generic. Project discovery and presentation interpret that context; explicit manuscript identity reuses the existing script tooling. No new storage service, dependency or Librarian adaptation is introduced. See `STORYBOARD.md`.


The Storyboard Project Register is a read-only domain projection of existing discovered project Overviews, with normal index link resolution for working documents and per-vault filter values held in App memory for the session. It reuses existing app preferences for status interpretation, routing, SidebarLink and note/project readers. It does not evaluate .base YAML or modify vault files; Stories.base remains an Obsidian view of the same metadata. No dependency or generic engine change is introduced (D-0152).

Reading/writing polish (D-0156) reuses the current index to derive property vocabulary in the domain layer and the existing WikiInput combobox to display it. The script reader measures its sticky header locally and passes a local page number through App to Script Editor; no reading position is written to the vault. External-link editing uses StarterKit's existing link mark and the shared dialog focus lifecycle, without a new dependency or persistence mechanism. Legacy comic-script is a read alias of the canonical manuscript/script identity.
