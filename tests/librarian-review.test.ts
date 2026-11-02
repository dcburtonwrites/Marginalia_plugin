import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyOffset,hash,type Note,type Packet} from '../src/core/types.ts';
import {readWorkspace} from '../src/workspace/model.ts';
import {readReviewData,destination,documentPath,planEdit,developmentSummary,reviewBatches,reviewNotes,parseFindings,type Development,type Report} from '../src/librarian/model.ts';
import {encodeReview,decodeReview,saveReview,reviewBody,type ReviewPort} from '../src/librarian/storage.ts';
import {ReviewController,type ReviewHost} from '../src/librarian/controller.ts';
import {developmentSystem,developmentPrompt,vaultReviewSystem,vaultReviewPrompt} from '../src/librarian/prompts.ts';
const note=(path='Mira.md',text='## Summary\n\nOriginal prose about Mira.',metadata:Record<string,unknown>={}):Note=>({path,text,metadata,mtime:1,aliases:[],links:[]});
function packet(n=note()):Packet{return {target:n,sources:[{id:'S1',notePath:n.path,excerpt:n.text,offset:0,owner:n.path,role:'Original'}],stamps:[{path:n.path,mtime:1,hash:hash(n.text)}],headings:['Summary'],guidance:'',omitted:0,excluded:0};}
const development=():Development=>({version:1,kind:'development',id:'session-1',entry:'Mira.md',created:'2026-11-01',updated:'2026-11-01',status:'active',messages:[],summary:'',changes:[],warnings:[]});
const report=():Report=>({version:1,kind:'report',id:'report-1',entry:'Mira.md',created:'2026-11-01',updated:'2026-11-01',scope:'Entire vault',findings:[{id:'finding-1',category:'concern',priority:'high',title:'Missing motive',reason:'A possible gap.',next:'Explore the motive.',evidence:[{path:'Mira.md',quote:'Original prose about Mira.'}],entries:[],checked:false}],coverage:{notes:1,parts:1,passes:1,excluded:0},notices:[],facts:[]});
function fixture(){const files=new Map<string,string>(),data=readReviewData(null),settings=readWorkspace(null),current=packet();let model=async(_system:string,_user:string)=>JSON.stringify({reply:'What outcome matters to Mira?',readyToSummarize:false}),applied=0,reads=0;
 const storage:ReviewPort={read:async path=>files.get(path)??null,mkdir:async()=>{},create:async(path,text)=>{assert.ok(!files.has(path));files.set(path,text);},replace:async(path,expected,text)=>{assert.equal(files.get(path),expected);files.set(path,text);}};
 const host:ReviewHost={data:()=>data,settings:()=>settings,context:()=>32768,target:()=>current.target.path,saveIndex:async()=>{},storage:()=>storage,refresh:()=>{},progress:()=>{},task:async work=>work(new AbortController().signal),packet:async()=>current,verify:async()=>{},generate:async(system,user)=>{reads++;return model(system,user);},apply:async(p,edit)=>{applied++;const c=planEdit(p.target.text,edit);return {...p,target:{...p.target,text:p.target.text.slice(0,c.from)+c.insert+p.target.text.slice(c.to)}};},originals:async()=>[note(),note('Archive.md','The archive bars all visitors at dawn.')],stamp:notes=>hash(JSON.stringify(notes)),timeline:batch=>({context:null,sources:batch.sources}),open:()=>{}};
 const controller=new ReviewController(host);return {files,data,settings,current,storage,host,controller,setModel:(next:typeof model)=>{model=next;},applied:()=>applied,reads:()=>reads};}
