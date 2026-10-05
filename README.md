# AI Wealth Systems website

Notion-delivered structured specialist systems used through ChatGPT, Claude, Gemini or similar models. Foundation: 47 systems / $19; Command: 85 total / $39; Elite: 154 total / $85. One-time payment, lifetime access, 14-day refund policy.

## Development

Use the existing isolated checkout. Node.js 22+ is required; there are no third-party application dependencies.

```sh
npm ci --cache /tmp/aiws-npm-cache --ignore-scripts --no-audit --no-fund
npm run lint
npm test
npm run build
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

The static server supports page inspection only. Checkout and verification require Netlify's server functions and secure environment configuration. A static server must never be treated as proof that production fulfillment works. `npm run lint` performs JavaScript syntax and HTML document-language checks, not an ESLint ruleset. `npm test` uses Node's test runner, mock Paddle responses and lightweight client DOM simulations; it is not a browser test.

Netlify builds the explicit public-file allowlist into `dist/` and separately bundles `netlify/functions/`. Never publish the checkout root: it contains server code and could contain local configuration. Do not put private variables in build-time JavaScript replacements or public files.

See [fulfillment architecture and rollout prerequisites](docs/fulfillment.md), [claim-change inventory and QA](docs/review.md), and [.env.example](.env.example) for required variable names. This change is for review; merging, deploying, changing the live Netlify site and real payment tests require separate approval.
