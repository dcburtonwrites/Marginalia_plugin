import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {threadsFixture,threadsIcon,threadsRoot} from '../tests/fixtures/threads/fixture.ts';
const vault=resolve('.preview/Marginalia Test Vault'),notes=threadsFixture();
let prior:Record<string,string>={};try{prior=JSON.parse(await readFile('.preview/threads-fixture-manifest.json','utf8')).hashes??{};}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
async function create(path:string,source:string){const full=resolve(vault,path);if(!full.startsWith(vault+'/'))throw new Error('Fixture path escaped vault');let existing:string|undefined;try{existing=await readFile(full,'utf8');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}if(existing!==undefined){if(existing!==source){if(!process.argv.includes('--refresh-owned')||!prior[path]||createHash('sha256').update(existing).digest('hex')!==prior[path])throw new Error(`Preserving different existing fixture: ${path}`);await writeFile(full,source);}return;}await mkdir(dirname(full),{recursive:true});await writeFile(full,source,{flag:'wx'});}
const hashes:Record<string,string>={};
for(const n of notes){const source='---\n'+Object.entries({...n.fields,tags:n.tags}).map(([k,v])=>`${k}: ${JSON.stringify(v)}`).join('\n')+`\n---\n\n# ${n.name}\n\nSynthetic Threads demonstration. This note belongs to the isolated test fixture.\n`;await create(n.path,source);hashes[n.path]=createHash('sha256').update(source).digest('hex');}
for(let i=0;i<10;i++)await create(`${threadsRoot}/Assets/marker-${String(i+1).padStart(2,'0')}.svg`,threadsIcon(i));
const counts:Record<string,number>={};for(const e of notes.filter(n=>n.type==='Event'))for(const field of ['Characters','Items','Affiliations','Systems'])for(const value of (e.fields[field]??[]) as string[]){const path=value.slice(2,-2)+'.md';counts[path]=(counts[path]??0)+1;}
if(Object.keys(counts).length!==20||Object.values(counts).some(n=>n<2||n>5))throw new Error('Invalid fixture participant coverage');
await writeFile('.preview/threads-fixture-manifest.json',JSON.stringify({root:threadsRoot,datedEvents:12,undatedEvents:1,participants:20,counts,hashes},null,2)+'\n');
process.stdout.write('Threads Demo: 12 dated events, 1 undated event, 20 participants occurring 2–5 times, 4 locations and 10 local icons. Unrelated existing files preserved.\n');
