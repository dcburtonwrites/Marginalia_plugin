import {readCanonTypes, readEntrySetup, typeTags, type CanonType, type EntrySetup} from "./setup-model.ts";
export type VaultType = "World" | "Storyboard";
export type ModuleName = "theme" | "scripts" | "librarian";
export interface WorkspaceSettings {
  modules: Record<ModuleName, boolean>;
  vaultType: VaultType;
  canonTypes: CanonType[];
  entrySetup: EntrySetup;
  projectStatusField: string;
  projectStatusOrder: string[];
  colors: boolean;
  navigation: boolean;
  hiddenFolders: string[];
  pins: string[];
  recents: string[];
}
export const defaultProjectStatusOrder = [
  "Foraged",
  "Dried",
  "Ground",
  "Brewed",
  "Distilled",
  "Bottled",
];
export const defaultHiddenFolders = ["_Assets"];
export function readHiddenFolders(value: unknown): string[] {
  const items = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n/) : [];
  const names = new Map<string, string>();
  for (const item of items) {
    if (typeof item !== "string") continue;
    const name = item.trim();
    if (/^_[^/\\]+$/.test(name) && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
  }
  return [...names.values()];
}
export function readStatusOrder(value: unknown): string[] {
  return [
    ...new Set(
      (Array.isArray(value)
        ? value
        : typeof value === "string"
          ? value.split(/\r?\n|→/)
          : []
      )
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item && !/^(all entries|unassigned)$/i.test(item)),
    ),
  ];
}
export function readWorkspace(value: unknown): WorkspaceSettings {
  const raw =
    value && typeof value === "object"
      ? (value as Partial<WorkspaceSettings>)
      : {};
  const paths = (v: unknown) =>
    Array.isArray(v)
      ? [
          ...new Set(
            v.filter((p): p is string => typeof p === "string" && eligible(p)),
          ),
        ].slice(0, 40)
      : [];
  return {
    modules: {
      theme: raw.modules?.theme !== false,
      scripts: raw.modules?.scripts !== false,
      librarian: raw.modules?.librarian !== false,
    },
    vaultType: raw.vaultType === "Storyboard" ? "Storyboard" : "World",
    canonTypes: readCanonTypes(raw.canonTypes),
    entrySetup: readEntrySetup(raw.entrySetup, raw.vaultType === "Storyboard"),
    projectStatusField:
      typeof raw.projectStatusField === "string" &&
      raw.projectStatusField.trim()
        ? raw.projectStatusField.trim()
        : "stage",
    projectStatusOrder:
      raw.projectStatusOrder === undefined
        ? [...defaultProjectStatusOrder]
        : readStatusOrder(raw.projectStatusOrder),
    colors: raw.colors !== false,
    navigation: raw.navigation !== false,
    hiddenFolders: raw.hiddenFolders === undefined ? [...defaultHiddenFolders] : readHiddenFolders(raw.hiddenFolders),
    pins: paths(raw.pins),
    recents: paths(raw.recents),
  };
}
export const entryTypes = [
  "Character",
  "Affiliation",
  "Location",
  "System",
  "Event",
  "Item",
  "Lore",
];
export function sharedFolders(folders: string[], hiddenFolders: string[] = defaultHiddenFolders) {
  const priority = ["crypt", "research", "collections"];
  const hidden = new Set(hiddenFolders.map(name => name.toLowerCase()));
  return [...new Set(folders)]
    .filter((path) => /^_[^/]+$/.test(path) && !hidden.has(path.toLowerCase()))
    .sort((a, b) => {
      const rank = (path: string) => {
        const index = priority.indexOf(path.slice(1).toLowerCase());
        return index < 0 ? priority.length : index;
      };
      return rank(a) - rank(b) || sectionName(a).localeCompare(sectionName(b));
    });
}
export function sectionName(section: string) {
  if (!section.startsWith("_")) return section;
  const name = section.slice(1);
  const label = name ? name.charAt(0).toUpperCase() + name.slice(1) : section;
  return [
    "Home",
    "Brainstorms",
    "Canon",
    "Projects",
    "Project Register",
  ].includes(label)
    ? `${label} (shared)`
    : label;
}
export function navigation(
  type: VaultType,
  _scripts = true,
  folders: string[] = [],
  hiddenFolders: string[] = defaultHiddenFolders,
) {
  return [
    ...(type === "Storyboard"
      ? ["Home", "Project Register", "Projects"]
      : ["Home", "Brainstorms", "Canon", "Projects"]),
    ...sharedFolders(folders, hiddenFolders),
  ];
}
export function sharedEntry(path: string, section: string, hiddenFolders: string[] = defaultHiddenFolders) {
  return (
    sharedFolders([section], hiddenFolders).length > 0 &&
    path.startsWith(section + "/") &&
    /\.md$/i.test(path) &&
    !path
      .split("/")
      .some((part, index) => part.startsWith(".") || (index > 0 && /^_?assets$/i.test(part)))
  );
}

