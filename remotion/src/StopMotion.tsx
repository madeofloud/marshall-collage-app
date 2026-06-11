import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Alignment, StopMotionProps } from './stopMotionTypes';

/**
 * Smallest non-negative distance between two frames on a circular timeline of
 * length `total`. Lets the last image crossfade back into the first.
 */
function circularDistance(a: number, b: number, total: number): number {
  if (total <= 0) return Math.abs(a - b);
  let d = Math.abs(a - b) % total;
  if (d > total / 2) d = total - d;
  return d;
}

function computeImageLayout(a: Alignment, targetSize: number, W: number, H: number) {
  // Clamp box size so the image never scales beyond ~4× the canvas height.
  const safeH = Math.max(a.h, targetSize / 4);
  const safeW = Math.max(a.w, targetSize / 4);
  const effectiveA = { ...a, h: safeH, w: safeW };
  const displayedImageHeight = (targetSize * H) / effectiveA.h;
  const displayedImageWidth = displayedImageHeight * effectiveA.aspect;
  // Center is computed from the ORIGINAL (un-clamped) box so the anchor stays consistent.
  const cx = (a.x + a.w / 2) * displayedImageWidth;
  const cy = (a.y + a.h / 2) * displayedImageHeight;
  const left = W / 2 - cx;
  const top = H / 2 - cy;
  return { left, top, width: displayedImageWidth, height: displayedImageHeight };
}

export const StopMotion: React.FC<StopMotionProps> = ({
  images,
  alignments,
  framesPerImage,
  transition,
  targetSize,
  background,
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
      {images.map((url, i) => {
        const a = alignments[url];
        if (!a) return null; // skip un-aligned images

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

        const layout = computeImageLayout(a, targetSize, W, H);

        // Where the detected product box maps onto the canvas (for debugging overlay)
        const boxLeft = layout.left + a.x * layout.width;
        const boxTop = layout.top + a.y * layout.height;
        const boxW = a.w * layout.width;
        const boxH = a.h * layout.height;

        return (
          <React.Fragment key={url}>
            <img
              src={url}
              style={{
                position: 'absolute',
                left: layout.left,
                top: layout.top,
                width: layout.width,
                height: layout.height,
                opacity,
              }}
            />
            {showCenter && opacity > 0.5 && (
              <div
                style={{
                  position: 'absolute',
                  left: boxLeft,
                  top: boxTop,
                  width: boxW,
                  height: boxH,
                  border: '2px solid rgba(255,200,0,0.6)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* Centre crosshair – visible in preview to confirm the lock point */}
      {showCenter && (
        <>
          <div style={{
            position: 'absolute',
            left: W / 2 - crosshairSize / 2,
            top: H / 2 - 1,
            width: crosshairSize,
            height: 2,
            background: 'rgba(255,200,0,0.7)',
          }} />
          <div style={{
            position: 'absolute',
            left: W / 2 - 1,
            top: H / 2 - crosshairSize / 2,
            width: 2,
            height: crosshairSize,
            background: 'rgba(255,200,0,0.7)',
          }} />
        </>
      )}
    </AbsoluteFill>
  );
};
