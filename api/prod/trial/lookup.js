export default async function handler(req, res) {
  const { upc } = req.query;

  if (!upc) {
    return res.status(400).json({ error: 'upc parameter is required' });
  }

  try {
    const response = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`
    );

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch from upstream API' });
  }
}
