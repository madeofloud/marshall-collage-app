import React from 'react';
import { AbsoluteFill, Img, Video, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export type InfinityZoomItem = { url: string; type: 'image' | 'video' };

export type InfinityZoomProps = {
  items: InfinityZoomItem[];
  zoomFactor: number;       // how much the nested portal grows per step (e.g. 2.2)
  secondsPerImage: number;  // duration of each zoom step
  feather: number;          // 0–1: softness of the nested rectangle edges
  depthBlur: number;        // 0–1: blur on distant (small) layers
  driftAmount: number;      // 0–1: how far off-center each portal sits
  backgroundColor: string;
};

export const INFINITY_ZOOM_FPS = 24;

export const defaultInfinityZoomProps: InfinityZoomProps = {
  items: [],
  zoomFactor: 2.2,
  secondsPerImage: 1.5,
  feather: 0.06,
  depthBlur: 0.15,
  driftAmount: 0.2,
  backgroundColor: '#000000',
};

// Deterministic per-image off-center origin using a simple integer hash, so the
// nested portal sits at a slightly different point per image instead of dead center.
function layerOrigin(idx: number, driftAmount: number): { ox: number; oy: number } {
  const s = ((idx * 2654435761) >>> 0);
  const ox = 50 + (((s & 0xFF) / 255) - 0.5) * 2 * driftAmount * 30;
  const oy = 50 + ((((s >> 8) & 0xFF) / 255) - 0.5) * 2 * driftAmount * 30;
  return { ox, oy };
}

export const InfinityZoom: React.FC<InfinityZoomProps> = ({
  items, zoomFactor, secondsPerImage, feather, depthBlur, driftAmount, backgroundColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (items.length === 0) {
    return <AbsoluteFill style={{ background: backgroundColor }} />;
  }

  const N = items.length;
  const Z = Math.max(1.3, zoomFactor);
  const stepFrames = Math.max(1, Math.round(secondsPerImage * fps));
  const totalFrames = stepFrames * N;

  // Recursive / Droste infinite zoom:
  //  - The current image fills the screen and scales up continuously.
  //  - The NEXT image is nested as a smaller rectangle centred (or drifted) on
  //    top of it, scaling up at the exact same rate.
  //  - Each deeper layer (o) is the same image shrunk by Z^o so it reads as a
  //    rectangular "portal" embedded in the layer in front of it.
  //  - When a layer reaches full screen the modulo recursion swaps it out
  //    seamlessly (invisible cut), so the camera never appears to stop.
  //  - Exponential scale => constant log-velocity => constant perceived speed.
  const tf = ((frame % totalFrames) + totalFrames) % totalFrames;
  const frac = (tf % stepFrames) / stepFrames; // 0 → 1 within the current step
  const step = Math.floor(tf / stepFrames);     // which image currently fills the screen

  // How many nested layers until the deepest is too small to matter.
  const depth = Math.ceil(Math.log(1 / 0.015) / Math.log(Z)) + 1;

  // Rectangular edge feather (fades all four sides). feather 0 → hard edges.
  const f = feather * 9; // percent inset
  const rectMask = f > 0.01
    ? {
        WebkitMaskImage:
          `linear-gradient(to right, transparent 0%, #000 ${f}%, #000 ${100 - f}%, transparent 100%), ` +
          `linear-gradient(to bottom, transparent 0%, #000 ${f}%, #000 ${100 - f}%, transparent 100%)`,
        WebkitMaskComposite: 'source-in',
        maskImage:
          `linear-gradient(to right, transparent 0%, #000 ${f}%, #000 ${100 - f}%, transparent 100%), ` +
          `linear-gradient(to bottom, transparent 0%, #000 ${f}%, #000 ${100 - f}%, transparent 100%)`,
        maskComposite: 'intersect' as const,
      }
    : {};

  const mediaStyle: React.CSSProperties = {
    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
  };

  // Build layer stack from largest (back) to smallest (front).
  const layers: React.ReactNode[] = [];

  for (let o = depth; o >= 0; o--) {
    const scale = Math.pow(Z, frac - o);

    // Skip layers that have grown past the screen or are vanishingly small.
    if (scale > Z * 1.5) continue;

    const imgIdx = ((step + o) % N + N) % N;
    const item = items[imgIdx];
    const { ox, oy } = layerOrigin(step + o, driftAmount);

    // Depth-of-field blur on the small (distant) portals only.
    const blurPx = scale < 1 && depthBlur > 0
      ? depthBlur * 16 * Math.max(0, 1 - scale) / Math.max(0.04, scale)
      : 0;

    // Fade the deepest tiny layers in to avoid pop-in.
    const opacity = scale < 0.1
      ? interpolate(scale, [0.015, 0.1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      : 1;

    layers.push(
      <AbsoluteFill
        key={`${step}-${o}`}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: `${ox}% ${oy}%`,
          filter: blurPx > 0.3 ? `blur(${blurPx.toFixed(1)}px)` : undefined,
          opacity,
          // The outermost layer fills the frame; nested portals get feathered edges.
          ...(o > 0 ? rectMask : {}),
        }}
      >
        {item.type === 'video'
          ? <Video src={item.url} style={mediaStyle} pauseWhenBuffering loop />
          : <Img src={item.url} style={mediaStyle} />}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: backgroundColor, overflow: 'hidden' }}>
      {layers}
    </AbsoluteFill>
  );
};
