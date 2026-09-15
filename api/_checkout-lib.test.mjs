import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseBuyerEmail } from './_checkout-lib.mjs';

test('trims and lowercases', () => {
  assert.equal(normaliseBuyerEmail('  Jason@Example.COM '), 'jason@example.com');
});
test('rejects a missing domain', () => {
  assert.equal(normaliseBuyerEmail('jason@'), null);
});
test('rejects an empty string', () => {
  assert.equal(normaliseBuyerEmail(''), null);
});
test('rejects a non-string', () => {
  assert.equal(normaliseBuyerEmail(undefined), null);
});
test('rejects over 254 characters', () => {
  assert.equal(normaliseBuyerEmail('a'.repeat(250) + '@b.com'), null);
});
