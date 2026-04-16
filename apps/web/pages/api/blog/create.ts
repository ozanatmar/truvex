import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS for insert
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function getUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let attempt = 0;
  while (true) {
    const { data } = await supabase
      .schema('truvex')
      .from('blog_posts')
      .select('slug')
      .eq('slug', slug)
      .single();
    if (!data) return slug;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  const auth = req.headers.authorization;
  const secret = process.env.BLOG_CREATE_SECRET;
  if (!auth || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, body_html, description, truvex_angle } = req.body;

  if (!title || !body_html) {
    return res.status(400).json({ error: 'title and body_html are required' });
  }

  const baseSlug = generateSlug(title);
  const slug = await getUniqueSlug(baseSlug);

  const { data, error } = await supabase
    .schema('truvex')
    .from('blog_posts')
    .insert({
      title,
      slug,
      description: description ?? null,
      body_html,
      truvex_angle: truvex_angle ?? null,
    })
    .select('slug')
    .single();

  if (error) {
    console.error('Blog insert error:', error);
    return res.status(500).json({ error: 'Failed to create post' });
  }

  const url = `https://truvex.app/blog/${data.slug}`;
  return res.status(201).json({ url, slug: data.slug });
}
