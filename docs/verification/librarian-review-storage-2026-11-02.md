# Vault Review hidden storage · 2026-11-02

D-0062 supersedes the report storage choices in the original review acceptance. Version remains 0.20.0.

| Rule | Evidence | Result |
| --- | --- | --- |
| Reports save only in .marginalia/reviews | Model path generation ignores visible/unsafe folder overrides; controller test explicitly supplies Brainstorms/Reviews and verifies hidden write | Pass |
| No report destination settings or per-run choices | Settings retain only Development destination controls; production browser renderer shows fixed hidden-storage explanation and Begin Vault Review | Pass |
| Library opens hidden reports | Browser synthetic review saved to .marginalia/reviews, appeared in Library, and reopened in the Review reader; controller resume test | Pass |
| Existing Development behavior unchanged | Existing defaults and multiple visible/hidden conversation tests pass | Pass |
| Legacy reports remain safe | Controller test reads visible report, changes a checkbox, verifies hidden copy/index/resumption and exact unchanged legacy bytes | Pass |
| Regression and package checks | 211 pure/model + 91 host tests = 302 passing; typecheck, package, preview build, mobile-load verification and diff whitespace checks | Pass |

Browser checks use the same UI/controller with an explicitly simulated model and in-memory storage. No new native local-model run is needed for this storage/UI correction; previous native workflow evidence remains in the original report. Existing visible reports are preserved as historical files; their subsequent plugin saves go to hidden storage. Old reportFolder preferences are discarded when settings load. Development settings remain supported.

[Package hashes](librarian-review-storage-package.json) · [Browser verification image](librarian-review-hidden-storage.png). Final package staged to both isolated test vaults.
