import {
  Plugin,
  Platform,
  ItemView,
  WorkspaceLeaf,
  MarkdownView,
  MarkdownRenderer,
  Component,
  PluginSettingTab,
  Setting,
  Notice,
  TFile,
  FuzzySuggestModal,
  addIcon,
  type App,
} from "obsidian";
import {
  bodyOffset,
  expansionPath,
  hash,
  permitted,
  safeEntry,
  title,
  type Note,
  type Packet,
  type Suggestion,
  type Expansion,
} from "./core/types.ts";
import {projectResolver} from "./workspace/model.ts";
import {freshness,sameFreshness} from "./core/freshness.ts";
import { retrieve } from "./core/retrieval.ts";
import {librarianProject,librarianType,projectBrief} from "./core/context.ts";
import {cleanAnswer} from "./core/answers.ts";
import {bindOriginalLinks} from "./ui/original-links.ts";
import {
  insertion,
  cleanDraft,
  GroundingFailure,groundingReviewSystem,groundingReviewPrompt,validateGroundingReview,validateEvidenceBoundaries,
  librarianSystem,
  prompt,
} from "./core/writing.ts";
import {
  decode,
  makeExpansion,
  saveExpansion,
  stale,
  inspectExpansion, pluginOwned, recoveryPath, restoreExpansion, type SavedEntry,
  type HiddenPort,
} from "./core/storage.ts";
import {
  generate,
  localEndpoint,
  localModels,
  type OllamaSettings,
} from "./ollama.ts";
import {
  renderSidebar,
  lantern,
  el,
  button,
  type SidebarState,
  type Message,
  type Tab,
} from "./ui/sidebar.ts";
import { readOrders, type ScriptOrders } from "./scripts/model.ts";
import { readWriting } from "./scripts/writing.ts";
import { renderWritingSettings } from "./scripts/settings.ts";
import { registerScripts } from "./scripts/view.ts";
import { WorkspaceFeature, PAGES } from "./workspace/feature.ts";
import {ProjectRegisterModal} from "./workspace/project-register.ts";
import { VaultSetupModal } from "./workspace/setup.ts";
import { defaultEntrySetup } from "./workspace/setup-model.ts";
import { suggest, propertyNames } from "./ui/suggest.ts";
import {
  readWorkspace,
  readHiddenFolders,
  readStatusOrder,
  entryType,
  type ModuleName,
} from "./workspace/model.ts";
import profilesSource from "./prompts/canon-profiles.json";
import characterWriter from "./prompts/character-writer.md";
import canonWriter from "./prompts/canon-writer.md";
import {readTimeline} from "./timeline/model.ts";
import {TimelineFeature,setupTimeline,timelineAvailable} from "./timeline/feature.ts";
import {renderTimelineSettings} from "./timeline/settings.ts";
import {TIMELINE,WorldTimelineView} from "./timeline/view.ts";

const LIBRARIAN = "marginalia-librarian",
  EXPANSION = "marginalia-expansion";
const MOBILE_LIBRARIAN_MESSAGE = "Librarian is available on desktop only. App pages, Script Studio and script editing work on mobile. Connecting to a computer’s local model over your network is not supported by this version.";
const M_ICON =
  '<path d="M8 71V21l17 9 25 37 25-37 17-9v50L67 63M8 71l25-8" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path fill="currentColor" fill-rule="evenodd" d="m50 54 17 21-17 21-17-21ZM47.5 74A3.4 3.4 0 1 1 52.5 74V90h-5Z"/>';
const L_ICON =
  '<g transform="scale(4.16666667)" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
  lantern +
  "</g>";
interface Session {
  messages: Message[];
  suggestions: Suggestion[];
  references: string[];
}
const session = (): Session => ({
  messages: [],
  suggestions: [],
  references: [],
});
const profiles = profilesSource as Record<
  string,
  { guidance: string; headings?: string[]; variants?: Record<string, string[]> }
>;