test('review storage defaults follow Brainstorms and safe destination overrides do not migrate existing workspaces',()=>{
 const data=readReviewData(null),settings=readWorkspace(null);assert.ok(destination(data,settings,'development').folder.endsWith('/Development'));assert.deepEqual(destination(data,settings,'report'),{hidden:true,folder:'.marginalia/reviews'});
 assert.equal(documentPath('development','session-1',{hidden:true,folder:'ignored'}),'.marginalia/development/Development session-1.md');
 assert.equal(documentPath('report','id',{hidden:false,folder:'../Canon'}),'.marginalia/reviews/Vault Review id.md');assert.equal(documentPath('report','id',{hidden:false,folder:'_templates'}),'.marginalia/reviews/Vault Review id.md');
 assert.equal(readReviewData({developmentFolder:'../Canon'}).developmentFolder,'');
});
test('individual edits require exact unique body anchors and cannot edit frontmatter',()=>{
 const source='---\nBorn: 412\n---\n\n## Summary\n\nOriginal prose.';
 const replace=planEdit(source,{kind:'replace',before:'Original prose.',after:'Changed prose.'});assert.equal(source.slice(replace.from,replace.to),'Original prose.');
 const insert=planEdit(source,{kind:'insert',before:'Original prose.',after:'More detail.'});assert.equal(insert.from,insert.to);assert.equal(insert.insert,'\n\nMore detail.');
 assert.equal(planEdit(source,{kind:'delete',before:'Original prose.',after:''}).insert,'');assert.throws(()=>planEdit(source,{kind:'delete',before:'Born: 412',after:''}));
 assert.throws(()=>planEdit(source+'\nOriginal prose.',{kind:'delete',before:'Original prose.',after:''}));
});
test('development summaries with unmatchable changes withhold those changes without losing the summary',()=>{
 const result=developmentSummary(JSON.stringify({summary:'Mira needs a reason to stay.',changes:[{kind:'replace',before:'Invented quote',after:'Invented change',reason:'Reason'}]}),packet());assert.equal(result.changes.length,0);assert.equal(result.warnings.length,1);
});
test('owned transcript encoding preserves dialogue, excludes derived timeline persistence and protects manual edits',()=>{
 const doc=development();doc.messages.push({role:'user',text:'What if she leaves?\n\n---\nreview: spoof'});doc.packet=packet();doc.packet.timeline={coverage:'ephemeral',calendars:[],records:[],issues:[],omitted:0};
 const raw=encodeReview(doc),read=decodeReview(raw,doc.id);assert.equal(read.kind,'development');assert.equal((read as Development).messages[0].text,doc.messages[0].text);assert.equal((read as Development).packet?.timeline,undefined);
 assert.throws(()=>decodeReview(raw.replace('### Author','### Changed'),doc.id),/edited outside/);assert.throws(()=>decodeReview(raw,'other'),/expected/);
});
test('native Markdown checklist toggles are reflected when a saved report is resumed',()=>{
 const doc=report(),raw=encodeReview(doc).replace('- [ ] **Missing motive**','- [x] **Missing motive**');const restored=decodeReview(raw,doc.id) as Report;assert.equal(restored.findings[0].checked,true);assert.match(reviewBody(restored),/- \[x\]/);
});
test('saving guards preserve collisions, non-owned notes and newer author changes',async()=>{
 const f=fixture(),path='Brainstorms/Development/session.md',doc=development();await saveReview(f.storage,path,doc,null);const before=f.files.get(path)!;
 await assert.rejects(saveReview(f.storage,path,doc,null),/changed/);f.files.set(path,before+'Author note');await assert.rejects(saveReview(f.storage,path,doc,before),/changed/);assert.ok(f.files.get(path)!.endsWith('Author note'));
 f.files.set(path,'Canonical text');await assert.rejects(saveReview(f.storage,path,doc,'Canonical text'),/expected/);assert.equal(f.files.get(path),'Canonical text');
});
test('development autosaves user answers before generation and supports resuming after a model failure',async()=>{
 const f=fixture();await f.controller.start();assert.equal(f.controller.active?.doc.kind,'development');const path=f.controller.active!.index.path;
 f.setModel(async()=>{throw new Error('Model unavailable');});await assert.rejects(f.controller.reply('She needs to protect her sister.'),/unavailable/);
 const saved=decodeReview(f.files.get(path)!,f.controller.active!.doc.id) as Development;assert.equal(saved.messages.at(-1)?.text,'She needs to protect her sister.');
 const next=new ReviewController(f.host);await next.resume(saved.id);assert.equal((next.active!.doc as Development).messages.at(-1)?.role,'user');assert.equal(f.applied(),0);
});
test('model completion wraps up automatically while edits require individual acceptance and development can continue',async()=>{
 const f=fixture();await f.controller.start();f.setModel(async(_system,user)=>user.includes('Summarize the author')?JSON.stringify({summary:'Mira stays to protect her sister.',changes:[{kind:'replace',before:'Original prose about Mira.',after:'Mira stays to protect her sister.',reason:'The author chose this motive.'}]}):JSON.stringify({reply:'That establishes a useful motive.',readyToSummarize:true}));
 await f.controller.reply('She stays to protect her sister.');const doc=f.controller.active!.doc as Development;assert.equal(doc.status,'complete');assert.equal(doc.changes.length,1);assert.equal(f.applied(),0);
 await f.controller.accept(doc.changes[0].id);assert.equal(f.applied(),1);assert.equal(doc.changes[0].state,'accepted');await f.controller.accept(doc.changes[0].id);assert.equal(f.applied(),1);
 await f.controller.continue();assert.equal(doc.status,'active');assert.equal(doc.changes[0].state,'accepted');
});
test('multiple development sessions use their own destinations and retain previous transcripts',async()=>{
 const f=fixture();await f.controller.start({hidden:false,folder:'Custom/Development'});const first=f.controller.active!.index.path;await f.controller.start({hidden:true,folder:'ignored'});assert.equal(f.data.index.length,2);assert.ok(f.files.has(first));assert.ok(f.controller.active!.index.path.startsWith('.marginalia/development/'));
});
test('review scope keeps a Storyboard project and shared canon isolated unless entire vault is selected',()=>{
 const settings=readWorkspace(null);settings.vaultType='Storyboard';settings.entrySetup.projectsFolder='Projects';const notes=[note('Projects/A/Overview.md','A',{role:'project'}),note('Projects/A/Mira.md'),note('Projects/B/Overview.md','B',{role:'project'}),note('Projects/B/Mira.md'),note('01 Lore/Shared.md'),note('Brainstorms/Draft.md'),note('Generated.md','Generated',{generated:true})];
 const local=reviewNotes(notes,settings,'Projects/A/Mira.md',false);assert.ok(local.some(n=>n.path==='01 Lore/Shared.md'));assert.ok(!local.some(n=>n.path.startsWith('Projects/B/')));assert.ok(!local.some(n=>n.metadata.generated));assert.ok(reviewNotes(notes,settings,null,true).some(n=>n.path.startsWith('Projects/B/')));assert.throws(()=>reviewNotes(notes,settings,null,false),/Open an entry/);
});
test('review batches cover every source character and keep cross-entry linked context',()=>{
 const a=note('A.md','A'.repeat(10000)),b=note('B.md','Neighbor evidence.');a.links=[b.path];const batches=reviewBatches([a,b],1800),parts=batches.flatMap(batch=>batch.sources.filter(s=>batch.primary.includes(s.id)));
 assert.equal(parts.filter(p=>p.notePath===a.path).map(p=>p.excerpt).join(''),a.text);assert.equal(parts.filter(p=>p.notePath===b.path).map(p=>p.excerpt).join(''),b.text);assert.ok(batches.length>1);assert.ok(batches[0].sources.some(s=>s.notePath===b.path));
});
test('AI findings require verbatim original evidence and weak contradictions are downgraded',()=>{
 const sources=packet().sources;const finding={category:'supported',priority:'high',title:'Potential gap',reason:'Motive missing',next:'Ask about motive',evidence:[{path:'Mira.md',quote:'Original prose about Mira.'}],entries:[]};
 const parsed=parseFindings(JSON.stringify({findings:[finding,{...finding,evidence:[{path:'Other.md',quote:'Invented evidence.'}]}]}),sources,'test');assert.equal(parsed.findings.length,1);assert.equal(parsed.findings[0].category,'concern');assert.equal(parsed.warnings.length,1);
});
test('vault review maps sources, compares verified quotations and saves a real checklist without changing original notes',async()=>{
 const f=fixture();f.setModel(async(_system,user)=>{const finding={category:'opportunity',priority:'medium',title:'Explore access policy',reason:'The entry and archive may need a relationship.',next:'Develop why Mira has access.',evidence:[{path:'Mira.md',quote:'Original prose about Mira.'}],entries:['Archive access']};return JSON.stringify({findings:[finding],facts:[{path:'Mira.md',quote:'Original prose about Mira.'},{path:'Archive.md',quote:'The archive bars all visitors at dawn.'}]});});
 await f.controller.vault(true,{hidden:false,folder:'Brainstorms/Reviews'});assert.ok(f.controller.active!.index.path.startsWith('.marginalia/reviews/'));const resumed=new ReviewController(f.host);await resumed.resume(f.controller.active!.index.id);assert.equal(resumed.active!.doc.kind,'report');const doc=f.controller.active!.doc as Report;assert.equal(doc.kind,'report');assert.equal(doc.coverage.notes,2);assert.ok(doc.coverage.passes>=2);assert.equal(f.applied(),0);assert.ok(f.files.get(f.controller.active!.index.path)!.includes('- [ ]'));
 await f.controller.checked(doc.findings[0].id,true);assert.ok(f.files.get(f.controller.active!.index.path)!.includes('- [x]'));
});
test('a changed source inventory blocks publishing a completed Vault Review',async()=>{
 const f=fixture();let changed=false;f.host.originals=async()=>[note('Mira.md',changed?'Changed source':'Original prose about Mira.')];f.setModel(async()=>{changed=true;return '{"findings":[],"facts":[]}';});await assert.rejects(f.controller.vault(true),/changed during review/);assert.equal(f.files.size,0);
});
test('reasoning guidance is adaptive and distinguishes AI thinking from deterministic checks',()=>{
 assert.match(developmentSystem,/without a prescribed interview script/);assert.match(developmentSystem,/constraints, costs/);assert.match(vaultReviewSystem,/Do not restate deterministic/);
 assert.match(developmentPrompt(packet(),development()),/readyToSummarize/);assert.match(vaultReviewPrompt(packet().sources,'Entire vault'),/exact supplied excerpts/);
});

