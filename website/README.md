# Marginalia website — unpublished draft

A buildless three-page static site, prepared for here.now. No hosting account, deployment or public URL has been created.

- `dist/index.html`: feature showcase, switchable product previews and app logo.
- `dist/guide.html`: setup, entry organization, timeline properties/Threads, script tools, Librarian, storage and device limits.
- `dist/install.html`: honest pending Community listing status, manual plugin download, PayPal donation button and FormSubmit request form.
- `dist/config.js`: release version, Community listing flag, exact owner-supplied PayPal link and form endpoint. No secret keys.

## Preview and check

Serve `dist` with any static HTTP server, for example `python3 -m http.server 8795 --bind 127.0.0.1 --directory website/dist` from the repository root, then open http://127.0.0.1:8795. Run `npm run website:check` after `npm run release:prepare` to verify local assets, page anchors and the downloadable release.

All localhost/file previews validate form inputs but prevent request transmission. The form also requires consent, includes a honeypot, disables duplicate submissions while sending and preserves input after a failed live request. No form or payment was submitted during QA.

## Before publishing to here.now

1. Review the three pages and product screenshots. Screenshots show fictional test vaults; asset provenance is in ASSETS.md. No creative vault content, plugin settings, private notes or local models are included.
2. Complete release review and make the intended GitHub repository/release public. The website's GitHub footer is the repository URL, not proof it has been published.
3. Activate FormSubmit for **deondoesmore@gmail.com**. The first intentional form submission from an HTTP(S) site triggers an activation email. Confirm it in that inbox, then send one approved test and verify delivery/reply-to before making the contact form public. Provider docs: https://formsubmit.co/documentation. No activation has been initiated here.
4. Keep `communityListed: false` until the directory listing is approved. After approval, set it true to expose `obsidian://show-plugin?id=marginalia`. The PayPal button already points to the exact provided hosted donation URL; do not replace it with an inferred email or username.
5. Run `npm run release:prepare` and `npm run website:check`. The deployable archive is `dist/marginalia-website-0.5.0.zip`, with index.html at its root. Upload its contents or that archive through here.now's static-file publishing flow when you choose to launch. Use relative file routes; no server or frontend framework is required.
6. After uploading, test all three routes, download, PayPal destination and an owner-approved live request. The website form uses FormSubmit; the plugin itself does not use FormSubmit or PayPal networking.

The static site uses system fonts and local images. No analytics, tracking scripts, accounts or embedded payment widgets are included. FormSubmit receives a request only when a visitor submits. The consent text discloses that external handling; FormSubmit documents retention and processing in its privacy policy. Donation handling occurs on PayPal.

## Design

Navy binding (#0b1728), ivory type (#f6f3eb), book gold (#e9b86b), blue-grey annotations (#afbdcc), and panel blue (#132237) echo the original logo. Palatino headings and Avenir/system UI text suggest a writing desk without imitating the Obsidian editor. Product screenshots form the main demonstration, with an illustrative cross-lane thread diagram. The responsive layout keeps the app logo in navigation, reduces visual weight on phones, and uses visible keyboard focus and no automatic animation.
