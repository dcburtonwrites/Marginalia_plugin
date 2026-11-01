---
title: Timeline Feature Plan
type: Plan
date: 2026-11-01
tags: [marginalia, timeline, plan]
---

# Timeline Feature Plan

Approved implementation contract for the Obsidian plugin. One vault is one world.
Timelines is opt-in, available only in World vaults, and targets desktop first.
Development uses v0.20.0; the completed feature will be v0.30.0.
Each phase ends with verification and an owner review before the next phase.

## 1. Goals and boundaries

- World timeline, per-entry timelines, and a snapshot at time T showing known presence/state/location.
- Custom calendars with parallel notation on one shared timeline.
- Calendar definitions, event dates, participant links, and lifecycle dates remain ordinary Markdown frontmatter. No model writes or changes canon.
- Preferences use existing Obsidian plugin settings storage, not new `.marginalia` settings files.
- Native TypeScript and public Obsidian APIs; no standalone-app runtime dependency.
- Deferred: separate time flows, relative/uncertain dates, leap rules, irregular month lengths, relational changes such as joining affiliations, and sub-year anchors.

## 2. Access and setup

Timelines has an independent enable setting, restricted to World vaults on desktop.
Switching to Storyboard or mobile makes it unavailable while retaining saved preferences.
Enabling reuses existing Calendar notes. If none exists, create a normal note named `Calendar`, using the existing native vault creation conventions. Avoid overwriting any existing file by using an available numbered name.
The default calendar has year precision, signed numeric years, year zero, and no required era abbreviation.
An existing malformed Calendar note produces a configuration error; it is not replaced.
The visual feature opens in a native main-pane view like the graph. Entry views gain a timeline button beside Librarian, independent of whether Librarian is enabled.

## 3. Calendar notes

```yaml
---
type: Calendar
primary: true
precision: day
aliases: [AS]
eras:
  - name: Age of Smoke
    abbr: AS
months: [Emberfall, Thawmoon, Highsun]
days-per-month: 30
format: "{day} {month} {year} {era}"
---
```

A Calendar is a real entry with ordinary lore prose below its frontmatter.
There are no `epoch` or `direction` properties: all calendars use signed years starting at zero. Era names/abbreviations are optional date labels, not independently offset epochs or reverse-counting eras.

- `precision` is the maximum supported unit: year, month, or day. Lower-precision input is accepted and its authored precision retained.
- Year-only input sorts at the start of that year; month-only input at the start of that month. Display never invents a finer precision than the author supplied or the selected display calendar supports.
- Month precision requires a list of month names. Day precision additionally requires uniform `days-per-month`.
- Year/month input is token-order independent, including an optional era. Full day input follows `format` to disambiguate day and year.
- Names, aliases, and era abbreviations resolve calendars. Inline qualifiers can override an entry's `Calendar` setting. Ambiguous aliases produce errors, never an arbitrary selection.
- The note marked `primary: true` is the default. A sole Calendar note is automatically primary. Multiple primary notes, or multiple calendars with no primary, require an explicit primary-calendar choice in settings and disclose the conflict; there is no alphabetical fallback.
- Invalid calendar definitions remain visible as errors rather than silently falling back to a different calendar.

Parallel calendar example:

```yaml
---
type: Calendar
precision: year
aliases: [MC]
anchor: "0 MC = 339 AS"
format: "{year}"
---
```

Anchors may chain but must resolve without cycles or dangling/ambiguous targets.
Anchors align whole years; one year has the same duration across calendars in v1. Within a year, uniform months/days occupy proportional units of the shared year. Different month structures may render different month/day notation for the same instant.

## 4. Event dates and order

Fixed fields: `Date` for a point, or `Start` and `End` for a span; both span endpoints are required.
`Calendar` is plain text (name, alias, or note path), needed only for non-primary calendars. It is not a participant link.

```yaml
Date: Highsun 412
# or
Calendar: MC
Date: 72
# or
Start: 410
End: 415
```

Inline example: `Date: 72 MC`.
Only Events use Date/Start/End. Non-event entries use lifecycle fields such as Born or Lost for their own dates. Unexpected date fields on non-events produce deterministic validation errors.
A span's state changes and movement take effect at End. A point's take effect at Date.
Invalid, incomplete, or mixed point/span input does not receive a guessed effective date.

`Preceded By` is read-only and used only for undated chains. It never rewrites authored dates, breaks dated ties, or auto-fills event properties. Chains with no dated anchor appear in an Undated lane. An undated event between dated anchors can be positioned relationally without gaining an invented canonical date. Dangling/cyclic/conflicting chains must remain disclosed.
Overlapping precision does not establish finer factual order; the visual layout must not imply an invented day/order.

## 5. Presence and location

Presence uses wikilinks in Event frontmatter only, including flexible participant fields and tracked state fields. Body links do not count.
Exclude structural fields: Preceded By, Followed By, Calendar, Project/Projects, Script/Scripts, Plot Point/Plot Points; Location/Locations defines where an event occurs rather than a participant to move.
Locations remain stationary and supply the vertical axis. Users choose lanes and group them.
Missing or multiple event locations must remain unknown/ambiguous instead of selecting an arbitrary first link.
Scripts and plot points linking to Events can be shown as related markers/details in the appropriate visual phase.

