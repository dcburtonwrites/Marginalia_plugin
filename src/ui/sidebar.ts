import {renderReviewWorkspace,type ReviewUIState,type ReviewUIActions} from "../librarian/ui.ts";
import type { Expansion, Packet, Suggestion } from "../core/types.ts";
import { title } from "../core/types.ts";
import { suggest } from "./suggest.ts";
export type Tab = "Ask" | "Review" | "Library";
export interface Message {
  role: "user" | "assistant";
  text: string;
  packet?: Packet;
  warnings?:string[];
}
export interface SidebarState {
  review?:ReviewUIState;
  vaultType?: "World"|"Storyboard";
  target: string | null;
  pinned: boolean;
  tab: Tab;
  status: string;
  busy: boolean;
  progress?: string;
  reviewAction?:"enhancement"|"expansion";
  error: string;
  suggestions: Suggestion[];
  messages: Message[];
  expansions: { entry: string; generatedAt: string; status?:string }[];
  references: string[];
  referenceChoices?: {path: string; type: string}[];
}
export interface SidebarActions {
  review?:ReviewUIActions;
  tab(tab: Tab): void;
  pin(): void;
  settings(): void;
  newChat(): void;
  run(mode: "enhancement" | "expansion"): void;
  ask(text: string): void;
  cancel(): void;
  insert(s: Suggestion): void;
  dismiss(s: Suggestion): void;
  refine(s: Suggestion, text: string): void;
  open(entry: string): void;
  addReference(path?: string): void;
  removeReference(path: string): void;
  source(path: string): void;
  markdown(text: string, el: HTMLElement, source: string): void;
}
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls = "",
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
export function button(
  label: string,
  fn: () => void,
  cls = "",
): HTMLButtonElement {
  const b = el("button", cls, label);
  b.type = "button";
  b.addEventListener("click", fn);
  return b;
}
export const lantern =
  '<path d="M9 5V4a3 3 0 0 1 6 0v1M7 6h10M8 6 5 19h14L16 6M6 22h12"/><path d="m12 9 1.1 3.1L16 13l-2.9 1L12 17l-1.1-3L8 13l2.9-.9Z" fill="currentColor" stroke="none"/>';
