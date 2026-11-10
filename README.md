# StockFlow — Offline-first Inventory & Warehouse Workspace

## Features
- Barcode scanning and product catalog with optional external product lookup.
- Stock receipts, issues and adjustments per warehouse.
- Multi-warehouse balances and transfer movements.
- Supplier directory, purchase orders, partial goods receipts and receipt history.
- Returns management for customer returns and supplier returns, including reasons, item condition, references and stock impact.
- Inventory reservations per product, warehouse and customer order, with partial fulfillment and release.
- Physical inventory count sessions with variance review and stock reconciliation.
- Warehouse bin locations with zones, aisles, racks, shelves and bins, including product-to-location assignments per warehouse.
- Customer sales orders with automatic stock reservations, picking, packing lists, delivery notes and shipment posting.
- Low-stock dashboard, stock valuation and movement history.
- CSV product import/export and JSON backup export/restore, including return records.
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
No accounts, shared multi-user access, cloud synchronization or guaranteed durable server backup. CacheStorage is not transactional; avoid simultaneous edits in multiple tabs. Purchase orders support multiple partial receipts; each receipt is recorded with its own stock movements and included in JSON backups. Supplier returns are linked to a supplier record. Return records, reservations, inventory count sessions and storage locations are included in version 7 JSON backups; customer sales orders are included in version 8 backups. Product-to-location assignments are stored on product records. Location assignments are descriptive only and do not change stock quantities; deleting an assigned location is blocked until products are reassigned. Physical counts are collected against a start snapshot; stock differences are posted as adjustment movements when the session is completed. A count below active reserved quantities is rejected. Active reservations reduce available stock without changing physical stock. Outbound movements, supplier returns and warehouse transfers cannot consume reserved quantities. Reservations can be partially fulfilled (which posts an outbound movement) or released. Customer orders reserve all lines only when confirmed, then move through picking and packing before shipment. Shipment fulfills the linked reservations and posts outbound movements once; an interrupted shipping operation remains in a resumable shipping state. Order-linked reservations are managed through the order workflow. Resellable customer returns increase available stock; damaged or quarantined customer returns are recorded without increasing available stock; supplier returns reduce stock only when sufficient quantity is available. CacheStorage is not transactional, so a failure during multi-record booking can leave partial writes; export backups regularly. CacheStorage is not transactional, so avoid concurrent edits in multiple tabs and keep external backups. PDF generation uses the browser's print-to-PDF feature. Barcode labels encode the displayed value as Code 39, rather than reproducing EAN/UPC symbology. Keep external backups before important stock operations.
