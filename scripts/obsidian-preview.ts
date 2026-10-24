import { StateField } from "@codemirror/state";
export const editorInfoField = StateField.define<any>({create:()=>null,update:value=>value});
export const Platform = {isMobile: location.search.includes("mobile"),isAndroidApp: /Android/.test(navigator.userAgent)};
export class ItemView {
  app: any;
  contentEl: HTMLElement;
  constructor(leaf: any) {
    this.app = leaf.app;
    this.contentEl = leaf.contentEl ?? document.querySelector("#sidebar")!;
  }
  addChild(_child: any) {}
  removeChild(_child: any) {}
  async setState(_state: any, _result: any) {}
}
export class MarkdownView {}
export class TFile {
  basename: string;
  extension = "md";
  constructor(public path: string) {
    this.basename = path.split("/").at(-1)!.replace(/\.md$/, "");
  }
}
export class Notice {
  constructor(message: string) {
    const target = document.querySelector("#notice");
    if (target) target.textContent = message;
  }
}
export class Component {}
export class FuzzySuggestModal {}
export const normalizePath = (path: string) => path.replace(/\\/g, "/").replace(/\/{2,}/g, "/").replace(/^\/(?!$)|\/$/g, "") || "/";
export class Modal {
  modalEl = document.createElement("div");
  contentEl = document.createElement("div");
  constructor(public app: any) {}
  open() { this.contentEl.setAttribute("role", "dialog");this.modalEl.style.cssText="position:fixed;z-index:1000;inset:5vh 15vw;background:var(--background-primary);padding:20px;overflow:auto;";this.modalEl.append(this.contentEl); document.body.append(this.modalEl); (this as any).onOpen?.(); }
  close() { (this as any).onClose?.(); this.modalEl.remove(); }
}
export const MarkdownRenderer = {
  render: async (_app: any, text: string, el: HTMLElement) => {
    for (const block of text.split(/\n\n+/)) {
      if (/^## Page\s+\d/.test(block)) {
        const [title,...rest]=block.split("\n");
        const h=document.createElement("h2"); h.textContent=title.replace(/^## /, ""); el.append(h);
        if(rest.length) {const p=document.createElement("p");p.textContent=rest.join("\n");el.append(p);}
      } else if (/^> \[!panel\]/i.test(block)) {
        const callout=document.createElement("div");callout.className="callout";callout.dataset.callout="panel";
        const [title,...rest]=block.split("\n");
        const heading=document.createElement("div");heading.className="callout-title";heading.textContent=title.replace(/^> \[!panel\][+-]?\s*/i, "")||"Panel";
        const content=document.createElement("div");content.className="callout-content";content.textContent=rest.join("\n");
        callout.append(heading,content);el.append(callout);
      } else {const p=document.createElement("p");p.textContent=block;el.append(p);}
    }
  },
};
export function parseYaml(source: string): any {
  const result: Record<string, unknown> = {};
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (!m) throw new Error("Invalid YAML");
    const v = m[2];
    result[m[1]] = v.startsWith('"') || v.startsWith('[') || v.startsWith('{') || v === "null" || v === "true" || v === "false"
      ? JSON.parse(v)
      : /^\d+$/.test(v)
        ? Number(v)
        : v || null;
  }
  return result;
}
export function stringifyYaml(value: Record<string, unknown>): string {
  return (
    Object.entries(value)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join("\n") + "\n"
  );
}

export class Setting {
  settingEl: HTMLElement;
  name: HTMLElement;
  desc: HTMLElement;
  control: HTMLElement;
  constructor(root: HTMLElement) {
    this.settingEl = document.createElement("div");
    this.settingEl.className = "setting-item";
    this.name = document.createElement("label");
    this.desc = document.createElement("p");
    this.control = document.createElement("div");
    this.settingEl.append(this.name, this.desc, this.control);
    root.append(this.settingEl);
  }
  setName(value: string) {
    this.name.textContent = value;
    return this;
  }
  setDesc(value: string) {
    this.desc.textContent = value;
    return this;
  }
  addToggle(fn: any) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("aria-label", this.name.textContent!);
    this.control.append(input);
    fn({
      setValue: (value: boolean) => {
        input.checked = value;
        return {
          onChange: (cb: any) =>
            input.addEventListener("change", () => cb(input.checked)),
        };
      },
    });
    return this;
  }
  addText(fn: any) {
    const input = document.createElement("input");
    input.setAttribute("aria-label", this.name.textContent!);
    this.control.append(input);
    const api: any = {
      selectEl: input,
      inputEl: input,
      setPlaceholder: (v: string) => { input.placeholder = v; return api; },
      setValue: (v: string) => {
        input.value = v;
        return api;
      },
      onChange: (cb: any) => {
        input.addEventListener("input", () => cb(input.value));
        return api;
      },
    };
    fn(api);
    return this;
  }
  addDropdown(fn: any) {
    const input = document.createElement("select");
    input.setAttribute("aria-label", this.name.textContent!);
    this.control.append(input);
    const api: any = {
      selectEl: input,
      addOption: (v: string, label: string) => {
        input.add(new Option(label, v));
        return api;
      },
      setValue: (v: string) => {
        input.value = v;
        return api;
      },
      onChange: (cb: any) => {
        input.addEventListener("change", () => cb(input.value));
        return api;
      },
    };
    fn(api);
    return this;
  }
  addButton(fn: any) {
    const button = document.createElement("button");
    this.control.append(button);
    const api: any = {
      setButtonText: (text: string) => { button.textContent = text; return api; },
      setDisabled: (value: boolean) => { button.disabled = value; return api; },
      setCta: () => api,
      onClick: (callback: any) => { button.onclick = callback; return api; },
    };
    fn(api);
    return this;
  }
}

export class TFolder { children: any[]=[]; constructor(public path:string){} }
export const setIcon = (_element:any,_name:string)=>{};

export class Plugin {
  cleanups: (()=>void)[]=[];
  constructor(public app:any,public manifest:any){}
  register(callback:()=>void){this.cleanups.push(callback);}
  registerView(_type:string,_factory:any){}
  registerEvent(_event:any){}
  addCommand(_command:any){}
  dispose(){for(const cleanup of this.cleanups.reverse())cleanup();}
}
