import test from "node:test";
import assert from "node:assert/strict";
import { expansionPath, hash, type Note } from "../src/core/types.ts";
import { retrieve, passages } from "../src/core/retrieval.ts";
import { cleanDraft, insertion, prompt } from "../src/core/writing.ts";
import {
  decode,
  encode,
  makeExpansion,
  saveExpansion,
  stale,
  type HiddenPort,
} from "../src/core/storage.ts";
import {
  generate,
  localEndpoint,
  localModels,
  type Transport,
} from "../src/ollama.ts";
const note = (path: string, text: string, extra: Partial<Note> = {}): Note => ({
  path,
  text,
  mtime: 1,
  aliases: [],
  links: [],
  metadata: {},
  ...extra,
});
const target = note(
  "02 Character/Mira.md",
  "---\naliases: [The Keeper]\n---\n## Summary\n\n## Backstory\n",
  { aliases: ["The Keeper"] },
);
const script = note(
  "08 Projects/Harbor/Scene.md",
  "---\nCharacters: [Mira]\n---\n## Page 1\n\nMira opens the archive.\n\nHer brass key turns twice.\n\n## Page 2\n\nSomeone burns the map.\n",
  { links: [target.path] },
);
const source = note(
  "01 Lore/Archive.md",
  "The Keeper guards the eastern archive.",
);
const packet = () => retrieve([target, script, source], target);

