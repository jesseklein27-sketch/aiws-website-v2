(function () {
  'use strict';
  var form = document.getElementById('verify-form');
  var input = document.getElementById('transaction-id');
  var button = document.getElementById('verify-button');
  var card = document.getElementById('access-card');
  var link = document.getElementById('notion-link');
  var title = document.getElementById('success-title');
  var description = document.getElementById('success-desc');
  var pending = false;
  var messages = {
    payment_not_completed: 'Payment is not completed yet. Retry shortly; no access has been granted.',
    transaction_id_required: 'Enter a valid Paddle transaction ID. No access has been granted.',
    transaction_or_price_invalid: 'This purchase could not be verified. Contact support with your receipt.',
    checkout_session_required: 'This checkout session is missing or expired. Use the browser that started checkout, or contact support with your receipt.',
    checkout_session_mismatch: 'This purchase does not match your checkout session. Contact support with your receipt.',
    purchase_not_supported: 'This transaction does not match a supported tier purchase. Contact support with your receipt.',
    purchase_adjusted: 'This purchase has a refund or adjustment. Contact support for assistance.'
  };
  async function verify(transactionId) {
    if (pending) return;
    pending = true;
    button.disabled = true;
    card.hidden = true;
    link.removeAttribute('href');
    title.textContent = 'Verifying payment';
    description.textContent = 'Checking your transaction securely with Paddle…';
    try {
      var response = await fetch('/.netlify/functions/fulfill', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionId: transactionId })
      });
      var result = await response.json();
      if (!response.ok) {
        title.textContent = 'Access not verified';
        description.textContent = messages[result.error] || 'Verification is unavailable. Retry later or contact support. No access has been granted.';
        return;
      }
      var destination = new URL(result.accessUrl);
      if (destination.protocol !== 'https:' || destination.username || destination.password || destination.port || !/^(?:[a-z0-9-]+\.)*notion\.(?:site|so)$/.test(destination.hostname)) throw new Error('invalid response');
      title.textContent = 'Payment verified';
      description.textContent = 'Your completed payment has been verified for ' + result.name + '.';
      document.getElementById('tier-name').textContent = result.name + ' — ' + result.price + ' one-time';
      document.getElementById('tier-description').textContent = result.count + ' specialist systems total · Lifetime access';
      link.href = destination.href;
      card.hidden = false;
    } catch (_) {
      title.textContent = 'Access not verified';
      description.textContent = 'Verification is unavailable. Retry later or contact support with your receipt. No access has been granted.';
    } finally { pending = false; button.disabled = false; }
  }
  form.addEventListener('submit', function (event) { event.preventDefault(); verify(input.value.trim()); });
  var params = new URL(window.location.href).searchParams;
  var transactionId = params.get('transaction_id') || params.get('_ptxn');
  // Remove all query parameters, including untrusted product/status, from the address bar.
  window.history.replaceState(null, '', window.location.pathname);
  if (transactionId) { input.value = transactionId; verify(transactionId); }
})();
