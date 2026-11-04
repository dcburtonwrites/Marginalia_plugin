import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {buildTimelineIndex} from '../src/timeline/index.ts';
import {readTimeline,type TimelineNote} from '../src/timeline/model.ts';
import {buildWorldTimeline} from '../src/timeline/world.ts';
import {buildStateTimelines} from '../src/timeline/state.ts';
import {readWorkspace} from '../src/workspace/model.ts';
import {parseScript,organize} from '../src/scripts/model.ts';
const manifest=JSON.parse(await readFile('dist/greek-demo-manifest.json','utf8'));
const root='dist/greek-demo/Marginalia Greek Demo/';
const data=JSON.parse(await readFile(root+'.obsidian/plugins/marginalia/data.json','utf8'));
const notes:TimelineNote[]=manifest.notes.filter((n:TimelineNote)=>!n.path.startsWith('_templates/')&&!n.path.startsWith('00 Brainstorms/'));
const paths=new Set<string>(Object.keys(manifest.files));
const resolve=(target:string)=>{
 const clean=target.replace(/\.md$/,'');
 if(paths.has(clean+'.md'))return clean+'.md';
 const matches=[...paths].filter(p=>p.endsWith('/'+clean+'.md'));
 return matches.length===1?matches[0]:undefined;
};
const settings=readTimeline(data.timeline),workspace=readWorkspace(data.workspace);
assert(settings.enabled&&workspace.vaultType==='World');
assert.equal(settings.lanes.length,4);assert.equal(settings.groups.length,2);
const index=buildTimelineIndex(notes,settings);
assert.deepEqual(index.diagnostics,[],'Calendars and all dates must resolve');
const world=buildWorldTimeline(notes,index,settings,resolve);
assert.deepEqual(world.diagnostics,[],'All recorded event references must resolve');
assert.equal(world.events.filter(e=>e.effective).length,18);
assert.equal(world.events.filter(e=>!e.effective).length,2);
assert.equal(new Set(world.events.flatMap(e=>e.participants.map(p=>p.path))).size,20);
const appearances=new Map<string,number>();for(const e of world.events)for(const p of e.participants)appearances.set(p.path,(appearances.get(p.path)??0)+1);
assert([...appearances.values()].every(n=>n>=2),'Every participant needs a connected thread');
assert.equal(new Set(world.events.filter(e=>e.participants.some(p=>p.name==='Hermes')).flatMap(e=>e.locations.map(l=>l.path))).size,3,'Hermes must connect across three lanes');
const histories=buildStateTimelines(notes,index,world,settings,resolve);assert.deepEqual(histories.diagnostics,[],"No unintended state/location conflicts");
for(const name of workspace.pins)assert(paths.has(name),'Pinned walkthrough exists: '+name);
assert.equal(workspace.pins.length,5);
let scripts=0,pages=0,panels=0;const parsed=[];
for(const n of manifest.notes){
 const text=await readFile(root+n.path,'utf8');
 for(const [,raw] of text.matchAll(/\[\[([^\]]+)\]\]/g)){
  const target=raw.split('|')[0].split('#')[0];if(!target)continue;
  assert(resolve(target)||paths.has(target),'Unresolved wiki link: '+n.path+' → '+target);
 }
 if(n.path.includes('/Scripts/')){
  const script=parseScript({path:n.path,text,metadata:n.fields});assert(script,n.path);parsed.push(script);scripts++;pages+=script.pages.length;panels+=script.pages.reduce((sum,p)=>sum+p.panels.length,0);
 }
}
const groups=organize(parsed,resolve);for(const group of groups)assert.deepEqual(group.issues,[], 'Script order');
assert.equal(scripts,4);assert.equal(pages,10);assert.equal(panels,10);
assert.equal(data.model,'','No assumption of an installed model');
assert.deepEqual(data.writing.history,[]);assert.equal(data.writing.activeSession,null);
console.log(`Greek demo verified: ${manifest.notes.length} notes, 18 dated + 2 undated events, 20 connected participants, 4 lanes, 5 Home pins, ${scripts} scripts / ${pages} pages / ${panels} panels, clean dates/references.`);
