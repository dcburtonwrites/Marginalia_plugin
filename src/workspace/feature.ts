import {
  Plugin,
  Platform,
  Notice,
  Component,
  ItemView,
  type TAbstractFile,
  TFolder,
  type WorkspaceLeaf,
  type App,
  setIcon,
} from "obsidian";
import type Marginalia from "../main.ts";
import { el, button } from "../ui/sidebar.ts";
import { bodyOffset } from "../core/types.ts";
import {registerBaseSource, mountRegisterSource, ProjectRegisterModal} from "./project-register.ts";
import { NewEntryModal } from "./creation.ts";
import { suggest } from "../ui/suggest.ts";
import {
  eligible,
  navigation,
  sharedFolders,
  sharedEntry,
  sectionName,
  entryType,
  projects,
  projectStatuses,
  projectStatusTabs,
  canon,
  preview,
  values,
  field,
  entryTypes,
  type Entry,
  type Project,
} from "./model.ts";
export const PAGES = "marginalia-pages";
function folderPaths(app: App) {
  return app.vault
    .getAllLoadedFiles()
    .filter((file) => file instanceof TFolder)
    .map((file) => file.path);
}
export class WorkspaceFeature extends Plugin {
  navs = new Set<HTMLElement>();
  alive = true;
  baseSourceAvailable = false;
  constructor(public owner: Marginalia) {
    super(owner.app, owner.manifest);
  }
  onload() {
    this.alive = true;
    this.baseSourceAvailable = registerBaseSource(this);
    this.register(() => {
      this.alive = false;
    });
    this.registerView(PAGES, (leaf) => new AppPage(leaf, this.owner));
    this.addCommand({
      id: "open-home",
      name: "Open Home",
      callback: () => void openPage(this.owner, "Home"),
    });
    document.body.classList.toggle(
      "marginalia-theme",
      this.owner.workspaceSettings.colors,
    );
    this.register(() => {
      document.body.classList.remove("marginalia-theme");
      for (const nav of this.navs) nav.remove();
      this.navs.clear();
    });
    let scheduled = false;
    const mount = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        if (this.alive && this.owner.workspaceSettings.modules.theme)
          this.mount();
      });
    };
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    this.register(() => observer.disconnect());
    this.registerEvent(this.app.workspace.on("layout-change", mount));
    const structureChanged = (file: TAbstractFile) => {
      if (file instanceof TFolder) this.refresh();
      else this.redraw();
    };
    this.registerEvent(this.app.vault.on("create", structureChanged));
    this.registerEvent(this.app.vault.on("modify", () => this.redraw()));
    this.registerEvent(this.app.vault.on("delete", structureChanged));
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (file instanceof TFolder) {
          for (const leaf of this.app.workspace.getLeavesOfType(PAGES))
            if (leaf.view instanceof AppPage && leaf.view.section === oldPath)
              leaf.view.section = file.path;
        }
        const selected = this.owner.workspaceSettings.projectRegisterBase;
        if (selected === oldPath || file instanceof TFolder && selected.startsWith(oldPath + "/")) {
          this.owner.workspaceSettings.projectRegisterBase = file.path + selected.slice(oldPath.length);
          void this.owner.savePluginData().catch(() => new Notice("Could not save the renamed Project Register Base path."));
        }
        structureChanged(file);
      }),
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", () => this.redraw()),
    );
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (file && eligible(file.path)) {
          const settings = this.owner.workspaceSettings;
          settings.recents = [
            file.path,
            ...settings.recents.filter((p) => p !== file.path),
          ].slice(0, 30);
          void this.owner.savePluginData();
        }
        this.redraw();
      }),
    );
    this.app.workspace.onLayoutReady(mount);
  }
  redraw() {
    for (const leaf of this.app.workspace.getLeavesOfType(PAGES))
      if (leaf.view instanceof AppPage) void leaf.view.draw();
  }
  mount() {
    if (!this.alive) return;
    if (!this.owner.workspaceSettings.navigation) {
      for (const nav of this.navs) nav.remove();
      this.navs.clear();
      return;
    }
    for (const leaf of this.app.workspace.getLeavesOfType("file-explorer")) {
      const host =
        leaf.view.containerEl.querySelector<HTMLElement>(".nav-header")
          ?.parentElement ??
        leaf.view.containerEl.querySelector<HTMLElement>(".view-content");
      if (!host) continue;
      const sections = navigation(this.owner.workspaceSettings.vaultType,
        this.owner.workspaceSettings.modules.scripts, folderPaths(this.app), this.owner.workspaceSettings.hiddenFolders);
      const signature = JSON.stringify(sections);
      const existing = host.querySelector<HTMLElement>(".marginalia-app-navigation");
      if (existing?.dataset.sections === signature) continue;
      if (existing) {existing.remove();this.navs.delete(existing);}

      const nav = el("nav", "marginalia-app-navigation");
      nav.setAttribute("aria-label", "Marginalia navigation");
      nav.dataset.sections = signature;
      nav.append(el("div", "marginalia-nav-title", "Marginalia"));
      let sharedStarted = false;
      for (const name of sections) {
        if (name.startsWith("_") && !sharedStarted) {
          const divider = el("hr", "marginalia-nav-divider");divider.setAttribute("role", "separator");nav.append(divider);sharedStarted = true;
        }
        const item = button(
          sectionName(name),
          () => void openPage(this.owner, name),
          "marginalia-app-nav-item",
        );
        item.dataset.section = name;
        const icon = el("span");
        icon.setAttribute("aria-hidden", "true");
        setIcon(
          icon,
          (
            {
              Home: "house",
              Brainstorms: "pencil",
              Canon: "book-open",
              Projects: "folder",
              "Project Register": "table",
              "Script Studio": "marginalia-m",
              Crypt: "archive",
              Research: "library",
              Collections: "folders",
            } as Record<string, string>
          )[sectionName(name)] ?? "folder",
        );
        item.prepend(icon);
        nav.append(item);
      }
      host.prepend(nav);
      this.navs.add(nav);
    }
  }
  markActive(section: string) {
    for (const nav of this.navs)
      for (const item of nav.querySelectorAll<HTMLButtonElement>("button")) {
        const active = item.dataset.section === section;
        item.classList.toggle("is-active", active);
        if (active) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
      }
  }
  refresh() {
    document.body.classList.toggle(
      "marginalia-theme",
      this.owner.workspaceSettings.colors,
    );
    for (const nav of this.navs) nav.remove();
    this.navs.clear();
    this.mount();
    this.redraw();
  }
}
export async function openPage(
  owner: Marginalia,
  section: string,
  project?: string,
) {
  owner.themeFeature?.markActive(section);
  if (section === "Script Studio") {
    if (owner.workspaceSettings.modules.scripts)
      await owner.scriptController?.openStudio();
    return;
  }
  if (!owner.workspaceSettings.modules.theme) return;
  const leaf =
    owner.app.workspace.getLeavesOfType(PAGES)[0] ??
    owner.app.workspace.getLeaf("tab");
  await leaf.setViewState({
    type: PAGES,
    state: { section, project },
    active: true,
  });
  await owner.app.workspace.revealLeaf(leaf);
  if (Platform.isMobile) owner.app.workspace.leftSplit.collapse();
}
export class AppPage extends ItemView {
  section = "Home";
  project?: string;
  tab = "All Entries";
  query = "";
  sort = "title";
  includeProjects = true;
  editingPins = false;
  revision = 0;
  closed = false;
  registerSource?: Component;
  registerFilters = {status:"",genre:"",tag:"",format:""};
  constructor(
    leaf: WorkspaceLeaf,
    public owner: Marginalia,
  ) {
    super(leaf);
  }
  getViewType() {
    return PAGES;
  }
  getDisplayText() {
    return this.project?.split("/").at(-1) ?? sectionName(this.section);
  }
  getIcon() {
    return "marginalia-m";
  }
  getState() {
    return {
      section: this.section,
      project: this.project,
      tab: this.tab,
      query: this.query,
      sort: this.sort,
      includeProjects: this.includeProjects,
    };
  }
  async setState(state: Record<string, unknown>, result: { history: boolean }) {
    if (state.section !== this.section || state.project !== this.project) this.editingPins = false;
    this.section = typeof state.section === "string" ? state.section : "Home";
    this.project =
      typeof state.project === "string" ? state.project : undefined;
    this.tab = typeof state.tab === "string" ? state.tab : "All Entries";
    this.query = typeof state.query === "string" ? state.query : "";
    this.sort = typeof state.sort === "string" ? state.sort : "title";
    this.includeProjects = state.includeProjects !== false;
    await super.setState(state, result);
    await this.draw();
  }
  async onOpen() {
    this.closed = false;
    await this.draw();
  }
  async onClose() {
    this.closed = true;
    this.registerSource?.unload();this.registerSource=undefined;
    this.revision++;
  }
  async entries() {
    return (
      await Promise.all(
        this.app.vault
          .getMarkdownFiles()
          .filter((f) => eligible(f.path) || sharedEntry(f.path, this.section, this.owner.workspaceSettings.hiddenFolders))
          .map(async (file) => {
            const fields =
              this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
            const text =
              this.owner.activeText(file) ??
              (await this.app.vault.cachedRead(file));
            const tags = [
              ...values(fields.tags),
              ...(this.app.metadataCache.getFileCache(file)?.tags ?? []).map(
                (t) => t.tag,
              ),
            ].map((t) => t.replace(/^#/, ""));
            return {
              path: file.path,
              name:
                typeof fields.Title === "string"
                  ? fields.Title
                  : typeof fields.title === "string"
                    ? fields.title
                    : file.basename,
              body: text.slice(bodyOffset(text)),
              modified: file.stat.mtime,
              created: file.stat.ctime,
              fields,
              tags,
              type: entryType(file.path, tags, this.owner.workspaceSettings.canonTypes),
            } satisfies Entry;
          }),
      )
    ).sort((a, b) => a.name.localeCompare(b.name));
  }
  card(entry: Entry) {
    const card = button(
      "",
      () => void this.app.workspace.openLinkText(entry.path, "", false),
      "marginalia-entry-card",
    );
    if (entry.type) card.dataset.category = entry.type.toLowerCase();
    card.append(
      el("span", "marginalia-card-title", entry.name),
      el(
        "span",
        "marginalia-card-category",
        entry.type ??
          (entry.path.includes("/Scripts/") ||
          entry.fields.role === "manuscript"
            ? "Script"
            : entry.tags.includes("project-parent")
              ? "Project"
              : "Note"),
      ),
      el(
        "span",
        "marginalia-card-preview",
        preview(entry.body) || "No content yet.",
      ),
    );
    card.title = entry.path;
    return card;
  }
  grid(root: HTMLElement, entries: Entry[], rows = false) {
    const grid = el(
      "div",
      rows ? "marginalia-entry-grid is-rows" : "marginalia-entry-grid",
    );
    for (const entry of entries) grid.append(this.card(entry));
    root.append(grid);
    if (!entries.length)
      root.append(el("p", "marginalia-muted", "No entries in this view yet."));
  }
  tabs(root: HTMLElement, names: string[]) {
    if (!names.includes(this.tab)) this.tab = names[0];
    const list = el("div", "marginalia-page-tabs");
    list.setAttribute("role", "tablist");
    list.setAttribute("aria-label", `${sectionName(this.section)} categories`);
    for (const name of names) {
      const item = button(name, () => {
        this.tab = name;
        void this.draw();
      });
      item.setAttribute("role", "tab");
      item.setAttribute("aria-selected", String(name === this.tab));
      list.append(item);
    }
    root.append(list);
  }
  async draw() {
    const revision = ++this.revision;
    try {
      const entries = await this.entries();
      if (this.closed || revision !== this.revision) return;
      const root = this.contentEl;
      const focused = (document.activeElement as HTMLElement)?.dataset
        .pageControl;
      const selection =
        focused && document.activeElement instanceof HTMLInputElement
          ? document.activeElement.selectionStart
          : null;
      this.registerSource?.unload();this.registerSource=undefined;
      root.replaceChildren();
      root.className = "view-content marginalia-app-page";
      const page = el("div", "marginalia-page-inner");
      root.append(page);
      const type = this.owner.workspaceSettings.vaultType;
      const folders = folderPaths(this.app);
      const legacy = sharedFolders(folders, this.owner.workspaceSettings.hiddenFolders).find(
        (path) => sectionName(path) === this.section,
      );
      if (legacy) this.section = legacy;
      if (!navigation(type, true, folders, this.owner.workspaceSettings.hiddenFolders).includes(this.section)) {
        this.section = "Home";
        this.project = undefined;
        this.tab = "All Entries";
      }
      this.owner.themeFeature?.markActive(this.section);
      const allProjects = projects(entries, type, folders, this.owner.workspaceSettings);
      if (this.project && !allProjects.some((p) => p.path === this.project)) {
        this.project = undefined;
        this.tab = "All Entries";
      }
      const project = this.project
        ? allProjects.find((p) => p.path === this.project)
        : undefined;
      const nativeTitle =
        this.containerEl?.querySelector<HTMLElement>(".view-header-title");
      if (nativeTitle)
        nativeTitle.textContent = project?.name ?? sectionName(this.section);
      const header = el("header", "marginalia-page-heading");
      header.append(
        el(
          "h1",
          "",
          project?.name ??
            (this.section === "Home"
              ? this.app.vault.getName()
              : sectionName(this.section)),
        ),
      );
      page.append(header);
      header.append(button("New Entry", () => new NewEntryModal(this.owner,this.section,this.project).open(), "marginalia-new-entry"));
      if (this.section === "Project Register") {
        header.classList.add("marginalia-register-heading");
        header.append(button("Choose Base…", () => new ProjectRegisterModal(this.owner,
          () => openPage(this.owner, "Project Register")).open()));

      }
      if (this.section === "Home") {
        this.home(page, entries, allProjects);
        return;
      }
      if (this.section === "Project Register" && !project) {
        page.append(el("p", "marginalia-muted", "Your projects, their next steps, and the work in front of you."));
        const results=el("section", "marginalia-register-results");page.append(results);
        const render=(items:Project[])=>{if(!this.closed&&revision===this.revision)this.registerPage(results,items);};
        if (!this.owner.workspaceSettings.projectRegisterBase) render(allProjects);
        else {
          results.append(el("p", "marginalia-muted", "Loading projects from the assigned Base…"));
          const engine=el("div", "marginalia-register-source-engine");engine.setAttribute("aria-hidden","true");page.append(engine);
          const component=new Component();this.registerSource=component;component.load();
          const pending=window.setTimeout(()=>{if(!this.closed&&revision===this.revision)results.replaceChildren(el("p","marginalia-script-warning","The Base could not supply project records. Check that Bases is enabled and the assigned Base’s first view loads correctly."));},6000);
          component.register(()=>window.clearTimeout(pending));
          const byOverview=new Map(allProjects.filter(p=>p.overview).map(p=>[p.overview!.path,p]));
          try {await mountRegisterSource(this.owner,engine,component,paths=>{window.clearTimeout(pending);render([...paths].flatMap(path=>byOverview.has(path)?[byOverview.get(path)!]:[]));});}
          catch(error) {window.clearTimeout(pending);if(revision===this.revision)results.replaceChildren(el("p","marginalia-script-warning",String(error instanceof Error?error.message:error)));}
        }
        return;
      }
      const search = el("input", "marginalia-page-search") as HTMLInputElement;
      search.type = "search";
      search.placeholder = "Find an entry…";
      search.setAttribute("aria-label", "Find an entry");
      search.dataset.pageControl = "search";
      search.value = this.query;
      search.oninput = () => {
        this.query = search.value;
        void this.draw();
      };
      header.append(search);
      const sort = el("select") as HTMLSelectElement;
      sort.setAttribute("aria-label", "Sort by");
      for (const [value, label] of [
        ["title", "Title A–Z"],
        ["modified", "Edited newest first"],
        ["created", "Created newest first"],
      ]) {
        const o = el("option", "", label) as HTMLOptionElement;
        o.value = value;
        sort.append(o);
      }
      sort.value = this.sort;
      sort.onchange = () => {
        this.sort = sort.value;
        void this.draw();
      };
      header.append(sort);
      const sorted = (items: Entry[]) =>
        items
          .filter((e) =>
            (e.name + " " + e.body)
              .toLowerCase()
              .includes(this.query.toLowerCase()),
          )
          .sort((a, b) =>
            this.sort === "title"
              ? a.name.localeCompare(b.name)
              : this.sort === "modified"
                ? b.modified - a.modified
                : b.created - a.created,
          );
      if (project) {
        this.projectPage(page, project, sorted);
      } else if (
        this.section === "Projects" ||
        this.section === "Project Register"
      ) {
        this.projectList(page, allProjects);
      } else {
        let items: Entry[] = [];
        if (this.section === "Canon") {
          const label = el("label", "marginalia-include-projects");
          const check = el("input") as HTMLInputElement;
          check.type = "checkbox";
          check.checked = this.includeProjects;
          check.onchange = () => {
            this.includeProjects = check.checked;
            void this.draw();
          };
          label.append(
            check,
            document.createTextNode("Include project entries"),
          );
          page.append(label);
          items = canon(entries, this.includeProjects, this.owner.workspaceSettings);
          this.tabs(page, ["All Entries", ...this.owner.workspaceSettings.canonTypes.map(type=>type.name)]);
          if (this.tab !== "All Entries")
            items = items.filter((e) => e.type === this.tab);
        } else {
          const prefix =
            this.section === "Brainstorms"
              ? this.owner.workspaceSettings.entrySetup.brainstorm.folder === "/" ? "" : this.owner.workspaceSettings.entrySetup.brainstorm.folder.replace(/\/$/,"") + "/"
              : `${this.section}/`;
          items = entries.filter((e) => this.section === "Brainstorms"
            ? e.tags.includes("brainstorm") || (!!prefix && e.path.startsWith(prefix))
            : e.path.startsWith(prefix));
          const relative = (entry: Entry) => prefix && entry.path.startsWith(prefix) ? entry.path.slice(prefix.length) : entry.name + ".md";
          const folders = [
            ...new Set(
              items.map((e) =>
                relative(e).includes("/")
                  ? relative(e).split("/")[0]
                  : "Uncategorized",
              ),
            ),
          ].sort();
          this.tabs(page, ["All Entries", ...folders]);
          if (this.tab !== "All Entries")
            items = items.filter(
              (e) =>
                (relative(e).includes("/")
                  ? relative(e).split("/")[0]
                  : "Uncategorized") === this.tab,
            );
        }
        this.grid(page, sorted(items), this.section === "Brainstorms");
      }
      if (focused) {
        const input = root.querySelector<HTMLInputElement>(
          `[data-page-control="${focused}"]`,
        );
        input?.focus();
        if (selection !== null) input?.setSelectionRange(selection, selection);
      }
    } catch (error) {
      if (!this.closed && revision === this.revision)
        this.contentEl.replaceChildren(
          el(
            "p",
            "marginalia-script-warning",
            `Could not load page. ${String(error)}`,
          ),
        );
    }
  }
  home(root: HTMLElement, entries: Entry[], allProjects: Project[]) {
    root.append(
      el(
        "p",
        "marginalia-home-intro",
        "Your writing, references and ideas, close at hand.",
      ),
    );
    const recents = this.owner.workspaceSettings.recents.flatMap((path) =>
      entries.filter((e) => e.path === path),
    );
    const latest =
      recents[0] ?? [...entries].sort((a, b) => b.modified - a.modified)[0];
    const desk = el("div", "marginalia-home-desk");
    const continuing = el("section", "marginalia-continue");
    continuing.append(el("h2", "", "Continue Writing"));
    if (latest) {
      continuing.append(this.card(latest));
    } else continuing.append(el("p", "", "Open a note to begin."));
    desk.append(continuing);
    const pins = el("section", "marginalia-home-pins");
    const pinsHeader = el("div", "marginalia-pins-heading");
    pinsHeader.append(
      el(
        "h2",
        "",
        this.owner.workspaceSettings.vaultType === "Storyboard"
          ? "Pinned Projects"
          : "Pinned References",
      ),
    );
    const editor = el("div", "marginalia-pin-editor");
    editor.hidden = !this.editingPins;
    const edit = button(this.editingPins ? "Done" : "Edit", () => {
      this.editingPins = !this.editingPins;
      void this.draw().then(() => {
        this.contentEl.querySelector<HTMLElement>(this.editingPins ? ".marginalia-pin-editor input" : ".marginalia-pin-edit")?.focus();
      });
    }, "marginalia-pin-edit");
    edit.setAttribute("aria-label", this.editingPins ? "Finish editing pinned references" : "Edit pinned references");
    edit.setAttribute("aria-expanded", String(this.editingPins));
    pinsHeader.append(edit);
    pins.append(pinsHeader);
    const pinned = entries.filter((e) =>
      this.owner.workspaceSettings.pins.includes(e.path),
    );
    for (const entry of pinned) {
      const row = el("div", "marginalia-pin-row");
      row.append(this.card(entry));
      if (this.editingPins) row.append(
        button("Unpin", () => {
          this.owner.workspaceSettings.pins =
            this.owner.workspaceSettings.pins.filter((p) => p !== entry.path);
          void this.owner.savePluginData().then(() => this.draw());
        }),
      );
      pins.append(row);
    }
    const choose = el("input", "marginalia-page-search");
    choose.type = "search";
    choose.setAttribute("aria-label", "Pin a reference");
    choose.placeholder="Type a note name or path…";
    const selectorLabel = el("label", "marginalia-pin-selector");
    selectorLabel.append(el("span", "", this.owner.workspaceSettings.vaultType === "Storyboard" ? "Select a project" : "Select a reference"), choose);
    editor.append(selectorLabel);
    pins.append(editor);
    const choices = this.owner.workspaceSettings.vaultType === "Storyboard"
      ? allProjects.flatMap((p) => (p.overview ? [p.overview] : []))
      : entries;
    suggest(choose,()=>choices.filter(entry=>!this.owner.workspaceSettings.pins.includes(entry.path)).map(entry=>entry.path));
    const pin = () => {
      if (choose.value && choices.some((e) => e.path === choose.value)) {
        this.owner.workspaceSettings.pins = [
          ...new Set([...this.owner.workspaceSettings.pins, choose.value]),
        ];
        void this.owner.savePluginData().then(() => this.draw());
      }
    };
    choose.onchange=pin;
    choose.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();pin();}});
    desk.append(pins);
    root.append(desk);
    root.append(el("h2", "", "Recently Opened"));
    this.grid(
      root,
      (recents.length
        ? recents
        : [...entries].sort((a, b) => b.modified - a.modified)
      ).slice(0, 6),
    );
    root.append(el("h2", "", "Projects"));
    for (const project of allProjects)
      root.append(
        button(
          project.name,
          () => void openPage(this.owner, "Projects", project.path),
          "marginalia-project-link",
        ),
      );
  }
  registerPage(root:HTMLElement, items:Project[]) {
    root.replaceChildren();
    const working=(p:Project)=>values(field(p.overview,"working-document")??field(p.overview,"current-script"))[0]??"";
    const next=(p:Project)=>values(field(p.overview,"next-action")??field(p.overview,"next action")).join("; ");
    const resolved=(p:Project)=>{const target=working(p).replace(/^\[\[|\]\]$/g,"").split("|")[0];return target?this.app.metadataCache.getFirstLinkpathDest(target,p.overview?.path??""):null;};
    const summary=el("div","marginalia-register-summary");summary.setAttribute("aria-label","Vault project summary");
    for(const [count,label] of [[items.length,"Projects"],[items.filter(p=>resolved(p)).length,"Working documents"],[items.filter(p=>!projectStatuses(p.overview,this.owner.workspaceSettings).length||!next(p)||next(p)==="Review project boundaries, stage, and current writing document").length,"Needs review"]] as const){const stat=el("div");stat.append(el("strong","",String(count)),el("span","",label));summary.append(stat);}root.append(summary);
    const filters=el("div","marginalia-register-filters");
    for(const [key,label,all] of [["status","Status","All statuses"],["genre","Genre","All genres"],["tag","Tag","All tags"],["format","Format","All formats"]] as const){
      const options=key==="status"?projectStatusTabs(items,this.owner.workspaceSettings).filter(v=>!["All Entries","Unassigned"].includes(v)):[...new Set(items.flatMap(p=>key==="tag"?p.overview?.tags.filter(t=>!["project-parent","project","storyboard"].includes(t))??[]:values(field(p.overview,key))))].sort();
      const wrapper=el("label","",label+" "),select=el("select") as HTMLSelectElement;select.setAttribute("aria-label","Filter by "+key);
      for(const [value,text] of [["",all],...options.map(v=>[v,v]),...(key==="status"?[["__unassigned","Unassigned"]]:[])]){const option=el("option","",text) as HTMLOptionElement;option.value=value;select.append(option);}
      select.value=this.registerFilters[key];select.onchange=()=>{this.registerFilters[key]=select.value;this.registerPage(root,items);root.querySelector<HTMLSelectElement>(`[aria-label="Filter by ${key}"]`)?.focus();};wrapper.append(select);filters.append(wrapper);
    }root.append(filters);
    const filtered=items.filter(p=>Object.entries(this.registerFilters).every(([key,value])=>!value||(key==="status"?(value==="__unassigned"?!projectStatuses(p.overview,this.owner.workspaceSettings).length:projectStatuses(p.overview,this.owner.workspaceSettings).includes(value)):key==="tag"?p.overview?.tags.includes(value):values(field(p.overview,key)).includes(value))));
    const count=el("p","marginalia-muted",`${filtered.length} of ${items.length} projects`);count.setAttribute("role","status");root.append(count);
    this.registerTable(root,filtered);
    if(!filtered.length)root.append(el("p","marginalia-muted",items.length?"No projects match these filters.":"No projects in this register yet."));
    root.append(el("footer","marginalia-register-source marginalia-muted",this.owner.workspaceSettings.projectRegisterBase?`Source: ${this.owner.workspaceSettings.projectRegisterBase} · first view. Edit project Overviews to update metadata.`:"Source: project Overviews. Edit a project’s Overview to update its metadata."));
  }
  registerTable(root:HTMLElement,items:Project[]) {
      const table = el("table", "marginalia-project-register");
      table.setAttribute("aria-label", "Project metadata");
      const head = el("tr");
      for (const label of [
        "Project / genre",
        "Status",
        "Next action",
        "Working document",
      ])
        head.append(el("th", "", label));
      table.append(head);
      for (const project of items) {
        const row = el("tr");
        const name = el("td");
        name.append(
          button(
            project.name,
            () => void openPage(this.owner, "Projects", project.path),
          ),
          el("small", "", [...values(field(project.overview, "genre")),...values(field(project.overview,"format")),...(project.overview?.tags.includes("off-world")?["Off-World"]:[])].join(" · ")),
        );
        row.append(
          name,
          el(
            "td",
            "",
            projectStatuses(
              project.overview,
              this.owner.workspaceSettings,
            ).join(" · ") || "Unassigned",
          ),
          el(
            "td",
            "",
            values(
              field(project.overview, "next-action") ??
                field(project.overview, "next action"),
            ).join(" ") || "Not set",
          ),
        );
        const working = el("td");
        const link = values(
          field(project.overview, "working-document") ??
            field(project.overview, "current-script"),
        )[0];
        const target=link?.replace(/^\[\[|\]\]$/g,"").split("|")[0];
        const document=target?this.app.metadataCache.getFirstLinkpathDest(target.split("#")[0],project.overview?.path??""):null;
        if (link && document)
          working.append(
            button(
              link.includes("|")?link.replace(/\]\]$/,"").split("|")[1]:document.basename,
              () =>
                void this.app.workspace.openLinkText(
                  link.replace(/^\[\[|\]\]$/g, "").split("|")[0],
                  project.overview?.path ?? "",
                  false,
                ),
            ),
          );
        else working.textContent = link?"Document unavailable":"Not linked";
        row.append(working);
        table.append(row);
      }
      root.append(table);
  }
  projectList(root: HTMLElement, items: Project[]) {
    if (this.owner.workspaceSettings.vaultType === "Storyboard") {
      this.tabs(root, projectStatusTabs(items, this.owner.workspaceSettings));
      if (this.tab !== "All Entries")
        items = items.filter((p) => {
          const values_ = projectStatuses(
            p.overview,
            this.owner.workspaceSettings,
          );
          return this.tab === "Unassigned"
            ? !values_.length
            : values_.includes(this.tab);
        });
    }
    items = items
      .filter((p) =>
        (p.name + " " + preview(p.overview?.body ?? ""))
          .toLowerCase()
          .includes(this.query.toLowerCase()),
      )
      .sort((a, b) =>
        this.sort === "modified"
          ? (b.overview?.modified ?? 0) - (a.overview?.modified ?? 0)
          : this.sort === "created"
            ? (b.overview?.created ?? 0) - (a.overview?.created ?? 0)
            : a.name.localeCompare(b.name),
      );
      for (const project of items) {
        const card = button(
          "",
          () => void openPage(this.owner, "Projects", project.path),
          "marginalia-project-card",
        );
        card.append(
          el("span", "marginalia-card-title", project.name),
          el(
            "span",
            "marginalia-stage",
            projectStatuses(
              project.overview,
              this.owner.workspaceSettings,
            ).join(" · ") ||
              `${project.entries.length} ${project.entries.length === 1 ? "note" : "notes"}`,
          ),
        );
        root.append(card);
      }
    if (!items.length)
      root.append(el("p", "marginalia-muted", "No projects in this view yet."));
  }
  projectPage(
    root: HTMLElement,
    project: Project,
    sorted: (items: Entry[]) => Entry[],
  ) {
    root.append(
      button(
        "All projects",
        () => void openPage(this.owner, "Projects"),
        "marginalia-project-link",
      ),
    );
    const sections = [
      ...new Set(
        project.entries.map((e) => {
          const relative = e.path.slice(project.path.length + 1);
          return relative.includes("/") ? relative.split("/")[0] : "Overview";
        }),
      ),
    ].sort();
    this.tabs(root, ["All Entries", ...sections]);
    if (project.overview)
      root.append(
        button(
          "Open project overview",
          () =>
            void this.app.workspace.openLinkText(
              project.overview!.path,
              "",
              false,
            ),
          "marginalia-project-link",
        ),
      );
    if (this.owner.workspaceSettings.modules.scripts)
      root.append(
        button(
          "Write in Script Studio",
          () =>
            void this.owner.scriptController?.select({ scope: project.path }),
          "marginalia-project-link",
        ),
      );
    this.grid(
      root,
      sorted(
        project.entries.filter((e) => {
          const rel = e.path.slice(project.path.length + 1);
          return (
            this.tab === "All Entries" ||
            (rel.includes("/") ? rel.split("/")[0] : "Overview") === this.tab
          );
        }),
      ),
    );
  }
}
