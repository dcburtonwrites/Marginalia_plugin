/** A file stays a file; page/panel ranges are views over its unchanged source. */
export interface ScriptInput {
  path: string;
  text: string;
  metadata: Record<string, unknown>;
}
export interface Panel {
  title: string;
  line: number;
  from: number;
  to: number;
}
export type Side = "Left" | "Right" | "Double Spread";
export function followingSide(previous?: Side): "Left" | "Right" {
  // A spread ends on its right-hand leaf; the next page is left.
  return previous === "Right" || previous === "Double Spread"
    ? "Left"
    : "Right";
}
export interface Page {
  title: string;
  line: number;
  from: number;
  to: number;
  local: number;
  slots: number;
  side: Side;
  panels: Panel[];
}
export interface Script extends ScriptInput {
  scope: string;
  group: string;
  declared?: number;
  slots: number;
  pages: Page[];
}
export function scriptScope(
  path: string,
  metadata: Record<string, unknown>,
): string | null {
  if (
    path
      .split("/")
      .some((p) => p.startsWith(".") || /^(_?templates?|archive)$/i.test(p))
  )
    return null;
  const marker = path.indexOf("/Scripts/");
  const legacy = marker >= 0 || path.startsWith("Scripts/");
  if (metadata.role !== undefined || metadata.format !== undefined) {
    if (
      metadata.role !== "manuscript" ||
      !["script", "comic-script"].includes(String(metadata.format))
    )
      return null;
  } else if (!legacy) return null;
  return marker >= 0
    ? path.slice(0, marker)
    : legacy
      ? "Vault"
      : path.slice(0, path.lastIndexOf("/")) || "Vault";
}
export function sourceLines(text: string) {
  let offset = 0;
  return text.split(/(?<=\n)/).map((raw) => {
    const line = { raw, text: raw.replace(/\r?\n$/, ""), from: offset };
    offset += raw.length;
    return line;
  });
}
export function parseScript(input: ScriptInput): Script | null {
  const scope = scriptScope(input.path, input.metadata);
  if (scope === null) return null;
  const rawDeclared = input.metadata.Pages;
  const count = Number(rawDeclared);
  const declared =
    rawDeclared !== undefined &&
    rawDeclared !== null &&
    String(rawDeclared).trim() !== "" &&
    Number.isInteger(count) &&
    count >= 0
      ? count
      : undefined;
  const pages: Page[] = [];
  let fence = "",
    frontmatter = false,
    comment = false;
  const lines = sourceLines(input.text);
  for (let i = 0; i < lines.length; i++) {
    const { text, from } = lines[i];
    if (i === 0 && text.replace(/^\uFEFF/, "") === "---") {
      frontmatter = true;
      continue;
    }
    if (frontmatter) {
      if (/^(---|\.\.\.)\s*$/.test(text)) frontmatter = false;
      continue;
    }
    if (comment) {
      if (text.includes("-->")) comment = false;
      continue;
    }
    if (text.trimStart().startsWith("<!--")) {
      comment = !text.includes("-->");
      continue;
    }
    const f = text.match(/^ {0,3}(`{3,}|~{3,})/);
    if (f) {
      if (!fence) fence = f[1];
      else if (
        f[1][0] === fence[0] &&
        f[1].length >= fence.length &&
        /^ {0,3}(?:`+|~+)\s*$/.test(text)
      )
        fence = "";
      continue;
    }
    if (fence) continue;
    if (/^##\s+Page(?:\s|$)/i.test(text)) {
      const previous = pages.at(-1);
      if (previous) {
        previous.to = from;
        const panel = previous.panels.at(-1);
        if (panel) panel.to = from;
      }
      let side: Side = followingSide(previous?.side);
      if (
        !previous &&
        ["Left", "Right", "Double Spread"].includes(String(input.metadata.Side))
      )
        side = input.metadata.Side as Side;
      if (/\bDouble Spread\b/i.test(text)) side = "Double Spread";
      let next = i + 1;
      while (next < lines.length && !lines[next].text.trim()) next++;
      const explicit = lines[next]?.text.match(
        /^Side:\s*(Left|Right|Double Spread)\s*$/,
      );
      if (explicit) side = explicit[1] as Side;
      pages.push({
        title: text.replace(/^##\s+/, ""),
        line: i,
        from,
        to: input.text.length,
        local: previous ? previous.local + previous.slots : 1,
        side,
        slots: side === "Double Spread" ? 2 : 1,
        panels: [],
      });
    } else {
      const panel = text.match(/^>\s*\[!panel\][+-]?(?:\s+(.*))?$/i);
      const page = pages.at(-1);
      if (panel && page) {
        const previous = page.panels.at(-1);
        if (previous) previous.to = from;
        page.panels.push({
          title: panel[1]?.trim() || "Panel",
          line: i,
          from,
          to: input.text.length,
        });
      }
    }
  }
  return {
    ...input,
    scope,
    group: String(input.metadata.Group ?? "Top-level"),
    declared,
    slots: pages.reduce((n, p) => n + p.slots, 0),
    pages,
  };
}
export interface ScriptGroup {
  scope: string;
  group: string;
  scripts: Script[];
  sequences: Script[][];
  issues: { path: string; message: string }[];
  starts: Map<string, number>;
}
export type Resolve = (link: string, source: string) => string | undefined;
export function organize(
  scripts: Script[],
  resolve: Resolve,
  fields: string[] = ["Preceded By", "Followed By"],
): ScriptGroup[] {
  const groups = new Map<string, ScriptGroup>();
  for (const s of scripts) {
    const key = JSON.stringify([s.scope, s.group]);
    if (!groups.has(key))
      groups.set(key, {
        scope: s.scope,
        group: s.group,
        scripts: [],
        sequences: [],
        issues: [],
        starts: new Map(),
      });
    groups.get(key)!.scripts.push(s);
  }
  for (const group of groups.values()) {
    const byPath = new Map(group.scripts.map((s) => [s.path, s]));
    const next = new Map<string, Set<string>>(),
      prev = new Map<string, Set<string>>(),
      blocked = new Set<string>();
    const issue = (path: string, message: string) => {
      blocked.add(path);
      group.issues.push({ path, message });
    };
    const edge = (a: string, b: string) => {
      if (!next.has(a)) next.set(a, new Set());
      next.get(a)!.add(b);
      if (!prev.has(b)) prev.set(b, new Set());
      prev.get(b)!.add(a);
    };
    for (const s of group.scripts)
      for (const field of fields) {
        const value = s.metadata[field];
        if (value === undefined || value === null || value === "") continue;
        if (typeof value !== "string") {
          issue(s.path, `${field} must name one script.`);
          continue;
        }
        const link = value
          .trim()
          .replace(/^\[\[|\]\]$/g, "")
          .split("|")[0]
          .split("#")[0]
          .trim();
        if (!link) continue;
        const target = resolve(link, s.path);
        if (!target || !byPath.has(target)) {
          issue(
            s.path,
            `${field}: missing script or a link outside this project/group (${link}).`,
          );
          continue;
        }
        field === "Preceded By" ? edge(target, s.path) : edge(s.path, target);
      }
    for (const s of group.scripts)
      if (
        (next.get(s.path)?.size ?? 0) > 1 ||
        (prev.get(s.path)?.size ?? 0) > 1
      )
        issue(
          s.path,
          "Conflicting order claims. Resolve the links to establish reading order.",
        );
    // Diagnose cycles before excluding an entire connected component from global numbering.
    const visited = new Set<string>();
    for (const s of group.scripts) {
      const walk = new Set<string>();
      let path: string | undefined = s.path;
      while (path && !visited.has(path)) {
        if (walk.has(path)) {
          issue(
            path,
            "Ordering cycle. Resolve the links to establish reading order.",
          );
          break;
        }
        walk.add(path);
        path = next.get(path)?.values().next().value;
      }
      for (const p of walk) visited.add(p);
    }
    const pending = [...blocked];
    for (let i = 0; i < pending.length; i++)
      for (const p of [
        ...(next.get(pending[i]) ?? []),
        ...(prev.get(pending[i]) ?? []),
      ])
        if (!blocked.has(p)) {
          blocked.add(p);
          pending.push(p);
        }
    for (const s of group.scripts) {
      if (blocked.has(s.path) || prev.get(s.path)?.size) continue;
      const sequence: Script[] = [];
      let current: Script | undefined = s,
        start: number | undefined = 1;
      while (current) {
        sequence.push(current);
        if (start !== undefined) group.starts.set(current.path, start);
        start =
          start !== undefined && current.declared !== undefined
            ? start + current.declared
            : undefined;
        const path: string | undefined = next
          .get(current.path)
          ?.values()
          .next().value;
        current = path ? byPath.get(path) : undefined;
      }
      group.sequences.push(sequence);
    }
    if (blocked.size)
      group.sequences.push(group.scripts.filter((s) => blocked.has(s.path)));
  }
  return [...groups.values()].sort(
    (a, b) => a.scope.localeCompare(b.scope) || a.group.localeCompare(b.group),
  );
}
export interface ScriptEdit {
  from: number;
  to: number;
  text: string;
  cursor: number;
}
export function insertBlock(
  script: Script,
  offset: number,
  kind: "page" | "panel",
): ScriptEdit {
  const eol = script.text.includes("\r\n") ? "\r\n" : "\n";
  let at: number, body: string;
  if (kind === "page") {
    at = script.text.length;
    const side = followingSide(script.pages.at(-1)?.side);
    body = `## Page ${script.slots + 1}${eol}${eol}Side: ${side}${eol}${eol}`;
  } else {
    const page =
      script.pages.find((p) => offset >= p.from && offset < p.to) ??
      (offset === script.text.length ? script.pages.at(-1) : undefined);
    if (!page)
      throw new Error(
        "Insert a page first, then place the cursor on that page.",
      );
    const panel = page.panels.find((p) => offset >= p.from && offset < p.to);
    at = panel?.to ?? page.to;
    body = `> [!panel]${eol}> Panel Description: ${eol}${eol}`;
  }
  const prefix =
    script.text.slice(0, at).endsWith(eol + eol) || at === 0
      ? ""
      : script.text.slice(0, at).endsWith(eol)
        ? eol
        : eol + eol;
  return {
    from: at,
    to: at,
    text: prefix + body,
    cursor:
      at +
      prefix.length +
      (kind === "panel"
        ? body.indexOf("Panel Description: ") + "Panel Description: ".length
        : body.length),
  };
}
export function movePanel(
  script: Script,
  offset: number,
  direction: -1 | 1,
): ScriptEdit {
  const contains = (p: { from: number; to: number }) =>
    offset >= p.from &&
    (offset < p.to || (offset === script.text.length && p.to === offset));
  const page = script.pages.find(contains);
  const index = page?.panels.findIndex(contains) ?? -1;
  if (!page || index < 0) throw new Error("Place the cursor inside a panel.");
  const other = page.panels[index + direction],
    own = page.panels[index];
  if (!other) throw new Error("This panel is already at the edge of its page.");
  const first = direction < 0 ? other : own,
    second = direction < 0 ? own : other;
  const a = script.text.slice(first.from, first.to),
    b = script.text.slice(second.from, second.to);
  const eol = script.text.includes("\r\n") ? "\r\n" : "\n";
  // A final block without a newline still needs a boundary when moved upward.
  const separator = b.endsWith("\n") ? "" : eol + eol;
  return {
    from: first.from,
    to: second.to,
    text: b + separator + a,
    cursor:
      first.from +
      (direction < 0 ? 0 : b.length + separator.length) +
      offset -
      own.from,
  };
}

