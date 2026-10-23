/** Optional real-runtime smoke test. Uses fictional fixtures only, never an Obsidian vault. */
import { readFile, writeFile } from "node:fs/promises";
import { retrieve } from "../src/core/retrieval.ts";
import { prompt, cleanDraft, librarianSystem } from "../src/core/writing.ts";
import { generate } from "../src/ollama.ts";
import type { Note } from "../src/core/types.ts";
const target: Note = {
  path: "02 Character/Mira Vale.md",
  text: "## Summary\n\n## Backstory\n\n## Goals\n",
  mtime: 1,
  aliases: ["The Keeper"],
  links: [],
  metadata: { tags: ["character"] },
};
const source: Note = {
  path: "01 Lore/Eastern Archive.md",
  text: "Mira Vale is the keeper of the archive beneath the eastern observatory. Each morning she checks its copper locks before visitors arrive. Mira wants to restore the damaged tide charts. The archive record does not describe her childhood.",
  mtime: 1,
  aliases: [],
  links: [target.path],
  metadata: {},
};
const settings = {
  endpoint: "http://127.0.0.1:11434",
  model: process.env.MARGINALIA_MODEL ?? "gemma4:12b-mlx",
  context: 32768,
};
const packet = retrieve([target, source], target, 12000);
packet.headings = [
  "Summary",
  "Backstory",
  "Personality",
  "Relationships",
  "Abilities",
  "Goals",
  "Key Scenes",
  "Appearance",
  "Related Entries",
];
const system =
  librarianSystem +
  "\n" +
  (await readFile("src/prompts/character-writer.md", "utf8"));
const outputs = [];
for (const mode of ["enhancement", "expansion"] as const) {
  const started = Date.now();
  const raw = await generate(
    settings,
    system,
    prompt(packet, mode),
    AbortSignal.timeout(180000),
  );
  await writeFile(".preview/local-ai-" + mode + "-raw.md", raw);
  const sections = cleanDraft(raw, packet);
  outputs.push({
    mode,
    elapsedSeconds: (Date.now() - started) / 1000,
    sections,
  });
  console.log(
    mode +
      ": " +
      sections.length +
      " valid sections in " +
      ((Date.now() - started) / 1000).toFixed(1) +
      " seconds.",
  );
}
await writeFile(
  ".preview/local-ai-result.json",
  JSON.stringify({ model: settings.model, synthetic: true, outputs }, null, 2),
);
