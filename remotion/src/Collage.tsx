import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from 'remotion';
import { PanelComponent } from './Panel';
import { generatePanels } from './generation';
import type { CollageProps } from './types';

type Props = CollageProps & {
  selectedPanel?: string;
  showSelection?: boolean;
  onSelectPanel?: (id: string) => void;
  onBackgroundClick?: () => void;
};

export const Collage: React.FC<Props> = ({
  images,
  background,
  rotationSpeed,
  grainAmount,
  panelOverrides,
  backgroundImage,
  camTilt = 0,
  camRoll = 0,
  camTiltSwing = 0,
  camRollSwing = 0,
  camSwingSpeed = 1,
  selectedPanel,
  showSelection,
  onSelectPanel,
  onBackgroundClick,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  // Seamless-loop rotation: snap to an integer number of full turns over
  // the timeline so frame 0 and frame `durationInFrames` are visually
  // identical, regardless of the chosen rotation speed.
  const totalSeconds = durationInFrames / fps;
  const desiredTotalDeg = totalSeconds * rotationSpeed;
  const turns = Math.round(desiredTotalDeg / 360);
  const totalRotationDeg = turns * 360;
  const clusterY =
    durationInFrames > 0 ? (frame / durationInFrames) * totalRotationDeg : 0;

  // Camera oscillation: sinus wave synced to the loop so it loops seamlessly.
  // camSwingSpeed=1 → one full swing per rotation loop.
  const swingPhase = durationInFrames > 0
    ? (frame / durationInFrames) * Math.PI * 2 * camSwingSpeed
    : 0;
  const activeTilt = camTilt + Math.sin(swingPhase) * camTiltSwing;
  const activeRoll = camRoll + Math.cos(swingPhase) * camRollSwing;
  const grainSeed = frame;

  // Scale based on the SHORTER side so panels fit in any aspect ratio
  const BASE = 450;
  const s = Math.min(width, height) / BASE;

  const basePanels = generatePanels(images).filter(
    (p) => !panelOverrides[p.id]?.hidden
  );

  const scaledPanels = basePanels.map((p) => {
    const override = panelOverrides[p.id];
    const src = override ?? {
      worldX: p.worldX,
      worldY: p.worldY,
      worldZ: p.worldZ,
      facingAngle: p.facingAngle,
      tiltX: p.tiltX,
      tiltZ: p.tiltZ,
      width: p.width,
    };

    return {
      ...p,
      worldX: src.worldX * s,
      worldY: src.worldY * s,
      worldZ: src.worldZ * s,
      facingAngle: src.facingAngle,
      tiltX: src.tiltX,
      tiltZ: src.tiltZ,
      width: src.width * s,
      thickness: (src.thickness ?? 0) * s,
    };
  });

  return (
    <AbsoluteFill
      onClick={onBackgroundClick}
      style={{ background, perspective: 1600 * s }}
    >
      {backgroundImage && (
        <Img
          src={backgroundImage}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: -1,
          }}
        />
      )}
      {grainAmount > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: grainAmount,
            mixBlendMode: 'overlay',
          }}
        >
          <svg width="100%" height="100%">
            <filter id={`bgGrain-${grainSeed}`}>
              <feTurbulence
                type="fractalNoise"
                baseFrequency={0.9 / s}
                numOctaves={2}
                stitchTiles="stitch"
                seed={grainSeed}
              />
              <feColorMatrix values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1" />
            </filter>
            <rect width="100%" height="100%" filter={`url(#bgGrain-${grainSeed})`} />
          </svg>
        </div>
      )}

      {/* Camera wrapper — tilt + roll applied here, loops seamlessly */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          transform: `rotateX(${activeTilt}deg) rotateZ(${activeRoll}deg)`,
        }}
      >
        {/* Scene — collage rotation */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transform: `rotateY(${clusterY}deg)`,
          }}
        >
          {scaledPanels.map((p) => (
            <PanelComponent
              key={p.id}
              panel={p}
              isSelected={p.id === selectedPanel}
              showOutline={showSelection}
              onSelect={onSelectPanel}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
