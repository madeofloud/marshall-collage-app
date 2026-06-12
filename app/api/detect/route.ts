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
    'This photo contains a Marshall-branded audio product (speaker or headphones).',
    'Your task: locate the cursive gold/brass "Marshall" script logo on the product.',
    '',
    'Return FOUR values:',
    '  cx, cy  — pixel coordinate of the GEOMETRIC CENTER of the "Marshall" script',
    '             (the midpoint of the text baseline-to-cap bounding box)',
    '  angle   — degrees the script is tilted FROM horizontal.',
    '             Positive = clockwise tilt (right side lower than left).',
    '             Negative = counter-clockwise tilt (left side lower).',
    '             0 = perfectly horizontal. Typical range: -15 to +15.',
    '  logo_width — width of the "Marshall" script text in pixels.',
    '',
    'Use a coordinate system where the top-left of the image is (0, 0) and the',
    'bottom-right is (1000, 1000). logo_width is also in these same units.',
    '',
    'Respond with ONLY a JSON object, no prose:',
    '{"found": true, "cx": <0-1000>, "cy": <0-1000>, "angle": <degrees>, "logo_width": <0-1000>}',
    'If the Marshall script logo is not visible, respond {"found": false}.',
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

    const parsed = JSON.parse(jsonMatch[0]) as {
      found?: boolean;
      cx?: number;
      cy?: number;
      angle?: number;
      logo_width?: number;
    };
    if (!parsed.found || parsed.cx == null || parsed.cy == null) {
      return NextResponse.json({ found: false });
    }

    const cx = clamp01(parsed.cx / 1000);
    const cy = clamp01(parsed.cy / 1000);
    const angle = typeof parsed.angle === 'number' ? parsed.angle : 0;
    const logoWidth = typeof parsed.logo_width === 'number'
      ? clamp01(parsed.logo_width / 1000)
      : undefined;

    return NextResponse.json({ found: true, cx, cy, angle, logoWidth });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Detection failed.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
