# Barcode Scanner

Eine responsive React-Anwendung zum Scannen und Erfassen von Produkt-Barcodes. Produktinformationen werden über die UPCitemdb Trial API gesucht und können anschließend bearbeitet sowie als JSON exportiert werden.

## Funktionen

- Barcode-Erfassung mit der Geräte-Kamera (bevorzugt Rückkamera)
- Manuelle Eingabe von EAN-8, UPC-A, EAN-13 und GTIN-14
- Prüfung der GTIN-Prüfziffer vor einer API-Anfrage
- Produktname, Marke, Kategorie, Beschreibung und Bild übernehmen
- Produktdaten vor dem Export bearbeiten
- JSON in die Zwischenablage kopieren oder als Datei herunterladen
- Verständliche Fehlerzustände für ungültige Codes, fehlende Produkte, Netzwerkfehler und API-Limits
- Responsive Oberfläche für Smartphone und Desktop

## Technologie

- React 19
- Vite 8
- Tailwind CSS 4
- html5-qrcode
- Vercel Serverless Functions
- UPCitemdb Trial API

## Lokal starten

Voraussetzung: eine aktuelle Node.js-Version, die Vite 8 unterstützt.

```bash
npm install
npm run dev
```

Die lokale Vite-Konfiguration leitet API-Aufrufe an UPCitemdb weiter. Für einen lokalen Test der Vercel-Serverless-Function kann die Vercel CLI mit `vercel dev` verwendet werden.

## Qualität prüfen

```bash
npm run lint
npm test
npm run build
# oder alle Prüfungen zusammen:
npm run check
```

## Deployment auf Vercel

1. Dieses Repository mit Vercel verbinden.
2. Framework Preset: Vite.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Deploy starten.

Die Funktion unter `api/prod/trial/lookup.js` wird von Vercel automatisch als Serverless API bereitgestellt. Es ist keine eigene Datenbank und keine zusätzliche Umgebungsvariable erforderlich.

## Hinweise

- Der Kamerazugriff benötigt HTTPS (Vercel stellt dies standardmäßig bereit) oder localhost.
- Die Verfügbarkeit von Produktdaten hängt von der UPCitemdb-Datenbank und deren Trial-Nutzungslimits ab.
- Produktänderungen werden nicht dauerhaft gespeichert. Der Export erstellt eine lokale JSON-Datei oder kopiert die Daten in die Zwischenablage.
- Ein Barcode identifiziert einen Artikel, garantiert aber nicht, dass die externe Datenbank Produktinformationen enthält.

## Projektstruktur

```text
api/
  prod/trial/lookup.js
src/
  components/
  pages/Home.jsx
  services/api.js
  utils/barcode.js
tests/
  barcode.test.js
```
