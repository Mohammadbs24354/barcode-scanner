# StockFlow — Offline-first Inventory & Warehouse Workspace

## Features
- Barcode scanning and manual EAN/UPC entry with optional product lookup.
- Product catalog, prices, SKU, minimum stock and shelf location.
- Receipts, issues and adjustments assigned to a warehouse.
- Separate product quantities per warehouse and inter-warehouse transfers with paired movement records.
- Low-stock dashboard, stock valuation and movement history.
- Multiple warehouse locations.
- CSV product import/export and JSON backup export/restore.
- Responsive German UI.

## Storage — no database
No server database, IndexedDB or localStorage is used. Business records are JSON responses stored in the browser Cache API (CacheStorage). Data stays in this browser profile and is not synchronized across devices or users. Browser caches are best-effort and may be evicted; export JSON backups regularly. Cache API requires HTTPS or localhost.

## Run
```bash
npm install
npm run dev
npm run check
```

## Known boundaries
No accounts, shared multi-user access, cloud synchronization, or guaranteed durable server backup. CacheStorage is not a transactional database; avoid simultaneous edits from multiple tabs. A transfer writes a product record and two movement records; export a backup before important stock operations.
