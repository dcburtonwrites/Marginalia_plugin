import {eligible} from "../workspace/model.ts";
import {bodyOffset,title,type Note,type Packet} from "../core/types.ts";
import {buildTimelineIndex} from "./index.ts";
import {buildWorldTimeline,type LinkResolver} from "./world.ts";
import {buildStateTimelines,type HistoryRecord} from "./state.ts";
import {isType,type TimelineSettings,type TimelineNote,type Diagnostic} from "./model.ts";
import {formatDate,type TimelineDate} from "./calendar.ts";
export interface LibrarianTimeline {
  coverage:string;
  calendars:{path:string;precision:string;offset?:number}[];
  records:{id:string;source:string;kind:string;field?:string;effect?:string;date?:string;dateStatus:"dated"|"invalid"|"undated";calendar?:string;time?:number;precision?:string;active:boolean;explanation?:string;locations:string[];locationState:string}[];
  issues:Diagnostic[];
  omitted:number;
}
export const timelineGuidance="Timeline interpretation: use only the supplied source-linked timeline context and original notes. Dates use signed years including zero; parallel calendars share the supplied time key. Lower-precision dates sort at their beginning without asserting a finer authored date. Span effects and movement apply at End. An entry's own lifecycle field overrides EVERY event-supplied occurrence of the same field, including repeated Lost/Found cycles; retain discrepancies as issues, not competing facts. An invalid own date blocks fallback until repaired. Inactive records are not operative state changes. Unknown is different from absent. A dated event presence is evidence of presence/location, not an invented birth or lifecycle effect. Locations stay stationary. Undated predecessor placement is relational only and supplies no date. Simultaneous conflicting state/location remains unresolved; never choose an alphabetical winner. Latest recorded evidence is historical, not a timeless current fact. Do not infer an age, elapsed-day duration, travel speed, travel impossibility or missing journey from calendar sort fractions. Diagnostics are author-review issues, not automatic corrections. Coverage is limited to admitted original evidence; omitted records or missing dates cannot establish absence. Cite original source paths, never derived record IDs.";
/** Adapt exactly the text used by this request; native YAML parsing stays in the host port. */
export function librarianTimelineNotes(notes:Note[],parse:(text:string)=>Record<string,unknown>,type:(note:Note)=>string|undefined){
  const parsed:TimelineNote[]=[],issues:Diagnostic[]=[];
  for(const note of notes.filter(note=>eligible(note.path))){try{parsed.push({path:note.path,name:title(note.path),type:type(note),fields:parse(note.text),tags:note.tags});}
    catch(error){issues.push({code:"frontmatter-invalid",path:note.path,message:error instanceof Error?error.message:String(error)});}}
  return {notes:parsed,issues};
}
/** Facts may use only admitted complete original frontmatter, never budget-excluded notes. */
export function librarianTimeline(packet:Packet,parsed:ReturnType<typeof librarianTimelineNotes>,settings:TimelineSettings,resolve:LinkResolver,budget:number):LibrarianTimeline|undefined{
  const admitted=new Set([packet.target.path,...packet.sources.filter(s=>s.offset===0&&s.role.startsWith("Declared metadata")&&bodyOffset(s.excerpt)===s.excerpt.length).map(s=>s.notePath)]);
  const missingCalendars=parsed.notes.filter(note=>isType(note,"Calendar")&&!admitted.has(note.path)).length;
  if(missingCalendars){
    const limited:LibrarianTimeline={coverage:"Calendar definitions are incomplete in this request. Date interpretation is withheld; missing evidence is not absence.",calendars:[],records:[],issues:[],omitted:missingCalendars};
    return new TextEncoder().encode(JSON.stringify(limited)).length<=budget?limited:undefined;
  }
  const notes=parsed.notes.filter(n=>admitted.has(n.path));
  const paths=new Set(notes.map(n=>n.path));
  const resolver:LinkResolver=(target,source)=>{const path=resolve(target,source);return path&&paths.has(path)?path:undefined;};
  const index=buildTimelineIndex(notes,settings),world=buildWorldTimeline(notes,index,settings,resolver),states=buildStateTimelines(notes,index,world,settings,resolver);
  const entry=states.entries.get(packet.target.path),relevant=new Set([packet.target.path,...entry?.records.map(r=>r.sourcePath)??[],...notes.filter(n=>isType(n,"Calendar")).map(n=>n.path)]);
  const result:LibrarianTimeline={coverage:"Admitted original frontmatter only; missing evidence is not absence. No age, travel or lifecycle-sequence review.",calendars:[],records:[],issues:[],omitted:0};
  const size=()=>new TextEncoder().encode(JSON.stringify(result)).length;
  const add=<T>(list:T[],value:T)=>{list.push(value);if(size()>budget){list.pop();result.omitted++;}};
  for(const c of index.registry.calendars)add(result.calendars,{path:c.path,precision:c.precision,offset:c.offset});
  const date=(value?:TimelineDate)=>{if(!value)return undefined;try{return formatDate(value,index.registry);}catch{return undefined;}};
  const records=[...entry?.records??[]].sort((a,b)=>Number(a.source!=="entry")-Number(b.source!=="entry")||(a.date?.key??Infinity)-(b.date?.key??Infinity)||a.id.localeCompare(b.id));
  const record=(r:HistoryRecord):LibrarianTimeline["records"][number]=>({id:r.id,source:r.sourcePath,kind:r.kind,field:r.field,effect:r.effect,date:date(r.date),dateStatus:r.date?"dated":r.invalidDate?"invalid":"undated",calendar:r.date?.calendar,time:r.date?.key,precision:r.date?.precision,active:r.active,explanation:r.explanation,locations:r.locations.map(l=>l.path),locationState:r.locationState});
  for(const r of records)add(result.records,record(r));
  const issues=[...parsed.issues.filter(d=>admitted.has(d.path)),...world.diagnostics,...states.diagnostics].filter(d=>!d.path||relevant.has(d.path));
  const seen=new Set<string>();for(const original of issues){const located={...original,path:original.path||packet.target.path};const issue=original.code==="link-unresolved"?{...located,message:"A frontmatter link cannot be resolved within the admitted evidence."}:original.code==="order-dangling"?{...located,message:"The predecessor cannot be validated within the admitted evidence."}:original.code==="calendar-missing"?{...located,message:"No Calendar definition was admitted to this request. Supply Calendar evidence or increase context before interpreting dates."}:located;const key=JSON.stringify(issue);if(!seen.has(key)){seen.add(key);add(result.issues,issue);}}
  if(size()>budget)return undefined;
  return result;
}
