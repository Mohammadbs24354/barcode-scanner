const CACHE_NAME='stockflow-records-v1';
const STORE_NAMES=new Set(['products','movements','warehouses','suppliers','purchaseOrders','receipts','returns','reservations','countSessions','storageLocations','salesOrders']);
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
export async function fulfillReservation(reservationId,quantity,metadata={}){
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
 await store.put('movements',{id:movementId,reservationId,salesOrderId:metadata.salesOrderId||reservation.salesOrderId||'',orderNumber:metadata.orderNumber||reservation.orderReference||'',productId:product.id,productName:product.name,barcode:product.barcode||'',type:'out',quantity:qty,before,after,warehouseId:reservation.warehouseId,note:'Auftrag '+(metadata.orderNumber||reservation.orderReference||'')+' ausgeliefert',createdAt:now});
 reservation.fulfilledQty=Number(reservation.fulfilledQty||0)+qty;
 reservation.status=reservation.fulfilledQty+Number(reservation.releasedQty||0)>=Number(reservation.quantity)?(reservation.releasedQty?'released':'fulfilled'):'partially_fulfilled';
 reservation.updatedAt=now;reservation.lastMovementId=movementId;
 await store.put('reservations',reservation);
 return {reservation,product:updated,movementId};
}
export async function releaseReservation(reservationId,options={}){
 const reservations=await store.all('reservations'),reservation=reservations.find(r=>r.id===reservationId);
 if(!reservation||!['active','partially_fulfilled'].includes(reservation.status))throw Error('RESERVATION_NOT_ACTIVE');
 if(reservation.salesOrderId&&options.salesOrderId!==reservation.salesOrderId)throw Error('ORDER_RESERVATION_MANAGED_BY_ORDER');
 const remaining=Number(reservation.quantity)-Number(reservation.fulfilledQty||0)-Number(reservation.releasedQty||0);
 if(remaining<=0)throw Error('RESERVATION_NOT_ACTIVE');
 reservation.releasedQty=Number(reservation.releasedQty||0)+remaining;
 reservation.status='released';reservation.updatedAt=new Date().toISOString();
 await store.put('reservations',reservation);
 return reservation;
}


export function validateInventoryCounts(lines,counts){
 if(!Array.isArray(lines)||!Array.isArray(counts)||lines.length!==counts.length)throw Error('INVALID_COUNT');
 return lines.map((line,index)=>{if(counts[index]===null||counts[index]===undefined||counts[index]==='')throw Error('INVALID_COUNT_QUANTITY');const quantity=Number(counts[index]);if(!Number.isInteger(quantity)||quantity<0)throw Error('INVALID_COUNT_QUANTITY');return quantity});
}
export async function createInventoryCount(warehouseId){
 const [warehouses,products]=await Promise.all([store.all('warehouses'),store.all('products')]);
 if(!warehouses.some(w=>w.id===warehouseId))throw Error('WAREHOUSE_NOT_FOUND');
 const now=new Date().toISOString(),session={id:id(),number:'INV-'+Date.now().toString().slice(-8),warehouseId,status:'open',createdAt:now,updatedAt:now,lines:products.map(p=>({productId:p.id,productName:p.name,barcode:p.barcode||'',expectedQty:Number((p.stockByWarehouse||{main:Number(p.stock||0)})[warehouseId]||0),countedQty:null}))};
 await store.put('countSessions',session);
 return session;
}
export async function completeInventoryCount(sessionId,counts){
 const sessions=await store.all('countSessions'),session=sessions.find(s=>s.id===sessionId);
 if(!session||session.status!=='open')throw Error('COUNT_NOT_OPEN');
 const clean=validateInventoryCounts(session.lines,counts);
 const products=await store.all('products'),productMap=new Map(products.map(p=>[p.id,p]));
 const now=new Date().toISOString(),changes=[];
 for(let index=0;index<session.lines.length;index++){
  const line=session.lines[index],counted=clean[index],product=productMap.get(line.productId);
  if(!product)throw Error('PRODUCT_NOT_FOUND');
  const balances={...(product.stockByWarehouse||{main:Number(product.stock||0)})},before=Number(balances[session.warehouseId]||0);
  const reserved=await getReservedQuantity(product.id,session.warehouseId);
  if(counted<reserved)throw Error('COUNT_BELOW_RESERVED');
  const delta=counted-before;
  line.countedQty=counted;line.delta=delta;
  if(delta!==0){
   balances[session.warehouseId]=counted;
   const updated={...product,stockByWarehouse:balances,stock:total({stockByWarehouse:balances}),updatedAt:now};
   await store.put('products',updated);productMap.set(product.id,updated);
   const movement={id:session.id+'-'+index,countSessionId:session.id,productId:product.id,productName:product.name,barcode:product.barcode||'',type:'adjust',quantity:Math.abs(delta),before,after:counted,warehouseId:session.warehouseId,note:'Inventur '+session.number+' · '+(delta>0?'+':'')+delta,createdAt:now};
   await store.put('movements',movement);changes.push(movement);
  }
 }
 session.status='completed';session.completedAt=now;session.updatedAt=now;// Each line already contains the counted quantity and delta calculated against the current physical stock.
 await store.put('countSessions',session);
 return {session,changes};
}
export async function cancelInventoryCount(sessionId){
 const sessions=await store.all('countSessions'),session=sessions.find(s=>s.id===sessionId);
 if(!session||session.status!=='open')throw Error('COUNT_NOT_OPEN');
 session.status='cancelled';session.updatedAt=new Date().toISOString();
 await store.put('countSessions',session);return session;
}


