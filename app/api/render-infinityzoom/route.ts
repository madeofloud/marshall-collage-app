import { renderMediaOnCloudrun } from '@remotion/cloudrun/client';
import { type AspectFormat, type SizeTier, getFormatDimensions } from '@/remotion/src/types';

const INFINITY_ZOOM_FPS = 24;

export const maxDuration = 300;

const CLOUD_RUN_URL = process.env.REMOTION_CLOUDRUN_SERVICE_URL!;
const SERVE_URL = process.env.REMOTION_CLOUDRUN_SERVE_URL!;
const REGION = process.env.REMOTION_GCP_REGION || 'europe-west1';

export async function POST(request: Request) {
  const body = await request.json();
  const {
    items, zoomFactor, secondsPerImage, feather, depthBlur, driftAmount, backgroundColor,
    format, sizeTier, codec,
  } = body as {
    items: { url: string; type: 'image' | 'video' }[];
    zoomFactor: number;
    secondsPerImage: number;
    feather: number;
    depthBlur: number;
    driftAmount: number;
    backgroundColor: string;
    format: AspectFormat;
    sizeTier: SizeTier;
    codec: 'h264' | 'prores';
  };

  if (!CLOUD_RUN_URL || !SERVE_URL) {
    return new Response(JSON.stringify({ error: 'Cloud Run not configured.' }), { status: 500 });
  }

  const compositionId = `InfinityZoom-${format}-${sizeTier}`;
  const { width, height } = getFormatDimensions(format, sizeTier);
  const fileExt = codec === 'prores' ? 'mov' : 'mp4';
  const durationInFrames = Math.max(
    1,
    Math.round(secondsPerImage * INFINITY_ZOOM_FPS * Math.max(1, items.length))
  );

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
          inputProps: { items, zoomFactor, secondsPerImage, feather, depthBlur, driftAmount, backgroundColor },
          codec: codec as 'h264' | 'prores',
          ...(codec === 'prores' ? { pixelFormat: 'yuv422p10le', proResProfile: 'hq' } : {}),
          imageFormat: 'jpeg',
          privacy: 'public',
          outName: `infinityzoom-${format}-${width}x${height}.${fileExt}`,
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
