import { Modal, Notice, Setting } from "obsidian";
import { el } from "../ui/sidebar.ts";
import { sessionCSV } from "./writing.ts";
import type { ScriptController } from "./controller.ts";

export class WritingHistoryModal extends Modal {
  constructor(private controller: ScriptController) { super(controller.plugin.app); }
  onOpen() {
    const session = this.controller.session;
    session.snapshot();
    const records = [...session.data.history, ...(session.data.activeSession ? [session.data.activeSession] : [])];
    const root = this.contentEl;
    root.append(el("h2", "", "Writing history"), el("p", "marginalia-muted",
      "Local tracked timer sessions only; pauses and offline time are excluded. Added/deleted words measure word-count increases/decreases during the running timer, not keystrokes. Up to 500 finished sessions are retained. History is not merged across devices."));
    const totals = (days: number) => {
      const cutoff = Date.now() - days * 86400000;
      const recent = records.filter(r => r.started >= cutoff);
      const sum = (key: "added" | "deleted" | "elapsedMs") => recent.reduce((n, r) => n + r[key], 0);
      return `${days} days · ${recent.length} sessions · ${Math.round(sum("elapsedMs") / 60000)} min · +${sum("added")} / −${sum("deleted")} words · ${sum("added") - sum("deleted")} net`;
    };
    root.append(el("p", "", totals(7)), el("p", "", totals(30)));
    if (!records.length) root.append(el("p", "", "No recorded sessions yet. Enable session history and start the countdown to begin."));
    else {
      const wrap = el("div", "marginalia-history-table");
      const table = el("table", "");
      const header = el("tr", "");
      for (const name of ["Started", "Project / Group", "Minutes", "Added", "Deleted", "Net", "Status"]) {
        const th = el("th", "", name); th.setAttribute("scope", "col"); header.append(th);
      }
      const head = el("thead", ""); head.append(header); table.append(head);
      const body = el("tbody", "");
      for (const r of [...records].reverse()) {
        const row = el("tr", "");
        for (const value of [new Date(r.started).toLocaleString(),
          [r.selection?.scope ?? "No selected project", r.selection?.group].filter(Boolean).join(" / "),
          (r.elapsedMs / 60000).toFixed(1), r.added, r.deleted, r.added-r.deleted, r.outcome])
          row.append(el("td", "", String(value)));
        body.append(row);
      }
      table.append(body); wrap.append(table); root.append(wrap);
    }
    root.append(el("p", "marginalia-muted", "Project / Group records the selection when the session began. Word totals include every eligible note edited during that session."));
    new Setting(root).addButton(button => button.setButtonText("Export CSV").setDisabled(!records.length).onClick(async () => {
      try {
        const path = `Marginalia writing history ${Date.now()}.csv`;
        await this.app.vault.create(path, sessionCSV(records));
        new Notice(`Saved ${path}`);
      } catch { new Notice("Could not export writing history."); }
    })).addButton(button => button.setButtonText("Clear history").setDisabled(!records.length).onClick(() => {
      const confirm = new Setting(root).setName("Permanently clear saved history?");
      confirm.addButton(button => button.setButtonText("Clear saved history").setWarning().onClick(async () => {
        session.data.history = [];
        if (session.data.activeSession) {
          session.finishHistory("stopped"); session.data.history = [];
        }
        try { await this.controller.plugin.savePluginData(); this.close(); }
        catch { new Notice("Could not save cleared history."); }
      })).addButton(button => button.setButtonText("Cancel").onClick(() => confirm.settingEl.remove()));
    }));
  }
  onClose() { this.contentEl.replaceChildren(); }
}
