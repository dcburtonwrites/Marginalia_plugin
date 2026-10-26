import test from "node:test";
import assert from "node:assert/strict";
import {
  parseScript,
  pageLabel, panelLabel,
  organize,
  movePanel,
  insertBlock,
  type Script,
} from "../src/scripts/model.ts";
const parse = (
  text: string,
  metadata: Record<string, unknown> = {},
  path = "Projects/Example/Scripts/Opening.md",
) => parseScript({ path, text, metadata })!;
const fixture = `---
Pages: 4
---
Intro stays here.

## Page 1

Side: Right

> [!panel] The arrival
> Door opens.

**MIRA:** Hello.

> [!note] Production note
> Keep the window dark.

Location: [[Hall]]

> [!panel] A pause
> Wait.

## Page 2 Double Spread

Side: Double Spread

> [!panel] Panorama
> Wide.

## Page 4

> [!panel] Closing beat
> End.
`;
const resolve = (link: string) => `Projects/Example/Scripts/${link}.md`;
test("script identity respects explicit roles and excludes templates/hidden files", () => {
  assert.equal(
    parseScript({
      path: "Ordinary.md",
      text: "## Page 1",
      metadata: { Group: "Draft" },
    }),
    null,
  );
  assert.equal(parse("## Page 1", { role: "lore" }), null);
  assert.equal(parse("## Page 1", {}, "Templates/Scripts/Foo.md"), null);
  assert.equal(parse("## Page 1", {}, ".marginalia/Scripts/Foo.md"), null);
  assert.ok(
    parse(
      "## Page 1",
      { role: "manuscript", format: "comic-script" },
      "Other/Foo.md",
    ),
  );
});
test("outline distinguishes headings, slots, declared counts, sides and authored panel titles", () => {
  const s = parse(fixture, { Pages: 6 });
  assert.equal(s.declared, 6);
  assert.equal(s.slots, 4);
  assert.deepEqual(
    s.pages.map((p) => [p.local, p.slots, p.side, p.panels.length]),
    [
      [1, 1, "Right", 2],
      [2, 2, "Double Spread", 1],
      [4, 1, "Left", 1],
    ],
  );
  assert.equal(s.pages[0].panels[0].title, "The arrival");
  assert.equal(s.text, fixture);
});
test("frontmatter, fences, comments and nested panel-in-panel never create outline siblings", () => {
  const s = parse(
    "---\n## Page ghost\n---\n```md\n## Page fake\n> [!panel] fake\n```\n<!--\n## Page hidden\n-->\n## Page real\n> [!panel] Outer\n> > [!panel] Nested\n> [!panel-in-panel] Inset\n~~~\n> [!panel] Code\n~~~\n",
  );
  assert.equal(s.pages.length, 1);
  assert.equal(s.pages[0].panels.length, 1);
});
test("CRLF offsets navigate to exact source ranges and Side can override spread heading", () => {
  const s = parse(
    "## Page 1 Double Spread\r\n\r\nSide: Left\r\n\r\n> [!panel] Hello\r\n",
  );
  assert.equal(s.slots, 1);
  assert.equal(s.pages[0].side, "Left");
  assert.equal(
    s.text.slice(s.pages[0].panels[0].from).split("\r\n")[0],
    "> [!panel] Hello",
  );
  assert.equal(s.pages[0].panels[0].line, 4);
});
test("legacy and predecessor claims agree; global starts follow actual slots despite stale declared counts", () => {
  const a = parse("## Page 1", {
    Group: "Draft",
    Pages: 4,
    "Followed By": "[[Next]]",
  });
  const b = parse(
    "## Page 1",
    { Group: "Draft", Pages: 12, "Preceded By": "[[Opening|Opening title]]" },
    "Projects/Example/Scripts/Next.md",
  );
  const [g] = organize([b, a], resolve);
  assert.equal(g.issues.length, 0);
  assert.deepEqual(
    g.sequences[0].map((s) => s.path),
    [a.path, b.path],
  );
  assert.equal(g.starts.get(b.path), 2);
});
test("conflicts, dangling links and cycles cannot acquire trusted global ranges", () => {
  const make = (name: string, metadata: Record<string, unknown>) =>
    parse(
      "## Page 1",
      { Pages: 1, ...metadata },
      `Projects/Example/Scripts/${name}.md`,
    );
  for (const scripts of [
    [
      make("A", { "Followed By": "[[B]]" }),
      make("B", { "Preceded By": "[[C]]" }),
      make("C", {}),
    ],
    [
      make("A", { "Preceded By": "[[Missing]]" }),
      make("B", { "Preceded By": "[[A]]" }),
    ],
    [
      make("A", { "Preceded By": "[[B]]" }),
      make("B", { "Preceded By": "[[A]]" }),
    ],
    [make("A", { "Preceded By": ["B", "C"] })],
  ]) {
    const [g] = organize(scripts, resolve);
    assert.ok(g.issues.length);
    assert.equal(g.starts.size, 0);
  }
});
test("separate projects/groups have independent order and missing declared counts do not stop actual range propagation", () => {
  const a = parse("## Page 1", { "Followed By": "[[Next]]" });
  const b = parse(
    "## Page 1",
    { Pages: 2 },
    "Projects/Example/Scripts/Next.md",
  );
  const c = parse("## Page 1", {
    Pages: 1,
    Group: "Other",
    "Preceded By": "[[Opening]]",
  });
  const groups = organize([a, b, c], resolve);
  const g = groups.find((g) => g.group === "Top-level")!;
  assert.equal(g.starts.get(a.path), 1);
  assert.equal(g.starts.get(b.path), 2);
  assert.ok(groups.find((g) => g.group === "Other")!.issues.length);
});
const apply = (s: Script, e: { from: number; to: number; text: string }) =>
  s.text.slice(0, e.from) + e.text + s.text.slice(e.to);
