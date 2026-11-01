export const loadPdfJs = async () => ({});
export const editorInfoField = {} as any;
export const Platform = {isMobile: false};
export class Plugin {
  app: any;
  manifest = { id: "marginalia" };
  constructor(app: any) {
    this.app = app;
  }
  addCommand(_command:any) {}
  addRibbonIcon(_icon:string,_title:string,_callback:any) { return {remove(){}} as any; }
}
export class Component {}
export class MarkdownRenderChild { constructor(public containerEl: any) {} }
export class ItemView {}
export class WorkspaceLeaf {}
export class MarkdownView {
  file: any;
  editor: any;
  mode = "source";
  stateChanges: any[] = [];
  constructor(file: any, editor: any) {
    this.file = file;
    this.editor = editor;
  }
  getMode() {
    return this.mode;
  }
  async setState(state: any) {
    this.stateChanges.push(state);
    this.mode = state.mode;
  }
}
export class TFile {
  path: string;
  extension = "md";
  stat = { mtime: 1 };
  basename: string;
  constructor(path: string) {
    this.path = path;
    this.basename = path.split("/").at(-1)!.replace(/\.md$/, "");
  }
}
export class PluginSettingTab {}
export class Setting {}
export class Notice {
  constructor(_message: string) {}
}
export class FuzzySuggestModal {}
export class Modal {}
export const normalizePath = (path: string) => path.replace(/\\/g, "/").replace(/\/{2,}/g, "/").replace(/^\/(?!$)|\/$/g, "") || "/";
export const MarkdownRenderer = { render: async () => {} };
export const addIcon = () => {};
// Synthetic metadata codec covers the flat order fixtures used by host tests.
export function parseYaml(source: string): any {
  const result: Record<string, unknown> = {};
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) throw new Error("Invalid YAML");
    const key = match[1].replace(/^["']|["']$/g, ""),
      raw = match[2];
    result[key] = raw.startsWith('"') || raw.startsWith('[') || raw.startsWith('{') || raw === "null" || raw === "true" || raw === "false"
      ? JSON.parse(raw)
      : raw === ""
        ? null
        : /^\d+$/.test(raw)
          ? Number(raw)
          : raw;
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

export class TFolder { children: any[]=[]; constructor(public path:string){} }
export const setIcon = (_element:any,_name:string)=>{};
