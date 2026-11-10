export default function ProductForm({ data, onChange, onSubmit }) {
  const fields = [
    { key: 'barcode', label: 'Barcode', type: 'text', required: true },
    { key: 'name', label: 'Produktname', type: 'text', required: true },
    { key: 'brand', label: 'Marke', type: 'text' },
    { key: 'category', label: 'Kategorie', type: 'text' },
    { key: 'description', label: 'Beschreibung', type: 'textarea' },
    { key: 'image', label: 'Produktbild (URL)', type: 'url' },
  ];

  const inputStyle = {
    background: '#2C0A1E',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
    fontFamily: 'Ubuntu, system-ui, sans-serif',
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <section className="rounded-lg overflow-hidden" style={{ background: '#3D1230', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-5 py-3 flex items-center gap-2" style={{ background: '#2C0A1E', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E95420" strokeWidth="2" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        <h2 className="text-sm font-medium text-white">Produktdaten bearbeiten</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {fields.map(({ key, label, type, required }) => (
          <div key={key}>
            <label htmlFor={`product-${key}`} className="block text-xs mb-1.5 font-medium" style={{ color: '#AEA79F' }}>
              {label}{required ? ' *' : ''}
            </label>
            {type === 'textarea' ? (
              <textarea
                id={`product-${key}`}
                rows={3}
                value={data[key] || ''}
                onChange={(event) => onChange(key, event.target.value)}
                className="w-full rounded px-3 py-3 text-sm outline-none resize-y"
                style={inputStyle}
                placeholder={`${label} eingeben…`}
                maxLength={2000}
              />
            ) : (
              <input
                id={`product-${key}`}
                type={type}
                inputMode={key === 'barcode' ? 'numeric' : undefined}
                value={data[key] || ''}
                onChange={(event) => onChange(key, key === 'barcode' ? event.target.value.replace(/[^0-9]/g, '').slice(0, 14) : event.target.value)}
                className="w-full rounded px-3 py-3 text-sm outline-none"
                style={inputStyle}
                placeholder={`${label} eingeben…`}
                required={required}
                maxLength={key === 'barcode' ? 14 : undefined}
                autoComplete="off"
              />
            )}
          </div>
        ))}

        <p className="text-xs" style={{ color: '#AEA79F' }}>* Pflichtfelder. Unterstützt werden gültige EAN-8-, UPC-A-, EAN-13- und GTIN-14-Codes.</p>

        <button
          type="submit"
          className="w-full font-medium py-3 px-5 rounded text-white text-sm transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
          style={{ background: '#E95420' }}
          onMouseEnter={(event) => { event.currentTarget.style.background = '#C94411'; }}
          onMouseLeave={(event) => { event.currentTarget.style.background = '#E95420'; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Daten für den Export vorbereiten
        </button>
      </form>
    </section>
  );
}
