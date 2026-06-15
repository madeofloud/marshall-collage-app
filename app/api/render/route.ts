import { NextResponse } from 'next/server';
import {
  renderMediaOnLambda,
  getRenderProgress,
} from '@remotion/lambda/client';
import {
  getCompositionId,
  type AspectFormat,
  type SizeTier,
} from '@/remotion/src/types';

export const maxDuration = 300; // 5 min

const REGION = (process.env.AWS_REGION as 'eu-central-1') || 'eu-central-1';
const FUNCTION_NAME = process.env.REMOTION_LAMBDA_FUNCTION_NAME!;
const SERVE_URL = process.env.REMOTION_SERVE_URL!;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      images,
      background,
      rotationSpeed,
      grainAmount,
      panelOverrides,
      format,
      sizeTier,
      codec,
    } = body as {
      images: string[];
      background: string;
      rotationSpeed: number;
      grainAmount: number;
      panelOverrides: Record<string, unknown>;
      format: AspectFormat;
      sizeTier: SizeTier;
      codec: 'h264' | 'prores';
    };

    if (!FUNCTION_NAME || !SERVE_URL) {
      return NextResponse.json(
        {
          error:
            'Remotion Lambda not configured. Set REMOTION_LAMBDA_FUNCTION_NAME and REMOTION_SERVE_URL in environment.',
        },
        { status: 500 }
      );
    }
    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }
    if (!format || !sizeTier) {
      return NextResponse.json(
        { error: 'Missing format or sizeTier' },
        { status: 400 }
      );
    }

    const compositionId = getCompositionId(format, sizeTier);
    const isTransparent = background === 'transparent';
    // h264 does not support alpha — force prores for transparent renders.
    const resolvedCodec = isTransparent ? 'prores' : codec === 'prores' ? 'prores' : 'h264';
    const fileExt = resolvedCodec === 'prores' ? 'mov' : 'mp4';

    const { renderId, bucketName } = await renderMediaOnLambda({
      region: REGION,
      functionName: FUNCTION_NAME,
      serveUrl: SERVE_URL,
      composition: compositionId,
      inputProps: {
        images,
        background,
        rotationSpeed,
        grainAmount,
        panelOverrides,
      },
      codec: resolvedCodec as 'h264' | 'prores',
      ...(isTransparent ? { pixelFormat: 'yuva444p10le' } : {}),
      framesPerLambda: 500,
      imageFormat: isTransparent ? 'png' : 'jpeg',
      maxRetries: 1,
      privacy: 'public',
      downloadBehavior: {
        type: 'download',
        fileName: `collage-${format}-${sizeTier}.${fileExt}`,
      },
    });

    // Return immediately — frontend polls /api/render-progress for status.
    return NextResponse.json({ renderId, bucketName });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Render failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
