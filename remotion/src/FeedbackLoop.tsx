import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from 'remotion';

export type FeedbackLoopProps = {
  layers: number;
  zoomFactor: number;
  rotationPerLayer: number;
  rotationSpeed: number;
  hueShift: number;
  glowIntensity: number;
  baseColor: string;
  glowColor: string;
  baseImage?: string | null;
  durationSeconds: number;
};

export const FEEDBACK_FPS = 25;

export const defaultFeedbackProps: FeedbackLoopProps = {
  layers: 12,
  zoomFactor: 0.85,
  rotationPerLayer: 4,
  rotationSpeed: 20,
  hueShift: 15,
  glowIntensity: 0.35,
  baseColor: '#000000',
  glowColor: '#0044ff',
  baseImage: null,
  durationSeconds: 8,
};

export const FeedbackLoop: React.FC<FeedbackLoopProps> = ({
  layers,
  zoomFactor,
  rotationPerLayer,
  rotationSpeed,
  hueShift,
  glowIntensity,
  baseColor,
  glowColor,
  baseImage,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const globalRotation = t * rotationSpeed;

  return (
    <AbsoluteFill style={{ background: baseColor, overflow: 'hidden' }}>
      {/* Base layer */}
      {baseImage ? (
        <Img
          src={baseImage}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <AbsoluteFill style={{ background: baseColor }} />
      )}

      {/* Recursive tunnel layers — rendered smallest first so outermost is on top */}
      {Array.from({ length: layers }, (_, i) => {
        const depth = layers - i; // depth 'layers' = smallest/innermost, 1 = outermost
        const scale = Math.pow(zoomFactor, depth);
        const rotation = globalRotation + rotationPerLayer * depth;
        // Hue cycles through spectrum as layers deepen
        const hue = (parseFloat(glowColor.replace('#', '0x').slice(0, -4) || '0') + hueShift * depth) % 360;
        const layerGlow = glowIntensity * (1 - (depth - 1) / layers);

        return (
          <AbsoluteFill
            key={i}
            style={{
              transform: `rotate(${rotation}deg) scale(${scale})`,
              transformOrigin: 'center center',
              willChange: 'transform',
            }}
          >
            {/* Content at this layer */}
            <AbsoluteFill style={{ background: baseColor }} />
            {baseImage && (
              <Img
                src={baseImage}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}
            {/* Color tint */}
            <AbsoluteFill
              style={{
                background: `hsl(${hue}, 90%, 55%)`,
                opacity: layerGlow,
                mixBlendMode: 'screen',
              }}
            />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
