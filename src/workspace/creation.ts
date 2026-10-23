import { Modal, Setting, TFile, TFolder, Notice, normalizePath } from "obsidian";
import type Marginalia from "../main.ts";
import { el } from "../ui/sidebar.ts";
import { suggest, vaultFiles, vaultFolders } from "../ui/suggest.ts";
import { propertySource, scriptMetadata } from "../scripts/controller.ts";
import { projects, type WorkspaceSettings } from "./model.ts";
import { entryName, folderPath, typeSlug, typeTags } from "./setup-model.ts";

export interface EntryRequest {
  kind: "Brainstorm" | "Canon" | "Project";
  subtype: string;
  title: string;
  folder: string;
  template: string;
  createFolders: boolean;
  project?: string;
}
export function templateMatch(files: string[], preferred: string, subtype: string) {
  if (files.includes(preferred)) return preferred;
  const aliases = subtype === "New Project" || subtype === "Overview" ? ["Project Parent","Overview"]
    : subtype === "Outline" ? ["Outline","Plot"] : subtype === "Note" ? ["Project Note","Note"]
    : subtype === "Script" ? ["Script","Comic Script"] : [subtype];
  return files.filter(path=>/\/(?:_?templates?)\//i.test("/"+path)).sort().find(path=>
    aliases.some(name=>path.split("/").at(-1)?.toLowerCase() === name.toLowerCase()+".md")) ?? "";
}
export function entryDefaults(settings: WorkspaceSettings, kind: EntryRequest["kind"], subtype: string, project?: string) {
  const setup = settings.entrySetup;
  const canon = settings.canonTypes.find(type=>type.name === subtype);
  if (kind === "Brainstorm") return {folder:setup.brainstorm.folder,template:setup.brainstorm.template};
  if (kind === "Canon") return {folder:canon?.folder ?? "",template:canon?.template ?? ""};
  if (subtype === "New Project") return {folder:setup.projectsFolder,template:setup.projectOptions.find(route=>route.name===subtype)?.template ?? ""};
  const route = setup.projectOptions.find(route=>route.name===subtype);
  const relative = route?.folder ?? canon?.projectFolder ?? "";
  return {folder:project ? normalizePath(`${project}/${relative}`) : "",template:route?.template ?? canon?.template ?? ""};
}

