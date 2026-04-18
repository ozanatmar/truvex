// Rewrite a Supabase Storage public URL onto the render/image transform
// path so width + quality + resize params are honored. For any URL that does
// not look like a Supabase public-object URL, return it unchanged so the
// callsite still renders (just without optimization).
export function optimizedImageUrl(
  url: string | null | undefined,
  opts: { width: number; height?: number; quality?: number; resize?: 'cover' | 'contain' }
): string | null {
  if (!url) return null;
  const quality = opts.quality ?? 80;
  const resize = opts.resize ?? 'cover';

  const marker = '/storage/v1/object/public/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const base = url.slice(0, idx) + '/storage/v1/render/image/public/' + url.slice(idx + marker.length);
  const sep = base.includes('?') ? '&' : '?';
  const params = new URLSearchParams();
  params.set('width', String(opts.width));
  if (opts.height) params.set('height', String(opts.height));
  params.set('quality', String(quality));
  params.set('resize', resize);
  return base + sep + params.toString();
}
