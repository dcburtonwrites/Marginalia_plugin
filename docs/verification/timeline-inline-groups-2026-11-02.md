# Swim-lane centering and inline groups

2026-11-02 · D-0064 · version 0.20.0

D-0064 corrects the earlier full-frame centering interpretation. The arrows now track the visible location lanes themselves. Undated is outside that scrolling region and aligned to the bottom.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Center on actual swim lanes | Sparse browser window: visible lane midpoint 337px; both arrow centers 337px. Regression tests cover two short lanes in a tall pane, a scrolled tall lane and no visible lane. Native sparse-window screenshot shows arrows within the four location lanes, above the blank space. | Pass |
| Undated at bottom | Browser Undated bottom and body bottom both 720px. Native screenshot places Undated just above the bottom status area, independently of short lanes above. | Pass |
| Inline group editing | Production renderer: clicking a saved group replaces it with a left-hand textbox, ten small swatches including no-color banding, check/cancel and a small Remove group action. Confirming Purple returns the saved colored group button. | Pass |
| Group buttons below description | Browser screenshot shows neutral Highlands and purple Coastal records buttons below the group description/editor. | Pass |
| Replace up/down with drag/drop | Actual browser drag moves Salt Harbor ahead of Eastern Archive and adopts Lowlands membership; saved order/membership survive reload. All rows have drag handles, no up/down buttons. Pure tests preserve unrelated lane data and reject missing/self targets. | Pass |
| Keyboard access | Focused drag handles use Up/Down through the same reorder operation; group swatches expose pressed state and named controls. Group name supports Enter/Escape. | Implemented; drag model tested |
| Regression and source preservation | 215 pure/model + 91 host tests = 306 passing. Package/typecheck, preview build, mobile-load and whitespace checks pass. All 58 original fixture notes match baseline hashes. | Pass |

The final package is staged into both isolated test vaults and was reactivated in native Obsidian 1.14.5. Current open test-vault lane choices were saved before reactivation. No original note edits or model generation were needed.

Undated has bounded independent overflow so long lists cannot consume the entire chart. Arrows are hidden if there is no visible swim-lane intersection. Drag/drop across groups changes membership as stated in the dialog; group and lane changes remain drafts until Save lanes, and Cancel closes without writing those drafts.

[Native sparse-lane/footer screenshot](timeline-lanes-centered-native-2026-11-02.png) · [Inline editor screenshot](timeline-inline-groups-2026-11-02.png) · [Package hashes and preserved-note proof](timeline-inline-groups-package.json).
