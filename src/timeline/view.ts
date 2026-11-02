import {openEntryTimeline} from "./entry-view.ts";
import {ItemView,Modal,Setting,Notice,TFile,type WorkspaceLeaf} from "obsidian";
import type Marginalia from "../main.ts";
import {timelineAvailable} from "./feature.ts";
import {WorldTimelineUI,readTimelineUIState} from "./ui.ts";
import {readTimeline,type LanePreference} from "./model.ts";
import type {WorldTimeline} from "./world.ts";
export const TIMELINE="marginalia-world-timeline";
export function openTimelineNote(owner:Marginalia,path:string){
  if(!(owner.app.vault.getAbstractFileByPath(path) instanceof TFile)){new Notice("This note is no longer available.");return;}
  void owner.app.workspace.openLinkText(path,"",false);
}
export async function openWorldTimeline(owner:Marginalia){
  if(!timelineAvailable(owner)||!owner.timelineSettings.enabled){new Notice("Enable Timelines in a desktop World vault first.");return;}
  const leaf=owner.app.workspace.getLeavesOfType(TIMELINE)[0]??owner.app.workspace.getLeaf("tab");
  await leaf.setViewState({type:TIMELINE,active:true});
  if(!timelineAvailable(owner)||!owner.timelineSettings.enabled||owner.closing){leaf.detach();return;}
  await owner.app.workspace.revealLeaf(leaf);
}
export class WorldTimelineView extends ItemView {
  ui?:WorldTimelineUI;
  private savedState=readTimelineUIState(undefined);
  constructor(leaf:WorkspaceLeaf,public owner:Marginalia){super(leaf);}
  getViewType(){return TIMELINE;}
  getDisplayText(){return "World Timeline";}
  getIcon(){return "chart-no-axes-gantt";}
  getState(){return {...(this.ui?.state??this.savedState)};}
  async setState(state:Record<string,unknown>,result:{history:boolean}){
    this.savedState=readTimelineUIState(state);if(this.ui){this.ui.state=this.savedState;this.ui.draw();}await super.setState(state,result);
  }
  async onOpen(){this.draw();}
  draw(){
    if(!timelineAvailable(this.owner)||!this.owner.timelineSettings.enabled){
      this.ui?.dispose();this.ui=undefined;this.contentEl.replaceChildren();
      const message=this.contentEl.ownerDocument.createElement("p");message.className="marginalia-timeline-empty";message.textContent="Timelines is available when enabled in a World vault on desktop.";this.contentEl.append(message);return;
    }
    if(!this.ui){
      this.ui=new WorldTimelineUI(this.contentEl,{
        world:()=>this.owner.timelineFeature?.world,
        states:()=>this.owner.timelineFeature?.states,
        entry:path=>{void openEntryTimeline(this.owner,path);},
        settings:()=>this.owner.timelineSettings,
        calendar:async path=>{
          const previous=this.owner.timelineSettings.displayCalendar;this.owner.timelineSettings.displayCalendar=path;
          try{await this.owner.savePluginData();}catch(error){this.owner.timelineSettings.displayCalendar=previous;throw error;}
          this.owner.timelineFeature?.redraw();
        },
        lanes:()=>{const world=this.owner.timelineFeature?.world;if(world)new TimelineLanesModal(this.owner,world).open();},
        open:path=>openTimelineNote(this.owner,path),
        changed:()=>this.owner.app.workspace.requestSaveLayout(),
      });
      this.ui.state=this.savedState;
    }
    this.ui.draw();if(!this.owner.timelineFeature?.world)this.owner.timelineFeature?.schedule();
  }
  async onClose(){this.savedState=this.ui?.state??this.savedState;this.ui?.dispose();this.ui=undefined;}
}
export class TimelineLanesModal extends Modal {
  private draft:LanePreference[];
  private busy=false;
  private closed=false;
  constructor(private owner:Marginalia,private world:WorldTimeline){super(owner.app);this.draft=world.lanes.map(lane=>({path:lane.path,group:lane.group,enabled:lane.enabled}));}
  onOpen(){this.closed=false;this.draw();}
  private draw(){
    const root=this.contentEl,doc=root.ownerDocument;root.replaceChildren();root.classList.add("marginalia-timeline-lanes-modal");
    const heading=doc.createElement("h2");heading.textContent="Location lanes";root.append(heading);
    const intro=doc.createElement("p");intro.textContent="Choose locations to show. Matching group names place lanes together; arrows change their order. Events with multiple locations stay in their own lane.";root.append(intro);
    new Setting(root).setName("Visible lanes").addButton(button=>button.setButtonText("Show all").onClick(()=>{this.draft.forEach(l=>{l.enabled=true;});this.draw();})).addButton(button=>button.setButtonText("Hide all").onClick(()=>{this.draft.forEach(l=>{l.enabled=false;});this.draw();}));
    for(let i=0;i<this.draft.length;i++){
      const lane=this.draft[i],name=this.world.lanes.find(l=>l.path===lane.path)!.name;
      new Setting(root).setName(name)
        .addToggle(toggle=>toggle.setValue(lane.enabled).onChange(value=>{lane.enabled=value;}))
        .addText(input=>{input.setPlaceholder("No group").setValue(lane.group).onChange(value=>{lane.group=value.trim();});input.inputEl.setAttribute("aria-label",`Group for ${name}`);})
        .addExtraButton(button=>button.setIcon("arrow-up").setTooltip(`Move ${name} up`).setDisabled(i===0).onClick(()=>{[this.draft[i-1],this.draft[i]]=[this.draft[i],this.draft[i-1]];this.draw();}))
        .addExtraButton(button=>button.setIcon("arrow-down").setTooltip(`Move ${name} down`).setDisabled(i===this.draft.length-1).onClick(()=>{[this.draft[i],this.draft[i+1]]=[this.draft[i+1],this.draft[i]];this.draw();}));
    }
    const error=doc.createElement("p");error.setAttribute("role","alert");error.className="marginalia-timeline-warning";root.append(error);
    new Setting(root).addButton(button=>button.setButtonText("Save lanes").setCta().onClick(async()=>{
      if(this.busy||this.closed)return;if(!timelineAvailable(this.owner)||!this.owner.timelineSettings.enabled){error.textContent="Timelines is no longer enabled in a desktop World vault.";return;}
      const current=this.owner.timelineFeature?.world;
      if(current&&this.draft.some(lane=>!current.lanes.some(next=>next.path===lane.path))){error.textContent="Locations changed while this window was open. Reopen Location lanes to use the current notes.";return;}
      this.busy=true;button.setDisabled(true);
      const previous=readTimeline(this.owner.timelineSettings),known=new Set(this.draft.map(l=>l.path));
      this.owner.timelineSettings.lanes=[...this.draft.map(l=>({...l})),...previous.lanes.filter(l=>!known.has(l.path))];
      try{await this.owner.savePluginData();this.owner.timelineFeature?.refresh();if(!this.closed)this.close();}
      catch{this.owner.timelineSettings.lanes=previous.lanes;error.textContent="Could not save location lanes. Try again.";button.setDisabled(false);}
      finally{this.busy=false;}
    })).addButton(button=>button.setButtonText("Cancel").onClick(()=>this.close()));
  }
  onClose(){this.closed=true;this.contentEl.replaceChildren();}
}
