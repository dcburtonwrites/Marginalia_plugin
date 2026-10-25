/** Optional local-model acceptance samples. Only fictional text; results are for human review. */
import {readFile,writeFile} from 'node:fs/promises';
import {retrieve} from '../src/core/retrieval.ts';
import {prompt,cleanDraft,librarianSystem,groundingReviewSystem,groundingReviewPrompt,validateGroundingReview,validateEvidenceBoundaries} from '../src/core/writing.ts';
import {cleanAnswer} from '../src/core/answers.ts';
import {generate} from '../src/ollama.ts';
import type {Note} from '../src/core/types.ts';
async function main(){
const note=(path:string,text:string):Note=>({path,text,mtime:1,aliases:[],links:[],metadata:{}});
const target=note('02 Character/Mira.md','## Summary\n\n## Backstory\n\n## Goals\n');
const scene=note('08 Projects/Copper Sky/Scripts/Gate.md',`## Page 1

At an abandoned laboratory, Mira watches Len bind a cut on Orin's arm. The scene does not identify the laboratory's owner or maker.

Mira remembers a childhood story in which a lantern spoke. She calls it a dream, not a waking encounter.

Len says he suspects Mira built the laboratory. Mira does not confirm this; the narration gives no account of its construction.

Mira says, "I want to repair the gate today." She leaves with the tools; no repair is shown.`);
const packet=retrieve([target,scene],target,12000);packet.headings=['Summary','Backstory','Personality','Relationships','Abilities','Goals','Key Scenes','Related Entries'];
const settings={endpoint:'http://127.0.0.1:11434',model:process.env.MARGINALIA_MODEL??'gemma4:12b-mlx',context:32768};
const before=await import('../.preview/librarian-baseline/writing.ts');
const results=[];
for(const version of ['before','after'] as const){
 const writer=version==='before'?before:{prompt,librarianSystem};
 const character=await readFile(version==='before'?'.preview/librarian-baseline/character-writer.md':'src/prompts/character-writer.md','utf8');
 for(const mode of ['enhancement','expansion'] as const){
  const started=Date.now();
  const raw=await generate(settings,writer.librarianSystem+'\n'+character,writer.prompt(packet,mode),AbortSignal.timeout(180000));
  let validation='Accepted structurally',review='';try{const sections=cleanDraft(raw,packet);if(version==='after'){validateEvidenceBoundaries(packet,sections);review=await generate(settings,groundingReviewSystem,groundingReviewPrompt(packet,sections),AbortSignal.timeout(180000));validateGroundingReview(review,sections);validation='Accepted after source review';}}catch(error){validation=String(error);}
  results.push({version,mode,raw,validation,review,seconds:(Date.now()-started)/1000});
  await writeFile('.preview/librarian-quality-results.json',JSON.stringify({synthetic:true,model:settings.model,source:scene.text,results},null,2));
  console.log(version+' '+mode+': '+validation);
 }
}
const raw=await generate(settings,librarianSystem,prompt(packet,'ask','Who owns the laboratory, and did Mira complete the repair?'),AbortSignal.timeout(180000));
results.push({version:'after',mode:'ask',raw,...cleanAnswer(raw,packet)} as any);
await writeFile('.preview/librarian-quality-results.json',JSON.stringify({synthetic:true,model:settings.model,source:scene.text,results},null,2));
console.log('Ask sample complete; all results saved locally for review.');

}
void main().catch(error=>{console.error(error);process.exitCode=1;});
