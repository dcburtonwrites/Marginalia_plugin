# Version 0.5.0 release preparation — November 2, 2026

The owner accepted Threads and requested v0.5, release preparation and a three-page website for eventual here.now hosting, explicitly without publishing. Owner selected MIT, supplied the exact PayPal hosted donation URL, and selected FormSubmit for requests to deondoesmore@gmail.com (D-0069).

| Requirement / boundary | Evidence | Result |
| --- | --- | --- |
| Version and release files | manifest, package and lock all 0.5.0; versions.json maps to declared 1.8.7; MIT LICENSE; fundingUrl is exact owner link | Pass |
| Production bundle | Minified CommonJS build with names preserved; typecheck; 395.3 KB bundle | Pass |
| Plugin regression suite | 226 pure/transport/model tests plus 92 host tests, zero failures | Pass |
| Mobile Node boundary | scripts/verify-mobile-load.mjs starts release bundle without Node imports; AI/Timelines remain inactive on mobile | Pass |
| Installable assets | prepare-release.py byte-compares raw/root/package files; asserts exactly three ZIP entries under marginalia; creates SHA256SUMS | Pass |
| Feature showcase | index.html; four preview tabs verified by click and ArrowRight; original app logo; fictional product screens and cross-lane illustration | Pass |
| Setup/use page | guide.html; setup, entry categories, timeline event example, Threads/icons, script shortcuts, Ollama, storage and platform limits; anchor navigation | Pass |
| Install and donation | install.html; honest pending listing, three-step future Community flow, manual ZIP; PayPal href equals supplied destination | Pass |
| Request handling | Native invalid inputs blocked; completed local form reports no request sent; 13 simulated-provider cases exercise localhost/file/disabled/invalid/spam/success/network/HTTP/malformed/rejected responses, preserving inputs on failure | Pass; actual delivery untested |
| Responsive layout | IAB 1280×720 desktop, 390×844 and 320×740 phone; no horizontal document overflow; guide and install form fit on phone; 320px navigation wraps intentionally | Pass |
| Browser assets/errors | All six home images loaded; no warning/error logs; website checker passes 57 local routes/assets/anchors | Pass |
| Static hosting artifact | ZIP contains index.html at root, guide/install, local CSS/JS/logo/screens and exact plugin download; no framework/server required | Pass |
| No publication / messages | No commit, push, tag, release, hosting registration, deployment, directory submission, payment, activation email or live form submission | Preserved |

## Release and launch limits

- Declared minimum Obsidian 1.8.7 has not received a dedicated native acceptance run; current native feature evidence used 1.14.5. Validate the minimum or deliberately raise it before submission. Bases is optional and runtime-guarded for 1.10+.
- Local tests do not certify Community scanner approval. The official specific mobile checklist permits gated dynamic Node/Electron features; general submission wording is stricter. Document the existing platform gates and provide mobile evidence to reviewers. Do not silently remove previously authorized mobile support.
- Public source/release accessibility and current plugin-ID availability must be confirmed at submission. A similarly named Marginalia MD exists as a separate annotation plugin. No listing has been claimed.
- Physical Android, remaining iOS keyboard/IME interactions, Windows/Linux PDF output and hidden-file sync still require wider acceptance, as disclosed in README/release notes/guide. No new physical-device acceptance is claimed.
- FormSubmit activation and an owner-approved live delivery/reply-to test are required before launching the form. No provider request was sent. The PayPal link was checked as an exact destination, not by making a payment.
- Structured timeline editing remains deferred. Website services are separate from the plugin's loopback-only Librarian.

## Artifacts

- `dist/release-0.5.0/`: raw files, plugin ZIP, release notes, SHA256SUMS.txt.
- `dist/marginalia-website-0.5.0.zip`: unpublished static site.
- [Desktop website](website-desktop-2026-11-02.png), [full home page](website-full-2026-11-02.png), [phone website](website-mobile-2026-11-02.png).
- [Submission guide](../../RELEASE.md), [site handoff](../../website/README.md).

The local preview server was used only for verification and stopped after review. The static HTML files can be opened directly; localhost/file form previews block sending. The deployable archive remains unpublished.

## Website revision · D-0070
Transparent PNG logo derivative generated with the built-in image editor; original asset preserved. Preview tabs/default screenshot, feature chapters and guide now prioritize Your World, Script Studio, Timeline & Threads, Librarian. Script Studio explicitly describes its current comics/graphic-novel focus. Browser inspection verified the transparent logo, default World preview and updated Script Studio caption. Website route/form checks still pass and the unpublished hosting archive was rebuilt. [Updated desktop preview](website-revised-2026-11-02.png). No plugin runtime changes.

## Direct installation and recipient display · D-0071 / D-0072
Install now leads with the v0.5.0 ZIP, includes folder/reload/enable instructions, and offers GitHub release-asset instructions with update/settings preservation guidance. Removed the Community listing flow, deep link and dormant configuration flag. The request section, consent and errors no longer display the recipient email; delivery remains wired in FormSubmit configuration. Browser verification confirms expanded GitHub instructions, no visible recipient, no Obsidian directory link and no horizontal overflow. Website checks pass 58 local links/assets/anchors and 13 simulated form cases; the unpublished archive is updated. [Install preview](website-direct-install-2026-11-02.png). No external request or publication.
