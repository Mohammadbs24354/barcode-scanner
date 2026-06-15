import { useState } from 'react';
import Scanner from '../components/Scanner';
import ProductForm from '../components/ProductForm';
import ProductCard from '../components/ProductCard';
import SubmitPanel from '../components/SubmitPanel';
import { lookupBarcode } from '../services/api';

const emptyProduct = {
  barcode: '',
  name: '',
  brand: '',
  category: '',
  description: '',
  image: '',
};

export default function Home() {
  const [product, setProduct] = useState(emptyProduct);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleScan = async (code) => {
    setLoading(true);
    setStatusMsg('');
    setStatusType('');
    setSubmitted(false);

    try {
      const data = await lookupBarcode(code);
      setProduct(data);
      setStatusMsg('Produkt erfolgreich geladen.');
      setStatusType('success');
    } catch (err) {
      setProduct({ ...emptyProduct, barcode: code });
      if (err.message === 'NOT_FOUND') {
        setStatusMsg('Für diesen Barcode wurden keine Produktdaten gefunden.');
      } else {
        setStatusMsg('Fehler beim Abrufen der Produktinformationen.');
      }
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setProduct((prev) => ({ ...prev, [key]: value }));
    setSubmitted(false);
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const hasProduct = !loading && (product.name || product.barcode);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header style={{ background: '#2C0A1E', borderBottom: '1px solid rgba(233,84,32,0.3)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: '#E95420' }}
          >
            B
          </div>
          <span className="font-medium text-white tracking-wide text-sm">Barcode Scanner</span>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Hero */}
        <div className="text-center py-4">
          <h1 className="text-2xl font-light text-white tracking-wide">
            Produkt<span style={{ color: '#E95420' }}>erkennung</span>
          </h1>
          <p style={{ color: '#AEA79F' }} className="text-sm mt-1">
            Scanne einen Barcode oder gib ihn manuell ein
          </p>
        </div>

        <Scanner onScan={handleScan} />

        {loading && (
          <div
            className="flex items-center justify-center gap-3 rounded-lg px-6 py-5"
            style={{ background: '#3D1230', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#E95420', borderTopColor: 'transparent' }}
            />
            <p style={{ color: '#AEA79F' }} className="text-sm">Produktdaten werden geladen…</p>
          </div>
        )}

        {statusMsg && !loading && (
          <div
            className="rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2"
            style={
              statusType === 'success'
                ? { background: 'rgba(233,84,32,0.12)', border: '1px solid rgba(233,84,32,0.4)', color: '#E95420' }
                : { background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#f87171' }
            }
          >
            <span>{statusType === 'success' ? '✓' : '✕'}</span>
            {statusMsg}
          </div>
        )}

        {hasProduct && (
          <>
            <ProductCard data={product} />
            <ProductForm data={product} onChange={handleChange} onSubmit={handleSubmit} />
            {submitted && <SubmitPanel data={product} />}
          </>
        )}

        {!loading && !product.name && !product.barcode && (
          <ProductCard data={product} />
        )}
      </main>
    </div>
  );
}
