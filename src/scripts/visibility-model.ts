import {bodyOffset} from '../core/types.ts';
import {sourceLines} from './model.ts';
export interface ScriptDisplay {panels:boolean;notes:boolean;dialogue:boolean;}
export const fullScriptDisplay=():ScriptDisplay=>({panels:true,notes:true,dialogue:true});
const fieldName=/^(side|pages?|panel description|location|scene|sfx|caption)$/i;
export function isScriptDialogue(line:string){
  const bold=line.trim().match(/^\*\*(.+?)(?::\*\*|\*\*:)\s*\S/);
  if(bold)return !fieldName.test(bold[1]);
  const plain=line.match(/^([\p{L}\p{N}][\p{L}\p{N} .’'()\/-]{0,79}):\s+\S/u);
  return !!plain&&!fieldName.test(plain[1])&&plain[1]===plain[1].toUpperCase();
}
/** Presentation ranges only; frontmatter, fenced examples and comments are never content controls. */
export function hiddenScriptRanges(text:string,show:ScriptDisplay){
  const lines=sourceLines(text),body=bodyOffset(text),ranges:{from:number;to:number}[]=[];
  let fence='',comment='';
  for(let n=0;n<lines.length;n++){
    const line=lines[n];if(line.from<body)continue;
    const marker=line.text.match(/^\s*(`{3,}|~{3,})/);
    if(marker){if(!fence)fence=marker[1];else if(marker[1][0]===fence[0]&&marker[1].length>=fence.length)fence='';continue;}
    if(fence)continue;
    const commented=!!comment||/<!--|%%/.test(line.text);
    for(const token of line.text.matchAll(/<!--|-->|%%/g)){if(!comment&&(token[0]==='<!--'||token[0]==='%%'))comment=token[0]==='<!--'?'-->':'%%';else if(token[0]===comment)comment='';}
    if(commented||/^(?: {4}|\t)/.test(line.text))continue;
    const callout=line.text.match(/^>\s*\[!([^\]]+)\]/);
    if(callout){
      let end=n;while(end+1<lines.length&&/^>/.test(lines[end+1].text)&&!/^>\s*\[!/.test(lines[end+1].text))end++;
      const panel=callout[1].toLowerCase()==='panel';
      if(panel?!show.panels:!show.notes){
        const from=panel?line.from+line.text.length:line.from,to=lines[end].from+lines[end].text.length;
        if(to>from)ranges.push({from,to});
      }
      n=end;continue;
    }
    if(!show.dialogue&&isScriptDialogue(line.text)){
      let end=n;while(end+1<lines.length&&lines[end+1].text.trim()&&!/^(?:>|#|\*\*)/.test(lines[end+1].text))end++;
      ranges.push({from:line.from,to:lines[end].from+lines[end].text.length});n=end;
    }
  }
  return ranges;
}