const creating = new WeakSet<object>();
export async function createEntry(owner: Marginalia, request: EntryRequest) {
  if (creating.has(owner)) throw new Error("Another entry is being created. Try again shortly.");
  if (!owner.workspaceSettings.modules.theme) throw new Error("Enable Theme to create entries from these pages.");
  const title = entryName(request.title);
  if (!request.folder.trim()) throw new Error("Choose a destination folder. Use / for the vault root.");
  const destination = folderPath(request.folder);
  const isProject = request.kind === "Project" && request.subtype === "New Project";
  const script = request.kind === "Project" && request.subtype === "Script";
  const canonical = owner.workspaceSettings.canonTypes.find(type=>type.name===request.subtype);
  if ((request.kind === "Canon" && !canonical) || (request.kind === "Project" &&
    !owner.workspaceSettings.entrySetup.projectOptions.some(route=>route.name===request.subtype) && !canonical))
    throw new Error("Choose a configured entry subtype.");
  if (script && (!owner.workspaceSettings.modules.scripts || !owner.scriptController))
    throw new Error("Enable Scripts before creating a script.");
  const {vault, workspace} = owner.app;
  if (request.kind === "Project" && !isProject) {
    if (!request.project || !(vault.getAbstractFileByPath(request.project) instanceof TFolder))
      throw new Error("Choose an existing project folder first.");
    if (destination !== request.project && !destination.startsWith(request.project + "/"))
      throw new Error("Choose a destination within the selected project.");
  }
  const folder = isProject ? normalizePath(`${destination}/${title}`) : destination;
  const path = normalizePath(`${folder}/${isProject ? "Overview" : title}.md`);
  if (vault.getAbstractFileByPath(path) || (isProject && vault.getAbstractFileByPath(folder)))
    throw new Error("An entry or project with that name already exists at this destination.");
  let source = "---\nTitle:\n---\n\n";
  if (request.template) {
    const template = vault.getAbstractFileByPath(normalizePath(request.template));
    if (!(template instanceof TFile) || template.extension !== "md") throw new Error("Choose an existing Markdown template or leave Template blank.");
    source = owner.activeText(template) ?? await vault.read(template);
  } else if (script) throw new Error("Choose a script template first.");
  const metadata = scriptMetadata(source);
  const tag = request.kind === "Brainstorm" ? "brainstorm" : isProject || request.subtype === "Overview" ? "project-parent"
    : canonical ? (request.kind === "Project" ? "project-" : "") + typeSlug(canonical.name) : "project-" + request.subtype.toLowerCase().replace(/\s+/g,"-");
  const tags = [metadata.tags].flat().filter((value): value is string=>typeof value === "string")
    .filter(value=>!canonical || value.toLowerCase() === tag || !owner.workspaceSettings.canonTypes.some(type=>
      typeTags(type.name).includes(value.toLowerCase())));
  const text = script ? source : propertySource(source, {Title:title,tags:[...new Set([...tags,tag])]});
  const made: TFolder[] = [];
  if (creating.has(owner)) throw new Error("Another entry is being created. Try again shortly.");
  creating.add(owner);
  let file: TFile;
  try {
    let current = "";
    for (const segment of folder === "/" ? [] : folder.split("/")) {
      current = current ? `${current}/${segment}` : segment;
      const existing = vault.getAbstractFileByPath(current);
      if (existing && !(existing instanceof TFolder)) throw new Error(`A file blocks the folder ${current}.`);
      if (!existing) {
        if (!request.createFolders) throw new Error("The destination does not exist. Enable Create missing folders or choose an existing folder.");
        made.push(await vault.createFolder(current));
      }
    }
    if (script) {
      const active = owner.scriptController!.session.data.selection;
      const group = active?.scope === request.project ? active?.group : undefined;
      file = await owner.scriptController!.createScript(folder,title,group,request.template,request.project);
    } else {
      file = await vault.create(path,text);
      owner.scriptController?.observeText(path,text,false);
    }
  } catch (error) {
    for (const folder of made.reverse()) {
      const current = vault.getAbstractFileByPath(folder.path);
      if (current === folder && !folder.children.length) {
        try { await vault.delete(folder); } catch { /* Keep an empty folder if the host refuses cleanup. */ }
      }
    }
    throw error;
  } finally { creating.delete(owner); }
  if (!script) {
    try { await workspace.getLeaf(false).openFile(file, {state:{mode:"source"}}); }
    catch { new Notice(`Created ${file.path}. Open it from Files to edit.`); }
  }
  owner.themeFeature?.refresh();
  return file;
}

