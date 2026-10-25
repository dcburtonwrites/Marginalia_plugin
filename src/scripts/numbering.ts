import { TFile, MarkdownRenderChild, type MarkdownPostProcessorContext } from "obsidian";
import { parseScript, scriptScope, pageLabel, panelLabel, type Script } from "./model.ts";
import { scriptMetadata, type ScriptController } from "./controller.ts";

const originals = new WeakMap<HTMLElement, { texts: Map<Text, string>; prefix: Text }>();
/** Change only text nodes: native links, fold buttons and their handlers stay intact. */
function label(element: HTMLElement, value: string) {
  if (element.dataset.marginaliaLabel === value) return;
  let original = originals.get(element);
  if (!original) {
    const texts = new Map<Text, string>();
    const walker = element.ownerDocument.createTreeWalker(element, 4);
    let node: Node | null;
    while ((node = walker.nextNode())) texts.set(node as Text, node.textContent ?? "");
    original = { texts, prefix: element.ownerDocument.createTextNode("") };
    originals.set(element, original);
  }
  for (const [node, text] of original.texts) node.textContent = text;
  original.prefix.remove();
  const text = [...original.texts.values()].join("");
  const prefix = value.startsWith("Page ") ? /^Page\b\s*(?:\d+(?:[–-]\d+)?|[?#]+)?\s*(?:Double Spread\b\s*)?(?:[—–:-]\s*)?/i
    : /^Panel(?:\s+\d+)?(?:\s*[—–:.-]\s*|\s*$)/i;
  let remove = text.match(prefix)?.[0].length ?? 0;
  const hasName = text.slice(remove).trim().length > 0;
  for (const [node, content] of original.texts) {
    if (!remove) break;
    node.textContent = content.slice(remove);
    remove = Math.max(0, remove - content.length);
  }
  original.prefix.textContent = value.split(" — ")[0] + (hasName ? " — " : "");
  element.prepend(original.prefix);
  element.dataset.marginaliaLabel = value;
}
export function restoreNumbering(root: HTMLElement) {
  for (const element of descendants(root, "[data-marginalia-label]")) {
    const original = originals.get(element);
    if (original) {
      original.prefix.remove();
      for (const [node, text] of original.texts) node.textContent = text;
    }
    originals.delete(element); delete element.dataset.marginaliaLabel;
  }
  for (const element of descendants(root, ".marginalia-numbered-panel, .marginalia-numbered-page"))
    element.classList.remove("marginalia-numbered-panel", "marginalia-numbered-page");
}
const descendants = (root: HTMLElement, selector: string) => [
  ...(root.matches(selector) ? [root] : []), ...root.querySelectorAll<HTMLElement>(selector),
];
/** Source-line matching makes repeated names and independently rendered chunks unambiguous. */
export function numberRenderedScript(root: HTMLElement, script: Script,
  section?: (element: HTMLElement) => {lineStart: number; lineEnd: number} | null) {
  const pages = script.pages;
  const headings = descendants(root, "h2").filter(node => /^Page\b/i.test(node.dataset.heading ?? node.textContent ?? ""));
  const usedPages = new Set<number>();
  for (const heading of headings) {
    const info = section?.(heading);
    const page = info ? pages.find(p => p.line >= info.lineStart && p.line <= info.lineEnd && !usedPages.has(p.line))
      : !section ? pages.find(p => !usedPages.has(p.line)) : undefined;
    if (!page) continue;
    usedPages.add(page.line);
    label(heading, pageLabel(page));
    heading.classList.add("marginalia-numbered-page");
  }
  const usedPanels = new Set<number>();
  const panels = pages.flatMap(page => page.panels.map((panel, index) => ({panel, index})));
  for (const callout of descendants(root, '.callout[data-callout="panel"]')) {
    // Nested/inset callouts do not acquire sibling numbers.
    if (callout.parentElement?.closest('.callout[data-callout="panel"]')) continue;
    const info = section?.(callout);
    const match = info ? panels.find(p => p.panel.line >= info.lineStart && p.panel.line <= info.lineEnd && !usedPanels.has(p.panel.line))
      : !section ? panels.find(p => !usedPanels.has(p.panel.line)) : undefined;
    if (!match) continue;
    const title = callout.querySelector<HTMLElement>(".callout-title-inner") ?? callout.querySelector<HTMLElement>(".callout-title");
    if (!title) continue;
    usedPanels.add(match.panel.line);
    label(title, panelLabel(match.panel.title, match.index));
    callout.classList.add("marginalia-numbered-panel");
  }
}
export function registerScriptNumbering(controller: ScriptController) {
  const plugin = controller.plugin;
  const roots = new Map<HTMLElement, MarkdownPostProcessorContext>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const revisions = new Map<string, number>();
  const snapshots = new Map<string, Script>();
  let closed = false;
  const refresh = async (path: string) => {
    const revision = (revisions.get(path) ?? 0) + 1;
    revisions.set(path, revision);
    const file = plugin.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return;
    try {
      const text = controller.editors().get(path)?.getValue() ?? await plugin.app.vault.cachedRead(file);
      const previous = snapshots.get(path);
      const script = previous?.text === text ? previous : parseScript({path, text, metadata: scriptMetadata(text)});
      if (script) snapshots.set(path, script); else snapshots.delete(path);
      if (closed || revision !== revisions.get(path)) return;
      for (const [root, context] of roots) {
        if (context.sourcePath !== path) continue;
        if (script) numberRenderedScript(root, script, element => context.getSectionInfo(element));
        else restoreNumbering(root);
      }
    } catch { /* A temporarily incomplete edit must not change the note or interrupt rendering. */ }
  };
  const schedule = (path: string) => {
    if (![...roots.values()].some(context => context.sourcePath === path)) return;
    clearTimeout(timers.get(path));
    timers.set(path, setTimeout(() => { timers.delete(path); void refresh(path); }, 150));
  };
  plugin.registerMarkdownPostProcessor(async (root, context) => {
    if(root.closest(".marginalia-compile-document"))return;
    const file = plugin.app.vault.getAbstractFileByPath(context.sourcePath);
    if (!(file instanceof TFile)) return;
    const metadata = context.frontmatter ?? plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    if (scriptScope(context.sourcePath, metadata) === null) return;
    if (!roots.has(root)) {
      roots.set(root, context);
      context.addChild(new class extends MarkdownRenderChild {
        onunload() {
          restoreNumbering(root); roots.delete(root);
          if (![...roots.values()].some(value => value.sourcePath === context.sourcePath)) snapshots.delete(context.sourcePath);
        }
      }(root));
    }
    // Obsidian reuses unchanged rendered sections. Refresh every live section of this file.
    await refresh(context.sourcePath);
    schedule(context.sourcePath);
  }, 100);
  plugin.registerEvent(plugin.app.vault.on("modify", file => { if (file instanceof TFile) schedule(file.path); }));
  plugin.registerEvent(plugin.app.metadataCache.on("changed", file => schedule(file.path)));
  plugin.registerEvent(plugin.app.workspace.on("editor-change", (_editor, info) => { if (info.file) schedule(info.file.path); }));
  plugin.register(() => {
    closed = true;
    for (const timer of timers.values()) clearTimeout(timer);
    for (const root of roots.keys()) restoreNumbering(root);
    roots.clear(); timers.clear(); revisions.clear(); snapshots.clear();
  });
}
