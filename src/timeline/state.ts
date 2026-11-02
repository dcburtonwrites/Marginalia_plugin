import {isType,property,applies,type TimelineNote,type TimelineSettings,type Diagnostic,type Effect} from "./model.ts";
import {type TimelineDate} from "./calendar.ts";
import {type TimelineIndex} from "./index.ts";
import {wikiLinks,UNPLACED,MULTIPLE,type WorldTimeline,type Reference,type LinkResolver} from "./world.ts";
export type PresenceState="unknown"|"present"|"absent"|"conflict";
export type LocationState="unknown"|"known"|"conflict"|"stationary";
export interface HistoryRecord {
  id:string; kind:"state"|"presence"|"event"; entry:string; source:"entry"|"event"; sourcePath:string;
  name:string; field?:string; effect?:Effect; date?:TimelineDate; active:boolean;
  locations:Reference[]; locationState:LocationState; supersededBy?:string; explanation?:string;
  span?:{start:TimelineDate;end:TimelineDate}; invalidDate?:boolean;
  order?:number;
}
export interface StateFrame {
  key?:number; state:PresenceState; locationState:LocationState; locations:Reference[];
  observed:boolean; visible:boolean; stateSources:string[]; locationSources:string[];
}
export interface EntryHistory {path:string; name:string; type:string; stationary:boolean; records:HistoryRecord[]; frames:StateFrame[]; diagnostics:Diagnostic[]}
export interface StateTimelines {entries:Map<string,EntryHistory>; diagnostics:Diagnostic[]}
const typeOf=(note:TimelineNote)=>note.type??String(property(note.fields,"type")??"Other");
const present=(value:unknown)=>value!==undefined&&value!==null&&value!=="";
function initial(entry:EntryHistory):StateFrame {
  return {state:"unknown",locationState:entry.stationary?"stationary":"unknown",locations:entry.stationary?[{path:entry.path,name:entry.name,type:entry.type}]:[],observed:false,visible:false,stateSources:[],locationSources:[]};
}
/** Build once from frontmatter-derived evidence. No presentation position becomes a date. */
export function buildStateTimelines(notes:TimelineNote[],index:TimelineIndex,world:WorldTimeline,settings:TimelineSettings,resolve:LinkResolver):StateTimelines {
  const entries=new Map<string,EntryHistory>(),byPath=new Map(notes.map(note=>[note.path,note]));
  for(const note of notes)entries.set(note.path,{path:note.path,name:note.name,type:typeOf(note),stationary:isType(note,"Location"),records:[],frames:[],diagnostics:[]});
  const add=(record:HistoryRecord)=>entries.get(record.entry)?.records.push(record);
  for(const change of index.selfChanges)add({id:`own:${change.path}:${change.field.toLowerCase()}`,kind:"state",entry:change.path,source:"entry",sourcePath:change.path,name:change.field,field:change.field,effect:change.effect,date:change.date,active:true,locations:[],locationState:"unknown"});
  for(const event of world.events){
    const locationState:LocationState=event.lane===MULTIPLE?"conflict":event.lane===UNPLACED?"unknown":"known";
    const shared={source:"event" as const,sourcePath:event.path,name:event.name,date:event.effective,active:true,locations:event.locations,locationState,order:event.order,invalidDate:event.invalid,span:event.effective&&event.start&&event.end?{start:event.start,end:event.end}:undefined};
    for(const participant of event.participants)add({...shared,id:`presence:${event.path}:${participant.path}`,kind:"presence",entry:participant.path});
    // Locations host events but never acquire movement records.
    for(const location of event.locations)add({...shared,id:`host:${event.path}:${location.path}`,kind:"event",entry:location.path,locationState:"stationary"});
    add({...shared,id:`event:${event.path}`,kind:"event",entry:event.path});
    const note=byPath.get(event.path)!;
    for(const field of settings.fields){
      const subjects=new Set(wikiLinks(property(note.fields,field.name)).flatMap(link=>{const path=resolve(link.target,event.path);return path?[path]:[];}));
      for(const path of subjects){const subject=byPath.get(path);if(!subject||!applies(field,{...subject,type:typeOf(subject)}))continue;
        add({...shared,id:`state:${event.path}:${path}:${field.name.toLowerCase()}`,kind:"state",entry:path,field:field.name,effect:field.effect,name:field.name});
      }
    }
  }
  const diagnostics:Diagnostic[]=[];
  const issuesByPath=new Map<string,Diagnostic[]>();
  for(const issue of world.diagnostics){let list=issuesByPath.get(issue.path);if(!list){list=[];issuesByPath.set(issue.path,list);}list.push(issue);}
  for(const entry of entries.values()){
    const note=byPath.get(entry.path)!;
    const own=new Map(entry.records.filter(r=>r.kind==="state"&&r.source==="entry").map(r=>[r.field!.toLowerCase(),r]));
    for(const record of entry.records){
      if(record.kind!=="state"||record.source!=="event"||!present(property(note.fields,record.field!)))continue;
      const authority=own.get(record.field!.toLowerCase());
      record.active=false;record.supersededBy=authority?.id;
      record.explanation=authority?"Entry's own date takes precedence.":"Entry's own value must be repaired before this fact can be dated.";
      if(authority?.date&&record.date&&authority.date.key!==record.date.key){
        entry.diagnostics.push({code:"state-date-mismatch",path:entry.path,field:record.field,message:`The entry's own date overrides the date supplied by ${record.sourcePath}.`});
      }
    }
    entry.records.sort((a,b)=>(a.date?.key??Infinity)-(b.date?.key??Infinity)||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));
    let frame=initial(entry);
    const dated=entry.records.filter((r):r is HistoryRecord&{date:TimelineDate}=>r.active&&!!r.date);
    for(let i=0;i<dated.length;){
      const key=dated[i].date.key,start=i;while(i<dated.length&&dated[i].date.key===key)i++;
      const group=dated.slice(start,i),states=group.filter(r=>r.kind==="state"),moves=group.filter(r=>r.kind==="presence");
      frame={...frame,key};
      if(states.length){
        const effects=new Set(states.map(r=>r.effect));frame.state=effects.size>1?"conflict":effects.has("Appears")?"present":"absent";frame.stateSources=states.map(r=>r.id);
        if(frame.state==="conflict")entry.diagnostics.push({code:"state-conflict",path:entry.path,message:"Conflicting Appears and Disappears changes at the same time; no order is assumed."});
      }
      if(moves.length&&!entry.stationary){
        const locations=new Map(moves.flatMap(r=>r.locations).map(l=>[l.path,l]));
        frame.locations=[...locations.values()];frame.locationSources=moves.map(r=>r.id);
        frame.locationState=locations.size>1||moves.some(r=>r.locationState==="conflict")?"conflict":moves.some(r=>r.locationState==="unknown")||!locations.size?"unknown":"known";
        if(frame.locationState==="conflict")entry.diagnostics.push({code:"location-conflict",path:entry.path,message:"Presence records name different locations at the same time; no location is chosen."});
      }
      frame.observed=frame.observed||group.some(r=>r.kind==="presence"||r.kind==="event");
      frame.visible=frame.state==="present"||frame.state==="conflict"||(frame.state==="unknown"&&frame.observed);
      entry.frames.push(frame);
    }
    for(const path of new Set([entry.path,...entry.records.map(r=>r.sourcePath)]))entry.diagnostics.push(...issuesByPath.get(path)??[]);
    diagnostics.push(...entry.diagnostics.filter(d=>["state-date-mismatch","state-conflict","location-conflict"].includes(d.code)));
  }
  return {entries,diagnostics};
}
/** Binary-search the last evidence checkpoint, preserving unknown before first evidence. */
export function stateAt(entry:EntryHistory,time:number):StateFrame {
  if(Number.isNaN(time))throw new Error("Timeline time must be a number.");
  let low=0,high=entry.frames.length;
  while(low<high){const mid=(low+high)>>>1;if(entry.frames[mid].key!<=time)low=mid+1;else high=mid;}
  return low?entry.frames[low-1]:initial(entry);
}
