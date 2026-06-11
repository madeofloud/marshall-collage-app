import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Vision model used for locating the product in each photo.
const MODEL = 'claude-sonnet-4-6';

export const maxDuration = 60;

type DetectBox = { x: number; y: number; w: number; h: number };

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
    'This photo features a Marshall product — most likely a pair of dark',
    'over-ear Marshall headphones (with the brass "Marshall" script logo on the',
    'ear cup), or possibly a Marshall speaker. It is usually worn by or near a',
    'person, and may be shown from any angle and in any environment.',
    '',
    'Find the single Marshall product itself (NOT the person, NOT the head) and',
    'return a tight bounding box around just the visible Marshall product — the',
    'headphones (both ear cups + headband if visible) or the speaker. Exclude',
    'the surrounding person and environment as much as possible.',
    '',
    'Use a coordinate system where the top-left of the image is (0, 0) and the',
    'bottom-right is (1000, 1000).',
    '',
    'Respond with ONLY a JSON object, no prose, in exactly this shape:',
    '{"found": true, "x0": <left>, "y0": <top>, "x1": <right>, "y1": <bottom>}',
    'If no Marshall product is visible, respond {"found": false}.',
  ].join('\n');

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: imageUrl },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    const raw = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Could not parse detection result.', raw },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      found?: boolean;
      x0?: number;
      y0?: number;
      x1?: number;
      y1?: number;
    };

    if (!parsed.found) {
      return NextResponse.json({ found: false });
    }

    const x0 = clamp01((parsed.x0 ?? 0) / 1000);
    const y0 = clamp01((parsed.y0 ?? 0) / 1000);
    const x1 = clamp01((parsed.x1 ?? 0) / 1000);
    const y1 = clamp01((parsed.y1 ?? 0) / 1000);

    const box: DetectBox = {
      x: Math.min(x0, x1),
      y: Math.min(y0, y1),
      w: Math.abs(x1 - x0),
      h: Math.abs(y1 - y0),
    };

    if (box.w <= 0 || box.h <= 0) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({ found: true, box });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Detection failed.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
