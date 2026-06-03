import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
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
  const grainSeed = frame;

  // Scale based on the SHORTER side so panels fit in any aspect ratio
  const BASE = 450;
  const s = Math.min(width, height) / BASE;

  const basePanels = generatePanels(images);

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
    };
  });

  return (
    <AbsoluteFill
      onClick={onBackgroundClick}
      style={{ background, perspective: 1600 * s }}
    >
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
    </AbsoluteFill>
  );
};
