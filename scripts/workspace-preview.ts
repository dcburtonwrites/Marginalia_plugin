import { AppPage, WorkspaceFeature, PAGES } from "../src/workspace/feature.ts";
import { readWorkspace } from "../src/workspace/model.ts";
import { TFolder, TFile, stringifyYaml, parseYaml } from "obsidian";
import { readWriting } from "../src/scripts/writing.ts";
import { ScriptController, scriptMetadata } from "../src/scripts/controller.ts";
import { VaultSetupModal } from "../src/workspace/setup.ts";
const storyboard = location.search.includes("storyboard");
const sources = [
  [
    "00 Brainstorms/Inspiration/Copper idea.md",
    {},
    "A floating archive above the sea.",
  ],
  [
    "00 Brainstorms/Loose thread.md",
    {},
    "A courier arrives with a sealed map.",
  ],
  [
    "02 Character/Mira.md",
    { tags: ["character"] },
    "Mira keeps the tide charts safe.",
  ],
  [
    "04 Location/Eastern Archive.md",
    { tags: ["location"] },
    "An archive beneath the observatory.",
  ],
  [
    "08 Projects/Copper Sky/Overview.md",
    {
      tags: ["project-parent"],
      stage: "Drafting",
      progress: "Bottled",
      genre: "Fantasy",
      "next-action": "Revise Opening",
      "working-document": "[[Scripts/Opening]]",
    },
    "A city writes its own weather.",
  ],
  [
    "08 Projects/Copper Sky/Scripts/Opening.md",
    { Group: "Draft", Pages: 1 },
    "## Page 1\n\nSide: Right\n\n> [!panel] The arrival\n> A courier waits.",
  ],
  [
    "08 Projects/Copper Sky/Characters/Orin.md",
    { tags: ["project-character"] },
    "A courier with a secret.",
  ],
  ["_Crypt/Lost signal.md", {}, "A voice from an abandoned receiver."],
  ["_Research/Cloud study.md", {}, "Notes on high clouds."],
  ["_Collections/Reference shelf.md", {}, "Collected notes for the story."],
  [
    "_templates/Character template.md",
    {},
    "A template shown only in its own section.",
  ],
  ["_Assets/Index.md", {}, "Never list assets."],
  ["_Ideas/Signals/Glass map.md", {}, "A map drawn in glass."],
] as const;
const files = sources.map(([path, fields, body], i) => {
  const p = storyboard
    ? path.replace("08 Projects/Copper Sky", "Copper Sky")
    : path;
  return Object.assign(new TFile(p), {
    fields,
    body,
    text: body,
    stat: { mtime: 10000 + i, ctime: 100 + i },
  });
});
const folders = [
  ...new Set(
    files.flatMap((f) =>
      f.path
        .split("/")
        .slice(0, -1)
        .map((_, i) =>
          f.path
            .split("/")
            .slice(0, i + 1)
            .join("/"),
        ),
    ),
  ),
].map((p) => new TFolder(p));
const container = document.querySelector<HTMLElement>("main")!;
const vaultEvents = new Map<string, ((...args: any[]) => void)[]>();
const emitVault = (name: string, ...args: any[]) => {
  for (const callback of vaultEvents.get(name) ?? []) callback(...args);
};
const app: any = {
  vault: {
    getMarkdownFiles: () => files,
    cachedRead: async (f: any) => f.body,
    read: async (f: any) => f.body.startsWith("---\n") ? f.body : `---\n${stringifyYaml(f.fields)}---\n${f.body}`,
    getAbstractFileByPath: (path: string) => files.find(f=>f.path===path) ?? folders.find(f=>f.path===path),
    createFolder: async (path: string) => { const folder=new TFolder(path);folders.push(folder);emitVault("create",folder);return folder; },
    delete: async (file: any) => {const list=file instanceof TFolder ? folders : files;list.splice(list.indexOf(file),1);emitVault("delete",file);},
    create: async (path: string, text: string) => {
      if(files.some(f=>f.path===path)) throw new Error("Already exists");
      const file=Object.assign(new TFile(path),{body:text,text,fields:scriptMetadata(text),stat:{mtime:Date.now(),ctime:Date.now()}});
      files.push(file);emitVault("create",file);return file;
    },
    getAllLoadedFiles: () => [...files, ...folders],
    getName: () => "Copper Sky workspace",
    on: (name: string, callback: (...args: any[]) => void) => {
      vaultEvents.set(name, [...(vaultEvents.get(name) ?? []), callback]);
      return {};
    },
  },
  metadataCache: {
    getFileCache: (f: any) => ({ frontmatter: f.fields }),
    getFirstLinkpathDest: (link:string)=>files.find(file=>file.path.replace(/\.md$/,"")===link || file.basename===link),
    on: () => ({}),
    iterateAllLeaves: () => {},
  },
  workspace: {
    on: () => ({}),
    onLayoutReady: (fn: any) => fn(),
    getLeavesOfType: (type: string) =>
      type === PAGES
        ? [leaf]
        : type === "file-explorer"
          ? [{ view: { containerEl: document.querySelector("aside") } }]
          : [],
    getLeaf: () => leaf,
    revealLeaf: async () => {},
    openLinkText: async (path: string) => {
      document.querySelector("#opened")!.textContent = path;
    },
  },
};
const owner: any = {
  app,
  manifest: { id: "marginalia" },
  workspaceSettings: readWorkspace({
    vaultType: storyboard ? "Storyboard" : "World",
  }),
  writing:readWriting(undefined),
  scriptOrders:{},
  activeText: () => undefined,
  savePluginData: async () => {
    localStorage.setItem(
      "workspace-preview",
      JSON.stringify(owner.workspaceSettings),
    );
  },
  scriptController: {
    openStudio: async () => {
      document.querySelector("#opened")!.textContent = "Script Studio";
    },
    select: async (s: any) => {
      document.querySelector("#opened")!.textContent = s.scope;
    },
  },
};
const leaf: any = {
  view: undefined,
  setViewState: async (s: any) => view.setState(s.state, { history: false }),
  openFile: async (file: any)=>{document.querySelector("#opened")!.textContent=file.path;},
};
const controller = new ScriptController(owner);
controller.openStudio=owner.scriptController.openStudio;
controller.select=owner.scriptController.select;
owner.scriptController=controller;
const view = new AppPage({ app, contentEl: container } as any, owner);
leaf.view = view;
const feature = new WorkspaceFeature(owner);
owner.themeFeature = feature;
(window as any).workspaceFixture = {
  setup:()=>new VaultSetupModal(owner).open(),
  sources:()=>Object.fromEntries(files.map(file=>[file.path,file.body])),
  setStatusFlow(field: string, order: string[]) {
    owner.workspaceSettings = readWorkspace({
      ...owner.workspaceSettings,
      projectStatusField: field,
      projectStatusOrder: order,
    });
    feature.refresh();
  },
  createFolder(path: string) {
    const folder = new TFolder(path);
    folders.push(folder);
    emitVault("create", folder);
  },
  renameFolder(oldPath: string, newPath: string) {
    const folder = folders.find((f) => f.path === oldPath)!;
    folder.path = newPath;
    emitVault("rename", folder, oldPath);
  },
  deleteFolder(path: string) {
    const index = folders.findIndex((f) => f.path === path);
    const [folder] = folders.splice(index, 1);
    emitVault("delete", folder);
  },
  restoreLegacySection: () =>
    view.setState({ section: "Crypt" }, { history: false }),
};
feature.onload();
void view.onOpen();
const controls = document.querySelector("#controls")!;
for (const name of ["Theme", "Colors", "Navigation", "Storyboard"]) {
  const button = document.createElement("button");
  button.textContent = `Toggle ${name}`;
  button.onclick = () => {
    if (name === "Theme") {
      owner.workspaceSettings.modules.theme =
        !owner.workspaceSettings.modules.theme;
      document.body.classList.toggle(
        "marginalia-theme",
        owner.workspaceSettings.modules.theme && owner.workspaceSettings.colors,
      );
      if (owner.workspaceSettings.modules.theme) feature.refresh();
      else {
        for (const nav of feature.navs) nav.remove();
        feature.navs.clear();
      }
    } else if (name === "Colors")
      owner.workspaceSettings.colors = !owner.workspaceSettings.colors;
    else if (name === "Navigation")
      owner.workspaceSettings.navigation = !owner.workspaceSettings.navigation;
    else
      owner.workspaceSettings.vaultType =
        owner.workspaceSettings.vaultType === "World" ? "Storyboard" : "World";
    if (name !== "Theme") feature.refresh();
  };
  controls.append(button);
}
