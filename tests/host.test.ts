import { history, undo } from "@codemirror/commands";
import { commitShortcut, handleScriptEnter } from "../src/scripts/shortcut-extension.ts";
import { planShortcut } from "../src/scripts/shortcuts.ts";
import {speakerPicker,openSpeakerPicker,chooseSpeaker,speakerKeys} from "../src/scripts/speaker-picker.ts";
import { EditorState } from "@codemirror/state";
import { codeFolding, foldedRanges } from "@codemirror/language";
import { editorViews } from "../src/scripts/folding.ts";
import test from "node:test";
import assert from "node:assert/strict";
import type { App } from "obsidian";
import Marginalia from "../src/main.ts";
import { MarkdownView, TFile, TFolder, Platform } from "./obsidian-mock.ts";
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
test("dialogue picker filters and accepts a linked speaker, selects Dialogue, and preserves isolated Undo",()=>{
 const text="## Page 1\n\n/d";
 const edit=planShortcut({path:"Project/Scripts/Test.md",text,metadata:{}},text.length)!;
 const candidate={id:"Mira.md",name:"Mira",insert:"[[Mira|Mira]]",path:"Mira.md"};
 let state=EditorState.create({doc:text,selection:{anchor:text.length},extensions:[history(),speakerPicker]});
 const dispatch=(spec:any)=>{state=state.update(spec).state;};
 const view={get state(){return state;},dispatch,composing:false};
 commitShortcut(view as any,edit,[openSpeakerPicker.of({from:edit.anchor,to:edit.head,candidates:[candidate],query:"",selected:0})]);
 dispatch({changes:{from:edit.anchor,to:edit.head,insert:"mi"},selection:{anchor:edit.anchor+2}});
 assert.equal(state.field(speakerPicker)?.query,"mi");
 assert.equal(chooseSpeaker(view as any),true);
 assert.match(state.doc.toString(),/\*\*\[\[Mira\|Mira\]\]:\*\* Dialogue/);
 assert.equal(state.sliceDoc(state.selection.main.from,state.selection.main.to),"Dialogue");
 assert.equal(state.field(speakerPicker),null);
 assert.ok(undo({state,dispatch:(tr:any)=>{state=tr.state;}} as any));
 assert.match(state.doc.toString(),/\*\*mi:\*\*/);
});
test("picker Escape and edits outside its range close without rewriting source",()=>{
 const text="**SPEAKER:** Dialogue";let state=EditorState.create({doc:text,selection:{anchor:2,head:9},extensions:[speakerPicker]});
 const dispatch=(spec:any)=>{state=state.update(spec).state;};const view={get state(){return state;},dispatch,composing:false};
 const open=()=>dispatch({effects:openSpeakerPicker.of({from:2,to:9,candidates:[{id:"M",name:"Mira",insert:"Mira"}],query:"",selected:0})});
 open();assert.equal(speakerKeys.find(k=>k.key==="Escape")!.run!(view as any),true);assert.equal(state.field(speakerPicker),null);assert.equal(state.doc.toString(),text);
 open();dispatch({changes:{from:text.length,insert:"!"}});assert.equal(state.field(speakerPicker),null);
});
test("speaker arrows cycle and accepting no match leaves a typed new name unchanged",()=>{
 const doc="**SPEAKER:** Dialogue";let state=EditorState.create({doc,selection:{anchor:2,head:9},extensions:[speakerPicker]});
 const dispatch=(spec:any)=>{state=state.update(spec).state;};const view={get state(){return state;},dispatch,composing:false};
 dispatch({effects:openSpeakerPicker.of({from:2,to:9,candidates:[{id:"M",name:"Mira",insert:"Mira"},{id:"O",name:"Orin",insert:"Orin"}],query:"",selected:0})});
 speakerKeys.find(k=>k.key==="ArrowUp")!.run!(view as any);assert.equal(state.field(speakerPicker)?.selected,1);
 speakerKeys.find(k=>k.key==="ArrowDown")!.run!(view as any);assert.equal(state.field(speakerPicker)?.selected,0);
 dispatch({changes:{from:2,to:9,insert:"New Person"},selection:{anchor:12}});
 const before=state.doc.toString();assert.equal(chooseSpeaker(view as any),false);assert.equal(state.doc.toString(),before);assert.equal(state.field(speakerPicker),null);
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

async function creationHost() {
  const h = await orderHost();
  await h.controller.fillMissing(await h.controller.groups());
  const template = new TFile('_templates/Script.md');
  const source = '---\nTitle:\nGroup:\nPages:\nCharacters:\nCustom: "keep me"\n---\n\n> [!tip]- Guide\n> Edited by the author.\n\n## Page 1 — PAGE TITLE\n\nSide: Right\n\nLocation: INT. LOCATION\n\n> [!panel]\n> Write here.\n\n<% literal template code %>\n';
  h.files.push(template);
  h.sources.set(template.path, source);
  const folders = ['/', 'Project', 'Project/Scripts', 'Elsewhere', '_templates', 'Archive', '.hidden'].map(p=>new TFolder(p));
  h.app.vault.getAbstractFileByPath = (path: string) => h.files.find(f=>f.path===path) ?? folders.find(f=>f.path===path);
  h.app.vault.create = async (path: string, text: string) => {
    if (h.app.vault.getAbstractFileByPath(path)) throw new Error('File already exists');
    const file = new TFile(path);
    h.files.push(file);
    h.sources.set(path, text);
    return file;
  };
  const opened: string[] = [];
  h.app.workspace.getLeaf = () => ({openFile: async (file: TFile)=>{ opened.push(file.path); }});
  h.controller.openStudio = async () => {};
  h.controller.plugin.savePluginData = async () => {};
  h.controller.session.data.preferences.scriptTemplate = template.path;
  h.controller.session.ready = true;
  h.controller.session.data.selection = {scope:'Project', group:'Draft'};
  return {...h, template, source, folders, opened};
}

test('script creation preserves the edited template body and unrelated properties, appends in order and opens the note', async () => {
  const h = await creationHost();
  const before = new Map(h.sources);
  const file = await h.controller.createScript('Project/Scripts', 'New Script.md', 'Draft');
  const text = h.sources.get(file.path)!;
  const metadata = h.scriptMetadata(text);
  assert.equal(metadata.Title, 'New Script');
  assert.equal(metadata.role, 'manuscript');
  assert.equal(metadata.format, 'comic-script');
  assert.equal(metadata.Group, 'Draft');
  assert.equal(metadata['Preceded By'], '[[Project/Scripts/B]]');
  assert.equal(metadata.Pages, null);
  assert.equal(metadata.Custom, 'keep me');
  assert.equal(text.slice(text.indexOf('> [!tip]')), h.source.slice(h.source.indexOf('> [!tip]')));
  for(const [path, source] of before) assert.equal(h.sources.get(path), source);
  assert.deepEqual(h.opened, [file.path]);
  const groups = await h.controller.groups();
  assert.deepEqual(groups[0].sequences.flat().map(s=>s.path), ['Project/Scripts/A.md','Project/Scripts/B.md',file.path]);
  assert.equal(h.controller.session.data.daily.vault, 0, 'copied scaffolding earns no writing credit');
  assert.equal(h.controller.busy, false);
});

test('folder creation works outside Scripts and for an empty destination; sidebar destination follows its active list', async () => {
  const h = await creationHost();
  assert.equal(await h.controller.creationFolder(), 'Project/Scripts');
  h.controller.session.data.selection = {scope:'Project'};
  await h.controller.createScript('Project/Scripts', 'Project Wide', 'Draft');
  assert.deepEqual(h.controller.session.data.selection, {scope:'Project'}, 'all-groupings selection stays broad');
  const file = await h.controller.createScript('Elsewhere', 'First');
  assert.equal(h.scriptMetadata(h.sources.get(file.path)!)['Preceded By'], '');
  assert.deepEqual(h.controller.session.data.selection, {scope:'Elsewhere',group:'Top-level'});
  assert.equal(await h.controller.creationFolder(), 'Elsewhere');
  const root = await h.controller.createScript('/', 'Root Script');
  assert.equal(root.path, 'Root Script.md');
});

test('creation rejects missing templates, malformed YAML, collisions, unsafe paths and order conflicts without writing', async () => {
  const h = await creationHost();
  const before = new Map(h.sources);
  for (const name of ['', '../escape', 'nested/name', 'bad:name', '.hidden', 'bad#anchor', 'bad|link'])
    await assert.rejects(h.controller.createScript('Project/Scripts',name,'Draft'), /script name/);
  for (const folder of ['missing','_templates','Archive','.hidden'])
    await assert.rejects(h.controller.createScript(folder,'Rejected','Draft'));
  await assert.rejects(h.controller.createScript('Project/Scripts','A','Draft'), /already exists/);
  h.controller.session.data.preferences.scriptTemplate = 'missing.md';
  await assert.rejects(h.controller.createScript('Project/Scripts','Rejected','Draft'), /template/);
  h.controller.session.data.preferences.scriptTemplate = h.template.path;
  h.sources.set(h.template.path, '---\nUnclosed: yes\n');
  await assert.rejects(h.controller.createScript('Project/Scripts','Rejected','Draft'), /frontmatter/);
  assert.equal(h.controller.busy, false);
  h.sources.set(h.template.path, h.source);
  h.sources.set('Project/Scripts/B.md', '---\nGroup: Draft\nPreceded By: "[[Missing]]"\n---\n## Page 1');
  await assert.rejects(h.controller.createScript('Project/Scripts','Rejected','Draft'), /ordering warnings/);
  h.sources.set('Project/Scripts/B.md', before.get('Project/Scripts/B.md')!);
  assert.deepEqual(h.sources, before);
});

test('creation handles a simultaneous filename collision, storage failure and repeated request safely', async () => {
  const h = await creationHost();
  const create = h.app.vault.create;
  h.app.vault.create = async () => { throw new Error('Disk full'); };
  await assert.rejects(h.controller.createScript('Project/Scripts','New','Draft'), /Disk full/);
  assert.equal(h.controller.busy, false);
  h.app.vault.create = async (path: string, text: string) => {
    const file = new TFile(path);
    h.files.push(file);
    h.sources.set(path,'External note');
    return create(path,text);
  };
  await assert.rejects(h.controller.createScript('Project/Scripts','New','Draft'), /already exists/);
  assert.equal(h.sources.get('Project/Scripts/New.md'),'External note');
  h.app.vault.create = create;
  await assert.rejects(h.controller.createScript('Project/Scripts','New','Draft'), /already exists/);
});

test('concurrent creation is serialized and a post-create preference failure cannot turn success into a retry', async () => {
  const h = await creationHost();
  const create = h.app.vault.create;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  h.app.vault.create = async (path: string, text: string) => { await gate; return create(path,text); };
  const first = h.controller.createScript('Project/Scripts','First','Draft');
  await assert.rejects(h.controller.createScript('Project/Scripts','Second','Draft'), /in progress/);
  release();
  await first;
  h.controller.plugin.savePluginData = async () => { throw new Error('Preferences unavailable'); };
  const warn = console.warn;
  try {
    console.warn = () => {};
    const file = await h.controller.createScript('Project/Scripts','Third','Draft');
    assert.equal(h.sources.has(file.path), true);
    assert.equal(h.scriptMetadata(h.sources.get(file.path)!)['Preceded By'], '[[Project/Scripts/First]]');
  } finally { console.warn = warn; }
  assert.equal(h.controller.busy, false);
});

async function entryHost() {
  const h=await creationHost();
  const {readWorkspace}=await import('../src/workspace/model.ts');
  const owner:any=h.controller.plugin;
  owner.workspaceSettings=readWorkspace(undefined);
  owner.scriptController=h.controller;
  owner.activeText=()=>undefined;
  owner.themeFeature={refresh:()=>{}};
  h.app.vault.getAllLoadedFiles=()=>[...h.files,...h.folders];
  h.app.vault.createFolder=async(path:string)=> {
    if(h.app.vault.getAbstractFileByPath(path)) throw new Error('Already exists');
    const folder=new TFolder(path);h.folders.push(folder);return folder;
  };
  h.app.vault.delete=async(file:any)=>{const index=h.folders.indexOf(file);if(index>=0)h.folders.splice(index,1);};
  return {...h,owner};
}

test('New Entry preserves template source, merges tags, creates requested folders, and never moves original notes', async()=> {
  const h=await entryHost();
  const {createEntry}=await import('../src/workspace/creation.ts');
  const baseline=new Map(h.sources);
  const request:any={kind:'Canon',subtype:'Character',title:'New Character',folder:'World/People',template:h.template.path,createFolders:true};
  const file=await createEntry(h.owner,request);
  const text=h.sources.get(file.path)!;
  const metadata=h.scriptMetadata(text);
  assert.equal(file.path,'World/People/New Character.md');
  assert.deepEqual(metadata.tags,['character']);
  assert.equal(metadata.Title,'New Character');
  assert.equal(text.slice(text.indexOf('> [!tip]')),h.source.slice(h.source.indexOf('> [!tip]')));
  assert.equal(h.folders.some(f=>f.path==='World/People'),true);
  for(const [path,source] of baseline) assert.equal(h.sources.get(path),source);
  assert.equal(h.controller.session.data.daily.vault,0);
  await assert.rejects(createEntry(h.owner,request),/already exists/);
  await assert.rejects(createEntry(h.owner,{...request,title:'Bad',folder:'../outside'}),/vault-relative/);
  await assert.rejects(createEntry(h.owner,{...request,title:'Bad',template:'Missing.md'}),/existing Markdown/);
  await assert.rejects(createEntry(h.owner,{...request,title:'Bad',folder:'Absent',createFolders:false}),/does not exist/);
});

test('New Project creates an overview in its own folder; project subtypes remain in that project',async()=> {
  const h=await entryHost();
  const {createEntry}=await import('../src/workspace/creation.ts');
  const base:any={kind:'Project',subtype:'New Project',title:'New Book',folder:'08 Projects',template:'',createFolders:true};
  const overview=await createEntry(h.owner,base);
  assert.equal(overview.path,'08 Projects/New Book/Overview.md');
  assert.deepEqual(h.scriptMetadata(h.sources.get(overview.path)!).tags,['project-parent']);
  await assert.rejects(createEntry(h.owner,base),/already exists/);
  const request={...base,subtype:'Note',title:'Notes',folder:'08 Projects/New Book',project:'08 Projects/New Book'};
  const note=await createEntry(h.owner,request);
  assert.equal(note.path,'08 Projects/New Book/Notes.md');
  await assert.rejects(createEntry(h.owner,{...request,title:'Elsewhere',folder:'Elsewhere'}),/within the selected project/);
  await assert.rejects(createEntry(h.owner,{...request,title:'Missing project',project:'Gone'}),/existing project/);
});

test('New Entry script uses the chosen template without changing the script-template setting',async()=> {
  const h=await entryHost();
  const {createEntry}=await import('../src/workspace/creation.ts');
  const file=await createEntry(h.owner,{kind:'Project',subtype:'Script',title:'Another Script',folder:'Project/Scripts',template:h.template.path,createFolders:false,project:'Project'});
  assert.equal(h.scriptMetadata(h.sources.get(file.path)!)['Preceded By'],'[[Project/Scripts/B]]');
  assert.equal(h.controller.session.data.preferences.scriptTemplate,h.template.path);
  h.owner.workspaceSettings.modules.scripts=false;
  await assert.rejects(createEntry(h.owner,{kind:'Project',subtype:'Script',title:'Disabled',folder:'Project/Scripts',template:h.template.path,createFolders:false,project:'Project'}),/Enable Scripts/);
});

test('entry creation rolls back only its empty new folders when file creation fails',async()=> {
  const h=await entryHost();
  const {createEntry}=await import('../src/workspace/creation.ts');
  const before=h.folders.map(f=>f.path);
  h.app.vault.create=async()=>{throw new Error('Disk full');};
  await assert.rejects(createEntry(h.owner,{kind:'Brainstorm',subtype:'Brainstorm',title:'Idea',folder:'Missing/Ideas',template:'',createFolders:true}),/Disk full/);
  assert.deepEqual(h.folders.map(f=>f.path),before);
});

test('entry defaults resolve matching templates and metadata suggestions remain local and field-specific',async()=> {
  const h=await entryHost();
  const {entryDefaults,templateMatch}=await import('../src/workspace/creation.ts');
  const {propertyNames,propertyValues,vaultFolders}=await import('../src/ui/suggest.ts');
  assert.equal(templateMatch(['_templates/Character.md'],'_templates/Canon/Character.md','Character'),'_templates/Character.md');
  assert.equal(templateMatch(['_templates/Comic Script.md'],'','Script'),'_templates/Comic Script.md');
  assert.equal(templateMatch(['Notes/Character.md'],'','Character'),'');
  assert.equal(entryDefaults(h.owner.workspaceSettings,'Project','Script','Project').folder,'Project/Scripts');
  assert.ok(propertyNames(h.app).includes('Group'));
  assert.deepEqual(propertyValues(h.app,'GROUP'),['Draft']);
  assert.ok(vaultFolders(h.app).includes('Project'));
});

test('configured project script folders retain project identity for both creation entry points',async()=> {
  const h=await entryHost();
  const {createEntry}=await import('../src/workspace/creation.ts');
  const first=await createEntry(h.owner,{kind:'Project',subtype:'Script',title:'Custom Folder',folder:'Project/Manuscripts',template:h.template.path,createFolders:true,project:'Project'});
  assert.equal(h.scriptMetadata(h.sources.get(first.path)!).Project,'Project');
  assert.deepEqual(h.controller.session.data.selection,{scope:'Project',group:'Draft'});
  const second=await h.controller.createScript('Project/Manuscripts','Next Custom','Draft');
  const group=(await h.controller.groups()).find(group=>group.scope==='Project'&&group.group==='Draft')!;
  assert.deepEqual(group.sequences.flat().map(script=>script.path),['Project/Scripts/A.md','Project/Scripts/B.md',first.path,second.path]);
});

test('a multiword custom canon type replaces template classification tags while preserving unrelated tags',async()=> {
  const h=await entryHost();
  const {createEntry}=await import('../src/workspace/creation.ts');
  const {entryType}=await import('../src/workspace/model.ts');
  h.owner.workspaceSettings.canonTypes.push({name:'Magic Creature',folder:'World/Creatures',projectFolder:'Creatures',template:h.template.path});
  h.sources.set(h.template.path,'---\ntags: ["character","important"]\n---\n\nAuthor template body.');
  const file=await createEntry(h.owner,{kind:'Canon',subtype:'Magic Creature',title:'Creature',folder:'World/Creatures',template:h.template.path,createFolders:true});
  const metadata=h.scriptMetadata(h.sources.get(file.path)!);
  assert.deepEqual(metadata.tags,['important','magic-creature']);
  assert.equal(entryType(file.path,metadata.tags as string[],h.owner.workspaceSettings.canonTypes),'Magic Creature');
  assert.equal(entryType('Project/Creatures/Creature.md',['character'],h.owner.workspaceSettings.canonTypes),'Magic Creature');
});

test('Storyboard New Entry creates root projects and keeps global canon folders out of the project register',async()=> {
  const h=await entryHost();
  const {readWorkspace,projects}=await import('../src/workspace/model.ts');
  const {createEntry}=await import('../src/workspace/creation.ts');
  h.owner.workspaceSettings=readWorkspace({vaultType:'Storyboard'});
  const project=await createEntry(h.owner,{kind:'Project',subtype:'New Project',title:'Board',folder:'/',template:'',createFolders:true});
  assert.equal(project.path,'Board/Overview.md');
  const person=await createEntry(h.owner,{kind:'Canon',subtype:'Character',title:'Person',folder:'02 Character',template:'',createFolders:true});
  const entries=[project,person].map(file=>({path:file.path,name:file.basename,body:'',tags:h.scriptMetadata(h.sources.get(file.path)!).tags as string[],fields:{},modified:1,created:1}));
  assert.deepEqual(projects(entries,'Storyboard',[],h.owner.workspaceSettings).map(project=>project.path),['Board']);
});


test("mobile skips Librarian lifecycle without changing saved desktop choices", async () => {
  const {plugin}=host();
  const children:string[]=[];
  (plugin as any).addChild=(child:any)=>{children.push(child.constructor.name);return child;};
  plugin.workspaceSettings.modules.theme=false;
  Platform.isMobile=true;
  try {
    plugin.applyModules();
    assert.deepEqual(children,["ScriptFeature"]);
    assert.equal(plugin.workspaceSettings.modules.librarian,true);
    assert.equal(plugin.librarianFeature,undefined);
    await assert.rejects(()=>plugin.checkConnection(),/desktop only/);
    await assert.rejects(()=>plugin.generateText("","",new AbortController().signal),/desktop only/);
    await plugin.run("expansion");
    await plugin.ask("Question");
    assert.equal(plugin.operation,null);
    assert.equal(plugin.sessions.size,0);
  } finally {Platform.isMobile=false;}
});
