import type { Expansion, Packet, Suggestion } from "../core/types.ts";
import { title } from "../core/types.ts";
import { suggest } from "./suggest.ts";
export type Tab = "Ask" | "Review" | "Library";
export interface Message {
  role: "user" | "assistant";
  text: string;
  packet?: Packet;
}
export interface SidebarState {
  target: string | null;
  pinned: boolean;
  tab: Tab;
  status: string;
  busy: boolean;
  progress?: string;
  error: string;
  suggestions: Suggestion[];
  messages: Message[];
  expansions: { entry: string; generatedAt: string }[];
  references: string[];
  referenceChoices?: {path: string; type: string}[];
}
export interface SidebarActions {
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
  tools.append(reset, button("Settings", a.settings, "marginalia-icon-button"));
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
  const entryActions = el("div", "marginalia-entry-actions");
  for (const [mode, label, desc] of [
    ["enhancement", "Entry Enhancement", "Review additions to this entry"],
    ["expansion", "Entry Expansion", "Read a fuller, supported synthesis"],
  ] as const) {
    const b = button("", () => a.run(mode), "marginalia-entry-action");
    b.disabled = !s.target || s.busy;
    b.append(el("strong", "", label), el("span", "marginalia-muted", desc));
    entryActions.append(b);
  }
  // Entry-writing workflows belong to Review; Ask stays conversational and
  // Library stays focused on reading saved artifacts.
  if (s.tab === "Review") root.append(entryActions);
  const scope = el("div", "marginalia-scope");
  scope.append(
    el("span", "marginalia-muted", "Search in"),
    el("span", "marginalia-scope-label", "This world"),
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
  root.append(scope);
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
  if (s.references.length) {
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
          s.target ? "Explore " + title(s.target) : "Your world, connected",
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
      if (m.packet) item.append(sources(m.packet, a));
      body.append(item);
    }
  } else if (s.tab === "Review") {
    const pending = s.suggestions.filter((x) => x.state === "pending");
    body.append(el("h3", "", "Entry Enhancement"));
    if (!pending.length)
      body.append(
        el(
          "p",
          "marginalia-muted",
          "Run Entry Enhancement to review proposed section additions. Your original note stays under your control.",
        ),
      );
    for (const suggestion of pending) {
      const card = el("article", "marginalia-suggestion");
      card.append(el("h4", "", suggestion.section));
      const prose = el("div", "marginalia-markdown");
      a.markdown(suggestion.prose, prose, suggestion.entry);
      card.append(prose, sources(suggestion.packet, a));
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
          new Date(expansion.generatedAt).toLocaleString(),
        ),
      );
      body.append(b);
    }
  }
  const footer = el("div", "marginalia-footer");
  if (s.busy) {
    const progress = el("div", "marginalia-progress");
    progress.setAttribute("role", "status");
    progress.append(
      el("span", "", s.progress || "Working locally…"),
      button("Cancel", a.cancel),
    );
    footer.append(progress);
  }
  const form = el("form", "marginalia-composer");
  const input = el("textarea");
  input.dataset.composer = "true";
  input.placeholder = "Ask the Librarian…";
  input.setAttribute("aria-label", "Ask the Librarian");
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
      a.ask(value);
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
  footer.append(
    form,
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
