---
title: Timeline Feature Plan
type: Plan
date: 2026-11-01
tags:
  - marginalia
  - timeline
  - plan
---

# Timeline Feature Plan

> [!abstract] Summary
> The Timeline is built around Event entries. Worlds define their own calendars as ordinary notes. Dates, spans, and state changes live in frontmatter. Marginalia converts everything to one internal sort key and renders a world timeline, per-entry timelines, and a "snapshot at time T" view. Items marked **Decided** came out of planning; items marked **Proposed** are my suggestions for DC to accept or change. Mockups come after this plan is signed off.

## 1. Goals and non-goals

**Goals**
- Show where characters, items, affiliations, and other entries are, and what state they are in, at any point on a world's in-world timeline.
- Support fully custom calendars per world, including two calendars describing the same timeline (parallel notation).
- Keep plain markdown as the source of truth: everything the timeline reads is in note frontmatter, editable in Obsidian.
- Let users choose how precise their dates are (year, month, or full day).

**Non-goals (for now)**
- Separate flows of time (a realm where time runs differently). Kept in mind, deferred.
- The AI writing or changing dates or entries. The Librarian only reports and suggests.

## 2. Core concepts

| Term | Meaning |
|---|---|
| Calendar note | A note (`type: Calendar`) defining a world's eras, months, and precision |
| Primary calendar | The calendar an entry uses when it names none |
| Sort key | The single internal number every date converts to, so dates from any calendar compare |
| Event | An Event entry carrying a point date or a span |
| State change | A fact such as born, died, lost, or founded that changes an entry from a moment onward |
| Tracked field | A frontmatter field listed in the world's state-tracking list, assigned to an effect group |
| Effect group | Appears, Disappears, or Moves: the visual effect a state change has on the timeline |
| Presence | An entry being linked in an event's frontmatter |

## 3. Calendar notes

**Decided**: calendars are notes with structured frontmatter, plus normal lore prose below the frontmatter. The note is a real entry and can link to other entries.

```yaml
---
type: Calendar
primary: true
precision: month        # year | month | day
aliases:
  - AS
eras:
  - name: Age of Smoke
    abbr: AS
    epoch: 0
    direction: forward
months:
  - Emberfall
  - Thawmoon
  - Highsun
days-per-month: 30
format: "{month} {year} {era}"
---
```

A second calendar for the same timeline (parallel notation) adds an anchor:

```yaml
---
type: Calendar
precision: year
aliases:
  - MC
eras:
  - name: Mortal Count
    abbr: MC
    epoch: 0
    direction: forward
anchor: "1 MC = 340 AS"
format: "{year} {era}"
---
```

**Decided**
- **Precision is a per-calendar setting.** Year precision needs only an era and epoch. Month precision adds the month list. Day precision adds days per month.
- **Lower precision maps to the first unit of the period** for sorting: a month-precision date sorts as the first of that month, a year-precision date as the first of that year.
- **One calendar marks itself `primary: true`.** Entries on the primary calendar never need a `Calendar` field.
- **Era placement is flexible.** `CE 200` and `200 CE` both parse. The era abbreviation, month name, and year are distinguishable tokens, so input is order-independent. The calendar's `format` string controls how dates display.

**Proposed**
- A single calendar in the vault is treated as primary automatically.
- Two calendars both marked primary, or several calendars with none marked, produce a warning and fall back to alphabetical order (same pattern as script-chain conflicts).
- Day-precision input must follow the declared `format`, because two numbers (day and year) make token order ambiguous.
- Uniform `days-per-month` in v1. A per-month length list, leap rules, and irregular years are a later extension.
- Era abbreviations resolve to their calendar for inline overrides, so `72 MC` is understood as the Mortal Count even if the entry's own calendar is Age of Smoke.

## 4. Dates on entries

**Decided**
- **Fixed field names** (no per-world field naming).
- **Date and span fields are limited to events.**
- **Supported event date types:** point and span are required; order-only is required. Uncertain and relative dates are optional, later.
- **A separate `Calendar` field is only needed when an entry uses a non-primary calendar.**

