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
    'These photos all feature the SAME single Marshall-branded product, shown',
    'from different angles and in different environments. It is usually a dark',
    'over-ear Marshall headphone (a round cushioned ear cup bearing the brass',
    '"Marshall" script logo), but it could also be a Marshall speaker or other',
    'Marshall product.',
    '',
    'Your job is to return a TIGHT, CONSISTENT bounding box around the single',
    'most recognizable, stable face of the product, so that the same physical',
    'anchor lands in the same place across every photo:',
    '  • For headphones: box ONLY the one round ear cup that shows the Marshall',
    '    logo (the circular cup facing the camera). Do NOT include the headband,',
    '    the other ear cup, hair, or the head — just the round cup.',
    '  • For a speaker or other product: box the whole product front face.',
    '',
    'Make the box as tight as possible around that anchor and be consistent in',
    'how much you include from photo to photo.',
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

    const rawX = Math.min(x0, x1);
    const rawY = Math.min(y0, y1);
    const rawW = Math.abs(x1 - x0);
    const rawH = Math.abs(y1 - y0);

    if (rawW <= 0 || rawH <= 0) {
      return NextResponse.json({ found: false });
    }

    // Add symmetric padding around the anchor so the zoom level stays reasonable
    // (preserves center position, prevents the image rendering at 10 000+ px).
    const PAD = 0.12;
    const cx = rawX + rawW / 2;
    const cy = rawY + rawH / 2;
    const padX1 = clamp01(cx - rawW / 2 - PAD);
    const padY1 = clamp01(cy - rawH / 2 - PAD);
    const padX2 = clamp01(cx + rawW / 2 + PAD);
    const padY2 = clamp01(cy + rawH / 2 + PAD);

    const box: DetectBox = {
      x: padX1,
      y: padY1,
      w: padX2 - padX1,
      h: padY2 - padY1,
    };

    return NextResponse.json({ found: true, box });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Detection failed.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
