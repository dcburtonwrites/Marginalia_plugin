import {mountContentControls,removeContentControls} from './content-controls.ts';
import {
  Component,
  ItemView,
  MarkdownRenderer,
  type WorkspaceLeaf,
} from "obsidian";
import type { ScriptController } from "./controller.ts";
import { numberRenderedScript } from "./numbering.ts";
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
  articles=new Map<string,{text:string;name:string;node:HTMLElement;component:Component}>();
  lastRender="";
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
    removeContentControls(this.containerEl??this.contentEl);
    this.revision++;
    for(const article of this.articles.values())this.removeChild(article.component);
    this.articles.clear();
    this.lastRender="";
  }
  async draw() {
    const revision = ++this.revision;
    let staged:Component[]=[];
    try {
      const groups = (await this.controller.groups()).filter(
        (g) =>
          g.scope === this.projectScope &&
          (this.group === undefined || g.group === this.group),
      );
      if (this.closed || revision !== this.revision) return;
      const signature=JSON.stringify([this.projectScope,this.group,groups.map(group=>[group.group,group.issues,group.sequences.map(sequence=>sequence.map(script=>[script.path,script.text,script.metadata.Title]))])]);
      if(signature===this.lastRender)return;
      const prepared=new Map<string,{text:string;name:string;node:HTMLElement;component:Component}>();
      const root=document.createDocumentFragment();
      const reused=new Map<HTMLElement,HTMLElement>();
      const scroll=this.contentEl.scrollTop;
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

          const name =
            typeof script.metadata.Title === "string"
              ? script.metadata.Title
              : script.path.split("/").at(-1)!.replace(/\.md$/, "");
          const existing=this.articles.get(script.path);
          if(existing?.text===script.text&&existing.name===name){prepared.set(script.path,existing);const placeholder=el("span");reused.set(placeholder,existing.node);root.append(placeholder);continue;}
          const article=el("article","marginalia-project-script");article.dataset.path=script.path;
          const component=new Component();this.addChild(component);staged.push(component);
          prepared.set(script.path,{text:script.text,name,node:article,component});
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
          if (this.closed || revision !== this.revision){
            for(const [path,record] of prepared)if(this.articles.get(path)!==record)this.removeChild(record.component);
            return;
          }
          numberRenderedScript(body, script);
          prepareReadingFolds(body);
          for(const detail of body.querySelectorAll<HTMLDetailsElement>('.marginalia-reading-fold'))detail.open=!(detail.classList.contains('marginalia-fold-panel')?this.panelsCollapsed:this.pagesCollapsed);
        }
      }
      for(const [path,record] of this.articles)if(prepared.get(path)!==record)this.removeChild(record.component);
      for(const [placeholder,node] of reused)placeholder.replaceWith(node);
      this.articles=prepared;this.lastRender=signature;staged=[];
      this.contentEl.className="view-content marginalia-project-reading";
      this.contentEl.replaceChildren(root);this.contentEl.scrollTop=scroll;
      mountContentControls(this.containerEl??this.contentEl,"project:"+this.projectScope+":"+this.group).apply();
    } catch (error) {
      for(const component of staged)this.removeChild(component);
      this.lastRender="";
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
