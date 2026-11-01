import {renderTimelineSettings} from "../src/timeline/settings.ts";
import {readTimeline} from "../src/timeline/model.ts";
import {readWorkspace} from "../src/workspace/model.ts";
import {Platform,TFile,parseYaml} from "obsidian";
import {setupTimeline} from "../src/timeline/feature.ts";
const files: any[] = [Object.assign(new TFile("Events/Founding.md"),{fields:{type:"Event",Start:410,End:415}}),Object.assign(new TFile("Characters/Mira.md"),{fields:{type:"Character",Born:412}})];
const app:any={vault:{getMarkdownFiles:()=>files,getAbstractFileByPath:(path:string)=>files.find(f=>f.path===path),create:async(path:string,source:string)=>{const fields=parseYaml(source.split("---")[1]);files.push(Object.assign(new TFile(path),{fields}));}},metadataCache:{getFileCache:(file:any)=>({frontmatter:file.fields})},workspace:{iterateAllLeaves:()=>{},openLinkText:async(path:string)=>{document.querySelector("#opened")!.textContent=path;}}};
let saved:any;
const owner:any={app,activeText:()=>null,workspaceSettings:readWorkspace({vaultType:location.search.includes("storyboard")?"Storyboard":"World"}),timelineSettings:readTimeline(undefined),savePluginData:async()=>{saved=structuredClone(owner.timelineSettings);},setTimelineEnabled:async(value:boolean)=>{if(value)await setupTimeline(owner);owner.timelineSettings.enabled=value;await owner.savePluginData();}};
function render(){const root=document.querySelector<HTMLElement>("#settings")!;root.replaceChildren();renderTimelineSettings(root,owner,render);}
for(const [label,callback] of [["Light / dark",()=>document.body.classList.toggle("theme-dark")],["World / Storyboard",()=>{owner.workspaceSettings.vaultType=owner.workspaceSettings.vaultType==="World"?"Storyboard":"World";render();}],["Inject invalid span",()=>{files[0].fields.End=409;render();}]] as const){const b=document.createElement("button");b.textContent=label;b.onclick=callback;document.querySelector("#controls")!.append(b);}
(window as any).timelineFixture={owner,saved:()=>saved,files:()=>files,render};
if(Platform.isMobile)document.body.classList.add("is-mobile");render();
