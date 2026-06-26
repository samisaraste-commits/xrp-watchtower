// /api/price.js  —  XRP spot price + 24h change from CoinGecko (no key needed)
export default async function handler(req, res) {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd&include_24hr_change=true');
    const j = await r.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.status(200).json({ price: j.ripple.usd, change24h: j.ripple.usd_24h_change });
  } catch (e) {
    res.status(502).json({ error: 'price fetch failed' });
  }
}
