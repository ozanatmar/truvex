-- SEO-related fields for blog posts:
-- * hero_image_alt: descriptive alt text for the hero image. Critical for
--   accessibility and for Google Images indexing. Fallback to title if null.
-- * updated_at: separate from published_at so article:modified_time and
--   schema.org dateModified reflect real edits, not the first publish.
-- * schema_type, schema_data: optional extra JSON-LD (HowTo, FAQPage, etc.)
--   layered alongside the BlogPosting graph on post pages.

ALTER TABLE truvex.blog_posts
  ADD COLUMN IF NOT EXISTS hero_image_alt text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz not null default now(),
  ADD COLUMN IF NOT EXISTS schema_type text,
  ADD COLUMN IF NOT EXISTS schema_data jsonb;

CREATE OR REPLACE FUNCTION truvex.set_blog_posts_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_posts_set_updated_at ON truvex.blog_posts;
CREATE TRIGGER blog_posts_set_updated_at
  BEFORE UPDATE ON truvex.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION truvex.set_blog_posts_updated_at();
