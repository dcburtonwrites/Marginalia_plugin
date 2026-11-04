# Request email and private Google Sheets log

The website keeps FormSubmit email delivery and supplies a Google Apps Script `_webhook` endpoint. Visitors submit once; the receiver appends to the owner's private sheet. No Sheets credentials or spreadsheet contents are exposed through the website.

## Created resources

- Sheet: https://docs.google.com/spreadsheets/d/1PY8nP-L0-NNngX4cveEofKSk3fuOSAuXFLbaTblin_w/edit
- Script: https://script.google.com/u/1/home/projects/1HltWFMl-3kbd7jJdY0s2MWxvmbHu_S1PjhuGRZqRnUoYs45ZkFp0Rb4r/edit
- Account: deondoesmore@gmail.com. Sheet access stays private; the script writes only the configured sheet.

## Setup status

Sheet headers and script source are saved. Google authorization, initialization and the owner-approved public web-app deployment are complete. The public health endpoint responds with ready. A direct receiver test added one labeled row; its same-ID retry returned duplicate and did not append another row. The site is published at https://karma-voyage-a7mb.here.now/. FormSubmit denied automated access with Cloudflare 403 / browser_signature_banned; no activation email was found. Activation and end-to-end email/webhook verification remain pending with the owner in a regular browser.

## Setup reference (steps 1–3 complete)

1. In Apps Script, run `initializeRequestLog` once and approve the requested Sheets permissions in the owner's account. This formats the Requests tab, freezes headers, sets column widths and status choices. It does not delete request rows.
2. Create a Web app deployment running as the owner, accessible to anyone so FormSubmit's server can POST without a Google login. Review that deployment before making it active. `doGet` only returns readiness; it cannot read requests. Keep the Google Sheet itself private.
3. Put the resulting `/exec` URL in `website/dist/config.js` as `requestWebhook`.
4. Activate FormSubmit by confirming the email sent to the existing recipient if it has not already been activated. The browser posts to FormSubmit, which emails the recipient and calls the webhook. Do not replace this with a direct browser-to-Sheets API call.
5. Send an authorized, clearly labeled test from the published site. Confirm one email and one sheet row with matching Request ID, then retry the same ID against the receiver to verify it does not add a second row. Retain the labeled test as verification unless the owner asks to remove it.

## Row fields

Submitted (date/time, America/New_York), Name, Email, Request type, Message, Status (New), Your notes (blank), Request ID. Status choices: New, Reviewing, Planned, Done, Declined.

The website retains one random request ID across retries and creates a new ID after success. The receiver serializes writes with a script lock and checks the ID column before appending. Visitor text that could become a spreadsheet formula is stored as text. Malformed, missing-consent, oversized and honeypot payloads are rejected/ignored. The receiver does not log visitor content or expose row reads.

The public receiver is limited by Apps Script/Sheets quotas. A webhook cannot guarantee delivery through provider outages; inspect Google execution failures and reconcile against FormSubmit's submissions archive if needed. No guarantee beyond observed end-to-end testing is implied.

## Local checks

`node website/integrations/google-sheets/test-receiver.mjs` uses simulated services only. `npm run website:check` verifies the website provider payload includes the webhook and request ID. Localhost/file previews still never send requests.

Receiver: https://script.google.com/macros/s/AKfycbz-8MZL8YNkoq0BKT1yvVXpPvUaan-R_88tGQWEdqCYxYpZ8RDlxi9UEzDFA9ueMp-w/exec

The standard POST exposed FormSubmit’s missing-page-address error. The form now supplies `_url` from its actual origin and pathname, as documented at https://formsubmit.co/help, without query strings or fragments. Script/config references carry a revision query to prevent stale browser code after deployment.

Current acceptance: the corrected standard POST reaches FormSubmit’s success page, but no delivery email, activation email or provider webhook execution has been observed. The Sheet contains only the labeled direct-test row. The owner’s refreshed regular-browser test remains pending; do not treat provider confirmation alone as end-to-end acceptance.

Activation update: the owner confirmed successful form activation and supplied FormSubmit’s public alias. The site now posts to `https://formsubmit.co/9eeaaf0d470462936e90ceea915e72b6`, replacing the recipient email in public configuration. The alias update is published (sixth site version). A labeled post-activation test reached the enabled reCAPTCHA check and awaits owner completion before delivery verification. CAPTCHA was not disabled.

Latest acceptance: email delivery is verified for the alias test and the owner’s Setup test. FormSubmit reached Apps Script but version 1 rejected its payload before appending. Version 2 now handles form-encoded envelope fields/nested JSON and logs only fixed validation labels/content type on rejection. Field limits, consent, UUID validation, formula-safe writes and deduplication remain enforced. The fresh `receiver-format-check` test awaits the owner’s CAPTCHA; matching Sheet row remains pending.

## Deployment acceptance · 2026-11-02
Website is live at https://karma-voyage-a7mb.here.now/. FormSubmit activation and public alias are configured. Receiver version 2 is active at the existing URL with existing permissions. After owner CAPTCHA completion, `receiver-format-check` delivered an email and exactly one matching Sheet row with Request ID `8bad050f-8b10-49ff-b349-2fea5e83dbb4`. Both destinations were verified independently. The earlier direct setup row remains labeled as a test. Earlier pending statements above are historical and superseded by this acceptance. Plugin/demo downloads match the current prepared 0.5.0 build. No GitHub release or Community submission was performed.
