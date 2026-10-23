import type { App } from "obsidian";
import { StateEffect, StateField, Transaction } from "@codemirror/state";
import {
  EditorView,
  showTooltip,
  type Tooltip,
  type KeyBinding,
} from "@codemirror/view";
import { isolateHistory } from "@codemirror/commands";
import {
  scriptSpeakers,
  filterSpeakers,
  type Speaker,
  type CharacterName,
} from "./speakers.ts";

export interface SpeakerPicker {
  from: number;
  to: number;
  candidates: Speaker[];
  query: string;
  selected: number;
}
export const openSpeakerPicker = StateEffect.define<SpeakerPicker>();
export const closeSpeakerPicker = StateEffect.define<null>();
const moveSpeaker = StateEffect.define<number>();
export const speakerPicker = StateField.define<SpeakerPicker | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(openSpeakerPicker)) return effect.value;
      if (effect.is(closeSpeakerPicker)) return null;
    }
    if (!value) return null;
    if (tr.docChanged) {
      let outside = false;
      tr.changes.iterChanges((from, to) => {
        if (from < value!.from || to > value!.to) outside = true;
      });
      if (outside) return null;
      const from = tr.changes.mapPos(value.from, -1),
        to = tr.changes.mapPos(value.to, 1);
      const query = tr.newDoc.sliceString(from, to);
      if (/[\r\n:*]/.test(query)) return null;
      value = { ...value, from, to, query, selected: 0 };
    }
    const selection = tr.newSelection;
    if (
      selection.ranges.length !== 1 ||
      selection.main.from < value.from ||
      selection.main.to > value.to
    )
      return null;
    for (const effect of tr.effects)
      if (effect.is(moveSpeaker)) {
        const count: number = filterSpeakers(value.candidates, value.query).length;
        value = {
          ...value,
          selected: count ? (value.selected + effect.value + count) % count : 0,
        };
      }
    return value;
  },
  provide: (field) =>
    showTooltip.from(field, (value) =>
      value
        ? ({
            pos: value.from,
            end: value.to,
            create: createSpeakerTooltip,
          } satisfies Tooltip)
        : null,
    ),
});
function createSpeakerTooltip(view: EditorView) {
  const doc = view.dom.ownerDocument;
  const dom = doc.createElement("div");
  dom.className = "marginalia-speaker-picker";
  dom.setAttribute("role", "listbox");
  dom.setAttribute("aria-label", "Characters used in this script");
  const draw = () => {
    const picker = view.state.field(speakerPicker);
    if (!picker) return;
    dom.replaceChildren();
    const choices = filterSpeakers(picker.candidates, picker.query);
    if (!choices.length) {
      const empty = doc.createElement("div");
      empty.className = "marginalia-speaker-empty";
      empty.textContent = "No matching character · Esc to keep typing";
      dom.append(empty);
    }
    choices.forEach((choice, index) => {
      const option = doc.createElement("button");
      option.type = "button";
      option.tabIndex = -1;
      option.className = "marginalia-speaker-option";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(index === picker.selected));
      const name = doc.createElement("span");
      name.textContent = choice.name;
      option.append(name);
      if (choice.path) {
        const path = doc.createElement("small");
        path.textContent = choice.path;
        option.append(path);
      }
      option.onmousedown = (event) => {
        event.preventDefault();
      };
      option.onclick = () => chooseSpeaker(view, choice);
      dom.append(option);
    });
    dom
      .querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  };
  draw();
  return { dom, update: draw };
}
export function chooseSpeaker(view: EditorView, choice?: Speaker) {
  const picker = view.state.field(speakerPicker, false);
  if (!picker || view.composing) return false;
  choice ??= filterSpeakers(picker.candidates, picker.query)[picker.selected];
  if (!choice) {
    view.dispatch({ effects: closeSpeakerPicker.of(null) });
    return false;
  }
  const tail = view.state.doc.sliceString(picker.to, picker.to + 12);
  if (!tail.startsWith(":** Dialogue")) {
    view.dispatch({ effects: closeSpeakerPicker.of(null) });
    return false;
  }
  const anchor = picker.from + choice.insert.length + 4;
  view.dispatch({
    changes: { from: picker.from, to: picker.to, insert: choice.insert },
    selection: { anchor, head: anchor + 8 },
    effects: closeSpeakerPicker.of(null),
    scrollIntoView: true,
    annotations: [
      isolateHistory.of("full"),
      Transaction.userEvent.of("input.complete"),
    ],
  });
  return true;
}
export const speakerKeys: KeyBinding[] = [
  ...(["ArrowDown", "ArrowUp"] as const).map((key, index) => ({
    key,
    run: (view: EditorView) => {
      if (!view.state.field(speakerPicker, false) || view.composing)
        return false;
      view.dispatch({ effects: moveSpeaker.of(index === 0 ? 1 : -1) });
      return true;
    },
  })),
  { key: "Enter", run: chooseSpeaker },
  { key: "Tab", run: chooseSpeaker },
  {
    key: "Escape",
    run: (view) => {
      if (!view.state.field(speakerPicker, false)) return false;
      view.dispatch({ effects: closeSpeakerPicker.of(null) });
      return true;
    },
  },
];
export const speakerBlur = EditorView.domEventHandlers({
  blur: (_event, view) => {
    if (view.state.field(speakerPicker, false))
      view.dispatch({ effects: closeSpeakerPicker.of(null) });
    return false;
  },
});

export function speakersForScript(
  app: App,
  path: string,
  text: string,
  metadata: Record<string, unknown>,
) {
  const characters: CharacterName[] = [];
  for (const file of app.vault.getMarkdownFiles()) {
    if (
      file.path
        .split("/")
        .some((p) => p.startsWith(".") || /^_?templates?$|^archive$/i.test(p))
    )
      continue;
    const cache = app.metadataCache.getFileCache(file),
      fields = cache?.frontmatter ?? {};
    const tags = [fields.tags, ...(cache?.tags ?? []).map((t) => t.tag)]
      .flat()
      .filter((s): s is string => typeof s === "string");
    if (
      !/(?:^|\/)(?:\d+\s+)?Characters?\//i.test(file.path) &&
      !tags.some((tag) => /(?:^|[\/#-])character$/i.test(tag)) &&
      fields.role !== "character-card"
    )
      continue;
    const aliases = [fields.aliases ?? fields.alias ?? []]
      .flat()
      .filter((s): s is string => typeof s === "string");
    characters.push({ path: file.path, name: file.basename, aliases });
  }
  return scriptSpeakers(
    text,
    metadata,
    characters,
    (target) => app.metadataCache.getFirstLinkpathDest(target, path)?.path,
  );
}