export default class Marginalia extends Plugin {
  settings: OllamaSettings = {
    endpoint: "http://127.0.0.1:11434",
    model: "",
    context: 32768,
  };
  target: string | null = null;
  lastNotePath: string | null = null;
  pinned = false;
  tab: Tab = "Ask";
  status = "Local · Choose a model";
  error = "";
  progress = "";
  reviewOperation?:{mode:"enhancement"|"expansion";path:string};
  lastProgressUpdate = 0;
  sessions = new Map<string, Session>();
  expansions: SavedEntry[] = [];
  timings = {retrieval:0,generation:0,rendering:0,storage:0};
  operation: AbortController | null = null;
  closing = false;
  headerActions = new Map<MarkdownView, HTMLElement>();
  refreshWritingFocus?: () => void;
  scriptController?: import("./scripts/controller.ts").ScriptController;
  scriptOrders: ScriptOrders = Object.create(null);
  writing = readWriting(undefined);
  workspaceSettings = readWorkspace(undefined);
  scriptsFeature?: ScriptFeature;
  librarianFeature?: Plugin;
  themeFeature?: WorkspaceFeature;
  timelineSettings = readTimeline(undefined);
  timelineFeature?: TimelineFeature;
  private timelineSetupPending = false;
  private saveQueue: Promise<void> = Promise.resolve();
  private librarianTabPromise?: Promise<import("obsidian").WorkspaceLeaf>;
  savePluginData(): Promise<void> {
    this.scriptController?.session.snapshot();
    const write = this.saveQueue
      .catch(() => {})
      .then(() =>
        this.saveData({
          ...this.settings,
          scriptOrders: this.scriptOrders,
          writing: this.writing,
          workspace: this.workspaceSettings,
          timeline: this.timelineSettings,
        }),
      );
    this.saveQueue = write;
    return write;
  }
  async onload() {
    const saved = await this.loadData();
    if (saved && typeof saved === "object") {
      const { scriptOrders, writing, workspace, timeline, ...settings } = saved;
      this.settings = { ...this.settings, ...settings };
      this.scriptOrders = readOrders(scriptOrders);
      this.writing = readWriting(writing);
      this.workspaceSettings = readWorkspace(workspace);
      this.timelineSettings = readTimeline(timeline);
    }
    addIcon("marginalia-lantern", L_ICON);
    addIcon("marginalia-m", M_ICON);
    this.addSettingTab(new MarginaliaSettings(this.app, this));
    this.registerView(TIMELINE,leaf=>new WorldTimelineView(leaf,this));
    if (Platform.isMobile) {
      // Restore synced desktop leaves as an explanation, without AI startup.
      for (const type of [LIBRARIAN, EXPANSION])
        this.registerView(type, leaf => new MobileLibrarianView(leaf, type));
    }
    this.applyModules();
  }
  async setModule(name: ModuleName, enabled: boolean) {
    const previous = this.workspaceSettings.modules[name];
    this.workspaceSettings.modules[name] = enabled;
    try {
      await this.savePluginData();
    } catch (error) {
      this.workspaceSettings.modules[name] = previous;
      throw error;
    }
    this.applyModules();
  }
  async setTimelineEnabled(enabled: boolean) {
    if (this.timelineSetupPending) throw new Error("Calendar setup is already in progress.");
    if (enabled && !timelineAvailable(this)) throw new Error("Timelines is available in World vaults on desktop only.");
    this.timelineSetupPending = true;
    const previous = this.timelineSettings.enabled;
    try {
      if (enabled) await setupTimeline(this);
      // Vault type may change while a calendar is being created.
      if (enabled && !timelineAvailable(this)) throw new Error("Timelines requires a World vault on desktop.");
      this.timelineSettings.enabled = enabled;
      await this.savePluginData();
      this.applyModules();
    } catch(error) { this.timelineSettings.enabled = previous; throw error; }
    finally { this.timelineSetupPending = false; }
  }
  applyModules() {
    const modules = this.workspaceSettings.modules;
    if (this.timelineSettings.enabled && timelineAvailable(this) && !this.timelineFeature)
      this.timelineFeature = this.addChild(new TimelineFeature(this));
    else if ((!this.timelineSettings.enabled || !timelineAvailable(this)) && this.timelineFeature) {
      for(const leaf of this.app.workspace.getLeavesOfType(TIMELINE))leaf.detach();
      this.removeChild(this.timelineFeature);
      this.timelineFeature = undefined;
    }
    if (modules.scripts && !this.scriptsFeature) {
      this.scriptController = undefined;
      this.scriptsFeature = this.addChild(new ScriptFeature(this));
    } else if (!modules.scripts && this.scriptsFeature) {
      for (const type of [
        "marginalia-scripts",
        "marginalia-project",
        "marginalia-compile",
        "marginalia-script-studio",
      ])
        for (const leaf of this.app.workspace.getLeavesOfType(type))
          leaf.detach();
      this.removeChild(this.scriptsFeature);
      this.scriptsFeature = undefined;
      this.scriptController = undefined;
    }
    if (modules.librarian && !Platform.isMobile && !this.librarianFeature) {
      this.librarianFeature = this.addChild(new LibrarianFeature(this));
    } else if ((!modules.librarian || Platform.isMobile) && this.librarianFeature) {
      this.operation?.abort();
      for (const type of [LIBRARIAN, EXPANSION])
        for (const leaf of this.app.workspace.getLeavesOfType(type))
          leaf.detach();
      this.removeChild(this.librarianFeature);
      this.librarianFeature = undefined;
      for (const action of this.headerActions.values()) action.remove();
      this.headerActions.clear();
    }
    if (modules.theme && !this.themeFeature)
      this.themeFeature = this.addChild(new WorkspaceFeature(this));
    else if (!modules.theme && this.themeFeature) {
      for (const leaf of this.app.workspace.getLeavesOfType(PAGES))
        leaf.detach();
      this.removeChild(this.themeFeature);
      this.themeFeature = undefined;
    }
    this.themeFeature?.refresh();
    this.noteActions();
  }
  registerLibrarian(feature: Plugin) {
    feature.registerView(LIBRARIAN, (leaf) => new LibrarianView(leaf, this));
    feature.registerView(EXPANSION, (leaf) => new ExpansionView(leaf, this));
    feature.addCommand({
      id: "open-librarian",
      name: "Open Librarian",
      callback: () => void this.openLibrarian(),
    });
    for (const [mode, label] of [
      ["enhancement", "Entry Enhancement"],
      ["expansion", "Entry Expansion"],
    ] as const)
      feature.addCommand({
        id: mode,
        name: label,
        checkCallback: (checking) => {
          const file = this.app.workspace.getActiveFile();
          if (!file || !permitted(file.path)) return false;
          if (!checking) {
            this.target = file.path;
            void this.openLibrarian().then(() => this.run(mode));
          }
          return true;
        },
      });
    feature.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (file?.extension === "md" && permitted(file.path))
          this.followNote(file.path);
      }),
    );
    feature.registerEvent(
      this.app.workspace.on("layout-change", () => this.noteActions()),
    );
    feature.registerEvent(
      this.app.vault.on("rename", (file, old) => {
        if (this.lastNotePath === old) this.lastNotePath = file.path;
        if (this.target === old) {
          this.target = file.path;
          this.error = "Note renamed. Generate again using the new path.";
        }
        this.sessions.delete(old);
        this.refresh();
      }),
    );
    feature.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (this.lastNotePath === file.path) this.lastNotePath = null;
        if (this.target === file.path) {
          this.target = null;
          this.pinned = false;
        }
        this.sessions.delete(file.path);
        this.refresh();
      }),
    );
    let startupTimer: ReturnType<typeof setTimeout> | undefined;
    feature.register(() => clearTimeout(startupTimer));
    this.app.workspace.onLayoutReady(() => {
      if (this.closing || !this.workspaceSettings.modules.librarian) return;
      const file = this.app.workspace.getActiveFile();
      if (file?.extension === "md" && permitted(file.path))
        this.followNote(file.path);
      this.noteActions();
      startupTimer = setTimeout(() => {
        if (this.librarianFeature !== feature || this.closing) return;
        void this.ensureLibrarianTab().catch(() => new Notice("Could not add Librarian. Use the Open Librarian command to try again."));
      }, 100);
      this.refresh();
    });
  }
  async ensureLibrarianTab() {
    if (Platform.isMobile || this.closing || !this.workspaceSettings.modules.librarian) return;
    let existing = this.app.workspace.getLeavesOfType(LIBRARIAN)[0];
    this.app.workspace.iterateAllLeaves(leaf => {
      if (!existing && leaf.getViewState?.().type === LIBRARIAN) existing = leaf;
    });
    if (existing) return existing;
    if (this.librarianTabPromise) return this.librarianTabPromise;
    const creation = this.app.workspace.ensureSideLeaf(LIBRARIAN, "right", {active: false, reveal: false});
    this.librarianTabPromise = creation;
    try {
      const leaf = await creation;
      if (this.closing || !this.workspaceSettings.modules.librarian) { leaf.detach(); return; }
      return leaf;
    } finally { this.librarianTabPromise = undefined; }
  }

  followNote(path: string) {
    this.lastNotePath = path;
    if (!this.pinned) {
      this.target = path;
      this.error = "";
    }
    this.refresh();
  }
  togglePin() {
    this.pinned = !this.pinned;
    if (!this.pinned && this.lastNotePath) this.target = this.lastNotePath;
    this.refresh();
  }
  onunload() {
    this.closing = true;
    this.operation?.abort();
    for (const action of this.headerActions.values()) action.remove();
    this.headerActions.clear();
  }
  current(path = this.target): Session {
    if (!path) return session();
    let value = this.sessions.get(path);
    if (!value) {
      value = session();
      this.sessions.set(path, value);
    }
    return value;
  }
  refresh() {
    if (this.closing) return;
    for (const leaf of this.app.workspace.getLeavesOfType(LIBRARIAN)) {
      const view = leaf.view;
      if (view instanceof LibrarianView) view.draw();
    }
    for (const leaf of this.app.workspace.getLeavesOfType(EXPANSION)) {
      for(const button of leaf.view.containerEl.querySelectorAll<HTMLButtonElement>(".marginalia-regenerate,.marginalia-recovery"))
        button.disabled=!!this.operation || button.dataset.readOnly==="true";
    }
  }
  noteActions() {
    if (Platform.isMobile || !this.workspaceSettings.modules.librarian) return;
    const live = new Set<MarkdownView>();
    this.app.workspace.iterateAllLeaves((leaf) => {
      const view = leaf.view;
      if (!(view instanceof MarkdownView)) return;
      live.add(view);
      if (this.headerActions.has(view)) return;
      const action = view.addAction(
        "marginalia-lantern",
        "Open Librarian for this note",
        () => {
          if (view.file) {
            this.target = view.file.path;
            this.pinned = false;
            void this.openLibrarian();
          }
        },
      );
      this.headerActions.set(view, action);
    });
    for (const [view, action] of this.headerActions)
      if (!live.has(view)) {
        action.remove();
        this.headerActions.delete(view);
      }
  }
  async openLibrarian() {
    if (Platform.isMobile) {
      new Notice(MOBILE_LIBRARIAN_MESSAGE);
      return;
    }
    if (!this.workspaceSettings.modules.librarian) {
      new Notice("Enable Librarian in Marginalia settings first.");
      return;
    }
    let leaf = this.app.workspace.getLeavesOfType(LIBRARIAN)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false)!;
      if (!leaf) return;
      await leaf.setViewState({ type: LIBRARIAN, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
    this.refresh();
  }
  showSettings() {
    (
      this.app as App & {
        setting: { open(): void; openTabById(id: string): void };
      }
    ).setting.open();
    (
      this.app as App & { setting: { openTabById(id: string): void } }
    ).setting.openTabById(this.manifest.id);
  }
  async checkConnection(signal = new AbortController().signal) {
    if (Platform.isMobile) throw new Error(MOBILE_LIBRARIAN_MESSAGE);
    try {
      const models = await localModels(this.settings, signal);
      this.status = this.settings.model
        ? models.includes(this.settings.model)
          ? "Local · Ready"
          : "Local · Model unavailable"
        : "Local · Choose a model";
      this.refresh();
      return models;
    } catch (e) {
      this.status = "Local · Offline";
      this.refresh();
      throw e;
    }
  }
  activeText(file: TFile): string | null {
    let text: string | null = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (
        leaf.view instanceof MarkdownView &&
        leaf.view.file?.path === file.path &&
        leaf.view.getMode() === "source"
      )
        text = leaf.view.editor.getValue();
    });
    return text;
  }
  async snapshot(signal: AbortSignal, fresh=false): Promise<Note[]> {
    const templates=new Set([...this.workspaceSettings.canonTypes.map(type=>type.template),...this.workspaceSettings.entrySetup.projectOptions.map(route=>route.template),this.workspaceSettings.entrySetup.brainstorm.template]);
    const notes: Note[] = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      signal.throwIfAborted();
      if (!permitted(file.path)||templates.has(file.path)) continue;
      const cache = this.app.metadataCache.getFileCache(file);
      const metadata = cache?.frontmatter ?? {};
      const allStrings = (v: unknown): string[] =>
        typeof v === "string"
          ? [v]
          : Array.isArray(v)
            ? v.flatMap(allStrings)
            : v && typeof v === "object"
              ? Object.values(v).flatMap(allStrings)
              : [];
      const linkTexts = [
        ...(cache?.links ?? []).map((l) => l.link),
        ...(cache?.frontmatterLinks ?? []).map((l) => l.link),
        ...allStrings(metadata),
      ];
      const links = [
        ...new Set(
          linkTexts.flatMap((value) => {
            const target = value
              .replace(/^\[\[/, "")
              .replace(/\]\]$/, "")
              .split("|")[0]
              .split("#")[0];
            const resolved = this.app.metadataCache.getFirstLinkpathDest(
              target,
              file.path,
            );
            return resolved ? [resolved.path] : [];
          }),
        ),
      ];
      const aliases = allStrings(metadata.aliases ?? metadata.alias ?? []);
      notes.push({
        path: file.path,
        tags:(cache?.tags??[]).map(tag=>tag.tag.replace(/^#/,"")),
        text: this.activeText(file) ?? (await (!fresh && this.app.vault.cachedRead ? this.app.vault.cachedRead(file) : this.app.vault.read(file))),
        mtime: file.stat.mtime,
        aliases,
        links,
        metadata,
      });
    }
    return notes;
  }
  async packet(path: string, signal: AbortSignal): Promise<Packet> {
    const started=performance.now();
    const notes = await this.snapshot(signal),
      target = notes.find((n) => n.path === path);
    if (!target) throw new Error("The selected entry is no longer available.");
    const type=librarianType(target,this.workspaceSettings,notes);
    const subtype = String(
      target.metadata["sub-type"] ?? target.metadata.type ?? "Other",
    );
    const profile: {guidance:string;headings?:string[];variants?:Record<string,string[]>}|undefined = type==="Project"?projectBrief:profiles[Object.keys(profiles).find(name=>name.toLowerCase()===type.toLowerCase())??type];
    const resolveProject=projectResolver(this.workspaceSettings,notes);
    const packet = retrieve(
      notes,
      target,
      Math.max(1000, this.settings.context - 16000),
      this.current(path).references,
      `Configured entry type: ${type}. `+(profile?.guidance ??
        "Describe this subject using only direct evidence. Do not infer category-wide traits, history or relationships. Follow the configured template sections."),
      note=>resolveProject(note.path,note.metadata),
    );
    packet.entryType=type;
    packet.freshness=freshness(notes,target,this.workspaceSettings,this.settings.context);
    // Read literal headings only; Templater execution remains with Templater.
    const configuredTemplate=type==="Project"
      ? this.workspaceSettings.entrySetup.projectOptions.find(route=>route.name==="Overview")?.template
      : this.workspaceSettings.canonTypes.find(entry=>entry.name===type)?.template;
    const template=this.app.vault.getMarkdownFiles().find(file=>file.path===configuredTemplate)
      ?? (!configuredTemplate||configuredTemplate===`_templates/Canon/${type}.md`?this.app.vault.getMarkdownFiles().find(file=>/^_?templates\//i.test(file.path)&&file.basename.toLowerCase()===type.toLowerCase()):undefined);
    const defaults =
      type.toLowerCase() === "character"
        ? [
            "Summary",
            "Backstory",
            "Personality",
            "Relationships",
            "Abilities",
            "Goals",
            "Key Scenes",
            "Appearance",
            "Related Entries",
          ]
        : (profile?.variants?.[subtype] ??
          profile?.variants?.Other ??
          profile?.headings ?? ["Summary", "Related Entries"]);
    const templateText = template ? this.activeText(template)??await this.app.vault.read(template) : "";
    if(template)packet.stamps.push({path:template.path,mtime:template.stat.mtime,hash:hash(templateText)});
    // Conditional template source has several mutually exclusive branches; use its selected type profile instead.
    const templateHeadings = /<%/.test(templateText)
      ? []
      : [...templateText.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
    const existing = [
      ...target.text.slice(bodyOffset(target.text)).matchAll(/^##\s+(.+)$/gm),
    ].map((m) => m[1].trim());
    packet.headings = [
      ...new Set([
        ...(type.toLowerCase() === "character" ? ["Summary"] : []),
        ...(templateHeadings.length ? templateHeadings : defaults),
        ...existing,
        "Related Entries",
      ]),
    ].filter((h) => !/research|questions|inspiration|references/i.test(h));
    if (!packet.headings.length) packet.headings = ["Summary"];
    this.timings.retrieval=performance.now()-started;
    return packet;
  }
  async verify(packet: Packet, signal: AbortSignal) {
    let notes:Note[]|undefined;
    if(packet.freshness){
      notes=await this.snapshot(signal);
      const target=notes.find(note=>note.path===packet.target.path);
      if(!target || !sameFreshness(packet.freshness,freshness(notes,target,this.workspaceSettings,this.settings.context)))
        throw new Error("Source notes changed, new evidence is available or Librarian configuration changed. Generate again before using this result.");
    }
    for (const stamp of packet.stamps) {
      signal.throwIfAborted();
      const file = this.app.vault.getAbstractFileByPath(stamp.path);
      if (
        !(file instanceof TFile) ||
        hash(this.activeText(file) ?? (await this.app.vault.read(file))) !==
          stamp.hash
      )
        throw new Error(
          "Source notes changed. Generate again before using this result.",
        );
    }
    return notes;
  }
  port(): HiddenPort {
    const adapter = this.app.vault.adapter;
    return {
      read: async (path) =>
        (await adapter.exists(path)) ? adapter.read(path) : null,
      write: (path, text) => adapter.write(path, text),
      mkdir: async (path) => {
        let built = "";
        for (const part of path.split("/")) {
          built = built ? built + "/" + part : part;
          if (!(await adapter.exists(built))) await adapter.mkdir(built);
        }
      },
    };
  }
  async task(work: (signal: AbortSignal) => Promise<void>, section?: Suggestion) {
    if (this.operation) return;
    this.error = "";
    const op = new AbortController();
    this.operation = op;
    this.progress = "Waiting for local model…";
    this.lastProgressUpdate = 0;
    this.timings={retrieval:0,generation:0,rendering:0,storage:0};
    this.refresh();
    try {
      await work(op.signal);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if(section) section.warnings = [...new Set([...(section.warnings ?? []),message])];
      else this.error = message;
    } finally {
      if (this.operation === op) {
        this.operation = null;
        this.progress = "";
        this.reviewOperation = undefined;
      }
      this.refresh();
    }
  }
  async generateText(system: string, user: string, signal: AbortSignal, stage?:string) {
    if (Platform.isMobile) throw new Error(MOBILE_LIBRARIAN_MESSAGE);
    const started=performance.now();
    try{return await generate(
      this.settings,
      system,
      user,
      signal,
      undefined,
      (progress) => {
        if (signal.aborted || this.closing) return;
        const now = Date.now();
        if (now - this.lastProgressUpdate < 500) return;
        this.lastProgressUpdate = now;
        this.progress =
          stage??(progress.phase === "thinking"
            ? "Thinking locally…"
            : `Generating locally · ${progress.characters.toLocaleString()} characters`);
        this.updateProgress();
      },
    );}finally{this.timings.generation+=performance.now()-started;}
  }
  updateProgress(){
    for(const leaf of this.app.workspace.getLeavesOfType(LIBRARIAN)){
      for(const label of (leaf.view as ItemView).contentEl.querySelectorAll(".marginalia-progress > span, .marginalia-entry-progress"))label.textContent=this.progress;
    }
  }
  async reviewGrounding(packet:Packet,sections:{section:string;prose:string}[],signal:AbortSignal){
    validateEvidenceBoundaries(packet,sections);
    this.progress="Checking source grounding…";this.refresh();
    const review=await this.generateText(groundingReviewSystem,groundingReviewPrompt(packet,sections),signal,"Checking source grounding…");
    await this.verify(packet,signal);validateGroundingReview(review,sections);
  }
  async groundedDraft(packet:Packet,raw:string,mode:"enhancement"|"expansion",signal:AbortSignal,system:string,question=""){
    let sections=cleanDraft(raw,packet);
    const warn=(draft:typeof sections,error:unknown)=>{
      signal.throwIfAborted();
      const issues=error instanceof GroundingFailure?error.issues:[];
      const message=(error instanceof Error?error.message:String(error)).replace(/Previous results retained[.;]?/gi,"").replace(/Draft withheld after source-grounding review:\s*/i,"").trim();
      return draft.map(section=>{
        const reasons=issues.length?issues.filter(issue=>issue.section===section.section).map(issue=>issue.reason):["Source check could not be completed: "+message];
        return reasons.length?{...section,warnings:[...new Set([...(section.warnings??[]),...reasons])]}:section;
      });
    };
    try{await this.reviewGrounding(packet,sections,signal);return sections;}
    catch(error){
      signal.throwIfAborted();
      if(!(error instanceof GroundingFailure))return warn(sections,error);
      const original=warn(sections,error);
      try{
        this.progress="Revising unsupported draft…";this.refresh();
        const correction=await this.generateText(system,prompt(packet,mode,
          question+"\nEvidence review correction: revise the proposed draft using ONLY original evidence. Remove unsupported claims or omit their sections. Preserve exact participants, objects and uncertainty. Return only corrected finished entry sections.\n"+JSON.stringify({priorDraft:sections,reviewFeedback:error.message})),signal,"Revising unsupported draft…");
        await this.verify(packet,signal);sections=cleanDraft(correction,packet);
        try{await this.reviewGrounding(packet,sections,signal);}catch(reviewError){sections=warn(sections,reviewError);}
        for(const section of original)if(!sections.some(current=>current.section.toLowerCase()===section.section.toLowerCase()))
          sections.push({...section,warnings:[...(section.warnings??[]),"The correction did not return this section. Review this earlier draft before using it."]});
        return sections;
      }catch(correctionError){
        signal.throwIfAborted();
        const message=correctionError instanceof Error?correctionError.message:String(correctionError);
        return original.map(section=>section.warnings?.length?{...section,warnings:[...section.warnings,"Correction could not be completed: "+message]}:section);
      }
    }
  }
  async run(mode: "enhancement" | "expansion") {
    if (Platform.isMobile || !this.workspaceSettings.modules.librarian || this.operation) return;
    const path = this.target;
    if (!path) return;
    this.reviewOperation={mode,path};
    await this.task(async (signal) => {
      const previous =
        mode === "expansion"
          ? await this.port().read(expansionPath(path))
          : null;
      if (previous !== null) {
        if (!pluginOwned(previous))
          throw new Error(
            "An existing standalone expansion is preserved. Open it in Library; migration is required before replacement.",
          );
        decode(previous, path);
      }
      const packet = await this.packet(path, signal);
      const type = packet.entryType?.toLowerCase()==="character";
      if (mode === "expansion" && type)
        packet.headings = [
          ...new Set([...packet.headings, "Personality", "Relationships"]),
        ];
      const raw = await this.generateText(
        librarianSystem + "\n" + (type ? characterWriter : canonWriter),
        prompt(packet, mode),
        signal,
      );
      await this.verify(packet, signal);
      const sections = await this.groundedDraft(packet,raw,mode,signal,librarianSystem+"\n"+(type?characterWriter:canonWriter));
      await this.verify(packet, signal);
      if (mode === "enhancement") {
        const suggestions = sections.map((s, i) => ({
          ...s,
          id: crypto.randomUUID(),
          entry: path,
          packet,
          state: "pending" as const,
        }));
        this.current(path).suggestions.push(...suggestions);
        if (this.target === path) this.tab = "Review";
      } else {
        const expansion = makeExpansion(
          packet,
          sections
            .map((s) =>
              (type && s.section.toLowerCase() === "summary"
                ? "> [!abstract] Summary\n" +
                  s.prose
                    .split("\n")
                    .map((line) => "> " + line)
                    .join("\n")
                : `## ${s.section}\n\n${s.prose}`)
              + (s.warnings?.length ? "\n\n> [!warning] Review needed\n" + s.warnings.map(warning=>"> "+warning.replace(/\r?\n/g," ")).join("\n") : ""),
            )
            .join("\n\n"),
        );
        await this.verify(packet, signal);
        const saveStarted=performance.now();
        await saveExpansion(this.port(), expansion, previous, signal);
        this.timings.storage+=performance.now()-saveStarted;
        await this.loadLibrary();
        signal.throwIfAborted();
        await this.openExpansion(path);
      }
    });
  }
  async ask(question: string) {
    if (Platform.isMobile || !this.workspaceSettings.modules.librarian) return;
    const path = this.target;
    if (!path || this.operation) return;
    const state = this.current(path);
    state.messages.push({ role: "user", text: question });
    this.tab = "Ask";
    await this.task(async (signal) => {
      const packet = await this.packet(path, signal);
      const history = state.messages
        .slice(-6, -1)
        .map((m) => ({ role: m.role, text: m.text }));
      const raw = await this.generateText(
        librarianSystem,
        prompt(packet, "ask", question) +
          "\nConversation for context only; assistant text is not evidence:\n" +
          JSON.stringify(history),
        signal,
      );
      await this.verify(packet, signal);
      const answer=cleanAnswer(raw,packet);
      state.messages.push({ role: "assistant", text: answer.text, warnings:answer.warnings, packet });
    });
  }
  async refine(s: Suggestion, instruction: string) {
    await this.task(async (signal) => {
      await this.verify(s.packet, signal);
      const raw = await this.generateText(
        librarianSystem,
        prompt(
          s.packet,
          "enhancement",
          `Refine only section ${s.section}. Current proposed prose: ${s.prose}. User refinement: ${instruction}. Return only ## ${s.section} and finished revised prose.`,
        ),
        signal,
      );
      await this.verify(s.packet, signal);
      const sections = await this.groundedDraft({...s.packet,headings:[s.section]},raw,"enhancement",signal,librarianSystem,`Refine only section ${s.section}. User refinement: ${instruction}.`);
      if (sections.length !== 1)
        throw new Error(
          "Refinement must return one section. Previous suggestion retained.",
        );
      await this.verify(s.packet,signal);
      s.prose = sections[0].prose;
      s.warnings = sections[0].warnings;
    }, s);
  }
  async insert(s: Suggestion) {
    if (s.state !== "pending" || this.operation) return;
    await this.task(async (signal) => {
      await this.verify(s.packet, signal);
      const file = this.app.vault.getAbstractFileByPath(s.entry);
      if (!(file instanceof TFile))
        throw new Error("Original entry is missing.");
      let view: MarkdownView | undefined;
      this.app.workspace.iterateAllLeaves((leaf) => {
        if (
          leaf.view instanceof MarkdownView &&
          leaf.view.file?.path === s.entry
        )
          view = leaf.view;
      });
      if (!view) {
        const leaf = this.app.workspace.getLeaf("tab");
        await leaf.openFile(file);
        if (leaf.view instanceof MarkdownView) view = leaf.view;
      }
      if (!view)
        throw new Error(
          "Open the original entry in a Markdown editor before inserting.",
        );
      // Reading mode has a dormant editor buffer: changing it neither saves the
      // note nor updates the rendered view. Activate native editing first.
      if (view.getMode() !== "source")
        await view.setState({ mode: "source" }, { history: false });
      const verifiedNotes=await this.verify(s.packet, signal);
      const editor = view.editor;
      const current = editor.getValue();
      if (
        hash(current) !==
        s.packet.stamps.find((st) => st.path === s.entry)?.hash
      )
        throw new Error("The entry changed. Generate fresh suggestions.");
      const change = insertion(current, s.section, s.prose);
      editor.transaction({
        changes: [
          { from: editor.offsetToPos(change.from), to: editor.offsetToPos(change.to ?? change.from), text: change.insert },
        ],
      });
      editor.focus();
      s.state = "inserted";
      const updated = editor.getValue();
      const notes=verifiedNotes?.map(note=>note.path===s.entry?{...note,text:updated}:note);
      const updatedTarget=notes?.find(note=>note.path===s.entry);
      for (const pending of this.current(s.entry).suggestions.filter(
        (x) => x.state === "pending",
      )) {
        pending.packet = {
          ...pending.packet,
          target: { ...pending.packet.target, text: updated },
          freshness:updatedTarget&&notes?freshness(notes,updatedTarget,this.workspaceSettings,this.settings.context):pending.packet.freshness,
          stamps: pending.packet.stamps.map((st) =>
            st.path === s.entry ? { ...st, hash: hash(updated) } : st,
          ),
        };
      }
      new Notice("Inserted " + s.section + ". Undo in the note to revert.");
    }, s);
  }
  async loadLibrary() {
    const adapter = this.app.vault.adapter,
      root = ".marginalia/expanded";
    const result: SavedEntry[] = [];
    const walk = async (path: string,base:string,recovery=false) => {
      if(!(await adapter.exists(path)))return;
      const listing = await adapter.list(path);
      for (const file of listing.files) {
        if (!file.endsWith(".md")) continue;
        const entry = file.slice(base.length + 1);
        try {
          const inspected=inspectExpansion(await adapter.read(file),entry);
          if(recovery){
            if(inspected.owned && inspected.expansion && !result.some(item=>item.entry===entry))
              result.push({...inspected.item,status:"Saved file missing · recovery available"});
          }else result.push(inspected.item);
        } catch {
          try{safeEntry(entry);if(!recovery)result.push({entry,generatedAt:"",status:"Could not read · preserved"});}catch{/* Unsafe paths are never opened. */}
        }
      }
      for (const dir of listing.folders) await walk(dir,base,recovery);
    };
    await walk(root,root);
    await walk(".marginalia/recovery",".marginalia/recovery",true);
    this.expansions = result.sort((a, b) =>
      b.generatedAt.localeCompare(a.generatedAt),
    );
    this.refresh();
  }
  async openExpansion(entry: string) {
    safeEntry(entry);
    const raw = await this.port().read(expansionPath(entry));
    if (!raw && !await this.port().read(recoveryPath(entry)))throw new Error("No saved expansion or recovery copy for this entry.");
    if(raw)inspectExpansion(raw, entry);
    const existing = this.app.workspace
      .getLeavesOfType(EXPANSION)
      .find((leaf) => (leaf.view as ExpansionView).entry === entry);
    const leaf = existing ?? this.app.workspace.getLeaf("tab");
    await leaf.setViewState({
      type: EXPANSION,
      state: { entry },
      active: true,
    });
    await this.app.workspace.revealLeaf(leaf);
  }
  addReference(reference?: string) {
    const path = this.target;
    if (!path) return;
    if (reference) {
      const file = this.app.vault.getAbstractFileByPath(reference);
      if (file instanceof TFile && permitted(file.path) && !this.current(path).references.includes(file.path))
        this.current(path).references.push(file.path);
      this.refresh();
      return;
    }
    new ReferencePicker(this.app, (file) => {
      if (!this.current(path).references.includes(file.path))
        this.current(path).references.push(file.path);
      this.refresh();
    }).open();
  }
  source(path: string) {
    const file=this.app.vault.getAbstractFileByPath(path)??this.app.vault.getAbstractFileByPath(path+".md");
    if(!(file instanceof TFile)){new Notice("This original source is no longer available. No note was created.");return;}
    void this.app.workspace.getLeaf("tab").openFile(file).catch(()=>new Notice("Could not open the original source."));
  }
}

class MobileLibrarianView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private type: string) { super(leaf); }
  getViewType() { return this.type; }
  getDisplayText() { return "Librarian · Desktop only"; }
  getIcon() { return "marginalia-lantern"; }
  async onOpen() {
    this.contentEl.replaceChildren(el("p", "marginalia-muted", MOBILE_LIBRARIAN_MESSAGE));
  }
}

class LibrarianView extends ItemView {
  plugin: Marginalia;
  renderComponent: Component | null = null;
  constructor(leaf: WorkspaceLeaf, plugin: Marginalia) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return LIBRARIAN;
  }
  getDisplayText() {
    return "Librarian";
  }
  getIcon() {
    return "marginalia-lantern";
  }
  async onOpen() {
    this.draw();
    await this.plugin.loadLibrary();
    void this.plugin.checkConnection().catch(() => {});
  }
  async onClose() {
    if (this.renderComponent) this.removeChild(this.renderComponent);
    this.renderComponent = null;
  }
  draw() {
    if (this.renderComponent) this.removeChild(this.renderComponent);
    const component = new Component();
    this.addChild(component);
    this.renderComponent = component;
    const p = this.plugin,
      c = p.current();
    const state: SidebarState = {
      vaultType:p.workspaceSettings.vaultType,
      target: p.target,
      pinned: p.pinned,
      tab: p.tab,
      status: p.status,
      busy: !!p.operation,
      progress: p.progress,
      reviewAction:p.reviewOperation?.path===p.target?p.reviewOperation.mode:undefined,
      error: p.error,
      suggestions: c.suggestions,
      messages: c.messages,
      expansions: p.expansions,
      references: c.references,
      referenceChoices: p.app.vault.getMarkdownFiles().filter(file=>permitted(file.path)).map(file => {
        const fm = p.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
        const tags = [...[fm.tags].flat().filter((value): value is string=>typeof value === "string"),
          ...(p.app.metadataCache.getFileCache(file)?.tags ?? []).map(item=>item.tag)].map(tag=>tag.replace(/^#/,""));
        return {path:file.path, type:entryType(file.path, tags, p.workspaceSettings.canonTypes) ??
          (fm.role === "manuscript" || file.path.includes("/Scripts/") ? "Script" : "Note")};
      }),
    };
    const guard = (fn: () => Promise<unknown>) =>
      void fn().catch((e) => {
        p.error = e instanceof Error ? e.message : String(e);
        p.refresh();
      });
    renderSidebar(this.contentEl, state, {
      tab: (tab) => {
        p.tab = tab;
        if (tab === "Library") guard(() => p.loadLibrary());
        p.refresh();
      },
      pin: () => p.togglePin(),
      settings: () => p.showSettings(),
      newChat: () => {
        p.current().messages = [];
        p.error = "";
        p.refresh();
      },
      run: (mode) => void p.run(mode),
      ask: (text) => void p.ask(text),
      cancel: () => p.operation?.abort(),
      insert: (s) => void p.insert(s),
      dismiss: (s) => {
        s.state = "dismissed";
        p.refresh();
      },
      refine: (s, text) => void p.refine(s, text),
      open: (entry) => guard(() => p.openExpansion(entry)),
      addReference: (path) => p.addReference(path),
      removeReference: (path) => {
        p.current().references = p
          .current()
          .references.filter((x) => x !== path);
        p.refresh();
      },
      source: (path) => p.source(path),
      markdown: (text, element, source) => {
        const renderStarted=performance.now();
        void MarkdownRenderer.render(p.app, text, element, source, component).then(()=>{
          this.plugin.timings.rendering+=performance.now()-renderStarted;
      if(this.renderComponent===component)bindOriginalLinks(element,component,path=>p.source(path));
        });
      },
    });
  }
}
class ExpansionView extends ItemView {
  plugin: Marginalia;
  entry = "";
  renderComponent: Component | null = null;
  revision = 0;
  lastRenderKey = "";
  constructor(leaf: WorkspaceLeaf, plugin: Marginalia) {
    super(leaf);
    this.plugin = plugin;
    this.registerDomEvent(
      this.contentEl,
      "click",
      (event) => {
        if (
          (event.target as HTMLElement).closest(
            'input,textarea,[contenteditable="true"]',
          )
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );
    let timer:ReturnType<typeof setTimeout>|undefined;
    const redraw=()=>{if(timer)clearTimeout(timer);timer=setTimeout(()=>{timer=undefined;void this.draw();},250);};
    this.registerEvent(plugin.app.vault.on("modify",redraw));
    this.registerEvent(plugin.app.vault.on("delete",redraw));
    this.registerEvent(plugin.app.vault.on("create",redraw));
    this.registerEvent(plugin.app.vault.on("rename",redraw));
    this.registerEvent(plugin.app.workspace.on("editor-change",redraw));
    this.register(()=>{if(timer)clearTimeout(timer);});
  }
  getViewType() {
    return EXPANSION;
  }
  getDisplayText() {
    return this.entry ? title(this.entry) + " · Expansion" : "Expansion";
  }
  getIcon() {
    return "marginalia-lantern";
  }
  getState() {
    return { entry: this.entry };
  }
  async setState(state: { entry?: string }, result: { history: boolean }) {
    this.entry = state.entry ?? "";
    await this.draw();
    await super.setState(state, result);
  }
  async onOpen() {
    await this.draw();
  }
  async onClose() {
    this.lastRenderKey="";
    this.revision++;
    if (this.renderComponent) this.removeChild(this.renderComponent);
  }
  recoveryButton(previous:string|null){
    const b=button("Restore previous saved version",()=>void this.restore(previous),"marginalia-recovery");
    b.disabled=!!this.plugin.operation;
    return b;
  }
  async restore(previous:string|null){
    await this.plugin.task(async()=>{
      await restoreExpansion(this.plugin.port(),this.entry,previous);
      await this.plugin.loadLibrary();await this.draw();
      new Notice("Previous expansion restored. The replaced version is now the recovery copy.");
    });
    if(this.plugin.error)new Notice(this.plugin.error);
  }
  async draw() {
    const revision = ++this.revision;
    const root = this.contentEl;
    root.classList.add("marginalia-expansion");
    if (!this.entry) {
      root.replaceChildren(
        el("p", "", "Choose an expansion in Librarian → Library."),
      );
      return;
    }
    try {
      const raw = await this.plugin.port().read(expansionPath(this.entry));
      if (revision !== this.revision) return;
      if (!raw){
        this.lastRenderKey="";
        const backup=await this.plugin.port().read(recoveryPath(this.entry));
        if(revision!==this.revision)return;
        root.replaceChildren(el("p","marginalia-stale","Saved expansion is missing. Original notes are unchanged."));
        if(backup && pluginOwned(backup) && inspectExpansion(backup,this.entry).expansion)
          root.append(this.recoveryButton(null));
        return;
      }
      const inspected=inspectExpansion(raw,this.entry);
      const e=inspected.expansion;
      if(!e){
        this.lastRenderKey="";
        root.replaceChildren(el("h1","",title(this.entry)),el("p","marginalia-stale",inspected.item.status+". Original file has not been changed."));
        const backup=await this.plugin.port().read(recoveryPath(this.entry));
        if(revision!==this.revision)return;
        if(inspected.owned && backup && inspectExpansion(backup,this.entry).expansion)
          root.append(this.recoveryButton(raw));
        if(inspected.body){
          if(this.renderComponent)this.removeChild(this.renderComponent);
          const component=new Component();this.addChild(component);this.renderComponent=component;
          const body=el("div","marginalia-markdown");root.append(body);
          await MarkdownRenderer.render(this.app,inspected.body,body,this.entry,component);
          bindOriginalLinks(body,component,path=>this.plugin.source(path));
        }
        return;
      }
      const current = new Map<string, string>();
      for (const stamp of e.sources) {
        const file = this.app.vault.getAbstractFileByPath(stamp.path);
        if (file instanceof TFile)
          current.set(
            file.path,
            this.plugin.activeText(file) ?? (await this.app.vault.read(file)),
          );
      }
      let inventoryChanged=false;
      if(e.freshness){
        const notes=await this.plugin.snapshot(new AbortController().signal);
        const target=notes.find(note=>note.path===e.entry);
        inventoryChanged=!target||!sameFreshness(e.freshness,freshness(notes,target,this.plugin.workspaceSettings,this.plugin.settings.context));
      }
      const backup=await this.plugin.port().read(recoveryPath(this.entry));
      if (revision !== this.revision) return;
      const isStale=stale(e,current)||inventoryChanged;
      const renderKey=hash(raw)+":"+isStale+":"+hash(backup??"");
      if(this.lastRenderKey===renderKey)return;
      this.lastRenderKey=renderKey;
      root.replaceChildren();
      if (this.renderComponent) this.removeChild(this.renderComponent);
      const component = new Component();
      this.addChild(component);
      this.renderComponent = component;
      const banner = el("div", "marginalia-expansion-banner");
      banner.append(
        el("span", "marginalia-generated", "Generated / Not canon"),
        el(
          "span",
          "marginalia-muted",
          new Date(e.generatedAt).toLocaleString(),
        ),
      );
      root.append(banner, el("h1", "", title(e.entry)));
      const actions = el("div", "marginalia-expansion-actions");
      const regenerate = button(
        "Regenerate",
        () => {
          this.plugin.target = e.entry;
          void this.plugin.run("expansion");
        },
        "marginalia-regenerate",
      );
      regenerate.dataset.readOnly=String(!inspected.owned);
      regenerate.disabled = !!this.plugin.operation || !inspected.owned;
      actions.append(
        button("Open original", () => this.plugin.source(e.entry)),
        regenerate,
      );
      if(inspected.owned && backup && inspectExpansion(backup,e.entry).expansion){
        const restore=this.recoveryButton(raw);
        restore.disabled=!!this.plugin.operation;actions.append(restore);
      }
      root.append(actions);
      if(!inspected.owned)root.append(el("p","marginalia-muted","Standalone app output · read only. Replacement requires an explicit migration; this file is preserved."));
      if(!e.freshness)root.append(el("p","marginalia-muted","Older output: only its original source list can be checked. New evidence was not tracked."));
      if (isStale)
        root.append(
          el(
            "p",
            "marginalia-stale",
            "Sources, available evidence or configuration changed. Regenerate to update this expansion.",
          ),
        );
      const body = el("div", "marginalia-markdown");
      root.append(body);
      const renderStarted=performance.now();
      await MarkdownRenderer.render(
        this.app,
        e.draft,
        body,
        e.entry,
        component,
      );
      this.plugin.timings.rendering+=performance.now()-renderStarted;
      if(this.renderComponent===component)bindOriginalLinks(body,component,path=>this.plugin.source(path));
      const d = el("details", "marginalia-sources");
      d.append(
        el("summary", "", `Sources consulted (${e.sources.length})`),
        el(
          "p",
          "marginalia-muted",
          "Consulted sources do not verify every generated sentence.",
        ),
      );
      for (const source of e.sources)
        d.append(
          button(
            source.path,
            () => this.plugin.source(source.path),
            "marginalia-source-link",
          ),
        );
      if (e.omitted)
        d.append(
          el(
            "p",
            "marginalia-muted",
            `${e.omitted} passages omitted for context.`,
          ),
        );
      for (const material of e.material) {
        const quote = el("blockquote", "", material.unit.excerpt);
        d.append(el("p", "marginalia-muted", material.unit.notePath), quote);
      }
      root.append(d);
    } catch (error) {
      this.lastRenderKey="";
      if (revision === this.revision)
        root.replaceChildren(
          el(
            "p",
            "marginalia-error",
            error instanceof Error ? error.message : String(error),
          ),
        );
    }
  }
}
class ReferencePicker extends FuzzySuggestModal<TFile> {
  choose: (file: TFile) => void;
  constructor(app: App, choose: (file: TFile) => void) {
    super(app);
    this.choose = choose;
    this.setPlaceholder("Choose an original reference note");
  }
  getItems() {
    return this.app.vault.getMarkdownFiles().filter((f) => permitted(f.path));
  }
  getItemText(file: TFile) {
    return file.path;
  }
  onChooseItem(file: TFile) {
    this.choose(file);
  }
}
class LibrarianFeature extends Plugin {
  constructor(public owner: Marginalia) {
    super(owner.app, owner.manifest);
  }
  onload() {
    this.owner.registerLibrarian(this);
  }
}
class ScriptFeature extends Plugin {
  get workspaceSettings(){return this.owner.workspaceSettings;}
  get refreshWritingFocus() { return this.owner.refreshWritingFocus; }
  set refreshWritingFocus(value: (() => void) | undefined) { this.owner.refreshWritingFocus = value; }
  constructor(public owner: Marginalia) {
    super(owner.app, owner.manifest);
  }
  get writing() {
    return this.owner.writing;
  }
  get scriptOrders() {
    return this.owner.scriptOrders;
  }
  set scriptOrders(value: ScriptOrders) {
    this.owner.scriptOrders = value;
  }
  get scriptController() {
    return this.owner.scriptController;
  }
  set scriptController(
    value: import("./scripts/controller.ts").ScriptController | undefined,
  ) {
    this.owner.scriptController = value;
  }
  savePluginData() {
    return this.owner.savePluginData();
  }
  onload() {
    registerScripts(this);
  }
}
class MarginaliaSettings extends PluginSettingTab {
  plugin: Marginalia;
  constructor(app: App, plugin: Marginalia) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const root = this.containerEl;
    root.replaceChildren();
    const p = this.plugin;
    root.ownerDocument.body.classList.toggle(
      "marginalia-theme",
      p.workspaceSettings.modules.theme && p.workspaceSettings.colors,
    );
    root.append(el("h2", "", "Marginalia"));
    for (const [key, label] of [
      ["theme", "Theme"],
      ["scripts", "Scripts"],
      ["librarian", "Librarian"],
    ] as const) {
      const section = el("details", "marginalia-settings-section");
      section.open = true;
      section.append(el("summary", "", label));
      root.append(section);
      if (key === "librarian" && Platform.isMobile) {
        section.append(el("p", "marginalia-muted", MOBILE_LIBRARIAN_MESSAGE));
        continue;
      }
      new Setting(section)
        .setName(`Enable ${label}`)
        .setDesc(
          key === "theme"
            ? "App colors, navigation and vault pages."
            : key === "scripts"
              ? "Script Studio, typing shortcuts and writing tools."
              : "Local AI sidebar, enhancement and expansion.",
        )
        .addToggle((toggle) =>
          toggle
            .setValue(p.workspaceSettings.modules[key])
            .onChange(async (value) => {
              try {
                await p.setModule(key, value);
              } catch {
                new Notice(
                  "Could not save module settings. The feature state is unchanged.",
                );
              }
              this.display();
            }),
        );
      const body = el(
        "fieldset",
        "marginalia-settings-body",
      ) as HTMLFieldSetElement;
      body.disabled = !p.workspaceSettings.modules[key];
      section.append(body);
      if (key === "theme") {
        new Setting(body)
          .setName("Vault type")
          .setDesc(
            "Changes navigation and project organization for this vault.",
          )
          .addDropdown((drop) =>
            drop
              .addOption("World", "World")
              .addOption("Storyboard", "Storyboard")
              .setValue(p.workspaceSettings.vaultType)
              .onChange(async (value) => {
                const oldDefault = defaultEntrySetup(p.workspaceSettings.vaultType === "Storyboard").projectsFolder;
                if (p.workspaceSettings.entrySetup.projectsFolder === oldDefault)
                  p.workspaceSettings.entrySetup.projectsFolder = defaultEntrySetup(value === "Storyboard").projectsFolder;
                p.workspaceSettings.vaultType =
                  value === "Storyboard" ? "Storyboard" : "World";
                await p.savePluginData();
                p.applyModules();
                this.display();
              }),
          );
        new Setting(body).setName("Vault setup").setDesc("Advanced: configure canon types, destination folders and templates for this vault.")
          .addButton(button=>button.setButtonText("Configure vault…").onClick(()=>new VaultSetupModal(p).open()));
        new Setting(body).setName("Project Register Base")
          .setDesc("Select the Base whose first view supplies the app-style Project Register. Leave unassigned to use all discovered projects.")
          .addButton(button => button.setButtonText("Choose Base…").onClick(() => new ProjectRegisterModal(p).open()));
        new Setting(body)
          .setName("Project Status Flow field")
          .setDesc(
            "The note property used for status in Storyboard Projects and Project Register. Defaults to stage.",
          )
          .addText((input) => {
            suggest(input.inputEl,()=>propertyNames(p.app));
            input
              .setPlaceholder("stage")
              .setValue(p.workspaceSettings.projectStatusField)
              .onChange(async (value) => {
                p.workspaceSettings.projectStatusField =
                  value.trim() || "stage";
                await p.savePluginData();
                p.themeFeature?.refresh();
              });
          });
        new Setting(body)
          .setName("Project Status Flow order")
          .setDesc(
            "One status per line, in display order. Use the exact values in your notes. Other existing statuses appear afterward; empty values appear under Unassigned. This does not rename note properties or values.",
          )
          .addTextArea((input) => {
            input
              .setValue(p.workspaceSettings.projectStatusOrder.join("\n"))
              .onChange(async (value) => {
                p.workspaceSettings.projectStatusOrder = readStatusOrder(value);
                await p.savePluginData();
                p.themeFeature?.refresh();
              });
          });
        new Setting(body)
          .setName("App colors")
          .setDesc(
            "Marginalia’s parchment/copper light palette and charcoal/copper dark palette. Follows Obsidian’s light/dark mode.",
          )
          .addToggle((toggle) =>
            toggle
              .setValue(p.workspaceSettings.colors)
              .onChange(async (value) => {
                p.workspaceSettings.colors = value;
                await p.savePluginData();
                p.themeFeature?.refresh();
                this.display();
              }),
          );
        new Setting(body)
          .setName("App navigation")
          .setDesc("Place Marginalia pages above the native vault file viewer.")
          .addToggle((toggle) =>
            toggle
              .setValue(p.workspaceSettings.navigation)
              .onChange(async (value) => {
                p.workspaceSettings.navigation = value;
                await p.savePluginData();
                p.themeFeature?.refresh();
              }),
          );
        body.append(el("h3", "", "Hidden folders"));
        new Setting(body)
          .setName("Hide from menu")
          .setDesc("All top-level folders with an _ prefix appear in the Marginalia menu except those listed here. Enter one full folder name per line, for example _Assets. This only hides menu sections; it does not hide files in Obsidian’s file viewer.")
          .addTextArea(input => input
            .setValue(p.workspaceSettings.hiddenFolders.join("\n"))
            .onChange(async value => {
              p.workspaceSettings.hiddenFolders = readHiddenFolders(value);
              await p.savePluginData();
              p.themeFeature?.refresh();
            }));
      } else if (key === "scripts") renderWritingSettings(body, p);
      else this.renderLibrarian(body);
    }
    renderTimelineSettings(root, p, () => this.display());
  }
  renderLibrarian(root: HTMLElement) {
    const p = this.plugin;
    new Setting(root).setName("Librarian sidebar").setDesc("Open the Librarian in the right sidebar. Also available through the note-header lantern or the Open Librarian command.")
      .addButton(button => button.setButtonText("Open Librarian").onClick(() => { void p.openLibrarian(); }));
    root.append(el("h3", "", "Local AI"));
    new Setting(root)
      .setName("Ollama address")
      .setDesc("Local desktop server. No cloud endpoints or redirects.")
      .addText((input) =>
        input.setValue(p.settings.endpoint).onChange(async (value) => {
          try {
            localEndpoint(value);
            p.settings.endpoint = value;
            await p.savePluginData();
          } catch {
            /* Keep the last valid endpoint while the field is being edited. */
          }
        }),
      );
    const status = el(
      "p",
      "marginalia-muted",
      "Select an installed local model. Models are never downloaded automatically.",
    );
    root.append(status);
    const modelsSetting = new Setting(root).setName("Model");
    modelsSetting.addDropdown((drop) => {
      drop.addOption("", "Choose a local model");
      if (p.settings.model) drop.addOption(p.settings.model, p.settings.model);
      drop.setValue(p.settings.model);
      drop.onChange(async (value) => {
        p.settings.model = value;
        await p.savePluginData();
        await p.checkConnection().catch(() => {});
      });
      if (p.workspaceSettings.modules.librarian)
        void p
          .checkConnection()
          .then((models) => {
            for (const name of models) drop.addOption(name, name);
            drop.setValue(p.settings.model);
            status.textContent = models.length
              ? "Local models available."
              : "No local models found. Install one in Ollama, then refresh.";
          })
          .catch((e) => (status.textContent = e.message));
    });
    new Setting(root)
      .setName("Refresh models")
      .addButton((b) =>
        b.setButtonText("Refresh").onClick(() => this.display()),
      );
    new Setting(root)
      .setName("Context window")
      .setDesc(
        "Requested tokens. Start with 32768; larger windows use more memory.",
      )
      .addDropdown((drop) => {
        for (const value of [16384, 32768, 65536, 131072])
          drop.addOption(String(value), value.toLocaleString());
        drop.setValue(String(p.settings.context)).onChange(async (value) => {
          p.settings.context = Number(value);
          await p.savePluginData();
        });
      });
  }
}
