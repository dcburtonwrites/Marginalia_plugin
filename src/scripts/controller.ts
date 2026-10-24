import { MarkdownView, TFile, TFolder, Platform, normalizePath, parseYaml, stringifyYaml } from "obsidian";
import {
  arrangedGroups,
  orderWrites,
  parseScript,
  scriptScope,
  type Script,
  type ScriptGroup,
  type OrderWrite,
} from "./model.ts";
import {
  WritingSession,
  readWriting,
  type WritingSelection,
} from "./writing.ts";
import { frontmatter, patchProperties } from "./properties.ts";
import { foldPanels, expandPanels, foldPages, editorFoldStatus, unfoldPanels } from "./folding.ts";
import type { ProjectView } from "./project.ts";
import type { ScriptHost } from "./view.ts";

export function scriptMetadata(text: string): Record<string, unknown> {
  const fm = frontmatter(text);
  const value = fm ? parseYaml(fm.yaml) : {};
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value))
    throw new Error("Script frontmatter must be a property mapping.");
  return value;
}
const stable = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  );
export function propertySource(
  source: string,
  properties: Record<string, unknown>,
): string {
  const original = scriptMetadata(source),
    expected = { ...original, ...properties };
  const next = patchProperties(source, properties, () =>
    stringifyYaml(expected),
  );
  if (stable(scriptMetadata(next)) !== stable(expected))
    throw new Error(
      "Could not safely update script properties. Nothing was saved.",
    );
  return next;
}
export class ScriptController {
  busy = false;
  session: WritingSession;
  onChange: () => void = () => {};
  saveTimer: ReturnType<typeof setTimeout> | undefined;
  needsWritingSave = false;
  constructor(public plugin: ScriptHost) {
    this.session = new WritingSession(
      (plugin.writing ??= readWriting(undefined)),
    );
  }
  async seedWords() {
    await Promise.all(
      this.plugin.app.vault.getMarkdownFiles().map(async (file) => {
        if (!this.wordEligible(file.path)) return;
        const text =
          this.editors().get(file.path)?.getValue() ??
          (await this.plugin.app.vault.read(file));
        if (!this.session.baseline.has(file.path))
          this.observeText(file.path, text, false);
      }),
    );
    this.session.ready = true;
  }
  wordEligible(path: string) {
    return (
      /\.md$/i.test(path) &&
      !path
        .split("/")
        .some((p) => p.startsWith(".") || /^_?templates?$/i.test(p))
    );
  }
  observeText(path: string, text: string, credit: boolean) {
    if (!this.wordEligible(path)) return;
    let metadata: Record<string, unknown> = {};
    try {
      metadata = scriptMetadata(text);
    } catch {
      const file = this.plugin.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile)
        metadata =
          this.plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    }
    if (this.session.observe(path, text, scriptScope(path, metadata), credit))
      this.saveSoon();
  }
  async observeFile(file: TFile) {
    if (!this.wordEligible(file.path)) return;
    const text =
      this.editors().get(file.path)?.getValue() ??
      (await this.plugin.app.vault.read(file));
    this.observeText(file.path, text, false);
  }
  saveSoon() {
    this.needsWritingSave = true;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.flushWriting(), 1500);
  }
  async flushWriting() {
    clearTimeout(this.saveTimer);
    if (!this.needsWritingSave && !this.session.running) return;
    this.needsWritingSave = false;
    try {
      await this.plugin.savePluginData();
    } catch {
      this.needsWritingSave = true;
    }
  }
  close() {
    clearTimeout(this.saveTimer);
    this.session.pause();
    this.needsWritingSave = true;
    void this.flushWriting();
  }
  async select(selection: WritingSelection) {
    const previous = this.session.data.selection;
    this.session.data.selection = selection;
    try {
      await this.plugin.savePluginData();
    } catch (error) {
      this.session.data.selection = previous;
      throw error;
    }
    const leaf =
      this.plugin.app.workspace.getMostRecentLeaf?.() ??
      this.plugin.app.workspace.getLeaf(false);
    this.onChange();
    let sidebar =
      this.plugin.app.workspace.getLeavesOfType("marginalia-scripts")[0];
    if (!sidebar) {
      sidebar = this.plugin.app.workspace.getLeftLeaf(false)!;
      if (sidebar)
        await sidebar.setViewState({
          type: "marginalia-scripts",
          active: true,
        });
    }
    if (sidebar) await this.plugin.app.workspace.revealLeaf(sidebar);
    await leaf.setViewState({
      type: "marginalia-project",
      state: { ...selection },
      active: true,
    });
    await this.plugin.app.workspace.revealLeaf(leaf);
    if (Platform.isMobile) this.plugin.app.workspace.leftSplit.collapse();
  }
  async openStudio() {
    const workspace = this.plugin.app.workspace;
    const scripts = workspace.getLeavesOfType("marginalia-scripts");
    const legacy = workspace.getLeavesOfType("marginalia-script-studio");
    let leaf = scripts.find((item) => item.getRoot() === workspace.leftSplit);
    if (!leaf) {
      leaf = legacy.find((item) => item.getRoot() === workspace.leftSplit)
        ?? workspace.getLeftLeaf(false) ?? undefined;
      if (!leaf) return;
      await leaf.setViewState({ type: "marginalia-scripts", active: true });
    }
    for (const previous of [...scripts, ...legacy]) {
      if (previous !== leaf) previous.detach();
    }
    await workspace.revealLeaf(leaf);
  }

  async creationFolder() {
    const selection = this.session.data.selection;
    if (!selection) throw new Error("Choose a project or grouping first.");
    const groups = (await this.groups()).filter(g => g.scope === selection.scope &&
      (selection.group === undefined || g.group === selection.group));
    const last = groups.flatMap(g => g.sequences.flat()).at(-1);
    if (last) return last.path.slice(0, last.path.lastIndexOf("/")) || "/";
    const preferred = selection.scope === "Vault" ? "Scripts" : `${selection.scope}/Scripts`;
    if (this.plugin.app.vault.getAbstractFileByPath(preferred) instanceof TFolder) return preferred;
    return selection.scope === "Vault" ? "/" : selection.scope;
  }

  async createScript(folder: string, name: string, group = "", templatePath = this.session.data.preferences.scriptTemplate, project?: string) {
    if (this.busy) throw new Error("Another script update is in progress. Try again shortly.");
    name = name.trim().replace(/\.md$/i, "");
    if (!name || name === "." || name === ".." || name.startsWith(".") ||
      /[\\/:*?"<>|\[\]#^\u0000-\u001f]/.test(name) || /[. ]$/.test(name))
      throw new Error("Enter a script name without path separators or special filename characters.");
    const { vault, workspace } = this.plugin.app;
    folder = normalizePath(folder);
    if (!(vault.getAbstractFileByPath(folder) instanceof TFolder))
      throw new Error("The destination folder no longer exists.");
    const path = normalizePath(`${folder}/${name}.md`);
    if (scriptScope(path, {role:"manuscript", format:"comic-script"}) === null)
      throw new Error("Choose a folder outside templates, Archive, and hidden folders.");
    if (vault.getAbstractFileByPath(path)) throw new Error("A note with that name already exists in this folder.");
    const template = vault.getAbstractFileByPath(templatePath);
    if (!templatePath || !(template instanceof TFile) || template.extension !== "md")
      throw new Error("Choose an existing Markdown script template in Marginalia → Scripts settings first.");
    this.busy = true;
    let created: TFile;
    try {
      const source = this.editors().get(template.path)?.getValue() ?? await vault.read(template);
      const metadata = scriptMetadata(source);
      const properties: Record<string, string> = {
        role: "manuscript", format: "comic-script", Title: name,
        Group: group.trim() || "Top-level", "Preceded By": "",
      };
      const active = this.session.data.selection?.scope;
      const parent = project ?? (active && active !== "Vault" && path.startsWith(active + "/") ? active : undefined);
      if (parent && path.startsWith(parent + "/") && scriptScope(path,properties) !== parent)
        properties.Project = parent;
      if (Object.hasOwn(metadata, "Followed By")) properties["Followed By"] = "";
      const scope = scriptScope(path, properties)!;
      const existing = (await this.groups()).find(g => g.scope === scope && g.group === properties.Group);
      if (existing?.issues.length)
        throw new Error("Resolve the script ordering warnings in this grouping before adding a script.");
      const previous = existing?.sequences.flat().at(-1);
      if (previous) properties["Preceded By"] = `[[${previous.path.replace(/\.md$/, "")}]]`;
      const text = propertySource(source, properties);
      // Vault.create rejects collisions; never overwrite a file that appeared while reading the template.
      created = await vault.create(path, text);
      this.observeText(path, text, false);
      const current = this.session.data.selection;
      if (!current || current.scope !== scope ||
        (current.group !== undefined && current.group !== properties.Group))
        this.session.data.selection = {scope, group: properties.Group};
      this.onChange();
    } finally {
      this.busy = false;
    }
    // A failed preference save or navigation must never encourage creating a duplicate file.
    try { await this.plugin.savePluginData(); }
    catch { console.warn("Marginalia: script created, but the writing selection could not be saved."); }
    try {
      await workspace.getLeaf(false).openFile(created, {state:{mode:"source"}});
      await this.openStudio();
    } catch { console.warn("Marginalia: script created, but could not open the editor."); }
    return created;
  }

  async foldScript(mode: "collapse" | "panels" | "expand" | "expand-panels") {
    const workspace = this.plugin.app.workspace;
    const view = workspace.getMostRecentLeaf?.()?.view;
    if (view?.getViewType?.() === "marginalia-project") {
      (view as ProjectView).setFolds(mode);
      this.onChange();
      return;
    }
    if (!(view instanceof MarkdownView) || !view.file) throw new Error("Open a script or project reading view first.");
    const editor = view.editor;
    const text = view.getMode() === "source" ? editor.getValue() : await this.plugin.app.vault.read(view.file);
    const metadata = scriptMetadata(text);
    if (scriptScope(view.file.path, metadata) === null) throw new Error("Open a comic script to use these view options.");
    const script = parseScript({path: view.file.path, text, metadata});
    if (!script) throw new Error("Open a comic script to use these view options.");
    if (view.getMode() !== "source") await view.setState({mode:"source"}, {history:false});
    // Native fold commands change no cursor position. Reapplying selections here
    // would unfold whichever page contains the cursor (including a spread).
    if (mode === "expand-panels") unfoldPanels(editor, script);
    else {
      editor.exec(mode === "collapse" ? "foldAll" : "unfoldAll");
      if (mode === "collapse") foldPages(editor, script);
      if (mode !== "expand") foldPanels(editor, script);
      else expandPanels(editor);
    }
    this.onChange();
  }
  foldStatus() {
    const view = this.plugin.app.workspace.getMostRecentLeaf?.()?.view;
    if (view?.getViewType?.() === "marginalia-project") return (view as ProjectView).foldStatus();
    if (view instanceof MarkdownView) return editorFoldStatus(view.editor);
    return {any:false,panels:false};
  }

  async groups(): Promise<ScriptGroup[]> {
    const { app } = this.plugin,
      editors = this.editors();
    const scripts = (
      await Promise.all(
        app.vault.getMarkdownFiles().map(async (file) => {
          const cached =
            app.metadataCache.getFileCache(file)?.frontmatter ?? {};
          if (scriptScope(file.path, cached) === null) return null;
          const text =
            editors.get(file.path)?.getValue() ?? (await app.vault.read(file));
          return parseScript({
            path: file.path,
            text,
            metadata: scriptMetadata(text),
          });
        }),
      )
    ).filter((s): s is Script => !!s);
    return arrangedGroups(
      scripts,
      (link, source) =>
        app.metadataCache.getFirstLinkpathDest(link, source)?.path,
      this.plugin.scriptOrders,
    );
  }
  editors() {
    const open = new Map<string, MarkdownView["editor"]>();
    this.plugin.app.workspace.iterateAllLeaves((leaf) => {
      if (
        leaf.view instanceof MarkdownView &&
        leaf.view.file &&
        leaf.view.getMode() === "source"
      )
        open.set(leaf.view.file.path, leaf.view.editor);
    });
    return open;
  }
  async fillMissing(groups: ScriptGroup[]) {
    if (this.busy) return false;
    const writes = groups.flatMap((g) =>
      orderWrites(
        g,
        g.sequences.flat().map((s) => s.path),
        true,
      ),
    );
    if (!writes.length) return false;
    await this.commit(
      writes,
      groups.filter((g) => !g.issues.length).flatMap((g) => g.scripts),
    );
    return true;
  }
  async reorder(group: ScriptGroup, paths: string[]) {
    await this.commit(orderWrites(group, paths), group.scripts);
  }
  async commit(writes: OrderWrite[], guards: Script[] = []) {
    if (this.busy)
      throw new Error("Another script order update is in progress.");
    if (!writes.length) return;
    this.busy = true;
    const { app } = this.plugin;
    const prepared: { file: TFile; before: string; after: string }[] = [],
      applied: typeof prepared = [];
    const unchangedEditor = (path: string, expected: string) => {
      const editor = this.editors().get(path);
      if (editor && editor.getValue() !== expected)
        throw new Error("Save your script edits before arranging scripts.");
    };
    try {
      // Prepare every transformation and check the whole batch before any write.
      for (const script of guards) {
        const file = app.vault.getAbstractFileByPath(script.path);
        if (
          !(file instanceof TFile) ||
          (await app.vault.read(file)) !== script.text
        )
          throw new Error(
            "A script changed. Wait for the outline to update, then try again.",
          );
        unchangedEditor(script.path, script.text);
      }
      for (const w of writes) {
        const file = app.vault.getAbstractFileByPath(w.path);
        if (!(file instanceof TFile))
          throw new Error(
            "A script moved or was deleted. Wait for the outline to update, then try again.",
          );
        const current = await app.vault.read(file);
        if (current !== w.expected)
          throw new Error(
            "A script changed. Wait for the outline to update, then try again.",
          );
        unchangedEditor(w.path, current);
        prepared.push({
          file,
          before: current,
          after: propertySource(current, w.properties),
        });
      }
      for (const p of prepared) {
        unchangedEditor(p.file.path, p.before);
        await app.vault.process(p.file, (current) => {
          if (current !== p.before)
            throw new Error("A script changed during ordering.");
          return p.after;
        });
        applied.push(p);
      }
      for (const script of guards) {
        const file = app.vault.getAbstractFileByPath(script.path);
        const expected =
          prepared.find((p) => p.file.path === script.path)?.after ??
          script.text;
        if (
          !(file instanceof TFile) ||
          (await app.vault.read(file)) !== expected
        )
          throw new Error("A script changed during ordering.");
      }
    } catch (error) {
      let incomplete = false;
      for (const p of [...applied].reverse())
        try {
          unchangedEditor(p.file.path, p.after);
          await app.vault.process(p.file, (current) => {
            if (current !== p.after)
              throw new Error("A newer edit must be preserved.");
            return p.before;
          });
        } catch {
          incomplete = true;
        }
      if (incomplete)
        throw new Error(
          "Script ordering stopped because a file changed. Newer edits were preserved; review the displayed predecessor links before trying again.",
        );
      throw error;
    } finally {
      this.busy = false;
    }
  }
}
