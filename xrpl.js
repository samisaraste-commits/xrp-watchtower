// /api/xrpl.js  —  XRP Ledger public server (no key)
// Returns: validated ledger index + the main Ripple escrow wallet balance.
const RPC = 'https://xrplcluster.com/';            // public cluster; alt: https://s1.ripple.com:51234/
const ESCROW_ACCT = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'; // Ripple escrow wallet

async function rpc(method, params) {
  const r = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params: [params] })
  });
  const j = await r.json();
  return j.result;
}

export default async function handler(req, res) {
  try {
    const si = await rpc('server_info', {});
    const ledgerIndex = si?.info?.validated_ledger?.seq ?? null;

    const ai = await rpc('account_info', { account: ESCROW_ACCT, ledger_index: 'validated' });
    const drops = ai?.account_data?.Balance;
    const escrowXrp = drops ? Number(drops) / 1e6 : null;   // liquid balance of the escrow wallet

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    res.status(200).json({ ledgerIndex, escrowXrp });
  } catch (e) {
    res.status(502).json({ error: 'xrpl fetch failed' });
  }
}
