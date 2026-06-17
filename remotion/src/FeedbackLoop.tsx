import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from 'remotion';

export type FeedbackLoopProps = {
  layers: number;
  zoomFactor: number;
  rotationPerLayer: number;
  rotationSpeed: number;
  driftX: number;       // % offset of pivot from center X (-50 to 50)
  driftY: number;       // % offset of pivot from center Y (-50 to 50)
  glowIntensity: number;
  glowColor: string;
  baseImage?: string | null;
  durationSeconds: number;
};

export const FEEDBACK_FPS = 25;

export const defaultFeedbackProps: FeedbackLoopProps = {
  layers: 14,
  zoomFactor: 0.88,
  rotationPerLayer: 1,
  rotationSpeed: 8,
  driftX: 20,
  driftY: -10,
  glowIntensity: 0.5,
  glowColor: '#0066ff',
  baseImage: null,
  durationSeconds: 8,
};

export const FeedbackLoop: React.FC<FeedbackLoopProps> = ({
  layers,
  zoomFactor,
  rotationPerLayer,
  rotationSpeed,
  driftX,
  driftY,
  glowIntensity,
  glowColor,
  baseImage,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const globalRotation = t * rotationSpeed;

  // Pivot point offset in pixels — this is what creates the CRT bulge/drift
  const pivotPxX = (driftX / 100) * width;
  const pivotPxY = (driftY / 100) * height;
  // transformOrigin in % relative to the element (50% = center)
  const originX = 50 + driftX;
  const originY = 50 + driftY;

  return (
    <AbsoluteFill style={{ background: '#000000', overflow: 'hidden' }}>
      {/* Base layer — full size, behind everything */}
      {baseImage ? (
        <Img
          src={baseImage}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <AbsoluteFill style={{ background: '#111111' }} />
      )}

      {/* Feedback layers — each one scaled from the offset pivot point,
          creating the asymmetric drift/bulge of a real CRT feedback loop.
          i=0 is just behind the base, i=layers-1 is the deepest copy. */}
      {Array.from({ length: layers }, (_, i) => {
        const depth = i + 1;
        const scale = Math.pow(zoomFactor, depth);
        const rotation = globalRotation + rotationPerLayer * depth;
        // Color tint gets stronger toward center (deeper layers)
        const tintOpacity = glowIntensity * (depth / layers);

        return (
          <AbsoluteFill
            key={i}
            style={{
              // Scale+rotate from the offset pivot — this is the CRT effect
              transform: `rotate(${rotation}deg) scale(${scale})`,
              transformOrigin: `${originX}% ${originY}%`,
              mixBlendMode: 'screen',
            }}
          >
            {baseImage ? (
              <Img
                src={baseImage}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <AbsoluteFill style={{ background: '#111111' }} />
            )}
            {/* Color tint */}
            <AbsoluteFill
              style={{
                background: glowColor,
                opacity: tintOpacity,
              }}
            />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
