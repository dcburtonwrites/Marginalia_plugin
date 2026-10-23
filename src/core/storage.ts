import {
  expansionPath,
  hash,
  safeEntry,
  type Expansion,
  type Packet,
} from "./types.ts";
export interface HiddenPort {
  read(path: string): Promise<string | null>;
  write(path: string, text: string): Promise<void>;
  mkdir(path: string): Promise<void>;
}
export function makeExpansion(packet: Packet, draft: string): Expansion {
  return {
    entry: packet.target.path,
    original: packet.target.text,
    generatedAt: new Date().toISOString(),
    draft,
    sources: packet.stamps,
    material: packet.sources.map((unit) => ({ unit, statements: [] })),
    omitted: packet.omitted,
    version: "obsidian-0.1.0",
    writingVersion: "original-passages-plugin-1",
  };
}
export function encode(expansion: Expansion): string {
  const meta = {
    generated: true,
    source: expansion.entry,
    "generated-at": expansion.generatedAt,
    sources: expansion.sources,
    expansion,
    "marginalia-plugin": 1,
  };
  return (
    "---\n" +
    Object.entries(meta)
      .map(([k, v]) => k + ": " + JSON.stringify(v))
      .join("\n") +
    "\n---\n\n" +
    expansion.draft +
    "\n\n## Sources consulted · not sentence verification\n\n" +
    expansion.sources.map((s) => `- [[${s.path}]]`).join("\n") +
    "\n"
  );
}
export function decode(raw: string, entry: string): Expansion {
  safeEntry(entry);
  const line = /^expansion: (.+)\r?$/m.exec(raw);
  let e: Expansion;
  try {
    e = JSON.parse(line?.[1] ?? "null");
  } catch {
    throw new Error("Saved expansion metadata is damaged. File preserved.");
  }
  if (
    !e ||
    e.entry !== entry ||
    typeof e.original !== "string" ||
    typeof e.draft !== "string" ||
    !e.draft.trim() ||
    e.draft.length > 60000 ||
    !Number.isFinite(Date.parse(e.generatedAt)) ||
    !Array.isArray(e.sources) ||
    !Array.isArray(e.material) ||
    e.sources.some(
      (s) =>
        !s ||
        typeof s.path !== "string" ||
        !Number.isFinite(s.mtime) ||
        typeof s.hash !== "string",
    ) ||
    e.material.some(
      (m) =>
        !m?.unit ||
        typeof m.unit.excerpt !== "string" ||
        typeof m.unit.notePath !== "string" ||
        !e.sources.some((s) => s.path === m.unit.notePath),
    )
  )
    throw new Error("Unsupported or damaged saved expansion. File preserved.");
  return e;
}
export async function saveExpansion(
  port: HiddenPort,
  e: Expansion,
  previous: string | null,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  const path = expansionPath(e.entry);
  if (previous !== null && !/^marginalia-plugin: 1\r?$/m.test(previous))
    throw new Error(
      "This expansion belongs to the standalone app. It can be read, but migration is required before replacement.",
    );
  const parent = path.slice(0, path.lastIndexOf("/"));
  await port.mkdir(parent);
  if ((await port.read(path)) !== previous)
    throw new Error(
      "Expansion changed during generation. Previous file preserved.",
    );
  signal?.throwIfAborted();
  await port.write(path, encode(e));
}
export function stale(e: Expansion, current: Map<string, string>): boolean {
  return e.sources.some(
    (s) => !current.has(s.path) || hash(current.get(s.path)!) !== s.hash,
  );
}
