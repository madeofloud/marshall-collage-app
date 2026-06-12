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
    'Each photo contains exactly ONE Marshall-branded audio product. It is the',
    'hero object. Your ONLY task is to return a tight bounding box around that',
    'single Marshall product.',
    '',
    'The product is identified by the gold/brass cursive "Marshall" logo and is',
    'ONE of these two forms:',
    '  • a boxy guitar-amp-style SPEAKER (a rectangular box with a textured',
    '    fret-cloth grille on the front and control knobs on top), OR',
    '  • over-ear HEADPHONES (two round padded ear cups on a headband).',
    'Box the WHOLE visible product device (the entire speaker box, or the whole',
    'headphones), not just a sub-part.',
    '',
    'CRITICAL — these are NOT the product. Never box them, even if they are big',
    'and in the foreground:',
    '  • the person, their face, ear, hair, hands, or body',
    '  • sunglasses, glasses, jewellery, clothing',
    '  • plants, furniture, walls, vinyl records, turntables, books, lamps',
    'If a person fills most of the frame and the Marshall product is small or in',
    'the background, still box the small Marshall product — NOT the person.',
    '',
    'Use a coordinate system where the top-left of the image is (0, 0) and the',
    'bottom-right is (1000, 1000).',
    '',
    'Respond with ONLY a JSON object, no prose, in exactly this shape:',
    '{"found": true, "label": "<speaker|headphones>", "x0": <left>, "y0": <top>, "x1": <right>, "y1": <bottom>}',
    'If no Marshall product is visible at all, respond {"found": false}.',
  ].join('\n');

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      temperature: 0,
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
      label?: string;
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

    const rawX = Math.min(x0, x1);
    const rawY = Math.min(y0, y1);
    const rawW = Math.abs(x1 - x0);
    const rawH = Math.abs(y1 - y0);

    if (rawW <= 0 || rawH <= 0) {
      return NextResponse.json({ found: false });
    }

    // Add symmetric padding around the anchor so the zoom level stays reasonable
    // (preserves center position, prevents the image rendering at 10 000+ px).
    // Note: we intentionally do NOT clamp to 0..1 here — keeping the box
    // symmetric around the true anchor center is what guarantees the product
    // lands exactly on the canvas center. Coordinates outside 0..1 are fine;
    // they just mean part of the padding falls outside the image.
    const PAD = 0.05;
    const box: DetectBox = {
      x: rawX - PAD,
      y: rawY - PAD,
      w: rawW + PAD * 2,
      h: rawH + PAD * 2,
    };

    return NextResponse.json({ found: true, box });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Detection failed.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
