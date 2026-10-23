import { history, undo } from "@codemirror/commands";
import { commitShortcut, handleScriptEnter } from "../src/scripts/shortcut-extension.ts";
import { planShortcut } from "../src/scripts/shortcuts.ts";
import { EditorState } from "@codemirror/state";
import { codeFolding, foldedRanges } from "@codemirror/language";
import { editorViews } from "../src/scripts/folding.ts";
import test from "node:test";
import assert from "node:assert/strict";
import type { App } from "obsidian";
import Marginalia from "../src/main.ts";
import { MarkdownView, TFile } from "./obsidian-mock.ts";
import { setAnswer } from "./ollama-mock.ts";
import { encode, makeExpansion } from "../src/core/storage.ts";
import { retrieve } from "../src/core/retrieval.ts";
import type { Note } from "../src/core/types.ts";
function host() {
  const text = new Map([
    ["02 Character/Mira.md", "## Summary\n\n## Backstory\n"],
    ["01 Lore/Archive.md", "Mira guards the eastern archive."],
  ]);
  const files = [...text.keys()].map((p) => new TFile(p));
  const generated = new Map<string, string>();
  const dirs = new Set<string>();
  let editorText = text.get(files[0].path)!;
  const transactions: any[] = [];
  const editor = {
    focus: () => {},
    getValue: () => editorText,
    offsetToPos: (offset: number) => ({ line: 0, ch: offset }),
    transaction: (tx: any) => {
      transactions.push(tx);
      const change = tx.changes[0];
      editorText =
        editorText.slice(0, change.from.ch) +
        change.text +
        editorText.slice(change.from.ch);
      text.set(files[0].path, editorText);
    },
  };
  const view = new MarkdownView(files[0], editor);
  const app = {
    vault: {
      getMarkdownFiles: () => files,
      getAbstractFileByPath: (p: string) => files.find((f) => f.path === p),
      read: async (f: any) => text.get(f.path)!,
      adapter: {
        exists: async (p: string) => generated.has(p) || dirs.has(p),
        read: async (p: string) => generated.get(p)!,
        write: async (p: string, v: string) => generated.set(p, v),
        mkdir: async (p: string) => dirs.add(p),
        list: async (p: string) => ({
          files: [...generated.keys()].filter((path) =>
            path.startsWith(p + "/"),
          ),
          folders: [],
        }),
      },
    },
    metadataCache: {
      getFileCache: () => ({ frontmatter: {} }),
      getFirstLinkpathDest: (target: string) =>
        files.find((f) => f.path.replace(/\.md$/, "") === target),
    },
    workspace: {
      getLeavesOfType: () => [],
      iterateAllLeaves: (fn: any) => fn({ view }),
      openLinkText: async () => {},
    },
  };
  const plugin = new Marginalia(app as unknown as App, {
    id: "marginalia",
    name: "Marginalia",
    version: "0.1.0",
    minAppVersion: "1.8.7",
    description: "test",
    author: "test",
  });
  plugin.target = files[0].path;
  plugin.settings.model = "local-model";
  plugin.openExpansion = async () => {};
  return {
    plugin,
    view,
    text,
    files,
    generated,
    transactions,
    editorText: () => editorText,
    setEditor: (value: string) => {
      editorText = value;
      text.set(files[0].path, value);
    },
  };
}

