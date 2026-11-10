import { isValidBarcode, normalizeBarcode } from '../utils/barcode.js';

export async function lookupBarcode(value) {
  const barcode = normalizeBarcode(value);

  if (!isValidBarcode(barcode)) {
    throw new Error('INVALID_BARCODE');
  }

  let response;

  try {
    response = await fetch(`/api/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error('TIMEOUT', { cause: error });
    }
    throw new Error('NETWORK_ERROR', { cause: error });
  }

  if (response.status === 404) throw new Error('NOT_FOUND');
  if (response.status === 429 || response.status === 503) throw new Error('RATE_LIMITED');
  if (!response.ok) throw new Error('API_ERROR');

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error('INVALID_RESPONSE', { cause: error });
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('NOT_FOUND');
  }

  const item = data.items[0];
  const asText = (field) => typeof field === 'string' ? field.trim() : '';

  return {
    barcode,
    name: asText(item.title),
    brand: asText(item.brand),
    category: asText(item.category),
    description: asText(item.description),
    image: Array.isArray(item.images) && typeof item.images[0] === 'string'
      ? item.images[0]
      : '',
  };
}
