import {ItemView,Notice,TFile,type WorkspaceLeaf} from "obsidian";
import type Marginalia from "../main.ts";
import {timelineAvailable} from "./feature.ts";
import {eligible} from "../workspace/model.ts";
import {EntryTimelineUI} from "./entry-ui.ts";
import {openTimelineNote,openWorldTimeline} from "./view.ts";
export const ENTRY_TIMELINE="marginalia-entry-timeline";
export async function openEntryTimeline(owner:Marginalia,path:string){
  if(!timelineAvailable(owner)||!owner.timelineSettings.enabled){new Notice("Enable Timelines in a desktop World vault first.");return;}
  if(!eligible(path)||!(owner.app.vault.getAbstractFileByPath(path) instanceof TFile)){new Notice("This entry is no longer available.");return;}
  const leaf=owner.app.workspace.getLeavesOfType(ENTRY_TIMELINE).find(leaf=>leaf.getViewState().state?.entryPath===path)??owner.app.workspace.getLeaf("tab");
  await leaf.setViewState({type:ENTRY_TIMELINE,state:{entryPath:path},active:true});
  if(owner.closing||!timelineAvailable(owner)||!owner.timelineSettings.enabled){leaf.detach();return;}
  await owner.app.workspace.revealLeaf(leaf);
}
export class EntryTimelineView extends ItemView {
  entryPath="";
  ui?:EntryTimelineUI;
  constructor(leaf:WorkspaceLeaf,public owner:Marginalia){super(leaf);}
  getViewType(){return ENTRY_TIMELINE;}
  getDisplayText(){const name=this.owner.timelineFeature?.states?.entries.get(this.entryPath)?.name||this.entryPath.split("/").at(-1)?.replace(/\.md$/i,"");return name?`${name} · Timeline`:"Entry Timeline";}
  getIcon(){return "chart-no-axes-gantt";}
  getState(){return {entryPath:this.entryPath};}
  async setState(state:Record<string,unknown>,result:{history:boolean}){this.entryPath=typeof state.entryPath==="string"?state.entryPath:"";this.draw();await super.setState(state,result);}
  async onOpen(){this.draw();}
  draw(){
    if(!timelineAvailable(this.owner)||!this.owner.timelineSettings.enabled){
      this.ui?.dispose();this.ui=undefined;this.contentEl.replaceChildren();
      const p=this.contentEl.ownerDocument.createElement("p");p.className="marginalia-timeline-empty";p.textContent="Timelines is available when enabled in a World vault on desktop.";this.contentEl.append(p);return;
    }
    if(!this.ui)this.ui=new EntryTimelineUI(this.contentEl,{
      entry:()=>this.owner.timelineFeature?.states?.entries.get(this.entryPath),registry:()=>this.owner.timelineFeature?.index?.registry,
      displayCalendar:()=>this.owner.timelineSettings.displayCalendar,
      calendar:async path=>{const before=this.owner.timelineSettings.displayCalendar;this.owner.timelineSettings.displayCalendar=path;try{await this.owner.savePluginData();}catch(error){this.owner.timelineSettings.displayCalendar=before;throw error;}this.owner.timelineFeature?.redraw();},
      open:path=>openTimelineNote(this.owner,path),world:()=>{void openWorldTimeline(this.owner);},
    });
    this.ui.draw();if(!this.owner.timelineFeature?.states)this.owner.timelineFeature?.schedule();
  }
  async onClose(){this.ui?.dispose();this.ui=undefined;}
}
