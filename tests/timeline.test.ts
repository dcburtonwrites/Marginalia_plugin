import test from "node:test";
import assert from "node:assert/strict";
import {buildCalendars,parseDate,formatDate} from "../src/timeline/calendar.ts";
import {readTimeline,defaultCalendarSource,type TimelineNote} from "../src/timeline/model.ts";
import {buildTimelineIndex} from "../src/timeline/index.ts";
import {ensureDefaultCalendar} from "../src/timeline/setup.ts";
const note = (path: string, fields: Record<string,unknown> = {}, type?: string): TimelineNote => ({path,name:path.split("/").at(-1)!.replace(/\.md$/,""),fields,type});
const calendar = (fields: Record<string,unknown> = {}) => note("Calendar.md",{type:"Calendar",primary:true,precision:"year",...fields});
const dayCalendar = () => calendar({precision:"day",months:["Ember Fall","Thawmoon","Highsun"],"days-per-month":30,eras:[{name:"Age of Smoke",abbr:"AS"}],format:"{day} {month} {year} {era}"});
test("timeline settings are opt-in, preserve empty field lists and normalize unrestricted defaults",()=>{
  assert.equal(readTimeline(null).enabled,false);
  assert.equal(readTimeline({enabled:"true"}).enabled,false);
  assert.equal(readTimeline(null).fields.length,8);
  assert.ok(readTimeline(null).fields.every(f=>!f.types.length));
  assert.deepEqual(readTimeline({fields:[]}).fields,[]);
  assert.deepEqual(readTimeline({fields:[{name:" Born ",effect:"Appears",types:["Character"]},{name:"born",effect:"Disappears"},{name:"Locations",effect:"Appears"},{name:"Date",effect:"Appears"},{name:"Bad",effect:"other"}]}).fields,[{name:"Born",effect:"Appears",types:["Character"]}]);
});
test("default calendar accepts signed years and year zero without epoch or direction",()=>{
  const registry=buildCalendars([calendar()]);
  for(const year of [-2001,-1,0,1,2001]) {
    const date=parseDate(year,registry);assert.equal(date.key,year);assert.equal(date.month,1);assert.equal(date.day,1);assert.equal(formatDate(date,registry),String(year));
  }
  for(const value of [false,{},[],"",null,"1.5","tomorrow",Infinity,Number.MAX_SAFE_INTEGER+1]) assert.throws(()=>parseDate(value,registry));
});
test("day calendars preserve authored precision, month names and era order",()=>{
  const registry=buildCalendars([dayCalendar()]);
  const year=parseDate("2001",registry), month=parseDate("AS 2001 Highsun",registry), day=parseDate("5 Highsun 2001 AS",registry);
  assert.equal(year.key,2001);assert.equal(year.precision,"year");assert.equal(formatDate(year,registry),"2001");
  assert.equal(month.key,2001+2/3);assert.equal(formatDate(month,registry),"Highsun 2001 AS");
  assert.equal(day.key,2001+2/3+4/90);assert.equal(formatDate(day,registry),"5 Highsun 2001 AS");
  assert.equal(formatDate(parseDate("30 Highsun -1 AS",registry),registry),"30 Highsun -1 AS");
  for(const value of ["2001 5 Highsun AS","0 Highsun 2001 AS","31 Highsun 2001 AS","5 Unknown 2001 AS","2001 ZZ","Highsun 2001 AS extra"]) assert.throws(()=>parseDate(value,registry));
});
test("declared full-day formats support punctuation and day/year ordering",()=>{
  const registry=buildCalendars([calendar({precision:"day",months:["First","Second"],"days-per-month":20,format:"{year}/{month}/{day}"})]);
  const date=parseDate("-4/Second/3",registry);
  assert.equal(date.year,-4);assert.equal(date.month,2);assert.equal(date.day,3);assert.equal(formatDate(date,registry),"-4/Second/3");
  assert.throws(()=>parseDate("3/Second/-4",registry));
});
test("month calendars accept lower precision and reject day inputs",()=>{
  const registry=buildCalendars([calendar({precision:"month",months:["First","Second"]})]);
  assert.equal(parseDate("Second -1",registry).key,-0.5);
  assert.equal(parseDate("0",registry).precision,"year");
  assert.throws(()=>parseDate("2 Second 4",registry));
});
test("parallel calendars anchor years and inline aliases override entry calendar",()=>{
  const first=dayCalendar();first.fields.aliases=["AS"];
  const parallel=note("Mortal.md",{type:"Calendar",aliases:["MC"],precision:"year",anchor:"0 MC = 339 AS",format:"{year}"});
  const registry=buildCalendars([first,parallel]);assert.deepEqual(registry.diagnostics,[]);
  assert.equal(parseDate("72 MC",registry).key,411);
  assert.equal(parseDate(72,registry,"MC").key,411);
  assert.equal(parseDate("412 AS",registry,"MC").key,412);
  assert.equal(formatDate(parseDate("412 AS",registry),registry,"MC"),"73");
  assert.equal(parseDate("0 MC",registry).key,339);
  assert.throws(()=>parseDate(4,registry,"[[Mortal]]"));
});
test("anchor chains resolve without depending on note order",()=>{
  const a=calendar({aliases:["A"]});
  const b=note("B.md",{type:"Calendar",aliases:["B"],anchor:"1 B = 340 A"});
  const c=note("C.md",{type:"Calendar",aliases:["C"],anchor:"0 C = 2 B"});
  const registry=buildCalendars([c,b,a]);assert.equal(parseDate("0 C",registry).key,341);
});
test("dangling, cyclic, malformed and subyear anchors cannot produce usable dates",()=>{
  for(const anchor of ["0 B = 3 Missing","nonsense","0 B = 0 B","0 B = First 2 A"]) {
    const registry=buildCalendars([calendar({aliases:["A"],precision:"month",months:["First"]}),note("B.md",{type:"Calendar",aliases:["B"],anchor})]);
    assert.ok(registry.diagnostics.some(d=>d.code==="anchor-invalid"));assert.throws(()=>parseDate("0 B",registry));
  }
  const registry=buildCalendars([note("A.md",{type:"Calendar",primary:true,anchor:"0 A = 0 B"}),note("B.md",{type:"Calendar",anchor:"0 B = 0 A"})]);
  assert.equal(registry.diagnostics.filter(d=>d.code==="anchor-invalid").length,2);
});
test("primary conflicts require selection, while a lone unmarked calendar is automatic",()=>{
  assert.equal(buildCalendars([calendar({primary:false})]).primary?.path,"Calendar.md");
  const notes=[calendar(),note("Other.md",{type:"Calendar",primary:true})];
  const registry=buildCalendars(notes);assert.equal(registry.primary,undefined);assert.throws(()=>parseDate(1,registry));
  assert.equal(parseDate(1,buildCalendars(notes,"Other.md")).calendar,"Other.md");
  assert.ok(buildCalendars(notes,"missing").diagnostics.some(d=>d.code==="primary-invalid"));
  const missing=buildCalendars([calendar({primary:false}),note("Other.md",{type:"Calendar"})]);assert.equal(missing.primary,undefined);
  assert.equal(buildCalendars([]).diagnostics[0].code,"calendar-missing");
});
test("ambiguous aliases are not silently resolved and full paths remain usable",()=>{
  const registry=buildCalendars([calendar({aliases:["X"]}),note("Other.md",{type:"Calendar",aliases:["X"]})]);
  assert.throws(()=>parseDate("1 X",registry));assert.throws(()=>parseDate(1,registry,"X"));
  assert.equal(parseDate(1,registry,"Other.md").calendar,"Other.md");
});
test("malformed calendar definitions produce diagnostics, never fallback date guesses",()=>{
  for(const fields of [{precision:"hour"},{precision:"day"},{precision:"month",months:["X","x"]},{precision:"month",months:["1"]},{precision:"day",months:["First"],"days-per-month":0},{format:"{month}"},{format:"{year} {bogus}"},{format:"{year} {year}"},{eras:[{name:"AS",abbr:"AS"},{name:"AS",abbr:"A"}]}]) {
    const registry=buildCalendars([calendar(fields)]);assert.equal(registry.calendars.length,0,JSON.stringify(fields));assert.equal(registry.diagnostics[0].code,"calendar-invalid");
  }
});
test("event index validates dates and spans, applies span-end timing and preserves undated events",()=>{
  const notes=[calendar(),note("Point.md",{type:"Event",Date:0}),note("Span.md",{Start:410,End:415},"Event"),note("Undated.md",{"Preceded By":"[[Point]]"},"Event"),note("Missing.md",{Start:4},"Event"),note("Reversed.md",{Start:5,End:4},"Event"),note("Mixed.md",{Date:4,Start:4,End:5},"Event"),note("Bad.md",{Date:"later"},"Event")];
  const index=buildTimelineIndex(notes,readTimeline(null));
  assert.equal(index.events.find(e=>e.path==="Point.md")?.effective?.key,0);
  assert.equal(index.events.find(e=>e.path==="Span.md")?.effective?.key,415);
  for(const path of ["Undated.md","Missing.md","Reversed.md","Mixed.md","Bad.md"]) assert.equal(index.events.find(e=>e.path===path)?.effective,undefined);
  assert.deepEqual(index.diagnostics.map(d=>d.code),["span-incomplete","span-reversed","event-date-conflict","date-invalid"]);
});
test("self lifecycle dates use own calendar and filters; non-event date fields are flagged",()=>{
  const notes=[calendar(),note("Character.md",{Born:412,Date:410},"Character"),note("Bow.md",{Lost:415},"Item"),note("Bad.md",{Born:"[[Event]]"},"Character")];
  const index=buildTimelineIndex(notes,readTimeline(null));assert.equal(index.selfChanges.length,2);assert.equal(index.selfChanges[0].date.key,412);
  assert.ok(index.diagnostics.some(d=>d.code==="non-event-date"));assert.ok(index.diagnostics.some(d=>d.code==="date-invalid"));
  const settings=readTimeline({fields:[{name:"Born",effect:"Appears",types:["Item"]}]});assert.equal(buildTimelineIndex(notes,settings).selfChanges.length,0);
});
test("default calendar setup reuses existing calendars, avoids collisions and never replaces invalid notes",async()=>{
  const writes=new Map<string,string>(), paths=new Set(["Calendar.md"]);let notes:TimelineNote[]=[];
  const port={notes:()=>notes,exists:(path:string)=>paths.has(path),create:async(path:string,source:string)=>{assert.ok(!paths.has(path));paths.add(path);writes.set(path,source);}};
  assert.equal(await ensureDefaultCalendar(port),"Calendar 2.md");assert.equal(writes.get("Calendar 2.md"),defaultCalendarSource);
  notes=[calendar({precision:"invalid"})];assert.equal(await ensureDefaultCalendar(port),"");assert.equal(writes.size,1);
  notes=[calendar()];assert.equal(await ensureDefaultCalendar(port),"Calendar.md");assert.equal(writes.size,1);
  await assert.rejects(()=>ensureDefaultCalendar({notes:()=>[],exists:()=>false,create:async()=>{throw new Error("read only");}}));
});

