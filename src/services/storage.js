const CACHE_NAME='stockflow-records-v1';
const STORE_NAMES=new Set(['products','movements','warehouses','suppliers','purchaseOrders','receipts','returns','reservations']);
function recordUrl(name,key){if(!STORE_NAMES.has(name))throw Error('INVALID_STORE');return new URL('/__stockflow_cache__/'+name+'/'+encodeURIComponent(key),location.origin).href}
async function openCache(){if(!('caches'in window))throw Error('CACHE_API_UNAVAILABLE');return caches.open(CACHE_NAME)}
export const store={
 async all(name){if(!STORE_NAMES.has(name))throw Error('INVALID_STORE');const c=await openCache(),prefix='/__stockflow_cache__/'+name+'/';const keys=(await c.keys()).filter(r=>new URL(r.url).pathname.startsWith(prefix));return(await Promise.all(keys.map(async r=>{try{return await(await c.match(r)).json()}catch{return null}}))).filter(Boolean)},
 async put(name,item){if(!STORE_NAMES.has(name)||!item?.id)throw Error('INVALID_RECORD');const c=await openCache();await c.put(recordUrl(name,item.id),new Response(JSON.stringify(item),{headers:{'Content-Type':'application/json'}}));return item},
 async remove(name,key){const c=await openCache();await c.delete(recordUrl(name,key))}
};
export const id=()=>globalThis.crypto?.randomUUID?.()||'sf-'+Date.now()+'-'+Math.random().toString(36).slice(2);
export async function initStore(){if(!(await store.all('warehouses')).length)await store.put('warehouses',{id:'main',name:'Hauptlager',code:'WH-001',createdAt:new Date().toISOString()});const ws=await store.all('warehouses');for(const p of await store.all('products'))if(!p.stockByWarehouse){p.stockByWarehouse={[ws[0]?.id||'main']:Number(p.stock||0)};await store.put('products',p)}}
const total=p=>Object.values(p.stockByWarehouse||{}).reduce((s,n)=>s+Number(n||0),0);
export async function getReservedQuantity(productId,warehouseId){const records=await store.all('reservations');return records.filter(r=>r.productId===productId&&r.warehouseId===warehouseId&&['active','partially_fulfilled'].includes(r.status)).reduce((sum,r)=>sum+Math.max(0,Number(r.quantity||0)-Number(r.fulfilledQty||0)-Number(r.releasedQty||0)),0)}
export async function getAvailableStock(product,warehouseId='main'){const balances=product.stockByWarehouse||{main:Number(product.stock||0)};return Math.max(0,Number(balances[warehouseId]||0)-await getReservedQuantity(product.id,warehouseId))}
export async function bookMovement(product,type,qty,note='',warehouseId='main'){qty=Number(qty);if(!Number.isInteger(qty)||qty<=0)throw Error('INVALID_QUANTITY');const balances={...(product.stockByWarehouse||{main:Number(product.stock||0)})},before=Number(balances[warehouseId]||0),reserved=type==='out'?await getReservedQuantity(product.id,warehouseId):0,after=type==='in'?before+qty:type==='out'?before-qty:qty;if(after<reserved)throw Error('STOCK_RESERVED');if(after<0)throw Error('INSUFFICIENT_STOCK');balances[warehouseId]=after;const updated={...product,stockByWarehouse:balances,stock:total({stockByWarehouse:balances}),updatedAt:new Date().toISOString()};await store.put('products',updated);await store.put('movements',{id:id(),productId:product.id,productName:product.name,barcode:product.barcode,type,quantity:qty,before,after,warehouseId,note,createdAt:new Date().toISOString()});return updated}
export async function transferStock(product,quantity,fromId,toId,note=''){const qty=Number(quantity);if(!Number.isFinite(qty)||qty<=0)throw Error('INVALID_QUANTITY');if(!fromId||!toId||fromId===toId)throw Error('INVALID_WAREHOUSE');const b={...(product.stockByWarehouse||{main:Number(product.stock||0)})},bf=Number(b[fromId]||0),bt=Number(b[toId]||0);if(bf-(await getReservedQuantity(product.id,fromId))<qty)throw Error('INSUFFICIENT_STOCK');b[fromId]=bf-qty;b[toId]=bt+qty;const updated={...product,stockByWarehouse:b,stock:total({stockByWarehouse:b}),updatedAt:new Date().toISOString()};await store.put('products',updated);const tid=id(),now=new Date().toISOString();await store.put('movements',{id:tid+'-out',transferId:tid,productId:product.id,productName:product.name,barcode:product.barcode,type:'transfer-out',quantity:qty,before:bf,after:b[fromId],warehouseId:fromId,targetWarehouseId:toId,note,createdAt:now});await store.put('movements',{id:tid+'-in',transferId:tid,productId:product.id,productName:product.name,barcode:product.barcode,type:'transfer-in',quantity:qty,before:bt,after:b[toId],warehouseId:toId,sourceWarehouseId:fromId,note,createdAt:now});return updated}
export async function createPurchaseOrder({supplierId,warehouseId,lines,note=''}){const [suppliers,warehouses,products]=await Promise.all([store.all('suppliers'),store.all('warehouses'),store.all('products')]);if(!suppliers.some(s=>s.id===supplierId)||!warehouses.some(w=>w.id===warehouseId)||!Array.isArray(lines)||!lines.length)throw Error('INVALID_ORDER');const clean=lines.map(line=>{const p=products.find(x=>x.id===line.productId),quantity=Number(line.quantity),unitCost=Number(line.unitCost);if(!p||!Number.isInteger(quantity)||quantity<=0||!Number.isFinite(unitCost)||unitCost<0)throw Error('INVALID_ORDER_LINE');return{productId:p.id,productName:p.name,barcode:p.barcode||'',quantity,unitCost,receivedQty:0}});const now=new Date().toISOString(),order={id:id(),number:'PO-'+Date.now().toString().slice(-8),supplierId,warehouseId,lines:clean,note,status:'open',createdAt:now,updatedAt:now};await store.put('purchaseOrders',order);return order}

