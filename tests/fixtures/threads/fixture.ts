import type {TimelineNote} from '../../../src/timeline/model.ts';
export const threadsRoot='Threads Demo';
const names=['Mira Thorne','Orin Reed','Sera Vale','Tamsin Grey','Neris Dawn','Rowan Ash','Ivo Flint','Lea Moss','Kestrel Snow','Bram Rook','Dara Wren','Sol Pike','Sun compass','Amber key','Tide lantern','Glass map','Harbor Watch','Ridge Guild','Beacon code','Tidegate protocol'];
const eventNames=['The first dispatch','The tide survey','The archive opens','The ridge crossing','The lantern assembly','The signal test','The workshop accord','The harbor blockade','The beacon repair','The glass exchange','The return convoy','The shared watch'];
export function threadsFixture(calendar='Timeline Demo/Calendar.md'):TimelineNote[]{
 const note=(path:string,type:string,fields:Record<string,unknown>={}):TimelineNote=>({path,name:path.split('/').at(-1)!.replace(/\.md$/,''),type,fields:{type,...fields},tags:[type.toLowerCase(),'threads-demo']});
 const locations=['Threads Harbor','Threads Archive','Threads Ridge','Threads Workshop'].map(name=>note(`${threadsRoot}/Locations/${name}.md`,'Location'));
 const participants=names.map((name,i)=>note(`${threadsRoot}/Participants/${name}.md`,i<12?'Character':i<16?'Item':i<18?'Affiliation':'System',i<10?{icon:`[[${threadsRoot}/Assets/marker-${String(i+1).padStart(2,'0')}.svg]]`}:i===10?{icon:`[[${threadsRoot}/Assets/missing.svg]]`}:{}));
 const events=eventNames.map((name,i)=>note(`${threadsRoot}/Events/${name}.md`,'Event',{Calendar:calendar.replace(/\.md$/,''),...(i===3||i===8?{Start:440+i*2,End:441+i*2}:{Date:i===5?448:440+i*2}),Locations:`[[${locations[i%4].path.replace(/\.md$/,'')}]]`}));
 participants.forEach((p,i)=>{for(let j=0;j<2+i%4;j++){const e=events[(i*7+j*5)%12],field=p.type==='Character'?'Characters':p.type==='Item'?'Items':p.type==='Affiliation'?'Affiliations':'Systems';(e.fields[field]??=[] as string[]);(e.fields[field] as string[]).push(`[[${p.path.replace(/\.md$/,'')}]]`);}});
 (events[4].fields.Characters as string[]).push(`[[${participants[0].path.replace(/\.md$/,'')}]]`);
 const undated=note(`${threadsRoot}/Events/The unopened dispatch.md`,'Event',{'Preceded By':`[[${events[2].path.replace(/\.md$/,'')}]]`,Characters:participants.slice(0,2).map(p=>`[[${p.path.replace(/\.md$/,'')}]]`),Locations:`[[${locations[0].path.replace(/\.md$/,'')}]]`});
 events[4].fields['Preceded By']=`[[${undated.path.replace(/\.md$/,'')}]]`;
 return [...locations,...participants,...events,undated];
}
export function threadsIcon(i:number){const hue=(i*43)%360;return `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="hsl(${hue},45%,35%)"/><circle cx="40" cy="30" r="14" fill="#fff" opacity=".8"/><path d="M15 76Q15 48 40 48Q65 48 65 76" fill="#fff" opacity=".8"/><text x="40" y="73" text-anchor="middle" fill="#172029" font-family="sans-serif" font-size="16">${i+1}</text></svg>`;}
