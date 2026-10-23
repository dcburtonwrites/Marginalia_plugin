import { editorInfoField } from "obsidian";
import { Prec, Transaction } from "@codemirror/state";
import { keymap, type EditorView } from "@codemirror/view";
import { isolateHistory } from "@codemirror/commands";
import { scriptMetadata } from "./controller.ts";
import { planShortcut, type ShortcutEdit } from "./shortcuts.ts";

export function commitShortcut(view: EditorView, edit: ShortcutEdit) {
  view.dispatch({changes:{from:edit.from,to:edit.to,insert:edit.text},
    selection:{anchor:edit.anchor,head:edit.head},scrollIntoView:true,
    annotations:[isolateHistory.of("full"),Transaction.userEvent.of("input.complete")]});
}
export function handleScriptEnter(view: EditorView): boolean {
  if(view.composing || view.state.selection.ranges.length!==1 || !view.state.selection.main.empty) return false;
  const info=view.state.field(editorInfoField,false);
  if(!info?.file || !info.editor) return false;
  const text=view.state.doc.toString();
  try {
    const edit=planShortcut({path:info.file.path,text,metadata:scriptMetadata(text)},view.state.selection.main.head);
    if(!edit) return false;
    commitShortcut(view,edit);
    return true;
  } catch { return false; }
}
export const scriptShortcutExtension=Prec.highest(keymap.of([{key:"Enter",run:handleScriptEnter}]));
