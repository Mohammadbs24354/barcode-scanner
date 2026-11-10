# StockFlow — Offline-first Inventory & Barcode Workspace

A local-first inventory workspace evolved from the original barcode scanner.

## Features
- Camera scanning and manual EAN/UPC barcode entry.
- Product catalog with SKU, category, prices, minimum stock and shelf location.
- Stock receipts, issues and stock adjustments with a movement ledger.
- Low-stock alerts, inventory valuation and recent activity dashboard.
- Multiple warehouse records.
- CSV import/export and JSON backup export.
- Responsive German-language UI.
- Optional UPCitemdb product lookup; manual product entry remains possible offline.

## Storage (no server database)
Business records are stored in browser IndexedDB under the name stockflow-local. This is persistent local browser storage, not a server database and not a shared cloud cache. Product lookup responses can use HTTP edge caching. Data is isolated to one browser profile/device; clearing browser site data can erase it. Export regular JSON backups.

## Run
```bash
npm install
npm run dev
npm run check
```

## Deployment
Deploy with Vercel using Vite, build command npm run build and output directory dist.

## Current limitations
No cross-device synchronization, authentication, shared multi-user access or server-side backup. Multiple warehouse records exist, but product stock is currently a single local quantity rather than separate quantities per warehouse. Supplier purchase orders, reservations, per-warehouse allocation and audit-grade ERP workflows are future extensions.
