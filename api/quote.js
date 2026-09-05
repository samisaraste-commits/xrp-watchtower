const CG = {
  XRP: 'ripple', BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana',
  XLM: 'stellar', HBAR: 'hedera-hashgraph'
};
const YAHOO = {
  GOLD: 'GC=F', SILVER: 'SI=F', COPPER: 'HG=F', PLAT: 'PL=F', PALL: 'PA=F',
  WTI: 'CL=F', NG: 'NG=F', CORN: 'ZC=F', SOY: 'ZS=F', WHEAT: 'ZW=F',
  ES: 'ES=F', NQ: 'NQ=F', YM: 'YM=F', RTY: 'RTY=F', VIX: '^VIX',
  EUR: 'EURUSD=X', JPY: 'JPY=X', GBP: 'GBPUSD=X', DXY: 'DX-Y.NYB', TY: '^TNX'
};

async function cg(id) {
  const u = 'https://api.coingecko.com/api/v3/coins/' + id +
    '/market_chart?vs_currency=usd&days=30&interval=daily';
  const r = await fetch(u, { headers: { accept: 'application/json' } });
  const j = await r.json();
  const prices = (j.prices || []).map(p => ({ t: p[0], p: p[1] }));
  const last = prices.at(-1)?.p;
  const prev = prices.at(-2)?.p;
  const change24h = last && prev ? ((last - prev) / prev) * 100 : null;
  return { price: last, change24h, series: prices, source: 'CoinGecko' };
}

async function yahoo(sym) {
  const u = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
    encodeURIComponent(sym) + '?range=1mo&interval=1d';
  const r = await fetch(u, { headers: { 'User-Agent': 'watchtower33/1' } });
  const j = await r.json();
  const res = j.chart?.result?.[0];
  if (!res) throw 0;
  const ts = res.timestamp || [];
  const close = res.indicators?.quote?.[0]?.close || [];
  const series = ts.map((t, i) => ({ t: t * 1000, p: close[i] })).filter(x => x.p != null);
  const meta = res.meta || {};
  const price = meta.regularMarketPrice ?? series.at(-1)?.p;
  const prev = meta.chartPreviousClose ?? series.at(-2)?.p;
  const change24h = price && prev ? ((price - prev) / prev) * 100 : null;
  return { price, change24h, series, source: 'Yahoo Finance' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const id = String(req.query.id || 'XRP').toUpperCase();
  try {
    const data = CG[id] ? await cg(CG[id]) : await yahoo(YAHOO[id] || id);
    res.setHeader('Cache-Control', 's-maxage=120');
    res.status(200).json({ id, ok: true, ...data });
  } catch (e) {
    res.status(200).json({ id, ok: false, price: null, change24h: null, series: [] });
  }
}
