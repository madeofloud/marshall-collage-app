import { renderMediaOnCloudrun } from '@remotion/cloudrun/client';
import { type AspectFormat, type SizeTier, getFormatDimensions } from '@/remotion/src/types';

const FEEDBACK_FPS = 25;

export const maxDuration = 300;

const CLOUD_RUN_URL = process.env.REMOTION_CLOUDRUN_SERVICE_URL!;
const SERVE_URL = process.env.REMOTION_CLOUDRUN_SERVE_URL!;
const REGION = process.env.REMOTION_GCP_REGION || 'europe-west1';

export async function POST(request: Request) {
  const body = await request.json();
  const {
    layers, zoomFactor, rotationPerLayer, rotationSpeed, driftX, driftY,
    glowIntensity, glowColor, baseImage, baseVideo,
    bulgeAmount, scanlineOpacity, scanlineSpeed, featherAmount, durationSeconds,
    format, sizeTier, codec,
  } = body as {
    layers: number; zoomFactor: number; rotationPerLayer: number;
    rotationSpeed: number; driftX: number; driftY: number; glowIntensity: number;
    glowColor: string; baseImage?: string | null; baseVideo?: string | null;
    bulgeAmount: number; scanlineOpacity: number; scanlineSpeed: number; featherAmount: number;
    durationSeconds: number; format: AspectFormat; sizeTier: SizeTier;
    codec: 'h264' | 'prores';
  };

  if (!CLOUD_RUN_URL || !SERVE_URL) {
    return new Response(JSON.stringify({ error: 'Cloud Run not configured.' }), { status: 500 });
  }

  const compositionId = `FeedbackLoop-${format}-${sizeTier}`;
  const { width, height } = getFormatDimensions(format, sizeTier);
  const fileExt = codec === 'prores' ? 'mov' : 'mp4';
  const durationInFrames = Math.max(1, Math.round(durationSeconds * FEEDBACK_FPS));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        const result = await renderMediaOnCloudrun({
          cloudRunUrl: CLOUD_RUN_URL,
          region: REGION as 'europe-west1',
          serveUrl: SERVE_URL,
          composition: compositionId,
          inputProps: {
            layers, zoomFactor, rotationPerLayer, rotationSpeed, driftX, driftY,
            glowIntensity, glowColor, baseImage, baseVideo,
            bulgeAmount, scanlineOpacity, scanlineSpeed, featherAmount, durationSeconds,
          },
          codec: codec as 'h264' | 'prores',
          ...(codec === 'prores' ? { pixelFormat: 'yuv422p10le', proResProfile: 'hq' } : {}),
          imageFormat: 'jpeg',
          privacy: 'public',
          outName: `feedbackloop-${format}-${width}x${height}.${fileExt}`,
          updateRenderProgress: (p) => send({ progress: p }),
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
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
