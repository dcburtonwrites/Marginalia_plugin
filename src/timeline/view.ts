import {openEntryTimeline} from "./entry-view.ts";
import {ItemView,Modal,Setting,Notice,TFile,type WorkspaceLeaf} from "obsidian";
import type Marginalia from "../main.ts";
import {timelineAvailable} from "./feature.ts";
import {WorldTimelineUI,readTimelineUIState} from "./ui.ts";
import {readTimeline,groupStyles,moveTimelineLane,type TimelineGroup,type LanePreference} from "./model.ts";
import {entryIconTarget} from "./threads.ts";
import type {WorldTimeline,Reference} from "./world.ts";
export const TIMELINE="marginalia-world-timeline";
export function openTimelineNote(owner:Marginalia,path:string){
  if(!(owner.app.vault.getAbstractFileByPath(path) instanceof TFile)){new Notice("This note is no longer available.");return;}
  void owner.app.workspace.openLinkText(path,"",false);
}
export function timelineEntryImage(owner:Marginalia,entry:Reference):string|undefined {
  const target=entryIconTarget(entry.icon);if(!target)return;const file=owner.app.metadataCache.getFirstLinkpathDest(target,entry.path);
  if(file instanceof TFile&&/^(png|jpe?g|gif|webp|avif|svg)$/i.test(file.extension))return owner.app.vault.getResourcePath(file);
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
        image:entry=>timelineEntryImage(this.owner,entry),
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
  private groups:TimelineGroup[];
  private editing?:{original?:string;name:string;style:TimelineGroup["style"]};
  private dragging?:string;
  private busy=false;
  private closed=false;
  constructor(private owner:Marginalia,private world:WorldTimeline){super(owner.app);this.draft=world.lanes.map(lane=>({path:lane.path,group:lane.group,enabled:lane.enabled}));this.groups=readTimeline(owner.timelineSettings).groups.map(g=>({...g}));}
  onOpen(){this.closed=false;this.draw();}
  private draw(){
    const root=this.contentEl,doc=root.ownerDocument;root.replaceChildren();root.classList.add("marginalia-timeline-lanes-modal");
    const heading=doc.createElement("h2");heading.textContent="Location lanes";root.append(heading);
    const intro=doc.createElement("p");intro.textContent="Choose groups from the location menus. Drag locations to reorder them; dropping into another group moves them into it. Events with multiple locations stay in their own lane.";root.append(intro);
    new Setting(root).setName("Groups").setDesc("Choose a color or no color for banding. Click a group to edit it.").addButton(button=>button.setButtonText("Create group").setDisabled(this.busy).onClick(()=>{this.editing={name:'',style:'banded'};this.draw();}));
    const groupList=doc.createElement('div');groupList.className='marginalia-timeline-group-list';root.append(groupList);
    const editGroup=()=>{
      const editing=this.editing!,editor=doc.createElement('div');editor.className='marginalia-timeline-group-editor';editor.setAttribute('role','group');editor.setAttribute('aria-label',editing.original?'Edit timeline group':'Create timeline group');groupList.append(editor);
      const line=doc.createElement('div');line.className='marginalia-timeline-group-edit-line';editor.append(line);
      const input=doc.createElement('input');input.type='text';input.value=editing.name;input.placeholder='Group name';input.setAttribute('aria-label','Group name');input.oninput=()=>{editing.name=input.value;};line.append(input);
      const palette=doc.createElement('div');palette.className='marginalia-timeline-group-palette';palette.setAttribute('role','group');palette.setAttribute('aria-label','Group color');line.append(palette);
      for(const style of groupStyles){const swatch=doc.createElement('button');swatch.type='button';swatch.className='marginalia-timeline-group-swatch';swatch.dataset.timelineGroupStyle=style;swatch.textContent=style==='banded'?'⊘':'';swatch.title=style==='banded'?'No color (banding)':style.charAt(0).toUpperCase()+style.slice(1);swatch.setAttribute('aria-label',swatch.title);swatch.setAttribute('aria-pressed',String(editing.style===style));swatch.onclick=()=>{editing.style=style;for(const other of palette.querySelectorAll('button'))other.setAttribute('aria-pressed',String(other===swatch));};palette.append(swatch);}
      const warning=doc.createElement('p');warning.className='marginalia-timeline-group-error';warning.setAttribute('role','alert');
      const confirm=doc.createElement('button');confirm.type='button';confirm.textContent='✓';confirm.title='Confirm group';confirm.setAttribute('aria-label','Confirm group');confirm.onclick=()=>{
        const name=editing.name.trim();if(!name){warning.textContent='Enter a group name.';return;}
        if(this.groups.some(g=>g.name!==editing.original&&g.name.toLowerCase()===name.toLowerCase())){warning.textContent='A group with this name already exists.';return;}
        const existing=this.groups.find(g=>g.name===editing.original);if(existing){existing.name=name;existing.style=editing.style;for(const lane of this.draft)if(lane.group===editing.original)lane.group=name;}else this.groups.push({name,style:editing.style});
        this.editing=undefined;this.draw();
      };
      const cancel=doc.createElement('button');cancel.type='button';cancel.textContent='×';cancel.title='Cancel group';cancel.setAttribute('aria-label','Cancel group');cancel.onclick=()=>{this.editing=undefined;this.draw();};line.append(confirm,cancel);editor.append(warning);
      input.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();confirm.click();}else if(event.key==='Escape'){event.preventDefault();cancel.click();}};
      if(editing.original){const remove=doc.createElement('button');remove.type='button';remove.className='marginalia-timeline-group-remove';remove.textContent='Remove group';remove.onclick=()=>{this.groups=this.groups.filter(g=>g.name!==editing.original);for(const lane of this.draft)if(lane.group===editing.original)lane.group='';this.editing=undefined;this.draw();};editor.append(remove);}
    };
    for(const group of this.groups){if(this.editing?.original===group.name){editGroup();continue;}const chip=doc.createElement('button');chip.type='button';chip.className='marginalia-timeline-group-chip';chip.textContent=group.name;chip.dataset.timelineGroupStyle=group.style;chip.title=`Edit ${group.name}`;chip.onclick=()=>{this.editing={original:group.name,...group};this.draw();};groupList.append(chip);}
    if(this.editing&&!this.editing.original)editGroup();
    new Setting(root).setName("Visible lanes").addButton(button=>button.setButtonText("Show all").onClick(()=>{this.draft.forEach(l=>{l.enabled=true;});this.draw();})).addButton(button=>button.setButtonText("Hide all").onClick(()=>{this.draft.forEach(l=>{l.enabled=false;});this.draw();}));
    for(let i=0;i<this.draft.length;i++){
      const lane=this.draft[i],name=this.world.lanes.find(l=>l.path===lane.path)!.name;
      const setting=new Setting(root).setName(name)
        .addToggle(toggle=>toggle.setValue(lane.enabled).onChange(value=>{lane.enabled=value;}))
        .addDropdown(drop=>{drop.addOption("","No group");for(const group of this.groups)drop.addOption(group.name,group.name);drop.setValue(lane.group).onChange(value=>{lane.group=value;});drop.selectEl.setAttribute("aria-label",`Group for ${name}`);});
      const row=setting.settingEl;row.classList.add('marginalia-timeline-sortable-lane');row.dataset.lanePath=lane.path;
      const handle=doc.createElement('button');handle.type='button';handle.textContent='⠿';handle.className='marginalia-timeline-drag-handle';handle.draggable=true;handle.dataset.laneHandle=lane.path;handle.setAttribute('aria-label',`Reorder ${name}`);handle.title='Drag to reorder, or use Up and Down while focused';row.prepend(handle);
      handle.ondragstart=event=>{if(this.busy){event.preventDefault();return;}this.dragging=lane.path;event.dataTransfer?.setData('text/plain',lane.path);if(event.dataTransfer)event.dataTransfer.effectAllowed='move';row.classList.add('is-dragging');};
      handle.ondragend=()=>{this.dragging=undefined;for(const item of root.querySelectorAll('.marginalia-timeline-sortable-lane'))item.classList.remove('is-dragging','is-drop-before','is-drop-after');};
      row.ondragover=event=>{if(!this.dragging||this.dragging===lane.path)return;event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='move';const after=event.clientY>row.getBoundingClientRect().top+row.getBoundingClientRect().height/2;row.classList.toggle('is-drop-after',after);row.classList.toggle('is-drop-before',!after);};
      row.ondragleave=()=>{row.classList.remove('is-drop-before','is-drop-after');};
      row.ondrop=event=>{if(!this.dragging)return;event.preventDefault();const after=event.clientY>row.getBoundingClientRect().top+row.getBoundingClientRect().height/2;this.draft=moveTimelineLane(this.draft,this.dragging,lane.path,after);this.dragging=undefined;this.draw();};
      handle.onkeydown=event=>{if(!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const target=this.draft[i+(event.key==='ArrowUp'?-1:1)];if(!target)return;this.draft=moveTimelineLane(this.draft,lane.path,target.path,event.key==='ArrowDown');this.draw();[...root.querySelectorAll<HTMLButtonElement>('[data-lane-handle]')].find(e=>e.dataset.laneHandle===lane.path)?.focus();};
    }
    const error=doc.createElement("p");error.setAttribute("role","alert");error.className="marginalia-timeline-warning";root.append(error);
    new Setting(root).addButton(button=>button.setButtonText("Save lanes").setCta().onClick(async()=>{
      if(this.busy||this.closed)return;if(this.editing){error.textContent="Finish or cancel the group before saving lanes.";return;}if(!timelineAvailable(this.owner)||!this.owner.timelineSettings.enabled){error.textContent="Timelines is no longer enabled in a desktop World vault.";return;}
      const current=this.owner.timelineFeature?.world;
      if(current&&this.draft.some(lane=>!current.lanes.some(next=>next.path===lane.path))){error.textContent="Locations changed while this window was open. Reopen Location lanes to use the current notes.";return;}
      this.busy=true;button.setDisabled(true);
      const previous=readTimeline(this.owner.timelineSettings),known=new Set(this.draft.map(l=>l.path));
      this.owner.timelineSettings.groups=this.groups.map(g=>({...g}));
      this.owner.timelineSettings.lanes=[...this.draft.map(l=>({...l})),...previous.lanes.filter(l=>!known.has(l.path))];
      try{await this.owner.savePluginData();this.owner.timelineFeature?.refresh();if(!this.closed)this.close();}
      catch{this.owner.timelineSettings.lanes=previous.lanes;this.owner.timelineSettings.groups=previous.groups;error.textContent="Could not save location lanes. Try again.";button.setDisabled(false);}
      finally{this.busy=false;}
    })).addButton(button=>button.setButtonText("Cancel").onClick(()=>this.close()));
  }
  onClose(){this.closed=true;this.contentEl.replaceChildren();}
}
