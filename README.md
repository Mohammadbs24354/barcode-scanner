# StockFlow — Offline-first Inventory & Warehouse Workspace

## Features
- Barcode scanning and product catalog with optional external lookup.
- Stock receipts, issues and adjustments per warehouse.
- Multi-warehouse balances and transfer movements.
- Supplier directory and purchase orders with line items.
- Purchase order goods receipt updates warehouse stock and movement ledger.
- Low-stock dashboard, stock valuation and movement history.
- CSV product import/export and JSON backup export/restore.

## Storage — no database
No server database, IndexedDB or localStorage is used. Business records are JSON responses stored in the browser Cache API (CacheStorage). Data remains in this browser profile and is not synchronized across devices or users. Browser caches are best-effort and may be evicted; export JSON backups regularly. Cache API requires HTTPS or localhost.

## Run
```bash
npm install
npm run dev
npm run check
```

## Boundaries
No accounts, shared multi-user access, cloud synchronization or guaranteed durable server backup. CacheStorage is not transactional; avoid simultaneous edits in multiple tabs. Purchase order receiving currently books all remaining quantities in one receipt operation. Keep external backups before important stock operations.
