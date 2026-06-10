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
  const displayedImageHeight = (targetSize * H) / a.h;
  const displayedImageWidth = displayedImageHeight * a.aspect;
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
}) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();

  const N = images.length;
  const fpi = Math.max(1, framesPerImage);
  const total = N * fpi;

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

        return (
          <img
            key={url}
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
        );
      })}
    </AbsoluteFill>
  );
};