test("moving a panel carries dialogue, notes and location; never crosses page or touches frontmatter", () => {
  const s = parse(fixture, { Pages: 4 }),
    a = s.pages[0].panels[0],
    b = s.pages[0].panels[1];
  const moved = apply(s, movePanel(s, a.from + 4, 1));
  const after = parse(moved, { Pages: 4 });
  assert.deepEqual(
    after.pages[0].panels.map((p) => p.title),
    ["A pause", "The arrival"],
  );
  assert.ok(moved.includes(fixture.slice(a.from, a.to)));
  assert.ok(moved.startsWith(fixture.slice(0, a.from)));
  assert.equal(
    moved.slice(after.pages[1].from),
    fixture.slice(s.pages[1].from),
  );
  assert.equal(
    apply(after, movePanel(after, after.pages[0].panels[1].from, -1)),
    fixture,
  );
  assert.throws(() => movePanel(s, b.from, 1), /edge/);
});
test("insertion uses local slot numbers without rewriting declarations or existing authored headings", () => {
  const s = parse(fixture, { Pages: 9 });
  const edit = insertBlock(s, s.text.length, "page");
  const text = apply(s, edit);
  assert.ok(text.startsWith(fixture));
  assert.ok(text.endsWith("## Page 5\n\nSide: Right\n\n"));
  const panel = insertBlock(s, s.pages[0].panels[0].from, "panel");
  assert.ok(!panel.text.includes("Panel Description:"));
  assert.equal(panel.from, s.pages[0].panels[0].to);
  assert.equal(apply(s, panel).slice(panel.cursor, panel.cursor + 2), "\n\n");
  assert.throws(
    () => insertBlock(parse("Intro only"), 0, "panel"),
    /page first/,
  );
});
test("final panel without newline remains a separate block when moved upward", () => {
  const s = parse("## Page 1\n\n> [!panel] First\n> A\n\n> [!panel] Last\n> B");
  const after = parse(apply(s, movePanel(s, s.pages[0].panels[1].from, -1)));
  assert.deepEqual(
    after.pages[0].panels.map((p) => p.title),
    ["Last", "First"],
  );
  assert.ok(after.text.includes("> B\n\n> [!panel] First"));
});

