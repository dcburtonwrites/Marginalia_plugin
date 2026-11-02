import {bodyOffset,hash,permitted,title,type Note,type Packet,type Source} from "../core/types.ts";
import {eligible,type WorkspaceSettings,projectResolver} from "../workspace/model.ts";
import {folderPath} from "../workspace/setup-model.ts";
export type ReviewMode="enhancement"|"expansion"|"development"|"vault";
export interface Destination {hidden:boolean;folder:string}
export interface ReviewIndex {id:string;path:string;entry:string;kind:"development"|"report";updated:string}
export interface ReviewData {hidden:boolean;developmentFolder:string;reportFolder:string;index:ReviewIndex[]}
export interface Edit {id:string;kind:"insert"|"replace"|"delete";before:string;after:string;reason:string;state:"pending"|"accepted"|"dismissed"}
export interface Development {version:1;kind:"development";id:string;entry:string;created:string;updated:string;status:"active"|"complete";messages:{role:"user"|"assistant";text:string}[];summary:string;changes:Edit[];packet?:Packet;warnings:string[]}
export interface Finding {id:string;category:"supported"|"concern"|"opportunity";priority:"high"|"medium"|"low";title:string;reason:string;next:string;evidence:{path:string;quote:string}[];entries:string[];checked:boolean}
export interface Report {deterministic?:{path:string;code:string;message:string;field?:string}[];version:1;kind:"report";id:string;entry:string;created:string;updated:string;scope:string;findings:Finding[];coverage:{notes:number;parts:number;passes:number;excluded:number};notices:string[];facts:{path:string;quote:string}[]}
export type ReviewDocument=Development|Report;
export function readReviewData(value:unknown):ReviewData {
 const raw=value&&typeof value==="object"?value as Partial<ReviewData>:{};
 const safe=(value:unknown)=>{try{return typeof value==="string"&&value?folderPath(value):"";}catch{return "";}};
 return {hidden:raw.hidden===true,developmentFolder:safe(raw.developmentFolder),reportFolder:safe(raw.reportFolder),index:Array.isArray(raw.index)?raw.index.filter((x):x is ReviewIndex=>!!x&&typeof x.id==="string"&&/^[a-z0-9-]+$/i.test(x.id)&&typeof x.path==="string"&&safeDocumentPath(x.path)&&typeof x.entry==="string"&&["development","report"].includes(x.kind)&&typeof x.updated==="string").map(x=>({...x})):[]};
}
export function safeDocumentPath(path:string){return path.endsWith('.md')&&!path.includes('\\')&&!path.split('/').some(p=>!p||p==='.'||p==='..'||/[\u0000-\u001f]/.test(p))&&(!path.split('/').some(p=>p.startsWith('.'))||path.startsWith('.marginalia/development/')||path.startsWith('.marginalia/reviews/'));}
export function destination(data:ReviewData,settings:WorkspaceSettings,kind:"development"|"report"):Destination {
 const base=settings.entrySetup.brainstorm.folder.replace(/\/$/,"");return {hidden:data.hidden,folder:(kind==="development"?data.developmentFolder:data.reportFolder)||[base,kind==="development"?"Development":"Reviews"].filter(Boolean).join('/')};
}
export function documentPath(kind:"development"|"report",id:string,where:Destination,entry=""){
 if(!/^[a-z0-9-]+$/i.test(id))throw new Error('Invalid review identity.');
 const root=where.hidden?`.marginalia/${kind==='development'?'development':'reviews'}`:folderPath(where.folder);
 const name=kind==='development'&&entry?title(entry).replace(/[^\p{L}\p{N} _-]/gu,' ').trim().slice(0,60):'';
 return `${root==='/'?'':root+'/'}${kind==='development'?'Development':'Vault Review'}${name?' - '+name+' -':''} ${id}.md`;
}
export function jsonResponse(raw:string):Record<string,unknown>{
 const text=raw.trim().replace(/^```(?:json)?\s*\n/i,'').replace(/\n```\s*$/,'');let value:unknown;
 try{value=JSON.parse(text);}catch{
  // Some local compatible servers return literal line breaks inside JSON strings.
  // Escape control characters only; never guess missing fields, quotes or structure.
  let quoted=false,escaped=false,repaired='';for(const char of text){if(escaped){repaired+=char;escaped=false;continue;}if(char==='\\'&&quoted){repaired+=char;escaped=true;continue;}if(char==='"')quoted=!quoted;repaired+=quoted&&char.charCodeAt(0)<32?JSON.stringify(char).slice(1,-1):char;}
  try{value=JSON.parse(repaired);}catch{throw new Error('The local model returned an unreadable review. Your saved conversation is preserved; retry the response.');}
 }
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Expected a structured review response.');return value as Record<string,unknown>;
}
export function text(value:unknown,max=12000){if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error('The local model returned missing or oversized review text.');return value.trim();}
export function planEdit(source:string,edit:Pick<Edit,'kind'|'before'|'after'>){
 const offset=bodyOffset(source),at=source.indexOf(edit.before,offset);
 if(!edit.before||at<offset||source.indexOf(edit.before,at+1)>=0)throw new Error('The original passage is missing or ambiguous. Refresh the recommendations before applying this change.');
 if(edit.kind==='insert'){if(!edit.after.trim())throw new Error('The insertion is empty.');return {from:at+edit.before.length,to:at+edit.before.length,insert:'\n\n'+edit.after};}
 if(edit.kind==='replace'&&!edit.after.trim())throw new Error('The replacement is empty.');
 if(!['replace','delete'].includes(edit.kind))throw new Error('Unsupported change.');
 return {from:at,to:at+edit.before.length,insert:edit.kind==='delete'?'':edit.after};
}
export function developmentSummary(raw:string,packet:Packet){
 const data=jsonResponse(raw),warnings:string[]=[],changes:Edit[]=[];
 if(!Array.isArray(data.changes)||data.changes.length>30)throw new Error('Expected a bounded list of recommended changes.');
 for(const [i,value] of data.changes.entries()){try{
  const c=value as Edit;if(!c||!['insert','replace','delete'].includes(c.kind))throw new Error('Unsupported edit');
  const edit:Edit={id:`change-${i+1}`,kind:c.kind,before:text(c.before,16000),after:c.kind==='delete'?'':text(c.after,16000),reason:text(c.reason,2400),state:'pending'};planEdit(packet.target.text,edit);changes.push(edit);
 }catch{warnings.push(`Recommendation ${i+1} could not be safely matched to the original prose and was withheld.`);}}
 return {summary:text(data.summary),changes,warnings};
}
export function reviewNotes(notes:Note[],settings:WorkspaceSettings,target:string|null,wholeVault:boolean){
 const resolve=projectResolver(settings,notes),current=notes.find(n=>n.path===target),project=current?resolve(current.path,current.metadata):undefined;
 if(!wholeVault&&settings.vaultType==='Storyboard'&&!project)throw new Error('Open an entry in a project or choose Entire vault.');
 const brainstorm=settings.entrySetup.brainstorm.folder.replace(/\/$/,'');
 return notes.filter(n=>eligible(n.path)&&permitted(n.path)&&n.metadata.generated!==true&&!(brainstorm&&(n.path===brainstorm||n.path.startsWith(brainstorm+'/')))&&!/(?:brainstorms?|research|references|ramblings?)/i.test(n.path)&&!/(?:brainstorm|research|provisional)/i.test(String(n.metadata.status??''))&&(wholeVault||!project||!resolve(n.path,n.metadata)||resolve(n.path,n.metadata)===project));
}
export interface ReviewBatch {sources:Source[];primary:string[]}
/** Every original character belongs to a primary part; neighbors provide cross-entry context. */
export function reviewBatches(notes:Note[],budget:number):ReviewBatch[]{
 const limit=Math.max(800,Math.floor(budget*.6)),parts:Source[]=[];let id=0;
 for(const n of notes){let start=0;while(start<n.text.length){let end=Math.min(n.text.length,start+Math.floor(limit/4));if(end<n.text.length&&/[\uD800-\uDBFF]/.test(n.text[end-1]))end--;if(end<=start)end=start+1;
  const part:Source={id:`S${++id}`,notePath:n.path,excerpt:n.text.slice(start,end),offset:start,owner:n.path,role:'Original review passage'};
  while(new TextEncoder().encode(JSON.stringify(part)).length>limit&&end>start+1){end=start+Math.max(1,Math.floor((end-start)/2));if(end>start+1&&/[\uD800-\uDBFF]/.test(n.text[end-1]))end--;part.excerpt=n.text.slice(start,end);}
  if(new TextEncoder().encode(JSON.stringify(part)).length>limit)throw new Error('A source path or passage exceeds the review context allocation. Increase context before reviewing this scope.');
  parts.push(part);start=end;}}
 const batches:ReviewBatch[]=[];let batch:ReviewBatch={sources:[],primary:[]},used=0;
 for(const part of parts){const cost=new TextEncoder().encode(JSON.stringify(part)).length;if(used+cost>budget*.7&&batch.sources.length){batches.push(batch);batch={sources:[],primary:[]};used=0;}batch.sources.push(part);batch.primary.push(part.id);used+=cost;}if(batch.sources.length)batches.push(batch);
 const first=new Map(notes.map(n=>[n.path,parts.find(p=>p.notePath===n.path)!]));
 for(const batch of batches){let used=new TextEncoder().encode(JSON.stringify(batch)).length;const paths=new Set(batch.sources.map(s=>s.notePath));
  const linked=[...new Set(notes.filter(n=>paths.has(n.path)).flatMap(n=>n.links))];
  for(const path of linked){const neighbor=first.get(path);if(!neighbor||paths.has(path))continue;const cost=new TextEncoder().encode(JSON.stringify(neighbor)).length;if(used+cost<=budget){batch.sources.push(neighbor);const actual=new TextEncoder().encode(JSON.stringify(batch)).length;if(actual>budget)batch.sources.pop();else{paths.add(path);used=actual;}}}
  if(new TextEncoder().encode(JSON.stringify(batch)).length>budget)throw new Error('A source batch exceeds the configured review context. Increase context.');}
 return batches;
}
export function parseFindings(raw:string,sources:Source[],seed:string){
 const data=jsonResponse(raw);if(!Array.isArray(data.findings)||data.findings.length>40)throw new Error('The review did not return a usable findings list.');
 const findings:Finding[]=[],warnings:string[]=[];
 for(const [i,value] of data.findings.entries()){try{const v=value as Finding;
  if(!v||!['supported','concern','opportunity'].includes(v.category)||!['high','medium','low'].includes(v.priority)||!Array.isArray(v.evidence))throw new Error('Invalid finding');
  const evidence=v.evidence.slice(0,8).flatMap(e=>typeof e?.path==='string'&&typeof e.quote==='string'&&e.quote.length>=8&&e.quote.length<=1200&&sources.some(s=>s.notePath===e.path&&s.excerpt.includes(e.quote))?[{path:e.path,quote:e.quote}]:[]);
  if(!evidence.length)throw new Error('No verified evidence');
  const category=v.category==='supported'&&new Set(evidence.map(e=>e.path+'\n'+e.quote)).size<2?'concern':v.category;
  const readable=(value:string)=>value.replace(/\b([FS]\d+)\b/g,(id)=>{const source=sources.find(s=>s.id===id);return source?title(source.notePath):'the cited source';});
  const entries=Array.isArray(v.entries)?v.entries.filter(x=>typeof x==='string'&&x.trim()&&x.length<=240&&!sources.some(source=>[source.notePath,source.notePath.replace(/\.md$/i,''),title(source.notePath)].some(path=>path.toLowerCase()===x.trim().toLowerCase()))).map(x=>x.trim()).slice(0,8):[];
  findings.push({id:`${seed}-${i}`,category,priority:v.priority,title:readable(text(v.title,240)),reason:readable(text(v.reason,2400)),next:readable(text(v.next,1800)),evidence,entries,checked:false});
 }catch{warnings.push('A finding without valid original evidence or a usable structure was withheld.');}}
 return {findings,warnings};
}
export function mergeFindings(findings:Finding[]){
 const grouped=new Map<string,Finding>();
 for(const finding of findings){const evidence=finding.evidence.map(e=>e.path+'\n'+e.quote).sort();const key=hash(finding.category+'\n'+(evidence.length>1?JSON.stringify(evidence):finding.title.toLowerCase()+JSON.stringify(evidence)));const prior=grouped.get(key);
  if(!prior){grouped.set(key,{...finding,evidence:[...finding.evidence],entries:[...finding.entries]});continue;}
  if(!prior.next.includes(finding.next))prior.next+=' Another approach: '+finding.next;
  prior.entries=[...new Set([...prior.entries,...finding.entries])];
  if(['high','medium','low'].indexOf(finding.priority)<['high','medium','low'].indexOf(prior.priority))prior.priority=finding.priority;
 }
 return [...grouped.values()].sort((a,b)=>['high','medium','low'].indexOf(a.priority)-['high','medium','low'].indexOf(b.priority));
}
