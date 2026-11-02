import test from "node:test";
import assert from "node:assert/strict";
import {retrieve,evidenceNotes} from "../src/core/retrieval.ts";
import {bodyOffset,type Note,type Packet} from "../src/core/types.ts";
import {librarianTimeline,librarianTimelineNotes,timelineGuidance} from "../src/timeline/librarian.ts";
import {readTimeline} from "../src/timeline/model.ts";
import {freshness,sameFreshness} from "../src/core/freshness.ts";
import {readWorkspace} from "../src/workspace/model.ts";
import {prompt,groundingReviewPrompt} from "../src/core/writing.ts";
const note=(path:string,metadata:Record<string,unknown>={},body="Original account of Mira and the archive."):Note=>({path,text:`---\n${JSON.stringify(metadata)}\n---\n## Summary\n\n${body}`,metadata,mtime:1,aliases:[],links:[]});
const parse=(text:string):Record<string,unknown>=>JSON.parse(text.slice(4,bodyOffset(text)).split('\n---')[0]);
const calendar=()=>note('Calendar.md',{type:'Calendar',primary:true,aliases:['AS'],precision:'year'});
const source=(n:Note,id:number)=>({id:`S${id}`,notePath:n.path,excerpt:n.text.slice(0,bodyOffset(n.text)),offset:0,owner:n.path,role:'Declared metadata belongs to this source owner; blank fields are not facts'});
function packet(notes:Note[],target=notes[1]):Packet{return {target,sources:notes.map(source),stamps:[],omitted:0,excluded:0,headings:['Summary'],guidance:''};}
function context(notes:Note[],p=packet(notes),budget=12000){
 const resolve=(target:string)=>{const key=target.replace(/\.md$/i,'');const exact=notes.find(n=>n.path.replace(/\.md$/i,'')===key);if(exact)return exact.path;const matches=notes.filter(n=>n.path.split('/').at(-1)!.replace(/\.md$/i,'')===key);return matches.length===1?matches[0].path:undefined;};
 return librarianTimeline(p,librarianTimelineNotes(notes,parse,()=>undefined),readTimeline({enabled:true}),resolve,budget)!;
}
test('Librarian timeline records preserve own precedence, span ends and original-source identity',()=>{
 const notes=[calendar(),note('Mira.md',{type:'Character',Born:412}),note('Archive.md',{type:'Location'}),note('Founding.md',{type:'Event',Start:410,End:415,Born:'[[Mira]]',Locations:'[[Archive]]'})];
 const c=context(notes);assert.equal(c.records.find(r=>r.source==='Mira.md')?.time,412);assert.equal(c.records.find(r=>r.source==='Founding.md'&&r.kind==='state')?.active,false);
 assert.equal(c.records.find(r=>r.source==='Founding.md'&&r.kind==='presence')?.time,415);assert.equal(c.issues.filter(d=>d.code==='state-date-mismatch').length,1);assert.ok(c.records.every(r=>notes.some(n=>n.path===r.source)));
});
test('Librarian date interpretation uses exact request text rather than stale cached metadata',()=>{
 const own=note('Mira.md',{type:'Character',Born:412});own.metadata.Born=400;
 assert.equal(context([calendar(),own]).records[0].time,412);
 const broken={...own,text:'---\nnot valid\n---\nOriginal prose'};const c=context([calendar(),broken]);assert.equal(c.records.length,0);assert.ok(c.issues.some(d=>d.code==='frontmatter-invalid'));
});
test('only admitted full metadata can supply context; excluded passages and prose links are not timeline facts',()=>{
 const notes=[calendar(),note('Mira.md',{type:'Character'}),note('Meeting.md',{type:'Event',Date:5,Cast:'[[Mira]]'}),note('Prose.md',{type:'Event',Date:6},'Mira was here. [[Mira]]')];
 const p=packet(notes);p.sources=p.sources.filter(s=>s.notePath!=='Meeting.md');const c=context(notes,p);
 assert.equal(c.records.length,0);assert.equal(context(notes).records.filter(r=>r.source==='Meeting.md').length,1);
 p.sources.push({...source(notes[2],2),excerpt:'---\n{"Date":5}',role:'Declared metadata'});assert.equal(context(notes,p).records.length,0);
});
test('timeline supplementation keeps project/provisional/archive boundaries and Calendar metadata shares the retrieval budget',()=>{
 const notes=[calendar(),note('08 Projects/Harbor/Mira.md'),note('08 Projects/Harbor/Meeting.md',{type:'Event',Date:1}),note('08 Projects/Other/Secrets.md',{type:'Event',Date:2},'Mira has a secret.'),note('Research/Guess.md',{type:'Event',Date:3}),note('Archive/Old.md',{type:'Event',Date:4})];
 const scope=(n:Note)=>/^08 Projects\/([^/]+)/.exec(n.path)?.[1];const allowed=evidenceNotes(notes,notes[1],scope);
 assert.deepEqual(allowed.map(n=>n.path),notes.slice(0,3).map(n=>n.path));
 const p=retrieve(notes,notes[1],12000,[],'',scope,['Calendar.md']);assert.ok(p.sources.some(s=>s.notePath==='Calendar.md'&&s.offset===0));assert.ok(!p.sources.some(s=>s.notePath==='Calendar.md'&&s.offset>0));assert.ok(!p.sources.some(s=>s.notePath.includes('Secrets')));
});
test('context truncation has a bounded UTF-8 size and a visible omission count',()=>{
 const notes=[calendar(),note('Mira.md',{type:'Character',Born:0}),...Array.from({length:80},(_,i)=>note(`Event ${i}.md`,{type:'Event',Date:i,Cast:'[[Mira]]'}))];
 for(const budget of [250,500,1000,3000]){const c=context(notes,packet(notes),budget);assert.ok(c);assert.ok(c.omitted>0);assert.ok(new TextEncoder().encode(JSON.stringify(c)).length<=budget);}
 const c=context(notes,packet(notes),500);assert.ok(c.records.every(r=>r.source==='Mira.md'||r.source.startsWith('Event')));
});
test('unknown and conflicts are not resolved by context; undated placement never acquires a date',()=>{
 const notes=[calendar(),note('Mira.md',{type:'Character'}),note('A.md',{type:'Location'}),note('B.md',{type:'Location'}),note('Both.md',{type:'Event',Date:1,Born:'[[Mira]]',Died:'[[Mira]]',Locations:['[[A]]','[[B]]']}),note('Undated.md',{type:'Event','Preceded By':'[[Both]]',Cast:'[[Mira]]'})];
 const c=context(notes);assert.ok(c.issues.some(d=>d.code==='state-conflict'));assert.ok(c.issues.some(d=>d.code==='location-conflict'));assert.equal(c.records.find(r=>r.source==='Undated.md')?.time,undefined);assert.ok(c.records.find(r=>r.source==='Both.md')!.locations.length===2);
});
test('timeline policy and context reach Ask, writing and source review without treating derived IDs as citations',()=>{
 const notes=[calendar(),note('Mira.md',{type:'Character',Born:0})],p=packet(notes);p.timeline=context(notes,p);
 for(const mode of ['ask','enhancement','expansion'] as const){const text=prompt(p,mode,'When was Mira born?');assert.ok(text.includes(timelineGuidance));assert.ok(text.includes('own:Mira.md:born'));}
 assert.ok(groundingReviewPrompt(p,[]).includes(timelineGuidance));assert.ok(timelineGuidance.includes('EVERY'));assert.ok(timelineGuidance.includes('never derived record IDs'));
 const plain=packet(notes);assert.ok(!prompt(plain,'ask').includes('Timeline interpretation:'));
});
test('chronology configuration changes stale results; display calendar and lanes do not',()=>{
 const notes=[calendar(),note('Mira.md')],settings=readWorkspace(null),timeline=readTimeline({enabled:true});const stamp=(value=timeline)=>freshness(notes,notes[1],settings,32768,value);
 assert.ok(!sameFreshness(stamp(),stamp({...timeline,fields:[]})));assert.ok(!sameFreshness(stamp(),stamp({...timeline,primaryCalendar:'Other.md'})));assert.ok(!sameFreshness(stamp(),stamp({...timeline,enabled:false})));
 assert.ok(sameFreshness(stamp(),stamp({...timeline,displayCalendar:'Other.md',lanes:[{path:'A.md',enabled:false,group:'Hidden'}]})));
 settings.vaultType='Storyboard';assert.ok(sameFreshness(stamp(),stamp({...timeline,fields:[]})));
});

test('timeline adaptation excludes asset and template notes even if supplied as source material',()=>{
 const notes=[calendar(),note('Mira.md',{type:'Character'}),note('Assets/Claim.md',{type:'Event',Date:1,Born:'[[Mira]]'}),note('_templates/Claim.md',{type:'Event',Date:2,Born:'[[Mira]]'})];
 const c=context(notes);assert.equal(c.records.length,0);assert.ok(!librarianTimelineNotes(notes,parse,()=>undefined).notes.some(n=>n.path.startsWith('Assets/')||n.path.startsWith('_templates/')));
});
test('an omitted primary calendar cannot turn an admitted secondary calendar into a guessed default',()=>{
 const notes=[calendar(),note('Mira.md',{type:'Character',Born:412}),note('Secondary.md',{type:'Calendar',precision:'year'})],p=packet(notes);p.sources=p.sources.filter(source=>source.notePath!=='Calendar.md');
 const c=context(notes,p);assert.equal(c.records.length,0);assert.ok(c.omitted>0);assert.match(c.coverage,/interpretation is withheld/);
});