export function eligible(path: string) {
  return (
    /\.md$/i.test(path) &&
    !path
      .split("/")
      .some(
        (p) =>
          p.startsWith(".") || /^(_?templates?|_?assets|archive)$/i.test(p),
      )
  );
}
export interface Entry {
  path: string;
  name: string;
  body: string;
  modified: number;
  created: number;
  fields: Record<string, unknown>;
  tags: string[];
  type?: string;
}
export interface Project {
  path: string;
  name: string;
  entries: Entry[];
  overview?: Entry;
}
export function entryType(path: string, tags: string[], configured?: CanonType[]) {
  const byFolder = configured?.filter(type=>
    (type.folder && path.startsWith(type.folder + "/")) ||
    (type.projectFolder && path.includes("/" + type.projectFolder + "/")))
    .sort((a,b)=>b.folder.length-a.folder.length)[0];
  if (byFolder) return byFolder.name;
  const mapped = configured?.find(type => tags.some(tag=>typeTags(type.name).includes(tag.toLowerCase())));
  if (mapped) return mapped.name;
  return (configured ? configured.map(type=>type.name) : entryTypes).find(
    (type) =>
      tags.some((tag) =>
        [
          type.toLowerCase(),
          `canon/${type.toLowerCase()}`,
          `project-${type.toLowerCase()}`,
        ].includes(tag.toLowerCase()),
      ) ||
      path
        .split("/")
        .slice(0, -1)
        .some(
          (part) =>
            part.replace(/^\d+\s+/, "").toLowerCase() === type.toLowerCase(),
        ),
  );
}
export function values(v: unknown): string[] {
  return [v]
    .flat()
    .filter((v) => ["string", "number", "boolean"].includes(typeof v))
    .map(String)
    .filter(Boolean);
}
export function field(entry: Entry | undefined, name: string) {
  return Object.entries(entry?.fields ?? {}).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  )?.[1];
}
export function projectStatuses(
  entry: Entry | undefined,
  settings: WorkspaceSettings,
) {
  return values(
    settings.vaultType === "Storyboard"
      ? field(entry, settings.projectStatusField)
      : (field(entry, "stage") ?? field(entry, "status")),
  );
}
export function projectStatusTabs(
  items: Project[],
  settings: WorkspaceSettings,
) {
  const known = new Set(settings.projectStatusOrder);
  const extra = [
    ...new Set(items.flatMap((p) => projectStatuses(p.overview, settings))),
  ]
    .filter((s) => !known.has(s) && s !== "Unassigned" && s !== "All Entries")
    .sort((a, b) => a.localeCompare(b));
  return [
    "All Entries",
    ...settings.projectStatusOrder,
    ...extra,
    "Unassigned",
  ];
}
/** Organizational folders are containers, unless an explicit project declaration identifies a real project. */
export function organizationalFolder(name:string){
  return /^(?:overviews?|dashboards?|project register|index|indexes)$/i.test(name.replace(/^\d+[ \-_]+/, "").trim());
}
export function projectResolver(settings:WorkspaceSettings, declarations:{path:string;tags?:string[];metadata?:Record<string,unknown>;fields?:Record<string,unknown>}[]=[]){
  const excluded=[settings.entrySetup.brainstorm.folder,...settings.canonTypes.map(type=>type.folder)].filter(Boolean);
  const safe=(path:string)=>!path.split("/").some(part=>part.startsWith(".")||part.startsWith("_")||/^archives?$/i.test(part));
  const valid=(path:string)=>path&&safe(path)&&!organizationalFolder(path.split("/").at(-1)!);
  const declared:string[]=[],legacy:string[]=[];
  for(const note of declarations){
    const metadata=note.metadata??note.fields??{},parent=note.path.slice(0,note.path.lastIndexOf("/"));
    if(note.tags?.includes("project-parent")||values(metadata.tags).includes("project-parent")||metadata.role==="project"){
      if(valid(parent))declared.push(parent);
    }else{
      const scripts=note.path.indexOf("/Scripts/");
      const inferred=scripts>=0 && metadata.role===undefined ? note.path.slice(0,scripts)
        : metadata.role==="manuscript"&&["script","comic-script"].includes(String(metadata.format)) ? (scripts>=0?note.path.slice(0,scripts):parent) : "";
      if(valid(inferred))legacy.push(inferred);
    }
  }
  declared.sort((a,b)=>b.length-a.length);legacy.sort((a,b)=>b.length-a.length);
  return (path:string,metadata:Record<string,unknown>={}):string|undefined=>{
    if(!safe(path)||excluded.some(folder=>path.startsWith(folder+"/")))return undefined;
    const marker=declared.find(parent=>path.startsWith(parent+"/"));
    if(marker)return marker;
    const explicit=typeof metadata.Project==="string"?metadata.Project.replace(/^\[\[|\]\]$/g,"").split("|")[0].replace(/\.md$/i,""):"";
    if(explicit && path.startsWith(explicit+"/") && safe(explicit) && !organizationalFolder(explicit.split("/").at(-1)!))return explicit;
    return projectPath(path,settings.vaultType,settings.entrySetup.projectsFolder)??legacy.find(parent=>path.startsWith(parent+"/"));
  };
}
export function projectPath(path: string, type: VaultType, root?: string) {
  const parts = path.split("/");
  if (root && root !== "/") {
    if (type === "World" && root === "08 Projects" && path.startsWith("08 Project/")) return projectPath(path,type);
    const prefix = root.replace(/\/+$/, "") + "/";
    const relative = path.startsWith(prefix) ? path.slice(prefix.length).split("/") : [];
    return relative.length > 1 && !organizationalFolder(relative[0]) ? prefix + relative[0] : undefined;
  }
  if (root === "/") type = "Storyboard";
  if (type === "World")
    return /^08 Projects?$/.test(parts[0]) && parts.length > 2 && !organizationalFolder(parts[1])
      ? parts.slice(0, 2).join("/")
      : undefined;
  return parts.length > 1 &&
    !parts[0].startsWith("_") &&
    !parts[0].startsWith(".") &&
    !/^archives?$/i.test(parts[0]) &&
    !organizationalFolder(parts[0])
    ? parts[0]
    : undefined;
}
export function projects(
  entries: Entry[],
  type: VaultType,
  folders: string[] = [],
  settings?: WorkspaceSettings,
): Project[] {
  const groups = new Map<string, Entry[]>();
  const configured=settings??readWorkspace({vaultType:type});
  const resolve=projectResolver(configured,entries);
  for (const path of folders)
    if (resolve(path + "/placeholder.md") === path)
      groups.set(path, []);
  for (const entry of entries) {
    const path = resolve(entry.path,entry.fields);
    if (path) {
      if (!groups.has(path)) groups.set(path, []);
      groups.get(path)!.push(entry);
    }
  }
  return [...groups]
    .map(([path, items]) => ({
      path,
      name: path.split("/").at(-1)!,
      entries: items,
      overview:
        items.find(
          (n) =>
            !n.path.slice(path.length + 1).includes("/") &&
            (n.tags.includes("project-parent") ||
              /overview|index/i.test(n.name)),
        ) ?? items.find((n) => n.tags.includes("project-parent")),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export function canon(entries: Entry[], includeProjects: boolean, settings?: WorkspaceSettings) {
  const resolve=projectResolver(settings??readWorkspace(undefined),entries);
  return entries.filter(
    (n) =>
      !!n.type &&
      !n.path.startsWith((settings?.entrySetup.brainstorm.folder ?? "00 Brainstorms") + "/") &&
      (resolve(n.path,n.fields)
        ? includeProjects && !/\/(Scripts|Outline|Plot|Outputs)\//i.test(n.path)
        : settings ? true
          : /^(\d+\s|Canon\/)/.test(n.path)),
  );
}
export function preview(body: string) {
  return body
    .replace(/^#{1,6}\s+.*$|^Side:\s*(Left|Right|Double Spread)\s*$/gm, "")
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|<!--[\s\S]*?-->/g, "")
    .replace(/!\[\[[^\]]+\]\]|!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(
      /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
      (_m, p, label) => label ?? p.split("/").at(-1),
    )
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/^\s*[>#]+\s*|\[![^\]]+\]|[*_`]/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260);
}
