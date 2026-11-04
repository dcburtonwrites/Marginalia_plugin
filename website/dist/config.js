// Edit these values before publishing. No payment account is stored on this site.
window.MARGINALIA = Object.freeze({
  version: "0.5.0",
  donationUrl: "https://www.paypal.com/donate/?hosted_button_id=TAU2X5WLXWF8C",
  requestWebhook: "https://script.google.com/macros/s/AKfycbz-8MZL8YNkoq0BKT1yvVXpPvUaan-R_88tGQWEdqCYxYpZ8RDlxi9UEzDFA9ueMp-w/exec",
  requestEndpoint: "https://formsubmit.co/9eeaaf0d470462936e90ceea915e72b6",
  // Owner confirmed FormSubmit activation; public alias keeps the inbox address out of the form URL.
  // Local preview never sends a request, including when served over localhost.
  requestsEnabled: true
});
