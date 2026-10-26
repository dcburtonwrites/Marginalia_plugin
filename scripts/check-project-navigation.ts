import assert from 'node:assert/strict';
import {ScriptController} from '../src/scripts/controller.ts';
import {TFile} from '../tests/obsidian-mock.ts';
import {readWriting} from '../src/scripts/writing.ts';
import {readWorkspace} from '../src/workspace/model.ts';
async function main(){
const files=Array.from({length:1200},(_,i)=>new TFile(`08 Projects/Bench ${Math.floor(i/100)}/Scripts/Scene ${i}.md`));
const source=(i:number)=>Array.from({length:6},(_,page)=>`## Page ${page+1}\n\n> [!panel] Beat ${i}\n> An original description.\n\n**MIRA:** A short line.\n`).join('\n');
const texts=new Map(files.map((file,i)=>[file.path,source(i)]));
files.forEach(file=>Object.assign(file.stat,{size:texts.get(file.path)!.length}));
const metadata={role:'manuscript',format:'comic-script',Group:'Draft'};
const plugin:any={workspaceSettings:readWorkspace(undefined),writing:readWriting(undefined),scriptOrders:{},savePluginData:async()=>{},app:{
 vault:{getMarkdownFiles:()=>files,cachedRead:async(file:TFile)=>texts.get(file.path),read:async(file:TFile)=>texts.get(file.path)},
 metadataCache:{getFileCache:()=>({frontmatter:metadata}),getFirstLinkpathDest:()=>undefined},workspace:{iterateAllLeaves:()=>{}},
}};
const controller=new ScriptController(plugin);
await controller.groups();const cold={...controller.metrics};await controller.groups();const warm={...controller.metrics};
assert.equal(warm.reads,cold.reads);assert.equal(warm.parses,cold.parses);
const last=files.at(-1)!;texts.set(last.path,texts.get(last.path)!+'\n## Page 7\n');Object.assign(last.stat,{mtime:2,size:texts.get(last.path)!.length});controller.invalidate(last.path);
await controller.groups();const changed={...controller.metrics};assert.equal(changed.parses-warm.parses,1);assert.equal(changed.reads-warm.reads,1);
console.log(JSON.stringify({scripts:files.length,pages:files.length*6,projects:12,cold,warm,oneChanged:changed,checks:'Warm pass performs no extra original reads or parsing; a one-script edit reads/parses one script.',limitation:'Synthetic in-memory desktop host; excludes disk latency and DOM rendering.'},null,2));

}
void main();
