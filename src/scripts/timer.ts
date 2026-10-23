import { Modal, Setting } from "obsidian";
import type { ScriptController } from "./controller.ts";
import { el } from "../ui/sidebar.ts";

export class TimerDurationModal extends Modal {
  constructor(private controller: ScriptController, private changed: () => void) { super(controller.plugin.app); }
  onOpen() {
    this.contentEl.append(el("h2", "", "Set this session’s timer"), el("p", "marginalia-muted", "Changes this countdown only. Reset restores the duration from settings."));
    let minutes = String(Math.ceil(this.controller.session.remaining()/60000) || this.controller.session.data.preferences.countdownMinutes);
    const error = el("p", "marginalia-script-warning"); error.setAttribute("role","alert");
    new Setting(this.contentEl).setName("Minutes").addText(input=> {
      input.inputEl.type="number"; input.inputEl.min="1"; input.inputEl.max="1440";
      input.inputEl.setAttribute("aria-label","Session timer minutes");
      input.setValue(minutes).onChange(value=>{ minutes=value; });
    });
    this.contentEl.append(error);
    new Setting(this.contentEl).addButton(button=>button.setButtonText("Set timer").setCta().onClick(()=> {
      try { this.controller.session.setDuration(Number(minutes)); this.changed(); this.close(); }
      catch(reason) { error.textContent = String(reason instanceof Error ? reason.message : reason); }
    })).addButton(button=>button.setButtonText("Cancel").onClick(()=>this.close()));
  }
  onClose() { this.contentEl.replaceChildren(); }
}
