# Marginalia website

A buildless three-page static site, published to the owner’s signed-in here.now account at https://karma-voyage-a7mb.here.now/. The prepared website ZIP was uploaded and extracted by the dashboard; directory upload through Browse failed. The existing unrelated site was preserved.

- `dist/index.html`: feature showcase, switchable product previews and app logo.
- `dist/guide.html`: setup, entry organization, timeline properties/Threads, script tools, Librarian, storage and device limits.
- `dist/install.html`: direct ZIP download and GitHub release installation instructions, PayPal donation button and FormSubmit request form.
- `dist/config.js`: release version, exact owner-supplied PayPal link and form endpoint. No secret keys.

## Preview and check

Serve `dist` with any static HTTP server, for example `python3 -m http.server 8795 --bind 127.0.0.1 --directory website/dist` from the repository root, then open http://127.0.0.1:8795. Run `npm run website:check` after `npm run release:prepare` to verify local assets, page anchors and the downloadable release.

All localhost/file previews validate form inputs but prevent request transmission. The form also requires consent, includes a honeypot, disables duplicate submissions while navigating and preserves input if navigation fails. A labeled live setup request was attempted; FormSubmit denied automated access. No payment was submitted. Email and webhook delivery remain unverified.

## Release and future updates

1. Review the three pages and product screenshots. Screenshots show fictional test vaults; asset provenance is in ASSETS.md. No creative vault content, plugin settings, private notes or local models are included.
2. Complete release review and make the intended GitHub repository/release public. The website's GitHub footer is the repository URL, not proof it has been published.
3. Activate FormSubmit for **deondoesmore@gmail.com**. The first intentional form submission from an HTTP(S) site triggers an activation email. Confirm it in that inbox, then send one approved test and verify delivery/reply-to before making the contact form public. Provider docs: https://formsubmit.co/documentation. The automated live attempt failed and no activation email was found. A provider diagnostic returned Cloudflare 403 / browser_signature_banned. The owner must try activation in a regular browser; do not claim email or forwarded Sheet delivery until verified.
4. Publish the GitHub release with all three raw plugin assets so the GitHub instructions have a public destination. Installation uses the direct website ZIP or GitHub releases; no Community directory listing is required. The PayPal button points to the exact provided hosted donation URL.
5. Run `npm run release:prepare` and `npm run website:check`. The deployable archive is `dist/marginalia-website-0.5.0.zip`, with index.html at its root. Upload its contents or that archive through here.now's static-file publishing flow when you choose to launch. Use relative file routes; no server or frontend framework is required.
6. After uploading, test all three routes, download, PayPal destination and an owner-approved live request. The website form uses standard FormSubmit POST navigation for provider verification, with a Google Apps Script webhook for the private request log; the plugin itself does not use FormSubmit, Google Sheets or PayPal networking.

The static site uses system fonts and local images. No analytics, tracking scripts, accounts or embedded payment widgets are included. FormSubmit receives a request only when a visitor submits. The consent text discloses that external handling; FormSubmit documents retention and processing in its privacy policy. Donation handling occurs on PayPal.

## Design

Navy binding (#0b1728), ivory type (#f6f3eb), book gold (#e9b86b), blue-grey annotations (#afbdcc), and panel blue (#132237) echo the original logo. Palatino headings and Avenir/system UI text suggest a writing desk without imitating the Obsidian editor. Product screenshots form the main demonstration. The responsive layout keeps the app logo in navigation, reduces visual weight on phones, and uses visible keyboard focus and no automatic animation.

## Downloadable Greek Demo
The Install page includes a separate **Download Greek Demo** action. Its ZIP contains a complete isolated vault, Marginalia 0.5.0 and fresh settings, with five feature walkthroughs pinned on Home. The home showcase and guide link to this section. `release:prepare` builds and validates the demo before creating the hosting archive. See [demo source/readme](../demo/greek/README.md). Users still review Obsidian's first-open trust prompt and enable the plugin; local models remain a separate optional installation.

## Google Sheets request log — receiver ready; provider activation pending
Google authorization, initialization and the approved public receiver deployment are complete. The real webhook URL is configured. A direct receiver test added one labeled row; repeating its ID returned duplicate without adding a row. Live Home, Guide and Install routes work, and both downloaded ZIPs match the local prepared files byte for byte. FormSubmit activation and the full email-to-Sheet flow need the owner’s regular-browser test. See [receiver setup](integrations/google-sheets/README.md) and [launch verification](../docs/verification/request-log-launch-2026-11-02.md).

Form delivery correction: background AJAX submissions failed in both agent and owner browsers. The site now navigates through FormSubmit’s standard POST verification flow, preserving preview/consent/honeypot guards and request IDs. It does not claim delivery before the provider confirms. Browser-back navigation restores the send button. Keep CAPTCHA verification enabled. End-to-end acceptance remains pending.

The standard POST exposed FormSubmit’s missing-page-address error. The form now supplies `_url` from its actual origin and pathname, as documented at https://formsubmit.co/help, without query strings or fragments. Script/config references carry a revision query to prevent stale browser code after deployment.

Latest test: standard POST plus explicit page address now reaches the provider’s success page. Successful email and forwarded-row delivery are still pending verification; the owner has been asked to repeat the test after refreshing the corrected live page.

Activation update: owner confirmed activation; the provided public FormSubmit alias is configured and published. Email is no longer present in the public submission endpoint. The post-activation test awaits the owner’s FormSubmit spam check, then email and matching Sheet-row verification.

Email delivery is now verified after the owner completed CAPTCHA. Google forwarding reached the receiver but its first parser rejected the payload; receiver version 2 and a fresh test are in progress. Do not claim Sheet delivery is complete until the matching row is observed.

## Deployment acceptance · 2026-11-02
Website is live at https://karma-voyage-a7mb.here.now/. FormSubmit activation and public alias are configured. Receiver version 2 is active at the existing URL with existing permissions. After owner CAPTCHA completion, `receiver-format-check` delivered an email and exactly one matching Sheet row with Request ID `8bad050f-8b10-49ff-b349-2fea5e83dbb4`. Both destinations were verified independently. The earlier direct setup row remains labeled as a test. Earlier pending statements above are historical and superseded by this acceptance. Plugin/demo downloads match the current prepared 0.5.0 build. No GitHub release or Community submission was performed.