test("enhancement cannot write canon until an explicit single editor transaction", async () => {
  setAnswer(
    async () =>
      "## Summary\n\nMira guards the eastern archive.\n\n## Backstory\n\nHer earlier history is not established.",
  );
  const h = host();
  const original = h.editorText();
  await h.plugin.run("enhancement");
  assert.equal(h.plugin.error, "");
  assert.equal(h.transactions.length, 0);
  assert.equal(h.editorText(), original);
  assert.equal(h.generated.size, 0);
  assert.equal(h.plugin.current().suggestions.length, 2);
  await h.plugin.insert(h.plugin.current().suggestions[0]);
  assert.equal(h.transactions.length, 1);
  assert.match(h.editorText(), /Mira guards/);
  await h.plugin.insert(h.plugin.current().suggestions[1]);
  assert.equal(h.transactions.length, 2);
  assert.match(h.editorText(), /earlier history/);
  assert.equal(h.plugin.error, "");
});
test("user edits or evidence changes block stale insertion without mutation", async () => {
  setAnswer(async () => "## Summary\n\nMira guards the eastern archive.");
  const h = host();
  await h.plugin.run("enhancement");
  h.setEditor(h.editorText() + "\nUser added a line.");
  const changed = h.editorText();
  await h.plugin.insert(h.plugin.current().suggestions[0]);
  assert.match(h.plugin.error, /changed/);
  assert.equal(h.transactions.length, 0);
  assert.equal(h.editorText(), changed);
});
test("source changes during generation invalidate output and preserve prior suggestions", async () => {
  const h = host();
  setAnswer(async () => "## Summary\n\nMira guards the eastern archive.");
  await h.plugin.run("enhancement");
  setAnswer(async () => {
    h.text.set("01 Lore/Archive.md", "Mira has left the archive.");
    return "## Summary\n\nMira guards the eastern archive.";
  });
  await h.plugin.run("enhancement");
  assert.match(h.plugin.error, /changed/);
  assert.equal(h.plugin.current().suggestions.length, 1);
  assert.equal(h.transactions.length, 0);
});
test("switching notes during generation keeps results attached to original target", async () => {
  const h = host();
  const original = h.plugin.target!;
  setAnswer(async () => {
    h.plugin.target = "01 Lore/Archive.md";
    return "## Summary\n\nMira guards the eastern archive.";
  });
  await h.plugin.run("enhancement");
  assert.equal(h.plugin.current().suggestions.length, 0);
  assert.equal(h.plugin.current(original).suggestions.length, 1);
});
test("cancelled generation cannot publish suggestions or write files", async () => {
  const h = host();
  setAnswer(async () => {
    h.plugin.operation!.abort();
    return "## Summary\n\nMira guards the eastern archive.";
  });
  await h.plugin.run("enhancement");
  assert.equal(h.plugin.current().suggestions.length, 0);
  assert.equal(h.generated.size, 0);
  assert.equal(h.transactions.length, 0);
});
test("expansion writes only hidden sidecar and preserves original", async () => {
  const h = host();
  setAnswer(async () => "## Summary\n\nMira guards the eastern archive.");
  const original = h.editorText();
  await h.plugin.run("expansion");
  assert.equal(h.plugin.error, "");
  assert.equal(h.transactions.length, 0);
  assert.equal(h.editorText(), original);
  assert.deepEqual(
    [...h.generated.keys()],
    [".marginalia/expanded/02 Character/Mira.md"],
  );
  assert.equal(h.plugin.expansions.length, 1);
});
test("standalone-owned expansion is not overwritten or sent for generation", async () => {
  const h = host();
  const notes: Note[] = [...h.text].map(([path, text]) => ({
    path,
    text,
    mtime: 1,
    aliases: [],
    links: [],
    metadata: {},
  }));
  const e = makeExpansion(
    retrieve(notes, notes[0]),
    "## Summary\n\nOriginal generated text.",
  );
  const legacy = encode(e).replace("marginalia-plugin: 1\n", "");
  h.generated.set(".marginalia/expanded/" + e.entry, legacy);
  let calls = 0;
  setAnswer(async () => {
    calls++;
    return "## Summary\n\nReplacement";
  });
  await h.plugin.run("expansion");
  assert.equal(calls, 0);
  assert.match(h.plugin.error, /preserved/);
  assert.equal(h.generated.get(".marginalia/expanded/" + e.entry), legacy);
});

