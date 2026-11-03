import {type TimelineIndex,type DatedEvent} from "./index.ts";
import {type CalendarRegistry,type TimelineDate} from "./calendar.ts";
import {isType,property,strings,structuralFields,applies,type TimelineNote,type TimelineSettings,type Diagnostic} from "./model.ts";
import {entryIconTarget,threadEventHeight} from "./threads.ts";
import {canon,eligible,type WorkspaceSettings} from "../workspace/model.ts";
import {scriptScope} from "../scripts/model.ts";
export const UNPLACED = "@unplaced", MULTIPLE = "@multiple";
export type LinkResolver = (target: string, source: string) => string | undefined;
export interface Reference {path: string; name: string; type: string; icon?:string}
export interface Participant extends Reference { effect?: "Appears" | "Disappears"; effects?: ("Appears"|"Disappears")[] }
export interface WorldEvent extends DatedEvent {
  name: string; participants: Participant[]; locations: Reference[]; lane: string;
  tags: string[]; project?: string; related: Reference[]; invalid: boolean;
  position?: number; order: number; after?: string; before?: string;
}
export interface WorldLane {path: string; name: string; group: string; enabled: boolean}
export interface WorldTimeline {registry: CalendarRegistry; events: WorldEvent[]; lanes: WorldLane[]; diagnostics: Diagnostic[]; canon?:Reference[]}
export interface TimelineFilters {entries?:string[];entry?:string;query: string; type: string; tag: string; project: string}
export const emptyFilters = (): TimelineFilters => ({entries:[],query:"",type:"",tag:"",project:""});
/** Same original-entry scope as the Canon register; no note-body reads. */
export function timelineCanonEntries(notes:TimelineNote[],settings:WorkspaceSettings):Reference[]{
  return canon(notes.filter(n=>eligible(n.path)&&n.fields.generated!==true&&!settings.canonTypes.some(t=>t.template===n.path)).map(n=>({...n,type:n.type??(strings(property(n.fields,'type')).find(t=>settings.canonTypes.some(c=>c.name.toLowerCase()===t.toLowerCase()))),tags:n.tags??[],body:'',created:0,modified:0})),true,settings).map(n=>({path:n.path,name:n.name,type:n.type!}));
}
export function matchingCanonEntries(entries:Reference[],query:string):Reference[]{
 const q=query.trim().toLowerCase();if(!q)return [];
 return entries.filter(e=>e.name.toLowerCase().includes(q)||e.path.toLowerCase().includes(q)).sort((a,b)=>Number(!a.name.toLowerCase().startsWith(q))-Number(!b.name.toLowerCase().startsWith(q))||a.name.localeCompare(b.name)||a.path.localeCompare(b.path));
}
export function displayCalendar(world:WorldTimeline,settings:TimelineSettings){
  return world.registry.calendars.find(c=>c.path===settings.displayCalendar&&c.offset!==undefined)
    ?? (world.registry.primary?.offset!==undefined?world.registry.primary:undefined)
    ?? world.registry.calendars.find(c=>c.offset!==undefined);
}
export function wikiLinks(value: unknown): {target: string; label: string}[] {
  if (Array.isArray(value)) return value.flatMap(wikiLinks);
  if (value && typeof value === "object") return Object.values(value).flatMap(wikiLinks);
  if (typeof value !== "string") return [];
  return [...value.matchAll(/!?\[\[([^\]]+)\]\]/g)].filter(m=>!m[0].startsWith("!")).map(m=>{
    const [path,label]=m[1].split("|");return {target:path.split("#")[0].trim(),label:label?.trim()??""};
  }).filter(link=>!!link.target);
}
function typeOf(note: TimelineNote) {return note.type ?? strings(property(note.fields,"type"))[0] ?? (scriptScope(note.path,note.fields)!==null?"Script":"Other");}
export function buildWorldTimeline(notes: TimelineNote[], index: TimelineIndex, settings: TimelineSettings, resolve: LinkResolver): WorldTimeline {
  const byPath = new Map(notes.map(note=>[note.path,note]));
  const diagnostics = [...index.diagnostics];
  const ref = (note: TimelineNote): Reference => {const icon=entryIconTarget(property(note.fields,settings.iconField));return {path:note.path,name:note.name,type:typeOf(note),...(icon?{icon}:{})};};
  const warn = (code: string,path: string,message: string,field?: string) => diagnostics.push({code,path,message,field});
  const invalidPaths = new Set(index.diagnostics.map(d=>d.path));
  const events: WorldEvent[] = index.events.map(event=>{
    const note=byPath.get(event.path)!;
    const participants=new Map<string,Participant>(), locations=new Map<string,Reference>();
    let unresolvedLocation=false;
    for(const [field,value] of Object.entries(note.fields)) {
      const location = ["locations","location"].includes(field.toLowerCase());
      if(field.toLowerCase()===settings.iconField.toLowerCase()||structuralFields.has(field.toLowerCase())&&!location)continue;
      for(const link of wikiLinks(value)) {
        const path=resolve(link.target,note.path),target=path?byPath.get(path):undefined;
        if(!target){warn("link-unresolved",note.path,`Cannot resolve ${link.target}.`,field);if(location)unresolvedLocation=true;continue;}
        if(location){
          if(!isType(target,"Location")){warn("location-invalid",note.path,`${target.name} is not classified as a Location.`,field);unresolvedLocation=true;}
          else locations.set(target.path,ref(target));
        } else if(!isType(target,"Location")) {
          const effect=settings.fields.find(f=>f.name.toLowerCase()===field.toLowerCase()&&applies(f,{...target,type:typeOf(target)}))?.effect;
          const previous=participants.get(target.path);
          const effects=[...new Set([...(previous?.effects??[]),...(effect?[effect]:[])])];
          participants.set(target.path,{...ref(target),effect:effects.length===1?effects[0]:undefined,effects});
        }
      }
    }
    return {...event,name:note.name,participants:[...participants.values()],locations:[...locations.values()],lane:unresolvedLocation?UNPLACED:locations.size===1?[...locations.keys()][0]:locations.size>1?MULTIPLE:UNPLACED,tags:note.tags??strings(property(note.fields,"tags")),project:note.project,related:[],invalid:invalidPaths.has(note.path),position:event.effective?(event.start??event.date)!.key:undefined,order:0};
  });
  const byEvent = new Map(events.map(event=>[event.path,event]));
  // Only scripts/plot points supply related markers. Body links never enter this model.
  for(const note of notes){
    if(isType(note,"Event"))continue;
    const type=typeOf(note).toLowerCase(),tags=note.tags??strings(property(note.fields,"tags"));
    if(!["script","plot point","plot-point"].includes(type)&&!tags.some(t=>["plot-point","project-plot-point","script"].includes(t))&&!(property(note.fields,"role")==="manuscript"&&["script","comic-script"].includes(String(property(note.fields,"format")))))continue;
    const targets=new Set(Object.values(note.fields).flatMap(wikiLinks).flatMap(link=>{const path=resolve(link.target,note.path);return path?[path]:[];}));
    for(const path of targets){const event=byEvent.get(path);if(event)event.related.push(ref(note));}
  }
  placeUndated(events,byPath,resolve,warn);
  const locations=notes.filter(note=>isType(note,"Location")).map(note=>({path:note.path,name:note.name}));
  const available = [...locations,{path:UNPLACED,name:"No known location"},{path:MULTIPLE,name:"Multiple locations"}];
  const preferences=new Map(settings.lanes.map((lane,i)=>[lane.path,{...lane,rank:i}]));
  const lanes: WorldLane[] = available.map(lane=>({...lane,group:preferences.get(lane.path)?.group??"",enabled:preferences.get(lane.path)?.enabled??true}));
  const groupRank=new Map<string,number>();
  for(const lane of settings.lanes)if(!groupRank.has(lane.group))groupRank.set(lane.group,groupRank.size);
  lanes.sort((a,b)=>(groupRank.get(a.group)??groupRank.size)-(groupRank.get(b.group)??groupRank.size)||(preferences.get(a.path)?.rank??1e9)-(preferences.get(b.path)?.rank??1e9)||a.name.localeCompare(b.name));
  return {registry:index.registry,events,lanes,diagnostics};
}
/** Predecessor links constrain undated chains only, and never become authored dates. */
function placeUndated(events: WorldEvent[], notes: Map<string,TimelineNote>, resolve: LinkResolver, warn: (code:string,path:string,message:string,field?:string)=>void) {
  const byPath=new Map(events.map(event=>[event.path,event]));
  const parents=new Map<string,string[]>(),children=new Map<string,string[]>();
  const bad=new Set<string>();
  for(const event of events){
    if(event.invalid)continue;
    const raw=property(notes.get(event.path)!.fields,"Preceded By");
    const blank=(value:unknown):boolean=>value===undefined||value===null||(typeof value==="string"&&!value.trim())||(Array.isArray(value)&&value.every(blank));
    if(blank(raw))continue;
    const links=wikiLinks(raw);
    const resolved=links.map(link=>resolve(link.target,event.path));
    const paths=[...new Set(resolved.filter((path):path is string=>!!path))];
    const relevant=paths.filter(path=>byPath.has(path)&&(!event.effective||!byPath.get(path)!.effective));
    if(!event.effective && (!links.length||resolved.some(path=>!path||!byPath.has(path)||byPath.get(path)!.invalid))){bad.add(event.path);warn("order-dangling",event.path,"Preceded By must resolve to an Event with a valid date or no date.","Preceded By");}
    if(relevant.length>1){bad.add(event.path);warn("order-conflict",event.path,"An undated chain needs a single predecessor.","Preceded By");}
    for(const path of relevant){
      if(byPath.get(path)!.invalid){bad.add(event.path);continue;}
      parents.set(event.path,[...(parents.get(event.path)??[]),path]);
      children.set(path,[...(children.get(path)??[]),event.path]);
    }
  }
  const visited=new Set<string>();let sequence=0;
  for(const seed of [...events].sort((a,b)=>a.name.localeCompare(b.name)||a.path.localeCompare(b.path))){
    if(visited.has(seed.path)||(!parents.has(seed.path)&&!children.has(seed.path)))continue;
    const component:string[]=[],queue=[seed.path];visited.add(seed.path);
    for(let i=0;i<queue.length;i++){
      const path=queue[i];component.push(path);
      for(const next of [...parents.get(path)??[],...children.get(path)??[]])if(!visited.has(next)){visited.add(next);queue.push(next);}
    }
    const roots=component.filter(path=>!parents.get(path)?.length);
    const conflict=component.some(path=>bad.has(path)||(parents.get(path)?.length??0)>1||(children.get(path)?.length??0)>1);
    if(conflict||roots.length!==1){
      for(const path of component)if(!byPath.get(path)!.effective)warn("order-conflict",path,roots.length?"Conflicting undated chain; edit predecessor links to resolve it.":"Cyclic undated chain; edit predecessor links to resolve it.","Preceded By");
      continue;
    }
    const chain:WorldEvent[]=[];let path:string|undefined=roots[0];
    while(path){chain.push(byPath.get(path)!);path=children.get(path)?.[0];}
    let after:WorldEvent|undefined;
    for(let i=0;i<chain.length;){
      if(chain[i].effective){after=chain[i++];continue;}
      const start=i;while(i<chain.length&&!chain[i].effective)i++;
      const before=chain[i],run=chain.slice(start,i);
      const low=after?.effective?.key,high=(before?.start??before?.date)?.key;
      for(let j=0;j<run.length;j++){
        const event=run[j];event.order=++sequence;event.after=after?.path;event.before=before?.path;
        if(low!==undefined&&high!==undefined){
          if(low>high){warn("order-reversed",event.path,"Undated chain has reversed dated anchors.","Preceded By");continue;}
          event.position=low+(high-low)*(j+1)/(run.length+1);
        }
      }
    }
  }
  for(const event of [...events].sort((a,b)=>a.name.localeCompare(b.name)||a.path.localeCompare(b.path)))if(!event.order)event.order=++sequence;
}
export function filterEvents(world: WorldTimeline, filters: TimelineFilters): WorldEvent[] {
  const query=filters.query.trim().toLowerCase(),entries=filters.entries?.length?filters.entries:(filters.entry?[filters.entry]:[]);
  return world.events.filter(event=>(!entries.length?(!query||[event.name,...event.participants.map(p=>p.name),...event.locations.map(p=>p.name)].some(name=>name.toLowerCase().includes(query))):[event.path,...event.participants.map(p=>p.path),...event.locations.map(p=>p.path),...event.related.map(p=>p.path)].some(path=>entries.includes(path)))&&(!filters.type||filters.type==="Event"||event.participants.some(p=>p.type===filters.type))&&(!filters.tag||event.tags.includes(filters.tag))&&(!filters.project||event.project===filters.project));
}
export function periodWidth(date: TimelineDate, registry: CalendarRegistry) {
  const c=registry.calendars.find(c=>c.path===date.calendar)!;
  return date.precision==="year"?1:date.precision==="month"?1/c.months.length:1/(c.months.length*c.daysPerMonth);
}
export function eventRange(event: WorldEvent, registry: CalendarRegistry): [number,number] | undefined {
  if(event.position===undefined)return;
  if(!event.effective)return [event.position,event.position];
  return event.start&&event.end?[event.start.key,event.end.key]:[event.date!.key,event.date!.key+periodWidth(event.date!,registry)];
}
export function timelineExtent(world: WorldTimeline, events=world.events): [number,number] {
  let low=Infinity,high=-Infinity;
  for(const event of events){const range=eventRange(event,world.registry);if(range){low=Math.min(low,range[0]);high=Math.max(high,range[1]);}}
  if(!Number.isFinite(low))return [0,10];
  const span=Math.max(high-low,1),padding=span*.08;return [low-padding,Math.max(high,low+1)+padding];
}
/** Fit reserves room for fixed-width cards as well as authored date marks. */
export function fittedTimelineExtent(world:WorldTimeline,events:WorldEvent[],width:number):[number,number]{
  const [start,end]=timelineExtent(world,events),usable=Math.max(1,width-188);
  return [start,start+(end-start)*Math.max(1,width)/usable];
}
export interface PlacedEvent {event: WorldEvent; x: number; width: number; row: number; markWidth: number; y?:number; height?:number}
export interface LayoutLane extends WorldLane {top: number; height: number; events: PlacedEvent[]}
/** Collision packing uses a heap, remaining O(n log n) even for identical dates. */
export function packEvents(items: {event: WorldEvent; x: number; width: number; markWidth: number}[]): PlacedEvent[] {
  const heap:{end:number;row:number}[]=[];let count=0;
  const push=(item:{end:number;row:number})=>{heap.push(item);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].end<=item.end)break;heap[i]=heap[p];i=p;}heap[i]=item;};
  const pop=()=>{const first=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1].end<heap[j].end)j++;if(heap[j].end>=last.end)break;heap[i]=heap[j];i=j;}heap[i]=last;}return first;};
  return [...items].sort((a,b)=>a.x-b.x||a.event.name.localeCompare(b.event.name)).map(item=>{
    const row=heap[0]?.end<=item.x?pop().row:count++;
    push({end:item.x+item.width+12,row});return {...item,row};
  });
}
export function layoutTimeline(world: WorldTimeline, events: WorldEvent[], start: number, span: number, width: number,threadSelection?:string[]): LayoutLane[] {
  const buckets=new Map<string,WorldEvent[]>();
  for(const event of events)if(event.position!==undefined&&(threadSelection===undefined||event.effective)){const range=eventRange(event,world.registry)!;if(range[1]>=start&&range[0]<=start+span){let bucket=buckets.get(event.lane);if(!bucket){bucket=[];buckets.set(event.lane,bucket);}bucket.push(event);}}
  let top=56,lastGroup:string|undefined;
  return world.lanes.filter(lane=>lane.enabled).map(lane=>{
    const groupChanged=lane.group!==lastGroup;lastGroup=lane.group;
    if(groupChanged&&lane.group)top+=30;
    const items=(buckets.get(lane.path)??[]).map(event=>{
      const range=eventRange(event,world.registry)!,x=Math.max(0,(range[0]-start)/span*width),markWidth=Math.max(2,(Math.min(range[1],start+span)-Math.max(range[0],start))/span*width);
      return {event,x,width:Math.max(176,markWidth),markWidth};
    });
    const packed=packEvents(items);let height=Math.max(82,(1+packed.reduce((max,p)=>Math.max(max,p.row),-1))*76+12);
    if(threadSelection!==undefined){const heights:number[]=[];for(const item of packed){item.height=threadEventHeight(item.event,threadSelection);heights[item.row]=Math.max(heights[item.row]??0,item.height);}const offsets:number[]=[];let offset=8;for(const value of heights){offsets.push(offset);offset+=value;}for(const item of packed)item.y=offsets[item.row];height=Math.max(82,offset+4);}
    const result={...lane,top,height,events:packed};top+=height;return result;
  });
}
