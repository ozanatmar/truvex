-- Hero image URL for blog posts. Generated once when the post is created
-- by /api/blog/generate and reused on the post page + blog index thumbnail.
-- Nullable so older posts (and posts where image generation fails) still render.

ALTER TABLE truvex.blog_posts
  ADD COLUMN IF NOT EXISTS hero_image_url text;
