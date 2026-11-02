# Timeline viewport and styled groups verification

2026-11-02 · D-0063 · package 0.20.0

| Requirement | Evidence | Result |
| --- | --- | --- |
| Timeline stays inside its view | Browser at 1280×720 and 620×540: root scroll width/height match client size; chart scroll width equals its viewport width. Native Obsidian split pane visibly contains event cards. Date plots clip cards during deliberate panning. | Pass |
| Fit includes full cards | Model test at plot widths 240, 600 and 1100 checks both extreme cards fit. Browser DOM rectangles confirm all fitted cards inside chart; native last-date cards fully visible. | Pass |
| Create groups with choices before assigning locations | Production modal browser flow creates Coastal records, chooses Cyan, assigns Salt Harbor, saves and reloads. Native existing Coast group edited to Blue and saved across both member lanes. | Pass |
| Callout colors or banding | Closed style palette of banded, blue, cyan, green, yellow, orange, red, purple, pink and gray. Native themed color fill and accent observed; unknown stored styles normalize to banded. | Pass |
| Keep existing groups and allow empty groups | Normalization/round-trip tests retain legacy lane groups and named empty groups. Membership menus use group definitions. | Pass |
| Horizontal scrolling navigates time | Browser horizontal wheel/trackpad-style scroll changes axis labels from 0–30 to 30–60; Fit restores the full event view. Vertical lane scrolling remains available. | Pass |
| Arrows centered on visible timeline | Browser measured both arrow centers against chart frame center: zero-pixel difference at wide and narrow sizes; native screenshot confirms equal-height edge arrows in the bounded pane. | Pass |
| Preserve notes | Five pilot plus 53 prior test-vault originals retain exact baseline hashes. Only plugin settings changed during native group acceptance. | Pass |
| Regression/package | 213 pure/model tests plus 91 host tests = 304 passing; typecheck, package, preview build, mobile-load check and whitespace verification pass. | Pass |

Native acceptance used Obsidian 1.14.5 in Marginalia Test Vault with the existing theme and split-pane layout. Final package staged to both isolated test vaults; the active test vault reactivated through the plugin toggle. No model generation or original note edits were needed.

The horizontal gesture was verified through browser automation against the production UI, rather than a physical trackpad. The native automation scroll command did not visibly pan the chart, so it is not counted as native gesture proof. The pane/fit, group-color save and arrow-button interactions were verified natively. During explicit panning an event card at the viewport edge may be clipped; Fit events reserves space for the complete cards. Narrow plots still use an internal minimum plotting width and chart-owned overflow. Color choices follow the theme's callout palette tokens; banding and named group headers provide a color-independent option.

[Package hashes and preserved-note proof](timeline-groups-package.json) · [Browser banding image](timeline-groups-2026-11-02.png).
