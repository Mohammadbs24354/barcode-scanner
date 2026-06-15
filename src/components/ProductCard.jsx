export default function ProductCard({ data }) {
  const hasData = data.name || data.brand || data.barcode;

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
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 3l-4 4-4-4"/>
        </svg>
        <span className="text-sm font-medium text-white">Produktvorschau</span>
      </div>

      <div className="p-5">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-10" style={{ color: '#AEA79F' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" className="mb-3">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 3l-4 4-4-4"/>
            </svg>
            <p className="text-sm opacity-60">Noch kein Produkt gescannt</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.image && (
              <div
                className="flex justify-center rounded p-3"
                style={{ background: '#fff' }}
              >
                <img
                  src={data.image}
                  alt={data.name || 'Produktbild'}
                  className="max-h-44 max-w-full object-contain"
                  onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                />
              </div>
            )}

            {data.name && (
              <div>
                <p className="text-xs mb-0.5" style={{ color: '#AEA79F' }}>Produktname</p>
                <p className="text-white font-medium text-base leading-snug">{data.name}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {data.brand && (
                <div
                  className="rounded px-3 py-2"
                  style={{ background: '#2C0A1E', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-xs mb-0.5" style={{ color: '#AEA79F' }}>Marke</p>
                  <p className="text-white text-sm">{data.brand}</p>
                </div>
              )}
              {data.category && (
                <div
                  className="rounded px-3 py-2"
                  style={{ background: '#2C0A1E', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-xs mb-0.5" style={{ color: '#AEA79F' }}>Kategorie</p>
                  <p className="text-white text-sm">{data.category}</p>
                </div>
              )}
            </div>

            {data.barcode && (
              <div
                className="rounded px-3 py-2 flex items-center gap-2"
                style={{ background: 'rgba(233,84,32,0.08)', border: '1px solid rgba(233,84,32,0.2)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E95420" strokeWidth="2" opacity="0.7">
                  <rect x="2" y="3" width="4" height="18"/><rect x="8" y="3" width="2" height="18"/>
                  <rect x="13" y="3" width="4" height="18"/><rect x="19" y="3" width="3" height="18"/>
                </svg>
                <div>
                  <p className="text-xs" style={{ color: '#AEA79F' }}>Barcode</p>
                  <p className="font-mono text-sm" style={{ color: '#E95420' }}>{data.barcode}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