export class NewEntryModal extends Modal {
  request: EntryRequest;
  projectPaths: string[];
  constructor(private owner: Marginalia, section: string, project?: string) {
    super(owner.app);
    const settings = owner.workspaceSettings;
    const kind = project || ["Projects","Project Register"].includes(section) ? "Project" : section === "Canon" ? "Canon" : "Brainstorm";
    const subtype = kind === "Project" ? project ? "Note" : "New Project" : kind === "Canon" ? settings.canonTypes[0]?.name ?? "" : "Brainstorm";
    this.request = {kind,subtype,title:"",folder:"",template:"",createFolders:true,project};
    const folders = vaultFolders(owner.app);
    this.projectPaths = projects([],settings.vaultType,folders,settings).map(project=>project.path);
    this.defaults();
  }
  defaults() {
    const defaults = entryDefaults(this.owner.workspaceSettings,this.request.kind,this.request.subtype,this.request.project);
    this.request.folder = defaults.folder;
    this.request.template = templateMatch(vaultFiles(this.app),defaults.template,this.request.subtype);
    if (this.request.kind === "Project" && this.request.subtype === "Script" && this.owner.writing.preferences.scriptTemplate)
      this.request.template = this.owner.writing.preferences.scriptTemplate;
  }
  onOpen() { this.draw(); }
  draw() {
    const root = this.contentEl; root.replaceChildren(); root.classList.add("marginalia-entry-form");
    root.append(el("h2","","New Entry"));
    new Setting(root).setName("Entry type").addDropdown(drop=> {
      for (const kind of ["Brainstorm","Canon","Project"]) drop.addOption(kind,kind);
      drop.setValue(this.request.kind).onChange(value=> {
        this.request.kind = value as EntryRequest["kind"];
        this.request.subtype = value === "Project" ? "New Project" : value === "Canon" ? this.owner.workspaceSettings.canonTypes[0]?.name ?? "" : "Brainstorm";
        this.defaults(); this.draw();
      });
    });
    if (this.request.kind !== "Brainstorm") new Setting(root).setName("Subtype").addDropdown(drop=> {
      if (this.request.kind === "Project") {
        for (const option of this.owner.workspaceSettings.entrySetup.projectOptions) drop.addOption(option.name,option.name);
        const group = root.ownerDocument.createElement("optgroup"); group.label="Canon Types";
        for (const type of this.owner.workspaceSettings.canonTypes) { const option=el("option","",type.name);option.value=type.name;group.append(option); }
        drop.selectEl.append(group);
      } else for (const type of this.owner.workspaceSettings.canonTypes) drop.addOption(type.name,type.name);
      drop.setValue(this.request.subtype).onChange(value=> { this.request.subtype=value; this.defaults(); this.draw(); });
    });
    if (this.request.kind === "Project" && this.request.subtype !== "New Project")
      new Setting(root).setName("Project").setDesc("Choose the project for this entry.").addText(input=> {
        input.setPlaceholder("Type a project folder…").setValue(this.request.project ?? "").onChange(value=> { this.request.project=value; });
        suggest(input.inputEl,()=>this.projectPaths);
        input.inputEl.addEventListener("change",()=> { this.defaults(); this.draw(); });
      });
    root.append(el("hr"));
    new Setting(root).setName("Title").addText(input=> {
      input.inputEl.setAttribute("aria-label","Entry title");
      input.setValue(this.request.title).setPlaceholder("Entry title").onChange(value=>{this.request.title=value;});
    });
    new Setting(root).setName("Destination folder").setDesc(this.request.subtype === "New Project" && this.request.kind === "Project" ? "Creates a project folder using the title, with Overview.md inside." : "Vault-relative path. Use / for the vault root.")
      .addText(input=> {
        input.inputEl.setAttribute("aria-label","Destination folder");
        input.setValue(this.request.folder).onChange(value=>{this.request.folder=value;});
        suggest(input.inputEl,()=>vaultFolders(this.app));
      });
    new Setting(root).setName("Template").setDesc("Matching templates are selected automatically. Leave blank for an empty note. Template commands are copied without execution.")
      .addText(input=> {
        input.inputEl.setAttribute("aria-label","Entry template");
        input.setValue(this.request.template).onChange(value=>{this.request.template=value;});
        suggest(input.inputEl,()=>vaultFiles(this.app));
      });
    new Setting(root).setName("Create missing folders").addToggle(toggle=>toggle.setValue(this.request.createFolders).onChange(value=>{this.request.createFolders=value;}));
    const error=el("p","marginalia-script-warning"); error.setAttribute("role","alert");root.append(error);
    let busy=false;
    new Setting(root).addButton(button=>button.setButtonText("Create entry").setCta().onClick(async()=> {
      if(busy) return; busy=true;button.setDisabled(true);error.textContent="";
      try { const file=await createEntry(this.owner,{...this.request});this.close();new Notice(`Created ${file.basename}.`); }
      catch(reason) { error.textContent=reason instanceof Error ? reason.message : String(reason); }
      finally { busy=false;button.setDisabled(false); }
    })).addButton(button=>button.setButtonText("Cancel").onClick(()=>this.close()));
  }
  onClose() { this.contentEl.replaceChildren(); }
}
