import {
  icon,
  renderSidebar,
  type SidebarState,
  type SidebarActions,
} from "../src/ui/sidebar.ts";
import {bindOriginalLinks} from "../src/ui/original-links.ts";
import {cleanAnswer} from "../src/core/answers.ts";
import { retrieve } from "../src/core/retrieval.ts";
import type { Note } from "../src/core/types.ts";
const root = document.querySelector<HTMLElement>("#sidebar")!;
const target: Note = {
  path: "02 Character/Mira Vale.md",
  text: "## Summary\n\n## Backstory\n",
  mtime: 1,
  aliases: [],
  links: [],
  metadata: {},
};
const source: Note = {
  path: "01 Lore/Eastern Archive.md",
  text: "Mira Vale keeps the archive beneath the eastern observatory. Every morning she checks its copper locks before the first visitors arrive.",
  mtime: 1,
  aliases: [],
  links: [target.path],
  metadata: {},
};
const packet = retrieve([target, source], target);
const state: SidebarState = {
  vaultType:location.search.includes("reliability")?"Storyboard":"World",
  target: target.path,
  pinned: false,
  tab: "Ask",
  status: "Local · Ready",
  busy: false,
  error: "",
  suggestions: [],
  messages: [],
  expansions: [],
  references: [],
};
const pending = () => ({
  id: "sample",
  entry: target.path,
  section: "Summary",
  prose:
    "Mira Vale is the keeper of the archive beneath the eastern observatory. She checks its copper locks each morning before admitting the first visitors.",
  packet,
  state: "pending" as const,
});
const draw = () => renderSidebar(root, state, actions);
const actions: SidebarActions = {
  tab: (t) => {
    state.tab = t;
    draw();
  },
  pin: () => {
    state.pinned = !state.pinned;
    draw();
  },
  settings: () => {
    state.error =
      "Preview only. Local model settings are available in the Obsidian plugin.";
    draw();
  },
  newChat: () => {
    state.messages = [];
    draw();
  },
  run: (mode) => {
    if (mode === "enhancement") {
      state.suggestions.push(pending());
      state.tab = "Review";
    } else {
      state.expansions = [
        { entry: target.path, generatedAt: "2026-10-21T12:00:00-04:00" },
      ];
      state.tab = "Library";
    }
    draw();
  },
  ask: (text) => {
    state.messages.push(
      { role: "user", text },
      {
        role: "assistant",
        ...(location.search.includes("reliability")?cleanAnswer(`Mira keeps the archive [[01 Lore/Eastern Archive, ${packet.sources.find(s=>s.notePath===source.path)!.id}]]. [[Unknown note]] This answer now ends with an unfinished explanation because`,{...packet,omitted:2}):{text:"Mira Vale keeps the eastern archive beneath the observatory. Her morning routine is established; her earlier history is still unresolved."}),
        packet,
      },
    );
    state.tab = "Ask";
    draw();
  },
  cancel: () => {
    state.busy = false;
    draw();
  },
  insert: (s) => {
    s.state = "inserted";
    document.querySelector("#note-summary")!.textContent = s.prose;
    draw();
  },
  dismiss: (s) => {
    s.state = "dismissed";
    draw();
  },
  refine: (s, text) => {
    s.prose += " " + text;
    draw();
  },
  open: () => {
    state.error =
      "Preview: expansions open in a plugin-owned reading tab in Obsidian.";
    draw();
  },
  addReference: () => {
    state.references = [source.path];
    draw();
  },
  removeReference: (path) => {
    state.references = state.references.filter((p) => p !== path);
    draw();
  },
  source: (path) => {if(location.search.includes("reliability"))document.querySelector("main")!.textContent="Opened original: "+path;},
  markdown: (text, element) => {
    const p = document.createElement("p");
    if(location.search.includes("reliability")){
      let start=0;
      for(const match of text.matchAll(/\[\[([^\]|]+)\|([^\]]+)\]\]/g)){
        p.append(document.createTextNode(text.slice(start,match.index)));
        const link=document.createElement("a");link.className="internal-link";link.setAttribute("href",match[1]);link.setAttribute("data-href",match[1]);link.textContent=match[2];p.append(link);start=match.index!+match[0].length;
      }
      p.append(document.createTextNode(text.slice(start)));element.append(p);
      bindOriginalLinks(element,{registerDomEvent:(link:HTMLElement,event:string,handler:EventListener)=>link.addEventListener(event,handler)} as any,path=>actions.source(path));
    }else{p.textContent = text;element.append(p);}
  },
};
const params = new URLSearchParams(location.search);
if (params.get("theme") === "dark")
  document.documentElement.dataset.theme = "dark";
if (params.get("tab") === "review") {
  state.tab = "Review";
  state.suggestions = [pending()];
}
if (params.get("tab") === "library") {
  state.tab = "Library";
  state.expansions = [
    { entry: target.path, generatedAt: "2026-10-21T12:00:00-04:00" },
  ];
}
if (params.get("empty") === "1") state.target = null;
draw();

const toolbar = document.querySelector<HTMLElement>("#librarian-host-icon");
if (toolbar) icon(toolbar);