test("saved order seeds groups without predecessor fields and accumulates page ranges", async () => {
  const { arrangedGroups, orderKey, reorderScript } =
    await import("../src/scripts/model.ts");
  const a = parse("## Page 1", { Pages: 4 });
  const b = parse(
    "## Page 1",
    { Pages: 2 },
    "Projects/Example/Scripts/Next.md",
  );
  const key = orderKey(a.scope, a.group);
  const [g] = arrangedGroups([a, b], resolve, { [key]: [a.path, b.path] });
  assert.deepEqual(
    g.sequences[0].map((s) => s.path),
    [a.path, b.path],
  );
  assert.equal(g.starts.get(b.path), 2);
  assert.deepEqual(reorderScript(g, a.path, b.path), [b.path, a.path]);
  const [moved] = arrangedGroups([a, b], resolve, { [key]: [b.path, a.path] });
  assert.equal(moved.starts.get(a.path), 2);
  assert.equal(a.metadata["Preceded By"], undefined);
  assert.equal(a.text, "## Page 1");
});
test("existing predecessor fields override saved order and unresolved links stay visible", async () => {
  const { arrangedGroups, orderKey } = await import("../src/scripts/model.ts");
  const a = parse("## Page 1", { Pages: 4, "Preceded By": "[[Missing]]" });
  const b = parse(
    "## Page 1",
    { Pages: 2 },
    "Projects/Example/Scripts/Next.md",
  );
  const key = orderKey(a.scope, a.group);
  const [g] = arrangedGroups([b, a], resolve, {
    [key]: ["Deleted.md", a.path, a.path],
  });
  assert.ok(g.issues.length);
  assert.equal(g.starts.has(a.path), false);
  const a2 = parse("## Page 1", { Pages: 4, "Preceded By": "[[Next]]" });
  const [ordered] = arrangedGroups([a2, b], resolve, {
    [key]: [a.path, b.path],
  });
  assert.deepEqual(
    ordered.sequences[0].map((s) => s.path),
    [b.path, a.path],
  );
  assert.equal(ordered.starts.get(a.path), 2);
});
test("new groups form one initial sequence without requiring link fields", async () => {
  const { arrangedGroups } = await import("../src/scripts/model.ts");
  const a = parse("## Page 1", { Pages: 4 }),
    b = parse("## Page 1", { Pages: 2 }, "Projects/Example/Scripts/Z.md");
  const [g] = arrangedGroups([b, a], resolve, {});
  assert.equal(g.sequences.length, 1);
  assert.equal(g.starts.get(b.path), 2);
});
test("stored order validation and file/folder renames preserve order without metadata writes", async () => {
  const { readOrders, renameOrders, orderKey } =
    await import("../src/scripts/model.ts");
  const key = orderKey("Projects/Example", "Draft");
  const orders = readOrders({
    [key]: ["Projects/Example/Scripts/A.md", "Projects/Example/Scripts/B.md"],
    bad: ["bad"],
    [orderKey("X", "Y")]: [3],
  });
  assert.equal(Object.keys(orders).length, 1);
  const renamed = renameOrders(orders, "Projects/Example", "Projects/Renamed");
  assert.deepEqual(renamed[orderKey("Projects/Renamed", "Draft")], [
    "Projects/Renamed/Scripts/A.md",
    "Projects/Renamed/Scripts/B.md",
  ]);
});

test("panel at end of file can move when the caret is after its last character", () => {
  const s = parse("## Page 1\n\n> [!panel] A\n> A\n\n> [!panel] B\n> B");
  const moved = movePanel(s, s.text.length, -1);
  assert.deepEqual(
    parse(apply(s, moved)).pages[0].panels.map((p) => p.title),
    ["B", "A"],
  );
});

