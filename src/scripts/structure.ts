import type {Script,ScriptEdit,Page,Panel} from './model.ts';
export type Edge='before'|'after';
export type BlockKind='page'|'panel';

/** Relocate original slices rather than serializing Markdown or changing authored labels. */
function relocate(script:Script,block:Page|Panel,at:number):ScriptEdit|null {
  if(at>=block.from&&at<=block.to)return null;
  const text=script.text,own=text.slice(block.from,block.to),eol=text.includes('\r\n')?'\r\n':'\n';
  const join=(a:string,b:string)=>a&&b&&!a.endsWith('\n')?eol+eol:'';
  if(at<block.from){
    const between=text.slice(at,block.from),separator=join(own,between);
    return {from:at,to:block.to,text:own+separator+between,cursor:at};
  }
  const between=text.slice(block.to,at),separator=join(between,own);
  return {from:block.from,to:at,text:between+separator+own,cursor:block.from+between.length+separator.length};
}
export function movePageTo(script:Script,from:number,target:number,edge:Edge):ScriptEdit|null {
  const own=script.pages.find(page=>page.from===from),other=script.pages.find(page=>page.from===target);
  if(!own||!other)throw new Error('The page outline changed. Try the move again.');
  return relocate(script,own,edge==='before'?other.from:other.to);
}
export function movePanelTo(script:Script,from:number,target:number,edge:Edge|'inside'):ScriptEdit|null {
  const own=script.pages.flatMap(page=>page.panels).find(panel=>panel.from===from);
  const other=edge==='inside'?script.pages.find(page=>page.from===target):script.pages.flatMap(page=>page.panels).find(panel=>panel.from===target);
  if(!own||!other)throw new Error('The panel outline changed. Try the move again.');
  return relocate(script,own,edge==='before'?other.from:other.to);
}
export function movePage(script:Script,offset:number,direction:-1|1):ScriptEdit|null {
  const index=script.pages.findIndex(page=>offset>=page.from&&(offset<page.to||offset===script.text.length&&page.to===offset));
  if(index<0)throw new Error('Place the cursor inside a page.');
  const target=script.pages[index+direction];
  if(!target)throw new Error('This page is already at the edge of its script.');
  return movePageTo(script,script.pages[index].from,target.from,direction<0?'before':'after');
}
export function navigationOffset(script:Script,offset:number,kind:BlockKind,direction:-1|1):number|null {
  const blocks=kind==='page'?script.pages:script.pages.flatMap(page=>page.panels);
  if(direction>0)return blocks.find(block=>block.from>offset)?.from??null;
  const current=blocks.findIndex(block=>offset>=block.from&&(offset<block.to||offset===script.text.length&&block.to===offset));
  if(current>=0)return blocks[current-1]?.from??null;
  return blocks.filter(block=>block.from<offset).at(-1)?.from??null;
}