**Proposed field set**

| Field | Used on | Meaning |
|---|---|---|
| `Date` | Event | Point date |
| `Start` / `End` | Event | Span |
| `Calendar` | Any entry with dates | Calendar name or alias, plain text, only when non-primary |
| `Preceded By` | Event | Order-only placement and tie-breaking (existing field name) |

```yaml
# Primary calendar, no Calendar field
Date: Highsun 412

# Non-primary calendar
Calendar: MC
Date: 72

# Span
Start: 410
End: 415

# Inline override on a single date
Date: 72 MC
```

**Proposed**
- `Calendar` is plain text rather than a wikilink so it does not count as presence and does not add a hub node to the graph.
- Order-only events (no date) are placed between their `Preceded By` neighbors. A chain with no dated anchor shows in an "Undated" lane, in sequence.
- Event cards keep showing their in-story date, formatted by the display calendar.
- A date on a non-event note is the state-change case (section 6), not a `Date` field. A stray `Date`, `Start`, or `End` on a non-event gets a deterministic warning.

## 5. Presence

**Decided**
- Presence comes from frontmatter only. Body wikilinks do not count.
- Any wikilink in an event's frontmatter counts as present. The field is flexible, not limited to a fixed Characters list.

**Proposed**
- Reserved structural fields are excluded from presence: `Preceded By`, `Calendar` (plain text anyway), and any similar non-participant link fields.
- A script or plot point that links an event in its frontmatter shows up on that event's detail view and as a marker on the timeline.

## 6. State changes

**Decided**
- State changes matter (example: an item lost during an event).
- Events carry state changes in frontmatter, reusing lifecycle fields (Born, Died, Founded) and adding new ones such as Lost.
- A status field holding a date on a non-event note reads as a state change at that date. Events also carry state changes.
- The tracked fields are a list in Settings, per world, grouped by intended visual effect: **Appears**, **Disappears**, **Moves**.
- **Moves covers every presence link by default.**

**Effect groups**

| Group | Visual effect |
|---|---|
| Appears | The entry shows on the timeline and snapshot from this moment |
| Disappears | The entry ends or is removed from this moment |
| Moves | The entry's location changes to the event's location |

**Default list**

| Group | Fields |
|---|---|
| Appears | Born, Founded, Found, Created |
| Disappears | Died, Lost, Destroyed, Dissolved |
| Moves | Every presence link (built in, on by default) |

- Disappears and Appears can reverse each other: Lost makes an item disappear, a later Found makes it appear again.
- Users can add their own fields to Appears or Disappears (for example Summoned or Cursed).

**How it works (Proposed model)**
- A tracked field on an event lists the entries that changed:

```yaml
Characters: ["[[Heracles]]", "[[Nessus]]"]
Died: ["[[Nessus]]"]
Lost: ["[[Bow of Heracles]]"]
Founded: ["[[The Argonauts]]"]
```

- A tracked field on a non-event note holds a date and changes that note's own state:

```yaml
# on Iolaus
Born: 410
# on the Bow of Heracles
Lost: 412
```

- The value type tells the two apart: a date is a self-supplied state change, a wikilink is an event-supplied one. Both feed one state timeline.
- Moves is implicit: any wikilink in an event's frontmatter (except reserved structural fields, section 5) places that entry at the event's location from the event's date.

**Settings: state-tracking list (per world, stored in `.marginalia` inside the vault)**
- Three sections, one per effect group, each with its fields and an "Add field" row.
- Each Appears or Disappears row has a field name and an optional "Applies to" entry-type filter (for example Born only on Characters).
- The Moves section shows the built-in "every presence link" rule.

**Snapshot at time T (Proposed)**
- An entry is visible at T if its latest Appears or Disappears change at or before T is an Appears.
- Last-known location is the Locations link of the latest event at or before T in which the entry was present.
- Ties (same sort key, common at month or year precision) are broken by the `Preceded By` chain, then alphabetically, with a notice.

