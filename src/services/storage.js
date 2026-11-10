const CACHE_NAME = 'stockflow-records-v1';
const STORE_NAMES = new Set(['products', 'movements', 'warehouses']);

function recordUrl(storeName, key) {
  if (!STORE_NAMES.has(storeName)) throw new Error('INVALID_STORE');
  return new URL('/__stockflow_cache__/' + storeName + '/' + encodeURIComponent(key), location.origin).href;
}

async function openCache() {
  if (!('caches' in window)) throw new Error('CACHE_API_UNAVAILABLE');
  return caches.open(CACHE_NAME);
}

export const store = {
  async all(storeName) {
    const cache = await openCache();
    const requests = (await cache.keys()).filter(request =>
      new URL(request.url).pathname.startsWith('/__stockflow_cache__/' + storeName + '/')
    );
    const values = await Promise.all(requests.map(async request => {
      const response = await cache.match(request);
      return response ? response.json() : null;
    }));
    return values.filter(Boolean);
  },
  async put(storeName, item) {
    const cache = await openCache();
    await cache.put(recordUrl(storeName, item.id), new Response(JSON.stringify(item), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }));
    return item;
  },
  async remove(storeName, key) {
    const cache = await openCache();
    await cache.delete(recordUrl(storeName, key));
  },
};

export const id = () =>
  globalThis.crypto?.randomUUID?.() ||
  'sf-' + Date.now() + '-' + Math.random().toString(36).slice(2);

export async function initStore() {
  if (!(await store.all('warehouses')).length) {
    await store.put('warehouses', {
      id: 'main',
      name: 'Hauptlager',
      code: 'WH-001',
      createdAt: new Date().toISOString(),
    });
  }
}

export async function bookMovement(product, type, qty, note = '') {
  qty = Number(qty);
  if (!Number.isFinite(qty) || qty <= 0) throw new Error('INVALID_QUANTITY');
  const before = Number(product.stock || 0);
  const after = type === 'in' ? before + qty : type === 'out' ? before - qty : qty;
  if (after < 0) throw new Error('INSUFFICIENT_STOCK');
  const updated = { ...product, stock: after, updatedAt: new Date().toISOString() };
  await store.put('products', updated);
  await store.put('movements', {
    id: id(),
    productId: product.id,
    productName: product.name,
    barcode: product.barcode,
    type,
    quantity: qty,
    before,
    after,
    note,
    createdAt: new Date().toISOString(),
  });
  return updated;
}
