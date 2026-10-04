'use strict';
exports.handler = event => require('./server/fulfillment.cjs').createHandlers().fulfill(event);