test('deterministic timeline notices remain separate from interpretive AI findings in saved reports',async()=>{
 const f=fixture();f.host.timeline=batch=>({context:{},sources:batch.sources,diagnostics:[{path:'Mira.md',code:'state-date-mismatch',message:'Own birth date wins.'}]});f.setModel(async()=>'{"findings":[],"facts":[]}');await f.controller.vault(true);const doc=f.controller.active!.doc as Report;assert.equal(doc.findings.length,0);assert.equal(doc.deterministic?.length,1);assert.match(reviewBody(doc),/Deterministic timeline notices · separate/);
});
test('model failure during automatic wrap-up preserves the full exchange for a later manual retry',async()=>{
 const f=fixture();await f.controller.start();f.setModel(async(_system,user)=>user.includes('Summarize the author')?'not JSON':JSON.stringify({reply:'Ready to summarize.',readyToSummarize:true}));await assert.rejects(f.controller.reply('That covers my question.'),/review|structure/);const doc=decodeReview(f.files.get(f.controller.active!.index.path)!,f.controller.active!.doc.id) as Development;assert.equal(doc.status,'active');assert.equal(doc.messages.at(-1)?.text,'Ready to summarize.');
});

test('local-server literal line breaks in JSON strings are repaired without guessing structure',async()=>{
 const f=fixture();f.setModel(async()=>'{"reply":"First thought.\n\nA focused question?","readyToSummarize":false}');await f.controller.start();assert.equal((f.controller.active!.doc as Development).messages[0].text,'First thought.\n\nA focused question?');
 f.setModel(async()=>'{"reply":"Unclosed text}');await assert.rejects(f.controller.reply('More detail.'),/unreadable review/);
});

