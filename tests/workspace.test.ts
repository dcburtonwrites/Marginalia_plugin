import test from "node:test";
import assert from "node:assert/strict";
import {
  readWorkspace,
  navigation,
  sharedFolders,
  sectionName,
  sharedEntry,
  eligible,
  entryType,
  projects,
  canon,
  preview,
  field,
  projectStatusTabs,
  projectStatuses,
  readStatusOrder,
  type Entry,
} from "../src/workspace/model.ts";
const note = (
  path: string,
  tags: string[] = [],
  fields: Record<string, unknown> = {},
): Entry => ({
  path,
  name: path.split("/").at(-1)!.replace(/\.md$/, ""),
  body: "A fictional entry.",
  modified: 1,
  created: 1,
  fields,
  tags,
  type: entryType(path, tags),
});
test("status flow defaults and custom field/order preserve extra authored statuses", () => {
  const defaults = readWorkspace(null);
  assert.equal(defaults.projectStatusField, "stage");
  assert.deepEqual(defaults.projectStatusOrder, [
    "Foraged",
    "Dried",
    "Ground",
    "Brewed",
    "Distilled",
    "Bottled",
  ]);
  assert.deepEqual(readStatusOrder(" Ready → Drafting\nReady\n\nUnassigned"), [
    "Ready",
    "Drafting",
  ]);
  const settings = readWorkspace({
    vaultType: "Storyboard",
    projectStatusField: " Progress ",
    projectStatusOrder: ["Ready", "Drafting", "Ready", 7],
  });
  const items = projects(
    [
      note("Sky/Overview.md", ["project-parent"], {
        stage: "Ignored",
        progress: "Drafting",
      }),
      note("Sea/Overview.md", ["project-parent"], { progress: "Archived" }),
      note("Empty/Overview.md"),
    ],
    "Storyboard",
  );
  assert.deepEqual(projectStatusTabs(items, settings), [
    "All Entries",
    "Ready",
    "Drafting",
    "Archived",
    "Unassigned",
  ]);
  assert.deepEqual(
    projectStatuses(items.find((p) => p.name === "Sky")?.overview, settings),
    ["Drafting"],
  );
  assert.deepEqual(
    projectStatuses(note("Other.md", [], { stage: "Ignored" }), settings),
    [],
  );
  assert.deepEqual(
    readWorkspace({ projectStatusOrder: [] }).projectStatusOrder,
    [],
  );
});
test("legacy settings default each module on; malformed flags and paths are sanitized", () => {
  assert.deepEqual(readWorkspace(null).modules, {
    theme: true,
    scripts: true,
    librarian: true,
  });
  const read = readWorkspace({
    modules: { theme: false, scripts: true, librarian: false },
    vaultType: "wrong",
    pins: ["A.md", "A.md", ".marginalia/expanded/A.md", "../Secrets.md", 5],
  });
  assert.equal(read.vaultType, "World");
  assert.deepEqual(read.pins, ["A.md"]);
  assert.equal(read.modules.theme, false);
  assert.equal(read.modules.librarian, false);
});
test("Storyboard shared areas follow Projects; Script Studio remains separate", () => {
  assert.deepEqual(navigation("World"), [
    "Home",
    "Brainstorms",
    "Canon",
    "Projects",
  ]);
  assert.deepEqual(
    navigation("Storyboard", false, [
      "_Crypt",
      "_Research",
      "_Collections",
      "_Assets",
    ]),
    [
      "Home",
      "Project Register",
      "Projects",
      "_Crypt",
      "_Research",
      "_Collections",
    ],
  );
});
test("top-level underscore folders become live shared sections in either vault type, excluding Assets", () => {
  const folders = [
    "_Research",
    "_Crypt",
    "_Collections",
    "_Ideas",
    "_Empty",
    "_templates",
    "_Assets",
    "_assets",
    "Assets",
    ".marginalia",
    "Sky/_Private",
    "_Research/Notes",
    "_Ideas",
  ];
  const shared = [
    "_Crypt",
    "_Research",
    "_Collections",
    "_Empty",
    "_Ideas",
    "_templates",
  ];
  assert.deepEqual(sharedFolders(folders), shared);
  for (const type of ["World", "Storyboard"] as const)
    assert.deepEqual(
      navigation(type, false, folders).slice(-shared.length),
      shared,
    );
  assert.equal(sectionName("_Research"), "Research");
  assert.equal(sectionName("_Projects"), "Projects (shared)");
  assert.equal(sharedEntry("_templates/Character.md", "_templates"), true);
  assert.equal(eligible("_templates/Character.md"), false);
  assert.equal(sharedEntry("_templates/.hidden/Note.md", "_templates"), false);
  assert.equal(sharedEntry("_Assets/Index.md", "_Assets"), false);
  assert.equal(sharedEntry("_Ideas/Assets/Notes.md", "_Ideas"), false);
  assert.equal(sharedEntry("_Ideas/Note.md", "_Research"), false);
});
test("browser entries exclude generated, templates, attachments and archive notes", () => {
  for (const path of [
    ".marginalia/expanded/A.md",
    "_templates/A.md",
    "Archive/A.md",
    "Assets/A.md",
    "A.png",
  ])
    assert.equal(eligible(path), false);
  assert.equal(eligible("02 Character/A.md"), true);
  assert.equal(eligible("_Research/Experiment.md"), true);
});
test("canon types follow inspected folder and tag rules without promoting brainstorms", () => {
  const entries = [
    note("02 Character/Mira.md"),
    note("00 Brainstorms/Idea.md", ["character"]),
    note("08 Projects/Sky/Characters/Courier.md", ["project-character"]),
    note("08 Projects/Sky/Scripts/Scene.md", ["character"]),
  ];
  assert.equal(entryType("Misc/Place.md", ["canon/location"]), "Location");
  assert.deepEqual(
    canon(entries, false).map((e) => e.name),
    ["Mira"],
  );
  assert.deepEqual(
    canon(entries, true).map((e) => e.name),
    ["Mira", "Courier"],
  );
});
test("World project grouping preserves project notes and empty project folders", () => {
  const entries = [
    note("08 Projects/Sky/Overview.md", ["project-parent"]),
    note("08 Projects/Sky/Scripts/Opening.md"),
    note("00 Brainstorms/Idea.md"),
  ];
  const items = projects(entries, "World", ["08 Projects/Empty"]);
  assert.deepEqual(
    items.map((p) => p.name),
    ["Empty", "Sky"],
  );
  assert.equal(items[1].overview?.name, "Overview");
  assert.equal(items[1].entries.length, 2);
});
test("Storyboard projects use top-level story folders and exclude shared areas", () => {
  const entries = [
    note("Sky/Overview.md", ["project-parent"], { Stage: "Drafting" }),
    note("Sky/Scripts/Opening.md"),
    note("_Crypt/Idea.md"),
    note("_Collections/Guide.md"),
  ];
  const items = projects(entries, "Storyboard");
  assert.equal(items.length, 1);
  assert.equal(items[0].path, "Sky");
  assert.equal(field(items[0].overview, "stage"), "Drafting");
});
test("previews remove hidden/code/image content and retain visible link labels", () => {
  const text =
    "<!-- SECRET -->\n```\nHIDDEN\n```\n![[secret.png]]\n[[Path/Mira|Mira]] visits [the archive](https://example.test).";
  const result = preview(text);
  assert.ok(!/SECRET|HIDDEN|secret.png|https:/.test(result));
  assert.match(result, /Mira visits the archive/);
});
