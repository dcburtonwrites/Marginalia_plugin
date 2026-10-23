export interface CanonType { name: string; folder: string; projectFolder: string; template: string; }
export interface EntryRoute { name: string; folder: string; template: string; }
export interface EntrySetup { brainstorm: EntryRoute; projectsFolder: string; projectOptions: EntryRoute[]; }
export const projectOptions = ["New Project", "Overview", "Outline", "Plot Point", "Script", "Note"];
export const defaultCanonTypes: CanonType[] = [
  ["Lore","01 Lore"], ["Character","02 Character"], ["Affiliation","03 Affiliation"],
  ["Event","04 Event"], ["Item","05 Item"], ["System","06 System"], ["Location","07 Location"],
].map(([name,folder])=>({name,folder,projectFolder:name,template:`_templates/Canon/${name}.md`}));
export function defaultEntrySetup(storyboard = false): EntrySetup {
  return {brainstorm:{name:"Brainstorm",folder:"00 Brainstorms",template:"_templates/Brainstorm.md"},
    projectsFolder: storyboard ? "/" : "08 Projects",
    projectOptions: projectOptions.map(name=>({name,folder: name === "Script" ? "Scripts" : name === "Outline" ? "Outline" : name === "Plot Point" ? "Plot" : "",
      template:`_templates/Project/${name === "New Project" || name === "Overview" ? "Project Parent" : name === "Outline" ? "Plot" : name === "Note" ? "Project Note" : name}.md`}))};
}
const str = (v: unknown, fallback = "") => typeof v === "string" ? v.trim() : fallback;
export const typeSlug = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu,"-").replace(/^-+|-+$/g,"");
export const typeTags = (name: string) => [...new Set([name.toLowerCase(),typeSlug(name)])].flatMap(tag=>[tag,`canon/${tag}`,`project-${tag}`]);
export function readCanonTypes(value: unknown): CanonType[] {
  if (!Array.isArray(value)) return defaultCanonTypes.map(type=>({...type}));
  const names = new Set<string>();
  const slugs = new Set<string>();
  return value.flatMap(item=> {
    if (!item || typeof item !== "object") return [];
    const name = str(item.name);
    if (!name || !typeSlug(name) || slugs.has(typeSlug(name)) || names.has(name.toLowerCase()) || ["All Entries","Brainstorm","Canon","Project","Project Parent",...projectOptions].some(value=>value.toLowerCase()===name.toLowerCase())) return [];
    names.add(name.toLowerCase());
    slugs.add(typeSlug(name));
    return [{name,folder:str(item.folder),projectFolder:str(item.projectFolder,name),template:str(item.template)}];
  });
}
export function readEntrySetup(value: unknown, storyboard = false): EntrySetup {
  const defaults = defaultEntrySetup(storyboard);
  const raw = value && typeof value === "object" ? value as Partial<EntrySetup> : {};
  return {brainstorm:{...defaults.brainstorm,folder:str(raw.brainstorm?.folder,defaults.brainstorm.folder),template:str(raw.brainstorm?.template,defaults.brainstorm.template)},
    projectsFolder:str(raw.projectsFolder,defaults.projectsFolder) || "/",
    projectOptions:defaults.projectOptions.map(route=> {
      const stored = Array.isArray(raw.projectOptions) ? raw.projectOptions.find(row=>row && row.name === route.name) : undefined;
      return {...route,folder:str(stored?.folder,route.folder),template:str(stored?.template,route.template)};
    })};
}
/** No traversal, hidden storage or reserved template/archive destinations. */
export function folderPath(value: string) {
  const parts = value.trim().replace(/\\/g,"/").split("/").filter(Boolean);
  if (parts.some(part=>part === "." || part === ".." || part.startsWith(".") || /[:*?"<>|\[\]#^\u0000-\u001f]/.test(part) || /[. ]$/.test(part)))
    throw new Error("Use a vault-relative folder path without traversal or special filename characters.");
  if (parts.some(part=>/^(_?templates?|_?assets|archive)$/i.test(part))) throw new Error("Choose a destination outside template, Assets and Archive folders.");
  return parts.join("/") || "/";
}
export function entryName(value: string) {
  const name = value.trim().replace(/\.md$/i,"");
  if (!name || name.startsWith(".") || /[\\/:*?"<>|\[\]#^\u0000-\u001f]/.test(name) || /[. ]$/.test(name))
    throw new Error("Enter a title without path separators or special filename characters.");
  return name;
}
