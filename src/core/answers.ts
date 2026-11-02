import {title,type Packet} from "./types.ts";

/** Repair only identities established by this request, never guess a vault destination. */
export function normalizeCitations(text:string,packet:Packet) {
  const paths=[...new Set([packet.target.path,...packet.sources.map(source=>source.notePath)])];
  const key=(value:string)=>value.replace(/\.md$/i,"").toLocaleLowerCase();
  const resolve=(input:string):string|undefined=>{
    let value=input.trim().replace(/^<|>$/g,"");
    try{value=decodeURIComponent(value);}catch{return;}
    const id=packet.sources.find(source=>source.id===value.toUpperCase());
    if(id)return id.notePath;
    const plain=value.split("#")[0];
    const exact=paths.find(path=>key(path)===key(plain));if(exact)return exact;
    const matches=paths.filter(path=>key(title(path))===key(plain));
    if(matches.length===1)return matches[0];
  };
  let invalid=0;
  const link=(target:string,label?:string)=>{
    let path=resolve(target);
    if(!path){
      const suffixed=/^(.*?),\s*(S\d+)\s*$/i.exec(target);
      if(suffixed){const named=resolve(suffixed[1]),identified=resolve(suffixed[2]);if(named&&named===identified)path=named;}
    }
    if(!path){invalid++;return label??target;}
    return `[[${path.replace(/\.md$/i,"")}|${label??title(path)}]]`;
  };
  const literals:string[]=[];
  text=text.replace(/```[^]*?```|`[^`\n]*`/g,value=>{const token=`MARGINALIA_CITATION_LITERAL_${literals.length}_END`;literals.push(value);return token;});
  text=text.replace(/!?\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g,(_all,target:string,label?:string)=>link(target,label))
    .replace(/\[([^\]\n]+)\]\(([^)\n]+)\)/g,(_all,label:string,target:string)=>link(target,label))
    .replace(/\[(S\d+)\]/gi,(_all,id:string)=>link(id))
    .replace(/\[\[([^\]\n]*)(?=\n|$)/g,(_all,value:string)=>{invalid++;return value;});
  text=text.replace(/MARGINALIA_CITATION_LITERAL_(\d+)_END/g,(_all,index:string)=>literals[Number(index)]);
  return {text,invalid};
}
export function possiblyIncomplete(text:string) {
  if((text.match(/^\s*```/gm)?.length??0)%2)return true;
  const paragraph=text.trim().split(/\n\s*\n/).at(-1)?.trim()??"";
  if(!paragraph||/^(?:#{1,6}\s|[-*]\s|\d+[.)]\s|\|)/.test(paragraph))return false;
  const prose=paragraph.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g,"$2").replace(/\[\[([^\]]+)\]\]/g,"$1").replace(/[*_`>]/g,"").trim();
  return prose.split(/\s+/).length>=8&&/[\p{L}\p{N},;:—-]$/u.test(prose);
}
export function cleanAnswer(raw:string,packet:Packet){
  if(!raw.trim())throw new Error("The local model returned no answer. Previous results retained.");
  const result=normalizeCitations(raw.trim(),packet),warnings:string[]=[];
  if(result.invalid)warnings.push(`${result.invalid} unverified source reference${result.invalid===1?" was":"s were"} left as plain text. Only links resolved to the supplied original notes are clickable.`);
  if(possiblyIncomplete(raw))warnings.push("This answer may be incomplete: its ending appears unfinished. Ask again before relying on it.");
  if(!/\[\[[^\]\n]+\]\]/.test(result.text))warnings.push("No original-note citations were returned. The source list shows material consulted, not verification of individual claims.");
  if(packet.omitted)warnings.push(`Evidence coverage is limited: ${packet.omitted} source passages did not fit in this request.`);
  if(packet.timeline?.omitted)warnings.push(`${packet.timeline.omitted} timeline records, calendars or issues did not fit; this is not a complete continuity review.`);
  return {text:result.text,warnings};
}
