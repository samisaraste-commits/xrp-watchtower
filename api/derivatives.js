// /api/derivatives.js — free, no key. Binance primary, Bybit fallback.
async function tryBinance() {
  const base = 'https://fapi.binance.com';
  const [pi, oi, ls] = await Promise.all([
    fetch(base + '/fapi/v1/premiumIndex?symbol=XRPUSDT').then(r => r.json()),
    fetch(base + '/fapi/v1/openInterest?symbol=XRPUSDT').then(r => r.json()),
    fetch(base + '/futures/data/globalLongShortAccountRatio?symbol=XRPUSDT&period=5m&limit=1').then(r => r.json())
  ]);
  const mark = parseFloat(pi.markPrice), oiXrp = parseFloat(oi.openInterest), l = ls[0];
  if (!mark || !oiXrp || !l) throw new Error('binance empty');
  return {
    funding: parseFloat(pi.lastFundingRate),
    openInterest: oiXrp * mark,
    longPct: parseFloat(l.longAccount) * 100,
    shortPct: parseFloat(l.shortAccount) * 100,
    longShortRatio: parseFloat(l.longShortRatio),
    etfFlow: null, source: 'Binance'
  };
}

async function tryBybit() {
  const base = 'https://api.bybit.com';
  const [tk, ar] = await Promise.all([
    fetch(base + '/v5/market/tickers?category=linear&symbol=XRPUSDT').then(r => r.json()),
    fetch(base + '/v5/market/account-ratio?category=linear&symbol=XRPUSDT&period=5min&limit=1').then(r => r.json())
  ]);
  const t = tk?.result?.list?.[0], a = ar?.result?.list?.[0];
  if (!t) throw new Error('bybit empty');
  const buy = a ? parseFloat(a.buyRatio) : null, sell = a ? parseFloat(a.sellRatio) : null;
  return {
    funding: parseFloat(t.fundingRate),
    openInterest: parseFloat(t.openInterestValue),
    longPct: buy != null ? buy * 100 : null,
    shortPct: sell != null ? sell * 100 : null,
    longShortRatio: (buy != null && sell) ? buy / sell : null,
    etfFlow: null, source: 'Bybit'
  };
}

export default async function handler(req, res) {
  let data = { funding: null, openInterest: null, longPct: null, shortPct: null, longShortRatio: null, etfFlow: null };
  try { data = await tryBinance(); }
  catch (e) { try { data = await tryBybit(); } catch (e2) { data.error = 'both failed'; } }
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
  res.status(200).json(data);
}
