import { el, button } from "../ui/sidebar.ts";
import type { ScriptController } from "./controller.ts";
import { clockLabel } from "./writing.ts";
import { TimerDurationModal } from "./timer.ts";
import { Notice } from "obsidian";
export function renderSessionFooter(
  controller: ScriptController,
  change: () => void,
): HTMLElement {
  const session = controller.session,
    data = session.data,
    p = data.preferences;
  const footer = el("div", "marginalia-writing-footer");
  footer.hidden = !data.selection || (!p.showTimer && !p.showWordCount);
  if (p.showTimer) {
    const row = el("div", "marginalia-writing-timer");
    const value = el(
      "span",
      "marginalia-writing-clock",
      clockLabel(session.remaining()),
    );
    value.setAttribute("aria-label", "Countdown remaining");
    value.setAttribute("role", "button");
    value.tabIndex = 0;
    value.dataset.key = "timer-duration";
    value.title = session.data.timerStarted ? "Reset or finish the session to change its duration" : "Double-click to change this session’s duration";
    const edit = () => {
      if (session.running || session.data.timerStarted) { new Notice("Finish or reset the session before changing its duration."); return; }
      new TimerDurationModal(controller, change).open();
    };
    value.ondblclick = edit;
    value.onkeydown = event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); edit(); } };
    const start = button(
      session.running ? "Pause" : "Start",
      () => {
        session.running ? session.pause() : session.start();
        change();
      },
      "marginalia-writing-timer-control",
    );
    start.setAttribute(
      "aria-label",
      session.running ? "Pause timer" : "Start timer",
    );
    start.dataset.key = "timer-toggle";
    const reset = button(
      "Reset",
      () => {
        session.reset();
        change();
      },
      "marginalia-writing-timer-control",
    );
    reset.setAttribute("aria-label", "Reset timer");
    reset.dataset.key = "timer-reset";
    row.append(value, start, reset);
    footer.append(row);
    if (session.remaining() === 0)
      footer.append(el("p", "marginalia-writing-complete", "Session complete"));
  }
  if (p.showWordCount) {
    const { words, goal, label } = session.progress();
    const row = el("div", "marginalia-writing-words");
    row.append(
      el("span", "marginalia-writing-label", `Today · ${label}`),
      el(
        "strong",
        "marginalia-writing-count",
        goal
          ? `${words.toLocaleString()} / ${goal.toLocaleString()} words`
          : `${words.toLocaleString()} words`,
      ),
    );
    footer.append(row);
    if (goal > 0) {
      const progress = el("progress", "marginalia-writing-goal");
      progress.max = goal;
      progress.value = Math.min(words, goal);
      progress.setAttribute("aria-label", "Daily word goal");
      footer.append(progress);
    }
  }
  return footer;
}
