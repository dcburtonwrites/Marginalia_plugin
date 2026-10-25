import {hash, type Note, type Freshness} from "./types.ts";
import {librarianProject} from "./context.ts";
import type {WorkspaceSettings} from "../workspace/model.ts";

/** Conservative inventory: shared originals plus this project, including potential new evidence. */
export function freshness(notes:Note[],target:Note,settings:WorkspaceSettings,context:number):Freshness {
  const scope=librarianProject(target,settings);
  const inventory=notes.filter(note=>{
    const project=librarianProject(note,settings);
    return !scope || !project || project===scope;
  }).map(note=>[note.path,hash(note.text),note.aliases,note.links,note.metadata])
    .sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
  return {
    inventory:hash(JSON.stringify(inventory)),
    configuration:hash(JSON.stringify({vaultType:settings.vaultType,canonTypes:settings.canonTypes,entrySetup:settings.entrySetup,context})),
  };
}
export function sameFreshness(a:Freshness,b:Freshness){return a.inventory===b.inventory&&a.configuration===b.configuration;}
