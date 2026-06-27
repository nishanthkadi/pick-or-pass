-- Pick or Pass v1.6 saved listings + feedback schema.
-- Run in Supabase SQL editor, then create a private Storage bucket named
-- saved-listing-photos unless SUPABASE_SAVED_LISTINGS_BUCKET overrides it.

create extension if not exists "pgcrypto";

create table if not exists public.saved_listings (
  id uuid primary key default gen_random_uuid(),
  owner_token text not null,
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
  allow_improvement_use boolean not null default false,
  review_status text not null default 'not_shared' check (
    review_status in (
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

create index if not exists saved_listings_review_status_idx
  on public.saved_listings (review_status, created_at desc);

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
  created_at timestamptz not null default now()
);

create index if not exists listing_feedback_saved_listing_idx
  on public.listing_feedback (saved_listing_id, created_at desc);

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
