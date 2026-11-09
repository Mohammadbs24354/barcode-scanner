import { useRef, useState } from 'react';
import Scanner from '../components/Scanner';
import ProductForm from '../components/ProductForm';
import ProductCard from '../components/ProductCard';
import SubmitPanel from '../components/SubmitPanel';
import { lookupBarcode } from '../services/api';
import { isValidBarcode } from '../utils/barcode';

const emptyProduct = {
  barcode: '',
  name: '',
  brand: '',
  category: '',
  description: '',
  image: '',
};

const errorMessages = {
  INVALID_BARCODE: 'Bitte gib einen gültigen EAN- oder UPC-Barcode ein.',
  NOT_FOUND: 'Für diesen Barcode wurden keine Produktdaten gefunden. Du kannst die Angaben manuell ergänzen.',
  RATE_LIMITED: 'Die Produktsuche ist momentan ausgelastet. Bitte versuche es später erneut.',
  TIMEOUT: 'Die Anfrage hat zu lange gedauert. Bitte versuche es erneut.',
  NETWORK_ERROR: 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.',
  INVALID_RESPONSE: 'Der Produktdienst hat eine ungültige Antwort geliefert.',
  API_ERROR: 'Die Produktinformationen konnten momentan nicht abgerufen werden.',
};

export default function Home() {
  const [product, setProduct] = useState(emptyProduct);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('');
  const [exportReady, setExportReady] = useState(false);
  const requestId = useRef(0);

  const handleScan = async (rawCode) => {
    const code = String(rawCode ?? '').trim();
    const currentRequest = ++requestId.current;

    setStatusMsg('');
    setStatusType('');
    setExportReady(false);

    if (!isValidBarcode(code)) {
      setProduct({ ...emptyProduct, barcode: code });
      setStatusMsg(errorMessages.INVALID_BARCODE);
      setStatusType('error');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const data = await lookupBarcode(code);
      if (currentRequest !== requestId.current) return;

      setProduct(data);
      setStatusMsg('Produktdaten wurden erfolgreich geladen.');
      setStatusType('success');
    } catch (error) {
      if (currentRequest !== requestId.current) return;

      setProduct({ ...emptyProduct, barcode: code });
      setStatusMsg(errorMessages[error.message] || errorMessages.API_ERROR);
      setStatusType('error');
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setProduct((previous) => ({ ...previous, [key]: value }));
    setExportReady(false);
  };

  const handleExport = () => {
    if (!product.name.trim() || !isValidBarcode(product.barcode)) {
      setStatusMsg('Bitte prüfe den Barcode und gib einen Produktnamen ein.');
      setStatusType('error');
      setExportReady(false);
      return;
    }

    setStatusMsg('Deine Produktdaten sind bereit zum Export.');
    setStatusType('success');
    setExportReady(true);
  };

  const hasProduct = Boolean(product.name || product.barcode);

  return (
    <div className="min-h-screen">
      <header style={{ background: '#2C0A1E', borderBottom: '1px solid rgba(233,84,32,0.3)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: '#E95420' }}
            aria-hidden="true"
          >
            B
          </div>
          <span className="font-medium text-white tracking-wide text-sm">Barcode Scanner</span>
          <span className="ml-auto text-xs" style={{ color: '#AEA79F' }}>Produktdaten einfach erfassen</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <div className="text-center py-4">
          <h1 className="text-2xl sm:text-3xl font-light text-white tracking-wide">
            Produkt<span style={{ color: '#E95420' }}>erkennung</span>
          </h1>
          <p style={{ color: '#AEA79F' }} className="text-sm mt-2">
            Scanne einen Barcode oder gib die Nummer manuell ein
          </p>
        </div>

        <Scanner onScan={handleScan} />

        {loading && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-3 rounded-lg px-6 py-5"
            style={{ background: '#3D1230', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#E95420', borderTopColor: 'transparent' }}
              aria-hidden="true"
            />
            <p style={{ color: '#AEA79F' }} className="text-sm">Produktdaten werden geladen…</p>
          </div>
        )}

        {statusMsg && !loading && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg px-4 py-3 text-sm font-medium flex items-start gap-2"
            style={
              statusType === 'success'
                ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }
                : { background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#f87171' }
            }
          >
            <span aria-hidden="true">{statusType === 'success' ? '✓' : '!'}</span>
            <span>{statusMsg}</span>
          </div>
        )}

        {hasProduct ? (
          <>
            <ProductCard data={product} />
            <ProductForm data={product} onChange={handleChange} onSubmit={handleExport} />
            {exportReady && <SubmitPanel data={product} />}
          </>
        ) : (
          <ProductCard data={emptyProduct} />
        )}

        <footer className="text-center pt-2 pb-6">
          <p className="text-xs" style={{ color: 'rgba(174,167,159,0.55)' }}>
            Produktinformationen werden über UPCitemdb abgerufen. Nicht alle Barcodes sind in der Datenbank verfügbar.
          </p>
        </footer>
      </main>
    </div>
  );
}