export function purchaseOrderStatus(lines){
 const total=lines.reduce((sum,line)=>sum+Number(line.quantity||0),0);
 const received=lines.reduce((sum,line)=>sum+Number(line.receivedQty||0),0);
 return received<=0?'open':received>=total?'received':'partially_received';
}
export function validateReceiptQuantities(lines,quantities){
 if(!Array.isArray(quantities)||quantities.length!==lines.length)throw Error('INVALID_RECEIPT');
 const clean=lines.map((line,index)=>{
  const remaining=Number(line.quantity)-Number(line.receivedQty||0);
  const quantity=Number(quantities[index]);
  if(!Number.isInteger(quantity)||quantity<0||quantity>remaining)throw Error('INVALID_RECEIPT_QUANTITY');
  return quantity;
 });
 if(!clean.some(quantity=>quantity>0))throw Error('EMPTY_RECEIPT');
 return clean;
}
export async function receivePurchaseOrder(orderId,quantities){
 const orders=await store.all('purchaseOrders'),order=orders.find(o=>o.id===orderId);
 if(!order||order.status==='received')throw Error('ORDER_NOT_RECEIVABLE');
 const clean=validateReceiptQuantities(order.lines,quantities);
 const products=await store.all('products'),productMap=new Map(products.map(p=>[p.id,p]));
 const now=new Date().toISOString(),receiptId=id();
 const receipt={id:receiptId,purchaseOrderId:order.id,purchaseOrderNumber:order.number,warehouseId:order.warehouseId,receivedAt:now,status:'booked',lines:[]};
 await store.put('receipts',receipt);
 for(let index=0;index<order.lines.length;index++){
  const quantity=clean[index];
  if(!quantity)continue;
  const line=order.lines[index],p=productMap.get(line.productId);
  if(!p)throw Error('PRODUCT_NOT_FOUND');
  const b={...(p.stockByWarehouse||{main:Number(p.stock||0)})};
  const before=Number(b[order.warehouseId]||0),after=before+quantity;
  b[order.warehouseId]=after;
  const updated={...p,stockByWarehouse:b,stock:total({stockByWarehouse:b}),cost:Number(line.unitCost),updatedAt:now};
  await store.put('products',updated);
  productMap.set(p.id,updated);
  const movement={id:receiptId+'-'+index,receiptId,purchaseOrderId:order.id,productId:p.id,productName:p.name,barcode:p.barcode,type:'in',quantity,before,after,warehouseId:order.warehouseId,note:'Wareneingang '+order.number+' · '+receiptId.slice(0,8),createdAt:now};
  await store.put('movements',movement);
  line.receivedQty=Number(line.receivedQty||0)+quantity;
  receipt.lines.push({productId:p.id,productName:p.name,quantity,unitCost:Number(line.unitCost),movementId:movement.id});
  await store.put('purchaseOrders',order);
  await store.put('receipts',receipt);
 }
 order.status=purchaseOrderStatus(order.lines);
 order.updatedAt=now;
 await store.put('purchaseOrders',order);
 return {order,receipt};
}


