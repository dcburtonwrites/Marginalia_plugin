# Preparing and submitting Marginalia 0.5.0

Local release preparation only. No tag, commit, push, GitHub release, directory submission or website deployment is performed by the build scripts.

## Reproduce the package

Use Node 22.18+ and Python 3 for the local release helper:

```sh
npm ci
npm test
npm run release:prepare
node scripts/verify-mobile-load.mjs
npm run website:check
```

`dist/release-0.5.0/` contains the raw `main.js`, `manifest.json`, `styles.css`, manual-install ZIP, release notes and SHA256SUMS.txt. `dist/marginalia-website-0.5.0.zip` contains the three-page static website, with index.html at its root. The ZIP is a convenience download; Obsidian requires the three raw plugin files attached individually to the GitHub release.

## Before public submission

- Review and commit the full intended source tree on the default branch of `dcburtonwrites/Marginalia_plugin`. Root README.md, LICENSE, manifest.json and versions.json are prepared. Confirm that the repository is public; local remote configuration alone does not establish public accessibility.
- Test the declared minimum Obsidian 1.8.7, or deliberately raise manifest.minAppVersion and versions.json to the oldest version actually verified. Optional Bases API use is guarded and reports 1.10+ when unavailable.
- Review current Obsidian plugin policies and automated scanner findings. Source patterns to expect review on include guarded desktop Node/Electron APIs, plugin-scoped theme styling, DOM generation, source property changes and hidden adapter storage. A successful local test run does not imply directory approval.
- Mobile loading has no top-level Node dependency. Obsidian's general submission requirements describe Node/Electron as desktop-only; its more specific mobile checklist permits dynamically required, platform-gated features. Preserve the existing guarded mobile support and provide the mobile-load evidence to reviewers rather than silently changing the supported devices. See [mobile checklist](https://docs.obsidian.md/oo/plugin) and [submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins).
- Physical Android, remaining iOS keyboard/IME behavior, Windows/Linux PDF output and hidden-file synchronization remain acceptance limits. Keep those limits in the release notes and do not advertise full platform parity.
- Recheck plugin ID/name availability in the current Community directory at submission time. A similarly named `Marginalia MD` exists; this is a different annotation plugin. Do not submit to or claim another developer's repository.

## Submit through the current Community directory

1. Create a public GitHub release from the reviewed source with tag **`0.5.0`**, exactly matching manifest.version, **without a `v` prefix**. Use RELEASE-NOTES.md as the description. Attach `main.js`, `manifest.json` and `styles.css` from dist/release-0.5.0 individually. The ZIP and checksums can be additional attachments.
2. Sign in at [community.obsidian.md](https://community.obsidian.md) with your Obsidian account and connect the GitHub account that owns the repository.
3. Add the plugin using `dcburtonwrites/Marginalia_plugin`. The portal reads manifest.json from the default branch HEAD; a local working copy is insufficient.
4. Address the automated review results. Corrections need an incremented version and matching new release. Marginalia becomes installable through Community plugins only when review errors are resolved and the listing is published.
5. After approval, set `communityListed: true` in website/dist/config.js, repackage the website and update the README's pending status. Do not enable the Obsidian install link prematurely.

Official guidance checked November 2, 2026: [Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin), [Set up and claim](https://docs.obsidian.md/community-directory/set-up-and-claim), [requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins). The current route is the Community portal, replacing older community-plugins.json pull-request tutorials. No directory submission has been made.

## Website launch

See [website/README.md](website/README.md). The website is prepared for static hosting on here.now; it has not been published. PayPal is the owner's supplied hosted donation link. The FormSubmit email recipient still needs activation before delivery can be relied on. No activation or test message was sent during preparation.
