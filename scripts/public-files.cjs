'use strict';
// Explicit allowlist: never publish source/functions, environment files, tests or docs.
module.exports = [
  'index.html', 'about.html', 'terms.html', 'privacy.html', 'refund.html', 'thanks.html', 'success.html',
  'app.js', 'assistant.js', 'checkout.js', 'success.js',
  'styles.css', 'assistant.css', 'fix.css', 'fulfillment.css',
  'favicon.svg', 'favicon.png', 'apple-touch-icon.png', 'founder.png', 'proof.svg'
];
