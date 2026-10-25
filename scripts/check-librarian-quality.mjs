// Local-only, fictional before/after samples. Requires an explicitly installed local model.
import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync,spawnSync} from 'node:child_process';
const baseline='cc09b8f2257d7b28bb4fb9fcfeca313367214cf3';
await mkdir('.preview/librarian-baseline',{recursive:true});
for(const [source,name] of [['src/core/writing.ts','writing.ts'],['src/core/types.ts','types.ts'],['src/prompts/character-writer.md','character-writer.md']]){
 await writeFile('.preview/librarian-baseline/'+name,execFileSync('git',['show',baseline+':'+source]));
}
await build({entryPoints:['scripts/check-librarian-quality.ts'],bundle:true,platform:'node',format:'cjs',outfile:'.preview/check-librarian-quality.cjs'});
const result=spawnSync(process.execPath,['.preview/check-librarian-quality.cjs'],{stdio:'inherit',env:process.env});
process.exitCode=result.status??1;
