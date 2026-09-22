const TABLE = 'journal_trades';

function cfg() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return { url, key };
}

function guard(req, res) {
  const secret = process.env.JOURNAL_SECRET;
  if (!secret) return true;
  const got = req.headers['x-journal-key'] || '';
  if (got !== secret) {
    res.status(401).json({ ok: false, error: 'wrong key' });
    return false;
  }
  return true;
}

async function sb(path, opts = {}) {
  const c = cfg();
  const r = await fetch(c.url + path, {
    method: opts.method || 'GET',
    headers: {
      apikey: c.key,
      Authorization: 'Bearer ' + c.key,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation',
      ...(opts.headers || {})
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const text = await r.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { message: text }; }
  if (!r.ok) {
    const msg = body?.message || body?.error || body?.hint || ('supabase ' + r.status);
    const err = new Error(msg);
    err.status = r.status;
    throw err;
  }
  return body;
}

function clean(row) {
  if (!row || typeof row !== 'object') return null;
  const pnl = Number(row.pnl);
  if (!Number.isFinite(pnl)) return null;
  const market = String(row.market || '').trim().slice(0, 80);
  const closed = String(row.closed_on || row.date || '').slice(0, 10);
  if (!market || !/^\d{4}-\d{2}-\d{2}$/.test(closed)) return null;
  const clip = (v, n) => v == null || v === '' ? null : String(v).slice(0, n);
  const shot = (v) => {
    if (!v || typeof v !== 'string') return null;
    if (!v.startsWith('data:image/')) return null;
    return v.length > 1_800_000 ? null : v;
  };
  return {
    market,
    closed_on: closed,
    side: clip(row.side, 40),
    pnl,
    risk: row.risk == null || row.risk === '' ? null : Number(row.risk),
    account_pct: clip(row.account_pct, 20),
    entry: clip(row.entry, 40),
    exit_px: clip(row.exit_px || row.exit, 40),
    hold: clip(row.hold, 40),
    plan: clip(row.plan, 500),
    did: clip(row.did, 500),
    note: clip(row.note, 2000),
    shot: shot(row.shot),
    shot2: shot(row.shot2)
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!cfg()) {
    return res.status(200).json({
      ok: false,
      needsSetup: true,
      error: 'Add SUPABASE_URL and SUPABASE_SERVICE_KEY on Vercel, then run the SQL once.'
    });
  }
  if (!guard(req, res)) return;
  try {
    if (req.method === 'GET') {
      const rows = await sb('/rest/v1/' + TABLE + '?select=*&order=closed_on.desc,created_at.desc');
      return res.status(200).json({ ok: true, trades: rows || [] });
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (req.method === 'POST' && Array.isArray(body.trades)) {
      const rows = body.trades.map(clean).filter(Boolean);
      if (!rows.length) return res.status(400).json({ ok: false, error: 'no trades' });
      const saved = await sb('/rest/v1/' + TABLE, { method: 'POST', body: rows });
      return res.status(200).json({ ok: true, trades: saved });
    }
    if (req.method === 'POST') {
      const row = clean(body);
      if (!row) return res.status(400).json({ ok: false, error: 'need a market, a date, and a euro result' });
      const saved = await sb('/rest/v1/' + TABLE, { method: 'POST', body: row });
      return res.status(200).json({ ok: true, trade: Array.isArray(saved) ? saved[0] : saved });
    }
    if (req.method === 'PATCH') {
      const id = String(body.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ ok: false, error: 'bad id' });
      const row = clean(body);
      if (!row) return res.status(400).json({ ok: false, error: 'bad trade' });
      const saved = await sb('/rest/v1/' + TABLE + '?id=eq.' + id, { method: 'PATCH', body: row });
      return res.status(200).json({ ok: true, trade: Array.isArray(saved) ? saved[0] : saved });
    }
    if (req.method === 'DELETE') {
      const id = String((req.query && req.query.id) || body.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ ok: false, error: 'bad id' });
      await sb('/rest/v1/' + TABLE + '?id=eq.' + id, { method: 'DELETE', prefer: 'return=minimal' });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ ok: false, error: 'method' });
  } catch (e) {
    return res.status(200).json({ ok: false, error: e.message || 'journal offline' });
  }
}
