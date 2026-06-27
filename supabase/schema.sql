-- Pick or Pass v1.6 saved listings + feedback schema.
-- Run in Supabase SQL editor, then create a private Storage bucket named
-- saved-listing-photos unless SUPABASE_SAVED_LISTINGS_BUCKET overrides it.

create extension if not exists "pgcrypto";

create table if not exists public.saved_listings (
  id uuid primary key default gen_random_uuid(),
  owner_token text not null,
  result_key text not null default '',
  source text not null check (source in ('demo', 'analyze')),
  listing_text text,
  listing_label text,
  listing_image_urls jsonb not null default '[]'::jsonb,
  analysis_result jsonb not null,
  grade text not null check (grade in ('good', 'not_sure', 'avoid')),
  text_photo_alignment text not null check (
    text_photo_alignment in (
      'matches',
      'partially_matches',
      'contradicts',
      'insufficient_text'
    )
  ),
  user_saved boolean not null default true,
  allow_improvement_use boolean not null default false,
  improvement_review_status text not null default 'not_shared' check (
    improvement_review_status in (
      'not_shared',
      'unreviewed',
      'eval_candidate',
      'added_to_eval',
      'rejected'
    )
  ),
  created_at timestamptz not null default now()
);

create index if not exists saved_listings_owner_created_idx
  on public.saved_listings (owner_token, created_at desc);

alter table public.saved_listings
  add column if not exists result_key text not null default '';

create unique index if not exists saved_listings_owner_result_key_unique
  on public.saved_listings (owner_token, result_key)
  where result_key <> '';

alter table public.saved_listings
  add column if not exists listing_image_urls jsonb not null default '[]'::jsonb;

alter table public.saved_listings
  add column if not exists user_saved boolean not null default true;

create index if not exists saved_listings_owner_saved_created_idx
  on public.saved_listings (owner_token, user_saved, created_at desc);

alter table public.saved_listings
  add column if not exists improvement_review_status text not null default 'not_shared'
  check (
    improvement_review_status in (
      'not_shared',
      'unreviewed',
      'eval_candidate',
      'added_to_eval',
      'rejected'
    )
  );

create index if not exists saved_listings_improvement_review_status_idx
  on public.saved_listings (improvement_review_status, created_at desc);

create table if not exists public.saved_listing_photos (
  id uuid primary key default gen_random_uuid(),
  saved_listing_id uuid not null references public.saved_listings(id) on delete cascade,
  storage_path text not null,
  original_filename text,
  content_type text,
  created_at timestamptz not null default now()
);

create index if not exists saved_listing_photos_listing_idx
  on public.saved_listing_photos (saved_listing_id);

create table if not exists public.listing_feedback (
  id uuid primary key default gen_random_uuid(),
  saved_listing_id uuid references public.saved_listings(id) on delete set null,
  owner_token text not null,
  helpfulness text not null check (helpfulness in ('helpful', 'not_helpful')),
  grade_accuracy text not null check (
    grade_accuracy in ('right', 'wrong', 'not_sure', 'not_contacted')
  ),
  issue_tags text[] not null default '{}',
  comment text,
  metadata jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listing_feedback
  add column if not exists updated_at timestamptz not null default now();

create index if not exists listing_feedback_saved_listing_idx
  on public.listing_feedback (saved_listing_id, created_at desc);

create unique index if not exists listing_feedback_saved_listing_owner_unique
  on public.listing_feedback (saved_listing_id, owner_token);

create index if not exists listing_feedback_owner_created_idx
  on public.listing_feedback (owner_token, created_at desc);

create table if not exists public.improvement_reviews (
  id uuid primary key default gen_random_uuid(),
  saved_listing_id uuid not null references public.saved_listings(id) on delete cascade,
  decision text not null check (
    decision in ('eval_candidate', 'added_to_eval', 'rejected')
  ),
  review_notes text,
  created_at timestamptz not null default now()
);

create index if not exists improvement_reviews_listing_idx
  on public.improvement_reviews (saved_listing_id, created_at desc);

alter table public.saved_listings enable row level security;
alter table public.saved_listing_photos enable row level security;
alter table public.listing_feedback enable row level security;
alter table public.improvement_reviews enable row level security;
