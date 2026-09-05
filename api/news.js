export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const q = String(req.query.q || 'XRP OR bitcoin').slice(0, 80);
  const url =
    'https://news.google.com/rss/search?q=' +
    encodeURIComponent(q) +
    '&hl=en-US&gl=US&ceid=US:en';
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'xrp-watchtower/1' } });
    const xml = await r.text();
    const items = [];
    const blocks = xml.split('<item>').slice(1, 9);
    for (const b of blocks) {
      const title = (b.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
        b.match(/<title>(.*?)<\/title>/) || [, ''])[1];
      const link = (b.match(/<link>(.*?)<\/link>/) || [, ''])[1];
      const date = (b.match(/<pubDate>(.*?)<\/pubDate>/) || [, ''])[1];
      if (title) items.push({ title: title.replace(/&amp;/g, '&'), link, date });
    }
    res.setHeader('Cache-Control', 's-maxage=900');
    res.status(200).json({ q, items });
  } catch (e) {
    res.status(200).json({ q, items: [], error: 'news offline' });
  }
}
