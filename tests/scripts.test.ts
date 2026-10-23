import test from "node:test";
import assert from "node:assert/strict";
import {
  parseScript,
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
test("legacy and predecessor claims agree; global starts follow declared counts", () => {
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
  assert.equal(g.starts.get(b.path), 5);
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
test("separate projects/groups have independent order and unknown declared counts stop range propagation", () => {
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
  assert.equal(g.starts.has(b.path), false);
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
  assert.equal(g.starts.get(b.path), 5);
  assert.deepEqual(reorderScript(g, a.path, b.path), [b.path, a.path]);
  const [moved] = arrangedGroups([a, b], resolve, { [key]: [b.path, a.path] });
  assert.equal(moved.starts.get(a.path), 3);
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
  assert.equal(ordered.starts.get(a.path), 3);
});
test("new groups form one initial sequence without requiring link fields", async () => {
  const { arrangedGroups } = await import("../src/scripts/model.ts");
  const a = parse("## Page 1", { Pages: 4 }),
    b = parse("## Page 1", { Pages: 2 }, "Projects/Example/Scripts/Z.md");
  const [g] = arrangedGroups([b, a], resolve, {});
  assert.equal(g.sequences.length, 1);
  assert.equal(g.starts.get(b.path), 5);
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
