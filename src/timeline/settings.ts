import {Setting,Notice} from "obsidian";
import type Marginalia from "../main.ts";
import {el,button} from "../ui/sidebar.ts";
import {timelineAvailable,timelineNotes} from "./feature.ts";
import {buildTimelineIndex} from "./index.ts";
import {readTimeline,type TimelineSettings,type Effect} from "./model.ts";
import {propertyNames,suggest} from "../ui/suggest.ts";
import {openWorldTimeline,openTimelineNote} from "./view.ts";
export function renderTimelineSettings(root: HTMLElement, owner: Marginalia, redraw: () => void) {
  const section = el("details","marginalia-settings-section");
  section.open = true;
  section.append(el("summary","","Timelines")); root.append(section);
  if (!timelineAvailable(owner)) {
    section.append(el("p","marginalia-muted","Timelines is available in World vaults on desktop only.")); return;
  }
  new Setting(section).setName("Enable Timelines").setDesc("Calendar and event dates for this world. Enabling creates a default Calendar note if none exists.")
    .addToggle(toggle=>toggle.setValue(owner.timelineSettings.enabled).onChange(async value=>{
      try {await owner.setTimelineEnabled(value);} catch(error) {new Notice(String(error instanceof Error ? error.message : error));}
      redraw();
    }));
  if (!owner.timelineSettings.enabled) return;
  const body = el("div","marginalia-settings-body");section.append(body);
  body.append(el("p","marginalia-muted","Calendars are notes in this vault. Open a calendar to edit its definition and lore."));
  new Setting(body).setName("World Timeline").setDesc("Explore events by location, date and project.")
    .addButton(button=>button.setButtonText("Open timeline").onClick(()=>{void openWorldTimeline(owner);}));
  const save = async (update: (settings: TimelineSettings)=>void, render = false) => {
    const previous = readTimeline(owner.timelineSettings);
    update(owner.timelineSettings);
    try {await owner.savePluginData(); owner.timelineFeature?.schedule(); if(render)redraw();}
    catch {owner.timelineSettings=previous;new Notice("Could not save timeline settings.");redraw();}
  };
  const snapshot = timelineNotes(owner);
  const index = buildTimelineIndex(snapshot.notes,owner.timelineSettings);
  new Setting(body).setName("Primary calendar").setDesc("Automatic uses the note marked primary, or the only Calendar note. Choose explicitly to resolve conflicting primary flags.")
    .addDropdown(drop=>{
      drop.addOption("","Automatic");
      for(const calendar of index.registry.calendars) drop.addOption(calendar.path,calendar.path);
      if(owner.timelineSettings.primaryCalendar && !index.registry.calendars.some(c=>c.path===owner.timelineSettings.primaryCalendar)) drop.addOption(owner.timelineSettings.primaryCalendar,owner.timelineSettings.primaryCalendar+" (unavailable)");
      drop.setValue(owner.timelineSettings.primaryCalendar).onChange(value=>save(s=>{s.primaryCalendar=value;},true));
    });
  for(const calendar of index.registry.calendars) new Setting(body).setName(calendar.name).setDesc(`${calendar.precision} precision · ${calendar.path}`)
    .addButton(control=>control.setButtonText("Open calendar").onClick(()=>openTimelineNote(owner,calendar.path)));
  for(const effect of ["Appears","Disappears"] as const) {
    body.append(el("h3","",effect));
    for(const tracked of owner.timelineSettings.fields.filter(f=>f.effect===effect)) {
      new Setting(body).setName(tracked.name).setDesc("Applies to entry types (comma-separated). Leave empty for all types.")
        .addText(input=>input.setPlaceholder("All types").setValue(tracked.types.join(", ")).onChange(value=>save(s=>{const field=s.fields.find(f=>f.name===tracked.name);if(field)field.types=value.split(",").map(v=>v.trim()).filter(Boolean);})))
        .addExtraButton(control=>control.setIcon("trash-2").setTooltip(`Remove ${tracked.name}`).onClick(()=>{void save(s=>{s.fields=s.fields.filter(f=>f.name!==tracked.name);},true);}));
    }
    let name = "";
    new Setting(body).setName("Add field").setDesc(`A frontmatter field whose value makes an entry ${effect === "Appears" ? "appear" : "disappear"}.`)
      .addText(input=>{suggest(input.inputEl,()=>propertyNames(owner.app));input.setPlaceholder("Field name").onChange(value=>{name=value.trim();});})
      .addButton(control=>control.setButtonText("Add field").onClick(()=>{
        const updated = readTimeline({...owner.timelineSettings,fields:[...owner.timelineSettings.fields,{name,effect:effect as Effect,types:[]}]});
        if(updated.fields.length!==owner.timelineSettings.fields.length+1){new Notice("Use a unique field name. Date, Start, End, location and structural link fields are reserved.");return;}
        void save(s=>{s.fields=updated.fields;},true);
      }));
  }
  body.append(el("h3","","Moves"),el("p","marginalia-muted","Tracks every participant link at the event’s location. Locations stay stationary; structural links are excluded."));
  const diagnostics = el("div","marginalia-timeline-diagnostics");body.append(diagnostics);
  const check = () => {
    const snapshot=timelineNotes(owner), current=buildTimelineIndex(snapshot.notes,owner.timelineSettings);
    const items=[...snapshot.diagnostics,...current.diagnostics];
    const count = (n: number, label: string) => `${n} ${label}${n === 1 ? "" : "s"}`;
    diagnostics.replaceChildren(el("h3","","Calendar and date checks"),el("p","marginalia-muted",`${count(current.registry.calendars.length,"calendar")} · ${count(current.events.length,"event")} · ${count(items.length,"issue")}`));
    if(!items.length) diagnostics.append(el("p","","No calendar or date errors found."));
    for(const item of items){const row=el("p","marginalia-script-warning");if(item.path)row.append(button(item.path,()=>openTimelineNote(owner,item.path)));row.append(el("span","",`${item.field ? item.field+": " : ""}${item.message}`));diagnostics.append(row);}
  };
  body.append(button("Check calendar and event dates",check));check();
}
