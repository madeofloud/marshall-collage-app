import { NextResponse } from 'next/server';
import { renderMediaOnLambda, getRenderProgress } from '@remotion/lambda/client';
import {
  type AspectFormat,
  type SizeTier,
  getFormatDimensions,
  ALL_SIZES,
} from '@/remotion/src/types';
import type { Alignment } from '@/remotion/src/stopMotionTypes';

export const maxDuration = 300;

const REGION = (process.env.AWS_REGION as 'eu-central-1') || 'eu-central-1';
const FUNCTION_NAME = process.env.REMOTION_LAMBDA_FUNCTION_NAME!;
const SERVE_URL = process.env.REMOTION_SERVE_URL!;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      images,
      alignments,
      framesPerImage,
      transition,
      targetSize,
      background,
      backgroundImage,
      format,
      sizeTier,
      codec,
    } = body as {
      images: string[];
      alignments: Record<string, Alignment>;
      framesPerImage: number;
      transition: 'cut' | 'crossfade';
      targetSize: number;
      background: string;
      backgroundImage?: string;
      format: AspectFormat;
      sizeTier: SizeTier;
      codec: 'h264' | 'prores';
    };

    if (!FUNCTION_NAME || !SERVE_URL) {
      return NextResponse.json(
        { error: 'Remotion Lambda not configured. Set REMOTION_LAMBDA_FUNCTION_NAME and REMOTION_SERVE_URL.' },
        { status: 500 }
      );
    }
    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    const compositionId = `StopMotion-${format}-${sizeTier}`;
    const isTransparent = background === 'transparent';

    // h264 doesn't support alpha — force prores for transparent renders.
    const resolvedCodec = isTransparent ? 'prores' : codec;
    const fileExt = resolvedCodec === 'prores' ? 'mov' : 'mp4';
    const { width, height } = getFormatDimensions(format, sizeTier);

    const { renderId, bucketName } = await renderMediaOnLambda({
      region: REGION,
      functionName: FUNCTION_NAME,
      serveUrl: SERVE_URL,
      composition: compositionId,
      inputProps: {
        images,
        alignments,
        framesPerImage,
        transition,
        targetSize,
        background,
        backgroundImage,
        showCenter: false,
      },
      codec: resolvedCodec as 'h264' | 'prores',
      ...(isTransparent ? { pixelFormat: 'yuva444p10le', proResProfile: '4444' } : {}),
      framesPerLambda: 500,
      imageFormat: isTransparent ? 'png' : 'jpeg',
      maxRetries: 1,
      privacy: 'public',
      downloadBehavior: {
        type: 'download',
        fileName: `stopmotion-${format}-${width}x${height}.${fileExt}`,
      },
    });

    // Return immediately — frontend polls /api/render-progress for status.
    return NextResponse.json({ renderId, bucketName });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Render failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
