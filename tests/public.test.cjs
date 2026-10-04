'use strict';
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const { runInNewContext } = require('node:vm');
const root = resolve(__dirname, '..');
const files = require('../scripts/public-files.cjs');
before(() => execFileSync(process.execPath, ['scripts/build.cjs'], { cwd: root, env: { ...process.env, PADDLE_API_KEY: 'build-private-api-canary', FULFILLMENT_SESSION_SECRET: 'build-private-session-canary', NOTION_FOUNDATION_ACCESS_URL: 'https://build-private-canary.notion.site/secret' } }));
test('production output excludes functions, secrets, tests and obsolete social image', () => {
  assert.deepEqual(readdirSync(resolve(root, 'dist')).sort(), [...files].sort());
  for (const file of files) {
    const output = readFileSync(resolve(root, 'dist', file));
    for (const secret of ['build-private-api-canary', 'build-private-session-canary', 'build-private-canary', 'evergreen-period-c49.notion.site', 'live_db302bdd']) assert.ok(!output.includes(Buffer.from(secret)), file + ': ' + secret);
    if (/\.(html|js|svg)$/.test(file) && file !== 'favicon.svg') assert.doesNotMatch(output.toString(), /\b153\b|\$(?:27|67|147|49|89)\b|10-Day Launch Booster|2026-09-25|PROMPTOS-certified|\$45,000|instant Notion delivery/i, file);
  }
});
test('pricing cards use truthful cumulative totals and checkout buttons', () => {
  const html = readFileSync(resolve(root, 'dist/index.html'), 'utf8');
  for (const [tier, name, amount, count] of [['foundation', 'Foundation', 19, 47], ['command', 'Command', 39, 85], ['elite', 'Elite', 85, 154]]) {
    const card = html.split('<div class="pcard').find(block => block.includes(`<h3>`) && block.includes(name));
    assert.ok(card, tier); assert.ok(card.includes('$' + amount)); assert.ok(card.includes(count + ' ')); assert.ok(card.includes(`data-checkout="${tier}"`));
  }
  assert.ok(html.includes('Stop asking AI for help.'));
  assert.ok(html.includes('AI is the mechanism. Business capability is the product.'));
  assert.ok(html.includes('Same AI. Different operating system.'));
  assert.ok(html.includes('not an external certification'));
  assert.ok(html.includes('planned standalone expansion products'));
});
function browser(url, response) {
  const nodes = {};
  for (const id of ['verify-form', 'transaction-id', 'verify-button', 'access-card', 'notion-link', 'success-title', 'success-desc', 'tier-name', 'tier-description']) nodes[id] = { hidden: id === 'access-card', value: '', textContent: '', listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; }, removeAttribute(name) { delete this[name]; } };
  const calls = []; let replaced;
  const context = { URL, document: { getElementById: id => nodes[id] }, window: { location: { href: url, pathname: '/success.html' }, history: { replaceState: (_, __, target) => { replaced = target; } } }, fetch: async (path, options) => { calls.push({ path, options }); return response; } };
  runInNewContext(readFileSync(resolve(root, 'success.js'), 'utf8'), context);
  return { nodes, calls, replaced };
}
test('status=success and Elite URL parameters alone never reveal access or call verification', () => {
  const b = browser('https://shop.example/success.html?status=success&product=elite', {});
  assert.equal(b.calls.length, 0); assert.equal(b.nodes['access-card'].hidden, true); assert.equal(b.nodes['notion-link'].href, undefined); assert.equal(b.replaced, '/success.html');
});
test('success UI ignores altered URL tier and renders only verified Foundation', async () => {
  const b = browser('https://shop.example/success.html?transaction_id=txn_' + 't'.repeat(26) + '&product=elite&status=success', { ok: true, json: async () => ({ tier: 'foundation', name: 'Foundation', count: 47, price: '$19', accessUrl: 'https://foundation.notion.site/template' }) });
  await new Promise(setImmediate);
  assert.deepEqual(JSON.parse(b.calls[0].options.body), { transactionId: 'txn_' + 't'.repeat(26) });
  assert.equal(b.nodes['tier-name'].textContent, 'Foundation — $19 one-time'); assert.equal(b.nodes['access-card'].hidden, false); assert.equal(b.nodes['notion-link'].href, 'https://foundation.notion.site/template');
});
test('pending, invalid, network and unsafe-destination states never display access', async () => {
  for (const response of [
    { ok: false, json: async () => ({ error: 'payment_not_completed' }) },
    { ok: false, json: async () => ({ error: 'transaction_or_price_invalid' }) },
    { ok: false, json: async () => ({ error: 'checkout_session_required' }) },
    { ok: true, json: async () => { throw new Error('network'); } },
    { ok: true, json: async () => ({ accessUrl: 'javascript:alert(1)' }) }
  ]) {
    const b = browser('https://shop.example/success.html?transaction_id=txn_' + 't'.repeat(26), response);
    await new Promise(setImmediate);
    assert.equal(b.nodes['access-card'].hidden, true); assert.equal(b.nodes['notion-link'].href, undefined); assert.equal(b.nodes['verify-button'].disabled, false); assert.equal(b.nodes['success-title'].textContent, 'Access not verified');
  }
});
test('checkout completion event navigates to verification without exposing destinations', async () => {
  const calls = [], messages = { textContent: '' }; let callback, navigation, checkoutOptions;
  const context = { document: { getElementById: () => messages, querySelectorAll: () => [] }, window: { Paddle: {} }, Paddle: { Initialize(options) { callback = options.eventCallback; }, Checkout: { open(options) { checkoutOptions = options; } } }, fetch: async (path, options) => { calls.push({ path, options }); return { ok: true, json: async () => ({ priceId: 'pri_public', clientToken: 'live_public', environment: 'live', customData: { fulfillment_session: 'nonce' } }) }; } };
  context.window.Paddle = context.Paddle; context.window.location = { assign: url => { navigation = url; } };
  runInNewContext(readFileSync(resolve(root, 'checkout.js'), 'utf8'), context);
  await context.window.openCheckout('foundation');
  assert.deepEqual(JSON.parse(calls[0].options.body), { tier: 'foundation' });
  assert.equal(checkoutOptions.customData.fulfillment_session, 'nonce');
  assert.equal(checkoutOptions.items[0].quantity, 1);
  assert.equal(checkoutOptions.settings.successUrl, undefined);
  callback({ name: 'checkout.completed', data: { transaction_id: 'txn_' + 't'.repeat(26), product: 'elite' } });
  assert.equal(navigation, '/success.html?transaction_id=txn_' + 't'.repeat(26));
  assert.ok(!navigation.includes('elite'));
});
