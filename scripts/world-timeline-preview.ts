import {WorldTimelineUI} from "../src/timeline/ui.ts";
import {buildWorldTimeline,type WorldTimeline} from "../src/timeline/world.ts";
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
const resolve=(target:string,source:string)=>{
  const path=target.replace(/\.md$/i,"");return notes.find(n=>n.path.replace(/\.md$/i,"")===path)?.path??(notes.filter(n=>n.name===path).length===1?notes.find(n=>n.name===path)?.path:undefined);
};
let world:WorldTimeline;
const owner:any={workspaceSettings:readWorkspace(null),timelineSettings:readTimeline(JSON.parse(localStorage.getItem("timeline-phase2-settings")??'{"enabled":true}')),savePluginData:async()=>{localStorage.setItem("timeline-phase2-settings",JSON.stringify(owner.timelineSettings));document.querySelector("#saved")!.textContent="Preferences saved";},app:{workspace:{openLinkText:async(path:string)=>{document.querySelector("#opened")!.textContent=path;}}},timelineFeature:{refresh:()=>update()}};
function update(){world=buildWorldTimeline(notes,buildTimelineIndex(notes,owner.timelineSettings),owner.timelineSettings,resolve);ui.draw();}
const ui=new WorldTimelineUI(document.querySelector("#timeline")!,{world:()=>world,settings:()=>owner.timelineSettings,calendar:async(path)=>{owner.timelineSettings.displayCalendar=path;await owner.savePluginData();},lanes:()=>new TimelineLanesModal(owner,world).open(),open:path=>{document.querySelector("#opened")!.textContent=path;}});
update();
for(const [name,action] of [["Light / dark",()=>document.body.classList.toggle("theme-dark")],["Move Arrival to 28",()=>{notes.find(n=>n.name==="Arrival")!.fields.Date=28;update();}],["Break predecessor",()=>{notes.find(n=>n.name==="A sealed dispatch")!.fields["Preceded By"]="[[Missing event]]";update();}],["Load 5,000 events",()=>{if(notes.some(n=>n.name==="Dense event 0"))return;for(let i=0;i<5000;i++)notes.push(n(`Events/Dense event ${i}.md`,{type:"Event",Date:20,Locations:"[[Eastern Archive]]"}));update();}]] as const){const b=document.createElement("button");b.textContent=name;b.onclick=action;document.querySelector("#fixture-controls")!.append(b);}
