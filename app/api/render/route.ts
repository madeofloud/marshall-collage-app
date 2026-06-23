import { renderMediaOnCloudrun } from '@remotion/cloudrun/client';
import {
  getCompositionId,
  type AspectFormat,
  type SizeTier,
} from '@/remotion/src/types';

export const maxDuration = 300;

const CLOUD_RUN_URL = process.env.REMOTION_CLOUDRUN_SERVICE_URL!;
const SERVE_URL = process.env.REMOTION_CLOUDRUN_SERVE_URL!;
const REGION = process.env.REMOTION_GCP_REGION || 'europe-west1';

export async function POST(request: Request) {
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
    camTilt = 0,
    camRoll = 0,
    camTiltSwing = 0,
    camRollSwing = 0,
    camSwingSpeed = 1,
  } = body as {
    images: string[];
    background: string;
    rotationSpeed: number;
    grainAmount: number;
    panelOverrides: Record<string, unknown>;
    format: AspectFormat;
    sizeTier: SizeTier;
    codec: 'h264' | 'prores';
    camTilt?: number;
    camRoll?: number;
    camTiltSwing?: number;
    camRollSwing?: number;
    camSwingSpeed?: number;
  };

  if (!CLOUD_RUN_URL || !SERVE_URL) {
    return new Response(
      JSON.stringify({ error: 'Cloud Run not configured. Set REMOTION_CLOUDRUN_SERVICE_URL and REMOTION_CLOUDRUN_SERVE_URL.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (!images || images.length === 0) {
    return new Response(JSON.stringify({ error: 'No images provided' }), { status: 400 });
  }

  const compositionId = getCompositionId(format, sizeTier);
  const isTransparent = background === 'transparent';
  const resolvedCodec = isTransparent ? 'prores' : codec === 'prores' ? 'prores' : 'h264';
  const fileExt = resolvedCodec === 'prores' ? 'mov' : 'mp4';

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
            background,
            rotationSpeed,
            grainAmount: isTransparent ? 0 : grainAmount,
            panelOverrides,
            camTilt,
            camRoll,
            camTiltSwing,
            camRollSwing,
            camSwingSpeed,
          },
          codec: resolvedCodec as 'h264' | 'prores',
          ...(isTransparent ? { pixelFormat: 'yuva444p10le', proResProfile: '4444' } : {}),
          imageFormat: isTransparent ? 'png' : 'jpeg',
          privacy: 'public',
          outName: `collage-${format}-${sizeTier}.${fileExt}`,
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
