import React from 'react';
import { AbsoluteFill, Img, Video, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export type InfinityZoomItem = { url: string; type: 'image' | 'video' };

export type InfinityZoomProps = {
  items: InfinityZoomItem[];
  zoomFactor: number;       // multiplier per step, e.g. 2.5
  secondsPerImage: number;  // duration of each zoom step
  feather: number;          // 0–1: edge softness on nested layers
  depthBlur: number;        // 0–1: blur strength on distant (small) layers
  driftAmount: number;      // 0–1: how far off-center each new image emerges
  backgroundColor: string;
};

export const INFINITY_ZOOM_FPS = 24;

export const defaultInfinityZoomProps: InfinityZoomProps = {
  items: [],
  zoomFactor: 2.5,
  secondsPerImage: 2,
  feather: 0.2,
  depthBlur: 0.4,
  driftAmount: 0.35,
  backgroundColor: '#000000',
};

// Deterministic per-step origin using a simple integer hash.
function stepOrigin(step: number, driftAmount: number): { ox: number; oy: number } {
  const s = ((step * 2654435761) >>> 0);
  const ox = 50 + (((s & 0xFF) / 255) - 0.5) * 2 * driftAmount * 38;
  const oy = 50 + ((((s >> 8) & 0xFF) / 255) - 0.5) * 2 * driftAmount * 38;
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
  const Z = Math.max(1.5, zoomFactor);
  const stepFrames = Math.max(1, Math.round(secondsPerImage * fps));
  const totalFrames = stepFrames * N;

  const tf = ((frame % totalFrames) + totalFrames) % totalFrames;
  const frac = (tf % stepFrames) / stepFrames; // 0 → 1 within current step
  const step = Math.floor(tf / stepFrames);     // which image is "on top"

  // How many nested layers are visible? Keep going until scale < ~0.02.
  const depth = Math.ceil(Math.log(1 / 0.02) / Math.log(Z)) + 1;

  // Feather: mask-image stop position. feather=0 → 99.5% (essentially no mask), feather=1 → 40%
  const maskStop = interpolate(feather, [0, 1], [99.5, 40], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Build layer stack from largest (back) to smallest (front).
  const layers: React.ReactNode[] = [];

  for (let o = depth; o >= 0; o--) {
    const scale = Math.pow(Z, frac - o);

    // Only render layers that are potentially visible on screen.
    if (scale > Z * 2) continue;

    const imgIdx = ((step + o) % N + N) % N;
    const item = items[imgIdx];
    const { ox, oy } = stepOrigin(step + o, driftAmount);

    // Depth-of-field blur: blur distant (small) layers more strongly.
    const blurPx = scale < 1 && depthBlur > 0
      ? depthBlur * 22 * Math.max(0, (1 - scale)) / Math.max(0.01, scale)
      : 0;

    // Fade in very small layers to avoid pop-in.
    const opacity = scale < 0.12
      ? interpolate(scale, [0.02, 0.12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      : 1;

    const mediaStyle: React.CSSProperties = {
      width: '100%', height: '100%', objectFit: 'cover', display: 'block',
    };

    // Apply feather mask to all layers except the outermost (o === 0 at frac=0 it fills screen).
    const maskStyle: React.CSSProperties = o > 0 ? {
      WebkitMaskImage: `radial-gradient(ellipse at 50% 50%, black ${maskStop}%, transparent 100%)`,
      maskImage: `radial-gradient(ellipse at 50% 50%, black ${maskStop}%, transparent 100%)`,
    } : {};

    layers.push(
      <AbsoluteFill
        key={`${step}-${o}`}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: `${ox}% ${oy}%`,
          filter: blurPx > 0.3 ? `blur(${blurPx.toFixed(1)}px)` : undefined,
          opacity,
          ...maskStyle,
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
