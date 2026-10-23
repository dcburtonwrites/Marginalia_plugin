import { editorInfoField, type Editor } from "obsidian";
import { ViewPlugin, type EditorView } from "@codemirror/view";
import { foldEffect, unfoldEffect, foldedRanges } from "@codemirror/language";
import type { Script } from "./model.ts";

export const editorViews = new WeakMap<Editor, EditorView>();
export const scriptFoldingExtension = ViewPlugin.fromClass(class {
  editor?: Editor;
  path?: string;
  constructor(public view: EditorView) { this.capture(); }
  capture() {
    const info = this.view.state.field(editorInfoField, false);
    const editor = info?.editor;
    const path = info?.file?.path;
    if (this.path !== path) this.view.dom.classList.remove("marginalia-panels-collapsed");
    this.path = path;
    if (editor) { this.editor = editor; editorViews.set(editor, this.view); }
  }
  update() { this.capture(); }
  destroy() { if (this.editor && editorViews.get(this.editor) === this.view) editorViews.delete(this.editor); }
});
/** Fold only a panel's quoted body; dialogue and notes outside it stay visible. */
export function panelFoldRanges(script: Script) {
  const ranges: {from:number;to:number}[] = [];
  for (const panel of script.pages.flatMap((page) => page.panels)) {
    const header = script.text.indexOf("\n", panel.from);
    if (header < 0) continue;
    let cursor = header + 1, end = header;
    while (cursor < script.text.length) {
      const next = script.text.indexOf("\n", cursor);
      const to = next < 0 ? script.text.length : next;
      if (!/^>/.test(script.text.slice(cursor, to))) break;
      end = to;
      cursor = to + 1;
    }
    if (end > header) ranges.push({from: header, to: end});
  }
  return ranges;
}
export function foldPanels(editor: Editor, script: Script) {
  const view = editorViews.get(editor);
  if (!view) throw new Error("The script editor is still loading. Try the view option again.");
  view.dom?.classList.add("marginalia-panels-collapsed");
  view.dispatch({effects: panelFoldRanges(script).map((range) => foldEffect.of(range))});
}

export function expandPanels(editor: Editor) {
  editorViews.get(editor)?.dom?.classList.remove("marginalia-panels-collapsed");
}

export function foldPages(editor: Editor, script: Script) {
  const view = editorViews.get(editor);
  if (!view) throw new Error("The script editor is still loading. Try again.");
  const ranges = script.pages.map((page) => ({
    from: script.text.indexOf("\n", page.from),
    to: page.from + script.text.slice(page.from, page.to).trimEnd().length,
  })).filter((range) => range.from >= 0 && range.to > range.from);
  view.dispatch({effects:ranges.map((range)=>foldEffect.of(range))});
}
export function editorFoldStatus(editor: Editor) {
  const view = editorViews.get(editor);
  if (!view) return {any:false,panels:false};
  const panels = view.dom.classList.contains("marginalia-panels-collapsed");
  return {any:panels || foldedRanges(view.state).size > 0,panels};
}
export function unfoldPanels(editor: Editor, script: Script) {
  const view = editorViews.get(editor);
  expandPanels(editor);
  if (view) view.dispatch({effects:panelFoldRanges(script).map((range)=>unfoldEffect.of(range))});
}
