-- Sample listing demos for the live app (not required in public git).
-- Run once in the Supabase SQL editor, then: npm run sync-demos

create table if not exists public.demo_listings (
  id text primary key,
  label text not null,
  description text not null,
  sort_order int not null default 0,
  image_urls text[] not null default '{}',
  analysis jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.demo_listings is
  'Cached sample listings for the Example picker. Synced via npm run sync-demos; service role only.';

alter table public.demo_listings enable row level security;

-- No anon/authenticated policies: Next.js API reads with service role (bypasses RLS).

-- Create a PUBLIC storage bucket named "demo-listings" (Dashboard → Storage),
-- or let `npm run sync-demos` create it via the Storage API.
