import {isType, property, strings, type TimelineNote, type Diagnostic, type Precision} from "./model.ts";
export interface Calendar {
  path: string; name: string; aliases: string[]; eras: {name: string; abbr: string}[];
  precision: Precision; months: string[]; daysPerMonth: number; format: string;
  primary: boolean; anchor?: string; offset?: number;
}
export interface CalendarRegistry { calendars: Calendar[]; primary?: Calendar; diagnostics: Diagnostic[] }
export interface TimelineDate { calendar: string; year: number; month: number; day: number; era: string; precision: Precision; key: number }
function fail(message: string): never { throw new Error(message); }
const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const equal = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const labels = (c: Calendar) => [c.path, c.path.replace(/\.md$/i,""), c.name, ...c.aliases, ...c.eras.flatMap(e => [e.name,e.abbr])].filter(Boolean);
export function resolveCalendar(registry: CalendarRegistry, name: string): Calendar {
  const exact=registry.calendars.find(c=>c.path===name.trim());
  if(exact)return exact;
  const matches = registry.calendars.filter(c => labels(c).some(label => equal(label,name.trim())));
  return matches.length === 1 ? matches[0] : fail(matches.length ? `Ambiguous calendar: ${name}. Use its full note path.` : `Unknown calendar: ${name}.`);
}
function calendar(note: TimelineNote): Calendar {
  const get = (key: string) => property(note.fields,key);
  const precision = get("precision") ?? "year";
  if (!["year","month","day"].includes(String(precision))) fail("Precision must be year, month, or day.");
  const rawMonths = get("months");
  const months = rawMonths === undefined ? [] : strings(rawMonths).map(v => v.trim());
  if (rawMonths !== undefined && (!Array.isArray(rawMonths) || months.length !== rawMonths.length || months.some(v => !v || /^[+-]?\d+$/.test(v)))) fail("Months must be a list of nonempty, nonnumeric names.");
  if (new Set(months.map(v => v.toLowerCase())).size !== months.length) fail("Month names must be unique.");
  if (precision !== "year" && !months.length) fail("Month and day calendars need a month list.");
  const daysPerMonth = get("days-per-month") ?? 1;
  if (typeof daysPerMonth !== "number" || !Number.isSafeInteger(daysPerMonth) || daysPerMonth < 1 || (precision === "day" && get("days-per-month") === undefined)) fail("Day calendars need a positive integer days-per-month.");
  const eras: Calendar["eras"] = [];
  const rawEras = get("eras");
  if (rawEras !== undefined) {
    if (!Array.isArray(rawEras)) fail("Eras must be a list of names and abbreviations.");
    for (const row of rawEras as unknown[]) {
      if (!row || typeof row !== "object") fail("Each era needs a name and abbreviation.");
      const item = row as Record<string,unknown>;
      if (typeof item.name !== "string" || !item.name.trim() || typeof item.abbr !== "string" || !item.abbr.trim()) fail("Each era needs a name and abbreviation.");
      eras.push({name: (item.name as string).trim(), abbr: (item.abbr as string).trim()});
    }
  }
  const eraLabels = eras.flatMap(e => [...new Set([e.name.toLowerCase(),e.abbr.toLowerCase()])]);
  if (new Set(eraLabels).size !== eraLabels.length || eraLabels.some(v => months.some(m => equal(m,v)) || /^[+-]?\d+$/.test(v))) fail("Era names and abbreviations must be distinct from other eras and months.");
  const format = get("format") ?? (precision === "day" ? "{day} {month} {year} {era}" : precision === "month" ? "{month} {year} {era}" : "{year} {era}");
  if (typeof format !== "string" || !format.includes("{year}") || (precision !== "year" && !format.includes("{month}")) || (precision === "day" && !format.includes("{day}"))) fail("Format must include year and the units supported by the calendar.");
  const tokens = (format as string).match(/\{[^}]*\}/g) ?? [];
  if (tokens.some(token => !["{year}","{month}","{day}","{era}"].includes(token)) || new Set(tokens).size !== tokens.length) fail("Format contains an unknown or repeated date unit.");
  const anchor = get("anchor");
  if (anchor !== undefined && typeof anchor !== "string") fail("Anchor must be a year equation, for example 0 MC = 339 AS.");
  return {path: note.path,name: note.name,aliases: strings(get("aliases")),eras,precision: precision as Precision,months,daysPerMonth: daysPerMonth as number,format: format as string,primary: get("primary") === true,anchor: anchor as string | undefined};
}
function takeLabel(text: string, candidates: string[]) {
  for (const label of [...new Set(candidates)].sort((a,b) => b.length-a.length)) {
    const re = new RegExp(`(^|\\s)${escaped(label)}(?=\\s|$)`, "i");
    const match = text.match(re);
    if (match) return {label, rest: text.replace(re," ").trim()};
  }
  return {label: "",rest: text};
}
/** Parse locally before resolving anchors. Lower precision always starts at unit one. */
function localDate(value: unknown, c: Calendar): Omit<TimelineDate,"calendar" | "key"> & {fraction: number} {
  if ((typeof value !== "string" && typeof value !== "number") || String(value).trim() === "") fail("Expected a year, month/year, or full date.");
  let text = String(value).trim();
  const era = takeLabel(text,c.eras.flatMap(e => [e.name,e.abbr])); text = era.rest;
  // The selected calendar's name/alias may explicitly qualify a date as well.
  const qualifier = takeLabel(text,labels(c)); text = qualifier.rest;
  let month = takeLabel(text,c.months);
  let year: number, day = 1, full = false;
  // Full day dates obey the declared format, including literal punctuation.
  if (c.precision === "day") {
    const pattern = c.format.split(/(\{[^}]+\})/).map(part => {
      if (part === "{year}") return "(?<year>[+-]?\\d+)";
      if (part === "{day}") return "(?<day>\\d+)";
      if (part === "{month}") return `(?<month>${c.months.map(escaped).join("|")})`;
      if (part === "{era}") return `(?<era>${c.eras.flatMap(e => [e.name,e.abbr]).map(escaped).join("|") || ""})?`;
      return escaped(part).replace(/\s+/g,"\\s*");
    }).join("");
    const formatted = qualifier.label ? String(value).replace(new RegExp(`(^|\\s)${escaped(qualifier.label)}(?=\\s|$)`,"i")," ").trim() : String(value).trim();
    const match = formatted.match(new RegExp(`^${pattern}$`,"i"));
    if (match?.groups) {
      year = Number(match.groups.year); day = Number(match.groups.day);
      month = {label: match.groups.month, rest: ""}; full = true;
      if (match.groups.era) era.label = match.groups.era;
    }
  }
  if (!full) {
    text = month.rest;
    if (!/^[+-]?\d+$/.test(text)) fail(`Unrecognized date. Expected ${c.format}.`);
    year = Number(text);
  }
  if (!Number.isSafeInteger(year!)) fail("Year must be a safe integer.");
  if (!Number.isSafeInteger(day) || day < 1 || day > c.daysPerMonth) fail(`Day must be between 1 and ${c.daysPerMonth}.`);
  if (month.label && c.precision === "year") fail("This calendar supports year precision only.");
  const monthNumber = month.label ? c.months.findIndex(m => equal(m,month.label))+1 : 1;
  const precision: Precision = full ? "day" : month.label ? "month" : "year";
  const fraction = (monthNumber-1)/Math.max(1,c.months.length)+(day-1)/(Math.max(1,c.months.length)*c.daysPerMonth);
  return {year:year!,month:monthNumber,day,era:c.eras.find(e => equal(e.abbr,era.label) || equal(e.name,era.label))?.abbr ?? "",precision,fraction};
}
export function buildCalendars(notes: TimelineNote[], selected = ""): CalendarRegistry {
  const registry: CalendarRegistry = {calendars: [],diagnostics: []};
  const calendarNotes = notes.filter(n => isType(n,"Calendar"));
  for (const note of calendarNotes) {
    try { registry.calendars.push(calendar(note)); }
    catch(error) { registry.diagnostics.push({code:"calendar-invalid",path:note.path,message:(error as Error).message}); }
  }
  const primary = registry.calendars.filter(c => c.primary);
  if (selected) {
    try { registry.primary = resolveCalendar(registry,selected); }
    catch(error) { registry.diagnostics.push({code:"primary-invalid",path:selected,message:(error as Error).message}); }
  } else if (primary.length === 1) registry.primary = primary[0];
  else if (registry.calendars.length === 1 && calendarNotes.length === 1) registry.primary = registry.calendars[0];
  if (primary.length > 1 || (!primary.length && calendarNotes.length > 1)) registry.diagnostics.push({code:"primary-conflict",path:"",message:"Choose a primary calendar: several calendars have conflicting or missing primary flags."});
  if (!calendarNotes.length) registry.diagnostics.push({code:"calendar-missing",path:"",message:"No Calendar note found. Disable and enable Timelines to set up the default calendar."});
  const resolving = new Set<string>();
  function offset(c: Calendar): number {
    if (c.offset !== undefined) return c.offset;
    if (resolving.has(c.path)) fail("Cyclic calendar anchor.");
    if (!c.anchor) return c.offset = 0;
    resolving.add(c.path);
    try {
      const parts = c.anchor.split("=").map(s => s.trim());
      if (parts.length !== 2) fail("Anchor must be a year equation, for example 0 MC = 339 AS.");
      const left = localDate(parts[0],c);
      const candidates = registry.calendars.filter(other => other !== c && !!takeLabel(parts[1],labels(other)).label);
      if (candidates.length !== 1) fail("Anchor must name one unambiguous target calendar.");
      const right = localDate(parts[1],candidates[0]);
      if (left.precision !== "year" || right.precision !== "year") fail("Calendar anchors support whole years only.");
      const result = right.year+offset(candidates[0])-left.year;
      if (!Number.isSafeInteger(result)) fail("Calendar anchor exceeds the supported year range.");
      return c.offset = result;
    } finally { resolving.delete(c.path); }
  }
  for (const c of registry.calendars) {
    try { offset(c); }
    catch(error) { registry.diagnostics.push({code:"anchor-invalid",path:c.path,field:"anchor",message:(error as Error).message}); }
  }
  return registry;
}
export function parseDate(value: unknown, registry: CalendarRegistry, calendarName = ""): TimelineDate {
  let c = calendarName ? resolveCalendar(registry,calendarName) : registry.primary;
  if (typeof value === "string") {
    const paths = registry.calendars.filter(other => !!takeLabel(value,[other.path]).label);
    const inline = paths.length ? paths : registry.calendars.filter(other => !!takeLabel(value,labels(other)).label);
    if (inline.length > 1) fail("Ambiguous inline calendar. Use a unique calendar alias.");
    if (inline.length === 1) c = inline[0];
  }
  if (!c) fail("Choose a primary calendar before entering unqualified dates.");
  if (c.offset === undefined) fail(`Resolve the anchor for ${c.name} before using its dates.`);
  const local = localDate(value,c);
  const base = local.year+c.offset;
  const step = 1/(Math.max(1,c.months.length)*c.daysPerMonth);
  if (!Number.isSafeInteger(base) || (local.precision !== "year" && Math.abs(base)*Number.EPSILON >= step/2)) fail("Date exceeds the supported sort range.");
  const {fraction,...date} = local;
  return {...date,calendar:c.path,key:base+fraction};
}
export function formatDate(date: TimelineDate, registry: CalendarRegistry, displayCalendar = date.calendar): string {
  const c = resolveCalendar(registry,displayCalendar);
  if (c.offset === undefined) fail(`Resolve the anchor for ${c.name} before displaying dates.`);
  const position = date.key-c.offset, year = Math.floor(position);
  const units = Math.max(1,c.months.length)*c.daysPerMonth;
  const unit = Math.round((position-year)*units*1e8)/1e8;
  const month = Math.min(c.months.length || 1,Math.floor(unit/c.daysPerMonth)+1), day = Math.floor(unit%c.daysPerMonth)+1;
  const rank = {year:0,month:1,day:2};
  const precision = rank[date.precision] < rank[c.precision] ? date.precision : c.precision;
  // Suppress units the author did not supply, preserving literal separators sensibly.
  const values: Record<string,string> = {year:String(year),month:precision !== "year" ? c.months[month-1] ?? "" : "",day:precision === "day" ? String(day) : "",era:c.path === date.calendar ? date.era : c.eras[0]?.abbr ?? ""};
  const tokens = c.format.split(/(\{[^}]+\})/);
  const rendered: string[] = [];
  for (let i=0;i<tokens.length;i++) {
    const match = tokens[i].match(/^\{(\w+)\}$/);
    if (!match || !values[match[1]]) continue;
    const separator = rendered.length ? (tokens[i-1] || " ") : tokens[0];
    rendered.push(separator+values[match[1]]);
  }
  return (rendered.join("")+tokens[tokens.length-1]).trim();
}