import {buildWorldTimeline,filterEvents,emptyFilters,layoutTimeline,packEvents,eventRange,timelineExtent,UNPLACED,MULTIPLE,type WorldEvent} from "../src/timeline/world.ts";
import {readTimelineUIState} from "../src/timeline/ui.ts";
const world = (entries:TimelineNote[],preferences:unknown={})=>{
  const notes=[calendar(),...entries],settings=readTimeline(preferences);
  const resolve=(target:string,_source:string)=>{const exact=notes.find(n=>n.path.replace(/\.md$/i,"")===target.replace(/\.md$/i,""));if(exact)return exact.path;const matches=notes.filter(n=>n.name===target);return matches.length===1?matches[0].path:undefined;};
  return buildWorldTimeline(notes,buildTimelineIndex(notes,settings),settings,resolve);
};
const place=()=>note("Harbor.md",{type:"Location"});
const event=(name:string,fields:Record<string,unknown>={})=>note(`${name}.md`,{type:"Event",...fields});
test("world timeline uses frontmatter participants, respects reserved links and does not move locations",()=>{
  const w=world([place(),note("Mira.md",{type:"Character"}),note("Atlas.md",{type:"Item"}),note("Script.md",{type:"Script",Events:"[[Arrival]]"}),event("Arrival",{Date:4,Locations:"[[Harbor]]",Cast:{lead:"[[Mira|M]]"},Found:["[[Atlas]]"],Project:"[[Script]]","Preceded By":"[[Script]]"})]);
  const e=w.events[0];assert.equal(e.lane,"Harbor.md");assert.deepEqual(e.participants.map(p=>[p.name,p.effect]),[["Mira",undefined],["Atlas","Appears"]]);
  assert.deepEqual(e.related.map(r=>r.path),["Script.md"]);assert.equal(e.locations[0].name,"Harbor");
  assert.equal(w.diagnostics.length,0,"dated predecessor links do not impose an order or warn");
});
test("unknown, invalid and multiple locations stay explicit rather than choosing one",()=>{
  const w=world([place(),note("Archive.md",{type:"Location"}),note("Mira.md",{type:"Character"}),event("Unknown",{Date:1}),event("Missing",{Date:2,Locations:["[[Unmapped shore]]","[[Harbor]]"]}),event("Multiple",{Date:3,Locations:["[[Harbor]]","[[Archive]]"]}),event("Wrong type",{Date:4,Locations:"[[Mira]]"})]);
  assert.equal(w.events.find(e=>e.name==="Unknown")?.lane,UNPLACED);assert.equal(w.events.find(e=>e.name==="Missing")?.lane,UNPLACED);assert.equal(w.events.find(e=>e.name==="Multiple")?.lane,MULTIPLE);assert.equal(w.events.find(e=>e.name==="Wrong type")?.lane,UNPLACED);
  assert.ok(w.diagnostics.some(d=>d.code==="link-unresolved"));assert.ok(w.diagnostics.some(d=>d.code==="location-invalid"));
});
test("bounded undated chain has relational positions but never acquires a date",()=>{
  const w=world([event("First",{Date:10}),event("Middle 1",{"Preceded By":"[[First]]"}),event("Middle 2",{"Preceded By":"[[Middle 1]]"}),event("Last",{Date:20,"Preceded By":"[[Middle 2]]"})]);
  const a=w.events.find(e=>e.name==="Middle 1")!,b=w.events.find(e=>e.name==="Middle 2")!;
  assert.ok(a.position!>10&&b.position!<20&&a.position!<b.position!);assert.equal(a.date,undefined);assert.equal(a.effective,undefined);assert.equal(a.after,"First.md");assert.equal(b.before,"Last.md");assert.equal(w.diagnostics.length,0);
});
test("unanchored and single-anchor chains remain in Undated in predecessor sequence",()=>{
  const w=world([event("Z first"),event("A last",{"Preceded By":"[[Z first]]"}),event("Anchor",{Date:10}),event("After anchor",{"Preceded By":"[[Anchor]]"})]);
  const undated=w.events.filter(e=>e.position===undefined).sort((a,b)=>a.order-b.order);
  assert.ok(undated.findIndex(e=>e.name==="Z first")<undated.findIndex(e=>e.name==="A last"));assert.equal(undated.find(e=>e.name==="After anchor")?.after,"Anchor.md");
});
test("cyclic, branching, dangling and reversed undated chains cannot create guessed dates",()=>{
  const cases=[
    [event("A",{"Preceded By":"[[B]]"}),event("B",{"Preceded By":"[[A]]"})],
    [event("A",{Date:1}),event("B",{"Preceded By":"[[A]]"}),event("C",{"Preceded By":"[[A]]"})],
    [event("A",{"Preceded By":"[[Missing]]"})],
    [event("A",{Date:20}),event("B",{"Preceded By":"[[A]]"}),event("C",{Date:10,"Preceded By":"[[B]]"})],
  ];
  for(const entries of cases){const w=world(entries);assert.ok(w.diagnostics.some(d=>d.code.startsWith("order-")));assert.ok(w.events.filter(e=>!e.effective).every(e=>e.position===undefined));}
});
test("dated predecessor links cannot reorder dated events or alter read-only source metadata",()=>{
  const entries=[event("Later",{Date:20}),event("Earlier",{Date:10,"Preceded By":"[[Later]]"})];const original=structuredClone(entries),w=world(entries);
  assert.equal(w.events.find(e=>e.name==="Earlier")?.position,10);assert.equal(w.diagnostics.length,0);assert.deepEqual(entries,original);
});
test("event filtering includes participant types, tags, project scope and query together",()=>{
  const entries=[place(),note("Mira.md",{type:"Character"}),event("Arrival",{Date:1,Locations:"[[Harbor]]",Characters:"[[Mira]]"}),event("Other",{Date:2})];entries[2].tags=["atlas"];entries[2].project="Stories/Sky";const w=world(entries);
  assert.deepEqual(filterEvents(w,{query:"mira",type:"Character",tag:"atlas",project:"Stories/Sky"}).map(e=>e.name),["Arrival"]);
  assert.equal(filterEvents(w,{...emptyFilters(),type:"Item"}).length,0);assert.equal(filterEvents(w,{...emptyFilters(),query:"Harbor"}).length,1);assert.equal(filterEvents(w,{...emptyFilters(),type:"Event"}).length,2);
});
test("lane preferences persist grouping, selection/order and do not hide new locations by default",()=>{
  const w=world([place(),note("Archive.md",{type:"Location"}),note("Uplands.md",{type:"Location"}),event("A",{Date:1,Locations:"[[Harbor]]"})],{lanes:[{path:"Uplands.md",group:"Highlands",enabled:true},{path:"Harbor.md",group:"Coast",enabled:false},{path:"Archive.md",group:"Highlands",enabled:true}]});
  assert.deepEqual(w.lanes.slice(0,3).map(l=>l.path),["Uplands.md","Archive.md","Harbor.md"]);assert.equal(w.lanes.find(l=>l.path==="Harbor.md")?.enabled,false);
  assert.ok(w.lanes.find(l=>l.path===UNPLACED)?.enabled);assert.ok(!layoutTimeline(w,w.events,0,3,600).some(l=>l.path==="Harbor.md"));
});
test("mixed-precision periods overlap and spans preserve their actual endpoints",()=>{
  const notes=[dayCalendar(),place(),event("Year",{Date:20,Locations:"[[Harbor]]"}),event("Day",{Date:"5 Highsun 20 AS",Locations:"[[Harbor]]"}),event("Span",{Start:19,End:22,Locations:"[[Harbor]]"})];
  const settings=readTimeline(null),index=buildTimelineIndex(notes,settings),w=buildWorldTimeline(notes,index,settings,t=>t==="Harbor"?"Harbor.md":undefined);
  const year=eventRange(w.events.find(e=>e.name==="Year")!,w.registry)!,day=eventRange(w.events.find(e=>e.name==="Day")!,w.registry)!;
  assert.ok(year[0]<=day[0]&&year[1]>=day[1]);assert.deepEqual(eventRange(w.events.find(e=>e.name==="Span")!,w.registry),[19,22]);
  const lane=layoutTimeline(w,w.events,18,5,800).find(l=>l.path==="Harbor.md")!;assert.equal(new Set(lane.events.map(p=>p.row)).size,3);
});
test("collision packing scales for 10000 simultaneous events and never overlaps a row",()=>{
  const e=world([event("Example",{Date:0})]).events[0];
  const dense=packEvents(Array.from({length:10000},(_,i)=>({event:{...e,name:String(i)},x:0,width:176,markWidth:2})));assert.equal(new Set(dense.map(e=>e.row)).size,10000);
  const packed=packEvents(Array.from({length:1000},(_,i)=>({event:{...e,name:String(i)},x:i*15,width:176,markWidth:2})));
  const rows=new Map<number,typeof packed>();for(const p of packed){const row=rows.get(p.row)??[];row.push(p);rows.set(p.row,row);}for(const row of rows.values())for(let i=1;i<row.length;i++)assert.ok(row[i].x>=row[i-1].x+row[i-1].width+12);
});
test("layout omits out-of-window events but keeps intersecting spans and negative years",()=>{
  const w=world([place(),event("Old",{Date:-20,Locations:"[[Harbor]]"}),event("Span",{Start:-5,End:5,Locations:"[[Harbor]]"}),event("New",{Date:20,Locations:"[[Harbor]]"})]);
  const layout=layoutTimeline(w,w.events,-1,2,600);assert.deepEqual(layout.flatMap(l=>l.events.map(e=>e.event.name)),["Span"]);assert.ok(timelineExtent(w)[0]<-20);assert.ok(timelineExtent(w)[1]>20);
});
test("view restoration rejects malformed viewport values and settings sanitize lane/display preferences",()=>{
  assert.equal(readTimelineUIState({start:Infinity,span:-1,filters:{query:4}}).start,undefined);assert.equal(readTimelineUIState({span:-1}).span,undefined);
  const settings=readTimeline({displayCalendar:"Calendar.md",lanes:[null,{path:"Harbor.md",group:" Coast ",enabled:false},{path:"Harbor.md",group:"Duplicate"}]});assert.equal(settings.displayCalendar,"Calendar.md");assert.deepEqual(settings.lanes,[{path:"Harbor.md",group:"Coast",enabled:false}]);
});

