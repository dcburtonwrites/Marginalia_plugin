import {buildCalendars} from "./calendar.ts";
import {defaultCalendarSource,isType,type TimelineNote} from "./model.ts";
export interface CalendarSetupPort {
  notes(): TimelineNote[];
  exists(path: string): boolean;
  create(path: string, source: string): Promise<void>;
}
/** Never replaces a note. Host owns serialization and World/desktop gating. */
export async function ensureDefaultCalendar(port: CalendarSetupPort): Promise<string> {
  const notes = port.notes();
  if (notes.some(note => isType(note,"Calendar"))) return buildCalendars(notes).primary?.path ?? "";
  let path = "Calendar.md", suffix = 2;
  while (port.exists(path)) path = `Calendar ${suffix++}.md`;
  await port.create(path,defaultCalendarSource);
  return path;
}
