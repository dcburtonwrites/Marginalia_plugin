import {buildCalendars,parseDate,resolveCalendar,type CalendarRegistry,type TimelineDate} from "./calendar.ts";
import {property,isType,applies,type TimelineNote,type TimelineSettings,type Diagnostic} from "./model.ts";
export interface DatedEvent { path: string; date?: TimelineDate; start?: TimelineDate; end?: TimelineDate; effective?: TimelineDate }
export interface SelfChange { path: string; field: string; effect: "Appears" | "Disappears"; date: TimelineDate }
export interface TimelineIndex { registry: CalendarRegistry; events: DatedEvent[]; selfChanges: SelfChange[]; diagnostics: Diagnostic[] }
const empty = (value: unknown) => value === undefined || value === null || value === "";
export function buildTimelineIndex(notes: TimelineNote[], settings: TimelineSettings): TimelineIndex {
  const registry = buildCalendars(notes,settings.primaryCalendar);
  const result: TimelineIndex = {registry,events:[],selfChanges:[],diagnostics:[...registry.diagnostics]};
  for (const note of notes) {
    const get = (field: string) => property(note.fields,field);
    const calendar = get("Calendar");
    let calendarName = "";
    if (!empty(calendar)) {
      if (typeof calendar !== "string" || /\[\[|\]\]/.test(calendar)) result.diagnostics.push({code:"date-invalid",path:note.path,field:"Calendar",message:"Calendar must be a plain-text note name, alias, or path."});
      else {
        calendarName = calendar as string;
        try { resolveCalendar(registry,calendarName); }
        catch(error) { result.diagnostics.push({code:"date-invalid",path:note.path,field:"Calendar",message:(error as Error).message}); }
      }
    }
    const read = (field: string): TimelineDate | undefined => {
      if (empty(get(field))) return;
      try {
        if (!empty(calendar) && !calendarName) throw new Error("Fix the Calendar property before using this date.");
        return parseDate(get(field),registry,calendarName);
      } catch(error) { result.diagnostics.push({code:"date-invalid",path:note.path,field,message:(error as Error).message}); }
    };
    if (isType(note,"Event")) {
      const event: DatedEvent = {path:note.path,date:read("Date"),start:read("Start"),end:read("End")};
      const hasDate = !empty(get("Date")), hasStart = !empty(get("Start")), hasEnd = !empty(get("End"));
      if (hasDate && (hasStart || hasEnd)) result.diagnostics.push({code:"event-date-conflict",path:note.path,message:"Use either Date or Start/End, not both."});
      if (hasStart !== hasEnd) result.diagnostics.push({code:"span-incomplete",path:note.path,message:"A span needs both Start and End."});
      if (event.start && event.end && event.start.key > event.end.key) result.diagnostics.push({code:"span-reversed",path:note.path,message:"Start is later than End."});
      // An invalid or mixed span must never acquire a guessed effective date.
      const invalid = result.diagnostics.some(d => d.path === note.path);
      if (!invalid) event.effective = event.end ?? event.date;
      result.events.push(event);
    } else {
      for (const field of ["Date","Start","End"]) if (!empty(get(field))) result.diagnostics.push({code:"non-event-date",path:note.path,field,message:`${field} belongs on Events. Use a tracked lifecycle field for this entry's own state date.`});
      for (const tracked of settings.fields) {
        if (!applies(tracked,note)) continue;
        const date = read(tracked.name);
        if (date) result.selfChanges.push({path:note.path,field:tracked.name,effect:tracked.effect,date});
      }
    }
  }
  return result;
}
