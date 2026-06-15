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
      ...(isTransparent ? { pixelFormat: 'yuva420p' } : {}),
      imageFormat: 'jpeg',
      maxRetries: 1,
      privacy: 'public',
      downloadBehavior: {
        type: 'download',
        fileName: `stopmotion-${format}-${width}x${height}.${fileExt}`,
      },
    });

    const startTime = Date.now();
    const TIMEOUT_MS = 4 * 60 * 1000;
    while (Date.now() - startTime < TIMEOUT_MS) {
      const progress = await getRenderProgress({
        renderId,
        bucketName,
        functionName: FUNCTION_NAME,
        region: REGION,
      });
      if (progress.fatalErrorEncountered) {
        return NextResponse.json(
          { error: 'Render failed: ' + (progress.errors[0]?.message || 'Unknown') },
          { status: 500 }
        );
      }
      if (progress.done) {
        return NextResponse.json({ downloadUrl: progress.outputFile, renderId });
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    return NextResponse.json({ error: 'Render timed out' }, { status: 504 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Render failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
