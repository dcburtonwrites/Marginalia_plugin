import { Setting, Notice } from "obsidian";
import { el } from "../ui/sidebar.ts";
import type { ScriptHost } from "./view.ts";
import type { GoalMode } from "./writing.ts";
export function renderWritingSettings(root: HTMLElement, plugin: ScriptHost) {
  const data = plugin.writing,
    p = data.preferences,
    session = plugin.scriptController?.session;
  const save = async () => {
    try {
      await plugin.savePluginData();
      plugin.scriptController?.onChange();
    } catch {
      new Notice("Could not save writing settings.");
    }
  };
  root.append(el("h3", "", "Writing session"));
  new Setting(root)
    .setName("Show countdown timer")
    .setDesc("Show the timer below the Scripts outline.")
    .addToggle((toggle) =>
      toggle.setValue(p.showTimer).onChange(async (value) => {
        p.showTimer = value;
        await save();
      }),
    );
  new Setting(root)
    .setName("Countdown duration")
    .setDesc(
      "Minutes, from 1 to 1440. Changing this resets and pauses the timer.",
    )
    .addText((input) => {
      input.inputEl.type = "number";
      input.inputEl.min = "1";
      input.inputEl.max = "1440";
      input.inputEl.step = "1";
      input.inputEl.setAttribute("aria-label", "Countdown duration in minutes");
      input.setValue(String(p.countdownMinutes)).onChange(async (value) => {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 1 || n > 1440) return;
        p.countdownMinutes = n;
        if (session) session.reset();
        else data.timerRemainingMs = n * 60000;
        await save();
      });
    });
  new Setting(root)
    .setName("Show word count")
    .setDesc(
      "Show today’s tracked words and daily goal below the Scripts outline.",
    )
    .addToggle((toggle) =>
      toggle.setValue(p.showWordCount).onChange(async (value) => {
        p.showWordCount = value;
        await save();
      }),
    );
  let goalInput: HTMLInputElement | undefined;
  const goal = new Setting(root);
  const describeGoal = () => {
    const scope = data.selection?.scope,
      perProject = p.goalMode === "current-project" && scope;
    goal.setName(
      perProject
        ? `Daily goal for ${scope!.split("/").at(-1)}`
        : "Daily word goal",
    );
    goal.setDesc(
      perProject
        ? "This project’s daily target. Use 0 to hide goal progress."
        : "Default daily target. Use 0 to hide goal progress. Choose a project in Script Studio to set its own target in Current project mode.",
    );
    if (goalInput)
      goalInput.value = String(
        perProject ? (data.projectGoals[scope!] ?? p.dailyGoal) : p.dailyGoal,
      );
  };
  new Setting(root)
    .setName("Word goal counts")
    .setDesc(
      "Net new words from local editor changes today. Existing text, opening notes, renames and imported changes earn no words. Tracking starts when Marginalia loads.",
    )
    .addDropdown((drop) => {
      drop
        .addOption("all-projects", "All projects")
        .addOption("current-project", "Current project")
        .addOption("full-vault", "Full vault");
      drop.setValue(p.goalMode).onChange(async (value) => {
        p.goalMode = value as GoalMode;
        describeGoal();
        await save();
      });
    });
  goal.addText((input) => {
    goalInput = input.inputEl;
    goalInput.type = "number";
    goalInput.min = "0";
    goalInput.max = "10000000";
    goalInput.step = "1";
    goalInput.setAttribute("aria-label", "Daily word goal");
    input.onChange(async (value) => {
      if (!value.trim()) return;
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0 || n > 10000000) return;
      const scope = data.selection?.scope;
      if (p.goalMode === "current-project" && scope)
        data.projectGoals[scope] = n;
      else p.dailyGoal = n;
      await save();
    });
  });
  describeGoal();
  root.append(goal.settingEl);
}
