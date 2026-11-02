import {bodyOffset,title} from "../core/types.ts";
import {safeDocumentPath,type ReviewDocument,type Report} from "./model.ts";
export interface ReviewPort {read(path:string):Promise<string|null>;mkdir(path:string):Promise<void>;create(path:string,text:string):Promise<void>;replace(path:string,expected:string,text:string):Promise<void>}
const link=(path:string)=>`[[${path.replace(/\.md$/i,'')}]]`;
const safe=(value:string)=>value.replace(/\r?\n/g,' ').replace(/[\[\]<>]/g,'');
export function reviewBody(doc:ReviewDocument){
 const lines=[`# ${doc.kind==='development'?'Development · '+title(doc.entry):'Vault Review'}`,'','> [!note] Provisional Librarian workspace','> Questions, hypotheses and recommendations are not established canon. Changes require individual acceptance.',''];
 if(doc.kind==='development'){
  lines.push(`Entry: ${link(doc.entry)}`,`Status: ${doc.status}`,'','## Conversation','');
  for(const message of doc.messages)lines.push(`### ${message.role==='user'?'Author':'Librarian'}`,'',message.text,'');
  if(doc.summary)lines.push('## Development summary','',doc.summary,'');
  for(const change of doc.changes)lines.push(`### ${change.kind} · ${change.state}`,'',change.reason,'','Original passage:','',...change.before.split('\n').map(s=>'> '+s),'','Recommendation:','',change.kind==='delete'?'Remove the quoted passage.':change.after,'');
  for(const warning of doc.warnings)lines.push('> [!warning] Review needed','> '+safe(warning),'');
 }else{
  lines.push(`Scope: ${doc.scope}`,`Coverage: ${doc.coverage.notes} original notes, ${doc.coverage.parts} primary passages, ${doc.coverage.passes} AI passes; ${doc.coverage.excluded} excluded notes.`,'','This is an AI review of the supplied material, not a proof of complete consistency. Source-supported findings still require author judgement.','');
  for(const notice of doc.notices)lines.push('> '+safe(notice),'');
  for(const [category,label] of [['supported','Source-supported contradictions'],['concern','Possible concerns'],['opportunity','Development opportunities']] as const){
   lines.push(`## ${label}`,'');for(const f of doc.findings.filter(f=>f.category===category)){
    lines.push(`- [${f.checked?'x':' '}] **${safe(f.title)}** · ${f.priority} priority ^${f.id}`,`  - ${safe(f.reason)}`,`  - Next: ${safe(f.next)}`);
    for(const e of f.evidence)lines.push(`  - ${link(e.path)}: “${safe(e.quote)}”`);
    if(f.entries.length)lines.push('  - Possible entries: '+f.entries.map(safe).join('; '));lines.push('');
   }if(!doc.findings.some(f=>f.category===category))lines.push('No findings returned in this category. This does not establish that no issues exist.','');
  }
  if(doc.deterministic){lines.push('## Deterministic timeline notices · separate from AI findings','');for(const issue of doc.deterministic)lines.push(`- ${link(issue.path)}: ${safe(issue.message)}`);if(!doc.deterministic.length)lines.push('No notices supplied by the admitted metadata. This is not a complete deterministic audit.');lines.push('');}
 }
 return lines.join('\n').trimEnd()+'\n';
}
export function encodeReview(doc:ReviewDocument){
 const data=doc.kind==='development'&&doc.packet?{...doc,packet:{...doc.packet,timeline:undefined}}:doc;
 const result=`---\ngenerated: true\nstatus: provisional\n"marginalia-review": 1\nreview: ${JSON.stringify(data)}\n---\n\n${reviewBody(doc)}`;
 if(result.length>8_000_000)throw new Error('This review workspace is too large to save safely. Start another conversation.');return result;
}
export function decodeReview(raw:string,id:string):ReviewDocument {
 if(raw.length>8_000_000)throw new Error('Saved review is too large; file preserved.');
 const header=raw.slice(0,bodyOffset(raw)),line=/^review: (.+)\r?$/m.exec(header);let doc:ReviewDocument;
 try{doc=JSON.parse(line?.[1]??'null');}catch{throw new Error('Saved review metadata is damaged; file preserved.');}
 if(!/^"marginalia-review": 1\r?$/m.test(header)||!doc||doc.version!==1||doc.id!==id||!['development','report'].includes(doc.kind)||typeof doc.entry!=='string'||typeof doc.created!=='string'||typeof doc.updated!=='string')throw new Error('This file is not the expected Librarian workspace; file preserved.');
 if(doc.kind==='development'){
  if(!['active','complete'].includes(doc.status)||!Array.isArray(doc.messages)||!Array.isArray(doc.changes)||typeof doc.summary!=='string'||!Array.isArray(doc.warnings)||doc.warnings.some(w=>typeof w!=='string')||doc.messages.some(m=>!m||!['user','assistant'].includes(m.role)||typeof m.text!=='string')||doc.changes.some(c=>!c||!['insert','replace','delete'].includes(c.kind)||typeof c.before!=='string'||typeof c.after!=='string'||typeof c.reason!=='string'||!['pending','accepted','dismissed'].includes(c.state)))throw new Error('Saved development is unsupported; file preserved.');
 }else{
  if(!Array.isArray(doc.findings)||!doc.coverage||!Array.isArray(doc.notices)||!Array.isArray(doc.facts)||doc.findings.some(f=>!f||typeof f.title!=='string'||typeof f.reason!=='string'||typeof f.next!=='string'||!Array.isArray(f.evidence)||f.evidence.some(e=>typeof e.path!=='string'||typeof e.quote!=='string')||!Array.isArray(f.entries)||typeof f.id!=='string'||!/^[-a-z0-9]+$/i.test(f.id)||typeof f.checked!=='boolean'||f.entries.some(e=>typeof e!=='string')||!['supported','concern','opportunity'].includes(f.category)||!['high','medium','low'].includes(f.priority)))throw new Error('Saved report is unsupported; file preserved.');
  for(const finding of doc.findings){const match=new RegExp(`^- \\[([ xX])\\].*\\^${finding.id.replace(/[^a-z0-9-]/gi,'')}\\s*$`,'m').exec(raw.slice(bodyOffset(raw)));if(match)finding.checked=match[1].toLowerCase()==='x';}
 }
 if(raw.slice(bodyOffset(raw)).trimStart()!==reviewBody(doc))throw new Error('This workspace was edited outside Librarian. It is preserved; open the saved note or start a new session.');
 return doc;
}
export async function saveReview(port:ReviewPort,path:string,doc:ReviewDocument,expected:string|null){
 if(!safeDocumentPath(path))throw new Error('Invalid review destination.');
 const raw=await port.read(path);if(raw!==expected)throw new Error('The saved workspace changed. Reopen it before saving; newer edits are preserved.');
 if(raw!==null)decodeReview(raw,doc.id);
 const encoded=encodeReview(doc);await port.mkdir(path.slice(0,path.lastIndexOf('/')));
 if(raw===null)await port.create(path,encoded);else await port.replace(path,raw,encoded);
 if(await port.read(path)!==encoded)throw new Error('The saved review could not be verified. Check the note before continuing.');return encoded;
}
