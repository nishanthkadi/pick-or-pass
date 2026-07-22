-- System prompt / server config. Run once in the Supabase SQL editor.
-- RLS on, no policies → anon/authenticated cannot read; service role can.

create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

comment on table public.app_config is
  'Server-only config (e.g. system_prompt). Service role only; RLS blocks clients.';

alter table public.app_config enable row level security;

-- Intentionally no policies for anon/authenticated.
-- Service role bypasses RLS and is used by the Next.js server + sync-prompt.
