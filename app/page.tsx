'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportDownloadUrl, setExportDownloadUrl] = useState<string | null>(null);

  // Stop Motion workspace state (separate project from the collage).
  const [smImages, setSmImages] = useState<string[]>([]);
  const [smAlignments, setSmAlignments] = useState<Record<string, Alignment>>({});
  const [smFramesPerImage, setSmFramesPerImage] = useState(12);
  const [smTransition, setSmTransition] = useState<'cut' | 'crossfade'>('cut');
  const [smTargetSize, setSmTargetSize] = useState(0.18);
  const [smBackground, setSmBackground] = useState('#121212');
  const [smBackgroundImage, setSmBackgroundImage] = useState<string | null>(null);
  const [smFormat, setSmFormat] = useState<AspectFormat>('1x1');
  const [smHiddenImages, setSmHiddenImages] = useState<string[]>([]);
  const [smSizeTier, setSmSizeTier] = useState<SizeTier>('medium');
  const [smCodec, setSmCodec] = useState<'h264' | 'prores'>('h264');
  const [isExportingStopMotion, setIsExportingStopMotion] = useState(false);
  const [exportProgressStopMotion, setExportProgressStopMotion] = useState<number>(0);
  const [exportDownloadUrlStopMotion, setExportDownloadUrlStopMotion] = useState<string | null>(null);

  // Active (loaded/saved) session names shown in the header, per workspace.
  const [activeCollageName, setActiveCollageName] = useState<string | null>(null);
  const [activeStopMotionName, setActiveStopMotionName] = useState<string | null>(null);

  const selectedOverride = useMemo<PanelOverride | null>(
    () => (selectedPanelId ? panelOverrides[selectedPanelId] ?? null : null),
    [selectedPanelId, panelOverrides]
  );

  // Undo history for panel overrides (Cmd+Z / Ctrl+Z)
  const undoStack = useRef<PanelOverrides[]>([]);

  const isAnyExporting = isExporting || isExportingStopMotion;

  // Warn user before leaving while a render is in progress.
  useEffect(() => {
    if (!isAnyExporting) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isAnyExporting]);

  const pollProgress = useCallback(
    async (
      renderId: string,
      bucketName: string,
      setProgress: (p: number) => void,
      onDone: (url: string) => void,
      onError: (msg: string) => void,
    ) => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(
            `/api/render-progress?renderId=${encodeURIComponent(renderId)}&bucketName=${encodeURIComponent(bucketName)}`
          );
          const data = await res.json();
          if (data.error) {
            clearInterval(interval);
            onError(data.error);
            return;
          }
          if (data.done) {
            clearInterval(interval);
            setProgress(1);
            onDone(data.downloadUrl);
          } else {
            setProgress(data.progress ?? 0);
          }
        } catch {
          clearInterval(interval);
          onError('Progress check failed');
        }
      }, 2000);
    },
    []
  );

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
    setSmTargetSize((data.targetSize as number) ?? 0.18);
    setSmBackground((data.background as string) ?? '#121212');
    setSmBackgroundImage((data.backgroundImage as string | null) ?? null);
    setSmFormat((data.format as AspectFormat) ?? '1x1');
    setSmHiddenImages((data.hiddenImages as string[]) ?? []);
    setSmSizeTier((data.sizeTier as SizeTier) ?? 'medium');
    setSmCodec((data.codec as 'h264' | 'prores') ?? 'h264');
  };

  const stopMotionSessionData = {
    images: smImages,
    alignments: smAlignments,
    framesPerImage: smFramesPerImage,
    transition: smTransition,
    targetSize: smTargetSize,
    background: smBackground,
    backgroundImage: smBackgroundImage,
    format: smFormat,
    hiddenImages: smHiddenImages,
    sizeTier: smSizeTier,
    codec: smCodec,
  };

  const visibleSmImages = smImages.filter((url) => !smHiddenImages.includes(url));

  const handleExportStopMotion = async () => {
    if (visibleSmImages.length === 0) return;
    setIsExportingStopMotion(true);
    setExportProgressStopMotion(0);
    try {
      const res = await fetch('/api/render-stopmotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: visibleSmImages,
          alignments: smAlignments,
          framesPerImage: smFramesPerImage,
          transition: smTransition,
          targetSize: smTargetSize,
          background: smBackground,
          backgroundImage: smBackgroundImage,
          format: smFormat,
          sizeTier: smSizeTier,
          codec: smCodec,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Render failed' }));
        throw new Error(err.error || 'Render failed');
      }
      const { renderId, bucketName } = await res.json();
      pollProgress(
        renderId,
        bucketName,
        setExportProgressStopMotion,
        (url) => {
          setIsExportingStopMotion(false);
          setExportDownloadUrlStopMotion(url);
        },
        (msg) => {
          setIsExportingStopMotion(false);
          alert(msg);
        },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      alert(msg);
      setIsExportingStopMotion(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
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

      const { renderId, bucketName } = await res.json();
      pollProgress(
        renderId,
        bucketName,
        setExportProgress,
        (url) => {
          setIsExporting(false);
          setExportDownloadUrl(url);
        },
        (msg) => {
          setIsExporting(false);
          alert(msg);
        },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      alert(msg);
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
    backgroundImage,
  };

  return (
    <main className="flex h-screen bg-neutral-900">
      <header
        className={`absolute top-0 left-0 right-80 px-5 py-3 border-b border-white/10 bg-neutral-950/50 backdrop-blur z-10 flex items-center justify-between`}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-semibold tracking-wide">
            Marshall Motion Studio <span className="font-normal text-white/50">3.5</span>
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
            exportProgress={exportProgress}
            exportDownloadUrl={exportDownloadUrl}
            onClearDownload={() => setExportDownloadUrl(null)}
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
          backgroundImage={smBackgroundImage}
          setBackgroundImage={setSmBackgroundImage}
          format={smFormat}
          setFormat={setSmFormat}
          hiddenImages={smHiddenImages}
          setHiddenImages={setSmHiddenImages}
          sizeTier={smSizeTier}
          setSizeTier={setSmSizeTier}
          codec={smCodec}
          setCodec={setSmCodec}
          onExport={handleExportStopMotion}
          isExporting={isExportingStopMotion}
          exportProgress={exportProgressStopMotion}
          exportDownloadUrl={exportDownloadUrlStopMotion}
          onClearDownload={() => setExportDownloadUrlStopMotion(null)}
        />
      )}
    </main>
  );
}
