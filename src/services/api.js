export async function lookupBarcode(upc) {
  const res = await fetch(`/api/prod/trial/lookup?upc=${encodeURIComponent(upc)}`);

  if (!res.ok) {
    throw new Error('API_ERROR');
  }

  const data = await res.json();

  if (!data.items || data.items.length === 0) {
    throw new Error('NOT_FOUND');
  }

  const item = data.items[0];

  return {
    barcode: upc,
    name: item.title || '',
    brand: item.brand || '',
    category: item.category || '',
    description: item.description || '',
    image: item.images?.[0] || '',
  };
}
