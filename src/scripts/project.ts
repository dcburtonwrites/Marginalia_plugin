import {
  Component,
  ItemView,
  MarkdownRenderer,
  type WorkspaceLeaf,
} from "obsidian";
import type { ScriptController } from "./controller.ts";
import { frontmatter } from "./properties.ts";
import { el, button } from "../ui/sidebar.ts";
export const PROJECT = "marginalia-project";
export class ProjectView extends ItemView {
  projectScope = "";
  group?: string;
  revision = 0;
  pagesCollapsed = false;
  panelsCollapsed = false;
  setFolds(mode: "collapse" | "panels" | "expand" | "expand-panels") {
    if (mode !== "expand-panels") this.pagesCollapsed = mode === "collapse";
    this.panelsCollapsed = mode === "collapse" || mode === "panels";
    this.applyFolds();
  }
  applyFolds() {
    for (const detail of this.contentEl.querySelectorAll<HTMLDetailsElement>(".marginalia-reading-fold")) {
      detail.open = !(detail.classList.contains("marginalia-fold-panel") ? this.panelsCollapsed : this.pagesCollapsed);
    }
  }
  foldStatus() {
    return {
      any: !!this.contentEl.querySelector(".marginalia-reading-fold:not([open])"),
      panels: !!this.contentEl.querySelector(".marginalia-fold-panel:not([open])"),
    };
  }
  component: Component | null = null;
  closed = false;
  constructor(
    leaf: WorkspaceLeaf,
    public controller: ScriptController,
  ) {
    super(leaf);
  }
  getViewType() {
    return PROJECT;
  }
  getDisplayText() {
    return this.projectScope
      ? `${this.projectScope.split("/").at(-1)} · Project`
      : "Project";
  }
  getIcon() {
    return "marginalia-m";
  }
  getState() {
    return { scope: this.projectScope, group: this.group };
  }
  async setState(
    state: { scope?: string; group?: string },
    result: { history: boolean },
  ) {
    this.projectScope = state.scope ?? "";
    this.group = state.group;
    await super.setState(state, result);
    await this.draw();
  }
  async onOpen() {
    this.closed = false;
    await this.draw();
  }
  async onClose() {
    this.closed = true;
    this.revision++;
    if (this.component) this.removeChild(this.component);
    this.component = null;
  }
  async draw() {
    const revision = ++this.revision;
    try {
      const groups = (await this.controller.groups()).filter(
        (g) =>
          g.scope === this.projectScope &&
          (this.group === undefined || g.group === this.group),
      );
      if (this.closed || revision !== this.revision) return;
      if (this.component) this.removeChild(this.component);
      const component = new Component();
      this.addChild(component);
      this.component = component;
      const root = this.contentEl;
      root.replaceChildren();
      root.className = "view-content marginalia-project-reading";
      root.append(
        el("h1", "", this.projectScope.split("/").at(-1) || "Project"),
        el(
          "p",
          "marginalia-script-caption",
          "Project reading view · edit each script in its own note",
        ),
      );
      if (!groups.length)
        root.append(el("p", "", "No scripts in this project."));
      for (const group of groups) {
        root.append(el("h2", "marginalia-project-group", group.group));
        if (group.issues.length)
          root.append(
            el(
              "p",
              "marginalia-script-warning",
              "Reading order is unresolved. Arrange this group in Scripts to repair its predecessor links.",
            ),
          );
        for (const script of group.sequences.flat()) {
          const article = el("article", "marginalia-project-script");
          article.dataset.path = script.path;
          const name =
            typeof script.metadata.Title === "string"
              ? script.metadata.Title
              : script.path.split("/").at(-1)!.replace(/\.md$/, "");
          const heading = el("h2");
          heading.append(
            button(
              name,
              () =>
                void this.app.workspace.openLinkText(script.path, "", false),
              "marginalia-project-script-link",
            ),
          );
          article.append(heading);
          const body = el("div", "markdown-rendered");
          article.append(body);
          root.append(article);
          await MarkdownRenderer.render(
            this.app,
            script.text.slice(frontmatter(script.text)?.body ?? 0),
            body,
            script.path,
            component,
          );
          if (this.closed || revision !== this.revision) return;
          prepareReadingFolds(body);
        }
      }
      this.applyFolds();
    } catch (error) {
      if (!this.closed && revision === this.revision)
        this.contentEl.replaceChildren(
          el(
            "p",
            "marginalia-script-warning",
            `Could not open project. ${String(error)}`,
          ),
        );
    }
  }
}

/** View-only disclosures; rendered source remains untouched. */
export function prepareReadingFolds(root: HTMLElement) {
  for (const callout of root.querySelectorAll<HTMLElement>('.callout[data-callout="panel"]')) {
    const detail = document.createElement("details");
    detail.className = "marginalia-reading-fold marginalia-fold-panel";
    detail.open = true;
    const summary = document.createElement("summary");
    summary.textContent = callout.querySelector(".callout-title")?.textContent || "Panel";
    callout.before(detail);
    callout.classList.remove("is-collapsed");
    detail.append(summary, callout);
  }
  let page: HTMLDetailsElement | undefined;
  for (const child of [...root.children]) {
    if (/^H[1-6]$/.test(child.tagName) && /^Page\s+\d+/i.test(child.textContent || "")) {
      page = document.createElement("details");
      page.className = "marginalia-reading-fold marginalia-fold-page";
      page.open = true;
      child.before(page);
      const summary = document.createElement("summary");
      summary.append(child);
      page.append(summary);
    } else if (page) page.append(child);
  }
}
