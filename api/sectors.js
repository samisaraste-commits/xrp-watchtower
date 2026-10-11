// /api/sectors.js — five industry baskets. Sorted strongest to weakest.
const SECTORS = [
  { id: 'XLE', label: 'Oil companies', yahoo: 'XLE' },
  { id: 'XLV', label: 'Healthcare', yahoo: 'XLV' },
  { id: 'XLK', label: 'Tech / AI', yahoo: 'XLK' },
  { id: 'XLI', label: 'Factories', yahoo: 'XLI' },
  { id: 'XLF', label: 'Banks', yahoo: 'XLF' }
];

async function yahoo(sym) {
  const u = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
    encodeURIComponent(sym) + '?range=5d&interval=1d';
  const r = await fetch(u, { headers: { 'User-Agent': 'watchtower33/1' } });
  const j = await r.json();
  const res = j.chart?.result?.[0];
  if (!res) throw new Error('no data');
  const meta = res.meta || {};
  const price = meta.regularMarketPrice ?? null;
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? null;
  const change = (price != null && prev) ? ((price - prev) / prev) * 100 : null;
  return { price, change };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const results = await Promise.all(SECTORS.map(async (s) => {
      try {
        const d = await yahoo(s.yahoo);
        return { id: s.id, label: s.label, price: d.price, change: d.change, ok: true };
      } catch (e) {
        return { id: s.id, label: s.label, price: null, change: null, ok: false };
      }
    }));
    results.sort((a, b) => (b.change ?? -999) - (a.change ?? -999));
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    res.status(200).json({ ok: true, sectors: results });
  } catch (e) {
    res.status(200).json({ ok: false, sectors: [] });
  }
}
