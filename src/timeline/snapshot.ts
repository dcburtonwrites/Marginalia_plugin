import {stateAt,type EntryHistory,type StateFrame,type StateTimelines,type PresenceState} from "./state.ts";
import {formatDate,type Calendar,type CalendarRegistry} from "./calendar.ts";
export interface SnapshotRow {entry:EntryHistory; frame:StateFrame}
export interface SnapshotFilters {query:string; type:string; state:""|PresenceState}
/** Evidence times, including own lifecycle dates, never relational chart positions. */
export function snapshotTimes(states:StateTimelines):number[]{
  return [...new Set([...states.entries.values()].flatMap(entry=>entry.frames.map(frame=>frame.key!).filter(Number.isFinite)))].sort((a,b)=>a-b);
}
export function snapshotRows(states:StateTimelines,time:number,filters:SnapshotFilters={query:"",type:"",state:""}):SnapshotRow[]{
  if(!Number.isFinite(time))throw new Error("Choose a finite snapshot date.");
  const query=filters.query.trim().toLocaleLowerCase();
  return [...states.entries.values()].filter(entry=>(!filters.type||entry.type===filters.type)&&(!query||`${entry.name} ${entry.path}`.toLocaleLowerCase().includes(query)))
    .map(entry=>({entry,frame:stateAt(entry,time)})).filter(row=>!filters.state||row.frame.state===filters.state)
    .sort((a,b)=>a.entry.name.localeCompare(b.entry.name)||a.entry.path.localeCompare(b.entry.path));
}
export function snapshotDate(time:number,calendar:Calendar,registry:CalendarRegistry):string{
  return formatDate({calendar:calendar.path,key:time,year:Math.floor(time-calendar.offset!),month:1,day:1,era:calendar.eras[0]?.abbr??"",precision:calendar.precision},registry,calendar.path);
}
/** Last checkpoint at/before T. A date before all evidence has no checkpoint. */
export function snapshotPosition(times:number[],time:number):number{
  let low=0,high=times.length;while(low<high){const mid=(low+high)>>>1;if(times[mid]<=time)low=mid+1;else high=mid;}return low-1;
}
