import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

export const maxDuration = 60;

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured on the server.' },
      { status: 500 }
    );
  }

  let imageUrl: string | undefined;
  try {
    const body = await request.json();
    imageUrl = body?.imageUrl;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!imageUrl || typeof imageUrl !== 'string') {
    return NextResponse.json({ error: 'Missing imageUrl.' }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey });

  const prompt = [
    'This photo contains a Marshall-branded audio product (a speaker or headphones).',
    'Your ONLY task: find the GEOMETRIC CENTER of that Marshall device and return',
    'its exact pixel coordinate.',
    '',
    'The product is a Marshall-branded object — identified by the gold/brass cursive',
    '"Marshall" logo. It is ONE of:',
    '  • a boxy guitar-amp-style SPEAKER (rectangular box, textured grille, knobs on top)',
    '  • over-ear HEADPHONES (two padded ear cups on a headband)',
    '',
    'The center point is the visual midpoint of the WHOLE device — not the logo,',
    'not a knob, not an ear cup. Imagine a bounding rectangle around the entire',
    'device; return the center of that rectangle.',
    '',
    'CRITICAL: do NOT return the center of a person, face, hand, plant, furniture,',
    'or any other object — only the Marshall device itself.',
    '',
    'Use a coordinate system where the top-left of the image is (0, 0) and the',
    'bottom-right is (1000, 1000).',
    '',
    'Respond with ONLY a JSON object, no prose:',
    '{"found": true, "cx": <x center 0-1000>, "cy": <y center 0-1000>}',
    'If no Marshall product is visible, respond {"found": false}.',
  ].join('\n');

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 100,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: imageUrl } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    const raw = textBlock && textBlock.type === 'text' ? textBlock.text : '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse detection result.', raw }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]) as { found?: boolean; cx?: number; cy?: number };
    if (!parsed.found || parsed.cx == null || parsed.cy == null) {
      return NextResponse.json({ found: false });
    }

    const cx = clamp01(parsed.cx / 1000);
    const cy = clamp01(parsed.cy / 1000);

    // Return as both the new center-point format and a 1×1 box at the center
    // for backward compat with any code that still reads .box.
    return NextResponse.json({
      found: true,
      cx,
      cy,
      box: { x: cx - 0.001, y: cy - 0.001, w: 0.002, h: 0.002 },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Detection failed.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