export function validateReturn(input){
 const type=input?.type,quantity=Number(input?.quantity),condition=input?.condition;
 if(!['customer_return','supplier_return'].includes(type))throw Error('INVALID_RETURN_TYPE');
 if(!input.productId||!input.warehouseId||!String(input.reason||'').trim()||(type==='supplier_return'&&!input.supplierId))throw Error('INVALID_RETURN');
 if(!Number.isInteger(quantity)||quantity<=0)throw Error('INVALID_RETURN_QUANTITY');
 if(!['resellable','damaged','quarantine'].includes(condition))throw Error('INVALID_RETURN_CONDITION');
 return {...input,type,quantity,reason:String(input.reason).trim(),reference:String(input.reference||'').trim(),notes:String(input.notes||'').trim()};
}

export async function createReturn(input){
 const clean=validateReturn(input);
 const [products,warehouses,suppliers]=await Promise.all([store.all('products'),store.all('warehouses'),store.all('suppliers')]);
 const product=products.find(p=>p.id===clean.productId);
 if(!product)throw Error('PRODUCT_NOT_FOUND');
 if(!warehouses.some(w=>w.id===clean.warehouseId))throw Error('WAREHOUSE_NOT_FOUND');
 const supplier=clean.type==='supplier_return'?suppliers.find(s=>s.id===clean.supplierId):null;
 if(clean.type==='supplier_return'&&!supplier)throw Error('SUPPLIER_NOT_FOUND');
 const balances={...(product.stockByWarehouse||{main:Number(product.stock||0)})};
 const before=Number(balances[clean.warehouseId]||0);
 const stockImpact=clean.type==='customer_return'&&clean.condition==='resellable'?'in':clean.type==='supplier_return'?'out':'none';
 if(stockImpact==='out'&&before-(await getReservedQuantity(product.id,clean.warehouseId))<clean.quantity)throw Error('INSUFFICIENT_STOCK');
 const now=new Date().toISOString(),returnId=id();
 let after=before;
 if(stockImpact==='in'||stockImpact==='out'){
  after=stockImpact==='in'?before+clean.quantity:before-clean.quantity;
  balances[clean.warehouseId]=after;
  const updated={...product,stockByWarehouse:balances,stock:total({stockByWarehouse:balances}),updatedAt:now};
  await store.put('products',updated);
 }
 const movement={id:returnId+'-movement',returnId,productId:product.id,productName:product.name,barcode:product.barcode||'',type:stockImpact==='in'?'in':stockImpact==='out'?'out':'return-blocked',quantity:clean.quantity,before,after,warehouseId:clean.warehouseId,note:(clean.type==='customer_return'?'Kundenretoure':'Lieferantenretoure')+' · '+clean.reason,createdAt:now};
 await store.put('movements',movement);
 const record={id:returnId,...clean,supplierName:supplier?.name||'',productName:product.name,barcode:product.barcode||'',stockImpact,stockBefore:before,stockAfter:after,movementId:movement.id,status:'booked',createdAt:now};
 await store.put('returns',record);
 return record;
}


