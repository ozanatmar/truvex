// Turn a blog title into a URL slug. Cap at 60 chars and trim at the
// last complete word so we never cut mid-word ("kitche") on long titles.
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (base.length <= 60) return base;
  const trimmed = base.slice(0, 60).replace(/-[^-]*$/, '');
  return trimmed.length > 0 ? trimmed : base.slice(0, 60);
}
