import { sourceLines } from "./model.ts";
export interface Frontmatter {
  start: number;
  end: number;
  body: number;
  yaml: string;
}
export function frontmatter(source: string): Frontmatter | null {
  const lines = sourceLines(source);
  if (lines[0]?.text.replace(/^\uFEFF/, "") !== "---") return null;
  const close = lines.findIndex(
    (line, i) => i > 0 && /^(---|\.\.\.)\s*$/.test(line.text),
  );
  if (close < 0)
    throw new Error("Close the frontmatter fence before arranging scripts.");
  const start = lines[0].raw.length,
    end = lines[close].from;
  return {
    start,
    end,
    body: lines[close].from + lines[close].raw.length,
    yaml: source.slice(start, end),
  };
}
/** Patch known block-mapping properties without reformatting other YAML or the body.
 * Unusual valid YAML (flow maps/complex keys) uses the host serializer fallback. */
export function patchProperties(
  source: string,
  properties: Record<string, unknown>,
  fallback: () => string,
): string {
  const eol = source.includes("\r\n") ? "\r\n" : "\n",
    fm = frontmatter(source);
  const lines = sourceLines(fm?.yaml ?? "");
  let yaml = fm?.yaml ?? "";
  const edits: { from: number; to: number; text: string }[] = [];
  for (const [key, value] of Object.entries(properties)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(`^(?:${escaped}|"${escaped}"|'${escaped}')\\s*:`);
    const index = lines.findIndex((l) => match.test(l.text));
    if (index < 0) {
      if (fm && (/^\s*\{/.test(yaml) || new RegExp(escaped).test(yaml)))
        return replaceYaml(source, fallback());
      edits.push({
        from: yaml.length,
        to: yaml.length,
        text:
          (yaml && !yaml.endsWith("\n") ? eol : "") +
          `${key}: ${JSON.stringify(value)}${eol}`,
      });
    } else {
      let end = index + 1;
      while (
        end < lines.length &&
        (lines[end].text.startsWith(" ") ||
          lines[end].text.startsWith("\t") ||
          !lines[end].text.trim() ||
          lines[end].text.trimStart().startsWith("#"))
      )
        end++;
      while (
        end > index + 1 &&
        (!lines[end - 1].text.trim() ||
          lines[end - 1].text.trimStart().startsWith("#"))
      )
        end--;
      edits.push({
        from: lines[index].from,
        to: lines[end]?.from ?? yaml.length,
        text: `${key}: ${JSON.stringify(value)}${eol}`,
      });
    }
  }
  for (const edit of edits.sort((a, b) => b.from - a.from))
    yaml = yaml.slice(0, edit.from) + edit.text + yaml.slice(edit.to);
  if (fm) return source.slice(0, fm.start) + yaml + source.slice(fm.end);
  const bom = source.startsWith("\uFEFF") ? "\uFEFF" : "";
  return `${bom}---${eol}${yaml}---${eol}${source.slice(bom.length)}`;
}
function replaceYaml(source: string, yaml: string): string {
  const fm = frontmatter(source)!;
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  return (
    source.slice(0, fm.start) +
    yaml.replace(/\r?\n/g, eol).replace(/[\r\n]+$/, "") +
    eol +
    source.slice(fm.end)
  );
}
