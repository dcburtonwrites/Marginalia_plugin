import {strings} from './model.ts';
import type {WorldEvent,Participant,LayoutLane} from './world.ts';
export const THREAD_COLUMNS=3,THREAD_CELL_WIDTH=56,THREAD_CELL_HEIGHT=48,THREAD_TOP=52;
export function threadParticipants(event:WorldEvent,selected:string[]=[]):Participant[]{
 return event.participants.filter(p=>!selected.length||selected.includes(p.path)).sort((a,b)=>a.name.localeCompare(b.name)||a.path.localeCompare(b.path));
}
export function threadEventHeight(event:WorldEvent,selected:string[]=[]){return 56+Math.ceil(threadParticipants(event,selected).length/THREAD_COLUMNS)*THREAD_CELL_HEIGHT;}
/** Only vault-local image targets; never external URLs or filesystem paths. */
export function entryIconTarget(value:unknown):string|undefined {
 for(const raw of strings(value)){
  const match=/^!?\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/.exec(raw.trim()),path=(match?match[1]:raw).trim();
  if(!path||/^[a-z][a-z0-9+.-]*:/i.test(path)||path.startsWith('/')||path.includes('\\')||path.split('/').some(p=>!p||p==='.'||p==='..')||/[\u0000-\u001f]/.test(path)||! /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(path))continue;
  return path;
 }
}
export function threadColor(path:string){let hash=0;for(const c of path)hash=(hash*31+c.charCodeAt(0))>>>0;return `hsl(${hash%360} 52% 52%)`;}
export interface ThreadPoint {entry:Participant;event:string;time:number;x:number;y:number;offscreen?:boolean}
export interface ThreadSegment {entry:Participant;from:ThreadPoint;to:ThreadPoint;sameTime:boolean}
export function threadGeometry(lanes:LayoutLane[],selected:string[]=[],continuation?:{events:WorldEvent[];start:number;span:number;width:number}):{points:ThreadPoint[];segments:ThreadSegment[]}{
 const points:ThreadPoint[]=[],byEntry=new Map<string,ThreadPoint[]>();
 for(const lane of lanes)for(const placed of lane.events){if(!placed.event.effective||placed.event.position===undefined)continue;
  threadParticipants(placed.event,selected).forEach((entry,i)=>{const point={entry,event:placed.event.path,time:placed.event.position!,x:placed.x+(i%THREAD_COLUMNS)*THREAD_CELL_WIDTH+28,y:lane.top+(placed.y??8+placed.row*76)+THREAD_TOP+Math.floor(i/THREAD_COLUMNS)*THREAD_CELL_HEIGHT+14};points.push(point);const list=byEntry.get(entry.path)??[];list.push(point);byEntry.set(entry.path,list);});
 }
 // Add layout-only endpoints for connected occurrences outside the time window.
 // These do not mount hidden cards or change visible-lane packing and height.
 if(continuation){const placed=new Set(lanes.flatMap(l=>l.events.map(p=>p.event.path))),byLane=new Map(lanes.map(l=>[l.path,l]));
  for(const event of continuation.events){const lane=byLane.get(event.lane);if(!lane||placed.has(event.path)||!event.effective||event.position===undefined)continue;
   threadParticipants(event,selected).forEach((entry,i)=>{const raw=(event.position!-continuation.start)/continuation.span*continuation.width+(i%THREAD_COLUMNS)*THREAD_CELL_WIDTH+28;
    const point:ThreadPoint={entry,event:event.path,time:event.position!,x:event.position!<continuation.start?Math.min(-28,raw):Math.max(continuation.width+28,raw),y:lane.top+Math.min(lane.height-12,8+THREAD_TOP+Math.floor(i/THREAD_COLUMNS)*THREAD_CELL_HEIGHT+14),offscreen:true};points.push(point);const list=byEntry.get(entry.path)??[];list.push(point);byEntry.set(entry.path,list);
   });
  }
 }
 const segments:ThreadSegment[]=[];
 for(const list of byEntry.values()){list.sort((a,b)=>a.time-b.time||a.event.localeCompare(b.event));for(let i=1;i<list.length;i++)segments.push({entry:list[i].entry,from:list[i-1],to:list[i],sameTime:list[i-1].time===list[i].time});}
 return {points,segments};
}
export function threadSegmentVisible(segment:ThreadSegment,width:number,top:number,bottom:number){
 return Math.max(segment.from.y,segment.to.y)>=top&&Math.min(segment.from.y,segment.to.y)<=bottom&&Math.max(segment.from.x,segment.to.x)>=0&&Math.min(segment.from.x,segment.to.x)<=width;
}
