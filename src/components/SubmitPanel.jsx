import { useState } from 'react';

export default function SubmitPanel({ data }) {
  const [copyState, setCopyState] = useState('idle');

  const payload = {
    barcode: data.barcode,
    name: data.name,
    brand: data.brand,
    category: data.category,
    description: data.description,
    image: data.image,
    exportedAt: new Date().toISOString(),
  };

  const json = JSON.stringify(payload, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeBarcode = String(data.barcode || 'produkt').replace(/[^0-9]/g, '');

    link.href = url;
    link.download = `produkt-${safeBarcode || 'export'}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(34,197,94,0.35)', background: '#3D1230' }} aria-label="Produktdaten exportieren">
      <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3" style={{ background: 'rgba(34,197,94,0.1)', borderBottom: '1px solid rgba(34,197,94,0.2)' }}>
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h2 className="text-sm font-medium" style={{ color: '#4ade80' }}>Export bereit</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleCopy} className="text-xs px-3 py-2 rounded transition-colors" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
            {copyState === 'copied' ? '✓ Kopiert' : 'JSON kopieren'}
          </button>
          <button type="button" onClick={handleDownload} className="text-xs px-3 py-2 rounded transition-colors" style={{ background: '#E95420', color: '#fff' }}>
            JSON herunterladen
          </button>
        </div>
      </div>

      <div className="p-5">
        {copyState === 'error' && <p role="alert" className="text-xs mb-3" style={{ color: '#f87171' }}>Kopieren nicht möglich. Bitte lade stattdessen die JSON-Datei herunter.</p>}
        <pre className="text-xs rounded p-4 overflow-x-auto whitespace-pre-wrap break-words" style={{ background: '#2C0A1E', color: '#AEA79F', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'ui-monospace, Consolas, monospace', lineHeight: '1.6' }}>
          {json}
        </pre>
        <p className="text-xs mt-3 text-center" style={{ color: 'rgba(174,167,159,0.65)' }}>
          Die Daten werden lokal als JSON exportiert. Es findet kein Upload auf einen Server statt.
        </p>
      </div>
    </section>
  );
}