test("write plans fill missing predecessors and rewrite the whole chain on drag", async () => {
  const { arrangedGroups, orderWrites } =
    await import("../src/scripts/model.ts");
  const a = parse("## Page 1", { Pages: 1, "Followed By": "[[Next]]" }),
    b = parse("## Page 1", { Pages: 1 }, "Projects/Example/Scripts/Next.md");
  const [g] = arrangedGroups([b, a], resolve, {});
  const missing = orderWrites(g, [a.path, b.path], true);
  assert.equal(missing[0].properties["Preceded By"], "");
  assert.equal(
    missing[1].properties["Preceded By"],
    "[[Projects/Example/Scripts/Opening]]",
  );
  const moved = orderWrites(g, [b.path, a.path]);
  assert.equal(moved[0].properties["Preceded By"], "");
  assert.equal(
    moved[1].properties["Preceded By"],
    "[[Projects/Example/Scripts/Next]]",
  );
  assert.equal(moved[1].properties["Followed By"], "");
  assert.throws(() => orderWrites(g, [a.path, a.path]), /exactly once/);
});
test("predecessors take precedence over stale successor fields; cycles never autofill", async () => {
  const { arrangedGroups, orderWrites } =
    await import("../src/scripts/model.ts");
  const a = parse("## Page 1", {
      "Preceded By": "",
      "Followed By": "[[Missing]]",
    }),
    b = parse(
      "## Page 1",
      { "Preceded By": "[[Opening]]" },
      "Projects/Example/Scripts/Next.md",
    );
  assert.equal(arrangedGroups([a, b], resolve, {})[0].issues.length, 0);
  const cycleA = parse("## Page 1", { "Preceded By": "[[Next]]" }),
    cycleB = parse("## Page 1", { "Preceded By": "[[Opening]]" }, b.path);
  const [g] = arrangedGroups([cycleA, cycleB], resolve, {});
  assert.ok(g.issues.length);
  assert.deepEqual(
    orderWrites(
      g,
      g.sequences.flat().map((s) => s.path),
      true,
    ),
    [],
  );
});
test("targeted metadata edits preserve CRLF body, unrelated properties and comments", async () => {
  const { patchProperties, frontmatter } =
    await import("../src/scripts/properties.ts");
  const source =
    '\uFEFF---\r\nGroup: Draft\r\n# retain this\r\n"Preceded By": >-\r\n  old link\r\n# after property\r\nPages: 2\r\n---\r\n\r\n## Page 1\r\nBody stays.\r\n';
  const next = patchProperties(
    source,
    { "Preceded By": "[[Project/A]]" },
    () => {
      throw new Error("No fallback needed");
    },
  );
  assert.ok(
    next.includes(
      'Preceded By: "[[Project/A]]"\r\n# after property\r\nPages: 2',
    ),
  );
  assert.ok(next.includes("# retain this"));
  assert.equal(
    next.slice(frontmatter(next)!.body),
    source.slice(frontmatter(source)!.body),
  );
  const created = patchProperties(
    "## Page 1\n",
    { "Preceded By": "" },
    () => "",
  );
  assert.equal(created, '---\nPreceded By: ""\n---\n## Page 1\n');
  assert.throws(() => frontmatter("---\nGroup: Draft"), /Close/);
});

test("a spread finishes on the right: following pages alternate left then right", () => {
  const s = parse(
    "## Page 1\n\n## Page 2 Double Spread\n\n## Page 4\n\n## Page 5\n",
  );
  assert.deepEqual(
    s.pages.map((p) => [p.local, p.side]),
    [
      [1, "Right"],
      [2, "Double Spread"],
      [4, "Left"],
      [5, "Right"],
    ],
  );
  const spreadOnly = parse("## Page 1 Double Spread\n\n");
  const edit = insertBlock(spreadOnly, spreadOnly.text.length, "page");
  assert.ok(edit.text.includes("## Page 3\n\nSide: Left"));
});
test("explicit side overrides after spreads remain authored choices", () => {
  const s = parse(
    "## Page 1 Double Spread\n\n## Page 3\n\nSide: Right\n\n## Page 4\n",
  );
  assert.deepEqual(
    s.pages.map((p) => p.side),
    ["Double Spread", "Right", "Left"],
  );
});


