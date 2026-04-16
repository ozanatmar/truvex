create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  body_html text not null,
  truvex_angle text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists blog_posts_slug_idx on public.blog_posts (slug);
create index if not exists blog_posts_published_at_idx on public.blog_posts (published_at desc);

alter table public.blog_posts enable row level security;

-- Public read access — anyone can read published posts
create policy "Public can read blog posts"
  on public.blog_posts for select
  using (true);

-- No public insert/update/delete — only the service role can write