export type ScriptOrders = Record<string, string[]>;
export const orderKey = (scope: string, group: string) =>
  JSON.stringify([scope, group]);
export function readOrders(value: unknown): ScriptOrders {
  const result: ScriptOrders = Object.create(null);
  if (!value || typeof value !== "object" || Array.isArray(value))
    return result;
  for (const [key, paths] of Object.entries(value)) {
    try {
      const pair = JSON.parse(key);
      if (
        !Array.isArray(pair) ||
        pair.length !== 2 ||
        !pair.every((v) => typeof v === "string")
      )
        continue;
    } catch {
      continue;
    }
    if (Array.isArray(paths) && paths.every((p) => typeof p === "string"))
      result[key] = [...new Set(paths)];
  }
  return result;
}
/** Predecessors are authoritative; saved order only breaks ties during migration. */
export function arrangedGroups(
  scripts: Script[],
  resolve: Resolve,
  orders: ScriptOrders,
): ScriptGroup[] {
  const buckets = new Map<string, Script[]>();
  for (const script of scripts) {
    const key = orderKey(script.scope, script.group);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(script);
  }
  const result: ScriptGroup[] = [];
  for (const [key, members] of buckets) {
    const saved = orders[key] ?? [];
    const rank = (s: Script) => {
      const n = saved.indexOf(s.path);
      return n < 0 ? Infinity : n;
    };
    const root = (s: Script) =>
      Object.hasOwn(s.metadata, "Preceded By") &&
      !String(s.metadata["Preceded By"] ?? "").trim();
    const sorted = [...members].sort(
      (a, b) =>
        Number(root(b)) - Number(root(a)) ||
        rank(a) - rank(b) ||
        a.path.localeCompare(b.path),
    );
    const hasPredecessors = members.some((s) =>
      Object.hasOwn(s.metadata, "Preceded By"),
    );
    const [group] = organize(
      sorted,
      resolve,
      hasPredecessors ? ["Preceded By"] : ["Followed By"],
    );
    if (sorted.filter(root).length > 1) {
      group.issues.push({
        path: sorted[0].path,
        message:
          "More than one script claims the start of this group. Drag scripts into the intended order.",
      });
      group.starts.clear();
    }
    if (!group.issues.length) {
      group.sequences = [group.sequences.flat()];
      group.starts.clear();
      let start: number | undefined = 1;
      for (const script of group.sequences[0]) {
        if (start !== undefined) group.starts.set(script.path, start);
        start =
          start !== undefined && script.declared !== undefined
            ? start + script.declared
            : undefined;
      }
    }
    result.push(group);
  }
  return result.sort(
    (a, b) => a.scope.localeCompare(b.scope) || a.group.localeCompare(b.group),
  );
}
export interface OrderWrite {
  path: string;
  expected: string;
  properties: Record<string, string>;
}
export function orderWrites(
  group: ScriptGroup,
  paths: string[],
  missingOnly = false,
): OrderWrite[] {
  const members = new Map(group.scripts.map((s) => [s.path, s]));
  if (
    paths.length !== members.size ||
    new Set(paths).size !== paths.length ||
    paths.some((p) => !members.has(p))
  )
    throw new Error(
      "Order must include every script in the same project and group exactly once.",
    );
  if (missingOnly && group.issues.length) return [];
  return paths.flatMap((path, i) => {
    const script = members.get(path)!;
    if (missingOnly && Object.hasOwn(script.metadata, "Preceded By")) return [];
    const properties: Record<string, string> = {
      "Preceded By": i ? `[[${paths[i - 1].replace(/\.md$/, "")}]]` : "",
    };
    if (!missingOnly && Object.hasOwn(script.metadata, "Followed By"))
      properties["Followed By"] =
        i + 1 < paths.length ? `[[${paths[i + 1].replace(/\.md$/, "")}]]` : "";
    if (
      Object.entries(properties).every(
        ([key, value]) => script.metadata[key] === value,
      )
    )
      return [];
    return [{ path, expected: script.text, properties }];
  });
}
export function reorderScript(
  group: ScriptGroup,
  from: string,
  target: string,
): string[] {
  const paths = group.sequences.flat().map((s) => s.path);
  const old = paths.indexOf(from),
    to = paths.indexOf(target);
  if (old < 0 || to < 0)
    throw new Error("Scripts must belong to the same project and group.");
  paths.splice(old, 1);
  paths.splice(to, 0, from);
  return paths;
}
export function renameOrders(
  orders: ScriptOrders,
  oldPath: string,
  newPath: string,
): ScriptOrders {
  const result: ScriptOrders = Object.create(null);
  const rename = (path: string) =>
    path === oldPath
      ? newPath
      : path.startsWith(oldPath + "/")
        ? newPath + path.slice(oldPath.length)
        : path;
  for (const [key, paths] of Object.entries(orders)) {
    const [scope, group] = JSON.parse(key);
    const newKey = orderKey(rename(scope), group);
    result[newKey] = [
      ...new Set([...(result[newKey] ?? []), ...paths.map(rename)]),
    ];
  }
  return result;
}