test("a literal Character template preserves the Summary callout as an allowed section", async () => {
  const h = host();
  const template = new TFile("_templates/Character.md");
  h.files.push(template);
  h.text.set(
    template.path,
    "> [!abstract] Summary\n>\n\n## Backstory\n\n## Goals\n",
  );
  const packet = await h.plugin.packet(
    h.plugin.target!,
    new AbortController().signal,
  );
  assert.deepEqual(packet.headings, [
    "Summary",
    "Backstory",
    "Goals",
    "Related Entries",
  ]);
  setAnswer(
    async () => "> [!abstract] Summary\n> Mira guards the eastern archive.",
  );
  await h.plugin.run("enhancement");
  assert.equal(h.plugin.error, "");
  assert.equal(h.plugin.current().suggestions[0].section, "Summary");
});

test("reading mode ignores the dormant editor and activates native editing before insertion", async () => {
  const h = host();
  h.view.mode = "preview";
  assert.equal(h.plugin.activeText(h.files[0] as any), null);
  setAnswer(async () => "## Summary\n\nMira guards the eastern archive.");
  await h.plugin.run("enhancement");
  await h.plugin.insert(h.plugin.current().suggestions[0]);
  assert.equal(h.plugin.error, "");
  assert.equal(h.view.getMode(), "source");
  assert.deepEqual(h.view.stateChanges, [{ mode: "source" }]);
  assert.equal(h.transactions.length, 1);
  assert.match(h.editorText(), /Mira guards/);
});

test("unpin immediately follows the most recent canonical note", () => {
  const h = host();
  h.plugin.followNote("02 Character/Mira.md");
  h.plugin.togglePin();
  h.plugin.followNote("01 Lore/Archive.md");
  assert.equal(h.plugin.target, "02 Character/Mira.md");
  assert.equal(h.plugin.pinned, true);
  h.plugin.togglePin();
  assert.equal(h.plugin.target, "01 Lore/Archive.md");
  assert.equal(h.plugin.pinned, false);
});

test("Lore entries receive their type guidance and canon writer during expansion", async () => {
  const h = host();
  h.plugin.target = "01 Lore/Archive.md";
  const packet = await h.plugin.packet(
    h.plugin.target,
    new AbortController().signal,
  );
  assert.match(packet.guidance, /history, tradition or knowledge/);
  assert.match(packet.guidance, /belief, a disputed account/);
  const original = h.text.get(h.plugin.target);
  let system = "",
    user = "";
  setAnswer(async (_settings, s, p) => {
    system = s;
    user = p;
    return "## Summary\n\nMira guards the eastern archive.";
  });
  await h.plugin.run("expansion");
  assert.equal(h.plugin.error, "");
  assert.match(system, /canon reference notes/);
  assert.ok(user.includes(packet.guidance));
  assert.equal(h.text.get(h.plugin.target), original);
  assert.ok(h.generated.has(".marginalia/expanded/01 Lore/Archive.md"));
});

test("script edits use one native undo transaction and focus the authored block", async () => {
  const { applyScriptEdit } = await import("../src/scripts/view.ts");
  let text = "before\nold\nafter",
    calls = 0,
    cursor = -1,
    focused = false;
  const editor = {
    offsetToPos: (offset: number) => ({ line: 0, ch: offset }),
    transaction: (tx: any) => {
      calls++;
      const c = tx.changes[0];
      text = text.slice(0, c.from.ch) + c.text + text.slice(c.to.ch);
    },
    setCursor: (pos: any) => {
      cursor = pos.ch;
    },
    focus: () => {
      focused = true;
    },
  };
  applyScriptEdit(editor as any, {
    from: 7,
    to: 10,
    text: "new panel",
    cursor: 16,
  });
  assert.equal(calls, 1);
  assert.equal(text, "before\nnew panel\nafter");
  assert.equal(cursor, 16);
  assert.ok(focused);
});
test("saving model settings preserves script order and serializes concurrent saves", async () => {
  const { plugin } = host();
  const values: any[] = [];
  plugin.scriptOrders = { '["Example","Draft"]': ["B.md", "A.md"] };
  plugin.saveData = async (value) => {
    values.push(structuredClone(value));
  };
  await Promise.all([plugin.savePluginData(), plugin.savePluginData()]);
  assert.equal(values.length, 2);
  assert.deepEqual(values[1].scriptOrders, plugin.scriptOrders);
});