test('structured review generation explicitly requests JSON without changing ordinary chat requests',async()=>{
 const {generate}=await import('../src/ollama.ts');const requests:any[]=[];
 const transport:any=async(url:URL,body:any)=>{if(url.pathname==='/api/show')return {model_info:{'test.context_length':32768}};requests.push(body);return {message:{content:'{"reply":"Question?","readyToSummarize":false}'},done_reason:'stop'};};
 const settings={endpoint:'http://127.0.0.1:11434',model:'test-local',context:32768};await generate(settings,'System','Return JSON',new AbortController().signal,transport,undefined,'json');assert.equal(requests[0].format,'json');await generate(settings,'System','Ordinary chat',new AbortController().signal,transport);assert.equal(requests[1].format,undefined);
});

test('incomplete structured output from a local proxy retries the complete task without losing instructions',async()=>{
 const f=fixture(),formats:(string|undefined)[]=[],prompts:string[]=[];f.host.generate=async(_system,user,_signal,format)=>{formats.push(format);prompts.push(user);return format==='json'?'{"reply":"':JSON.stringify({reply:'Which consequence matters?',readyToSummarize:false});};await f.controller.start();assert.deepEqual(formats,['json',undefined]);assert.equal(prompts[0],prompts[1]);assert.equal((f.controller.active!.doc as Development).messages[0].text,'Which consequence matters?');await f.controller.reply('Her sister.');assert.equal(formats.at(-1),undefined);
});