## 6. State changes

The per-vault settings list groups fields by effect:

| Effect | Default fields |
| --- | --- |
| Appears | Born, Founded, Found, Created |
| Disappears | Died, Lost, Destroyed, Dissolved |
| Moves | Every participant link, built in |

Fields default to unrestricted entry types. Each Appears/Disappears field has an optional Applies to filter, and can be added/removed in settings. Structural and date fields cannot be registered as lifecycle fields.

On Events, tracked fields list entries affected:

```yaml
Characters: ["[[Heracles]]", "[[Nessus]]"]
Died: ["[[Nessus]]"]
Lost: ["[[Bow of Heracles]]"]
Founded: ["[[The Argonauts]]"]
```

On non-events, tracked fields hold that entry's own date, such as `Born: 412`.
An entry's own lifecycle date supersedes an event-derived date for the same fact. For example a birth event spanning 410–415 supplies 415, but the character's `Born: 412` wins. Retain the discrepancy for review.
Appears/Disappears may reverse each other, such as Lost followed by Found.
Before explicit evidence, state is unknown, not absent; entries without Born/Created can still appear when encountered.
A snapshot derives the latest known state and location at or before T. Conflicting changes at an indistinguishable instant remain unresolved, rather than alphabetical factual precedence. Multiple simultaneous locations remain a conflict.

## 7. Views and interaction

- Horizontal world timeline with zoom and type/tag/project filters, user-selected/grouped location lanes, Undated lane, event selection/details, and display-calendar selection.
- Per-entry timeline for characters, locations, items, and other entries.
- Snapshot scrubber showing known state/location at T with unknown and conflict states.
- Per-world display/lane preferences persist in existing plugin settings.
- The mockup in `docs/reference/World timeline mockup` governs visual direction; adapt to native Obsidian panes/themes.
- Prioritize navigation, zoom, filters, lane controls and details. Playback/speed/follow and dashed future paths are not required for the first view; consider later only if useful.
- Mockup warning text is illustrative. It does not establish travel-time assumptions or a requirement to implement Librarian continuity rules.

## 8. Editing

Structured date inputs follow the selected calendar and retain authored precision. Parsing errors explain the expected format.
Calendar definitions remain real notes; a later structured Calendar form sits alongside prose editing.
Native Obsidian editing remains available. No automatic date generation or rewriting; all explicit form edits must preserve unrelated note content and normal native Undo where applicable.

## 9. Validation and optional Librarian integration

Phase 1 validates syntax/configuration: invalid dates, unknown/ambiguous calendars or tokens, invalid calendar structures/anchors, conflicting primaries, missing span endpoints, reversed spans, mixed Date/Start/End, non-event date properties, and malformed frontmatter.

Documented continuity rules for later evaluation (not a prerequisite for calendar/date foundations): Died before Born; presence before birth or after death/destruction; item presence after Lost without Found; entry/event lifecycle mismatch; invalid lifecycle sequences; undated-chain problems; simultaneous conflicting state/location.
These deterministic rules are separate from whether a Librarian interface is implemented. LLM-based continuity/age/travel suggestions, Entry Alignment convention gaps, Gap Finder, and expanded-entry timelines are later integration candidates, not already implemented plugin features.

## 10. Architecture

`src/timeline` owns a host-independent calendar/date/index/settings model, plus a thin native feature/settings layer.
At load, use the native metadata cache and overlay open source buffers; refresh on native metadata/vault/editor events, coalesced by the feature lifecycle. Exclude templates, assets, archives, and hidden plugin storage consistently with existing entry eligibility.
No timeline read operation writes authored notes. The only Phase 1 note writer is explicit enable-time default-calendar creation; never overwrite existing notes.
State indexing and lazy rendering arrive with their phases; no mobile startup runtime is required in desktop-first development.

## 11. Phases and review gates

1. Calendar notes, parsing/formatting/shared sort key, Calendar property, configuration/date validation, World-only enable/default setup, tracked-field settings and native plugin persistence.
2. World timeline, location lane selection/grouping, filters/zoom/details/display calendar, Undated lane and read-only undated ordering.
3. State derivation and precedence, participant/location indexing, unknown/conflicting states, per-entry timelines and entry header access.
4. Snapshot scrubber and state/location presentation.
5. Structured date/calendar editing.
6. Evaluate optional Librarian integration: deterministic rule coverage first, then any approved LLM checks.

Verify each phase and present evidence for owner review before proceeding. Existing unrelated mobile/Librarian release gates do not block this explicitly authorized feature.

## 12. Test fixtures

Use fictional fixtures covering signed year/zero, lower precision on fine calendars, day formats, two parallel calendars, chained/invalid/cyclic anchors, ambiguous aliases, primary conflicts, point/span/undated events, own-vs-event dates, Lost/Found reversals, unknown state, conflicting locations, invalid/non-event dates, dangling/cyclic predecessors, and setup collisions/failure/re-enable.
Keep phase fixtures isolated from creative vaults. Index their expected behavior in the fixture's EDGE-CASES.md. Native UI acceptance is distinct from pure/model and synthetic-host evidence.

## Related Entries

- [[Marginalia Product Plan]]