async function orderHost() {
  const { ScriptController, scriptMetadata } =
    await import("../src/scripts/controller.ts");
  const files = [
    new TFile("Project/Scripts/A.md"),
    new TFile("Project/Scripts/B.md"),
  ];
  const sources = new Map(
    files.map((f, i) => [
      f.path,
      `---\nGroup: Draft\nPages: ${i + 1}\n---\n\n## Page 1\n\n> [!panel] ${i ? "B" : "A"}\n> Body.\n`,
    ]),
  );
  let processes = 0;
  const app: any = {
    vault: {
      getMarkdownFiles: () => files,
      getAbstractFileByPath: (p: string) => files.find((f) => f.path === p),
      read: async (f: TFile) => sources.get(f.path)!,
      process: async (f: TFile, fn: (s: string) => string) => {
        processes++;
        const next = fn(sources.get(f.path)!);
        sources.set(f.path, next);
        return next;
      },
    },
    metadataCache: {
      getFileCache: (f: TFile) => ({
        frontmatter: scriptMetadata(sources.get(f.path)!),
      }),
      getFirstLinkpathDest: (link: string) =>
        files.find(
          (f) => f.path.replace(/\.md$/, "") === link || f.basename === link,
        ),
    },
    workspace: { iterateAllLeaves: () => {} },
  };
  const plugin: any = {
    app,
    scriptOrders: { '["Project","Draft"]': [files[0].path, files[1].path] },
  };
  const controller = new ScriptController(plugin);
  return {
    controller,
    files,
    sources,
    app,
    count: () => processes,
    scriptMetadata,
  };
}
test("auto-fill persists portable predecessor fields once and drag rewrites both ends", async () => {
  const h = await orderHost(),
    bodies = [...h.sources.values()].map((s) => s.slice(s.indexOf("## Page")));
  assert.ok(await h.controller.fillMissing(await h.controller.groups()));
  assert.equal(h.count(), 2);
  let [group] = await h.controller.groups();
  assert.equal(
    group.scripts.find((s) => s.path === h.files[0].path)!.metadata[
      "Preceded By"
    ],
    "",
  );
  assert.equal(
    group.scripts.find((s) => s.path === h.files[1].path)!.metadata[
      "Preceded By"
    ],
    "[[Project/Scripts/A]]",
  );
  assert.equal(await h.controller.fillMissing([group]), false);
  assert.equal(h.count(), 2);
  await h.controller.reorder(group, [h.files[1].path, h.files[0].path]);
  [group] = await h.controller.groups();
  assert.deepEqual(
    group.sequences[0].map((s) => s.path),
    [h.files[1].path, h.files[0].path],
  );
  assert.deepEqual(
    [...h.sources.values()].map((s) => s.slice(s.indexOf("## Page"))),
    bodies,
  );
});
test("a stale snapshot aborts the entire ordering batch before writes", async () => {
  const h = await orderHost(),
    [group] = await h.controller.groups(),
    before = h.sources.get(h.files[0].path);
  h.sources.set(h.files[1].path, h.sources.get(h.files[1].path)! + "New edit.");
  await assert.rejects(
    () => h.controller.reorder(group, [h.files[1].path, h.files[0].path]),
    /changed/,
  );
  assert.equal(h.count(), 0);
  assert.equal(h.sources.get(h.files[0].path), before);
});
test("a later write failure rolls back earlier order changes without overwriting a new edit", async () => {
  const h = await orderHost(),
    [group] = await h.controller.groups(),
    before = h.sources.get(h.files[1].path);
  const original = h.app.vault.process;
  let attempt = 0;
  h.app.vault.process = async (file: TFile, fn: any) => {
    if (++attempt === 2) {
      h.sources.set(
        file.path,
        h.sources.get(file.path)! + "Concurrent author edit.",
      );
    }
    return original(file, fn);
  };
  await assert.rejects(
    () => h.controller.reorder(group, [h.files[1].path, h.files[0].path]),
    /changed/,
  );
  assert.equal(h.sources.get(h.files[1].path), before);
  assert.ok(
    h.sources.get(h.files[0].path)!.endsWith("Concurrent author edit."),
  );
});
test("dirty native editors block metadata ordering before any write", async () => {
  const h = await orderHost(),
    [group] = await h.controller.groups();
  h.app.workspace.iterateAllLeaves = (fn: any) =>
    fn({
      view: new MarkdownView(h.files[0], {
        getValue: () => h.sources.get(h.files[0].path)! + "Unsaved",
      }),
    });
  await assert.rejects(
    () => h.controller.reorder(group, [h.files[1].path, h.files[0].path]),
    /Save your script/,
  );
  assert.equal(h.count(), 0);
});

