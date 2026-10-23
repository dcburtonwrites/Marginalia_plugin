import { ItemView, type WorkspaceLeaf } from "obsidian";
import type { ScriptController } from "./controller.ts";
import { el, button } from "../ui/sidebar.ts";
export const STUDIO = "marginalia-script-studio";
export class StudioView extends ItemView {
  revision = 0;
  closed = false;
  constructor(
    leaf: WorkspaceLeaf,
    public controller: ScriptController,
  ) {
    super(leaf);
  }
  getViewType() {
    return STUDIO;
  }
  getDisplayText() {
    return "Script Studio";
  }
  getIcon() {
    return "marginalia-m";
  }
  async onOpen() {
    this.closed = false;
    await this.draw();
  }
  async onClose() {
    this.closed = true;
    this.revision++;
  }
  async draw() {
    const revision = ++this.revision;
    try {
      const groups = await this.controller.groups();
      if (this.closed || revision !== this.revision) return;
      const root = this.contentEl;
      root.replaceChildren();
      root.className = "view-content marginalia-studio";
      const content = el("div", "marginalia-studio-content");
      root.append(content);
      content.append(
        el("h1", "", "Script Studio"),
        el(
          "p",
          "marginalia-studio-intro",
          "Choose a project or grouping for this writing session.",
        ),
      );
      const projects = new Map<string, typeof groups>();
      for (const g of groups) {
        if (!projects.has(g.scope)) projects.set(g.scope, []);
        projects.get(g.scope)!.push(g);
      }
      if (!projects.size)
        content.append(
          el(
            "p",
            "marginalia-script-empty",
            "No scripts yet. Notes in a Scripts folder, or marked role: manuscript and format: comic-script, will appear here.",
          ),
        );
      for (const [scope, entries] of projects) {
        const section = el("section", "marginalia-studio-project");
        const choose = (group?: string) =>
          void this.controller
            .select({ scope, ...(group !== undefined ? { group } : {}) })
            .catch((e) => {
              const error = el("p", "marginalia-script-warning", String(e));
              section.append(error);
            });
        const heading = el("h2");
        const name = button(
          scope.split("/").at(-1) || scope,
          () => choose(),
          "marginalia-studio-project-name",
        );
        name.title = "Write in this project";
        heading.append(name);
        section.append(
          heading,
          el("p", "marginalia-studio-path", scope),
          el(
            "p",
            "marginalia-studio-summary",
            `${entries.length} ${entries.length === 1 ? "grouping" : "groupings"} · ${entries.reduce((n, g) => n + g.scripts.length, 0)} ${entries.reduce((n, g) => n + g.scripts.length, 0) === 1 ? "script" : "scripts"}`,
          ),
        );
        const list = el("div", "marginalia-studio-groups");
        for (const g of entries) {
          const row = button(
            g.group,
            () => choose(g.group),
            "marginalia-studio-group",
          );
          row.setAttribute(
            "aria-label",
            `${scope.split("/").at(-1)} > ${g.group}`,
          );
          row.append(
            el(
              "span",
              "marginalia-studio-group-count",
              `${g.scripts.length} ${g.scripts.length === 1 ? "script" : "scripts"}`,
            ),
          );
          list.append(row);
        }
        section.append(list);
        content.append(section);
      }
    } catch (error) {
      if (!this.closed && revision === this.revision)
        this.contentEl.replaceChildren(
          el(
            "p",
            "marginalia-script-warning",
            `Could not load Script Studio. ${String(error)}`,
          ),
        );
    }
  }
}
