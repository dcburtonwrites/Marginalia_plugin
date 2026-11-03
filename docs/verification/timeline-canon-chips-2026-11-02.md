# Multiple Canon filter chips

2026-11-02 · D-0066 · package 0.20.0

| Requirement | Evidence | Result |
| --- | --- | --- |
| Multiple selections with independent removal | Browser selects Mira and Orin (11/12 events), then removes Mira while retaining Orin (7/12). Native selects Mira and Echo (7/9), then removes Echo while retaining Mira (5/9). | Pass |
| Match selected identities without duplicates | Model test checks any-selected matching, removal, shared events appearing once and remaining tag constraints. Existing duplicate-name identity test still passes. | Pass |
| Find additional entries | After each selection the combobox clears and retains focus. Selected paths are excluded from suggestions. Typing with chips does not replace or temporarily narrow their matching events. | Pass |
| Native state compatibility | Model test migrates the prior single entry/query into a chip, deduplicates valid paths, ignores malformed items and round-trips multiple selections. | Pass |
| Regression/package | 219 pure/model + 91 host tests = 310 passing. Typecheck, package, preview build, mobile-load and whitespace checks pass. Both test-vault installations updated; final build reactivated natively. | Pass |
| Preserve originals | All 5 pilot and 53 earlier test-vault originals retain baseline hashes. No model calls or note edits. | Pass |

Chips match any selected entry. Other type/tag/project filters still apply. Input text searches the next suggestion while chips exist; removing all chips restores free-text event filtering. Clear filters resets the entire selection and all other filters. Path tooltips and accessible remove labels disambiguate equal display names.

[Chip screenshot](timeline-canon-chips-2026-11-02.png) · [Package hashes and preserved-note proof](timeline-canon-chips-package.json).
