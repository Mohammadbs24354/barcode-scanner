import { useState } from 'react';

export default function SubmitPanel({ data }) {
  const [copied, setCopied] = useState(false);

  const payload = {
    barcode: data.barcode,
    name: data.name,
    brand: data.brand,
    category: data.category,
    description: data.description,
    image: data.image,
    submittedAt: new Date().toISOString(),
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `produkt-${data.barcode || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid rgba(233,84,32,0.5)', background: '#3D1230' }}
    >
      {/* Header */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ background: 'rgba(233,84,32,0.15)', borderBottom: '1px solid rgba(233,84,32,0.3)' }}
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E95420" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span className="text-sm font-medium" style={{ color: '#E95420' }}>Daten bereit zum Senden</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1 rounded transition-all"
            style={{
              background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)',
              border: copied ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(255,255,255,0.15)',
              color: copied ? '#4ade80' : '#AEA79F',
            }}
          >
            {copied ? '✓ Kopiert' : 'Kopieren'}
          </button>
          <button
            onClick={handleDownload}
            className="text-xs px-3 py-1 rounded transition-all"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#AEA79F',
            }}
          >
            ↓ JSON
          </button>
        </div>
      </div>

      {/* Payload preview */}
      <div className="p-5">
        <pre
          className="text-xs rounded p-4 overflow-x-auto"
          style={{
            background: '#2C0A1E',
            color: '#AEA79F',
            border: '1px solid rgba(255,255,255,0.06)',
            fontFamily: 'ui-monospace, Consolas, monospace',
            lineHeight: '1.6',
          }}
        >
          {JSON.stringify(payload, null, 2)
            .split('\n')
            .map((line, i) => {
              const keyMatch = line.match(/^(\s*)("[\w]+")(:)/);
              const valStr = keyMatch ? line.slice(keyMatch[0].length) : null;
              return keyMatch ? (
                <span key={i}>
                  {keyMatch[1]}
                  <span style={{ color: '#E95420' }}>{keyMatch[2]}</span>
                  {keyMatch[3]}
                  <span style={{ color: '#fff' }}>{valStr}</span>
                  {'\n'}
                </span>
              ) : (
                <span key={i}>{line}{'\n'}</span>
              );
            })}
        </pre>

        <p className="text-xs mt-3 text-center" style={{ color: 'rgba(174,167,159,0.5)' }}>
          Daten können kopiert oder als JSON-Datei heruntergeladen werden
        </p>
      </div>
    </div>
  );
}
