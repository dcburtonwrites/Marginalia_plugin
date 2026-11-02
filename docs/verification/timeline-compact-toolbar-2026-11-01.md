# Compact timeline toolbar · 2026-11-01

D-0055 refines Phase 2 presentation. Version remains 0.20.0; no later feature phase was started.

| Requirement | Evidence | Result |
| --- | --- | --- |
| One bar including title by default | Browser default toolbar height measured 44 CSS px; Filters and View regions hidden. Native Obsidian light layout visually inspected after plugin-only refresh | Pass |
| Expand search/filters only when requested | Filters opens and focuses search; View closes Filters and exposes calendar/location/event-navigation controls; Escape closes panels | Pass |
| Hidden filters remain understandable | Query atlas + Item yielded 3/12 results; collapsing retained filtering and showed Filters (2), toolbar still 44 px | Pass |
| Pan arrows appear over chart edges on hover, disappear away from chart | Browser computed opacity 0 before hover, 1 on chart, 0 after clicking title; Later pan changed tick labels | Pass |
| Keyboard panning remains available | Enter activated Later years twice; focus stayed on the replacement arrow and arrows remained visible through keyboard focus | Pass |
| Build/regressions | 157 model/pure + 82 host = 239 passing tests; typecheck/package/preview build/mobile-load smoke and diff whitespace checks pass | Pass |
| Native development installation preserves notes | Final three package files installed in the disposable test vault with backup; all 49 existing Markdown hashes checked unchanged | Pass |

Native testing refreshed only the community plugin, preserving open notes. The active disposable-vault World Timeline shows the compact default layout. Browser checks use production DOM/CSS with fictional fixtures; no physical mobile or narrow-pane native device claim is made. Narrow-pane zoom relocation uses container queries; the timeline remains desktop-first.

Search/filter values, calendar/lane preferences, dates, predecessor links and later-phase scope are unchanged. The open panel is transient and is not saved as a new preference. The empty event-detail footer remains as before; hiding it until selection is an additional suggestion, not part of this change.

This report supersedes the initial Phase 2 toolbar appearance. Historical Phase 2 package hashes remain in their earlier report; the compact revision has a separate package record.
