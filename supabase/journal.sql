-- Run once in the Supabase SQL editor.
-- Then on Vercel set SUPABASE_URL and SUPABASE_SERVICE_KEY (service role, not the anon key).
-- Optional: JOURNAL_SECRET so only you can read and write the journal.

create table if not exists public.journal_trades (
  id uuid primary key default gen_random_uuid(),
  market text not null,
  closed_on date not null,
  side text,
  pnl numeric not null,
  risk numeric,
  account_pct text,
  entry text,
  exit_px text,
  hold text,
  plan text,
  did text,
  note text,
  shot text,
  shot2 text,
  created_at timestamptz default now()
);

alter table public.journal_trades enable row level security;
