import {Plugin,Platform,MarkdownView,parseYaml,Notice} from "obsidian";
import type Marginalia from "../main.ts";
import {eligible,entryType,projectResolver} from "../workspace/model.ts";
import {buildTimelineIndex,type TimelineIndex} from "./index.ts";
import {strings,type TimelineNote,type Diagnostic} from "./model.ts";
import {ensureDefaultCalendar} from "./setup.ts";
import {buildWorldTimeline,type WorldTimeline} from "./world.ts";
import {TIMELINE,WorldTimelineView,openWorldTimeline} from "./view.ts";
import {buildStateTimelines,type StateTimelines} from "./state.ts";
import {ENTRY_TIMELINE,EntryTimelineView,openEntryTimeline} from "./entry-view.ts";
export function timelineAvailable(owner: Pick<Marginalia,"workspaceSettings">) {
  return !Platform.isMobile && owner.workspaceSettings.vaultType === "World";
}
export function timelineFrontmatter(source: string): Record<string, unknown> {
  if (!/^\uFEFF?---\s*\r?\n/.test(source)) return {};
  const block = source.replace(/^\uFEFF?---\s*\r?\n/,"").match(/^([\s\S]*?)^---\s*(?:\r?\n|$)/m);
  if (!block) throw new Error("Close the opening frontmatter block with ---.");
  const parsed = parseYaml(block[1]);
  if (parsed !== null && parsed !== undefined && (typeof parsed !== "object" || Array.isArray(parsed))) throw new Error("Frontmatter must be a property mapping.");
  return parsed ?? {};
}
export function timelineNotes(owner: Marginalia): {notes: TimelineNote[]; diagnostics: Diagnostic[]} {
  const notes: TimelineNote[] = [], diagnostics: Diagnostic[] = [];
  const buffers = new Map<string,string>();
  owner.app.workspace.iterateAllLeaves(leaf => {
    if (leaf.view instanceof MarkdownView && leaf.view.file && leaf.view.getMode() === "source") buffers.set(leaf.view.file.path,leaf.view.editor.getValue());
  });
  const templates = new Set([...owner.workspaceSettings.canonTypes.map(t => t.template),...owner.workspaceSettings.entrySetup.projectOptions.map(t => t.template),owner.workspaceSettings.entrySetup.brainstorm.template]);
  for (const file of owner.app.vault.getMarkdownFiles()) {
    if (!eligible(file.path) || templates.has(file.path) || owner.reviewData?.index.some(item=>item.path===file.path)) continue;
    let fields = owner.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    const buffer = buffers.get(file.path);
    if (buffer !== undefined) {
      try {
        fields = timelineFrontmatter(buffer);
      } catch(error) {
        diagnostics.push({code:"frontmatter-invalid",path:file.path,message:String(error instanceof Error ? error.message : error)});
        continue;
      }
    }
    if(fields.generated===true)continue;
    const tags = [...new Set([...strings(fields.tags).flatMap(t => t.split(/[,\s]+/)),...(owner.app.metadataCache.getFileCache(file)?.tags??[]).map(tag=>tag.tag)].map(t => t.replace(/^#/,"")))];
    notes.push({path:file.path,name:file.basename,fields,tags,type:entryType(file.path,tags,owner.workspaceSettings.canonTypes)});
  }
  const project=projectResolver(owner.workspaceSettings,notes);
  for(const note of notes)note.project=project(note.path,note.fields);
  return {notes,diagnostics};
}
export async function setupTimeline(owner: Marginalia): Promise<string> {
  if (!timelineAvailable(owner)) throw new Error("Timelines is available in World vaults on desktop only.");
  const snapshot = timelineNotes(owner);
  // Newly created or uncached files may not have reached metadataCache yet.
  // Read only those files during explicit setup, never during background indexing.
  const files = new Map(owner.app.vault.getMarkdownFiles().map(file=>[file.path,file]));
  for (const note of snapshot.notes) {
    const file = files.get(note.path);
    if (!file || owner.activeText(file) !== null || owner.app.metadataCache.getFileCache(file)) continue;
    try {note.fields = timelineFrontmatter(await owner.app.vault.read(file));}
    catch(error) {snapshot.diagnostics.push({code:"frontmatter-invalid",path:note.path,message:String(error instanceof Error ? error.message : error)});}
  }
  // Do not create a competing calendar when an open Calendar note has malformed YAML.
  if (snapshot.diagnostics.length) throw new Error(`Fix frontmatter before calendar setup: ${snapshot.diagnostics[0].path}.`);
  return ensureDefaultCalendar({notes:()=>snapshot.notes,exists:path=>!!owner.app.vault.getAbstractFileByPath(path),create:async(path,source)=>{await owner.app.vault.create(path,source);}});
}
export class TimelineFeature extends Plugin {
  index?: TimelineIndex;
  world?: WorldTimeline;
  states?: StateTimelines;
  headerActions=new Map<MarkdownView,HTMLElement>();
  private timer?: ReturnType<typeof setTimeout>;
  private alive = false;
  constructor(public owner: Marginalia) { super(owner.app,owner.manifest); }
  onload() {
    this.alive = true;
    this.register(()=>{this.alive=false;clearTimeout(this.timer);this.index=undefined;this.world=undefined;this.states=undefined;for(const action of this.headerActions.values())action.remove();this.headerActions.clear();});
    this.addCommand({id:"open-world-timeline",name:"Open World Timeline",callback:()=>{void openWorldTimeline(this.owner);}});
    this.addRibbonIcon("chart-no-axes-gantt","Open World Timeline",()=>{void openWorldTimeline(this.owner);});
    this.addCommand({id:"open-entry-timeline",name:"Open timeline for current entry",checkCallback:checking=>{const file=this.app.workspace.getActiveFile();if(!file||!this.canOpen(file.path))return false;if(!checking)void openEntryTimeline(this.owner,file.path);return true;}});
    const refresh = () => this.schedule();
    this.registerEvent(this.app.vault.on("create",refresh));
    this.registerEvent(this.app.vault.on("modify",refresh));
    this.registerEvent(this.app.vault.on("delete",refresh));
    this.registerEvent(this.app.vault.on("rename",(file,oldPath)=>{
      const settings=this.owner.timelineSettings;
      const next=(path:string)=>path===oldPath||path.startsWith(oldPath+"/")?file.path+path.slice(oldPath.length):path;
      const before=JSON.stringify([settings.primaryCalendar,settings.displayCalendar,settings.lanes]);
      settings.primaryCalendar=next(settings.primaryCalendar);settings.displayCalendar=next(settings.displayCalendar);
      settings.lanes=settings.lanes.map(lane=>({...lane,path:next(lane.path)}));
      let renamedEntry=false;
      for(const leaf of this.app.workspace.getLeavesOfType(ENTRY_TIMELINE))if(leaf.view instanceof EntryTimelineView){const path=next(leaf.view.entryPath);if(path!==leaf.view.entryPath){leaf.view.entryPath=path;renamedEntry=true;}}
      if(renamedEntry)this.app.workspace.requestSaveLayout();
      if(before!==JSON.stringify([settings.primaryCalendar,settings.displayCalendar,settings.lanes]))void this.owner.savePluginData().catch(()=>new Notice("Could not save renamed timeline preferences."));
      refresh();
    }));
    this.registerEvent(this.app.metadataCache.on("changed",refresh));
    this.registerEvent(this.app.metadataCache.on("resolved",refresh));
    this.registerEvent(this.app.workspace.on("editor-change",refresh));
    this.registerEvent(this.app.workspace.on("file-open",()=>{this.noteActions();refresh();}));
    this.registerEvent(this.app.workspace.on("layout-change",()=>this.noteActions()));
    this.app.workspace.onLayoutReady(()=>{this.noteActions();this.schedule();});
  }
  schedule() {
    if (!this.alive) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(()=>this.refresh(),150);
  }
  refresh() {
    if (!this.alive || !timelineAvailable(this.owner) || !this.owner.timelineSettings.enabled) return;
    const {notes,diagnostics} = timelineNotes(this.owner);
    this.index = buildTimelineIndex(notes,this.owner.timelineSettings);
    this.index.diagnostics.unshift(...diagnostics);
    this.world=buildWorldTimeline(notes,this.index,this.owner.timelineSettings,(target,source)=>this.app.metadataCache.getFirstLinkpathDest(target,source)?.path);
    this.states=buildStateTimelines(notes,this.index,this.world,this.owner.timelineSettings,(target,source)=>this.app.metadataCache.getFirstLinkpathDest(target,source)?.path);
    this.world.diagnostics.push(...this.states.diagnostics);
    this.noteActions();
    this.redraw();
  }
  redraw(){
    for(const leaf of this.app.workspace.getLeavesOfType(TIMELINE))if(leaf.view instanceof WorldTimelineView)leaf.view.draw();
    for(const leaf of this.app.workspace.getLeavesOfType(ENTRY_TIMELINE))if(leaf.view instanceof EntryTimelineView)leaf.view.draw();
  }
  private canOpen(path:string){
    const settings=this.owner.workspaceSettings;
    return eligible(path)&&![...settings.canonTypes.map(t=>t.template),...settings.entrySetup.projectOptions.map(t=>t.template),settings.entrySetup.brainstorm.template].includes(path);
  }
  noteActions(){
    if(!this.alive||!timelineAvailable(this.owner)||!this.owner.timelineSettings.enabled)return;
    const live=new Set<MarkdownView>();
    this.app.workspace.iterateAllLeaves(leaf=>{
      const view=leaf.view;if(!(view instanceof MarkdownView)||!view.file||!this.canOpen(view.file.path))return;live.add(view);
      let action=this.headerActions.get(view);
      if(!action){action=view.addAction("chart-no-axes-gantt","Open timeline for this entry",()=>{if(view.file)void openEntryTimeline(this.owner,view.file.path);});this.headerActions.set(view,action);}
      const librarian=this.owner.headerActions.get(view);
      if(librarian&&librarian.parentElement===action.parentElement&&librarian.nextSibling!==action)librarian.after(action);
    });
    for(const [view,action] of this.headerActions)if(!live.has(view)){action.remove();this.headerActions.delete(view);}
  }
}
