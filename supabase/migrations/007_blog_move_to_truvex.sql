-- Move blog_posts from public schema to truvex schema

create table if not exists truvex.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  body_html text not null,
  truvex_angle text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists truvex_blog_posts_slug_idx on truvex.blog_posts (slug);
create index if not exists truvex_blog_posts_published_at_idx on truvex.blog_posts (published_at desc);

alter table truvex.blog_posts enable row level security;

create policy "Public can read blog posts"
  on truvex.blog_posts for select
  using (true);

-- Migrate any existing rows
insert into truvex.blog_posts
  select * from public.blog_posts
  on conflict (slug) do nothing;

-- Drop old table
drop table if exists public.blog_posts;
