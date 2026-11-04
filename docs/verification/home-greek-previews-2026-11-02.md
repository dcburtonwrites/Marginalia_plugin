# Compact Home and Greek Demo website previews — November 2, 2026

D-0074 implements the owner’s Home-first revision, website screenshot replacement and newest-build download requirement. Follow-up correction removes the recents cards' inherited minimum height rather than only clamping their text.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Swap Home sections | Shared native Home places Recently Opened beside Continue Writing, Pinned References/Projects below in a grid | Pass |
| At most three recents | Rendering selects three available recent entries (or latest-modified fallback); full saved recent history remains intact. Native three-card seeded layout verified | Pass |
| Two-line previews and compact height | Scoped preview clamp and max-height; scoped min-height:0 and 12px/14px padding override the 150px card minimum. Native screenshot confirms cards visibly shrink around content | Pass |
| Continue Writing sizing | Desk align-items:start prevents the Continue panel stretching to the adjacent column | Pass |
| Pins and sources | All five walkthrough pins retained; no original note content changes. Pins use existing Edit/Unpin behavior | Preserved |
| Greek website images | Four unaltered native captures from the updated demo: Home, comic page/panel outline, Hermes chip Threads and Seasonal Compact/Librarian Review | Pass |
| Matching screenshots | Source demo Markdown hashes verified before capture; screenshots come from a disposable QA copy of the downloadable world. No fabricated AI output | Pass |
| Website presentation | All four tabs resolve to Greek captures, story sections use the same screenshots, original synthetic captures/diagram removed. Images preserve native aspect. Desktop/390px show no horizontal overflow | Pass |
| Newest install download | Final ZIP check byte-compares main.js, manifest.json and styles.css against the build in the plugin ZIP and demo ZIP; the website archive contains those exact downloads and current assets | Pass |
| Regression | 226 pure/model + 92 host tests pass, typecheck/build/package, mobile Node-free load and Greek production-model fixture verification pass | Pass |
| Website/forms | 62 local assets/routes/anchors and 13 simulated form cases pass; no real form or generation | Pass |

The shared card minimum initially left recents too tall despite two preview lines. The owner caught this during the same task; the final scoped override removes that minimum and tightens padding. The final screenshot and downloads include this correction. Other entry-card styles retain their defaults.

[Final Home screenshot](greek-home-compact-2026-11-02.png), [website previews](greek-website-previews-2026-11-02.png). Website asset provenance is in website/ASSETS.md. All artifacts remain v0.5.0 and unpublished. Only the disposable Greek Demo QA installation was refreshed; creative vaults were not updated.
