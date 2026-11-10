const DB_NAME = 'stockflow-local';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('INDEXEDDB_UNAVAILABLE'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of ['products', 'movements', 'warehouses']) {
        if (db.objectStoreNames.contains(name)) continue;
        const store = db.createObjectStore(name, { keyPath: 'id' });
        if (name === 'products') store.createIndex('barcode', 'barcode');
        if (name === 'movements') {
          store.createIndex('productId', 'productId');
          store.createIndex('createdAt', 'createdAt');
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const store = {
  async all(name) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(name, 'readonly');
      const request = tx.objectStore(name).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },
  async put(name, item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(name, 'readwrite');
      tx.objectStore(name).put(item);
      tx.oncomplete = () => { db.close(); resolve(item); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },
  async remove(name, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(name, 'readwrite');
      tx.objectStore(name).delete(key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
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
