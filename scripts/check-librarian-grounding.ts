/** Fictional local-model challenge: reject changed objects/unsupported certainty; accept supported prose. */
import {writeFile} from 'node:fs/promises';
import {retrieve} from '../src/core/retrieval.ts';
import {groundingReviewSystem,groundingReviewPrompt,validateGroundingReview,validateEvidenceBoundaries} from '../src/core/writing.ts';
import {generate} from '../src/ollama.ts';
import type {Note} from '../src/core/types.ts';
async function main(){
 const target:Note={path:'02 Character/Nara.md',text:'## Summary\n',mtime:1,metadata:{},aliases:[],links:[]};
 const scene:Note={...target,path:'08 Projects/Acceptance/Scenes/Gate.md',text:'Nara waits at an abandoned laboratory. Its owner and maker are not named. Len says he suspects Nara built it, but Nara does not confirm this. Nara says, "I want to repair the gate today." She leaves with tools. No repair is shown.'};
 const packet=retrieve([target,scene],target),results=[];
 for(const [name,prose,expected] of [
  ['changed object','Len suspects Nara built the gate, though Nara does not confirm this.',false],
  ['unsupported certainty','Nara departs with tools, but no repair occurs.',false],
  ['invented ownership','Nara owns the abandoned laboratory.',false],
  ['supported','Nara waits at an abandoned laboratory. She says she wants to repair the gate today and leaves with tools; no repair is shown.',true],
 ] as const){
  const sections=[{section:'Summary',prose}];
  const raw=await generate({endpoint:'http://127.0.0.1:11434',model:process.env.MARGINALIA_MODEL??'gemma4:12b-mlx',context:32768},groundingReviewSystem,groundingReviewPrompt(packet,sections),AbortSignal.timeout(180000));
  let accepted=true,reason='';try{validateEvidenceBoundaries(packet,sections);validateGroundingReview(raw,sections);}catch(error){accepted=false;reason=String(error);}
  results.push({name,prose,raw,accepted,reason,expected});
  console.log(name+': '+(accepted?'accepted':'withheld'));
 }
 await writeFile('.preview/librarian-grounding-check.json',JSON.stringify({synthetic:true,model:process.env.MARGINALIA_MODEL??'gemma4:12b-mlx',source:scene.text,results},null,2));
 if(results.some(result=>result.accepted!==result.expected))throw new Error('The local grounding review did not meet both acceptance expectations.');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
