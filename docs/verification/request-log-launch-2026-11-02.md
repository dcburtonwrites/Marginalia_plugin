# Request log and website launch · D-0076 · 2026-11-02

Website: https://karma-voyage-a7mb.here.now/
Private log: https://docs.google.com/spreadsheets/d/1PY8nP-L0-NNngX4cveEofKSk3fuOSAuXFLbaTblin_w/edit

The owner completed Google authorization, approved public Anyone web-app execution, signed into here.now and authorized website publication before or after integration. Apps Script Manage deployments confirms version 1 active, executing as the owner, with Anyone access. Sheet sharing remains private.

Public receiver health returned ready. A labeled direct POST returned success; repeating request ID `setup-receiver-d57f0f2e-c7fc-4ae4-8680-19e63d58ee28` returned success/duplicate. Copying visible Sheet range A2:H3 confirmed exactly one setup row and an empty following row. Status is New; the notes column is blank. No visitor data was used.

The website ZIP published through the signed-in dashboard. The initial directory upload failed without creating a live site; uploading the ZIP extracted and published its contents. Home, Guide and Install were verified in the browser. Both downloaded ZIPs matched local release artifacts exactly:

- marginalia-0.5.0.zip: `0136d335e104ef8256b22c7f4a5e9a57b6493eec788bceaad33b0fa4fbc06f62`
- marginalia-greek-demo-0.5.0.zip: `e5889bf591dec72a60d30ccdb6d3ab537aa4abc9d88a33c4085d24b07e604ac8`

The live form setup attempt failed and preserved input. No FormSubmit activation email was found by a targeted inbox search. A separate authorized diagnostic returned Cloudflare 403 / browser_signature_banned. The owner’s regular-browser test also showed the generic failure. Email delivery and provider-to-Sheet forwarding have NOT passed. The Google receiver’s direct test does not establish this full flow. Form error diagnostics were added without logging visitor fields, and activation-specific errors receive clearer copy. Provider investigation remains active.

Local checks: website route/assets contract (62 references), 13 simulated form cases, receiver append/deduplication/formula-text/validation/no-read checks; Greek Demo production-model validation and release packaging pass. No plugin runtime change for the request log. No GitHub release/tag/push or Obsidian Community submission performed.

Evidence: [active receiver](request-receiver-active-2026-11-02.png), [request row](request-sheet-row-2026-11-02.png), [live website](website-live-2026-11-02.png).

Follow-up: The owner confirmed the live form failure with a screenshot. The AJAX diagnostic produced no provider response, so transport was switched to documented standard POST navigation, leaving FormSubmit verification/CAPTCHA enabled. Local form checks cover navigation, guards, request-ID/webhook fields, same-page retries and back-navigation. Published site display name is Marginalia for Obsidian.

The standard POST exposed FormSubmit’s missing-page-address error. The form now supplies `_url` from its actual origin and pathname, as documented at https://formsubmit.co/help, without query strings or fragments. Script/config references carry a revision query to prevent stale browser code after deployment.

Final observed state: here.now shows five versions of the same site, not five new sites. The corrected standard POST with `_url` reached FormSubmit’s Thanks / submitted successfully page. Email search still found no test/activation message; Apps Script Executions still showed only the two direct test POSTs, and a UI CSV export still had only the one direct-test row. Therefore FormSubmit forwarding is not accepted as working. The owner was asked to refresh and repeat one regular-browser test on the corrected build. No additional Google permissions were requested. See [provider confirmation](request-provider-success-2026-11-02.png).

Activation follow-up: the owner confirmed successful activation and provided the public endpoint alias. Configuration, test fixture and cache revisions were updated; website checks, Greek Demo verification and packaging pass. Published as version 6 of the same site. The live test navigated to the alias (no recipient email in URL) and displayed FormSubmit’s enabled reCAPTCHA. Owner participation requested; no automated CAPTCHA action or protection disablement performed. [Verification page](request-alias-verification-2026-11-02.png).

Post-CAPTCHA check: Gmail confirms the alias test email (`activated-alias-check`, Request ID `90c7f2bb-6713-4875-9c4b-319a41ca9c0d`) and the owner’s earlier Setup test (`ee21ff4c-907a-41a8-b304-45b067092de2`). The test conversation was accidentally archived/trashed while opening it in the narrow Gmail viewport, then restored to Inbox; restoration toast and Inbox label verified. Temporary wider viewport used for reliable controls and reset afterward.

Apps Script records a provider doPost at 23:05:40, but Sheet export still has only the direct setup row. Version 2 was deployed at 23:09 with form-urlencoded envelope/nested-JSON handling and validation-label diagnostics without logging visitor contents. Local encoding/deduplication checks pass. A fresh `receiver-format-check` submission is waiting on the owner’s CAPTCHA. Email works; automated Sheet logging is not yet accepted.

## Deployment acceptance · 2026-11-02
Website is live at https://karma-voyage-a7mb.here.now/. FormSubmit activation and public alias are configured. Receiver version 2 is active at the existing URL with existing permissions. After owner CAPTCHA completion, `receiver-format-check` delivered an email and exactly one matching Sheet row with Request ID `8bad050f-8b10-49ff-b349-2fea5e83dbb4`. Both destinations were verified independently. The earlier direct setup row remains labeled as a test. Earlier pending statements above are historical and superseded by this acceptance. Plugin/demo downloads match the current prepared 0.5.0 build. No GitHub release or Community submission was performed.
