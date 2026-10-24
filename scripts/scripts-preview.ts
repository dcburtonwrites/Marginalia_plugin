document.documentElement.dataset.theme =
  new URLSearchParams(location.search).get("theme") || "light";
import { ScriptsView } from "../src/scripts/view.ts";
import { TFile, TFolder, parseYaml, stringifyYaml } from "./obsidian-preview.ts";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { history, undo } from "@codemirror/commands";
import { createScriptShortcutExtension } from "../src/scripts/shortcut-extension.ts";
import { editorInfoField, Platform } from "obsidian";
import { readWriting } from "../src/scripts/writing.ts";
import { renderWritingSettings } from "../src/scripts/settings.ts";
import { ProjectView } from "../src/scripts/project.ts";
import { scriptMetadata } from "../src/scripts/controller.ts";
import { readOrders } from "../src/scripts/model.ts";
if (Platform.isMobile) document.body.classList.add("is-mobile");
const base = "Projects/Copper Sky/Scripts/";
const fixtures = [
  {
    path: base + "Opening.md",
    metadata: { Pages: 4, Group: "Draft" },
    text: "## Page 1\n\nSide: Right\n\n> [!panel] The arrival\n> A courier waits.\n\n**MIRA:** Is anyone here?\n\n> [!panel] The sealed door\n> Copper locks.\n\n## Page 2 Double Spread\n\nSide: Double Spread\n\n> [!panel] The archive\n> Wide.\n\n## Page 4\n\n> [!panel] The key\n> Close.",
  },
  {
    path: base + "After the Bell.md",
    metadata: {
      Pages: 2,
      Group: "Draft",
      ...(location.search.includes("conflict")
        ? { "Preceded By": "[[Missing]]" }
        : { "Preceded By": "[[Opening]]" }),
    },
    text: "## Page 1\n\n> [!panel] After the bell\n> Empty stairs.\n\n## Page 2\n\n> [!panel] The answer\n> Footsteps.",
  },
];
fixtures.push({
  path: "Projects/Harbor/Scripts/Arrival.md",
  metadata: { Pages: 1, Group: "Draft" } as any,
  text: "## Page 1\n\n> [!panel] Arrival\n> Quiet water.",
});
if (location.search.includes("studio"))
  fixtures.push({
    path: base + "Revision.md",
    metadata: { Pages: 1, Group: "Revision" } as any,
    text: "## Page 1\n\n> [!panel] A different opening\n> A clear morning.",
  });
const savedTexts = JSON.parse(localStorage.getItem("script-texts") || "{}");
fixtures.push({path:"_templates/Script.md",metadata:{Title:null,Group:null,Pages:null} as any,
  text:"## Page 1 — PAGE TITLE\n\nSide: Right\n\nLocation: INT. LOCATION\n\n> [!panel] PANEL TITLE\n> Write here."});
