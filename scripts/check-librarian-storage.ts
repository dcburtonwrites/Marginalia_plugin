/** Synthetic vault-byte portability and conservative inventory timing; never reads a user vault. */
import {mkdtemp,mkdir,readFile,writeFile,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {makeExpansion,saveExpansion,restoreExpansion,decode,recoveryPath,type HiddenPort} from '../src/core/storage.ts';
import {retrieve} from '../src/core/retrieval.ts';
import {expansionPath,type Note} from '../src/core/types.ts';
import {freshness} from '../src/core/freshness.ts';
import {readWorkspace} from '../src/workspace/model.ts';
const root=await mkdtemp(join(tmpdir(),'marginalia-storage-'));
const makePort=(base:string):HiddenPort=>({
 read:async path=>{try{return await readFile(join(base,path),'utf8');}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}},
 write:async(path,value)=>{await writeFile(join(base,path),value);},
 mkdir:async path=>{await mkdir(join(base,path),{recursive:true});},
});
const target:Note={path:'02 Character/Mira.md',text:'## Abilities\n\n',mtime:1,aliases:[],links:[],metadata:{}};
const source:Note={...target,path:'01 Lore/Archive.md',text:'Mira guards the eastern archive.'};
const notes=[target,source],packet=retrieve(notes,target),settings=readWorkspace(undefined);
packet.freshness=freshness(notes,target,settings,32768);
const first=makeExpansion(packet,'## Abilities\n\nMira guards the eastern archive.'),a=makePort(join(root,'A')),b=makePort(join(root,'B'));
await saveExpansion(a,first,null);const original=(await a.read(expansionPath(target.path)))!;
await saveExpansion(a,{...first,draft:'## Abilities\n\nMira guards the archive.'},original);
await cp(join(root,'A'),join(root,'B'),{recursive:true});
assert.equal((await b.read(recoveryPath(target.path))),original);
await restoreExpansion(b,target.path,await b.read(expansionPath(target.path)));
assert.deepEqual(decode((await b.read(expansionPath(target.path)))!,target.path),first);
const many=[...notes,...Array.from({length:1198},(_,index)=>({...source,path:`01 Lore/Reference ${index}.md`,text:`Unrelated original reference ${index}.`}))];
const retrieval:number[]=[],inventory:number[]=[];
for(let i=0;i<12;i++){
 let start=performance.now();retrieve(many,target);retrieval.push(performance.now()-start);
 start=performance.now();freshness(many,target,settings,32768);inventory.push(performance.now()-start);
}
const median=(values:number[])=>Number(values.sort((a,b)=>a-b)[Math.floor(values.length/2)].toFixed(2));
console.log(JSON.stringify({portableCopy:'pass',recoveryRestore:'pass',notes:many.length,runs:12,medianMs:{retrieval:median(retrieval),inventory:median(inventory)},scope:'Synthetic local copy; real Sync and physical devices not tested.'},null,2));
