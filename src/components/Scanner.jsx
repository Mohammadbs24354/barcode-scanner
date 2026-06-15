import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function Scanner({ onScan }) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const [lastCode, setLastCode] = useState('');
  const [manualInput, setManualInput] = useState('');
  const scannerRef = useRef(null);
  const containerId = 'qr-reader';

  const startScanner = async () => {
    setError('');
    setActive(true);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (_) {}
      scannerRef.current = null;
    }
    setActive(false);
  };

  useEffect(() => {
    if (!active) return;

    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          if (decodedText === lastCode) return;
          setLastCode(decodedText);
          onScan(decodedText);
          stopScanner();
        },
        () => {}
      )
      .catch((err) => {
        const msg = String(err).toLowerCase();
        if (msg.includes('permission') || msg.includes('notallowed')) {
          setError('Kamerazugriff nicht möglich.');
        } else {
          setError('Kamera konnte nicht gestartet werden.');
        }
        setActive(false);
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [active]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const code = manualInput.trim();
    if (!code) return;
    setLastCode(code);
    setManualInput('');
    onScan(code);
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: '#3D1230', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Card header */}
      <div
        className="px-5 py-3 flex items-center gap-2"
        style={{ background: '#2C0A1E', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E95420" strokeWidth="2">
          <rect x="2" y="3" width="6" height="6" rx="1"/><rect x="16" y="3" width="6" height="6" rx="1"/>
          <rect x="2" y="15" width="6" height="6" rx="1"/><path d="M22 22h-6v-6M16 16h6M22 16v6"/>
        </svg>
        <span className="text-sm font-medium text-white">Barcode Scanner</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Camera button */}
        {!active ? (
          <button
            onClick={startScanner}
            className="w-full font-medium py-2.5 px-5 rounded text-white text-sm transition-all duration-150 active:scale-95 flex items-center justify-center gap-2"
            style={{ background: '#E95420' }}
            onMouseEnter={e => e.target.style.background = '#C94411'}
            onMouseLeave={e => e.target.style.background = '#E95420'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Kamera starten
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="w-full font-medium py-2.5 px-5 rounded text-white text-sm transition-all duration-150 active:scale-95"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            Kamera stoppen
          </button>
        )}

        {error && (
          <p
            className="text-sm rounded px-3 py-2"
            style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#f87171' }}
          >
            {error}
          </p>
        )}

        <div
          id={containerId}
          className={`rounded overflow-hidden ${active ? 'block' : 'hidden'}`}
        />

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <span className="text-xs" style={{ color: '#AEA79F' }}>oder manuell eingeben</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Manual input */}
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Barcode-Nummer…"
            className="flex-1 rounded px-3 py-2.5 text-sm text-white outline-none transition-all"
            style={{
              background: '#2C0A1E',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
            onFocus={e => e.target.style.borderColor = '#E95420'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
          />
          <button
            type="submit"
            disabled={!manualInput.trim()}
            className="font-medium px-4 py-2.5 rounded text-sm text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#E95420' }}
            onMouseEnter={e => { if (manualInput.trim()) e.target.style.background = '#C94411'; }}
            onMouseLeave={e => e.target.style.background = '#E95420'}
          >
            Suchen
          </button>
        </form>

        {/* Last code */}
        {lastCode && (
          <div
            className="rounded px-3 py-2.5"
            style={{ background: '#2C0A1E', border: '1px solid rgba(233,84,32,0.2)' }}
          >
            <p className="text-xs mb-1" style={{ color: '#AEA79F' }}>Zuletzt gescannt</p>
            <p className="font-mono text-sm" style={{ color: '#E95420' }}>{lastCode}</p>
          </div>
        )}
      </div>
    </div>
  );
}
