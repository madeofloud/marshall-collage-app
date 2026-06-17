import React from 'react';
import { AbsoluteFill, Img, Video, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export type InfinityZoomItem = { url: string; type: 'image' | 'video' };

export type InfinityZoomProps = {
  items: InfinityZoomItem[];
  zoomFactor: number;       // scale multiplier per step (e.g. 2.5 means portal grows 2.5× per segment)
  secondsPerImage: number;  // duration of each zoom step
  feather: number;          // 0–1: edge softness on the portal rectangle
  depthBlur: number;        // 0–1: blur on distant (small) portals
  driftAmount: number;      // 0–1: how far off-center each portal sits
  backgroundColor: string;
};

export const INFINITY_ZOOM_FPS = 24;

export const defaultInfinityZoomProps: InfinityZoomProps = {
  items: [],
  zoomFactor: 3,
  secondsPerImage: 1.5,
  feather: 0.04,
  depthBlur: 0.1,
  driftAmount: 0.15,
  backgroundColor: '#000000',
};

// Deterministic per-step origin — all layers in a step share the same zoom
// direction so the portal stays coherent. Drifts between steps.
function stepOrigin(step: number, driftAmount: number): { ox: number; oy: number } {
  const s = ((step * 2654435761) >>> 0);
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
  const Z = Math.max(1.5, zoomFactor);
  const stepFrames = Math.max(1, Math.round(secondsPerImage * fps));
  const totalFrames = stepFrames * N;

  // frac: 0→1 within the current step
  // step: which image is the current "background" layer (o=0)
  const tf = ((frame % totalFrames) + totalFrames) % totalFrames;
  const frac = (tf % stepFrames) / stepFrames;
  const step = Math.floor(tf / stepFrames);

  // Number of nested portals to render — stop when too small to see.
  const depth = Math.ceil(Math.log(1 / 0.012) / Math.log(Z)) + 1;

  // All layers in this step share the same zoom origin (drift is per-step).
  const { ox, oy } = stepOrigin(step, driftAmount);

  // Rectangular feather mask applied to all nested portals (o > 0).
  // feather=0 → perfectly sharp rectangle. feather=1 → soft vignette-like edges.
  const featherPct = feather * 12; // convert 0-1 to a percent inset
  const portalMask: React.CSSProperties = featherPct > 0.3
    ? {
        WebkitMaskImage:
          `linear-gradient(to right, transparent 0%, #000 ${featherPct}%, #000 ${100 - featherPct}%, transparent 100%)`,
        maskImage:
          `linear-gradient(to right, transparent 0%, #000 ${featherPct}%, #000 ${100 - featherPct}%, transparent 100%)`,
      }
    : {};

  const mediaStyle: React.CSSProperties = {
    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
  };

  // ─── KEY INSIGHT ──────────────────────────────────────────────────────────
  // Render o=0 FIRST (bottom of stack) → it is the current image filling the
  // screen. Then o=1, o=2 … are rendered on top. Since each has a smaller
  // scale, they naturally appear as a smaller rectangle sitting over the layer
  // below — creating the nested portal / Droste effect.
  // CSS transform: scale() does NOT clip; transparent areas around the scaled
  // image let the layer below show through.
  // ──────────────────────────────────────────────────────────────────────────
  const layers: React.ReactNode[] = [];

  for (let o = 0; o <= depth; o++) {
    const scale = Math.pow(Z, frac - o);
    if (scale < 0.008) continue; // too small to matter

    const imgIdx = ((step + o) % N + N) % N;
    const item = items[imgIdx];

    // Subtle depth-of-field blur on the smallest (most distant) portals.
    const blurPx = scale < 0.3 && depthBlur > 0
      ? depthBlur * 12 * Math.max(0, 0.3 - scale) / 0.3
      : 0;

    // Fade in the tiniest portals so they don't pop.
    const opacity = scale < 0.05
      ? interpolate(scale, [0.008, 0.05], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      : 1;

    layers.push(
      <AbsoluteFill
        key={`${step}-${o}`}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: `${ox}% ${oy}%`,
          filter: blurPx > 0.2 ? `blur(${blurPx.toFixed(1)}px)` : undefined,
          opacity,
          // Only apply the feather mask to nested portals, not the base layer.
          ...(o > 0 ? portalMask : {}),
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
