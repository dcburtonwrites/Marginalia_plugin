import {parseDate,type Calendar,type CalendarRegistry} from "./calendar.ts";
import {snapshotDate,snapshotPosition,snapshotRows,snapshotTimes,type SnapshotFilters} from "./snapshot.ts";
import type {StateTimelines,PresenceState} from "./state.ts";
export interface SnapshotPort {
  states():StateTimelines|undefined;
  registry():CalendarRegistry;
  calendar():Calendar|undefined;
  time():number;
  change(time:number):void;
  open(path:string):void;
  entry(path:string):void;
  back():void;
}
export class SnapshotUI {
  private filters:SnapshotFilters={query:"",type:"",state:""};
  private limit=100;
  private results?:HTMLElement;
  private root:HTMLElement;
  private port:SnapshotPort;
  constructor(root:HTMLElement,port:SnapshotPort){this.root=root;this.port=port;}
  private node<K extends keyof HTMLElementTagNameMap>(tag:K,cls="",text?:string){const e=this.root.ownerDocument.createElement(tag);e.className=cls;if(text!==undefined)e.textContent=text;return e;}
  private button(text:string,action:()=>void,label=text){const b=this.node("button","",text);b.type="button";b.setAttribute("aria-label",label);b.onclick=action;return b;}
  draw(){
    const active=this.root.ownerDocument.activeElement as HTMLInputElement|null,focus=active?.dataset.snapshotControl,selection=active?.selectionStart,scroll=this.results?.scrollTop??0;
    this.root.replaceChildren();this.root.classList.add("marginalia-snapshot");
    const states=this.port.states(),calendar=this.port.calendar(),time=this.port.time();
    if(!states||!calendar){this.root.append(this.node("p","marginalia-timeline-empty","A resolved calendar is needed to view a snapshot."),this.button("Back to timeline",()=>this.port.back()));return;}
    const times=snapshotTimes(states),label=snapshotDate(time,calendar,this.port.registry());
    const controls=this.node("div","marginalia-snapshot-controls");
    const form=this.node("form","marginalia-snapshot-date"),dateLabel=this.node("label","","As of "),input=this.node("input");input.type="text";input.value=label;input.setAttribute("aria-label","Snapshot date");input.dataset.snapshotControl="date";dateLabel.append(input);
    const go=this.node("button","","Go");go.type="submit";form.append(dateLabel,go);const error=this.node("span","marginalia-timeline-warning");error.setAttribute("role","alert");error.dataset.snapshotControl="error";
    form.onsubmit=event=>{event.preventDefault();try{const date=parseDate(input.value,this.port.registry(),calendar.path);error.textContent="";this.limit=100;this.port.change(date.key);}catch(problem){error.textContent=problem instanceof Error?problem.message:String(problem);}};
    form.append(this.node("span","marginalia-timeline-muted",calendar.name));
    controls.append(form,this.button("Back to timeline",()=>this.port.back()),error);this.root.append(controls);
    const scrub=this.node("div","marginalia-snapshot-scrub"),position=snapshotPosition(times,time);
    const previous=this.button("‹",()=>this.port.change(times[this.position(times)-(times[this.position(times)]===this.port.time()?1:0)]),"Previous recorded change"),next=this.button("›",()=>this.port.change(times[this.position(times)+1]),"Next recorded change");previous.dataset.snapshotControl="previous";next.dataset.snapshotControl="next";previous.disabled=position<0||(position===0&&times[0]===time);next.disabled=position>=times.length-1;
    const range=this.node("input");range.type="range";range.min="0";range.max=String(Math.max(0,times.length-1));range.step="1";range.value=String(Math.max(0,position));range.disabled=times.length<2;range.dataset.snapshotControl="scrubber";range.setAttribute("aria-label","Scrub recorded changes");range.setAttribute("aria-valuetext",label);
    range.oninput=()=>{this.limit=100;const key=times[Number(range.value)];if(key!==undefined)this.port.change(key);};
    scrub.append(previous,range,next,this.node("span","marginalia-timeline-muted",`${times.length} recorded ${times.length===1?"change":"changes"}`));this.root.append(scrub);
    const context=this.node("p","marginalia-timeline-muted","State and last recorded location at or before this date. Unknown does not mean absent; undated events do not contribute.");
    context.dataset.snapshotControl="context";
    if(calendar.precision==="year"&&!Number.isInteger(time-calendar.offset!))context.append(this.node("span",""," This calendar displays years; the selected instant is within the displayed year."));this.root.append(context);
    const filters=this.node("div","marginalia-snapshot-filters"),query=this.node("input");query.type="search";query.placeholder="Find an entry…";query.setAttribute("aria-label","Find snapshot entries");query.value=this.filters.query;query.dataset.snapshotControl="query";query.oninput=()=>{this.filters.query=query.value;this.limit=100;this.renderRows();};filters.append(query);
    const types=[...new Set([...states.entries.values()].map(entry=>entry.type))].sort();
    for(const [key,values,label] of [["type",types,"types"],["state",["present","absent","unknown","conflict"],"states"]] as const){
      const select=this.node("select");select.setAttribute("aria-label",`Snapshot ${key}`);select.dataset.snapshotControl=key;
      for(const value of ["",...values]){const option=this.node("option","",value||`All ${label}`);option.value=value;select.append(option);}select.value=this.filters[key];select.onchange=()=>{if(key==="state")this.filters.state=select.value as PresenceState|"";else this.filters.type=select.value;this.limit=100;this.renderRows();};filters.append(select);
    }
    this.root.append(filters);this.results=this.node("div","marginalia-snapshot-results");this.root.append(this.results);this.renderRows();this.results.scrollTop=scroll;
    if(focus){const control=this.root.querySelector<HTMLInputElement>(`[data-snapshot-control="${focus}"]`);control?.focus({preventScroll:true});if(selection!==null&&selection!==undefined&&(control?.type==="text"||control?.type==="search"))control.setSelectionRange(selection,selection);}
  }
  private position(times:number[]){return snapshotPosition(times,this.port.time());}
  refreshTime(){
    const states=this.port.states(),calendar=this.port.calendar();if(!states||!calendar)return;
    const times=snapshotTimes(states),time=this.port.time(),position=this.position(times),label=snapshotDate(time,calendar,this.port.registry());
    const error=this.root.querySelector<HTMLElement>('[data-snapshot-control="error"]');if(error)error.textContent="";
    const input=this.root.querySelector<HTMLInputElement>('[data-snapshot-control="date"]');if(input)input.value=label;
    const range=this.root.querySelector<HTMLInputElement>('[data-snapshot-control="scrubber"]');if(range){range.value=String(Math.max(0,position));range.setAttribute("aria-valuetext",label);}
    const previous=this.root.querySelector<HTMLButtonElement>('[data-snapshot-control="previous"]'),next=this.root.querySelector<HTMLButtonElement>('[data-snapshot-control="next"]');
    if(previous)previous.disabled=position<0||(position===0&&times[0]===time);if(next)next.disabled=position>=times.length-1;
    const context=this.root.querySelector<HTMLElement>('[data-snapshot-control="context"]');if(context)context.textContent="State and last recorded location at or before this date. Unknown does not mean absent; undated events do not contribute."+(calendar.precision==="year"&&!Number.isInteger(time-calendar.offset!)?" This calendar displays years; the selected instant is within the displayed year.":"");
    this.renderRows();
  }
  private renderRows(){
    const states=this.port.states(),root=this.results;if(!states||!root)return;root.replaceChildren();
    const rows=snapshotRows(states,this.port.time(),this.filters),status=this.node("p","marginalia-snapshot-count",`${rows.length} ${rows.length===1?"entry":"entries"}`);status.setAttribute("role","status");root.append(status);
    if(!rows.length){root.append(this.node("p","marginalia-timeline-empty","No entries match these filters."));return;}
    const table=this.node("table","marginalia-snapshot-table"),head=this.node("thead"),header=this.node("tr");for(const title of ["Entry","State","Last recorded location","Evidence"])header.append(this.node("th","",title));head.append(header);table.append(head);const body=this.node("tbody");table.append(body);root.append(table);
    for(const {entry,frame} of rows.slice(0,this.limit)){
      const row=this.node("tr");row.dataset.snapshotEntry=entry.path;
      const name=this.node("td");name.append(this.button(entry.name,()=>this.port.entry(entry.path),`Open timeline for ${entry.name}`),this.node("span","marginalia-snapshot-type",entry.type));
      const state=this.node("td",`marginalia-snapshot-state is-${frame.state}`,frame.state.charAt(0).toUpperCase()+frame.state.slice(1));
      const location=this.node("td");
      if(frame.locationState==="stationary")location.append(this.node("span","","Stationary location"));
      else if(frame.locationState==="unknown")location.append(this.node("span","marginalia-timeline-muted","Unknown"));
      else{if(frame.locationState==="conflict")location.append(this.node("span","marginalia-timeline-warning","Conflicting: "));for(const place of frame.locations)location.append(this.button(place.name,()=>this.port.open(place.path)));}
      const evidence=this.node("td"),ids=new Set([...frame.stateSources,...frame.locationSources]);
      // For event/location notes with no effects, retain their last dated observation.
      const records=entry.records.filter(record=>ids.has(record.id));
      if(!records.length&&frame.observed){const record=[...entry.records].reverse().find(record=>record.active&&record.date&&record.date.key<=this.port.time());if(record)records.push(record);}
      const sources=new Map(records.map(record=>[record.sourcePath,record]));
      for(const record of sources.values()){const label=record.source==="entry"?"Own dates":record.sourcePath.split("/").at(-1)!.replace(/\.md$/i,"");const b=this.button(label,()=>this.port.open(record.sourcePath));b.title=record.date&&this.port.calendar()?snapshotDate(record.date.key,this.port.calendar()!,this.port.registry()):label;evidence.append(b);}
      if(!sources.size)evidence.append(this.node("span","marginalia-timeline-muted","No dated evidence yet"));
      row.append(name,state,location,evidence);body.append(row);
    }
    if(rows.length>this.limit)root.append(this.button(`Show more entries (${rows.length-this.limit} remaining)`,()=>{this.limit+=100;this.renderRows();}));
  }
}
