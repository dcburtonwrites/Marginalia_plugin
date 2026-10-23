import { Modal, Setting, Notice } from "obsidian";
import type { ScriptController } from "./controller.ts";
import { el } from "../ui/sidebar.ts";
import { suggest, propertyValues } from "../ui/suggest.ts";

class NewScriptModal extends Modal {
  constructor(private controller: ScriptController, private folder: string, private group: string) {
    super(controller.plugin.app);
  }
  onOpen() {
    const root = this.contentEl;
    root.append(el("h2", "", "Create a New Script"));
    root.append(el("p", "marginalia-script-caption", `Folder: ${this.folder}`));
    let name = "", creating = false;
    const nameSetting = new Setting(root).setName("Script name");
    let nameInput: HTMLInputElement;
    nameSetting.addText(input => {
      nameInput = input.inputEl;
      input.setPlaceholder("Script name").onChange(value => { name = value; });
      input.inputEl.setAttribute("aria-label", "Script name");
    });
    new Setting(root).setName("Grouping").setDesc("Leave blank for Top-level.")
      .addText(input => { input.setValue(this.group).setPlaceholder("Top-level")
        .onChange(value => { this.group = value; }); suggest(input.inputEl,()=>propertyValues(this.app,"Group")); });
    const error = el("p", "marginalia-script-warning");
    error.setAttribute("role", "alert");
    root.append(error);
    new Setting(root).addButton(button => {
      const create = async () => {
        if (creating) return;
        creating = true;
        button.setDisabled(true);
        error.textContent = "";
        try {
          const file = await this.controller.createScript(this.folder, name, this.group);
          this.close();
          new Notice(`Created ${file.basename}.`);
        } catch (reason) {
          error.textContent = reason instanceof Error ? reason.message : String(reason);
        } finally {
          creating = false;
          button.setDisabled(false);
        }
      };
      button.setButtonText("Create script").setCta().onClick(() => void create());
      nameInput!.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.isComposing) { event.preventDefault(); void create(); }
      });
    }).addButton(button => button.setButtonText("Cancel").onClick(() => this.close()));
    nameInput!.focus();
  }
  onClose() { this.contentEl.replaceChildren(); }
}

export function openNewScript(controller: ScriptController, folder: string, group?: string) {
  new NewScriptModal(controller, folder, group === "Top-level" ? "" : group ?? "").open();
}
