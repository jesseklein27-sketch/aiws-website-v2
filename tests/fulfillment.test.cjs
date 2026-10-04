'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHandlers } = require('../netlify/functions/server/fulfillment.cjs');
const origin = 'https://shop.example';
const transactionId = 'txn_' + 't'.repeat(26);
function setup(tier = 'foundation', override = {}) {
  const env = { SITE_ORIGIN: origin, PADDLE_ENVIRONMENT: 'sandbox', PADDLE_CLIENT_TOKEN: 'test_publictoken', PADDLE_API_KEY: 'private-api-canary', FULFILLMENT_SESSION_SECRET: 'private-signing-canary-at-least-32-bytes' };
  for (const [i, key] of ['foundation', 'command', 'elite'].entries()) {
    env[`PADDLE_${key.toUpperCase()}_PRICE_ID`] = 'pri_' + String(i + 1).repeat(26);
    env[`PADDLE_${key.toUpperCase()}_PRODUCT_ID`] = 'pro_' + String(i + 1).repeat(26);
    env[`NOTION_${key.toUpperCase()}_ACCESS_URL`] = `https://private-${key}-canary.notion.site/template`;
  }
  Object.assign(env, override);
  const amounts = { foundation: '1900', command: '3900', elite: '8500' };
  function price(key) {
    return { id: env[`PADDLE_${key.toUpperCase()}_PRICE_ID`], product_id: env[`PADDLE_${key.toUpperCase()}_PRODUCT_ID`], status: 'active', billing_cycle: null, trial_period: null, unit_price_overrides: [], unit_price: { amount: amounts[key], currency_code: 'USD' } };
  }
  const state = { transaction: null, adjustments: [], response: null, calls: [] };
  const fetchImpl = async (url, options) => {
    state.calls.push({ url, options });
    if (state.response) return state.response;
    let data;
    if (url.includes('/prices/')) {
      const key = Object.keys(amounts).find(k => url.endsWith(price(k).id)); data = price(key);
    } else if (url.includes('/transactions/')) data = state.transaction;
    else if (url.includes('/adjustments?')) data = state.adjustments;
    else throw new Error('unexpected route');
    return { status: 200, ok: true, json: async () => ({ data }) };
  };
  const handlers = createHandlers({ env, fetchImpl, now: () => 1000000000 });
  const event = (data, cookie = '', extras = {}) => ({ httpMethod: 'POST', headers: { origin, 'content-type': 'application/json', cookie }, body: JSON.stringify(data), ...extras });
  async function checkout(key = tier) {
    const result = await handlers.checkoutSession(event({ tier: key }));
    assert.equal(result.statusCode, 200);
    const data = JSON.parse(result.body);
    const cookie = result.headers['Set-Cookie'].split(';')[0];
    state.transaction = { id: transactionId, status: 'completed', custom_data: { fulfillment_session: data.customData.fulfillment_session }, currency_code: 'USD', discount_id: null, items: [{ quantity: 1, price: price(key) }] };
    return { result, data, cookie };
  }
  return { env, handlers, state, event, price, checkout };
}
for (const tier of ['foundation', 'command', 'elite']) {
  test(`${tier} purchase returns only its own tier and destination`, async () => {
    const f = setup(tier); const session = await f.checkout();
    const response = await f.handlers.fulfill(f.event({ transactionId }, session.cookie));
    assert.equal(response.statusCode, 200);
    const data = JSON.parse(response.body);
    assert.equal(data.tier, tier);
    assert.equal(data.accessUrl, f.env[`NOTION_${tier.toUpperCase()}_ACCESS_URL`]);
    assert.equal(data.count, { foundation: 47, command: 85, elite: 154 }[tier]);
    assert.equal(data.price, { foundation: '$19', command: '$39', elite: '$85' }[tier]);
    for (const other of ['foundation', 'command', 'elite'].filter(k => k !== tier)) assert.ok(!response.body.includes(f.env[`NOTION_${other.toUpperCase()}_ACCESS_URL`]));
    assert.equal(response.headers['Cache-Control'], 'no-store, private');
    assert.ok(!response.body.includes(f.env.PADDLE_API_KEY));
    assert.ok(!session.result.body.includes('notion.site'));
    assert.match(session.result.headers['Set-Cookie'], /HttpOnly; Secure; SameSite=Lax/);
    assert.ok(f.state.calls.every(c => c.options.headers.Authorization === `Bearer ${f.env.PADDLE_API_KEY}` && c.options.redirect === 'error'));
  });
}
test('missing transaction ID rejected before any Paddle request', async () => {
  const f = setup(); const response = await f.handlers.fulfill(f.event({}));
  assert.equal(response.statusCode, 400); assert.equal(f.state.calls.length, 0);
});
test('malformed and non-string transaction IDs rejected', async () => {
  const f = setup();
  for (const id of ['../../prices', 'txn_short', [transactionId], {}, null]) assert.equal((await f.handlers.fulfill(f.event({ transactionId: id }))).statusCode, 400);
});
test('Paddle reports invalid transaction: rejected without access', async () => {
  const f = setup(); const { cookie } = await f.checkout();
  f.state.response = { status: 404, ok: false };
  const result = await f.handlers.fulfill(f.event({ transactionId }, cookie));
  assert.equal(result.statusCode, 422); assert.ok(!result.body.includes('notion.site'));
});
test('all incomplete/canceled transaction states rejected', async () => {
  const f = setup(); const { cookie } = await f.checkout();
  for (const status of ['draft', 'ready', 'billed', 'paid', 'past_due', 'canceled', undefined]) {
    f.state.transaction.status = status;
    const result = await f.handlers.fulfill(f.event({ transactionId }, cookie));
    assert.equal(result.statusCode, 409); assert.ok(!result.body.includes('notion.site'));
  }
});
test('client tier/status fields cannot upgrade access', async () => {
  const f = setup(); const { cookie } = await f.checkout();
  for (const extra of [{ tier: 'elite' }, { product: 'elite' }, { status: 'success' }]) assert.equal((await f.handlers.fulfill(f.event({ transactionId, ...extra }, cookie))).statusCode, 400);
  const result = await f.handlers.fulfill(f.event({ transactionId }, cookie));
  assert.equal(JSON.parse(result.body).tier, 'foundation');
});
test('missing session, altered signature, altered signed tier, and expired session rejected', async () => {
  const f = setup(); const { cookie } = await f.checkout();
  const [name, value] = cookie.split('='); const [payload, signature] = value.split('.');
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
  const alteredTier = Buffer.from(JSON.stringify({ ...decoded, tier: 'elite' })).toString('base64url');
  for (const invalid of ['', `${name}=${payload}.broken`, `${name}=${alteredTier}.${signature}`, `${cookie}; ${cookie}`]) assert.equal((await f.handlers.fulfill(f.event({ transactionId }, invalid))).statusCode, 403);
  const futureHandlers = createHandlers({ env: f.env, now: () => 1000000000 + 86400001, fetchImpl: () => { throw new Error('must not call'); } });
  assert.equal((await futureHandlers.fulfill(f.event({ transactionId }, cookie))).statusCode, 403);
});
test('valid transaction ID from another browser cannot grant access', async () => {
  const f = setup(); const first = await f.checkout(); const second = await f.checkout();
  assert.notEqual(first.data.customData.fulfillment_session, second.data.customData.fulfillment_session);
  assert.equal((await f.handlers.fulfill(f.event({ transactionId }, first.cookie))).statusCode, 403);
});
test('wrong-price/product/amount/currency/quantity/discount/recurring purchases rejected', async () => {
  const mutations = [
    tx => { tx.items[0].price.id = 'pri_' + '9'.repeat(26); },
    tx => { tx.items[0].price.product_id = 'pro_' + '9'.repeat(26); },
    tx => { tx.items[0].price.unit_price.amount = '2700'; },
    tx => { tx.items[0].price.unit_price.currency_code = 'EUR'; },
    tx => { tx.currency_code = 'EUR'; },
    tx => { tx.items[0].quantity = 2; },
    tx => { tx.items.push(tx.items[0]); },
    tx => { tx.discount_id = 'dsc_discount'; },
    tx => { tx.items[0].price.billing_cycle = { interval: 'month', frequency: 1 }; },
    tx => { tx.items[0].price.trial_period = { interval: 'day', frequency: 7 }; },
    tx => { tx.items[0].price.unit_price_overrides = [{ country_codes: ['US'], unit_price: { amount: '900', currency_code: 'USD' } }]; },
    tx => { tx.items = []; }
  ];
  for (const mutate of mutations) {
    const f = setup(); const { cookie } = await f.checkout(); mutate(f.state.transaction);
    assert.equal((await f.handlers.fulfill(f.event({ transactionId }, cookie))).statusCode, 422);
  }
});
test('verified price cannot differ from signed checkout tier', async () => {
  const f = setup(); const { cookie } = await f.checkout(); f.state.transaction.items[0].price = f.price('elite');
  assert.equal((await f.handlers.fulfill(f.event({ transactionId }, cookie))).statusCode, 422);
});
test('mismatched transaction ID rejected', async () => {
  const f = setup(); const { cookie } = await f.checkout(); f.state.transaction.id = 'txn_' + 'z'.repeat(26);
  assert.equal((await f.handlers.fulfill(f.event({ transactionId }, cookie))).statusCode, 422);
});
test('refunded or adjusted completed purchase denied', async () => {
  const f = setup(); const { cookie } = await f.checkout();
  for (const status of ['approved', 'pending_approval', undefined]) {
    f.state.adjustments = [{ transaction_id: transactionId, status }];
    assert.equal((await f.handlers.fulfill(f.event({ transactionId }, cookie))).statusCode, 403);
  }
  f.state.adjustments = [{ transaction_id: transactionId, status: 'rejected' }];
  assert.equal((await f.handlers.fulfill(f.event({ transactionId }, cookie))).statusCode, 200);
});
test('upstream failures and malformed responses fail closed without details', async () => {
  const f = setup(); const { cookie } = await f.checkout();
  for (const response of [{ status: 401, ok: false }, { status: 429, ok: false }, { status: 200, ok: true, json: async () => ({ error: f.env.PADDLE_API_KEY }) }, { status: 200, ok: true, json: async () => { throw new Error(f.env.PADDLE_API_KEY); } }]) {
    f.state.response = response;
    const result = await f.handlers.fulfill(f.event({ transactionId }, cookie));
    assert.equal(result.statusCode, 503); assert.ok(!result.body.includes(f.env.PADDLE_API_KEY)); assert.ok(!result.body.includes('notion.site'));
  }
});
test('origin, content type, method and excessive body checks', async () => {
  const f = setup(); const { cookie } = await f.checkout();
  const original = f.event({ transactionId }, cookie);
  for (const originValue of ['https://attacker.example', '', 'null']) assert.equal((await f.handlers.fulfill({ ...original, headers: { ...original.headers, origin: originValue } })).statusCode, 403);
  const get = await f.handlers.fulfill({ ...original, httpMethod: 'GET' }); assert.equal(get.statusCode, 405); assert.equal(get.headers.Allow, 'POST');
  assert.equal((await f.handlers.fulfill({ ...original, headers: { ...original.headers, 'content-type': 'text/plain' } })).statusCode, 400);
  assert.equal((await f.handlers.fulfill({ ...original, body: 'x'.repeat(2049) })).statusCode, 400);
  assert.equal((await f.handlers.fulfill({ ...original, body: '{' })).statusCode, 400);
});
test('missing, duplicate and unsafe configuration denied', async () => {
  for (const override of [
    { PADDLE_API_KEY: '' }, { FULFILLMENT_SESSION_SECRET: 'short' }, { SITE_ORIGIN: 'http://shop.example' },
    { NOTION_ELITE_ACCESS_URL: 'https://notion.site.attacker.example/template' },
    { NOTION_ELITE_ACCESS_URL: 'https://user:password@notion.site/template' },
    { PADDLE_COMMAND_PRICE_ID: 'pri_' + '1'.repeat(26) },
    { PADDLE_ENVIRONMENT: 'test' }, { PADDLE_CLIENT_TOKEN: 'live_wrongmode' }
  ]) {
    const f = setup('foundation', override); assert.equal((await f.handlers.checkoutSession(f.event({ tier: 'foundation' }))).statusCode, 503);
  }
});
test('checkout configuration must match active one-time USD price before opening payment', async () => {
  const f = setup();
  const wrong = f.price('foundation'); wrong.unit_price.amount = '2700';
  f.state.response = { status: 200, ok: true, json: async () => ({ data: wrong }) };
  assert.equal((await f.handlers.checkoutSession(f.event({ tier: 'foundation' }))).statusCode, 503);
  assert.equal((await f.handlers.checkoutSession(f.event({ tier: 'elite', priceId: wrong.id }))).statusCode, 400);
});

