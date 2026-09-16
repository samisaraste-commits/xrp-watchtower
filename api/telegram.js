const CATALOG = {
  XRP: { name: 'XRP', code: '176740', news: 'XRP Ripple' },
  BTC: { name: 'Bitcoin', code: '133741', news: 'Bitcoin' },
  ETH: { name: 'Ether', code: '146021', news: 'Ethereum' },
  SOL: { name: 'Solana', code: '177741', news: 'Solana' },
  XLM: { name: 'Stellar', code: '173LM2', news: 'Stellar' },
  HBAR: { name: 'Hedera', code: '180LM4', news: 'Hedera' },
  GOLD: { name: 'Gold', code: '088691', news: 'gold' },
  SILVER: { name: 'Silver', code: '084691', news: 'silver' },
  COPPER: { name: 'Copper', code: '085692', news: 'copper' },
  WTI: { name: 'US crude', code: '067651', news: 'oil' },
  ES: { name: 'S&P 500', code: '13874A', news: 'S&P 500' },
  NQ: { name: 'Nasdaq 100', code: '209742', news: 'Nasdaq' },
  YM: { name: 'Dow', code: '124603', news: 'Dow Jones' },
  EUR: { name: 'Euro', code: '099741', news: 'EUR USD' },
  DXY: { name: 'Dollar basket', code: '098662', news: 'DXY' }
};

const ALIAS = {
  xrp: 'XRP', ripple: 'XRP', bitcoin: 'BTC', btc: 'BTC', eth: 'ETH', ether: 'ETH',
  ethereum: 'ETH', sol: 'SOL', solana: 'SOL', xlm: 'XLM', stellar: 'XLM',
  hbar: 'HBAR', hedera: 'HBAR', gold: 'GOLD', silver: 'SILVER', copper: 'COPPER',
  oil: 'WTI', wti: 'WTI', crude: 'WTI', spx: 'ES', 's&p': 'ES', spy: 'ES',
  nasdaq: 'NQ', ndx: 'NQ', dow: 'YM', euro: 'EUR', eurusd: 'EUR', dollar: 'DXY', dxy: 'DXY'
};

function nfmt(n) {
  const a = Math.abs(n), s = n < 0 ? '\u2212' : '';
  if (a >= 1e6) return s + (a / 1e6).toFixed(1) + 'M';
  if (a >= 1000) return s + Math.round(a / 1000) + 'k';
  return (n < 0 ? '\u2212' : '') + Math.round(Math.abs(n));
}

async function cot(code) {
  const u = 'https://publicreporting.cftc.gov/resource/6dca-aqww.json'
    + '?cftc_contract_market_code=' + encodeURIComponent(code)
    + '&$order=' + encodeURIComponent('report_date_as_yyyy_mm_dd DESC')
    + '&$limit=55'
    + '&$select=' + encodeURIComponent('report_date_as_yyyy_mm_dd,open_interest_all,noncomm_positions_long_all,noncomm_positions_short_all,comm_positions_long_all,comm_positions_short_all');
  const rows = await (await fetch(u, { cache: 'no-store' })).json();
  const hist = rows.map(x => {
    const spec = (+x.noncomm_positions_long_all || 0) - (+x.noncomm_positions_short_all || 0);
    const comm = (+x.comm_positions_long_all || 0) - (+x.comm_positions_short_all || 0);
    return { date: String(x.report_date_as_yyyy_mm_dd).slice(0, 10), spec, comm, oi: +x.open_interest_all || 0 };
  }).reverse();
  const last = hist.at(-1), prev = hist.at(-2);
  const s = [...hist.map(h => h.spec)].sort((a, b) => a - b);
  let lo = 0, hi = s.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (s[m] <= last.spec) lo = m + 1; else hi = m; }
  const pct = s.length <= 1 ? 50 : Math.round(100 * (lo - 1) / Math.max(1, s.length - 1));
  return { last, wow: last.spec - prev.spec, pct };
}

async function quote(id) {
  const origin = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL
    : 'https://xrp-watchtower.vercel.app';
  try {
    const j = await (await fetch(origin + '/api/quote?id=' + id, { cache: 'no-store' })).json();
    return j.ok ? j : null;
  } catch { return null; }
}

function card(id, q, c) {
  const m = CATALOG[id];
  const side = c.last.spec >= 0 ? 'betting the price will rise' : 'betting the price will fall';
  const move = c.wow === 0 ? 'did not change much this week' : (c.wow > 0 ? 'added to that bet' : 'cut that bet');
  const px = q && q.price != null
    ? (id === 'TY' ? q.price.toFixed(2) + '%' : '$' + Number(q.price).toLocaleString('en-US', { maximumFractionDigits: 2 }))
    : 'price n/a';
  const chg = q && q.change24h != null ? ((q.change24h < 0 ? '' : '+') + q.change24h.toFixed(2) + '% day') : '';
  return [
    m.name,
    px + (chg ? '  ' + chg : ''),
    'Big bettors are ' + side + ' (' + nfmt(c.last.spec) + ' net).',
    'They ' + move + ' this week (' + (c.wow >= 0 ? '+' : '') + nfmt(c.wow) + ').',
    'Businesses net ' + nfmt(c.last.comm) + '.',
    'Stretch vs last year: ' + c.pct + ' / 100.',
    'COT date ' + c.last.date + '.'
  ].join('\n');
}

const HELP = [
  'Watchtower 33 on Telegram.',
  'Ask for a market:',
  '/gold  /silver  /xrp  /btc  /eth  /sol',
  '/wti  /es  /nasdaq  /dow  /euro  /dxy',
  'Or type: gold   bitcoin   euro',
  'I reply with live price + who is buying.'
].join('\n');

async function send(token, chatId, text) {
  await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

function resolve(text) {
  const t = String(text || '').trim().toLowerCase().replace(/^\//, '').split(/\s+/)[0];
  if (!t || t === 'start' || t === 'help') return null;
  return ALIAS[t] || (CATALOG[t.toUpperCase()] ? t.toUpperCase() : null);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, bot: 'watchtower33' });
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(500).json({ error: 'missing TELEGRAM_BOT_TOKEN' });
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    return res.status(401).json({ error: 'bad secret' });
  }
  const msg = req.body?.message || req.body?.edited_message;
  if (!msg?.chat?.id) return res.status(200).json({ ok: true });
  const allow = process.env.TELEGRAM_CHAT_ID;
  if (allow && String(msg.chat.id) !== String(allow)) {
    return res.status(200).json({ ok: true, ignored: true });
  }
  const text = msg.text || '';
  const id = resolve(text);
  try {
    if (!id) {
      await send(token, msg.chat.id, HELP);
    } else {
      const [c, q] = await Promise.all([cot(CATALOG[id].code), quote(id)]);
      await send(token, msg.chat.id, card(id, q, c));
    }
  } catch (e) {
    await send(token, msg.chat.id, 'Could not fetch that market just now. Try again in a minute.');
  }
  return res.status(200).json({ ok: true });
}
