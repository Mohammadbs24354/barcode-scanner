const CACHE_NAME='stockflow-records-v1';
const STORE_NAMES=new Set(['products','movements','warehouses','suppliers','purchaseOrders','receipts']);
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
export async function bookMovement(product,type,qty,note='',warehouseId='main'){qty=Number(qty);if(!Number.isFinite(qty)||qty<=0)throw Error('INVALID_QUANTITY');const balances={...(product.stockByWarehouse||{main:Number(product.stock||0)})},before=Number(balances[warehouseId]||0),after=type==='in'?before+qty:type==='out'?before-qty:qty;if(after<0)throw Error('INSUFFICIENT_STOCK');balances[warehouseId]=after;const updated={...product,stockByWarehouse:balances,stock:total({stockByWarehouse:balances}),updatedAt:new Date().toISOString()};await store.put('products',updated);await store.put('movements',{id:id(),productId:product.id,productName:product.name,barcode:product.barcode,type,quantity:qty,before,after,warehouseId,note,createdAt:new Date().toISOString()});return updated}
export async function transferStock(product,quantity,fromId,toId,note=''){const qty=Number(quantity);if(!Number.isFinite(qty)||qty<=0)throw Error('INVALID_QUANTITY');if(!fromId||!toId||fromId===toId)throw Error('INVALID_WAREHOUSE');const b={...(product.stockByWarehouse||{main:Number(product.stock||0)})},bf=Number(b[fromId]||0),bt=Number(b[toId]||0);if(bf<qty)throw Error('INSUFFICIENT_STOCK');b[fromId]=bf-qty;b[toId]=bt+qty;const updated={...product,stockByWarehouse:b,stock:total({stockByWarehouse:b}),updatedAt:new Date().toISOString()};await store.put('products',updated);const tid=id(),now=new Date().toISOString();await store.put('movements',{id:tid+'-out',transferId:tid,productId:product.id,productName:product.name,barcode:product.barcode,type:'transfer-out',quantity:qty,before:bf,after:b[fromId],warehouseId:fromId,targetWarehouseId:toId,note,createdAt:now});await store.put('movements',{id:tid+'-in',transferId:tid,productId:product.id,productName:product.name,barcode:product.barcode,type:'transfer-in',quantity:qty,before:bt,after:b[toId],warehouseId:toId,sourceWarehouseId:fromId,note,createdAt:now});return updated}
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
