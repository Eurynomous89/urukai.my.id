-- Run this once in the Supabase SQL Editor for the portfolio comments feature.

create table if not exists public.portfolio_comments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  comment text not null check (char_length(btrim(comment)) between 1 and 1000),
  avatar_path text check (
    avatar_path is null
    or avatar_path ~ '^comments/[0-9a-f-]+[.](png|jpg|jpeg|webp)$'
  ),
  created_at timestamptz not null default now()
);

create index if not exists portfolio_comments_created_at_idx
  on public.portfolio_comments (created_at desc);

alter table public.portfolio_comments enable row level security;

revoke all on table public.portfolio_comments from anon, authenticated;
grant usage on schema public to anon;
grant select, insert on table public.portfolio_comments to anon;

drop policy if exists "Visitors can read portfolio comments" on public.portfolio_comments;
create policy "Visitors can read portfolio comments"
  on public.portfolio_comments
  for select
  to anon
  using (true);

drop policy if exists "Visitors can post portfolio comments" on public.portfolio_comments;
create policy "Visitors can post portfolio comments"
  on public.portfolio_comments
  for insert
  to anon
  with check (
    char_length(btrim(name)) between 1 and 80
    and char_length(btrim(comment)) between 1 and 1000
    and (
      avatar_path is null
      or avatar_path ~ '^comments/[0-9a-f-]+[.](png|jpg|jpeg|webp)$'
    )
  );

-- Public read via the bucket URL; uploads are limited to the comments/ folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-comment-avatars',
  'portfolio-comment-avatars',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do nothing;

drop policy if exists "Visitors can upload portfolio comment avatars" on storage.objects;
create policy "Visitors can upload portfolio comment avatars"
  on storage.objects
  for insert
  to anon
  with check (
    bucket_id = 'portfolio-comment-avatars'
    and (storage.foldername(name))[1] = 'comments'
  );
