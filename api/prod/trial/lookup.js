import { isValidBarcode } from '../../../src/utils/barcode.js';

const UPC_API_URL = 'https://api.upcitemdb.com/prod/trial/lookup';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const upc = typeof req.query?.upc === 'string' ? req.query.upc.trim() : '';

  if (!isValidBarcode(upc)) {
    return res.status(400).json({ error: 'INVALID_BARCODE' });
  }

  try {
    const upstream = await fetch(`${UPC_API_URL}?upc=${encodeURIComponent(upc)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (upstream.status === 404) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }

    if (upstream.status === 429) {
      return res.status(503).json({ error: 'UPSTREAM_RATE_LIMITED' });
    }

    if (!upstream.ok) {
      return res.status(502).json({ error: 'UPSTREAM_ERROR' });
    }

    const data = await upstream.json();
    return res.status(200).json(data);
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError';
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
    });
  }
}
