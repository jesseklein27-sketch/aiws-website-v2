# aiws-website-v2

AI Wealth Systems v2 — static marketing site for a one-time-purchase library of 153 AI specialist prompts delivered via Notion.

## Stack

Plain static HTML/CSS/JS, deployed on Netlify. No build step.

| Page | Purpose |
| --- | --- |
| `index.html` | Landing page — pricing, free sample vault, contact, AI Wealth Guide chat |
| `success.html` | Post-checkout page; reads `?product=` and serves the matching Notion template link |
| `about.html` / `terms.html` / `privacy.html` / `refund.html` | Company and policy pages |

## Payments

Paddle Billing v2 overlay checkout, initialised in `index.html`. Paddle is the Merchant of Record.
Three one-time tiers: Foundation $27, Command $67, Elite $147. Price IDs live in the `PRICE_IDS`
object in `index.html`; checkout redirects to `success.html?product=<tier>&status=success`.

## Forms

Three Netlify Forms, submitted over AJAX:

- `sample-unlock` — email gate on the free sample vault
- `free-prompts` — "5 free prompts" email capture
- `contact` — contact form

Submissions appear under Forms in the Netlify dashboard.

## Chat

`AI Wealth Guide` is a self-contained, rule-based assistant in `index.html` — keyword intent matching
over a local knowledge base, no API calls or keys. It can open Paddle checkout directly.

## Policies

14-day refund window. Keep `index.html`, `terms.html`, and `refund.html` in agreement if this changes.
