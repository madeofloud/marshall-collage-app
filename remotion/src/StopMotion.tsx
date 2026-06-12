import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Alignment, StopMotionProps } from './stopMotionTypes';

function circularDistance(a: number, b: number, total: number): number {
  if (total <= 0) return Math.abs(a - b);
  let d = Math.abs(a - b) % total;
  if (d > total / 2) d = total - d;
  return d;
}

// Migrate legacy bounding-box alignments to the cx/cy format.
function getCenterPoint(a: Alignment): { cx: number; cy: number } {
  if (typeof a.cx === 'number' && typeof a.cy === 'number') {
    return { cx: a.cx, cy: a.cy };
  }
  // Legacy: derive center from bounding box.
  const x = a.x ?? 0.25;
  const y = a.y ?? 0.25;
  const w = a.w ?? 0.5;
  const h = a.h ?? 0.5;
  return { cx: x + w / 2, cy: y + h / 2 };
}

export const StopMotion: React.FC<StopMotionProps> = ({
  images,
  alignments,
  framesPerImage,
  transition,
  targetSize,
  background,
  backgroundImage,
  showCenter,
}) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();

  const N = images.length;
  const fpi = Math.max(1, framesPerImage);
  const total = N * fpi;
  const crosshairSize = Math.min(W, H) * 0.04;

  return (
    <AbsoluteFill style={{ background, overflow: 'hidden' }}>
      {backgroundImage && (
        <img
          src={backgroundImage}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}
      {images.map((url, i) => {
        const a = alignments[url];
        if (!a) return null;

        let opacity: number;
        if (transition === 'cut') {
          const index = total > 0 ? Math.floor(frame / fpi) % N : 0;
          opacity = index === i ? 1 : 0;
        } else {
          const centerFrame = i * fpi;
          const dist = circularDistance(frame, centerFrame, total);
          opacity = Math.max(0, Math.min(1, 1 - dist / fpi));
        }

        if (opacity <= 0) return null;

        const aspect = a.aspect > 0 ? a.aspect : 1;
        const { cx, cy } = getCenterPoint(a);
        const angle = a.angle ?? 0;

        // Scale: target = logo should span (targetSize × canvas width) pixels.
        // logoWidth is the logo's width as a fraction of the image width, so the
        // image must be scaled to: imgW = targetSize·W / logoWidth.
        // This makes the logo the same pixel width on every frame.
        // Fallback (no logoWidth): treat targetSize as image-height fraction.
        let imgW: number, imgH: number;
        const lw = a.logoWidth;
        if (lw && lw > 0.005) {
          imgW = (targetSize * W) / lw;
          imgH = imgW / aspect;
        } else {
          imgH = targetSize * H;
          imgW = imgH * aspect;
        }

        // Position: logo center (cx, cy) locked to canvas center (W/2, H/2).
        const imgLeft = W / 2 - cx * imgW;
        const imgTop  = H / 2 - cy * imgH;

        // Rotation: rotate so the logo script is horizontal.
        // transformOrigin is the logo center point within the image element.
        const originX = cx * 100;
        const originY = cy * 100;

        return (
          <img
            key={url}
            src={url}
            style={{
              position: 'absolute',
              left: imgLeft,
              top: imgTop,
              width: imgW,
              height: imgH,
              opacity,
              transform: angle !== 0 ? `rotate(${-angle}deg)` : undefined,
              transformOrigin: `${originX}% ${originY}%`,
            }}
          />
        );
      })}

      {/* Canvas center crosshair */}
      {showCenter && (
        <>
          <div style={{
            position: 'absolute',
            left: W / 2 - crosshairSize / 2,
            top: H / 2 - 1,
            width: crosshairSize,
            height: 2,
            background: 'rgba(255,200,0,0.9)',
          }} />
          <div style={{
            position: 'absolute',
            left: W / 2 - 1,
            top: H / 2 - crosshairSize / 2,
            width: 2,
            height: crosshairSize,
            background: 'rgba(255,200,0,0.9)',
          }} />
        </>
      )}
    </AbsoluteFill>
  );
};
