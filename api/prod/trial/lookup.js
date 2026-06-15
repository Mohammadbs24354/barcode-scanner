export default async function handler(req, res) {
  const { upc } = req.query;

  if (!upc) {
    return res.status(400).json({ error: 'upc required' });
  }

  const apiUrl = `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`;

  const upstream = await fetch(apiUrl);
  const data = await upstream.json();

  res.setHeader('Content-Type', 'application/json');
  return res.status(upstream.status).json(data);
}