export function validateStorageLocation(input){
 const code=String(input?.code||'').trim().toUpperCase();
 const warehouseId=String(input?.warehouseId||'').trim();
 const capacity=input?.capacity===''||input?.capacity===null||input?.capacity===undefined?null:Number(input.capacity);
 if(!warehouseId||!code)throw Error('INVALID_STORAGE_LOCATION');
 if(capacity!==null&&(!Number.isInteger(capacity)||capacity<=0))throw Error('INVALID_STORAGE_CAPACITY');
 return {...input,warehouseId,code,name:String(input.name||code).trim(),zone:String(input.zone||'').trim(),aisle:String(input.aisle||'').trim(),rack:String(input.rack||'').trim(),shelf:String(input.shelf||'').trim(),bin:String(input.bin||'').trim(),capacity,description:String(input.description||'').trim()};
}
export async function createStorageLocation(input){
 const clean=validateStorageLocation(input),[warehouses,locations]=await Promise.all([store.all('warehouses'),store.all('storageLocations')]);
 if(!warehouses.some(w=>w.id===clean.warehouseId))throw Error('WAREHOUSE_NOT_FOUND');
 if(locations.some(l=>l.warehouseId===clean.warehouseId&&l.code===clean.code))throw Error('STORAGE_LOCATION_EXISTS');
 const record={id:id(),...clean,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 await store.put('storageLocations',record);return record;
}
export async function updateStorageLocation(locationId,input){
 const locations=await store.all('storageLocations'),existing=locations.find(l=>l.id===locationId);
 if(!existing)throw Error('STORAGE_LOCATION_NOT_FOUND');
 const clean=validateStorageLocation(input);
 if(clean.warehouseId!==existing.warehouseId)throw Error('STORAGE_LOCATION_WAREHOUSE_IMMUTABLE');
 if(locations.some(l=>l.id!==locationId&&l.warehouseId===clean.warehouseId&&l.code===clean.code))throw Error('STORAGE_LOCATION_EXISTS');
 const updated={...existing,...clean,updatedAt:new Date().toISOString()};
 await store.put('storageLocations',updated);return updated;
}
export async function deleteStorageLocation(locationId){
 const [locations,products]=await Promise.all([store.all('storageLocations'),store.all('products')]);
 const location=locations.find(l=>l.id===locationId);
 if(!location)throw Error('STORAGE_LOCATION_NOT_FOUND');
 if(products.some(p=>p.storageLocationByWarehouse?.[location.warehouseId]===locationId))throw Error('STORAGE_LOCATION_IN_USE');
 await store.remove('storageLocations',locationId);return true;
}
export async function assignProductStorageLocation(productId,warehouseId,locationId){
 const [products,warehouses,locations]=await Promise.all([store.all('products'),store.all('warehouses'),store.all('storageLocations')]);
 const product=products.find(p=>p.id===productId);
 if(!product)throw Error('PRODUCT_NOT_FOUND');
 if(!warehouses.some(w=>w.id===warehouseId))throw Error('WAREHOUSE_NOT_FOUND');
 if(locationId&&!locations.some(l=>l.id===locationId&&l.warehouseId===warehouseId))throw Error('STORAGE_LOCATION_WAREHOUSE_MISMATCH');
 const assignments={...(product.storageLocationByWarehouse||{})};
 if(locationId)assignments[warehouseId]=locationId;else delete assignments[warehouseId];
 const updated={...product,storageLocationByWarehouse:assignments,updatedAt:new Date().toISOString()};
 await store.put('products',updated);return updated;
}


export function validateSalesOrder(input){
 const customer=String(input?.customer||'').trim(),warehouseId=String(input?.warehouseId||'').trim();
 if(!customer||!warehouseId||!Array.isArray(input?.lines)||!input.lines.length)throw Error('INVALID_SALES_ORDER');
 const seenProducts=new Set();
 const lines=input.lines.map(line=>{
  const productId=String(line?.productId||'').trim(),quantity=Number(line?.quantity),unitPrice=Number(line?.unitPrice??0);
  if(!productId)throw Error('INVALID_SALES_ORDER_LINE');
  if(seenProducts.has(productId))throw Error('DUPLICATE_SALES_ORDER_PRODUCT');
  seenProducts.add(productId);
  if(!Number.isInteger(quantity)||quantity<=0)throw Error('INVALID_SALES_ORDER_QUANTITY');
  if(!Number.isFinite(unitPrice)||unitPrice<0)throw Error('INVALID_SALES_ORDER_PRICE');
  return {productId,quantity,unitPrice};
 });
 return {customer,customerEmail:String(input.customerEmail||'').trim(),customerAddress:String(input.customerAddress||'').trim(),warehouseId,notes:String(input.notes||'').trim(),lines};
}
export function assertSalesOrderTransition(from,to){
 const allowed={draft:['confirmed','cancelled'],confirmed:['picking','cancelled'],picking:['packed','cancelled'],packed:['shipping','cancelled'],shipping:['shipped'],shipped:[],cancelled:[]};
 if(!allowed[from]?.includes(to))throw Error('INVALID_SALES_ORDER_TRANSITION');
 return true;
}
export function salesOrderTotal(lines){return lines.reduce((sum,line)=>sum+Number(line.quantity||0)*Number(line.unitPrice||0),0)}
export async function createSalesOrder(input){
 const clean=validateSalesOrder(input),[products,warehouses]=await Promise.all([store.all('products'),store.all('warehouses')]);
 if(!warehouses.some(w=>w.id===clean.warehouseId))throw Error('WAREHOUSE_NOT_FOUND');
 const productMap=new Map(products.map(p=>[p.id,p]));
 const lines=clean.lines.map(line=>{const product=productMap.get(line.productId);if(!product)throw Error('PRODUCT_NOT_FOUND');return {...line,productName:product.name,barcode:product.barcode||'',pickedQty:0,reservationId:null}});
 const now=new Date().toISOString(),order={id:id(),number:'SO-'+Date.now().toString().slice(-8),...clean,lines,status:'draft',total:salesOrderTotal(lines),createdAt:now,updatedAt:now};
 await store.put('salesOrders',order);return order;
}
export async function confirmSalesOrder(orderId){
 const orders=await store.all('salesOrders'),order=orders.find(o=>o.id===orderId);
 if(!order)throw Error('SALES_ORDER_NOT_FOUND');
 assertSalesOrderTransition(order.status,'confirmed');
 const [products,warehouses]=await Promise.all([store.all('products'),store.all('warehouses')]);
 if(!warehouses.some(w=>w.id===order.warehouseId))throw Error('WAREHOUSE_NOT_FOUND');
 const productMap=new Map(products.map(p=>[p.id,p])),required=new Map();
 for(const line of order.lines){if(!productMap.has(line.productId))throw Error('PRODUCT_NOT_FOUND');required.set(line.productId,(required.get(line.productId)||0)+Number(line.quantity))}
 for(const [productId,quantity] of required){if(await getAvailableStock(productMap.get(productId),order.warehouseId)<quantity)throw Error('INSUFFICIENT_AVAILABLE_STOCK')}
 const created=[];
 try{
  for(const line of order.lines){
   const reservation=await createReservation({productId:line.productId,warehouseId:order.warehouseId,quantity:line.quantity,orderReference:order.number,customer:order.customer,notes:'Automatisch für Kundenauftrag reserviert',salesOrderId:order.id});
   line.reservationId=reservation.id;created.push(reservation.id);
  }
  order.status='confirmed';order.confirmedAt=new Date().toISOString();order.updatedAt=order.confirmedAt;
  await store.put('salesOrders',order);return order;
 }catch(error){
  for(const reservationId of created){try{await releaseReservation(reservationId,{salesOrderId:order.id})}catch{/* Compensating release is best effort in non-transactional CacheStorage. */}}
  throw error;
 }
}
export async function updateSalesOrderPickingLine(orderId,productId,pickedQty){
 const orders=await store.all('salesOrders'),order=orders.find(o=>o.id===orderId);
 if(!order||order.status!=='picking')throw Error('SALES_ORDER_NOT_PICKING');
 const line=order.lines.find(item=>item.productId===productId);
 if(!line)throw Error('SALES_ORDER_LINE_NOT_FOUND');
 const quantity=Number(pickedQty);
 if(!Number.isInteger(quantity)||quantity<0||quantity>line.quantity)throw Error('INVALID_PICKED_QUANTITY');
 line.pickedQty=quantity;order.updatedAt=new Date().toISOString();await store.put('salesOrders',order);return order;
}
export async function startSalesOrderPicking(orderId){
 const orders=await store.all('salesOrders'),order=orders.find(o=>o.id===orderId);
 if(!order)throw Error('SALES_ORDER_NOT_FOUND');
 assertSalesOrderTransition(order.status,'picking');
 order.status='picking';order.pickingStartedAt=new Date().toISOString();order.updatedAt=order.pickingStartedAt;await store.put('salesOrders',order);return order;
}
export async function packSalesOrder(orderId){
 const orders=await store.all('salesOrders'),order=orders.find(o=>o.id===orderId);
 if(!order)throw Error('SALES_ORDER_NOT_FOUND');
 assertSalesOrderTransition(order.status,'packed');
 if(order.lines.some(line=>Number(line.pickedQty||0)<Number(line.quantity)))throw Error('PICKING_INCOMPLETE');
 order.status='packed';order.packedAt=new Date().toISOString();order.updatedAt=order.packedAt;await store.put('salesOrders',order);return order;
}
export async function shipSalesOrder(orderId){
 const orders=await store.all('salesOrders'),order=orders.find(o=>o.id===orderId);
 if(!order)throw Error('SALES_ORDER_NOT_FOUND');
 if(order.status==='packed'){assertSalesOrderTransition(order.status,'shipping');order.status='shipping';order.shippingStartedAt=new Date().toISOString();order.updatedAt=order.shippingStartedAt;await store.put('salesOrders',order)}
 else if(order.status!=='shipping')throw Error('INVALID_SALES_ORDER_TRANSITION');
 const reservations=await store.all('reservations');
 for(const line of order.lines){
  const reservation=reservations.find(item=>item.id===line.reservationId);
  if(!reservation)throw Error('SALES_ORDER_RESERVATION_MISSING');
  const remaining=Number(reservation.quantity)-Number(reservation.fulfilledQty||0)-Number(reservation.releasedQty||0);
  if(Number(reservation.releasedQty||0)>0)throw Error('SALES_ORDER_RESERVATION_RELEASED');
  if(remaining>0)await fulfillReservation(reservation.id,remaining,{salesOrderId:order.id,orderNumber:order.number});
 }
 order.status='shipped';order.shippedAt=new Date().toISOString();order.updatedAt=order.shippedAt;await store.put('salesOrders',order);return order;
}
export async function cancelSalesOrder(orderId){
 const orders=await store.all('salesOrders'),order=orders.find(o=>o.id===orderId);
 if(!order)throw Error('SALES_ORDER_NOT_FOUND');
 assertSalesOrderTransition(order.status,'cancelled');
 if(order.status!=='draft'){
  const reservations=await store.all('reservations');
  for(const line of order.lines){const reservation=reservations.find(item=>item.id===line.reservationId);if(reservation&&['active','partially_fulfilled'].includes(reservation.status))await releaseReservation(reservation.id,{salesOrderId:order.id})}
 }
 order.status='cancelled';order.cancelledAt=new Date().toISOString();order.updatedAt=order.cancelledAt;await store.put('salesOrders',order);return order;
}
