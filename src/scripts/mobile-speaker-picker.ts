import { Modal, Notice, editorInfoField, type App } from "obsidian";
import { ViewPlugin, type EditorView } from "@codemirror/view";
import { el, button } from "../ui/sidebar.ts";
import { filterSpeakers, type Speaker } from "./speakers.ts";
import { speakerPicker, closeSpeakerPicker, chooseSpeaker } from "./speaker-picker.ts";

const dialogs = new WeakMap<EditorView, MobileSpeakerModal>();
// Session-only, bounded recency: no name history or preference is written to the vault.
const recent = new WeakMap<App, Map<string, string[]>>();

class MobileSpeakerModal extends Modal {
  private original;
  private restoreFocus = true;
  private clearState = true;
  private cleanupViewport?: () => void;
  constructor(app: App, private view: EditorView, private path: string, private candidates: Speaker[]) {
    super(app);
    this.shouldRestoreSelection = false;
    this.original = view.state.doc;
  }
  onOpen() {
    this.modalEl.classList.add("marginalia-mobile-speaker-picker");
    this.containerEl?.classList.add("marginalia-speaker-sheet-container");
    const root = this.contentEl;
    const heading = el("h2", "", "Choose a character");
    heading.tabIndex = -1;
    root.append(heading);
    const label = el("label", "marginalia-mobile-speaker-label", "Character name");
    const input = el("input") as HTMLInputElement;
    input.type = "search";
    input.placeholder = "Search or type a new character…";
    input.setAttribute("aria-label", "Character name");
    label.append(input);
    label.hidden = true;
    const search = button("Search or add a name…", () => {
      label.hidden = false; search.hidden = true;
      draw(); input.focus({preventScroll:true});
    }, "marginalia-mobile-speaker-search");
    const list = el("div", "marginalia-mobile-speaker-list");
    list.setAttribute("role", "group");
    list.setAttribute("aria-label", "Characters used in this script");
    const actions = el("div", "marginalia-mobile-speaker-actions");
    const useName = button("Use this name", () => {
      const name = input.value.trim();
      if (name && !/[\r\n:*]/.test(name)) this.choose({id:"name:" + name.normalize("NFKC").toLocaleLowerCase(), name, insert:name});
    });
    const draw = () => {
      list.replaceChildren();
      const ids = recent.get(this.app)?.get(this.path) ?? [];
      const ordered = [...this.candidates].sort((a,b) => {
        const rank = (id:string) => ids.includes(id) ? ids.indexOf(id) : ids.length;
        return rank(a.id)-rank(b.id);
      });
      const matches = filterSpeakers(ordered, input.value);
      const choices = label.hidden ? matches.slice(0,6) : matches;
      for (const choice of choices) {
        const item = button(choice.name, () => this.choose(choice), "marginalia-mobile-speaker-choice");
        if (choice.path && this.candidates.some(other => other.id !== choice.id && other.name === choice.name))
          item.append(el("small", "", choice.path));
        list.append(item);
      }
      if (!choices.length) list.append(el("p", "marginalia-script-caption", "No matching character. You can use a new name."));
      useName.disabled = !input.value.trim() || /[\r\n:*]/.test(input.value);
      useName.hidden = !input.value.trim();
      if (!useName.hidden) useName.textContent = `Use “${input.value.trim()}”`;
      search.textContent = this.candidates.length > 6 ? `Search ${this.candidates.length} characters or add a name…` : "Search or add a name…";
    };
    input.oninput = draw;
    // Soft-keyboard events and repeated Enter must never accept the first result.
    input.onkeydown = event => {
      if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); }
    };
    input.onbeforeinput = event => {
      if (["insertParagraph", "insertLineBreak"].includes(event.inputType)) event.preventDefault();
    };
    // No held/repeated Enter can activate the first button after the editor blurs.
    root.addEventListener("keydown", event => {
      if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); }
    }, true);
    actions.append(useName, button("Cancel", () => this.close()));
    root.append(list, search, label, actions);
    draw();
    heading.focus({preventScroll:true});
    // Keep the native sheet above the visible keyboard when search is explicitly opened.
    const win = this.modalEl.ownerDocument.defaultView, viewport = win?.visualViewport;
    const position = () => {
      this.containerEl?.style.setProperty("--marginalia-speaker-viewport-top", `${viewport?.offsetTop ?? 0}px`);
      this.containerEl?.style.setProperty("--marginalia-speaker-viewport-height", `${viewport?.height ?? win?.innerHeight ?? 600}px`);
    };
    position(); viewport?.addEventListener("resize", position); viewport?.addEventListener("scroll", position); win?.addEventListener("resize", position);
    this.cleanupViewport = () => { viewport?.removeEventListener("resize", position); viewport?.removeEventListener("scroll", position); win?.removeEventListener("resize", position); };
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
    const paths = recent.get(this.app) ?? new Map<string,string[]>();
    recent.set(this.app,paths);
    paths.set(this.path,[choice.id,...(paths.get(this.path) ?? []).filter(id => id !== choice.id)].slice(0,6));
    if (paths.size > 32) paths.delete(paths.keys().next().value!);
    this.close();
  }
  discard() {
    this.restoreFocus = this.clearState = false;
    this.close();
  }
  onClose() {
    this.cleanupViewport?.();
    if (dialogs.get(this.view) === this) dialogs.delete(this.view);
    if (this.clearState && this.view.state.field(speakerPicker, false))
      this.view.dispatch({effects: closeSpeakerPicker.of(null)});
    this.contentEl.replaceChildren();
    if (this.restoreFocus && this.view.dom.isConnected && this.view.state.field(editorInfoField, false)?.file?.path === this.path)
      this.view.focus();
  }
}

export function openMobileSpeakerPicker(app: App, view: EditorView, path: string, candidates: Speaker[]) {
  dialogs.get(view)?.discard();
  const dialog = new MobileSpeakerModal(app, view, path, candidates);
  dialogs.set(view, dialog);
  // Finish the originating Enter event before focusing a native dialog.
  queueMicrotask(() => {
    if (dialogs.get(view) !== dialog) return;
    if (view.dom.isConnected && view.state.field(speakerPicker, false)) {
      view.contentDOM.blur();
      dialog.open();
    }
    else dialog.discard();
  });
}
export const mobileSpeakerLifecycle = ViewPlugin.fromClass(class {
  constructor(private view: EditorView) {}
  destroy() { dialogs.get(this.view)?.discard(); }
});
