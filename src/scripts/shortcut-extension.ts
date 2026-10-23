import { editorInfoField, type App } from "obsidian";
import { Prec, Transaction, type StateEffect } from "@codemirror/state";
import { keymap, type EditorView } from "@codemirror/view";
import { isolateHistory } from "@codemirror/commands";
import { scriptMetadata } from "./controller.ts";
import { planShortcut, type ShortcutEdit } from "./shortcuts.ts";
import {
  speakerPicker,
  openSpeakerPicker,
  speakerKeys,
  speakerBlur,
  speakersForScript,
} from "./speaker-picker.ts";

export function commitShortcut(
  view: EditorView,
  edit: ShortcutEdit,
  effects: StateEffect<unknown>[] = [],
) {
  view.dispatch({
    changes: { from: edit.from, to: edit.to, insert: edit.text },
    selection: { anchor: edit.anchor, head: edit.head },
    scrollIntoView: true,
    effects,
    annotations: [
      isolateHistory.of("full"),
      Transaction.userEvent.of("input.complete"),
    ],
  });
}
export function handleScriptEnter(view: EditorView, app?: App): boolean {
  if (
    view.composing ||
    view.state.selection.ranges.length !== 1 ||
    !view.state.selection.main.empty
  )
    return false;
  const info = view.state.field(editorInfoField, false);
  if (!info?.file || !info.editor) return false;
  const text = view.state.doc.toString();
  try {
    const metadata = scriptMetadata(text);
    const edit = planShortcut(
      { path: info.file.path, text, metadata },
      view.state.selection.main.head,
    );
    if (!edit) return false;
    const candidates =
      app && text.slice(edit.from, edit.to).trim() === "/d"
        ? speakersForScript(app, info.file.path, text, metadata)
        : [];
    commitShortcut(
      view,
      edit,
      candidates.length
        ? [
            openSpeakerPicker.of({
              from: edit.anchor,
              to: edit.head,
              candidates,
              query: "",
              selected: 0,
            }),
          ]
        : [],
    );
    return true;
  } catch {
    return false;
  }
}
export const scriptShortcutExtension = Prec.highest(
  keymap.of([{ key: "Enter", run: (view) => handleScriptEnter(view) }]),
);
export const createScriptShortcutExtension = (app: App) => [
  speakerPicker,
  speakerBlur,
  Prec.highest(
    keymap.of([
      ...speakerKeys,
      { key: "Enter", run: (view) => handleScriptEnter(view, app) },
    ]),
  ),
];
