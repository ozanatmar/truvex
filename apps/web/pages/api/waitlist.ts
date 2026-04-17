import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash, randomBytes } from 'node:crypto';
import { supabaseAdmin } from '../../lib/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, number[]>();

// If WAITLIST_IP_SALT is missing we generate a process-local salt so the
// endpoint still works, but warn loudly so it's caught in staging.
let cachedSalt: string | null = null;
function getIpSalt(): string {
  const envSalt = process.env.WAITLIST_IP_SALT;
  if (envSalt && envSalt.length > 0) return envSalt;
  if (!cachedSalt) {
    cachedSalt = randomBytes(32).toString('hex');
    console.warn(
      '[waitlist] WAITLIST_IP_SALT is not set; using an ephemeral per-process salt. Set WAITLIST_IP_SALT in the environment.'
    );
  }
  return cachedSalt;
}

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? 'unknown';
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + getIpSalt()).digest('hex');
}

function checkRateLimit(ipHash: string): boolean {
  const now = Date.now();
  const history = rateLimitMap.get(ipHash) ?? [];
  const recent = history.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ipHash, recent);
    return false;
  }
  recent.push(now);
  rateLimitMap.set(ipHash, recent);
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, source } = (req.body ?? {}) as { email?: unknown; source?: unknown };

  if (typeof email !== 'string') {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.length === 0 || normalizedEmail.length > MAX_EMAIL_LENGTH) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const ip = getClientIp(req);
  const ip_hash = hashIp(ip);

  if (!checkRateLimit(ip_hash)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const user_agent =
    typeof req.headers['user-agent'] === 'string'
      ? req.headers['user-agent'].slice(0, 500)
      : null;

  const safeSource =
    typeof source === 'string' && source.length > 0 && source.length <= 64
      ? source
      : null;

  const { error } = await supabaseAdmin
    .schema('truvex')
    .from('waitlist_signups')
    .insert({
      email: normalizedEmail,
      source: safeSource,
      user_agent,
      ip_hash,
    });

  if (error) {
    // 23505 = unique_violation. Signal duplicate so the UI can show a
    // distinct message instead of the generic success state.
    if ((error as { code?: string }).code === '23505') {
      return res.status(200).json({ ok: true, already: true });
    }
    console.error('[waitlist] insert failed:', error);
    return res.status(500).json({ error: 'Something went wrong' });
  }

  return res.status(200).json({ ok: true });
}
