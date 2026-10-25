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
    ...(packet.freshness ? {freshness:packet.freshness} : {}),
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
  const line = /^expansion: (.+)\r?$/m.exec(envelope(raw));
  let e: Expansion;
  try {
    e = JSON.parse(line?.[1] ?? "null");
  } catch {
    throw new Error("Saved expansion metadata is damaged. File preserved.");
  }
  if (
    !e ||
    e.entry !== entry ||
    (e.freshness !== undefined && (!e.freshness || typeof e.freshness.inventory !== "string" || typeof e.freshness.configuration !== "string")) ||
    typeof e.original !== "string" ||
    typeof e.draft !== "string" ||
    !e.draft.trim() ||
    e.draft.length > 60000 ||
    !Number.isFinite(Date.parse(e.generatedAt)) ||
    typeof e.version !== "string" || typeof e.writingVersion !== "string" ||
    !Number.isInteger(e.omitted) || e.omitted < 0 ||
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
  if (previous !== null && !pluginOwned(previous))
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
  if(previous !== null){
    const backup=recoveryPath(e.entry);
    const existingBackup=await port.read(backup);
    if(existingBackup!==null && !pluginOwned(existingBackup))throw new Error("An unowned recovery file already exists. Both files are preserved.");
    await port.mkdir(backup.slice(0,backup.lastIndexOf("/")));
    await port.write(backup,previous);
    if(await port.read(backup)!==previous)throw new Error("Recovery copy could not be verified. Previous expansion preserved.");
    if(await port.read(path)!==previous)throw new Error("Expansion changed while preparing recovery. Newer file preserved.");
  }
  signal?.throwIfAborted();
  const encoded=encode(e);
  await port.write(path, encoded);
  if(await port.read(path)!==encoded)throw new Error("Saved expansion could not be verified. Check Library; the previous version is available when a recovery copy exists.");
}
export function stale(e: Expansion, current: Map<string, string>): boolean {
  return e.sources.some(
    (s) => !current.has(s.path) || hash(current.get(s.path)!) !== s.hash,
  );
}


function envelope(raw:string):string {
  return /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw)?.[1] ?? "";
}
export const pluginOwned=(raw:string)=>/^marginalia-plugin: 1\r?$/m.test(envelope(raw));
export const recoveryPath=(entry:string)=>".marginalia/recovery/"+safeEntry(entry);
export interface SavedEntry {entry:string;generatedAt:string;status?:string;}
export function inspectExpansion(raw:string,entry:string):{item:SavedEntry;expansion?:Expansion;body:string;owned:boolean} {
  safeEntry(entry);
  const owned=pluginOwned(raw);
  try {
    const expansion=decode(raw,entry);
    return {item:{entry,generatedAt:expansion.generatedAt,status:owned?undefined:"Standalone app · read only"},expansion,body:expansion.draft,owned};
  }catch{
    const meta=envelope(raw);
    const legacy=!owned && /^generated: true\r?$/m.test(meta);
    const body=raw.slice(raw.indexOf(meta)+meta.length).replace(/^\r?\n---(?:\r?\n)?/,"").trim();
    return {item:{entry,generatedAt:"",status:legacy?"Legacy format · read only":"Damaged or unsupported · preserved"},body:legacy?body.slice(0,60000):"",owned};
  }
}

export async function restoreExpansion(port:HiddenPort,entry:string,previous:string|null):Promise<void> {
  const backup=await port.read(recoveryPath(entry));
  if(!backup || !pluginOwned(backup))throw new Error("No supported plugin recovery copy is available.");
  const restored=decode(backup,entry);
  // saveExpansion checks ownership/concurrent edits and retains the replaced version for Undo-like recovery.
  await saveExpansion(port,restored,previous);
}
