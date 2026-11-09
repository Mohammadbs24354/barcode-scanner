import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidBarcode, normalizeBarcode } from '../src/utils/barcode.js';

test('accepts valid EAN-8, UPC-A and EAN-13 codes', () => {
  assert.equal(isValidBarcode('96385074'), true);
  assert.equal(isValidBarcode('036000291452'), true);
  assert.equal(isValidBarcode('4006381333931'), true);
});

test('rejects unsupported lengths, letters and invalid check digits', () => {
  assert.equal(isValidBarcode('1234567'), false);
  assert.equal(isValidBarcode('123456789'), false);
  assert.equal(isValidBarcode('4006381333932'), false);
  assert.equal(isValidBarcode('ABC6381333931'), false);
  assert.equal(isValidBarcode(''), false);
});

test('normalizes surrounding whitespace without changing leading zeroes', () => {
  assert.equal(normalizeBarcode('  036000291452  '), '036000291452');
});