**Conflicts and warnings (Proposed)**
- If an entry's own date disagrees with an event-supplied one (e.g. `Born: 410` vs. an event dated 412 listing a birth), the app flags the mismatch and shows the entry's own value until resolved.
- Found with no earlier Lost, or Born after Died, produces a deterministic warning.

## 7. Views

**Decided**
- World timeline: horizontal, swimlanes, zoom levels, filterable by type, tag, and project.
- Per-entry timeline: on a character, location, item, etc.
- Snapshot scrubber: where things are and what state they are in at time T.
- Display calendar selector (switch which calendar dates render in).
- Links from scripts and plot points to events.

**Proposed**
- Per-world display-calendar choice persists in `.marginalia`.
- Event cards and rows show the date at the calendar's declared precision only.
- Mixed precision on one timeline sorts correctly; a month-only event and a day-dated event in the same month are shown as overlapping rather than guessed into order.

## 8. Editing

**Proposed**
- The structured frontmatter form gets a date input that follows the entry's calendar and precision (era, month, and day pickers as applicable).
- Parse errors show inline with the expected format.
- Calendar notes get a structured form (eras, months, anchor, format) alongside the prose editor.
- The Settings state-tracking list is three grouped sections (Appears, Disappears, Moves) with add/remove rows.
- No automatic writing of dates anywhere. The AI does not edit canon.

## 9. Librarian integration (Proposed)

**Tier 1: deterministic checks**
- Unparseable date, unknown era, month, or `Calendar` name.
- Start after End, missing End on a span.
- Date, Start, or End on a non-event.
- Died before Born.
- Present in an event dated before Born or after Died or Destroyed.
- Item present after Lost with no Found in between.
- Entry's own state date conflicts with an event-supplied one.
- Two primary calendars, none marked with several existing, dangling or cyclic anchor.
- Event dated earlier than its `Preceded By` predecessor.
- `Preceded By` cycles or conflicts (reusing the script-chain handling).

**Tier 2: LLM-based**
- Continuity check: an entry in two places at once, behavior that conflicts with its state, implausible ages.

**Other functions**
- Entry Alignment: suggest a missing `Date` on an event, a missing `Calendar` on a non-primary-calendar entry, or a lifecycle date missing on an entry whose type usually has one (using the existing convention-gap rule).
- Gap Finder: events with no date, characters with no Born.
- Expanded entries can include the entry's timeline.

## 10. Architecture notes (Proposed)

- Calendars are parsed at vault load. Every date resolves to a sort key then.
- State timelines are indexed per entry at load for fast snapshot queries.
- The timeline logic lives in the app layer, consistent with the standalone-first approach.
- Must run on mobile: the index is small, and the views use lazy rendering for long timelines.
- Anchors between calendars with different unit structures convert at year granularity in v1.

## 11. Phasing (Proposed)

1. Calendar notes, date parsing, sort key, the `Calendar` field, deterministic validation, and the state-tracking Settings list.
2. World timeline view, including the Undated lane and `Preceded By` ordering.
3. State derivation, per-entry timelines.
4. Snapshot scrubber.
5. Structured date editing and the calendar editor form.
6. Librarian checks (Tier 1 first, then Tier 2).

## 12. Deferred

- Relational state changes (e.g. joined an affiliation). A paired syntax such as `Joined: "[[Heracles]] → [[Argonauts]]"` is one option.
- Separate flows of time (a realm with different time rates).
- Uncertain and relative dates.
- Irregular month lengths, leap rules, and sub-year calendar anchors.

## 13. Open questions

1. Does tie-breaking by `Preceded By` then alphabetical match how you expect same-period events to behave?
2. Which fields beyond `Preceded By` should be excluded from presence?
3. Which event field marks location for last-known-location, the existing Locations field?
4. Should tracked fields be limited per entry type by default (e.g. Born only on Characters)?
5. Should an entry's own state date win over an event-supplied one when they conflict, or should neither win until resolved?
6. Is year-granular anchoring enough for parallel calendars, or do any of your worlds need sub-year alignment?

## Related Entries

- [[Marginalia Product Plan]]
