import React from 'react';
import { AbsoluteFill, Img, Video, useCurrentFrame, useVideoConfig } from 'remotion';

export type FeedbackLoopProps = {
  layers: number;
  zoomFactor: number;
  rotationPerLayer: number;
  rotationSpeed: number;
  driftX: number;
  driftY: number;
  glowIntensity: number;
  glowColor: string;
  baseImage?: string | null;
  baseVideo?: string | null;
  bulgeAmount: number;       // 0–1: CRT screen rounding + vignette
  scanlineOpacity: number;   // 0–1
  scanlineSpeed: number;     // px/s scrolling
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
  baseVideo: null,
  bulgeAmount: 0.4,
  scanlineOpacity: 0.25,
  scanlineSpeed: 60,
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
  baseVideo,
  bulgeAmount,
  scanlineOpacity,
  scanlineSpeed,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const globalRotation = t * rotationSpeed;

  const originX = 50 + driftX;
  const originY = 50 + driftY;

  // Border radius for CRT rounded-screen look (up to ~25% at max bulge)
  const borderRadius = `${bulgeAmount * 25}%`;

  // Vignette gradient — darker at corners, stronger with more bulge
  const vignetteOpacity = bulgeAmount * 0.7;

  // Scanline animation: scroll lines downward over time
  const lineGap = 4; // px between scanlines
  const scanlineOffset = (t * scanlineSpeed) % (lineGap * 2);

  const renderMedia = (style: React.CSSProperties) =>
    baseVideo ? (
      <Video
        src={baseVideo}
        style={style}
        pauseWhenBuffering
      />
    ) : baseImage ? (
      <Img src={baseImage} style={style} />
    ) : (
      <AbsoluteFill style={{ background: '#111111' }} />
    );

  const mediaStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  };

  return (
    <AbsoluteFill style={{ background: '#000000', overflow: 'hidden' }}>
      {/* Base layer */}
      {renderMedia(mediaStyle)}

      {/* Feedback layers */}
      {Array.from({ length: layers }, (_, i) => {
        const depth = i + 1;
        const scale = Math.pow(zoomFactor, depth);
        const rotation = globalRotation + rotationPerLayer * depth;
        const tintOpacity = glowIntensity * (depth / layers);

        return (
          <AbsoluteFill
            key={i}
            style={{
              transform: `rotate(${rotation}deg) scale(${scale})`,
              transformOrigin: `${originX}% ${originY}%`,
              mixBlendMode: 'screen',
              // CRT screen rounding: deeper layers get more rounded
              borderRadius: bulgeAmount > 0 ? `${bulgeAmount * 25 * (depth / layers)}%` : undefined,
              overflow: bulgeAmount > 0 ? 'hidden' : undefined,
            }}
          >
            {renderMedia(mediaStyle)}
            {/* Color tint */}
            <AbsoluteFill style={{ background: glowColor, opacity: tintOpacity }} />
            {/* Vignette per layer */}
            {vignetteOpacity > 0 && (
              <AbsoluteFill
                style={{
                  background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
                }}
              />
            )}
          </AbsoluteFill>
        );
      })}

      {/* Global vignette on top of all layers */}
      {vignetteOpacity > 0 && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${vignetteOpacity * 1.2}) 100%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Animated CRT scanlines */}
      {scanlineOpacity > 0 && (
        <AbsoluteFill
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent ${lineGap - 1}px,
              rgba(0,0,0,${scanlineOpacity}) ${lineGap - 1}px,
              rgba(0,0,0,${scanlineOpacity}) ${lineGap}px
            )`,
            backgroundPositionY: `${scanlineOffset}px`,
            pointerEvents: 'none',
          }}
        />
      )}
    </AbsoluteFill>
  );
};
