'use client';

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
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
import { useTransformControls } from '@/lib/useTransformControls';
import { TransformHUD } from '@/components/TransformHUD';

const PREVIEW_FPS = 25;

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
  backgroundImage,
  rotationSpeed,
  grainAmount,
  panelOverrides,
  selectedPanelId,
  setSelectedPanelId,
  setPanelOverrides,
  format,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [frame, setFrame] = useState(0);

  const playerDuration = useMemo(
    () => getSeamlessLoopFrames(rotationSpeed, PREVIEW_FPS),
    [rotationSpeed]
  );

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onFrame = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);
    player.addEventListener('frameupdate', onFrame as EventListener);
    return () => {
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
      player.removeEventListener('frameupdate', onFrame as EventListener);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.isPlaying()) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }, []);

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = Number(e.target.value);
    playerRef.current?.seekTo(f);
    setFrame(f);
  }, []);

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

  const handleDeleteSelected = useCallback(() => {
    if (!selectedPanelId) return;
    const basePanels = generatePanels(images);
    const target = basePanels.find((p) => p.id === selectedPanelId);
    if (!target) return;
    const newImages = images.filter((url) => url !== target.image);
    setImages(newImages);
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
      ? shiftHeld ? 'ns-resize' : 'move'
      : mode === 'rotate'
      ? 'grabbing'
      : selectedPanelId ? 'grab' : 'default';

  const previewDims = getFormatDimensions(format, 'medium');
  const aspectStyle: React.CSSProperties = {
    aspectRatio: `${previewDims.width} / ${previewDims.height}`,
  };

  const currentSec = Math.floor(frame / PREVIEW_FPS);
  const totalSec = Math.floor(playerDuration / PREVIEW_FPS);
  const pad = (n: number) => String(n).padStart(2, '0');
  const timeLabel = `${pad(Math.floor(currentSec / 60))}:${pad(currentSec % 60)} / ${pad(Math.floor(totalSec / 60))}:${pad(totalSec % 60)}`;

  return (
    <div className="flex-1 relative bg-neutral-900 overflow-hidden">
      {images.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-white/40">
          <p className="text-sm">Upload images to see the collage</p>
        </div>
      ) : (
        <>
          {/* Canvas — fills all space above controls */}
          <div className="absolute inset-0 bottom-12 flex items-center justify-center p-8">
            <div
              ref={containerRef}
              className="relative"
              style={{ ...aspectStyle, maxWidth: '100%', maxHeight: '100%', cursor }}
              tabIndex={0}
            >
              <Player
                ref={playerRef}
                component={Collage}
                durationInFrames={playerDuration}
                fps={PREVIEW_FPS}
                compositionWidth={previewDims.width}
                compositionHeight={previewDims.height}
                style={{ width: '100%', height: '100%' }}
                loop
                autoPlay
                inputProps={{
                  images,
                  background,
                  backgroundImage: backgroundImage ?? undefined,
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
          </div>

          {/* Controls — fixed at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-12 flex items-center gap-3 px-6 border-t border-white/10 bg-neutral-950/80">
            <button
              type="button"
              onClick={togglePlay}
              className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white transition flex-shrink-0"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <rect x="1" y="1" width="4" height="12" rx="1" />
                  <rect x="9" y="1" width="4" height="12" rx="1" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M2 1.5l11 5.5-11 5.5V1.5z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min={0}
              max={playerDuration - 1}
              value={frame}
              onChange={handleScrub}
              className="flex-1 h-1 accent-[#C9A84C] cursor-pointer"
            />
            <span className="text-xs text-white/40 tabular-nums flex-shrink-0">{timeLabel}</span>
          </div>
        </>
      )}
    </div>
  );
};