test("saving AI settings also preserves writing preferences, scope and daily totals", async () => {
  const { plugin } = host();
  let saved: any;
  plugin.writing.selection = { scope: "Project", group: "Draft" };
  plugin.writing.preferences.dailyGoal = 500;
  plugin.writing.daily.projects.Project = 30;
  plugin.settings.model = "local-model";
  plugin.saveData = async (value) => {
    saved = structuredClone(value);
  };
  await plugin.savePluginData();
  assert.equal(saved.model, "local-model");
  assert.equal(saved.writing.preferences.dailyGoal, 500);
  assert.equal(saved.writing.selection.group, "Draft");
  assert.equal(saved.writing.daily.projects.Project, 30);
});
test("failed scope persistence retains the previous session and opens no replacement view", async () => {
  const h = await orderHost();
  h.controller.session.data.selection = { scope: "Previous" };
  h.controller.plugin.savePluginData = async () => {
    throw new Error("Storage unavailable");
  };
  let opened = false;
  h.app.workspace.getLeaf = () => {
    opened = true;
  };
  await assert.rejects(
    () => h.controller.select({ scope: "New", group: "Draft" }),
    /Storage unavailable/,
  );
  assert.deepEqual(h.controller.session.data.selection, { scope: "Previous" });
  assert.equal(opened, false);
});

test("scope selection reuses the main writing tab before revealing the sidebar", async () => {
  const h = await orderHost();
  let active: any = {
      setViewState: async (state: any) => {
        assert.equal(state.type, "marginalia-project");
        assert.equal(state.state.group, "Draft");
      },
    },
    selected = active;
  h.controller.plugin.savePluginData = async () => {};
  const sidebar = { setViewState: async () => {} };
  h.app.workspace.getMostRecentLeaf = () => active;
  h.app.workspace.getLeavesOfType = () => [sidebar];
  h.app.workspace.getLeaf = () => {
    throw new Error("Should reuse current main tab");
  };
  h.app.workspace.revealLeaf = async (leaf: any) => {
    active = leaf;
  };
  await h.controller.select({ scope: "Project", group: "Draft" });
  assert.equal(active, selected);
});

test("writing activity ignores attachments, hidden output and templates", async () => {
  const { controller } = await orderHost();
  assert.equal(controller.wordEligible("Assets/panel.png"), false);
  assert.equal(controller.wordEligible(".marginalia/expanded/A.md"), false);
  assert.equal(controller.wordEligible("_templates/Script.md"), false);
  assert.equal(controller.wordEligible("Project/Scripts/A.md"), true);
});


