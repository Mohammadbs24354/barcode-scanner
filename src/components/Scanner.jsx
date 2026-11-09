import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function Scanner({ onScan }) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const [lastCode, setLastCode] = useState('');
  const [manualInput, setManualInput] = useState('');
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const containerId = 'qr-reader';

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopScanner = () => setActive(false);

  const startScanner = () => {
    setError('');
    setLastCode('');
    setActive(true);
  };

  useEffect(() => {
    if (!active) return undefined;

    let cancelled = false;
    let scanHandled = false;
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    const stopAndClear = async () => {
      try {
        if (scanner.isScanning) await scanner.stop();
      } catch {
        // The camera may already have stopped while the effect is cleaning up.
      }

      try {
        scanner.clear();
      } catch {
        // The scanner can already be cleared during unmount.
      }

      if (scannerRef.current === scanner) scannerRef.current = null;
    };

    const start = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            if (cancelled || scanHandled) return;

            scanHandled = true;
            setLastCode(decodedText);
            setActive(false);
            onScanRef.current(decodedText);
          },
          () => {
            // Decode misses are expected while the camera is searching.
          },
        );

        if (cancelled) await stopAndClear();
      } catch (startError) {
        if (!cancelled) {
          const message = String(startError).toLowerCase();
          setError(
            message.includes('permission') || message.includes('notallowed')
              ? 'Kamerazugriff verweigert. Bitte erlaube den Kamerazugriff in deinem Browser.'
              : 'Die Kamera konnte nicht gestartet werden. Prüfe, ob sie von einer anderen App verwendet wird.',
          );
          setActive(false);
        }
        await stopAndClear();
      }
    };

    void start();

    return () => {
      cancelled = true;
      void stopAndClear();
    };
  }, [active]);

  const handleManualSubmit = (event) => {
    event.preventDefault();
    const code = manualInput.trim();
    if (!code) return;

    setLastCode(code);
    setManualInput('');
    onScanRef.current(code);
  };

  return (
    <section
      className="rounded-lg overflow-hidden"
      style={{ background: '#3D1230', border: '1px solid rgba(255,255,255,0.08)' }}
      aria-label="Barcode erfassen"
    >
      <div
        className="px-5 py-3 flex items-center gap-2"
        style={{ background: '#2C0A1E', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E95420" strokeWidth="2" aria-hidden="true">
          <rect x="2" y="3" width="6" height="6" rx="1" />
          <rect x="16" y="3" width="6" height="6" rx="1" />
          <rect x="2" y="15" width="6" height="6" rx="1" />
          <path d="M22 22h-6v-6M16 16h6M22 16v6" />
        </svg>
        <h2 className="text-sm font-medium text-white">Barcode Scanner</h2>
      </div>

      <div className="p-5 space-y-4">
        {!active ? (
          <button
            type="button"
            onClick={startScanner}
            className="w-full font-medium py-3 px-5 rounded text-white text-sm transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
            style={{ background: '#E95420' }}
            onMouseEnter={(event) => { event.currentTarget.style.background = '#C94411'; }}
            onMouseLeave={(event) => { event.currentTarget.style.background = '#E95420'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Kamera starten
          </button>
        ) : (
          <button
            type="button"
            onClick={stopScanner}
            className="w-full font-medium py-3 px-5 rounded text-white text-sm"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            Kamera stoppen
          </button>
        )}

        {error && (
          <p role="alert" className="text-sm rounded px-3 py-2" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#f87171' }}>
            {error}
          </p>
        )}

        <div id={containerId} className={active ? 'block rounded overflow-hidden' : 'hidden'} />

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <span className="text-xs" style={{ color: '#AEA79F' }}>oder manuell eingeben</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
        </div>

        <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row gap-2">
          <label className="sr-only" htmlFor="manual-barcode">Barcode-Nummer</label>
          <input
            id="manual-barcode"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={manualInput}
            onChange={(event) => setManualInput(event.target.value.replace(/[^0-9]/g, '').slice(0, 14))}
            placeholder="EAN / UPC-Nummer eingeben…"
            maxLength={14}
            className="min-w-0 flex-1 rounded px-3 py-3 text-sm text-white outline-none"
            style={{ background: '#2C0A1E', border: '1px solid rgba(255,255,255,0.12)' }}
            onFocus={(event) => { event.currentTarget.style.borderColor = '#E95420'; }}
            onBlur={(event) => { event.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          />
          <button type="submit" disabled={!manualInput.trim()} className="font-medium px-5 py-3 rounded text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: '#E95420' }}>
            Suchen
          </button>
        </form>

        {lastCode && (
          <div className="rounded px-3 py-2.5" style={{ background: '#2C0A1E', border: '1px solid rgba(233,84,32,0.2)' }}>
            <p className="text-xs mb-1" style={{ color: '#AEA79F' }}>Zuletzt erfasst</p>
            <p className="font-mono text-sm break-all" style={{ color: '#E95420' }}>{lastCode}</p>
          </div>
        )}
      </div>
    </section>
  );
}
