/* Paddle's client token is public. API credentials and Notion URLs stay on the server. */
(function () {
  'use strict';
  var busy = false, initialized = false;
  var message = document.getElementById('checkout-message');
  function notify(text) { message.textContent = text; }
  window.openCheckout = async function (tier) {
    if (busy) return;
    if (!window.Paddle || !Paddle.Initialize || !Paddle.Checkout) {
      notify('Checkout could not load. Please try again or contact jesseklein@aisystemswealth.com.');
      return;
    }
    busy = true;
    document.querySelectorAll('[data-checkout]').forEach(function (button) { button.disabled = true; });
    notify('Preparing secure checkout…');
    try {
      var response = await fetch('/.netlify/functions/checkout-session', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tier })
      });
      if (!response.ok) throw new Error('unavailable');
      var session = await response.json();
      if (!initialized) {
        if (session.environment === 'sandbox') Paddle.Environment.set('sandbox');
        Paddle.Initialize({ token: session.clientToken, eventCallback: function (event) {
          if (event.name !== 'checkout.completed') return;
          var transactionId = event.data && event.data.transaction_id;
          // This is a request to verify payment, never evidence that access is authorized.
          if (!/^txn_[a-z0-9]{26}$/.test(transactionId || '')) {
            notify('Checkout returned no transaction reference. Contact support with your Paddle receipt.');
            return;
          }
          window.location.assign('/success.html?transaction_id=' + encodeURIComponent(transactionId));
        } });
        initialized = true;
      }
      Paddle.Checkout.open({ items: [{ priceId: session.priceId, quantity: 1 }], customData: session.customData,
        settings: { displayMode: 'overlay', theme: 'dark', showAddDiscounts: false, allowDiscountRemoval: false } });
      notify('Complete payment in Paddle. Access is provided after server-side verification.');
    } catch (_) {
      notify('Checkout is unavailable. No access has been granted. Please try again later or contact support.');
    } finally {
      busy = false;
      document.querySelectorAll('[data-checkout]').forEach(function (button) { button.disabled = false; });
    }
  };
  document.querySelectorAll('[data-checkout]').forEach(function (button) {
    button.addEventListener('click', function () { window.openCheckout(button.dataset.checkout); });
  });
})();
