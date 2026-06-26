// /api/derivatives.js  —  Coinglass v4 (needs free key in env COINGLASS_API_KEY)
// NOTE: exact endpoint paths + field names vary by Coinglass tier/version.
// Confirm against https://docs.coinglass.com/reference and tweak below if a field comes back null.
const BASE = 'https://open-api-v4.coinglass.com';

async function cg(path, key) {
  const r = await fetch(BASE + path, { headers: { 'CG-API-KEY': key, 'Accept': 'application/json' } });
  if (!r.ok) return null;
  return r.json();
}

export default async function handler(req, res) {
  const key = process.env.COINGLASS_API_KEY;
  if (!key) return res.status(200).json({ error: 'no COINGLASS_API_KEY set' });

  const out = { funding: null, openInterest: null, longShortRatio: null, longPct: null, shortPct: null, etfFlow: null };
  try {
    const fr = await cg('/api/futures/fundingRate/exchange-list?symbol=XRP', key);
    out.funding = fr?.data?.[0]?.fundingRate ?? fr?.data?.[0]?.uMarginList?.[0]?.fundingRate ?? null;

    const oi = await cg('/api/futures/openInterest/exchange-list?symbol=XRP', key);
    out.openInterest = oi?.data?.[0]?.openInterest ?? oi?.data?.totalOpenInterest ?? null;

    const ls = await cg('/api/futures/globalLongShortAccountRatio/history?symbol=XRP&interval=4h&limit=1', key);
    const last = ls?.data?.[ls.data.length - 1];
    if (last) {
      out.longShortRatio = Number(last.longShortRatio ?? last.ratio ?? null);
      out.longPct = last.longAccount != null ? Number(last.longAccount) : null;
      out.shortPct = last.shortAccount != null ? Number(last.shortAccount) : null;
    }

    const etf = await cg('/api/etf/xrp/flow-history?limit=1', key);
    const e = etf?.data?.[etf.data.length - 1];
    out.etfFlow = e ? Number(e.flowUsd ?? e.netFlow ?? e.changeUsd) : null;
  } catch (e) {
    out.partial = true;
  }
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
  res.status(200).json(out);
}