test("Studio opens in the left sidebar without replacing the main editor and reuses its tab", async () => {
  const h = await orderHost();
  const root = {}, states: any[] = [], revealed: any[] = [];
  const leaf = { getRoot: () => root, setViewState: async (state: any) => states.push(state) };
  let existing: any[] = [];
  h.app.workspace.leftSplit = root;
  h.app.workspace.getLeavesOfType = (type: string) => type === "marginalia-scripts" ? existing : [];
  h.app.workspace.getLeftLeaf = () => leaf;
  h.app.workspace.getMostRecentLeaf = () => { throw new Error("Do not touch main editor"); };
  h.app.workspace.revealLeaf = async (item: any) => { revealed.push(item); };
  await h.controller.openStudio();
  existing = [leaf];
  await h.controller.openStudio();
  assert.deepEqual(states, [{type:"marginalia-scripts",active:true}]);
  assert.deepEqual(revealed, [leaf,leaf]);
});
test("Studio migrates legacy main tabs only after a sidebar view opens", async () => {
  const h = await orderHost();
  let detached = 0, ready = false;
  const root = {};
  const legacy = { getRoot: () => ({}), detach: () => { assert.ok(ready); detached++; } };
  const leaf = {setViewState: async () => {ready = true;}};
  h.app.workspace.leftSplit = root;
  h.app.workspace.getLeavesOfType = (type: string) => type === "marginalia-script-studio" ? [legacy] : [];
  h.app.workspace.getLeftLeaf = () => leaf;
  h.app.workspace.revealLeaf = async () => {};
  await h.controller.openStudio();
  assert.equal(detached, 1);
});


test("panel-only folding opens pages, folds only panels and preserves selections and source", async () => {
  const h = await orderHost();
  const text = "---\nGroup: Draft\nPages: 1\n---\n## Page 1\n> [!panel] First\n> Description\n\n> [!note] Note\n> Keep visible\n\n> [!panel] Second\n> More";
  const events: any[] = [], selections = [{anchor:{line:7,ch:1},head:{line:7,ch:3}}];
  const editor = { getValue: () => text, listSelections: () => selections,
    setSelections: (value: any) => assert.equal(value,selections),
    exec: (command: string) => events.push(command), setCursor: (value: any) => events.push(value.line) };
  const view = new MarkdownView(new TFile("Project/Scripts/A.md"),editor);
  (view as any).getViewType = () => "markdown";
  h.app.workspace.getMostRecentLeaf = () => ({view});
  const classes = new Set<string>();
  editorViews.set(editor as any, {dom:{classList:{add:(value:string)=>classes.add(value),remove:(value:string)=>classes.delete(value)}},dispatch: (transaction: any) => events.push(...transaction.effects.map((e: any) => e.value))} as any);
  await h.controller.foldScript("panels");
  assert.deepEqual(events,["unfoldAll",{from:text.indexOf("\n> Description"),to:text.indexOf("\n\n> [!note]")},{from:text.indexOf("\n> More"),to:text.length}]);
  assert.equal(editor.getValue(),text);
  assert.ok(classes.has("marginalia-panels-collapsed"));
  events.length=0;
  await h.controller.foldScript("collapse");
  await h.controller.foldScript("expand");
  assert.equal(events[0],"foldAll");
  assert.equal(events.at(-1),"unfoldAll");
  assert.equal(classes.size,0);
});
test("folding rejects ordinary notes and forwards project reading modes", async () => {
  const h = await orderHost();
  const view = new MarkdownView(new TFile("Ordinary.md"),{getValue:()=>"Text"});
  (view as any).getViewType=()=>"markdown";
  h.app.workspace.getMostRecentLeaf=()=>({view});
  await assert.rejects(()=>h.controller.foldScript("panels"),/comic script/);
  let mode="";
  h.app.workspace.getMostRecentLeaf=()=>({view:{getViewType:()=>"marginalia-project",setFolds:(value:string)=>{mode=value;}}});
  await h.controller.foldScript("panels");
  assert.equal(mode,"panels");
});


