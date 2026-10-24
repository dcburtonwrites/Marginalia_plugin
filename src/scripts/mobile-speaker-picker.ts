import { Modal, Notice, editorInfoField, type App } from "obsidian";
import { ViewPlugin, type EditorView } from "@codemirror/view";
import { el, button } from "../ui/sidebar.ts";
import { filterSpeakers, type Speaker } from "./speakers.ts";
import { speakerPicker, closeSpeakerPicker, chooseSpeaker } from "./speaker-picker.ts";

const dialogs = new WeakMap<EditorView, MobileSpeakerModal>();

class MobileSpeakerModal extends Modal {
  private original;
  private restoreFocus = true;
  private clearState = true;
  constructor(app: App, private view: EditorView, private path: string, private candidates: Speaker[]) {
    super(app);
    this.original = view.state.doc;
  }
  onOpen() {
    this.modalEl.classList.add("marginalia-mobile-speaker-picker");
    const root = this.contentEl;
    root.append(el("h2", "", "Choose a character"));
    root.append(el("p", "marginalia-script-caption", "Tap a character, or type a new name."));
    const label = el("label", "marginalia-mobile-speaker-label", "Character name");
    const input = el("input") as HTMLInputElement;
    input.type = "search";
    input.placeholder = "Search or type a new character…";
    input.setAttribute("aria-label", "Character name");
    label.append(input);
    const list = el("div", "marginalia-mobile-speaker-list");
    list.setAttribute("role", "group");
    list.setAttribute("aria-label", "Characters used in this script");
    const actions = el("div", "marginalia-mobile-speaker-actions");
    const useName = button("Use this name", () => {
      const name = input.value.trim();
      if (name && !/[\r\n:*]/.test(name)) this.choose({id:name, name, insert:name});
    });
    const draw = () => {
      list.replaceChildren();
      const choices = filterSpeakers(this.candidates, input.value);
      for (const choice of choices) {
        const item = button(choice.name, () => this.choose(choice), "marginalia-mobile-speaker-choice");
        if (choice.path) item.append(el("small", "", choice.path));
        list.append(item);
      }
      if (!choices.length) list.append(el("p", "marginalia-script-caption", "No matching character. You can use a new name."));
      useName.disabled = !input.value.trim() || /[\r\n:*]/.test(input.value);
    };
    input.oninput = draw;
    // Soft-keyboard events and repeated Enter must never accept the first result.
    input.onkeydown = event => {
      if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); }
    };
    input.onbeforeinput = event => {
      if (["insertParagraph", "insertLineBreak"].includes(event.inputType)) event.preventDefault();
    };
    actions.append(useName, button("Cancel", () => this.close()));
    root.append(label, list, actions);
    draw();
    input.focus();
  }
  private choose(choice: Speaker) {
    if (!this.view.dom.isConnected || this.view.state.doc !== this.original ||
        this.view.state.field(editorInfoField, false)?.file?.path !== this.path) {
      new Notice("The script changed. Use /d again to choose a character.");
      this.close();
      return;
    }
    if (!chooseSpeaker(this.view, choice)) {
      new Notice("Could not insert the character. Cancel and use /d again.");
      return;
    }
    this.close();
  }
  discard() {
    this.restoreFocus = this.clearState = false;
    this.close();
  }
  onClose() {
    if (dialogs.get(this.view) === this) dialogs.delete(this.view);
    if (this.clearState && this.view.state.field(speakerPicker, false))
      this.view.dispatch({effects: closeSpeakerPicker.of(null)});
    this.contentEl.replaceChildren();
    if (this.restoreFocus && this.view.dom.isConnected) this.view.focus();
  }
}

export function openMobileSpeakerPicker(app: App, view: EditorView, path: string, candidates: Speaker[]) {
  dialogs.get(view)?.discard();
  const dialog = new MobileSpeakerModal(app, view, path, candidates);
  dialogs.set(view, dialog);
  // Finish the originating Enter event before focusing a native dialog.
  queueMicrotask(() => {
    if (dialogs.get(view) !== dialog) return;
    if (view.dom.isConnected && view.state.field(speakerPicker, false)) dialog.open();
    else dialog.discard();
  });
}
export const mobileSpeakerLifecycle = ViewPlugin.fromClass(class {
  constructor(private view: EditorView) {}
  destroy() { dialogs.get(this.view)?.discard(); }
});