test("display numbering ignores stale headings, counts spreads and preserves names through middle edits", () => {
  const source = "## Page 91 — Arrival\n> [!panel] Named panel\n> Text\n> [!panel] Panel 8 — Other\n> Text\n## Page 91 Double Spread — Panorama\n> [!panel] Wide\n> Text\n## Page 91 — Departure\n> [!panel] Last\n> Text\n";
  const script = parse(source, {Pages:99});
  assert.deepEqual(script.pages.map(pageLabel), ["Page 1 — Arrival", "Page 2–3 — Panorama", "Page 4 — Departure"]);
  assert.deepEqual(script.pages[0].panels.map((p,i) => panelLabel(p.title,i)), ["Panel 1 — Named panel", "Panel 2 — Other"]);
  assert.equal(panelLabel(script.pages[1].panels[0].title,0), "Panel 1 — Wide");
  const inserted = parse(source.replace("## Page 91 Double", "## Page ? — Inserted\n> [!panel] New\n> Text\n## Page 91 Double"));
  assert.deepEqual(inserted.pages.map(pageLabel), ["Page 1 — Arrival", "Page 2 — Inserted", "Page 3–4 — Panorama", "Page 5 — Departure"]);
  const removed = parse(source.slice(source.indexOf("## Page 91 Double")));
  assert.deepEqual(removed.pages.map(pageLabel), ["Page 1–2 — Panorama", "Page 3 — Departure"]);
  assert.equal(script.text, source);
  assert.equal(script.metadata.Pages,99);
});

