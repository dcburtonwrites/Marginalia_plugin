import type { App } from "obsidian";

/** A free-text field with a keyboard-accessible, locally filtered dropdown. */
export function suggest(input: HTMLInputElement, choices: () => string[]) {
  const doc = input.ownerDocument;
  const wrapper = doc.createElement("span");
  wrapper.className = "marginalia-suggest";
  input.replaceWith(wrapper);
  wrapper.append(input);
  const list = doc.createElement("div");
  list.className = "marginalia-suggest-list";
  list.id = `marginalia-suggest-${++suggestId}`;
  list.setAttribute("role", "listbox");
  list.hidden = true;
  wrapper.append(list);
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", list.id);
  input.setAttribute("aria-expanded", "false");
  let matches: string[] = [], selected = -1;
  const close = () => {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    selected = -1;
  };
  const choose = (value: string) => {
    input.value = value;
    input.dispatchEvent(new Event("input", {bubbles:true}));
    input.dispatchEvent(new Event("change", {bubbles:true}));
    close();
  };
  const paint = () => {
    list.replaceChildren();
    matches.forEach((value, index) => {
      const item = doc.createElement("button");
      item.type = "button";
      item.textContent = value || "/";
      item.id = `${list.id}-${index}`;
      item.tabIndex = -1;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(index === selected));
      item.onmousedown = event => event.preventDefault();
      item.onclick = () => choose(value);
      list.append(item);
    });
    list.hidden = !matches.length;
    input.setAttribute("aria-expanded", String(!!matches.length));
    if (selected >= 0) {
      input.setAttribute("aria-activedescendant", `${list.id}-${selected}`);
      list.children[selected]?.scrollIntoView({block:"nearest"});
    } else input.removeAttribute("aria-activedescendant");
  };
  const refresh = () => {
    const bounds = input.getBoundingClientRect();
    const height = doc.defaultView?.innerHeight ?? 800;
    list.style.position="fixed";list.style.left=`${bounds.left}px`;list.style.width=`${bounds.width}px`;
    const above = height-bounds.bottom < 160 && bounds.top > 180;
    list.style.top=above ? "auto" : `${bounds.bottom+3}px`;
    list.style.bottom=above ? `${height-bounds.top+3}px` : "auto";
    list.style.maxHeight=`${Math.max(80,Math.min(240,above?bounds.top-12:height-bounds.bottom-12))}px`;
    const query = input.value.toLocaleLowerCase();
    matches = [...new Set(choices())].filter(value => value.toLocaleLowerCase().includes(query))
      .sort((a,b)=>a.localeCompare(b)).slice(0,60);
    selected = -1;
    paint();
  };
  input.addEventListener("focus", refresh);
  input.addEventListener("input", refresh);
  input.addEventListener("blur", close);
  input.addEventListener("keydown", event => {
    if (event.isComposing) return;
    if (event.key === "Escape" && !list.hidden) {
      event.preventDefault(); event.stopPropagation(); close();
    } else if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      if (list.hidden) refresh();
      if (!matches.length) return;
      event.preventDefault(); event.stopPropagation();
      selected = event.key === "ArrowDown" ? (selected + 1) % matches.length
        : (selected <= 0 ? matches.length - 1 : selected - 1);
      paint();
    } else if ((event.key === "Enter" || event.key === "Tab") && !list.hidden && selected >= 0) {
      event.preventDefault(); event.stopImmediatePropagation(); choose(matches[selected]);
    }
  });
  return {refresh, close};
}
let suggestId = 0;

export function vaultFiles(app: App) { return app.vault.getMarkdownFiles().map(file=>file.path); }
export function vaultFolders(app: App) {
  return app.vault.getAllLoadedFiles().filter(file => "children" in file && !file.path.split("/").some(p=>p.startsWith(".")))
    .map(file=>file.path).filter(Boolean);
}
export function propertyNames(app: App) {
  return [...new Set(app.vault.getMarkdownFiles().flatMap(file=>
    Object.keys(app.metadataCache.getFileCache(file)?.frontmatter ?? {}).filter(key=>key!=="position")))];
}
export function propertyValues(app: App, field: string) {
  return [...new Set(app.vault.getMarkdownFiles().flatMap(file=> {
    const fm = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    const value = Object.entries(fm).find(([key])=>key.toLowerCase()===field.trim().toLowerCase())?.[1];
    return [value].flat().filter(item=>["string","number","boolean"].includes(typeof item))
      .map(item=>String(item).trim()).filter(Boolean);
  }))];
}
