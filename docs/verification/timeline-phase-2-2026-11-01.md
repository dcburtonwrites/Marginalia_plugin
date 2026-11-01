# Timelines Phase 2 verification · 2026-11-01

Version: 0.20.0. Completed feature target remains 0.30.0. Owner continued after Phase 1 (D-0054). Phase 2 implements the World Timeline; state derivation, per-entry/header access and snapshots remain separate reviewed phases.

## Requirement evidence

| Requirement / rule | Evidence | Result |
| --- | --- | --- |
| Open like the graph in a native main-pane tab; reuse existing tab | Native Obsidian 1.14.5 ribbon, command and settings access; host open/reuse test | Pass |
| World-only, desktop-first, independent lifecycle | Existing gating/unload host tests; native Storyboard settings showed unavailable, World enabled successfully; Node-unavailable mobile load verifies saved desktop enable preference is retained without TimelineFeature startup | Pass |
| Ordinary Calendar notes and parallel display | Native existing Calendar/Mortal Count reused; Arrival Highsun 412 AS displayed as 73 in Mortal Count; saved display preference retained across view reopening and safe plugin refresh | Pass |
| User-selected location lanes, groups and order | Pure lane preference/layout test; browser grouped Lowlands/Highlands and hid Glass Uplands; native grouped Archive/Harbor as Coast and hid Multiple locations, retained after reopening | Pass |
| Location identity is separate from presence; unknown/multiple locations remain explicit | World model tests for nested participant links, reserved fields, unresolved links, invalid location type and multiple locations; browser separate lanes and details | Pass |
| Point periods retain precision and overlap; spans use actual endpoints | Mixed-precision range/packing tests; native Founding span and Arrival month date; native span bar visually inspected | Pass |
| Zoom, earlier/later and Fit change the time window without source mutation | Bounded layout tests; browser axis ticks 0/20 MC → Zoom in 10/20 MC → Earlier -10/0 MC → Fit 0/20 MC; native view uses the same component | Pass |
| Search/type/tag/shared-project filtering | Combined pure filter test; browser Item + atlas + Glass Meridian yielded 1 of 12 events; native Atlas query yielded 1 of 6 events | Pass |
| Selected event details, participant/location navigation and related writing | Browser Arrival details and two references; final native Arrival details showed Plot Point and Script; guarded navigation host test blocks missing-note creation | Pass |
| Frontmatter only; legacy Script Studio paths qualify | Participant/reserved-field test and legacy-script-path test use pure scriptScope; native Script/Plot Point fixtures link Arrival | Pass |
| Read-only undated chains, bounded relational placement and unanchored sequence | Tests for bounded, unbounded/single-anchor, reversed, branching, dangling and cyclic chains; native Undated remains labeled Undated between Arrival and Harbor closes | Pass |
| Dated predecessor links never establish date order or write notes | Dated-link test checks positions and unchanged source metadata; native original-note hashes | Pass |
| Blank root predecessor lists and duplicate identical links are valid; wrong scalars warn | Dedicated predecessor-shape regression test | Pass |
| Invalid dates remain inspectable | Native Invalid span card in Undated, native issue disclosure shows Start later than End; no effective date is guessed | Pass |
| Long/dense timelines render within a bounded DOM | Pure heap packing test with 10,000 simultaneous events; browser 5,012-event timeline had 13 cards/1 lane at the top, and 10 cards/5 lanes after End scrolling to about 380,415 px of 380,864 px. Windowed mounting replaces offscreen rows/cards | Pass at synthetic boundary |
| Calendar/lane preferences follow renames and share existing storage | Host rename/persistence test; native data.json inspected after saved calendar/group/visibility changes | Pass |
| Invalid primary/display anchors cannot become display fallbacks | Pure regression uses a broken primary plus a valid independent calendar; only resolved calendar selected | Pass |
| Canonical Calendar paths remain identities despite alias collisions | Phase 1 resolver regression test, with all earlier calendar/date tests rerun | Pass |
| Production build and regressions | npm test: 157 model/pure tests + 82 host tests = 239, zero failures; npm run package, preview build, mobile-load smoke and git diff --check | Pass |
| Original notes preserved in real host | SHA-256 comparison of all 34 pre-existing disposable-vault Markdown notes: zero changes; only isolated Timeline Demo fixtures added/explicitly edited for tests | Pass |

## Native acceptance and package

The package was installed only in `.preview/Marginalia Test Vault`, with previous plugin files/settings retained in `.preview/timeline-phase2-baseline`. No creative vault or standalone app was changed.

Native steps: safely disable/enable only the community plugin; switch the disposable vault from Storyboard to World; enable Timelines; open through settings; select Arrival; switch display calendar; group/hide lanes; close/reopen using the command; search for Atlas; observe an external fixture date change from 73 to 74 in the display calendar; restore its original date; verify related writing; activate the final package with the plugin toggle; open with the ribbon; expand the intentional date issue. Calendar/lane preferences survived refreshes. Source dates and predecessor fields are never written by timeline viewing.

[Package hashes and original-note result](timeline-phase-2-package.json) record the final installed three files. The native plugin list retained its cached old version label during plugin-only refresh; packaged and installed manifest bytes are verified as 0.20.0. Full application reload was not performed: automatic approval rejected “Reload app without saving” for its unsaved-state risk, and native testing proceeded successfully through the safer plugin-only toggle instead.

## Design and implementation

The mockup supplies compact bordered event cards, quiet alternating location rows, a serif title, copper selection and a bottom detail region. Existing Obsidian colors provide light/dark adaptation; native light and synthetic dark layouts were visually inspected. No external font request or runtime UI/chart dependency was added.

The DOM view is shared with `.preview/world-timeline.html`; the native wrapper provides the ItemView, Modal, commands and vault navigation. Lane configuration drafts remain local until Save. Chart layout uses a bounded time window rather than a huge horizontal canvas; heap packing prevents same-date collisions. Vertical card/row mounting, batched Undated cards and lazy issue details bound the rendered DOM. A selected offscreen card may remain mounted for navigation.

Existing settings storage holds display calendar and lane groups/order/visibility. Per-leaf native view state carries filters, selection and viewport. Missing notes are not created during navigation. New location lanes default to visible. Unanchored/invalid-date cards remain accessible in the separate Undated lane regardless of location-lane choices. Participant effect badges report authored fields, not derived snapshot state.

## Limits / next gate

- The dense-data observation is synthetic browser evidence, not a native large-vault performance benchmark. No physical mobile or Windows/Linux acceptance was performed.
- Full app-restart workspace restoration was not exercised; safe plugin refresh, normal tab reopening and persisted preferences were exercised. The mobile smoke check covers unavailable restored views without starting the feature.
- State precedence, location histories, entry header actions, per-entry timelines, snapshot controls, structured date/calendar editing and optional Librarian continuity checks are not implemented by Phase 2.
- Existing unrelated device/Librarian acceptance gates remain open. No new dependency, service, network request or canonical note writer was introduced.

Phase 2 is ready for owner review before Phase 3 begins.
