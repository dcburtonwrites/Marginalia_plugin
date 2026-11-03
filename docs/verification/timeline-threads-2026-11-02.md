# Threads verification

2026-11-02 · D-0067 · package 0.20.0

Offscreen continuation, card sizing and click behavior were subsequently refined by [D-0068 verification](timeline-thread-continuation-2026-11-02.md); the results below record the original Threads acceptance.

| Approved behavior | Evidence | Result |
| --- | --- | --- |
| Optional Threads view, compact default and remembered choices | Pure state round-trip/default tests; browser turns Threads off and restores normal badges, then on while retaining images-off. Native View checkboxes work, and returning from entry history retains Threads and the Canon filter. Native saved workspace state records Threads/images. | Pass |
| Participant markers below event cards | Complete participant grids expand collision rows; tests include 20 participants in one event. Browser rectangles confirm markers start below their cards. Native screenshot shows local image markers and initials beneath cards. | Pass |
| One thread across location lanes | Geometry groups points globally by original entry path, not by lane. Explicit regression checks connect Harbor's First event to Archive's Last event. Native Mira Thorne connects Threads Harbor to Threads Archive; browser shows two highlighted segments including that cross-lane connection. | Pass |
| All participant types; selected Canon threads only | Fixture includes Characters, Items, Affiliations and Systems. Browser and native select Mira Thorne: only her markers remain, across 3 dated events plus 1 undated event. Existing event/type/tag/project filtering remains. | Pass |
| Hover/focus and entry-history navigation | Browser keyboard focus highlights 3 Mira nodes and a connection before the simultaneous fixture extension, then 2 connections in the final fixture. Other lines dim. Click opens Mira's history; native reports 4 records, then World Timeline retains Threads/filter on return. | Pass |
| Local icons, configurable property and fallback | Model test reads a custom portrait property, excludes that image field from participant-link diagnostics, rejects external/filesystem/traversal/nonimage targets. Host test resolves a local SVG through native vault resources and rejects missing/external targets. Browser images load, images-off removes them, and native portraits render from fixture assets. | Pass |
| Spans, ties and undated separation | Span marker positions remain below cards. Tests retain same-time uncertainty; final fixture has a dotted same-time Mira segment. A predecessor-placed undated event is omitted from dated Threads layout and appears only in Undated; no connector enters the Undated region. | Pass |
| View containment and virtualization | Browser at 620×540: root client/scroll dimensions match (620×498), vertical chart scrolling remains available and Undated stays at the bottom. Existing near-viewport row/card mounting is retained; SVG segments paint only when intersecting the vertical render area. | Pass |
| Requested native fixture | Separate Threads Demo: 12 dated events + 1 undated, 20 participants each occurring 2–5 times, four locations, two colored groups and ten local SVG assets. Generator and model tests independently verify occurrence counts. | Pass |
| Regression and packaging | 224 pure/model + 92 host tests = 316 passing. Typecheck, package, preview build, mobile-load and whitespace checks pass. Both isolated test installations match final package hashes; active native test vault reactivated. | Pass |
| Preserve existing originals | All 5 pilot and 53 prior test-vault original notes retain exact baseline hashes. Only new fixture files and test presentation settings were written. | Pass |

## Native acceptance

Obsidian 1.14.5, existing theme and split-pane layout. The world contains the prior 9 events plus 13 new fixture events. Fixture lanes are enabled in Coastal exchange (cyan) and Highland works (purple); earlier lanes are retained but hidden for demonstration. Previous lane/group/display preferences are saved in `.preview/threads-fixture-preferences-before.json`.

The final native view is left in Threads with Entry images enabled and the Mira Thorne Canon chip selected. Her first occurrence in Threads Harbor connects to the later Harbor occurrence, then across the lane boundary to Threads Archive. The same-time Harbor/Archive segment is dotted. Clicking her marker opens the existing entry timeline with 4 records, including the explicitly undated one. Returning to the World Timeline retains the selected mode/filter.

Mira's simultaneous records deliberately name two locations. Existing timeline diagnostics correctly add a same-time location conflict; Threads does not choose a winner or infer travel. Other pre-existing diagnostic examples remain intact.

## Limits

Connections cover displayed dated events in enabled lanes and the current time/filter window. Hidden occurrences are not claimed as a complete journey. Undated relational placements remain available in the ordinary view but are kept out of dated Threads geometry. Span markers stay beneath their event card, as approved, without changing status-at-span-end rules.

Dense events expand vertically and may require lane scrolling, zooming or Canon chips to keep the view readable. No participants are silently truncated from the Threads grid. Same-time ties use an undirected dotted visual connection; deterministic rendering order is not an authored chronology.

Icons accept local PNG/JPEG/GIF/WebP/AVIF/SVG references. Broken or unavailable files use initials; no remote image URL is fetched from frontmatter. Browser fixture images use equivalent synthetic SVG data URLs solely in the preview harness. Production uses native vault resource URLs. The image property is presentation configuration and does not change dates or AI chronology fingerprints.

[Approved contract](../Threads-Plan.md) · [Fixture definitions and generator instructions](../../tests/fixtures/threads/README.md) · [Browser image](timeline-threads-2026-11-02.png) · [Native image](timeline-threads-native-2026-11-02.png) · [Package hashes, counts and preservation proof](timeline-threads-package.json).
