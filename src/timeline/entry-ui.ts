import {formatDate,type CalendarRegistry,type TimelineDate} from "./calendar.ts";
import {stateAt,type EntryHistory,type HistoryRecord} from "./state.ts";
export interface EntryTimelinePort {
  entry():EntryHistory|undefined;
  registry():CalendarRegistry|undefined;
  displayCalendar():string;
  calendar(path:string):Promise<void>;
  open(path:string):void;
  world():void;
}
interface HistoryRow {id:string; sourcePath:string; source:"entry"|"event"; title:string; date?:TimelineDate; order:number; records:HistoryRecord[]}
function rows(entry:EntryHistory):HistoryRow[]{
  const groups=new Map<string,HistoryRow>();
  for(const record of entry.records){
    const id=`${record.source}:${record.sourcePath}:${record.date?.key??"undated"}`;
    let row=groups.get(id);
    if(!row){row={id,sourcePath:record.sourcePath,source:record.source,title:record.source==="entry"?"Entry’s own dates":record.sourcePath.split("/").at(-1)!.replace(/\.md$/i,""),date:record.date,order:record.order??0,records:[]};groups.set(id,row);}
    row.records.push(record);
  }
  return [...groups.values()].sort((a,b)=>(a.date?.key??Infinity)-(b.date?.key??Infinity)||(!a.date&&!b.date?a.order-b.order:0)||a.title.localeCompare(b.title));
}
export class EntryTimelineUI {
  private limit=100;
  private viewOpen=false;
  private disposed=false;
  root:HTMLElement;
  port:EntryTimelinePort;
  constructor(root:HTMLElement,port:EntryTimelinePort){this.root=root;this.port=port;root.classList.add("marginalia-world-timeline","marginalia-entry-timeline");}
  private node<K extends keyof HTMLElementTagNameMap>(tag:K,cls="",text?:string){const e=this.root.ownerDocument.createElement(tag);e.className=cls;if(text!==undefined)e.textContent=text;return e;}
  private button(text:string,action:()=>void,label=text){const b=this.node("button","",text);b.type="button";b.setAttribute("aria-label",label);b.onclick=action;return b;}
  private date(date?:TimelineDate){
    if(!date)return "Undated";
    const registry=this.port.registry()!;
    const display=this.port.displayCalendar();
    return formatDate(date,registry,registry.calendars.some(c=>c.path===display&&c.offset!==undefined)?display:registry.primary?.offset!==undefined?registry.primary.path:date.calendar);
  }
  dispose(){this.disposed=true;this.root.replaceChildren();}
  draw(){
    if(this.disposed)return;
    const scroll=this.root.querySelector<HTMLElement>(".marginalia-entry-history")?.scrollTop??0;
    this.root.replaceChildren();const entry=this.port.entry(),registry=this.port.registry();
    if(!entry||!registry){this.root.append(this.node("p","marginalia-timeline-empty","This entry is unavailable or its timeline is still loading."));return;}
    const history=rows(entry),byId=new Map(entry.records.map(record=>[record.id,record])),header=this.node("header","marginalia-timeline-header");
    header.append(this.node("h1","",entry.name));
    const count=this.node("div","marginalia-timeline-status");count.append(this.node("span","",`${history.length} ${history.length===1?"record":"records"}`));header.append(count);
    const controls=this.node("div","marginalia-timeline-controls");
    controls.append(this.button("↗",()=>this.port.open(entry.path),"Open entry note"),this.button("World",()=>this.port.world(),"Open World Timeline"));
    const view=this.button("View",()=>{this.viewOpen=!this.viewOpen;this.draw();},"Entry timeline view options");view.setAttribute("aria-expanded",String(this.viewOpen));controls.append(view);header.append(controls);this.root.append(header);
    if(this.viewOpen){
      const options=this.node("div","marginalia-timeline-view-options"),label=this.node("label","marginalia-timeline-select","Display "),select=this.node("select");select.setAttribute("aria-label","Entry display calendar");
      for(const c of registry.calendars.filter(c=>c.offset!==undefined)){const option=this.node("option","",c.name);option.value=c.path;select.append(option);}
      select.value=this.port.displayCalendar()||registry.primary?.path||select.options[0]?.value||"";
      if(![...select.options].some(o=>o.value===select.value))select.selectedIndex=0;
      select.disabled=!select.options.length;
      select.onchange=()=>{void this.port.calendar(select.value).then(()=>this.draw()).catch(()=>{const message=this.node("p","marginalia-timeline-warning","Could not save the display calendar.");options.append(message);});};label.append(select);options.append(label);this.root.append(options);
    }
    const latest=stateAt(entry,Infinity),summary=this.node("section","marginalia-entry-summary");summary.setAttribute("aria-label","Latest recorded state");
    summary.append(this.node("h2","","Latest recorded state"));
    const state=this.node("strong",`marginalia-entry-state is-${latest.state}`,{unknown:"Unknown",present:"Present",absent:"Absent",conflict:"Conflicting state"}[latest.state]);summary.append(state);
    if(latest.state==="unknown")summary.append(this.node("span","marginalia-timeline-muted",latest.observed?"Recorded in events; no active lifecycle change is known.":"No dated lifecycle or presence evidence yet."));
    const location=this.node("div","marginalia-entry-location");location.append(this.node("span","marginalia-timeline-muted",entry.stationary?"Stationary location":"Last recorded location"));
    if(latest.locationState==="known")for(const l of latest.locations)location.append(this.button(l.name,()=>this.port.open(l.path)));
    else if(latest.locationState==="conflict"){location.append(this.node("span","marginalia-timeline-warning","Conflicting locations"));for(const l of latest.locations)location.append(this.button(l.name,()=>this.port.open(l.path)));}
    else if(!entry.stationary)location.append(this.node("span","marginalia-timeline-muted","Unknown"));
    summary.append(location);this.root.append(summary);
    const content=this.node("div","marginalia-entry-history");content.setAttribute("aria-label","Entry history");this.root.append(content);
    if(entry.diagnostics.length){
      const issues=this.node("details","marginalia-entry-issues");issues.append(this.node("summary","",`${entry.diagnostics.length} ${entry.diagnostics.length===1?"issue":"issues"}`));
      issues.ontoggle=()=>{if(issues.open&&issues.childElementCount===1)for(const issue of entry.diagnostics.slice(0,100)){const p=this.node("p","marginalia-timeline-warning",`${issue.field?issue.field+": ":""}${issue.message}`);if(issue.path!==entry.path)p.append(this.button(issue.path,()=>this.port.open(issue.path)));issues.append(p);}};content.append(issues);
    }
    if(!history.length)content.append(this.node("p","marginalia-timeline-empty","No timeline records yet. Link this entry in an Event’s frontmatter or add a tracked lifecycle date to its note."));
    const list=this.node("ol","marginalia-entry-history-list");content.append(list);
    for(const row of history.slice(0,this.limit)){
      const item=this.node("li","marginalia-entry-history-row");item.dataset.historySource=row.sourcePath;
      const time=this.node("div","marginalia-entry-history-date",row.records.some(r=>r.invalidDate)?"Invalid date":this.date(row.date)),body=this.node("div","marginalia-entry-history-content");
      body.append(this.button(row.title,()=>this.port.open(row.sourcePath)));
      const span=row.records.find(r=>r.span)?.span;if(span)body.append(this.node("p","marginalia-timeline-muted",`Span ${this.date(span.start)} – ${this.date(span.end)}; changes take effect at its end.`));
      const own=row.records.filter(r=>r.kind==="state"&&r.source==="entry");
      for(const record of row.records.filter(r=>r.kind==="state")){
        const authority=record.supersededBy?byId.get(record.supersededBy):undefined,matches=!!authority?.date&&authority.date.key===record.date?.key;
        const line=this.node("p",record.active||matches?"":"marginalia-entry-overridden");
        line.append(this.node("span","",`${record.field} · ${record.effect}${record.source==="entry"?" · Own date":""}`));
        if(!record.active)line.append(this.node("span","marginalia-timeline-muted",authority?.date?` ${matches?"Matches":"Overridden by"} own date: ${this.date(authority.date)}`:` Overridden — ${record.explanation}`));
        body.append(line);
      }
      const presence=row.records.find(r=>r.kind==="presence");
      if(presence){const line=this.node("p");line.append(this.node("span","","Present at event · "));if(presence.locationState==="unknown")line.append(this.node("span","marginalia-timeline-muted","Location unknown"));else{if(presence.locationState==="conflict")line.append(this.node("span","marginalia-timeline-warning","Multiple locations: "));for(const l of presence.locations)line.append(this.button(l.name,()=>this.port.open(l.path)));}body.append(line);}
      if(row.records.some(r=>r.kind==="event"))body.append(this.node("p","marginalia-timeline-muted",entry.stationary?"Event at this location":"Event’s own date"));
      if(row.date){const at=stateAt(entry,row.date.key);body.append(this.node("p","marginalia-timeline-muted",`State after this time: ${at.state==="conflict"?"conflicting":at.state}.`));}
      if(own.length===0&&row.source==="event"&&row.date===undefined)body.append(this.node("p","marginalia-timeline-muted","No usable event date; no state or location is inferred."));
      item.append(time,body);list.append(item);
    }
    if(history.length>this.limit)content.append(this.button(`Show more history (${history.length-this.limit} remaining)`,()=>{this.limit+=100;this.draw();}));
    content.scrollTop=scroll;
  }
}
