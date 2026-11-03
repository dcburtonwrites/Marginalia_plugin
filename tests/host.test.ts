import { history, undo } from "@codemirror/commands";
import { commitShortcut, handleScriptEnter } from "../src/scripts/shortcut-extension.ts";
import { planShortcut } from "../src/scripts/shortcuts.ts";
import {speakerPicker,openSpeakerPicker,chooseSpeaker,acceptSpeakerKey,speakerKeys} from "../src/scripts/speaker-picker.ts";
import { EditorState } from "@codemirror/state";
import { codeFolding, foldedRanges } from "@codemirror/language";
import { editorViews } from "../src/scripts/folding.ts";
import test from "node:test";
import assert from "node:assert/strict";
import type { App } from "obsidian";
import {registerSourceConfig} from "../src/workspace/project-register.ts";
import Marginalia from "../src/main.ts";
import { MarkdownView, TFile, TFolder, Platform } from "./obsidian-mock.ts";
import { setGroundingReview, setAnswer } from "./ollama-mock.ts";
import { decode, encode, makeExpansion } from "../src/core/storage.ts";
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
        editorText.slice(change.to?.ch ?? change.from.ch);
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
  assert.match(h.plugin.current().suggestions[0].warnings!.at(-1)!, /changed/);
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


test("mobile character acceptance requires an explicit choice; repeated Enter never picks the first candidate",()=>{
 const text="**SPEAKER:** Dialogue";
 let state=EditorState.create({doc:text,selection:{anchor:2,head:9},extensions:[history(),speakerPicker]});
 const dispatch=(spec:any)=>{state=state.update(spec).state;};
 const view={get state(){return state;},dispatch,composing:false};
 const choices=[{id:"mira",name:"Mira",insert:"Mira"},{id:"orin",name:"Orin",insert:"Orin"}];
 dispatch({effects:openSpeakerPicker.of({from:2,to:9,candidates:choices,query:"",selected:0})});
 Platform.isMobile=true;
 try {
   view.composing=true;
   assert.equal(acceptSpeakerKey(view as any),false);
   view.composing=false;
   assert.equal(chooseSpeaker(view as any),false);
   assert.equal(acceptSpeakerKey(view as any),true);
   assert.equal(acceptSpeakerKey(view as any),true);
   assert.equal(state.doc.toString(),text);
   assert.ok(state.field(speakerPicker));
   assert.equal(chooseSpeaker(view as any,choices[1]),true);
   assert.equal(state.doc.toString(),"**Orin:** Dialogue");
   assert.equal(state.sliceDoc(state.selection.main.from,state.selection.main.to),"Dialogue");
   assert.ok(undo({state,dispatch:(tr:any)=>{state=tr.state;}} as any));
   assert.equal(state.doc.toString(),text);
 } finally {Platform.isMobile=false;}
});

test("Librarian startup creates a right sidebar tab without changing focus or duplicating restored tabs", async () => {
  const h = host();
  const calls: any[] = [];
  const leaf = {view:{}};
  h.plugin.app.workspace.ensureSideLeaf = async (...args: any[]) => {calls.push(args);return leaf;};
  assert.equal(await h.plugin.ensureLibrarianTab(),leaf);
  assert.deepEqual(calls, [["marginalia-librarian","right",{active:false,reveal:false}]]);
  h.plugin.app.workspace.getLeavesOfType = () => [leaf];
  assert.equal(await h.plugin.ensureLibrarianTab(),leaf);
  assert.equal(calls.length,1);
  h.plugin.workspaceSettings.modules.librarian=false;
  assert.equal(await h.plugin.ensureLibrarianTab(),undefined);
  assert.equal(calls.length,1);
});


test("Librarian startup reuses deferred restored leaves and coalesces concurrent creation", async () => {
  const h = host(); let calls = 0, finish: (leaf:any)=>void = () => {};
  const restored = {getViewState:()=>({type:"marginalia-librarian"})};
  h.plugin.app.workspace.iterateAllLeaves = (fn:any) => fn(restored);
  h.plugin.app.workspace.ensureSideLeaf = async () => {calls++;return restored;};
  assert.equal(await h.plugin.ensureLibrarianTab(),restored); assert.equal(calls,0);
  h.plugin.app.workspace.iterateAllLeaves = () => {};
  h.plugin.app.workspace.ensureSideLeaf = () => {calls++;return new Promise(resolve=>{finish=resolve;});};
  const first=h.plugin.ensureLibrarianTab(), second=h.plugin.ensureLibrarianTab();
  finish(restored); assert.equal(await first,restored); assert.equal(await second,restored); assert.equal(calls,1);
});

test('Librarian uses configured project boundaries and project overview briefs instead of Lore',async()=>{
 const {readWorkspace}=await import('../src/workspace/model.ts');
 const h=host();
 h.plugin.workspaceSettings=readWorkspace({vaultType:'Storyboard'});
 const own='Conquest/Overview.md',other='Elsewhere/Overview.md';
 h.files.push(new TFile(own),new TFile(other));
 h.text.set(own,'## Summary\nConquest concerns a planned journey.');h.text.set(other,'Conquest is a completed war elsewhere.');
 h.plugin.target=own;h.plugin.current().references.push(other);
 const p=await h.plugin.packet(own,new AbortController().signal);
 assert.equal(p.entryType,'Project');assert.ok(p.headings.includes('Premise'));assert.ok(!p.headings.includes('Causes'));
 assert.match(p.guidance,/project brief/);assert.ok(!p.sources.some(s=>s.notePath===other));
});