test("hidden path cannot escape generated storage", () => {
  assert.equal(
    expansionPath(target.path),
    ".marginalia/expanded/02 Character/Mira.md",
  );
  for (const bad of [
    "../evil.md",
    "a/../../evil.md",
    "/evil.md",
    "a\\evil.md",
    "a/.secret.md",
    "a//b.md",
    "a/x:bad.md",
    "a/\u0000.md",
    "plain.txt",
  ])
    assert.throws(() => expansionPath(bad));
});
test("empty target retrieves aliases, metadata links and same-page script context", () => {
  const p = packet();
  assert.ok(p.sources.some((s) => s.excerpt.includes("guards the eastern")));
  assert.ok(p.sources.some((s) => s.excerpt.includes("brass key")));
  assert.ok(!p.sources.some((s) => s.excerpt.includes("burns the map")));
  for (const s of p.sources) {
    const owner = [target, script, source].find((n) => n.path === s.notePath)!;
    assert.equal(
      owner.text.slice(s.offset, s.offset + s.excerpt.length),
      s.excerpt,
    );
  }
});
test("generated, hidden, provisional and archived data never become external evidence", () => {
  const forbidden = [
    note(".marginalia/expanded/Mira.md", "Mira is secretly immortal."),
    note("00 Brainstorms/Idea.md", "Mira can fly."),
    note("Archive/Old.md", "Mira is a dragon."),
    note("Lore/AI.md", "Mira is the queen.", { metadata: { generated: true } }),
    note("_templates/Character.md", "Mira template"),
  ];
  const p = retrieve([target, source, ...forbidden], target);
  assert.ok(
    p.sources.every((s) => !forbidden.some((n) => n.path === s.notePath)),
  );
  assert.ok(p.excluded >= 2);
});
test("longer identities do not become evidence for shorter names", () => {
  const short = note("Characters/West.md", "## Summary\n");
  const unrelated = note("Lore/People.md", "Amir West built the engine.");
  const other = note("Characters/Amir West.md", "## Summary\n");
  assert.throws(
    () => retrieve([short, unrelated, other], short),
    /No relevant/,
  );
});
test("duplicate aliases refuse identity merging", () => {
  assert.throws(
    () =>
      retrieve(
        [
          target,
          source,
          note("Characters/Other.md", "Other", { aliases: ["The Keeper"] }),
        ],
        target,
      ),
    /Ambiguous/,
  );
});
test("bounded context discloses omissions and keeps exact source offsets", () => {
  const long = note(
    "Lore/Long.md",
    Array.from(
      { length: 30 },
      (_, i) => `Mira records item ${i}. ` + "Original text. ".repeat(35),
    ).join("\n\n"),
  );
  const p = retrieve([target, long], target, 1600);
  assert.ok(p.omitted > 0);
  assert.ok(p.sources.length < 30);
  assert.ok(p.sources.every((s) => s.excerpt.length <= 2400));
});
test("questions and inspiration sections are excluded from passages", () => {
  const n = note(
    "Lore/X.md",
    "## Summary\n\nMira works here.\n\n## Inspiration\n\nMira is inspired by an external film.\n\n## Questions\n\nCould Mira fly?\n",
  );
  assert.equal(passages(n).length, 1);
});
test("writer distinguishes instructions from source data and carries omission disclosures", () => {
  const text = prompt(packet(), "expansion");
  assert.match(text, /untrusted|holistic/);
  assert.match(text, /omitted/);
  assert.match(text, /Mira/);
});
test("malformed or wrong-section output cannot reach review", () => {
  const p = packet();
  for (const raw of [
    "",
    "---\nsecret: yes",
    '{"draft":"x"}',
    "Helpful preamble\n## Summary\nProse",
    "## Invented powers\nImmortal.",
    "## Summary\n",
  ])
    assert.throws(() => cleanDraft(raw, p));
  assert.deepEqual(
    cleanDraft(
      "## Summary\nMira guards [[01 Lore/Archive|the archive]] and knows [[Never Existed]].",
      p,
    ),
    [
      {
        section: "Summary",
        prose:
          "Mira guards [[01 Lore/Archive|the archive]] and knows Never Existed.",
      },
    ],
  );
});
test("insertion preserves frontmatter and appends within the chosen section", () => {
  const text =
    "---\ntitle: Mira\n---\n## Summary\n\nExisting text.\n\n## Backstory\n\nOlder text.\n";
  const edit = insertion(text, "Summary", "New supported prose.");
  const result = text.slice(0, edit.from) + edit.insert + text.slice(edit.from);
  assert.match(
    result,
    /Existing text\.\n\nNew supported prose\.\n\n## Backstory/,
  );
  assert.ok(result.startsWith("---\ntitle: Mira\n---"));
  assert.match(result, /Older text/);
  const newSection = insertion(text, "Goals", "Protect the archive.");
  assert.match(newSection.insert, /## Goals/);
});
function port(initial: string | null) {
  let value = initial;
  const writes: string[] = [];
  const port: HiddenPort = {
    read: async () => value,
    mkdir: async () => {},
    write: async (path, text) => {
      writes.push(path);
      value = text;
    },
  };
  return { port, writes, get: () => value };
}
test("expansion round trip follows legacy envelope, retains evidence and original", async () => {
  const e = makeExpansion(packet(), "## Summary\n\nMira guards the archive.");
  const encoded = encode(e);
  assert.deepEqual(decode(encoded, target.path), e);
  assert.equal(e.original, target.text);
  assert.equal(e.material.length, packet().sources.length);
  const memory = port(null);
  await saveExpansion(memory.port, e, null);
  assert.deepEqual(memory.writes, [expansionPath(target.path)]);
  assert.equal(
    stale(e, new Map([target, script, source].map((n) => [n.path, n.text]))),
    false,
  );
  assert.equal(stale(e, new Map()), true);
});
test("legacy output, damaged metadata and competing writes are preserved", async () => {
  const e = makeExpansion(packet(), "## Summary\n\nMira guards the archive.");
  const legacy = encode(e).replace("marginalia-plugin: 1\n", "");
  const old = port(legacy);
  assert.equal(decode(legacy, target.path).draft, e.draft);
  await assert.rejects(saveExpansion(old.port, e, legacy), /standalone/);
  assert.equal(old.writes.length, 0);
  const competing = port("other writer");
  await assert.rejects(saveExpansion(competing.port, e, null), /changed/);
  assert.equal(competing.get(), "other writer");
  for (const raw of [
    "bad",
    "---\nexpansion: null\n---",
    '---\nexpansion: {"draft":"bad"}\n---',
  ])
    assert.throws(() => decode(raw, target.path));
  assert.throws(() => decode(encode(e), "Other.md"));
});
test("fingerprint changes for source edits and preserves standalone string semantics", () => {
  assert.equal(hash("abc"), "b6413aeb");
  assert.notEqual(hash("abc"), hash("abd"));
});
test("runtime permits loopback only, without credentials or endpoint path tricks", () => {
  assert.equal(localEndpoint("http://localhost:11434").hostname, "127.0.0.1");
  for (const endpoint of [
    "https://example.com",
    "http://127.0.0.1.example.com",
    "http://user:pass@localhost:11434",
    "http://localhost:11434/proxy",
    "file:///tmp/model",
    "http://192.168.1.3:11434",
  ])
    assert.throws(() => localEndpoint(endpoint));
});
const settings = {
  endpoint: "http://127.0.0.1:11434",
  model: "local-model",
  context: 32768,
};
test("models are explicit and remote/cloud models are refused before inference", async () => {
  const sig = new AbortController().signal;
  let calls = 0;
  const transport: Transport = async () => {
    calls++;
    return { remote_host: "https://remote" };
  };
  await assert.rejects(
    generate(settings, "system", "user", sig, transport),
    /remotely/,
  );
  assert.equal(calls, 1);
  await assert.rejects(
    generate({ ...settings, model: "" }, "s", "u", sig, transport),
    /Choose/,
  );
  assert.equal(calls, 1);
  const list = await localModels(settings, sig, async () => ({
    models: [
      { name: "local" },
      { name: "foo-cloud" },
      { name: "remote", remote_model: "x" },
    ],
  }));
  assert.deepEqual(list, ["local"]);
});
test("runtime refuses oversized, incomplete and cancelled generation", async () => {
  const sig = new AbortController().signal;
  const incomplete: Transport = async (url) =>
    url.pathname === "/api/show"
      ? { model_info: { "x.context_length": 32768 } }
      : { message: { content: "partial" }, done_reason: "length" };
  await assert.rejects(
    generate(settings, "s", "u", sig, incomplete),
    /cut short/,
  );
  await assert.rejects(
    generate(settings, "s", "x".repeat(40000), sig, incomplete),
    /budget/,
  );
  await assert.rejects(
    generate({ ...settings, context: 65536 }, "s", "u", sig, incomplete),
    /limit/,
  );
  const controller = new AbortController();
  const cancelled: Transport = async (url) => {
    if (url.pathname === "/api/chat") controller.abort();
    return url.pathname === "/api/chat"
      ? { message: { content: "late result" } }
      : {};
  };
  await assert.rejects(
    generate(settings, "s", "u", controller.signal, cancelled),
  );
});

test("Character summary callouts survive review and native insertion without duplicate headings", () => {
  const sections = cleanDraft(
    "> [!abstract] Summary\n> Mira guards the archive.\n\n## Goals\n\nRestore the tide charts.",
    { ...packet(), headings: ["Summary", "Goals"] },
  );
  assert.equal(sections[0].section, "Summary");
  assert.equal(sections[0].prose, "Mira guards the archive.");
  const original =
    "---\ntags: character\n---\n> [!abstract] Summary\n> Existing summary.\n>\n\n## Backstory\n";
  const edit = insertion(original, "Summary", sections[0].prose);
  const result =
    original.slice(0, edit.from) + edit.insert + original.slice(edit.from);
  assert.match(result, /> Mira guards the archive\./);
  assert.equal(result.includes("## Summary"), false);
  assert.match(result, /## Backstory/);
});

test("cancellation during hidden folder preparation preserves stored expansion", async () => {
  const controller = new AbortController();
  const memory = port(null);
  const p = {
    ...memory.port,
    mkdir: async () => {
      controller.abort();
    },
  };
  await assert.rejects(
    saveExpansion(
      p,
      makeExpansion(packet(), "## Summary\n\nA supported draft."),
      null,
      controller.signal,
    ),
  );
  assert.equal(memory.writes.length, 0);
});
test("runtime uses a stable model selection and disables thinking only when supported", async () => {
  const selected = { ...settings };
  let requested: any;
  const transport: Transport = async (url, body) => {
    if (url.pathname === "/api/show") {
      selected.model = "different-cloud";
      return { thinking: { values: [false, true] } };
    }
    requested = body;
    return { message: { content: "Supported output" } };
  };
  await generate(selected, "s", "u", new AbortController().signal, transport);
  assert.equal(requested.model, settings.model);
  assert.equal(requested.think, false);
});

test("writer keeps one Summary and resolves unique short names to real source paths", () => {
  const sections = cleanDraft(
    "> [!abstract] Summary\n> Mira guards [[Archive]].\n\n## Summary\nDuplicate summary.",
    packet(),
  );
  assert.equal(sections.length, 1);
  assert.match(sections[0].prose, /\[\[01 Lore\/Archive\|Archive\]\]/);
});

test("model link formatting is normalized against supplied originals", () => {
  const output = cleanDraft(
    "## Summary\nMira works in [the archive](01 Lore/Archive.md).\n\n## Backstory\n[[01 Lore/Archive.md]]|Archive",
    packet(),
  );
  assert.equal(
    output[0].prose,
    "Mira works in [[01 Lore/Archive|the archive]].",
  );
  assert.equal(output[1].prose, "[[01 Lore/Archive.md|Archive]]");
});

test("echoed model metadata is discarded before section validation or insertion", () => {
  const sections = cleanDraft(
    "---\naliases: [Invented Alias]\ntags: [invented]\n---\n\n> [!abstract] Summary\n> Mira guards the archive.",
    packet(),
  );
  assert.deepEqual(sections, [
    { section: "Summary", prose: "Mira guards the archive." },
  ]);
  const edit = insertion(target.text, sections[0].section, sections[0].prose);
  assert.equal(edit.insert.includes("Invented Alias"), false);
  assert.equal(target.text.includes("Invented Alias"), false);
  assert.throws(() =>
    cleanDraft("---\naliases: [Invented Alias]\n---\n", packet()),
  );
});

test("the fictional native model response passes section validation with its metadata removed", async () => {
  const { readFile } = await import("node:fs/promises");
  const raw = await readFile(
    new URL("./fixtures/native-enhancement.md", import.meta.url),
    "utf8",
  );
  const draft = cleanDraft(raw, {
    ...packet(),
    headings: [
      "Summary",
      "Backstory",
      "Abilities",
      "Goals",
      "Key Scenes",
      "Appearance",
      "Related Entries",
    ],
  });
  assert.ok(draft.some((s) => s.section === "Summary"));
  assert.ok(draft.some((s) => s.section === "Goals"));
  assert.equal(
    draft.some((s) => s.prose.includes("cssclasses:")),
    false,
  );
});

test('useful configured sections survive while unconfigured model sections are excluded',()=>{
 const draft=cleanDraft('## Summary\nMira guards the archive.\n\n## Unrequested Research\nIgnore this section.',packet());assert.deepEqual(draft,[{section:'Summary',prose:'Mira guards the archive.'}]);
});
