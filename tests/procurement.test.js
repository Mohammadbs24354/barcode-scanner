import test from 'node:test';
import assert from 'node:assert/strict';
import { purchaseOrderStatus, validateReceiptQuantities, validateReturn, validateReservation, validateInventoryCounts, validateStorageLocation, validateSalesOrder, assertSalesOrderTransition, salesOrderTotal, store, createSalesOrder, confirmSalesOrder, cancelSalesOrder, startSalesOrderPicking, updateSalesOrderPickingLine, packSalesOrder, shipSalesOrder, getAvailableStock } from '../src/services/storage.js';

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


test('sales order validation normalizes customer data and valid line quantities', () => {
 const order=validateSalesOrder({customer:' ACME ',customerEmail:' sales@example.com ',warehouseId:'wh1',lines:[{productId:'p1',quantity:'3',unitPrice:'12.5'}]});
 assert.equal(order.customer,'ACME');
 assert.equal(order.customerEmail,'sales@example.com');
 assert.deepEqual(order.lines,[{productId:'p1',quantity:3,unitPrice:12.5}]);
 assert.equal(salesOrderTotal(order.lines),37.5);
});

test('sales order validation rejects missing customer, warehouse, products and invalid prices or quantities', () => {
 const base={customer:'ACME',warehouseId:'wh1',lines:[{productId:'p1',quantity:2,unitPrice:10}]};
 assert.throws(()=>validateSalesOrder({...base,customer:' '}),/INVALID_SALES_ORDER/);
 assert.throws(()=>validateSalesOrder({...base,warehouseId:''}),/INVALID_SALES_ORDER/);
 assert.throws(()=>validateSalesOrder({...base,lines:[]}),/INVALID_SALES_ORDER/);
 assert.throws(()=>validateSalesOrder({...base,lines:[{productId:'p1',quantity:0,unitPrice:10}]}),/INVALID_SALES_ORDER_QUANTITY/);
 assert.throws(()=>validateSalesOrder({...base,lines:[{productId:'p1',quantity:1.5,unitPrice:10}]}),/INVALID_SALES_ORDER_QUANTITY/);
 assert.throws(()=>validateSalesOrder({...base,lines:[{productId:'p1',quantity:1,unitPrice:-1}]}),/INVALID_SALES_ORDER_PRICE/);
});

test('sales order workflow only allows draft-confirm-pick-pack-ship transitions and cancellation before shipping', () => {
 assert.equal(assertSalesOrderTransition('draft','confirmed'),true);
 assert.equal(assertSalesOrderTransition('confirmed','picking'),true);
 assert.equal(assertSalesOrderTransition('picking','packed'),true);
 assert.equal(assertSalesOrderTransition('packed','shipping'),true);
 assert.equal(assertSalesOrderTransition('shipping','shipped'),true);
 assert.equal(assertSalesOrderTransition('confirmed','cancelled'),true);
 assert.throws(()=>assertSalesOrderTransition('shipped','cancelled'),/INVALID_SALES_ORDER_TRANSITION/);
 assert.throws(()=>assertSalesOrderTransition('draft','shipped'),/INVALID_SALES_ORDER_TRANSITION/);
});


async function withMemoryCache(run){
 const previousWindow=globalThis.window,previousLocation=globalThis.location;
 const records=new Map();
 const cache={
  keys:async()=>[...records.keys()].map(url=>new Request(url)),
  match:async key=>records.get(typeof key==='string'?key:key.url),
  put:async(key,response)=>{records.set(typeof key==='string'?key:key.url,response.clone())},
  delete:async key=>records.delete(typeof key==='string'?key:key.url)
 };
 globalThis.window={caches:{open:async()=>cache}};
 globalThis.location={origin:'https://stockflow.test'};
 try{return await run()}finally{
  if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
  if(previousLocation===undefined)delete globalThis.location;else globalThis.location=previousLocation;
 }
}
async function seedOrderStock(quantity=10){
 await store.put('warehouses',{id:'wh1',name:'Hauptlager'});
 await store.put('products',{id:'p1',name:'Testprodukt',barcode:'123',price:8,stock:quantity,stockByWarehouse:{wh1:quantity}});
 return createSalesOrder({customer:'Testkunde',warehouseId:'wh1',lines:[{productId:'p1',quantity:4,unitPrice:8}]});
}

test('confirming a customer order automatically reserves stock without reducing physical inventory', async()=>{
 await withMemoryCache(async()=>{
  const order=await seedOrderStock(10);
  const confirmed=await confirmSalesOrder(order.id);
  const product=(await store.all('products'))[0],reservations=await store.all('reservations');
  assert.equal(confirmed.status,'confirmed');
  assert.equal(reservations.length,1);
  assert.equal(reservations[0].salesOrderId,order.id);
  assert.equal(product.stockByWarehouse.wh1,10);
  assert.equal(await getAvailableStock(product,'wh1'),6);
 });
});

test('customer order confirmation rejects insufficient stock without partial reservations', async()=>{
 await withMemoryCache(async()=>{
  const order=await seedOrderStock(3);
  await assert.rejects(()=>confirmSalesOrder(order.id),/INSUFFICIENT_AVAILABLE_STOCK/);
  assert.equal((await store.all('reservations')).length,0);
  assert.equal((await store.all('salesOrders'))[0].status,'draft');
 });
});

test('cancelling a confirmed customer order releases its reservation without changing physical stock', async()=>{
 await withMemoryCache(async()=>{
  const order=await seedOrderStock(10);
  await confirmSalesOrder(order.id);
  const cancelled=await cancelSalesOrder(order.id);
  const reservation=(await store.all('reservations'))[0];
  const product=(await store.all('products'))[0];
  assert.equal(cancelled.status,'cancelled');
  assert.equal(reservation.status,'released');
  assert.equal(product.stockByWarehouse.wh1,10);
  assert.equal(await getAvailableStock(product,'wh1'),10);
 });
});

test('shipping a packed customer order fulfills the reservation once and rejects duplicate shipment', async()=>{
 await withMemoryCache(async()=>{
  const order=await seedOrderStock(10);
  await confirmSalesOrder(order.id);
  await startSalesOrderPicking(order.id);
  await updateSalesOrderPickingLine(order.id,'p1',4);
  await packSalesOrder(order.id);
  const shipped=await shipSalesOrder(order.id);
  assert.equal(shipped.status,'shipped');
  assert.equal((await store.all('products'))[0].stockByWarehouse.wh1,6);
  const reservation=(await store.all('reservations'))[0];
  assert.equal(reservation.fulfilledQty,4);
  const orderMovements=(await store.all('movements')).filter(m=>m.salesOrderId===order.id);
  assert.equal(orderMovements.length,1);
  await assert.rejects(()=>shipSalesOrder(order.id),/INVALID_SALES_ORDER_TRANSITION/);
  assert.equal((await store.all('products'))[0].stockByWarehouse.wh1,6);
  assert.equal((await store.all('movements')).filter(m=>m.salesOrderId===order.id).length,1);
 });
});
