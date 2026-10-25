import { editorInfoField, Platform } from "obsidian";
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import type { ScriptHost } from "./view.ts";
import { scriptMetadata } from "./controller.ts";
import { parseScript } from "./model.ts";

/** Only script editors receive focus styling; all changes are presentation-only. */
export function writingFocus(plugin: ScriptHost) {
  const views = new Set<EditorView>();
  const extension = ViewPlugin.fromClass(class {
    decorations: DecorationSet = Decoration.none;
    private document?: EditorView["state"]["doc"];
    private path?: string;
    private script = false;
    private window: Window | null;
    private resize = () => this.center();
    private observer = new ResizeObserver(() => this.center());
    constructor(public view: EditorView) {
      this.window = view.dom.ownerDocument.defaultView;
      views.add(view); this.render();
      this.window?.addEventListener("resize", this.resize);
      this.window?.visualViewport?.addEventListener("resize", this.resize);
      this.window?.visualViewport?.addEventListener("scroll", this.resize);
      view.contentDOM.addEventListener("compositionend", this.resize);
      this.observer.observe(view.scrollDOM);
      this.center();
    }
    private center() {
      const view = this.view;
      if (!view.dom.classList.contains("marginalia-writing-focus")) return;
      view.requestMeasure({ key: this,
        read: () => {
          const rect = view.scrollDOM.getBoundingClientRect(), viewport = this.window?.visualViewport;
          const top = Math.max(rect.top, viewport?.offsetTop ?? 0);
          const bottom = Math.min(rect.bottom, (viewport?.offsetTop ?? 0) + (viewport?.height ?? this.window?.innerHeight ?? rect.bottom));
          const height = Math.max(0, bottom - top), ratio = Platform.isMobile ? 1 / 3 : 1 / 2;
          const head = view.state.selection.main.head, cursor = view.coordsAtPos(head);
          return {height, target: top + height * ratio,
            caret: cursor ? (cursor.top + cursor.bottom) / 2 : view.documentTop + view.lineBlockAt(head).top + view.defaultLineHeight / 2,
            before: Math.max(0, height * ratio - view.defaultLineHeight / 2),
            after: Math.max(0, height * (1-ratio) - view.defaultLineHeight / 2)};
        },
        write: geometry => {
          if (!views.has(view) || !view.dom.classList.contains("marginalia-writing-focus") || !geometry.height) return;
          let changed = false;
          for (const [name, size] of [["top", geometry.before], ["bottom", geometry.after]] as const) {
            const value = `${Math.round(size)}px`, property = `--marginalia-focus-${name}`;
            if (view.dom.style.getPropertyValue(property) !== value) { view.dom.style.setProperty(property, value); changed = true; }
          }
          // Padding must be measured before scrolling, particularly at the document's ends.
          if (changed) { this.center(); return; }
          if (view.hasFocus && !view.composing && Math.abs(geometry.caret - geometry.target) > 1)
            view.scrollDOM.scrollTop += geometry.caret - geometry.target;
        },
      });
    }
    render() {
      const view = this.view, info = view.state.field(editorInfoField, false);
      const preference = plugin.writing.preferences.focusMode;
      if (preference && (this.document !== view.state.doc || this.path !== info?.file?.path)) {
        this.document = view.state.doc; this.path = info?.file?.path; this.script = false;
        if (info?.file) try {
          const text = view.state.doc.toString();
          this.script = !!parseScript({ path: info.file.path, text, metadata: scriptMetadata(text) });
        } catch { /* An incomplete frontmatter edit must retain native editing. */ }
      }
      const enabled = preference && this.script;
      view.dom.classList.toggle("marginalia-writing-focus", enabled);
      if (!enabled) {
        this.decorations = Decoration.none;
        view.dom.style.removeProperty("--marginalia-focus-top");
        view.dom.style.removeProperty("--marginalia-focus-bottom");
        return;
      }
      const doc = view.state.doc;
      let first = doc.lineAt(view.state.selection.main.head), last = first;
      while (first.number > 1 && doc.line(first.number - 1).text.trim()) first = doc.line(first.number - 1);
      while (last.number < doc.lines && doc.line(last.number + 1).text.trim()) last = doc.line(last.number + 1);
      const ranges = [];
      for (let n = first.number; n <= last.number; n++)
        ranges.push(Decoration.line({ class: "marginalia-focus-paragraph" }).range(doc.line(n).from));
      this.decorations = Decoration.set(ranges);
    }
    update(update: ViewUpdate) {
      this.render();
      if (update.selectionSet || update.docChanged || update.focusChanged || update.geometryChanged || update.transactions.some(t => !t.docChanged)) this.center();
    }
    destroy() {
      views.delete(this.view); this.observer.disconnect();
      this.window?.removeEventListener("resize", this.resize);
      this.window?.visualViewport?.removeEventListener("resize", this.resize);
      this.window?.visualViewport?.removeEventListener("scroll", this.resize);
      this.view.contentDOM.removeEventListener("compositionend", this.resize);
      this.view.dom.classList.remove("marginalia-writing-focus");
      this.view.dom.style.removeProperty("--marginalia-focus-top");
      this.view.dom.style.removeProperty("--marginalia-focus-bottom");
    }
  }, { decorations: value => value.decorations });
  return { extension, refresh: () => { for (const view of views) view.dispatch({}); } };
}
