import React from 'react';
import { AbsoluteFill, Img, Video, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export type InfinityZoomItem = { url: string; type: 'image' | 'video' };

export type InfinityZoomProps = {
  items: InfinityZoomItem[];
  maxZoom: number;           // final magnification multiplier per image, e.g. 30 = 3000%
  secondsPerImage: number;   // duration each image zooms before the hidden cut (~2–3s)
  motionBlur: number;        // 0–1: blur ramped over the few frames around the cut to hide the seam
  driftAmount: number;       // 0–1: how far off-center each image zooms (varies per image)
  backgroundColor: string;
};

export const INFINITY_ZOOM_FPS = 24;

export const defaultInfinityZoomProps: InfinityZoomProps = {
  items: [],
  maxZoom: 30,
  secondsPerImage: 2.5,
  motionBlur: 0.5,
  driftAmount: 0.3,
  backgroundColor: '#000000',
};

// Deterministic per-image off-center origin using a simple integer hash, so
// each image zooms toward a slightly different point instead of dead center.
function imageOrigin(index: number, driftAmount: number): { ox: number; oy: number } {
  const s = ((index * 2654435761) >>> 0);
  const ox = 50 + (((s & 0xFF) / 255) - 0.5) * 2 * driftAmount * 35;
  const oy = 50 + ((((s >> 8) & 0xFF) / 255) - 0.5) * 2 * driftAmount * 35;
  return { ox, oy };
}

export const InfinityZoom: React.FC<InfinityZoomProps> = ({
  items, maxZoom, secondsPerImage, motionBlur, driftAmount, backgroundColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (items.length === 0) {
    return <AbsoluteFill style={{ background: backgroundColor }} />;
  }

  const N = items.length;
  const MAXZ = Math.max(2, maxZoom);
  const stepFrames = Math.max(1, Math.round(secondsPerImage * fps));
  const totalFrames = stepFrames * N;

  // Hidden-cut, single-stream infinite zoom:
  //  - One image is on screen at a time.
  //  - It scales 1 → MAXZ exponentially, i.e. at a CONSTANT zoom velocity in
  //    log space (no easing/acceleration). By the time it reaches MAXZ the
  //    image is just colour fields / noise and can't be identified.
  //  - At that peak an invisible hard cut swaps to the next image, which starts
  //    again at scale 1 and continues at the exact same velocity. Because the
  //    outgoing frame was abstract and the perceived speed is unbroken, the eye
  //    reads it as the camera continuing forward through one endless space.
  //  - Each image zooms toward a slightly different off-center point (drift) so
  //    the tunnel varies and feels more hallucinogenic.
  //  - Loops after N images (last image cuts back to the first).
  const tf = ((frame % totalFrames) + totalFrames) % totalFrames;
  const idxF = tf / stepFrames;
  const index = Math.floor(idxF) % N;
  const localFrac = idxF - Math.floor(idxF); // 0 → 1 within this image's window

  // Exponential scale => constant log-velocity => constant perceived zoom speed.
  const scale = Math.pow(MAXZ, localFrac);

  // Motion blur ramps up over the few frames either side of the cut (the seam),
  // and is zero through the middle of the window where the image is sharp.
  const edge = Math.min(localFrac, 1 - localFrac);
  const blurWindow = Math.min(0.12, 3 / stepFrames); // ~3 frames each side
  const blurPx = motionBlur > 0 && edge < blurWindow
    ? interpolate(edge, [0, blurWindow], [motionBlur * 45, 0], { extrapolateRight: 'clamp' })
    : 0;

  const { ox, oy } = imageOrigin(index, driftAmount);

  const item = items[index];
  const mediaStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };

  return (
    <AbsoluteFill style={{ background: backgroundColor, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          transformOrigin: `${ox}% ${oy}%`,
          filter: blurPx > 0.05 ? `blur(${blurPx}px)` : undefined,
        }}
      >
        {item.type === 'video'
          ? <Video src={item.url} style={mediaStyle} pauseWhenBuffering loop />
          : <Img src={item.url} style={mediaStyle} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
