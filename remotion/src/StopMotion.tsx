import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Alignment, StopMotionProps } from './stopMotionTypes';

function circularDistance(a: number, b: number, total: number): number {
  if (total <= 0) return Math.abs(a - b);
  let d = Math.abs(a - b) % total;
  if (d > total / 2) d = total - d;
  return d;
}

/**
 * Returns the scale needed so the product box height fills targetSize * H,
 * and the offset (in image pixels) from the image top-left to the box center.
 *
 * Rendering:
 *   - Place a zero-size anchor div exactly at (W/2, H/2) — canvas center.
 *   - Position the image inside it at left:-boxCenterX, top:-boxCenterY.
 *   - Result: the box center is guaranteed to be at canvas center regardless
 *     of any other values.
 */
function computeLayout(a: Alignment, targetSize: number, canvasH: number) {
  const aspect = a.aspect > 0 ? a.aspect : 1;
  const boxH = Math.max(a.h, 0.02); // floor prevents divide-by-zero only

  // Scale factor: box height → targetSize × canvas height
  const imgH = (targetSize * canvasH) / boxH;
  const imgW = imgH * aspect;

  // Distance from image top-left to the box center, in rendered pixels
  const boxCenterX = (a.x + a.w / 2) * imgW;
  const boxCenterY = (a.y + a.h / 2) * imgH;

  return { imgW, imgH, boxCenterX, boxCenterY };
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

        const { imgW, imgH, boxCenterX, boxCenterY } = computeLayout(a, targetSize, H);

        return (
          <React.Fragment key={url}>
            {/*
              Anchor at canvas center. Image is shifted so its box-center
              coincides with this anchor — guaranteeing box center = canvas center.
            */}
            <div
              style={{
                position: 'absolute',
                left: W / 2,
                top: H / 2,
                width: 0,
                height: 0,
              }}
            >
              <img
                src={url}
                style={{
                  position: 'absolute',
                  left: -boxCenterX,
                  top: -boxCenterY,
                  width: imgW,
                  height: imgH,
                  opacity,
                }}
              />
            </div>

            {/* Debug: box outline — its center is always at canvas center */}
            {showCenter && opacity > 0.5 && (
              <div
                style={{
                  position: 'absolute',
                  left: W / 2 - (a.w / 2) * imgW,
                  top: H / 2 - (a.h / 2) * imgH,
                  width: a.w * imgW,
                  height: a.h * imgH,
                  border: '2px solid rgba(255,200,0,0.6)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </React.Fragment>
        );
      })}

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
