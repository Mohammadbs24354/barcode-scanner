import test from 'node:test';
import assert from 'node:assert/strict';
import { purchaseOrderStatus, validateReceiptQuantities, validateReturn, validateReservation, validateInventoryCounts, validateStorageLocation } from '../src/services/storage.js';

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


test('return validation accepts customer and supplier returns with supported conditions', () => {
 const base={productId:'p1',warehouseId:'w1',quantity:2,reason:'Defekt',condition:'damaged'};
 assert.equal(validateReturn({...base,type:'customer_return'}).quantity,2);
 assert.equal(validateReturn({...base,type:'supplier_return',supplierId:'s1'}).type,'supplier_return');
});

test('return validation rejects invalid types, quantities, conditions and missing required fields', () => {
 const base={productId:'p1',warehouseId:'w1',quantity:2,reason:'Defekt',condition:'damaged',type:'customer_return'};
 assert.throws(()=>validateReturn({...base,type:'unknown'}),/INVALID_RETURN_TYPE/);
 assert.throws(()=>validateReturn({...base,type:'supplier_return'}),/INVALID_RETURN/);
 assert.throws(()=>validateReturn({...base,quantity:0}),/INVALID_RETURN_QUANTITY/);
 assert.throws(()=>validateReturn({...base,quantity:1.2}),/INVALID_RETURN_QUANTITY/);
 assert.throws(()=>validateReturn({...base,condition:'resellable-ish'}),/INVALID_RETURN_CONDITION/);
 assert.throws(()=>validateReturn({...base,reason:'  '}),/INVALID_RETURN/);
});


test('reservation validation accepts valid order reservations and normalizes optional fields', () => {
 const result=validateReservation({productId:'p1',warehouseId:'w1',quantity:'4',orderReference:' SO-100 ',customer:' ACME ',notes:' fragile '});
 assert.equal(result.quantity,4);
 assert.equal(result.orderReference,'SO-100');
 assert.equal(result.customer,'ACME');
 assert.equal(result.notes,'fragile');
});

test('reservation validation rejects missing references and invalid quantities', () => {
 const base={productId:'p1',warehouseId:'w1',quantity:4,orderReference:'SO-100'};
 assert.throws(()=>validateReservation({...base,orderReference:'  '}),/INVALID_RESERVATION/);
 assert.throws(()=>validateReservation({...base,quantity:0}),/INVALID_RESERVATION_QUANTITY/);
 assert.throws(()=>validateReservation({...base,quantity:-1}),/INVALID_RESERVATION_QUANTITY/);
 assert.throws(()=>validateReservation({...base,quantity:1.5}),/INVALID_RESERVATION_QUANTITY/);
});


test('inventory count validation accepts zero and positive whole-unit counts', () => {
 assert.deepEqual(validateInventoryCounts([{productId:'p1'},{productId:'p2'}],[0,'7']),[0,7]);
});

test('inventory count validation rejects blank, negative, fractional and mismatched counts', () => {
 const lines=[{productId:'p1'}];
 assert.throws(()=>validateInventoryCounts(lines,['']),/INVALID_COUNT_QUANTITY/);
 assert.throws(()=>validateInventoryCounts(lines,[-1]),/INVALID_COUNT_QUANTITY/);
 assert.throws(()=>validateInventoryCounts(lines,[1.5]),/INVALID_COUNT_QUANTITY/);
 assert.throws(()=>validateInventoryCounts(lines,[]),/INVALID_COUNT/);
});


test('storage location validation normalizes codes and accepts optional capacity', () => {
 const result=validateStorageLocation({warehouseId:'wh1',code:' a-01-02 ',name:' Regal A',zone:'a',aisle:'01',rack:'02',capacity:'120'});
 assert.equal(result.code,'A-01-02');
 assert.equal(result.name,'Regal A');
 assert.equal(result.capacity,120);
 assert.equal(result.zone,'a');
});

test('storage location validation rejects missing warehouse, code and invalid capacity', () => {
 assert.throws(()=>validateStorageLocation({code:'A-01'}),/INVALID_STORAGE_LOCATION/);
 assert.throws(()=>validateStorageLocation({warehouseId:'wh1',code:'  '}),/INVALID_STORAGE_LOCATION/);
 assert.throws(()=>validateStorageLocation({warehouseId:'wh1',code:'A-01',capacity:0}),/INVALID_STORAGE_CAPACITY/);
 assert.throws(()=>validateStorageLocation({warehouseId:'wh1',code:'A-01',capacity:1.5}),/INVALID_STORAGE_CAPACITY/);
});
