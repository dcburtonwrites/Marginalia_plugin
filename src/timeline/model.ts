/** Timeline settings and inputs contain no Obsidian objects or note bodies. */
export type Precision = "year" | "month" | "day";
export type Effect = "Appears" | "Disappears";
export interface TrackedField { name: string; effect: Effect; types: string[] }
export interface LanePreference { path: string; group: string; enabled: boolean }
export const groupStyles = ["banded","blue","cyan","green","yellow","orange","red","purple","pink","gray"] as const;
export type GroupStyle = typeof groupStyles[number];
export interface TimelineGroup {name:string;style:GroupStyle}
export interface TimelineSettings { enabled: boolean; iconField:string; primaryCalendar: string; fields: TrackedField[]; displayCalendar: string; lanes: LanePreference[]; groups:TimelineGroup[] }
export interface TimelineNote { path: string; name: string; type?: string; fields: Record<string, unknown>; tags?: string[]; project?: string }
export interface Diagnostic { code: string; path: string; field?: string; message: string }
export const defaultFields: TrackedField[] = [
  ...["Born", "Founded", "Found", "Created"].map(name => ({name, effect: "Appears" as const, types: []})),
  ...["Died", "Lost", "Destroyed", "Dissolved"].map(name => ({name, effect: "Disappears" as const, types: []})),
];
export const structuralFields = new Set(["preceded by", "followed by", "calendar", "locations", "location", "project", "projects", "scripts", "script", "plot points", "plot point"]);
export function property(fields: Record<string, unknown>, key: string): unknown {
  return Object.entries(fields).find(([name]) => name.toLowerCase() === key.toLowerCase())?.[1];
}
export function strings(value: unknown): string[] {
  return typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(strings) : [];
}
export function readTimeline(value: unknown): TimelineSettings {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const seen = new Set<string>();
  const fields: TrackedField[] = [];
  for (const candidate of Array.isArray(raw.fields) ? raw.fields : defaultFields) {
    if (!candidate || typeof candidate !== "object") continue;
    const row = candidate as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name || structuralFields.has(name.toLowerCase()) || ["date","start","end"].includes(name.toLowerCase()) || seen.has(name.toLowerCase()) || !["Appears","Disappears"].includes(String(row.effect))) continue;
    seen.add(name.toLowerCase());
    fields.push({name, effect: row.effect as Effect, types: [...new Set(strings(row.types).map(v => v.trim()).filter(Boolean))]});
  }
  const paths = new Set<string>();
  const lanes: LanePreference[] = [];
  for (const candidate of Array.isArray(raw.lanes) ? raw.lanes : []) {
    if (!candidate || typeof candidate !== "object") continue;
    const row = candidate as Record<string,unknown>;
    if (typeof row.path !== "string" || !row.path || paths.has(row.path)) continue;
    paths.add(row.path);
    lanes.push({path:row.path,group:typeof row.group === "string" ? row.group.trim() : "",enabled:row.enabled !== false});
  }
  const groups:TimelineGroup[]=[],names=new Set<string>();
  for(const value of Array.isArray(raw.groups)?raw.groups:[]){if(!value||typeof value!=="object")continue;const row=value as Record<string,unknown>,name=typeof row.name==='string'?row.name.trim():'';if(!name||names.has(name))continue;names.add(name);groups.push({name,style:groupStyles.includes(row.style as GroupStyle)?row.style as GroupStyle:'banded'});}
  for(const lane of lanes)if(lane.group&&!names.has(lane.group)){names.add(lane.group);groups.push({name:lane.group,style:'banded'});}
  return {enabled: raw.enabled === true, iconField:typeof raw.iconField==='string'&&raw.iconField.trim()?raw.iconField.trim():'icon', primaryCalendar: typeof raw.primaryCalendar === "string" ? raw.primaryCalendar : "", fields, displayCalendar:typeof raw.displayCalendar === "string" ? raw.displayCalendar : "",lanes,groups};
}
export function applies(field: TrackedField, note: TimelineNote) {
  const type=note.type??strings(property(note.fields,"type"))[0];
  return !field.types.length || field.types.some(value => value.toLowerCase() === type?.toLowerCase());
}
export function isType(note: TimelineNote, type: string) {
  return strings(property(note.fields, "type")).some(v => v.toLowerCase() === type.toLowerCase()) || note.type?.toLowerCase() === type.toLowerCase();
}
export const defaultCalendarSource = `---\ntype: Calendar\nprimary: true\nprecision: year\nformat: "{year}"\n---\n\n# Calendar\n\nThe world's calendar. Years may be negative, zero, or positive.\n`;

/** Reorder presentation preferences; dropping across groups adopts the target group. */
export function moveTimelineLane(lanes:LanePreference[],source:string,target:string,after=false):LanePreference[]{
 const from=lanes.find(l=>l.path===source),to=lanes.find(l=>l.path===target);if(!from||!to||source===target)return lanes;
 const next=lanes.filter(l=>l.path!==source).map(l=>({...l})),index=next.findIndex(l=>l.path===target);
 next.splice(index+(after?1:0),0,{...from,group:to.group});return next;
}
