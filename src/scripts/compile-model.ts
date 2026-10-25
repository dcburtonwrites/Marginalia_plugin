import { sourceLines, pageLabel, panelLabel, type Script, type ScriptGroup } from "./model.ts";
import { frontmatter } from "./properties.ts";

export interface CompileOptions {
  panels: boolean; notes: boolean; cover: boolean;
  paper: "Letter" | "A4"; numbers: "local" | "continuous";
  breaks: boolean; metadata: boolean; pdfNumbers: boolean;
  excluded: string[];
}
export function readCompileOptions(input: unknown): CompileOptions {
  const v = input && typeof input === "object" ? input as Partial<CompileOptions> : {};
  return {panels:v.panels!==false, notes:v.notes!==false, cover:v.cover!==false,
    paper:v.paper==="A4"?"A4":"Letter", numbers:v.numbers==="continuous"?"continuous":"local",
    breaks:v.breaks!==false,metadata:v.metadata===true,pdfNumbers:v.pdfNumbers!==false,
    excluded:Array.isArray(v.excluded)?[...new Set(v.excluded.filter((p):p is string=>typeof p==="string"))]:[]};
}
export const compileKey = (scope:string,group:string) => JSON.stringify([scope,group]);
export function groupFingerprint(group: ScriptGroup) {
  return JSON.stringify(group.sequences.flat().map(script=>[script.path,script.text]));
}
export interface CompileJob {scope:string;group:string;options:CompileOptions;scripts:Script[];fingerprint:string;starts:Record<string,number>;author:string;createdAt:number;}
export const readCompileAuthor=(value:unknown)=>typeof value==="string"?value.trim().slice(0,200):"";
export function compileCover(job:Pick<CompileJob,"scope"|"group"|"author"|"createdAt">){
  const date=new Intl.DateTimeFormat(undefined,{year:"numeric",month:"long",day:"numeric"}).format(new Date(job.createdAt));
  return {title:job.scope.split("/").at(-1)||job.scope,subtitle:`${job.group} · ${date}`,byline:`By ${job.author}`};
}
export function makeCompileJob(group:ScriptGroup,options:CompileOptions,author="",createdAt=Date.now()):CompileJob {
  if(group.issues.length) throw new Error("Repair this Group’s reading-order issues in Script Studio before compiling.");
  const scripts=group.sequences.flat().filter(s=>!options.excluded.includes(s.path));
  if(!scripts.length) throw new Error("Select at least one script.");
  const name=readCompileAuthor(author);
  if(options.cover&&!name)throw new Error("Enter an author name for the title page, or deselect Title page.");
  return {author:name,createdAt,scope:group.scope,group:group.group,options:readCompileOptions(options),scripts,fingerprint:groupFingerprint(group),starts:Object.fromEntries(group.starts)};
}
/** Remove author comments outside fenced code, preserving their line boundaries. */
function withoutComments(source:string) {
  let comment="",fence="";
  return sourceLines(source).map(line=>{
    const marker=line.text.match(/^ {0,3}(`{3,}|~{3,})/);
    if(!comment&&marker){if(!fence)fence=marker[1];else if(marker[1][0]===fence[0]&&marker[1].length>=fence.length&&/^ {0,3}(?:`+|~+)\s*$/.test(line.text))fence="";return line.raw;}
    if(fence)return line.raw;
    let result="",i=0;
    while(i<line.raw.length){
      if(comment){const end=line.raw.indexOf(comment,i);if(end<0){result+=line.raw.slice(i).replace(/[^\r\n]/g,"");break;}i=end+comment.length;comment="";}
      else if(line.raw.startsWith("<!--",i)){comment="-->";i+=4;}
      else if(line.raw.startsWith("%%",i)){comment="%%";i+=2;}
      else result+=line.raw[i++];
    }
    return result;
  }).join("");
}
export interface CompileImage {token:string;target:string;alt:string;}
export function compileMarkdown(script:Script,options:CompileOptions,start=1) {
  const lines=sourceLines(script.text), replacements=new Map<number,string>(), removed=new Set<number>();
  for(const page of script.pages){
    replacements.set(page.line,`## ${pageLabel({...page,local:page.local+start-1})}\n`);
    page.panels.forEach((panel,index)=>{
      replacements.set(panel.line,`> [!panel] ${panelLabel(panel.title,index)}\n`);
      if(!options.panels)for(let n=panel.line+1;n<lines.length&&/^>/.test(lines[n].text)&&!/^>\s*\[!/.test(lines[n].text);n++)removed.add(n);
    });
  }
  let fence="";
  const body=frontmatter(script.text)?.body??0;
  for(let n=0;n<lines.length;n++){
    if(lines[n].from<body) {removed.add(n);continue;}
    const marker=lines[n].text.match(/^ {0,3}(`{3,}|~{3,})/);
    if(marker){if(!fence)fence=marker[1];else if(marker[1][0]===fence[0]&&marker[1].length>=fence.length&&/^ {0,3}(?:`+|~+)\s*$/.test(lines[n].text))fence="";continue;}
    if(!fence&&!options.notes&&/^>\s*\[!(?:note|tip|warning|danger|success|example|info)\]/i.test(lines[n].text)){
      removed.add(n);while(n+1<lines.length&&/^>/.test(lines[n+1].text)&&!/^>\s*\[!/.test(lines[n+1].text))removed.add(++n);
    }
  }
  let markdown=withoutComments(lines.map((line,index)=>removed.has(index)?"":replacements.get(index)??line.raw).join(""));
  const images:CompileImage[]=[];
  const image=(target:string,alt:string)=>{const token=`MARGINALIA_COMPILE_IMAGE_${images.length}_PLACEHOLDER`;images.push({token,target:target.trim(),alt});return token;};
  const protectedCode:string[]=[];
  markdown=markdown.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[~`]*[ \t]*$|(?![\s\S]))|(`+)[^]*?\2/gm,code=>{const token=`MARGINALIA_LITERAL_CODE_${protectedCode.length}_END`;protectedCode.push(code);return token;});
  markdown=markdown.replace(/!\[\[([^\]]+)\]\]/g,(_all,ref:string)=>{const [target,alt]=ref.split("|");return image(target,alt??target.split("/").at(-1)??"Image");})
    .replace(/!\[([^\]]*)\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^]*?["'])?\s*\)/g,(_all,alt:string,target:string)=>image(target.replace(/^<|>$/g,""),alt))
    .replace(/<img\b[^>]*>/gi,tag=>{const attribute=(name:string)=>new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,"i").exec(tag)?.slice(1).find(v=>v!==undefined)??"";return image(attribute("src"),attribute("alt"));})
    .replace(/<br\s*\/?>/gi,"  \n")
    .replace(/<\/?[a-z][a-z0-9-]*(?:\s[^>]*|\s*\/?)>/gi,"");
  // Reference-style images are left as readable labels; never let the renderer fetch them.
  markdown=markdown.replace(/!\[([^\]]*)\]\s*\[[^\]]*\]/g,(_all,alt:string)=>image("",alt));
  markdown=markdown.replace(/!\[([^\]]*)\]/g,(_all,alt:string)=>image("",alt));
  markdown=markdown.replace(/MARGINALIA_LITERAL_CODE_(\d+)_END/g,(_all,index:string)=>protectedCode[Number(index)]);
  return {markdown,images};
}
export const compileTitle = (script:Script) => typeof script.metadata.Title==="string"&&script.metadata.Title.trim()?script.metadata.Title:script.path.split("/").at(-1)!.replace(/\.md$/i,"");
export function compileFilename(job:Pick<CompileJob,"scope"|"group">) {
  return `${job.scope.split("/").at(-1)} — ${job.group}`.replace(/[<>:"/\\|?*\u0000-\u001f]/g,"-").slice(0,180)+".pdf";
}