test('Librarian custom canon templates determine sections and are freshness checked without execution',async()=>{
 const {readWorkspace}=await import('../src/workspace/model.ts');
 const h=host(),path='Bestiary/Aster.md',template='My Templates/Creature.md';
 h.plugin.workspaceSettings=readWorkspace({canonTypes:[{name:'Creature',folder:'Bestiary',projectFolder:'Creatures',template}]});
 h.files.push(new TFile(path),new TFile(template));h.text.set(path,'Aster lives by the gate.');h.text.set(template,'## Habitat\n\n## Behaviour\n');
 h.plugin.target=path;
 const p=await h.plugin.packet(path,new AbortController().signal);
 assert.equal(p.entryType,'Creature');assert.match(p.guidance,/Configured entry type: Creature/);assert.ok(p.headings.includes('Habitat'));assert.ok(!p.headings.includes('Causes'));
 h.text.set(template,'## Changed\n');await assert.rejects(h.plugin.verify(p,new AbortController().signal),/Source notes changed/);
 assert.equal(h.transactions.length,0);assert.equal(h.generated.size,0);
});

test('Ask attaches repaired citations and incomplete-answer disclosure to its original session',async()=>{
 const h=host();setAnswer(async()=> 'Mira guards it [[01 Lore/Archive, S1]]. [[Unknown note]] This response now ends in an unfinished clause because');
 await h.plugin.ask('What does Mira do?');
 const answer=h.plugin.current().messages.at(-1)!;
 assert.equal(answer.role,'assistant');assert.ok(!answer.text.includes('[[Unknown note]]'));
 assert.ok(answer.warnings?.some(w=>/incomplete/.test(w)));assert.ok(answer.warnings?.some(w=>/unverified/.test(w)));
 assert.equal(h.transactions.length,0);assert.equal(h.generated.size,0);
});

test('unfinished enhancement preserves earlier review suggestions and expansion output',async()=>{
 const h=host();setAnswer(async()=> '## Summary\n\nMira guards the archive.');await h.plugin.run('enhancement');
 const earlier=h.plugin.current().suggestions[0];
 setAnswer(async()=> '## Summary\n\nMira guards the archive and goes back to explain how she');await h.plugin.run('enhancement');
 assert.equal(h.plugin.error,'');assert.equal(h.plugin.current().suggestions.length,2);assert.equal(h.plugin.current().suggestions[0],earlier);assert.match(h.plugin.current().suggestions[1].warnings![0],/incomplete/);
 assert.equal(h.transactions.length,0);assert.equal(h.generated.size,0);
});


test('source navigation opens an existing original file and never creates a missing note',async()=>{
 const h=host(),opened:any[]=[];
 h.plugin.app.workspace.getLeaf=()=>({openFile:async(file:any)=>{opened.push(file.path);}});
 h.plugin.source('01 Lore/Archive');assert.deepEqual(opened,['01 Lore/Archive.md']);
 h.plugin.source('01 Lore/Missing');assert.equal(opened.length,1);assert.equal(h.files.length,2);
});


test('source-grounding warnings preserve output while source changes still block publication',async()=>{
 const h=host();setAnswer(async()=> '## Summary\n\nMira guards the archive.');await h.plugin.run('enhancement');const previous=h.plugin.current().suggestions[0];
 setAnswer(async()=> '## Summary\n\nMira owns the laboratory.');
 setGroundingReview(async()=>JSON.stringify({unsupported:[{section:'Summary',reason:'The original does not establish ownership.'}]}));
 await h.plugin.run('enhancement');assert.equal(h.plugin.error,'');assert.equal(h.plugin.current().suggestions.length,2);assert.equal(h.plugin.current().suggestions[0],previous);assert.match(h.plugin.current().suggestions[1].warnings![0],/ownership/);assert.equal(h.generated.size,0);assert.equal(h.transactions.length,0);
 setAnswer(async()=> '## Summary\n\nMira guards the archive.');setGroundingReview(async()=>{h.text.set('01 Lore/Archive.md','Changed while checking.');return '{"unsupported":[]}';});
 await h.plugin.run('enhancement');assert.match(h.plugin.error,/Source notes changed/);assert.equal(h.plugin.current().suggestions.length,2);
});


test('a section warning is saved with expansion prose and the earlier output remains recoverable',async()=>{
 const h=host(),p=await h.plugin.packet(h.plugin.target!,new AbortController().signal);
 const file='.marginalia/expanded/'+h.plugin.target,earlier=encode(makeExpansion(p,'## Summary\n\nEarlier supported result.'));
 h.generated.set(file,earlier);
 setAnswer(async()=> '## Summary\n\nMira owns the laboratory.');setGroundingReview(async()=>JSON.stringify({unsupported:[{section:'Summary',reason:'Ownership is not established.'}]}));
 await h.plugin.run('expansion');assert.equal(h.plugin.error,'');assert.match(decode(h.generated.get(file)!,h.plugin.target!).draft,/\[!warning\] Review needed/);assert.match(decode(h.generated.get(file)!,h.plugin.target!).draft,/Ownership is not established/);assert.equal(h.generated.get('.marginalia/recovery/'+h.plugin.target),earlier);assert.equal(h.transactions.length,0);
});


test('a flagged draft gets one correction and a fresh review before publication',async()=>{
 const h=host();let drafts=0,reviews=0;
 setAnswer(async()=>++drafts===1?'## Summary\n\nMira owns the laboratory.':'## Summary\n\nMira guards the archive.');
 setGroundingReview(async()=>++reviews===1?JSON.stringify({unsupported:[{section:'Summary',reason:'Ownership is not established.'}]}):'{"unsupported":[]}');
 await h.plugin.run('enhancement');assert.equal(h.plugin.error,'');assert.equal(drafts,2);assert.equal(reviews,2);
 assert.equal(h.plugin.current().suggestions.length,1);assert.equal(h.plugin.current().suggestions[0].prose,'Mira guards the archive.');assert.equal(h.transactions.length,0);
});

test('new and previously unselected changed evidence invalidate pending writing',async()=>{
 for(const kind of ['new','changed','configuration']){
  const h=host(),extra='01 Lore/New Evidence.md';
  if(kind==='changed'){h.files.push(new TFile(extra));h.text.set(extra,'No named subjects yet.');}
  setAnswer(async()=> '## Summary\n\nMira guards the archive.');await h.plugin.run('enhancement');
  assert.ok(h.plugin.current().suggestions.length);
  if(kind==='new')h.files.push(new TFile(extra));
  if(kind==='configuration')h.plugin.settings.context+=1000;else h.text.set(extra,'Mira leaves the archive.');
  await h.plugin.insert(h.plugin.current().suggestions[0]);
  assert.match(h.plugin.current().suggestions[0].warnings!.at(-1)!,/new evidence|configuration changed/);assert.equal(h.transactions.length,0);
 }
});