export function icon(parent: HTMLElement, body = lantern): void {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.7");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = body;
  parent.append(svg);
}
function sources(packet: Packet, a: SidebarActions): HTMLElement {
  const d = el("details", "marginalia-sources");
  d.append(
    el(
      "summary",
      "",
      `Sources consulted (${new Set(packet.sources.map((s) => s.notePath)).size})`,
    ),
    el(
      "p",
      "marginalia-muted",
      "Consulted sources do not verify every generated sentence.",
    ),
  );
  if (packet.omitted || packet.excluded)
    d.append(
      el(
        "p",
        "marginalia-muted",
        `${packet.omitted} passages omitted for context; ${packet.excluded} provisional or out-of-scope notes excluded.`,
      ),
    );
  if(packet.timeline){
    const timeline=el("details","marginalia-timeline-evidence");timeline.append(el("summary","",`Timeline context · ${packet.timeline.records.length} ${packet.timeline.records.length===1?"record":"records"} · ${packet.timeline.issues.length} ${packet.timeline.issues.length===1?"issue":"issues"}`));
    timeline.append(el("p","marginalia-muted",packet.timeline.coverage));
    if(packet.timeline.omitted)timeline.append(el("p","marginalia-muted",`${packet.timeline.omitted} timeline records, calendars or issues omitted for context.`));
    for(const record of packet.timeline.records){const line=el("div","marginalia-source");line.append(button(record.source,()=>a.source(record.source),"marginalia-source-link"),el("p","",`${record.field??(record.kind==="presence"?"Event presence":"Event")} · ${record.date??(record.dateStatus==="invalid"?"Invalid date":"Undated")}${record.effect?" · "+record.effect:""}${!record.active?" · "+(record.explanation??"Overridden"):""}`));timeline.append(line);}
    for(const issue of packet.timeline.issues){const line=el("div","marginalia-source");line.append(button(issue.path,()=>a.source(issue.path),"marginalia-source-link"),el("p","",`${issue.field?issue.field+": ":""}${issue.message}`));timeline.append(line);}
    d.append(timeline);
  }
  for (const s of packet.sources) {
    const unit = el("div", "marginalia-source");
    unit.append(
      button(
        `${s.id} · ${s.notePath}${s.page ? " · Page " + s.page : ""}`,
        () => a.source(s.notePath),
        "marginalia-source-link",
      ),
      el("blockquote", "", s.excerpt),
    );
    d.append(unit);
  }
  return d;
}
export function renderSidebar(
  root: HTMLElement,
  s: SidebarState,
  a: SidebarActions,
): void {
  const active = root.contains(document.activeElement)
    ? (document.activeElement as HTMLTextAreaElement)
    : null;
  const focusedComposer = !!active?.dataset.composer;
  const draft =
    root.dataset.entry === (s.target ?? "")
      ? root.querySelector<HTMLTextAreaElement>("textarea[data-composer]")
          ?.value
      : undefined;
  root.dataset.entry = s.target ?? "";
  root.replaceChildren();
  root.classList.add("marginalia-sidebar");
  const header = el("div", "marginalia-header");
  header.append(el("h2", "", "Librarian"));
  const tools = el("div", "marginalia-tools");
  const reset = button("New chat", a.newChat, "marginalia-icon-button");
  reset.title = "Start a new chat for this note";
  reset.disabled = s.busy;
  if(s.tab!=="Review")tools.append(reset);tools.append(button("Settings", a.settings, "marginalia-icon-button"));
  header.append(tools);
  root.append(header);
  const status = el("div", "marginalia-status");
  const dot = el("span", "marginalia-status-dot");
  if (!s.status.includes("Ready")) dot.classList.add("is-waiting");
  status.append(dot, el("span", "", s.status));
  root.append(status);
  const tabs = el("div", "marginalia-tabs");
  tabs.setAttribute("role", "tablist");
  for (const tab of ["Ask", "Review", "Library"] as Tab[]) {
    const b = button(tab, () => a.tab(tab), s.tab === tab ? "is-active" : "");
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(s.tab === tab));
    tabs.append(b);
  }
  root.append(tabs);
  const context = el("div", "marginalia-context");
  const topline = el("div", "marginalia-context-top");
  topline.append(el("span", "marginalia-muted", "Working with"));
  const pin = button(s.pinned ? "Unpin" : "Pin", a.pin, "marginalia-pin");
  pin.disabled = !s.target;
  pin.setAttribute("aria-pressed", String(s.pinned));
  topline.append(pin);
  context.append(
    topline,
    el("strong", "", s.target ? title(s.target) : "Open an entry"),
    el(
      "span",
      "marginalia-muted",
      s.pinned ? "Context pinned to this note" : "Follows your active note",
    ),
  );
  root.append(context);
  const selectedReview=s.review?s.review.mode:(s.suggestions.some(item=>item.state==="pending")?"enhancement":undefined);
  const entryActions = el("div", "marginalia-entry-actions");
  for (const [mode, label, desc] of [
    ["enhancement", "Entry Enhancement", "Find supported additions to individual sections. Review and insert each suggestion."],
    ["expansion", "Entry Expansion", "Read a fuller synthesis of established material, saved separately from your original."],
    ["development", "Entry Development", "Explore this entry through a guided conversation about its gaps, relationships and role in the story. Review proposed changes at the end."],
    ["vault", "Vault Review", "Examine story logic, underdeveloped ideas and connections across your chosen scope. Receive a source-linked development checklist."],
  ] as const) {
    const b = button("", () => {if(mode==="development"||mode==="vault")a.review?.select(mode);else a.run(mode);}, "marginalia-entry-action");
    if(selectedReview&&selectedReview!==mode)continue;
    b.disabled = (mode!=="vault"&&!s.target) || s.busy;
    b.append(el("strong", "", label));
    if(s.busy&&s.reviewAction===mode){const progress=el("span","marginalia-entry-progress",s.progress||"Working locally…");progress.setAttribute("role","status");b.setAttribute("aria-busy","true");b.append(progress);}
    else b.append(el("span","marginalia-muted",desc));
    entryActions.append(b);
  }
  // Entry-writing workflows belong to Review; Ask stays conversational and
  // Library stays focused on reading saved artifacts.
  if (s.tab === "Review" && (!selectedReview||s.busy&&s.reviewAction)) root.append(entryActions);
  const scope = el("div", "marginalia-scope");
  scope.append(
    el("span", "marginalia-muted", "Search in"),
    el("span", "marginalia-scope-label", s.vaultType==="Storyboard"?"This project":"This world"),
  );
  const ref = button("Pin a reference", () => {
    if (!s.referenceChoices) { a.addReference(); return; }
    picker.hidden = !picker.hidden;
    ref.setAttribute("aria-expanded", String(!picker.hidden));
    if (!picker.hidden) referenceInput.focus();
  });
  ref.disabled = s.busy || !s.target;
  ref.setAttribute("aria-expanded", "false");
  scope.append(ref);
  if(s.tab!=="Review"||selectedReview)root.append(scope);
  const picker = el("div", "marginalia-reference-picker");
  picker.hidden = true;
  const referenceType = el("select");
  referenceType.setAttribute("aria-label", "Reference type");
  for (const type of ["All types", ...new Set(s.referenceChoices?.map(choice=>choice.type))]) {
    const option = el("option", "", type); option.value = type; referenceType.append(option);
  }
  const referenceInput = el("input");
  referenceInput.placeholder = "Type a note name or path…";
  referenceInput.setAttribute("aria-label", "Reference note");
  picker.append(referenceType, referenceInput);
  root.append(picker);
  const referenceSuggestions = suggest(referenceInput, () => (s.referenceChoices ?? [])
    .filter(choice => !s.references.includes(choice.path) &&
      (referenceType.value === "All types" || choice.type === referenceType.value))
    .map(choice=>choice.path));
  const pinReference = () => {
    const choice = s.referenceChoices?.find(choice=>choice.path === referenceInput.value);
    if (choice && (referenceType.value === "All types" || choice.type === referenceType.value)) a.addReference(choice.path);
  };
  referenceInput.onchange = pinReference;
  referenceInput.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); pinReference(); } });
  referenceType.onchange = () => { referenceInput.value=""; referenceInput.focus(); referenceSuggestions.refresh(); };
  if (s.references.length&&(s.tab!=="Review"||selectedReview)) {
    const refs = el("div", "marginalia-references");
    for (const path of s.references) {
      const b = button(title(path) + " ×", () => a.removeReference(path));
      b.title = "Remove reference " + path;
      refs.append(b);
    }
    root.append(refs);
  }
  if (s.error) {
    const error = el("div", "marginalia-error", s.error);
    error.setAttribute("role", "alert");
    root.append(error);
  }
  const body = el("div", "marginalia-body");
  body.setAttribute("role", "tabpanel");
  body.setAttribute("aria-label", s.tab);
  root.append(body);
  if (s.tab === "Ask") {
    if (!s.messages.length) {
      const welcome = el("div", "marginalia-welcome");
      const mark = el("div", "marginalia-welcome-icon");
      icon(mark);
      welcome.append(
        mark,
        el(
          "h3",
          "",
          s.target ? "Explore " + title(s.target) : s.vaultType==="Storyboard"?"Your project, connected":"Your world, connected",
        ),
        el(
          "p",
          "marginalia-muted",
          "Ask about this entry, find references, or develop the note.",
        ),
      );
      for (const q of [
        "What have I established about this entry?",
        "Find its appearances",
        "Which details are still unresolved?",
      ]) {
        const b = button(q, () => a.ask(q), "marginalia-prompt");
        b.disabled = !s.target || s.busy;
        welcome.append(b);
      }
      body.append(welcome);
    }
    for (const m of s.messages) {
      const item = el("article", "marginalia-message is-" + m.role);
      item.append(
        el(
          "span",
          "marginalia-message-role",
          m.role === "user" ? "You" : "Librarian",
        ),
      );
      const content = el("div", "marginalia-markdown");
      a.markdown(m.text, content, s.target ?? "");
      item.append(content);
      for(const warning of m.warnings??[]){const notice=el("p","marginalia-answer-warning",warning);notice.setAttribute("role","status");item.append(notice);}
      if (m.packet) item.append(sources(m.packet, a));
      body.append(item);
    }
  } else if (s.tab === "Review") {
    const pending = s.suggestions.filter((x) => x.state === "pending");
    const handled=s.review&&a.review?renderReviewWorkspace(body,s.review,a.review,s.busy,s.target,a):false;
    if(!handled&&selectedReview){body.append(button("Back to Review",()=>a.review?.back()));body.append(el("h3", "",selectedReview==="expansion"?"Entry Expansion":"Entry Enhancement"));}
    if (!handled&&selectedReview&&!pending.length)
      body.append(
        el(
          "p",
          "marginalia-muted",
          "Run Entry Enhancement to review proposed section additions. Your original note stays under your control.",
        ),
      );
    for (const suggestion of handled||selectedReview!=="enhancement"?[]:pending) {
      const card = el("article", "marginalia-suggestion");
      card.append(el("h4", "", suggestion.section));
      const prose = el("div", "marginalia-markdown");
      a.markdown(suggestion.prose, prose, suggestion.entry);
      card.append(prose);
      for(const warning of suggestion.warnings??[]){const notice=el("p","marginalia-answer-warning",warning);notice.setAttribute("role","status");card.append(notice);}
      card.append(sources(suggestion.packet, a));
      const actions = el("div", "marginalia-review-actions");
      const insert = button(
        "Insert into note",
        () => a.insert(suggestion),
        "mod-cta",
      );
      const dismiss = button("Dismiss", () => a.dismiss(suggestion));
      insert.disabled = dismiss.disabled = s.busy;
      actions.append(insert, dismiss);
      card.append(actions);
      const refine = el("form", "marginalia-refine");
      const input = el("input");
      input.placeholder = "Refine this suggestion…";
      input.setAttribute("aria-label", "Refinement for " + suggestion.section);
      const send = button("Refine", () => {});
      send.type = "submit";
      send.disabled = s.busy;
      refine.append(input, send);
      refine.addEventListener("submit", (e) => {
        e.preventDefault();
        if (input.value.trim()) a.refine(suggestion, input.value.trim());
      });
      card.append(refine);
      body.append(card);
    }
  } else {
    if(s.review?.index.length){body.append(el("h3","","Development and review workspaces"));for(const saved of [...s.review.index].sort((a,b)=>b.updated.localeCompare(a.updated))){body.append(button(`${saved.kind==="development"?"Development":"Vault Review"} · ${saved.entry?title(saved.entry):"Vault"} · ${new Date(saved.updated).toLocaleString()}`,()=>a.review?.resume(saved.id),"marginalia-library-item"));}}
    body.append(
      el("h3", "", "Expansions"),
      el(
        "p",
        "marginalia-muted",
        "Generated reference entries. Originals remain unchanged.",
      ),
    );
    if (!s.expansions.length)
      body.append(
        el(
          "p",
          "marginalia-empty",
          "No saved expansions yet. Use Entry Expansion on an entry to create one.",
        ),
      );
    for (const expansion of s.expansions) {
      const b = button(
        "",
        () => a.open(expansion.entry),
        "marginalia-library-item",
      );
      b.append(
        el("strong", "", title(expansion.entry)),
        el("span", "marginalia-muted", expansion.entry),
        el(
          "span",
          "marginalia-muted",
          expansion.status ?? new Date(expansion.generatedAt).toLocaleString(),
        ),
      );
      body.append(b);
    }
  }
  const footer = el("div", "marginalia-footer");
  if (s.busy) {
    const progress = el("div", "marginalia-progress");
    progress.setAttribute("role", "status");
    if(!(s.tab==="Review"&&s.reviewAction))progress.append(el("span", "", s.progress || "Working locally…"));
    progress.append(button("Cancel", a.cancel));
    footer.append(progress);
  }
  const form = el("form", "marginalia-composer");
  const input = el("textarea");
  input.dataset.composer = "true";
  const development=s.tab==="Review"&&s.review?.mode==="development"&&s.review.doc?.kind==="development"&&s.review.doc.status==="active";
  input.placeholder = development?"Develop this entry…":"Ask the Librarian…";
  input.setAttribute("aria-label", development?"Reply in Development":"Ask the Librarian");
  input.value = draft ?? "";
  input.rows = 2;
  input.disabled = !s.target || s.busy;
  const send = button("Send", () => {}, "mod-cta");
  send.type = "submit";
  send.disabled = !s.target || s.busy;
  form.append(input, send);
  const submit = () => {
    if (input.value.trim() && !s.busy) {
      const value = input.value;
      input.value = "";
      if(development)a.review?.reply(value);else a.ask(value);
    }
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submit();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      submit();
    }
  });
  if(s.tab!=="Review"||development)footer.append(form);
  footer.append(
    el(
      "p",
      "marginalia-footnote",
      "Uses original sources · Changes need review",
    ),
  );
  root.append(footer);
  if (focusedComposer && draft !== undefined) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}
