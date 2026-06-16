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
    return new Response(
      JSON.stringify({ error: 'Cloud Run not configured.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (!images || images.length === 0) {
    return new Response(JSON.stringify({ error: 'No images provided' }), { status: 400 });
  }

  const compositionId = `StopMotion-${format}-${sizeTier}`;
  const isTransparent = background === 'transparent';
  const resolvedCodec = isTransparent ? 'prores' : codec;
  const fileExt = resolvedCodec === 'prores' ? 'mov' : 'mp4';
  const { width, height } = getFormatDimensions(format, sizeTier);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
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
          updateRenderProgress: (p) => {
            send({ progress: p });
          },
        });

        if (result.type === 'success') {
          send({ done: true, downloadUrl: result.publicUrl });
        } else {
          send({ error: 'Render failed' });
        }
      } catch (err) {
        send({ error: err instanceof Error ? err.message : 'Render failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