test('scope freshness ignores other projects and retains dirty-buffer protection',async()=>{
 const h=host(),path='08 Projects/Harbor/Character/Nara.md',foreign='08 Projects/Other/Scenes/Scene.md';
 h.files.push(new TFile(path),new TFile(foreign));h.text.set(path,'Nara waits.');h.text.set(foreign,'Other work.');
 const packet=await h.plugin.packet(path,new AbortController().signal);
 h.text.set(foreign,'Other work changed.');await h.plugin.verify(packet,new AbortController().signal);
 h.text.set('01 Lore/Archive.md','Shared work changed.');await assert.rejects(h.plugin.verify(packet,new AbortController().signal),/Source notes changed/);
 h.text.set('01 Lore/Archive.md','Mira guards the eastern archive.');
 const targetPacket=await h.plugin.packet(h.plugin.target!,new AbortController().signal);
 h.setEditor('## Summary\n\nUnsaved revision.');await assert.rejects(h.plugin.verify(targetPacket,new AbortController().signal),/Source notes changed/);
});

test('section insertion normalizes placeholders in one transaction and keeps remaining suggestions usable',async()=>{
 const h=host();h.setEditor('## Summary\n\n\n\n## Backstory\n\n\n');
 setAnswer(async()=> '## Summary\n\nMira guards the archive.\n\n## Backstory\n\nMira guards the eastern archive.');await h.plugin.run('enhancement');
 await h.plugin.insert(h.plugin.current().suggestions[0]);assert.equal(h.plugin.error,'');
 assert.match(h.editorText(),/^## Summary\n\nMira guards the archive\.\n\n## Backstory/);
 await h.plugin.insert(h.plugin.current().suggestions[1]);assert.equal(h.plugin.error,'');assert.equal(h.transactions.length,2);
 assert.match(h.editorText(),/## Backstory\n\nMira guards the eastern archive\./);
});

test('Library lists legacy, damaged and missing files with recovery without modifying them',async()=>{
 const h=host(),entry=h.plugin.target!,path='.marginalia/expanded/'+entry;
 const p=await h.plugin.packet(entry,new AbortController().signal),e=makeExpansion(p,'## Summary\n\nMira guards the archive.');
 h.generated.set(path,encode(e).replace('marginalia-plugin: 1\n',''));
 h.generated.set('.marginalia/expanded/02 Character/Broken.md','---\nmarginalia-plugin: 1\nexpansion: damaged\n---\n');
 h.generated.set('.marginalia/recovery/02 Character/Missing.md',encode({...e,entry:'02 Character/Missing.md'}));
 // Adapter listings represent the flat test implementation, including root directories.
 const adapter=h.plugin.app.vault.adapter;const exists=adapter.exists.bind(adapter);
 adapter.exists=async(p:string)=>await exists(p)||[...h.generated.keys()].some(path=>path.startsWith(p+'/'));
 const before=[...h.generated];await h.plugin.loadLibrary();
 assert.equal(h.plugin.expansions.length,3);assert.ok(h.plugin.expansions.some(item=>/recovery available/.test(item.status??'')));
 assert.ok(h.plugin.expansions.some(item=>/Damaged/.test(item.status??'')));assert.deepEqual([...h.generated],before);
});

test('Librarian snapshots use the native read cache while direct source checks stay fresh',async()=>{
 const h=host();let cached=0,reads=0;
 h.plugin.app.vault.cachedRead=async(file:TFile)=>{cached++;return h.text.get(file.path)!;};
 h.plugin.app.vault.read=async(file:TFile)=>{reads++;return h.text.get(file.path)!;};
 const packet=await h.plugin.packet(h.plugin.target!,new AbortController().signal);
 assert.ok(cached>0);assert.ok(h.plugin.timings.retrieval>=0);
 await h.plugin.verify(packet,new AbortController().signal);assert.ok(reads>0);
});

test('busy-state refresh preserves standalone ownership and releases recovery controls',()=>{
 const h=host();const buttons=[{disabled:false,dataset:{readOnly:'true'}},{disabled:true,dataset:{readOnly:'false'}},{disabled:true,dataset:{}}];
 h.plugin.app.workspace.getLeavesOfType=(type:string)=>type==='marginalia-expansion'?[{view:{containerEl:{querySelectorAll:()=>buttons}}}]:[];
 h.plugin.operation=new AbortController();h.plugin.refresh();assert.ok(buttons.every(button=>button.disabled));
 h.plugin.operation=null;h.plugin.refresh();assert.deepEqual(buttons.map(button=>button.disabled),[true,false,false]);
});

test('streaming progress updates the status without rebuilding sidebar Markdown',async()=>{
 const h=host();let redraws=0;h.plugin.refresh=()=>{redraws++;};
 setAnswer(async(...args:any[])=>{args[5]({phase:'output',characters:120});return 'Completed supported text.';});
 const result=await h.plugin.generateText('system','prompt',new AbortController().signal);
 assert.equal(result,'Completed supported text.');assert.equal(redraws,0);assert.match(h.plugin.progress,/120 characters/);assert.ok(h.plugin.timings.generation>0);
});

test('Script Studio uses shared classification for custom roots, overview containers and declared projects',async()=>{
 const h=await orderHost();const {readWorkspace}=await import('../src/workspace/model.ts');
 h.controller.plugin.workspaceSettings=readWorkspace({vaultType:'World',entrySetup:{projectsFolder:'Books'}});
 for(const [path,source] of [
  ['Books/00 Overview/Scripts/Guide.md','---\nrole: manuscript\nformat: comic-script\n---\n## Page 1\n'],
  ['Elsewhere/Book/Overview.md','---\ntags: ["project-parent"]\n---\nProject overview.'],
  ['Elsewhere/Book/Manuscripts/Opening.md','---\nrole: manuscript\nformat: comic-script\n---\n## Page 1\n'],
  ['Books/Book/Manuscripts/Two.md','---\nrole: manuscript\nformat: comic-script\n---\n## Page 1\n'],
 ] as const){h.files.push(new TFile(path));h.sources.set(path,source);}
 const groups=await h.controller.groups();
 assert.ok(!groups.some(group=>group.scope.includes('00 Overview')));
 assert.ok(groups.some(group=>group.scope==='Elsewhere/Book'));
 assert.ok(groups.some(group=>group.scope==='Books/Book'));
});

test('script cache reuses unchanged reads/parsing and notices invalidations, dirty editors and deleted files',async()=>{
 const h=await orderHost();h.files.forEach(file=>{(file.stat as any).size=h.sources.get(file.path)!.length;});
 await h.controller.groups();const first={...h.controller.metrics};await h.controller.groups();
 assert.equal(h.controller.metrics.reads,first.reads);assert.equal(h.controller.metrics.parses,first.parses);
 const file=h.files[0];h.sources.set(file.path,h.sources.get(file.path)!+'\n## Page 8\n');h.controller.invalidate(file.path);
 const changed=await h.controller.groups();assert.equal(changed[0].scripts.find(script=>script.path===file.path)!.pages.length,2);
 h.app.workspace.iterateAllLeaves=(fn:any)=>fn({view:new MarkdownView(file,{getValue:()=>h.sources.get(file.path)!+'\n## Page 9\n'})});
 assert.equal((await h.controller.groups())[0].scripts.find(script=>script.path===file.path)!.pages.length,3);
 h.files.splice(h.files.indexOf(file),1);assert.ok(!(await h.controller.groups()).flatMap(group=>group.scripts).some(script=>script.path===file.path));
});

test('sidebar structure moves reject stale editors and apply a guarded native transaction',async()=>{
 const h=host();h.files[0].path='Project/Scripts/Move.md';h.plugin.target=h.files[0].path;
 h.setEditor('## Page 1\n\n> [!panel] A\n> A text.\n\n## Page 2\n\n> [!panel] B\n> B text.');
 h.view.editor.setCursor=()=>{};
 const {ScriptController}=await import('../src/scripts/controller.ts');const {parseScript}=await import('../src/scripts/model.ts');
 const controller=new ScriptController(h.plugin as any),script=parseScript({path:h.files[0].path,text:h.editorText(),metadata:{}})!;
 await controller.moveStructure(script,'page',script.pages[1].from,script.pages[0].from,'before');
 assert.equal(h.transactions.length,1);assert.ok(h.editorText().startsWith('## Page 2'));
 await assert.rejects(controller.moveStructure(script,'page',script.pages[1].from,script.pages[0].from,'before'),/changed after/);
 assert.equal(h.transactions.length,1);
 controller.closed=true;await assert.rejects(controller.moveStructure(script,'page',script.pages[1].from,script.pages[0].from,'before'),/disabled/);
});

test('script movement/navigation commands have no default hotkeys and navigation does not alter a selection',async()=>{
 const h=host(),commands:any[]=[],{registerScripts}=await import('../src/scripts/view.ts');
 h.files[0].path='Project/Scripts/Navigation.md';h.setEditor('## Page 1\n\n> [!panel] A\n> First.\n\n## Page 2\n\n> [!panel] B\n> Last.');
 let cursor=0;Object.assign(h.view.editor,{somethingSelected:()=>true,getCursor:()=>({line:0,ch:0}),posToOffset:(pos:any)=>pos.ch,setCursor:(pos:any)=>{cursor=pos.ch;},scrollIntoView:()=>{}});
 Object.assign(h.plugin,{register:()=>{},registerEvent:()=>{},registerInterval:()=>{},registerView:()=>{},registerEditorExtension:()=>{},registerMarkdownPostProcessor:()=>{},addRibbonIcon:()=>{},addCommand:(command:any)=>commands.push(command)});
 Object.assign(h.plugin.app.workspace,{on:()=>({}),onLayoutReady:()=>{}});Object.assign(h.plugin.app.vault,{on:()=>({})});Object.assign(h.plugin.app.metadataCache,{on:()=>({})});
 const beforeWindow=(globalThis as any).window;(globalThis as any).window={setInterval:()=>1};
 try{registerScripts(h.plugin as any);}finally{(globalThis as any).window=beforeWindow;}
 for(const id of ['move-page-up','move-page-down','move-panel-up','move-panel-down','previous-page','next-page','previous-panel','next-panel']){
  const command=commands.find(command=>command.id===id);assert.ok(command,id);assert.equal(command.hotkeys,undefined);
 }
 const before=h.editorText();commands.find(command=>command.id==='next-page').editorCheckCallback(false,h.view.editor,h.view);
 assert.equal(cursor,before.indexOf('## Page 2'));assert.equal(h.editorText(),before);assert.equal(h.transactions.length,0);
});

test('current-project writing credit uses the same configured project as Script Studio',async()=>{
 const h=await orderHost();const {readWorkspace}=await import('../src/workspace/model.ts');
 h.controller.plugin.workspaceSettings=readWorkspace({entrySetup:{projectsFolder:'Books'}});
 const path='Books/Harbor/Manuscripts/One.md',text='---\nrole: manuscript\nformat: comic-script\n---\n## Page 1\n\nOriginal words.';
 h.files.push(new TFile(path));h.sources.set(path,text);h.controller.invalidate();
 h.controller.observeText(path,text,false);
 assert.equal(h.controller.session.baseline.get(path)?.scope,'Books/Harbor');
 assert.equal((await h.controller.groups()).find(group=>group.scripts.some(script=>script.path===path))?.scope,'Books/Harbor');
});

test('one problematic section carries its warning while other sections remain usable',async()=>{
 const h=host();
 setAnswer(async()=> '## Summary\n\nMira guards the archive.\n\n## Backstory\n\nMira founded the city.');
 setGroundingReview(async()=>JSON.stringify({unsupported:[{section:'Backstory',reason:'Founding the city is not established.'}]}));
 await h.plugin.run('enhancement');
 assert.equal(h.plugin.error,'');const sections=h.plugin.current().suggestions;
 assert.equal(sections.length,2);assert.equal(sections[0].warnings,undefined);assert.match(sections[1].warnings![0],/Founding/);
 assert.equal(h.transactions.length,0);
});

test('unavailable review labels existing sections and a failed refinement warns only its card',async()=>{
 const h=host();setAnswer(async()=> '## Summary\n\nMira guards the archive.');setGroundingReview(async()=> 'Unreadable review');
 await h.plugin.run('enhancement');assert.equal(h.plugin.error,'');const section=h.plugin.current().suggestions[0];assert.match(section.warnings![0],/could not be completed/);
 const before=section.prose;setAnswer(async()=>{throw new Error('Local model unavailable');});await h.plugin.refine(section,'Make it shorter.');
 assert.equal(section.prose,before);assert.equal(h.plugin.error,'');assert.match(section.warnings!.at(-1)!,/Local model unavailable/);
});


test('a failed correction does not attach another section’s error to healthy prose',async()=>{
 const h=host();let drafts=0;setAnswer(async()=>{if(++drafts>1)throw new Error('Model disconnected during correction');return '## Summary\n\nMira guards the archive.\n\n## Backstory\n\nMira founded the city.';});
 setGroundingReview(async()=>JSON.stringify({unsupported:[{section:'Backstory',reason:'City founding is not established.'}]}));
 await h.plugin.run('enhancement');const sections=h.plugin.current().suggestions;assert.equal(h.plugin.error,'');assert.equal(sections.length,2);assert.equal(sections[0].warnings,undefined);assert.ok(sections[1].warnings!.some(warning=>warning.includes('Model disconnected')));
});

test("Project Register embeds a private copy of the first Base view without changing the assigned configuration", () => {
  const raw={filters:{and:['file.ext == "md"']},formulas:{title:'file.name'},views:[{type:"table",name:"Overview",filters:{and:['stage == "Drafting"']},sort:[{property:"file.name",direction:"DESC"}]},{type:"cards",name:"Other"}]};
  const before=structuredClone(raw);const config=registerSourceConfig(raw,"test-id");
  assert.deepEqual(raw,before);assert.equal(config.views.length,1);assert.equal(config.views[0].type,"marginalia-project-register-source");
  assert.deepEqual(config.filters,raw.filters);assert.deepEqual(config.formulas,raw.formulas);assert.deepEqual(config.views[0].filters,raw.views[0].filters);assert.deepEqual(config.views[0].sort,raw.views[0].sort);
  assert.throws(()=>registerSourceConfig({views:[]},"bad"),/needs a view/);
});

test("timeline enable creates one calendar, saves existing preferences, and rejects Storyboard/mobile",async()=>{
  const h=host();let applied=0,saved:any;
  h.plugin.applyModules=()=>{applied++;};h.plugin.saveData=async value=>{saved=structuredClone(value);};
  h.plugin.app.vault.create=(async(path:string,source:string)=>{h.files.push(new TFile(path));h.text.set(path,source);return h.files.at(-1)!;}) as any;
  h.plugin.app.metadataCache.getFileCache=((file:any)=>({frontmatter:file.basename==="Calendar"?{type:"Calendar",primary:true,precision:"year"}:{}})) as any;
  await h.plugin.setTimelineEnabled(true);
  assert.equal(saved.timeline.enabled,true);assert.equal(saved.workspace.vaultType,"World");assert.equal(applied,1);
  assert.ok(h.text.get("Calendar.md")?.includes("type: Calendar"));
  await h.plugin.setTimelineEnabled(false);await h.plugin.setTimelineEnabled(true);
  assert.equal(h.files.filter(f=>f.basename==="Calendar").length,1);
  h.plugin.workspaceSettings.vaultType="Storyboard";await assert.rejects(()=>h.plugin.setTimelineEnabled(true),/World/);
  h.plugin.workspaceSettings.vaultType="World";Platform.isMobile=true;
  try {await assert.rejects(()=>h.plugin.setTimelineEnabled(true),/desktop/);} finally {Platform.isMobile=false;}
});
test("timeline setup blocks overlapping requests and rolls back enabled preference on failed saves",async()=>{
  const h=host();h.plugin.applyModules=()=>{throw new Error("must not start after a failed save");};
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let creates=0;
  h.plugin.app.vault.create=(async()=>{creates++;await gate;return new TFile("Calendar.md");}) as any;
  h.plugin.saveData=async()=>{throw new Error("Disk unavailable");};
  const pending=h.plugin.setTimelineEnabled(true);
  await assert.rejects(()=>h.plugin.setTimelineEnabled(true),/already in progress/);
  release();await assert.rejects(()=>pending,/Disk unavailable/);
  assert.equal(creates,1);assert.equal(h.plugin.timelineSettings.enabled,false);
});

test("timeline setup reads an uncached Calendar instead of creating a duplicate",async()=>{
  const h=host();const file=new TFile("Calendar.md");h.files.push(file);h.text.set(file.path,'---\ntype: Calendar\nprimary: true\nprecision: year\n---\n');
  h.plugin.app.metadataCache.getFileCache=((file:any)=>file.basename==="Calendar"?null:{frontmatter:{}}) as any;
  h.plugin.app.vault.create=(async()=>{throw new Error("must not duplicate uncached calendar");}) as any;
  h.plugin.saveData=async()=>{};h.plugin.applyModules=()=>{};
  await h.plugin.setTimelineEnabled(true);assert.equal(h.plugin.timelineSettings.enabled,true);
});

test("timeline lifecycle follows World/desktop gating independently of Theme and Librarian",()=>{
  const h=host();h.plugin.workspaceSettings.modules={theme:false,scripts:false,librarian:false};h.plugin.timelineSettings.enabled=true;
  let removed=0;h.plugin.addChild=((child:any)=>child) as any;h.plugin.removeChild=(()=>{removed++;}) as any;
  h.plugin.applyModules();assert.ok(h.plugin.timelineFeature);
  h.plugin.workspaceSettings.vaultType="Storyboard";h.plugin.applyModules();assert.equal(h.plugin.timelineFeature,undefined);assert.equal(removed,1);assert.equal(h.plugin.timelineSettings.enabled,true);
  h.plugin.workspaceSettings.vaultType="World";h.plugin.applyModules();assert.ok(h.plugin.timelineFeature);
  Platform.isMobile=true;try {h.plugin.applyModules();assert.equal(h.plugin.timelineFeature,undefined);assert.equal(removed,2);assert.equal(h.plugin.timelineSettings.enabled,true);} finally {Platform.isMobile=false;}
});
test("timeline metadata indexing overlays current editor dates and unload cancels pending refresh",async()=>{
  const {TimelineFeature}=await import("../src/timeline/feature.ts");const h=host();h.plugin.timelineSettings.enabled=true;
  const calendar=new TFile("Calendar.md");h.files.push(calendar);h.text.set(calendar.path,"Calendar lore");
  h.plugin.app.metadataCache.getFileCache=((file:any)=>({frontmatter:file===calendar?{type:"Calendar",primary:true}:{type:"Character",Born:410}})) as any;
  h.setEditor('---\ntype: Character\nBorn: 412\n---\nCurrent prose');
  const callbacks:(()=>void)[]=[], events:string[]=[];
  (h.plugin.app.vault as any).on=(name:string)=>{events.push(name);return {};};(h.plugin.app.metadataCache as any).on=(name:string)=>{events.push(name);return {};};
  (h.plugin.app.workspace as any).on=(name:string)=>{events.push(name);return {};};(h.plugin.app.workspace as any).onLayoutReady=(fn:any)=>fn();
  const feature=new TimelineFeature(h.plugin);feature.register=((fn:any)=>{callbacks.push(fn);}) as any;feature.registerEvent=(()=>{}) as any;
  feature.onload();feature.refresh();assert.equal(feature.index?.selfChanges[0].date.key,412);assert.ok(events.includes("editor-change"));assert.ok(events.includes("resolved"));
  h.setEditor('---\ntype: Character\nBorn: later\n---\nCurrent prose');feature.refresh();assert.ok(feature.index?.diagnostics.some(d=>d.field==="Born"));
  feature.schedule();callbacks.forEach(fn=>fn());await new Promise(resolve=>setTimeout(resolve,180));assert.equal(feature.index,undefined);
  assert.equal(h.transactions.length,0);
});

test("world timeline opens a native main tab, reuses it and does not create notes",async()=>{
  const {openWorldTimeline,openTimelineNote,TIMELINE}=await import("../src/timeline/view.ts");const h=host();h.plugin.timelineSettings.enabled=true;
  let opened=0,revealed=0,created=0;const states:any[]=[];const leaf={setViewState:async(state:any)=>{states.push(state);},detach:()=>{}};
  h.plugin.app.workspace.getLeavesOfType=((type:string)=>opened&&type===TIMELINE?[leaf]:[]) as any;
  (h.plugin.app.workspace as any).getLeaf=(kind:string)=>{assert.equal(kind,"tab");opened++;return leaf;};(h.plugin.app.workspace as any).revealLeaf=async()=>{revealed++;};
  h.plugin.app.vault.create=(async()=>{created++;throw new Error("read only navigation");}) as any;
  await openWorldTimeline(h.plugin);await openWorldTimeline(h.plugin);assert.equal(opened,1);assert.equal(revealed,2);assert.ok(states.every(s=>s.type===TIMELINE));
  let navigation=0;h.plugin.app.workspace.openLinkText=(async()=>{navigation++;}) as any;
  openTimelineNote(h.plugin,h.files[0].path);openTimelineNote(h.plugin,"Missing.md");assert.equal(navigation,1);assert.equal(created,0);
  h.plugin.workspaceSettings.vaultType="Storyboard";await openWorldTimeline(h.plugin);assert.equal(revealed,2);
});
test("timeline preference renames follow native file/folder paths without changing notes",async()=>{
  const {TimelineFeature}=await import("../src/timeline/feature.ts");const h=host();h.plugin.timelineSettings.enabled=true;
  h.plugin.timelineSettings.primaryCalendar="Calendars/World.md";h.plugin.timelineSettings.displayCalendar="Calendars/Alternate.md";h.plugin.timelineSettings.lanes=[{path:"Places/Harbor.md",group:"Coast",enabled:false}];
  let rename:any,saved:any;h.plugin.saveData=async value=>{saved=structuredClone(value);};
  (h.plugin.app.vault as any).on=(name:string,fn:any)=>{if(name==="rename")rename=fn;return {};};(h.plugin.app.metadataCache as any).on=()=>({});(h.plugin.app.workspace as any).on=()=>({});(h.plugin.app.workspace as any).onLayoutReady=()=>{};
  const cleanups:any[]=[],feature=new TimelineFeature(h.plugin);feature.register=((fn:any)=>{cleanups.push(fn);}) as any;feature.registerEvent=(()=>{}) as any;feature.onload();
  rename({path:"World Calendars"},"Calendars");rename({path:"Locations"},"Places");await h.plugin.savePluginData();
  assert.equal(saved.timeline.primaryCalendar,"World Calendars/World.md");assert.equal(saved.timeline.displayCalendar,"World Calendars/Alternate.md");assert.deepEqual(saved.timeline.lanes,[{path:"Locations/Harbor.md",group:"Coast",enabled:false}]);assert.equal(h.transactions.length,0);cleanups.forEach(fn=>fn());
});

test("entry timeline actions sit beside Librarian, work without it and unload cleanly",async()=>{
  const {TimelineFeature}=await import("../src/timeline/feature.ts");const h=host();h.plugin.timelineSettings.enabled=true;
  (h.plugin.app.vault as any).on=()=>({});(h.plugin.app.metadataCache as any).on=()=>({});(h.plugin.app.workspace as any).on=()=>({});(h.plugin.app.workspace as any).onLayoutReady=()=>{};
  const cleanups:any[]=[],feature=new TimelineFeature(h.plugin);feature.register=((fn:any)=>{cleanups.push(fn);}) as any;feature.registerEvent=(()=>{}) as any;
  h.plugin.noteActions();feature.onload();feature.noteActions();feature.noteActions();
  assert.deepEqual(h.view.actions.map(a=>a.title),["Open Librarian for this note","Open timeline for this entry"]);
  h.plugin.workspaceSettings.modules.librarian=false;for(const a of h.plugin.headerActions.values())a.remove();h.plugin.headerActions.clear();feature.noteActions();assert.equal(h.view.actions.length,1);assert.equal(h.view.actions[0].title,"Open timeline for this entry");
  cleanups.forEach(fn=>fn());assert.equal(h.view.actions.length,0);assert.equal(feature.states,undefined);
});
test("per-entry timeline opens the correct path and reuses its own native tab",async()=>{
  const {openEntryTimeline,ENTRY_TIMELINE}=await import("../src/timeline/entry-view.ts");const h=host();h.plugin.timelineSettings.enabled=true;
  let created=0,revealed=0;const states:any[]=[];const leaf={setViewState:async(state:any)=>{states.push(state);},getViewState:()=>({type:ENTRY_TIMELINE,state:{entryPath:h.files[0].path}}),detach:()=>{}};
  h.plugin.app.workspace.getLeavesOfType=((type:string)=>created&&type===ENTRY_TIMELINE?[leaf]:[]) as any;(h.plugin.app.workspace as any).getLeaf=()=>{created++;return leaf;};(h.plugin.app.workspace as any).revealLeaf=async()=>{revealed++;};
  await openEntryTimeline(h.plugin,h.files[0].path);await openEntryTimeline(h.plugin,h.files[0].path);await openEntryTimeline(h.plugin,"Missing.md");assert.equal(created,1);assert.equal(revealed,2);assert.ok(states.every(s=>s.state.entryPath===h.files[0].path));
  h.plugin.workspaceSettings.vaultType="Storyboard";await openEntryTimeline(h.plugin,h.files[0].path);assert.equal(revealed,2);
});

test("entry header actions follow the current note and disappear on templates",async()=>{
  const {TimelineFeature}=await import("../src/timeline/feature.ts");const h=host();h.plugin.timelineSettings.enabled=true;h.plugin.workspaceSettings.modules.librarian=false;
  (h.plugin.app.vault as any).on=()=>({});(h.plugin.app.metadataCache as any).on=()=>({});(h.plugin.app.workspace as any).on=()=>({});(h.plugin.app.workspace as any).onLayoutReady=()=>{};
  const cleanups:any[]=[],feature=new TimelineFeature(h.plugin);feature.register=((fn:any)=>cleanups.push(fn)) as any;feature.registerEvent=(()=>{}) as any;feature.onload();feature.noteActions();
  let opened:any;(h.plugin.app.workspace as any).getLeaf=()=>({setViewState:async(state:any)=>{opened=state;},detach:()=>{}});(h.plugin.app.workspace as any).revealLeaf=async()=>{};
  h.view.file=h.files[1];h.view.actions[0].callback();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(opened.state.entryPath,h.files[1].path);
  h.view.file=new TFile("_templates/Test.md");feature.noteActions();assert.equal(h.view.actions.length,0);cleanups.forEach(fn=>fn());
});

test("entry timeline identities survive native folder renames and remain reusable",async()=>{
  const {TimelineFeature}=await import("../src/timeline/feature.ts"),{EntryTimelineView,ENTRY_TIMELINE,openEntryTimeline}=await import("../src/timeline/entry-view.ts");const h=host();h.plugin.timelineSettings.enabled=true;
  const view=new EntryTimelineView({} as any,h.plugin);view.entryPath=h.files[0].path;
  let state:any,saves=0,rename:any;const leaf={view,getViewState:()=>({type:ENTRY_TIMELINE,state:view.getState()}),setViewState:async(next:any)=>{state=next;},detach:()=>{}};
  h.plugin.app.workspace.getLeavesOfType=((type:string)=>type===ENTRY_TIMELINE?[leaf]:[]) as any;(h.plugin.app.workspace as any).requestSaveLayout=()=>{saves++;};(h.plugin.app.workspace as any).revealLeaf=async()=>{};(h.plugin.app.workspace as any).getLeaf=()=>{throw new Error("must reuse renamed entry tab");};
  (h.plugin.app.vault as any).on=(name:string,fn:any)=>{if(name==="rename")rename=fn;return {};};(h.plugin.app.metadataCache as any).on=()=>({});(h.plugin.app.workspace as any).on=()=>({});(h.plugin.app.workspace as any).onLayoutReady=()=>{};
  const cleanups:any[]=[],feature=new TimelineFeature(h.plugin);feature.register=((fn:any)=>cleanups.push(fn)) as any;feature.registerEvent=(()=>{}) as any;feature.onload();
  rename({path:"People"},"02 Character");h.files[0].path="People/Mira.md";assert.equal(view.getState().entryPath,"People/Mira.md");assert.equal(saves,1);await openEntryTimeline(h.plugin,"People/Mira.md");assert.equal(state.state.entryPath,"People/Mira.md");assert.equal(h.transactions.length,0);cleanups.forEach(fn=>fn());
});

test("disabling Timelines detaches world and entry views and removes owned header actions",()=>{
  const {plugin,view}=host();plugin.timelineSettings.enabled=true;plugin.workspaceSettings.modules={theme:false,scripts:false,librarian:false};
  let detached=0;const leaf=()=>({detach:()=>{detached++;}});
  plugin.app.workspace.getLeavesOfType=((type:string)=>type==="marginalia-world-timeline"?[leaf()]:type==="marginalia-entry-timeline"?[leaf(),leaf()]:[]) as any;
  const action=view.addAction("chart-no-axes-gantt","Open timeline for this entry",()=>{});
  const cleanups=[()=>action.remove()];plugin.timelineFeature={headerActions:new Map([[view,action]])} as any;plugin.removeChild=(()=>{cleanups.forEach(fn=>fn());}) as any;
  plugin.timelineSettings.enabled=false;plugin.applyModules();assert.equal(detached,3);assert.equal(view.actions.length,0);assert.equal(plugin.timelineFeature,undefined);
});

test("Librarian packets interpret timeline dates from source buffers, admit calendars and invalidate changed chronology settings",async()=>{
  const h=host();h.plugin.timelineSettings.enabled=true;h.plugin.settings.context=32768;
  const calendar=new TFile('Calendar.md'),event=new TFile('Founding.md');h.files.push(calendar,event);
  h.text.set(calendar.path,'---\ntype: Calendar\nprimary: true\nprecision: year\n---\n# World calendar\n');
  h.text.set(event.path,'---\ntype: Event\nStart: 410\nEnd: 415\nBorn: "[[02 Character/Mira]]"\n---\nMira was born during construction.');
  h.setEditor('---\ntype: Character\nBorn: 412\n---\n## Summary\n\nMira guards the archive.');
  h.plugin.app.metadataCache.getFileCache=((file:any)=>({frontmatter:file===event?{type:'Event',Start:410,End:415,Born:'[[02 Character/Mira]]'}:file===calendar?{type:'Calendar',primary:true,precision:'year'}:{type:'Character',Born:400}})) as any;
  const packet=await h.plugin.packet(h.files[0].path,new AbortController().signal);
  assert.ok(packet.timeline);assert.ok(packet.sources.some(s=>s.notePath===calendar.path));assert.equal(packet.timeline.records.find(r=>r.source===h.files[0].path)?.time,412);assert.equal(packet.timeline.records.find(r=>r.source===event.path&&r.kind==='state')?.active,false);
  await h.plugin.verify(packet,new AbortController().signal);
  h.plugin.timelineSettings.displayCalendar='Alternate.md';await h.plugin.verify(packet,new AbortController().signal);
  h.plugin.timelineSettings.fields=[];await assert.rejects(h.plugin.verify(packet,new AbortController().signal),/configuration changed/);
  assert.equal(h.transactions.length,0);assert.equal(h.generated.size,0);
});
test("disabled timelines and Storyboard Librarian requests do not apply World timeline interpretation",async()=>{
  const h=host();assert.equal((await h.plugin.packet(h.files[0].path,new AbortController().signal)).timeline,undefined);
  h.plugin.timelineSettings.enabled=true;h.plugin.workspaceSettings.vaultType='Storyboard';assert.equal((await h.plugin.packet(h.files[0].path,new AbortController().signal)).timeline,undefined);
});

test("visible generated development workspaces are excluded from freshness even before the metadata cache catches up",async()=>{
  const h=host(),before=await h.plugin.packet(h.files[0].path,new AbortController().signal),workspace=new TFile('Custom/Development/session.md');h.files.push(workspace);h.text.set(workspace.path,'---\ngenerated: true\nstatus: provisional\n---\nMira may leave the archive.');
  const snapshot=await h.plugin.snapshot(new AbortController().signal);assert.equal(snapshot.find(n=>n.path===workspace.path)?.metadata.generated,true);
  await h.plugin.verify(before,new AbortController().signal);assert.ok(!(await h.plugin.packet(h.files[0].path,new AbortController().signal)).sources.some(source=>source.notePath===workspace.path));
});
test("development applies only the individually accepted exact change and rebases later recommendations without absorbing other edits",async()=>{
  const h=host();h.setEditor('---\ntype: Character\n---\n## Summary\n\nMira guards the archive.\n\nShe keeps the keys.');const signal=new AbortController().signal,packet=await h.plugin.packet(h.files[0].path,signal);
  const edit:any={id:'one',kind:'replace',before:'Mira guards the archive.',after:'Mira guards the archive to protect her sister.',reason:'Author choice',state:'pending'};
  const next=await h.plugin.applyDevelopmentEdit(packet,edit,signal);assert.equal(h.transactions.length,1);assert.ok(h.editorText().startsWith('---\ntype: Character\n---'));assert.ok(h.editorText().includes('She keeps the keys.'));await h.plugin.verify(next,signal);
  const prior=h.editorText();h.text.set(h.files[1].path,'New canon evidence.');await assert.rejects(h.plugin.applyDevelopmentEdit(next,{...edit,id:'two',kind:'delete',before:'She keeps the keys.',after:''},signal),/changed/);assert.equal(h.editorText(),prior);assert.equal(h.transactions.length,1);
});

test('Threads images resolve only existing local image files through native vault resources',async()=>{
 const {timelineEntryImage}=await import('../src/timeline/view.ts');const image=new TFile('Assets/Mira.svg');image.extension='svg';let lookups=0;
 const owner:any={app:{metadataCache:{getFirstLinkpathDest:(target:string,source:string)=>{lookups++;assert.equal(source,'Mira.md');return target==='Assets/Mira.svg'?image:target==='Notes.md'?new TFile('Notes.md'):undefined;}},vault:{getResourcePath:(file:TFile)=>'app://vault/'+file.path}}};
 assert.equal(timelineEntryImage(owner,{path:'Mira.md',name:'Mira',type:'Character',icon:'[[Assets/Mira.svg]]'}),'app://vault/Assets/Mira.svg');
 assert.equal(timelineEntryImage(owner,{path:'Mira.md',name:'Mira',type:'Character',icon:'Assets/Missing.png'}),undefined);
 const before=lookups;assert.equal(timelineEntryImage(owner,{path:'Mira.md',name:'Mira',type:'Character',icon:'https://example.com/a.png'}),undefined);assert.equal(lookups,before);
});
