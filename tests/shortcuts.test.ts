import test from "node:test";
import assert from "node:assert/strict";
import { planShortcut, scriptCommands } from "../src/scripts/shortcuts.ts";
import { scriptSpeakers, filterSpeakers } from "../src/scripts/speakers.ts";
const prefix =
  "---\nGroup: Draft\nPages: 4\n---\n\n## Page 1\n\nSide: Right\n\n";
const input = (text: string, path = "Project/Scripts/Opening.md") => ({
  path,
  text,
  metadata: { Group: "Draft", Pages: 4 },
});
for (const [command, kind] of Object.entries(scriptCommands)) {
  test(`${command} produces ${kind} with the intended typing selection`, () => {
    const text = prefix + command;
    const edit = planShortcut(input(text), text.length)!;
    assert.ok(edit);
    const next = text.slice(0, edit.from) + edit.text + text.slice(edit.to);
    assert.ok(next.startsWith(prefix));
    if (kind === "page") {
      assert.match(next, /## Page 2\n\nSide: Left/);
      assert.equal(edit.anchor, edit.head);
    } else if (kind === "dialogue")
      assert.equal(next.slice(edit.anchor, edit.head), "SPEAKER");
    else {
      assert.ok(next.includes(`> [!${kind}]`));
      if (kind === "panel") assert.ok(!next.includes("Panel Description:"));
      assert.equal(
        next.slice(edit.anchor, edit.head),
        kind === "panel" ? "New panel" : `New ${kind}`,
      );
    }
  });
}
test("page after a spread starts on Left and preserves subsequent authored text", () => {
  const text =
    "## Page 1\n\nSide: Right\n\n## Page 2 Double Spread\n\nSide: Double Spread\n\n/P\n\n## Page 4\n\nOriginal body";
  const edit = planShortcut(input(text), text.indexOf("/P") + 2)!;
  assert.match(edit.text, /## Page 4\n\nSide: Left/);
  assert.equal(text.slice(edit.to), "\n## Page 4\n\nOriginal body");
});
const characters = [
  { path: "02 Character/Mira.md", name: "Mira", aliases: ["The Keeper"] },
  { path: "Characters/Orin.md", name: "Orin", aliases: [] },
  { path: "Characters/Unused.md", name: "Unused", aliases: [] },
];
const resolve = (name: string) =>
  characters.find(
    (c) => c.path.replace(/\.md$/, "") === name || c.name === name,
  )?.path;
test("speaker list includes frontmatter plain names and wiki links before any dialogue", () => {
  const result = scriptSpeakers(
    "## Page 1",
    { Characters: ["Mira", "[[Characters/Orin|Courier]]", "KENNY"] },
    characters,
    resolve,
  );
  assert.deepEqual(
    result.map((c) => c.name),
    ["Courier", "KENNY", "Mira"],
  );
  assert.equal(result[0].insert, "[[Characters/Orin|Courier]]");
  assert.equal(result[2].insert, "Mira");
  assert.deepEqual(
    scriptSpeakers(
      "",
      { characters: "Mira, [[Characters/Orin|Courier]]" },
      characters,
      resolve,
    ).map((c) => c.name),
    ["Courier", "Mira"],
  );
});
test("speaker list collects known mentions and prior plain/wiki dialogue, excludes unrelated links and unused characters", () => {
  const result = scriptSpeakers(
    "## Page 1\nSide: Right\n> [!panel]\n> The Keeper waits at [[Location/Archive]].\n**[[Characters/Orin|Courier]]:** Hello.\n**SIDNEY (OFF):** Wait.\nKENNY: Fine.\nSFX: Boom.",
    {},
    characters,
    resolve,
  );
  assert.deepEqual(
    result.map((c) => c.name),
    ["Courier", "KENNY", "SIDNEY", "The Keeper"],
  );
  assert.equal(result.find((c) => c.name === "SIDNEY")?.insert, "SIDNEY");
  assert.equal(filterSpeakers(result, "cour")[0].name, "Courier");
});
test("speaker identity is deduplicated without changing existing plain speaker styling", () => {
  const result = scriptSpeakers(
    "## Page 1\n[[02 Character/Mira]]\n**MIRA:** Hello.",
    { Characters: ["[[02 Character/Mira]]"] },
    characters,
    resolve,
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].insert, "MIRA");
});
test("speaker extraction ignores comments/code, embedded images and non-character links", () => {
  const text =
    "---\nignored: Mira\n---\n```\n**FAKE:** Orin\n```\n<!-- Mira -->\n`Orin`\n![[02 Character/Mira]]\n[[Location/Archive]]\n**SFX:** Boom.";
  assert.deepEqual(scriptSpeakers(text, {}, characters, resolve), []);
});
test("ambiguous aliases stay separate identifiable choices; empty casts remain editable", () => {
  const cast = [
    { path: "One.md", name: "Alex", aliases: [] },
    { path: "Two.md", name: "Alex", aliases: [] },
  ];
  assert.deepEqual(
    scriptSpeakers("Alex waits.", {}, cast, () => undefined).map((s) => s.path),
    ["One.md", "Two.md"],
  );
  assert.deepEqual(scriptSpeakers("Empty scene", {}, characters, resolve), []);
});
test("page can start an empty script; other blocks require a page", () => {
  assert.match(planShortcut(input("/P"), 2)!.text, /## Page 1/);
  assert.equal(planShortcut(input("/p"), 2), null);
});
test("ordinary notes, templates, hidden files and noncomic roles do not intercept Enter", () => {
  for (const path of [
    "Notes/Ordinary.md",
    "_templates/Scripts/Test.md",
    ".marginalia/Scripts/Test.md",
  ])
    assert.equal(
      planShortcut(input(prefix + "/p", path), prefix.length + 2),
      null,
    );
  assert.equal(
    planShortcut(
      {
        path: "A.md",
        metadata: { role: "manuscript", format: "prose" },
        text: prefix + "/p",
      },
      prefix.length + 2,
    ),
    null,
  );
});
test("exact case, whole line and caret at its end are required", () => {
  for (const command of [
    "/D",
    "/pp",
    " /p",
    "/p ",
    "> /p",
    "- /p",
    "    /p",
    "Text /p",
  ])
    assert.equal(
      planShortcut(input(prefix + command), prefix.length + command.length),
      null,
    );
  assert.equal(planShortcut(input(prefix + "/p"), prefix.length + 1), null);
});
test("code, frontmatter, comments and math retain native Enter", () => {
  for (const guard of ["```md\n", "~~~\n", "<!--\n", "$$\n"]) {
    const text = prefix + guard + "/p";
    assert.equal(planShortcut(input(text), text.length), null);
  }
  const yaml = "---\n/P\n---\n";
  assert.equal(planShortcut(input(yaml), 6), null);
  const unclosed = "---\n/P";
  assert.equal(planShortcut(input(unclosed), unclosed.length), null);
});
test("closed code/comment sections do not block later commands", () => {
  for (const guard of [
    "```\nignored\n```\n\n",
    "<!-- ignored -->\n\n",
    "$$\nx\n$$\n\n",
  ]) {
    const text = prefix + guard + "/p";
    assert.ok(planShortcut(input(text), text.length));
  }
});
test("CRLF conversion preserves line endings and following text", () => {
  const text = (prefix + "/p\n\nUnchanged").replaceAll("\n", "\r\n");
  const cursor = text.indexOf("/p") + 2;
  const edit = planShortcut(input(text), cursor)!;
  assert.ok(edit.text.includes("\r\n"));
  assert.equal(edit.text.replaceAll("\r\n", "").includes("\n"), false);
  assert.equal(text.slice(edit.to), "\r\nUnchanged");
});
