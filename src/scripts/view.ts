import {
  ItemView,
  Platform,
  MarkdownView,
  Notice,
  TFile,
  TFolder,
  type Plugin,
  type WorkspaceLeaf,
  type Editor,
} from "obsidian";
import {hash} from "../core/types.ts";
import {OutlineDragging,type OutlineDrag} from "./drag.ts";
import {movePage,navigationOffset} from "./structure.ts";
import {commitShortcut} from "./shortcut-extension.ts";
import {editorViews} from "./folding.ts";
import { ScriptController, scriptMetadata } from "./controller.ts";
import { StudioView, STUDIO } from "./studio.ts";
import { createScriptShortcutExtension } from "./shortcut-extension.ts";
import { scriptFoldingExtension } from "./folding.ts";
import { renderSessionFooter } from "./session-ui.ts";
import { openNewScript } from "./creation.ts";
import { selectedGroups, clockLabel, type WritingData } from "./writing.ts";
import { ProjectView, PROJECT } from "./project.ts";
import { el, button } from "../ui/sidebar.ts";
import {
  parseScript,
  pageLabel, panelLabel,
  orderKey,
  reorderScript,
  renameOrders,
  insertBlock,
  movePanel,
  type Script,
  type ScriptEdit,
  type ScriptOrders,
  type ScriptGroup,
} from "./model.ts";
import { writingFocus } from "./focus.ts";
import { registerCompilation, openCompileOptions } from "./compile.ts";
import { registerScriptNumbering } from "./numbering.ts";
import { WritingHistoryModal } from "./history.ts";
export interface ScriptHost extends Plugin {
  refreshWritingFocus?: () => void;
  scriptOrders: ScriptOrders;
  writing: WritingData;
  workspaceSettings?: import("../workspace/model.ts").WorkspaceSettings;
  savePluginData(): Promise<void>;
  scriptController?: ScriptController;
}
export const SCRIPTS = "marginalia-scripts";

