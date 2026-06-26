// /api/bill.js  —  Congress.gov latest action on H.R. 3633 (CLARITY Act)
// Needs a free key from https://api.data.gov/signup  -> env CONGRESS_API_KEY
export default async function handler(req, res) {
  const key = process.env.CONGRESS_API_KEY;
  if (!key) return res.status(200).json({ error: 'no CONGRESS_API_KEY set' });
  try {
    const r = await fetch(`https://api.congress.gov/v3/bill/119/hr/3633?format=json&api_key=${key}`);
    const j = await r.json();
    const la = j?.bill?.latestAction;
    res.setHeader('Cache-Control', 's-maxage=43200, stale-while-revalidate=86400');
    res.status(200).json({ action: la?.text ?? null, date: la?.actionDate ?? null });
  } catch (e) {
    res.status(502).json({ error: 'bill fetch failed' });
  }
}
