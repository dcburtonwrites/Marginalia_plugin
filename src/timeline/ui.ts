import {SnapshotUI} from "./snapshot-ui.ts";
import {snapshotTimes} from "./snapshot.ts";
import type {StateTimelines} from "./state.ts";
import {formatDate,type Calendar,type TimelineDate} from "./calendar.ts";
import {type TimelineSettings} from "./model.ts";
import {emptyFilters,filterEvents,layoutTimeline,timelineExtent,displayCalendar,type WorldTimeline,type WorldEvent,type LayoutLane,type TimelineFilters,UNPLACED,MULTIPLE} from "./world.ts";
export interface TimelineUIState {filters: TimelineFilters; start?: number; span?: number; selected: string; snapshot?:number}
let nextTimelinePanel=0;
export function readTimelineUIState(value: unknown): TimelineUIState {
  const raw=value&&typeof value==="object"?value as Record<string,unknown>:{},filters=raw.filters&&typeof raw.filters==="object"?raw.filters as Record<string,unknown>:{};
  const normalized=emptyFilters();for(const key of Object.keys(normalized) as (keyof TimelineFilters)[])if(typeof filters[key]==="string")normalized[key]=filters[key];
  return {filters:normalized,start:typeof raw.start==="number"&&Number.isFinite(raw.start)?raw.start:undefined,span:typeof raw.span==="number"&&Number.isFinite(raw.span)&&raw.span>0?raw.span:undefined,snapshot:typeof raw.snapshot==="number"&&Number.isFinite(raw.snapshot)?raw.snapshot:undefined,selected:typeof raw.selected==="string"?raw.selected:""};
}
export interface TimelineUIPort {
  world(): WorldTimeline | undefined;
  states?():StateTimelines|undefined;
  entry?(path:string):void;
  settings(): TimelineSettings;
  calendar(path: string): Promise<void>;
  lanes(): void;
  open(path: string): void;
  changed?(): void;
}
export class WorldTimelineUI {
  state=readTimelineUIState(undefined);
  private snapshotUI?:SnapshotUI;
  private snapshotRoot?:HTMLElement;
  private chart?: HTMLElement;
  private body?: HTMLElement;
  private details?: HTMLElement;
  private status?: HTMLElement;
  private resize?: ResizeObserver;
  private disposed=false;
  private width=0;
  private undatedLimit=100;
  private panel?:"filters"|"view";
  private panelId=`marginalia-timeline-panel-${++nextTimelinePanel}`;
  private filterToggle?: HTMLButtonElement;
  root:HTMLElement;
  port:TimelineUIPort;
  constructor(root: HTMLElement,port: TimelineUIPort){
    this.root=root;this.port=port;
    root.classList.add("marginalia-world-timeline");
    if(typeof ResizeObserver!=="undefined"){
      this.resize=new ResizeObserver(()=>{if(this.state.snapshot===undefined&&Math.abs(root.clientWidth-this.width)>2){this.width=root.clientWidth;this.renderBody();}});
      this.resize.observe(root);
    }
  }
  private node<K extends keyof HTMLElementTagNameMap>(tag: K,cls="",text?:string){const e=this.root.ownerDocument.createElement(tag);e.className=cls;if(text!==undefined)e.textContent=text;return e;}
  private button(text:string,action:()=>void,label=text,cls=""){const b=this.node("button",cls,text);b.type="button";b.setAttribute("aria-label",label);if(text&&text!==label)b.title=label;b.onclick=action;return b;}
  private changed(){this.port.changed?.();}
  dispose(){this.disposed=true;this.resize?.disconnect();this.root.replaceChildren();}
  draw(){
    if(this.disposed)return;
    const active=this.root.ownerDocument.activeElement as HTMLInputElement|null,focus=active?.dataset.tlControl,snapshotFocus=active?.dataset.snapshotControl,selection=active?.selectionStart;
    const scrollTop=this.chart?.scrollTop??0,scrollLeft=this.chart?.scrollLeft??0;
    const world=this.port.world();this.root.replaceChildren();
    if(!world){this.root.append(this.node("p","marginalia-timeline-empty","Loading this world’s calendars and events…"));return;}
    const header=this.node("header","marginalia-timeline-header"),heading=this.node("div");
    heading.append(this.node("h1","",this.state.snapshot===undefined?"World Timeline":"World Snapshot"));header.append(heading);
    this.status=this.node("div","marginalia-timeline-status");this.status.setAttribute("role","status");header.append(this.status);
    const controls=this.node("div","marginalia-timeline-controls");
    if(this.state.snapshot===undefined)controls.append(this.zoomControls("marginalia-timeline-toolbar-zoom"));
    this.filterToggle=this.button("Filters",()=>this.togglePanel("filters"),"Search and filters","marginalia-timeline-panel-toggle");
    this.filterToggle.dataset.tlControl="filters-toggle";this.filterToggle.setAttribute("aria-controls",`${this.panelId}-filters`);this.filterToggle.setAttribute("aria-expanded",String(this.panel==="filters"));
    const viewToggle=this.button("View",()=>this.togglePanel("view"),"Timeline view options","marginalia-timeline-panel-toggle");
    viewToggle.dataset.tlControl="view-toggle";viewToggle.setAttribute("aria-controls",`${this.panelId}-view`);viewToggle.setAttribute("aria-expanded",String(this.panel==="view"));
    if(this.state.snapshot===undefined)controls.append(this.filterToggle);controls.append(viewToggle);header.append(controls);this.root.append(header);
    const view=this.node("div","marginalia-timeline-view-options");view.id=`${this.panelId}-view`;view.hidden=this.panel!=="view";view.setAttribute("role","region");view.setAttribute("aria-label","Timeline view options");
    if(this.state.snapshot===undefined)view.append(this.zoomControls("marginalia-timeline-panel-zoom"));
    if(this.state.snapshot===undefined)view.append(this.button("Locations…",()=>this.port.lanes(),"Choose and group location lanes"));
    const calendarLabel=this.node("label","marginalia-timeline-select","Display "),calendar=this.node("select");calendar.setAttribute("aria-label","Display calendar");calendar.dataset.tlControl="calendar";
    const calendars=world.registry.calendars.filter(c=>c.offset!==undefined);
    for(const c of calendars){const option=this.node("option","",c.name);option.value=c.path;calendar.append(option);}
    const selected=this.displayCalendar(world);
    calendar.value=selected?.path??"";calendar.disabled=!calendars.length;
    calendar.onchange=()=>{void this.port.calendar(calendar.value).then(()=>this.draw()).catch(()=>{if(this.status)this.status.textContent="Could not save the display calendar.";});};
    calendarLabel.append(calendar);view.append(calendarLabel);
    if(this.state.snapshot===undefined){view.append(this.button("Previous event",()=>this.navigate(-1)),this.button("Next event",()=>this.navigate(1)));if(this.port.states)view.append(this.button("Snapshot at time…",()=>this.openSnapshot()));}
    else view.append(this.button("Back to timeline",()=>this.closeSnapshot()));this.root.append(view);
    view.onkeydown=event=>{if(event.key==="Escape"&&!event.defaultPrevented){event.preventDefault();this.panel=undefined;this.draw();this.root.querySelector<HTMLButtonElement>('[data-tl-control="view-toggle"]')?.focus();}};
    if(this.state.snapshot!==undefined){
      this.chart=undefined;this.body=undefined;this.details=undefined;this.status.textContent="";
      if(!this.snapshotRoot){this.snapshotRoot=this.node("div");this.snapshotUI=new SnapshotUI(this.snapshotRoot,{
        states:()=>this.port.states?.(),registry:()=>this.port.world()!.registry,calendar:()=>this.displayCalendar(this.port.world()!),time:()=>this.state.snapshot!,
        change:time=>{this.state.snapshot=time;this.changed();this.snapshotUI?.refreshTime();},
        open:path=>this.port.open(path),entry:path=>(this.port.entry??this.port.open)(path),back:()=>this.closeSnapshot(),
      });}
      this.root.append(this.snapshotRoot);this.snapshotUI!.draw();
      if(snapshotFocus){const control=this.root.querySelector<HTMLInputElement>(`[data-snapshot-control="${snapshotFocus}"]`);control?.focus({preventScroll:true});if(selection!==null&&selection!==undefined&&(control?.type==="text"||control?.type==="search"))control.setSelectionRange(selection,selection);}
      else if(focus)this.root.querySelector<HTMLElement>(`[data-tl-control="${focus}"]`)?.focus();return;
    }
    const filters=this.node("div","marginalia-timeline-filters");
    filters.id=`${this.panelId}-filters`;filters.hidden=this.panel!=="filters";filters.setAttribute("role","region");filters.setAttribute("aria-label","Search and filters");
    for(const panel of [filters,view])panel.onkeydown=event=>{if(event.key==="Escape"&&!event.defaultPrevented){event.preventDefault();this.panel=undefined;this.changed();this.draw();this.root.querySelector<HTMLButtonElement>(`[data-tl-control="${panel===filters?"filters-toggle":"view-toggle"}"]`)?.focus();}};
    const search=this.node("input");search.type="search";search.placeholder="Find an event or participant…";search.setAttribute("aria-label","Find timeline events");search.value=this.state.filters.query;search.dataset.tlControl="query";
    search.oninput=()=>{this.state.filters.query=search.value;this.changed();this.renderBody();};filters.append(search);
    const options:{key:"type"|"tag"|"project";label:string;values:string[]}[]=[
      {key:"type",label:"Types",values:[...new Set(world.events.flatMap(e=>["Event",...e.participants.map(p=>p.type)]))].sort()},
      {key:"tag",label:"Tags",values:[...new Set(world.events.flatMap(e=>e.tags))].sort()},
      {key:"project",label:"Projects",values:[...new Set(world.events.flatMap(e=>e.project?[e.project]:[]))].sort()},
    ];
    for(const {key,label,values} of options){
      const select=this.node("select");select.setAttribute("aria-label",`Filter timeline ${key}`);select.dataset.tlControl=key;
      for(const value of ["",...values]){const option=this.node("option","",value||`All ${label.toLowerCase()}`);option.value=value;select.append(option);}
      if(this.state.filters[key]&&!values.includes(this.state.filters[key])){const option=this.node("option","",this.state.filters[key]+" (unavailable)");option.value=this.state.filters[key];select.append(option);}
      select.value=this.state.filters[key];select.onchange=()=>{this.state.filters[key]=select.value;this.changed();this.renderBody();};filters.append(select);
    }
    filters.append(this.button("Clear filters",()=>{this.state.filters=emptyFilters();this.changed();this.draw();}));this.root.append(filters);
    this.body=this.node("div","marginalia-timeline-body");this.root.append(this.body);
    this.details=this.node("section","marginalia-timeline-details");this.details.setAttribute("aria-label","Selected event details");this.details.onkeydown=event=>{if(event.key==="Escape"&&!event.defaultPrevented){event.preventDefault();this.dismissDetails(true);}};this.root.append(this.details);
    this.renderBody(scrollTop,scrollLeft);this.renderDetails();
    if(focus){const control=this.root.querySelector<HTMLInputElement>(`[data-tl-control="${focus}"]`);control?.focus();if(selection!==null&&selection!==undefined&&control?.type==="search")control.setSelectionRange(selection,selection);}
  }
  private openSnapshot(){
    const states=this.port.states?.();if(!states)return;
    this.state.snapshot=this.port.world()?.events.find(event=>event.path===this.state.selected)?.effective?.key??snapshotTimes(states).at(-1)??0;
    this.panel=undefined;this.changed();this.draw();
  }
  private closeSnapshot(){this.state.snapshot=undefined;this.panel=undefined;this.changed();this.draw();}
  private togglePanel(panel:"filters"|"view"){
    this.panel=this.panel===panel?undefined:panel;this.changed();this.draw();
    if(this.panel==="filters")this.root.querySelector<HTMLInputElement>('[data-tl-control="query"]')?.focus();
  }
  private zoomControls(cls:string){
    const group=this.node("div",`marginalia-timeline-zoom ${cls}`);
    group.append(this.button("−",()=>this.zoom(2),"Zoom out"),this.button("+",()=>this.zoom(.5),"Zoom in"),this.button("↔",()=>{this.state.start=undefined;this.state.span=undefined;this.changed();this.renderBody();},"Fit events"));return group;
  }
  private displayCalendar(world:WorldTimeline):Calendar|undefined{
    return displayCalendar(world,this.port.settings());
  }
  private dateLabel(event:WorldEvent){
    const world=this.port.world()!,calendar=this.displayCalendar(world);
    if(event.invalid)return "Invalid date";
    if(!event.effective)return "Undated";
    const render=(date:TimelineDate)=>formatDate(date,world.registry,calendar?.path??date.calendar);
    return event.start&&event.end?`${render(event.start)} – ${render(event.end)}`:render(event.date!);
  }
  private events(){const world=this.port.world()!;return filterEvents(world,this.state.filters);}
  private domain(){const world=this.port.world()!,extent=timelineExtent(world,this.events());return {start:this.state.start??extent[0],span:this.state.span??extent[1]-extent[0]};}
  private zoom(factor:number){const {start,span}=this.domain(),calendar=this.displayCalendar(this.port.world()!);const unit=!calendar||calendar.precision==="year"?1:calendar.precision==="month"?1/calendar.months.length:1/(calendar.months.length*calendar.daysPerMonth);const next=Math.max(unit*3,Math.min(2e16,span*factor));this.state.start=start+(span-next)/2;this.state.span=next;this.changed();this.renderBody();}
  private pan(direction:number){
    const selector=`.marginalia-timeline-pan.${direction<0?"is-earlier":"is-later"}`,focused=this.root.ownerDocument.activeElement===this.root.querySelector(selector);
    const {start,span}=this.domain();this.state.start=start+span*.75*direction;this.state.span=span;this.changed();this.renderBody();
    if(focused)this.root.querySelector<HTMLButtonElement>(selector)?.focus();
  }
  private select(event:WorldEvent,reveal=false){
    this.state.selected=event.path;this.changed();
    if(event.position===undefined){const undated=this.events().filter(e=>e.position===undefined).sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name));this.undatedLimit=Math.max(this.undatedLimit,undated.findIndex(e=>e.path===event.path)+1);}
    if(reveal&&event.position!==undefined){const {start,span}=this.domain();if(event.position<start||event.position>start+span){this.state.start=event.position-span/2;this.state.span=span;}}
    const top=this.chart?.scrollTop??0;this.renderBody(top,this.chart?.scrollLeft??0);this.renderDetails();
    const button=this.root.querySelector<HTMLButtonElement>("button[data-event-selected='true']");
    if(reveal)button?.scrollIntoView({block:"nearest",inline:"nearest"});
    button?.focus({preventScroll:!reveal});
  }
  private dismissDetails(focusChart=false){
    if(!this.state.selected)return;
    this.state.selected="";this.changed();this.renderBody();
    if(focusChart)this.chart?.focus();
  }
  private navigate(direction:number){
    const events=this.events().filter(event=>this.port.world()!.lanes.some(l=>l.path===event.lane&&l.enabled)||event.position===undefined).sort((a,b)=>(a.position??Infinity)-(b.position??Infinity)||a.order-b.order||a.name.localeCompare(b.name));
    const index=events.findIndex(event=>event.path===this.state.selected),next=events[Math.max(0,Math.min(events.length-1,index+direction))];if(next)this.select(next,true);
  }
  private renderBody(scrollTop=this.chart?.scrollTop??0,scrollLeft=this.chart?.scrollLeft??0){
    if(!this.body||this.disposed)return;
    const world=this.port.world();if(!world)return;
    const events=this.events(),{start,span}=this.domain();
    this.status!.replaceChildren(this.node("span","",events.length===world.events.length?`${events.length} events`:`${events.length}/${world.events.length} events`));
    const active=Object.values(this.state.filters).filter(value=>value.trim()).length;
    if(this.filterToggle){this.filterToggle.textContent=active?`Filters (${active})`:"Filters";this.filterToggle.classList.toggle("is-active",active>0);this.filterToggle.setAttribute("aria-label",active?`Search and filters, ${active} active`:"Search and filters");}
    const errors=world.diagnostics.length;
    if(errors){
      const details=this.node("details","marginalia-timeline-issues"),summary=this.node("summary","",`${errors} ${errors===1?"issue":"issues"}`);details.append(summary);
      const show=(limit:number)=>{
        details.replaceChildren(summary);
        for(const issue of world.diagnostics.slice(0,limit)){
          const line=this.node("p");if(issue.path)line.append(this.button(issue.path,()=>this.port.open(issue.path)));
          line.append(this.node("span","",`${issue.field?issue.field+": ":""}${issue.message}`));details.append(line);
        }
        if(errors>limit)details.append(this.button(`Show more issues (${errors-limit} remaining)`,()=>show(limit+100)));
      };
      details.ontoggle=()=>{if(details.open&&details.childElementCount===1)show(100);};this.status!.append(details);
    }
    if(this.port.settings().displayCalendar&&!world.registry.calendars.some(c=>c.path===this.port.settings().displayCalendar&&c.offset!==undefined))this.status!.append(this.node("span","marginalia-timeline-warning","Saved display calendar is unavailable; using an available calendar."));
    this.body.replaceChildren();
    const frame=this.node("div","marginalia-timeline-chart-frame"),chart=this.node("div","marginalia-timeline-chart");chart.setAttribute("aria-label","World timeline by location");chart.tabIndex=0;this.chart=chart;
    chart.onclick=event=>{const target=event.target as Element|null;if(target&&!target.closest("button,a,input,select,summary"))this.dismissDetails();};
    chart.onkeydown=event=>{if(event.key==="Escape"&&!event.defaultPrevented){event.preventDefault();this.dismissDetails(true);}};
    const earlier=this.button("‹",()=>this.pan(-1),"Earlier years","marginalia-timeline-pan is-earlier"),later=this.button("›",()=>this.pan(1),"Later years","marginalia-timeline-pan is-later");
    frame.append(chart,earlier,later);
    const width=Math.max(620,this.root.clientWidth-210),stage=this.node("div","marginalia-timeline-stage");stage.style.width=`${width+180}px`;chart.append(stage);this.body.append(frame);
    const lanes=layoutTimeline(world,events,start,span,width);
    const bottom=lanes.length?lanes.at(-1)!.top+lanes.at(-1)!.height:140;stage.style.height=`${bottom}px`;
    const axis=this.node("div","marginalia-timeline-axis"),axisTitle=this.node("div","marginalia-timeline-axis-title",this.displayCalendar(world)?.name??"No display calendar");axis.append(axisTitle);
    const ticks=this.ticks(start,span,width);for(const tick of ticks){const label=this.node("span","marginalia-timeline-tick",tick.label);label.style.left=`${180+tick.x}px`;axis.append(label);}stage.append(axis);
    const rows=this.node("div","marginalia-timeline-rows");stage.append(rows);
    const mounted=new Map<string,{element:HTMLElement;signature:string}>();
    const renderRows=()=>{
      const top=chart.scrollTop-250,bottom=chart.scrollTop+(chart.clientHeight||500)+250;
      const visible=lanes.filter(lane=>lane.top+lane.height>=top&&lane.top<=bottom||lane.events.some(p=>p.event.path===this.state.selected));
      const wanted=new Set(visible.map(l=>l.path));
      for(const [path,item] of mounted)if(!wanted.has(path)){item.element.remove();mounted.delete(path);}
      for(const lane of visible){const signature=lane.events.length>20?`${Math.floor((top-lane.top)/76)}:${Math.floor((bottom-lane.top)/76)}`:"all";const old=mounted.get(lane.path);if(!old||old.signature!==signature){const row=this.renderLane(lane,width,ticks,top,bottom);if(old)old.element.replaceWith(row);else rows.append(row);mounted.set(lane.path,{element:row,signature});}}
    };
    chart.onscroll=renderRows;chart.scrollTop=scrollTop;chart.scrollLeft=scrollLeft;renderRows();
    if(!events.length)this.body.append(this.node("p","marginalia-timeline-empty",world.events.length?"No events match these filters.":"No Events yet. Add Date or Start/End to an Event note to place it on the timeline."));
    else if(!lanes.length)this.body.append(this.node("p","marginalia-timeline-empty","All location lanes are hidden. Choose Locations to show them."));
    else if(!lanes.some(lane=>lane.events.length)&&events.some(e=>e.position!==undefined))this.body.append(this.node("p","marginalia-timeline-empty","No dated events in the visible lanes and time window. Fit events or choose Locations to show more."));
    const undated=events.filter(event=>event.position===undefined).sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name));
    if(undated.length){const section=this.node("section","marginalia-timeline-undated");section.setAttribute("aria-label","Undated events");section.append(this.node("h2","","Undated"),this.node("p","marginalia-timeline-muted","Sequence follows predecessor links where they resolve. No dates are inferred."));const list=this.node("div","marginalia-timeline-undated-list");for(const event of undated.slice(0,this.undatedLimit))list.append(this.card(event));section.append(list);if(undated.length>this.undatedLimit)section.append(this.button(`Show more undated events (${undated.length-this.undatedLimit} remaining)`,()=>{this.undatedLimit+=100;this.renderBody();}));section.style.position="absolute";section.style.top=`${bottom}px`;section.style.width="100%";stage.style.height=`${bottom+156}px`;stage.append(section);}
    this.renderDetails();
  }
  private ticks(start:number,span:number,width:number){
    const world=this.port.world()!,calendar=this.displayCalendar(world);if(!calendar)return [];
    const unit=calendar.precision==="year"?1:calendar.precision==="month"?1/calendar.months.length:1/(calendar.months.length*calendar.daysPerMonth);
    const target=span/Math.max(2,Math.floor(width/130)),power=10**Math.floor(Math.log10(Math.max(target,unit))),fraction=target/power;
    const step=Math.max(unit,(fraction<=1?1:fraction<=2?2:fraction<=5?5:10)*power);
    const alignedStep=step<1?Math.ceil(step/unit)*unit:Math.ceil(step);
    const origin=calendar.offset!,first=Math.ceil((start-origin)/alignedStep)*alignedStep+origin;
    const result:{x:number;label:string}[]=[];
    for(let i=0;i<30;i++){const key=first+i*alignedStep;if(key>start+span)break;
      const precision=alignedStep>=1?"year":alignedStep>=1/calendar.months.length?"month":"day";
      const date:TimelineDate={calendar:calendar.path,key,year:Math.floor(key-origin),month:1,day:1,era:calendar.eras[0]?.abbr??"",precision};
      const x=(key-start)/span*width;if(x<36||x>width-36)continue;
      result.push({x,label:formatDate(date,world.registry,calendar.path)});
    }return result;
  }
  private renderLane(lane:LayoutLane,width:number,ticks:{x:number;label:string}[],top:number,bottom:number){
    const row=this.node("section","marginalia-timeline-lane");row.dataset.lane=lane.path;row.setAttribute("aria-label",lane.name);row.style.top=`${lane.top}px`;row.style.height=`${lane.height}px`;
    if(lane.group){const previous=this.port.world()!.lanes.filter(l=>l.enabled).findIndex(l=>l.path===lane.path),first=previous===0||this.port.world()!.lanes.filter(l=>l.enabled)[previous-1].group!==lane.group;if(first){const heading=this.node("h2","marginalia-timeline-group",lane.group);row.append(heading);}}
    const label=this.node("div","marginalia-timeline-lane-name");label.append(this.node("span","marginalia-timeline-location-dot"));
    label.append(lane.path===UNPLACED||lane.path===MULTIPLE?this.node("span","",lane.name):this.button(lane.name,()=>this.port.open(lane.path)));row.append(label);
    const plot=this.node("div","marginalia-timeline-lane-plot");plot.style.width=`${width}px`;
    for(const tick of ticks){const line=this.node("span","marginalia-timeline-gridline");line.style.left=`${tick.x}px`;plot.append(line);}
    for(const item of lane.events){
      const y=lane.top+8+item.row*76;
      if(lane.events.length>20&&(y+76<top||y>bottom)&&item.event.path!==this.state.selected)continue;
      const wrap=this.node("div","marginalia-timeline-position");wrap.style.left=`${item.x}px`;wrap.style.top=`${8+item.row*76}px`;
      const range=this.node("span",`marginalia-timeline-range ${item.event.start?"is-span":"is-period"}`);range.style.width=`${item.markWidth}px`;
      range.title=item.event.start?"Event span":"Authored date precision; exact placement within this period is unspecified.";wrap.append(range,this.card(item.event));plot.append(wrap);
    }
    row.append(plot);return row;
  }
  private card(event:WorldEvent){
    const selected=event.path===this.state.selected;
    const card=this.button("",()=>this.select(event),`${event.name}, ${this.dateLabel(event)}`,`marginalia-timeline-event${selected?" is-selected":""}${!event.effective?" is-undated":""}`);
    card.dataset.eventPath=event.path;card.dataset.eventSelected=String(selected);card.setAttribute("aria-pressed",String(selected));
    card.append(this.node("strong","",event.name),this.node("span","marginalia-timeline-event-date",this.dateLabel(event)));
    const badges=this.node("span","marginalia-timeline-badges");for(const participant of event.participants.slice(0,4)){const chip=this.node("span","marginalia-timeline-chip",`${participant.name.split(/\s+/).map(w=>w[0]).join("").slice(0,2)}${(participant.effects?.length??0)>1?"!":participant.effect==="Appears"?"+":participant.effect==="Disappears"?"−":""}`);chip.dataset.type=participant.type.toLowerCase();chip.title=`${participant.name}${(participant.effects?.length??0)>1?": Conflicting changes":participant.effect?": "+participant.effect:""}`;badges.append(chip);}
    if(event.participants.length>4)badges.append(this.node("span","",`+${event.participants.length-4}`));
    if(event.related.length)badges.append(this.node("span","marginalia-timeline-related",`${event.related.length} ${event.related.length===1?"reference":"references"}`));card.append(badges);return card;
  }
  private renderDetails(){
    if(!this.details)return;const world=this.port.world()!,event=world.events.find(e=>e.path===this.state.selected);
    this.details.replaceChildren();
    this.details.hidden=!event;
    if(!event)return;
    const heading=this.node("div","marginalia-timeline-detail-heading");heading.append(this.node("div","marginalia-timeline-context",this.dateLabel(event)),this.node("h2","",event.name),this.button("Open event note",()=>this.port.open(event.path)),this.button("×",()=>this.dismissDetails(true),"Close event details","marginalia-timeline-detail-close"));this.details.append(heading);
    const columns=this.node("div","marginalia-timeline-detail-columns");
    const participants=this.node("div");participants.append(this.node("h3","","Participants"));
    if(!event.participants.length)participants.append(this.node("p","marginalia-timeline-muted","No participant links in frontmatter."));
    for(const p of event.participants)participants.append(this.button(p.name+((p.effects?.length??0)>1?" · Conflicting changes":p.effect?` · ${p.effect}`:""),()=>this.port.open(p.path)));
    const location=this.node("div");location.append(this.node("h3","","Location"));if(!event.locations.length)location.append(this.node("p","marginalia-timeline-muted","Unknown"));for(const l of event.locations)location.append(this.button(l.name,()=>this.port.open(l.path)));if(event.lane===MULTIPLE)location.append(this.node("p","marginalia-timeline-warning","Multiple locations; no single location is assumed."));if(event.lane===UNPLACED&&event.locations.length)location.append(this.node("p","marginalia-timeline-warning","Some location links are unresolved."));
    columns.append(participants,location);
    if(event.related.length){const related=this.node("div");related.append(this.node("h3","","Related writing"));for(const reference of event.related)related.append(this.button(reference.name,()=>this.port.open(reference.path)));columns.append(related);}
    this.details.append(columns);
    if(!event.effective&&(event.after||event.before)){const line=this.node("p","marginalia-timeline-muted","Undated sequence: ");if(event.after)line.append(this.node("span","","after "),this.button(world.events.find(e=>e.path===event.after)!.name,()=>this.select(world.events.find(e=>e.path===event.after)!,true)));if(event.before)line.append(this.node("span",""," before "),this.button(world.events.find(e=>e.path===event.before)!.name,()=>this.select(world.events.find(e=>e.path===event.before)!,true)));line.append(this.node("span","",". Position is relational; no date is assigned."));this.details.append(line);}
    for(const diagnostic of world.diagnostics.filter(d=>d.path===event.path))this.details.append(this.node("p","marginalia-timeline-warning",diagnostic.message));
    if(!this.events().some(e=>e.path===event.path))this.details.append(this.node("p","marginalia-timeline-muted","This selected event is outside the current filters."));
  }
}