test('adjustment lookup must not ignore later pages or malformed records', async () => {
  const f = setup(); const { cookie } = await f.checkout();
  const transaction = f.state.transaction;
  f.state.response = { status: 200, ok: true, json: async function () { return { data: transaction }; } };
  const makeFetch = response => async url => url.includes('/adjustments?') ? response : { status: 200, ok: true, json: async () => ({ data: transaction }) };
  for (const response of [
    { status: 200, ok: true, json: async () => ({ data: [], meta: { pagination: { has_more: true } } }) },
    { status: 200, ok: true, json: async () => ({ data: [null] }) },
    { status: 200, ok: true, json: async () => ({ data: [{ transaction_id: 'another_transaction', status: 'approved' }] }) }
  ]) {
    const handler = createHandlers({ env: f.env, now: () => 1000000000, fetchImpl: makeFetch(response) });
    assert.equal((await handler.fulfill(f.event({ transactionId }, cookie))).statusCode, 503);
  }
});
test('network rejection is sanitized and denied', async () => {
  const f = setup(); const { cookie } = await f.checkout();
  const handler = createHandlers({ env: f.env, now: () => 1000000000, fetchImpl: async () => { throw new Error(f.env.PADDLE_API_KEY); } });
  const result = await handler.fulfill(f.event({ transactionId }, cookie));
  assert.equal(result.statusCode, 503); assert.ok(!result.body.includes(f.env.PADDLE_API_KEY));
});