test("compilation preserves sources, structural numbers and dialogue while filtering production notes", async () => {
  const {compileMarkdown,readCompileOptions}=await import("../src/scripts/compile-model.ts");
  const source='---\nPages: 99\nGroup: Draft\n---\n## Page 88 — Named page\n\n> [!panel]- Named panel\n> Hidden description.\n\n**MIRA:** Visible dialogue.\n\n> [!tip] Editorial\n> Hidden production note.\n\n## Page 99 Double Spread\n> [!panel] Wide\n> Wide description.\n\n<!-- Secret -->\n%% Private comment %%\n';
  const script=parse(source,{Pages:99,Group:"Draft"});
  const result=compileMarkdown(script,{...readCompileOptions(undefined),panels:false,notes:false});
  assert.match(result.markdown,/## Page 1 — Named page/);
  assert.match(result.markdown,/## Page 2–3/);
  assert.match(result.markdown,/> \[!panel\] Panel 1 — Named panel/);
  assert.match(result.markdown,/Visible dialogue/);
  for(const omitted of ['Pages: 99','Hidden description','Hidden production note','Private comment','Secret','Wide description'])assert.ok(!result.markdown.includes(omitted),omitted);
  assert.equal(script.text,source);
  const notes=compileMarkdown(script,{...readCompileOptions(undefined),notes:true});
  assert.match(notes.markdown,/Hidden production note/);assert.match(notes.markdown,/Hidden description/);
});

test("compilation never mixes Groups, rejects uncertain order/empty selections and detects changed content", async () => {
  const {makeCompileJob,readCompileOptions,groupFingerprint}=await import("../src/scripts/compile-model.ts");
  const {arrangedGroups}=await import("../src/scripts/model.ts");
  const first=parse('## Page 99',{Group:'Draft','Preceded By':''}),second=parse('## Page 99',{Group:'Revision','Preceded By':''},'Projects/Example/Scripts/Revision.md');
  const groups=arrangedGroups([first,second],resolve,{}),draft=groups.find(g=>g.group==='Draft')!;
  const job=makeCompileJob(draft,readCompileOptions({cover:false}));assert.deepEqual(job.scripts.map(s=>s.path),[first.path]);
  assert.throws(()=>makeCompileJob(draft,{...job.options,excluded:[first.path]}),/at least one/);
  assert.throws(()=>makeCompileJob({...draft,issues:[{path:first.path,message:'Cycle'}]},job.options),/reading-order/);
  const changed=arrangedGroups([{...first,text:first.text+'\nChanged'}],resolve,{})[0];
  assert.notEqual(groupFingerprint(changed),job.fingerprint);
});

test("compile preferences validate, image resources are inert and story offsets count spreads", async () => {
  const {compileMarkdown,readCompileOptions,compileFilename}=await import("../src/scripts/compile-model.ts");
  const options=readCompileOptions({paper:'bad',preset:'bad',excluded:['A','A',42]});
  assert.equal(options.paper,'Letter');assert.equal("preset" in options,false);assert.deepEqual(options.excluded,['A']);
  const script=parse('## Page ? Double Spread\n> [!panel] A\n> Text\n\n![[Assets/Test.png]]\n![Remote](https://example.com/image.png)\n<img src="https://example.com/raw.png" onerror="bad()">\n<https://example.com>\n');
  const compiled=compileMarkdown(script,options,5);
  assert.match(compiled.markdown,/## Page 5–6/);assert.equal(compiled.images.length,3);
  assert.ok(!compiled.markdown.includes('<img'));assert.ok(!compiled.markdown.includes('onerror'));
  assert.match(compiled.markdown,/<https:\/\/example.com>/);
  assert.ok(compileFilename({scope:'Projects/A',group:'Bad/Name'}).endsWith('.pdf'));
  assert.ok(!compileFilename({scope:'Projects/A',group:'Bad/Name'}).includes('/'));
});


test("compile preserves adjacent panel headings and literal fenced resources; comments never earn page slots", async () => {
  const {compileMarkdown,readCompileOptions}=await import("../src/scripts/compile-model.ts");
  const source='%%\n## Page 99 Double Spread\n> [!panel] Hidden\n%%\n## Page ?\n> [!panel] First\n> Secret first\n> [!panel] Second\n> Secret second\n\n```md\n<!-- literal -->\n![Literal](https://example.com/literal.png)\n## Page 88\n```\n\n`![Inline](literal.png)`\n';
  const script=parse(source);
  assert.equal(script.slots,1);assert.equal(script.pages[0].panels.length,2);
  const compiled=compileMarkdown(script,{...readCompileOptions(undefined),panels:false});
  assert.match(compiled.markdown,/Panel 1 — First/);assert.match(compiled.markdown,/Panel 2 — Second/);
  assert.ok(!compiled.markdown.includes('Secret'));assert.ok(!compiled.markdown.includes('Page 99'));
  assert.match(compiled.markdown,/!\[Literal\]\(https:\/\/example.com\/literal.png\)/);
  assert.match(compiled.markdown,/`!\[Inline\]\(literal.png\)`/);assert.equal(compiled.images.length,0);
});


test("compilation defaults include all content, remembers a vault author and snapshots the local cover date", async () => {
  const {compileCover,makeCompileJob,readCompileOptions}=await import("../src/scripts/compile-model.ts");
  const {arrangedGroups}=await import("../src/scripts/model.ts");
  const {readWriting}=await import("../src/scripts/writing.ts");
  const options=readCompileOptions(undefined);
  assert.deepEqual([options.panels,options.notes,options.cover],[true,true,true]);
  assert.equal(readCompileOptions({notes:false,cover:false,panels:false,preset:"editorial"}).notes,false);
  const script=parse('## Page ?',{Group:'Draft','Preceded By':''});
  const group=arrangedGroups([script],resolve,{})[0];
  assert.throws(()=>makeCompileJob(group,options),/author name/);
  const createdAt=new Date(2026,9,24,12).getTime();
  const job=makeCompileJob(group,options,'  Alex Writer  ',createdAt),cover=compileCover(job);
  assert.equal(cover.byline,'By Alex Writer');assert.equal(job.createdAt,createdAt);
  assert.equal(cover.subtitle,`${group.group} · ${new Intl.DateTimeFormat(undefined,{year:'numeric',month:'long',day:'numeric'}).format(new Date(createdAt))}`);
  const stored=readWriting(JSON.parse(JSON.stringify({...readWriting(null),compilationAuthor:job.author})));
  assert.equal(stored.compilationAuthor,'Alex Writer');assert.equal(readWriting(null).compilationAuthor,'');
  assert.equal(readWriting({compilationAuthor:42}).compilationAuthor,'');
});

test('page drags move complete original ranges and preserve metadata, names, spreads and CRLF',async()=>{
 const {movePageTo}=await import('../src/scripts/structure.ts');
 for(const eol of ['\n','\r\n']){
  const text=['---','Pages: 4','---','Preamble unchanged.','','## Page 12 — Arrival','','Side: Right','','> [!panel] Named panel','> Description.','','**MIRA:** Dialogue.','','> [!note] Editorial','> Keep this.','','## Page 99 — Panorama','','Side: Double Spread','','> [!panel] Wide','> Wide view.','','## Page 42 — Empty'].join(eol);
  const script=parse(text),edit=movePageTo(script,script.pages[2].from,script.pages[0].from,'before')!;
  const result=text.slice(0,edit.from)+edit.text+text.slice(edit.to),moved=parse(result);
  assert.deepEqual(moved.pages.map(page=>page.title),['Page 42 — Empty','Page 12 — Arrival','Page 99 — Panorama']);
  assert.ok(result.startsWith(text.slice(0,script.pages[0].from)));assert.match(result,/Dialogue/);assert.match(result,/Editorial/);
  assert.equal(moved.pages[2].side,'Double Spread');assert.equal(moved.slots,4);
  assert.ok(result.includes(text.slice(script.pages[0].from,script.pages[2].from)));
  assert.equal(movePageTo(script,script.pages[0].from,script.pages[0].from,'after'),null);
  if(eol==='\r\n')assert.ok(!result.replaceAll('\r\n','').includes('\n'));
 }
});

test('panel drags reorder siblings or move between pages, including an empty destination',async()=>{
 const {movePanelTo}=await import('../src/scripts/structure.ts');
 const text='---\nTitle: Keep\n---\n## Page 1\n\nSide: Left\n\n> [!panel] A\n> A view.\n\n**MIRA:** Keep A dialogue.\n\n> [!panel] B\n> B view.\n\n> [!tip] Note\n> Keep B note.\n\n## Page 2\n\nSide: Right\n\nLocation: Keep location.\n';
 const script=parse(text),[a,b]=script.pages[0].panels;
 const sibling=movePanelTo(script,b.from,a.from,'before')!;
 assert.deepEqual(parse(text.slice(0,sibling.from)+sibling.text+text.slice(sibling.to)).pages[0].panels.map(p=>p.title),['B','A']);
 const edit=movePanelTo(script,a.from,script.pages[1].from,'inside')!;
 const result=text.slice(0,edit.from)+edit.text+text.slice(edit.to),moved=parse(result);
 assert.deepEqual(moved.pages.map(page=>page.panels.map(panel=>panel.title)),[['B'],['A']]);
 assert.match(result,/Location: Keep location\.[\s\S]*\[!panel\] A/);
 assert.ok(result.includes(text.slice(a.from,a.to)));assert.match(result,/Keep B note/);assert.ok(result.startsWith('---\nTitle: Keep\n---'));
 assert.throws(()=>movePanelTo(script,999,script.pages[1].from,'inside'),/outline changed/);
});

test('page movement commands and previous/next navigation use real structural ranges',async()=>{
 const {movePage,navigationOffset}=await import('../src/scripts/structure.ts');
 const script=parse('## Page 1\n\n> [!panel] A\n> First.\n\n## Page 8\n\n> [!panel] B\n> Last.');
 assert.equal(navigationOffset(script,script.pages[0].from,'page',1),script.pages[1].from);
 assert.equal(navigationOffset(script,script.text.length,'page',-1),script.pages[0].from);
 assert.equal(navigationOffset(script,script.text.length,'panel',-1),script.pages[0].panels[0].from);
 assert.equal(navigationOffset(script,0,'page',-1),null);
 assert.throws(()=>movePage(script,0,-1),/edge/);
 const edit=movePage(script,script.text.length,-1)!;assert.equal(parse(script.text.slice(0,edit.from)+edit.text+script.text.slice(edit.to)).pages[0].title,'Page 8');
});
