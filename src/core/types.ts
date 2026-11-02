import type {LibrarianTimeline} from "../timeline/librarian.ts";
export interface Note {
  tags?:string[];
  path: string;
  text: string;
  mtime: number;
  aliases: string[];
  links: string[];
  metadata: Record<string, unknown>;
}
export interface Source {
  id: string;
  notePath: string;
  excerpt: string;
  offset: number;
  page?: number;
  owner: string;
  role: string;
}
export interface Stamp {
  path: string;
  mtime: number;
  hash: string;
}
export interface Freshness { inventory:string; configuration:string; }
export interface Packet {
  timeline?:LibrarianTimeline;
  freshness?: Freshness;
  entryType?: string;
  target: Note;
  sources: Source[];
  stamps: Stamp[];
  omitted: number;
  excluded: number;
  headings: string[];
  guidance: string;
}
export interface Suggestion {
  warnings?: string[];
  id: string;
  entry: string;
  section: string;
  prose: string;
  packet: Packet;
  state: "pending" | "inserted" | "dismissed";
}
export interface Expansion {
  freshness?: Freshness;
  entry: string;
  original: string;
  generatedAt: string;
  draft: string;
  sources: Stamp[];
  material: { unit: Source; statements: [] }[];
  omitted: number;
  version: string;
  writingVersion: string;
}
export function hash(value: string): string {
  let result = 2166136261;
  // Same string canonicalization and FNV fingerprint as the standalone app.
  for (const char of JSON.stringify(value)) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, "0");
}
export const title = (path: string) =>
  path.split("/").at(-1)!.replace(/\.md$/i, "");
export function bodyOffset(text: string): number {
  return (
    /^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(text)?.[0].length ??
    0
  );
}
export function safeEntry(path: string): string {
  if (
    !path.endsWith(".md") ||
    path.includes("\\") ||
    path.split("/").some((p) => !p || p.startsWith(".") || /[:\p{Cc}]/u.test(p))
  )
    throw new Error("Invalid entry path.");
  return path;
}
export const expansionPath = (entry: string) =>
  ".marginalia/expanded/" + safeEntry(entry);
export function permitted(path: string): boolean {
  return (
    !path
      .split("/")
      .some(
        (p) =>
          p.startsWith(".") ||
          /^(?:archive|archives|outputs|lookbooks|_templates|templates)$/i.test(
            p,
          ),
      ) &&
    !/^(?:AGENTS|SKILL|AI Agent Instructions)\.md$/i.test(
      path.split("/").at(-1)!,
    )
  );
}
