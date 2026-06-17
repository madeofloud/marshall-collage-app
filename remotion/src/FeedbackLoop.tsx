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

function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h =
    max === r ? (g - b) / d + (g < b ? 6 : 0)
    : max === g ? (b - r) / d + 2
    : (r - g) / d + 4;
  return (h / 6) * 360;
}

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
  const baseHue = glowColor.length === 7 ? hexToHue(glowColor) : 200;

  const baseContent = (
    <>
      <AbsoluteFill style={{ background: baseColor }} />
      {baseImage && (
        <Img
          src={baseImage}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
    </>
  );

  return (
    <AbsoluteFill style={{ background: baseColor, overflow: 'hidden' }}>
      {/* Background — visible only in corners where no layer reaches */}
      {baseContent}

      {/* Layers: i=0 is outermost (rendered first = behind),
          i=layers-1 is innermost (rendered last = in front).
          Each layer shows the base content + color tint at decreasing scale. */}
      {Array.from({ length: layers }, (_, i) => {
        const scale = Math.pow(zoomFactor, i + 1);
        const rotation = globalRotation + rotationPerLayer * (i + 1);
        const hue = (baseHue + hueShift * i) % 360;

        return (
          <AbsoluteFill
            key={i}
            style={{
              transform: `rotate(${rotation}deg) scale(${scale})`,
              transformOrigin: 'center center',
            }}
          >
            {baseContent}
            {/* Color tint shifts hue per layer */}
            <AbsoluteFill
              style={{
                background: `hsl(${hue}, 90%, 55%)`,
                opacity: glowIntensity,
                mixBlendMode: 'screen',
              }}
            />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
