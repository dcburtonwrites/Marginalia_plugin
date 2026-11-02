import type {TimelineSettings} from "../timeline/model.ts";
import {hash, type Note, type Freshness} from "./types.ts";
import {projectResolver} from "../workspace/model.ts";
import type {WorkspaceSettings} from "../workspace/model.ts";

/** Conservative inventory: shared originals plus this project, including potential new evidence. */
export function freshness(notes:Note[],target:Note,settings:WorkspaceSettings,context:number,timeline?:TimelineSettings):Freshness {
  const resolve=projectResolver(settings,notes);
  const scope=resolve(target.path,target.metadata);
  const inventory=notes.filter(note=>{
    const project=resolve(note.path,note.metadata);
    return note.metadata.generated!==true&&(!scope || !project || project===scope);
  }).map(note=>[note.path,hash(note.text),note.aliases,note.links,note.metadata])
    .sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
  return {
    inventory:hash(JSON.stringify(inventory)),
    configuration:hash(JSON.stringify({vaultType:settings.vaultType,canonTypes:settings.canonTypes,entrySetup:settings.entrySetup,context,...(settings.vaultType==="World"&&timeline?.enabled?{timeline:{version:1,fields:timeline.fields,primaryCalendar:timeline.primaryCalendar}}:{})})),
  };
}
export function sameFreshness(a:Freshness,b:Freshness){return a.inventory===b.inventory&&a.configuration===b.configuration;}
