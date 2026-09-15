import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buyerEmailFromSession } from './_provision-lib.mjs';

test('prefers customer_details.email', () => {
  assert.equal(buyerEmailFromSession({
    customer_details: { email: 'A@b.com' },
    customer_email: 'c@d.com'
  }), 'a@b.com');
});
test('falls back to customer_email', () => {
  assert.equal(buyerEmailFromSession({ customer_email: 'C@D.com' }), 'c@d.com');
});
test('falls back to metadata', () => {
  assert.equal(buyerEmailFromSession({
    metadata: { operator_email: 'e@f.com' }
  }), 'e@f.com');
});
test('skips an invalid value and keeps looking', () => {
  assert.equal(buyerEmailFromSession({
    customer_details: { email: 'not-an-email' },
    customer_email: 'g@h.com'
  }), 'g@h.com');
});
test('returns null when there is nothing usable', () => {
  assert.equal(buyerEmailFromSession({}), null);
});
