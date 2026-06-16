import { NextResponse } from 'next/server';
import { renderMediaOnCloudrun } from '@remotion/cloudrun/client';
import {
  type AspectFormat,
  type SizeTier,
  getFormatDimensions,
} from '@/remotion/src/types';
import type { Alignment } from '@/remotion/src/stopMotionTypes';

export const maxDuration = 300;

const CLOUD_RUN_URL = process.env.REMOTION_CLOUDRUN_SERVICE_URL!;
const SERVE_URL = process.env.REMOTION_CLOUDRUN_SERVE_URL!;
const REGION = process.env.REMOTION_GCP_REGION || 'europe-west1';

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

    if (!CLOUD_RUN_URL || !SERVE_URL) {
      return NextResponse.json(
        { error: 'Cloud Run not configured. Set REMOTION_CLOUDRUN_SERVICE_URL and REMOTION_CLOUDRUN_SERVE_URL.' },
        { status: 500 }
      );
    }
    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    const compositionId = `StopMotion-${format}-${sizeTier}`;
    const isTransparent = background === 'transparent';
    const resolvedCodec = isTransparent ? 'prores' : codec;
    const fileExt = resolvedCodec === 'prores' ? 'mov' : 'mp4';
    const { width, height } = getFormatDimensions(format, sizeTier);

    const result = await renderMediaOnCloudrun({
      cloudRunUrl: CLOUD_RUN_URL,
      region: REGION as 'europe-west1',
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
      imageFormat: isTransparent ? 'png' : 'jpeg',
      privacy: 'public',
      outName: `stopmotion-${format}-${width}x${height}.${fileExt}`,
    });

    if (result.type !== 'success') {
      return NextResponse.json({ error: 'Render failed' }, { status: 500 });
    }

    return NextResponse.json({ downloadUrl: result.publicUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Render failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
