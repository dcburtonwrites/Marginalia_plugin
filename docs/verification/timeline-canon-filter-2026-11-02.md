# Timeline Canon suggestions

2026-11-02 · D-0065 · package 0.20.0

| Requirement | Evidence | Result |
| --- | --- | --- |
| Show Canon matches while typing | Browser `mir` shows Mira and Mira born, with type and path. Native `Mira` shows Timeline Demo/Mira.md and 02 Character/Mira Vale.md. | Pass |
| Pick by click or keyboard | Browser click and ArrowDown/Enter both fill the name, select its identity and close the list. Native ArrowDown/Return selects Mira and retains 5/9 relevant events. | Pass |
| Distinguish duplicate names | Model test supplies separate A/Mira.md and B/Mira.md; exact selection returns only the chosen entry's event. Name/type/path render together. | Pass |
| Original Canon scope | Model test excludes Brainstorms, hidden, template, generated and Calendar inputs while keeping configured Character/System originals. No body reads or AI calls. | Pass |
| Preserve normal search | Unselected input uses existing name substring filter; any new input clears the prior selected path. Clear filters resets all filter fields. Blank input has no suggestions; unmatched input has a clear no-match message. | Pass |
| Regression/package | 217 pure/model plus 91 host tests = 308 passing. Typecheck, package, preview, mobile-load and whitespace checks pass. Final native package reactivated. All 58 original fixture notes retain baseline hashes. | Pass |

Suggestions are limited to 12 visible matches; additional typing narrows them. Entries with no matching events may still appear because suggestions represent Canon, not just the current event set. Existing type/tag/project filters remain active when choosing an entry.

Visual verification caught a stylesheet overwrite during implementation. The stylesheet was restored byte-for-byte from the previously verified installed package before adding the dropdown rules, rebuilding, rechecking in the browser and activating the native package. The final screenshot shows the restored Timeline styling with the dropdown overlay.

[Dropdown screenshot](timeline-canon-filter-2026-11-02.png) · [Package hashes and preservation proof](timeline-canon-filter-package.json).
