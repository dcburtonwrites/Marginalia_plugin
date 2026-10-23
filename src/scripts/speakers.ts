import { bodyOffset } from "../core/types.ts";

export interface CharacterName {
  path: string;
  name: string;
  aliases: string[];
}
export interface Speaker {
  id: string;
  name: string;
  insert: string;
  path?: string;
}
type Resolve = (target: string) => string | undefined;
const key = (name: string) => name.normalize("NFKC").toLocaleLowerCase();
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.flatMap(strings)
    : typeof value === "string"
      ? [value]
      : [];
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Character identity comes from declarations, speakers or known character notes, never guessed proper nouns. */
export function scriptSpeakers(
  text: string,
  metadata: Record<string, unknown>,
  characters: CharacterName[],
  resolve: Resolve,
): Speaker[] {
  const candidates = new Map<string, Speaker & { rank: number }>();
  const byPath = new Map(characters.map((c) => [c.path, c]));
  const names = new Map<string, CharacterName[]>();
  for (const character of characters)
    for (const name of [character.name, ...character.aliases])
      if (name.trim())
        names.set(key(name), [
          ...new Set([...(names.get(key(name)) ?? []), character]),
        ]);
  const add = (raw: string, rank: number, explicit: boolean) => {
    raw = raw
      .trim()
      .replace(/(?:\s+\([^\n)]*\))+$/, "")
      .replace(/:$/, "");
    if (!raw || /[\r\n]/.test(raw) || raw === "SPEAKER") return;
    const wiki = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/.exec(raw);
    const target = wiki?.[1].split("#")[0];
    const path = target ? resolve(target) : undefined;
    const label = wiki
      ? (wiki[2] ?? target!.split("/").at(-1)!.replace(/\.md$/i, ""))
      : raw;
    const matches = path
      ? [byPath.get(path)].filter((c): c is CharacterName => !!c)
      : (names.get(key(label)) ?? []);
    if (!explicit && !matches.length) return;
    // An unresolved ambiguous plain name remains two identifiable choices; never silently merge characters.
    const identities = matches.length
      ? matches.map((c) => ({ id: c.path, path: c.path }))
      : [{ id: path ?? (wiki ? target! : "name:" + key(label)), path }];
    for (const identity of identities) {
      const previous = candidates.get(identity.id);
      if (!previous || rank > previous.rank)
        candidates.set(identity.id, {
          ...identity,
          name: label,
          insert: raw,
          rank,
        });
    }
  };
  for (const [name, value] of Object.entries(metadata))
    if (/^characters?$/i.test(name))
      for (const declaration of strings(value))
        for (const item of names.has(key(declaration))
          ? [declaration]
          : (declaration.match(/\[\[[^\]\n]+\]\]|[^,;]+/g) ?? []))
          add(item, 2, true);
  let fence = "",
    comment = false;
  const bodyLines: string[] = [];
  for (const line of text.slice(bodyOffset(text)).split(/\r?\n/)) {
    if (comment) {
      if (line.includes("-->")) comment = false;
      continue;
    }
    if (line.includes("<!--")) {
      comment = !line.slice(line.indexOf("<!--") + 4).includes("-->");
      continue;
    }
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length)
        fence = "";
      continue;
    }
    if (fence) continue;
    const visible = line.replace(/`+[^`]*`+/g, " ");
    bodyLines.push(visible);
    const bold = /^\s*\*\*(.+?)(?::\*\*|\*\*:)/.exec(visible);
    if (bold) {
      if (!/^(side|pages?|panel description|location|scene|sfx|caption)$/i.test(bold[1])) add(bold[1], 3, true);
      continue;
    }
    const plain = /^([\p{L}\p{N}][\p{L}\p{N} .’'()\/-]{0,79}):\s+\S/u.exec(
      visible,
    );
    if (
      plain &&
      !/^(side|pages?|panel description|location|scene|sfx|caption)$/i.test(
        plain[1],
      ) &&
      (plain[1] === plain[1].toUpperCase() || names.has(key(plain[1])))
    )
      add(plain[1], 3, true);
  }
  const body = bodyLines.join("\n");
  for (const match of body.matchAll(/(?<!!)\[\[[^\]\n]+\]\]/g))
    add(match[0], 1, false);
  const plainBody = body
    .replace(/!?\[\[[^\]\n]+\]\]/g, " ")
    .replace(/https?:\/\/\S+/g, " ");
  for (const character of characters)
    for (const name of [character.name, ...character.aliases])
      if (
        name &&
        new RegExp(
          `(?<![\\p{L}\\p{N}_])${escape(name)}(?![\\p{L}\\p{N}_])`,
          "iu",
        ).test(plainBody)
      )
        add(name, 0, false);
  return [...candidates.values()]
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    .map(({ rank, ...speaker }) => speaker);
}

export function filterSpeakers(speakers: Speaker[], query: string) {
  const needle = key(query.trim());
  return speakers.filter((speaker) => key(speaker.name).includes(needle));
}