test("Collapse all keeps Double Spread folded when the cursor is inside its body", async () => {
  const h = await orderHost();
  const text = "## Page 1\n\nFirst\n\n## Page 2 Double Spread\n\nSide: Double Spread\n\n> [!panel] Archive\n> Shelves\n\n## Page 4\n\nLast";
  const cursor=text.indexOf("Side: Double Spread");
  let state=EditorState.create({doc:text,selection:{anchor:cursor},extensions:[codeFolding()]});
  const classes=new Set<string>();
  const editor={getValue:()=>text,exec:()=>{},setSelections:()=>{throw new Error("Restoring selections would reopen the spread");}};
  const cm={get state(){return state;},dom:{classList:{add:(s:string)=>classes.add(s),remove:(s:string)=>classes.delete(s),contains:(s:string)=>classes.has(s)}},dispatch:(spec:any)=>{state=state.update(spec).state;}};
  editorViews.set(editor as any,cm as any);
  const view=new MarkdownView(new TFile("Project/Scripts/Opening.md"),editor);
  (view as any).getViewType=()=>"markdown";
  h.app.workspace.getMostRecentLeaf=()=>({view});
  await h.controller.foldScript("collapse");
  let spreadFolded=false;
  foldedRanges(state).between(0,text.length,(from,to)=>{if(from<cursor && to>cursor) spreadFolded=true;});
  assert.ok(spreadFolded);
  assert.equal(state.selection.main.head,cursor);
  assert.equal(state.doc.toString(),text);
  assert.deepEqual(h.controller.foldStatus(),{any:true,panels:true});
});


test("shortcut conversion is one isolated Undo and preserves typed command",()=>{
 const before="## Page 1\n\nSide: Right\n\n";
 let state=EditorState.create({doc:before,selection:{anchor:before.length},extensions:[history()]});
 const dispatch=(spec:any)=>{state=state.update(spec).state;};
 dispatch({changes:{from:before.length,insert:"/p"},selection:{anchor:before.length+2}});
 const command=state.doc.toString();
 const edit=planShortcut({path:"Project/Scripts/Test.md",text:command,metadata:{}},command.length)!;
 const view={get state(){return state;},dispatch};
 commitShortcut(view as any,edit);
 assert.equal(state.sliceDoc(state.selection.main.from,state.selection.main.to),"New panel");
 assert.ok(undo({state,dispatch:(tr:any)=>{state=tr.state;}} as any));
 assert.equal(state.doc.toString(),command);
 assert.ok(undo({state,dispatch:(tr:any)=>{state=tr.state;}} as any));
 assert.equal(state.doc.toString(),before);
});
test("Enter shortcut handler leaves composition, multiple carets and selected text untouched",()=>{
 const doc={toString:()=>"## Page 1\n\n/p"};
 for(const state of [
  {selection:{ranges:[{},{}],main:{empty:true}},doc},
  {selection:{ranges:[{}],main:{empty:false}},doc},
 ]) assert.equal(handleScriptEnter({state,composing:false} as any),false);
 assert.equal(handleScriptEnter({composing:true} as any),false);
});


test("workspace module choices save alongside writing and AI settings",async()=>{
 const {plugin}=host();let saved:any;plugin.workspaceSettings.modules.theme=false;plugin.workspaceSettings.modules.librarian=false;plugin.workspaceSettings.vaultType="Storyboard";plugin.workspaceSettings.projectStatusField="progress";plugin.workspaceSettings.projectStatusOrder=["Ready","Drafting"];plugin.writing.preferences.dailyGoal=350;plugin.saveData=async(value:any)=>{saved=structuredClone(value);};await plugin.savePluginData();
 assert.equal(saved.workspace.modules.theme,false);assert.equal(saved.workspace.vaultType,"Storyboard");assert.equal(saved.workspace.projectStatusField,"progress");assert.deepEqual(saved.workspace.projectStatusOrder,["Ready","Drafting"]);assert.equal(saved.writing.preferences.dailyGoal,350);assert.equal(saved.endpoint,plugin.settings.endpoint);
});
test("disabled Librarian rejects stale generation actions before retrieval",async()=>{
 const {plugin}=host();plugin.workspaceSettings.modules.librarian=false;plugin.snapshot=async()=>{throw new Error("Should not read notes while disabled");};await plugin.run("expansion");await plugin.ask("Question");assert.equal(plugin.operation,null);
});
test("module save failure restores the prior choice without changing runtime features",async()=>{
 const {plugin}=host();let applied=false;plugin.applyModules=()=>{applied=true;};plugin.saveData=async()=>{throw new Error("Disk unavailable");};await assert.rejects(()=>plugin.setModule("scripts",false),/Disk unavailable/);assert.equal(plugin.workspaceSettings.modules.scripts,true);assert.equal(applied,false);
});
