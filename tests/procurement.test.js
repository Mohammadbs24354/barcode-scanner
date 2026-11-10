import test from 'node:test';
import assert from 'node:assert/strict';
import { purchaseOrderStatus, validateReceiptQuantities } from '../src/services/storage.js';

test('purchase order status reflects open, partial and complete quantities', () => {
 const lines=[{quantity:10,receivedQty:0},{quantity:5,receivedQty:0}];
 assert.equal(purchaseOrderStatus(lines),'open');
 lines[0].receivedQty=4;
 assert.equal(purchaseOrderStatus(lines),'partially_received');
 lines[0].receivedQty=10;
 lines[1].receivedQty=5;
 assert.equal(purchaseOrderStatus(lines),'received');
});

test('receipt quantities allow a valid partial delivery', () => {
 assert.deepEqual(validateReceiptQuantities([{quantity:10,receivedQty:3},{quantity:5,receivedQty:0}],[2,0]),[2,0]);
});

test('receipt quantities reject zero, negative, fractional and over-delivery', () => {
 const lines=[{quantity:10,receivedQty:3}];
 assert.throws(()=>validateReceiptQuantities(lines,[0]),/EMPTY_RECEIPT/);
 assert.throws(()=>validateReceiptQuantities(lines,[-1]),/INVALID_RECEIPT_QUANTITY/);
 assert.throws(()=>validateReceiptQuantities(lines,[1.5]),/INVALID_RECEIPT_QUANTITY/);
 assert.throws(()=>validateReceiptQuantities(lines,[8]),/INVALID_RECEIPT_QUANTITY/);
});
