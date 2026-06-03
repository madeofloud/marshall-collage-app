'use client';

import React, { useCallback, useMemo, useRef } from 'react';
import { Player } from '@remotion/player';
import { Collage } from '@/remotion/src/Collage';
import { generatePanels } from '@/remotion/src/generation';
import {
  type CollageProps,
  type PanelOverride,
  type PanelOverrides,
  type AspectFormat,
  getFormatDimensions,
  getSeamlessLoopFrames,
} from '@/remotion/src/types';

const PREVIEW_FPS = 25;
import { useTransformControls } from '@/lib/useTransformControls';
import { TransformHUD } from '@/components/TransformHUD';

type Props = CollageProps & {
  selectedPanelId: string | null;
  setSelectedPanelId: (id: string | null) => void;
  setPanelOverrides: (o: PanelOverrides) => void;
  format: AspectFormat;
  images: string[];
  setImages: (urls: string[]) => void;
};

export const CollagePreview: React.FC<Props> = ({
  images,
  setImages,
  background,
  rotationSpeed,
  grainAmount,
  panelOverrides,
  selectedPanelId,
  setSelectedPanelId,
  setPanelOverrides,
  format,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelectPanel = useCallback(
    (id: string) => {
      if (!panelOverrides[id]) {
        const basePanels = generatePanels(images);
        const base = basePanels.find((p) => p.id === id);
        if (base) {
          const newOverride: PanelOverride = {
            worldX: base.worldX,
            worldY: base.worldY,
            worldZ: base.worldZ,
            facingAngle: base.facingAngle,
            tiltX: base.tiltX,
            tiltZ: base.tiltZ,
            width: base.width,
          };
          setPanelOverrides({ ...panelOverrides, [id]: newOverride });
        }
      }
      setSelectedPanelId(id);
    },
    [images, panelOverrides, setPanelOverrides, setSelectedPanelId]
  );

  const handleBackgroundClick = useCallback(() => {
    setSelectedPanelId(null);
  }, [setSelectedPanelId]);

  // Backspace/Delete: remove selected panel
  const handleDeleteSelected = useCallback(() => {
    if (!selectedPanelId) return;
    const basePanels = generatePanels(images);
    const target = basePanels.find((p) => p.id === selectedPanelId);
    if (!target) return;

    // Remove the image URL from images
    const newImages = images.filter((url) => url !== target.image);
    setImages(newImages);

    // Drop the override for this panel
    const newOverrides = { ...panelOverrides };
    delete newOverrides[selectedPanelId];
    setPanelOverrides(newOverrides);

    setSelectedPanelId(null);
  }, [selectedPanelId, images, setImages, panelOverrides, setPanelOverrides, setSelectedPanelId]);

  const { mode, shiftHeld } = useTransformControls({
    selectedPanelId,
    panelOverrides,
    setPanelOverrides,
    containerRef,
    enabled: images.length > 0,
    onDeleteSelected: handleDeleteSelected,
  });

  const cursor =
    mode === 'translate'
      ? shiftHeld
        ? 'ns-resize'
        : 'move'
      : mode === 'rotate'
      ? 'grabbing'
      : selectedPanelId
      ? 'grab'
      : 'default';

  // Use medium tier for the live preview (good balance of quality vs perf)
  const previewDims = getFormatDimensions(format, 'medium');

  // Snap timeline length so the rotation always loops seamlessly,
  // regardless of the chosen speed.
  const playerDuration = useMemo(
    () => getSeamlessLoopFrames(rotationSpeed, PREVIEW_FPS),
    [rotationSpeed]
  );

  // Aspect ratio class to size the canvas correctly in the layout
  const aspectStyle: React.CSSProperties = {
    aspectRatio: `${previewDims.width} / ${previewDims.height}`,
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-neutral-900 overflow-hidden">
      {images.length === 0 ? (
        <div className="text-center text-white/40">
          <p className="text-sm">Upload images to see the collage</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="w-full max-h-full relative flex items-center justify-center"
          style={{
            ...aspectStyle,
            maxWidth: '100%',
            cursor,
          }}
          tabIndex={0}
        >
          <Player
            component={Collage}
            durationInFrames={playerDuration}
            fps={PREVIEW_FPS}
            compositionWidth={previewDims.width}
            compositionHeight={previewDims.height}
            style={{ width: '100%', height: '100%' }}
            controls
            loop
            autoPlay
            inputProps={{
              images,
              background,
              rotationSpeed,
              grainAmount,
              panelOverrides,
              selectedPanel: selectedPanelId ?? undefined,
              showSelection: true,
              onSelectPanel: handleSelectPanel,
              onBackgroundClick: handleBackgroundClick,
            }}
          />

          <TransformHUD
            mode={mode}
            shiftHeld={shiftHeld}
            hasSelection={selectedPanelId !== null}
          />
        </div>
      )}
    </div>
  );
};
