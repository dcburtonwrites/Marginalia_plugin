import * as Obsidian from "obsidian";
import {Modal, Setting, TFile, Component, MarkdownRenderer, parseYaml, stringifyYaml, type Plugin} from "obsidian";
import type Marginalia from "../main.ts";
import {el} from "../ui/sidebar.ts";
import {suggest} from "../ui/suggest.ts";
import {basePath} from "./model.ts";

export class ProjectRegisterModal extends Modal {
  constructor(private owner: Marginalia, private afterSave?: () => void | Promise<void>) {super(owner.app);}
  onOpen() {
    const root = this.contentEl;
    root.replaceChildren(el("h2", "", "Project Register"));
    let path = this.owner.workspaceSettings.projectRegisterBase;
    new Setting(root).setName("Base file").setDesc("Choose an existing .base file in this vault. Leave blank to use the built-in register. The first view supplies the register’s records. Enable Obsidian’s Bases core plugin to use it.")
      .addText(input => {
        input.setPlaceholder("Project Register.base").setValue(path).onChange(value => {path = value;});
        input.inputEl.setAttribute("aria-label", "Project Register Base file");
        suggest(input.inputEl, () => this.app.vault.getFiles().filter(file => basePath(file.path)).map(file => file.path));
      });
    const error = el("p", "marginalia-script-warning");error.setAttribute("role", "alert");root.append(error);
    new Setting(root).addButton(button => button.setButtonText("Save").setCta().onClick(async () => {
      const next = basePath(path);
      if (path.trim() && (!next || !(this.app.vault.getAbstractFileByPath(next) instanceof TFile))) {
        error.textContent = "Choose an existing .base file in this vault.";return;
      }
      const previous = this.owner.workspaceSettings.projectRegisterBase;
      button.setDisabled(true);
      try {
        this.owner.workspaceSettings.projectRegisterBase = next;
        await this.owner.savePluginData();
      } catch {
        this.owner.workspaceSettings.projectRegisterBase = previous;
        error.textContent = "Could not save the Base selection. Try again.";button.setDisabled(false);return;
      }
      this.owner.themeFeature?.refresh();this.close();await this.afterSave?.();
    })).addButton(button => button.setButtonText("Cancel").onClick(() => this.close()));
  }
  onClose() {this.contentEl.replaceChildren();}
}

const sourceCallbacks = new Map<string, (paths: Set<string>) => void>();
let nextSource = 0;
export const registerBaseType = "marginalia-project-register-source";
/** A private presentation of an embedded query: native Bases owns all query semantics. */
export function registerBaseSource(plugin: Plugin) {
  if (!Obsidian.BasesView || !plugin.registerBasesView) return false;
  return plugin.registerBasesView(registerBaseType, {
    name:"Marginalia Project Register", icon:"table",
    factory: controller => new class extends Obsidian.BasesView {
      type = registerBaseType;
      constructor() {super(controller);}
      onDataUpdated() {
        const id = this.config.get("marginaliaRegisterId");
        if (typeof id === "string") sourceCallbacks.get(id)?.(new Set(this.data.data.map(entry => entry.file.path)));
      }
    }(),
  });
}
export function registerSourceConfig(config: unknown, id: string) {
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("This Base has no valid configuration.");
  const raw = config as Record<string, unknown>;
  const first = Array.isArray(raw.views) ? raw.views[0] : undefined;
  if (!first || typeof first !== "object" || Array.isArray(first)) throw new Error("This Base needs a view before it can supply the register.");
  return {...raw, views:[{...first, type:registerBaseType, name:"Project Register", marginaliaRegisterId:id}]};
}
export async function mountRegisterSource(owner: Marginalia, root: HTMLElement, component: Component, receive: (paths: Set<string>) => void) {
  const file = owner.app.vault.getAbstractFileByPath(owner.workspaceSettings.projectRegisterBase);
  if (!(file instanceof TFile)) throw new Error("The assigned Base is unavailable. Choose Base to change it.");
  if (!Obsidian.BasesView || !owner.themeFeature?.baseSourceAvailable) throw new Error("Using a Base requires Obsidian 1.10 or newer with the Bases core plugin enabled.");
  const id = "register-" + ++nextSource;
  let closed=false;
  component.register(() => {closed=true;sourceCallbacks.delete(id);});
  const config = registerSourceConfig(parseYaml(await owner.app.vault.cachedRead(file)), id);
  if(closed)return;
  sourceCallbacks.set(id, receive);
  await MarkdownRenderer.render(owner.app, "```base\n" + stringifyYaml(config) + "\n```", root, file.path, component);
}
