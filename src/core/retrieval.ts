import {
  bodyOffset,
  hash,
  permitted,
  title,
  type Note,
  type Packet,
  type Source,
} from "./types.ts";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const names = (note: Note) => [
  ...new Set([
    title(note.path),
    ...note.aliases,
    ...["title", "name"].flatMap((k) =>
      typeof note.metadata[k] === "string" ? [note.metadata[k] as string] : [],
    ),
  ]),
];
const matches = (text: string, name: string) =>
  new RegExp(
    "(?<![\\p{L}\\p{N}])" + escape(name) + "(?![\\p{L}\\p{N}])",
    "iu",
  ).test(text);
const provisional = (n: Note) =>
  /(?:brainstorms?|research|references|ramblings?|rough|drafting)/i.test(
    n.path,
  ) ||
  /draft|brainstorm|research|provisional/i.test(
    String(n.metadata.status ?? ""),
  ) ||
  n.metadata.generated === true;
const script = (n: Note) =>
  /script/i.test(JSON.stringify(n.metadata.tags ?? "")) ||
  /^#{1,3}\s+Page\b/im.test(n.text);
const project = (path: string) => /^(08 Projects\/[^/]+)\//i.exec(path)?.[1];

export function passages(note: Note): Omit<Source, "id">[] {
  const offset = bodyOffset(note.text),
    body = note.text.slice(offset);
  const boundaries = [
    ...new Set([
      0,
      ...[...body.matchAll(/\r?\n\s*\r?\n|(?=^#{1,6}\s)/gm)].map(
        (m) => m.index! + m[0].length,
      ),
      body.length,
    ]),
  ].sort((a, b) => a - b);
  let heading = "",
    page: number | undefined;
  const out: Omit<Source, "id">[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i],
      text = body.slice(start, boundaries[i + 1]);
    const h = /^#{1,6}\s+(.+)$/m.exec(text);
    if (h) heading = h[1];
    const p = /^#{1,3}\s+Page\s+(\d+)/im.exec(text);
    if (p) page = Number(p[1]);
    if (
      /research|references|questions|possibilities|inspiration/i.test(
        heading,
      ) ||
      /~~/.test(text) ||
      !text
        .replace(/^#{1,6}.*$/gm, "")
        .replace(/^\s*[>*-]?\s*$/gm, "")
        .trim()
    )
      continue;
    // Keep original offsets and complete short paragraphs. Large units remain original slices.
    for (let pos = 0; pos < text.length; pos += 2400)
      out.push({
        notePath: note.path,
        excerpt: text.slice(pos, pos + 2400),
        offset: offset + start + pos,
        ...(page === undefined ? {} : { page }),
        owner: title(note.path),
        role: script(note)
          ? "Script scene; preserve speaker and narrative frame"
          : String(note.metadata.type ?? "Source note"),
      });
  }
  return out;
}

/** Same evidence boundary for retrieval and optional structured context. */
export function evidenceNotes(notes:Note[],target:Note,scope:(note:Note)=>string|undefined):Note[]{
  const targetScope=scope(target);
  return notes.filter(note=>permitted(note.path)&&(!targetScope||!scope(note)||scope(note)===targetScope)&&(note.path===target.path||!provisional(note)));
}
export function retrieve(
  notes: Note[],
  target: Note,
  budget = 18000,
  explicit: string[] = [],
  guidance = "",
  scope: (note:Note)=>string|undefined = note=>project(note.path),
  metadataReferences:string[] = [],
): Packet {
  const targetScope=scope(target);
  const eligible=notes.filter(n=>permitted(n.path));
  const allowed = eligible.filter(n=>!targetScope||!scope(n)||scope(n)===targetScope);
  const ownNames = names(target).filter((s) => s.trim().length > 1);
  const others = allowed.filter((n) => n.path !== target.path);
  const ambiguous = ownNames.filter((name) =>
    others.some((n) =>
      names(n).some(
        (other) => other.toLocaleLowerCase() === name.toLocaleLowerCase(),
      ),
    ),
  );
  if (ambiguous.length)
    throw new Error(
      "Ambiguous identity: " +
        ambiguous.join(", ") +
        ". Use a unique title or alias before gathering evidence.",
    );
  const longerNames = others
    .flatMap(names)
    .filter((n) =>
      ownNames.some(
        (s) => n.length > s.length && n.toLowerCase().includes(s.toLowerCase()),
      ),
    )
    .sort((a, b) => b.length - a.length);
  const mentioned = (text: string) => {
    for (const other of longerNames)
      text = text.replace(
        new RegExp(
          "(?<![\\p{L}\\p{N}])" + escape(other) + "(?![\\p{L}\\p{N}])",
          "giu",
        ),
        "OTHER_SUBJECT",
      );
    return ownNames.some((name) => matches(text, name));
  };
  const connected = allowed.filter(
    (n) =>
      n.path === target.path ||
      explicit.includes(n.path) ||
      metadataReferences.includes(n.path) ||
      target.links.includes(n.path) ||
      n.links.includes(target.path) ||
      mentioned(n.text),
  );
  const supporting = connected
    .filter((n) => !provisional(n))
    .flatMap((n) => n.links)
    .map((path) => allowed.find((n) => n.path === path))
    .filter((n): n is Note => !!n && !script(n) && !provisional(n));
  const candidates = [
    ...new Map(
      [target, ...connected, ...supporting].map((n) => [n.path, n]),
    ).values(),
  ];
  let excluded = eligible.length-allowed.length;
  const groups: Omit<Source, "id">[][] = [];
  for (const n of candidates) {
    if (
      n.path !== target.path &&
      provisional(n)
    ) {
      excluded++;
      continue;
    }
    let units = metadataReferences.includes(n.path)&&n.path!==target.path&&!explicit.includes(n.path)?[]:passages(n);
    if (n.path !== target.path && !explicit.includes(n.path) && (script(n) || scope(n))) {
      const hits = new Set(
        units.flatMap((u, i) => (mentioned(u.excerpt) ? [i] : [])),
      );
      units = units.filter(
        (u, i) =>
          hits.has(i) ||
          [i - 1, i + 1].some((j) => hits.has(j) && units[j]?.page === u.page),
      );
    }
    const metadata = n.text.slice(0, bodyOffset(n.text));
    if (metadata.trim())
      units.unshift({
        notePath: n.path,
        excerpt: metadata,
        offset: 0,
        owner: title(n.path),
        role: "Declared metadata belongs to this source owner; blank fields are not facts",
      });
    groups.push(units);
  }
  // Include one original body passage per source before long notes consume the budget.
  const queue = [
    ...groups.flatMap(
      (g) => g.find((u) => u.offset > 0 || !u.excerpt.startsWith("---")) ?? [],
    ),
    ...groups.flat(),
  ];
  const considered = new Set<object>(),
    selected = new Set<object>();
  let used = 0,
    omitted = 0;
  for (const unit of queue) {
    if (considered.has(unit)) continue;
    considered.add(unit);
    const cost = new TextEncoder().encode(JSON.stringify(unit)).length + 120;
    if (used + cost > budget) {
      omitted++;
      continue;
    }
    used += cost;
    selected.add(unit);
  }
  const sources = groups
    .flat()
    .filter((u) => selected.has(u))
    .map((u, i) => ({ ...u, id: "S" + (i + 1) }));
  if (!sources.some((s) => s.role.indexOf("Declared metadata") !== 0))
    throw new Error(
      "No relevant original passages fit. Add linked material or increase context.",
    );
  const paths = new Set([target.path, ...sources.map((s) => s.notePath)]);
  const stamps = candidates
    .filter((n) => paths.has(n.path))
    .map((n) => ({ path: n.path, mtime: n.mtime, hash: hash(n.text) }));
  const headings = [
    ...new Set(
      [
        ...target.text.slice(bodyOffset(target.text)).matchAll(/^##\s+(.+)$/gm),
      ].map((m) => m[1].trim()),
    ),
  ];
  return {
    target,
    sources,
    stamps,
    omitted,
    excluded,
    headings: headings.length ? headings : ["Summary", "Related Entries"],
    guidance,
  };
}
