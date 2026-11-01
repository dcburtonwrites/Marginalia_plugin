# Storyboard register and View menu · 2026-11-01

| Requirement | Evidence | Result |
| --- | --- | --- |
| Show content heading inside hover box | Desktop/mobile browser bounds assertion; native Obsidian screenshot observation | Pass |
| Storyboard menu order and divider | Browser reconciles an existing World mount into Home/Register/Projects, one separator, shared folders; native file tree remains | Pass |
| Remove World-only pages | Browser asserts no Canon/Brainstorms/Script Studio menu item; native Storyboards vault switched from its observed World setting to Storyboard, removing Canon/Brainstorms | Pass |
| App-style register | Inspected app `ui/ProjectRegister.tsx` and `domain/project-register.ts` read-only; browser/native summary counts, four dropdown filters and four metadata columns | Pass |
| Optional Base assignment | Browser/native chooser, existing local file validation, missing-file warning and clearing assignment; settings persist locally | Pass |
| Base selects records without native Base-tab navigation | Native app page remained Project Register; editing the fictional Base’s filter changed counts 2 → 1 → 0, then restored 1 | Pass |
| Preserve original Base | In-memory first-view copy retains filters/formulas/sort; host test leaves original config unchanged; native source still contains its original `type: table`, no generated view identifier | Pass |
| Source integrity | SHA-256 comparison of all 34 original test Markdown notes, final ZIP/distribution/test installation; separate integrity JSON | Pass |
| Validation | 202 automated tests (127 pure/core, 75 host), package/typecheck, content-control/register/workspace browser suites | Pass |

The final package was installed and disabled/re-enabled only in Marginalia Test Vault. Its fictional `Compile Display Checks.base` and temporary Storyboard/Base preferences remain available for inspecting the finished register. Existing Markdown content was not edited. The creative Storyboards vault received only the authorized World → Storyboard preference change; its plugin installation and notes were not changed. App source was inspected, not modified.

Base-backed mode uses the public Obsidian 1.10+ custom Bases view API and native embedded-query renderer. The first saved view supplies membership/order, intersected with discovered project Overviews. Fixed register metadata comes from those Overviews; arbitrary Base column layouts/formula columns are not reproduced. Without an assigned Base the register shows all discovered projects. Unavailable Base files, older hosts, disabled Bases or failed loading disclose an actionable warning; a zero-result Base stays empty. Physical mobile Base-engine behavior and broader third-party themes remain manual acceptance items.

Official API reference: [Build a Bases view](https://docs.obsidian.md/plugins/guides/bases-view). Native query format: [Bases syntax](https://obsidian.md/help/bases/syntax).

Browser evidence: [desktop](../../design/verification/storyboard-register-desktop-2026-11-01.png), [mobile](../../design/verification/storyboard-register-mobile-2026-11-01.png), and [populated register](../../design/verification/app-storyboard-register.png).
