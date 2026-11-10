# StockFlow — Offline-first Inventory & Barcode Workspace

A local-first inventory workspace evolved from the original barcode scanner.

## Features
- Camera scanning and manual EAN/UPC barcode entry.
- Product catalog with SKU, category, prices, minimum stock and shelf location.
- Stock receipts, issues and adjustments with a movement ledger.
- Low-stock alerts, inventory valuation and recent activity dashboard.
- Multiple warehouse records.
- CSV import/export and JSON backup export.
- Responsive German-language UI.
- Optional UPCitemdb product lookup; manual product entry remains possible offline after the app is loaded.

## Storage — no database
No server database or browser database is used. Business records are serialized as JSON responses in the browser Cache API (CacheStorage), under the cache name stockflow-records-v1. Product lookup responses also use HTTP edge caching. Browser caches are best-effort storage and may be evicted by the browser or cleared by the user. Export JSON backups regularly. Data is isolated to one browser profile/device and is not synchronized between users or devices.

## Run
```bash
npm install
npm run dev
npm run check
```

## Deployment
Deploy with Vercel using Vite, build command npm run build and output directory dist. The Cache API requires a secure context (HTTPS or localhost).

## Current limitations
No cross-device synchronization, authentication, shared multi-user access or server-side backup. Multiple warehouse records exist, but product stock is currently a single local quantity rather than separate quantities per warehouse. Supplier purchase orders, reservations, per-warehouse allocation and audit-grade ERP workflows are future extensions.
