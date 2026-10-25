import {entryType, projectPath, values, type WorkspaceSettings} from "../workspace/model.ts";
import type {Note} from "./types.ts";

/** Same configured boundaries as workspace navigation; shared areas are not projects. */
export function librarianProject(note:Note,settings:WorkspaceSettings):string|undefined {
  const path=note.path;
  const globalFolders=[...settings.canonTypes.map(type=>type.folder),settings.entrySetup.brainstorm.folder].filter(Boolean);
  if(globalFolders.some(folder=>path.startsWith(folder+"/")))return undefined;
  return projectPath(path,settings.vaultType,settings.entrySetup.projectsFolder);
}
export function librarianType(note:Note,settings:WorkspaceSettings) {
  const tags=[...values(note.metadata.tags),...values(note.metadata.cssclasses)].flatMap(v=>v.split(/[\s,]+/)).map(v=>v.replace(/^#/,"").toLowerCase());
  const declared=values(note.metadata["canon-type"])[0];
  const configured=settings.canonTypes.find(type=>type.name.toLowerCase()===declared?.toLowerCase());
  if(configured)return configured.name;
  const type=entryType(note.path,tags,settings.canonTypes);
  if(type)return type;
  const project=librarianProject(note,settings);
  if(project&&(note.metadata.role==="project"||tags.some(tag=>/^(project|project-parent|project\/overview)$/.test(tag))||/(?:^|\/)(?:[^/]*overview|index)\.md$/i.test(note.path)))return "Project";
  return "Lore";
}
export const projectBrief={
  guidance:"Write a project brief, not an encyclopedia entry about an event. Distinguish the creator's premise, intended themes, planned plot and unresolved decisions from established story events. Do not convert plans into completed events. Use only supplied material from this project and shared references. Omit unsupported sections.",
  headings:["Summary","Premise","Themes","Story","Characters","Setting","Development","Related Entries"],
};
