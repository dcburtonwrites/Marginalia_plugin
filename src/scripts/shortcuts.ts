import {
  followingSide,
  parseScript,
  scriptScope,
  type ScriptInput,
} from "./model.ts";

export const scriptCommands = {
  "/P": "page",
  "/p": "panel",
  "/d": "dialogue",
  "/t": "quote",
  "/c": "note",
  "/cn": "note",
  "/ct": "tip",
  "/cw": "warning",
  "/cd": "danger",
  "/cs": "success",
  "/ce": "example",
} as const;
export interface ShortcutEdit {
  from: number;
  to: number;
  text: string;
  anchor: number;
  head: number;
}
/** Only an exact standalone command at a single caret is eligible. */
export function planShortcut(
  input: ScriptInput,
  cursor: number,
): ShortcutEdit | null {
  if (scriptScope(input.path, input.metadata) === null) return null;
  const { text } = input;
  const from = text.lastIndexOf("\n", cursor - 1) + 1;
  const newline = text.indexOf("\n", cursor);
  const to = newline < 0 ? text.length : newline;
  const line = text.slice(from, to).replace(/\r$/, "");
  if (cursor !== from + line.length || !Object.hasOwn(scriptCommands, line))
    return null;
  let fence = "",
    comment = false,
    yaml = false,
    math = false;
  for (const [index, raw] of text.slice(0, from).split("\n").entries()) {
    const value = raw.replace(/\r$/, "");
    if (index === 0 && value.replace(/^\uFEFF/, "") === "---") {
      yaml = true;
      continue;
    }
    if (yaml) {
      if (/^(---|\.\.\.)\s*$/.test(value)) yaml = false;
      continue;
    }
    if (comment) {
      if (value.includes("-->")) comment = false;
      continue;
    }
    if (fence) {
      if (new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`).test(value))
        fence = "";
      continue;
    }
    const marker = value.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker) {
      fence = marker[1];
      continue;
    }
    if (
      value.includes("<!--") &&
      !value.slice(value.indexOf("<!--") + 4).includes("-->")
    )
      comment = true;
    if (/^\s*\$\$\s*$/.test(value)) math = !math;
  }
  if (fence || comment || yaml || math) return null;
  const script = parseScript(input);
  if (!script) return null;
  const page = script.pages.find((p) => from >= p.from && from < p.to);
  const kind = scriptCommands[line as keyof typeof scriptCommands];
  if (kind !== "page" && !page) return null;
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  let replacement: string,
    offset: number,
    length = 0;
  if (kind === "page") {
    const number = page ? page.local + page.slots : 1;
    replacement = `## Page ${number}${eol}${eol}Side: ${followingSide(page?.side)}${eol}${eol}`;
    offset = replacement.length;
  } else if (kind === "dialogue") {
    replacement = "**SPEAKER:** Dialogue";
    offset = 2;
    length = "SPEAKER".length;
  } else {
    const body = kind === "panel" ? "New panel" : `New ${kind}`;
    replacement = `> [!${kind}]${eol}> ${body}`;
    const placeholder = kind === "panel" ? "New panel" : `New ${kind}`;
    offset = replacement.indexOf(placeholder);
    length = placeholder.length;
  }
  // Separate generated blocks from their neighbors without touching other text.
  const prefix =
    from > 0 && !text.slice(0, from).endsWith(eol + eol) ? eol : "";
  const end = newline < 0 ? text.length : newline + 1;
  const suffix =
    kind === "page" ? "" : text.slice(end).startsWith(eol) ? eol : eol + eol;
  return {
    from,
    to: end,
    text: prefix + replacement + suffix,
    anchor: from + prefix.length + offset,
    head: from + prefix.length + offset + length,
  };
}