export function registerScripts(plugin: ScriptHost) {
  const focus = writingFocus(plugin);
  plugin.refreshWritingFocus = focus.refresh;
  plugin.register(() => { plugin.refreshWritingFocus = undefined; });
  plugin.registerEditorExtension([focus.extension, scriptFoldingExtension, createScriptShortcutExtension(plugin.app)]);
  const controller = (plugin.scriptController ??= new ScriptController(plugin));
  plugin.registerView(STUDIO, (leaf) => new StudioView(leaf, controller));
  plugin.registerView(PROJECT, (leaf) => new ProjectView(leaf, controller));
  plugin.registerView(SCRIPTS, (leaf) => new ScriptsView(leaf, plugin));
  registerScriptNumbering(controller);
  registerCompilation(controller);
  const open = () => controller.openStudio();
  plugin.addCommand({ id: "toggle-writing-focus", name: "Toggle focused writing", callback: () => {
    plugin.writing.preferences.focusMode = !plugin.writing.preferences.focusMode;
    focus.refresh();
    void plugin.savePluginData().catch(() => new Notice("Could not save focus preference."));
    new Notice(plugin.writing.preferences.focusMode ? "Focused writing enabled for script editors." : "Focused writing disabled.");
  } });
  plugin.addCommand({ id: "writing-history", name: "View writing history and progress", callback: () => new WritingHistoryModal(controller).open() });
  plugin.addRibbonIcon(
    "marginalia-m",
    "Open Script Studio",
    () => void controller.openStudio(),
  );
  plugin.addCommand({
    id: "open-scripts",
    name: "Open Scripts",
    callback: () => void open(),
  });
  plugin.addCommand({
    id: "open-script-studio",
    name: "Open Script Studio",
    callback: () => void controller.openStudio(),
  });
  const redraw = () => {
    for (const leaf of plugin.app.workspace.getLeavesOfType(SCRIPTS))
      if (leaf.view instanceof ScriptsView) void leaf.view.draw();
    for (const leaf of plugin.app.workspace.getLeavesOfType(STUDIO))
      if (leaf.view instanceof StudioView) void leaf.view.draw();
  };
  controller.onChange = redraw;
  plugin.registerEvent(plugin.app.workspace.on("file-menu", (menu, file) => {
    if (!(file instanceof TFolder)) return;
    menu.addItem(item => item.setTitle("Create a New Script").setIcon("file-plus")
      .onClick(() => openNewScript(controller, file.path)));
  }));
  let timerTicks = 0;
  plugin.registerInterval(
    window.setInterval(() => {
      const previousDate = controller.session.data.daily.date;
      if (controller.session.tick()) {
        new Notice("Writing session complete.");
        controller.saveSoon();
      }
      if (previousDate !== controller.session.data.daily.date)
        controller.saveSoon();
      if (++timerTicks % 30 === 0) void controller.flushWriting();
      for (const leaf of plugin.app.workspace.getLeavesOfType(SCRIPTS))
        if (leaf.view instanceof ScriptsView) leaf.view.drawFooter();
    }, 1000),
  );
  plugin.register(() => controller.close());
  for (const [id, name, operation] of [
    ["insert-script-page", "Script: insert page at end", "page"],
    [
      "insert-script-panel",
      "Script: insert panel after current panel",
      "panel",
    ],
    ["move-panel-up", "Script: move panel up", -1],
    ["move-panel-down", "Script: move panel down", 1],
    ["move-page-up","Script: move page up","page-up"],
    ["move-page-down","Script: move page down","page-down"],
    ["previous-page","Script: previous page","previous-page"],
    ["next-page","Script: next page","next-page"],
    ["previous-panel","Script: previous panel","previous-panel"],
    ["next-panel","Script: next panel","next-panel"],
  ] as const)
    plugin.addCommand({
      id,
      name,
      editorCheckCallback: (checking, editor, ctx) => {
        const file = ctx.file;
        if (
          !file ||
          !(ctx instanceof MarkdownView) ||
          ctx.getMode() !== "source"
        )
          return false;
        let script: Script | null;
        try {
          script = parseScript({
            path: file.path,
            text: editor.getValue(),
            metadata: scriptMetadata(editor.getValue()),
          });
        } catch {
          return false;
        }
        if (!script) return false;
        if (!checking) {
          try {
            if (editor.somethingSelected() && !["previous-page","next-page","previous-panel","next-panel"].includes(String(operation)))
              throw new Error(
                "Clear the selection before changing script structure.",
              );
            const offset = editor.posToOffset(editor.getCursor());
            if(operation==='previous-page'||operation==='next-page'||operation==='previous-panel'||operation==='next-panel'){
              const at=navigationOffset(script,offset,operation.endsWith('page')?'page':'panel',operation.startsWith('previous')?-1:1);
              if(at!==null){const pos=editor.offsetToPos(at);editor.setCursor(pos);editor.scrollIntoView({from:pos,to:pos},true);editor.focus();}
              return;
            }
            if(operation==='page-up'||operation==='page-down'){
              const edit=movePage(script,offset,operation==='page-up'?-1:1);if(edit)applyScriptEdit(editor,edit);return;
            }
            applyScriptEdit(
              editor,
              typeof operation === "number"
                ? movePanel(script, offset, operation)
                : insertBlock(script, offset, operation),
            );
          } catch (error) {
            new Notice(error instanceof Error ? error.message : String(error));
          }
        }
        return true;
      },
    });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running=false,again=false,stopped=false;
  const flush=async()=>{
    if(stopped)return;
    if(running){again=true;return;}
    running=true;
    try{do{
      again=false;
      try{await controller.fillMissing(await controller.groups());}
      catch(error){if(!stopped)console.warn("Marginalia script properties:",error);}
      if(stopped)return;
      redraw();
      await Promise.all(plugin.app.workspace.getLeavesOfType(PROJECT).map(leaf=>leaf.view instanceof ProjectView?leaf.view.draw():undefined));
    }while(again&&!stopped);}finally{running=false;}
  };
  const refresh = () => {if(stopped)return;clearTimeout(timer);timer=setTimeout(()=>void flush(),250);};
  plugin.app.workspace.onLayoutReady(
    () =>
      void controller
        .seedWords()
        .then(async () => {
          if (plugin.app.workspace.getLeavesOfType(STUDIO).length) await controller.openStudio();
          refresh();
        })
        .catch((error) => console.warn("Marginalia writing baseline:", error)),
  );
  plugin.register(() => {stopped=true;clearTimeout(timer);});
  plugin.registerEvent(plugin.app.metadataCache.on("changed", file=>{controller.invalidate(file.path);refresh();}));
  plugin.registerEvent(
    plugin.app.vault.on("create", (file) => {
      controller.invalidate(file.path);
      if (file instanceof TFile)
        void controller.observeFile(file).catch(() => {});
      refresh();
    }),
  );
  plugin.registerEvent(
    plugin.app.vault.on("modify", (file) => {
      controller.invalidate(file.path);
      if (file instanceof TFile)
        void controller.observeFile(file).catch(() => {});
      refresh();
    }),
  );
  plugin.registerEvent(
    plugin.app.vault.on("delete", (file) => {
      controller.invalidate(file.path);
      controller.session.baseline.delete(file.path);
      refresh();
    }),
  );
  plugin.registerEvent(
    plugin.app.vault.on("rename", (file, old) => {
      controller.invalidate();
      controller.session.rename(old, file.path);
      plugin.scriptOrders = renameOrders(plugin.scriptOrders, old, file.path);
      const preferences = controller.session.data.preferences;
      if (preferences.scriptTemplate === old || preferences.scriptTemplate.startsWith(old + "/"))
        preferences.scriptTemplate = file.path + preferences.scriptTemplate.slice(old.length);
      void plugin
        .savePluginData()
        .catch(() => new Notice("Could not save renamed script order."));
      refresh();
    }),
  );
  plugin.registerEvent(plugin.app.workspace.on("file-open", refresh));
  plugin.registerEvent(
    plugin.app.workspace.on("editor-change", (editor, ctx) => {
      if (ctx.file)
        controller.observeText(ctx.file.path, editor.getValue(), true);
      refresh();
    }),
  );
}
export function applyScriptEdit(editor: Editor, edit: ScriptEdit) {
  const cm=editorViews.get(editor);
  if(cm){commitShortcut(cm,{...edit,anchor:edit.cursor,head:edit.cursor});cm.focus();return;}
  editor.transaction({
    changes: [
      {
        from: editor.offsetToPos(edit.from),
        to: editor.offsetToPos(edit.to),
        text: edit.text,
      },
    ],
  });
  editor.setCursor(editor.offsetToPos(edit.cursor));
  editor.focus();
}
/** A disclosure arrow and a navigation name are distinct keyboard controls. */
function outlineRow(
  parent: HTMLElement,
  label: string,
  key: string,
  open: boolean,
  navigate: () => void,
  toggle: (value: boolean) => void,
  cls: string,
) {
  const branch = el("div", cls),
    row = el("div", "marginalia-outline-row"),
    children = el("div", "marginalia-outline-children");
  const arrow = button(
    open ? "▾" : "▸",
    () => {
      open = !open;
      children.hidden = !open;
      arrow.textContent = open ? "▾" : "▸";
      arrow.setAttribute("aria-expanded", String(open));
      toggle(open);
    },
    "marginalia-outline-arrow",
  );
  arrow.setAttribute("aria-label", `Expand or collapse ${label}`);
  arrow.setAttribute("aria-expanded", String(open));
  arrow.dataset.key = key + ":toggle";
  const name = button(label, navigate, "marginalia-outline-name");
  name.dataset.key = key + ":name";
  row.append(arrow, name);
  children.hidden = !open;
  branch.append(row, children);
  parent.append(branch);
  return { branch, row, children, name };
}
export class ScriptsView extends ItemView {
  plugin: ScriptHost;
  controller: ScriptController;
  collapsed = new Set<string>();
  expanded = new Set<string>();
  expandedPages = new Set<string>();
  revision = 0;
  closed = false;
  saving = false;
  viewOptionsOpen = false;
  dragging=new OutlineDragging(()=>{if(!this.closed)void this.draw();});
  currentScripts=new Map<string,Script>();
  lastOutline="";
  constructor(leaf: WorkspaceLeaf, plugin: ScriptHost) {
    super(leaf);
    this.plugin = plugin;
    this.controller = plugin.scriptController ??= new ScriptController(plugin);
  }
  getViewType() {
    return SCRIPTS;
  }
  getDisplayText() {
    return "Script Studio";
  }
  getIcon() {
    return "marginalia-m";
  }
  async onOpen() {
    this.closed = false;
    await this.draw();
  }
  async onClose() {
    this.closed = true;
    this.dragging.cancel();
    this.lastOutline="";
    this.revision++;
  }
  async draw() {
    const revision = ++this.revision;
    try {
      let groups = await this.controller.groups();
      let syncError = "";
      try {
        if (await this.controller.fillMissing(groups))
          groups = await this.controller.groups();
      } catch (error) {
        syncError = error instanceof Error ? error.message : String(error);
      }
      if (this.closed || revision !== this.revision) return;
      this.currentScripts=new Map(groups.flatMap(group=>group.scripts).map(script=>[script.path,script]));
      const signature=JSON.stringify([syncError,this.controller.session.data.selection,groups.map(group=>[group.scope,group.group]),selectedGroups(groups,this.controller.session.data.selection).map(group=>[group.scope,group.group,group.issues,[...group.starts],group.sequences.map(sequence=>sequence.map(script=>[script.path,script.metadata.Title,script.declared,script.slots,script.pages.map(page=>[page.title,page.side,page.slots,page.panels.map(panel=>panel.title)])]))])]);
      if(this.dragging.active||this.lastOutline===signature){this.drawFooter();return;}
      this.lastOutline=signature;
      const shell = this.contentEl;
      const priorScroll=shell.querySelector<HTMLElement>(".marginalia-scripts-outline")?.scrollTop??0;
      const focused = shell.contains(document.activeElement)
        ? (document.activeElement as HTMLElement).dataset.key
        : undefined;
      shell.replaceChildren();
      shell.className = "view-content marginalia-scripts";
      const root = el("div", "marginalia-scripts-outline");
      shell.append(root);
      const selection = this.controller.session.data.selection;
      const header = el("div", "marginalia-script-header");
      header.append(el("h2", "", "Script Studio"));
      root.append(header);
      const picker = el("select", "marginalia-session-picker") as HTMLSelectElement;
      picker.setAttribute("aria-label", "Project or grouping");
      picker.dataset.key = "session-picker";
      const placeholder = el("option", "", "Choose a project or grouping") as HTMLOptionElement;
      placeholder.value = "";
      placeholder.disabled = true;
      picker.append(placeholder);
      const scopes = new Map<string, ScriptGroup[]>();
      for (const group of groups) {
        if (!scopes.has(group.scope)) scopes.set(group.scope, []);
        scopes.get(group.scope)!.push(group);
      }
      for (const [scope, entries] of scopes) {
        const options = el("optgroup") as HTMLOptGroupElement;
        options.label = scope;
        for (const group of [undefined, ...entries.map((g) => g.group)]) {
          const option = el("option", "", group === undefined
            ? `${scope.split("/").at(-1)} · All groupings`
            : `${scope.split("/").at(-1)} > ${group}`) as HTMLOptionElement;
          option.value = JSON.stringify({scope, ...(group !== undefined ? {group} : {})});
          options.append(option);
        }
        picker.append(options);
      }
      picker.value = selection ? JSON.stringify(selection) : "";
      picker.addEventListener("change", () => {
        void this.controller.select(JSON.parse(picker.value)).catch((e) => {
          new Notice(String(e));
          void this.draw();
        });
      });
      root.append(picker);
      const compile=button("Compile PDF…",()=>openCompileOptions(this.controller),"marginalia-compile-launcher");
      compile.disabled=!selection;root.append(compile);
      groups = selectedGroups(groups, selection);
      if (selection) {
        const actions = el("details", "marginalia-script-actions");
        actions.open = this.viewOptionsOpen;
        actions.addEventListener("toggle", () => { this.viewOptionsOpen = actions.open; });
        actions.append(el("summary", "", "View options"));
        const controls = el("div", "marginalia-outline-actions");
        controls.classList.add("marginalia-fold-controls");
        this.renderFoldControls(controls);
        actions.append(controls);
        root.append(actions);
      }
      root.append(el("p", "marginalia-script-caption", selection
        ? "Drag scripts, pages or panels to arrange reading order."
        : "Choose a project or grouping to begin."));
      if (syncError)
        root.append(el("p", "marginalia-script-warning", syncError));
      if (!groups.length && this.controller.session.data.selection)
        root.append(
          el(
            "p",
            "marginalia-script-empty",
            this.controller.session.data.selection
              ? "No scripts in this selection. Choose another project or grouping from the menu."
              : "Your writing session will show only the project or grouping you choose.",
          ),
        );
      const projects = new Map<string, ScriptGroup[]>();
      for (const group of groups) {
        if (!projects.has(group.scope)) projects.set(group.scope, []);
        projects.get(group.scope)!.push(group);
      }
      const remember = (key: string, open: boolean) => {
        open ? this.collapsed.delete(key) : this.collapsed.add(key);
      };
      const visit = (path: string, line: number) =>
        void this.navigate(path, line).catch((e) => new Notice(String(e)));
      for (const [scope, projectGroups] of projects) {
        const projectKey = "project:" + scope;
        const project = outlineRow(
          root,
          scope,
          projectKey,
          !this.collapsed.has(projectKey),
          () =>
            void this.openProject(scope).catch((e) => new Notice(String(e))),
          (value) => remember(projectKey, value),
          "marginalia-script-project",
        );
        project.name.title = "Read the full project";
        for (const group of projectGroups) {
          const key = orderKey(group.scope, group.group);
          let container = project.children;
          if (projectGroups.length > 1 || group.group !== "Top-level") {
            const groupRow = outlineRow(
              container,
              group.group,
              "group:" + key,
              !this.collapsed.has(key),
              () =>
                void this.openProject(scope, group.group).catch(
                  (e) => new Notice(String(e)),
                ),
              (value) => remember(key, value),
              "marginalia-script-group",
            );
            container = groupRow.children;
          }
          for (const issue of group.issues) {
            const warning = el("div", "marginalia-script-warning");
            warning.append(
              el(
                "strong",
                "",
                issue.path.split("/").at(-1)!.replace(/\.md$/, ""),
              ),
              el("p", "", issue.message),
            );
            container.append(warning);
          }
          if (group.issues.length)
            container.append(
              el(
                "p",
                "marginalia-script-caption",
                "Drag scripts into the intended order to repair these links.",
              ),
            );
          for (const script of group.sequences.flat()) {
            const name =
              typeof script.metadata.Title === "string" &&
              script.metadata.Title.trim()
                ? script.metadata.Title
                : script.path.split("/").at(-1)!.replace(/\.md$/, "");
            const live=()=>this.currentScripts.get(script.path)??script;
            const fingerprint=()=>hash(live().text);
            const open = this.expanded.has(script.path);
            const file = outlineRow(
              container,
              name,
              script.path,
              open,
              () => visit(script.path, 0),
              (value) => {
                remember(script.path, value);
                value
                  ? this.expanded.add(script.path)
                  : this.expanded.delete(script.path);
              },
              "marginalia-script-file",
            );
            file.name.classList.add("marginalia-script-name");
            file.name.draggable=false;
            this.dragging.bind(file.row,{kind:'script',key,path:script.path},{
              accept:source=>source.kind==='script'&&source.key===key&&source.path!==script.path,
              drop:source=>void this.saveOrder(group,reorderScript(group,source.path,script.path)),
            },()=>!this.saving&&!this.controller.busy);
            const start = group.starts.get(script.path);
            const range =
              start !== undefined &&
              script.slots > 0
                ? ` · pp. ${start}–${start + script.slots - 1}`
                : "";
            file.children.append(
              el(
                "div",
                "marginalia-script-count",
                `${script.slots} actual / ${script.declared ?? "—"} declared${range}`,
              ),
            );
            if (script.declared !== script.slots)
              file.children.append(
                el(
                  "p",
                  "marginalia-script-mismatch",
                  script.declared === undefined
                    ? "Pages is missing or invalid. Numbering follows the actual pages."
                    : "Page count differs from Pages. Numbering follows the actual pages.",
                ),
              );
            const pageOccurrences=new Map<string,number>();
            for (const [pageIndex,page] of script.pages.entries()) {
              const occurrence=pageOccurrences.get(page.title)??0;pageOccurrences.set(page.title,occurrence+1);
              const pageKey = script.path + ":page:" + page.title+":"+occurrence;
              const pageRow = outlineRow(
                file.children,
                pageLabel(page),
                pageKey,
                this.expandedPages.has(pageKey),
                () => visit(script.path, live().pages[pageIndex]?.line??page.line),
                (value) => { value ? this.expandedPages.add(pageKey) : this.expandedPages.delete(pageKey); },
                "marginalia-script-page",
              );
              const valid=(source:OutlineDrag)=>source.path===script.path&&source.fingerprint===fingerprint()&&typeof source.from==='number';
              pageRow.name.draggable=false;
              this.dragging.bind(pageRow.row,()=>({kind:'page',path:script.path,from:live().pages[pageIndex]?.from,fingerprint:fingerprint()}),{
                accept:source=>valid(source)&&(source.kind==='page'||source.kind==='panel'),
                drop:(source,edge)=>void this.moveBlock(live(),source,live().pages[pageIndex]?.from??page.from,source.kind==='panel'?'inside':edge),
              },()=>!this.saving&&!this.controller.busy);
              pageRow.name.title = `Page ${page.local}${page.slots === 2 ? "–" + (page.local + 1) : ""}`;
              pageRow.row.append(
                el("span", "marginalia-script-side", page.side),
              );
              page.panels.forEach((panel, i) => {
                const row = button(
                  panelLabel(panel.title, i),
                  () => visit(script.path, live().pages[pageIndex]?.panels[i]?.line??panel.line),
                  "marginalia-script-row",
                );
                row.dataset.key = pageKey + ":panel:" + i;
                row.title = `Go to panel ${i + 1}: ${panel.title}`;
                this.dragging.bind(row,()=>({kind:'panel',path:script.path,from:live().pages[pageIndex]?.panels[i]?.from,fingerprint:fingerprint()}),{
                  accept:source=>valid(source)&&source.kind==='panel',
                  drop:(source,edge)=>void this.moveBlock(live(),source,live().pages[pageIndex]?.panels[i]?.from??panel.from,edge),
                },()=>!this.saving&&!this.controller.busy);
                pageRow.children.append(row);
              });
              if (!page.panels.length)
                pageRow.children.append(
                  el("p", "marginalia-script-caption", "No panels"),
                );
            }
          }
        }
      }
      if (selection) {
        const add = button("New Script", () => {
          void this.controller.creationFolder().then(folder =>
            openNewScript(this.controller, folder, selection.group),
          ).catch(error => new Notice(String(error)));
        }, "marginalia-new-script");
        add.dataset.key = "new-script";
        root.append(add);
      }
      root.scrollTop=priorScroll;
      this.drawFooter();
      if (focused)
        [...shell.querySelectorAll<HTMLElement>("[data-key]")]
          .find((e) => e.dataset.key === focused)
          ?.focus({ preventScroll: true });
    } catch (error) {
      this.lastOutline="";
      if (!this.closed && revision === this.revision)
        this.contentEl.replaceChildren(
          el(
            "p",
            "marginalia-script-warning",
            `Could not load scripts. ${String(error)}`,
          ),
        );
    }
  }
  async moveBlock(script:Script,source:OutlineDrag,target:number,edge:'before'|'after'|'inside'){
    if(this.saving||source.kind==='script')return;
    this.saving=true;
    try{await this.controller.moveStructure(script,source.kind,source.from!,target,edge);}
    catch(error){new Notice(error instanceof Error?error.message:String(error));}
    finally{this.saving=false;if(!this.closed)await this.draw();}
  }
  async saveOrder(group: ScriptGroup, paths: string[]) {
    if (this.saving) return;
    this.saving = true;
    try {
      await this.controller.reorder(group, paths);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
    } finally {
      this.saving = false;
      if (!this.closed) await this.draw();
    }
  }
  renderFoldControls(root: HTMLElement) {
    const status = this.controller.foldStatus();
    const labels = [status.any ? "Expand all" : "Collapse all", status.panels ? "Expand panel descriptions" : "Collapse panel descriptions"];
    if (root.dataset.labels === labels.join("|")) return;
    root.dataset.labels = labels.join("|");
    root.replaceChildren();
    for (const [index,label] of labels.entries()) {
      const mode = index === 0 ? (status.any ? "expand" : "collapse") : (status.panels ? "expand-panels" : "panels");
      root.append(button(label, () => {
        void this.controller.foldScript(mode).catch((e) => new Notice(String(e)));
      }));
    }
  }
  drawFooter() {
    if (this.closed) return;
    const controls = this.contentEl.querySelector<HTMLElement>(".marginalia-fold-controls");
    if (controls) this.renderFoldControls(controls);
    const previous = this.contentEl.querySelector(".marginalia-writing-footer");
    const session = this.controller.session;
    const signature = JSON.stringify([session.data.selection, session.data.preferences,
      session.progress(), session.running, session.data.timerStarted, session.remaining() === 0]);
    if (previous instanceof HTMLElement && previous.dataset.state === signature) {
      const clock = previous.querySelector(".marginalia-writing-clock");
      if (clock) clock.textContent = clockLabel(session.remaining());
      return;
    }
    const focused = previous?.contains(document.activeElement)
      ? (document.activeElement as HTMLElement)?.dataset.key
      : null;
    const footer = renderSessionFooter(this.controller, () => {
      void this.plugin
        .savePluginData()
        .catch(() => new Notice("Could not save writing session."));
      this.drawFooter();
    });
    footer.dataset.state = signature;
    if (previous) previous.replaceWith(footer);
    else this.contentEl.append(footer);
    if (focused)
      [...footer.querySelectorAll<HTMLElement>("[data-key]")]
        .find((e) => e.dataset.key === focused)
        ?.focus({ preventScroll: true });
  }
  async openProject(scope: string, group?: string) {
    await this.controller.select({
      scope,
      ...(group !== undefined ? { group } : {}),
    });
  }
  async navigate(path: string, line: number) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile))
      throw new Error(
        "Script no longer exists. Choose another item from the updated outline.",
      );
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(file, { state: { mode: "source" }, eState: { line } });
    if (Platform.isMobile) this.app.workspace.leftSplit.collapse();
    const view = leaf.view;
    if (view instanceof MarkdownView) {
      view.editor.setCursor({ line, ch: 0 });
      view.editor.scrollIntoView(
        { from: { line, ch: 0 }, to: { line, ch: 0 } },
        true,
      );
      view.editor.focus();
    }
  }
}
