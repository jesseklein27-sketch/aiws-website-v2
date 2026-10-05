'use strict';
const { createHmac, randomBytes, timingSafeEqual } = require('node:crypto');
const TIERS = Object.freeze({
  foundation: { name: 'Foundation', count: 47, amount: '1900', price: '$19' },
  command: { name: 'Command', count: 85, amount: '3900', price: '$39' },
  elite: { name: 'Elite', count: 154, amount: '8500', price: '$85' }
});
const COOKIE = '__Host-aiws_checkout';
const TTL = 86400;
class Failure extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
function fail(status, code) { throw new Failure(status, code); }
function configuration(env) {
  let origin;
  try {
    const site = new URL(env.SITE_ORIGIN);
    if (site.protocol !== 'https:' || site.username || site.password || site.pathname !== '/' || site.search || site.hash) throw new Error();
    origin = site.origin;
  } catch { fail(503, 'configuration_unavailable'); }
  const mode = env.PADDLE_ENVIRONMENT;
  if (!['live', 'sandbox'].includes(mode) || !env.PADDLE_API_KEY || !env.FULFILLMENT_SESSION_SECRET || Buffer.byteLength(env.FULFILLMENT_SESSION_SECRET) < 32 || !new RegExp(`^${mode === 'live' ? 'live' : 'test'}_[a-zA-Z0-9]+$`).test(env.PADDLE_CLIENT_TOKEN || '')) fail(503, 'configuration_unavailable');
  const mappings = Object.keys(TIERS).map(tier => {
    const prefix = tier.toUpperCase();
    const priceId = env[`PADDLE_${prefix}_PRICE_ID`];
    const productId = env[`PADDLE_${prefix}_PRODUCT_ID`];
    let accessUrl;
    try {
      const url = new URL(env[`NOTION_${prefix}_ACCESS_URL`]);
      if (url.protocol !== 'https:' || url.username || url.password || url.port || !(url.hostname === 'notion.so' || url.hostname.endsWith('.notion.so') || url.hostname === 'notion.site' || url.hostname.endsWith('.notion.site'))) throw new Error();
      accessUrl = url.href;
    } catch { fail(503, 'configuration_unavailable'); }
    if (!/^pri_[a-z0-9]{26}$/.test(priceId || '') || !/^pro_[a-z0-9]{26}$/.test(productId || '')) fail(503, 'configuration_unavailable');
    return { tier, priceId, productId, accessUrl };
  });
  if (new Set(mappings.map(m => m.priceId)).size !== 3 || new Set(mappings.map(m => m.accessUrl)).size !== 3) fail(503, 'configuration_unavailable');
  return { origin, mode, mappings, secret: env.FULFILLMENT_SESSION_SECRET, apiKey: env.PADDLE_API_KEY, clientToken: env.PADDLE_CLIENT_TOKEN };
}
function header(event, name) {
  const entry = Object.entries(event.headers || {}).find(([k]) => k.toLowerCase() === name);
  return entry ? entry[1] : '';
}
function body(event, config) {
  if (event.httpMethod !== 'POST') fail(405, 'method_not_allowed');
  if (header(event, 'origin') !== config.origin) fail(403, 'origin_rejected');
  if (!/^application\/json(?:;|$)/i.test(header(event, 'content-type')) || event.isBase64Encoded || !event.body || Buffer.byteLength(event.body) > 2048) fail(400, 'invalid_request');
  try {
    const parsed = JSON.parse(event.body);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch { fail(400, 'invalid_request'); }
}
function sign(payload, secret) { return createHmac('sha256', secret).update(payload).digest('base64url'); }
function createSession(tier, config, now) {
  const session = { tier, nonce: randomBytes(32).toString('base64url'), exp: Math.floor(now / 1000) + TTL };
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return { session, cookie: `${COOKIE}=${payload}.${sign(payload, config.secret)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TTL}` };
}
function readSession(event, config, now) {
  const cookies = header(event, 'cookie').split(';').map(c => c.trim()).filter(c => c.startsWith(`${COOKIE}=`));
  if (cookies.length !== 1 || cookies[0].length > 1024) fail(403, 'checkout_session_required');
  const [payload, signature, extra] = cookies[0].slice(COOKIE.length + 1).split('.');
  const expected = sign(payload || '', config.secret);
  if (extra !== undefined || !/^[A-Za-z0-9_-]{43}$/.test(signature || '') || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) fail(403, 'checkout_session_required');
  let session;
  try { session = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { fail(403, 'checkout_session_required'); }
  if (!session || !Object.hasOwn(TIERS, session.tier) || !/^[a-zA-Z0-9_-]{43}$/.test(session.nonce || '') || !Number.isInteger(session.exp) || session.exp <= Math.floor(now / 1000) || session.exp > Math.floor(now / 1000) + TTL) fail(403, 'checkout_session_required');
  return session;
}
async function paddle(path, config, fetchImpl) {
  const host = config.mode === 'live' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';
  try {
    const response = await fetchImpl(host + path, {
      headers: { Authorization: `Bearer ${config.apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000), redirect: 'error'
    });
    if (response.status === 404) fail(422, 'transaction_or_price_invalid');
    if (!response.ok) fail(503, 'verification_unavailable');
    const json = await response.json();
    if (!json || !Object.hasOwn(json, 'data') || (path.startsWith('/adjustments?') && json.meta?.pagination?.has_more === true)) fail(503, 'verification_unavailable');
    return json.data;
  } catch (error) {
    if (error instanceof Failure) throw error;
    // Do not log upstream bodies, credentials, transaction IDs, cookies or access URLs.
    fail(503, 'verification_unavailable');
  }
}
function validPrice(price, mapping) {
  return price && price.id === mapping.priceId && price.product_id === mapping.productId && price.billing_cycle === null && price.trial_period === null && (price.unit_price_overrides == null || (Array.isArray(price.unit_price_overrides) && price.unit_price_overrides.length === 0)) && price.unit_price?.currency_code === 'USD' && price.unit_price?.amount === TIERS[mapping.tier].amount;
}
function respond(status, data, extra = {}) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private', 'Vary': 'Origin, Cookie', 'X-Content-Type-Options': 'nosniff', ...(status === 405 ? { Allow: 'POST' } : {}), ...extra }, body: JSON.stringify(data) };
}
function createHandlers({ env = process.env, fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  async function execute(event, action) {
    try { const config = configuration(env); const request = body(event, config); return await action(config, request); }
    catch (error) { return respond(error instanceof Failure ? error.status : 503, { error: error instanceof Failure ? error.code : 'verification_unavailable' }); }
  }
  return {
    checkoutSession: event => execute(event, async (config, request) => {
      if (Object.keys(request).length !== 1 || typeof request.tier !== 'string' || !Object.hasOwn(TIERS, request.tier)) fail(400, 'invalid_tier');
      const mapping = config.mappings.find(m => m.tier === request.tier);
      const price = await paddle(`/prices/${mapping.priceId}`, config, fetchImpl);
      if (!validPrice(price, mapping) || price.status !== 'active') fail(503, 'price_configuration_mismatch');
      const { session, cookie } = createSession(request.tier, config, now());
      return respond(200, { priceId: mapping.priceId, clientToken: config.clientToken, environment: config.mode, customData: { fulfillment_session: session.nonce } }, { 'Set-Cookie': cookie });
    }),
    fulfill: event => execute(event, async (config, request) => {
      // No product/tier/status fields accepted: the verified Paddle price is authoritative.
      if (Object.keys(request).length !== 1 || typeof request.transactionId !== 'string' || !/^txn_[a-z0-9]{26}$/.test(request.transactionId || '')) fail(400, 'transaction_id_required');
      const session = readSession(event, config, now());
      const transaction = await paddle(`/transactions/${request.transactionId}`, config, fetchImpl);
      if (!transaction || transaction.id !== request.transactionId) fail(422, 'transaction_or_price_invalid');
      if (transaction.status !== 'completed') fail(409, 'payment_not_completed');
      if (transaction.custom_data?.fulfillment_session !== session.nonce) fail(403, 'checkout_session_mismatch');
      if (!Array.isArray(transaction.items) || transaction.items.length !== 1 || transaction.items[0].quantity !== 1 || transaction.currency_code !== 'USD' || transaction.discount_id != null) fail(422, 'purchase_not_supported');
      const mapping = config.mappings.find(m => validPrice(transaction.items[0].price, m));
      if (!mapping || mapping.tier !== session.tier) fail(422, 'purchase_not_supported');
      const adjustments = await paddle(`/adjustments?transaction_id=${request.transactionId}`, config, fetchImpl);
      if (!Array.isArray(adjustments) || adjustments.some(a => !a || a.transaction_id !== transaction.id)) fail(503, 'verification_unavailable');
      // Refunds do not necessarily change a completed transaction's status.
      if (adjustments.some(a => a.transaction_id === transaction.id && a.status !== 'rejected')) fail(403, 'purchase_adjusted');
      return respond(200, { tier: mapping.tier, name: TIERS[mapping.tier].name, count: TIERS[mapping.tier].count, price: TIERS[mapping.tier].price, accessUrl: mapping.accessUrl });
    })
  };
}
module.exports = { createHandlers };