export function validateReservation(input){
 const quantity=Number(input?.quantity);
 if(!input?.productId||!input?.warehouseId||!String(input?.orderReference||'').trim())throw Error('INVALID_RESERVATION');
 if(!Number.isInteger(quantity)||quantity<=0)throw Error('INVALID_RESERVATION_QUANTITY');
 return {...input,quantity,orderReference:String(input.orderReference).trim(),customer:String(input.customer||'').trim(),notes:String(input.notes||'').trim()};
}
export async function createReservation(input){
 const clean=validateReservation(input);
 const [products,warehouses]=await Promise.all([store.all('products'),store.all('warehouses')]);
 const product=products.find(p=>p.id===clean.productId);
 if(!product)throw Error('PRODUCT_NOT_FOUND');
 if(!warehouses.some(w=>w.id===clean.warehouseId))throw Error('WAREHOUSE_NOT_FOUND');
 const available=await getAvailableStock(product,clean.warehouseId);
 if(available<clean.quantity)throw Error('INSUFFICIENT_AVAILABLE_STOCK');
 const now=new Date().toISOString();
 const reservation={id:id(),...clean,productName:product.name,barcode:product.barcode||'',fulfilledQty:0,releasedQty:0,status:'active',createdAt:now,updatedAt:now};
 await store.put('reservations',reservation);
 return reservation;
}
export async function fulfillReservation(reservationId,quantity){
 const reservations=await store.all('reservations'),reservation=reservations.find(r=>r.id===reservationId);
 if(!reservation||!['active','partially_fulfilled'].includes(reservation.status))throw Error('RESERVATION_NOT_ACTIVE');
 const qty=Number(quantity),remaining=Number(reservation.quantity)-Number(reservation.fulfilledQty||0)-Number(reservation.releasedQty||0);
 if(!Number.isInteger(qty)||qty<=0||qty>remaining)throw Error('INVALID_FULFILLMENT_QUANTITY');
 const products=await store.all('products'),product=products.find(p=>p.id===reservation.productId);
 if(!product)throw Error('PRODUCT_NOT_FOUND');
 const balances={...(product.stockByWarehouse||{main:Number(product.stock||0)})},before=Number(balances[reservation.warehouseId]||0);
 if(before<qty)throw Error('INSUFFICIENT_STOCK');
 const now=new Date().toISOString(),after=before-qty;
 balances[reservation.warehouseId]=after;
 const updated={...product,stockByWarehouse:balances,stock:total({stockByWarehouse:balances}),updatedAt:now};
 await store.put('products',updated);
 const movementId=id();
 await store.put('movements',{id:movementId,reservationId,productId:product.id,productName:product.name,barcode:product.barcode||'',type:'out',quantity:qty,before,after,warehouseId:reservation.warehouseId,note:'Reservierung '+reservation.orderReference+' ausgeliefert',createdAt:now});
 reservation.fulfilledQty=Number(reservation.fulfilledQty||0)+qty;
 reservation.status=reservation.fulfilledQty+Number(reservation.releasedQty||0)>=Number(reservation.quantity)?(reservation.releasedQty?'released':'fulfilled'):'partially_fulfilled';
 reservation.updatedAt=now;reservation.lastMovementId=movementId;
 await store.put('reservations',reservation);
 return {reservation,product:updated,movementId};
}
export async function releaseReservation(reservationId){
 const reservations=await store.all('reservations'),reservation=reservations.find(r=>r.id===reservationId);
 if(!reservation||!['active','partially_fulfilled'].includes(reservation.status))throw Error('RESERVATION_NOT_ACTIVE');
 const remaining=Number(reservation.quantity)-Number(reservation.fulfilledQty||0)-Number(reservation.releasedQty||0);
 if(remaining<=0)throw Error('RESERVATION_NOT_ACTIVE');
 reservation.releasedQty=Number(reservation.releasedQty||0)+remaining;
 reservation.status='released';reservation.updatedAt=new Date().toISOString();
 await store.put('reservations',reservation);
 return reservation;
}