test('duplicate findings with the same evidence consolidate actions and existing entries are not proposed as new',async()=>{
 const {mergeFindings}=await import('../src/librarian/model.ts'),sources=[{...packet().sources[0],id:'F0'},{...packet(note('Gate.md','Two operators are always required.')).sources[0],id:'F1'}];
 const first={category:'concern',priority:'high',title:'Conflict',reason:'F0 conflicts with F1.',next:'Clarify the exception.',evidence:[{path:'Mira.md',quote:'Original prose about Mira.'},{path:'Gate.md',quote:'Two operators are always required.'}],entries:['Gate.md','Operator training']};
 const parsed=parseFindings(JSON.stringify({findings:[first,{...first,title:'Capability issue',next:'Explain the override.',evidence:[...first.evidence].reverse()}]}),sources,'dedup');assert.match(parsed.findings[0].reason,/Mira conflicts with Gate/);assert.deepEqual(parsed.findings[0].entries,['Operator training']);const merged=mergeFindings(parsed.findings);assert.equal(merged.length,1);assert.match(merged[0].next,/Explain the override/);
});

test('conversation context grows with the configured model context rather than silently truncating saved answers',async()=>{
 const f=fixture();await f.controller.start();f.host.context=()=>16384;await assert.rejects(f.controller.reply('A'.repeat(20000)),/context setting/);assert.equal((f.controller.active!.doc as Development).messages.at(-1)?.text.length,20000);
 f.host.context=()=>65536;await f.controller.reply();assert.equal((f.controller.active!.doc as Development).messages.at(-1)?.role,'assistant');
});

test('source batching bounds serialized bytes for Unicode and escaped control characters without dropping original text',()=>{
 const original=note('Unicode.md',('甲"\n\u0001').repeat(600));const batches=reviewBatches([original],1200);assert.ok(batches.every(batch=>new TextEncoder().encode(JSON.stringify(batch)).length<=1200));assert.equal(batches.flatMap(batch=>batch.sources.filter(s=>batch.primary.includes(s.id))).map(s=>s.excerpt).join(''),original.text);
});


test('legacy visible reports stay readable but subsequent saves use hidden storage without overwriting the old note',async()=>{
 const f=fixture(),doc=report(),legacy='00 Brainstorms/Reviews/Legacy.md',raw=encodeReview(doc);
 f.files.set(legacy,raw);f.data.index.push({id:doc.id,path:legacy,entry:doc.entry,kind:'report',updated:doc.updated});
 await f.controller.resume(doc.id);assert.equal(f.controller.active!.doc.kind,'report');
 await f.controller.checked(doc.findings[0].id,true);
 assert.equal(f.files.get(legacy),raw);assert.equal(f.data.index[0].path,'.marginalia/reviews/Vault Review report-1.md');
 const next=new ReviewController(f.host);await next.resume(doc.id);assert.equal((next.active!.doc as Report).findings[0].checked,true);
});
