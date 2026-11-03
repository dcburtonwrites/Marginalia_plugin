import {threadsFixture,threadsIcon} from "../tests/fixtures/threads/fixture.ts";
import {EntryTimelineUI} from "../src/timeline/entry-ui.ts";
import {buildStateTimelines,type StateTimelines} from "../src/timeline/state.ts";
import {WorldTimelineUI} from "../src/timeline/ui.ts";
import {buildWorldTimeline,timelineCanonEntries,type WorldTimeline} from "../src/timeline/world.ts";
import {buildTimelineIndex} from "../src/timeline/index.ts";
import {readTimeline,type TimelineNote} from "../src/timeline/model.ts";
import {TimelineLanesModal} from "../src/timeline/view.ts";
import {readWorkspace} from "../src/workspace/model.ts";
const n=(path:string,fields:Record<string,unknown>,extra:Partial<TimelineNote>={}):TimelineNote=>({path,name:path.split("/").at(-1)!.replace(/\.md$/,""),fields,...extra});
const notes:TimelineNote[]=[
  n("Calendar.md",{type:"Calendar",primary:true,precision:"day",aliases:["AS"],months:["Emberfall","Thawmoon","Highsun"],"days-per-month":30,eras:[{name:"Age of Smoke",abbr:"AS"}],format:"{day} {month} {year} {era}"}),
  n("Mortal Count.md",{type:"Calendar",precision:"year",aliases:["MC"],anchor:"0 MC = 5 AS",format:"{year} MC"}),
  ...["Eastern Archive","Salt Harbor","High Observatory","Glass Uplands"].map(name=>n(`Locations/${name}.md`,{type:"Location"})),
  n("Characters/Mira.md",{type:"Character",Born:0}),n("Characters/Orin.md",{type:"Character"}),n("Items/Tide atlas.md",{type:"Item"}),n("Affiliations/Chartmakers.md",{type:"Affiliation"}),
  n("Events/Archive founded.md",{type:"Event",Date:-2,Locations:"[[Eastern Archive]]",Founded:"[[Chartmakers]]"},{tags:["origins"]}),
  n("Events/Mira born.md",{type:"Event",Date:0,Locations:"[[Salt Harbor]]",Born:"[[Mira]]"},{tags:["origins"]}),
  n("Events/Atlas recovered.md",{type:"Event",Date:12,Locations:"[[Glass Uplands]]",Characters:"[[Mira]]",Found:"[[Tide atlas]]"},{tags:["atlas"]}),
  n("Events/Observatory restoration.md",{type:"Event",Start:17,End:21,Locations:"[[High Observatory]]",Characters:["[[Mira]]","[[Orin]]"]},{tags:["restoration"],project:"08 Projects/Glass Meridian"}),
  n("Events/Arrival.md",{type:"Event",Date:"Highsun 20 AS",Locations:"[[Eastern Archive]]",Characters:["[[Mira]]","[[Orin]]"],Items:"[[Tide atlas]]"},{tags:["atlas"],project:"08 Projects/Glass Meridian"}),
  n("Events/A sealed dispatch.md",{type:"Event","Preceded By":"[[Arrival]]",Locations:"[[Salt Harbor]]",Characters:"[[Orin]]"},{tags:["dispatch"]}),
  n("Events/The harbor closes.md",{type:"Event",Date:25,"Preceded By":"[[A sealed dispatch]]",Locations:"[[Salt Harbor]]",Characters:"[[Orin]]"},{tags:["dispatch"]}),
  n("Events/Atlas lost.md",{type:"Event",Date:35,Locations:"[[Salt Harbor]]",Lost:"[[Tide atlas]]",Characters:"[[Mira]]"},{tags:["atlas"]}),
  n("Events/A distant signal.md",{type:"Event",Date:22,Characters:"[[Mira]]"},{tags:["signals"]}),
  n("Events/Two archives.md",{type:"Event",Date:21,Locations:["[[Eastern Archive]]","[[High Observatory]]"],Characters:"[[Orin]]"}),
  n("Events/The unopened letter.md",{type:"Event",Characters:"[[Orin]]"}),
  n("Events/The last page.md",{type:"Event","Preceded By":"[[The unopened letter]]",Characters:"[[Orin]]"}),
  n("08 Projects/Glass Meridian/Scripts/Draft I.md",{type:"Script",Events:["[[Arrival]]"],role:"manuscript",format:"comic-script"}),
  n("08 Projects/Glass Meridian/Plot/The atlas.md",{type:"Plot Point",Event:"[[Arrival]]"}),
];
let indexedLength=-1;
const paths=new Map<string,string>(),names=new Map<string,string|undefined>();
const resolve=(target:string,_source:string)=>{
  if(indexedLength!==notes.length){paths.clear();names.clear();for(const note of notes){paths.set(note.path.replace(/\.md$/i,""),note.path);names.set(note.name,names.has(note.name)?undefined:note.path);}indexedLength=notes.length;}
  const path=target.replace(/\.md$/i,"");return paths.get(path)??names.get(path);
};
let world:WorldTimeline;
const owner:any={workspaceSettings:readWorkspace(null),timelineSettings:readTimeline(JSON.parse(localStorage.getItem("timeline-phase2-settings")??'{"enabled":true}')),savePluginData:async()=>{localStorage.setItem("timeline-phase2-settings",JSON.stringify(owner.timelineSettings));document.querySelector("#saved")!.textContent="Preferences saved";},app:{workspace:{openLinkText:async(path:string)=>{document.querySelector("#opened")!.textContent=path;}}},timelineFeature:{refresh:()=>update()}};
let states:StateTimelines;
let ui:WorldTimelineUI|EntryTimelineUI;
let selectedEntry="";
const root=document.querySelector<HTMLElement>("#timeline")!;
const open=(path:string)=>{document.querySelector("#opened")!.textContent=path;};
const calendar=async(path:string)=>{owner.timelineSettings.displayCalendar=path;await owner.savePluginData();};
function update(){const index=buildTimelineIndex(notes,owner.timelineSettings);world=buildWorldTimeline(notes,index,owner.timelineSettings,resolve);world.canon=timelineCanonEntries(notes,owner.workspaceSettings);states=buildStateTimelines(notes,index,world,owner.timelineSettings,resolve);world.diagnostics.push(...states.diagnostics);ui?.draw();}
function show(path=""){
  selectedEntry=path;ui?.dispose();root.classList.remove("marginalia-entry-timeline");
  ui=path?new EntryTimelineUI(root,{entry:()=>states.entries.get(selectedEntry),registry:()=>world.registry,displayCalendar:()=>owner.timelineSettings.displayCalendar,calendar,open,world:()=>show()}):new WorldTimelineUI(root,{states:()=>states,entry:path=>show(path),world:()=>world,settings:()=>owner.timelineSettings,image:entry=>{const match=/marker-(\d+)\.svg$/.exec(entry.icon??'');return match?'data:image/svg+xml,'+encodeURIComponent(threadsIcon(Number(match[1])-1)):undefined;},calendar,lanes:()=>new TimelineLanesModal(owner,world).open(),open});
  ui.draw();
}
update();show();
for(const [label,path] of [["Mira timeline","Characters/Mira.md"],["Atlas timeline","Items/Tide atlas.md"],["Orin timeline","Characters/Orin.md"],["Archive timeline","Locations/Eastern Archive.md"],["World view",""]]){const b=document.createElement("button");b.textContent=label;b.onclick=()=>show(path);document.querySelector("#fixture-controls")!.append(b);}
for(const [name,action] of [["Recover atlas",()=>{if(!notes.some(n=>n.name==="Atlas found again"))notes.push(n("Events/Atlas found again.md",{type:"Event",Date:40,Found:"[[Tide atlas]]",Locations:"[[Eastern Archive]]"}));update();}],["Own birth 2",()=>{notes.find(n=>n.name==="Mira")!.fields.Born=2;update();}],["Light / dark",()=>document.body.classList.toggle("theme-dark")],["Move Arrival to 28",()=>{notes.find(n=>n.name==="Arrival")!.fields.Date=28;update();}],["Break predecessor",()=>{notes.find(n=>n.name==="A sealed dispatch")!.fields["Preceded By"]="[[Missing event]]";update();}],["Load 5,000 events",()=>{if(notes.some(n=>n.name==="Dense event 0"))return;for(let i=0;i<5000;i++)notes.push(n(`Events/Dense event ${i}.md`,{type:"Event",Date:20,Locations:"[[Eastern Archive]]",Characters:"[[Mira]]"}));update();}]] as const){const b=document.createElement("button");b.textContent=name;b.onclick=action;document.querySelector("#fixture-controls")!.append(b);}

const threadsDemo=document.createElement('button');threadsDemo.textContent='Threads fixture';threadsDemo.onclick=()=>{const calendars=notes.filter(n=>n.fields.type==='Calendar');notes.splice(0,notes.length,...calendars,...threadsFixture('Calendar.md'));indexedLength=-1;owner.timelineSettings.displayCalendar='Calendar.md';owner.timelineSettings.groups=[{name:'Coastal exchange',style:'cyan'},{name:'Highland works',style:'purple'}];owner.timelineSettings.lanes=notes.filter(n=>n.type==='Location').map((n,i)=>({path:n.path,group:i<2?'Coastal exchange':'Highland works',enabled:true}));update();show();if(ui instanceof WorldTimelineUI){ui.state.threads=true;ui.draw();}};document.querySelector('#fixture-controls')!.append(threadsDemo);
