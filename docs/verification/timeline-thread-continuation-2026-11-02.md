# Threads continuation, compact cards and pinned highlights

2026-11-02 · D-0068 · version 0.20.0

| Requested behavior | Evidence | Result |
| --- | --- | --- |
| Keep lines when connected occurrences are offscreen | Model tests include left/right endpoints across lanes and a line through an empty date window. Browser zoom removes the first dispatch card but retains its continuation; further zoom shows 0 dated cards and 1 highlighted continuation. Native Sol Pike at 460–464 retains a line to the left edge while the earlier connected event is absent. | Pass |
| Preserve enabled lanes, filters and undated boundaries | Tests exclude hidden-lane endpoints, filtered-out events and undated records. Offscreen endpoints leave visible lane JSON/height unchanged. No extension is drawn past the last known connected pair. | Pass |
| Remove unused card space | Browser measures all Threads cards at 44px, reduced from 64px. Marker positions and expanded-row heights share the updated offsets; span marks also shrink. Ordinary cards and their participant badges retain their existing dimensions. | Pass |
| Single-click pins rather than navigates | Browser stays in World Timeline with all Mira marker buttons pressed. Native single-click pins Sol's five occurrences; zoom/pan keeps the pin. Transparent 12px line click areas toggle the same pin (browser pressed count 0, then 1 in an empty window). | Pass |
| Double-click opens history | Browser double-click opens Mira Thorne's 4-record history. Native double-click opens Sol Pike's 5-record history; returning retains the pinned Sol thread. | Pass |
| Regression/package/preservation | 226 pure/model + 92 host tests = 318 passing. Typecheck, package, preview build, mobile-load and whitespace checks pass. Both test installations match package hashes. All 58 prior original notes and all 37 Threads fixture notes retain their recorded hashes. | Pass |

Single-clicking the same marker/line again clears the pin. Blank chart space or Escape also clears it. Hover/focus may preview a thread when none is pinned; a pin takes precedence over hover. Ctrl/Command+Enter opens the timeline from a focused marker. Pins belong to the open view instance and persist through pan/zoom/redraw; they are not a new vault preference.

Offscreen endpoints describe layout only. Connections follow filtered dated occurrences in enabled lanes, and SVG clipping shows their visible portion. A curve may cross lane boundaries before entering the viewport. No offscreen cards/images are mounted, no date/state/travel fact is inferred and no connection runs into Undated. Related-writing counts in compact cards appear alongside the date rather than reserving an empty badge row.

[Browser close-up](timeline-thread-continuation-2026-11-02.png) · [Native close-up](timeline-thread-continuation-native-2026-11-02.png) · [Hashes and acceptance proof](timeline-thread-continuation-package.json).