const files = fixtures.map((f) =>
  Object.assign(new TFile(f.path), {
    text:
      savedTexts[f.path] ?? `---\n${stringifyYaml(f.metadata)}---\n${f.text}`,
  }),
);
for(const [path,text] of Object.entries(savedTexts)) {
  if(!files.some(f=>f.path===path)) files.push(Object.assign(new TFile(path),{text:text as string}));
}
const folders = [...new Set(files.flatMap(f=>f.path.split('/').slice(0,-1).map((_,i)=>f.path.split('/').slice(0,i+1).join('/'))))].map(path=>new TFolder(path));
let mainView: ProjectView | undefined;
const outlineRoot = document.querySelector<HTMLElement>("#sidebar")!;
let view: ScriptsView;
const plugin: any = {
  writing: readWriting(
    JSON.parse(localStorage.getItem("writing-data") || "null"),
  ),
  scriptOrders: readOrders(
    JSON.parse(localStorage.getItem("script-orders") || "{}"),
  ),
  savePluginData: async () => {
    plugin.scriptController?.session.snapshot();
    localStorage.setItem("writing-data", JSON.stringify(plugin.writing));
    localStorage.setItem("script-orders", JSON.stringify(plugin.scriptOrders));
  },
};
const app: any = {
  vault: {
    getMarkdownFiles: () => files,
    cachedRead: async (f: any) => f.text,
    read: async (f: any) => f.text,
    getAbstractFileByPath: (path: string) => files.find((f) => f.path === path) ?? folders.find(f=>f.path===path),
    create: async (path: string, text: string) => {
      if(files.some(f=>f.path===path)) throw new Error('File already exists');
      const file = Object.assign(new TFile(path),{text});
      files.push(file);
      localStorage.setItem('script-texts',JSON.stringify(Object.fromEntries(files.map(f=>[f.path,f.text]))));
      return file;
    },
    process: async (f: any, fn: any) => {
      f.text = fn(f.text);
      localStorage.setItem(
        "script-texts",
        JSON.stringify(Object.fromEntries(files.map((f) => [f.path, f.text]))),
      );
      return f.text;
    },
  },
  metadataCache: {
    getFileCache: (f: any) => ({ frontmatter: scriptMetadata(f.text) }),
    getFirstLinkpathDest: (link: string) =>
      files.find(
        (f) => f.path.replace(/\.md$/, "") === link || f.basename === link,
      ),
  },
  workspace: {
    getActiveFile: () => files[0],
    iterateAllLeaves: () => {},
    leftSplit: {collapse:()=>{document.body.dataset.drawer="closed";}},
    revealLeaf: async () => {},
    openLinkText: async (path: string) => {
      document.querySelector("main")!.textContent = "Editing " + path;
    },
    getLeavesOfType: (type: string) => type === "marginalia-scripts" ? [sidebarLeaf]
      : mainView?.getViewType() === type ? [mainLeaf] : [],
    getLeftLeaf: () => sidebarLeaf,
    getLeaf: () => mainLeaf,
    getMostRecentLeaf: () => mainLeaf,
  },
};
const mainLeaf: any = {
  get view() {
    return mainView ?? {};
  },
  openFile: async (file: any, options: any) => {
    if (mainView) await mainView.onClose();
    mainView = undefined;
    const main = document.querySelector("main")!;
    main.textContent = `Editing ${file.path} at line ${options.eState?.line ?? 0}`;
    if (Platform.isMobile || location.search.includes("editor")) {
      const cm = new EditorView({parent:main, state:EditorState.create({
        doc:file.text,
        extensions:[history(),editorInfoField.init(()=>({file,editor:{}})),
          createScriptShortcutExtension(app),
          EditorView.contentAttributes.of({"aria-label":"Script editor"}),
          EditorView.updateListener.of(update=>{if(update.docChanged){
            file.text=update.state.doc.toString();
            plugin.scriptController.observeText(file.path,file.text,true);
          }})],
      })});
      (window as any).mobileEditor={
        set(text:string){cm.dispatch({changes:{from:0,to:cm.state.doc.length,insert:text},selection:{anchor:text.length}});cm.focus();},
        text:()=>cm.state.doc.toString(),
        selected:()=>cm.state.sliceDoc(cm.state.selection.main.from,cm.state.selection.main.to),
        undo:()=>undo(cm),
        destroy:()=>cm.destroy(),
      };
      cm.focus();
      return;
    }
    const editor = document.createElement("textarea");
    editor.setAttribute("aria-label", "Script editor");
    editor.value = file.text;
    editor.style.width = "100%";
    editor.style.height = "350px";
    main.append(editor);
    editor.addEventListener("input", () => {
      file.text = editor.value;
      plugin.scriptController.observeText(file.path, editor.value, true);
      localStorage.setItem(
        "script-texts",
        JSON.stringify(Object.fromEntries(files.map((f) => [f.path, f.text]))),
      );
      void view.draw();
    });
  },
  setViewState: async (state: any) => {
    if (mainView) await mainView.onClose();
    const leaf = { app, contentEl: document.querySelector("main") } as any;
    mainView = new ProjectView(leaf, plugin.scriptController);
    await mainView.setState(state.state, { history: false });
  },
};
const sidebarLeaf: any = {
  getRoot: () => app.workspace.leftSplit,
  get view() { return view; },
  setViewState: async () => {},
};
plugin.app = app;
view = new ScriptsView({ app, contentEl: outlineRoot } as any, plugin);
plugin.scriptController.onChange = () => {
  void view.draw();
};
void plugin.scriptController.seedWords().then(async () => {
  await view.onOpen();
  if (!plugin.writing.selection) await plugin.scriptController.openStudio();
});
setInterval(() => {
  if (plugin.scriptController.session.tick()) void plugin.savePluginData();
  view.drawFooter();
}, 1000);
const settings = document.createElement("button");
settings.textContent = "Writing settings";
settings.style.position = "absolute";
settings.style.right = "20px";
settings.style.top = "5px";
document.body.append(settings);
settings.onclick = () => {
  const dialog = document.createElement("dialog");
  dialog.setAttribute("aria-label", "Writing settings");
  dialog.style.maxWidth = "600px";
  dialog.style.maxHeight = "85vh";
  dialog.style.overflow = "auto";
  const close = document.createElement("button");
  close.textContent = "Close settings";
  close.onclick = () => dialog.remove();
  dialog.append(close);
  renderWritingSettings(dialog, plugin);
  document.body.append(dialog);
  dialog.showModal();
};
