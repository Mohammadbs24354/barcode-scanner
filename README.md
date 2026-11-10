# StockFlow — Offline-first Inventory & Warehouse Workspace

## Features
- Barcode scanning and product catalog with optional external product lookup.
- Stock receipts, issues and adjustments per warehouse.
- Multi-warehouse balances and transfer movements.
- Supplier directory, purchase orders and goods receipts.
- Low-stock dashboard, stock valuation and movement history.
- CSV product import/export and JSON backup export/restore.
- Printable Code 39 barcode labels for selected products.
- Purchase order print layout and inventory report; use the browser print dialog to save either as PDF.
- Excel-compatible Spreadsheet XML export (.xls) with Products, Movements and Purchase Orders worksheets.
- Installable PWA manifest and service worker for app-shell caching and offline navigation after the app has been loaded.

## Storage — no database
No server database, IndexedDB or localStorage is used. Business records are JSON responses stored in the browser Cache API (CacheStorage). Data remains in this browser profile and is not synchronized across devices or users. Browser caches are best-effort and may be evicted; export JSON backups regularly. Cache API requires HTTPS or localhost.

The service worker uses a separate cache for static application files. It does not store or replace the business records cache.

## Run
```bash
npm install
npm run dev
npm run check
```

## Boundaries
No accounts, shared multi-user access, cloud synchronization or guaranteed durable server backup. CacheStorage is not transactional; avoid simultaneous edits in multiple tabs. Purchase order receiving currently books all remaining quantities in one receipt operation. PDF generation uses the browser's print-to-PDF feature. Barcode labels encode the displayed value as Code 39, rather than reproducing EAN/UPC symbology. Keep external backups before important stock operations.
