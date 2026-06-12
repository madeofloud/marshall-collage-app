'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CollagePreview } from '@/components/CollagePreview';
import { ControlPanel } from '@/components/ControlPanel';
import { SessionManager } from '@/components/SessionManager';
import { StopMotionStudio } from '@/components/StopMotionStudio';
import {
  type PanelOverrides,
  type PanelOverride,
  type AspectFormat,
  type SizeTier,
} from '@/remotion/src/types';
import { type Alignment } from '@/remotion/src/stopMotionTypes';
import { generatePanels } from '@/remotion/src/generation';

export default function HomePage() {
  const [mode, setMode] = useState<'collage' | 'stopmotion'>('collage');
  const [images, setImages] = useState<string[]>([]);
  const [background, setBackground] = useState('#121212');
  const [rotationSpeed, setRotationSpeed] = useState(60);
  const [grainAmount, setGrainAmount] = useState(0.8);
  const [panelOverrides, setPanelOverrides] = useState<PanelOverrides>({});
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  const [format, setFormat] = useState<AspectFormat>('1x1');
  const [sizeTier, setSizeTier] = useState<SizeTier>('medium');
  const [codec, setCodec] = useState<'h264' | 'prores'>('h264');
  const [isExporting, setIsExporting] = useState(false);

  // Stop Motion workspace state (separate project from the collage).
  const [smImages, setSmImages] = useState<string[]>([]);
  const [smAlignments, setSmAlignments] = useState<Record<string, Alignment>>({});
  const [smFramesPerImage, setSmFramesPerImage] = useState(12);
  const [smTransition, setSmTransition] = useState<'cut' | 'crossfade'>('cut');
  const [smTargetSize, setSmTargetSize] = useState(0.5);
  const [smBackground, setSmBackground] = useState('#121212');

  // Active (loaded/saved) session names shown in the header, per workspace.
  const [activeCollageName, setActiveCollageName] = useState<string | null>(null);
  const [activeStopMotionName, setActiveStopMotionName] = useState<string | null>(null);

  const selectedOverride = useMemo<PanelOverride | null>(
    () => (selectedPanelId ? panelOverrides[selectedPanelId] ?? null : null),
    [selectedPanelId, panelOverrides]
  );

  // Undo history for panel overrides (Cmd+Z / Ctrl+Z)
  const undoStack = useRef<PanelOverrides[]>([]);

  const handleUpdatePanelOverride = (override: PanelOverride) => {
    if (!selectedPanelId) return;
    setPanelOverrides((prev) => {
      undoStack.current.push({ ...prev });
      return { ...prev, [selectedPanelId]: override };
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        const prev = undoStack.current.pop();
        if (prev !== undefined) setPanelOverrides(prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSelectImage = (url: string) => {
    const panel = generatePanels(images).find((p) => p.image === url);
    if (!panel) return;
    const id = panel.id;
    // Ensure override exists (same pattern as handleSelectPanel in CollagePreview)
    if (!panelOverrides[id]) {
      const newOverride: PanelOverride = {
        worldX: panel.worldX,
        worldY: panel.worldY,
        worldZ: panel.worldZ,
        facingAngle: panel.facingAngle,
        tiltX: panel.tiltX,
        tiltZ: panel.tiltZ,
        width: panel.width,
      };
      setPanelOverrides({ ...panelOverrides, [id]: newOverride });
    }
    setSelectedPanelId(id);
  };

  const selectedImageUrl = useMemo(
    () => generatePanels(images).find((p) => p.id === selectedPanelId)?.image ?? null,
    [images, selectedPanelId]
  );

  const basePanelOverride = useMemo<PanelOverride | null>(() => {
    if (!selectedPanelId) return null;
    const panel = generatePanels(images).find((p) => p.id === selectedPanelId);
    if (!panel) return null;
    return {
      worldX: panel.worldX,
      worldY: panel.worldY,
      worldZ: panel.worldZ,
      facingAngle: panel.facingAngle,
      tiltX: panel.tiltX,
      tiltZ: panel.tiltZ,
      width: panel.width,
    };
  }, [images, selectedPanelId]);

  const hiddenImageUrls = useMemo(
    () =>
      images.filter((url) => {
        const panel = generatePanels(images).find((p) => p.image === url);
        return panel ? !!(panelOverrides[panel.id]?.hidden) : false;
      }),
    [images, panelOverrides]
  );

  const handleToggleHidden = () => {
    if (!selectedPanelId) return;
    setPanelOverrides((prev) => {
      const current = prev[selectedPanelId];
      if (!current) return prev;
      undoStack.current.push({ ...prev });
      return { ...prev, [selectedPanelId]: { ...current, hidden: !current.hidden } };
    });
  };

  const handleLoadSession = (data: Record<string, unknown>) => {
    setImages((data.images as string[]) ?? []);
    setBackground((data.background as string) ?? '#121212');
    setRotationSpeed((data.rotationSpeed as number) ?? 60);
    setGrainAmount((data.grainAmount as number) ?? 0.8);
    setPanelOverrides((data.panelOverrides as PanelOverrides) ?? {});
    setFormat((data.format as AspectFormat) ?? '1x1');
    setSizeTier((data.sizeTier as SizeTier) ?? 'medium');
    setCodec((data.codec as 'h264' | 'prores') ?? 'h264');
    setBackgroundImage((data.backgroundImage as string | null) ?? null);
    setSelectedPanelId(null);
  };

  const handleLoadStopMotion = (data: Record<string, unknown>) => {
    setSmImages((data.images as string[]) ?? []);
    setSmAlignments((data.alignments as Record<string, Alignment>) ?? {});
    setSmFramesPerImage((data.framesPerImage as number) ?? 12);
    setSmTransition((data.transition as 'cut' | 'crossfade') ?? 'cut');
    setSmTargetSize((data.targetSize as number) ?? 0.5);
    setSmBackground((data.background as string) ?? '#121212');
  };

  const stopMotionSessionData = {
    images: smImages,
    alignments: smAlignments,
    framesPerImage: smFramesPerImage,
    transition: smTransition,
    targetSize: smTargetSize,
    background: smBackground,
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images,
          background,
          rotationSpeed,
          grainAmount,
          panelOverrides,
          format,
          sizeTier,
          codec,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Render failed' }));
        throw new Error(err.error || 'Render failed');
      }

      const { downloadUrl } = await res.json();
      window.open(downloadUrl, '_blank');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      alert(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const currentSessionData = {
    images,
    background,
    rotationSpeed,
    grainAmount,
    panelOverrides,
    format,
    sizeTier,
    codec,
  };

  return (
    <main className="flex h-screen bg-neutral-900">
      <header
        className={`absolute top-0 left-0 ${
          mode === 'collage' ? 'right-80' : 'right-0'
        } px-5 py-3 border-b border-white/10 bg-neutral-950/50 backdrop-blur z-10 flex items-center justify-between`}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-semibold tracking-wide">
            Marshall Motion Studio <span className="font-normal text-white/50">1.4</span>
          </h1>
          <div className="flex gap-1">
            {(
              [
                ['collage', '360° Collage'],
                ['stopmotion', 'Stop Motion'],
              ] as const
            ).map(([m, label]) => (
              <button
                type="button"
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  mode === m
                    ? 'bg-marshall-gold text-black'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Active project name, shown directly next to the Sessions button */}
          <span className="text-xs text-white/40 truncate max-w-[180px]">
            {(mode === 'collage' ? activeCollageName : activeStopMotionName)
              ? mode === 'collage'
                ? activeCollageName
                : activeStopMotionName
              : 'Untitled'}
          </span>
          {mode === 'collage' ? (
            <SessionManager
              currentData={currentSessionData}
              onLoad={handleLoadSession}
              kind="collage"
              onActiveChange={setActiveCollageName}
            />
          ) : (
            <SessionManager
              currentData={stopMotionSessionData}
              onLoad={handleLoadStopMotion}
              kind="stopmotion"
              onActiveChange={setActiveStopMotionName}
            />
          )}
        </div>
      </header>

      {mode === 'collage' ? (
        <>
          <CollagePreview
            images={images}
            setImages={setImages}
            background={background}
            rotationSpeed={rotationSpeed}
            grainAmount={grainAmount}
            panelOverrides={panelOverrides}
            selectedPanelId={selectedPanelId}
            setSelectedPanelId={setSelectedPanelId}
            setPanelOverrides={setPanelOverrides}
            format={format}
            backgroundImage={backgroundImage ?? undefined}
          />

          <ControlPanel
            images={images}
            setImages={setImages}
            background={background}
            setBackground={setBackground}
            rotationSpeed={rotationSpeed}
            setRotationSpeed={setRotationSpeed}
            grainAmount={grainAmount}
            setGrainAmount={setGrainAmount}
            selectedPanelId={selectedPanelId}
            panelOverride={selectedOverride}
            onUpdatePanelOverride={handleUpdatePanelOverride}
            format={format}
            setFormat={setFormat}
            sizeTier={sizeTier}
            setSizeTier={setSizeTier}
            codec={codec}
            setCodec={setCodec}
            onExport={handleExport}
            isExporting={isExporting}
            selectedImageUrl={selectedImageUrl ?? undefined}
            onSelectImage={handleSelectImage}
            hiddenImageUrls={hiddenImageUrls}
            onToggleHidden={handleToggleHidden}
            isPanelHidden={selectedPanelId ? !!(panelOverrides[selectedPanelId]?.hidden) : false}
            backgroundImage={backgroundImage}
            setBackgroundImage={setBackgroundImage}
            basePanelOverride={basePanelOverride}
          />
        </>
      ) : (
        <StopMotionStudio
          images={smImages}
          setImages={setSmImages}
          alignments={smAlignments}
          setAlignments={setSmAlignments}
          framesPerImage={smFramesPerImage}
          setFramesPerImage={setSmFramesPerImage}
          transition={smTransition}
          setTransition={setSmTransition}
          targetSize={smTargetSize}
          setTargetSize={setSmTargetSize}
          background={smBackground}
          setBackground={setSmBackground}
        />
      )}
    </main>
  );
}
