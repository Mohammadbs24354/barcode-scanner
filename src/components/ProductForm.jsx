export default function ProductForm({ data, onChange, onSubmit }) {
  const fields = [
    { key: 'barcode', label: 'Barcode', type: 'text' },
    { key: 'name', label: 'Produktname', type: 'text' },
    { key: 'brand', label: 'Marke', type: 'text' },
    { key: 'category', label: 'Kategorie', type: 'text' },
    { key: 'description', label: 'Beschreibung', type: 'textarea' },
    { key: 'image', label: 'Produktbild (URL)', type: 'text' },
  ];

  const inputStyle = {
    background: '#2C0A1E',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
    fontFamily: 'Ubuntu, system-ui, sans-serif',
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
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        <span className="text-sm font-medium text-white">Daten bearbeiten</span>
      </div>

      <div className="p-5 space-y-4">
        {fields.map(({ key, label, type }) => (
          <div key={key}>
            <label
              className="block text-xs mb-1.5 font-medium"
              style={{ color: '#AEA79F' }}
            >
              {label}
            </label>
            {type === 'textarea' ? (
              <textarea
                rows={3}
                value={data[key] || ''}
                onChange={(e) => onChange(key, e.target.value)}
                className="w-full rounded px-3 py-2 text-sm outline-none resize-none transition-all"
                style={inputStyle}
                placeholder={`${label} eingeben…`}
                onFocus={e => e.target.style.borderColor = '#E95420'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
            ) : (
              <input
                type="text"
                value={data[key] || ''}
                onChange={(e) => onChange(key, e.target.value)}
                className="w-full rounded px-3 py-2 text-sm outline-none transition-all"
                style={inputStyle}
                placeholder={`${label} eingeben…`}
                onFocus={e => e.target.style.borderColor = '#E95420'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
            )}
          </div>
        ))}
        {/* Submit button */}
        <button
          onClick={onSubmit}
          className="w-full font-medium py-2.5 px-5 rounded text-white text-sm transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 mt-2"
          style={{ background: '#E95420' }}
          onMouseEnter={e => e.currentTarget.style.background = '#C94411'}
          onMouseLeave={e => e.currentTarget.style.background = '#E95420'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
          </svg>
          Daten absenden
        </button>
      </div>
    </div>
  );
}