test("related writing recognizes legacy Script Studio paths without requiring a new type property",()=>{
  const w=world([event("Arrival",{Date:1}),note("Project/Scripts/Draft.md",{Events:"[[Arrival]]"}),note("Plot.md",{tags:["project-plot-point"],Events:"[[Arrival]]"})]);
  assert.deepEqual(w.events[0].related.map(r=>r.path),["Project/Scripts/Draft.md","Plot.md"]);assert.equal(w.events[0].related[0].type,"Script");
});

import {displayCalendar} from "../src/timeline/world.ts";
test("invalid primary/display anchors fall back only to a resolved calendar",()=>{
  const settings=readTimeline({displayCalendar:"Calendar.md"}),notes=[calendar({anchor:"0 Calendar = 0 Missing"}),note("Independent.md",{type:"Calendar",aliases:["IND"]}),event("Record",{Date:"0 IND"})];
  const index=buildTimelineIndex(notes,settings),w=buildWorldTimeline(notes,index,settings,()=>undefined);
  assert.equal(displayCalendar(w,settings)?.path,"Independent.md");assert.equal(formatDate(w.events[0].date!,w.registry,displayCalendar(w,settings)!.path),"0");assert.ok(w.diagnostics.some(d=>d.code==="anchor-invalid"));
});
test("canonical calendar paths remain usable when another calendar has a colliding alias",()=>{
  const registry=buildCalendars([calendar(),note("Other.md",{type:"Calendar",aliases:["Calendar.md"]})]);
  assert.equal(parseDate(1,registry,"Calendar.md").calendar,"Calendar.md");assert.equal(parseDate("1 Calendar.md",registry).calendar,"Calendar.md");assert.equal(formatDate(parseDate(1,registry),registry),"1");
});

test("empty predecessor lists are roots, repeated identical links are unambiguous, and non-link scalars warn",()=>{
  const w=world([event("Root",{"Preceded By":[]}),event("Next",{"Preceded By":["[[Root]]","[[Root]]"]}),event("Wrong",{"Preceded By":0})]);
  assert.ok(!w.diagnostics.some(d=>["Root.md","Next.md"].includes(d.path)));assert.ok(w.events.find(e=>e.name==="Root")!.order<w.events.find(e=>e.name==="Next")!.order);assert.ok(w.diagnostics.some(d=>d.path==="Wrong.md"&&d.code==="order-dangling"));
});
