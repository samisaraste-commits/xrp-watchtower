// /api/odds.js  —  Polymarket CLARITY Act 2026 passage odds (no key)
export default async function handler(req, res) {
  try {
    const slug = req.query.slug || 'clarity-act-signed-into-law-in-2026';
    const r = await fetch('https://gamma-api.polymarket.com/events?slug=' + encodeURIComponent(slug));
    const j = await r.json();
    const ev = Array.isArray(j) ? j[0] : j;
    const m = ev?.markets?.[0];

    let yesPct = null;
    if (m?.outcomePrices) {
      const prices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
      yesPct = Math.round(parseFloat(prices[0]) * 100);   // first outcome = "Yes"
    }
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    res.status(200).json({ yesPct, volume: ev?.volume ?? null, question: ev?.title ?? null });
  } catch (e) {
    res.status(502).json({ error: 'odds fetch failed' });
  }
}
