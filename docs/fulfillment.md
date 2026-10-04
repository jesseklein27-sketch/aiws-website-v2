# Paddle-to-Notion delivery

## Request flow

1. The user selects Foundation, Command or Elite. `checkout.js` POSTs only the tier to `/.netlify/functions/checkout-session`.
2. The function checks the configured Paddle price using the server API key: the price must be active, non-recurring, without a trial, USD, and match the tier's exact base amount and configured product. It sets a signed, 24-hour, Secure/HttpOnly/SameSite=Lax `__Host-aiws_checkout` cookie. Only the public client token, price ID, environment and random session nonce are returned to the browser.
3. Paddle Checkout receives the nonce as `customData.fulfillment_session`. `checkout.completed` supplies `data.transaction_id`; the browser navigates to `success.html` with that reference. The event grants no access. There is no `status=success` or customer-selected tier authorization.
4. `success.js` POSTs only the transaction ID to `/.netlify/functions/fulfill` with the browser's cookie. A manual transaction-ID form supports retry after an event/reference problem. Query parameters are removed from the address bar, and the page has no-referrer/noindex policies.
5. The server requires an allowed origin, valid signed/unexpired session, matching transaction ID, completed Paddle status, and the same session nonce in verified Paddle custom data. It accepts exactly one item with quantity one, USD, no discount, no trial, billing cycle or localized price overrides. The verified price ID, product ID and unit amount must match one configured tier and the tier bound into the cookie.
6. The server checks Paddle adjustments as completed transactions may remain completed after refund. Any non-rejected adjustment denies access. An incomplete adjustment page or invalid response fails closed.
7. Only the purchased tier's server-configured Notion destination is returned, with `Cache-Control: no-store, private`. Other destinations, API keys, signing keys and upstream response bodies never enter the client response or logs.

API calls use fixed Paddle live/sandbox hosts, TLS verification, an 8-second timeout and no redirects. Failed authentication, API errors, network errors and missing configuration grant no access. No webhook, user account or durable database is required by this initial browser-session route.

## Required Netlify variables

Configure these through Netlify's secure environment settings for the approved deployment, with function/runtime scope. Do not supply values in chat or commit them. `.env.example` contains names only.

| Name | Purpose |
| --- | --- |
| `SITE_ORIGIN` | Exact canonical HTTPS origin, such as `https://aisystemswealth.com`; no path, query or credentials. All checkout traffic must use this origin. |
| `PADDLE_ENVIRONMENT` | `live` for production, `sandbox` for an approved sandbox test. |
| `PADDLE_CLIENT_TOKEN` | Public client token in the same Paddle environment; `live_` or `test_`. Returned intentionally to Paddle.js. |
| `PADDLE_API_KEY` | Private key with read access to prices, transactions and adjustments in the same environment. Never public or bundled. |
| `FULFILLMENT_SESSION_SECRET` | Private high-entropy signing secret, at least 32 bytes; configure consistently across function instances. Rotation invalidates pending sessions. |
| `PADDLE_FOUNDATION_PRICE_ID` | Active one-time USD base price of 1900 cents. |
| `PADDLE_FOUNDATION_PRODUCT_ID` | Product attached to that Foundation price. |
| `PADDLE_COMMAND_PRICE_ID` | Active one-time USD base price of 3900 cents. |
| `PADDLE_COMMAND_PRODUCT_ID` | Product attached to that Command price. |
| `PADDLE_ELITE_PRICE_ID` | Active one-time USD base price of 8500 cents. |
| `PADDLE_ELITE_PRODUCT_ID` | Product attached to that Elite price. |
| `NOTION_FOUNDATION_ACCESS_URL` | Private server configuration for Foundation's HTTPS Notion destination. |
| `NOTION_COMMAND_ACCESS_URL` | Private server configuration for Command's HTTPS Notion destination. |
| `NOTION_ELITE_ACCESS_URL` | Private server configuration for Elite's HTTPS Notion destination. |

All three price IDs and access destinations must be distinct. The old source price IDs were not assumed to match these prices; they must be checked in Paddle. Tax may affect the final charge. Discounts and localized price overrides are unsupported by this offer: configure Paddle base prices consistently; hide discount entry in checkout and remove currency/amount overrides for the launch offer. A mismatched purchase is denied and goes to support rather than silently fulfilling an unintended offer.

## Security limits and launch prerequisites

- The original Notion destinations were public in the old success page. Removing them does not revoke historical URLs, cached pages or access already obtained. Before any approved launch, replace or restrict the old destinations and configure distinct tier-only destinations containing exactly the purchased core systems. This repository change does not edit Notion permissions or content.
- Returning a Notion template URL after verification protects this delivery endpoint, not the Notion permission model. A buyer can copy/share a template link; a duplicated template cannot be revoked by this server. Strong per-customer access or revocation needs Notion membership controls and a durable authenticated fulfillment service. No such control is claimed here.
- A session lasts 24 hours and is bound to the original browser. Starting a new checkout replaces the pending session. A customer switching browser, blocking cookies, using an old checkout, or losing the session must contact support with their receipt. Support must independently verify Paddle payment before granting access. No query-string bypass or unrestricted recovery endpoint exists.
- There is no guaranteed email delivery or webhook-based unattended recovery. The Netlify samples form records requests; sample-email automation is not present in this repository.
- Payment completion is eventually consistent. The success page supports retries and does not label pending/paid-but-not-completed transactions as verified.
- Refund checks prevent new retrieval after an adjustment; already delivered/duplicated content is outside the endpoint's revocation control. No production webhook has been registered or changed.
- Verify Paddle account/product approvals, the approved checkout domain, price/product mappings and Netlify function egress to `api.paddle.com` (or `sandbox-api.paddle.com`) before the first live sale. Ensure HTTPS, canonical host routing and the signing cookie work on the actual approved host.
- Perform an explicitly approved sandbox checkout for each tier with the configured functions, including refresh, delayed completion and refunded purchases. Then separately approve production configuration and deployment. No live purchase, deployment, Netlify edit, merge or publication was performed as part of this change.

## Contract references

The implementation follows Paddle's transaction, price, adjustment and checkout-event fields. Official developer-page access was blocked in this environment; the relevant contracts were inspected in Paddle's published npm packages `@paddle/paddle-node-sdk` 3.10.0 (`IPriceResponse`, `ITransactionResponse`, `ListAdjustmentQueryParameters`) and `@paddle/paddle-js` 1.6.5 (`CheckoutSettings`, `customData`, `checkout.completed`, `transaction_id`). These inspection packages are outside the repository and are not application dependencies. Real API and payment behavior still require the approved sandbox check above.
