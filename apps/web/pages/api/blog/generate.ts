import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { generateSlug } from '../../../lib/slug';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const SYSTEM_PROMPT = `You are a content writer for Truvex, a mobile app that helps restaurant and hospitality managers fill last-minute shift callouts. When a worker calls in sick, the manager taps one button and all qualified off-duty workers are notified instantly via push notification and SMS. Multiple workers can accept, and the manager selects who covers.

The founder of Truvex, Ozan Atmar, worked in a restaurant kitchen in Wisconsin Dells and spent over a decade supplying the HORECA industry across Bulgaria and the EU. The brand voice is grounded, honest, and written by someone who has lived inside these problems — not a marketing agency observing from the outside.

YOUR TASK:
Write a blog post based on the title, description, and Truvex angle provided by the user.

TONE AND STYLE:
- Write in third person, objective voice — as if this is a researched industry article, not a personal essay or company blog post
- Never use first person pronouns: no "I", "me", "my", "we", "our", "us"
- Never write as if the author is speaking directly
- Avoid second person overuse — "you" is acceptable occasionally but the post should read primarily as factual, researched content
- The tone should feel like it came from an industry publication or trade journal
- Present advice and observations as established best practices or industry patterns, not personal opinions
- Write like a knowledgeable industry insider, not a marketer
- Conversational but professional — the way a seasoned restaurant manager talks to a peer
- Empathetic to the real stress of running a shift-based operation
- Occasionally direct and blunt — this industry has no time for fluff
- Never use hype language, superlatives, or phrases like "game-changer", "revolutionary", "cutting-edge", or "seamless"
- Avoid bullet-point listicles unless the topic genuinely calls for a list
- Write in flowing paragraphs with a clear narrative arc
- Use specific, concrete details and scenarios rather than vague generalities
- Vary sentence length — mix short punchy sentences with longer explanatory ones

TRUVEX MENTIONS:
- Mention Truvex naturally, once or twice in the post — never as a hard sell
- Frame it as one practical solution among the broader advice, not the entire point of the post
- Never start or end the post with a product pitch
- The post should be genuinely useful even if the reader never uses Truvex

STRUCTURE:
- Opening: hook the reader immediately with a specific scenario, a painful moment, or a provocative statement, never a generic introduction
- Body: develop the topic with practical insight, real-world scenarios, and actionable advice
- Closing: end with a thought, a challenge, or a forward-looking statement, not a call-to-action
- At least half of the h2 section headings must contain a word or phrase a restaurant or hospitality manager would plausibly search for (for example: "shift coverage", "no-show", "callout", "scheduling", "turnover", "labor cost"). Headings must stay natural-sounding and never keyword-stuffed.

LENGTH:
500 to 700 words

OUTPUT FORMAT:
Return a single JSON object with exactly four keys:
- "title": a unique, specific, SEO-friendly blog post title inspired by the topic. Do not copy the topic title verbatim, write a fresh angle on it. Must be under 55 characters so it does not get truncated in Google search results.
- "description": a meta description between 140 and 160 characters that reads like a benefit-driven snippet designed to earn a click from a search result (promise a concrete takeaway, avoid restating the title, avoid em dashes). Never exceed 160 characters.
- "hero_image_alt": a descriptive alt text for the post's hero image, 8 to 15 words, describing the scene literally (who is in it, what they are doing, what the setting is). Do not include phrases like "image of" or "picture of". Do not use the post title.
- "body_html": the full article body as clean HTML. Rules for body_html:
  - Start directly with the first paragraph, no title tag, no h1
  - Use <h2> for section headings
  - Use <p> for paragraphs
  - Use <ul> and <li> only when a genuine list is warranted
  - Use <strong> sparingly for emphasis
  - Do not include <html>, <head>, <body>, <article>, or any wrapper tags
  - Do not include markdown, code fences, or any text outside the HTML
  - Do not use em dashes anywhere in the body. Use commas, periods, or parentheses instead.

Return only the raw JSON object. No markdown, no code fences, no explanation before or after. The first character of your response must be { and the last must be }.`;

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

function isValidImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:';
  } catch {
    return false;
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

  const {
    title,
    description,
    truvex_angle,
    hero_image_url,
    schema_type,
    schema_data,
  } = req.body ?? {};

  if (!title || !description) {
    return res.status(400).json({ error: 'title and description are required' });
  }

  // hero_image_url is optional. Image generation now happens in Make.com
  // (OpenAI + Supabase storage modules) and the resulting public URL is
  // passed in here. If provided, it must be a valid https URL.
  const heroImageUrl = hero_image_url !== undefined && hero_image_url !== null && hero_image_url !== ''
    ? (isValidImageUrl(hero_image_url) ? hero_image_url : null)
    : null;
  if (hero_image_url && !heroImageUrl) {
    return res.status(400).json({ error: 'hero_image_url must be a valid https URL' });
  }

  // schema_type + schema_data are optional. When provided, they get stored
  // as-is and emitted as an additional JSON-LD block on the post page
  // (HowTo, FAQPage, etc.). schema_data must be a plain object.
  const schemaType = typeof schema_type === 'string' && schema_type.length > 0 && schema_type.length <= 80
    ? schema_type
    : null;
  const schemaData = schema_data && typeof schema_data === 'object' && !Array.isArray(schema_data)
    ? schema_data
    : null;
  if (schema_type && !schemaType) {
    return res.status(400).json({ error: 'schema_type must be a non-empty string under 80 chars' });
  }
  if (schema_data && !schemaData) {
    return res.status(400).json({ error: 'schema_data must be a JSON object' });
  }

  // Call OpenAI
  let parsed: {
    title: string;
    description: string;
    body_html: string;
    hero_image_alt?: string;
  };

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.4',
      max_completion_tokens: 1200,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Title: ${title}\nDescription: ${description}\nTruvex angle: ${truvex_angle ?? ''}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '';

    // Strip any accidental markdown fences
    const clean = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

    parsed = JSON.parse(clean);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('OpenAI error or JSON parse error:', message);
    return res.status(500).json({ error: 'Failed to generate blog post', detail: message });
  }

  if (!parsed.title || !parsed.body_html) {
    return res.status(500).json({ error: 'Invalid LLM response structure' });
  }

  // Insert into Supabase
  const baseSlug = generateSlug(parsed.title);
  const slug = await getUniqueSlug(baseSlug);

  const heroImageAlt =
    typeof parsed.hero_image_alt === 'string' && parsed.hero_image_alt.trim().length > 0
      ? parsed.hero_image_alt.trim().slice(0, 300)
      : null;

  const { data, error } = await supabase
    .schema('truvex')
    .from('blog_posts')
    .insert({
      title: parsed.title,
      slug,
      description: parsed.description ?? null,
      body_html: parsed.body_html,
      truvex_angle: truvex_angle ?? null,
      hero_image_url: heroImageUrl,
      hero_image_alt: heroImageAlt,
      schema_type: schemaType,
      schema_data: schemaData,
    })
    .select('slug, hero_image_url')
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    return res.status(500).json({ error: 'Failed to save blog post' });
  }

  const url = `https://truvex.app/blog/${data.slug}`;
  return res.status(201).json({ url, slug: data.slug, image_url: data.hero_image_url });
}
