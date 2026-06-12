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
  // Spec:
  //  1. Each image is scaled so the product box has a uniform size on canvas
  //     (box height -> targetSize * canvas height). The scale is the same on
  //     both axes, so the product keeps its proportions; because the box is
  //     drawn tightly around the same product in every photo, the product ends
  //     up the SAME size in every frame.
  //  2. Each image is then translated so the box CENTER sits exactly on the
  //     canvas center (W/2, H/2).
  //
  // A tiny floor on box height only guards against divide-by-zero / runaway
  // zoom for a degenerate (near-zero) box; it sits far below any real box so it
  // never alters normal size-matching.
  const aspect = a.aspect > 0 ? a.aspect : 1;
  const boxH = Math.max(a.h, 0.02);

  // Scale: make the box height equal to targetSize of the canvas height.
  const displayedImageHeight = (targetSize * H) / boxH;
  const displayedImageWidth = displayedImageHeight * aspect;

  // Box center in displayed-image pixels.
  const cx = (a.x + a.w / 2) * displayedImageWidth;
  const cy = (a.y + a.h / 2) * displayedImageHeight;

  // Translate so the box center lands on the canvas center.
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
